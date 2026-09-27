import './PageHeader.css'

// Title row used at the top of every page
function PageHeader({ title, subtitle, trialModeActive }) {
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>
      <div className="page-header__meta">
        {trialModeActive && (
          <span className="badge badge--info">Trial Mode Active</span>
        )}
        <span className="page-header__clock">Today: {todayLabel}</span>
      </div>
    </header>
  )
}

export default PageHeader
