import api from '../services/api'

export async function getJockeyProfile(userId) {
  const res = await api.get(`/api/jockey-profiles/${userId}`)
  return res.data
}

export async function updateJockeyProfile(userId, payload) {
  const res = await api.put(`/api/jockey-profiles/${userId}`, payload)
  return res.data
}

// GET /api/leaderboards/career?role= — ranked by Prize Points (source of truth: PrizePointTransaction).
export async function getCareerLeaderboard(role) {
  const res = await api.get('/api/leaderboards/career', { params: role ? { role } : {} })
  return Array.isArray(res.data) ? res.data : []
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

// GET /api/entries — not role-scoped for JOCKEY on BE, so callers must filter by jockeyId client-side.
export async function getEntries() {
  const res = await api.get('/api/entries')
  return Array.isArray(res.data) ? res.data : []
}

// Standings has HorseName/JockeyName embedded — used together with getRaceResults() to
// build a full-field final-results view for a Finished race.
export async function getRaceStandings(raceId) {
  const res = await api.get(`/api/races/${raceId}/standings`)
  return Array.isArray(res.data) ? res.data : []
}

// GET /api/race-results — rows only exist for races that have been Published (Finished).
export async function getRaceResults() {
  const res = await api.get('/api/race-results')
  return Array.isArray(res.data) ? res.data : []
}
