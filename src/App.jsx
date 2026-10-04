import { useState } from 'react'
import AppShell from './components/AppShell.jsx'
import { trials as initialTrials } from './lib/trials.js'
import AllergenScanner from './pages/AllergenScanner.jsx'
import Dashboard from './pages/Dashboard.jsx'
import FoodLog from './pages/FoodLog.jsx'
import TrialTracker from './pages/TrialTracker.jsx'

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'tracker', label: 'Trial Tracker' },
  { id: 'food-log', label: 'Food Log' },
  { id: 'scanner', label: 'Allergen Scanner' },
]

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [trials, setTrials] = useState(initialTrials)
  const [currentTrialId, setCurrentTrialId] = useState('trial-1')

  const currentTrial = trials.find((trial) => trial.id === currentTrialId)

  function handleLogSymptom(trialId, symptom) {
    setTrials((currentTrials) =>
      currentTrials.map((trial) => {
        if (trial.id !== trialId) return trial

        return {
          ...trial,
          symptoms: [
            ...trial.symptoms,
            {
              ...symptom,
              id: `symptom-${Date.now()}`,
              date: new Date().toISOString().slice(0, 10),
            },
          ],
        }
      }),
    )
  }

  function handleUpdateStatus(trialId, status) {
    setTrials((currentTrials) =>
      currentTrials.map((trial) =>
        trial.id === trialId ? { ...trial, status } : trial,
      ),
    )
  }

  function renderPage() {
    switch (currentPage) {
      case 'tracker':
        return (
          <TrialTracker
            trial={currentTrial}
            onLogSymptom={handleLogSymptom}
            onUpdateStatus={handleUpdateStatus}
            onNavigate={setCurrentPage}
          />
        )
      case 'food-log':
        return (
          <FoodLog
            trials={trials}
            onNavigate={setCurrentPage}
            onSelectTrial={setCurrentTrialId}
          />
        )
      case 'scanner':
        return <AllergenScanner trials={trials} />
      case 'dashboard':
      default:
        return (
          <Dashboard
            trials={trials}
            onNavigate={setCurrentPage}
            onSelectTrial={setCurrentTrialId}
          />
        )
    }
  }

  return (
    <AppShell
      currentPage={currentPage}
      navigationItems={navigationItems}
      onNavigate={setCurrentPage}
    >
      {renderPage()}
    </AppShell>
  )
}

export default App
