/**
 * Shared validation cho việc referee nhập thứ hạng leg.
 * Áp dụng cho cả LegSubmissionPage và RefereeResultEntryPage
 * để đảm bảo rule nhất quán (kể cả DNF/DQ).
 */

/**
 * @param {Array<{entryId:number}>} entries
 * @param {Object<number, number|string|null|undefined>} positionsMap
 *   Map từ entryId → position (1..n | -1 DNF | -2 DQ | null/'' empty)
 */
export function validateLegPositions(entries, positionsMap) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { valid: false, error: 'Không có entries để validate.' }
  }

  const isEmpty = (v) => v === null || v === undefined || v === ''

  // 1. Mọi entry phải được gán position
  const unassigned = entries.filter((e) => isEmpty(positionsMap[e.entryId]))
  if (unassigned.length > 0) {
    return {
      valid: false,
      error: `Còn ${unassigned.length} entry chưa được gán thứ hạng.`,
    }
  }

  // 2. Không được có 2 entry cùng position (kể cả DNF/DQ)
  const usedBy = {}
  for (const entry of entries) {
    const pos = positionsMap[entry.entryId]
    if (usedBy[pos] !== undefined) {
      return {
        valid: false,
        error: `Vị trí ${formatPosition(pos)} bị trùng giữa nhiều entry.`,
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