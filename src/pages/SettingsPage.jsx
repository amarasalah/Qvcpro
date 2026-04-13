import { motion } from 'framer-motion'
import {
  Cloud,
  Database,
  Download,
  HardDrive,
  RefreshCcw,
  Settings,
  Shield,
  Trash2,
  Upload,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { WORKBOOK_SUMMARY } from '../data/checklistTemplate'

function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function SettingsPage({ store }) {
  const { items, modules, firebaseState, firebaseReady, handleSync, loadRemoteItems, statusCounts } = store

  const handleExportJSON = () => {
    const data = JSON.stringify(items, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qvc-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCSV = () => {
    const headers = ['Section', 'N°', 'Point de contrôle', 'Statut', 'Commentaire', "Plan d'action"]
    const rows = items.map((item) => [
      item.sectionTitle,
      item.number,
      item.point,
      item.status === 'conforming' ? 'Conforme' : item.status === 'nonConforming' ? 'Non conforme' : 'À vérifier',
      `"${(item.comment || '').replace(/"/g, '""')}"`,
      `"${(item.actionPlan || '').replace(/"/g, '""')}"`,
    ])
    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qvc-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClearLocal = () => {
    if (window.confirm('Êtes-vous sûr de vouloir effacer les données locales ? Cette action est irréversible.')) {
      window.localStorage.removeItem('qvc-quality-platform-state-v2')
      window.location.reload()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
    >
      <div className="stats-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Settings size={24} style={{ color: '#94a3b8' }} />
          Paramètres
        </h1>
        <p>Configuration, synchronisation Firebase et export des données.</p>
      </div>

      <div className="settings-grid">
        {/* Firebase Config */}
        <motion.div
          className="glass-card settings-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <h3>
            <Cloud size={16} style={{ color: '#38bdf8' }} />
            Firebase
          </h3>
          <div className="settings-row">
            <span className="settings-label">Statut</span>
            <span className={`settings-value ${firebaseReady ? 'is-ok' : 'is-warn'}`}>
              {firebaseReady ? (
                <><Wifi size={12} style={{ marginRight: 4 }} /> Connecté</>
              ) : (
                <><WifiOff size={12} style={{ marginRight: 4 }} /> Non configuré</>
              )}
            </span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Documents cloud</span>
            <span className="settings-value">{firebaseState.remoteCount || 0}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Dernière sync</span>
            <span className="settings-value">{formatDateTime(firebaseState.syncedAt)}</span>
          </div>
          {firebaseState.error && (
            <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, marginTop: 8 }}>
              <p style={{ fontSize: 12, color: '#ef4444' }}>{firebaseState.error}</p>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button
              className="primary-btn"
              onClick={handleSync}
              disabled={firebaseState.syncing || firebaseState.loading}
              type="button"
              style={{ fontSize: 12 }}
            >
              {firebaseState.syncing ? <RefreshCcw className="spin" size={14} /> : <Upload size={14} />}
              Synchroniser
            </button>
            <button
              className="secondary-btn"
              onClick={loadRemoteItems}
              disabled={!firebaseReady || firebaseState.loading}
              type="button"
              style={{ fontSize: 12 }}
            >
              <Download size={14} />
              Recharger
            </button>
          </div>
        </motion.div>

        {/* Data */}
        <motion.div
          className="glass-card settings-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3>
            <HardDrive size={16} style={{ color: '#a78bfa' }} />
            Données locales
          </h3>
          <div className="settings-row">
            <span className="settings-label">Points de contrôle</span>
            <span className="settings-value">{items.length}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Conformes</span>
            <span className="settings-value is-ok">{statusCounts.conforming}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Non conformes</span>
            <span className="settings-value is-warn">{statusCounts.nonConforming}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">À vérifier</span>
            <span className="settings-value">{statusCounts.pending}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="secondary-btn" onClick={handleExportJSON} type="button" style={{ fontSize: 12 }}>
              <Download size={14} />
              Export JSON
            </button>
            <button className="secondary-btn" onClick={handleExportCSV} type="button" style={{ fontSize: 12 }}>
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </motion.div>

        {/* Source File */}
        <motion.div
          className="glass-card settings-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3>
            <Shield size={16} style={{ color: '#f97316' }} />
            Fichier source
          </h3>
          <div className="settings-row">
            <span className="settings-label">Nom</span>
            <span className="settings-value">{WORKBOOK_SUMMARY.fileName}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Feuilles</span>
            <span className="settings-value">{WORKBOOK_SUMMARY.sheetCount}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Contrôles totaux</span>
            <span className="settings-value">{WORKBOOK_SUMMARY.totalControls}</span>
          </div>
          {modules.map((s) => (
            <div className="settings-row" key={s.id}>
              <span className="settings-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.accent }} />
                {s.title}
              </span>
              <span className="settings-value">{(s.items || []).length} points</span>
            </div>
          ))}
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          className="glass-card settings-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ borderColor: 'rgba(239,68,68,0.15)' }}
        >
          <h3>
            <Trash2 size={16} style={{ color: '#ef4444' }} />
            Zone de danger
          </h3>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14, lineHeight: 1.5 }}>
            Cette action supprimera toutes les données locales (statuts, commentaires, plans d'action).
            Les données Firebase ne seront pas affectées.
          </p>
          <button
            onClick={handleClearLocal}
            type="button"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444', fontSize: 13, fontWeight: 700, borderRadius: 10,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <Trash2 size={14} />
            Effacer les données locales
          </button>
        </motion.div>
      </div>
    </motion.div>
  )
}
