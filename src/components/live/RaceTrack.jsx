import HorseSprite from './HorseSprite'
import { silkFor } from '../../utils/raceSim'

// Bố cục kiểu sóng truyền hình đua ngựa: cột tên cố định bên trái, phần đường đua
// bên phải trượt theo camera. Tên nằm NGOÀI vùng trượt nên không bao giờ đè lên ngựa.
const VIEW_W = 1000
const GUTTER_W = 150 // cột tên cố định
const TRACK_X = GUTTER_W + 8 // mép trái vùng đường đua
const TRACK_VIEW_W = VIEW_W - TRACK_X

// Không gian "thế giới" của đường đua — dài hơn khung nhìn nên camera phải trượt.
const WORLD_LEN = 2100
const START_X = TRACK_X + 40
const FINISH_X = START_X + WORLD_LEN

const LANE_H = 66
const TOP_PAD = 34
const BOTTOM_PAD = 20

/**
 * Đường đua SVG. Nhận `progress` (0→1) cho từng entry và chỉ lo phần hình ảnh:
 * lane, camera, vạch đích, cột tên. Không chứa logic mô phỏng.
 *
 * @param entries    RaceLiveEntryDto[]
 * @param progressOf (entryId) => number trong [0,1]
 * @param showRanks  hiện số thứ hạng hay không — PHẢI false khi leg chưa có kết quả
 *                   xác nhận (chế độ "đàn ngựa"), nếu không khán giả sẽ đọc vị trí
 *                   trên màn hình thành thứ hạng thật.
 */
export default function RaceTrack({
  entries,
  progressOf,
  running = true,
  showRanks = false,
  highlightEntryId = null,
  finishedIds = null,
  dnfIds = null,
}) {
  const laneCount = entries.length
  const height = TOP_PAD + laneCount * LANE_H + BOTTOM_PAD

  const xOf = (p) => START_X + p * WORLD_LEN

  // Camera bám con dẫn đầu, giữ nó ở ~70% chiều rộng vùng đường đua; kẹp biên để
  // luôn thấy vạch xuất phát lúc đầu và vạch đích lúc cuối.
  const leadX = entries.reduce((mx, e) => Math.max(mx, xOf(progressOf(e.entryId))), START_X)
  const cameraX = Math.max(
    0,
    Math.min(FINISH_X + 60 - VIEW_W, leadX - TRACK_X - TRACK_VIEW_W * 0.7),
  )

  // Thứ hạng theo vị trí trên màn hình (chỉ dùng khi showRanks).
  const screenRank = new Map()
  if (showRanks) {
    ;[...entries]
      .sort((a, b) => progressOf(b.entryId) - progressOf(a.entryId))
      .forEach((e, i) => screenRank.set(e.entryId, i + 1))
  }

  const laneY = (i) => TOP_PAD + i * LANE_H + LANE_H - 14

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${height}`}
      className="w-full h-auto select-none"
      role="img"
      aria-label="Simulated race track"
    >
      <defs>
        <linearGradient id="turf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d3a2a" />
          <stop offset="100%" stopColor="#0f2418" />
        </linearGradient>
        <pattern id="finishCheck" width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="#f5f0e6" />
          <rect width="7" height="7" fill="#12100e" />
          <rect x="7" y="7" width="7" height="7" fill="#12100e" />
        </pattern>
        {/* Ngựa chỉ được vẽ trong vùng đường đua — không tràn sang cột tên. */}
        <clipPath id="trackClip">
          <rect x={TRACK_X} y="0" width={TRACK_VIEW_W} height={height} />
        </clipPath>
      </defs>

      <rect x={TRACK_X} y="0" width={TRACK_VIEW_W} height={height} fill="url(#turf)" />

      {/* ── Vùng đường đua (trượt theo camera) ── */}
      <g clipPath="url(#trackClip)">
        <g transform={`translate(${-cameraX},0)`}>
          {/* Cột mốc mỗi 1/8 quãng đường */}
          {Array.from({ length: 9 }, (_, i) => {
            const x = START_X + (i / 8) * WORLD_LEN
            return (
              <g key={`m${i}`}>
                <line x1={x} y1={TOP_PAD - 12} x2={x} y2={height - BOTTOM_PAD} stroke="#ffffff" strokeOpacity="0.05" />
                <text x={x + 5} y={TOP_PAD - 16} fontSize="10" fill="#6f7a71" fontFamily="'JetBrains Mono Variable', monospace">
                  {i === 0 ? 'START' : i === 8 ? 'FINISH' : `${i}/8`}
                </text>
              </g>
            )
          })}

          {/* Lằn phân lane */}
          {entries.map((e, i) => (
            <line
              key={`l${e.entryId}`}
              x1={START_X - 40}
              y1={laneY(i) + 6}
              x2={FINISH_X + 40}
              y2={laneY(i) + 6}
              stroke="#ffffff"
              strokeOpacity={highlightEntryId === e.entryId ? 0.15 : 0.05}
            />
          ))}

          <line x1={START_X} y1={TOP_PAD - 12} x2={START_X} y2={height - BOTTOM_PAD} stroke="#dae3ee" strokeOpacity="0.3" strokeWidth="2" strokeDasharray="5 5" />
          <rect x={FINISH_X - 7} y={TOP_PAD - 12} width="14" height={height - TOP_PAD - BOTTOM_PAD + 12} fill="url(#finishCheck)" opacity="0.92" />

          {/* Ngựa */}
          {entries.map((e, i) => {
            const p = progressOf(e.entryId)
            const isDnf = dnfIds?.has(e.entryId)
            return (
              <g key={e.entryId} transform={`translate(${xOf(p)},${laneY(i)})`}>
                <HorseSprite
                  entry={e}
                  running={running && !isDnf}
                  dimmed={isDnf}
                  finished={finishedIds?.has(e.entryId)}
                  phase={i}
                />
                {/* Đặt ngang tầm thân ngựa, KHÔNG đưa lên cao — nhãn cao quá sẽ
                    tràn sang lane phía trên và bị đọc nhầm là của ngựa khác. */}
                {isDnf && (
                  <text x="14" y="-16" fontSize="11" fontWeight="700" fill="#ffb4ab" fontFamily="'JetBrains Mono Variable', monospace">
                    DNF
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </g>

      {/* ── Cột tên cố định (ngoài vùng trượt) ── */}
      <rect x="0" y="0" width={GUTTER_W} height={height} fill="#0b141c" />
      {entries.map((e, i) => {
        const silk = silkFor(e.gateNumber, e.entryId)
        const isHi = highlightEntryId === e.entryId
        const y = laneY(i)
        return (
          <g key={`g${e.entryId}`}>
            <rect
              x="4"
              y={y - 26}
              width={GUTTER_W - 10}
              height="30"
              rx="6"
              fill={isHi ? '#1d2a22' : '#141c24'}
              stroke={isHi ? '#e6c364' : '#2a332c'}
              strokeWidth={isHi ? 1.5 : 1}
            />
            <rect x="10" y={y - 20} width="16" height="16" rx="3" fill={silk.fill} />
            <text x="14" y={y - 8} fontSize="10" fontWeight="700" fill={silk.accent} fontFamily="'JetBrains Mono Variable', monospace">
              {e.gateNumber ?? '?'}
            </text>
            <text x="32" y={y - 8} fontSize="12" fill="#dae3ee" fontFamily="Inter, sans-serif">
              {e.horseName.length > 12 ? `${e.horseName.slice(0, 11)}…` : e.horseName}
            </text>
            {showRanks && (
              <text
                x={GUTTER_W - 12}
                y={y - 8}
                fontSize="12"
                fontWeight="700"
                textAnchor="end"
                fill={screenRank.get(e.entryId) === 1 ? '#e6c364' : '#89938a'}
                fontFamily="'JetBrains Mono Variable', monospace"
              >
                {screenRank.get(e.entryId)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
