import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CHECKLIST_SECTIONS,
  createChecklistItems,
} from '../data/checklistTemplate'
import {
  deleteDailyItem,
  fetchDailyItems,
  isFirebaseConfigured,
  saveDailyItem,
  saveDailyMeta,
  syncDailyItems,
  listChecklistDates,
} from '../lib/firebase'

const FIREBASE_READY = isFirebaseConfigured()

function todayStr() {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

const STATUS_OPTIONS = [
  { value: 'conforming', label: 'Conforme', shortLabel: 'C', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  { value: 'nonConforming', label: 'Non conforme', shortLabel: 'NC', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { value: 'pending', label: 'À vérifier', shortLabel: 'À faire', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
]

const STATUS_META = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.value, s]),
)

const SECTION_INDEX_LOOKUP = CHECKLIST_SECTIONS.reduce((m, s, i) => {
  m[s.id] = i
  return m
}, {})

const SECTION_LOOKUP = CHECKLIST_SECTIONS.reduce((m, s) => {
  m[s.id] = s
  return m
}, {})

export function useChecklistStore() {
  const [currentDate, setCurrentDate] = useState(todayStr())
  const [items, setItems] = useState(() => createChecklistItems())
  const [searchQuery, setSearchQuery] = useState('')
  const [availableDates, setAvailableDates] = useState([])
  const [firebaseState, setFirebaseState] = useState({
    loading: false,
    syncing: false,
    error: '',
    syncedAt: null,
    remoteCount: 0,
  })

  const isToday = currentDate === todayStr()

  // Load daily checklist from Firebase
  const loadDailyItems = useCallback(async (date) => {
    if (!FIREBASE_READY) return
    setFirebaseState((s) => ({ ...s, loading: true, error: '' }))
    try {
      const remote = await fetchDailyItems(date)
      if (remote.length > 0) {
        // Merge with template to pick up any new template items
        const template = createChecklistItems()
        const remoteMap = new Map(remote.map((i) => [i.id, i]))
        const merged = template.map((t) => remoteMap.has(t.id) ? { ...t, ...remoteMap.get(t.id) } : t)
        // Also include any custom items not in template
        const templateIds = new Set(template.map((t) => t.id))
        const extras = remote.filter((r) => !templateIds.has(r.id))
        setItems([...merged, ...extras])
      } else {
        // No data for this date — create fresh from template
        setItems(createChecklistItems())
      }
      setFirebaseState((s) => ({
        ...s,
        loading: false,
        syncedAt: Date.now(),
        remoteCount: remote.length,
      }))
    } catch (err) {
      setFirebaseState((s) => ({
        ...s,
        loading: false,
        error: err?.message || 'Erreur de chargement.',
      }))
    }
  }, [])

  // Load available dates
  const loadDates = useCallback(async () => {
    if (!FIREBASE_READY) return
    try {
      const dates = await listChecklistDates()
      setAvailableDates(dates)
    } catch { /* ignore */ }
  }, [])

  // Load on mount and when date changes
  useEffect(() => {
    if (FIREBASE_READY) {
      loadDailyItems(currentDate)
      loadDates()
    }
  }, [currentDate, loadDailyItems, loadDates])

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
  }, [items, currentDate, loadDailyItems, loadDates])

  const loadRemoteItems = useCallback(async () => {
    await loadDailyItems(currentDate)
  }, [currentDate, loadDailyItems])

  // Update single item
  const handleItemChange = useCallback((itemId, field, value) => {
    setItems((cur) =>
      cur.map((item) =>
        item.id === itemId
          ? { ...item, [field]: value, lastUpdated: Date.now() }
          : item,
      ),
    )
  }, [])

  // Add new item
  const addItem = useCallback((sectionId, pointText) => {
    const section = SECTION_LOOKUP[sectionId]
    if (!section || !pointText.trim()) return null

    const sectionItems = items.filter((i) => i.sectionId === sectionId)
    const nextNumber = String(sectionItems.length + 1)
    const newId = `${sectionId}-${Date.now()}`

    const newItem = {
      id: newId,
      sectionId,
      sectionTitle: section.title,
      number: nextNumber,
      point: pointText.trim(),
      status: 'pending',
      comment: '',
      actionPlan: '',
      images: [],
      lastUpdated: Date.now(),
    }

    setItems((cur) => [...cur, newItem])
    return newItem
  }, [items])

  // Delete item
  const deleteItem = useCallback(async (itemId) => {
    setItems((cur) => cur.filter((item) => item.id !== itemId))
    if (FIREBASE_READY) {
      try { await deleteDailyItem(currentDate, itemId) } catch { /* ignore */ }
    }
  }, [currentDate])

  // Image operations
  const addImage = useCallback((itemId, imageData) => {
    setItems((cur) =>
      cur.map((item) =>
        item.id === itemId
          ? { ...item, images: [...(item.images || []), imageData], lastUpdated: Date.now() }
          : item,
      ),
    )
  }, [])

  const removeImage = useCallback((itemId, publicId) => {
    setItems((cur) =>
      cur.map((item) =>
        item.id === itemId
          ? { ...item, images: (item.images || []).filter((img) => img.publicId !== publicId), lastUpdated: Date.now() }
          : item,
      ),
    )
  }, [])

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
      CHECKLIST_SECTIONS.map((section) => {
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
    [items],
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
