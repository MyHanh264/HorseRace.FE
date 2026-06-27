/**
 * Validation cho Admin override.
 * Centralized để đảm bảo LegSubmissionPage và AdminConflictResolutionPage
 * dùng cùng rule với OverrideModal trong AdminRaceExecutionPage.
 */

const MIN_OVERRIDE_REASON_LENGTH = 10

export function validateOverrideReason(reason) {
  const trimmed = (reason ?? '').trim()
  if (!trimmed) {
    return { valid: false, error: 'Bắt buộc nhập lý do override.' }
  }
  if (trimmed.length < MIN_OVERRIDE_REASON_LENGTH) {
    return {
      valid: false,
      error: `Lý do override phải có ít nhất ${MIN_OVERRIDE_REASON_LENGTH} ký tự.`,
    }
  }
  return { valid: true, error: null }
}

export const OVERRIDE_REASON_MIN_LENGTH = MIN_OVERRIDE_REASON_LENGTH