function Dashboard({ trials, onNavigate, onSelectTrial }) {
  const activeTrials = trials.filter((trial) => trial.status === 'active')
  const recentSymptoms = trials.flatMap((trial) =>
    trial.symptoms.map((symptom) => ({ ...symptom, foodName: trial.foodName })),
  )

  return (
    <section>
      <header>
        <p>Dashboard</p>
        <h1>Track your food trials</h1>
        <p>Review active trials, recent symptoms, and your food history.</p>
      </header>

      <section aria-labelledby="active-trials-heading">
        <h2 id="active-trials-heading">Active trials</h2>
        {activeTrials.length === 0 ? (
          <p>No active trials yet.</p>
        ) : (
          <ul>
            {activeTrials.map((trial) => (
              <li key={trial.id}>
                <strong>{trial.foodName}</strong>
                <span> Started {trial.startDate}</span>
                <button
                  type="button"
                  onClick={() => {
                    onSelectTrial(trial.id)
                    onNavigate('tracker')
                  }}
                >
                  Open trial
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={() => onNavigate('tracker')}>
          Start a new trial
        </button>
      </section>

      <section aria-labelledby="recent-symptoms-heading">
        <h2 id="recent-symptoms-heading">Recent symptoms</h2>
        {recentSymptoms.length === 0 ? (
          <p>No symptoms logged yet.</p>
        ) : (
          <ul>
            {recentSymptoms.map((symptom) => (
              <li key={symptom.id}>
                {symptom.foodName}: severity {symptom.severity}/10 on{' '}
                {symptom.date}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}

export default Dashboard
