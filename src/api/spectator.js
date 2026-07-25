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

// The list endpoint above only returns {predictionId, raceId, spectatorId, betAmount, status} —
// no FirstEntryId/OddsLocked1. Fetch the detail endpoint per-prediction to get those.
export async function getPredictionDetail(predictionId) {
  const res = await api.get(`/api/predictions/${predictionId}`)
  return res.data
}

// ─── Cược race-level (Flow 7) ───────────────────────────────────────────────
// Spectator cược 1 Entry về 1st của cả Race; cửa mở khi race Scheduled và odds đã khóa.

export async function getRaceOdds(raceId) {
  const res = await api.get(`/api/predictions/races/${raceId}/odds`)
  return res.data
}

// Body { EntryId, BetAmount } → BE bind vào PredictionRequest.EntryId.
// Lưu ý: BE bind case-insensitive về CHỮ HOA/THƯỜNG (entryId ≈ EntryId),
// KHÔNG phải đồng nghĩa tên field — gửi FirstEntryId sẽ bind ra 0.
export async function placeRacePrediction(raceId, payload) {
  const res = await api.post(`/api/predictions/races/${raceId}`, payload)
  return res.data
}

export async function cancelPrediction(predictionId) {
  const res = await api.delete(`/api/predictions/${predictionId}/cancel`)
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

// Snapshot live (legs: blind status + timestamps cho replay).
export async function getRaceLive(raceId) {
  const res = await api.get(`/api/races/${raceId}/live`)
  return res.data
}

// Standings has HorseName/JockeyName embedded (not owner-scoped) — used together with
// getRaceResults() to build a full-field final-results view for a Finished race.
export async function getRaceStandings(raceId) {
  const res = await api.get(`/api/races/${raceId}/standings`)
  return Array.isArray(res.data) ? res.data : []
}

// GET /api/race-results — rows only exist for races that have been Published (Finished).
export async function getRaceResults() {
  const res = await api.get('/api/race-results')
  return Array.isArray(res.data) ? res.data : []
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

// GET /api/users returns a paged object ({items, total, page, pageSize}, default pageSize=10),
// not a flat array — request a large page so this "get everyone" helper actually gets everyone.
export async function getAllUsers() {
  const res = await api.get('/api/users', { params: { pageSize: 1000 } })
  return Array.isArray(res.data?.items) ? res.data.items : []
}
