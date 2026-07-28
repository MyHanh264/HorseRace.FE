import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Flag, Lock, AlertCircle, X,
  CheckCircle, XCircle, Users, UserCheck, ChevronLeft, ChevronRight, TrendingUp,
} from 'lucide-react'
import {
  getRaceDetail, getRaces, getAllTournaments, getAllUser,
  openRegistration, closeRegistration, startRace,
  approveEntry, rejectEntry,
} from '../../api/admin'
import OddsManagementModal from '../../components/OddsManagementModal'
import api from '../../services/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const ENTRY_STATUS_META = {
  Pending:   { label: 'Pending',  cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',  dot: 'bg-amber-400' },
  Approved:  { label: 'Approved', cls: 'bg-primary/15 text-primary border border-primary/25',         dot: 'bg-primary' },
  Rejected:  { label: 'Rejected', cls: 'bg-error/15 text-error border border-error/25',               dot: 'bg-error' },
  Withdrawn: { label: 'Withdrawn', cls: 'bg-surface-container-high text-on-surface-variant border border-outline-variant/50', dot: 'bg-on-surface-variant' },
}

const PAGE_SIZE = 10

// pastel avatar colors cycling
const AVATAR_COLORS = [
  'bg-violet-500/20 text-violet-400 border-violet-500/30',
  'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'bg-sky-500/20 text-sky-400 border-sky-500/30',
  'bg-rose-500/20 text-rose-400 border-rose-500/30',
  'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'bg-orange-500/20 text-orange-400 border-orange-500/30',
]

function HorseAvatar({ name, index }) {
  const cls = AVATAR_COLORS[index % AVATAR_COLORS.length]
  return (
    <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 text-sm font-bold ${cls}`}>
      {name?.charAt(0) ?? '?'}
    </div>
  )
}

function fmtDate(s) {
  if (!s) return '—'
  const d = new Date(s)
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminRaceEntriesPage() {
  const { raceId } = useParams()
  const navigate   = useNavigate()

  const [race,        setRace]        = useState(null)
  const [entries,     setEntries]     = useState([])
  const [regInfo,     setRegInfo]     = useState({})   // { registrationOpenAt, registrationCloseAt }
  const [userMap,     setUserMap]     = useState({})
  const [tourMap,     setTourMap]     = useState({})

  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [entryError,  setEntryError]  = useState('')

  const [regLoading,         setRegLoading]         = useState(false)
  const [entryAction,        setEntryAction]         = useState(null)  // { id, type }
  const [rejectingEntryId,   setRejectingEntryId]    = useState(null)
  const [rejectReason,       setRejectReason]        = useState('')
  const [tick,               setTick]                = useState(0)
  const [page,               setPage]                = useState(1)
  const [showOddsModal,      setShowOddsModal]       = useState(false)

  const refresh = () => setTick(t => t + 1)

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    Promise.all([
      getRaceDetail(raceId),
      getRaces(),
      api.get('/api/entries').then(r => r.data),
      getAllUser({ page: 1, pageSize: 1000 }),
      getAllTournaments(),
    ]).then(([detail, racesBasic, allEntries, users, tournaments]) => {
      if (cancelled) return
      setRace(detail)
      setEntries((Array.isArray(allEntries) ? allEntries : []).filter(e => String(e.raceId) === String(raceId)))
      setUserMap(Object.fromEntries((Array.isArray(users) ? users : []).map(u => [u.userId, u])))
      setTourMap(Object.fromEntries((Array.isArray(tournaments) ? tournaments : []).map(t => [t.tournamentId, t.name])))
      const found = (Array.isArray(racesBasic) ? racesBasic : []).find(r => String(r.raceId) === String(raceId))
      setRegInfo(found ? {
        registrationOpenAt:  found.registrationOpenAt  ?? null,
        registrationCloseAt: found.registrationCloseAt ?? null,
        oddsPublishedAt:     found.oddsPublishedAt     ?? null,
        bettingLockedAt:     found.bettingLockedAt     ?? null,
      } : {})
      setError('')
      setLoading(false)
    }).catch(err => {
      if (!cancelled) { setError(err?.message || 'Failed to load data'); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [raceId, tick])

  // ── Derived ───────────────────────────────────────────────────────────────
  const isRegOpen   = !!regInfo.registrationOpenAt && !regInfo.registrationCloseAt
  const isRegClosed = !!regInfo.registrationCloseAt

  const regStatusLabel = isRegClosed ? 'Calculation Complete'
    : isRegOpen  ? 'Accepting Entries'
    : 'Registration Not Open'
  const regStatusCls = isRegClosed ? 'text-amber-400'
    : isRegOpen  ? 'text-primary'
    : 'text-on-surface-variant'

  const entryStats = useMemo(() => ({
    total:    race?.maxHorses ?? 0,
    filled:   entries.length,
    approved: entries.filter(e => e.status === 'Approved').length,
    pending:  entries.filter(e => e.status === 'Pending').length,
    rejected: entries.filter(e => e.status === 'Rejected').length,
  }), [entries, race])

  const minOdds = useMemo(() => {
    const odds = entries.filter(e => e.currentOdds).map(e => e.currentOdds)
    return odds.length ? Math.min(...odds) : null
  }, [entries])

  const ref1 = race?.referee1Id ? userMap[race.referee1Id] : null
  const ref2 = race?.referee2Id ? userMap[race.referee2Id] : null

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedEntries = entries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleOpenReg = async () => {
    setRegLoading(true); setError('')
    try { await openRegistration(raceId); refresh() }
    catch (err) { setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to open registration') }
    finally { setRegLoading(false) }
  }

  const handleCloseReg = async () => {
    setRegLoading(true); setError('')
    try { await closeRegistration(raceId); refresh() }
    catch (err) { setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to close registration') }
    finally { setRegLoading(false) }
  }

  const handleStartRace = async () => {
    setRegLoading(true); setError('')
    try { await startRace(raceId); refresh() }
    catch (err) { setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to start race') }
    finally { setRegLoading(false) }
  }

  const handleApprove = async (entryId) => {
    setEntryAction({ id: entryId, type: 'Approved' }); setEntryError('')
    try { await approveEntry(entryId); refresh() }
    catch (err) { setEntryError(err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.message ?? 'Failed to approve entry') }
    finally { setEntryAction(null) }
  }

  const handleReject = async (entryId) => {
    setEntryAction({ id: entryId, type: 'Rejected' }); setEntryError('')
    try {
      await rejectEntry(entryId, rejectReason.trim())
      setRejectingEntryId(null); setRejectReason('')
      refresh()
    }
    catch (err) { setEntryError(err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.message ?? 'Failed to reject entry') }
    finally { setEntryAction(null) }
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-[1100px] mx-auto px-6 sm:px-8 py-8">
        <div className="flex items-center gap-2 text-on-surface-variant text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </div>
        <div className="gs-card p-6 mb-5 animate-pulse h-52" />
        <div className="gs-card p-6 animate-pulse h-72" />
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[1100px] mx-auto px-6 sm:px-8 py-8">

      {/* Back */}
      <button
        onClick={() => navigate('/admin/races')}
        className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface text-sm transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Race Management
      </button>

      {/* Page title */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-on-surface">Race Entries Management</h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Administrative view for managing registration status and entry validation.
        </p>
      </div>

      {/* Global errors */}
      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Closed banner — đóng đăng ký mới chỉ TÍNH giá đề xuất; spectator chưa thấy gì cho
          tới khi Admin publish odds trong modal bên dưới. */}
      {isRegClosed && (
        <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl px-5 py-3 mb-5 text-amber-400 text-sm font-semibold">
          <Lock className="w-4 h-4 shrink-0" />
          <span>
            Registration Closed ·{' '}
            {regInfo.bettingLockedAt
              ? 'Betting locked — ready to start'
              : regInfo.oddsPublishedAt
                ? 'Odds published — betting open'
                : 'Odds not published yet — spectators cannot bet'}
          </span>
          <button
            onClick={() => setShowOddsModal(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition-all"
          >
            <TrendingUp size={12} /> Manage Odds
          </button>
        </div>
      )}

      {showOddsModal && (
        <OddsManagementModal
          raceId={Number(raceId)}
          raceName={race?.name}
          onClose={() => setShowOddsModal(false)}
          onChanged={refresh}
        />
      )}

      {/* Race card */}
      <div className="gs-card p-6 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-secondary font-semibold uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Flag className="w-3 h-3" />
              {tourMap[race?.tournamentId] ?? '—'}
            </p>
            <h2 className="text-xl font-bold text-on-surface">{race?.name ?? `Race #${raceId}`}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
              <p className={`text-sm font-semibold ${regStatusCls}`}>Status: {regStatusLabel}</p>
              {race?.roundType && (
                <span className="text-xs text-on-surface-variant border border-outline-variant/40 rounded-full px-2 py-0.5">{race.roundType}</span>
              )}
            </div>
          </div>

          {/* Action button */}
          <div className="shrink-0">
            {!isRegOpen && !isRegClosed && (
              <button onClick={handleOpenReg} disabled={regLoading}
                className="gs-btn gs-btn-primary flex items-center gap-2 px-5 py-2.5">
                {regLoading
                  ? <div className="w-3.5 h-3.5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                  : null}
                Open Registration
              </button>
            )}
            {isRegOpen && (
              <>
                <button onClick={handleCloseReg} disabled={regLoading || entryStats.approved < 2}
                  title={entryStats.approved < 2 ? `Needs at least 2 approved entries to close registration (currently ${entryStats.approved}).` : ''}
                  className="gs-btn gs-btn-secondary flex items-center gap-2 px-5 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed">
                  {regLoading
                    ? <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black/70 rounded-full animate-spin" />
                    : <Lock className="w-4 h-4" />}
                  Close Registration
                </button>
                {entryStats.approved < 2 && (
                  <p className="text-xs text-on-surface-variant mt-1.5 text-right">
                    Needs ≥2 approved entries ({entryStats.approved} now)
                  </p>
                )}
              </>
            )}
            {/* Khóa cược là điều kiện BE ép trước khi start — disable + nói rõ lý do thay vì
                để Admin bấm rồi nhận 400. */}
            {isRegClosed && race?.status === 'Scheduled' && (
              <>
                <button onClick={handleStartRace} disabled={regLoading || !regInfo.bettingLockedAt}
                  title={regInfo.bettingLockedAt ? '' : 'Lock betting first (Manage Odds → Lock Betting)'}
                  className="gs-btn gs-btn-secondary flex items-center gap-2 px-5 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed">
                  {regLoading
                    ? <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black/70 rounded-full animate-spin" />
                    : <span className="text-base">▶</span>}
                  Start Race
                </button>
                {!regInfo.bettingLockedAt && (
                  <p className="text-xs text-on-surface-variant mt-1.5 text-right">Lock betting first</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Referees */}
        {(ref1 || ref2) && (
          <div className="mt-4 pt-4 border-t border-outline-variant/25">
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold mb-2 flex items-center gap-1.5">
              <UserCheck className="w-3 h-3" /> Assigned Referees
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              {[ref1, ref2].filter(Boolean).map((ref, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-surface-container-high border border-outline-variant/30 rounded-lg px-3 py-1.5">
                  <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary">
                    {ref.fullName?.charAt(0) ?? 'R'}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-on-surface leading-tight">{ref.fullName}</p>
                    <p className="text-[10px] text-on-surface-variant">Referee {idx + 1}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mt-5 pt-4 border-t border-outline-variant/25">
          {[
            { label: 'CAPACITY',  value: `${entryStats.filled}/${entryStats.total}` },
            { label: 'APPROVED',  value: entryStats.approved },
            { label: 'PENDING',   value: entryStats.pending },
            { label: 'REJECTED',  value: entryStats.rejected },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface-container-low/50 rounded-xl p-4 border border-outline-variant/20">
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold mb-1">{label}</p>
              <p className="text-2xl font-bold font-mono text-on-surface">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Entry error */}
      {entryError && (
        <div className="mb-4 p-3.5 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />{entryError}
          <button onClick={() => setEntryError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Entries table */}
      <div className="gs-card overflow-hidden">
        {entries.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-on-surface-variant/30 mx-auto mb-3" />
            <p className="text-on-surface font-semibold mb-1">No entries yet</p>
            <p className="text-on-surface-variant text-sm">Entries submitted by horse owners will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Horse / Jockey</th>
                  <th>Owner</th>
                  <th>Submitted</th>
                  {/* Hai cột odds — cùng khái niệm nhưng KHÁC người xem:
                      · Suggested = Entry.Odds, máy tính từ lịch sử thắng, chỉ Admin đọc.
                      · Published = Entry.PublishedOdds, giá spectator cược và bị khóa vào lệnh.
                      Trước đây chỉ có một cột "Base Odds" trong khi spectator lại thấy giá thị
                      trường động, nên admin và người chơi cãi nhau xem số nào mới đúng. */}
                  <th>
                    <span>
                      Suggested
                      <span className="block text-[10px] font-normal text-on-surface-variant normal-case tracking-normal">
                        {isRegClosed ? '(internal)' : '(calculated on close)'}
                      </span>
                    </span>
                  </th>
                  <th>
                    <span className={isRegClosed ? 'text-amber-400' : ''}>
                      Published
                      <span className="block text-[10px] font-normal text-on-surface-variant normal-case tracking-normal">
                        (spectators bet this)
                      </span>
                    </span>
                  </th>
                  <th>Status</th>
                  {!isRegClosed && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedEntries.map((entry, i) => {
                  const meta     = ENTRY_STATUS_META[entry.status] ?? ENTRY_STATUS_META.Pending
                  const isActing = entryAction?.id === entry.entryId
                  const isFav    = isRegClosed && entry.currentOdds && entry.currentOdds === minOdds
                  const isDim    = entry.status === 'Rejected'

                  return (
                    <tr key={entry.entryId}
                      className={`transition-opacity ${isDim ? 'opacity-40' : ''}`}
                    >
                      {/* Horse / Jockey */}
                      <td>
                        <div className="flex items-center gap-3">
                          {isDim
                            ? <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-outline-variant/30 flex items-center justify-center shrink-0 text-on-surface-variant text-lg">✕</div>
                            : <HorseAvatar name={entry.horseName} index={i} />
                          }
                          <div>
                            <p className="font-semibold text-on-surface text-sm leading-tight">
                              {entry.horseName ?? `Horse #${entry.horseId}`}
                            </p>
                            <p className="text-xs text-on-surface-variant mt-0.5">
                              {entry.jockeyName ?? `Jockey #${entry.jockeyId}`}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="text-sm text-on-surface-variant">
                        {entry.horseOwnerName ?? '—'}
                      </td>

                      {/* Submitted */}
                      <td className="text-sm text-on-surface-variant whitespace-nowrap">
                        {fmtDate(entry.submittedAt)}
                      </td>

                      {/* Suggested odds (nội bộ) */}
                      <td>
                        {isRegClosed && entry.currentOdds
                          ? <div className="flex items-center gap-1.5">
                              <span className="text-on-surface-variant font-mono">{Number(entry.currentOdds).toFixed(2)}</span>
                              {isFav && (
                                <span className="text-[10px] bg-primary/15 text-primary border border-primary/25 px-1.5 py-0.5 rounded font-semibold">
                                  Fav
                                </span>
                              )}
                            </div>
                          : <span className="text-on-surface-variant">—</span>}
                      </td>

                      {/* Published odds (spectator cược số này) */}
                      <td>
                        {isRegClosed && entry.publishedOdds
                          ? <div className="flex items-center gap-1.5">
                              <span className="font-bold text-secondary font-mono">{Number(entry.publishedOdds).toFixed(2)}</span>
                              {regInfo.bettingLockedAt && <Lock className="w-3 h-3 text-amber-400" />}
                            </div>
                          : <span className="text-on-surface-variant">—</span>}
                      </td>

                      {/* Status badge */}
                      <td>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </td>

                      {/* Approve / Reject (only when reg open) */}
                      {!isRegClosed && (
                        <td>
                          {entry.status === 'Pending' ? (
                            rejectingEntryId === entry.entryId ? (
                              <div className="flex flex-col gap-1.5 min-w-[180px]">
                                <input
                                  value={rejectReason}
                                  onChange={e => setRejectReason(e.target.value)}
                                  placeholder="Reject reason (required) *"
                                  className="text-xs bg-surface-container-lowest border border-outline-variant/40 rounded px-2 py-1.5 text-on-surface focus:outline-none focus:border-error w-full"
                                />
                                <div className="flex gap-1.5">
                                  <button disabled={isActing || !rejectReason.trim()} onClick={() => handleReject(entry.entryId)}
                                    className="gs-btn gs-btn-danger gs-btn-sm flex-1 flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed">
                                    {isActing && entryAction?.type === 'Rejected'
                                      ? <div className="w-3 h-3 border-2 border-error/30 border-t-error rounded-full animate-spin" />
                                      : <XCircle className="w-3 h-3" />}
                                    Confirm
                                  </button>
                                  <button onClick={() => { setRejectingEntryId(null); setRejectReason('') }}
                                    className="gs-btn gs-btn-ghost gs-btn-sm">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button disabled={isActing} onClick={() => handleApprove(entry.entryId)}
                                  className="gs-btn gs-btn-primary gs-btn-sm flex items-center gap-1.5">
                                  {isActing && entryAction?.type === 'Approved'
                                    ? <div className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                                    : <CheckCircle className="w-3.5 h-3.5" />}
                                  Approve
                                </button>
                                <button disabled={isActing} onClick={() => setRejectingEntryId(entry.entryId)}
                                  className="gs-btn gs-btn-danger gs-btn-sm flex items-center gap-1.5">
                                  <XCircle className="w-3.5 h-3.5" /> Reject
                                </button>
                              </div>
                            )
                          ) : (
                            <span className="text-xs text-on-surface-variant">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {isRegClosed && (
              <p className="text-center text-xs text-on-surface-variant py-3 border-t border-outline-variant/30">
                Suggested odds calculated from historical win rates at {fmtDate(regInfo.registrationCloseAt)}.
                Published odds default to suggested − 10% and are what spectators bet against.
                Spectators see a different, higher-or-lower number: their price moves with the betting pool.
              </p>
            )}

            {entries.length > PAGE_SIZE && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant/30">
                <span className="text-xs text-on-surface-variant">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, entries.length)} of {entries.length}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="gs-btn gs-btn-ghost gs-btn-sm px-2">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs text-on-surface-variant px-2 font-mono">{currentPage} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="gs-btn gs-btn-ghost gs-btn-sm px-2">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
