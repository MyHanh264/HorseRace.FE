import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Play, RotateCcw, SkipForward, Gauge, AlertTriangle, Radio } from 'lucide-react'
import RaceTrack from './RaceTrack'
import {
  buildTrajectories,
  packProgressAt,
  compareResults,
  decodePosition,
  RACE_DURATION_S,
  silkFor,
} from '../../utils/raceSim'

const COUNTDOWN_S = 3
// Chỉ tự phát khi leg vừa chốt xong. Bỏ điều kiện này thì mở một race cũ sẽ
// phát lại leg 1 từ tuần trước như thể nó vừa diễn ra.
const AUTOPLAY_WINDOW_MS = 2 * 60 * 1000
// Rời tab lâu hơn ngần này thì quay lại nhảy thẳng tới kết quả; ngắn hơn thì
// chạy tiếp chỗ cũ (đồng hồ đã đóng băng sẵn trong lúc tab ẩn).
const HIDDEN_SKIP_MS = 5000

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function seenKey(raceId) {
  return `hrs.replay.${raceId}`
}

function loadSeen(raceId) {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(seenKey(raceId)) || '[]'))
  } catch {
    return new Set()
  }
}

function saveSeen(raceId, set) {
  try {
    sessionStorage.setItem(seenKey(raceId), JSON.stringify([...set]))
  } catch {
    /* sessionStorage đầy hoặc bị chặn — không đáng để làm hỏng trang */
  }
}

function fmtElapsed(ms) {
  if (ms == null || ms < 0) return '00:00'
  const s = Math.floor(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Trình phát mô phỏng cho MỘT leg.
 *
 * Trạng thái: waiting | pack | countdown | running | finished | conflicted
 *
 * Điểm mấu chốt về tính trung thực: ở chế độ `pack` (leg đang chạy, server chưa
 * có kết quả vì Blind Double-Entry) ngựa chạy sát nhau và `showRanks` = false.
 * Chỉ khi leg đã Confirmed/Resolved mới có thứ hạng thật để hiển thị.
 */
export default function RaceReplayPlayer({ raceId, leg, entries, highlightEntryId }) {
  const [phase, setPhase] = useState('waiting')
  const [clock, setClock] = useState(0) // giây trong dòng thời gian mô phỏng
  const [speed, setSpeed] = useState(1)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const rafRef = useRef(0)
  const startedAtRef = useRef(0)
  const clockRef = useRef(0)
  const seenRef = useRef(loadSeen(raceId))
  const reduced = useRef(prefersReducedMotion())
  const hiddenAtRef = useRef(0)

  // Đồng hồ sống ở cả ref (vòng lặp rAF đọc/ghi) lẫn state (để render). Luôn đổi
  // qua hàm này để hai nơi không lệch nhau.
  const seek = useCallback((t) => {
    clockRef.current = t
    setClock(t)
  }, [])

  // Cho phép handler ngoài React (visibilitychange) đọc phase hiện tại mà không
  // phải lồng logic vào updater của setPhase — StrictMode gọi updater hai lần.
  const phaseRef = useRef(phase)
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const legNumber = leg?.legNumber
  const isConfirmed = Boolean(leg?.isConfirmed)
  const results = useMemo(() => leg?.results ?? [], [leg])

  // Chữ ký của những gì máy trạng thái bên dưới thực sự quan tâm ở `leg`.
  //
  // BẮT BUỘC phải có: `useRaceLiveHub` gọi `setSnapshot` với JSON vừa nhận được, nên
  // sau MỖI lần SignalR push hoặc poll dự phòng 30s, `leg` là một object MỚI dù nội
  // dung y hệt. Effect chọn trạng thái phía dưới có `leg` trong deps ⇒ chạy lại, rơi
  // vào nhánh `alreadySeen` (autoplay đã đánh dấu seen ngay lúc bắt đầu đếm ngược)
  // ⇒ `seek(RACE_DURATION_S)` + `setPhase('finished')` ⇒ replay đang chạy bị cắt
  // ngang, đàn ngựa nhảy phắt về vạch đích. Replay dài 29s (3s đếm ngược + 26s đua)
  // mà poll 30s nên gần như lần nào cũng bị cắt, ở một điểm ngẫu nhiên.
  const legSignature = leg
    ? [leg.legNumber, leg.isConfirmed, leg.isConflicted, leg.startedAt, leg.confirmedAt].join('|')
    : null
  const appliedSignatureRef = useRef(null)

  // Quỹ đạo chỉ dựng lại khi leg hoặc kết quả thật sự đổi.
  const trajectory = useMemo(() => {
    if (!isConfirmed || !entries?.length || !results.length) return null
    return buildTrajectories(entries, results, { raceId, legNumber })
  }, [isConfirmed, entries, results, raceId, legNumber])

  // Ngựa DNF chỉ được làm mờ + gắn nhãn TỪ lúc nó thực sự bỏ cuộc trong mô phỏng.
  // Gắn ngay từ giây 0 là tiết lộ trước kết quả — mất hết kịch tính.
  const visibleDnfIds = useMemo(() => {
    const s = new Set()
    if (phase === 'finished') {
      results.forEach((r) => {
        if (decodePosition(r.position).isDnf) s.add(r.entryId)
      })
    } else if (phase === 'running' && trajectory) {
      trajectory.runners.forEach((r) => {
        if (r.isDnf && clock >= r.dropoutTime) s.add(r.entryId)
      })
    }
    return s
  }, [phase, clock, trajectory, results])

  // ─── Chọn trạng thái khi snapshot đổi ───────────────────────────────────────
  // Đây đúng là "đồng bộ state React với hệ thống ngoài" (snapshot đẩy từ server),
  // nên setState trong effect là hợp lệ ở đây. Không chuyển sang tính lúc render
  // được: nhánh này còn ghi sessionStorage (đánh dấu leg đã xem), mà ghi I/O trong
  // thân render là bất tịnh và bị StrictMode gọi hai lần.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!leg) return

    // Snapshot mới nhưng leg không đổi gì → giữ nguyên phase đang chạy.
    if (appliedSignatureRef.current === legSignature) return
    appliedSignatureRef.current = legSignature

    if (leg.isConflicted) {
      setPhase('conflicted')
      return
    }

    if (isConfirmed) {
      const key = String(leg.legNumber)
      const alreadySeen = seenRef.current.has(key)
      const confirmedMsAgo = leg.confirmedAt ? Date.now() - new Date(leg.confirmedAt).getTime() : Infinity
      const fresh = confirmedMsAgo < AUTOPLAY_WINDOW_MS

      if (!alreadySeen && fresh && !reduced.current) {
        seenRef.current.add(key)
        saveSeen(raceId, seenRef.current)
        seek(-COUNTDOWN_S)
        setPhase('countdown')
      } else {
        // Đánh dấu đã xem để lần sau vào không bị phát lại bất ngờ.
        if (!alreadySeen) {
          seenRef.current.add(key)
          saveSeen(raceId, seenRef.current)
        }
        seek(RACE_DURATION_S)
        setPhase('finished')
      }
      return
    }

    if (leg.startedAt && !isConfirmed && !leg.isConflicted) {
      setPhase('pack')
      return
    }

    setPhase('waiting')
  }, [leg, legSignature, isConfirmed, raceId, seek])
  /* eslint-enable react-hooks/set-state-in-effect */

  // ─── Vòng lặp animation ─────────────────────────────────────────────────────
  useEffect(() => {
    const animating = phase === 'countdown' || phase === 'running' || phase === 'pack'
    if (!animating) return

    let last = performance.now()
    startedAtRef.current = last

    const frame = (t) => {
      const dt = Math.min(0.1, (t - last) / 1000) // kẹp để tab bị treo không nhảy vọt
      last = t

      if (document.hidden) {
        // Tab ẩn: không tiêu frame. Khi quay lại sẽ nhảy tới cuối (effect bên dưới).
        rafRef.current = requestAnimationFrame(frame)
        return
      }

      // Cập nhật đồng hồ trên ref rồi mới đẩy vào state: đặt setPhase bên trong
      // updater của setClock sẽ bị StrictMode gọi hai lần.
      const next = clockRef.current + dt * (phase === 'pack' ? 1 : speed)

      if (phase === 'countdown' && next >= 0) {
        clockRef.current = 0
        setClock(0)
        setPhase('running')
        return // effect chạy lại theo phase mới, không schedule thêm frame ở đây
      }
      if (phase === 'running' && next >= RACE_DURATION_S) {
        clockRef.current = RACE_DURATION_S
        setClock(RACE_DURATION_S)
        setPhase('finished')
        return
      }

      clockRef.current = next
      setClock(next)
      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, speed])

  // Rời tab lâu rồi quay lại → nhảy thẳng tới kết quả thay vì xem nốt một cuộc đua
  // đã cũ. Trước đây nhảy VÔ ĐIỀU KIỆN, nên chỉ cần liếc sang cửa sổ khác một giây
  // (hoặc điện thoại khóa màn hình rồi mở lại) là replay đang chạy chết ngay giữa
  // chừng. Vòng lặp rAF vốn đã đóng băng đồng hồ khi `document.hidden`, nên vắng mặt
  // ngắn thì chạy tiếp đúng chỗ cũ là hành vi đúng.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now()
        return
      }

      setNowMs(Date.now())
      const awayMs = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0
      hiddenAtRef.current = 0

      const p = phaseRef.current
      if ((p === 'running' || p === 'countdown') && awayMs >= HIDDEN_SKIP_MS) {
        seek(RACE_DURATION_S)
        setPhase('finished')
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [seek])

  // Đồng hồ đếm khi leg đang chạy.
  useEffect(() => {
    if (phase !== 'pack') return
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [phase])

  const replay = useCallback(() => {
    seek(-COUNTDOWN_S)
    setPhase('countdown')
  }, [seek])

  const skip = useCallback(() => {
    seek(RACE_DURATION_S)
    setPhase('finished')
  }, [seek])

  // ─── Tiến độ của từng ngựa theo trạng thái hiện tại ────────────────────────
  const progressOf = useCallback(
    (entryId) => {
      if (phase === 'pack') {
        const elapsed = leg?.startedAt ? (nowMs - new Date(leg.startedAt).getTime()) / 1000 : 0
        return packProgressAt(entryId, Math.max(0, elapsed), { raceId, legNumber })
      }
      if (phase === 'finished') {
        const runner = trajectory?.runners.find((r) => r.entryId === entryId)
        if (!runner) return 0
        return runner.isDnf ? runner.dropoutAt : 1
      }
      if (phase === 'running' && trajectory) {
        const runner = trajectory.runners.find((r) => r.entryId === entryId)
        return runner ? runner.progressAt(Math.max(0, clock)) : 0
      }
      return 0
    },
    [phase, clock, trajectory, leg, nowMs, raceId, legNumber],
  )

  const finishedIds = useMemo(() => {
    if (phase !== 'running' || !trajectory) return new Set()
    const s = new Set()
    trajectory.runners.forEach((r) => {
      if (!r.isDnf && clock >= r.finishTime) s.add(r.entryId)
    })
    return s
  }, [phase, clock, trajectory])

  if (!leg) {
    return (
      <div className="gs-card p-10 text-center text-on-surface-variant">
        Select a leg to view.
      </div>
    )
  }

  const showRanks = phase === 'running' || phase === 'finished'

  return (
    <div className="gs-card overflow-hidden">
      {/* ── Thanh trạng thái ── */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-outline-variant/40 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="font-serif text-lg text-on-surface">Leg {leg.legNumber}</span>
          <PhaseBadge phase={phase} leg={leg} nowMs={nowMs} />
        </div>

        <div className="flex items-center gap-2">
          {phase === 'running' && (
            <>
              <button
                onClick={() => setSpeed((s) => (s === 1 ? 2 : 1))}
                className="gs-btn text-xs flex items-center gap-1.5 px-2.5 py-1.5"
                title="Change playback speed"
              >
                <Gauge className="w-3.5 h-3.5" />
                {speed}×
              </button>
              <button onClick={skip} className="gs-btn text-xs flex items-center gap-1.5 px-2.5 py-1.5">
                <SkipForward className="w-3.5 h-3.5" />
                Skip
              </button>
            </>
          )}
          {phase === 'finished' && trajectory && (
            <button onClick={replay} className="gs-btn text-xs flex items-center gap-1.5 px-2.5 py-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              Replay
            </button>
          )}
          {phase === 'countdown' && (
            <span className="font-mono text-xs text-on-surface-variant flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5" />
              Starting soon…
            </span>
          )}
        </div>
      </div>

      {/* ── Đường đua ── */}
      <div className="relative bg-surface-container-lowest">
        {entries?.length ? (
          <RaceTrack
            entries={entries}
            progressOf={progressOf}
            running={phase === 'running' || phase === 'pack'}
            showRanks={showRanks}
            highlightEntryId={highlightEntryId}
            finishedIds={finishedIds}
            dnfIds={visibleDnfIds}
          />
        ) : (
          <div className="p-10 text-center text-on-surface-variant text-sm">No horses entered in this leg.</div>
        )}

        {/* Đếm ngược */}
        {phase === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-container-lowest/70 backdrop-blur-[2px]">
            <span className="font-serif text-7xl text-secondary drop-shadow-lg">
              {Math.max(1, Math.ceil(-clock))}
            </span>
          </div>
        )}

        {/* Lớp phủ khi đang đua — lý do vì sao chưa có thứ hạng */}
        {phase === 'pack' && (
          <div className="absolute inset-x-0 bottom-0 px-4 py-2.5 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/85 to-transparent">
            <p className="text-xs text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              Racing — rankings only appear once <strong>both referees</strong> submit matching results.
              Horse positions on screen right now <strong>do not reflect</strong> the real order.
            </p>
          </div>
        )}

        {phase === 'waiting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-container-lowest/60">
            <p className="text-sm text-on-surface-variant">Leg hasn't started</p>
          </div>
        )}

        {phase === 'conflicted' && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-container-lowest/80 backdrop-blur-[2px] px-6">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <p className="text-on-surface font-medium">Result under review</p>
              <p className="text-xs text-on-surface-variant mt-1 max-w-md">
                The two referees submitted mismatched rankings. The race is paused until Admin resolves it.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Nhãn trung thực + bảng kết quả ── */}
      {(phase === 'running' || phase === 'finished') && (
        <div className="px-4 py-2 border-t border-outline-variant/40">
          <p className="text-[11px] text-on-surface-variant">
            Simulated replay — the finishing order matches the <strong>official result</strong> confirmed by
            both referees. The in-between action is reconstructed; the system doesn't record per-horse timing.
          </p>
        </div>
      )}

      {phase === 'finished' && results.length > 0 && (
        <ResultBoard entries={entries} results={results} highlightEntryId={highlightEntryId} />
      )}
    </div>
  )
}

// ─── Badge trạng thái ─────────────────────────────────────────────────────────

function PhaseBadge({ phase, leg, nowMs }) {
  if (phase === 'pack') {
    const elapsed = leg.startedAt ? nowMs - new Date(leg.startedAt).getTime() : null
    return (
      <span className="gs-badge bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center gap-1.5">
        <Radio className="w-3 h-3 pulse-live rounded-full" />
        Racing
        {elapsed != null && <span className="font-mono">{fmtElapsed(elapsed)}</span>}
      </span>
    )
  }
  if (phase === 'conflicted') {
    return <span className="gs-badge bg-orange-500/15 text-orange-400 border border-orange-500/25">Under review</span>
  }
  if (phase === 'countdown' || phase === 'running') {
    return <span className="gs-badge bg-primary/15 text-primary border border-primary/25">Replaying</span>
  }
  if (phase === 'finished') {
    return (
      <span className="gs-badge bg-surface-container-high text-on-surface-variant border border-outline-variant/50">
        {leg.confirmationType === 'AdminOverride' ? 'Admin resolved' : 'Confirmed'}
      </span>
    )
  }
  return <span className="gs-badge bg-surface-container-high text-on-surface-variant border border-outline-variant/50">Not started</span>
}

// ─── Bảng kết quả chặng ───────────────────────────────────────────────────────

function ResultBoard({ entries, results, highlightEntryId }) {
  const entryById = new Map(entries.map((e) => [e.entryId, e]))
  const sorted = [...results].sort(compareResults)
  const hasDq = sorted.some((r) => decodePosition(r.position).isDq)

  return (
    <div className="border-t border-outline-variant/40">
      <table className="admin-table w-full text-sm">
        <thead>
          <tr>
            <th className="w-16">Rank</th>
            <th>Horse</th>
            <th>Jockey</th>
            <th className="w-20 text-right">Points</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const e = entryById.get(r.entryId)
            const d = decodePosition(r.position)
            const silk = silkFor(e?.gateNumber, r.entryId)
            const isHi = highlightEntryId === r.entryId

            return (
              <tr key={r.entryId} className={isHi ? 'bg-secondary/8' : undefined}>
                <td>
                  {d.rank ? (
                    <span
                      className={`font-mono font-bold ${
                        d.rank === 1 ? 'text-secondary' : d.rank <= 3 ? 'text-on-surface' : 'text-on-surface-variant'
                      }`}
                    >
                      {d.rank}
                    </span>
                  ) : (
                    <span className="font-mono text-xs text-error">{d.isDq ? 'DQ' : 'DNF'}</span>
                  )}
                </td>
                <td>
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: silk.fill }} />
                    {e?.horseName ?? `#${r.entryId}`}
                    {e?.gateNumber != null && (
                      <span className="font-mono text-xs text-on-surface-variant">({e.gateNumber})</span>
                    )}
                    {isHi && <span className="gs-badge bg-secondary/15 text-secondary text-[10px]">Your bet</span>}
                  </span>
                </td>
                <td className="text-on-surface-variant">{e?.jockeyName ?? '—'}</td>
                <td className="text-right font-mono">{r.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {hasDq && (
        <p className="px-4 py-2 text-[11px] text-on-surface-variant border-t border-outline-variant/40">
          A <strong>DQ</strong>'d horse still runs the full leg — it's a post-race penalty, and the system
          doesn't record its physical position, so the simulation shows it finishing with the back group.
        </p>
      )}
    </div>
  )
}
