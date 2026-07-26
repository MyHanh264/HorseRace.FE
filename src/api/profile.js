import api from "../services/api";

// Hồ sơ của chính user đang đăng nhập. Dùng axios instance (tự gắn Bearer + refresh token)
// thay vì fetch như api/auth.js — auth.js không import được services/api.js (vòng lặp import:
// services/api.js đã import refreshAuthToken từ api/auth.js).

// GET /api/auth/profile → { user: {...} }
export async function getMyProfile() {
  const res = await api.get("/api/auth/profile");
  return res.data?.user ?? res.data;
}

// PUT /api/auth/profile — user tự sửa hồ sơ (chỉ FullName/PhoneNumber). Trả hồ sơ sau khi lưu.
export async function updateMyProfile({ fullName, phoneNumber }) {
  const res = await api.put("/api/auth/profile", {
    fullName,
    phoneNumber: phoneNumber?.trim() ? phoneNumber.trim() : null,
  });
  return res.data?.user ?? res.data;
}

// PUT /api/users/{id}/change-password — BE resolve UserId từ JWT, route id chỉ để đúng dạng URL.
export async function changeMyPassword(userId, { currentPassword, newPassword }) {
  const res = await api.put(`/api/users/${userId}/change-password`, {
    currentPassword,
    newPassword,
  });
  return res.data;
}

// Gom lỗi từ ProblemDetails / body BE về một chuỗi hiển thị được.
export function profileErrorMessage(err, fallback) {
  return (
    err?.response?.data?.detail ||
    err?.response?.data?.title ||
    err?.response?.data?.message ||
    err?.message ||
    fallback
  );
}
