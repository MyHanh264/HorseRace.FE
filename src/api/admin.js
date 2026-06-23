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

export async function approveHorse(id) {
  const res = await api.post(`/api/admin/horses/${id}/approve`)
  return res.data
}

export async function rejectHorse(id, reason) {
  const res = await api.post(`/api/admin/horses/${id}/reject`, { reason: reason || null })
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

export async function startRace(id) {
  const res = await api.post(`/api/admin/races/${id}/start`)
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
