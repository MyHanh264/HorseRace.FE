import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle, CheckCircle2, ChevronLeft, CircleDot, Clock, Eye, Flag,
  Loader2, PauseCircle, Radio, RefreshCw, Trophy, Wifi, WifiOff,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  getMyPredictions,
  getPredictionDetail,
  getRaceLive,
  getRaceResults,
  getRaceStandings,
} from '../../api/spectator'
import RaceResultsModal from '../../components/RaceResultsModal'
import {
  RACE_LIVE_CONNECTION,
  useRaceLiveHub,
} from '../../hooks/useRaceLiveHub'

const POLL_MS = 30_000

const RACE_STATUS_META = {
  Scheduled: {
    label: 'Chưa bắt đầu',
    cls: 'bg-primary/15 text-primary border-primary/30',
    icon: Clock,
  },
  InProgress: {
    label: 'Đang diễn ra',
    cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: Radio,
  },
  Paused: {
    label: 'Tạm dừng',
    cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    icon: PauseCircle,
  },
  PendingResult: {
    label: 'Chờ công bố',
    cls: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    icon: Trophy,
  },
  Finished: {
    label: 'Đã kết thúc',
    cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: CheckCircle2,
  },
}

const CONNECTION_META = {
  [RACE_LIVE_CONNECTION.CONNECTED]: {
    label: 'Trực tiếp',
    cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: Wifi,
  },
  [RACE_LIVE_CONNECTION.RECONNECTING]: {
    label: 'Đang kết nối lại…',
    cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: RefreshCw,
  },
  [RACE_LIVE_CONNECTION.CONNECTING]: {
    label: 'Đang kết nối…',
    cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    icon: Loader2,
  },
  [RACE_LIVE_CONNECTION.DISCONNECTED]: {
    label: 'Mất kết nối - tải lại mỗi 30s',
    cls: 'bg-surface-container-high text-on-surface-variant border-outline-variant/50',
    icon: WifiOff,
  },
}

function fmtDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isNewerSnapshot(prev, next) {
  if (!prev) return true
  const prevTime = Date.parse(prev.snapshotAt)
  const nextTime = Date.parse(next?.snapshotAt)
  if (!Number.isFinite(prevTime) || !Number.isFinite(nextTime)) return true
  return nextTime >= prevTime
}

function formatPosition(position) {
  if (position === -1) return 'DNF'
  if (position === -2) return 'DQ'
  return position > 0 ? `#${position}` : '—'
}

function RaceStatusBadge({ status }) {
  const meta = RACE_STATUS_META[status] ?? {
    label: status ?? '—',
    cls: 'bg-surface-container-high text-on-surface-variant border-outline-variant/50',
    icon: Clock,
  }
  const Icon = meta.icon

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${meta.cls}`}>
      <Icon size={12} />
      {meta.label}
    </span>
  )
}

function ConnectionPill({ state }) {
  const meta = CONNECTION_META[state] ?? CONNECTION_META[RACE_LIVE_CONNECTION.DISCONNECTED]
  const Icon = meta.icon

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${meta.cls}`}>
      <Icon
        size={12}
        className={
          state === RACE_LIVE_CONNECTION.CONNECTING ||
          state === RACE_LIVE_CONNECTION.RECONNECTING
            ? 'animate-spin'
            : ''
        }
      />
      {meta.label}
    </span>
  )
}

function legDisplayMeta(leg) {
  if (leg.status === 'Confirmed') {
    return { label: 'Đã xác nhận', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' }
  }
  if (leg.status === 'Resolved') {
    return { label: 'Admin quyết định', cls: 'bg-purple-500/15 text-purple-400 border-purple-500/30', dot: 'bg-purple-400' }
  }
  if (leg.status === 'Conflicted') {
    return { label: 'Đang xem xét', cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30', dot: 'bg-orange-400 animate-pulse' }
  }
  if (leg.status === 'Pending' || leg.status === 'AwaitingSecondReferee') {
    return { label: 'Đang đua…', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: 'bg-amber-400 animate-pulse' }
  }
  return { label: leg.status ?? '—', cls: 'bg-surface-container-high text-on-surface-variant border-outline-variant/50', dot: 'bg-on-surface-variant' }
}

function LegProgress({ legs, currentLegIndex }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {legs.map((leg) => {
        const meta = legDisplayMeta(leg)
        const isActive = leg.legIndex === currentLegIndex

        return (
          <div
            key={leg.legIndex}
            className={`shrink-0 flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border min-w-[96px] ${
              isActive
                ? 'border-amber-400/50 bg-amber-400/5 shadow-lg shadow-amber-400/10'
                : 'border-outline-variant/30 bg-surface-container-low'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${meta.cls}`}>
              {leg.isConfirmed ? <CheckCircle2 size={14} /> : leg.isConflicted ? <AlertCircle size={14} /> : leg.legNumber}
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-on-surface">Leg {leg.legNumber}</p>
              <p className={`text-[10px] ${isActive ? 'text-amber-400' : 'text-on-surface-variant'}`}>
                {meta.label}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ResultTable({ results, entryMap, myEntryId }) {
  return (
    <div className="overflow-x-auto">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Hạng</th>
            <th>Cổng</th>
            <th>Ngựa</th>
            <th>Nài</th>
            <th>Điểm</th>
          </tr>
        </thead>
        <tbody>
          {results.map((row) => {
            const entry = entryMap.get(row.entryId)
            const isMine = Number(myEntryId) === row.entryId

            return (
              <tr
                key={row.entryId}
                className={isMine ? 'border-l-2 border-l-secondary bg-secondary/5' : ''}
              >
                <td>
                  <span className={`font-mono text-sm font-bold ${row.position < 0 ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                    {formatPosition(row.position)}
                  </span>
                </td>
                <td className="text-sm text-on-surface-variant">{entry?.gateNumber ?? '—'}</td>
                <td>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-on-surface">
                      {entry?.horseName ?? `Entry #${row.entryId}`}
                    </span>
                    {isMine && (
                      <span className="w-fit text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/25">
                        Cược của bạn
                      </span>
                    )}
                  </div>
                </td>
                <td className="text-sm text-on-surface-variant">{entry?.jockeyName ?? '—'}</td>
                <td className="text-sm font-mono font-bold text-amber-400">{row.points}p</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function LegCard({ leg, raceStatus, currentLegIndex, entryMap, myEntryId }) {
  const meta = legDisplayMeta(leg)
  const isCurrent = leg.legIndex === currentLegIndex
  const isRacing = raceStatus === 'InProgress' && (isCurrent || leg.status === 'AwaitingSecondReferee')

  return (
    <div className="gs-card overflow-hidden">
      <div className="px-5 py-4 border-b border-outline-variant/40 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-on-surface text-sm">Leg {leg.legNumber}</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {leg.confirmedAt ? `Chốt lúc ${fmtDateTime(leg.confirmedAt)}` : 'Cập nhật khi chặng được xác nhận'}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${meta.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      {leg.isConfirmed ? (
        <ResultTable results={leg.results ?? []} entryMap={entryMap} myEntryId={myEntryId} />
      ) : leg.isConflicted ? (
        <div className="p-6 text-center">
          <AlertCircle className="w-10 h-10 text-orange-400 mx-auto mb-3" />
          <p className="text-on-surface font-semibold mb-1">Đang xem xét</p>
          <p className="text-sm text-on-surface-variant">
            Cuộc đua tạm dừng chờ Admin xử lý chênh lệch kết quả.
          </p>
        </div>
      ) : (
        <div className="p-6 text-center">
          {isRacing ? (
            <>
              <CircleDot className="w-10 h-10 text-amber-400 mx-auto mb-3 animate-pulse" />
              <p className="text-on-surface font-semibold mb-1">Đang đua…</p>
              <p className="text-sm text-on-surface-variant">
                Vị trí chỉ hiển thị sau khi chặng được xác nhận.
              </p>
            </>
          ) : (
            <>
              <Clock className="w-10 h-10 text-on-surface-variant/40 mx-auto mb-3" />
              <p className="text-on-surface font-semibold mb-1">Chưa bắt đầu</p>
              <p className="text-sm text-on-surface-variant">
                Chặng này sẽ mở sau các chặng trước.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function StandingsPanel({ standings, myEntryId }) {
  return (
    <div className="gs-card overflow-hidden">
      <div className="px-5 py-4 border-b border-outline-variant/40">
        <h3 className="font-semibold text-on-surface text-sm flex items-center gap-2">
          <Trophy size={14} className="text-amber-400" />
          Xếp hạng tạm tính
        </h3>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Cập nhật sau mỗi chặng được xác nhận
        </p>
      </div>

      {standings.length === 0 ? (
        <div className="p-8 text-center text-on-surface-variant text-sm">
          Chưa có điểm chính thức.
        </div>
      ) : (
        <div className="divide-y divide-outline-variant/30">
          {standings.map((row, index) => {
            const isMine = Number(myEntryId) === row.entryId
            return (
              <div
                key={row.entryId}
                className={`px-5 py-3 flex items-center gap-4 ${isMine ? 'border-l-2 border-l-secondary bg-secondary/5' : ''}`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
                    : index === 1 ? 'bg-gray-300/20 text-gray-300 border border-gray-300/30'
                    : index === 2 ? 'bg-orange-400/20 text-orange-400 border border-orange-400/30'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}>
                  {row.position ?? index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-on-surface truncate">
                      {row.horseName || `Entry #${row.entryId}`}
                    </p>
                    {isMine && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/25">
                        Cược của bạn
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-on-surface-variant">
                    Cổng {row.gateNumber ?? '—'} · Nài {row.jockeyName || '—'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-amber-400 font-mono">{row.totalPoints}p</p>
                  <p className="text-[10px] text-on-surface-variant">
                    {row.legWins ?? 0} chặng nhất
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function LiveRaceDetailPage() {
  const { raceId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const numericRaceId = Number(raceId)
  const userId = user?.userId

  const [snapshot, setSnapshot] = useState(null)
  const [myEntryId, setMyEntryId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [showResults, setShowResults] = useState(false)

  const applySnapshot = useCallback((next) => {
    if (!next) return
    setSnapshot(prev => (isNewerSnapshot(prev, next) ? next : prev))
  }, [])

  const loadSnapshot = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError('')

    try {
      const next = await getRaceLive(numericRaceId)
      applySnapshot(next)
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Không tải được diễn biến race.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [applySnapshot, numericRaceId])

  const loadMyEntry = useCallback(async () => {
    if (!userId || !Number.isFinite(numericRaceId)) return

    try {
      const predictions = await getMyPredictions(userId)
      const prediction = (predictions ?? []).find(p =>
        p.raceId === numericRaceId && p.status !== 'Cancelled')

      if (!prediction) {
        setMyEntryId(null)
        return
      }

      const detail = await getPredictionDetail(prediction.predictionId).catch(() => null)
      const entryId =
        detail?.firstEntryId ??
        detail?.entryId ??
        detail?.firstEntry?.entryId ??
        prediction.firstEntryId ??
        null

      setMyEntryId(entryId ? Number(entryId) : null)
    } catch {
      setMyEntryId(null)
    }
  }, [numericRaceId, userId])

  useEffect(() => {
    let active = true

    async function loadInitial() {
      await Promise.all([
        loadSnapshot(),
        loadMyEntry(),
      ])
      if (!active) return
    }

    loadInitial()
    return () => { active = false }
  }, [loadMyEntry, loadSnapshot])

  useEffect(() => {
    const timer = setInterval(() => {
      loadSnapshot({ silent: true })
    }, POLL_MS)

    return () => clearInterval(timer)
  }, [loadSnapshot])

  const onHubSnapshot = useCallback((next) => {
    applySnapshot(next)
  }, [applySnapshot])

  const onHubResync = useCallback(() => {
    loadSnapshot({ silent: true })
  }, [loadSnapshot])

  const { connectionState } = useRaceLiveHub(raceId, {
    onSnapshot: onHubSnapshot,
    onResync: onHubResync,
  })

  const entryMap = useMemo(
    () => new Map((snapshot?.entries ?? []).map(entry => [entry.entryId, entry])),
    [snapshot?.entries],
  )

  if (loading && !snapshot) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-amber-400 animate-spin mx-auto mb-4" />
          <p className="text-on-surface-variant text-sm">Đang tải diễn biến race...</p>
        </div>
      </div>
    )
  }

  if (error && !snapshot) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/spectator/live')}
            className="mb-6 w-9 h-9 rounded-xl border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:border-outline transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="gs-card p-8 text-center">
            <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
            <p className="text-error font-semibold mb-2">{error}</p>
            <button onClick={() => loadSnapshot()} className="gs-btn gs-btn-primary mt-4">
              Thử lại
            </button>
          </div>
        </div>
      </div>
    )
  }

  const legs = snapshot?.legs ?? []
  const standings = snapshot?.standings ?? []

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/spectator/live')}
            className="w-9 h-9 rounded-xl border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:border-outline transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center">
            <Flag size={20} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-2xl font-bold text-on-surface truncate">
              {snapshot?.raceName ?? `Race #${raceId}`}
            </h1>
            <p className="text-xs text-on-surface-variant truncate">
              {snapshot?.tournamentName ?? '—'}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => loadSnapshot({ silent: true })}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors px-3 py-1.5 rounded-lg border border-outline-variant/40 hover:border-outline"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              Làm mới
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-4 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="gs-card p-5 sm:p-6 mb-6" style={{ borderLeft: '3px solid rgba(251,191,36,0.6)' }}>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <RaceStatusBadge status={snapshot?.status} />
                <ConnectionPill state={connectionState} />
              </div>
              <h2 className="font-serif text-3xl font-bold text-on-surface mb-2">
                {snapshot?.raceName ?? `Race #${raceId}`}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-sm text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {fmtDateTime(snapshot?.scheduledStartTime)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Trophy size={14} />
                  {snapshot?.confirmedLegCount ?? 0}/{snapshot?.totalLegs ?? 0} chặng đã chốt
                </span>
                <span className="flex items-center gap-1.5">
                  <Flag size={14} />
                  {snapshot?.entries?.length ?? 0} entry
                </span>
              </div>
            </div>

            {snapshot?.status === 'Finished' && (
              <button
                onClick={() => setShowResults(true)}
                className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-yellow-400/30 bg-yellow-400/10 text-yellow-400 font-semibold text-sm hover:bg-yellow-400/15 transition-all"
              >
                <Eye size={15} />
                Xem kết quả chính thức
              </button>
            )}
          </div>
        </div>

        {snapshot?.status === 'Scheduled' ? (
          <div className="gs-card p-10 text-center mb-6">
            <Clock className="w-12 h-12 text-primary/70 mx-auto mb-4" />
            <p className="text-on-surface font-semibold mb-1">Cuộc đua chưa bắt đầu.</p>
            <p className="text-on-surface-variant text-sm">
              Khi race chuyển sang đang diễn ra, từng chặng sẽ xuất hiện tại đây sau khi được xác nhận.
            </p>
          </div>
        ) : legs.length > 0 && (
          <div className="gs-card p-5 mb-6">
            <h3 className="text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
              <Radio size={14} className="text-amber-400" />
              Tiến trình chặng
            </h3>
            <LegProgress legs={legs} currentLegIndex={snapshot?.currentLegIndex ?? 0} />
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
          <div className="space-y-5">
            {legs.map(leg => (
              <LegCard
                key={leg.legIndex}
                leg={leg}
                raceStatus={snapshot?.status}
                currentLegIndex={snapshot?.currentLegIndex ?? 0}
                entryMap={entryMap}
                myEntryId={myEntryId}
              />
            ))}
          </div>

          <div className="space-y-5">
            <StandingsPanel standings={standings} myEntryId={myEntryId} />

            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/40">
              <p className="text-xs text-on-surface-variant text-center">
                <span className="font-semibold text-on-surface">Cách tính điểm chặng:</span>{' '}
                1st = 6 · 2nd = 5 · 3rd = 4 · 4th = 3 · 5th = 2 · 6th = 1 · 7th+ / DNF / DQ = 0
              </p>
            </div>
          </div>
        </div>

        {showResults && (
          <RaceResultsModal
            raceId={numericRaceId}
            raceName={snapshot?.raceName}
            onClose={() => setShowResults(false)}
            fetchStandings={getRaceStandings}
            fetchResults={getRaceResults}
          />
        )}
      </div>
    </div>
  )
}
