import api from '../services/api'

// ─── Wallet ───────────────────────────────────────────────────────────────────

export async function getMyWallet(userId) {
  const res = await api.get('/api/point-wallets')
  const wallets = Array.isArray(res.data) ? res.data : []
  return wallets.find(w => w.spectatorId === userId) ?? null
}

// ─── Predictions ──────────────────────────────────────────────────────────────

export async function getMyPredictions(userId) {
  const res = await api.get('/api/predictions')
  const all = Array.isArray(res.data) ? res.data : []
  return all.filter(p => p.spectatorId === userId)
}

export async function placePrediction(payload) {
  const res = await api.post('/api/predictions', payload)
  return res.data
}

export async function cancelPrediction(predictionId) {
  const res = await api.delete(`/api/predictions/${predictionId}`)
  return res.data
}

// ─── Races ────────────────────────────────────────────────────────────────────

export async function getAllRaces() {
  const res = await api.get('/api/races')
  return Array.isArray(res.data) ? res.data : []
}

export async function getRaceDetail(raceId) {
  const res = await api.get(`/api/races/${raceId}`)
  return res.data
}

// ─── Entries (contenders per race) ────────────────────────────────────────────

export async function getAllEntries() {
  const res = await api.get('/api/entries')
  return Array.isArray(res.data) ? res.data : []
}

export async function getAllHorses() {
  const res = await api.get('/api/horses')
  return Array.isArray(res.data) ? res.data : []
}

export async function getAllTournaments() {
  const res = await api.get('/api/tournaments')
  return Array.isArray(res.data) ? res.data : []
}

// ─── Wallet Transactions ──────────────────────────────────────────────────────

export async function getWalletTransactions() {
  const res = await api.get('/api/wallet-transactions')
  return Array.isArray(res.data) ? res.data : []
}

// ─── Users (for leaderboard names) ────────────────────────────────────────────

export async function getAllUsers() {
  const res = await api.get('/api/users')
  return Array.isArray(res.data) ? res.data : []
}
