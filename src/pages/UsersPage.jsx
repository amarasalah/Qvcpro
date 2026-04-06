import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Edit3,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  Plus,
  Save,
  Shield,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { fetchAllUsers, fetchRoles, saveUserProfile, deleteUserProfile } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'

export default function UsersPage() {
  const { createUser, user: currentUser, profile: currentProfile } = useAuth()

  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formName, setFormName] = useState('')
  const [formRoleId, setFormRoleId] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  // Admin re-auth fields
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')

  // Delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [u, r] = await Promise.all([fetchAllUsers(), fetchRoles()])
      setUsers(u)
      setRoles(r)
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const getRoleName = (roleId) => {
    if (roleId === 'super-admin') return 'Super Admin'
    const role = roles.find((r) => r.id === roleId)
    return role?.name || roleId || 'Aucun'
  }

  const openCreateModal = () => {
    setEditingUser(null)
    setFormEmail('')
    setFormPassword('')
    setFormName('')
    setFormRoleId(roles[0]?.id || '')
    setAdminEmail(currentProfile?.email || '')
    setAdminPassword('')
    setShowPassword(false)
    setError('')
    setShowModal(true)
  }

  const openEditModal = (u) => {
    setEditingUser(u)
    setFormEmail(u.email || '')
    setFormPassword('')
    setFormName(u.displayName || '')
    setFormRoleId(u.roleId || '')
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setError('')
    if (!formName.trim() || !formRoleId) {
      setError('Remplissez tous les champs obligatoires.')
      return
    }

    setSaving(true)
    try {
      if (editingUser) {
        // Update existing user profile
        await saveUserProfile(editingUser.id, {
          displayName: formName.trim(),
          roleId: formRoleId,
          email: editingUser.email,
        })
      } else {
        // Create new user
        if (!formEmail.trim() || !formPassword || !adminPassword) {
          setError('Remplissez tous les champs, y compris votre mot de passe admin.')
          setSaving(false)
          return
        }
        await createUser(formEmail.trim(), formPassword, formName.trim(), formRoleId, adminEmail, adminPassword)
      }
      setShowModal(false)
      await loadData()
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (uid) => {
    try {
      await deleteUserProfile(uid)
      setConfirmDeleteId(null)
      await loadData()
    } catch (err) {
      console.error('Delete user failed:', err)
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
            <Users size={24} style={{ color: '#06b6d4' }} />
            Gestion des utilisateurs
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            Créez des comptes et assignez les rôles appropriés.
          </p>
        </div>
        <button className="primary-btn" onClick={openCreateModal} type="button">
          <UserPlus size={16} />
          Nouvel utilisateur
        </button>
      </div>

      {/* Users Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: '#475569' }}>
          <Loader2 size={24} className="spin" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {users.map((u, i) => (
            <motion.div
              className="glass-card"
              key={u.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              {u.isSuperAdmin && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #a78bfa, #06b6d4)' }} />
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: u.isSuperAdmin ? 'linear-gradient(135deg, #a78bfa, #06b6d4)' : 'rgba(56,189,248,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: u.isSuperAdmin ? '#fff' : '#38bdf8', fontWeight: 700, fontSize: 14,
                }}>
                  {(u.displayName || u.email || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{u.displayName || 'Sans nom'}</div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>{u.email}</div>
                </div>
                {!u.isSuperAdmin && u.id !== currentUser?.uid && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => openEditModal(u)} type="button"
                      style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 7, color: '#38bdf8', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <Edit3 size={12} />
                    </button>
                    <button onClick={() => setConfirmDeleteId(confirmDeleteId === u.id ? null : u.id)} type="button"
                      style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: 7, color: '#ef4444', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Role badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={12} style={{ color: '#a78bfa' }} />
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
                  background: u.isSuperAdmin ? 'rgba(167,139,250,0.12)' : 'rgba(56,189,248,0.08)',
                  color: u.isSuperAdmin ? '#a78bfa' : '#38bdf8',
                }}>
                  {getRoleName(u.roleId)}
                </span>
              </div>

              {/* Delete confirm */}
              <AnimatePresence>
                {confirmDeleteId === u.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                      borderRadius: 10, padding: '8px 14px', marginTop: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 11, color: '#fca5a5' }}>Supprimer cet utilisateur ?</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleDelete(u.id)} type="button"
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
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div className="sidebar-overlay" style={{ zIndex: 998 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} />
            <motion.div
              className="glass-card"
              style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                zIndex: 999, width: '90%', maxWidth: 480, maxHeight: '85vh',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
              }}
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.25 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserPlus size={18} style={{ color: '#06b6d4' }} />
                  {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
                </h2>
                <button onClick={() => setShowModal(false)} type="button"
                  style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, color: '#94a3b8', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={14} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Display name */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <User size={11} /> Nom complet
                  </label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Prénom Nom"
                    style={{ width: '100%', background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 10, color: '#f1f5f9', fontSize: 13, padding: '10px 14px', outline: 'none', fontFamily: 'inherit' }} />
                </div>

                {/* Email (only for new users) */}
                {!editingUser && (
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Mail size={11} /> Email
                    </label>
                    <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="utilisateur@entreprise.com"
                      style={{ width: '100%', background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 10, color: '#f1f5f9', fontSize: 13, padding: '10px 14px', outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                )}

                {/* Password (only for new users) */}
                {!editingUser && (
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Lock size={11} /> Mot de passe
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input type={showPassword ? 'text' : 'password'} value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Min. 6 caractères"
                        style={{ width: '100%', background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 10, color: '#f1f5f9', fontSize: 13, padding: '10px 14px', outline: 'none', fontFamily: 'inherit' }} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Role selector */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Shield size={11} /> Rôle
                  </label>
                  <select value={formRoleId} onChange={(e) => setFormRoleId(e.target.value)}
                    style={{ width: '100%', background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 10, color: '#f1f5f9', fontSize: 13, padding: '10px 14px', outline: 'none', fontFamily: 'inherit' }}>
                    <option value="">Sélectionner un rôle...</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                    <option value="super-admin">Super Admin</option>
                  </select>
                </div>

                {/* Admin re-auth (only for new users) */}
                {!editingUser && (
                  <div style={{ background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.1)', borderRadius: 10, padding: 14, marginTop: 4 }}>
                    <p style={{ fontSize: 11, color: '#f97316', fontWeight: 600, marginBottom: 8 }}>
                      🔒 Confirmez votre identité pour créer l'utilisateur
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="Votre email admin"
                        style={{ flex: 1, background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, color: '#f1f5f9', fontSize: 12, padding: '8px 10px', outline: 'none', fontFamily: 'inherit' }} />
                      <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Votre mot de passe"
                        style={{ flex: 1, background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, color: '#f1f5f9', fontSize: 12, padding: '8px 10px', outline: 'none', fontFamily: 'inherit' }} />
                    </div>
                  </div>
                )}

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ color: '#ef4444', fontSize: 12, margin: 0 }}>
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

              </div>

                {/* Save — sticky footer */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '14px 0 0', borderTop: '1px solid rgba(148,163,184,0.1)', flexShrink: 0 }}>
                  <button className="secondary-btn" onClick={() => setShowModal(false)} type="button">Annuler</button>
                  <button className="primary-btn" onClick={handleSave} disabled={saving} type="button">
                    {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                    {editingUser ? 'Mettre à jour' : 'Créer'}
                  </button>
                </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
