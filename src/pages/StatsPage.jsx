import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  MessageSquare,
  Target,
  TrendingUp,
  Zap,
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  Legend,
} from 'recharts'
import { CHECKLIST_SECTIONS } from '../data/checklistTemplate'
import PrintButton from '../components/PrintButton'
import ReportFilters from '../components/ReportFilters'

const tooltipStyle = {
  background: 'rgba(15,23,42,0.95)',
  borderRadius: 14,
  border: '1px solid rgba(148,163,184,0.15)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  fontSize: 12,
  padding: '10px 14px',
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function StatsPage({ store }) {
  const { items, recentActivity, STATUS_META, SECTION_LOOKUP } = store

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sectionFilter, setSectionFilter] = useState('all')

  const resetFilters = () => { setDateFrom(''); setDateTo(''); setStatusFilter('all'); setSectionFilter('all') }

  const filtered = useMemo(() => items.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false
    if (sectionFilter !== 'all' && item.sectionId !== sectionFilter) return false
    if (dateFrom && item.lastUpdated) {
      const d = new Date(item.lastUpdated).toISOString().slice(0, 10)
      if (d < dateFrom) return false
    }
    if (dateTo && item.lastUpdated) {
      const d = new Date(item.lastUpdated).toISOString().slice(0, 10)
      if (d > dateTo) return false
    }
    return true
  }), [items, statusFilter, sectionFilter, dateFrom, dateTo])

  const totalItems = filtered.length
  const statusCounts = useMemo(() => filtered.reduce((c, i) => { c[i.status] += 1; return c }, { conforming: 0, nonConforming: 0, pending: 0 }), [filtered])
  const completionCount = statusCounts.conforming + statusCounts.nonConforming
  const completionRate = totalItems ? Math.round((completionCount / totalItems) * 100) : 0
  const conformRate = totalItems ? Math.round((statusCounts.conforming / totalItems) * 100) : 0
  const commentCount = filtered.filter((i) => i.comment.trim()).length
  const actionCount = filtered.filter((i) => i.actionPlan.trim()).length
  const criticalCount = filtered.filter((i) => i.status === 'nonConforming' && !i.actionPlan.trim()).length

  const sectionChartData = useMemo(
    () =>
      CHECKLIST_SECTIONS.map((section) => {
        const sItems = filtered.filter((i) => i.sectionId === section.id)
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
    [filtered],
  )

  const statusChartData = useMemo(
    () =>
      [
        { name: 'Conforme', value: statusCounts.conforming, color: '#22c55e' },
        { name: 'Non conforme', value: statusCounts.nonConforming, color: '#f97316' },
        { name: 'À vérifier', value: statusCounts.pending, color: '#94a3b8' },
      ],
    [statusCounts],
  )

  const radarData = useMemo(
    () =>
      CHECKLIST_SECTIONS.map((section) => {
        const sItems = filtered.filter((i) => i.sectionId === section.id)
        if (!sItems.length) return { subject: section.shortTitle, conformité: 0, couverture: 0, documentation: 0, plans: 0 }
        const conf = sItems.filter((i) => i.status === 'conforming').length
        const nc = sItems.filter((i) => i.status === 'nonConforming').length
        const commented = sItems.filter((i) => i.comment.trim()).length
        const actioned = sItems.filter((i) => i.actionPlan.trim()).length
        return {
          subject: section.shortTitle,
          conformité: Math.round((conf / sItems.length) * 100),
          couverture: Math.round(((conf + nc) / sItems.length) * 100),
          documentation: Math.round((commented / sItems.length) * 100),
          plans: Math.round((actioned / sItems.length) * 100),
        }
      }),
    [filtered],
  )

  const sectionDetailData = useMemo(
    () =>
      CHECKLIST_SECTIONS.map((section) => {
        const sItems = filtered.filter((i) => i.sectionId === section.id)
        const conf = sItems.filter((i) => i.status === 'conforming').length
        const nc = sItems.filter((i) => i.status === 'nonConforming').length
        return {
          name: section.shortTitle,
          total: sItems.length,
          conformes: conf,
          nonConformes: nc,
          pending: sItems.filter((i) => i.status === 'pending').length,
          rate: sItems.length ? Math.round((conf / sItems.length) * 100) : 0,
          accent: section.accent,
        }
      }),
    [filtered],
  )

  const progressOverTime = useMemo(() => {
    const updates = filtered
      .filter((i) => i.lastUpdated)
      .sort((a, b) => (a.lastUpdated || 0) - (b.lastUpdated || 0))

    if (!updates.length) return []

    let cumConf = 0, cumNc = 0
    return updates.map((item) => {
      if (item.status === 'conforming') cumConf++
      if (item.status === 'nonConforming') cumNc++
      return {
        time: formatDateTime(item.lastUpdated),
        conformes: cumConf,
        nonConformes: cumNc,
        total: cumConf + cumNc,
      }
    })
  }, [filtered])

  const megaStats = [
    { label: 'Total', value: totalItems, icon: FileSpreadsheet, accent: '#38bdf8' },
    { label: 'Conformes', value: statusCounts.conforming, icon: CheckCircle2, accent: '#22c55e' },
    { label: 'Non conformes', value: statusCounts.nonConforming, icon: AlertTriangle, accent: '#f97316' },
    { label: 'Couverture', value: `${completionRate}%`, icon: Activity, accent: '#a78bfa' },
    { label: 'Taux conformité', value: `${conformRate}%`, icon: Target, accent: '#06b6d4' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
    >
      <div className="print-header">
        <h1>Statistiques avancées — Checklist Qualité Béton Précontraint</h1>
        <p>Imprimé le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())} — {totalItems} points — Conformité {conformRate}%</p>
      </div>

      <div className="stats-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart3 size={24} style={{ color: '#38bdf8' }} />
            Statistiques avancées
          </h1>
          <p>Analyses détaillées, radar qualité, tendances et répartitions.</p>
        </div>
        <PrintButton title="Statistiques — Qualité Béton" />
      </div>

      <ReportFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        statusFilter={statusFilter}
        sectionFilter={sectionFilter}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onStatusChange={setStatusFilter}
        onSectionChange={setSectionFilter}
        onReset={resetFilters}
        sections={CHECKLIST_SECTIONS}
        showSectionFilter
      />

      {/* Mega Stats */}
      <div className="stats-mega-grid">
        {megaStats.map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div
              className="glass-card mega-stat"
              key={s.label}
              style={{ '--mega-accent': s.accent }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Icon size={20} style={{ color: s.accent, marginBottom: 8 }} />
              <div className="mega-number" style={{ color: s.accent }}>{s.value}</div>
              <div className="mega-label">{s.label}</div>
            </motion.div>
          )
        })}
      </div>

      {/* Additional Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Commentaires', value: commentCount, icon: MessageSquare, accent: '#38bdf8' },
          { label: "Plans d'action", value: actionCount, icon: Zap, accent: '#a78bfa' },
          { label: 'Points critiques', value: criticalCount, icon: AlertTriangle, accent: '#ef4444' },
          { label: 'Dernière mise à jour', value: formatDateTime(recentActivity[0]?.lastUpdated), icon: Clock3, accent: '#06b6d4' },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div
              className="glass-card"
              key={s.label}
              style={{ padding: 18, textAlign: 'center' }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
            >
              <Icon size={18} style={{ color: s.accent, marginBottom: 6 }} />
              <div style={{ fontSize: 22, fontWeight: 800, color: s.accent, marginBottom: 2 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{s.label}</div>
            </motion.div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="stats-charts-grid">
        {/* Stacked Bar */}
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h2 className="panel-title">Détail par section</h2>
          <p className="panel-subtitle">Répartition des statuts dans chaque domaine</p>
          <ResponsiveContainer height={300} width="100%">
            <BarChart data={sectionChartData} barSize={36}>
              <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis stroke="#64748b" tickLine={false} axisLine={false} width={30} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
              <Bar dataKey="conforming" fill="#22c55e" name="Conformes" radius={[6, 6, 0, 0]} stackId="s" />
              <Bar dataKey="nonConforming" fill="#f97316" name="Non conformes" radius={[6, 6, 0, 0]} stackId="s" />
              <Bar dataKey="pending" fill="#475569" name="À vérifier" radius={[6, 6, 0, 0]} stackId="s" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Radar */}
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <h2 className="panel-title">Radar qualité</h2>
          <p className="panel-subtitle">Performance multi-dimensionnelle par section</p>
          <ResponsiveContainer height={300} width="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="rgba(148,163,184,0.12)" />
              <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={12} />
              <PolarRadiusAxis stroke="rgba(148,163,184,0.12)" fontSize={10} />
              <Radar name="Conformité" dataKey="conformité" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} strokeWidth={2} />
              <Radar name="Couverture" dataKey="couverture" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.1} strokeWidth={2} />
              <Radar name="Documentation" dataKey="documentation" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.08} strokeWidth={2} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Donut + Progress Over time */}
      <div className="stats-charts-grid">
        {/* Donut */}
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h2 className="panel-title">Distribution globale</h2>
          <p className="panel-subtitle">Proportions des statuts sur l'ensemble du classeur</p>
          <ResponsiveContainer height={260} width="100%">
            <PieChart>
              <Pie
                data={statusChartData}
                dataKey="value"
                innerRadius={65}
                outerRadius={95}
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
          <div className="chart-legend-row" style={{ marginTop: 4 }}>
            {statusChartData.map((s) => (
              <div className="legend-dot" key={s.name}>
                <span style={{ background: s.color }} />
                {s.name}
                <strong>{s.value}</strong>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Area Chart */}
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <h2 className="panel-title">Progression cumulative</h2>
          <p className="panel-subtitle">{progressOverTime.length ? 'Évolution des décisions au fil du temps' : 'Mettez à jour les points pour voir la tendance.'}</p>
          {progressOverTime.length > 0 ? (
            <ResponsiveContainer height={260} width="100%">
              <AreaChart data={progressOverTime}>
                <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} hide />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} width={30} fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="conformes" stroke="#22c55e" fill="rgba(34,197,94,0.08)" strokeWidth={2} name="Conformes" />
                <Area type="monotone" dataKey="nonConformes" stroke="#f97316" fill="rgba(249,115,22,0.06)" strokeWidth={2} name="Non conformes" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260, color: '#475569', fontSize: 13 }}>
              <TrendingUp size={20} style={{ marginRight: 8, opacity: 0.5 }} />
              En attente de données...
            </div>
          )}
        </motion.div>
      </div>

      {/* Line Charts Row */}
      <div className="stats-charts-grid">
        {/* Section Conformity Line Chart */}
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.28 }}
        >
          <h2 className="panel-title">Ligne de conformité</h2>
          <p className="panel-subtitle">Taux de conformité et couverture par section</p>
          <ResponsiveContainer height={280} width="100%">
            <LineChart data={CHECKLIST_SECTIONS.map((section) => {
              const sItems = filtered.filter((i) => i.sectionId === section.id)
              if (!sItems.length) return { name: section.shortTitle, conformité: 0, couverture: 0, nonConformité: 0, documentation: 0 }
              const conf = sItems.filter((i) => i.status === 'conforming').length
              const nc = sItems.filter((i) => i.status === 'nonConforming').length
              return {
                name: section.shortTitle,
                conformité: Math.round((conf / sItems.length) * 100),
                couverture: Math.round(((conf + nc) / sItems.length) * 100),
                nonConformité: Math.round((nc / sItems.length) * 100),
                documentation: Math.round((sItems.filter((i) => i.comment.trim()).length / sItems.length) * 100),
              }
            })}>
              <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis stroke="#64748b" tickLine={false} axisLine={false} width={34} fontSize={11} domain={[0, 100]} unit="%" />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="conformité" stroke="#22c55e" strokeWidth={3} dot={{ r: 6, fill: '#22c55e', strokeWidth: 2, stroke: '#0f172a' }} activeDot={{ r: 8, stroke: '#22c55e', strokeWidth: 2 }} name="Conformité" />
              <Line type="monotone" dataKey="couverture" stroke="#38bdf8" strokeWidth={3} dot={{ r: 6, fill: '#38bdf8', strokeWidth: 2, stroke: '#0f172a' }} activeDot={{ r: 8, stroke: '#38bdf8', strokeWidth: 2 }} name="Couverture" />
              <Line type="monotone" dataKey="nonConformité" stroke="#f97316" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 5, fill: '#f97316', strokeWidth: 2, stroke: '#0f172a' }} name="Non-conformité" />
              <Line type="monotone" dataKey="documentation" stroke="#a78bfa" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 4, fill: '#a78bfa', strokeWidth: 2, stroke: '#0f172a' }} name="Documentation" />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Cumulative Decisions Line Chart */}
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.32 }}
        >
          <h2 className="panel-title">Tendance des décisions</h2>
          <p className="panel-subtitle">{progressOverTime.length ? 'Courbe cumulative des mises à jour' : 'Mettez à jour les contrôles pour voir la ligne de tendance'}</p>
          {progressOverTime.length > 0 ? (
            <ResponsiveContainer height={280} width="100%">
              <LineChart data={progressOverTime}>
                <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} hide />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} width={30} fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="conformes" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3, fill: '#22c55e' }} name="Conformes" />
                <Line type="monotone" dataKey="nonConformes" stroke="#f97316" strokeWidth={2.5} dot={{ r: 3, fill: '#f97316' }} name="Non conformes" />
                <Line type="monotone" dataKey="total" stroke="#06b6d4" strokeWidth={2} strokeDasharray="5 3" dot={false} name="Total traités" />
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

      {/* Section Detail Table */}
      <motion.div
        className="glass-card"
        style={{ marginBottom: 24 }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <h2 className="panel-title">Synthèse par section</h2>
        <p className="panel-subtitle">Vue tabulaire des indicateurs clés</p>
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                {['Section', 'Total', 'Conformes', 'Non conformes', 'À vérifier', 'Taux'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700,
                      color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sectionDetailData.map((row) => (
                <tr
                  key={row.name}
                  style={{ borderBottom: '1px solid rgba(148,163,184,0.05)', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(148,163,184,0.04)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: row.accent, display: 'inline-block' }} />
                    {row.name}
                  </td>
                  <td style={{ padding: '12px', color: '#94a3b8' }}>{row.total}</td>
                  <td style={{ padding: '12px', color: '#22c55e', fontWeight: 700 }}>{row.conformes}</td>
                  <td style={{ padding: '12px', color: '#f97316', fontWeight: 700 }}>{row.nonConformes}</td>
                  <td style={{ padding: '12px', color: '#94a3b8' }}>{row.pending}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'rgba(148,163,184,0.1)', borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${row.rate}%`, background: row.accent, borderRadius: 6, transition: 'width 0.6s' }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: row.accent, minWidth: 36, textAlign: 'right' }}>{row.rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        className="glass-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.35 }}
      >
        <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock3 size={16} style={{ color: '#38bdf8' }} />
          Dernières modifications
        </h2>
        <p className="panel-subtitle">Historique des mises à jour récentes</p>
        <div className="activity-timeline" style={{ marginTop: 12 }}>
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
              Aucune activité enregistrée
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
