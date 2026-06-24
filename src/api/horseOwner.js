import api from "../services/api";

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

export async function updateHorse(horseId, payload) {
  const res = await api.put(`/api/horses/${horseId}`, payload);
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

export async function getJockeys() {
  const res = await api.get("/api/jockey-profiles");
  return res.data;
}

export async function deleteInvitation(invitationId) {
  const res = await api.delete(`/api/jockey-invitations/${invitationId}`);
  return res.data;
}
