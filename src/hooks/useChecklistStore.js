import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CHECKLIST_SECTIONS,
  createChecklistItems,
} from '../data/checklistTemplate'
import {
  deleteChecklistItem,
  fetchChecklistItems,
  isFirebaseConfigured,
  saveChecklistItem,
  syncChecklistItems,
} from '../lib/firebase'

const STORAGE_KEY = 'qvc-quality-platform-state-v2'
const FIREBASE_READY = isFirebaseConfigured()

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

function loadLocal() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function mergeItems(base, incoming) {
  const map = new Map((incoming || []).map((item) => [item.id, item]))
  return base.map((item) =>
    map.has(item.id) ? { ...item, ...map.get(item.id) } : item,
  )
}

export function useChecklistStore() {
  const [items, setItems] = useState(() =>
    mergeItems(createChecklistItems(), loadLocal()),
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [firebaseState, setFirebaseState] = useState({
    loading: false,
    syncing: false,
    error: '',
    syncedAt: null,
    remoteCount: 0,
  })

  // Persist to localStorage
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  // Load from Firebase on mount
  const loadRemoteItems = useCallback(async () => {
    if (!FIREBASE_READY) return
    setFirebaseState((s) => ({ ...s, loading: true, error: '' }))
    try {
      const remote = await fetchChecklistItems()
      setItems((cur) => (remote.length ? mergeItems(cur, remote) : cur))
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
        error: err?.message || 'Erreur de chargement Firebase.',
      }))
    }
  }, [])

  useEffect(() => {
    if (FIREBASE_READY) loadRemoteItems()
  }, [loadRemoteItems])

  // Sync all to Firebase
  const handleSync = useCallback(async () => {
    if (!FIREBASE_READY) {
      setFirebaseState((s) => ({
        ...s,
        error: 'Ajoutez vos variables VITE_FIREBASE_* pour activer la synchronisation.',
      }))
      return
    }
    setFirebaseState((s) => ({ ...s, syncing: true, error: '' }))
    try {
      await syncChecklistItems(items, SECTION_INDEX_LOOKUP)
      await loadRemoteItems()
      setFirebaseState((s) => ({ ...s, syncing: false, syncedAt: Date.now() }))
    } catch (err) {
      setFirebaseState((s) => ({
        ...s,
        syncing: false,
        error: err?.message || 'Échec de la synchronisation.',
      }))
    }
  }, [items, loadRemoteItems])

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

  // Add new item to a section
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
      lastUpdated: Date.now(),
    }

    setItems((cur) => [...cur, newItem])
    return newItem
  }, [items])

  // Delete item
  const deleteItem = useCallback(async (itemId) => {
    setItems((cur) => cur.filter((item) => item.id !== itemId))

    if (FIREBASE_READY) {
      try {
        await deleteChecklistItem(itemId)
      } catch (err) {
        console.error('Firebase delete failed:', err)
      }
    }
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
        return [item.sectionTitle, item.number, item.point, STATUS_META[item.status].label, item.comment, item.actionPlan]
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
            i.actionPlan.trim(),
        )
        .sort((a, b) => {
          const pa = a.status === 'nonConforming' ? 0 : a.actionPlan.trim() ? 1 : a.status === 'pending' ? 2 : 3
          const pb = b.status === 'nonConforming' ? 0 : b.actionPlan.trim() ? 1 : b.status === 'pending' ? 2 : 3
          if (pa !== pb) return pa - pb
          return (b.lastUpdated || 0) - (a.lastUpdated || 0)
        })
        .slice(0, 6),
    [items],
  )

  return {
    items,
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
    handleSync,
    loadRemoteItems,
    STATUS_OPTIONS,
    STATUS_META,
    SECTION_LOOKUP,
    SECTION_INDEX_LOOKUP,
  }
}
