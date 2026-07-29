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

// NOTE: `getSpectatorBettingLeaderboard` (GET /api/leaderboards/spectators) đã gỡ 2026-07-29
// cùng trang `LeaderboardPage` của Spectator. Endpoint BE vẫn còn nhưng không ai gọi.

// ─── Cược race-level (Flow 7) ───────────────────────────────────────────────
// Spectator cược 1 Entry về 1st của cả Race.

// Mỗi entry trả về ĐÚNG MỘT giá: `odds` — máy tính từ lịch sử thắng lúc đóng đăng ký rồi đứng
// yên, cũng chính là giá sẽ khóa vào lệnh cược ⇒ Est. Payout = betAmount × odds, nhân thẳng ở
// client, không cần hỏi lại server theo số tiền.
// Cửa cược suy từ `raceStatus === 'Scheduled' && oddsComputedAt != null` — response KHÔNG có
// field `isBettingOpen`, và cũng không còn `oddsPublishedAt`/`bettingLockedAt` (đã bỏ hai bước
// Publish Odds / Lock Betting).
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

// ─── Users ────────────────────────────────────────────────────────────────────

// NOTE: `getAllUsers` (GET /api/users?pageSize=1000) đã gỡ. Chỗ duy nhất từng dùng nó là
// `LeaderboardPage` — chỉ để tra tên theo `spectatorId` — và trang đó nay cũng đã bị xóa.
// Kéo cả bảng user về phía Spectator là thừa và lộ email/SĐT của mọi người:
// `GET /api/users` chỉ có class-level `[Authorize]`, không khóa role.
// (Bản thân endpoint đó vẫn mở cho mọi role — vấn đề BE riêng, xem T-26 trong .claude/TASKS.md.)
