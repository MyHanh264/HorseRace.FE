import { BatteryLow } from 'lucide-react'
import {
  HEALTH_META,
  TOTAL_SEGMENTS,
  CONDITION_SIZE,
  resolveLevel,
} from '../utils/horseCondition'

// ─── Thanh thể lực + badge sức khỏe của ngựa ────────────────────────────────────
// Hằng số & helper thuần nằm ở src/utils/horseCondition.js (deriveHealth, deriveStrength...).

// 3 vạch: `level` vạch đầu tô màu sức khỏe, còn lại là track trống. Mức 0 (Exhausted) → cả 3 trống,
// track nhuốm đỏ + icon pin cạn để "0 vạch" đọc ra là trạng thái cố ý, không phải chưa tải xong.
export function StaminaBar({ stamina, health, size = 'sm', showValue = false, className = '' }) {
  const level = resolveLevel({ stamina, health })
  const meta = HEALTH_META[level]
  const s = CONDITION_SIZE[size] ?? CONDITION_SIZE.sm
  const exhausted = level === 0

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className={`flex ${s.gap} ${s.w}`}>
        {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => (
          <span
            key={i}
            className={`${s.seg} flex-1 rounded-full ${
              i < level ? meta.fill : exhausted ? 'bg-red-500/25' : 'bg-white/10'
            }`}
          />
        ))}
      </div>
      {exhausted && <BatteryLow size={s.icon} className="text-red-400 shrink-0" />}
      {showValue && <span className={`${s.text} font-semibold ${meta.text}`}>{level}/3</span>}
    </div>
  )
}

// Pill sức khỏe theo idiom badge sẵn có (STATUS_META / .gs-badge).
export function HorseHealthBadge({ stamina, health, size = 'sm', className = '' }) {
  const level = resolveLevel({ stamina, health })
  const meta = HEALTH_META[level]
  const s = CONDITION_SIZE[size] ?? CONDITION_SIZE.sm
  return (
    <span className={`inline-flex items-center rounded-full font-bold border ${s.pad} ${meta.text} ${meta.ring} ${meta.track} ${className}`}>
      {health || meta.label}
    </span>
  )
}

// Bar + badge gộp — tiện dùng trong ô bảng (màn cược của Spectator).
export function HorseCondition({ stamina, health, size = 'sm', className = '' }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <StaminaBar stamina={stamina} health={health} size={size} />
      <HorseHealthBadge stamina={stamina} health={health} size={size} />
    </div>
  )
}

export default StaminaBar
