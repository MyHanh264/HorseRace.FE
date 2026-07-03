import { getAccessToken } from "../utils/token";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function authHeader() {
  return { Authorization: `Bearer ${getAccessToken()}` };
}

// Lấy profile của jockey theo userId
export async function getJockeyProfile(userId) {
  const res = await fetch(`${BASE_URL}/api/jockey-profiles/${userId}`, {
    headers: authHeader(),
  });
  if (!res.ok) throw new Error(`Lỗi lấy jockey profile (${res.status})`);
  return res.json();
}

// Cập nhật profile jockey
export async function updateJockeyProfile(userId, payload) {
  const res = await fetch(`${BASE_URL}/api/jockey-profiles/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Cập nhật profile thất bại (${res.status})`);
  return res.json();
}

// Lấy tất cả jockey profiles
export async function getJockeyProfiles() {
  const res = await fetch(`${BASE_URL}/api/jockey-profiles`, {
    headers: authHeader(),
  });
  if (!res.ok) throw new Error(`Lỗi lấy danh sách jockey (${res.status})`);
  return res.json();
}

// Lấy danh sách invitations của jockey
export async function getJockeyInvitations() {
  const res = await fetch(`${BASE_URL}/api/jockey-invitations`, {
    headers: authHeader(),
  });
  if (!res.ok) throw new Error(`Lỗi lấy invitations (${res.status})`);
  return res.json();
}

// Lấy invitation theo id
export async function getJockeyInvitationById(invitationId) {
  const res = await fetch(
    `${BASE_URL}/api/jockey-invitations/${invitationId}`,
    { headers: authHeader() },
  );
  if (!res.ok) throw new Error(`Lỗi lấy invitation (${res.status})`);
  return res.json();
}

// Tạo invitation mới
export async function createJockeyInvitation(payload) {
  const res = await fetch(`${BASE_URL}/api/jockey-invitations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Gửi invitation thất bại (${res.status})`);
  return res.json();
}

// Accept hoặc Decline invitation
export async function updateJockeyInvitation(invitationId, status) {
  const res = await fetch(
    `${BASE_URL}/api/jockey-invitations/${invitationId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ status }),
    },
  );
  if (!res.ok) throw new Error(`Cập nhật invitation thất bại (${res.status})`);
  return res.json();
}

// Xóa invitation
export async function deleteJockeyInvitation(invitationId) {
  const res = await fetch(
    `${BASE_URL}/api/jockey-invitations/${invitationId}`,
    {
      method: "DELETE",
      headers: authHeader(),
    },
  );
  if (!res.ok) throw new Error(`Xóa invitation thất bại (${res.status})`);
  return res.json();
}

// Lấy danh sách races
export async function getRaces() {
  const res = await fetch(`${BASE_URL}/api/races`, {
    headers: authHeader(),
  });
  if (!res.ok) throw new Error(`Lỗi lấy races (${res.status})`);
  return res.json();
}
