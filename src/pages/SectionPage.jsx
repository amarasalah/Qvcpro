import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle2,
  Factory,
  Search,
  Shield,
  TestTube,
} from 'lucide-react'

const SECTION_ICONS = {
  production: Factory,
  'assurance-qualite': Shield,
  'controle-qualite': TestTube,
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function SectionPage({ section, store }) {
  const { items, handleItemChange, STATUS_OPTIONS, STATUS_META } = store
  const [statusFilter, setStatusFilter] = useState('all')
  const [localSearch, setLocalSearch] = useState('')

  const sectionItems = useMemo(
    () => items.filter((i) => i.sectionId === section.id),
    [items, section.id],
  )

  const counts = useMemo(
    () =>
      sectionItems.reduce(
        (c, i) => {
          c[i.status] += 1
          return c
        },
        { conforming: 0, nonConforming: 0, pending: 0 },
      ),
    [sectionItems],
  )

  const done = counts.conforming + counts.nonConforming
  const progress = Math.round((done / sectionItems.length) * 100)

  const query = localSearch.trim().toLowerCase()

  const filtered = useMemo(
    () =>
      sectionItems.filter((item) => {
        const matchStatus = statusFilter === 'all' || item.status === statusFilter
        const matchQuery =
          !query ||
          [item.point, item.comment, item.actionPlan, STATUS_META[item.status].label]
            .join(' ')
            .toLowerCase()
            .includes(query)
        return matchStatus && matchQuery
      }),
    [sectionItems, statusFilter, query, STATUS_META],
  )

  const Icon = SECTION_ICONS[section.id] || CheckCircle2

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
    >
      {/* Hero */}
      <div className="section-hero">
        <div className="section-icon-box" style={{ background: `linear-gradient(135deg, ${section.accent}, ${section.accent}88)` }}>
          <Icon size={26} />
        </div>
        <div>
          <h1>{section.title}</h1>
          <p>{section.description}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="section-progress-bar">
        <motion.div
          className="section-progress-fill"
          style={{ background: `linear-gradient(90deg, ${section.accent}, ${section.accent}88)` }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {/* Stats */}
      <div className="section-stats-row">
        {[
          { label: 'Conformes', value: counts.conforming, color: '#22c55e' },
          { label: 'Non conformes', value: counts.nonConforming, color: '#f97316' },
          { label: 'À vérifier', value: counts.pending, color: '#94a3b8' },
        ].map((s) => (
          <motion.div
            className="glass-card section-stat-card"
            key={s.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="stat-number" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="section-filter-row">
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 300,
          background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.08)',
          borderRadius: 10, padding: '0 12px',
        }}>
          <Search size={14} style={{ color: '#64748b' }} />
          <input
            type="search"
            placeholder="Filtrer les points..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            style={{
              background: 'none', border: 'none', outline: 'none', color: '#f1f5f9',
              fontSize: 12, padding: '8px 0', width: '100%', fontFamily: 'inherit',
            }}
          />
        </div>
        <button
          className={`filter-btn ${statusFilter === 'all' ? 'is-active' : ''}`}
          onClick={() => setStatusFilter('all')}
          type="button"
        >
          Tous ({sectionItems.length})
        </button>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s.value}
            className={`filter-btn ${statusFilter === s.value ? 'is-active' : ''}`}
            onClick={() => setStatusFilter(s.value)}
            type="button"
          >
            {s.label} ({counts[s.value]})
          </button>
        ))}
      </div>

      {/* Checklist Cards */}
      <div className="checklist-grid">
        <AnimatePresence mode="popLayout">
          {filtered.map((item, index) => {
            const status = STATUS_META[item.status]
            return (
              <motion.article
                className={`checklist-card status-${item.status}`}
                key={item.id}
                layout
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.15) }}
              >
                <div className="card-top">
                  <div className="section-pill">
                    <span className="section-dot" style={{ backgroundColor: section.accent }} />
                    {section.title}
                    <strong>#{item.number}</strong>
                  </div>
                  <div className="card-status-wrap">
                    <span className="status-tag" style={{ color: status.color, borderColor: `${status.color}44` }}>
                      {status.label}
                    </span>
                    <span className="timestamp">{formatDateTime(item.lastUpdated)}</span>
                  </div>
                </div>

                <h3>{item.point}</h3>

                <div className="status-switch">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      className={`status-button status-${opt.value} ${opt.value === item.status ? 'is-active' : ''}`}
                      key={opt.value}
                      onClick={() => handleItemChange(item.id, 'status', opt.value)}
                      type="button"
                    >
                      <span>{opt.shortLabel}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>

                <label className="editor-field">
                  <span>Commentaire</span>
                  <textarea
                    onChange={(e) => handleItemChange(item.id, 'comment', e.target.value)}
                    placeholder="Observations terrain, contexte, mesure..."
                    value={item.comment}
                  />
                </label>

                <label className="editor-field">
                  <span>Plan d'action</span>
                  <textarea
                    onChange={(e) => handleItemChange(item.id, 'actionPlan', e.target.value)}
                    placeholder="Action corrective, responsable, délai..."
                    value={item.actionPlan}
                  />
                </label>
              </motion.article>
            )
          })}
        </AnimatePresence>

        {!filtered.length && (
          <motion.div
            className="empty-state"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Search size={22} />
            <strong>Aucun contrôle trouvé.</strong>
            <span>Essayez un autre filtre ou mot-clé.</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
