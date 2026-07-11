/**
 * Shared validation for referee leg position entry.
 * Applied to both LegSubmissionPage and RefereeResultEntryPage
 * to keep the rules consistent (including DNF/DQ).
 */

/**
 * @param {Array<{entryId:number}>} entries
 * @param {Object<number, number|string|null|undefined>} positionsMap
 *   Map from entryId → position (1..n | -1 DNF | -2 DQ | null/'' empty)
 */
export function validateLegPositions(entries, positionsMap) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { valid: false, error: 'No entries to validate.' }
  }

  const isEmpty = (v) => v === null || v === undefined || v === ''

  // 1. Every entry must be assigned a position
  const unassigned = entries.filter((e) => isEmpty(positionsMap[e.entryId]))
  if (unassigned.length > 0) {
    return {
      valid: false,
      error: `${unassigned.length} entries are missing a position.`,
    }
  }

  // 2. No 2 entries can share the same position (including DNF/DQ)
  const usedBy = {}
  for (const entry of entries) {
    const pos = positionsMap[entry.entryId]
    if (usedBy[pos] !== undefined) {
      return {
        valid: false,
        error: `Position ${formatPosition(pos)} is duplicated across multiple entries.`,
      }
    }
    usedBy[pos] = entry.entryId
  }

  return { valid: true, error: null }
}

export function formatPosition(pos) {
  if (pos === -1) return 'DNF'
  if (pos === -2) return 'DQ'
  return `P${pos}`
}