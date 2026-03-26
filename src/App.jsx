import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Factory,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  Shield,
  TestTube,
  X,
} from 'lucide-react'
import DashboardPage from './pages/DashboardPage'
import SectionPage from './pages/SectionPage'
import StatsPage from './pages/StatsPage'
import SettingsPage from './pages/SettingsPage'
import { CHECKLIST_SECTIONS, createChecklistItems } from './data/checklistTemplate'
import { useChecklistStore } from './hooks/useChecklistStore'
import './App.css'

const SECTION_ICONS = {
  production: Factory,
  'assurance-qualite': Shield,
  'controle-qualite': TestTube,
}

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
  ...CHECKLIST_SECTIONS.map((s) => ({
    to: `/section/${s.id}`,
    icon: SECTION_ICONS[s.id] || ClipboardCheck,
    label: s.shortTitle,
    accent: s.accent,
  })),
  { to: '/stats', icon: BarChart3, label: 'Statistiques' },
  { to: '/settings', icon: Settings, label: 'Paramètres' },
]

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const store = useChecklistStore()

  const completionRate = Math.round(
    ((store.statusCounts.conforming + store.statusCounts.nonConforming) / store.items.length) * 100,
  )

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
          {NAV_ITEMS.map((item) => {
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
            </Routes>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
