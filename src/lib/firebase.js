import { initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'

// ---------- CONFIG ----------
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

const app = firebaseEnabled ? initializeApp(firebaseConfig) : null
const db = firebaseEnabled ? getFirestore(app) : null
const auth = firebaseEnabled ? getAuth(app) : null

export { auth, db }

export function isFirebaseConfigured() {
  return firebaseEnabled
}

// ---------- HELPERS ----------
function buildSearchText(item) {
  return [item.sectionTitle, item.number, item.point, item.status, item.comment, item.actionPlan]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function normalizeTimestamp(value) {
  if (!value) return null
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  if (typeof value.toMillis === 'function') return value.toMillis()
  return null
}

// ---------- AUTH ----------
export function onAuthChange(callback) {
  if (!auth) return () => {}
  return onAuthStateChanged(auth, callback)
}

export async function loginWithEmail(email, password) {
  if (!auth) throw new Error('Firebase non configuré')
  const cred = await signInWithEmailAndPassword(auth, email, password)
  return cred.user
}

export async function signOut() {
  if (!auth) return
  await firebaseSignOut(auth)
}

export async function createAuthUser(email, password) {
  if (!auth) throw new Error('Firebase non configuré')
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  return cred.user
}

// ---------- USERS ----------
export async function fetchUserProfile(uid) {
  if (!db) return null
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function saveUserProfile(uid, data) {
  if (!db) return
  await setDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() }, { merge: true })
}

export async function fetchAllUsers() {
  if (!db) return []
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function deleteUserProfile(uid) {
  if (!db) return
  await deleteDoc(doc(db, 'users', uid))
}

export async function hasAnyUsers() {
  if (!db) return false
  const snap = await getDocs(collection(db, 'users'))
  return !snap.empty
}

// ---------- ROLES ----------
export async function fetchRoles() {
  if (!db) return []
  const snap = await getDocs(collection(db, 'roles'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function saveRole(roleId, data) {
  if (!db) return
  await setDoc(doc(db, 'roles', roleId), { ...data, updatedAt: serverTimestamp() }, { merge: true })
}

export async function deleteRole(roleId) {
  if (!db) return
  await deleteDoc(doc(db, 'roles', roleId))
}

export async function fetchRole(roleId) {
  if (!db) return null
  const snap = await getDoc(doc(db, 'roles', roleId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// ---------- MODULES ----------
export async function fetchModules() {
  if (!db) return []
  const snap = await getDocs(collection(db, 'modules'))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export async function saveModule(moduleId, data) {
  if (!db) return
  await setDoc(doc(db, 'modules', moduleId), { ...data, updatedAt: serverTimestamp() }, { merge: true })
}

export async function deleteModule(moduleId) {
  if (!db) return
  await deleteDoc(doc(db, 'modules', moduleId))
}

/**
 * Seeds the modules collection from the provided sections array.
 * Only creates documents that don't already exist.
 */
export async function seedModules(sections) {
  if (!db) return false
  const existing = await fetchModules()
  const existingIds = new Set(existing.map((m) => m.id))

  const batch = writeBatch(db)
  let seeded = 0

  sections.forEach((section, index) => {
    if (!existingIds.has(section.id)) {
      batch.set(doc(db, 'modules', section.id), {
        title: section.title,
        shortTitle: section.shortTitle,
        accent: section.accent,
        icon: section.icon || 'ClipboardCheck',
        description: section.description,
        items: section.items,
        order: index,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      seeded++
    }
  })

  if (seeded > 0) {
    await batch.commit()
  }
  return seeded
}

// ---------- DAILY CHECKLISTS ----------
function dailyItemsRef(dateStr) {
  return collection(db, 'dailyChecklists', dateStr, 'items')
}

export async function fetchDailyItems(dateStr) {
  if (!db) return []
  const snap = await getDocs(dailyItemsRef(dateStr))
  return snap.docs
    .map((d) => ({
      id: d.id,
      ...d.data(),
      lastUpdated: normalizeTimestamp(d.data().lastUpdated),
    }))
    .sort((a, b) => {
      if (a.sectionIndex !== b.sectionIndex) return (a.sectionIndex ?? 0) - (b.sectionIndex ?? 0)
      return (a.numberIndex ?? Number(a.number) ?? 0) - (b.numberIndex ?? Number(b.number) ?? 0)
    })
}

export async function saveDailyItem(dateStr, item, metadata = {}) {
  if (!db) return false
  await setDoc(
    doc(db, 'dailyChecklists', dateStr, 'items', item.id),
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

export async function syncDailyItems(dateStr, items, sectionIndexLookup) {
  if (!db) return false
  const batch = writeBatch(db)
  items.forEach((item) => {
    batch.set(
      doc(db, 'dailyChecklists', dateStr, 'items', item.id),
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

export async function deleteDailyItem(dateStr, itemId) {
  if (!db) return false
  await deleteDoc(doc(db, 'dailyChecklists', dateStr, 'items', itemId))
  return true
}

export async function saveDailyMeta(dateStr, data) {
  if (!db) return
  await setDoc(doc(db, 'dailyChecklists', dateStr), { ...data, updatedAt: serverTimestamp() }, { merge: true })
}

export async function listChecklistDates() {
  if (!db) return []
  const snap = await getDocs(collection(db, 'dailyChecklists'))
  return snap.docs.map((d) => d.id).sort().reverse()
}

// ---------- LEGACY (backward compat) ----------
const legacyCollection = import.meta.env.VITE_FIREBASE_COLLECTION || 'qualityChecklistItems'

export async function fetchChecklistItems() {
  if (!db) return []
  const snapshot = await getDocs(collection(db, legacyCollection))
  return snapshot.docs
    .map((entry) => ({
      id: entry.id,
      ...entry.data(),
      lastUpdated: normalizeTimestamp(entry.data().lastUpdated),
    }))
    .sort((left, right) => {
      if (left.sectionIndex !== right.sectionIndex)
        return (left.sectionIndex ?? 0) - (right.sectionIndex ?? 0)
      return (left.numberIndex ?? Number(left.number) ?? 0) - (right.numberIndex ?? Number(right.number) ?? 0)
    })
}

export async function saveChecklistItem(item, metadata = {}) {
  if (!db) return false
  await setDoc(
    doc(db, legacyCollection, item.id),
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
  if (!db) return false
  const batch = writeBatch(db)
  items.forEach((item) => {
    batch.set(
      doc(db, legacyCollection, item.id),
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
  if (!db) return false
  await deleteDoc(doc(db, legacyCollection, itemId))
  return true
}
