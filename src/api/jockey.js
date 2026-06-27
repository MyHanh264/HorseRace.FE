import api from '../services/api'

export async function getJockeyProfile(userId) {
  const res = await api.get(`/api/jockey-profiles/${userId}`)
  return res.data
}

export async function updateJockeyProfile(userId, payload) {
  const res = await api.put(`/api/jockey-profiles/${userId}`, payload)
  return res.data
}

export async function getJockeyProfiles() {
  const res = await api.get('/api/jockey-profiles')
  return res.data
}

export async function getJockeyInvitations() {
  const res = await api.get('/api/jockey-invitations')
  return res.data
}

export async function getJockeyInvitationById(invitationId) {
  const res = await api.get(`/api/jockey-invitations/${invitationId}`)
  return res.data
}

export async function createJockeyInvitation(payload) {
  const res = await api.post('/api/jockey-invitations', payload)
  return res.data
}

export async function updateJockeyInvitation(invitationId, status, responseReason = null) {
  const res = await api.put(`/api/jockey-invitations/${invitationId}`, {
    invitationId,
    status,
    responseReason,
  })
  return res.data
}

export async function deleteJockeyInvitation(invitationId) {
  const res = await api.delete(`/api/jockey-invitations/${invitationId}`)
  return res.data
}

export async function getRaces() {
  const res = await api.get('/api/races')
  return res.data
}
