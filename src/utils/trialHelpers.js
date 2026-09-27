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

// Which trial day it is today
export function getTrialDay(startDate) {
  const today = new Date()
  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')
  return getDayNumber(startDate, todayString)
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

// Trial status -> badge text + color
export function getStatusBadge(status) {
  if (status === 'safe') return { label: 'Safe', tone: 'success' }
  if (status === 'unsafe') return { label: 'Unsafe', tone: 'danger' }
  return { label: 'Active', tone: 'warning' }
}
