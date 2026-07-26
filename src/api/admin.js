import api from '../services/api'

// ─── Role Mapping (from Backend /api/roles) ───────────────────────────────────
let roleCache = null
let rolePromise = null

// Fallback roleId when caller supplies an unknown roleCode.
// Keep in sync with backend Role seed (ADMIN = 5).
const FALLBACK_ROLE_ID = 5

export async function getAllRoles() {
  const res = await api.get('/api/roles')
  return res.data
}

export async function getRoleMap() {
  if (roleCache) return roleCache
  if (rolePromise) return rolePromise

  rolePromise = (async () => {
    try {
      const roles = await getAllRoles()
      // Normalize BE PascalCase ({ RoleId, Code, Name }) to camelCase
      // so the rest of the FE can use a single consistent shape.
      roleCache = (roles || []).map((r) => ({
        roleId: r.roleId ?? r.RoleId,
        code: r.code ?? r.Code,
        name: r.name ?? r.Name,
      }))
      return roleCache
    } catch {
      roleCache = []
      return []
    } finally {
      rolePromise = null
    }
  })()
  return rolePromise
}

export function clearRoleCache() {
  roleCache = null
}

export function getRoleIdByCode(code) {
  if (!roleCache) return null
  const role = roleCache.find((r) => r.code === code)
  return role?.roleId ?? null
}

export function getRoleCodeById(id) {
  if (!roleCache) return null
  const role = roleCache.find((r) => r.roleId === id)
  return role?.code ?? null
}

// ─── Users (Admin Management) ──────────────────────────────────────────────────
// NOTE: Backend uses /api/users for CRUD (ADMIN), /api/admin/users/pending for pending list

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

// Get all users — BE GET /api/users is paginated.
// Response shape: { items: [...], total, page, pageSize } (PagedUserListResponse).
// FE consumers that need a flat list (e.g. AdminRacesPage dropdown) should pass
// { page: 1, pageSize: 1000 } explicitly so the page size lives at the call site.
// Tabs in AdminUsersPage rely on this + client-side filtering for now
// (see AdminUsersPage plan — phương án B will move filter/search/pagination to BE).
export async function getAllUser({ page = 1, pageSize = 10, search = "", sort = "createdAt", sortDirection = "desc", role = "", status = "" } = {}) {
  const params = { page, pageSize, search, sort, sortDirection }
  if (role) params.role = role
  if (status) params.status = status
  const res = await api.get('/api/users', { params })
  return res.data
}

// Get users by status (filter client-side from getAllUser)
export async function getUsersByStatus(status, { page = 1, pageSize = 10, search = "" } = {}) {
  const params = { page, pageSize, search }
  if (status) params.status = status
  const res = await api.get('/api/users', { params })
  return res.data
}

export async function getUserById(id) {
  const res = await api.get(`/api/users/${id}`)
  return res.data
}

// DELETE /api/users/{id} (ADMIN only)
export async function deleteUser(id) {
  const res = await api.delete(`/api/users/${id}`)
  return res.data
}

// PUT /api/users/{id} (ADMIN can update any user)
// Backend expects: UserId, Email, FullName, PhoneNumber, AvatarUrl, RoleId, IsActive, LockedUntil, LicenseNumber, Weight, Bio, IsProfileComplete
export async function updateUser(id, data) {
  const roleMap = await getRoleMap()
  let roleId = data.roleId
  if (typeof data.roleCode === 'string' && roleMap.length > 0) {
    roleId = roleMap.find((r) => r.code === data.roleCode)?.roleId || data.roleId
  }
  if (!roleId) roleId = FALLBACK_ROLE_ID

  const payload = {
    UserId: id,
    Email: data.email,
    FullName: data.fullName,
    PhoneNumber: data.phoneNumber || null,
    AvatarUrl: data.avatarUrl || null,
    RoleId: roleId,
    IsActive: data.isActive !== undefined ? data.isActive : true,
    LockedUntil: data.lockedUntil || null,
    LicenseNumber: data.licenseNumber || null,
    Weight: data.weight || null,
    Bio: data.bio || null,
    IsProfileComplete: data.isProfileComplete !== undefined ? data.isProfileComplete : true,
  }
  const res = await api.put(`/api/users/${id}`, payload)
  return res.data
}

// POST /api/users (ADMIN only - create new user account)
// Backend expects: Email, PasswordHash, FullName, PhoneNumber, AvatarUrl, RoleId, LicenseNumber, Weight, Bio
export async function createUser(data) {
  const roleMap = await getRoleMap()
  let roleId = data.roleId
  const code = data.RoleCode ?? data.roleCode
  if (typeof code === 'string' && roleMap.length > 0) {
    const match = roleMap.find((r) => r.code === code)
    if (match) roleId = match.roleId
  }
  if (!roleId) roleId = FALLBACK_ROLE_ID

  // Payload mirrors Application.Usecases.Users.CreateUser.CreateUserCommand.
  // PascalCase fields bound by ASP.NET model binding; `Password` is hashed by
  // the handler via IPasswordHasher before persistence.
  const payload = {
    Email: data.Email ?? data.email,
    Password: data.Password ?? data.password,
    FullName: data.FullName ?? data.fullName,
    PhoneNumber: data.PhoneNumber ?? data.phoneNumber ?? null,
    AvatarUrl: data.AvatarUrl ?? data.avatarUrl ?? null,
    RoleId: roleId,
    LicenseNumber: data.LicenseNumber ?? data.licenseNumber ?? null,
    Weight: data.Weight ?? data.weight ?? null,
    Bio: data.Bio ?? data.bio ?? null,
  }
  const res = await api.post('/api/users', payload)
  return res.data
}

export async function getAllInvalidUser({ page = 1, pageSize = 10, search = "", sort = "createdAt", sortDirection = "desc" } = {}) {
  const params = { page, pageSize, search, sort, sortDirection }
  const res = await api.get('/api/admin/users/invalid', { params })
  return res.data
}

export async function getInvalidUserById(id) {
  const res = await api.get(`/api/admin/users/invalid/${id}`)
  return res.data
}

export async function approveInvalidUser(id) {
  const res = await api.post(`/api/admin/users/invalid/${id}/approve`)
  return res.data
}

export async function rejectInvalidUser(id, reason) {
  const res = await api.post(`/api/admin/users/invalid/${id}/reject`, { reason: reason || null })
  return res.data
}

// ─── User Lock/Unlock ────────────────────────────────────────────────────────
export async function lockUser(userId, reason) {
  const res = await api.post(`/api/admin/users/${userId}/lock`, { reason: reason || null })
  return res.data
}

export async function unlockUser(userId) {
  const res = await api.post(`/api/admin/users/${userId}/unlock`)
  return res.data
}

export async function getUserHistory(userId, { page = 1, pageSize = 20 } = {}) {
  const res = await api.get(`/api/admin/users/${userId}/history`, { params: { page, pageSize } })
  return res.data
}

// ─── Horses (Admin) ───────────────────────────────────────────────────────────
//
// Scope: Admin-side CRUD (approve/reject/revoke workflow, pending list).
// FE consumers (AdminHorsesPage) only need: getPendingHorses, approveHorse,
// rejectHorse, revokeHorse. Generic read endpoints live in
// `api/horseOwner.js` / `api/spectator.js` — do NOT add them back here.

export async function getPendingHorses() {
  const res = await api.get("/api/admin/horses/pending")
  return res.data
}

// Approve a horse
export async function approveHorse(horseId) {
  const res = await api.post(`/api/admin/horses/${horseId}/approve`)
  return res.data
}

// Reject a horse
export async function rejectHorse(horseId, reason) {
  // Backend requires a reason (cannot be null)
  const res = await api.post(`/api/admin/horses/${horseId}/reject`, { reason })
  return res.data
}

// Revoke an already-approved horse (only works on Approved → becomes Rejected)
export async function revokeHorse(horseId) {
  const res = await api.post(`/api/admin/horses/${horseId}/revoke`)
  return res.data
}

// ─── Tournaments ────────────────────────────────────────────────────────────────

export async function getAllTournaments({ page = 1, pageSize = 10, search = "", sort = "name", sortDirection = "asc" } = {}) {
  const params = { page, pageSize, search, sort, sortDirection }
  const res = await api.get('/api/tournaments', { params })
  return res.data
}

export async function getTournamentById(id) {
  const res = await api.get(`/api/tournaments/${id}`)
  return res.data
}

export async function updateTournament(id, payload) {
  const res = await api.put(`/api/tournaments/${id}`, payload)
  return res.data
}

export async function createTournament(payload) {
  const res = await api.post(`/api/tournaments`, payload)
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

export async function approveRace(id) {
  const res = await api.post(`/api/admin/races/${id}/approve`)
  return res.data
}

export async function rejectRace(id, reason) {
  const res = await api.post(`/api/admin/races/${id}/reject`, { reason: reason || null })
  return res.data
}

export async function finishRace(id) {
  const res = await api.post(`/api/admin/races/${id}/finish`)
  return res.data
}

// ─── Violations ────────────────────────────────────────────────────────────────

// GET /api/admin/violations?status=&page=&pageSize=
// status filter (FE → BE mapping in the GetAdminViolations handler):
//   "Pending"   → domain "Pending"
//   "Resolved"  → domain "Approved"   (UI: "Approved" tab)
//   "Dismissed" → domain "Rejected"  (UI: "Rejected" tab)
// Pass "" (empty) or undefined → BE returns all.
export async function getAllViolations({
  page = 1,
  pageSize = 15,
  status = "",
  search = "",
  sort = "createdAt",
  sortDirection = "desc",
} = {}) {
  const params = { page, pageSize, sort, sortDirection };
  if (status) params.status = status;
  if (search) params.search = search;
  const res = await api.get("/api/admin/violations", { params });
  return res.data;
}

// GET /api/violations — generic list (REFEREE/ADMIN), unpaginated, includes EntryId/LegNumber
// (unlike GET /api/admin/violations, which is paginated/admin-formatted and omits those fields).
// Used to cross-reference approved penalties to specific entries/legs for score-breakdown UI.
export async function getViolationsWithEntryDetail() {
  const res = await api.get("/api/violations");
  return Array.isArray(res.data) ? res.data : [];
}

// NOTE: update lives on the generic ViolationsController (`/api/violations/{id}`,
// [Authorize(Roles="REFEREE,ADMIN")]), NOT under /api/admin/violations — AdminController
// only exposes GET/approve/reject for violations, no PUT route. Calling the /api/admin/...
// path 404s.
export async function updateViolation(id, data) {
  const res = await api.put(`/api/violations/${id}`, data)
  return res.data
}

// Flow 6 — Admin approves a violation report & applies a penalty to standings.
// Penalty: "Warning" | "Demote" | "DQ" — REQUIRED to select before submitting.
//   - Warning: recorded only, does not change standings.
//   - Demote: FinishPosition += 1 in LegOfficialResult, recompute LegPoints.
//   - DQ: 0 points for the entry's entire leg (Race DQ → last place, 0 Prize on Publish).
// AdminNote: optional, not validated on BE.
export async function approveViolation(violationId, { penalty, adminNote } = {}) {
  if (!violationId) throw new Error("violationId is required");
  if (!penalty || !["Warning", "Demote", "DQ"].includes(penalty)) {
    throw new Error("penalty must be one of: Warning, Demote, DQ");
  }
  const res = await api.post(`/api/admin/violations/${violationId}/approve`, {
    Penalty: penalty,
    AdminNote: adminNote || null,
  });
  return res.data;
}

// Flow 6 — Admin rejects a violation report (reason is REQUIRED).
// Written to the Violation's AdminNote; does not change standings.
export async function rejectViolation(violationId, reason) {
  if (!violationId) throw new Error("violationId is required");
  if (!reason || !String(reason).trim()) {
    throw new Error("reason is required");
  }
  const res = await api.post(`/api/admin/violations/${violationId}/reject`, {
    Reason: String(reason).trim(),
  });
  return res.data;
}

// ─── Point Management ────────────────────────────────────────────────────────

// NOTE: `getJockeyLeaderboard` (GET /api/admin/leaderboard) và
// `getPointAdjustmentHistory` (GET /api/admin/points/history) đã bị gỡ — **hai route đó
// KHÔNG tồn tại trên BE**, gọi vào là 404 (AdminController chỉ có points/balances,
// points/transactions, points/adjust, points/{userId}, points/*-topup). Không page nào
// dùng chúng nên chưa ai thấy lỗi. Dùng endpoint thật thay thế:
//   - bảng xếp hạng  → `getCareerLeaderboard(role)` trong `api/jockey.js`
//                      (GET /api/leaderboards/career?role=JOCKEY)
//   - lịch sử điểm   → GET /api/admin/points/transactions
//                      (AdminPointManagementPage đang gọi thẳng, có search/type/paging)

// NOTE: `getAllHorses` / `getHorseDetail` were duplicates of public horse APIs
// in `api/horseOwner.js` / `api/spectator.js` and had no consumer inside
// `src/`. Removed — import from those modules instead.
//
// `getPendingHorses` / `approveHorse` / `rejectHorse` / `revokeHorse` are
// already defined above in the Admin Horses section — do not redeclare.



// ─── Entries ──────────────────────────────────────────────────────────────────

export async function getPendingEntries() {
  const res = await api.get('/api/admin/entries/pending')
  return res.data
}

export async function getEntries(raceId) {
  const res = await api.get('/api/entries', raceId ? { params: { raceId } } : undefined)
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

// ─── Race Registration ────────────────────────────────────────────────────────

export async function openRegistration(raceId) {
  const res = await api.post(`/api/races/${raceId}/open-registration`)
  return res.data
}

export async function closeRegistration(raceId) {
  const res = await api.post(`/api/races/${raceId}/close-registration`)
  return res.data
}

// ─── Race Execution ──────────────────────────────────────────────────────────

/**
 * POST /api/races/{raceId}/start
 * Admin starts the race → locks bets.
 */
export async function startRace(raceId, payload = {}) {
  const res = await api.post(`/api/races/${raceId}/start`, payload)
  return res.data
}

export async function publishRace(raceId) {
  const res = await api.post(`/api/races/${raceId}/publish`)
  return res.data
}

// `reason` is required client-side (see AdminRacesPage's UnpublishConfirmModal) for
// transparency/audit purposes. NOTE: as of 2026-07-13, UnpublishRaceResultCommand on BE
// does not yet accept or persist a reason — this is a pending BE change (see
// FE_REQUESTS_FOR_BE report). Sending it now is harmless (BE ignores unknown JSON
// fields) and means FE is ready the moment BE adds support.
export async function unpublishRace(raceId, reason) {
  const res = await api.post(`/api/races/${raceId}/unpublish`, { reason })
  return res.data
}

/**
 * GET /api/races/{raceId}/execution
 * Get full execution status (leg status, referee submissions).
 */
export async function getRaceExecutionStatus(raceId) {
  const res = await api.get(`/api/races/${raceId}/execution`)
  return res.data
}

/**
 * GET /api/races/{raceId}/pause
 * Get conflict info → side-by-side comparison.
 * ⚠️ ADMIN-only per spec — Referee must NOT call this, to preserve Blind Double-Entry.
 * Frontend must not import this function from referee files.
 */
export async function getRacePauseInfo(raceId) {
  const res = await api.get(`/api/races/${raceId}/pause`)
  return res.data
}

/**
 * POST /api/races/{raceId}/legs/{legIndex}/override
 * Admin resolves a discrepancy by overriding the result.
 * payload: { decisions: [{ entryId, officialPosition }], overrideReason }
 */
export async function resolveRaceConflict(raceId, legIndex, payload) {
  const res = await api.post(`/api/races/${raceId}/legs/${legIndex}/override`, payload)
  return res.data
}

/**
 * POST /api/races/{raceId}/resume
 * Admin resumes a Paused race.
 */
export async function resumeRace(raceId) {
  const res = await api.post(`/api/races/${raceId}/resume`)
  return res.data
}

/**
 * GET /api/legs/{raceId}/{legNumber} — leg detail, has AdminOverrideReason/ConfirmedAt
 * for legs resolved via Admin override. Used to show past-resolution history on the
 * Conflict Resolution page without needing the ReviewHistory/Audit Log entity (BE
 * hasn't added Leg to that yet).
 */
export async function getLegDetail(raceId, legNumber) {
  const res = await api.get(`/api/legs/${raceId}/${legNumber}`)
  return res.data
}

/**
 * GET /api/races/{raceId}/standings
 * Get the race's live standings.
 */
export async function getRaceStandings(raceId) {
  const res = await api.get(`/api/races/${raceId}/standings`)
  return res.data
}

/**
 * GET /api/race-results — official post-publish record (FinalPosition, IsRaceDQ),
 * unfiltered. Used together with getRaceStandings by RaceResultsModal.
 */
export async function getRaceResults() {
  const res = await api.get('/api/race-results')
  return Array.isArray(res.data) ? res.data : []
}

// ─── Review History (Audit Log) ────────────────────────────────────────────
// GET /api/admin/review-history?entity=&entityId=
// Records every time Admin Approves/Rejects a Horse|Entry|User (Reason, AdminName, CreatedAt).
// entity: "Horse" | "Entry" | "User" (empty = all).
export async function getReviewHistory({ entity = "", entityId = "" } = {}) {
  const params = {}
  if (entity) params.entity = entity
  if (entityId) params.entityId = entityId
  const res = await api.get('/api/admin/review-history', { params })
  return Array.isArray(res.data) ? res.data : []
}

// NOTE: Backward-compat aliases intentionally removed.
// - `getTournaments` / `getTournamentDetail` → consumers must import from
//   `api/spectator`, `api/horseOwner`, `api/jockey` directly.
// - `getAllRaces` / `getRaceById` never existed; their aliases were crashing
//   the module at load time. Use `getRaces` / `getRaceDetail` below.

// NOTE: `getUsers` removed — it was a duplicate of `getAllUser` that hardcoded
// `pageSize: 1000`. Call sites that need a flat user list (e.g. AdminRacesPage
// dropdown) should call `getAllUser({ page: 1, pageSize: 1000 })` explicitly
// so the page size lives at the call site, not inside the API layer.