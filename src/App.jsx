import { useEffect, useState } from 'react'
import AppShell from './components/AppShell.jsx'
import NewTrialDialog from './components/NewTrialDialog.jsx'
import {
  addSymptom,
  createTrial,
  fetchTrials,
  updateTrialStatus,
} from './lib/trialsApi.js'
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

// user and onLogOut come from AuthGate, which only shows App when logged in
function App({ user, onLogOut }) {
  const [currentPage, setCurrentPage] = useState('dashboard')
  // Starts empty; filled from Supabase when the app opens
  const [trials, setTrials] = useState([])
  // No trial is selected until the user opens one
  const [currentTrialId, setCurrentTrialId] = useState(null)

  // Loading: true while the first fetch is running
  const [isLoading, setIsLoading] = useState(true)
  // Set when loading the trials fails (wrong keys, no internet...)
  const [loadError, setLoadError] = useState('')
  // Set when saving a symptom or verdict fails
  const [saveError, setSaveError] = useState('')
  // Changing this number makes the effect below run again ("Try again" button)
  const [reloadKey, setReloadKey] = useState(0)
  // Whether the "Start New Trial" pop-up is showing
  const [isNewTrialOpen, setIsNewTrialOpen] = useState(false)

  const currentTrial = trials.find((trial) => trial.id === currentTrialId)

  // Load all trials from Supabase when the app opens (and on "Try again").
  useEffect(() => {
    // If the component unmounts or the effect re-runs before the request
    // finishes, "ignore" stops the old request from overwriting newer state.
    // (In development, React's StrictMode runs effects twice on purpose.)
    let ignore = false

    fetchTrials()
      .then((loadedTrials) => {
        if (ignore) return
        setTrials(loadedTrials)
        setLoadError('')
      })
      .catch((error) => {
        if (ignore) return
        setLoadError(error.message)
      })
      .finally(() => {
        if (!ignore) setIsLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [reloadKey])

  function handleRetry() {
    setIsLoading(true)
    setReloadKey((key) => key + 1)
  }

  // Returns '' if it worked, or an error message for the dialog to show
  async function handleCreateTrial({ foodName, startDate }) {
    try {
      const newTrial = await createTrial({ foodName, startDate })

      // Add it to the list, keeping newest start date first (like fetchTrials)
      setTrials((currentTrials) =>
        [newTrial, ...currentTrials].sort((a, b) =>
          b.startDate.localeCompare(a.startDate),
        ),
      )

      // Close the pop-up and open the new trial so they can start logging
      setIsNewTrialOpen(false)
      setCurrentTrialId(newTrial.id)
      setCurrentPage('tracker')
      return ''
    } catch (error) {
      return `Couldn't start the trial: ${error.message}`
    }
  }

  async function handleLogSymptom(trialId, symptom) {
    setSaveError('')
    try {
      // Save first. Only update the screen once Supabase confirms,
      // so the screen never shows something the database doesn't have.
      const savedSymptom = await addSymptom(trialId, symptom)

      setTrials((currentTrials) =>
        currentTrials.map((trial) =>
          trial.id === trialId
            ? { ...trial, symptoms: [...trial.symptoms, savedSymptom] }
            : trial,
        ),
      )
      // Tell TrialTracker it worked, so it can clear the form
      return true
    } catch (error) {
      setSaveError(`Couldn't save the symptom: ${error.message}`)
      // Tell TrialTracker it failed, so it keeps what the user typed
      return false
    }
  }

  async function handleUpdateStatus(trialId, status) {
    setSaveError('')
    try {
      // Supabase sends back the saved status and verdict date
      const saved = await updateTrialStatus(trialId, status)

      setTrials((currentTrials) =>
        currentTrials.map((trial) =>
          trial.id === trialId
            ? { ...trial, status: saved.status, completedAt: saved.completedAt }
            : trial,
        ),
      )
    } catch (error) {
      setSaveError(`Couldn't update the verdict: ${error.message}`)
    }
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
            onStartNewTrial={() => setIsNewTrialOpen(true)}
          />
        )
    }
  }

  // What goes in the main area: loading, an error, or the current page
  function renderContent() {
    if (isLoading) {
      return <div className="card app-status">Loading trials…</div>
    }

    if (loadError) {
      return (
        <div className="card app-status app-status--error" role="alert">
          <p className="app-status__title">Couldn't load your trials</p>
          <p>{loadError}</p>
          <button type="button" className="btn-primary" onClick={handleRetry}>
            Try again
          </button>
        </div>
      )
    }

    return (
      <>
        {saveError && (
          <div className="save-error" role="alert">
            <p>{saveError}</p>
            <button
              type="button"
              className="save-error__close"
              onClick={() => setSaveError('')}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}
        {renderPage()}
      </>
    )
  }

  return (
    <AppShell
      currentPage={currentPage}
      navigationItems={navigationItems}
      onNavigate={setCurrentPage}
      userEmail={user.email}
      onLogOut={onLogOut}
    >
      {renderContent()}

      <NewTrialDialog
        isOpen={isNewTrialOpen}
        onClose={() => setIsNewTrialOpen(false)}
        onCreate={handleCreateTrial}
      />
    </AppShell>
  )
}

export default App
