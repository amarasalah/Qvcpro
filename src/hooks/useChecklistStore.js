import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CHECKLIST_SECTIONS as DEFAULT_SECTIONS,
  createChecklistItems,
} from '../data/checklistTemplate'
import {
  addModuleItem,
  deleteDailyItem,
  fetchDailyItems,
  fetchModules,
  isFirebaseConfigured,
  saveDailyItem,
  saveDailyMeta,
  seedModules,
  syncDailyItems,
  listChecklistDates,
} from '../lib/firebase'

const FIREBASE_READY = isFirebaseConfigured()
const LS_PREFIX = 'qvc-checklist-'

function todayStr() {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

function loadFromLocalStorage(dateStr) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + dateStr)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return null
}

function saveToLocalStorage(dateStr, items) {
  try {
    localStorage.setItem(LS_PREFIX + dateStr, JSON.stringify(items))
  } catch { /* ignore */ }
}

const STATUS_OPTIONS = [
  { value: 'conforming', label: 'Conforme', shortLabel: 'C', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  { value: 'nonConforming', label: 'Non conforme', shortLabel: 'NC', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { value: 'pending', label: 'À vérifier', shortLabel: 'À faire', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
]

const STATUS_META = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.value, s]),
)

/**
 * Create checklist items from a modules array (from Firestore or fallback)
 */
function createItemsFromModules(modules) {
  return modules.flatMap((section) =>
    (section.items || []).map((point, index) => ({
      id: `${section.id}-${index + 1}`,
      sectionId: section.id,
      sectionTitle: section.title,
      number: String(index + 1),
      point,
      status: 'pending',
      comment: '',
      actionPlan: '',
      lastUpdated: null,
    })),
  )
}

export function useChecklistStore() {
  // Modules loaded from Firestore (or fallback to static template)
  const [modules, setModules] = useState(DEFAULT_SECTIONS)
  const [modulesLoaded, setModulesLoaded] = useState(false)

  const [currentDate, setCurrentDate] = useState(todayStr())
  const [items, setItems] = useState(() => {
    const cached = loadFromLocalStorage(todayStr())
    return cached && cached.length > 0 ? cached : createChecklistItems()
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [availableDates, setAvailableDates] = useState([])
  const [firebaseState, setFirebaseState] = useState({
    loading: false,
    syncing: false,
    error: '',
    syncedAt: null,
    remoteCount: 0,
  })

  const saveTimers = useRef({})
  const currentDateRef = useRef(currentDate)
  currentDateRef.current = currentDate

  const isToday = currentDate === todayStr()

  // Build lookups from dynamic modules
  const SECTION_INDEX_LOOKUP = useMemo(
    () => modules.reduce((m, s, i) => { m[s.id] = i; return m }, {}),
    [modules],
  )

  const SECTION_LOOKUP = useMemo(
    () => modules.reduce((m, s) => { m[s.id] = s; return m }, {}),
    [modules],
  )

  // Load modules from Firestore on mount + seed if needed
  useEffect(() => {
    if (!FIREBASE_READY) {
      setModulesLoaded(true)
      return
    }

    async function loadModules() {
      try {
        // Seed default modules if they don't exist
        await seedModules(DEFAULT_SECTIONS)

        // Fetch all modules from Firestore
        const dbModules = await fetchModules()
        if (dbModules.length > 0) {
          setModules(dbModules)
        }
      } catch (err) {
        console.warn('Failed to load modules from DB, using defaults:', err)
      } finally {
        setModulesLoaded(true)
      }
    }

    loadModules()
  }, [])

  // When modules change, rebuild items if needed (only for fresh days)
  useEffect(() => {
    if (!modulesLoaded) return
    // Only apply when there's no existing data
    const cached = loadFromLocalStorage(currentDate)
    if (!cached || cached.length === 0) {
      setItems(createItemsFromModules(modules))
    }
  }, [modulesLoaded, modules, currentDate])

  // Persist items to localStorage on every change
  useEffect(() => {
    saveToLocalStorage(currentDate, items)
  }, [items, currentDate])

  // Auto-save a single item to Firebase (debounced 600ms)
  const saveItemToFirebase = useCallback((item) => {
    if (!FIREBASE_READY) return
    const key = item.id
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key])
    saveTimers.current[key] = setTimeout(async () => {
      try {
        await saveDailyItem(currentDateRef.current, {
          ...item,
          sectionIndex: SECTION_INDEX_LOOKUP[item.sectionId] ?? 0,
        })
      } catch (err) {
        console.warn('Auto-save failed for', item.id, err)
      }
    }, 600)
  }, [SECTION_INDEX_LOOKUP])

  // Load daily checklist from Firebase
  const loadDailyItems = useCallback(async (date) => {
    if (!FIREBASE_READY) return
    setFirebaseState((s) => ({ ...s, loading: true, error: '' }))
    try {
      const remote = await fetchDailyItems(date)
      if (remote.length > 0) {
        // Merge with template to pick up any new template items
        const template = createItemsFromModules(modules)
        const remoteMap = new Map(remote.map((i) => [i.id, i]))
        const merged = template.map((t) => remoteMap.has(t.id) ? { ...t, ...remoteMap.get(t.id) } : t)
        // Also include any custom items not in template
        const templateIds = new Set(template.map((t) => t.id))
        const extras = remote.filter((r) => !templateIds.has(r.id))
        const finalItems = [...merged, ...extras]
        setItems(finalItems)
        saveToLocalStorage(date, finalItems)
      } else {
        // No remote data — try localStorage, else create fresh
        const cached = loadFromLocalStorage(date)
        if (cached && cached.length > 0) {
          setItems(cached)
        } else {
          setItems(createItemsFromModules(modules))
        }
      }
      setFirebaseState((s) => ({
        ...s,
        loading: false,
        syncedAt: Date.now(),
        remoteCount: remote.length,
      }))
    } catch (err) {
      // On Firebase error, fallback to localStorage
      const cached = loadFromLocalStorage(date)
      if (cached && cached.length > 0) setItems(cached)
      setFirebaseState((s) => ({
        ...s,
        loading: false,
        error: err?.message || 'Erreur de chargement.',
      }))
    }
  }, [modules])

  // Load available dates
  const loadDates = useCallback(async () => {
    if (!FIREBASE_READY) return
    try {
      const dates = await listChecklistDates()
      setAvailableDates(dates)
    } catch { /* ignore */ }
  }, [])

  // Load on mount and when date changes (after modules are loaded)
  useEffect(() => {
    if (!modulesLoaded) return
    if (FIREBASE_READY) {
      loadDailyItems(currentDate)
      loadDates()
    }
  }, [currentDate, modulesLoaded, loadDailyItems, loadDates])

  // Sync all items to Firebase for current date
  const handleSync = useCallback(async () => {
    if (!FIREBASE_READY) {
      setFirebaseState((s) => ({
        ...s,
        error: 'Firebase non configuré.',
      }))
      return
    }
    setFirebaseState((s) => ({ ...s, syncing: true, error: '' }))
    try {
      await syncDailyItems(currentDate, items, SECTION_INDEX_LOOKUP)
      await saveDailyMeta(currentDate, {
        date: currentDate,
        totalItems: items.length,
        createdAt: new Date().toISOString(),
      })
      await loadDailyItems(currentDate)
      await loadDates()
      setFirebaseState((s) => ({ ...s, syncing: false, syncedAt: Date.now() }))
    } catch (err) {
      setFirebaseState((s) => ({
        ...s,
        syncing: false,
        error: err?.message || 'Échec de la synchronisation.',
      }))
    }
  }, [items, currentDate, SECTION_INDEX_LOOKUP, loadDailyItems, loadDates])

  const loadRemoteItems = useCallback(async () => {
    await loadDailyItems(currentDate)
  }, [currentDate, loadDailyItems])

  // Update single item — auto-saves to Firebase
  const handleItemChange = useCallback((itemId, field, value) => {
    setItems((cur) => {
      const updated = cur.map((item) =>
        item.id === itemId
          ? { ...item, [field]: value, lastUpdated: Date.now() }
          : item,
      )
      const changedItem = updated.find((i) => i.id === itemId)
      if (changedItem) saveItemToFirebase(changedItem)
      return updated
    })
  }, [saveItemToFirebase])

  // Add new item — persists to module template (visible on ALL dates) + saves as daily item
  const addItem = useCallback(async (sectionId, pointText) => {
    const section = SECTION_LOOKUP[sectionId]
    if (!section || !pointText.trim()) return null

    const trimmedPoint = pointText.trim()

    // 1. Persist to the module template in Firestore so every date sees this task
    if (FIREBASE_READY) {
      try {
        await addModuleItem(sectionId, trimmedPoint)
        // Update local modules state so current session reflects immediately
        setModules((prevModules) =>
          prevModules.map((m) =>
            m.id === sectionId
              ? { ...m, items: [...(m.items || []), trimmedPoint] }
              : m
          )
        )
      } catch (err) {
        console.warn('Could not persist task to module template:', err)
      }
    }

    // 2. Build the item — count existing items for this section to compute next number
    const sectionItemsCount = items.filter((i) => i.sectionId === sectionId).length
    const nextIndex = sectionItemsCount + 1
    const newId = `${sectionId}-${nextIndex}`

    const newItem = {
      id: newId,
      sectionId,
      sectionTitle: section.title,
      number: String(nextIndex),
      point: trimmedPoint,
      status: 'pending',
      comment: '',
      actionPlan: '',
      images: [],
      lastUpdated: Date.now(),
    }

    setItems((cur) => {
      // Avoid duplicate if a re-render already added via module reload
      if (cur.find((i) => i.id === newId)) return cur
      return [...cur, newItem]
    })
    saveItemToFirebase(newItem)
    return newItem
  }, [items, SECTION_LOOKUP, saveItemToFirebase])

  // Delete item
  const deleteItem = useCallback(async (itemId) => {
    setItems((cur) => cur.filter((item) => item.id !== itemId))
    if (FIREBASE_READY) {
      try { await deleteDailyItem(currentDate, itemId) } catch { /* ignore */ }
    }
  }, [currentDate])

  // Image operations — auto-save to Firebase
  const addImage = useCallback((itemId, imageData) => {
    setItems((cur) => {
      const updated = cur.map((item) =>
        item.id === itemId
          ? { ...item, images: [...(item.images || []), imageData], lastUpdated: Date.now() }
          : item,
      )
      const changedItem = updated.find((i) => i.id === itemId)
      if (changedItem) saveItemToFirebase(changedItem)
      return updated
    })
  }, [saveItemToFirebase])

  const removeImage = useCallback((itemId, publicId) => {
    setItems((cur) => {
      const updated = cur.map((item) =>
        item.id === itemId
          ? { ...item, images: (item.images || []).filter((img) => img.publicId !== publicId), lastUpdated: Date.now() }
          : item,
      )
      const changedItem = updated.find((i) => i.id === itemId)
      if (changedItem) saveItemToFirebase(changedItem)
      return updated
    })
  }, [saveItemToFirebase])

  // Change date
  const switchDate = useCallback((newDate) => {
    setCurrentDate(newDate)
  }, [])

  // Computed values
  const statusCounts = useMemo(
    () =>
      items.reduce(
        (c, item) => {
          c[item.status] += 1
          return c
        },
        { conforming: 0, nonConforming: 0, pending: 0 },
      ),
    [items],
  )

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (!normalizedQuery) return true
        return [item.sectionTitle, item.number, item.point, STATUS_META[item.status]?.label, item.comment, item.actionPlan]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      }),
    [items, normalizedQuery],
  )

  const sectionChartData = useMemo(
    () =>
      modules.map((section) => {
        const sItems = items.filter((i) => i.sectionId === section.id)
        return {
          name: section.shortTitle,
          fullName: section.title,
          conforming: sItems.filter((i) => i.status === 'conforming').length,
          nonConforming: sItems.filter((i) => i.status === 'nonConforming').length,
          pending: sItems.filter((i) => i.status === 'pending').length,
          total: sItems.length,
          accent: section.accent,
        }
      }),
    [items, modules],
  )

  const statusChartData = useMemo(
    () =>
      STATUS_OPTIONS.map((s) => ({
        name: s.label,
        value: statusCounts[s.value],
        color: s.color,
      })),
    [statusCounts],
  )

  const recentActivity = useMemo(
    () =>
      [...items]
        .filter((i) => i.lastUpdated)
        .sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0))
        .slice(0, 8),
    [items],
  )

  const focusItems = useMemo(
    () =>
      [...items]
        .filter(
          (i) =>
            i.status === 'nonConforming' ||
            i.status === 'pending' ||
            (i.actionPlan && i.actionPlan.trim()),
        )
        .sort((a, b) => {
          const pa = a.status === 'nonConforming' ? 0 : (a.actionPlan && a.actionPlan.trim()) ? 1 : a.status === 'pending' ? 2 : 3
          const pb = b.status === 'nonConforming' ? 0 : (b.actionPlan && b.actionPlan.trim()) ? 1 : b.status === 'pending' ? 2 : 3
          if (pa !== pb) return pa - pb
          return (b.lastUpdated || 0) - (a.lastUpdated || 0)
        })
        .slice(0, 6),
    [items],
  )

  return {
    // Dynamic modules from DB
    modules,
    modulesLoaded,

    items,
    currentDate,
    isToday,
    availableDates,
    switchDate,
    searchQuery,
    setSearchQuery,
    firebaseState,
    firebaseReady: FIREBASE_READY,
    statusCounts,
    filteredItems,
    sectionChartData,
    statusChartData,
    recentActivity,
    focusItems,
    handleItemChange,
    addItem,
    deleteItem,
    addImage,
    removeImage,
    handleSync,
    loadRemoteItems,
    STATUS_OPTIONS,
    STATUS_META,
    SECTION_LOOKUP,
    SECTION_INDEX_LOOKUP,
  }
}
