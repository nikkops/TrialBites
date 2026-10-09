import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { getLocalDate } from '../lib/trialsApi.js'
import './NewTrialDialog.css'

/*
 * Pop-up form for starting a new food trial.
 * Uses the browser's built-in <dialog> element, which gives us the dark
 * backdrop, closing with the Escape key, and keyboard focus for free.
 *
 * Props:
 *  - isOpen: show or hide the dialog
 *  - onClose(): called when the user cancels or closes it
 *  - onCreate({ foodName, startDate }): saves the trial. Resolves to
 *    '' if it worked, or an error message to show if it failed.
 */
function NewTrialDialog({ isOpen, onClose, onCreate }) {
  const dialogRef = useRef(null)
  const nameInputRef = useRef(null)
  const [foodName, setFoodName] = useState('')
  const [startDate, setStartDate] = useState(getLocalDate())
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Open or close the real <dialog> whenever isOpen changes
  useEffect(() => {
    const dialog = dialogRef.current
    if (isOpen && !dialog.open) {
      dialog.showModal()
      // Put the cursor in the food name box (React's autoFocus runs too early,
      // before the dialog is open, so the browser would pick the × button)
      nameInputRef.current.focus()
    }
    if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  // Start fresh each time it closes, so the next trial gets an empty form
  function resetForm() {
    setFoodName('')
    setStartDate(getLocalDate())
    setError('')
  }

  function handleClose() {
    if (isSaving) return
    resetForm()
    onClose()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmed = foodName.trim()

    if (!trimmed) {
      setError('Enter the food you are trialing.')
      return
    }

    setIsSaving(true)
    setError('')
    const errorMessage = await onCreate({ foodName: trimmed, startDate })
    setIsSaving(false)

    if (errorMessage) {
      // Keep the dialog open with what they typed, and show why it failed
      setError(errorMessage)
    } else {
      resetForm()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="new-trial"
      aria-labelledby="new-trial-title"
      // "cancel" fires when the user presses Escape
      onCancel={(event) => {
        event.preventDefault()
        handleClose()
      }}
    >
      <form className="new-trial__form" onSubmit={handleSubmit} noValidate>
        <div className="new-trial__header">
          <div>
            <h2 id="new-trial-title">Start New Trial</h2>
            <p className="new-trial__subtitle">
              Introduce one new food and track how you react to it.
            </p>
          </div>
          <button
            type="button"
            className="new-trial__close"
            onClick={handleClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <label className="new-trial__field">
          <span className="new-trial__label">Food name</span>
          <input
            ref={nameInputRef}
            className="new-trial__input"
            type="text"
            value={foodName}
            onChange={(event) => setFoodName(event.target.value)}
            placeholder="e.g. Eggs"
            maxLength={60}
          />
        </label>

        <label className="new-trial__field">
          <span className="new-trial__label">Start date</span>
          <input
            className="new-trial__input"
            type="date"
            value={startDate}
            // Can't start a trial in the future
            max={getLocalDate()}
            onChange={(event) => setStartDate(event.target.value)}
            required
          />
        </label>

        {error && (
          <p className="new-trial__error" role="alert">
            {error}
          </p>
        )}

        <div className="new-trial__actions">
          <button type="button" onClick={handleClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? 'Starting…' : 'Start Trial'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default NewTrialDialog
