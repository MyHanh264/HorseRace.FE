// ─── Thể lực & sức khỏe ngựa — hằng số + helper thuần (không JSX) ────────────────
//
// Tách khỏi components/StaminaBar.jsx để file component chỉ export component
// (react-refresh/only-export-components).
//
// BE: Horse.Stamina là int 0..3 (mặc định 3), tụt 1 mỗi race thực đua (khi Publish kết quả),
// hồi đầy 3 khi ngựa nghỉ một race. HealthStatus (computed) có 4 mức — lưu ý 0 nằm NGOÀI 3 vạch:
//   3 = Healthy · 2 = Fair · 1 = Weak · 0 = Exhausted
//
// Màu dùng Tailwind THUẦN (emerald/amber/orange/red) để hiển thị đúng ở CẢ HAI hệ màu FE:
// trang spectator (token gs-*/on-surface) và trang horse-owner (nền #1a2035, text-white).

export const HEALTH_META = {
  3: { key: 'Healthy',   label: 'Healthy',   fill: 'bg-emerald-400', text: 'text-emerald-400', ring: 'border-emerald-500/30', track: 'bg-emerald-400/10' },
  2: { key: 'Fair',      label: 'Fair',      fill: 'bg-amber-400',   text: 'text-amber-400',   ring: 'border-amber-500/30',   track: 'bg-amber-400/10'  },
  1: { key: 'Weak',      label: 'Weak',      fill: 'bg-orange-400',  text: 'text-orange-400',  ring: 'border-orange-500/30',  track: 'bg-orange-400/10' },
  0: { key: 'Exhausted', label: 'Exhausted', fill: 'bg-red-500',     text: 'text-red-400',     ring: 'border-red-500/30',     track: 'bg-red-500/15'    },
}

export const TOTAL_SEGMENTS = 3

const HEALTH_TO_LEVEL = { Healthy: 3, Fair: 2, Weak: 1, Exhausted: 0 }

export function clampStamina(v) {
  const n = Math.round(Number(v))
  if (Number.isNaN(n)) return 0
  return Math.min(TOTAL_SEGMENTS, Math.max(0, n))
}

// Suy ra mức 0..3 từ stamina (int) hoặc, nếu thiếu, từ chuỗi health.
export function resolveLevel({ stamina, health }) {
  if (stamina !== null && stamina !== undefined && stamina !== '') return clampStamina(stamina)
  if (health && health in HEALTH_TO_LEVEL) return HEALTH_TO_LEVEL[health]
  return 0
}

// Chuỗi sức khỏe tương ứng một giá trị stamina (khi FE chỉ có int).
export function deriveHealth(stamina) {
  return HEALTH_META[clampStamina(stamina)].key
}

// Nhãn Strong / Even / Weak tính client-side — BE không trả cờ mạnh/yếu, ghép từ health + winRate.
const STRONG_WIN_RATE = 40
const WEAK_WIN_RATE = 20

export function deriveStrength({ health, winRate } = {}) {
  const wr = Number(winRate) || 0
  const strongHealth = health === 'Healthy' || health === 'Fair'
  const weakHealth = health === 'Weak' || health === 'Exhausted'
  if (weakHealth || wr < WEAK_WIN_RATE) return 'Weak'
  if (strongHealth && wr >= STRONG_WIN_RATE) return 'Strong'
  return 'Even'
}

export const CONDITION_SIZE = {
  sm: { seg: 'h-1.5', gap: 'gap-1',   w: 'w-16', icon: 12, text: 'text-[10px]', pad: 'px-2 py-0.5 text-[10px]' },
  md: { seg: 'h-2',   gap: 'gap-1.5', w: 'w-24', icon: 14, text: 'text-xs',     pad: 'px-2.5 py-1 text-xs'   },
}
