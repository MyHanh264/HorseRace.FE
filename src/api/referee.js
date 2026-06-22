import api from '../services/api'

export async function getAllRaces() {
  const res = await api.get('/api/races')
  return Array.isArray(res.data) ? res.data : []
}

export async function getRaceDetail(id) {
  const res = await api.get(`/api/races/${id}`)
  return res.data
}

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

export async function startRace(raceId) {
  const res = await api.post(`/api/races/${raceId}/start`)
  return res.data
}

// payload: { raceId, legNumber, results: [{ entryId, finishPosition }] }
// finishPosition: number (1,2,3...) or null for DNF
export async function submitLegResult(payload) {
  const res = await api.post('/api/race-results', payload)
  return res.data
}

export async function getViolations() {
  const res = await api.get('/api/violations')
  return Array.isArray(res.data) ? res.data : []
}

// payload: { raceId, entryId, violationType, description }
export async function reportViolation(payload) {
  const res = await api.post('/api/violations', payload)
  return res.data
}
