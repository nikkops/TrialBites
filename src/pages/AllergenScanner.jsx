import { useEffect, useRef, useState } from 'react'
import {
  Camera,
  CircleAlert,
  CircleCheck,
  CircleX,
  Info,
  Sparkles,
} from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { scanFood } from '../lib/scannerApi.js'
import './AllergenScanner.css'

// How each certainty level is labeled and colored in the results
const certaintyBadges = {
  seen: { label: 'Seen', className: 'badge--danger' },
  likely: { label: 'Likely', className: 'badge--danger' },
  possible: { label: 'Possible', className: 'badge--warning' },
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

    // Nothing to compare against yet, so don't use up a Gemini request
    if (allergens.length === 0) {
      setResult(null)
      setError(
        "You haven't marked any foods as unsafe yet, so there's nothing to check this food against.",
      )
      return
    }

    setIsScanning(true)
    setError('')
    try {
      setResult(await scanFood(file))
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
        title="Allergen Food Scanner"
        subtitle="Photograph a food or meal to check it against the foods you've marked unsafe."
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
                alt="Selected food photo"
              />
            ) : (
              <span className="upload__icon" aria-hidden="true">
                <Camera size={24} />
              </span>
            )}

            <h2>Upload a Food Photo</h2>
            <p className="upload__text">
              {file
                ? file.name
                : 'Take a photo of the food, or select an image file to analyze.'}
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
              <p className="scanner-info__title">Gemini-powered Food Recognition</p>
              <p>
                Gemini identifies the foods in your photo and flags any that
                are, or usually contain, one of your unsafe foods. It can't see
                hidden ingredients, so check the package label when there is one.
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

          {result && result.recognized === false ? (
            <>
              <p className="results__alert results__alert--warning">
                <CircleAlert size={18} />
                Couldn't Recognize the Food
              </p>
              <p className="results__hint">
                Try a closer, well-lit photo with the food filling most of the
                frame.
              </p>
            </>
          ) : result ? (
            <>
              {result.matches.length > 0 ? (
                <p className="results__alert results__alert--danger">
                  <CircleX size={18} />
                  {result.matches.length} Possible Unsafe Food
                  {result.matches.length === 1 ? '' : 's'} Found
                </p>
              ) : (
                <>
                  <p className="results__alert results__alert--safe">
                    <CircleCheck size={18} />
                    None of Your Unsafe Foods Spotted
                  </p>
                  <p className="results__hint">
                    A photo can't show hidden ingredients. Check the package
                    label or ask how it was made before eating it.
                  </p>
                </>
              )}

              {result.matches.length > 0 && (
                <>
                  <h3 className="results__heading">Possible Matches</h3>
                  <ul className="matches">
                    {result.matches.map((match, index) => {
                      const badge =
                        certaintyBadges[match.certainty] ?? certaintyBadges.possible
                      return (
                        <li key={`${match.item}-${index}`} className="match">
                          <div>
                            <p className="match__name">{match.item}</p>
                            {match.reason && (
                              <p className="match__synonym">{match.reason}</p>
                            )}
                          </div>
                          <span className={`badge ${badge.className}`}>
                            {badge.label}: {match.allergen}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}

              <h3 className="results__heading">Checked against</h3>
              <div className="watch-list">
                {result.allergensChecked.map((name) => (
                  <span key={name} className="badge badge--danger">
                    {name}
                  </span>
                ))}
              </div>

              {result.foods.length > 0 && (
                <details className="ingredients">
                  <summary>Foods identified ({result.foods.length})</summary>
                  <p>{result.foods.join(', ')}</p>
                </details>
              )}
            </>
          ) : (
            <div className="results__empty">
              {error ? (
                <p className="results__error">{error}</p>
              ) : (
                <p>Upload a food photo and press Scan &amp; Analyze to see matches.</p>
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
