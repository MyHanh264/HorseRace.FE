/**
 * Shared validation for referee leg position entry (LegSubmissionPage),
 * keeping the rules consistent (including DNF/DQ).
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

  // 2. Only POSITIVE positions must be unique.
  // DNF (-1) and DQ (-2) are special statuses — multiple horses can share them.
  const usedPositions = {}
  for (const entry of entries) {
    const pos = positionsMap[entry.entryId]
    // Skip DNF and DQ — multiple horses can DNF or DQ in the same leg
    if (pos === -1 || pos === -2) continue
    if (usedPositions[pos] !== undefined) {
      return {
        valid: false,
        error: `Position ${formatPosition(pos)} is assigned to more than one entry.`,
      }
    }
    usedPositions[pos] = entry.entryId
  }

  // 3. Positions must fall inside 1..N (N = số ngựa của race) — mirror of the BE rule in
  //    RaceExecutionConstants.ValidatePositions so the referee gets feedback before submitting.
  const fieldSize = entries.length
  for (const entry of entries) {
    const pos = Number(positionsMap[entry.entryId])
    if (pos === -1 || pos === -2) continue
    if (!Number.isInteger(pos) || pos < 1) {
      return { valid: false, error: 'Invalid position. Use 1..N, DNF or DQ.' }
    }
    if (pos > fieldSize) {
      return {
        valid: false,
        error: `Position P${pos} is out of range — this race has ${fieldSize} horses (valid positions are P1..P${fieldSize}).`,
      }
    }
  }

  // 4. Ranked positions must run consecutively from 1 with no gaps (DNF/DQ excluded).
  const ranked = entries
    .map((e) => Number(positionsMap[e.entryId]))
    .filter((p) => p > 0)
    .sort((a, b) => a - b)
  for (let i = 0; i < ranked.length; i++) {
    if (ranked[i] !== i + 1) {
      return {
        valid: false,
        error: `Rankings must run consecutively from 1 with no gaps (found P${ranked[i]} where P${i + 1} was expected).`,
      }
    }
  }

  return { valid: true, error: null }
}

/**
 * Leg Points tuyến tính theo sĩ số — phải khớp RaceExecutionConstants.LegPointsFor ở BE:
 * hạng p trong N ngựa → (N - p + 1) điểm; DNF/DQ = 0.
 * @param {number} position vị trí (1..N | -1 DNF | -2 DQ)
 * @param {number} fieldSize số ngựa của race
 */
export function getLegPoints(position, fieldSize) {
  const pos = Number(position)
  const size = Number(fieldSize)
  if (!Number.isInteger(pos) || pos < 1) return 0
  if (!Number.isInteger(size) || size < 1) return 0
  if (pos > size) return 0
  return size - pos + 1
}

export function formatPosition(pos) {
  if (pos === -1) return 'DNF'
  if (pos === -2) return 'DQ'
  return `P${pos}`
}