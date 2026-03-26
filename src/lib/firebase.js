import { initializeApp } from 'firebase/app'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const firebaseEnabled = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
)
const collectionName = import.meta.env.VITE_FIREBASE_COLLECTION || 'qualityChecklistItems'

const firebaseApp = firebaseEnabled ? initializeApp(firebaseConfig) : null
const firestore = firebaseEnabled ? getFirestore(firebaseApp) : null

function buildSearchText(item) {
  return [item.sectionTitle, item.number, item.point, item.status, item.comment, item.actionPlan]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function normalizeTimestamp(value) {
  if (!value) {
    return null
  }

  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? null : parsed
  }

  if (typeof value.toMillis === 'function') {
    return value.toMillis()
  }

  return null
}

export function isFirebaseConfigured() {
  return firebaseEnabled
}

export async function fetchChecklistItems() {
  if (!firestore) {
    return []
  }

  const snapshot = await getDocs(collection(firestore, collectionName))

  return snapshot.docs
    .map((entry) => ({
      id: entry.id,
      ...entry.data(),
      lastUpdated: normalizeTimestamp(entry.data().lastUpdated),
    }))
    .sort((left, right) => {
      if (left.sectionIndex !== right.sectionIndex) {
        return (left.sectionIndex ?? 0) - (right.sectionIndex ?? 0)
      }

      return (left.numberIndex ?? Number(left.number) ?? 0) - (right.numberIndex ?? Number(right.number) ?? 0)
    })
}

export async function saveChecklistItem(item, metadata = {}) {
  if (!firestore) {
    return false
  }

  await setDoc(
    doc(firestore, collectionName, item.id),
    {
      ...item,
      ...metadata,
      numberIndex: Number(item.number) || 0,
      searchText: buildSearchText(item),
      lastUpdated: serverTimestamp(),
    },
    { merge: true },
  )

  return true
}

export async function syncChecklistItems(items, sectionIndexLookup) {
  if (!firestore) {
    return false
  }

  const batch = writeBatch(firestore)

  items.forEach((item) => {
    batch.set(
      doc(firestore, collectionName, item.id),
      {
        ...item,
        numberIndex: Number(item.number) || 0,
        sectionIndex: sectionIndexLookup[item.sectionId] ?? 0,
        searchText: buildSearchText(item),
        lastUpdated: serverTimestamp(),
      },
      { merge: true },
    )
  })

  await batch.commit()

  return true
}

export async function deleteChecklistItem(itemId) {
  if (!firestore) {
    return false
  }

  await deleteDoc(doc(firestore, collectionName, itemId))

  return true
}
