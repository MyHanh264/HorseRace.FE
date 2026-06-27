import api from '../services/api'

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getPendingUsers() {
  const res = await api.get('/api/admin/users/pending')
  return res.data
}

export async function approveUser(userId) {
  const res = await api.post(`/api/admin/users/${userId}/approve`)
  return res.data
}

export async function rejectUser(userId, reason) {
  const res = await api.post(`/api/admin/users/${userId}/reject`, { reason: reason || null })
  return res.data
}

export async function getUsers() {
  const res = await api.get('/api/users')
  return res.data
}

// ─── Tournaments ──────────────────────────────────────────────────────────────

export async function getTournaments() {
  const res = await api.get('/api/tournaments')
  return res.data
}

export async function getTournamentDetail(id) {
  const res = await api.get(`/api/tournaments/${id}`)
  return res.data
}

export async function createTournament(payload) {
  const res = await api.post('/api/tournaments', payload)
  return res.data
}

export async function updateTournament(id, payload) {
  const res = await api.put(`/api/tournaments/${id}`, payload)
  return res.data
}

export async function deleteTournament(id) {
  const res = await api.delete(`/api/tournaments/${id}`)
  return res.data
}

// ─── Races ────────────────────────────────────────────────────────────────────

export async function getRaces() {
  const res = await api.get('/api/races')
  return res.data
}

export async function getRaceDetail(id) {
  const res = await api.get(`/api/races/${id}`)
  return res.data
}

export async function createRace(payload) {
  const res = await api.post('/api/races', payload)
  return res.data
}

export async function updateRace(id, payload) {
  const res = await api.put(`/api/races/${id}`, payload)
  return res.data
}

export async function deleteRace(id) {
  const res = await api.delete(`/api/races/${id}`)
  return res.data
}


// Lấy TẤT CẢ ngựa (dùng cho bảng quản lý - lọc theo tab ở FE)
// Lưu ý: Response chỉ trả { horseId, name, status, breed }, thiếu các field khác
export async function getAllHorses() {
  const res = await api.get("/api/admin/horses")
  return res.data
}

// Lấy chi tiết 1 ngựa (dùng khi cần đầy đủ fields: color, birthYear, ownerName, etc.)
export async function getHorseDetail(horseId) {
  const res = await api.get(`/api/horses/${horseId}`)
  return res.data
}

// Lấy danh sách ngựa đang chờ duyệt (legacy - dùng getAllHorses thay thế)
export async function getPendingHorses() {
  const res = await api.get("/api/admin/horses/pending")
  return res.data
}

// Duyệt ngựa
export async function approveHorse(horseId) {
  const res = await api.post(`/api/admin/horses/${horseId}/approve`)
  return res.data
}

//Từ chối ngựa
export async function rejectHorse(horseId, reason) {
  // Backend yêu cầu reason (không được null)
  const res = await api.post(`/api/admin/horses/${horseId}/reject`, { reason })
  return res.data
}

// Thu hồi ngựa đã duyệt (chỉ work trên Approved → chuyển thành Rejected)
export async function revokeHorse(horseId) {
  const res = await api.post(`/api/admin/horses/${horseId}/revoke`)
  return res.data
}

// ─── Entries ──────────────────────────────────────────────────────────────────

export async function getPendingEntries() {
  const res = await api.get('/api/admin/entries/pending')
  return res.data
}

export async function approveEntry(entryId) {
  const res = await api.post(`/api/admin/entries/${entryId}/approve`)
  return res.data
}

export async function rejectEntry(entryId, reason = null) {
  const res = await api.post(`/api/admin/entries/${entryId}/reject`, { reason: reason || null })
  return res.data
}

// ─── Race Registration ────────────────────────────────────────────────────────

export async function openRegistration(raceId) {
  const res = await api.post(`/api/races/${raceId}/open-registration`)
  return res.data
}

export async function closeRegistration(raceId) {
  const res = await api.post(`/api/races/${raceId}/close-registration`)
  return res.data
}

// ─── Race Execution ──────────────────────────────────────────────────────────

/**
 * POST /api/races/{raceId}/start
 * Admin bắt đầu race → khóa bets.
 */
export async function startRace(raceId, payload = {}) {
  const res = await api.post(`/api/races/${raceId}/start`, payload)
  return res.data
}

/**
 * GET /api/races/{raceId}/execution
 * Lấy trạng thái execution đầy đủ (leg status, referee submissions).
 */
export async function getRaceExecutionStatus(raceId) {
  const res = await api.get(`/api/races/${raceId}/execution`)
  return res.data
}

/**
 * GET /api/races/{raceId}/pause
 * Lấy thông tin conflict → side-by-side comparison.
 * ⚠️ ADMIN-only theo spec — Referee KHÔNG được gọi để giữ Blind Double-Entry.
 * Frontend không import hàm này từ các file referee.
 */
export async function getRacePauseInfo(raceId) {
  const res = await api.get(`/api/races/${raceId}/pause`)
  return res.data
}

/**
 * POST /api/races/{raceId}/legs/{legIndex}/override
 * Admin resolve discrepancy bằng cách override kết quả.
 * payload: { decisions: [{ entryId, officialPosition }], overrideReason }
 */
export async function resolveRaceConflict(raceId, legIndex, payload) {
  const res = await api.post(`/api/races/${raceId}/legs/${legIndex}/override`, payload)
  return res.data
}

/**
 * POST /api/races/{raceId}/resume
 * Admin resume race đang Paused.
 */
export async function resumeRace(raceId) {
  const res = await api.post(`/api/races/${raceId}/resume`)
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