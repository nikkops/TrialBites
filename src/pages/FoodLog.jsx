import { useState } from 'react'
import { Check, Search, TriangleAlert } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import {
  formatDate,
  getDayNumber,
  getSeverityBadge,
} from '../utils/trialHelpers.js'
import './FoodLog.css'

const filters = [
  { id: 'all', label: 'All Foods' },
  { id: 'safe', label: 'Safe Only' },
  { id: 'unsafe', label: 'Unsafe (Allergens)' },
]

// One line describing the worst reaction during a trial
function getSymptomSummary(trial) {
  if (trial.symptoms.length === 0) {
    return 'No reaction symptoms logged throughout the trial.'
  }
  const worst = trial.symptoms.reduce((a, b) => (b.severity > a.severity ? b : a))
  const { label } = getSeverityBadge(worst.severity)
  const day = getDayNumber(trial.startDate, worst.date)
  return `${label} on Day ${day}: ${worst.notes}`
}

// "Sep 18" or "Sep 18 - Sep 22" (start to last logged entry)
function getDateRange(trial) {
  const start = formatDate(trial.startDate)
  if (trial.symptoms.length === 0) return start
  const lastDate = trial.symptoms
    .map((symptom) => symptom.date)
    .sort()
    .at(-1)
  return lastDate === trial.startDate ? start : `${start} - ${formatDate(lastDate)}`
}

function FoodLog({ trials, onNavigate, onSelectTrial }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const hasActiveTrial = trials.some((trial) => trial.status === 'active')

  // Only finished trials (with a verdict) belong in the history
  const completedTrials = trials.filter((trial) => trial.status !== 'active')

  const visibleTrials = completedTrials
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
        subtitle="Directory of all your past completed, safe, and unsafe food trials."
        trialModeActive={hasActiveTrial}
      />

      {/* ===== Search + filters ===== */}
      <div className="card log-toolbar">
        <label className="log-search">
          <Search size={18} className="log-search__icon" />
          <input
            type="search"
            className="log-search__input"
            placeholder="Search past foods..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search past foods"
          />
        </label>

        <div className="log-filters" role="group" aria-label="Filter by verdict">
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
          {completedTrials.length === 0
            ? 'No completed trials yet. Finished trials will show up here.'
            : 'No foods match your search.'}
        </div>
      ) : (
        <ul className="log-list">
          {visibleTrials.map((trial) => {
            const isSafe = trial.status === 'safe'
            return (
              <li key={trial.id} className="card log-item">
                <span
                  className={`log-item__icon log-item__icon--${isSafe ? 'safe' : 'unsafe'}`}
                  aria-hidden="true"
                >
                  {isSafe ? <Check size={20} /> : <TriangleAlert size={20} />}
                </span>

                <div className="log-item__food">
                  <h3>{trial.foodName}</h3>
                  <p className="log-item__dates">Trial: {getDateRange(trial)}</p>
                </div>

                <div className="log-item__summary">
                  <p className="log-item__label">Symptom Summary</p>
                  <p>{getSymptomSummary(trial)}</p>
                </div>

                <div className="log-item__verdict">
                  <p className="eyebrow">Verdict</p>
                  <span className={`badge badge--${isSafe ? 'success' : 'danger'}`}>
                    {isSafe ? 'Safe Food' : 'Unsafe Food'}
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
