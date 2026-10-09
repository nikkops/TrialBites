/*
 * authApi.js
 * Everything about accounts: signing up, logging in and out, and passwords.
 * Same idea as trialsApi.js: pages never call supabase.auth directly,
 * and every function throws an Error if Supabase returns one.
 */
import { supabase } from './supabase.js'

/**
 * Run `callback(event, session)` whenever the login state changes.
 * It also runs once right away with the current state (event 'INITIAL_SESSION'),
 * so the app knows on startup whether someone is already logged in.
 * Returns: a function that stops listening.
 */
export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
  return () => data.subscription.unsubscribe()
}

/**
 * Create an account.
 * Returns: { needsConfirmation } - true when Supabase emailed a confirmation
 * link and the user must click it before they can log in.
 */
export async function signUp({ email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Where the confirmation link sends them back to (this site)
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) throw error

  // With email confirmation on, Supabase creates the user but no session yet
  return { needsConfirmation: !data.session }
}

export async function logIn({ email, password }) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function logOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Email a password reset link. Clicking it opens this site already logged in,
 * and onAuthChange fires with event 'PASSWORD_RECOVERY'.
 */
export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  })
  if (error) throw error
}

/** Set a new password for whoever is logged in (used after a reset link). */
export async function updatePassword(password) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}
