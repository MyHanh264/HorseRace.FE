import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Radio, ChevronRight, ChevronLeft, Target } from 'lucide-react'
import { getAllRaces } from '../../api/spectator'

// Cùng vị từ "Live" mà RacesBettingPage đang dùng — hai trang phải hiểu giống nhau
// thế nào là một cuộc đua đang diễn ra.
const LIVE_STATUSES = ['InProgress', 'Paused', 'PendingResult']

// Race đang chạy (InProgress/Paused) lên trước PendingResult (đã xong, chỉ chờ công bố).
const STATUS_RANK = { InProgress: 0, Paused: 0, PendingResult: 1 }

const STATUS_META = {
  InProgress: { label: 'Live', cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/25' },
  Paused: { label: 'Paused', cls: 'bg-orange-500/15 text-orange-400 border border-orange-500/25' },
  PendingResult: { label: 'Pending Result', cls: 'bg-violet-500/15 text-violet-400 border border-violet-500/25' },
}

const PAGE_SIZE = 10

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
  const [page, setPage] = useState(1)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const all = await getAllRaces()
        if (!active) return
        const live = all
          .filter((r) => LIVE_STATUSES.includes(r.status))
          .sort((a, b) => {
            const rankDiff = (STATUS_RANK[a.status] ?? 2) - (STATUS_RANK[b.status] ?? 2)
            if (rankDiff !== 0) return rankDiff
            // Trong cùng nhóm trạng thái: race mới bắt đầu gần đây nhất lên trước.
            return new Date(b.scheduledStartTime ?? b.scheduledAt ?? 0)
              - new Date(a.scheduledStartTime ?? a.scheduledAt ?? 0)
          })
        setRaces(live)
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

  // Danh sách có thể co giãn theo mỗi lần poll (race chuyển trạng thái/kết thúc) — kẹp
  // lại trang hiện tại trong giới hạn hợp lệ để không bị kẹt ở 1 trang trống.
  const totalPages = Math.max(1, Math.ceil(races.length / PAGE_SIZE))
  const pageSafe = Math.min(page, totalPages)
  const paginated = races.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE)

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
        {paginated.map((r, i) => {
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

      {!loading && !error && races.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-on-surface-variant">
            Hiện {(pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(pageSafe * PAGE_SIZE, races.length)} / {races.length} cuộc đua
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe === 1}
              className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-40 flex items-center justify-center transition-all"
            >
              <ChevronLeft className="w-4 h-4 text-on-surface" />
            </button>
            <span className="text-xs text-on-surface font-mono px-2">
              {pageSafe} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageSafe === totalPages}
              className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-40 flex items-center justify-center transition-all"
            >
              <ChevronRight className="w-4 h-4 text-on-surface" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
