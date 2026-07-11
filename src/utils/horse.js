/**
 * Shared helpers for the Horse feature (FLOW 1 — Registration & Approval).
 * Centralizes status/column metadata to avoid hardcoding UI in multiple places.
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
  [HORSE_STATUS.APPROVED]: "Approved",
  [HORSE_STATUS.PENDING]: "Pending",
  [HORSE_STATUS.REJECTED]: "Rejected",
  [HORSE_STATUS.REVOKED]: "Revoked",
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
 * Display columns for the Approved horses table.
 * Each entry: { key, label, render(horse) }
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
 * Display columns for the Rejected horses table.
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
 * Field Admin enters when rejecting (the reason). Can be empty.
 */
export function validateRejectReason(reason) {
  const trimmed = (reason ?? "").trim()
  if (trimmed.length > 500) {
    return { valid: false, error: "Rejection reason must not exceed 500 characters." }
  }
  return { valid: true, error: null }
}

/**
 * Returns the list of statuses shown on the Admin page
 * (Revoked removed under the new FLOW 1).
 */
export const ADMIN_HORSE_TABS = [
  { key: "All", label: "All" },
  { key: HORSE_STATUS.PENDING, label: "Pending" },
  { key: HORSE_STATUS.APPROVED, label: "Approved" },
  { key: HORSE_STATUS.REJECTED, label: "Rejected" },
]
