function AppShell({ currentPage, navigationItems, onNavigate, children }) {
  return (
    <div>
      <header>
        <a href="#dashboard" onClick={() => onNavigate('dashboard')}>
          TrialBite
        </a>

        <nav aria-label="Main navigation">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={currentPage === item.id ? 'page' : undefined}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main>{children}</main>
    </div>
  )
}

export default AppShell
