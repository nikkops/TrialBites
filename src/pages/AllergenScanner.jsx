import { useEffect, useRef, useState } from 'react'
import {
  Camera,
  CircleCheck,
  CircleX,
  Info,
  Sparkles,
} from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import './AllergenScanner.css'

/*
 * Placeholder for the real image analysis (e.g. the Gemini API).
 * Later, replace the body with the API call. It should resolve to:
 *   { matches: [{ ingredient: 'Peanut Flour', synonym: 'Arachis Hypogaea', allergen: 'Peanuts' }] }
 * An empty matches array means nothing reactive was found.
 */
async function scanLabel(file, allergens) {
  void file
  void allergens
  throw new Error(
    'Scanning is not connected yet. The analysis service will be added later.',
  )
}

function AllergenScanner({ trials }) {
  const fileInputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const hasActiveTrial = trials.some((trial) => trial.status === 'active')
  const allergens = trials
    .filter((trial) => trial.status === 'unsafe')
    .map((trial) => trial.foodName)

  // Free the preview image's memory when it changes or the page closes
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function handleFileChange(event) {
    const selected = event.target.files[0]
    if (!selected) return

    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
    setResult(null)
    setError('')
  }

  async function handleScan() {
    if (!file) {
      fileInputRef.current.click()
      return
    }

    setIsScanning(true)
    setError('')
    try {
      setResult(await scanLabel(file, allergens))
    } catch (scanError) {
      setResult(null)
      setError(scanError.message)
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <section className="scanner">
      <PageHeader
        title="Allergen Ingredient Scanner"
        subtitle="Scan product ingredient lists to check for reactive allergens matched against your logs."
        trialModeActive={hasActiveTrial}
      />

      <div className="scanner__layout">
        <div className="scanner__main">
          {/* ===== Upload ===== */}
          <div className="card upload">
            {previewUrl ? (
              <img
                className="upload__preview"
                src={previewUrl}
                alt="Selected ingredient label"
              />
            ) : (
              <span className="upload__icon" aria-hidden="true">
                <Camera size={24} />
              </span>
            )}

            <h2>Upload Ingredient Label Image</h2>
            <p className="upload__text">
              {file
                ? file.name
                : 'Take a snapshot or select an image file to analyze.'}
            </p>

            {/* Hidden real input; "Browse Files" opens it */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="visually-hidden"
              onChange={handleFileChange}
            />

            <div className="upload__actions">
              <button
                type="button"
                className="btn-bordered"
                onClick={() => fileInputRef.current.click()}
              >
                {file ? 'Change Image' : 'Browse Files'}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleScan}
                disabled={isScanning}
              >
                {isScanning ? 'Analyzing…' : 'Scan & Analyze'}
              </button>
            </div>
          </div>

          {/* ===== About the scanner ===== */}
          <div className="scanner-info">
            <Sparkles size={22} className="scanner-info__icon" />
            <div>
              <p className="scanner-info__title">Gemini-powered Clinical OCR</p>
              <p>
                This analyzer uses Gemini computer vision models to identify
                cross-reactive botanicals and masked clinical synonym names.
              </p>
            </div>
          </div>
        </div>

        {/* ===== Results ===== */}
        <aside className="card results">
          <h2>Analysis Results</h2>
          <p className="results__subtitle">
            Matched against your reactive trial food logs
          </p>

          {result ? (
            <>
              {result.matches.length > 0 ? (
                <p className="results__alert results__alert--danger">
                  <CircleX size={18} />
                  {result.matches.length} Reactive Allergen
                  {result.matches.length === 1 ? '' : 's'} Detected
                </p>
              ) : (
                <p className="results__alert results__alert--safe">
                  <CircleCheck size={18} />
                  No Reactive Allergens Detected
                </p>
              )}

              {result.matches.length > 0 && (
                <>
                  <h3 className="results__heading">
                    Identified Ingredient Matches
                  </h3>
                  <ul className="matches">
                    {result.matches.map((match) => (
                      <li key={match.ingredient} className="match">
                        <div>
                          <p className="match__name">“{match.ingredient}”</p>
                          {match.synonym && (
                            <p className="match__synonym">
                              Synonym: {match.synonym}
                            </p>
                          )}
                        </div>
                        <span className="badge badge--danger">
                          Match: {match.allergen}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <div className="results__empty">
              {error ? (
                <p className="results__error">{error}</p>
              ) : (
                <p>Upload a label and press Scan &amp; Analyze to see matches.</p>
              )}

              <h3 className="results__heading">Watching for</h3>
              {allergens.length > 0 ? (
                <div className="watch-list">
                  {allergens.map((name) => (
                    <span key={name} className="badge badge--danger">
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <p>No foods have been marked unsafe yet.</p>
              )}
            </div>
          )}

          <p className="disclaimer">
            <Info size={16} />
            Disclaimer: AI scan results are supportive. Always verify with your
            clinical team.
          </p>
        </aside>
      </div>
    </section>
  )
}

export default AllergenScanner
