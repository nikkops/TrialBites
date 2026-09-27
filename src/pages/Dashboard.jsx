import {
  CircleCheck,
  Flame,
  Plus,
  ShieldAlert,
  TriangleAlert,
} from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import {
  formatDate,
  getSeverityBadge,
  getTrialDay,
} from '../utils/trialHelpers.js'
import './Dashboard.css'

// One line of text describing a trial's latest symptom
function getTrialSummary(trial) {
  if (trial.symptoms.length === 0) {
    return 'No symptoms logged yet. Keep monitoring daily.'
  }
  const latest = trial.symptoms[trial.symptoms.length - 1]
  const { label } = getSeverityBadge(latest.severity)
  return `Last entry on ${formatDate(latest.date)}: ${label}. ${latest.notes}`
}

/* ===== Page ===== */

function Dashboard({ trials, onNavigate, onSelectTrial }) {
  const activeTrials = trials.filter((trial) => trial.status === 'active')
  const safeTrials = trials.filter((trial) => trial.status === 'safe')
  const unsafeTrials = trials.filter((trial) => trial.status === 'unsafe')
  const symptomCount = trials.reduce(
    (total, trial) => total + trial.symptoms.length,
    0,
  )

  // Activity feed: trial starts + symptom logs, newest first
  const activity = trials
    .flatMap((trial) => [
      {
        id: `${trial.id}-start`,
        date: trial.startDate,
        foodName: trial.foodName,
        label: 'Trial Start',
        tone: 'info',
      },
      ...trial.symptoms.map((symptom) => ({
        id: symptom.id,
        date: symptom.date,
        foodName: trial.foodName,
        ...getSeverityBadge(symptom.severity),
      })),
    ])
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  function openTrial(trialId) {
    onSelectTrial(trialId)
    onNavigate('tracker')
  }

  return (
    <section className="dashboard">
      {/* ===== Page header ===== */}
      <PageHeader
        title="Clinical Dashboard"
        subtitle="Overview of your current trials, food reactions, and clinical tracking indicators."
        trialModeActive={activeTrials.length > 0}
      />

      {/* ===== Stat cards ===== */}
      <div className="stats">
        <article className="card stat-card">
          <div className="stat-card__top">
            <span className="eyebrow">Active Trials</span>
            <Flame size={18} className="stat-card__icon stat-card__icon--info" />
          </div>
          <p className="stat-card__value">{activeTrials.length} Active</p>
          <p className="stat-card__note">
            {activeTrials.length === 0
              ? 'No trials running right now'
              : activeTrials
                  .map((t) => `${t.foodName} (Day ${getTrialDay(t.startDate)})`)
                  .join(' & ')}
          </p>
        </article>

        <article className="card stat-card">
          <div className="stat-card__top">
            <span className="eyebrow">Reaction Incidents</span>
            <TriangleAlert
              size={18}
              className="stat-card__icon stat-card__icon--danger"
            />
          </div>
          <p className="stat-card__value">{symptomCount} Symptom Logs</p>
          <p className="stat-card__note">Logged across all trials</p>
        </article>

        <article className="card stat-card">
          <div className="stat-card__top">
            <span className="eyebrow">Verdicts Resolved</span>
            <CircleCheck
              size={18}
              className="stat-card__icon stat-card__icon--success"
            />
          </div>
          <p className="stat-card__value">{safeTrials.length} Safe foods</p>
          <p className="stat-card__note">Confirmed safety clearances logged</p>
        </article>
      </div>

      {/* ===== Active trials ===== */}
      <section aria-labelledby="active-trials-heading">
        <div className="section-header">
          <h2 id="active-trials-heading">Currently Active Food Trials</h2>
          <button
            type="button"
            className="btn-primary btn-icon"
            onClick={() => onNavigate('tracker')}
          >
            <Plus size={16} />
            Start New Trial
          </button>
        </div>

        {activeTrials.length === 0 ? (
          <div className="card empty-state">
            No active trials yet. Start one to begin tracking.
          </div>
        ) : (
          <ul className="trial-list">
            {activeTrials.map((trial) => (
              <li key={trial.id} className="card trial-card">
                <div className="trial-card__top">
                  <div>
                    <h3>{trial.foodName} Trial</h3>
                    <p className="trial-card__meta">
                      Start Date: {formatDate(trial.startDate)} • Day{' '}
                      {getTrialDay(trial.startDate)}
                    </p>
                  </div>
                  <span className="badge badge--warning">Status: Active</span>
                </div>

                <p className="trial-card__summary">{getTrialSummary(trial)}</p>

                <div className="trial-card__actions">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => openTrial(trial.id)}
                  >
                    Log Symptom
                  </button>
                  <button type="button" onClick={() => openTrial(trial.id)}>
                    View Tracker
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ===== Recent activity ===== */}
      <section aria-labelledby="activity-heading">
        <h2 id="activity-heading" className="section-title">
          Recent Activity Feed
        </h2>

        <div className="card activity">
          {activity.length === 0 ? (
            <p className="empty-state">No activity yet.</p>
          ) : (
            <table className="activity__table">
              <thead>
                <tr>
                  <th className="eyebrow">Date</th>
                  <th className="eyebrow">Food</th>
                  <th className="eyebrow">Symptom / Status</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((item) => (
                  <tr key={item.id}>
                    <td className="activity__date">{formatDate(item.date)}</td>
                    <td className="activity__food">{item.foodName}</td>
                    <td>
                      <span className={`badge badge--${item.tone}`}>
                        {item.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ===== Allergen alert (only when something was flagged unsafe) ===== */}
      {unsafeTrials.length > 0 && (
        <aside className="allergen-alert" role="note">
          <p className="allergen-alert__title">
            <ShieldAlert size={16} />
            Clinical Allergen Shield
          </p>
          <p>
            Avoid {unsafeTrials.map((t) => t.foodName).join(', ')}. These were
            marked as <strong>unsafe</strong> in previous food trials.
          </p>
        </aside>
      )}
    </section>
  )
}

export default Dashboard
