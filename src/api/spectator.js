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

// Bảng xếp hạng cược — CHỈ số liệu tổng hợp mỗi khán giả (rank, tên, số lệnh, thắng,
// win rate, tổng đặt, tổng thắng). Không có lệnh cược lẻ nào trong response.
// Trước đây trang Leaderboard tải cả `GET /api/predictions` về rồi tự gom; BE nay giới hạn
// endpoint đó về "chỉ cược của mình" nên phải dùng nguồn tổng hợp này.
export async function getSpectatorBettingLeaderboard() {
  const res = await api.get('/api/leaderboards/spectators')
  return Array.isArray(res.data) ? res.data : []
}

// ─── Cược race-level (Flow 7) ───────────────────────────────────────────────
// Spectator cược 1 Entry về 1st của cả Race; cửa mở khi race Scheduled và odds đã khóa.

// Mỗi entry trả về ĐÚNG MỘT giá: `odds` = odds công bố Admin đã duyệt, cũng chính là giá sẽ
// khóa vào lệnh cược ⇒ Est. Payout = betAmount × odds, không cần hỏi lại server theo số tiền.
// (Trước 2026-07-28 odds động theo pool: bảng hiện 4.00x nhưng lệnh khóa 2.00x — xem
// `currentOdds`/`effectiveOdds` cũ. Cả hai field đó KHÔNG còn tồn tại.)
// Response cũng mang `oddsPublishedAt` / `bettingLockedAt` / `isBettingOpen` để biết cửa cược
// đang mở hay đã đóng.
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

// NOTE: `getAllUsers` (GET /api/users?pageSize=1000) đã gỡ. Chỗ duy nhất dùng nó là
// `LeaderboardPage` — chỉ để tra tên theo `spectatorId` — nay tên đã đi kèm trong
// `GET /api/leaderboards/spectators`. Kéo cả bảng user về phía Spectator là thừa và lộ
// email/SĐT của mọi người: `GET /api/users` chỉ có class-level `[Authorize]`, không khóa role.
// (Bản thân endpoint đó vẫn mở cho mọi role — vấn đề BE riêng, xem T-26 trong .claude/TASKS.md.)
