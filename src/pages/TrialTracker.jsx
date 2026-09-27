import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import {
  formatDate,
  formatLongDate,
  getDayNumber,
  getSeverityBadge,
  getStatusBadge,
  getTrialDay,
  severityLevels,
} from '../utils/trialHelpers.js'
import './TrialTracker.css'

function TrialTracker({ trial, onLogSymptom, onUpdateStatus, onNavigate }) {
  const [severityId, setSeverityId] = useState('mild')
  const [notes, setNotes] = useState('')

  const backLink = (
    <button
      type="button"
      className="back-link"
      onClick={() => onNavigate('dashboard')}
    >
      <ArrowLeft size={16} />
      Back to Dashboard
    </button>
  )

  if (!trial) {
    return (
      <section className="tracker">
        {backLink}
        <PageHeader
          title="Trial Tracker"
          subtitle="Select an active trial from the dashboard to begin."
        />
      </section>
    )
  }

  const isActive = trial.status === 'active'
  const status = getStatusBadge(trial.status)
  const selectedLevel = severityLevels.find((level) => level.id === severityId)

  // Newest entries first
  const timeline = [...trial.symptoms].sort((a, b) =>
    b.date.localeCompare(a.date),
  )

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = notes.trim()

    // Notes are optional only when logging "None"
    if (!trimmed && selectedLevel.id !== 'none') return

    onLogSymptom(trial.id, {
      severity: selectedLevel.value,
      notes: trimmed || 'No symptoms observed.',
    })
    setNotes('')
    setSeverityId('mild')
  }

  return (
    <section className="tracker">
      {backLink}

      <PageHeader
        title={`${isActive ? 'Active Food Trial' : 'Food Trial'}: ${trial.foodName}`}
        subtitle="Track daily introduction steps, symptom responses, and render a final safety verdict."
        trialModeActive={isActive}
      />

      <div className="tracker__layout">
        <div className="tracker__main">
          {/* ===== Trial facts ===== */}
          <div className="card trial-facts">
            <div>
              <p className="eyebrow">Start Date</p>
              <p className="trial-facts__value">
                {formatLongDate(trial.startDate)}
              </p>
            </div>
            <div>
              <p className="eyebrow">Duration Status</p>
              <p className="trial-facts__value">
                {isActive
                  ? `Day ${getTrialDay(trial.startDate)}`
                  : `Completed · ${status.label}`}
              </p>
            </div>
            <div>
              <p className="eyebrow">Entries Logged</p>
              <p className="trial-facts__value">
                {trial.symptoms.length}{' '}
                {trial.symptoms.length === 1 ? 'Entry' : 'Entries'}
              </p>
            </div>
          </div>

          {/* ===== Log a reaction ===== */}
          <section className="card tracker__panel" aria-labelledby="log-heading">
            <h2 id="log-heading">Log a Reaction / Observation</h2>

            <form className="log-form" onSubmit={handleSubmit}>
              <fieldset className="field">
                <legend className="field__label">Severity Level</legend>
                <div className="severity-picker">
                  {severityLevels.map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      className={`severity-option severity-option--${level.id}${
                        level.id === severityId ? ' is-selected' : ''
                      }`}
                      aria-pressed={level.id === severityId}
                      onClick={() => setSeverityId(level.id)}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="field">
                <span className="field__label">
                  Symptom Notes &amp; Clinical Description
                </span>
                <textarea
                  className="field__input"
                  rows="4"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="What happened, where, and how long after eating?"
                />
              </label>

              <div className="log-form__footer">
                <p className="log-form__hint">
                  Entries are added to this trial's timeline below.
                </p>
                <button type="submit" className="btn-primary">
                  Record Log Entry
                </button>
              </div>
            </form>
          </section>

          {/* ===== Timeline ===== */}
          <section
            className="card tracker__panel"
            aria-labelledby="timeline-heading"
          >
            <h2 id="timeline-heading">Trial Timeline Entries</h2>

            {timeline.length === 0 ? (
              <p className="tracker__muted">No entries logged for this trial.</p>
            ) : (
              <ol className="timeline">
                {timeline.map((symptom) => {
                  const severity = getSeverityBadge(symptom.severity)
                  return (
                    <li key={symptom.id} className="timeline__item">
                      <p className="timeline__day">
                        Day {getDayNumber(trial.startDate, symptom.date)} (
                        {formatDate(symptom.date)})
                      </p>
                      <div>
                        <p
                          className={`timeline__title timeline__title--${severity.tone}`}
                        >
                          {severity.label} Logged
                        </p>
                        <p className="timeline__notes">{symptom.notes}</p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        </div>

        {/* ===== Verdict ===== */}
        <aside className="card tracker__panel verdict">
          <h2>Complete Food Trial</h2>
          <p className="tracker__muted">Render your final assessment below.</p>

          <button
            type="button"
            className={`verdict-option verdict-option--safe${
              trial.status === 'safe' ? ' is-selected' : ''
            }`}
            aria-pressed={trial.status === 'safe'}
            onClick={() => onUpdateStatus(trial.id, 'safe')}
          >
            <span className="verdict-option__title">Mark as Safe</span>
            <span className="verdict-option__text">
              Log this food as completely safe. It will show as a safe food in
              your Food Log.
            </span>
          </button>

          <button
            type="button"
            className={`verdict-option verdict-option--unsafe${
              trial.status === 'unsafe' ? ' is-selected' : ''
            }`}
            aria-pressed={trial.status === 'unsafe'}
            onClick={() => onUpdateStatus(trial.id, 'unsafe')}
          >
            <span className="verdict-option__title">
              Mark as Unsafe (Allergen)
            </span>
            <span className="verdict-option__text">
              Flag this food as reactive. It will appear in the dashboard's
              allergen warning.
            </span>
          </button>
        </aside>
      </div>
    </section>
  )
}

export default TrialTracker
