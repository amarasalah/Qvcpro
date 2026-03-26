import { motion } from 'framer-motion'
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
  TrendingUp,
  Wifi,
  WifiOff,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar,
  Legend,
} from 'recharts'
import { CHECKLIST_SECTIONS, WORKBOOK_SUMMARY } from '../data/checklistTemplate'

function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

const tooltipStyle = {
  background: 'rgba(15,23,42,0.95)',
  borderRadius: 14,
  border: '1px solid rgba(148,163,184,0.15)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  fontSize: 12,
  padding: '10px 14px',
}

export default function DashboardPage({ store }) {
  const {
    items,
    statusCounts,
    sectionChartData,
    statusChartData,
    focusItems,
    firebaseState,
    firebaseReady,
    handleSync,
    loadRemoteItems,
    STATUS_META,
    SECTION_LOOKUP,
    recentActivity,
  } = store

  // Line chart data — conformity rate per section
  const lineChartData = CHECKLIST_SECTIONS.map((section) => {
    const sItems = items.filter((i) => i.sectionId === section.id)
    const conf = sItems.filter((i) => i.status === 'conforming').length
    const nc = sItems.filter((i) => i.status === 'nonConforming').length
    const done = conf + nc
    return {
      name: section.shortTitle,
      conformité: Math.round((conf / sItems.length) * 100),
      couverture: Math.round((done / sItems.length) * 100),
      nonConformité: Math.round((nc / sItems.length) * 100),
    }
  })

  // Cumulative line data from updates
  const cumulativeLineData = (() => {
    const updates = items
      .filter((i) => i.lastUpdated)
      .sort((a, b) => (a.lastUpdated || 0) - (b.lastUpdated || 0))
    if (!updates.length) return []
    let cumC = 0, cumNC = 0, cumP = items.length
    return updates.map((item, idx) => {
      if (item.status === 'conforming') { cumC++; cumP-- }
      if (item.status === 'nonConforming') { cumNC++; cumP-- }
      return {
        index: idx + 1,
        conformes: cumC,
        nonConformes: cumNC,
        traités: cumC + cumNC,
      }
    })
  })()

  const completionCount = statusCounts.conforming + statusCounts.nonConforming
  const completionRate = Math.round((completionCount / items.length) * 100)
  const commentCount = items.filter((i) => i.comment.trim()).length
  const actionCount = items.filter((i) => i.actionPlan.trim()).length

  const radialData = CHECKLIST_SECTIONS.map((section) => {
    const sItems = items.filter((i) => i.sectionId === section.id)
    const done = sItems.filter((i) => i.status !== 'pending').length
    return {
      name: section.shortTitle,
      value: Math.round((done / sItems.length) * 100),
      fill: section.accent,
    }
  })

  const metricCards = [
    {
      label: 'Points de contrôle',
      value: items.length,
      icon: FileSpreadsheet,
      detail: `${WORKBOOK_SUMMARY.sheetCount} feuilles analysées`,
      accent: '#38bdf8',
    },
    {
      label: 'Conformes',
      value: statusCounts.conforming,
      icon: CheckCircle2,
      detail: `${statusCounts.pending} encore à vérifier`,
      accent: '#22c55e',
    },
    {
      label: 'Non conformes',
      value: statusCounts.nonConforming,
      icon: AlertTriangle,
      detail: `${actionCount} plans d'action renseignés`,
      accent: '#f97316',
    },
    {
      label: 'Couverture',
      value: `${completionRate}%`,
      icon: Activity,
      detail: `${commentCount} commentaires saisis`,
      accent: '#a78bfa',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
    >
      {/* Hero Section */}
      <motion.div
        className="glass-card"
        style={{ marginBottom: 24, position: 'relative', overflow: 'hidden' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #38bdf8, #a78bfa, #f97316)', borderRadius: '16px 16px 0 0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#38bdf8', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
          <Sparkles size={14} />
          Plateforme qualité béton précontraint
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, lineHeight: 1.3 }}>
          Le fichier Excel devient un cockpit qualité animé et exploitable.
        </h1>
        <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6, maxWidth: 600, marginBottom: 16 }}>
          Les feuilles <strong style={{ color: '#38bdf8' }}>Production</strong>,{' '}
          <strong style={{ color: '#a78bfa' }}>Assurance Qualité</strong> et{' '}
          <strong style={{ color: '#f97316' }}>Contrôle Qualité</strong> ont été normalisées en checklist dynamique
          avec tableaux de bord et synchronisation Firebase.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 8, background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.1)', color: '#94a3b8' }}>
            <FileSpreadsheet size={12} /> {WORKBOOK_SUMMARY.fileName}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 8, background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.1)', color: '#94a3b8' }}>
            <BarChart3 size={12} /> {WORKBOOK_SUMMARY.totalControls} contrôles
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 8,
            background: firebaseReady ? 'rgba(34,197,94,0.08)' : 'rgba(249,115,22,0.08)',
            border: `1px solid ${firebaseReady ? 'rgba(34,197,94,0.2)' : 'rgba(249,115,22,0.2)'}`,
            color: firebaseReady ? '#22c55e' : '#f97316',
          }}>
            {firebaseReady ? <Wifi size={12} /> : <WifiOff size={12} />}
            {firebaseReady ? 'Firebase connecté' : 'Mode local'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="primary-btn" onClick={handleSync} disabled={firebaseState.syncing || firebaseState.loading} type="button">
            {firebaseState.syncing ? <RefreshCcw className="spin" size={14} /> : <Database size={14} />}
            {firebaseReady ? 'Synchroniser' : 'Activer Firebase'}
          </button>
          <button className="secondary-btn" onClick={loadRemoteItems} disabled={!firebaseReady || firebaseState.loading} type="button">
            <RefreshCcw className={firebaseState.loading ? 'spin' : ''} size={14} />
            Recharger
          </button>
        </div>
        {firebaseState.error && (
          <p style={{ color: '#ef4444', fontSize: 12, marginTop: 10 }}>{firebaseState.error}</p>
        )}
      </motion.div>

      {/* Metric Cards */}
      <div className="metric-grid">
        {metricCards.map((card, i) => {
          const Icon = card.icon
          return (
            <motion.div
              className="glass-card metric-card"
              key={card.label}
              style={{ '--metric-accent': card.accent }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 + i * 0.06 }}
            >
              <div className="metric-header">
                <span>{card.label}</span>
                <Icon size={18} />
              </div>
              <div className="metric-value" style={{ color: card.accent }}>{card.value}</div>
              <span className="metric-detail">{card.detail}</span>
            </motion.div>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="chart-row">
        <motion.div
          className="glass-card chart-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
        >
          <h2 className="panel-title">Progression par section</h2>
          <p className="panel-subtitle">Statuts de conformité par domaine qualité</p>
          <ResponsiveContainer height={280} width="100%">
            <BarChart data={sectionChartData} barSize={32}>
              <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis stroke="#64748b" tickLine={false} axisLine={false} width={30} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
              <Bar dataKey="conforming" fill="#22c55e" name="Conformes" radius={[8, 8, 0, 0]} stackId="s" />
              <Bar dataKey="nonConforming" fill="#f97316" name="Non conformes" radius={[8, 8, 0, 0]} stackId="s" />
              <Bar dataKey="pending" fill="#475569" name="À vérifier" radius={[8, 8, 0, 0]} stackId="s" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          className="glass-card chart-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18 }}
        >
          <h2 className="panel-title">Répartition des statuts</h2>
          <p className="panel-subtitle">Vue synthétique pour arbitrer les priorités</p>
          <ResponsiveContainer height={240} width="100%">
            <PieChart>
              <Pie
                data={statusChartData}
                dataKey="value"
                innerRadius={68}
                outerRadius={96}
                paddingAngle={4}
                stroke="none"
              >
                {statusChartData.map((s) => (
                  <Cell fill={s.color} key={s.name} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-legend-row">
            {statusChartData.map((s) => (
              <div className="legend-dot" key={s.name}>
                <span style={{ background: s.color }} />
                {s.name}
                <strong>{s.value}</strong>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Radial Progress */}
      <motion.div
        className="glass-card"
        style={{ marginBottom: 24 }}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.22 }}
      >
        <h2 className="panel-title">Couverture par section</h2>
        <p className="panel-subtitle">Pourcentage de points traités (conformes + non conformes)</p>
        <ResponsiveContainer height={200} width="100%">
          <RadialBarChart
            cx="50%" cy="50%"
            innerRadius="30%" outerRadius="90%"
            barSize={16}
            data={radialData}
            startAngle={180}
            endAngle={0}
          >
            <RadialBar
              background={{ fill: 'rgba(148,163,184,0.06)' }}
              dataKey="value"
              cornerRadius={8}
            />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => `${value}%`} />
            <Legend
              iconSize={10}
              wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Line Charts Row */}
      <div className="chart-row">
        <motion.div
          className="glass-card chart-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.24 }}
        >
          <h2 className="panel-title">Taux de conformité par section</h2>
          <p className="panel-subtitle">Ligne de tendance de la performance qualité</p>
          <ResponsiveContainer height={280} width="100%">
            <LineChart data={lineChartData}>
              <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis stroke="#64748b" tickLine={false} axisLine={false} width={30} fontSize={11} domain={[0, 100]} unit="%" />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="conformité" stroke="#22c55e" strokeWidth={3} dot={{ r: 5, fill: '#22c55e', strokeWidth: 2, stroke: '#030712' }} activeDot={{ r: 7, stroke: '#22c55e', strokeWidth: 2 }} name="Conformité" />
              <Line type="monotone" dataKey="couverture" stroke="#38bdf8" strokeWidth={3} dot={{ r: 5, fill: '#38bdf8', strokeWidth: 2, stroke: '#030712' }} activeDot={{ r: 7, stroke: '#38bdf8', strokeWidth: 2 }} name="Couverture" />
              <Line type="monotone" dataKey="nonConformité" stroke="#f97316" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#030712' }} name="Non-conformité" />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          className="glass-card chart-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.28 }}
        >
          <h2 className="panel-title">Progression des décisions</h2>
          <p className="panel-subtitle">{cumulativeLineData.length ? 'Évolution cumulative au fil des mises à jour' : 'Mettez à jour les contrôles pour voir la tendance'}</p>
          {cumulativeLineData.length > 0 ? (
            <ResponsiveContainer height={280} width="100%">
              <LineChart data={cumulativeLineData}>
                <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis dataKey="index" stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} label={{ value: 'Mises à jour', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#475569' }} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} width={30} fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="conformes" stroke="#22c55e" strokeWidth={2.5} dot={false} name="Conformes" />
                <Line type="monotone" dataKey="nonConformes" stroke="#f97316" strokeWidth={2.5} dot={false} name="Non conformes" />
                <Line type="monotone" dataKey="traités" stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 3" dot={false} name="Total traités" />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280, color: '#475569', fontSize: 13 }}>
              <TrendingUp size={20} style={{ marginRight: 8, opacity: 0.5 }} />
              En attente de données...
            </div>
          )}
        </motion.div>
      </div>

      {/* Focus + Activity */}
      <div className="content-row">
        <motion.div
          className="glass-card focus-card"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <h3>
            <AlertTriangle size={16} style={{ color: '#f97316' }} />
            Zone d'attention
          </h3>
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
                    <span className="focus-status" style={{ color: status.color }}>{status.label}</span>
                  </div>
                  <p>{item.point}</p>
                  <span className="focus-meta">
                    {item.actionPlan.trim() || 'Aucun plan d\'action défini.'}
                  </span>
                </div>
              )
            })}
            {!focusItems.length && (
              <div style={{ textAlign: 'center', padding: 24, color: '#475569', fontSize: 13 }}>
                <CheckCircle2 size={20} style={{ marginBottom: 8, opacity: 0.5 }} />
                <p>Tous les points sont traités !</p>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          className="glass-card"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock3 size={16} style={{ color: '#38bdf8' }} />
            Activité récente
          </h3>
          <div className="activity-timeline">
            {recentActivity.map((item) => {
              const status = STATUS_META[item.status]
              const section = SECTION_LOOKUP[item.sectionId]
              return (
                <div className="timeline-item" key={item.id}>
                  <div className="timeline-dot" style={{ background: status.color }} />
                  <div className="timeline-content">
                    <strong>{item.point}</strong>
                    <span>{section.title} — {status.label}</span>
                  </div>
                  <span className="timeline-time">{formatDateTime(item.lastUpdated)}</span>
                </div>
              )
            })}
            {!recentActivity.length && (
              <div style={{ textAlign: 'center', padding: 24, color: '#475569', fontSize: 13 }}>
                Aucune activité récente
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Firebase Status Card */}
      <motion.div
        className="glass-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}
      >
        {[
          {
            icon: Shield,
            title: 'Scan du classeur',
            content: CHECKLIST_SECTIONS.map((s) => `${s.title}: ${s.items.length} points`).join(' • '),
          },
          {
            icon: Database,
            title: 'État Firebase',
            content: firebaseReady
              ? `${firebaseState.remoteCount || 0} documents — Dernière sync: ${formatDateTime(firebaseState.syncedAt)}`
              : 'Ajoutez VITE_FIREBASE_* pour activer le cloud',
          },
          {
            icon: Search,
            title: 'Recherche',
            content: `${store.filteredItems.length} résultat(s) actifs — Commentaires et plans d'action inclus`,
          },
        ].map((card) => {
          const Icon = card.icon
          return (
            <div key={card.title} style={{ padding: '4px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Icon size={14} style={{ color: '#38bdf8' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{card.title}</span>
              </div>
              <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{card.content}</p>
            </div>
          )
        })}
      </motion.div>
    </motion.div>
  )
}
