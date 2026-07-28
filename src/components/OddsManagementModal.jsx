import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  X, TrendingUp, AlertTriangle, Lock, Megaphone, RotateCcw, Save, CheckCircle, Info,
} from 'lucide-react'
import {
  getRaceOddsBoard, updateRaceOdds, publishRaceOdds, lockRaceBetting,
} from '../api/admin'

// Modal điều chỉnh ODDS của Admin (Flow 3 + 7) — mở được sau khi đóng đăng ký.
//
// Hai cột số, hai vai trò khác nhau:
//   • ODDS ĐỀ XUẤT  — BE tính từ lịch sử thắng của ngựa lúc đóng đăng ký. Chỉ Admin thấy.
//   • ODDS CÔNG BỐ  — giá spectator thật sự cược, mặc định = đề xuất − 10% (biên nhà cái).
//
// Thứ tự thao tác BE ép: Save (nếu có sửa) → Publish Odds (mở cửa cược) → Lock Betting
// (đóng sổ) → mới Start Race được. Đây cũng là thứ tự các nút trong footer.

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

export default function OddsManagementModal({ raceId, raceName, onClose, onChanged }) {
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')          // '' | 'save' | 'publish' | 'lock'
  // entryId → { suggested: string, published: string } — giữ dạng chuỗi để người dùng gõ dở
  // ("1." , "" ) không bị ép về số giữa chừng.
  const [draft, setDraft] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getRaceOddsBoard(raceId)
      setBoard(data)
      const next = {}
      for (const e of data.entries ?? []) {
        next[e.entryId] = {
          suggested: String(e.suggestedOdds ?? ''),
          published: String(e.publishedOdds ?? ''),
        }
      }
      setDraft(next)
    } catch (err) {
      setError(errText(err, 'Failed to load the odds board.'))
    } finally {
      setLoading(false)
    }
  }, [raceId])

  useEffect(() => { load() }, [load])

  const entries    = useMemo(() => board?.entries ?? [], [board])
  const canEdit    = Boolean(board?.canEdit)
  const isPublished = Boolean(board?.oddsPublishedAt)
  const isLocked   = Boolean(board?.bettingLockedAt)
  const margin     = Number(board?.houseMarginPercent ?? 10)
  const minOdds    = Number(board?.minOdds ?? 1.01)
  const maxOdds    = Number(board?.maxOdds ?? 25)

  const setField = (entryId, field, value) => {
    setNotice('')
    setDraft(prev => ({ ...prev, [entryId]: { ...prev[entryId], [field]: value } }))
  }

  // Đặt lại giá công bố về đúng công thức mặc định cho giá đề xuất ĐANG gõ trong ô bên trái,
  // không phải cho giá đang lưu ở DB — nếu không, bấm "reset" sau khi sửa đề xuất sẽ ra một số
  // không liên quan tới cái người dùng vừa nhập.
  const resetPublished = (entryId) => {
    const suggested = Number(draft[entryId]?.suggested)
    if (!Number.isFinite(suggested) || suggested <= 0) return
    const recomputed = Math.min(
      Math.max(Math.round(suggested * (1 - margin / 100) * 100) / 100, minOdds),
      maxOdds,
    )
    setField(entryId, 'published', recomputed.toFixed(2))
  }

  const resetAll = () => {
    entries.forEach(e => resetPublished(e.entryId))
  }

  const validation = useMemo(() => {
    for (const e of entries) {
      const d = draft[e.entryId] ?? {}
      const s = Number(d.suggested)
      const p = Number(d.published)
      if (!Number.isFinite(s) || s < minOdds || s > maxOdds)
        return `${e.horseName ?? `Entry #${e.entryId}`}: suggested odds must be between ${minOdds.toFixed(2)} and ${maxOdds.toFixed(2)}.`
      if (!Number.isFinite(p) || p < minOdds || p > maxOdds)
        return `${e.horseName ?? `Entry #${e.entryId}`}: published odds must be between ${minOdds.toFixed(2)} and ${maxOdds.toFixed(2)}.`
    }
    return null
  }, [entries, draft, minOdds, maxOdds])

  const isDirty = useMemo(() => entries.some(e => {
    const d = draft[e.entryId] ?? {}
    return Number(d.suggested) !== Number(e.suggestedOdds)
      || Number(d.published) !== Number(e.publishedOdds)
  }), [entries, draft])

  const save = async () => {
    if (validation) { setError(validation); return null }
    setBusy('save'); setError(''); setNotice('')
    try {
      await updateRaceOdds(raceId, entries.map(e => ({
        entryId: e.entryId,
        suggestedOdds: Number(draft[e.entryId]?.suggested),
        publishedOdds: Number(draft[e.entryId]?.published),
      })))
      await load()
      onChanged?.()
      setNotice('Odds saved.')
      return true
    } catch (err) {
      setError(errText(err, 'Failed to save the odds.'))
      return false
    } finally {
      setBusy('')
    }
  }

  const publish = async () => {
    // Publish mà bỏ quên phần vừa sửa thì spectator nhận giá cũ — lưu trước, im lặng.
    if (isDirty) {
      const ok = await save()
      if (!ok) return
    }
    setBusy('publish'); setError(''); setNotice('')
    try {
      await publishRaceOdds(raceId)
      await load()
      onChanged?.()
      setNotice('Odds published — spectators can bet now.')
    } catch (err) {
      setError(errText(err, 'Failed to publish the odds.'))
    } finally {
      setBusy('')
    }
  }

  const lock = async () => {
    setBusy('lock'); setError(''); setNotice('')
    try {
      const res = await lockRaceBetting(raceId)
      await load()
      onChanged?.()
      setNotice(`Betting locked${res?.lockedPredictions ? ` — ${res.lockedPredictions} bet(s) locked in` : ''}. You can start the race now.`)
    } catch (err) {
      setError(errText(err, 'Failed to lock betting.'))
    } finally {
      setBusy('')
    }
  }

  const stage = isLocked ? 'locked' : isPublished ? 'published' : 'draft'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-[920px] gs-card overflow-hidden max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <TrendingUp size={17} className="text-yellow-400" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-on-surface text-sm">Odds Management</h2>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${
                  stage === 'locked'    ? 'bg-red-500/15 text-red-400 border-red-500/30'
                  : stage === 'published' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }`}>
                  {stage === 'locked' ? 'Betting locked'
                    : stage === 'published' ? 'Published — betting open'
                    : 'Draft — not visible to spectators'}
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
              <span className="text-on-surface font-semibold">Suggested odds</span> come from each
              horse's historical win rate and stay internal.{' '}
              <span className="text-on-surface font-semibold">Published odds</span> are what
              spectators bet against — the default is suggested minus{' '}
              <span className="text-on-surface font-semibold">{margin}%</span> so the house keeps a
              margin. The published number is locked into every bet exactly as shown, so a
              spectator's payout is always <span className="font-mono text-on-surface">stake × published odds</span>.
            </p>
          </div>

          {error && (
            <div className="mb-3 p-3 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" />{error}
            </div>
          )}
          {notice && (
            <div className="mb-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm flex items-center gap-2">
              <CheckCircle size={14} className="shrink-0" />{notice}
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
                    {['Gate', 'Horse / Jockey', 'Career 1st', 'Suggested odds', 'Published odds', 'Bets'].map((h, i) => (
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
                    const d = draft[e.entryId] ?? {}
                    const published = Number(d.published)
                    const suggested = Number(d.suggested)
                    // Giá công bố cao hơn đề xuất = nhà cái trả nhiều hơn mức "công bằng" —
                    // hợp lệ, nhưng Admin nên biết mình đang làm thế.
                    const noMargin = Number.isFinite(published) && Number.isFinite(suggested)
                      && published >= suggested

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
                        <td className="px-3 py-2.5 text-right">
                          <input
                            type="number" step="0.01" min={minOdds} max={maxOdds}
                            value={d.suggested ?? ''}
                            disabled={!canEdit || Boolean(busy)}
                            onChange={ev => setField(e.entryId, 'suggested', ev.target.value)}
                            className="w-24 text-right bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-2.5 py-1.5 font-mono text-on-surface focus:outline-none focus:border-secondary disabled:opacity-50"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="number" step="0.01" min={minOdds} max={maxOdds}
                              value={d.published ?? ''}
                              disabled={!canEdit || Boolean(busy)}
                              onChange={ev => setField(e.entryId, 'published', ev.target.value)}
                              className={`w-24 text-right bg-surface-container-lowest border rounded-lg px-2.5 py-1.5 font-mono focus:outline-none disabled:opacity-50 ${
                                noMargin
                                  ? 'border-amber-500/50 text-amber-400 focus:border-amber-400'
                                  : 'border-outline-variant/40 text-secondary font-bold focus:border-secondary'
                              }`}
                            />
                            {canEdit && (
                              <button
                                onClick={() => resetPublished(e.entryId)}
                                disabled={Boolean(busy)}
                                title={`Reset to suggested − ${margin}%`}
                                className="w-7 h-7 rounded-lg border border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:border-white/25 flex items-center justify-center transition-colors disabled:opacity-40"
                              >
                                <RotateCcw size={12} />
                              </button>
                            )}
                          </div>
                          {noMargin && (
                            <p className="text-[10px] text-amber-400 mt-1">No house margin</p>
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

          {!loading && !canEdit && entries.length > 0 && (
            <p className="mt-3 text-xs text-on-surface-variant flex items-center gap-1.5">
              <Lock size={12} className="text-amber-400" />
              {isLocked
                ? `Betting was locked at ${fmtDateTime(board.bettingLockedAt)} — odds are final because bets have already been settled against them.`
                : 'Odds can only be edited while the race is Scheduled and registration is closed.'}
            </p>
          )}

          {!loading && isPublished && (
            <p className="mt-2 text-xs text-on-surface-variant">
              Published to spectators at {fmtDateTime(board.oddsPublishedAt)}
              {isDirty && canEdit && (
                <span className="text-amber-400"> · unsaved changes are not visible to spectators yet</span>
              )}
            </p>
          )}
        </div>

        {/* Footer — cùng thứ tự với luồng nghiệp vụ: sửa → công bố → khóa sổ */}
        <div className="shrink-0 border-t border-outline-variant/40 px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {canEdit && (
              <button onClick={resetAll} disabled={Boolean(busy)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 text-xs text-on-surface-variant hover:text-on-surface hover:border-white/25 transition-all disabled:opacity-40">
                <RotateCcw size={13} /> Reset all to −{margin}%
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg border border-white/15 text-xs text-on-surface-variant hover:text-on-surface transition-all">
              Close
            </button>

            {canEdit && (
              <button onClick={save} disabled={Boolean(busy) || !isDirty || Boolean(validation)}
                title={validation ?? (isDirty ? '' : 'No changes to save')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/20 text-xs font-bold text-on-surface hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                {busy === 'save'
                  ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Save size={13} />}
                Save
              </button>
            )}

            {canEdit && (
              <button onClick={publish} disabled={Boolean(busy) || Boolean(validation) || entries.length < 2}
                title={entries.length < 2 ? 'At least 2 approved entries are required' : ''}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                {busy === 'publish'
                  ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Megaphone size={13} />}
                {isPublished ? 'Re-publish Odds' : 'Publish Odds'}
              </button>
            )}

            {!isLocked && (
              <button onClick={lock} disabled={Boolean(busy) || !isPublished}
                title={isPublished ? '' : 'Publish the odds before locking betting'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                {busy === 'lock'
                  ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Lock size={13} />}
                Lock Betting
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
