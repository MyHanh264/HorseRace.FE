import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Flag, AlertTriangle, CheckCircle2,
  RefreshCw, Loader2, AlertCircle, Lock, Eye, Shield,
  ChevronRight, ArrowLeft, Users, UserCheck, CheckCircle, XCircle, X,
} from 'lucide-react'
import {
  getRaces, getRaceDetail, getTournaments, getUsers,
  getRaceExecutionStatus, getRacePauseInfo,
  resolveRaceConflict, resumeRace, getRaceStandings,
  startRace, closeRegistration, approveEntry, rejectEntry,
} from '../../api/admin'
import { validateOverrideReason } from '../../utils/validation'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEG_POINTS = { 1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 }
function getLegPoints(pos) { return pos && pos >= 1 ? (LEG_POINTS[pos] ?? 0) : 0 }

function fmtDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('vi-VN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtDate(s) {
  if (!s) return '—'
  const d = new Date(s)
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

const ENTRY_STATUS_META = {
  Pending:   { label: 'Pending',   cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',  dot: 'bg-amber-400' },
  Approved:  { label: 'Approved',  cls: 'bg-primary/15 text-primary border border-primary/25',          dot: 'bg-primary' },
  Rejected:  { label: 'Rejected',  cls: 'bg-error/15 text-error border border-error/25',                dot: 'bg-error' },
  Withdrawn: { label: 'Withdrawn', cls: 'bg-surface-container-high text-on-surface-variant border border-outline-variant/50', dot: 'bg-on-surface-variant' },
}

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

// ─── Override Modal ───────────────────────────────────────────────────────────

function OverrideModal({ race, legIndex, pauseInfo, onClose, onResolved }) {
  const [decisions, setDecisions] = useState(() => {
    const d = {}
    if (pauseInfo?.sideBySideComparison) {
      pauseInfo.sideBySideComparison.forEach(item => {
        d[item.entryId] = item.referee1Position ?? item.referee2Position ?? 1
      })
    }
    return d
  })
  const [overrideReason, setOverrideReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const entries = pauseInfo?.sideBySideComparison ?? []

  function setPosition(entryId, value) {
    setDecisions(prev => ({ ...prev, [entryId]: Number(value) }))
  }

  function getLegValidation() {
    const usedPositions = {}
    const errors = []
    Object.entries(decisions).forEach(([entryId, pos]) => {
      if (usedPositions[pos] !== undefined) errors.push({ entryId, conflictWith: usedPositions[pos], position: pos })
      usedPositions[pos] = Number(entryId)
    })
    return { valid: errors.length === 0, errors }
  }

  async function handleOverride() {
    // Bug #3: dùng shared validateOverrideReason (min 10 ký tự, nhất quán
    // với AdminConflictResolutionPage).
    const reasonCheck = validateOverrideReason(overrideReason)
    if (!reasonCheck.valid) {
      setError(reasonCheck.error)
      return
    }
    const { valid } = getLegValidation()
    if (!valid) {
      setError('Mỗi thứ hạng chỉ gán cho 1 Entry duy nhất.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await resolveRaceConflict(race.raceId, legIndex, {
        decisions: Object.entries(decisions).map(([entryId, officialPosition]) => ({ entryId: Number(entryId), officialPosition })),
        overrideReason: overrideReason.trim(),
      }
      // Bước 1: resolve conflict
      await resolveRaceConflict(race.raceId, legIndex, payload)
      // Bước 2: resume race (Bug #4) — đảm bảo race chuyển từ Paused → InProgress
      await resumeRace(race.raceId)
      onResolved()
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Override thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#1a2035] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#1a2035] border-b border-white/10 px-6 py-4 flex items-start justify-between gap-4 z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={16} className="text-orange-400" />
              <h2 className="text-lg font-bold text-white">Override Leg {legIndex + 1} Result</h2>
            </div>
            <p className="text-xs text-gray-400">Kết quả giữa 2 referees không khớp. Admin xác nhận kết quả chính thức.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all shrink-0">✕</button>
        </div>

        <div className="px-6 py-4 border-b border-white/5 bg-orange-500/5">
          <div className="flex items-center gap-2 text-orange-400 text-xs font-semibold mb-2">
            <AlertTriangle size={13} /> Phát hiện chênh lệch — Race tạm dừng
          </div>
          <p className="text-xs text-gray-400">Paused at: {fmtDateTime(pauseInfo?.pausedAt)} · Leg {legIndex + 1}</p>
        </div>

        <div className="px-6 py-4">
          <div className="grid grid-cols-4 gap-2 mb-2 text-center">
            {['Entry', 'Referee A', 'Referee B', 'Official'].map(h => (
              <div key={h} className="text-xs text-gray-500 font-medium uppercase tracking-wider">{h}</div>
            ))}
          </div>
          {entries.map(item => (
            <div key={item.entryId} className="grid grid-cols-4 gap-2 items-center py-2 border-b border-white/5 last:border-0">
              <div className="text-sm font-semibold text-white truncate">{item.horseName || `Entry #${item.entryId}`}</div>
              {[item.referee1Position, item.referee2Position].map((pos, i) => (
                <div key={i} className="text-center">
                  <span className={`inline-block px-3 py-1 rounded text-sm font-bold font-mono ${item.isMatch ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>{pos ?? '—'}</span>
                </div>
              ))}
              <div className="text-center">
                <select value={decisions[item.entryId] ?? 1} onChange={e => setPosition(item.entryId, e.target.value)}
                  className="w-full bg-surface-container-lowest border border-yellow-400/30 rounded-lg px-2 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-yellow-400/60 text-center">
                  {entries.map((_, n) => <option key={n + 1} value={n + 1}>{n + 1}</option>)}
                  <option value="-1">DNF</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 pb-4">
          <label className="block text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wider">
            Lý do Override <span className="text-red-400">*</span>
          </label>
          <textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)}
            placeholder="Mô tả lý do chọn kết quả này (VD: Sau khi xem lại video finish line)"
            rows={3} className="w-full bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400/50 transition-all resize-none" />
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between gap-3">
          {error
            ? <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertCircle size={12} />{error}</p>
            : <div />}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-white/20 text-sm text-gray-300 hover:bg-white/10 transition-all">Hủy</button>
            <button onClick={handleOverride} disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black text-sm font-bold transition-all disabled:opacity-50">
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Đang xử lý...</> : <><CheckCircle2 size={14} /> Confirm Override</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Leg Status Chip ──────────────────────────────────────────────────────────

function LegStatusChip({ status }) {
  const meta = {
    Confirmed:  { cls: 'bg-emerald-500/20 text-emerald-400 border border-emerald-700', label: '✓ Confirmed' },
    Pending:    { cls: 'bg-yellow-500/20 text-yellow-400 border border-yellow-700',    label: '⏳ Pending' },
    Conflicted: { cls: 'bg-orange-500/20 text-orange-400 border border-orange-700',    label: '⚠ Conflict' },
  }[status] ?? { cls: 'bg-gray-500/20 text-gray-400 border border-gray-700', label: status }
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.cls}`}>{meta.label}</span>
}

// ─── Race List Card ───────────────────────────────────────────────────────────

function RaceListCard({ race, onViewEntries, onMonitor, onStartRace }) {
  const isScheduled   = race.status === 'Scheduled'
  const isInProgress  = race.status === 'InProgress'
  const isPaused      = race.status === 'Paused'
  const isPending     = race.status === 'PendingResult'

  const statusChip = isInProgress
    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400">● LIVE</span>
    : isPaused
    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/15 text-orange-400 animate-pulse">⚠ PAUSED</span>
    : isPending
    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-400/15 text-blue-400">⏳ PENDING RESULT</span>
    : <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-500/15 text-gray-400">SCHEDULED</span>

  const borderColor = isPaused ? '3px solid rgba(249,115,22,0.7)'
    : isInProgress ? '3px solid rgba(251,191,36,0.6)'
    : '3px solid rgba(255,255,255,0.08)'

  return (
    <>
      <div className="gs-card overflow-hidden">
        {/* Card header */}
        <div
          className="px-5 py-4 border-b border-white/10"
          style={{ borderLeft: hasConflict ? '3px solid rgba(249,115,22,0.7)' : '3px solid rgba(251,191,36,0.6)' }}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  race.status === 'InProgress'
                    ? 'bg-amber-500/15 text-amber-400'
                    : race.status === 'Paused'
                    ? 'bg-orange-500/15 text-orange-400'
                    : race.status === 'PendingResult'
                    ? 'bg-blue-400/15 text-blue-400'
                    : 'bg-gray-500/15 text-gray-400'
                }`}>
                  {race.status === 'InProgress' ? '● LIVE' : race.status}
                </span>
                {execution?.isBetsLocked && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/15 text-red-400">🔒 Bets Locked</span>
                )}
                {hasConflict && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/15 text-orange-400 animate-pulse">
                    ⚠ CONFLICT
                  </span>
                )}
              </div>
              <h3 className="font-serif text-xl font-bold text-on-surface">{race.name}</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">{race.tournamentName || race.tournamentId}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {race.status === 'Scheduled' && (
                <button
                  onClick={() => onStart(race)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold transition-all"
                >
                  <Flag size={12} /> Start Race
                </button>
              )}
              {race.status === 'InProgress' && (
                <button
                  onClick={onMonitor}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 text-xs text-gray-300 hover:bg-white/10 transition-all"
                >
                  <Eye size={12} /> Monitor
                </button>
              )}
              {race.status === 'Paused' && (
                <>
                  <button
                    onClick={loadPauseInfo}
                    disabled={loadingPause}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-500/30 text-xs text-orange-400 hover:bg-orange-500/10 transition-all disabled:opacity-50"
                  >
                    <AlertTriangle size={12} />
                    {loadingPause ? 'Loading...' : 'View Conflict'}
                  </button>
                  <button
                    onClick={handleResume}
                    disabled={resolving || hasConflict}
                    title={hasConflict ? 'Vui lòng override conflict trước khi resume' : ''}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resolving ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} />}
                    Resume
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Legs timeline */}
        <div className="px-5 py-4">
          <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-medium mb-3">Leg Progress</p>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {legs.map((leg, idx) => {
              const statusColor = {
                Confirmed: 'bg-emerald-500 border-emerald-600',
                Pending: 'bg-surface-container-high border-outline-variant',
                Conflicted: 'bg-orange-500 border-orange-600 animate-pulse',
              }[leg.status] ?? 'bg-surface-container-high border-outline-variant'

              return (
                <div key={idx} className="flex flex-col items-center shrink-0">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white ${statusColor}`}>
                    {leg.status === 'Confirmed' ? '✓' : leg.status === 'Conflicted' ? '⚠' : idx + 1}
                  </div>
                  <span className="text-[10px] text-on-surface-variant mt-1">Leg {idx + 1}</span>
                  <span className="text-[9px] text-gray-600">{leg.confirmationType ?? '—'}</span>
                  {leg.referee1Submitted && leg.referee2Submitted && (
                    <span className="text-[9px] text-emerald-400 mt-0.5">✓ both</span>
                  )}
                  {!leg.referee1Submitted && !leg.referee2Submitted && (
                    <span className="text-[9px] text-gray-600 mt-0.5">waiting</span>
                  )}
                  {leg.referee1Submitted !== undefined && leg.referee2Submitted !== undefined &&
                   (leg.referee1Submitted !== leg.referee2Submitted) && (
                    <span className="text-[9px] text-yellow-400 mt-0.5">partial</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isScheduled && (
            <>
              <button onClick={() => onViewEntries(race)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/20 text-xs text-gray-300 hover:bg-white/10 transition-all">
                <Users size={13} /> View Entries
              </button>
              <button
                onClick={() => race.registrationCloseAt && onStartRace(race)}
                disabled={!race.registrationCloseAt}
                title={!race.registrationCloseAt ? 'Cần đóng đăng ký trước khi bắt đầu' : ''}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  race.registrationCloseAt
                    ? 'bg-yellow-400 hover:bg-yellow-300 text-black'
                    : 'bg-yellow-400/30 text-black/40 cursor-not-allowed'
                }`}>
                <span>▶</span> Start Race
              </button>
            </>
          )}
          {(isInProgress || isPending) && (
            <button onClick={() => onMonitor(race)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/20 text-xs text-gray-300 hover:bg-white/10 transition-all">
              <Eye size={13} /> Monitor
            </button>
          )}
          {isPaused && (
            <button onClick={() => onMonitor(race)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-orange-500/30 text-xs text-orange-400 hover:bg-orange-500/10 transition-all">
              <AlertTriangle size={13} /> View Conflict
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminRaceExecutionPage() {
  const isMountedRef = useRef(true)

  // ── View state ─────────────────────────────────────────────────────────────
  const [view, setView] = useState('list') // 'list' | 'entries' | 'monitor'

  // ── Race list ──────────────────────────────────────────────────────────────
  const [allRaces,     setAllRaces]     = useState([])
  const [selectedRace, setSelectedRace] = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')

  // ── Entries view ───────────────────────────────────────────────────────────
  const [entries,          setEntries]          = useState([])
  const [regInfo,          setRegInfo]          = useState({})
  const [userMap,          setUserMap]          = useState({})
  const [tourMap,          setTourMap]          = useState({})
  const [entriesLoading,   setEntriesLoading]   = useState(false)
  const [entryError,       setEntryError]       = useState('')
  const [entryAction,      setEntryAction]      = useState(null)
  const [rejectingEntryId, setRejectingEntryId] = useState(null)
  const [rejectReason,     setRejectReason]     = useState('')
  const [regLoading,       setRegLoading]       = useState(false)

  // ── Monitor view ───────────────────────────────────────────────────────────
  const [execution,  setExecution]  = useState(null)
  const [standings,  setStandings]  = useState([])
  const [pauseInfo,  setPauseInfo]  = useState(null)
  const [showOverride, setShowOverride] = useState(false)
  const pollRef = useRef(null)

  // ── Load races ─────────────────────────────────────────────────────────────
  const loadRaces = useCallback(async () => {
    try {
      const races = await getRaces()
      if (!isMountedRef.current) return
      setAllRaces(races.filter(r =>
        ['Scheduled', 'InProgress', 'Paused', 'PendingResult'].includes(r.status),
      ))
    } catch (err) {
      if (isMountedRef.current) setError(err?.message || 'Không tải được danh sách races.')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [])

  // ── Load entries ───────────────────────────────────────────────────────────
  const loadEntries = useCallback(async (raceId) => {
    setEntriesLoading(true); setEntryError('')
    try {
      const [detail, racesBasic, allEntries, users, tournaments] = await Promise.all([
        getRaceDetail(raceId),
        getRaces(),
        api.get('/api/entries').then(r => r.data),
        getUsers(),
        getTournaments(),
      ])
      if (!isMountedRef.current) return
      setSelectedRace(prev => ({ ...prev, ...detail, status: detail?.status ?? prev?.status }))
      setEntries((Array.isArray(allEntries) ? allEntries : []).filter(e => String(e.raceId) === String(raceId)))
      setUserMap(Object.fromEntries((Array.isArray(users) ? users : []).map(u => [u.userId, u])))
      setTourMap(Object.fromEntries((Array.isArray(tournaments) ? tournaments : []).map(t => [t.tournamentId, t.name])))
      const found = (Array.isArray(racesBasic) ? racesBasic : []).find(r => String(r.raceId) === String(raceId))
      setRegInfo(found ? {
        registrationOpenAt:  found.registrationOpenAt  ?? null,
        registrationCloseAt: found.registrationCloseAt ?? null,
      } : {})
    } catch (err) {
      if (isMountedRef.current) setEntryError(err?.message || 'Không tải được entries')
    } finally {
      if (isMountedRef.current) setEntriesLoading(false)
    }
  }, [])

  // ── Load execution ─────────────────────────────────────────────────────────
  const loadExecution = useCallback(async (raceId) => {
    try {
      const [exec, standingsData] = await Promise.all([
        getRaceExecutionStatus(raceId).catch(() => null),
        getRaceStandings(raceId).catch(() => []),
      ])
      if (!isMountedRef.current) return
      setExecution(exec)
      setStandings(standingsData)
      if (exec?.status === 'Paused') {
        const pause = await getRacePauseInfo(raceId).catch(() => null)
        if (isMountedRef.current) setPauseInfo(pause)
      } else {
        if (isMountedRef.current) setPauseInfo(null)
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    loadRaces()
    return () => { isMountedRef.current = false }
  }, [loadRaces])

  // Auto-poll when monitoring
  useEffect(() => {
    if (view !== 'monitor' || !selectedRace) return
    loadExecution(selectedRace.raceId)
    pollRef.current = setInterval(() => loadExecution(selectedRace.raceId), 6000)
    return () => clearInterval(pollRef.current)
  }, [view, selectedRace, loadExecution])

  // ── Navigation helpers ─────────────────────────────────────────────────────
  function openEntries(race) {
    setSelectedRace(race)
    setEntries([]); setRegInfo({}); setEntryError('')
    setView('entries')
    loadEntries(race.raceId)
  }

  function openMonitor(race) {
    clearInterval(pollRef.current)
    setSelectedRace(race)
    setExecution(null); setPauseInfo(null)
    setView('monitor')
  }

  function backToList() {
    clearInterval(pollRef.current)
    setSelectedRace(null); setView('list'); setError('')
    loadRaces()
  }

  // ── Entry handlers ─────────────────────────────────────────────────────────
  const handleCloseReg = async () => {
    setRegLoading(true); setError('')
    try {
      await closeRegistration(selectedRace.raceId)
      await loadEntries(selectedRace.raceId)
    } catch (err) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Đóng đăng ký thất bại')
    } finally {
      setRegLoading(false)
    }
  }

  const handleStartRace = async (race) => {
    setRegLoading(true); setError('')
    try {
      await startRace(race.raceId)
      await loadRaces()
      openMonitor({ ...race, status: 'InProgress' })
    } catch (err) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Bắt đầu race thất bại')
    } finally {
      setRegLoading(false)
    }
  }

  const executableRaces = allRaces.filter(r => r.status === 'InProgress' || r.status === 'Paused')
  const selectedExecution = selectedRace ? execution : null
  // Derived flag — race đang có leg Conflicted → không cho Resume từ header.
  const hasAnyConflict = selectedExecution?.legs?.some((l) => l.status === 'Conflicted')

  const handleReject = async (entryId) => {
    setEntryAction({ id: entryId, type: 'Rejected' }); setEntryError('')
    try {
      await rejectEntry(entryId, rejectReason.trim() || null)
      setRejectingEntryId(null); setRejectReason('')
      await loadEntries(selectedRace.raceId)
    }
    catch (err) { setEntryError(err?.message || 'Từ chối entry thất bại') }
    finally { setEntryAction(null) }
  }

  // ── Derived (entries view) ─────────────────────────────────────────────────
  const isRegOpen   = !!regInfo.registrationOpenAt && !regInfo.registrationCloseAt
  const isRegClosed = !!regInfo.registrationCloseAt

  const entryStats = useMemo(() => ({
    total:    selectedRace?.maxHorses ?? 0,
    filled:   entries.length,
    approved: entries.filter(e => e.status === 'Approved').length,
    pending:  entries.filter(e => e.status === 'Pending').length,
    rejected: entries.filter(e => e.status === 'Rejected').length,
  }), [entries, selectedRace])

  const minOdds = useMemo(() => {
    const odds = entries.filter(e => e.currentOdds).map(e => e.currentOdds)
    return odds.length ? Math.min(...odds) : null
  }, [entries])

  const ref1 = selectedRace?.referee1Id ? userMap[selectedRace.referee1Id] : null
  const ref2 = selectedRace?.referee2Id ? userMap[selectedRace.referee2Id] : null

  // ── Common header ──────────────────────────────────────────────────────────
  const PageHeader = () => (
    <div className="flex items-center gap-3 mb-6">
      {view !== 'list' ? (
        <button onClick={backToList}
          className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all">
          <ArrowLeft size={16} />
        </button>
      ) : null}
      <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/25 flex items-center justify-center shrink-0">
        <Flag size={20} className="text-yellow-400" />
      </div>
      <div className="flex-1 min-w-0">
        <h1 className="font-serif text-2xl font-bold text-on-surface">
          {view === 'list' ? 'Race Execution' : view === 'entries' ? 'Race Entries' : 'Race Monitor'}
        </h1>
        <p className="text-xs text-on-surface-variant truncate">
          {view === 'list'
            ? 'Chọn race để xem entries hoặc giám sát'
            : selectedRace?.name ?? ''}
        </p>
      </div>
      {view === 'list' && (
        <button onClick={() => { setLoading(true); loadRaces() }}
          className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      )}
      {view === 'monitor' && (
        <button onClick={() => loadExecution(selectedRace?.raceId)}
          className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20">
          <RefreshCw size={12} /> Refresh
        </button>
      )}
    </div>
  )

  // ── Error banner ───────────────────────────────────────────────────────────
  const ErrorBanner = ({ msg, onDismiss }) => msg ? (
    <div className="mb-4 p-3.5 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
      <AlertCircle className="w-4 h-4 shrink-0" />{msg}
      <button onClick={onDismiss} className="ml-auto"><X className="w-4 h-4" /></button>
    </div>
  ) : null

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'list') {
    return (
      <div className="max-w-5xl mx-auto">
        <PageHeader />
        <ErrorBanner msg={error} onDismiss={() => setError('')} />

        {loading ? (
          <div className="flex items-center justify-center py-40">
            <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
          </div>
        ) : allRaces.length === 0 ? (
          <div className="gs-card p-16 text-center">
            <Flag size={40} className="text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-on-surface mb-2">Không có cuộc đua nào cần xử lý</h3>
            <p className="text-sm text-on-surface-variant">Các cuộc đua sẽ xuất hiện ở đây khi có trạng thái cần action.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allRaces.map(race => (
              <RaceListCard
                key={race.raceId}
                race={race}
                onViewEntries={openEntries}
                onMonitor={openMonitor}
                onStartRace={handleStartRace}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENTRIES VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'entries') {
    const regStatusLabel = isRegClosed ? 'Calculation Complete'
      : isRegOpen  ? 'Accepting Entries'
      : 'Registration Not Open'
    const regStatusCls = isRegClosed ? 'text-amber-400'
      : isRegOpen  ? 'text-primary'
      : 'text-on-surface-variant'

    return (
      <div className="max-w-5xl mx-auto">
        <PageHeader />
        <ErrorBanner msg={error} onDismiss={() => setError('')} />

        {/* Closed banner */}
        {isRegClosed && (
          <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl px-5 py-3 mb-5 text-amber-400 text-sm font-semibold">
            <Lock className="w-4 h-4 shrink-0" /> Registration Closed · Odds Locked
          </div>
        )}

        {/* Race card */}
        {entriesLoading && !selectedRace?.name ? (
          <div className="gs-card p-6 mb-5 animate-pulse h-52" />
        ) : (
          <div className="gs-card p-6 mb-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-secondary font-semibold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Flag className="w-3 h-3" />
                  {tourMap[selectedRace?.tournamentId] ?? '—'}
                </p>
                <h2 className="text-xl font-bold text-on-surface">{selectedRace?.name ?? `Race #${selectedRace?.raceId}`}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                  <p className={`text-sm font-semibold ${regStatusCls}`}>Status: {regStatusLabel}</p>
                  {selectedRace?.roundType && (
                    <span className="text-xs text-on-surface-variant border border-outline-variant/40 rounded-full px-2 py-0.5">{selectedRace.roundType}</span>
                  )}
                </div>
                {selectedRace.status === 'Paused' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const pause = await getRacePauseInfo(selectedRace.raceId).catch(() => null)
                        setPauseInfo(pause)
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-500/30 text-xs text-orange-400 hover:bg-orange-500/10 transition-all"
                    >
                      <AlertTriangle size={12} /> View Conflict
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await resumeRace(selectedRace.raceId)
                          setSelectedRace(prev => ({ ...prev, status: 'InProgress' }))
                          loadExecution(selectedRace.raceId)
                          loadRaces()
                        } catch (err) {
                          alert(err?.message || 'Resume thất bại.')
                        }
                      }}
                      disabled={hasAnyConflict}
                      title={hasAnyConflict ? 'Vui lòng override conflict trước khi resume' : ''}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={12} /> Resume Race
                    </button>
                  </div>
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
                { label: 'CAPACITY', value: `${entryStats.filled}/${entryStats.total}` },
                { label: 'APPROVED', value: entryStats.approved },
                { label: 'PENDING',  value: entryStats.pending },
                { label: 'REJECTED', value: entryStats.rejected },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface-container-low/50 rounded-xl p-4 border border-outline-variant/20">
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold mb-1">{label}</p>
                  <p className="text-2xl font-bold font-mono text-on-surface">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Entry error */}
        <ErrorBanner msg={entryError} onDismiss={() => setEntryError('')} />

        {/* Entries table */}
        <div className="gs-card overflow-hidden">
          {entriesLoading ? (
            <div className="py-16 text-center"><Loader2 className="w-8 h-8 text-yellow-400 animate-spin mx-auto" /></div>
          ) : entries.length === 0 ? (
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
                    <th>
                      {isRegClosed
                        ? <span className="flex items-center gap-1.5 text-amber-400">Locked Odds <Lock className="w-3 h-3" /></span>
                        : <span>Current Odds<span className="block text-[10px] font-normal text-on-surface-variant normal-case tracking-normal">(calculated on close)</span></span>}
                    </th>
                    <th>Status</th>
                    {!isRegClosed && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => {
                    const meta     = ENTRY_STATUS_META[entry.status] ?? ENTRY_STATUS_META.Pending
                    const isActing = entryAction?.id === entry.entryId
                    const isFav    = isRegClosed && entry.currentOdds && entry.currentOdds === minOdds
                    const isDim    = entry.status === 'Rejected'

                    return (
                      <tr key={entry.entryId} className={`transition-opacity ${isDim ? 'opacity-40' : ''}`}>
                        <td>
                          <div className="flex items-center gap-3">
                            {isDim
                              ? <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-outline-variant/30 flex items-center justify-center shrink-0 text-on-surface-variant text-lg">✕</div>
                              : <HorseAvatar name={entry.horseName} index={i} />}
                            <div>
                              <p className="font-semibold text-on-surface text-sm leading-tight">{entry.horseName ?? `Horse #${entry.horseId}`}</p>
                              <p className="text-xs text-on-surface-variant mt-0.5">{entry.jockeyName ?? `Jockey #${entry.jockeyId}`}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-sm text-on-surface-variant">{entry.horseOwnerName ?? '—'}</td>
                        <td className="text-sm text-on-surface-variant whitespace-nowrap">{fmtDate(entry.submittedAt)}</td>
                        <td>
                          {isRegClosed && entry.currentOdds
                            ? <div className="flex items-center gap-1.5">
                                <span className="font-bold text-on-surface font-mono">{entry.currentOdds}</span>
                                <Lock className="w-3 h-3 text-amber-400" />
                                {isFav && <span className="text-[10px] bg-primary/15 text-primary border border-primary/25 px-1.5 py-0.5 rounded font-semibold">Fav</span>}
                              </div>
                            : <span className="text-on-surface-variant">—</span>}
                        </td>
                        <td>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                        </td>
                        {!isRegClosed && (
                          <td>
                            {entry.status === 'Pending' ? (
                              rejectingEntryId === entry.entryId ? (
                                <div className="flex flex-col gap-1.5 min-w-[180px]">
                                  <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                                    placeholder="Reject reason (optional)"
                                    className="text-xs bg-surface-container-lowest border border-outline-variant/40 rounded px-2 py-1.5 text-on-surface focus:outline-none focus:border-error w-full" />
                                  <div className="flex gap-1.5">
                                    <button disabled={isActing} onClick={() => handleReject(entry.entryId)}
                                      className="gs-btn gs-btn-danger gs-btn-sm flex-1 flex items-center justify-center gap-1">
                                      {isActing && entryAction?.type === 'Rejected'
                                        ? <div className="w-3 h-3 border-2 border-error/30 border-t-error rounded-full animate-spin" />
                                        : <XCircle className="w-3 h-3" />} Confirm
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
                                      : <CheckCircle className="w-3.5 h-3.5" />} Approve
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
                  Odds locked at {fmtDate(regInfo.registrationCloseAt)}.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MONITOR VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  const hasConflict = execution?.legs?.some(l => l.status === 'Conflicted')

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader />
      <ErrorBanner msg={error} onDismiss={() => setError('')} />

      {!execution ? (
        <div className="flex items-center justify-center py-40">
          <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Race status header */}
          <div className="gs-card p-5" style={{ borderLeft: hasConflict ? '3px solid rgba(249,115,22,0.7)' : '3px solid rgba(251,191,36,0.6)' }}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    selectedRace?.status === 'InProgress' ? 'bg-amber-500/15 text-amber-400'
                    : selectedRace?.status === 'Paused'   ? 'bg-orange-500/15 text-orange-400'
                    : 'bg-blue-400/15 text-blue-400'
                  }`}>
                    {selectedRace?.status === 'InProgress' ? '● LIVE' : selectedRace?.status}
                  </span>
                  {execution?.isBetsLocked && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/15 text-red-400">🔒 Bets Locked</span>
                  )}
                  {hasConflict && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/15 text-orange-400 animate-pulse">⚠ CONFLICT</span>
                  )}
                </div>
                <h2 className="font-serif text-xl font-bold text-on-surface">{selectedRace?.name}</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {execution.totalLegs ?? selectedRace?.numberOfLegs} legs ·{' '}
                  {execution.isBetsLocked ? '🔒 Bets locked' : 'Bets open'}
                </p>
              </div>

              {selectedRace?.status === 'Paused' && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowOverride(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-500/30 text-xs text-orange-400 hover:bg-orange-500/10 transition-all">
                    <AlertTriangle size={12} /> View Conflict
                  </button>
                  <button onClick={async () => {
                    try {
                      await resumeRace(selectedRace.raceId)
                      setSelectedRace(prev => ({ ...prev, status: 'InProgress' }))
                      loadExecution(selectedRace.raceId)
                      loadRaces()
                    } catch (err) { setError(err?.message || 'Resume thất bại.') }
                  }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-all">
                    <ChevronRight size={12} /> Resume Race
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Legs status */}
          <div className="gs-card overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="font-semibold text-on-surface text-sm">Leg Status</h3>
            </div>
            <div className="divide-y divide-white/5">
              {execution.legs?.map((leg, idx) => (
                <div key={idx} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      leg.status === 'Confirmed'  ? 'bg-emerald-500 text-white'
                      : leg.status === 'Conflicted' ? 'bg-orange-500 text-white animate-pulse'
                      : 'bg-surface-container-high text-gray-400'
                    }`}>
                      {leg.status === 'Confirmed' ? '✓' : leg.status === 'Conflicted' ? '⚠' : idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-on-surface text-sm">Leg {idx + 1}</p>
                      {leg.confirmationType && (
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{leg.confirmationType}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${leg.referee1Submitted ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                        R1: {leg.referee1Submitted ? '✓' : '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${leg.referee2Submitted ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                        R2: {leg.referee2Submitted ? '✓' : '—'}
                      </span>
                    </div>
                    <LegStatusChip status={leg.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conflict + override */}
          {selectedRace?.status === 'Paused' && pauseInfo && (
            <div className="gs-card border-orange-500/30">
              <div className="px-5 py-4 border-b border-orange-500/20 bg-orange-500/5 flex items-start gap-3">
                <AlertTriangle size={18} className="text-orange-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-orange-400 text-sm">Chênh lệch phát hiện — Cuộc đua tạm dừng</p>
                  <p className="text-xs text-gray-400 mt-0.5">Side-by-side comparison bên dưới. Admin xác nhận kết quả chính thức.</p>
                </div>
              </div>
              <div className="px-5 py-4">
                <div className="grid grid-cols-4 gap-2 mb-2 text-center text-[10px] text-gray-500 uppercase tracking-wider">
                  {['Entry', 'Referee A', 'Referee B', 'Match'].map(h => <div key={h}>{h}</div>)}
                </div>
                {pauseInfo.sideBySideComparison?.map(item => (
                  <div key={item.entryId} className="grid grid-cols-4 gap-2 items-center py-2 border-b border-white/5 last:border-0">
                    <div className="text-sm font-semibold text-white truncate">{item.horseName || `Entry #${item.entryId}`}</div>
                    {[item.referee1Position, item.referee2Position].map((pos, i) => (
                      <div key={i} className="text-center">
                        <span className={`inline-block px-3 py-1 rounded text-sm font-bold font-mono ${item.isMatch ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>{pos ?? '—'}</span>
                      </div>
                    ))}
                    <div className="text-center font-mono text-sm text-yellow-400">
                      {item.isMatch ? `${getLegPoints(item.referee1Position)}p` : '⚠ conflict'}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 pb-5">
                <button onClick={() => setShowOverride(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black text-sm font-bold transition-all">
                  <Shield size={14} /> Override & Confirm Leg Result
                </button>
              </div>
            </div>
          )}

          {/* Live standings */}
          {standings.length > 0 && (
            <div className="gs-card overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10">
                <h3 className="font-semibold text-on-surface text-sm">Live Standings</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">{standings.length} entries · auto refresh</p>
              </div>
              <div className="divide-y divide-white/5">
                {standings.map((s, i) => (
                  <div key={s.entryId} className="px-5 py-3 flex items-center gap-4">
                    <span className={`w-6 text-center font-bold text-lg ${
                      i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'
                    }`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">{s.horseName || `Entry #${s.entryId}`}</p>
                      {s.currentPosition && <p className="text-[10px] text-gray-500">Current pos: {s.currentPosition}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-yellow-400 font-mono">{s.totalPoints}p</p>
                      {s.isRaceDQ && <span className="text-[10px] text-red-400 ml-1">DQ</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Override modal */}
      {showOverride && pauseInfo && (
        <OverrideModal
          race={selectedRace}
          legIndex={pauseInfo.conflictedLeg?.legIndex ?? 0}
          pauseInfo={pauseInfo}
          onClose={() => setShowOverride(false)}
          onResolved={() => {
            setShowOverride(false)
            loadExecution(selectedRace.raceId)
            loadRaces()
          }}
        />
      )}
    </div>
  )
}
