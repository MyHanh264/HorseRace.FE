/**
 * Validation for Admin override.
 * Centralized so LegSubmissionPage and AdminConflictResolutionPage
 * use the same rule as OverrideModal in AdminRaceExecutionPage.
 */

const MIN_OVERRIDE_REASON_LENGTH = 10

export function validateOverrideReason(reason) {
  const trimmed = (reason ?? '').trim()
  if (!trimmed) {
    return { valid: false, error: 'An override reason is required.' }
  }
  if (trimmed.length < MIN_OVERRIDE_REASON_LENGTH) {
    return {
      valid: false,
      error: `Override reason must be at least ${MIN_OVERRIDE_REASON_LENGTH} characters.`,
    }
  }
  return { valid: true, error: null }
}

export const OVERRIDE_REASON_MIN_LENGTH = MIN_OVERRIDE_REASON_LENGTH