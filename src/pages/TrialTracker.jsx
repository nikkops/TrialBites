function TrialTracker({ trial, onLogSymptom, onUpdateStatus }) {
  if (!trial) {
    return (
      <section>
        <h1>Trial Tracker</h1>
        <p>Select an active trial from the dashboard to begin.</p>
      </section>
    )
  }

  function handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const notes = formData.get('notes').trim()

    if (!notes) return

    onLogSymptom(trial.id, {
      severity: Number(formData.get('severity')),
      notes,
    })
    event.currentTarget.reset()
  }

  return (
    <section>
      <header>
        <p>Trial Tracker</p>
        <h1>{trial.foodName}</h1>
        <p>Started {trial.startDate}</p>
        <p>Status: {trial.status}</p>
      </header>

      <section aria-labelledby="symptom-form-heading">
        <h2 id="symptom-form-heading">Log a symptom</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Severity (1-10)
            <input name="severity" type="number" min="1" max="10" defaultValue="1" />
          </label>
          <label>
            Notes
            <textarea name="notes" rows="4" />
          </label>
          <button type="submit">Log reaction</button>
        </form>
      </section>

      <section aria-labelledby="timeline-heading">
        <h2 id="timeline-heading">Symptom timeline</h2>
        {trial.symptoms.length === 0 ? (
          <p>No symptoms logged for this trial.</p>
        ) : (
          <ol>
            {trial.symptoms.map((symptom) => (
              <li key={symptom.id}>
                <strong>{symptom.date}</strong> - severity {symptom.severity}/10
                <p>{symptom.notes}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="verdict-heading">
        <h2 id="verdict-heading">Trial verdict</h2>
        <button type="button" onClick={() => onUpdateStatus(trial.id, 'safe')}>
          Flag as safe
        </button>
        <button type="button" onClick={() => onUpdateStatus(trial.id, 'unsafe')}>
          Flag as unsafe
        </button>
      </section>
    </section>
  )
}

export default TrialTracker
