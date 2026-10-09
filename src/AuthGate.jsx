import { useEffect, useState } from 'react'
import App from './App.jsx'
import {
  logIn,
  logOut,
  onAuthChange,
  sendPasswordReset,
  signUp,
  updatePassword,
} from './lib/authApi.js'
import AuthPage from './pages/AuthPage.jsx'

/*
 * Decides what to show:
 *  - still checking  -> a short loading message
 *  - reset link used -> the "set a new password" form
 *  - logged out      -> the login / sign-up page
 *  - logged in       -> the app
 *
 * Every handler below returns { error, notice } for AuthPage to display,
 * instead of throwing, so AuthPage doesn't need its own try/catch.
 */
function AuthGate() {
  // undefined = not checked yet, null = logged out, object = logged in
  const [session, setSession] = useState(undefined)
  // True after the user opens a password reset link from their email
  const [isRecovering, setIsRecovering] = useState(false)

  useEffect(() => {
    // Fires once right away with the current session, then on every
    // log in / log out. Only update state here: Supabase warns against
    // calling other Supabase functions inside this callback.
    const stopListening = onAuthChange((event, newSession) => {
      setSession(newSession)
      if (event === 'PASSWORD_RECOVERY') setIsRecovering(true)
    })
    return stopListening
  }, [])

  async function handleLogIn(credentials) {
    try {
      await logIn(credentials)
      // No need to set state: onAuthChange fires and shows the app
      return {}
    } catch (error) {
      return { error: error.message }
    }
  }

  async function handleSignUp(credentials) {
    try {
      const { needsConfirmation } = await signUp(credentials)
      if (needsConfirmation) {
        return {
          notice:
            'Check your email for a confirmation link, then come back and log in.',
        }
      }
      return {}
    } catch (error) {
      return { error: error.message }
    }
  }

  async function handleForgotPassword(email) {
    try {
      await sendPasswordReset(email)
      // Same message whether or not the account exists, so the form
      // doesn't reveal which emails have accounts
      return {
        notice: 'If that email has an account, a reset link is on its way.',
      }
    } catch (error) {
      return { error: error.message }
    }
  }

  async function handleUpdatePassword(password) {
    try {
      await updatePassword(password)
      setIsRecovering(false)
      return {}
    } catch (error) {
      return { error: error.message }
    }
  }

  async function handleLogOut() {
    try {
      await logOut()
    } catch (error) {
      window.alert(`Couldn't log out: ${error.message}`)
    }
  }

  if (session === undefined) {
    return <div className="auth-checking">Loading…</div>
  }

  if (isRecovering) {
    // A different key from the login page below, so React builds a fresh
    // AuthPage instead of reusing the login one (whose mode is still 'login')
    return (
      <AuthPage
        key="reset"
        initialMode="reset"
        onUpdatePassword={handleUpdatePassword}
      />
    )
  }

  if (!session) {
    return (
      <AuthPage
        key="login"
        onLogIn={handleLogIn}
        onSignUp={handleSignUp}
        onForgotPassword={handleForgotPassword}
      />
    )
  }

  // key={user id}: if a different person logs in, React throws away the old
  // App completely (trials, selected trial, everything) and starts fresh.
  return (
    <App
      key={session.user.id}
      user={session.user}
      onLogOut={handleLogOut}
    />
  )
}

export default AuthGate
