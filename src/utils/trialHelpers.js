/* Shared helpers for trial dates, severity, and status badges */

// '2026-09-18' -> Date at local midnight (avoids timezone off-by-one)
export function parseDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// '2026-09-18' -> 'Sep 18'
export function formatDate(dateString) {
  return parseDate(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

// '2026-09-18' -> 'September 18, 2026'
export function formatLongDate(dateString) {
  return parseDate(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

// Which trial day a date falls on (the start date is Day 1)
export function getDayNumber(startDate, date) {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.round((parseDate(date) - parseDate(startDate)) / msPerDay) + 1
}

// A full timestamp ('2026-10-09T03:15:00Z') -> its date in YOUR timezone,
// as 'YYYY-MM-DD'. Timestamps are stored in UTC, so this converts first.
export function toLocalDateString(timestamp) {
  const date = new Date(timestamp)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

// A full timestamp -> '08:30 AM' in your timezone
export function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Which trial day it is today
export function getTrialDay(startDate) {
  return getDayNumber(startDate, toLocalDateString(new Date()))
}

// Severity levels for the tracker's picker. `value` is what gets saved,
// on the same 0-10 scale the sample data uses.
export const severityLevels = [
  { id: 'none', label: 'None', value: 0 },
  { id: 'mild', label: 'Mild', value: 2 },
  { id: 'moderate', label: 'Moderate', value: 5 },
  { id: 'severe', label: 'Severe', value: 8 },
]

// Severity number -> badge text + color
export function getSeverityBadge(severity) {
  if (severity >= 7) return { label: 'Severe Reaction', tone: 'danger' }
  if (severity >= 4) return { label: 'Moderate Reaction', tone: 'danger' }
  if (severity >= 1) return { label: 'Mild Reaction', tone: 'warning' }
  return { label: 'No Symptoms', tone: 'success' }
}

// Trial -> badge text + color.
// Finished trials show their verdict. Active trials get a finer status
// worked out from their entries (no extra database column needed):
//  - Baseline:     nothing logged yet
//  - Under Watch:  at least one mild-or-worse reaction
//  - No Reactions: entries logged, all of them "None"
export function getStatusBadge(trial) {
  if (trial.status === 'safe') return { label: 'Safe', tone: 'success' }
  if (trial.status === 'unsafe') return { label: 'Unsafe', tone: 'danger' }

  if (trial.symptoms.length === 0) return { label: 'Baseline', tone: 'info' }
  const hasReaction = trial.symptoms.some((symptom) => symptom.severity >= 1)
  if (hasReaction) return { label: 'Under Watch', tone: 'warning' }
  return { label: 'No Reactions', tone: 'success' }
}
