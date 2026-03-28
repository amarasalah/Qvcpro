import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Factory,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  TestTube,
  Users,
  X,
} from 'lucide-react'
import DashboardPage from './pages/DashboardPage'
import SectionPage from './pages/SectionPage'
import StatsPage from './pages/StatsPage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import RolesPage from './pages/RolesPage'
import UsersPage from './pages/UsersPage'
import { CHECKLIST_SECTIONS } from './data/checklistTemplate'
import { useChecklistStore } from './hooks/useChecklistStore'
import { useAuth } from './contexts/AuthContext'
import './App.css'

const SECTION_ICONS = {
  production: Factory,
  'assurance-qualite': Shield,
  'controle-qualite': TestTube,
}

// Map nav items to permission keys
const SECTION_TO_PERM = {
  production: 'production',
  'assurance-qualite': 'assurance',
  'controle-qualite': 'controle',
}

export default function App() {
  const { isAuthenticated, loading, profile, role, logout, hasPermission } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const store = useChecklistStore()

  // Show loading
  if (loading) {
    return (
      <div className="login-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ textAlign: 'center', color: '#64748b' }}
        >
          <CheckCircle2 size={32} style={{ color: '#38bdf8', marginBottom: 12 }} className="spin" />
          <p>Chargement...</p>
        </motion.div>
      </div>
    )
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />
  }

  // Build nav items based on permissions
  const navItems = [
    hasPermission('dashboard') && { to: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
    ...CHECKLIST_SECTIONS.map((s) =>
      hasPermission(SECTION_TO_PERM[s.id] || s.id) ? {
        to: `/section/${s.id}`,
        icon: SECTION_ICONS[s.id] || ClipboardCheck,
        label: s.shortTitle,
        accent: s.accent,
      } : null,
    ),
    hasPermission('stats') && { to: '/stats', icon: BarChart3, label: 'Statistiques' },
    hasPermission('settings') && { to: '/settings', icon: Settings, label: 'Paramètres' },
    hasPermission('users') && { to: '/users', icon: Users, label: 'Utilisateurs' },
    hasPermission('roles') && { to: '/roles', icon: Shield, label: 'Rôles' },
  ].filter(Boolean)

  const completionRate = store.items.length
    ? Math.round(((store.statusCounts.conforming + store.statusCounts.nonConforming) / store.items.length) * 100)
    : 0

  return (
    <div className="app-layout">
      {/* Ambient background effects */}
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />
      <div className="ambient-orb ambient-orb-3" />

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`sidebar ${sidebarOpen ? 'is-open' : 'is-collapsed'} ${mobileOpen ? 'mobile-open' : ''}`}
      >
        <div className="sidebar-header">
          <AnimatePresence mode="wait">
            {sidebarOpen && (
              <motion.div
                className="sidebar-brand"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
              >
                <div className="brand-icon">
                  <CheckCircle2 size={20} />
                </div>
                <div className="brand-text">
                  <span className="brand-title">QVC</span>
                  <span className="brand-sub">Qualité Béton</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            className="sidebar-toggle desktop-only"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            type="button"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
          <button
            className="sidebar-toggle mobile-only"
            onClick={() => setMobileOpen(false)}
            type="button"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'is-active' : ''}`
                }
                onClick={() => setMobileOpen(false)}
              >
                <div
                  className="nav-icon"
                  style={item.accent ? { '--nav-accent': item.accent } : {}}
                >
                  <Icon size={18} />
                </div>
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      className="nav-label"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            )
          })}
        </nav>

        {sidebarOpen && (
          <motion.div
            className="sidebar-footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {/* User info */}
            <div className="sidebar-user-info">
              <div className="sidebar-user-avatar">
                {(profile?.displayName || profile?.email || '?')[0].toUpperCase()}
              </div>
              <div className="sidebar-user-details">
                <span className="sidebar-user-name">{profile?.displayName || 'Utilisateur'}</span>
                <span className="sidebar-user-role">{role?.name || 'Aucun rôle'}</span>
              </div>
              <button
                className="sidebar-logout-btn"
                onClick={logout}
                type="button"
                title="Déconnexion"
              >
                <LogOut size={14} />
              </button>
            </div>

            {/* Date indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#475569', padding: '6px 0 2px', borderTop: '1px solid rgba(148,163,184,0.08)', marginTop: 8 }}>
              <Calendar size={10} />
              Checklist du {new Date(store.currentDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              {store.isToday && <span style={{ color: '#22c55e', fontWeight: 700 }}>• Aujourd'hui</span>}
            </div>

            {/* Progress */}
            <div className="progress-mini">
              <div className="progress-mini-header">
                <span>Couverture</span>
                <strong>{completionRate}%</strong>
              </div>
              <div className="progress-mini-bar">
                <motion.div
                  className="progress-mini-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${completionRate}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </aside>

      {/* Main content */}
      <main className={`main-content ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
        <header className="top-bar">
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(true)}
            type="button"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="top-bar-search">
            <Search size={16} />
            <input
              type="search"
              placeholder="Rechercher un contrôle, statut..."
              value={store.searchQuery}
              onChange={(e) => store.setSearchQuery(e.target.value)}
            />
          </div>
          <div className="top-bar-stats">
            <span className="stat-chip conforming">
              <CheckCircle2 size={14} />
              {store.statusCounts.conforming} C
            </span>
            <span className="stat-chip non-conforming">
              {store.statusCounts.nonConforming} NC
            </span>
            <span className="stat-chip pending">
              {store.statusCounts.pending} À faire
            </span>
          </div>
        </header>

        <div className="page-content">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<DashboardPage store={store} />} />
              {CHECKLIST_SECTIONS.map((section) => (
                <Route
                  key={section.id}
                  path={`/section/${section.id}`}
                  element={<SectionPage section={section} store={store} />}
                />
              ))}
              <Route path="/stats" element={<StatsPage store={store} />} />
              <Route path="/settings" element={<SettingsPage store={store} />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/roles" element={<RolesPage />} />
            </Routes>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
