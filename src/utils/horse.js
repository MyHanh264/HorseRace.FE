/**
 * Shared helpers cho Horse feature (FLOW 1 — Registration & Approval).
 * Centralize status/column metadata để tránh hardcode UI nhiều nơi.
 */

export const HORSE_STATUS = Object.freeze({
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REVOKED: "Revoked",
})

const STATUS_BADGE_CLASS = {
  [HORSE_STATUS.APPROVED]:
    "bg-emerald-500/20 text-emerald-400 border border-emerald-700",
  [HORSE_STATUS.PENDING]:
    "bg-yellow-500/20 text-yellow-400 border border-yellow-700",
  [HORSE_STATUS.REJECTED]:
    "bg-red-500/20 text-red-400 border border-red-700",
  [HORSE_STATUS.REVOKED]:
    "bg-gray-500/20 text-gray-400 border border-gray-700",
}

const STATUS_LABEL_VI = {
  [HORSE_STATUS.APPROVED]: "Đã duyệt",
  [HORSE_STATUS.PENDING]: "Chờ duyệt",
  [HORSE_STATUS.REJECTED]: "Từ chối",
  [HORSE_STATUS.REVOKED]: "Thu hồi",
}

export function getHorseBadgeClass(status) {
  return STATUS_BADGE_CLASS[status] || "bg-gray-500/20 text-gray-400 border border-gray-700"
}

export function getHorseStatusLabel(status) {
  return STATUS_LABEL_VI[status] || status || "—"
}

export function canCreateHorse(submitting) {
  return !submitting
}

/**
 * Cột hiển thị cho bảng Approved horses.
 * Mỗi entry: { key, label, render(horse) }
 */
export function getApprovedHorseColumns() {
  return [
    { key: "name", label: "Horse Name" },
    { key: "breed", label: "Breed" },
    { key: "color", label: "Color" },
    { key: "birthYear", label: "Birth Year" },
    { key: "registeredAt", label: "Registration Date" },
    { key: "owner", label: "Horse Owner" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Actions" },
  ]
}

/**
 * Cột hiển thị cho bảng Rejected horses.
 */
export function getRejectedHorseColumns() {
  return [
    { key: "name", label: "Horse Name" },
    { key: "breed", label: "Breed" },
    { key: "color", label: "Color" },
    { key: "birthYear", label: "Birth Year" },
    { key: "registeredAt", label: "Registration Date" },
    { key: "owner", label: "Horse Owner" },
    { key: "rejectionReason", label: "Reject Reason" },
    { key: "actions", label: "Actions" },
  ]
}

/**
 * Field mà Admin nhập khi reject (lý do). Có thể rỗng.
 */
export function validateRejectReason(reason) {
  const trimmed = (reason ?? "").trim()
  if (trimmed.length > 500) {
    return { valid: false, error: "Lý do từ chối không được vượt quá 500 ký tự." }
  }
  return { valid: true, error: null }
}

/**
 * Trả về danh sách status còn hiển thị ở Admin page
 * (đã loại bỏ Revoked theo FLOW 1 mới).
 */
export const ADMIN_HORSE_TABS = [
  { key: "All", label: "Tất cả" },
  { key: HORSE_STATUS.PENDING, label: "Chờ duyệt" },
  { key: HORSE_STATUS.APPROVED, label: "Đã duyệt" },
  { key: HORSE_STATUS.REJECTED, label: "Từ chối" },
]
