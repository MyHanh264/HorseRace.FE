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


//Lấy danh sách ngựa đang chờ duyệt

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
  const res = await api.post(`/api/admin/horses/${horseId}/reject`, { reason: reason || null })
  return res.data
}

// Thu hồi ngựa đã duyệt
export async function revokeHorse(horseId, reason = "") {
  const res = await api.post(`/api/admin/horses/${horseId}/revoke`, { reason: reason || null })
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