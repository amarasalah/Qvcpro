import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Edit3,
  Loader2,
  Plus,
  Save,
  Shield,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { fetchRoles, saveRole, deleteRole } from '../lib/firebase'
import { MENU_KEYS, SUPER_ADMIN_ROLE } from '../contexts/AuthContext'

const MENU_LABELS = {
  dashboard: 'Tableau de bord',
  production: 'Production',
  assurance: 'Assurance Qualité',
  controle: 'Contrôle Qualité',
  stats: 'Statistiques',
  settings: 'Paramètres',
  users: 'Utilisateurs',
  roles: 'Rôles',
}

const ACTION_LABELS = {
  read: 'Lire',
  create: 'Créer',
  edit: 'Modifier',
  delete: 'Supprimer',
}

const EMPTY_PERMISSIONS = Object.fromEntries(
  MENU_KEYS.map((k) => [k, { read: false, create: false, edit: false, delete: false }]),
)

export default function RolesPage() {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [formName, setFormName] = useState('')
  const [formPermissions, setFormPermissions] = useState({ ...EMPTY_PERMISSIONS })

  // Delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const loadRoles = async () => {
    setLoading(true)
    try {
      const data = await fetchRoles()
      setRoles(data)
    } catch (err) {
      console.error('Failed to load roles:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRoles() }, [])

  const allRoles = useMemo(() => {
    const hasSuperAdmin = roles.some((r) => r.id === 'super-admin')
    return hasSuperAdmin ? roles : [SUPER_ADMIN_ROLE, ...roles]
  }, [roles])

  const openCreateModal = () => {
    setEditingRole(null)
    setFormName('')
    setFormPermissions(JSON.parse(JSON.stringify(EMPTY_PERMISSIONS)))
    setShowModal(true)
  }

  const openEditModal = (role) => {
    if (role.isSuperAdmin) return
    setEditingRole(role)
    setFormName(role.name)
    setFormPermissions(JSON.parse(JSON.stringify(role.permissions || EMPTY_PERMISSIONS)))
    setShowModal(true)
  }

  const togglePermission = (menu, action) => {
    setFormPermissions((prev) => ({
      ...prev,
      [menu]: { ...prev[menu], [action]: !prev[menu]?.[action] },
    }))
  }

  const toggleAllMenu = (menu) => {
    const allOn = Object.values(formPermissions[menu] || {}).every(Boolean)
    const newVal = !allOn
    setFormPermissions((prev) => ({
      ...prev,
      [menu]: { read: newVal, create: newVal, edit: newVal, delete: newVal },
    }))
  }

  const handleSave = async () => {
    if (!formName.trim()) return
    setSaving(true)
    try {
      const id = editingRole?.id || `role-${Date.now()}`
      await saveRole(id, { name: formName.trim(), permissions: formPermissions })
      setShowModal(false)
      await loadRoles()
    } catch (err) {
      console.error('Save role failed:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteRole(id)
      setConfirmDeleteId(null)
      await loadRoles()
    } catch (err) {
      console.error('Delete role failed:', err)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 800 }}>
            <Shield size={24} style={{ color: '#a78bfa' }} />
            Gestion des rôles
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            Définissez les permissions d'accès pour chaque rôle.
          </p>
        </div>
        <button className="primary-btn" onClick={openCreateModal} type="button">
          <Plus size={16} />
          Nouveau rôle
        </button>
      </div>

      {/* Roles Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: '#475569' }}>
          <Loader2 size={24} className="spin" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {allRoles.map((role, i) => (
            <motion.div
              className="glass-card"
              key={role.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              {role.isSuperAdmin && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #a78bfa, #06b6d4)' }} />
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {role.isSuperAdmin ? (
                    <ShieldCheck size={18} style={{ color: '#a78bfa' }} />
                  ) : (
                    <Shield size={18} style={{ color: '#38bdf8' }} />
                  )}
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{role.name}</span>
                  {role.isSuperAdmin && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                      background: 'rgba(167,139,250,0.12)', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>
                      Système
                    </span>
                  )}
                </div>
                {!role.isSuperAdmin && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => openEditModal(role)}
                      type="button"
                      style={{
                        background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)',
                        borderRadius: 7, color: '#38bdf8', width: 28, height: 28,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      }}
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(confirmDeleteId === role.id ? null : role.id)}
                      type="button"
                      style={{
                        background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)',
                        borderRadius: 7, color: '#ef4444', width: 28, height: 28,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Delete confirm */}
              <AnimatePresence>
                {confirmDeleteId === role.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                      borderRadius: 10, padding: '8px 14px', marginBottom: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 11, color: '#fca5a5' }}>Supprimer ce rôle ?</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleDelete(role.id)} type="button"
                        style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, color: '#ef4444', fontSize: 10, fontWeight: 700, padding: '4px 10px', cursor: 'pointer' }}>
                        Oui
                      </button>
                      <button onClick={() => setConfirmDeleteId(null)} type="button"
                        style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 7, color: '#94a3b8', fontSize: 10, fontWeight: 600, padding: '4px 10px', cursor: 'pointer' }}>
                        Non
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Permission summary */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {MENU_KEYS.map((menu) => {
                  const perms = role.permissions?.[menu]
                  const hasRead = role.isSuperAdmin || perms?.read
                  return (
                    <span
                      key={menu}
                      style={{
                        fontSize: 9, fontWeight: 600, padding: '3px 8px', borderRadius: 5,
                        background: hasRead ? 'rgba(34,197,94,0.08)' : 'rgba(148,163,184,0.06)',
                        color: hasRead ? '#22c55e' : '#475569',
                        border: `1px solid ${hasRead ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.08)'}`,
                      }}
                    >
                      {MENU_LABELS[menu]}
                    </span>
                  )
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              className="sidebar-overlay"
              style={{ zIndex: 998 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
            />
            <motion.div
              className="glass-card"
              style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                zIndex: 999, width: '90%', maxWidth: 700, maxHeight: '85vh',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
              }}
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.25 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={18} style={{ color: '#a78bfa' }} />
                  {editingRole ? 'Modifier le rôle' : 'Nouveau rôle'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  type="button"
                  style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, color: '#94a3b8', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {/* Role name */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>
                  Nom du rôle
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Inspecteur, Chef de ligne..."
                  style={{
                    width: '100%', background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.1)',
                    borderRadius: 10, color: '#f1f5f9', fontSize: 13, padding: '10px 14px', outline: 'none', fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Permission Matrix */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, display: 'block' }}>
                  Matrice de permissions
                </label>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 10px', color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                          Menu
                        </th>
                        {Object.keys(ACTION_LABELS).map((act) => (
                          <th key={act} style={{ textAlign: 'center', padding: '8px 6px', color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                            {ACTION_LABELS[act]}
                          </th>
                        ))}
                        <th style={{ textAlign: 'center', padding: '8px 6px', color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                          Tout
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {MENU_KEYS.map((menu) => {
                        const perms = formPermissions[menu] || {}
                        const allOn = Object.values(perms).every(Boolean)
                        return (
                          <tr key={menu} style={{ borderBottom: '1px solid rgba(148,163,184,0.05)' }}>
                            <td style={{ padding: '8px 10px', fontWeight: 600, fontSize: 12 }}>
                              {MENU_LABELS[menu]}
                            </td>
                            {Object.keys(ACTION_LABELS).map((act) => (
                              <td key={act} style={{ textAlign: 'center', padding: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => togglePermission(menu, act)}
                                  style={{
                                    width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
                                    background: perms[act] ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.08)',
                                    color: perms[act] ? '#22c55e' : '#475569',
                                    fontSize: 12, fontWeight: 700,
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  {perms[act] ? '✓' : '—'}
                                </button>
                              </td>
                            ))}
                            <td style={{ textAlign: 'center', padding: '6px' }}>
                              <button
                                type="button"
                                onClick={() => toggleAllMenu(menu)}
                                style={{
                                  width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
                                  background: allOn ? 'rgba(56,189,248,0.12)' : 'rgba(148,163,184,0.06)',
                                  color: allOn ? '#38bdf8' : '#475569',
                                  fontSize: 10, fontWeight: 700,
                                  transition: 'all 0.15s',
                                }}
                              >
                                {allOn ? '★' : '○'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

              {/* Save — sticky footer */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '14px 0 0', borderTop: '1px solid rgba(148,163,184,0.1)', flexShrink: 0 }}>
                <button className="secondary-btn" onClick={() => setShowModal(false)} type="button">
                  Annuler
                </button>
                <button className="primary-btn" onClick={handleSave} disabled={saving || !formName.trim()} type="button">
                  {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                  {editingRole ? 'Mettre à jour' : 'Créer le rôle'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
