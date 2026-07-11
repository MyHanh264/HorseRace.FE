import api from '../services/api'

// ─── Races ──────────────────────────────────────────────────────────────────

// ⚠️ getRacePauseInfo must NOT be used in the referee flow.
// The /api/races/{id}/pause endpoint exposes the other referee's position → violates Blind Double-Entry.
// Only Admin is allowed to view the side-by-side comparison.
// If a referee component accidentally imports this, check role === 'ADMIN' before calling.
// (Frontend mitigation — backend should tighten authorization to ADMIN-only.)

export async function getAllRaces() {
  const res = await api.get('/api/races')
  return Array.isArray(res.data) ? res.data : []
}

export async function getRaceDetail(id) {
  const res = await api.get(`/api/races/${id}`)
  return res.data
}

export async function startRace(raceId, payload = {}) {
  const res = await api.post(`/api/races/${raceId}/start`, payload)
  return res.data
}

// ─── Blind Double-Entry: Referee View ──────────────────────────────────────

/**
 * GET /api/races/{raceId}/legs/{legIndex}/referee-view
 * Get the current LEG data for the logged-in referee.
 * Response: { raceId, legIndex, legNumber, entries, mySubmittedData,
 *             opponentSubmitted, bothSubmitted, legStatus }
 */
export async function getRefereeLegView(raceId, legIndex) {
  const res = await api.get(`/api/races/${raceId}/legs/${legIndex}/referee-view`)
  return res.data
}

/**
 * PUT /api/races/{raceId}/legs/{legIndex}/draft
 * Save a draft leg result (not yet submitted).
 * payload: { entries: [{ entryId, position }] }
 * position: 1,2,3,... | -1 (DNF) | -2 (DQ)
 */
export async function saveLegDraft(raceId, legIndex, entries) {
  const res = await api.put(`/api/races/${raceId}/legs/${legIndex}/draft`, { entries })
  return res.data
}

/**
 * POST /api/races/{raceId}/legs/{legIndex}/submit
 * Submit the final leg result.
 * payload: { entries: [{ entryId, position }] }
 * Returns: { status: 'Matched'|'Conflicted', legIndex, legNumber, results, ... }
 */
export async function submitLegResult(raceId, legIndex, entries) {
  const res = await api.post(`/api/races/${raceId}/legs/${legIndex}/submit`, { entries })
  return res.data
}

/**
 * GET /api/races/{raceId}/execution
 * Get full execution status (visible to all users).
 */
export async function getRaceExecutionStatus(raceId) {
  const res = await api.get(`/api/races/${raceId}/execution`)
  return res.data
}

/**
 * GET /api/races/{raceId}/standings
 * Get the race's live standings.
 */
export async function getRaceStandings(raceId) {
  const res = await api.get(`/api/races/${raceId}/standings`)
  return res.data
}

// ─── Legacy alias (kept for backward compatibility) ─────────────────────────

/**
 * @deprecated Use submitLegResult(raceId, legIndex, entries) instead.
 * payload: { raceId, legNumber, results: [{ entryId, finishPosition }] }
 */
export async function submitLegResult_legacy(payload) {
  const res = await api.post('/api/race-results', payload)
  return res.data
}

// ─── Violations ─────────────────────────────────────────────────────────────

export async function getViolations() {
  const res = await api.get('/api/violations')
  return Array.isArray(res.data) ? res.data : []
}

// POST /api/violations — Referee files a violation report.
// Payload shape MUST match the CreateViolationCommand record on BE:
//   raceId, legNumber, entryId, reportedByRefereeId, violationType,
//   description, penalty, status, reviewedByAdminId, adminNote.
// Note: the controller will override `reportedByRefereeId` (from JWT) and `status`
// (always "Pending"), but the BE record NEEDS all non-null fields to bind.
// `penalty` defaults to "Warning" if not passed (admin will re-select when approving).
// `legNumber` <= 0 → BE auto-selects the current leg.
export async function reportViolation({
  raceId,
  legNumber = 0,
  entryId,
  reportedByRefereeId = 0,
  violationType,
  description = null,
  penalty = 'Warning',
  status = 'Pending',
  reviewedByAdminId = null,
  adminNote = null,
} = {}) {
  const payload = {
    RaceId:               Number(raceId),
    LegNumber:            Number(legNumber) || 0,
    EntryId:              Number(entryId),
    ReportedByRefereeId:  Number(reportedByRefereeId) || 0,
    ViolationType:        String(violationType ?? '').trim(),
    Description:          description ? String(description).trim() : null,
    Penalty:              String(penalty ?? 'Warning').trim(),
    Status:               String(status ?? 'Pending').trim(),
    ReviewedByAdminId:    reviewedByAdminId ?? null,
    AdminNote:            adminNote ?? null,
  }
  const res = await api.post('/api/violations', payload)
  return res.data
}

// ─── Reference Data ───────────────────────────────────────────────────────────

export async function getAllTournaments() {
  const res = await api.get('/api/tournaments')
  return Array.isArray(res.data) ? res.data : []
}

export async function getAllUsers() {
  const res = await api.get('/api/users')
  return Array.isArray(res.data) ? res.data : []
}

export async function getAllEntries() {
  const res = await api.get('/api/entries')
  return Array.isArray(res.data) ? res.data : []
}

export async function getAllHorses() {
  const res = await api.get('/api/horses')
  return Array.isArray(res.data) ? res.data : []
}
