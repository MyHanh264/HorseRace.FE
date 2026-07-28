import { useCallback, useEffect, useMemo, useState } from 'react'
import { X, TrendingUp, AlertTriangle, Info } from 'lucide-react'
import { getRaceOddsBoard } from '../api/admin'

// Bảng ODDS của Admin (Flow 3 + 7) — CHỈ ĐỂ XEM, mở được sau khi đóng đăng ký.
//
// Odds là MỘT con số: BE tính từ lịch sử thắng của ngựa đúng lúc đóng đăng ký rồi giữ nguyên
// tới hết cuộc đua. Không ai sửa được, kể cả Admin — nên modal này không có ô nhập và không
// có nút Save/Publish/Lock. Nó tồn tại để Admin đối chiếu cơ sở tính toán (số lần về nhất /
// tổng số lần đua) và xem cược đang đổ vào con nào.
//
// Con số ở đây bằng ĐÚNG con số spectator nhìn thấy và bị khóa vào lệnh cược.

function errText(err, fallback) {
  return (
    err?.response?.data?.detail ??
    err?.response?.data?.title ??
    err?.response?.data?.message ??
    err?.message ??
    fallback
  )
}

function fmtOdds(n) {
  const v = Number(n)
  return Number.isFinite(v) && v > 0 ? v.toFixed(2) : '—'
}

function fmtDateTime(dt) {
  if (!dt) return null
  const d = new Date(dt)
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

export default function OddsBoardModal({ raceId, raceName, onClose }) {
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setBoard(await getRaceOddsBoard(raceId))
    } catch (err) {
      setError(errText(err, 'Failed to load the odds board.'))
    } finally {
      setLoading(false)
    }
  }, [raceId])

  useEffect(() => { load() }, [load])

  const entries = useMemo(() => board?.entries ?? [], [board])

  // Odds thấp nhất = con máy chấm khả năng thắng cao nhất.
  const favouriteOdds = useMemo(() => {
    const valid = entries.map(e => Number(e.odds)).filter(v => Number.isFinite(v) && v > 0)
    return valid.length ? Math.min(...valid) : null
  }, [entries])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-[820px] gs-card overflow-hidden max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <TrendingUp size={17} className="text-yellow-400" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-on-surface text-sm">Odds Board</h2>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold border bg-white/5 text-on-surface-variant border-white/15">
                  Read-only
                </span>
              </div>
              {raceName && <p className="text-xs text-on-surface-variant">{raceName}</p>}
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-sky-500/8 border border-sky-500/20 text-xs text-on-surface-variant mb-4">
            <Info size={14} className="text-sky-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Odds are calculated automatically from each horse's historical win rate when
              registration closes, and stay fixed for the rest of the race — nobody can edit them.
              This is the same number spectators bet against, so every payout is exactly{' '}
              <span className="font-mono text-on-surface">stake × odds</span>.
            </p>
          </div>

          {error && (
            <div className="mb-3 p-3 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" />{error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-sm text-on-surface-variant">
              No approved entries — close registration first.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-surface-container-high">
                    {['Gate', 'Horse / Jockey', 'Career 1st', 'Odds', 'Bets'].map((h, i) => (
                      <th key={h}
                        className={`text-[11px] font-bold uppercase tracking-widest text-on-surface-variant px-3 py-2.5 border-b border-outline-variant whitespace-nowrap ${
                          i >= 2 ? 'text-right' : 'text-left'
                        }`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => {
                    const odds = Number(e.odds)
                    const isFavourite = favouriteOdds != null && odds === favouriteOdds

                    return (
                      <tr key={e.entryId} className="border-b border-outline-variant/40 last:border-b-0">
                        <td className="px-3 py-2.5 text-on-surface-variant font-mono">{e.gateNumber ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-on-surface leading-tight">{e.horseName ?? `Entry #${e.entryId}`}</p>
                          <p className="text-xs text-on-surface-variant mt-0.5">{e.jockeyName ?? '—'}</p>
                        </td>
                        <td className="px-3 py-2.5 text-right text-on-surface-variant whitespace-nowrap">
                          {e.careerFirsts}/{e.careerRaces}
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <span className="font-mono font-bold text-secondary">{fmtOdds(e.odds)}x</span>
                          {isFavourite && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              Fav
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right text-on-surface-variant whitespace-nowrap">
                          {e.betCount > 0
                            ? <span>{e.betCount} · <span className="font-mono">{Number(e.betPool).toLocaleString('en-US')}</span> pts</span>
                            : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && entries.length > 0 && board?.oddsComputedAt && (
            <p className="mt-3 text-xs text-on-surface-variant">
              Calculated at {fmtDateTime(board.oddsComputedAt)} when registration closed.
              Betting has been open to spectators since then and closes when the race starts.
              <span className="block mt-1 opacity-80">
                Bet counts are informational only — they never move the odds.
              </span>
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-outline-variant/40 px-5 py-3.5 flex items-center justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg border border-white/15 text-xs text-on-surface-variant hover:text-on-surface transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
