import { useMemo, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Calendar,
  Camera,
  CheckCircle2,
  Edit3,
  Factory,
  ImageIcon,
  Loader2,
  Plus,
  Save,
  Search,
  Shield,
  TestTube,
  Trash2,
  X,
  ZoomIn,
} from 'lucide-react'
import { uploadImage, isCloudinaryConfigured } from '../lib/cloudinary'

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
  const { items, handleItemChange, addItem, deleteItem, addImage, removeImage, currentDate, isToday, switchDate, STATUS_OPTIONS, STATUS_META } = store
  const [statusFilter, setStatusFilter] = useState('all')
  const [localSearch, setLocalSearch] = useState('')

  // Create new task state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPointText, setNewPointText] = useState('')

  // Inline edit state
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')

  // Delete confirm state
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  // Image upload state
  const [uploadingId, setUploadingId] = useState(null)
  const [lightboxImg, setLightboxImg] = useState(null)
  const fileInputRefs = useRef({})

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
  const progress = sectionItems.length ? Math.round((done / sectionItems.length) * 100) : 0

  const query = localSearch.trim().toLowerCase()

  const filtered = useMemo(
    () =>
      sectionItems.filter((item) => {
        const matchStatus = statusFilter === 'all' || item.status === statusFilter
        const matchQuery =
          !query ||
          [item.point, item.comment, item.actionPlan, STATUS_META[item.status]?.label]
            .join(' ')
            .toLowerCase()
            .includes(query)
        return matchStatus && matchQuery
      }),
    [sectionItems, statusFilter, query, STATUS_META],
  )

  const Icon = SECTION_ICONS[section.id] || CheckCircle2

  // Handlers
  const handleAddTask = () => {
    if (!newPointText.trim()) return
    addItem(section.id, newPointText)
    setNewPointText('')
    setShowAddForm(false)
  }

  const handleStartEdit = (item) => {
    setEditingId(item.id)
    setEditText(item.point)
  }

  const handleSaveEdit = (itemId) => {
    if (editText.trim()) {
      handleItemChange(itemId, 'point', editText.trim())
    }
    setEditingId(null)
    setEditText('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const handleConfirmDelete = async (itemId) => {
    await deleteItem(itemId)
    setConfirmDeleteId(null)
  }

  const handleImageUpload = async (itemId, file) => {
    if (!file) return
    setUploadingId(itemId)
    try {
      const imageData = await uploadImage(file)
      addImage(itemId, imageData)
    } catch (err) {
      console.error('Upload failed:', err)
      alert(err.message || 'Échec de l\'upload de l\'image.')
    } finally {
      setUploadingId(null)
    }
  }

  const triggerFileInput = (itemId) => {
    if (fileInputRefs.current[itemId]) {
      fileInputRefs.current[itemId].click()
    }
  }

  const cloudinaryReady = isCloudinaryConfigured()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
    >
      {/* Hero */}
      <div className="section-hero" style={{ flexWrap: 'wrap' }}>
        <div className="section-icon-box" style={{ background: `linear-gradient(135deg, ${section.accent}, ${section.accent}88)` }}>
          <Icon size={26} />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1>{section.title}</h1>
          <p>{section.description}</p>
        </div>
        {/* Date badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.08)', borderRadius: 10 }}>
          <Calendar size={14} style={{ color: '#38bdf8' }} />
          <input
            type="date"
            value={currentDate}
            onChange={(e) => switchDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            style={{ background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
          />
          {isToday ? (
            <span style={{ fontSize: 9, fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: 6 }}>Aujourd'hui</span>
          ) : (
            <span style={{ fontSize: 9, fontWeight: 700, color: '#f97316', background: 'rgba(249,115,22,0.1)', padding: '2px 8px', borderRadius: 6 }}>Archivé</span>
          )}
        </div>
        <button
          className="primary-btn"
          onClick={() => setShowAddForm(true)}
          type="button"
          style={{ fontSize: 12 }}
        >
          <Plus size={16} />
          Nouveau contrôle
        </button>
      </div>

      {/* Add Task Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            className="glass-card"
            style={{ marginBottom: 20, position: 'relative', overflow: 'hidden' }}
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${section.accent}, ${section.accent}66)`, borderRadius: '16px 16px 0 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={16} style={{ color: section.accent }} />
                Ajouter un point de contrôle
              </h3>
              <button
                onClick={() => { setShowAddForm(false); setNewPointText('') }}
                type="button"
                style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, color: '#94a3b8', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                placeholder="Décrivez le nouveau point de contrôle..."
                value={newPointText}
                onChange={(e) => setNewPointText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                autoFocus
                style={{
                  flex: 1, background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.1)',
                  borderRadius: 10, color: '#f1f5f9', fontSize: 13, padding: '12px 16px', outline: 'none', fontFamily: 'inherit',
                }}
              />
              <button className="primary-btn" onClick={handleAddTask} disabled={!newPointText.trim()} type="button" style={{ fontSize: 12 }}>
                <Plus size={14} />
                Ajouter
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
        <button className={`filter-btn ${statusFilter === 'all' ? 'is-active' : ''}`} onClick={() => setStatusFilter('all')} type="button">
          Tous ({sectionItems.length})
        </button>
        {STATUS_OPTIONS.map((s) => (
          <button key={s.value} className={`filter-btn ${statusFilter === s.value ? 'is-active' : ''}`} onClick={() => setStatusFilter(s.value)} type="button">
            {s.label} ({counts[s.value]})
          </button>
        ))}
      </div>

      {/* Checklist Cards */}
      <div className="checklist-grid">
        <AnimatePresence mode="popLayout">
          {filtered.map((item, index) => {
            const status = STATUS_META[item.status]
            const isEditing = editingId === item.id
            const isDeleting = confirmDeleteId === item.id
            const isUploading = uploadingId === item.id
            const images = item.images || []

            return (
              <motion.article
                className={`checklist-card status-${item.status}`}
                key={item.id}
                layout
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -12 }}
                transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.15) }}
              >
                <div className="card-top">
                  <div className="section-pill">
                    <span className="section-dot" style={{ backgroundColor: section.accent }} />
                    {section.title}
                    <strong>#{item.number}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="card-status-wrap">
                      <span className="status-tag" style={{ color: status.color, borderColor: `${status.color}44` }}>
                        {status.label}
                      </span>
                      <span className="timestamp">{formatDateTime(item.lastUpdated)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
                      {/* Image upload button */}
                      {cloudinaryReady && (
                        <button
                          onClick={() => triggerFileInput(item.id)}
                          type="button"
                          title="Ajouter une image"
                          disabled={isUploading}
                          style={{
                            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)',
                            borderRadius: 7, color: '#22c55e', width: 28, height: 28,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                          }}
                        >
                          {isUploading ? <Loader2 size={12} className="spin" /> : <Camera size={12} />}
                        </button>
                      )}
                      <input
                        ref={(el) => (fileInputRefs.current[item.id] = el)}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleImageUpload(item.id, e.target.files[0])
                          e.target.value = ''
                        }}
                      />
                      {!isEditing && (
                        <button onClick={() => handleStartEdit(item)} type="button" title="Modifier"
                          style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 7, color: '#38bdf8', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <Edit3 size={12} />
                        </button>
                      )}
                      <button onClick={() => setConfirmDeleteId(isDeleting ? null : item.id)} type="button" title="Supprimer"
                        style={{
                          background: isDeleting ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.06)',
                          border: `1px solid ${isDeleting ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.12)'}`,
                          borderRadius: 7, color: '#ef4444', width: 28, height: 28,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delete confirmation */}
                <AnimatePresence>
                  {isDeleting && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 12, color: '#fca5a5' }}>Supprimer ce contrôle ?</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleConfirmDelete(item.id)} type="button"
                          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, color: '#ef4444', fontSize: 11, fontWeight: 700, padding: '5px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Trash2 size={11} /> Oui
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)} type="button"
                          style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 7, color: '#94a3b8', fontSize: 11, fontWeight: 600, padding: '5px 12px', cursor: 'pointer' }}>
                          Non
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Editable title */}
                {isEditing ? (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(item.id); if (e.key === 'Escape') handleCancelEdit() }}
                      autoFocus
                      style={{ flex: 1, background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 8, color: '#f1f5f9', fontSize: 14, fontWeight: 600, padding: '8px 12px', outline: 'none', fontFamily: 'inherit' }} />
                    <button onClick={() => handleSaveEdit(item.id)} type="button"
                      style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, color: '#22c55e', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <Save size={14} />
                    </button>
                    <button onClick={handleCancelEdit} type="button"
                      style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, color: '#94a3b8', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <h3>{item.point}</h3>
                )}

                {/* Images gallery */}
                {images.length > 0 && (
                  <div className="card-images-gallery">
                    {images.map((img) => (
                      <div key={img.publicId} className="card-image-thumb">
                        <img src={img.thumbnail || img.url} alt="Evidence" onClick={() => setLightboxImg(img.url)} />
                        <button
                          className="card-image-remove"
                          onClick={() => removeImage(item.id, img.publicId)}
                          type="button"
                          title="Retirer l'image"
                        >
                          <X size={10} />
                        </button>
                        <button
                          className="card-image-zoom"
                          onClick={() => setLightboxImg(img.url)}
                          type="button"
                        >
                          <ZoomIn size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

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
          <motion.div className="empty-state" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
            <Search size={22} />
            <strong>Aucun contrôle trouvé.</strong>
            <span>Essayez un autre filtre ou ajoutez un nouveau point.</span>
          </motion.div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div
            className="lightbox-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImg(null)}
          >
            <motion.img
              src={lightboxImg}
              alt="Evidence full"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="lightbox-image"
              onClick={(e) => e.stopPropagation()}
            />
            <button className="lightbox-close" onClick={() => setLightboxImg(null)} type="button">
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
