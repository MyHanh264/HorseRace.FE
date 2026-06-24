import api from '../services/api'

// ─── Races ──────────────────────────────────────────────────────────────────

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
 * Lấy dữ liệu LEG hiện tại cho referee đang đăng nhập.
 * Response: { raceId, legIndex, legNumber, entries, mySubmittedData,
 *             opponentSubmitted, bothSubmitted, legStatus }
 */
export async function getRefereeLegView(raceId, legIndex) {
  const res = await api.get(`/api/races/${raceId}/legs/${legIndex}/referee-view`)
  return res.data
}

/**
 * PUT /api/races/{raceId}/legs/{legIndex}/draft
 * Lưu nháp kết quả leg (chưa submit).
 * payload: { entries: [{ entryId, position }] }
 * position: 1,2,3,... | -1 (DNF) | -2 (DQ)
 */
export async function saveLegDraft(raceId, legIndex, entries) {
  const res = await api.put(`/api/races/${raceId}/legs/${legIndex}/draft`, { entries })
  return res.data
}

/**
 * POST /api/races/{raceId}/legs/{legIndex}/submit
 * Submit kết quả leg cuối cùng.
 * payload: { entries: [{ entryId, position }] }
 * Trả về: { status: 'Matched'|'Conflicted', legIndex, legNumber, results, ... }
 */
export async function submitLegResult(raceId, legIndex, entries) {
  const res = await api.post(`/api/races/${raceId}/legs/${legIndex}/submit`, { entries })
  return res.data
}

/**
 * GET /api/races/{raceId}/execution
 * Lấy trạng thái execution đầy đủ (mọi user đều xem được).
 */
export async function getRaceExecutionStatus(raceId) {
  const res = await api.get(`/api/races/${raceId}/execution`)
  return res.data
}

/**
 * GET /api/races/{raceId}/standings
 * Lấy bảng điểm live của race.
 */
export async function getRaceStandings(raceId) {
  const res = await api.get(`/api/races/${raceId}/standings`)
  return res.data
}

// ─── Legacy alias (giữ tương thích ngược) ───────────────────────────────────

/**
 * @deprecated Dùng submitLegResult(raceId, legIndex, entries) thay thế.
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

export async function reportViolation(payload) {
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
