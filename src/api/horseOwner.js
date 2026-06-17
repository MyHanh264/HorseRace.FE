import { getAccessToken } from "../utils/token";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function authHeader() {
  return { Authorization: `Bearer ${getAccessToken()}` };
}

export async function getMyHorses() {
  const res = await fetch(`${BASE_URL}/api/horses`, {
    headers: authHeader(),
  });
  if (!res.ok) throw new Error(`Lỗi lấy danh sách ngựa (${res.status})`);
  return res.json();
}

export async function registerHorse(payload) {
  const res = await fetch(`${BASE_URL}/api/horses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Đăng ký ngựa thất bại (${res.status})`);
  return res.json();
}

export async function getHorseById(horseId) {
  const res = await fetch(`${BASE_URL}/api/horses/${horseId}`, {
    headers: authHeader(),
  });
  if (!res.ok) throw new Error(`Lỗi lấy thông tin ngựa (${res.status})`);
  return res.json();
}

export async function updateHorse(horseId, payload) {
  const res = await fetch(`${BASE_URL}/api/horses/${horseId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Cập nhật ngựa thất bại (${res.status})`);
  return res.json();
}

export async function getMyEntries() {
  const res = await fetch(`${BASE_URL}/api/entries`, {
    headers: authHeader(),
  });
  if (!res.ok) throw new Error(`Lỗi lấy entries (${res.status})`);
  return res.json();
}

export async function submitEntry(payload) {
  const res = await fetch(`${BASE_URL}/api/entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Đăng ký entry thất bại (${res.status})`);
  return res.json();
}
//Lấy danh sách các cuộc đua để hiển thị trong form đăng kí entry
export async function getRaces() {
  const res = await fetch(`${BASE_URL}/api/races`, {
    headers: authHeader(),
  });
  if (!res.ok) throw new Error(`Lỗi lấy danh sách races (${res.status})`);
  return res.json();
}
//Lấy danh sách các giải đấu để hiển thị trong form đăng kí entry
export async function getTournaments() {
  const res = await fetch(`${BASE_URL}/api/tournaments`, {
    headers: authHeader(),
  });
  if (!res.ok) throw new Error(`Lỗi lấy tournaments (${res.status})`);
  return res.json();
}
