import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Flag, AlertTriangle,
  RefreshCw, Loader2, AlertCircle, Lock, Eye, Shield, Send,
  ChevronLeft, ChevronRight, ArrowLeft, Users, UserCheck, CheckCircle, XCircle, X,
} from 'lucide-react'
import {
  getRaces, getRaceDetail, getAllTournaments, getAllUser,
  getRaceExecutionStatus,
  resumeRace, getRaceStandings,
  startRace, closeRegistration, approveEntry, rejectEntry, getEntries,
  publishRace, getAllViolations, getViolationsWithEntryDetail, getRaceResults,
} from '../../api/admin'
import RaceResultsModal from '../../components/RaceResultsModal'

const EXECUTION_RACE_STATUSES = ['Scheduled', 'InProgress', 'Paused', 'PendingResult', 'Finished']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s) {
  if (!s) return '—'
  const d = new Date(s)
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

// Explains WHY an entry's total points look the way they do — per-leg points plus any
// approved violation penalty applied to that leg (or to the whole race, for DQ).
function buildScoreBreakdown(entryId, execution, approvedViolations) {
  const entryViolations = approvedViolations.filter(v => v.entryId === entryId)
  const isRaceDQ = entryViolations.some(v => v.penalty === 'DQ')
  const lines = []
  // Short, always-visible summary of every APPROVED penalty against this entry — this used
  // to only exist inside a native `title` tooltip (hover-only, no visual hint it existed),
  // which is exactly why "tụt hạng do đâu" was invisible unless you happened to hover it.
  const penaltyLines = []
  ;(execution?.legs ?? []).forEach(leg => {
    const result = leg.results?.find(r => r.entryId === entryId)
    if (!result) return
    const legViolation = entryViolations.find(v => v.legNumber === leg.legNumber)
    const posLabel = result.position === -1 ? 'DNF' : result.position === -2 ? 'DQ' : `#${result.position}`
    const penaltyNote = !legViolation
      ? ''
      : legViolation.penalty === 'Warning'
        ? ` — Warning noted (${legViolation.violationType})`
        : ` — ${legViolation.penalty} applied (${legViolation.violationType})`
    lines.push(`Leg ${leg.legNumber}: ${result.points}p (${posLabel})${penaltyNote}`)
    // Warning doesn't touch score/position (by design — BE: "Warning: không đổi standings"),
    // but Admin still needs visible confirmation it was recorded, not silence. Flagged with
    // scoresAffected: false so the render below can keep it visually distinct from an actual
    // Demote/DQ (neutral colour, no "tụt hạng" implication).
    if (legViolation) {
      penaltyLines.push({
        text: legViolation.penalty === 'Warning'
          ? `Leg ${leg.legNumber}: Warning noted (${legViolation.violationType})`
          : `Leg ${leg.legNumber}: ${legViolation.penalty} — now ${posLabel} (${legViolation.violationType})`,
        scoreAffected: legViolation.penalty !== 'Warning',
      })
    }
  })
  const hasPenalty = entryViolations.some(v => v.penalty !== 'Warning')
  return { lines, penaltyLines, isRaceDQ, hasPenalty }
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

function RaceListCard({ race, onViewEntries, onMonitor, onStartRace, onViewConflict, pendingViolationCount = 0 }) {
  const navigate = useNavigate()
  const isFinished   = race.status === 'Finished'
  const isScheduled  = race.status === 'Scheduled'
  const isInProgress = race.status === 'InProgress'
  const isPaused     = race.status === 'Paused'
  const isPending    = race.status === 'PendingResult'

  const borderColor = isPaused     ? '3px solid rgba(249,115,22,0.7)'
    : isInProgress ? '3px solid rgba(251,191,36,0.6)'
    : isFinished   ? '3px solid rgba(52,211,153,0.5)'
    : '3px solid rgba(255,255,255,0.08)'

  return (
    <div className="gs-card overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10" style={{ borderLeft: borderColor }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                isInProgress ? 'bg-amber-500/15 text-amber-400'
                : isPaused   ? 'bg-orange-500/15 text-orange-400'
                : isPending  ? 'bg-blue-400/15 text-blue-400'
                : isFinished ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-gray-500/15 text-gray-400'
              }`}>
                {isInProgress ? '● LIVE' : isPaused ? '⚠ PAUSED' : isPending ? '⏳ PENDING RESULT' : isFinished ? '✓ FINISHED' : 'SCHEDULED'}
              </span>
            </div>
            <h3 className="font-serif text-xl font-bold text-on-surface">{race.name}</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">{race.tournamentName || race.tournamentId}</p>
            {isPending && pendingViolationCount > 0 && (
              <button
                onClick={e => { e.stopPropagation(); navigate(`/admin/violations?raceId=${race.raceId}`) }}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 mt-1.5 underline decoration-dotted underline-offset-2"
              >
                <AlertTriangle size={11} /> {pendingViolationCount} pending violation{pendingViolationCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 py-4 flex items-center justify-end gap-2">
        {isScheduled && (
          <>
            <button onClick={() => onViewEntries(race)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/20 text-xs text-gray-300 hover:bg-white/10 transition-all">
              <Users size={13} /> View Entries
            </button>
            <button
              onClick={() => race.registrationCloseAt && onStartRace(race)}
              disabled={!race.registrationCloseAt}
              title={!race.registrationCloseAt ? 'Registration must be closed before starting' : ''}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                race.registrationCloseAt
                  ? 'bg-yellow-400 hover:bg-yellow-300 text-black'
                  : 'bg-yellow-400/30 text-black/40 cursor-not-allowed'
              }`}>
              <Flag size={13} /> Start Race
            </button>
          </>
        )}
        {(isInProgress || isPending || isFinished) && (
          <button onClick={() => onMonitor(race)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/20 text-xs text-gray-300 hover:bg-white/10 transition-all">
            <Eye size={13} /> {isFinished ? 'Leg history' : 'Monitor'}
          </button>
        )}
        {isPaused && (
          <button onClick={() => onViewConflict(race)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-orange-500/30 text-xs text-orange-400 hover:bg-orange-500/10 transition-all">
            <AlertTriangle size={13} /> View Conflict
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Page Header ─────────────────────────────────────────────────────────────

function PageHeader({ view, loading, selectedRaceName, selectedRaceStatus, onBack, onRefreshList, onRefreshMonitor }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      {view !== 'list' && (
        <button onClick={onBack}
          className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all">
          <ArrowLeft size={16} />
        </button>
      )}
      <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/25 flex items-center justify-center shrink-0">
        <Flag size={20} className="text-yellow-400" />
      </div>
      <div className="flex-1 min-w-0">
        <h1 className="font-serif text-2xl font-bold text-on-surface">
          {view === 'list' ? 'Race Execution'
            : view === 'entries' ? 'Race Entries'
            : selectedRaceStatus === 'Finished' ? 'Leg History'
            : 'Race Monitor'}
        </h1>
        <p className="text-xs text-on-surface-variant truncate">
          {view === 'list' ? 'Select a race to view entries or monitor' : selectedRaceName ?? ''}
        </p>
      </div>
      {view === 'list' && (
        <button onClick={onRefreshList}
          className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      )}
      {view === 'monitor' && (
        <button onClick={onRefreshMonitor}
          className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20">
          <RefreshCw size={12} /> Refresh
        </button>
      )}
    </div>
  )
}

// ─── Error Banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ msg, onDismiss }) {
  if (!msg) return null
  return (
    <div className="mb-4 p-3.5 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
      <AlertCircle className="w-4 h-4 shrink-0" />{msg}
      <button onClick={onDismiss} className="ml-auto"><X className="w-4 h-4" /></button>
    </div>
  )
}

function SuccessBanner({ msg, onDismiss }) {
  if (!msg) return null
  return (
    <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm flex items-center gap-2">
      <CheckCircle className="w-4 h-4 shrink-0" />{msg}
      <button onClick={onDismiss} className="ml-auto"><X className="w-4 h-4" /></button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminRaceExecutionPage() {
  const isMountedRef = useRef(true)
  const navigate = useNavigate()
  // Deep link from Race Management's "Monitor" button — jumps straight to that race instead of the full list.
  const [searchParams] = useSearchParams()
  const deepLinkRaceId = searchParams.get('raceId')

  // ── View state ─────────────────────────────────────────────────────────────
  const [view, setView] = useState('list') // 'list' | 'entries' | 'monitor'

  // ── Race list ──────────────────────────────────────────────────────────────
  const [allRaces,     setAllRaces]     = useState([])
  const [selectedRace, setSelectedRace] = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  // raceId → count of unresolved (Pending) violation reports — badges PendingResult cards.
  const [pendingViolationCountByRace, setPendingViolationCountByRace] = useState({})
  const [listPage, setListPage] = useState(1)
  const LIST_PAGE_SIZE = 10

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
  // Approved violations for the race being monitored — cross-referenced against
  // execution.legs to show WHY an entry's point total is what it is, not just the number.
  const [raceViolations, setRaceViolations] = useState([])
  const [pendingViolationCount, setPendingViolationCount] = useState(0)
  const [publishing, setPublishing] = useState(false)
  // Preview the exact same Race Results table other roles will see before actually
  // committing to Publish — reuses RaceResultsModal, which falls back to the live
  // standings' provisional Position when there's no official result yet.
  const [showPublishPreview, setShowPublishPreview] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const pollRef = useRef(null)

  // ── Load races ─────────────────────────────────────────────────────────────
  const loadRaces = useCallback(async () => {
    try {
      const [races, violationsRes] = await Promise.all([
        getRaces(),
        getAllViolations({ status: 'Pending', pageSize: 200 }).catch(() => null),
      ])
      if (!isMountedRef.current) return
      setAllRaces(races.filter(r =>
        EXECUTION_RACE_STATUSES.includes(r.status),
      ))
      const violationItems = Array.isArray(violationsRes?.items) ? violationsRes.items : []
      const counts = {}
      violationItems.forEach(v => { counts[v.raceId] = (counts[v.raceId] ?? 0) + 1 })
      setPendingViolationCountByRace(counts)
    } catch (err) {
      if (isMountedRef.current) setError(err?.message || 'Failed to load race list.')
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
        getEntries(),
        getAllUser({ page: 1, pageSize: 1000 }),
        getAllTournaments(),
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
      if (isMountedRef.current) setEntryError(err?.message || 'Failed to load entries')
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
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    let active = true
    ;(async () => {
      try {
        const [races, violationsRes] = await Promise.all([
          getRaces(),
          getAllViolations({ status: 'Pending', pageSize: 200 }).catch(() => null),
        ])
        if (!active) return
        const filtered = races.filter(r =>
          EXECUTION_RACE_STATUSES.includes(r.status),
        )
        setAllRaces(filtered)
        const violationItems = Array.isArray(violationsRes?.items) ? violationsRes.items : []
        const counts = {}
        violationItems.forEach(v => { counts[v.raceId] = (counts[v.raceId] ?? 0) + 1 })
        setPendingViolationCountByRace(counts)
        if (deepLinkRaceId) {
          const target = filtered.find(r => String(r.raceId) === String(deepLinkRaceId))
          if (target) openMonitor(target)
        }
      } catch (err) {
        if (active) setError(err?.message || 'Failed to load race list.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false; isMountedRef.current = false }
  }, [deepLinkRaceId])

  // Auto-poll when monitoring
  useEffect(() => {
    if (view !== 'monitor' || !selectedRace) return
    const raceId = selectedRace.raceId
    let active = true

    async function fetchExecution() {
      try {
        const [exec, standingsData, allViolations] = await Promise.all([
          getRaceExecutionStatus(raceId).catch(() => null),
          getRaceStandings(raceId).catch(() => []),
          getViolationsWithEntryDetail().catch(() => []),
        ])
        if (!active) return
        setExecution(exec)
        setStandings(standingsData)
        setRaceViolations(allViolations.filter(v => v.raceId === raceId && v.status === 'Approved'))

        // Re-checked every poll tick (not just once) — a referee/admin could file a new
        // violation report while this screen is already open, which must re-lock Publish.
        if (exec?.status === 'PendingResult') {
          const violationsRes = await getAllViolations({ status: 'Pending', pageSize: 200 }).catch(() => null)
          if (!active) return
          const items = Array.isArray(violationsRes?.items) ? violationsRes.items : []
          setPendingViolationCount(items.filter(v => v.raceId === raceId).length)
        } else {
          setPendingViolationCount(0)
        }
      } catch { /* silent */ }
    }

    fetchExecution()
    pollRef.current = setInterval(fetchExecution, 6000)
    return () => { active = false; clearInterval(pollRef.current) }
  }, [view, selectedRace])

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
    setExecution(null)
    setView('monitor')
  }

  function viewConflict(race) {
    navigate(`/admin/races/${race.raceId}/conflict`)
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
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to close registration')
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
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to start race')
    } finally {
      setRegLoading(false)
    }
  }

  const handlePublishRace = async () => {
    setPublishing(true); setError('')
    try {
      await publishRace(selectedRace.raceId)
      setSelectedRace(prev => ({ ...prev, status: 'Finished' }))
      await loadExecution(selectedRace.raceId)
      await loadRaces()
      setSuccessMsg(`"${selectedRace.name}" published — results are now visible to spectators, jockeys, and horse owners.`)
      setTimeout(() => setSuccessMsg(''), 6000)
    } catch (err) {
      setError(err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.message ?? 'Failed to publish race')
    } finally {
      setPublishing(false)
    }
  }

  const hasAnyConflict = execution?.legs?.some((l) => l.status === 'Conflicted')

  const handleApprove = async (entryId) => {
    setEntryAction({ id: entryId, type: 'Approved' }); setEntryError('')
    try {
      await approveEntry(entryId)
      await loadEntries(selectedRace.raceId)
    } catch (err) {
      setEntryError(err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.message ?? 'Failed to approve entry')
    } finally {
      setEntryAction(null)
    }
  }

  const handleReject = async (entryId) => {
    setEntryAction({ id: entryId, type: 'Rejected' }); setEntryError('')
    try {
      await rejectEntry(entryId, rejectReason.trim())
      setRejectingEntryId(null); setRejectReason('')
      await loadEntries(selectedRace.raceId)
    }
    catch (err) { setEntryError(err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.message ?? 'Failed to reject entry') }
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


  // ═══════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'list') {
    return (
      <div className="max-w-5xl mx-auto">
        <PageHeader view={view} loading={loading} selectedRaceName={selectedRace?.name} selectedRaceStatus={selectedRace?.status}
          onBack={backToList}
          onRefreshList={() => { setLoading(true); loadRaces() }}
          onRefreshMonitor={() => loadExecution(selectedRace?.raceId)} />
        <ErrorBanner msg={error} onDismiss={() => setError('')} />

        {loading ? (
          <div className="flex items-center justify-center py-40">
            <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
          </div>
        ) : allRaces.length === 0 ? (
          <div className="gs-card p-16 text-center">
            <Flag size={40} className="text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-on-surface mb-2">No races need action</h3>
            <p className="text-sm text-on-surface-variant">Races will appear here when they have a status requiring action.</p>
          </div>
        ) : (() => {
          const totalPages = Math.max(1, Math.ceil(allRaces.length / LIST_PAGE_SIZE))
          const pageSafe = Math.min(listPage, totalPages)
          const paginated = allRaces.slice((pageSafe - 1) * LIST_PAGE_SIZE, pageSafe * LIST_PAGE_SIZE)
          return (
            <>
              <div className="space-y-3">
                {paginated.map(race => (
                  <RaceListCard
                    key={race.raceId}
                    race={race}
                    onViewEntries={openEntries}
                    onMonitor={openMonitor}
                    onStartRace={handleStartRace}
                    onViewConflict={viewConflict}
                    pendingViolationCount={pendingViolationCountByRace[race.raceId] ?? 0}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-on-surface-variant">
                    Showing {(pageSafe - 1) * LIST_PAGE_SIZE + 1}–{Math.min(pageSafe * LIST_PAGE_SIZE, allRaces.length)} of {allRaces.length} races
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setListPage(p => Math.max(1, p - 1))} disabled={pageSafe === 1}
                      className="w-7 h-7 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-40 flex items-center justify-center transition-all">
                      <ChevronLeft className="w-3.5 h-3.5 text-on-surface" />
                    </button>
                    <span className="text-xs text-on-surface font-mono px-2">
                      {pageSafe} / {totalPages}
                    </span>
                    <button onClick={() => setListPage(p => Math.min(totalPages, p + 1))} disabled={pageSafe === totalPages}
                      className="w-7 h-7 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-40 flex items-center justify-center transition-all">
                      <ChevronRight className="w-3.5 h-3.5 text-on-surface" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        })()}
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
        <PageHeader view={view} loading={loading} selectedRaceName={selectedRace?.name} selectedRaceStatus={selectedRace?.status}
          onBack={backToList}
          onRefreshList={() => { setLoading(true); loadRaces() }}
          onRefreshMonitor={() => loadExecution(selectedRace?.raceId)} />
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
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => viewConflict(selectedRace)}
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
                          alert(err?.message || 'Failed to resume.')
                        }
                      }}
                      disabled={hasAnyConflict}
                      title={hasAnyConflict ? 'Please override the conflict before resuming' : ''}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={12} /> Resume Race
                    </button>
                  </div>
                )}
              </div>
              {isRegOpen && (
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <button onClick={handleCloseReg} disabled={regLoading || entryStats.approved < 2}
                    title={entryStats.approved < 2 ? `Needs at least 2 approved entries to close registration (currently ${entryStats.approved}).` : ''}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {regLoading ? <Loader2 size={13} className="animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                    Close Registration
                  </button>
                  {entryStats.approved < 2 && (
                    <p className="text-[10px] text-on-surface-variant">Needs ≥2 approved entries ({entryStats.approved} now)</p>
                  )}
                </div>
              )}
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
                        ? <span className="flex items-center gap-1.5 text-amber-400">Base Odds <Lock className="w-3 h-3" /></span>
                        : <span>Base Odds<span className="block text-[10px] font-normal text-on-surface-variant normal-case tracking-normal">(calculated on close)</span></span>}
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
                                    placeholder="Reject reason (required) *"
                                    className="text-xs bg-surface-container-lowest border border-outline-variant/40 rounded px-2 py-1.5 text-on-surface focus:outline-none focus:border-error w-full" />
                                  <div className="flex gap-1.5">
                                    <button disabled={isActing || !rejectReason.trim()} onClick={() => handleReject(entry.entryId)}
                                      className="gs-btn gs-btn-danger gs-btn-sm flex-1 flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed">
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
      <PageHeader view={view} loading={loading} selectedRaceName={selectedRace?.name} selectedRaceStatus={selectedRace?.status}
        onBack={backToList}
        onRefreshList={() => { setLoading(true); loadRaces() }}
        onRefreshMonitor={() => loadExecution(selectedRace?.raceId)} />
      <ErrorBanner msg={error} onDismiss={() => setError('')} />
      <SuccessBanner msg={successMsg} onDismiss={() => setSuccessMsg('')} />

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
                    : selectedRace?.status === 'Finished' ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-blue-400/15 text-blue-400'
                  }`}>
                    {selectedRace?.status === 'InProgress' ? '● LIVE'
                      : selectedRace?.status === 'Finished' ? '✓ PUBLISHED'
                      : selectedRace?.status}
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
                  <button onClick={() => viewConflict(selectedRace)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-500/30 text-xs text-orange-400 hover:bg-orange-500/10 transition-all">
                    <AlertTriangle size={12} /> View Conflict
                  </button>
                  <button onClick={async () => {
                    try {
                      await resumeRace(selectedRace.raceId)
                      setSelectedRace(prev => ({ ...prev, status: 'InProgress' }))
                      loadExecution(selectedRace.raceId)
                      loadRaces()
                    } catch (err) { setError(err?.message || 'Failed to resume.') }
                  }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-all">
                    <ChevronRight size={12} /> Resume Race
                  </button>
                </div>
              )}

              {selectedRace?.status === 'PendingResult' && (
                <div className="flex flex-col items-end gap-1.5">
                  <button
                    onClick={() => setShowPublishPreview(true)}
                    disabled={publishing || pendingViolationCount > 0}
                    title={pendingViolationCount > 0
                      ? `${pendingViolationCount} unresolved violation report${pendingViolationCount > 1 ? 's' : ''} for this race — review them in Violations before publishing.`
                      : ''}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {publishing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    Publish Results
                  </button>
                  {pendingViolationCount > 0 && (
                    <button
                      onClick={() => navigate(`/admin/violations?raceId=${selectedRace.raceId}`)}
                      className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 underline decoration-dotted underline-offset-2"
                    >
                      <AlertTriangle size={10} /> {pendingViolationCount} pending violation{pendingViolationCount > 1 ? 's' : ''}
                    </button>
                  )}
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
                <div key={leg.legNumber ?? idx}>
                <div className="px-5 py-4 flex items-center justify-between gap-4">
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
                {leg.results?.length > 0 && (
                  <div className="px-5 pb-4 -mt-2">
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1.5">Official results</p>
                    <div className="flex flex-wrap gap-2">
                      {leg.results.map((r) => (
                        <span key={r.entryId} className="text-xs px-2 py-0.5 rounded bg-surface-container-high text-on-surface">
                          Entry #{r.entryId}: {r.position === -1 ? 'DNF' : r.position === -2 ? 'DQ' : `#${r.position}`} ({r.points}p)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                </div>
              ))}
            </div>
          </div>

          {/* Conflict banner — resolution happens on the dedicated Conflict Resolution page */}
          {selectedRace?.status === 'Paused' && hasConflict && (
            <div className="gs-card border-orange-500/30">
              <div className="px-5 py-4 flex items-start gap-3">
                <AlertTriangle size={18} className="text-orange-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-orange-400 text-sm">Conflict detected — Race paused</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    The two referees submitted different results for Leg {(execution.legs.findIndex(l => l.status === 'Conflicted') ?? -1) + 1}.
                  </p>
                </div>
                <button onClick={() => viewConflict(selectedRace)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black text-sm font-bold transition-all shrink-0">
                  <Shield size={14} /> Resolve Conflict
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
              {/* Tie warning — same total points alone doesn't tell you who's actually ahead.
                  The criteria listed here must match RaceRankingCalculator on the BE exactly:
                  it used to say "top-3 finishes", which was the old standings-only formula —
                  Publish actually used 2nd places then last-leg position, so Admin and the
                  published result disagreed whenever entries tied on points. */}
              {standings.some((s, i) => i > 0 && s.totalPoints === standings[0].totalPoints) && (
                <div className="px-5 py-2.5 bg-sky-500/10 border-b border-sky-500/20 flex items-start gap-2">
                  <AlertTriangle size={12} className="text-sky-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-sky-300">
                    2 or more entries are tied on points — ranking is decided by <strong>most leg wins</strong>, then <strong>most 2nd places</strong>, then the <strong>better position in the final leg</strong> (see W / 2nd below each entry). Race-DQ entries always sit at the bottom. This is the same order Publish will use.
                  </p>
                </div>
              )}
              <div className="divide-y divide-white/5">
                {standings.map((s, i) => {
                  const { lines, penaltyLines, isRaceDQ, hasPenalty } = buildScoreBreakdown(s.entryId, execution, raceViolations)
                  const tooltip = lines.length > 0
                    ? `${lines.join('\n')}${isRaceDQ ? '\nRace DQ — 0 points regardless of leg results.' : ''}`
                    : 'No confirmed legs yet.'
                  return (
                    <div key={s.entryId} className="px-5 py-3 flex items-center gap-4">
                      <span className={`w-6 text-center font-bold text-lg ${
                        i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'
                      }`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-on-surface truncate">{s.horseName || `Entry #${s.entryId}`}</p>
                        {s.position && <p className="text-[10px] text-gray-500">Current pos: {s.position}</p>}
                        {/* Always-visible penalty summary — this used to be hidden inside a
                            hover-only title tooltip, which is exactly why it read as "just a
                            vague warning icon" with no way to tell what actually happened. */}
                        {penaltyLines.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {penaltyLines.map((line, idx) => (
                              <p
                                key={idx}
                                className={`text-[10px] flex items-center gap-1 ${
                                  !line.scoreAffected ? 'text-sky-400' : isRaceDQ ? 'text-red-400' : 'text-amber-400'
                                }`}
                              >
                                <AlertTriangle size={9} className="shrink-0" />
                                {line.text}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0" title={tooltip}>
                        <p className="text-sm font-bold text-yellow-400 font-mono flex items-center gap-1 justify-end cursor-help">
                          {hasPenalty && (
                            <AlertTriangle size={11} className={isRaceDQ ? 'text-red-400' : 'text-amber-400'} />
                          )}
                          {s.totalPoints}p
                        </p>
                        {/* Tie-break stats — always visible, not just on hover, since a tied
                            point total gives no clue on its own why one entry outranks another. */}
                        <p className="text-[10px] text-gray-500">
                          W:{s.legWins ?? 0} · 2nd:{s.leg2nds ?? 0}
                        </p>
                        {isRaceDQ && <span className="text-[10px] text-red-400 ml-1">DQ</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {showPublishPreview && selectedRace && (
        <RaceResultsModal
          raceId={selectedRace.raceId}
          raceName={selectedRace.name}
          fetchStandings={getRaceStandings}
          fetchResults={getRaceResults}
          onClose={() => setShowPublishPreview(false)}
          footer={
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-outline-variant/40">
              <p className="text-xs text-on-surface-variant">
                Review the ranking above — this is exactly what other roles will see once published.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowPublishPreview(false)}
                  className="px-3 py-1.5 rounded-lg border border-outline-variant/40 text-xs text-on-surface-variant hover:bg-surface-container-high transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await handlePublishRace()
                    setShowPublishPreview(false)
                  }}
                  disabled={publishing}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {publishing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Confirm &amp; Publish
                </button>
              </div>
            </div>
          }
        />
      )}
    </div>
  )
}
