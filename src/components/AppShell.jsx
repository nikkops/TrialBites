import {
  Activity,
  BookOpen,
  CircleHelp,
  LayoutGrid,
  ScanLine,
  ShieldAlert,
} from 'lucide-react'
import './AppShell.css'

// Icon for each nav item, matched by the id from navigationItems in App.jsx
const navIcons = {
  dashboard: LayoutGrid,
  tracker: Activity,
  'food-log': BookOpen,
  scanner: ScanLine,
}

function AppShell({ currentPage, navigationItems, onNavigate, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          type="button"
          className="sidebar__brand"
          onClick={() => onNavigate('dashboard')}
        >
          <span className="sidebar__logo">
            <ShieldAlert size={18} />
          </span>
          <span className="sidebar__name">TrialBites</span>
        </button>

        <nav className="sidebar__nav" aria-label="Main navigation">
          {navigationItems.map((item) => {
            const Icon = navIcons[item.id]
            const isActive = item.id === currentPage

            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar__link${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onNavigate(item.id)}
              >
                {Icon && <Icon size={18} strokeWidth={1.75} />}
                {item.label}
              </button>
            )
          })}
        </nav>

        <button type="button" className="sidebar__link sidebar__help">
          <CircleHelp size={18} strokeWidth={1.75} />
          Help &amp; Documentation
        </button>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  )
}

export default AppShell
