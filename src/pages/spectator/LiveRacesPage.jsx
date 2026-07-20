import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Radio, ChevronRight, Target } from 'lucide-react'
import { getAllRaces } from '../../api/spectator'

// Cùng vị từ "Live" mà RacesBettingPage đang dùng — hai trang phải hiểu giống nhau
// thế nào là một cuộc đua đang diễn ra.
const LIVE_STATUSES = ['InProgress', 'Paused', 'PendingResult']

const STATUS_META = {
  InProgress: { label: 'Live', cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/25' },
  Paused: { label: 'Paused', cls: 'bg-orange-500/15 text-orange-400 border border-orange-500/25' },
  PendingResult: { label: 'Pending Result', cls: 'bg-violet-500/15 text-violet-400 border border-violet-500/25' },
}

function fmtTime(dt) {
  if (!dt) return '—'
  const d = new Date(dt)
  const isToday = d.toDateString() === new Date().toDateString()
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return isToday ? `Hôm nay, ${time}` : `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${time}`
}

export default function LiveRacesPage() {
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const all = await getAllRaces()
        if (!active) return
        setRaces(all.filter((r) => LIVE_STATUSES.includes(r.status)))
        setError(null)
      } catch (e) {
        if (active) setError(e?.response?.data?.message || e.message || 'Không tải được danh sách cuộc đua')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    const id = setInterval(() => {
      if (!document.hidden) load()
    }, 30_000)

    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="font-serif text-2xl text-on-surface flex items-center gap-2.5">
          <Radio className="w-6 h-6 text-primary" />
          Live Race
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Theo dõi diễn biến các cuộc đua đang diễn ra. Mỗi chặng được phát lại bằng mô phỏng ngay khi
          hai trọng tài xác nhận kết quả.
        </p>
      </header>

      {loading && (
        <div className="gs-card p-10 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {error && !loading && (
        <div className="gs-card p-6 text-sm text-error">{error}</div>
      )}

      {!loading && !error && races.length === 0 && (
        <div className="gs-card p-10 text-center">
          <Radio className="w-8 h-8 text-outline mx-auto mb-3" />
          <p className="text-on-surface">Hiện không có cuộc đua nào đang diễn ra</p>
          <p className="text-sm text-on-surface-variant mt-1 mb-4">
            Quay lại khi có cuộc đua bắt đầu, hoặc đặt cược trước cho các chặng sắp tới.
          </p>
          <Link to="/spectator/races" className="gs-btn gs-btn-primary inline-flex items-center gap-2 text-sm">
            <Target className="w-4 h-4" />
            Xem lịch & đặt cược
          </Link>
        </div>
      )}

      <div className="grid gap-3">
        {races.map((r, i) => {
          const meta = STATUS_META[r.status] ?? STATUS_META.InProgress
          return (
            <Link
              key={r.raceId}
              to={`/spectator/live/${r.raceId}`}
              className="gs-card p-4 flex items-center justify-between gap-4 hover:border-primary/40 transition-colors animate-fade-in-up"
              style={{ opacity: 0, animationFillMode: 'forwards', animationDelay: `${i * 60}ms` }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-serif text-lg text-on-surface truncate">{r.name}</span>
                  <span className={`gs-badge ${meta.cls}`}>{meta.label}</span>
                </div>
                <p className="text-sm text-on-surface-variant mt-1">
                  {r.tournamentName ?? `Giải #${r.tournamentId}`} · {r.numberOfLegs} chặng ·{' '}
                  <span className="font-mono">{fmtTime(r.scheduledStartTime ?? r.scheduledAt)}</span>
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-outline flex-shrink-0" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
