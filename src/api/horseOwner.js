import api from "../services/api";

export async function getRaceResults() {
  const res = await api.get("/api/race-results");
  return Array.isArray(res.data) ? res.data : [];
}

// GET /api/leaderboards/career?role=HORSE_OWNER — same endpoint jockey.js's
// getCareerLeaderboard uses, just role-filtered for owners instead.
export async function getCareerLeaderboard(role) {
  const res = await api.get("/api/leaderboards/career", { params: role ? { role } : {} });
  return Array.isArray(res.data) ? res.data : [];
}

// Standings has HorseName/JockeyName embedded — needed because /api/entries only returns
// this owner's own rows for HORSE_OWNER (BE scopes it), so it can't be used to see competitors.
export async function getRaceStandings(raceId) {
  const res = await api.get(`/api/races/${raceId}/standings`);
  return Array.isArray(res.data) ? res.data : [];
}

export async function getMyHorses() {
  const res = await api.get("/api/horses");
  return res.data;
}

export async function registerHorse(payload) {
  const res = await api.post("/api/horses", payload);
  return res.data;
}

export async function getHorseById(horseId) {
  const res = await api.get(`/api/horses/${horseId}`);
  return res.data;
}

// POST /api/horses/{id}/resubmit — resubmits a Rejected horse for Admin to review again.
// ⚠️ Endpoint did not exist on BE at time of writing (BE has been asked to add it — spec:
// requires current Status to be Rejected, resets to Pending, clears RejectionReason,
// checks ownership). Will return 404 until BE finishes deploying.
export async function resubmitHorse(horseId) {
  const res = await api.post(`/api/horses/${horseId}/resubmit`);
  return res.data;
}

export async function updateHorse(horseId, payload) {
  const res = await api.put(`/api/horses/${horseId}`, payload);
  // BE returns 204 No Content when there's no body
  if (res.status === 204 || res.status === 200 && Object.keys(res.data || {}).length === 0) {
    return true;
  }
  return res.data;
}

export async function getMyEntries() {
  const res = await api.get("/api/entries");
  return res.data;
}

export async function submitEntry(payload) {
  const res = await api.post("/api/entries", payload);
  return res.data;
}

export async function getRaces() {
  const res = await api.get("/api/races");
  return res.data;
}

export async function getTournaments() {
  const res = await api.get("/api/tournaments");
  return res.data;
}

export async function getInvitations() {
  const res = await api.get("/api/jockey-invitations");
  return res.data;
}

export async function sendInvitation(payload) {
  const res = await api.post("/api/jockey-invitations", payload);
  return res.data;
}

export async function getJockeys(keyword = "") {
  const params = keyword ? { keyword } : {};
  try {
    const res = await api.get("/api/jockeys/search", { params });
    return res.data;
  } catch (_) {
    // fallback to the old endpoint if /search hasn't been deployed yet
    const res = await api.get("/api/jockey-profiles", { params });
    return res.data;
  }
}

export async function updateInvitation(invitationId, status, responseReason = null) {
  const res = await api.put(`/api/jockey-invitations/${invitationId}`, {
    invitationId,
    status,
    responseReason,
  });
  if (res.status === 204) return true;
  return res.data;
}

export async function deleteInvitation(invitationId) {
  const res = await api.delete(`/api/jockey-invitations/${invitationId}`);
  if (res.status === 204) return true;
  return res.data;
}

export async function withdrawEntry(entryId) {
  const res = await api.delete(`/api/entries/${entryId}`);
  if (res.status === 204) return true;
  return res.data;
}
