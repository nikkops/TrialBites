import { useState } from 'react'
import { Check, Hourglass, Search, TriangleAlert } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import {
  formatDate,
  getDayNumber,
  getSeverityBadge,
  getTrialDay,
  toLocalDateString,
} from '../utils/trialHelpers.js'
import './FoodLog.css'

// "active" matches trial.status, so filtering is just status === filter
const filters = [
  { id: 'all', label: 'All Foods' },
  { id: 'active', label: 'In Progress' },
  { id: 'safe', label: 'Safe Only' },
  { id: 'unsafe', label: 'Unsafe (Allergens)' },
]

// Icon, badge text and color for each kind of trial
const verdictStyles = {
  active: { icon: Hourglass, badge: 'In Progress', tone: 'warning' },
  safe: { icon: Check, badge: 'Safe Food', tone: 'success' },
  unsafe: { icon: TriangleAlert, badge: 'Unsafe Food', tone: 'danger' },
}

// One line describing the worst reaction during a trial
function getSymptomSummary(trial) {
  const isActive = trial.status === 'active'
  if (trial.symptoms.length === 0) {
    return isActive
      ? 'No entries logged yet.'
      : 'No reaction symptoms logged throughout the trial.'
  }
  const worst = trial.symptoms.reduce((a, b) =>
    b.severity > a.severity ? b : a,
  )
  if (worst.severity === 0) {
    return isActive
      ? 'No reactions so far.'
      : 'No reaction symptoms logged throughout the trial.'
  }
  const { label } = getSeverityBadge(worst.severity)
  const day = getDayNumber(trial.startDate, worst.date)
  return `${label} on Day ${day}: ${worst.notes}`
}

// Active: "Started Sep 18 · Day 22". Finished: "Sep 18 - Oct 2" (start to verdict)
function getDateRange(trial) {
  const start = formatDate(trial.startDate)
  if (trial.status === 'active') {
    return `Started ${start} · Day ${getTrialDay(trial.startDate)}`
  }
  if (!trial.completedAt) return `Trial: ${start}`

  const end = toLocalDateString(trial.completedAt)
  return end === trial.startDate
    ? `Trial: ${start}`
    : `Trial: ${start} - ${formatDate(end)}`
}

function FoodLog({ trials, onNavigate, onSelectTrial }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const hasActiveTrial = trials.some((trial) => trial.status === 'active')

  const visibleTrials = trials
    .filter((trial) => filter === 'all' || trial.status === filter)
    .filter((trial) =>
      trial.foodName.toLowerCase().includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => b.startDate.localeCompare(a.startDate))

  function openTrial(trialId) {
    onSelectTrial(trialId)
    onNavigate('tracker')
  }

  return (
    <section className="food-log">
      <PageHeader
        title="Food Log History"
        subtitle="Directory of all your food trials: in progress, safe, and unsafe."
        trialModeActive={hasActiveTrial}
      />

      {/* ===== Search + filters ===== */}
      <div className="card log-toolbar">
        <label className="log-search">
          <Search size={18} className="log-search__icon" />
          <input
            type="search"
            className="log-search__input"
            placeholder="Search foods..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search foods"
          />
        </label>

        <div
          className="log-filters"
          role="group"
          aria-label="Filter by verdict"
        >
          {filters.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`log-filter${filter === option.id ? ' is-selected' : ''}`}
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== Trial list ===== */}
      {visibleTrials.length === 0 ? (
        <div className="card log-empty">
          {trials.length === 0
            ? 'No trials yet. Start one from the Dashboard.'
            : 'No foods match your search.'}
        </div>
      ) : (
        <ul className="log-list">
          {visibleTrials.map((trial) => {
            const style = verdictStyles[trial.status]
            const Icon = style.icon
            return (
              <li key={trial.id} className="card log-item">
                <span
                  className={`log-item__icon log-item__icon--${trial.status}`}
                  aria-hidden="true"
                >
                  <Icon size={20} />
                </span>

                <div className="log-item__food">
                  <h3>{trial.foodName}</h3>
                  <p className="log-item__dates">{getDateRange(trial)}</p>
                </div>

                <div className="log-item__summary">
                  <p className="log-item__label">Symptom Summary</p>
                  <p>{getSymptomSummary(trial)}</p>
                </div>

                <div className="log-item__verdict">
                  <p className="eyebrow">Verdict</p>
                  <span className={`badge badge--${style.tone}`}>
                    {style.badge}
                  </span>
                </div>

                <button
                  type="button"
                  className="log-item__details"
                  onClick={() => openTrial(trial.id)}
                >
                  View Details
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default FoodLog
