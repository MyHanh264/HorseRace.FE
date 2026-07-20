import { coatColorFor, silkFor } from '../../utils/raceSim'

/**
 * Ngựa đua + nài nhìn ngang, hướng chạy sang PHẢI. Gốc tọa độ (0,0) đặt ở
 * MŨI ngựa, ngang mặt đất — nhờ vậy vị trí trên đường đua khớp đúng với tiến độ
 * (mũi chạm vạch đích = progress 1.0), thân ngựa kéo về phía sau (x âm).
 *
 * Tỉ lệ theo ngựa đua thuần chủng: chân dài ≈ 55% chiều cao vai, thân thon,
 * cổ vươn dài dày dần về vai, đầu nhỏ hình nêm.
 *
 * Chân chạy bằng CSS keyframes (`.gallop-*` trong index.css) chứ không tính trong
 * vòng lặp rAF: trình duyệt chạy chúng trên compositor nên 10 con cùng lúc vẫn
 * không ăn vào frame budget.
 */

// Sprite được vẽ ở hệ tọa độ cao ~88 đơn vị; thu nhỏ để vừa một lane.
const SPRITE_SCALE = 0.6

/** Làm tối một màu hex — dùng cho cặp chân phía xa để tạo chiều sâu. */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + v * amt)))
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map(f)
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`
}

export default function HorseSprite({
  entry,
  running = true,
  dimmed = false,
  finished = false,
  phase = 0,
}) {
  const silk = silkFor(entry.gateNumber, entry.entryId)
  const coat = coatColorFor(entry.color)
  const dark = shade(coat, -0.28)
  const mane = '#2a2018'
  const delay = `${phase * -0.07}s` // lệch pha để đàn ngựa không nhấp nhô đồng loạt

  return (
    <g
      transform={`scale(${SPRITE_SCALE})`}
      opacity={dimmed ? 0.45 : 1}
      style={{ transition: 'opacity 300ms ease' }}
    >
      {running && (
        <g className="dust-puff" style={{ animationDelay: delay }}>
          <circle cx="-84" cy="-6" r="9" fill="#c8b89a" opacity="0.20" />
          <circle cx="-100" cy="-13" r="6.5" fill="#c8b89a" opacity="0.12" />
          <circle cx="-114" cy="-4" r="5" fill="#c8b89a" opacity="0.07" />
        </g>
      )}

      <ellipse cx="-42" cy="-2" rx="38" ry="4.5" fill="#000" opacity="0.30" />

      <g className={running ? 'gallop-body' : undefined} style={{ animationDelay: delay }}>
        {/* ── Cặp chân phía xa (tối hơn → tạo chiều sâu) ── */}
        <g className={running ? 'gallop-leg-back' : undefined} style={{ animationDelay: delay }}>
          <path d="M-66,-44 C-74,-36 -78,-26 -74,-16" stroke={dark} strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M-74,-17 C-73,-11 -72,-6 -72,-3" stroke={dark} strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
        <g className={running ? 'gallop-leg-front' : undefined} style={{ animationDelay: delay }}>
          <path d="M-26,-44 C-20,-34 -16,-24 -18,-16" stroke={dark} strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M-18,-17 C-18,-11 -18,-6 -18,-3" stroke={dark} strokeWidth="3.6" fill="none" strokeLinecap="round" />
        </g>

        {/* ── Đuôi bay ngang ra sau ── */}
        <path
          className={running ? 'gallop-tail' : undefined}
          d="M-76,-50 C-90,-50 -102,-44 -110,-33 C-104,-40 -94,-44 -80,-44 Z"
          fill={mane}
          style={{ transformOrigin: '-76px -50px', animationDelay: delay }}
        />

        {/* ── Thân: ngực nở, bụng gọn, mông tròn vừa phải ── */}
        <path
          d="M-24,-52 C-36,-60 -56,-61 -68,-56 C-77,-52 -80,-44 -77,-37
             C-73,-30 -62,-28 -50,-29 C-38,-30 -28,-35 -24,-43 C-22,-47 -22,-50 -24,-52 Z"
          fill={coat}
        />

        {/* ── Cổ: gốc dày ăn vào vai, thon dần lên gáy ── */}
        <path d="M-34,-56 C-33,-66 -23,-75 -10,-80 L-1,-70 C-13,-66 -20,-58 -23,-47 Z" fill={coat} />

        {/* ── Đầu: nêm nhỏ chúc về trước, tai dựng ── */}
        <path d="M-12,-80 C-2,-84 8,-80 12,-74 L1,-64 C-6,-65 -12,-71 -14,-76 Z" fill={coat} />
        <path d="M10,-75 C15,-74 16,-69 13,-67 L4,-65 Z" fill={coat} />
        <path d="M-13,-80 L-14,-88 L-7,-82 Z" fill={coat} />
        <circle cx="2" cy="-75" r="1.8" fill="#12100e" />
        <path d="M-12,-79 C-20,-72 -28,-63 -32,-54" stroke={mane} strokeWidth="6" fill="none" strokeLinecap="round" />

        {/* ── Nài: gập người, mông nhổm khỏi yên ── */}
        <path d="M-42,-58 L-37,-49 L-30,-47" stroke={silk.accent} strokeWidth="4.2" fill="none" strokeLinecap="round" />
        <path d="M-52,-65 C-47,-72 -35,-73 -29,-66 L-32,-57 C-40,-55 -48,-57 -51,-60 Z" fill={silk.fill} />
        <path d="M-33,-66 L-23,-65 L-15,-69" stroke={silk.fill} strokeWidth="3.6" fill="none" strokeLinecap="round" />
        <circle cx="-39" cy="-73" r="5" fill="#e8c9a8" />
        <path d="M-44,-74 C-44,-80 -33,-80 -33,-74 Z" fill={silk.accent} />
        <path d="M-34,-74 L-29,-73" stroke={silk.accent} strokeWidth="2.2" strokeLinecap="round" />
        <text
          x="-49"
          y="-60"
          fontSize="8"
          fontWeight="700"
          fill={silk.accent}
          fontFamily="'JetBrains Mono Variable', monospace"
        >
          {entry.gateNumber ?? '?'}
        </text>

        {/* ── Cặp chân phía gần (sáng, vẽ sau cùng) ── */}
        <g className={running ? 'gallop-leg-front2' : undefined} style={{ animationDelay: delay }}>
          <path d="M-28,-44 C-20,-33 -14,-23 -14,-15" stroke={coat} strokeWidth="6.5" fill="none" strokeLinecap="round" />
          <path d="M-14,-16 C-13,-10 -12,-6 -12,-3" stroke={coat} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M-12,-3 L-7,-2" stroke={coat} strokeWidth="4.5" strokeLinecap="round" />
        </g>
        <g className={running ? 'gallop-leg-back2' : undefined} style={{ animationDelay: delay }}>
          <path d="M-68,-44 C-78,-35 -82,-24 -78,-15" stroke={coat} strokeWidth="7.5" fill="none" strokeLinecap="round" />
          <path d="M-78,-16 C-77,-10 -77,-6 -77,-3" stroke={coat} strokeWidth="4.2" fill="none" strokeLinecap="round" />
          <path d="M-77,-3 L-82,-2" stroke={coat} strokeWidth="4.5" strokeLinecap="round" />
        </g>
      </g>

      {finished && (
        <circle
          cx="-40"
          cy="-42"
          r="52"
          fill="none"
          stroke="#e6c364"
          strokeWidth="3"
          opacity="0.5"
          className="finish-flash"
        />
      )}
    </g>
  )
}
