import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Flag, AlertCircle, ChevronLeft, RefreshCw, Loader2,
  Zap, CheckCircle2, Eye, Clock, Users, Trophy,
  Play, EyeOff, Lock, Shield,
} from 'lucide-react'
import {
  getRaceDetail,
  getRaceExecutionStatus,
  getRaceStandings,
  getRefereeLegView,
  getAllTournaments,
  getLegDetail,
  getRaceResults,
} from '../../api/referee'
import RaceResultsModal from '../../components/RaceResultsModal'

// ─── Constants ────────────────────────────────────────────────────────────────

function fmtDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function getStatusMeta(status) {
  const meta = {
    Scheduled:    { label: 'Scheduled',    cls: 'bg-primary/15 text-primary border-primary/30', icon: Clock },
    InProgress:  { label: 'In Progress',  cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Play },
    Paused:      { label: 'Paused',        cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30', icon: AlertCircle },
    PendingResult: { label: 'Pending Result', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: Trophy },
    Finished:    { label: 'Finished',     cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
    Cancelled:   { label: 'Cancelled',    cls: 'bg-red-500/15 text-red-400 border-red-500/30', icon: AlertCircle },
  }
  return meta[status] ?? { label: status ?? '—', cls: 'bg-gray-500/15 text-gray-400 border-gray-500/30', icon: Clock }
}

function PositionBadge({ value }) {
  if (!value) return <span className="text-gray-600 font-mono text-xs">—</span>
  if (value === -1) return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-500/20 text-gray-400 border border-gray-600">DNF</span>
  )
  if (value === -2) return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-700">DQ</span>
  )
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-400/15 text-yellow-400 border border-yellow-700">
      P{value}
    </span>
  )
}

function getLegStatusMeta(status) {
  const meta = {
    Pending:              { cls: 'bg-yellow-500/15 text-yellow-400', label: 'Pending', dot: 'bg-yellow-400' },
    AwaitingSecondReferee: { cls: 'bg-blue-500/15 text-blue-400', label: 'Waiting', dot: 'bg-blue-400 animate-pulse' },
    Confirmed:           { cls: 'bg-emerald-500/15 text-emerald-400', label: 'Confirmed', dot: 'bg-emerald-400' },
    Conflicted:          { cls: 'bg-orange-500/15 text-orange-400', label: 'Conflict', dot: 'bg-orange-400 animate-pulse' },
    Resolved:            { cls: 'bg-purple-500/15 text-purple-400', label: 'Resolved', dot: 'bg-purple-400' },
  }
  return meta[status] ?? { cls: 'bg-gray-500/15 text-gray-400', label: status, dot: 'bg-gray-400' }
}

// ─── Race Status Badge ────────────────────────────────────────────────────────

function RaceStatusBadge({ status }) {
  const meta = getStatusMeta(status)
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${meta.cls}`}>
      <Icon size={12} />
      {meta.label}
    </span>
  )
}

// ─── Leg Progress Stepper ─────────────────────────────────────────────────────

function LegProgressStepper({ legs, currentLegIndex, onLegSelect }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {legs.map((leg, idx) => {
        const meta = getLegStatusMeta(leg.status)
        const isActive = idx === currentLegIndex
        // Every leg is viewable (read-only review of a Confirmed/Resolved leg's submission
        // status) — GetRefereeLegView works for any leg regardless of status. Only the
        // "Enter Leg Results" action button (elsewhere) is gated to the current actionable leg.

        return (
          <button
            key={idx}
            onClick={() => onLegSelect(idx)}
            className={`shrink-0 flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border transition-all min-w-[100px] cursor-pointer
              ${isActive
                ? 'border-yellow-400/50 bg-yellow-400/5 shadow-lg shadow-yellow-400/10'
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
              }`}
          >
            <div className="relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${meta.cls} border-current`}>
                {leg.status === 'Confirmed' ? (
                  <CheckCircle2 size={14} />
                ) : leg.status === 'Conflicted' ? (
                  <AlertCircle size={14} />
                ) : (
                  idx + 1
                )}
              </div>
              {leg.status === 'Pending' && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse" />
              )}
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-on-surface">Leg {idx + 1}</p>
              <p className={`text-[10px] ${isActive ? 'text-yellow-400' : 'text-on-surface-variant'}`}>
                {meta.label}
              </p>
            </div>
            {leg.referee1Submitted && leg.referee2Submitted && (
              <span className="text-[9px] text-emerald-400 font-medium">Both submitted</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Entry Table ───────────────────────────────────────────────────────────────

function EntryTable({ entries, standings }) {
  const standingsMap = standings.reduce((acc, s) => {
    acc[s.entryId] = s
    return acc
  }, {})

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-4 py-3 text-left text-xs text-on-surface-variant font-medium uppercase tracking-wider w-16">Gate</th>
            <th className="px-3 py-3 text-left text-xs text-on-surface-variant font-medium uppercase tracking-wider">Horse</th>
            <th className="px-3 py-3 text-left text-xs text-on-surface-variant font-medium uppercase tracking-wider">Jockey</th>
            <th className="px-3 py-3 text-center text-xs text-on-surface-variant font-medium uppercase tracking-wider w-20">Points</th>
            <th className="px-3 py-3 text-center text-xs text-on-surface-variant font-medium uppercase tracking-wider w-20">Rank</th>
          </tr>
        </thead>
        <tbody>
          {(standings.length > 0 ? standings : entries).map((item, i) => {
            const entry = standingsMap[item.entryId] || item
            return (
              <tr
                key={item.entryId}
                className="border-b border-white/5 hover:bg-white/3 transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs font-bold text-yellow-400/70">
                  #{String(entry.gateNumber ?? (i + 1)).padStart(2, '0')}
                </td>
                <td className="px-3 py-3">
                  <p className="font-semibold text-on-surface text-sm">{entry.horseName || `Horse #${entry.horseId}`}</p>
                </td>
                <td className="px-3 py-3 text-on-surface-variant text-sm">
                  {entry.jockeyName || '—'}
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="font-mono font-bold text-yellow-400/80">
                    {entry.totalPoints ?? 0}p
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  {i < 3 ? (
                    <span className={`text-sm font-bold ${
                      i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : 'text-orange-400'
                    }`}>
                      #{i + 1}
                    </span>
                  ) : (
                    <span className="text-sm text-on-surface-variant">#{i + 1}</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Leg-by-Leg Results ──────────────────────────────────────────────────────
// "Current Standings" only shows the cumulative total — cross-checking it
// against each individual leg meant clicking through the stepper leg by leg.
// This lays every leg's official result out side-by-side against the total.

function LegByLegTable({ standings, legs, resolutionNotes, resolutionNotesLoading }) {
  if (standings.length === 0 || legs.length === 0) return null

  return (
    <div className="gs-card overflow-hidden mt-6">
      <div className="px-5 py-4 border-b border-white/10">
        <h3 className="font-semibold text-on-surface text-sm flex items-center gap-2">
          <Trophy size={14} className="text-yellow-400" />
          Leg-by-Leg Results
        </h3>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Cross-check each leg's official result against the totals above.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-3 text-left text-xs text-on-surface-variant font-medium uppercase tracking-wider">Horse</th>
              {legs.map((leg, idx) => (
                <th key={idx} className="px-3 py-3 text-center text-xs text-on-surface-variant font-medium uppercase tracking-wider whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    Leg {idx + 1}
                    {leg.status === 'Resolved' && (
                      <Shield size={11} className="text-purple-400" title="Resolved by Admin — see note below" />
                    )}
                  </span>
                </th>
              ))}
              <th className="px-3 py-3 text-center text-xs text-on-surface-variant font-medium uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s) => (
              <tr key={s.entryId} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-semibold text-on-surface text-sm truncate">{s.horseName || `Entry #${s.entryId}`}</p>
                  <p className="text-xs text-on-surface-variant">Gate #{s.gateNumber ?? '—'}</p>
                </td>
                {legs.map((leg, idx) => {
                  const result = leg.results?.find((r) => r.entryId === s.entryId)
                  return (
                    <td key={idx} className="px-3 py-3 text-center">
                      {result ? (
                        <div className="inline-flex items-center gap-1.5">
                          <PositionBadge value={result.position} />
                          <span className="text-[10px] font-mono text-yellow-400/70">{result.points}p</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600">
                          {leg.status === 'Conflicted' ? 'Conflict' : '—'}
                        </span>
                      )}
                    </td>
                  )
                })}
                <td className="px-3 py-3 text-center">
                  <span className="font-mono font-bold text-yellow-400">{s.totalPoints}p</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Admin resolution notes — kept on this same page (instead of only the leg's own
          notification link) so the referee can read the reason right next to the
          leg-by-leg breakdown, without leaving to a separate page to cross-check it. */}
      {(resolutionNotesLoading || Object.keys(resolutionNotes ?? {}).length > 0) && (
        <div className="border-t border-white/10 px-5 py-4">
          <h4 className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Shield size={12} />
            Admin Resolution Notes
          </h4>
          {resolutionNotesLoading ? (
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <Loader2 size={12} className="animate-spin" /> Loading…
            </div>
          ) : (
            <div className="space-y-2">
              {Object.values(resolutionNotes)
                .sort((a, b) => a.legNumber - b.legNumber)
                .map((note) => (
                  <div key={note.legNumber} className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/15">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="text-xs font-semibold text-on-surface">Leg {note.legNumber}</span>
                      <span className="text-[10px] text-on-surface-variant font-mono">{fmtDateTime(note.confirmedAt)}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant italic">
                      {note.adminOverrideReason || 'No reason recorded'}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function RefereeRaceDashboard() {
  const { id: raceId } = useParams()
  const navigate = useNavigate()
  const isMountedRef = useRef(true)

  // Data state
  const [race, setRace] = useState(null)
  const [tournament, setTournament] = useState(null)
  const [execution, setExecution] = useState(null)
  const [standings, setStandings] = useState([])
  const [legView, setLegView] = useState(null)
  const [resolutionNotes, setResolutionNotes] = useState({})
  const [resolutionNotesLoading, setResolutionNotesLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)

  // UI state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentLegIndex, setCurrentLegIndex] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  // Poll ref
  const pollRef = useRef(null)

  // ── Load data ──
  const loadRaceData = useCallback(async () => {
    try {
      const [raceDetail, execData, standingsData, tournaments] = await Promise.all([
        getRaceDetail(raceId),
        getRaceExecutionStatus(raceId),
        getRaceStandings(raceId).catch(() => []),
        getAllTournaments().catch(() => []),
      ])

      if (!isMountedRef.current) return

      setRace(raceDetail)
      setExecution(execData)
      setStandings(standingsData)
      setTournament(tournaments.find(t => t.tournamentId === raceDetail?.tournamentId) ?? null)

      // Determine current leg
      const activeLeg = execData?.currentLegIndex ?? 0
      setCurrentLegIndex(activeLeg)

      // Load leg view for current leg
      if (execData?.status === 'InProgress' || execData?.status === 'Paused') {
        const view = await getRefereeLegView(raceId, activeLeg).catch(() => null)
        if (isMountedRef.current) setLegView(view)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load race data')
      }
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [raceId])

  // ── Refresh ──
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadRaceData()
    setRefreshing(false)
  }, [loadRaceData])

  // ── Initial load ──
  useEffect(() => {
    isMountedRef.current = true
    loadRaceData()
    return () => { isMountedRef.current = false }
  }, [loadRaceData])

  // Set once the referee manually browses to a leg (including past ones) — stops the poll
  // below from snapping the view back to the live leg every 8s while they're reviewing.
  const manualLegSelectRef = useRef(false)

  // ── Polling ──
  useEffect(() => {
    if (!race) return
    pollRef.current = setInterval(() => {
      getRaceExecutionStatus(raceId)
        .then(exec => {
          if (isMountedRef.current) {
            setExecution(exec)
            // Only auto-follow the live leg if the referee hasn't manually navigated away.
            if (exec.currentLegIndex !== currentLegIndex && !manualLegSelectRef.current) {
              setCurrentLegIndex(exec.currentLegIndex)
              getRefereeLegView(raceId, exec.currentLegIndex)
                .then(view => {
                  if (isMountedRef.current) setLegView(view)
                })
                .catch(() => {})
            }
          }
        })
        .catch(() => {})
    }, 8000)
    return () => clearInterval(pollRef.current)
  }, [race, raceId, currentLegIndex])

  // ── Admin resolution notes (for the Leg-by-Leg Results table) ──
  // Fetches the reason for every Resolved leg once, then only re-fetches whichever
  // leg numbers are newly Resolved — so this doesn't re-hit the API every 8s poll
  // for legs it already has the note for.
  useEffect(() => {
    const resolvedLegNumbers = (execution?.legs ?? [])
      .filter((l) => l.status === 'Resolved')
      .map((l) => l.legNumber)
    const missing = resolvedLegNumbers.filter((n) => !(n in resolutionNotes))
    if (missing.length === 0) return

    let active = true
    setResolutionNotesLoading(true)
    Promise.allSettled(missing.map((n) => getLegDetail(raceId, n)))
      .then((results) => {
        if (!active) return
        setResolutionNotes((prev) => {
          const next = { ...prev }
          results.forEach((r, i) => {
            if (r.status === 'fulfilled' && r.value) next[missing[i]] = r.value
          })
          return next
        })
      })
      .finally(() => { if (active) setResolutionNotesLoading(false) })
    return () => { active = false }
  }, [raceId, execution, resolutionNotes])

  // ── Handlers ──
  function handleLegSelect(idx) {
    // Resume auto-following the live leg once the referee clicks back onto it; otherwise
    // treat this as a deliberate review of a different (often past) leg.
    manualLegSelectRef.current = idx !== (execution?.currentLegIndex ?? idx)
    setCurrentLegIndex(idx)
    getRefereeLegView(raceId, idx)
      .then(view => {
        if (isMountedRef.current) setLegView(view)
      })
      .catch(() => {})
  }

  function handleContinueLeg() {
    navigate(`/referee/races/${raceId}/legs/${currentLegIndex}`)
  }

  function handleViewResults() {
    setShowResults(true)
  }

  // ── Derived ──
  const legs = execution?.legs ?? []
  const currentLeg = legs[currentLegIndex]
  const statusMeta = race ? getStatusMeta(race.status) : null

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-yellow-400 animate-spin mx-auto mb-4" />
          <p className="text-on-surface-variant text-sm">Loading race data...</p>
        </div>
      </div>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate('/referee')}
              className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
          <div className="gs-card p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 font-semibold mb-2">{error}</p>
            <button onClick={handleRefresh} className="gs-btn gs-btn-primary mt-4">
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main Render ──
  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/referee')}
            className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/25 flex items-center justify-center">
            <Flag size={20} className="text-yellow-400" />
          </div>
          <div className="flex-1">
            <h1 className="font-serif text-2xl font-bold text-on-surface">Race Dashboard</h1>
            <p className="text-xs text-on-surface-variant">
              {race?.name || 'Race Control Center'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Error Banner ─────────────────────────────────────── */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        {/* ── Race Info Card ────────────────────────────────────── */}
        <div
          className="gs-card p-6 mb-6"
          style={{ borderLeft: '3px solid rgba(251,191,36,0.6)' }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {race && <RaceStatusBadge status={race.status} />}
                {execution?.isBetsLocked && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                    <Lock size={10} /> Bets Locked
                  </span>
                )}
                {race?.status === 'Paused' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/30 animate-pulse">
                    <Zap size={10} /> Waiting Admin
                  </span>
                )}
              </div>
              {tournament?.name && (
                <p className="text-xs font-semibold text-yellow-400/80 uppercase tracking-widest mb-1">
                  {tournament.name}
                </p>
              )}
              <h2 className="font-serif text-3xl font-bold text-on-surface mb-1">{race?.name}</h2>
              <div className="flex items-center gap-4 text-sm text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {fmtDateTime(race?.scheduledStartTime || race?.startedAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Trophy size={14} />
                  {execution?.totalLegs ?? race?.numberOfLegs ?? 1} Legs
                </span>
                <span className="flex items-center gap-1.5">
                  <Users size={14} />
                  {standings.length > 0 ? standings.length : legView?.entries?.length ?? 0} Entries
                </span>
              </div>
            </div>

            {/* Action Button */}
            <div className="shrink-0">
              {race?.status === 'Scheduled' && (
                <button
                  onClick={() => navigate('/referee')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm transition-all"
                >
                  <Play size={16} />
                  Go to Pre-Race Checklist
                </button>
              )}
              {race?.status === 'InProgress' && (
                <button
                  onClick={handleContinueLeg}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm transition-all"
                >
                  <Flag size={16} />
                  Continue Leg {currentLegIndex + 1}
                </button>
              )}
              {race?.status === 'Paused' && (
                <div className="text-center">
                  <p className="text-orange-400 text-sm font-semibold mb-2">Race Paused</p>
                  <p className="text-xs text-on-surface-variant">Waiting for Admin resolution...</p>
                </div>
              )}
              {race?.status === 'Finished' && (
                <button
                  onClick={handleViewResults}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold text-sm transition-all"
                >
                  <Eye size={16} />
                  View Results
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Leg Progress Stepper ──────────────────────────────── */}
        {legs.length > 0 && (
          <div className="gs-card p-5 mb-6">
            <h3 className="text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
              <Zap size={14} className="text-yellow-400" />
              Race Progress
            </h3>
            <LegProgressStepper
              legs={legs}
              currentLegIndex={currentLegIndex}
              onLegSelect={handleLegSelect}
            />
          </div>
        )}

        {/* ── Two Column Layout ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left: Current Leg Status */}
          <div className="gs-card overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="font-semibold text-on-surface text-sm">
                Current Leg Status
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Leg {currentLegIndex + 1} of {legs.length}
              </p>
            </div>

            {currentLeg ? (
              <div className="p-5">
                {/* Leg Status */}
                <div className="flex items-center gap-3 mb-4">
                  {(() => {
                    const meta = getLegStatusMeta(currentLeg.status)
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${meta.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                    )
                  })()}
                </div>

                {/* Referee Status — derived from execution.legs (always populated, regardless of
                    race status), not the blind-entry-only `legView` (which is only fetched while
                    the race is InProgress/Paused, so it stays stale/null for a Confirmed leg on a
                    race that has since moved to PendingResult/Finished). */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-sm text-on-surface-variant">Your Submission</span>
                    {currentLeg.mySubmitted ? (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                        <CheckCircle2 size={14} /> Submitted
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Clock size={14} /> Pending
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-sm text-on-surface-variant">Opponent Referee</span>
                    {(currentLeg.mySubmitted
                      ? currentLeg.referee1Submitted && currentLeg.referee2Submitted
                      : currentLeg.referee1Submitted || currentLeg.referee2Submitted) ? (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                        <CheckCircle2 size={14} /> Submitted
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Loader2 size={14} className="animate-spin" /> Waiting...
                      </span>
                    )}
                  </div>
                </div>

                {/* Privacy Notice — only relevant while the leg is still blind (not yet Confirmed) */}
                {(currentLeg.status === 'Pending' || currentLeg.status === 'AwaitingSecondReferee') && (
                  <div className="mt-4 p-3 rounded-lg bg-yellow-400/5 border border-yellow-400/20">
                    <p className="text-xs text-on-surface-variant flex items-start gap-2">
                      <EyeOff size={14} className="text-yellow-400/70 shrink-0 mt-0.5" />
                      <span>
                        <span className="text-yellow-400/80 font-medium">Blind Entry Active: </span>
                        Your submission is hidden from the other referee until both submit.
                      </span>
                    </p>
                  </div>
                )}

                {/* Action */}
                {(race?.status === 'InProgress') && !currentLeg.mySubmitted && (
                  <button
                    onClick={handleContinueLeg}
                    className="w-full mt-4 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm transition-all"
                  >
                    <Flag size={16} />
                    Enter Leg {currentLegIndex + 1} Results
                  </button>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-on-surface-variant text-sm">
                No leg data available
              </div>
            )}
          </div>

          {/* Right: Standings */}
          <div className="gs-card overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="font-semibold text-on-surface text-sm flex items-center gap-2">
                <Trophy size={14} className="text-yellow-400" />
                Current Standings
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Live points update
              </p>
            </div>

            {standings.length > 0 ? (
              <div className="divide-y divide-white/5">
                {standings.map((s, i) => (
                  <div key={s.entryId} className="px-5 py-3 flex items-center gap-4">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
                        : i === 1 ? 'bg-gray-300/20 text-gray-300 border border-gray-300/30'
                        : i === 2 ? 'bg-orange-400/20 text-orange-400 border border-orange-400/30'
                        : 'bg-white/10 text-on-surface-variant'
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">
                        {s.horseName || `Entry #${s.entryId}`}
                      </p>
                      <p className="text-[10px] text-on-surface-variant">
                        Jockey: {s.jockeyName || '—'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-yellow-400 font-mono">{s.totalPoints}p</p>
                      <p className="text-[10px] text-on-surface-variant">
                        {s.legWins ?? 0} wins
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-on-surface-variant text-sm">
                No standings data yet
              </div>
            )}
          </div>
        </div>

        {/* ── Leg-by-Leg Results ────────────────────────────────── */}
        <LegByLegTable
          standings={standings}
          legs={legs}
          resolutionNotes={resolutionNotes}
          resolutionNotesLoading={resolutionNotesLoading}
        />

        {/* ── Leg Legend ────────────────────────────────────────── */}
        <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-on-surface-variant text-center">
            <span className="font-semibold">Points System:</span>{' '}
            scaled to the field of {standings.length || legView?.entries?.length || 0} horses — 1st = {standings.length || legView?.entries?.length || 0}pts
            {(standings.length || legView?.entries?.length || 0) > 1 && <> · 2nd = {(standings.length || legView?.entries?.length) - 1}pts</>}
            {' '}· last = 1pt · DNF/DQ = 0pt
          </p>
        </div>
      </div>

      {showResults && (
        <RaceResultsModal
          raceId={Number(raceId)}
          raceName={race?.name}
          onClose={() => setShowResults(false)}
          fetchStandings={getRaceStandings}
          fetchResults={getRaceResults}
        />
      )}
    </div>
  )
}
