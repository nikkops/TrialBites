function FoodLog({ trials }) {
  return (
    <section>
      <header>
        <p>Food Log</p>
        <h1>Trial history</h1>
        <p>Review completed food trials and their current safety status.</p>
      </header>

      <ul>
        {trials.map((trial) => (
          <li key={trial.id}>
            <strong>{trial.foodName}</strong>
            <span> Status: {trial.status}</span>
            <span> Started: {trial.startDate}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default FoodLog
