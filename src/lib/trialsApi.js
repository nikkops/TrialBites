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

// symptoms row -> { id, date, severity, notes }
function toSymptom(row) {
  return {
    id: row.id,
    date: row.symptom_date,
    severity: row.severity,
    notes: row.notes,
  }
}

// trials row (with its symptoms nested inside) -> { id, foodName, startDate, status, symptoms }
function toTrial(row) {
  return {
    id: row.id,
    foodName: row.food_name,
    startDate: row.start_date,
    status: row.status,
    // Oldest first, so the newest symptom is last (the Dashboard relies on that)
    symptoms: (row.symptoms ?? [])
      .map(toSymptom)
      .sort((a, b) => a.date.localeCompare(b.date)),
  }
}

// Today's date in YOUR timezone as 'YYYY-MM-DD'.
// The database's current_date uses UTC, which is 8 hours behind Manila.
function getLocalDate() {
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
  // TODO 1: select from the "trials" table, including each trial's related
  //         symptoms in the same request (look up "nested select" / "foreign
  //         table select" in the Supabase docs).
  // TODO 2: order the trials by start_date, newest first.
  // TODO 3: if Supabase returns an error, throw it.
  // TODO 4: return the rows converted with toTrial().
  throw new Error('fetchTrials() is not written yet')
}

/**
 * Save a new symptom for a trial.
 * symptom: { severity, notes } (exactly what TrialTracker sends)
 * Returns: the saved symptom, shaped by toSymptom(), including its new id.
 * Throws: an Error if Supabase returns one.
 */
export async function addSymptom(trialId, symptom) {
  // TODO 1: insert one row into "symptoms" with trial_id, severity, notes,
  //         and symptom_date set to getLocalDate().
  // TODO 2: ask Supabase to send the inserted row back (an insert returns
  //         nothing unless you ask for it).
  // TODO 3: if Supabase returns an error, throw it.
  // TODO 4: return the row converted with toSymptom().
  void trialId
  void symptom
  throw new Error('addSymptom() is not written yet')
}

/**
 * Set a trial's verdict.
 * status: 'active' | 'safe' | 'unsafe'
 * Returns: nothing.
 * Throws: an Error if Supabase returns one.
 */
export async function updateTrialStatus(trialId, status) {
  // TODO 1: update the "status" column in "trials"
  //         ONLY for the row whose id equals trialId.
  //         (Without that filter, the update would hit every row.)
  // TODO 2: if Supabase returns an error, throw it.
  void trialId
  void status
  throw new Error('updateTrialStatus() is not written yet')
}