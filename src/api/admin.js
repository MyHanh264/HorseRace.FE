import api from '../services/api'

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

// ===== HORSES =====
export async function getAllHorse({ page = 1, pageSize = 10, search = "", sort = "createdAt", sortDirection = "desc" } = {}) {
  const params = { page, pageSize, search, sort, sortDirection }
  const res = await api.get('/api/admin/horses', { params })
  return res.data
}
export async function getHorseById(id){
  const res = await api.get(`/api/admin/horses/${id}`)
  return res.data
}
export async function approveHorse(id){
  const res = await api.post(`/api/admin/horses/${id}/approve`)
  return res.data
}
export async function rejectHorse(id, reason){
  const res = await api.post(`/api/admin/horses/${id}/reject`, { reason: reason || null })
  return res.data
}
export async function deleteHorse(id){
  const res = await api.delete(`/api/admin/horses/${id}`)
  return res.data
}
export async function updateHorse(id, data){
  const res = await api.put(`/api/admin/horses/${id}`, data)
  return res.data
}
export async function createHorse(data){
  const res = await api.post(`/api/admin/horses`, data)
  return res.data
}

// ===== TOURNAMENTS =====
export async function getAllTournaments({ page = 1, pageSize = 10, search = "", sort = "name", sortDirection = "asc" } = {}) {
  const params = { page, pageSize, search, sort, sortDirection }
  const res = await api.get('/api/admin/tournaments', { params })
  return res.data
}
export async function getTournamentById(id){
  const res = await api.get(`/api/admin/tournaments/${id}`)
  return res.data
}
export async function createTournament(data){
  const res = await api.post('/api/admin/tournaments', data)
  return res.data
}
export async function updateTournament(id, data){
  const res = await api.put(`/api/admin/tournaments/${id}`, data)
  return res.data
}
export async function deleteTournament(id){
  const res = await api.delete(`/api/admin/tournaments/${id}`)
  return res.data
}
export async function approveTournament(id){
  const res = await api.post(`/api/admin/tournaments/${id}/approve`)
  return res.data
}
export async function rejectTournament(id, reason){
  const res = await api.post(`/api/admin/tournaments/${id}/reject`, { reason: reason || null })
  return res.data
}

// ===== RACES =====
export async function getAllRaces({ page = 1, pageSize = 10, search = "", sort = "raceDate", sortDirection = "desc" } = {}) {
  const params = { page, pageSize, search, sort, sortDirection }
  const res = await api.get('/api/admin/races', { params })
  return res.data
}
export async function getRaceById(id){
  const res = await api.get(`/api/admin/races/${id}`)
  return res.data
}
export async function createRace(data){
  const res = await api.post('/api/admin/races', data)
  return res.data
}
export async function updateRace(id, data){
  const res = await api.put(`/api/admin/races/${id}`, data)
  return res.data
}
export async function deleteRace(id){
  const res = await api.delete(`/api/admin/races/${id}`)
  return res.data
}
export async function approveRace(id){
  const res = await api.post(`/api/admin/races/${id}/approve`)
  return res.data
}
export async function rejectRace(id, reason){
  const res = await api.post(`/api/admin/races/${id}/reject`, { reason: reason || null })
  return res.data
}
export async function startRace(id){
  const res = await api.post(`/api/admin/races/${id}/start`)
  return res.data
}
export async function finishRace(id){
  const res = await api.post(`/api/admin/races/${id}/finish`)
  return res.data
}
