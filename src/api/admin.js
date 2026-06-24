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

// --- Horse moderation (Flow 1) ---

export async function getHorsesForAdmin(status) {
  const res = await api.get('/api/horses', { params: status ? { status } : undefined })
  return res.data
}

export async function approveHorse(horseId) {
  const res = await api.post(`/api/horses/${horseId}/approve`)
  return res.data
}

export async function rejectHorse(horseId, reason) {
  const res = await api.post(`/api/horses/${horseId}/reject`, { reason })
  return res.data
}

export async function revokeHorse(horseId, reason) {
  const res = await api.post(`/api/horses/${horseId}/revoke`, { reason: reason || null })
  return res.data
}
