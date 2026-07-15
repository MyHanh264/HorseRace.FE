import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle, ChevronRight, Clock, PauseCircle, Radio, RefreshCw, Trophy,
} from 'lucide-react'
import { getAllRaces, getAllTournaments } from '../../api/spectator'

const LIVE_STATUSES = ['InProgress', 'Paused', 'PendingResult']
const POLL_MS = 30_000

const STATUS_META = {
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

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? {
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

export default function LiveRacesPage() {
  const navigate = useNavigate()
  const [races, setRaces] = useState([])
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const tournamentMap = useMemo(
    () => Object.fromEntries(tournaments.map(t => [t.tournamentId, t])),
    [tournaments],
  )

  const liveRaces = useMemo(
    () => races
      .filter(r => LIVE_STATUSES.includes(r.status))
      .sort((a, b) => new Date(a.scheduledAt || a.scheduledStartTime || 0) -
        new Date(b.scheduledAt || b.scheduledStartTime || 0)),
    [races],
  )

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError('')

    try {
      const [raceRows, tournamentRows] = await Promise.all([
        getAllRaces(),
        getAllTournaments(),
      ])
      setRaces(Array.isArray(raceRows) ? raceRows : [])
      setTournaments(Array.isArray(tournamentRows) ? tournamentRows : [])
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Không tải được danh sách cuộc đua trực tiếp.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    async function guardedLoad(options) {
      if (!active) return
      await load(options)
    }

    guardedLoad()
    const timer = setInterval(() => guardedLoad({ silent: true }), POLL_MS)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [load])

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div className="animate-fade-in-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center">
                <Radio className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold text-on-surface">Diễn biến Race trực tiếp</h1>
                <p className="text-on-surface-variant text-sm">
                  Theo dõi từng chặng sau khi kết quả được hai trọng tài xác nhận.
                </p>
              </div>
            </div>
            <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-amber-400 to-secondary mt-3" />
          </div>

          <button
            onClick={() => load({ silent: true })}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-outline-variant/40 text-sm text-on-surface-variant hover:text-on-surface hover:border-outline transition-all"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>

        {error && (
          <div className="mb-5 p-4 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          </div>
        ) : liveRaces.length === 0 ? (
          <div className="gs-card py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
              <Radio className="w-7 h-7 text-on-surface-variant/40" />
            </div>
            <p className="text-on-surface font-semibold mb-1">Hiện không có cuộc đua nào đang diễn ra.</p>
            <p className="text-on-surface-variant text-sm">
              Trang sẽ tự tải lại mỗi 30 giây khi có race bắt đầu.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {liveRaces.map((race, index) => {
              const tournament = tournamentMap[race.tournamentId]
              return (
                <button
                  key={race.raceId}
                  onClick={() => navigate(`/spectator/live/${race.raceId}`)}
                  className={`gs-card p-5 text-left hover:border-amber-400/35 hover:bg-surface-container transition-all animate-fade-in-up delay-row-${(index % 4) + 1}`}
                  style={{ opacity: 0, animationFillMode: 'forwards' }}
                >
                  <div className="flex items-start justify-between gap-3 mb-5">
                    <StatusBadge status={race.status} />
                    <ChevronRight className="w-4 h-4 text-on-surface-variant/50 shrink-0" />
                  </div>

                  <h2 className="font-serif font-bold text-on-surface text-lg leading-snug mb-1">
                    {race.name}
                  </h2>
                  <p className="text-xs text-on-surface-variant mb-4">
                    {tournament?.name ?? `Tournament #${race.tournamentId ?? '—'}`}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <Clock size={13} />
                    <span>{fmtDateTime(race.scheduledAt || race.scheduledStartTime)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
