/*
 * trialsApi.js
 * The only file in the app that talks to Supabase.
 * Pages never call Supabase directly: App.jsx calls these functions,
 * and gets back data in the shape the pages already use.
 */
import { supabase } from './supabase.js'

/* ===== Converting between database rows and app objects ===== */
// Database columns use snake_case (food_name). The pages use camelCase (foodName).
// These two functions are the only place that difference exists.

// symptoms row -> { id, date, loggedAt, severity, notes }
function toSymptom(row) {
  return {
    id: row.id,
    date: row.symptom_date,
    // The exact moment the entry was saved, used to show the time ("8:30 AM")
    loggedAt: row.created_at,
    severity: row.severity,
    notes: row.notes,
  }
}

// trials row (with its symptoms nested inside) ->
// { id, foodName, startDate, status, completedAt, symptoms }
function toTrial(row) {
  return {
    id: row.id,
    foodName: row.food_name,
    startDate: row.start_date,
    status: row.status,
    // When the verdict was given; null while the trial is active
    completedAt: row.completed_at ?? null,
    // Oldest first, so the newest symptom is last (the Dashboard relies on that)
    symptoms: (row.symptoms ?? [])
      .map(toSymptom)
      .sort((a, b) => a.date.localeCompare(b.date)),
  }
}

// Today's date in YOUR timezone as 'YYYY-MM-DD'.
// The database's current_date uses UTC, which is 8 hours behind Manila.
// Exported so the New Trial form can use it as the default start date.
export function getLocalDate() {
  const now = new Date()
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

/* ===== Queries ===== */

/**
 * Load every trial along with its symptoms.
 * Returns: an array of trials, newest start date first, each shaped by toTrial().
 * Throws: an Error if Supabase returns one.
 */
export async function fetchTrials() {
  const { data, error } = await supabase
    // Step 1: read from the "trials" table.
    .from('trials')
    // '*' means "every column of trials".
    // 'symptoms(*)' means "and every column of each related symptom".
    // Supabase knows they're related because symptoms.trial_id
    // references trials.id (the foreign key from our SQL).
    // Result: each trial comes back with a "symptoms" array inside it,
    // so we don't need a second request for symptoms.
    .select('*, symptoms(*)')
    // Step 2: newest trial first. ascending: false = biggest date first.
    .order('start_date', { ascending: false })

  // Step 3: Supabase doesn't throw on its own. It hands back an "error"
  // object instead, so we check it and throw ourselves. That way App.jsx
  // can catch it with try/catch and show a message.
  if (error) throw error

  // Step 4: "data" is an array of raw database rows.
  // .map(toTrial) runs toTrial on each row, giving us the shape the pages use.
  return data.map(toTrial)
}

/**
 * Start a new food trial.
 * input: { foodName, startDate } (startDate is 'YYYY-MM-DD')
 * Returns: the saved trial, shaped by toTrial() (with an empty symptoms array).
 * Throws: an Error if Supabase returns one.
 */
export async function createTrial({ foodName, startDate }) {
  const { data, error } = await supabase
    .from('trials')
    // Step 1: column names, not app names. We leave out:
    //  - id and created_at: the database makes those
    //  - status: the table's default is 'active', which is what a new trial is
    .insert({
      food_name: foodName,
      start_date: startDate,
    })
    // Step 2: send the saved row back as one object (we need its new id)
    .select()
    .single()

  // Step 3: same pattern as the others
  if (error) throw error

  // Step 4: toTrial turns the missing symptoms into an empty array
  return toTrial(data)
}

/**
 * Save a new symptom for a trial.
 * symptom: { severity, notes } (exactly what TrialTracker sends)
 * Returns: the saved symptom, shaped by toSymptom(), including its new id.
 * Throws: an Error if Supabase returns one.
 */
export async function addSymptom(trialId, symptom) {
  const { data, error } = await supabase
    .from('symptoms')
    // Step 1: the keys here must match the COLUMN names in the table
    // (snake_case), not the names the app uses.
    // We don't send id or created_at: the database fills those in itself.
    .insert({
      trial_id: trialId,
      symptom_date: getLocalDate(),
      severity: symptom.severity,
      notes: symptom.notes,
    })
    // Step 2: by default an insert returns nothing. .select() says
    // "send me back the row you just saved", and .single() says
    // "it's exactly one row, so give me an object, not an array".
    // We need the saved row because it contains the new id the database made.
    .select()
    .single()

  // Step 3: same pattern as fetchTrials.
  if (error) throw error

  // Step 4: convert the saved row into the app's shape.
  return toSymptom(data)
}

/**
 * Set a trial's verdict.
 * status: 'active' | 'safe' | 'unsafe'
 * Returns: { status, completedAt } as saved.
 * Throws: an Error if Supabase returns one.
 */
export async function updateTrialStatus(trialId, status) {
  // Giving a verdict records when; going back to 'active' clears it
  const completedAt = status === 'active' ? null : new Date().toISOString()

  const { data, error } = await supabase
    .from('trials')
    // Step 1a: only the columns we list get changed. Everything else
    // (food_name, start_date...) stays the same.
    .update({ status, completed_at: completedAt })
    // Step 1b: .eq('id', trialId) means "WHERE id = trialId".
    // This line is what stops the update from changing EVERY trial.
    .eq('id', trialId)
    // Ask for the updated row back so we can check something actually changed.
    .select()

  // Step 2: same pattern as before.
  if (error) throw error

  // Extra check: if Row Level Security blocks an update, Supabase does NOT
  // return an error. It just updates 0 rows and says nothing. Checking that
  // we got a row back turns that silent failure into a visible one.
  if (data.length === 0) {
    throw new Error(
      'Trial was not updated. It may not exist, or access was denied.',
    )
  }

  return { status: data[0].status, completedAt: data[0].completed_at }
}
