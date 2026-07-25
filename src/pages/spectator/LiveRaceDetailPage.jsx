import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Radio, WifiOff, Info } from 'lucide-react'
import { useRaceLiveHub } from '../../hooks/useRaceLiveHub'
import { useAuth } from '../../context/AuthContext'
import { getMyPredictions } from '../../api/spectator'
import RaceReplayPlayer from '../../components/live/RaceReplayPlayer'
import { silkFor } from '../../utils/raceSim'

const RACE_STATUS_META = {
  Scheduled: { label: 'Scheduled', cls: 'bg-primary/15 text-primary border border-primary/25' },
  InProgress: { label: 'Live', cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/25' },
  Paused: { label: 'Paused', cls: 'bg-orange-500/15 text-orange-400 border border-orange-500/25' },
  PendingResult: { label: 'Pending Result', cls: 'bg-violet-500/15 text-violet-400 border border-violet-500/25' },
  Finished: { label: 'Finished', cls: 'bg-surface-container-high text-on-surface-variant border border-outline-variant/50' },
}

function legTone(leg) {
  if (leg.isConflicted) return 'border-orange-500/40 text-orange-400'
  if (leg.isConfirmed) return 'border-primary/40 text-primary'
  if (leg.startedAt && !leg.isConfirmed) return 'border-amber-500/40 text-amber-400'
  return 'border-outline-variant/50 text-on-surface-variant'
}

function legIsRunning(leg) {
  return Boolean(leg?.startedAt && !leg?.isConfirmed && !leg?.isConflicted)
}

export default function LiveRaceDetailPage() {
  const { raceId } = useParams()
  const { user } = useAuth()
  const { snapshot, connState, error } = useRaceLiveHub(raceId)

  const [selectedLeg, setSelectedLeg] = useState(null) // null = bám leg hiện hành
  const [myBets, setMyBets] = useState([])

  // Cược của chính mình để làm nổi entry tương ứng trên đường đua.
  useEffect(() => {
    if (!user?.userId) return
    let active = true
    getMyPredictions(user.userId)
      .then((list) => {
        if (active) setMyBets(list.filter((p) => String(p.raceId) === String(raceId)))
      })
      .catch(() => {
        /* không có cược thì thôi — không phải lỗi chặn trang */
      })
    return () => {
      active = false
    }
  }, [user?.userId, raceId])

  const legs = snapshot?.legs ?? []
  const entries = snapshot?.entries ?? []

  // Mặc định bám leg hiện hành; người dùng bấm chọn thì tôn trọng lựa chọn đó.
  const activeLegNumber = selectedLeg ?? legs[snapshot?.currentLegIndex ?? 0]?.legNumber ?? legs[0]?.legNumber
  const activeLeg = legs.find((l) => l.legNumber === activeLegNumber) ?? null

  const highlightEntryId = useMemo(() => {
    const bet = myBets.find((b) => b.status === 'Pending' || b.status === 'Locked') ?? myBets[0]
    return bet?.firstEntryId ?? null
  }, [myBets])

  if (error && !snapshot) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <BackLink />
        <div className="gs-card p-8 text-center text-error text-sm mt-4">{error}</div>
      </div>
    )
  }

  if (!snapshot) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <BackLink />
        <div className="gs-card p-12 flex items-center justify-center mt-4">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const meta = RACE_STATUS_META[snapshot.status] ?? RACE_STATUS_META.Scheduled

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <BackLink />

      {/* ── Header ── */}
      <header className="mt-4 mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-serif text-2xl text-on-surface">{snapshot.raceName}</h1>
            <span className={`gs-badge ${meta.cls}`}>{meta.label}</span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            {snapshot.tournamentName} · {snapshot.confirmedLegCount}/{snapshot.totalLegs} chặng đã xác nhận
          </p>
        </div>

        <span
          className="text-xs flex items-center gap-1.5 text-on-surface-variant"
          title={
            connState === 'live'
              ? 'Đang nhận cập nhật tức thời qua SignalR'
              : 'Mất kết nối realtime — đang tự làm mới mỗi 30 giây'
          }
        >
          {connState === 'live' ? (
            <>
              <Radio className="w-3.5 h-3.5 text-primary" />
              Realtime
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              Tự làm mới 30s
            </>
          )}
        </span>
      </header>

      {/* ── Bộ chọn chặng ── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {legs.map((l) => (
          <button
            key={l.legNumber}
            onClick={() => setSelectedLeg(l.legNumber)}
            className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${legTone(l)} ${
              l.legNumber === activeLegNumber ? 'bg-surface-container-high' : 'hover:bg-surface-container'
            }`}
          >
            Chặng {l.legNumber}
            {l.isConfirmed && ' ✓'}
            {legIsRunning(l) && ' •'}
          </button>
        ))}
        {selectedLeg != null && (
          <button
            onClick={() => setSelectedLeg(null)}
            className="text-xs text-on-surface-variant underline underline-offset-2 hover:text-on-surface"
          >
            bám chặng hiện tại
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">
        <RaceReplayPlayer
          key={`${raceId}:${activeLegNumber}`}
          raceId={raceId}
          leg={activeLeg}
          entries={entries}
          highlightEntryId={highlightEntryId}
        />

        <ProvisionalStandings standings={snapshot.standings ?? []} highlightEntryId={highlightEntryId} />
      </div>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/spectator/live"
      className="text-sm text-on-surface-variant hover:text-on-surface flex items-center gap-1.5 w-fit"
    >
      <ArrowLeft className="w-4 h-4" />
      Tất cả cuộc đua
    </Link>
  )
}

/**
 * Bảng xếp hạng TẠM TÍNH.
 *
 * GetRaceLive dùng công thức khác RaceRankingCalculator lúc publish (không xử lý
 * DQ, không tie-break theo chặng cuối) — chính BE ghi chú rằng FE phải gắn nhãn
 * đúng như vậy. Đừng bỏ dòng chú thích bên dưới.
 */
function ProvisionalStandings({ standings, highlightEntryId }) {
  return (
    <aside className="gs-card overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant/40">
        <h2 className="font-serif text-base text-on-surface">Xếp hạng tạm tính</h2>
      </div>

      {standings.length === 0 ? (
        <p className="px-4 py-6 text-sm text-on-surface-variant text-center">Chưa có chặng nào được xác nhận.</p>
      ) : (
        <ul className="divide-y divide-outline-variant/30">
          {standings.map((s) => {
            const silk = silkFor(s.gateNumber, s.entryId)
            const isHi = highlightEntryId === s.entryId
            return (
              <li
                key={s.entryId}
                className={`px-4 py-2.5 flex items-center gap-3 ${isHi ? 'bg-secondary/8' : ''}`}
              >
                <span
                  className={`font-mono text-sm w-5 text-right ${
                    s.position === 1 ? 'text-secondary font-bold' : 'text-on-surface-variant'
                  }`}
                >
                  {s.position}
                </span>
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: silk.fill }} />
                <span className="flex-1 min-w-0 truncate text-sm text-on-surface">{s.horseName}</span>
                <span className="font-mono text-sm text-on-surface">{s.totalPoints}</span>
              </li>
            )
          })}
        </ul>
      )}

      <p className="px-4 py-2.5 text-[11px] text-on-surface-variant border-t border-outline-variant/40 flex gap-1.5">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
        <span>
          Chỉ tính các chặng đã xác nhận và <strong>chưa áp dụng</strong> án phạt DQ hay tie-break chặng cuối.
          Kết quả chính thức được chốt khi Admin công bố.
        </span>
      </p>
    </aside>
  )
}
