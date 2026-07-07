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

export async function getAllUser({ page = 1, pageSize = 10, search = "", sort = "createdAt", sortDirection = "desc" } = {}) {
  const params = { page, pageSize, search, sort, sortDirection }
  const res = await api.get('/api/admin/users', { params })
  return res.data
}

export async function getUserById(id) {
  const res = await api.get(`/api/admin/users/${id}`)
  return res.data
}

export async function deleteUser(id) {
  const res = await api.delete(`/api/admin/users/${id}`)
  return res.data
}

export async function updateUser(id, data) {
  const res = await api.put(`/api/admin/users/${id}`, data)
  return res.data
}

export async function createUser(data) {
  const res = await api.post('/api/admin/users', data)
  return res.data
}

export async function getAllInvalidUser({ page = 1, pageSize = 10, search = "", sort = "createdAt", sortDirection = "desc" } = {}) {
  const params = { page, pageSize, search, sort, sortDirection }
  const res = await api.get('/api/admin/users/invalid', { params })
  return res.data
}

export async function getInvalidUserById(id) {
  const res = await api.get(`/api/admin/users/invalid/${id}`)
  return res.data
}

export async function approveInvalidUser(id) {
  const res = await api.post(`/api/admin/users/invalid/${id}/approve`)
  return res.data
}

export async function rejectInvalidUser(id, reason) {
  const res = await api.post(`/api/admin/users/invalid/${id}/reject`, { reason: reason || null })
  return res.data
}

// ─── Horses ───────────────────────────────────────────────────────────────────

export async function getAllHorse({ page = 1, pageSize = 10, search = "", sort = "createdAt", sortDirection = "desc" } = {}) {
  const params = { page, pageSize, search, sort, sortDirection }
  const res = await api.get('/api/admin/horses', { params })
  return res.data
}

export async function getHorseById(id) {
  const res = await api.get(`/api/admin/horses/${id}`)
  return res.data
}

export async function deleteHorse(id) {
  const res = await api.delete(`/api/admin/horses/${id}`)
  return res.data
}

export async function updateHorse(id, data) {
  const res = await api.put(`/api/admin/horses/${id}`, data)
  return res.data
}

export async function createHorse(data) {
  const res = await api.post('/api/admin/horses', data)
  return res.data
}

// ─── Tournaments ────────────────────────────────────────────────────────────────

export async function getAllTournaments({ page = 1, pageSize = 10, search = "", sort = "name", sortDirection = "asc" } = {}) {
  const params = { page, pageSize, search, sort, sortDirection }
  const res = await api.get('/api/admin/tournaments', { params })
  return res.data
}

export async function getTournamentById(id) {
  const res = await api.get(`/api/admin/tournaments/${id}`)
  return res.data
}

export async function createTournament(data) {
  const res = await api.post('/api/admin/tournaments', data)
  return res.data
}

export async function updateTournament(id, data) {
  const res = await api.put(`/api/admin/tournaments/${id}`, data)
  return res.data
}

export async function deleteTournament(id) {
  const res = await api.delete(`/api/admin/tournaments/${id}`)
  return res.data
}

export async function approveTournament(id) {
  const res = await api.post(`/api/admin/tournaments/${id}/approve`)
  return res.data
}

export async function rejectTournament(id, reason) {
  const res = await api.post(`/api/admin/tournaments/${id}/reject`, { reason: reason || null })
  return res.data
}

// ─── Races ────────────────────────────────────────────────────────────────────

export async function getAllRaces({ page = 1, pageSize = 10, search = "", sort = "raceDate", sortDirection = "desc" } = {}) {
  const params = { page, pageSize, search, sort, sortDirection }
  const res = await api.get('/api/admin/races', { params })
  return res.data
}

export async function getRaceById(id) {
  const res = await api.get(`/api/admin/races/${id}`)
  return res.data
}

export async function createRace(data) {
  const res = await api.post('/api/admin/races', data)
  return res.data
}

export async function updateRace(id, data) {
  const res = await api.put(`/api/admin/races/${id}`, data)
  return res.data
}

export async function deleteRace(id) {
  const res = await api.delete(`/api/admin/races/${id}`)
  return res.data
}

export async function approveRace(id) {
  const res = await api.post(`/api/admin/races/${id}/approve`)
  return res.data
}

export async function rejectRace(id, reason) {
  const res = await api.post(`/api/admin/races/${id}/reject`, { reason: reason || null })
  return res.data
}

export async function finishRace(id) {
  const res = await api.post(`/api/admin/races/${id}/finish`)
  return res.data
}

// ─── Discrepancies ─────────────────────────────────────────────────────────────

export async function getAllDiscrepancies({ page = 1, pageSize = 10, search = "", sort = "createdAt", sortDirection = "desc", status = "" } = {}) {
  const params = { page, pageSize, search, sort, sortDirection }
  if (status) params.status = status
  const res = await api.get('/api/admin/discrepancies', { params })
  return res.data
}

export async function getDiscrepancyById(id) {
  const res = await api.get(`/api/admin/discrepancies/${id}`)
  return res.data
}

export async function createDiscrepancy(data) {
  const res = await api.post('/api/admin/discrepancies', data)
  return res.data
}

export async function resolveDiscrepancy(id, resolution) {
  const res = await api.post(`/api/admin/discrepancies/${id}/resolve`, resolution)
  return res.data
}

export async function deleteDiscrepancy(id) {
  const res = await api.delete(`/api/admin/discrepancies/${id}`)
  return res.data
}

// ─── Violations ────────────────────────────────────────────────────────────────

export async function getAllViolations({ page = 1, pageSize = 10, search = "", sort = "createdAt", sortDirection = "desc" } = {}) {
  const params = { page, pageSize, search, sort, sortDirection }
  const res = await api.get('/api/admin/violations', { params })
  return res.data
}

export async function getViolationById(id) {
  const res = await api.get(`/api/admin/violations/${id}`)
  return res.data
}

export async function createViolation(data) {
  const res = await api.post('/api/admin/violations', data)
  return res.data
}

export async function updateViolation(id, data) {
  const res = await api.put(`/api/admin/violations/${id}`, data)
  return res.data
}

export async function deleteViolation(id) {
  const res = await api.delete(`/api/admin/violations/${id}`)
  return res.data
}

// ─── Point Management ────────────────────────────────────────────────────────

export async function getJockeyLeaderboard({ page = 1, pageSize = 20, sort = "totalPoints", sortDirection = "desc" } = {}) {
  const params = { page, pageSize, sort, sortDirection }
  const res = await api.get('/api/admin/leaderboard', { params })
  return res.data
}

export async function getPointAdjustmentHistory({ page = 1, pageSize = 20, targetType = "", targetId = "" } = {}) {
  const params = { page, pageSize }
  if (targetType) params.targetType = targetType
  if (targetId) params.targetId = targetId
  const res = await api.get('/api/admin/points/history', { params })
  return res.data
}

export async function adjustPoints(targetType, targetId, points, reason) {
  const res = await api.post('/api/admin/points/adjust', { targetType, targetId, points, reason })
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

export async function getEntries() {
  const res = await api.get('/api/entries')
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

export async function publishRace(raceId) {
  const res = await api.post(`/api/races/${raceId}/publish`)
  return res.data
}

export async function unpublishRace(raceId) {
  const res = await api.post(`/api/races/${raceId}/unpublish`)
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