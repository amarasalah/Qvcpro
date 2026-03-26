import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  FileSpreadsheet,
  RefreshCcw,
  Search,
  Shield,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './dashboard.css'
import {
  CHECKLIST_SECTIONS,
  WORKBOOK_SUMMARY,
  createChecklistItems,
} from './data/checklistTemplate'
import {
  fetchChecklistItems,
  isFirebaseConfigured,
  syncChecklistItems,
} from './lib/firebase'

const STORAGE_KEY = 'qvc-quality-platform-state-v1'
const FIREBASE_READY = isFirebaseConfigured()

const STATUS_OPTIONS = [
  {
    value: 'conforming',
    label: 'Conforme',
    shortLabel: 'C',
    color: '#22c55e',
  },
  {
    value: 'nonConforming',
    label: 'Non conforme',
    shortLabel: 'NC',
    color: '#f97316',
  },
  {
    value: 'pending',
    label: 'À vérifier',
    shortLabel: 'À faire',
    color: '#94a3b8',
  },
]

const STATUS_META = Object.fromEntries(
  STATUS_OPTIONS.map((status) => [status.value, status]),
)

const SECTION_INDEX_LOOKUP = CHECKLIST_SECTIONS.reduce((lookup, section, index) => {
  lookup[section.id] = index
  return lookup
}, {})

const SECTION_LOOKUP = CHECKLIST_SECTIONS.reduce((lookup, section) => {
  lookup[section.id] = section
  return lookup
}, {})

function loadLocalItems() {
  try {
    const rawState = window.localStorage.getItem(STORAGE_KEY)

    if (!rawState) {
      return []
    }

    const parsed = JSON.parse(rawState)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function mergeItems(baseItems, incomingItems) {
  const incomingMap = new Map((incomingItems || []).map((item) => [item.id, item]))

  return baseItems.map((item) => {
    if (!incomingMap.has(item.id)) {
      return item
    }

    return {
      ...item,
      ...incomingMap.get(item.id),
    }
  })
}

function formatDateTime(value) {
  if (!value) {
    return 'Pas encore'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getPriority(item) {
  if (item.status === 'nonConforming') {
    return 0
  }

  if (item.actionPlan.trim()) {
    return 1
  }

  if (item.status === 'pending') {
    return 2
  }

  return 3
}

export default function DashboardApp() {
  const [items, setItems] = useState(() =>
    mergeItems(createChecklistItems(), loadLocalItems()),
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSection, setSelectedSection] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [firebaseState, setFirebaseState] = useState({
    loading: false,
    syncing: false,
    error: '',
    syncedAt: null,
    remoteCount: 0,
  })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const loadRemoteItems = useCallback(async () => {
    if (!FIREBASE_READY) {
      return
    }

    setFirebaseState((current) => ({
      ...current,
      loading: true,
      error: '',
    }))

    try {
      const remoteItems = await fetchChecklistItems()

      setItems((currentItems) =>
        remoteItems.length ? mergeItems(currentItems, remoteItems) : currentItems,
      )

      setFirebaseState((current) => ({
        ...current,
        loading: false,
        syncedAt: Date.now(),
        remoteCount: remoteItems.length,
      }))
    } catch (error) {
      setFirebaseState((current) => ({
        ...current,
        loading: false,
        error: error?.message || 'Impossible de charger les données Firebase.',
      }))
    }
  }, [])

  useEffect(() => {
    if (FIREBASE_READY) {
      loadRemoteItems()
    }
  }, [loadRemoteItems])

  const handleSync = useCallback(async () => {
    if (!FIREBASE_READY) {
      setFirebaseState((current) => ({
        ...current,
        error:
          'Ajoutez vos variables VITE_FIREBASE_* pour activer la synchronisation cloud.',
      }))
      return
    }

    setFirebaseState((current) => ({
      ...current,
      syncing: true,
      error: '',
    }))

    try {
      await syncChecklistItems(items, SECTION_INDEX_LOOKUP)
      await loadRemoteItems()

      setFirebaseState((current) => ({
        ...current,
        syncing: false,
        syncedAt: Date.now(),
      }))
    } catch (error) {
      setFirebaseState((current) => ({
        ...current,
        syncing: false,
        error: error?.message || 'La synchronisation Firebase a échoué.',
      }))
    }
  }, [items, loadRemoteItems])

  const handleItemChange = useCallback((itemId, field, value) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]: value,
              lastUpdated: Date.now(),
            }
          : item,
      ),
    )
  }, [])

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const statusCounts = useMemo(() => {
    return items.reduce(
      (counts, item) => {
        counts[item.status] += 1
        return counts
      },
      {
        conforming: 0,
        nonConforming: 0,
        pending: 0,
      },
    )
  }, [items])

  const completionCount = statusCounts.conforming + statusCounts.nonConforming
  const completionRate = Math.round((completionCount / items.length) * 100)
  const commentCount = items.filter((item) => item.comment.trim()).length
  const actionCount = items.filter((item) => item.actionPlan.trim()).length

  const sectionChartData = useMemo(
    () =>
      CHECKLIST_SECTIONS.map((section) => {
        const sectionItems = items.filter((item) => item.sectionId === section.id)

        return {
          name: section.shortTitle,
          conforming: sectionItems.filter((item) => item.status === 'conforming').length,
          nonConforming: sectionItems.filter((item) => item.status === 'nonConforming').length,
          pending: sectionItems.filter((item) => item.status === 'pending').length,
        }
      }),
    [items],
  )

  const statusChartData = useMemo(
    () =>
      STATUS_OPTIONS.map((status) => ({
        name: status.label,
        value: statusCounts[status.value],
        color: status.color,
      })),
    [statusCounts],
  )

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesSection =
          selectedSection === 'all' || item.sectionId === selectedSection
        const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus
        const matchesQuery =
          !normalizedQuery ||
          [
            item.sectionTitle,
            item.number,
            item.point,
            STATUS_META[item.status].label,
            item.comment,
            item.actionPlan,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery)

        return matchesSection && matchesStatus && matchesQuery
      }),
    [items, normalizedQuery, selectedSection, selectedStatus],
  )

  const focusItems = useMemo(
    () =>
      [...items]
        .filter(
          (item) =>
            item.status === 'nonConforming' ||
            item.status === 'pending' ||
            item.actionPlan.trim(),
        )
        .sort((left, right) => {
          const priorityDelta = getPriority(left) - getPriority(right)

          if (priorityDelta !== 0) {
            return priorityDelta
          }

          return (right.lastUpdated || 0) - (left.lastUpdated || 0)
        })
        .slice(0, 6),
    [items],
  )

  const metricCards = [
    {
      label: 'Points de contrôle',
      value: items.length,
      icon: FileSpreadsheet,
      detail: `${WORKBOOK_SUMMARY.sheetCount} feuilles analysées`,
    },
    {
      label: 'Conformes',
      value: statusCounts.conforming,
      icon: CheckCircle2,
      detail: `${statusCounts.pending} encore à vérifier`,
    },
    {
      label: 'Non conformes',
      value: statusCounts.nonConforming,
      icon: AlertTriangle,
      detail: `${actionCount} plans d'action renseignés`,
    },
    {
      label: 'Couverture',
      value: `${completionRate}%`,
      icon: Activity,
      detail: `${commentCount} commentaires saisis`,
    },
  ]

  return (
    <div className="quality-app">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="quality-shell">
        <motion.section
          className="glass-panel hero-panel"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <div className="hero-copy">
            <div className="eyebrow">
              <Sparkles size={16} />
              Plateforme qualité béton précontraint
            </div>
            <h1>Le fichier Excel devient un cockpit qualité animé et exploitable.</h1>
            <p className="hero-text">
              Les feuilles <strong>Production</strong>, <strong>Assurance Qualité</strong>{' '}
              et <strong>Contrôle Qualité</strong> ont été normalisées en checklist
              dynamique, moteur de recherche, tableaux de bord et synchronisation
              Firebase.
            </p>
            <div className="hero-badges">
              <span className="badge-chip">
                <FileSpreadsheet size={14} />
                {WORKBOOK_SUMMARY.fileName}
              </span>
              <span className="badge-chip">
                <BarChart3 size={14} />
                {WORKBOOK_SUMMARY.totalControls} contrôles indexés
              </span>
              <span
                className={`badge-chip ${FIREBASE_READY ? 'is-online' : 'is-offline'}`}
              >
                {FIREBASE_READY ? <Wifi size={14} /> : <WifiOff size={14} />}
                {FIREBASE_READY ? 'Firebase prêt' : 'Mode local sécurisé'}
              </span>
            </div>
            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={handleSync}
                disabled={firebaseState.syncing || firebaseState.loading}
                type="button"
              >
                {firebaseState.syncing ? (
                  <RefreshCcw className="button-icon spin" size={16} />
                ) : (
                  <Database className="button-icon" size={16} />
                )}
                {FIREBASE_READY ? 'Synchroniser vers Firebase' : 'Activer Firebase'}
              </button>
              <button
                className="secondary-button"
                onClick={loadRemoteItems}
                disabled={!FIREBASE_READY || firebaseState.loading || firebaseState.syncing}
                type="button"
              >
                <RefreshCcw
                  className={`button-icon ${firebaseState.loading ? 'spin' : ''}`}
                  size={16}
                />
                Recharger le cloud
              </button>
            </div>
            {firebaseState.error ? (
              <p className="inline-feedback is-error">{firebaseState.error}</p>
            ) : null}
          </div>

          <div className="hero-card-grid">
            <div className="mini-panel">
              <div className="mini-panel-head">
                <Shield size={16} />
                <span>Scan du classeur</span>
              </div>
              <div className="scan-list">
                {CHECKLIST_SECTIONS.map((section) => (
                  <div className="scan-row" key={section.id}>
                    <span>{section.title}</span>
                    <strong>{section.items.length} points</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="mini-panel">
              <div className="mini-panel-head">
                <Database size={16} />
                <span>État Firebase</span>
              </div>
              <div className="mini-metric">
                <strong>
                  {FIREBASE_READY
                    ? `${firebaseState.remoteCount || 0} documents chargés`
                    : 'Configuration requise'}
                </strong>
                <span>
                  {FIREBASE_READY
                    ? `Dernière activité : ${formatDateTime(firebaseState.syncedAt)}`
                    : 'Ajoutez les clés VITE_FIREBASE_* pour activer le cloud'}
                </span>
              </div>
            </div>

            <div className="mini-panel">
              <div className="mini-panel-head">
                <Clock3 size={16} />
                <span>Recherche opérationnelle</span>
              </div>
              <div className="mini-metric">
                <strong>{filteredItems.length} résultat(s) actifs</strong>
                <span>
                  Les commentaires, plans d'action et statuts sont inclus dans la
                  recherche.
                </span>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="metrics-grid">
          {metricCards.map((card, index) => {
            const Icon = card.icon

            return (
              <motion.article
                className="glass-panel metric-card"
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.08 + index * 0.06 }}
              >
                <div className="metric-head">
                  <span>{card.label}</span>
                  <Icon size={18} />
                </div>
                <strong className="metric-value">{card.value}</strong>
                <span className="metric-detail">{card.detail}</span>
              </motion.article>
            )
          })}
        </section>

        <section className="workspace-grid">
          <div className="glass-panel search-panel">
            <label className="search-input" htmlFor="global-search">
              <Search size={18} />
              <input
                className="control-field"
                id="global-search"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Rechercher un contrôle, un statut, un commentaire ou une action..."
                type="search"
                value={searchQuery}
              />
            </label>

            <select
              className="control-field"
              onChange={(event) => setSelectedSection(event.target.value)}
              value={selectedSection}
            >
              <option value="all">Toutes les sections</option>
              {CHECKLIST_SECTIONS.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </select>

            <select
              className="control-field"
              onChange={(event) => setSelectedStatus(event.target.value)}
              value={selectedStatus}
            >
              <option value="all">Tous les statuts</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className="chart-grid">
            <motion.article
              className="glass-panel chart-panel"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
            >
              <div className="panel-heading">
                <div>
                  <h2>Progression par section</h2>
                  <p>Lecture directe des conformités, non-conformités et points restants.</p>
                </div>
              </div>
              <ResponsiveContainer height={300} width="100%">
                <BarChart data={sectionChartData} barSize={28}>
                  <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} width={34} />
                  <Tooltip
                    contentStyle={{
                      background: '#0f172a',
                      borderRadius: 18,
                      border: '1px solid rgba(148, 163, 184, 0.18)',
                    }}
                    cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                  />
                  <Bar dataKey="conforming" fill="#22c55e" name="Conformes" radius={[10, 10, 0, 0]} stackId="status" />
                  <Bar dataKey="nonConforming" fill="#f97316" name="Non conformes" radius={[10, 10, 0, 0]} stackId="status" />
                  <Bar dataKey="pending" fill="#94a3b8" name="À vérifier" radius={[10, 10, 0, 0]} stackId="status" />
                </BarChart>
              </ResponsiveContainer>
            </motion.article>

            <motion.article
              className="glass-panel chart-panel"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.18 }}
            >
              <div className="panel-heading">
                <div>
                  <h2>Répartition des statuts</h2>
                  <p>Vue synthétique pour arbitrer rapidement les priorités qualité.</p>
                </div>
              </div>
              <ResponsiveContainer height={300} width="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="value"
                    innerRadius={72}
                    outerRadius={100}
                    paddingAngle={4}
                  >
                    {statusChartData.map((status) => (
                      <Cell fill={status.color} key={status.name} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#0f172a',
                      borderRadius: 18,
                      border: '1px solid rgba(148, 163, 184, 0.18)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                {statusChartData.map((status) => (
                  <div className="legend-chip" key={status.name}>
                    <span style={{ background: status.color }} />
                    {status.name}
                    <strong>{status.value}</strong>
                  </div>
                ))}
              </div>
            </motion.article>
          </div>
        </section>

        <section className="content-grid">
          <motion.aside
            className="glass-panel focus-panel"
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
          >
            <div className="panel-heading">
              <div>
                <h2>Zone d'attention</h2>
                <p>Les points qui doivent être traités en priorité.</p>
              </div>
            </div>
            <div className="focus-list">
              {focusItems.map((item) => {
                const section = SECTION_LOOKUP[item.sectionId]
                const status = STATUS_META[item.status]

                return (
                  <div
                    className={`focus-item ${item.status === 'nonConforming' ? 'is-critical' : ''}`}
                    key={item.id}
                  >
                    <div className="focus-item-head">
                      <span className="focus-chip">{section.shortTitle}</span>
                      <span className="focus-status" style={{ color: status.color }}>
                        {status.label}
                      </span>
                    </div>
                    <p>{item.point}</p>
                    <span className="focus-meta">
                      {item.actionPlan.trim() || 'Ajoutez un plan d’action pour piloter ce point.'}
                    </span>
                  </div>
                )
              })}
            </div>
          </motion.aside>

          <motion.div
            className="glass-panel checklist-panel"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
          >
            <div className="panel-heading checklist-heading">
              <div>
                <h2>Pilotage des contrôles</h2>
                <p>
                  {filteredItems.length} résultat(s) sur {items.length}. Chaque carte est
                  éditable et prête à être synchronisée avec Firebase.
                </p>
              </div>
            </div>

            <div className="checklist-grid">
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item, index) => {
                  const section = SECTION_LOOKUP[item.sectionId]
                  const status = STATUS_META[item.status]

                  return (
                    <motion.article
                      className={`checklist-card status-${item.status}`}
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.22, delay: Math.min(index * 0.02, 0.16) }}
                    >
                      <div className="card-top">
                        <div className="section-pill">
                          <span
                            className="section-dot"
                            style={{ backgroundColor: section.accent }}
                          />
                          {section.title}
                          <strong>#{item.number}</strong>
                        </div>
                        <div className="card-status-wrap">
                          <span
                            className="status-tag"
                            style={{ color: status.color, borderColor: `${status.color}44` }}
                          >
                            {status.label}
                          </span>
                          <span className="timestamp">{formatDateTime(item.lastUpdated)}</span>
                        </div>
                      </div>

                      <h3>{item.point}</h3>

                      <div className="status-switch">
                        {STATUS_OPTIONS.map((option) => (
                          <button
                            className={`status-button status-${option.value} ${
                              option.value === item.status ? 'is-active' : ''
                            }`}
                            key={option.value}
                            onClick={() => handleItemChange(item.id, 'status', option.value)}
                            type="button"
                          >
                            <span>{option.shortLabel}</span>
                            {option.label}
                          </button>
                        ))}
                      </div>

                      <label className="editor-field">
                        <span>Commentaire</span>
                        <textarea
                          onChange={(event) =>
                            handleItemChange(item.id, 'comment', event.target.value)
                          }
                          placeholder="Observations terrain, preuve, contexte, mesure..."
                          value={item.comment}
                        />
                      </label>

                      <label className="editor-field">
                        <span>Plan d'action</span>
                        <textarea
                          onChange={(event) =>
                            handleItemChange(item.id, 'actionPlan', event.target.value)
                          }
                          placeholder="Action corrective, responsable, délai, contrôle de fermeture..."
                          value={item.actionPlan}
                        />
                      </label>
                    </motion.article>
                  )
                })}
              </AnimatePresence>

              {!filteredItems.length ? (
                <motion.div
                  className="empty-state"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Search size={22} />
                  <strong>Aucun contrôle ne correspond à vos filtres.</strong>
                  <span>Essayez une autre section, un autre statut ou un mot-clé plus large.</span>
                </motion.div>
              ) : null}
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  )
}
