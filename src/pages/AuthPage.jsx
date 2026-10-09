import { useState } from 'react'
import {
  Activity,
  BookOpen,
  Eye,
  EyeOff,
  ScanLine,
  ShieldAlert,
} from 'lucide-react'
import './AuthPage.css'

/*
 * Login / sign-up page, plus a "set a new password" mode for reset links.
 *
 * Props (each handler resolves to { error, notice }, both optional):
 *  - initialMode: 'login' | 'signup' | 'reset'
 *  - onLogIn({ email, password })
 *  - onSignUp({ email, password })
 *  - onForgotPassword(email)
 *  - onUpdatePassword(password)
 */

const features = [
  { icon: Activity, text: 'Track one new food at a time, day by day' },
  { icon: BookOpen, text: 'Keep a history of every safe and unsafe food' },
  { icon: ScanLine, text: 'Check ingredient labels against your allergens' },
]

const headings = {
  login: {
    title: 'Welcome back',
    text: 'Log in to see your trials and symptom logs.',
    button: 'Log in',
  },
  signup: {
    title: 'Create your account',
    text: 'Start tracking your food trials in a minute.',
    button: 'Create account',
  },
  reset: {
    title: 'Set a new password',
    text: 'Choose a new password for your account.',
    button: 'Save new password',
  },
}

function AuthPage({
  initialMode = 'login',
  onLogIn,
  onSignUp,
  onForgotPassword,
  onUpdatePassword,
}) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  // Non-error messages, like "check your email"
  const [notice, setNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isSignUp = mode === 'signup'
  const isReset = mode === 'reset'
  // Sign up and reset both choose a new password, so both need confirming
  const isNewPassword = isSignUp || isReset
  const heading = headings[mode]

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
    setNotice('')
    setPassword('')
    setConfirmPassword('')
  }

  // Runs a handler, shows its { error, notice }, and handles the busy state
  async function run(handler) {
    setIsSubmitting(true)
    setError('')
    setNotice('')
    const result = (await handler()) ?? {}
    setIsSubmitting(false)
    if (result.error) setError(result.error)
    if (result.notice) setNotice(result.notice)
    return result
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmedEmail = email.trim()

    // Check the form before sending anything to Supabase
    if (!isReset && !trimmedEmail) {
      setError('Enter your email.')
      return
    }
    if (!password) {
      setError('Enter your password.')
      return
    }
    if (isNewPassword && password.length < 8) {
      setError('Use at least 8 characters for your password.')
      return
    }
    if (isNewPassword && password !== confirmPassword) {
      setError("The passwords don't match.")
      return
    }

    if (isReset) {
      await run(() => onUpdatePassword(password))
    } else if (isSignUp) {
      const result = await run(() =>
        onSignUp({ email: trimmedEmail, password }),
      )
      // Needs email confirmation: send them to Log in, keeping the message
      if (result.notice) {
        setMode('login')
        setPassword('')
        setConfirmPassword('')
      }
    } else {
      await run(() => onLogIn({ email: trimmedEmail, password }))
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setNotice('')
      setError('Type your email above first, then press "Forgot password?".')
      return
    }
    await run(() => onForgotPassword(email.trim()))
  }

  return (
    <main className="auth">
      {/* ===== Left: what the app is ===== */}
      <section className="auth__intro" aria-hidden="true">
        <div className="auth__brand">
          <span className="auth__logo">
            <ShieldAlert size={22} />
          </span>
          <span className="auth__brand-name">TrialBites</span>
        </div>

        <div>
          <h1 className="auth__headline">
            Find out which foods are safe for you.
          </h1>
          <p className="auth__lead">
            A simple log for elimination diets and food reintroduction trials.
          </p>

          <ul className="auth__features">
            {features.map(({ icon: Icon, text }) => (
              <li key={text}>
                <span className="auth__feature-icon">
                  <Icon size={18} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="auth__footnote">
          TrialBites is a tracking tool, not medical advice. Always plan food
          trials with your clinical team.
        </p>
      </section>

      {/* ===== Right: the form ===== */}
      <section className="auth__panel">
        <div className="card auth__card">
          {/* Logo again for small screens, where the left side is hidden */}
          <div className="auth__brand auth__brand--mobile">
            <span className="auth__logo">
              <ShieldAlert size={20} />
            </span>
            <span className="auth__brand-name">TrialBites</span>
          </div>

          {!isReset && (
            <div className="auth__tabs" role="tablist" aria-label="Account">
              <button
                type="button"
                role="tab"
                aria-selected={!isSignUp}
                className={`auth__tab${!isSignUp ? ' is-active' : ''}`}
                onClick={() => switchMode('login')}
              >
                Log in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isSignUp}
                className={`auth__tab${isSignUp ? ' is-active' : ''}`}
                onClick={() => switchMode('signup')}
              >
                Sign up
              </button>
            </div>
          )}

          <div className="auth__heading">
            <h2>{heading.title}</h2>
            <p>{heading.text}</p>
          </div>

          <form className="auth__form" onSubmit={handleSubmit} noValidate>
            {!isReset && (
              <label className="auth__field">
                <span className="auth__label">Email</span>
                <input
                  className="auth__input"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
            )}

            {/* A div, not a <label>: a label wrapped around this field would
                attach to the "Forgot password?" button (the first button or
                input inside it) instead of the password box. So the label
                points at the input by id with htmlFor instead. */}
            <div className="auth__field">
              <span className="auth__label-row">
                <label className="auth__label" htmlFor="auth-password">
                  {isReset ? 'New password' : 'Password'}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    className="auth__link"
                    onClick={handleForgotPassword}
                    disabled={isSubmitting}
                  >
                    Forgot password?
                  </button>
                )}
              </span>
              <span className="auth__password">
                <input
                  id="auth-password"
                  className="auth__input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isNewPassword ? 'new-password' : 'current-password'}
                  placeholder={isNewPassword ? 'At least 8 characters' : ''}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="auth__eye"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </div>

            {isNewPassword && (
              <label className="auth__field">
                <span className="auth__label">Confirm password</span>
                <input
                  className="auth__input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>
            )}

            {error && (
              <p className="auth__error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="auth__notice" role="status">
                {notice}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary auth__submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Please wait…' : heading.button}
            </button>
          </form>

          {!isReset && (
            <p className="auth__switch">
              {isSignUp ? 'Already have an account?' : 'New to TrialBites?'}{' '}
              <button
                type="button"
                className="auth__link"
                onClick={() => switchMode(isSignUp ? 'login' : 'signup')}
              >
                {isSignUp ? 'Log in' : 'Create an account'}
              </button>
            </p>
          )}
        </div>
      </section>
    </main>
  )
}

export default AuthPage
