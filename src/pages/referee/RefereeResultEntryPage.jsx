import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Flag, AlertCircle, Info, Lock, CheckCircle2, ChevronLeft,
  RefreshCw, Save, Send, Eye, EyeOff, Zap, Loader2,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  getRefereeLegView,
  saveLegDraft,
  submitLegResult,
  getRaceExecutionStatus,
  getRaceStandings,
  getAllRaces,
  getRaceDetail,
} from '../../api/referee'
import { validateLegPositions } from '../../utils/legValidation'

// Store a session key for each (raceId, legIndex) that has been submitted, to prevent
// duplicates when the user opens multiple tabs. Key resets when the tab closes (sessionStorage).
function getSubmitSessionKey(raceId, legIndex) {
  return `referee-submitted-${raceId}-${legIndex}`
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEG_POINTS = { 1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 }

function getLegPoints(position) {
  if (!position || position < 1) return 0
  return LEG_POINTS[position] ?? 0
}

function fmtDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Race Picker ────────────────────────────────────────────────────────────

function RacePickerScreen({ userId, onPick }) {
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const list = await getAllRaces()
        // Filter InProgress races this referee is assigned to
        const inProgress = list.filter(
          r => r.status === 'InProgress' || r.status === 'Paused',
        )
        // Fetch details to filter by referee
        const settled = await Promise.allSettled(
          inProgress.map(r => getRaceDetail(r.raceId)),
        )
        const myRaces = settled
          .filter(s => s.status === 'fulfilled')
          .map(s => s.value)
          .filter(r => r.referee1Id === userId || r.referee2Id === userId)
        setRaces(myRaces)
      } catch (err) {
        setError(err?.message || 'Failed to load the race list.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  if (loading) return (
    <div className="flex items-center justify-center py-40">
      <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
    </div>
  )

  if (error) return (
    <div className="text-center py-16">
      <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
      <p className="text-red-400 text-sm">{error}</p>
    </div>
  )

  return (
    <div className="py-12">
      <div className="text-center mb-8">
        <Flag size={36} className="text-yellow-400/40 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-on-surface mb-1">Race Execution</h2>
        <p className="text-on-surface-variant text-sm">
          {races.length === 0
            ? 'No races currently in progress'
            : 'Select a race to start entering results'}
        </p>
      </div>

      {races.length === 0 ? (
        <div className="gs-card max-w-sm mx-auto p-10 text-center">
          <p className="text-on-surface-variant text-sm">
            Races you are assigned to will appear here once they begin.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-w-lg mx-auto">
          {races.map(race => (
            <button
              key={race.raceId}
              onClick={() => onPick(race)}
              className="gs-card p-5 text-left hover:border-yellow-400/30 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-on-surface group-hover:text-yellow-400 transition-colors">
                    {race.name}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {fmtDateTime(race.scheduledStartTime || race.startedAt)}
                  </p>
                  {race.status === 'Paused' && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-orange-400">
                      <Zap size={11} /> Currently paused — awaiting admin action
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-xs text-on-surface-variant mt-0.5">
                  {race.numberOfLegs ?? 1} leg{race.numberOfLegs > 1 ? 's' : ''}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Position Badge ─────────────────────────────────────────────────────────

function PositionBadge({ value }) {
  if (!value) return <span className="text-gray-600 font-mono text-sm">—</span>
  if (value === -1) return (
    <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-500/20 text-gray-400 border border-gray-600">DNF</span>
  )
  if (value === -2) return (
    <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-700">DQ</span>
  )
  return (
    <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-400/15 text-yellow-400 border border-yellow-700">
      P{value}
    </span>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function RefereeResultEntryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const userId = user?.userId

  const location = useLocation()
  const preselectedRaceId = location.state?.raceId ?? null

  // Race state
  const [race, setRace] = useState(null)
  const [execution, setExecution] = useState(null)
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeLegIndex, setActiveLegIndex] = useState(0) // 0-indexed

  // Position inputs: { [legIndex]: { [entryId]: number | -1 | -2 | '' } }
  const [positions, setPositions] = useState({})
  const [draftSaved, setDraftSaved] = useState(false)

  // 401/loading errors - don't crash the page, show a message instead
  const [legError, setLegError] = useState('')

  // Submission
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitResult, setSubmitResult] = useState(null) // { status, message }

  // Local lock flag — set immediately when the user clicks submit (before the API responds).
  // Needed to prevent double-click & multi-tab duplicate submission.
  // Initialized to false since raceId has no value yet at init time.
  const [hasSubmitted, setHasSubmitted] = useState(false)

  // Sync hasSubmitted from sessionStorage when race or activeLegIndex changes.
  // Reset hasSubmitted to false when switching legs (each leg has its own sessionStorage key).
  useEffect(() => {
    const id = race?.raceId ?? preselectedRaceId
    if (id == null) return
    const key = getSubmitSessionKey(id, activeLegIndex)
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem(key)) {
        setHasSubmitted(true)
      } else {
        setHasSubmitted(false)
      }
    }
  }, [race, activeLegIndex, preselectedRaceId])

  // Referee view (blind)
  const [legView, setLegView] = useState(null)
  const [loadingLeg, setLoadingLeg] = useState(false)

  const pollRef = useRef(null)
  const isMountedRef = useRef(true)

  // Use a ref to avoid stale closures without causing a re-render loop
  const positionsRef = useRef(positions)
  useEffect(() => { positionsRef.current = positions }, [positions])

  // ── Load race + execution ──
  const loadRace = useCallback(async (raceId) => {
    setLoading(true)
    setError('')
    try {
      const [raceDetail, execData, standingsData] = await Promise.all([
        getRaceDetail(raceId),
        getRaceExecutionStatus(raceId),
        getRaceStandings(raceId).catch(() => []),
      ])
      if (!isMountedRef.current) return
      setRace(raceDetail)
      setExecution(execData)
      setStandings(standingsData)
      // Init positions from legView (will be fetched below)
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err?.message || 'Failed to load race information.')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [])

  // ── Load leg view (blind) ──
  const loadLegView = useCallback(async (raceId, legIndex) => {
    setLoadingLeg(true)
    setDraftSaved(false)
    setLegError('')
    try {
      const view = await getRefereeLegView(raceId, legIndex)
      if (!isMountedRef.current) return
      setLegView(view)

      // Sync hasSubmitted from sessionStorage + server (in case
      // another tab already submitted before polling picks up the update).
      const sessionFlag = typeof window !== 'undefined'
        && Boolean(sessionStorage.getItem(getSubmitSessionKey(raceId, legIndex)))
      if ((sessionFlag || view?.mySubmitted) && isMountedRef.current) {
        setHasSubmitted(true)
      }

      // Init entries array if missing (in case the API returns null)
      const entriesData = view?.entries ?? []

      // Pre-fill positions from mySubmittedData if available
      if (view?.mySubmittedData && Array.isArray(view.mySubmittedData)) {
        setPositions(prev => {
          const newPos = { ...prev }
          view.mySubmittedData.forEach(item => {
            newPos[item.entryId] = item.position ?? ''
          })
          return newPos
        })
      } else {
        // Only reset to empty when NO entry has been assigned a position yet.
        // Avoids a stale-closure reset wiping out data the user is mid-typing.
        // Use a ref instead of state to avoid a dependency loop.
        const posSlice = positionsRef.current[legIndex] ?? {}
        const hasAnyPosition = Object.values(posSlice).some(
          (p) => p !== null && p !== undefined && p !== '',
        )
        if (!hasAnyPosition && entriesData.length > 0) {
          const empty = {}
          entriesData.forEach(e => { empty[e.entryId] = '' })
          setPositions(prev => {
            // Only set if the current state is also empty (avoid overwriting user input)
            const currentPos = prev[legIndex] ?? {}
            const currentHasValue = Object.values(currentPos).some(v => v !== '' && v != null)
            if (currentHasValue) return prev
            return { ...prev, [legIndex]: empty }
          })
        }
      }
    } catch (err) {
      if (!isMountedRef.current) return
      // 401 = race is conflicted, user doesn't have permission to view yet
      // 404 = leg doesn't exist or is already confirmed
      // Other errors = could be race paused or a network issue
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setLegError('You do not have permission to view this leg. The race may have a discrepancy between the two referees.')
      } else if (err?.response?.status === 404) {
        setLegError('This leg does not exist or has already been confirmed.')
      } else {
        setLegError('Failed to load leg data. Retrying...')
      }
      console.error('Failed to load leg view:', err)
    } finally {
      if (isMountedRef.current) setLoadingLeg(false)
    }
  // Removed positions from deps - use positionsRef instead to avoid a re-render loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Refresh execution status (polling) ──
  const refreshExecution = useCallback(async (raceId) => {
    try {
      const [execData, standingsData] = await Promise.all([
        getRaceExecutionStatus(raceId),
        getRaceStandings(raceId).catch(() => []),
      ])
      if (!isMountedRef.current) return
      setExecution(execData)
      setStandings(standingsData)

      // Check sessionStorage to see if another tab already submitted.
      const sessionFlag = Boolean(
        sessionStorage.getItem(getSubmitSessionKey(raceId, activeLegIndex)),
      )
      if (sessionFlag) {
        setHasSubmitted(true)
      }

      // Reload leg view if current leg is still open
      if (execData.status === 'InProgress' || execData.status === 'Paused') {
        const currentLegIdx = execData.currentLegIndex ?? activeLegIndex
        const currentLeg = execData.legs?.[currentLegIdx]
        if (currentLeg && currentLeg.status === 'Pending') {
          loadLegView(raceId, currentLegIdx)
        }
      }
    } catch { /* silent polling fail */ }
  }, [activeLegIndex, loadLegView])

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  // Load race on mount (if preselected)
  useEffect(() => {
    if (preselectedRaceId) {
      loadRace(preselectedRaceId)
    }
  }, [preselectedRaceId, loadRace])

  // Start polling when race is loaded
  // Only poll execution status - do NOT reload the leg view during polling,
  // to avoid a race condition that reloads the modal while the user is entering data.
  // Use a ref to track the previous leg status instead of a state dependency, to avoid an infinite loop.
  useEffect(() => {
    if (!race) return
    let previousLegStatus = null

    pollRef.current = setInterval(async () => {
      try {
        const [execData, standingsData] = await Promise.all([
          getRaceExecutionStatus(race.raceId),
          getRaceStandings(race.raceId).catch(() => []),
        ])
        if (!isMountedRef.current) return
        setExecution(execData)
        setStandings(standingsData)

        // Check sessionStorage to see if another tab already submitted.
        const sessionFlag = Boolean(
          sessionStorage.getItem(getSubmitSessionKey(race.raceId, activeLegIndex)),
        )
        if (sessionFlag) {
          setHasSubmitted(true)
        }

        // Check the current leg
        const currentLegIdx = execData.currentLegIndex ?? activeLegIndex
        const currentLeg = execData.legs?.[currentLegIdx]

        // When the current leg is confirmed (both referees agree)
        if (currentLegIdx === activeLegIndex && currentLeg?.status === 'Confirmed') {
          // Auto-advance to next leg if available
          if (execData.currentLegIndex !== undefined && execData.currentLegIndex !== activeLegIndex) {
            setTimeout(() => {
              if (isMountedRef.current) {
                setActiveLegIndex(execData.currentLegIndex)
              }
            }, 2000)
          }
          return
        }

        // Only reload the leg view when the leg switches to Pending (after an admin override)
        if (execData.status === 'InProgress' || execData.status === 'Paused') {
          if (currentLeg && currentLeg.status === 'Pending') {
            // Only reload when the leg just switched to Pending (compared to the previous poll)
            if (previousLegStatus !== 'Pending') {
              loadLegView(race.raceId, currentLegIdx)
            }
          }
          // Update previous status for next iteration
          previousLegStatus = currentLeg?.status ?? null
        }
      } catch { /* silent polling fail */ }
    }, 8000)
    return () => clearInterval(pollRef.current)
  // Removed execution from deps - use a ref to track instead of state to avoid an infinite loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [race, activeLegIndex, loadLegView])

  // Load leg view when active leg changes
  useEffect(() => {
    if (!race) return
    loadLegView(race.raceId, activeLegIndex)
  }, [race, activeLegIndex, loadLegView])

  // ── Position helpers ──
  function setPosition(legIndex, entryId, rawValue) {
    const value = rawValue === 'DNF' ? -1 : rawValue === 'DQ' ? -2 : Number(rawValue)
    setPositions(prev => ({
      ...prev,
      [legIndex]: { ...(prev[legIndex] ?? {}), [entryId]: value },
    }))
    setDraftSaved(false)
  }

  // Validation: each position can only have 1 entry (no duplicate ranks, including DNF/DQ)
  // Bug #7: use the shared validateLegPositions to ensure consistent rules
  // with LegSubmissionPage.
  function getLegValidation(legIndex) {
    const posMap = positions[legIndex] ?? {}
    const entries = (legView?.entries ?? []).map((e) => ({ entryId: e.entryId }))
    return validateLegPositions(entries, posMap)
  }

  // ── Save Draft ──
  const handleSaveDraft = async () => {
    if (!race) return
    // Bug #11: don't allow saving a draft when the race is no longer InProgress.
    if (execution?.status && execution.status !== 'InProgress') {
      setSubmitError('Cannot save draft when the race is not in InProgress status.')
      return
    }

    const pos = positions[activeLegIndex] ?? {}
    const entries = Object.entries(pos).map(([entryId, position]) => ({
      entryId: Number(entryId),
      position,
    }))
    try {
      await saveLegDraft(race.raceId, activeLegIndex, entries)
      setDraftSaved(true)
    } catch (err) {
      setSubmitError(err?.message || 'Failed to save draft.')
    }
  }

  // ── Submit ──
  // Bug #1 + #2: set hasSubmitted + sessionStorage IMMEDIATELY BEFORE calling the API,
  // to prevent the double-click race condition and duplicates from another tab.
  const handleSubmit = async () => {
    if (!race) return

    if (hasSubmitted || submitting) {
      // Already submitted (in this tab or another tab) — skip to prevent duplicates.
      return
    }

    const { valid } = getLegValidation(activeLegIndex)
    if (!valid) {
      setSubmitError('Please fill in all positions without duplicate rankings.')
      return
    }

    const sessionKey = getSubmitSessionKey(race.raceId, activeLegIndex)
    setHasSubmitted(true)
    sessionStorage.setItem(sessionKey, String(Date.now()))
    setSubmitting(true)
    setSubmitError('')
    setSubmitResult(null)

    const pos = positions[activeLegIndex] ?? {}
    const entries = Object.entries(pos).map(([entryId, position]) => ({
      entryId: Number(entryId),
      position,
    }))

    try {
      const result = await submitLegResult(race.raceId, activeLegIndex, entries)
      setSubmitResult(result)

      // Refresh execution after submit
      await refreshExecution(race.raceId)

      // Auto-advance to next leg if matched
      // Prefer result.nextLegIndex, fall back to execution.currentLegIndex
      if (result.status === 'Matched' && !result.isRaceComplete) {
        const nextLegIdx = result.nextLegIndex ?? execution?.currentLegIndex
        if (nextLegIdx !== undefined && nextLegIdx !== activeLegIndex) {
          setTimeout(() => {
            if (isMountedRef.current) {
              setActiveLegIndex(nextLegIdx)
            }
          }, 2000)
        }
      }
    } catch (err) {
      const msg = err?.response?.data?.error === 'ALREADY_SUBMITTED'
        ? 'You have already submitted results for this leg.'
        : err?.response?.data?.message
        || err?.message
        || 'Submission failed.'
      setSubmitError(msg)
      // Submit failed → reopen the UI so the user can retry (Bug #1)
      setHasSubmitted(false)
      sessionStorage.removeItem(sessionKey)
    } finally {
      if (isMountedRef.current) setSubmitting(false)
    }
  }

  // ── Derived ──
  const currentLegData = execution?.legs?.[activeLegIndex]
  // hasSubmitted ensures the UI locks IMMEDIATELY when the user clicks submit,
  // without waiting for the server response (prevents double-click).
  const isLegLocked = currentLegData?.status === 'Confirmed'
                    || currentLegData?.status === 'Conflicted'
                    || currentLegData?.mySubmitted
                    || hasSubmitted

  const legValidation = isLegLocked ? null : getLegValidation(activeLegIndex)
  const isFormValid = legValidation ? legValidation.valid : false

  const legNumber = activeLegIndex + 1

  const entries = legView?.entries ?? []

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">

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
          <div>
            <h1 className="font-serif text-2xl font-bold text-on-surface">Race Execution</h1>
            <p className="text-xs text-on-surface-variant">
              Blind Double-Entry — your results are hidden from the other referee until both of you submit.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => race && refreshExecution(race.raceId)}
              className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Error ─────────────────────────────────────────────── */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        {/* ── Race Status Guards (Bug #6) ──}
        {/* Race is no longer InProgress → don't allow entering/saving/submitting. */}
        {race && execution?.status === 'Paused' && (
          <div className="mb-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3">
            <AlertCircle size={18} className="text-orange-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-orange-400">Race Paused</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                The race is paused due to a discrepancy between the two referees. Please wait for admin resolution.
              </p>
              <button
                onClick={() => navigate('/referee')}
                className="mt-3 px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold transition-all"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

        {race && (execution?.status === 'Finished' || execution?.status === 'Cancelled') && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-400">
                Race {execution?.status === 'Cancelled' ? 'Cancelled' : 'Finished'}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                The race has finished.
              </p>
              <button
                onClick={() => navigate('/referee')}
                className="mt-3 px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold transition-all"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* ── Race Loaded ────────────────────────────────────────── */}
        {race && !loading && (
          <>
            {/* Race info banner */}
            <div
              className="gs-card p-5 mb-5"
              style={{ borderLeft: '3px solid rgba(251,191,36,0.6)' }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      race.status === 'InProgress'
                        ? 'bg-amber-500/15 text-amber-400'
                        : race.status === 'Paused'
                        ? 'bg-orange-500/15 text-orange-400'
                        : 'bg-primary/15 text-primary'
                    }`}>
                      {race.status === 'InProgress' ? '● LIVE' : race.status === 'Paused' ? '◐ PAUSED' : race.status}
                    </span>
                    {execution?.isBetsLocked && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/15 text-red-400">
                        🔒 Bets Locked
                      </span>
                    )}
                  </div>
                  <h2 className="font-serif text-2xl font-bold text-on-surface">{race.name}</h2>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {execution?.totalLegs ?? race.numberOfLegs ?? 1} legs ·{' '}
                    {standings.length > 0
                      ? `${standings.length} entries`
                      : `${entries.length} entries`}
                  </p>
                </div>

                {/* Live standings mini-table */}
                {standings.length > 0 && (
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Standings</p>
                    <div className="flex flex-col gap-0.5 max-h-20 overflow-y-auto">
                      {standings.slice(0, 5).map((s, i) => (
                        <div key={s.entryId} className="flex items-center gap-2 text-xs">
                          <span className="w-5 text-center font-bold text-yellow-400">{i + 1}</span>
                          <span className="text-on-surface truncate max-w-[120px]">{s.horseName || `#${s.entryId}`}</span>
                          <span className="font-mono text-on-surface-variant">{s.totalPoints}p</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Paused alert */}
            {race.status === 'Paused' && (
              <div className="mb-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3">
                <Zap size={18} className="text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-orange-400">Race is currently paused</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    A discrepancy between the two referees was detected. Admin is reviewing and will resume the race.
                  </p>
                </div>
              </div>
            )}

            {/* Leg progress bar */}
            {execution?.legs && (
              <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
                {execution.legs.map((leg, idx) => {
                  const statusMeta = {
                    Confirmed: { cls: 'bg-emerald-500', label: '✓' },
                    Pending:   { cls: 'bg-surface-container-high', label: '⏳' },
                    Conflicted: { cls: 'bg-orange-500', label: '⚠' },
                  }[leg.status] ?? { cls: 'bg-surface-container-high', label: '—' }

                  return (
                    <button
                      key={idx}
                      onClick={() => !['Confirmed', 'Conflicted'].includes(leg.status) && setActiveLegIndex(idx)}
                      disabled={['Confirmed', 'Conflicted'].includes(leg.status)}
                      className={`shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-lg border transition-all
                        ${activeLegIndex === idx
                          ? 'border-yellow-400/50 bg-yellow-400/5'
                          : 'border-white/10 hover:border-white/20 bg-white/5'
                        }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${statusMeta.cls}`}>
                        {statusMeta.label}
                      </div>
                      <span className="text-[10px] text-on-surface-variant">Leg {idx + 1}</span>
                      {leg.referee1Submitted && leg.referee2Submitted && (
                        <span className="text-[9px] text-emerald-400">✓</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Confirmed submission banner */}
            {submitResult?.status === 'Matched' && (
              <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 animate-fade-in-up">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-emerald-400">Leg {legNumber} Confirmed — Results Matched</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{submitResult.message}</p>
                  {!submitResult.isRaceComplete && submitResult.nextLegIndex !== undefined && (
                    <p className="text-xs text-emerald-400/70 mt-1">
                      → Moving to Leg {submitResult.nextLegIndex + 1} shortly...
                    </p>
                  )}
                </div>
              </div>
            )}

            {submitResult?.status === 'Conflicted' && (
              <div className="mb-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3 animate-fade-in-up">
                <AlertCircle size={18} className="text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-orange-400">Discrepancy Detected — Race Paused</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{submitResult.message}</p>
                </div>
              </div>
            )}

            {/* Leg entry card */}
            <div className="gs-card overflow-hidden">
              {/* Card header */}
              <div className="px-5 py-4 border-b border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-on-surface text-sm">
                      Leg {legNumber} — Your Results
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {isLegLocked
                        ? 'Submitted · cannot edit'
                        : 'Enter the ranking for each entry · data hidden from the other referee'}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[11px] font-bold px-3 py-1 rounded-lg border uppercase tracking-wider
                    ${isLegLocked
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-700'
                      : 'bg-surface-container-high text-on-surface-variant border-white/10'
                    }`}
                  >
                    {isLegLocked ? 'Locked' : 'Open'}
                  </span>
                </div>
              </div>

              {/* Privacy notice */}
              <div className="px-5 py-2.5 border-b border-yellow-400/10 bg-yellow-400/5 flex items-center gap-2">
                <EyeOff size={13} className="text-yellow-400/70 shrink-0" />
                <p className="text-xs text-on-surface-variant">
                  <span className="text-yellow-400/80 font-medium">Blind Entry: </span>
                  Your data is NOT visible to the other referee until both of you submit.
                  The server automatically compares results once both have submitted.
                </p>
              </div>

              {/* Status from legView */}
              {legView && (
                <div className="px-5 py-2 border-b border-white/5 bg-white/3 flex items-center gap-4 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    {legView.mySubmitted
                      ? <><CheckCircle2 size={12} className="text-emerald-400" /> Submitted</>
                      : <><Lock size={12} className="text-gray-500" /> Not submitted</>}
                  </span>
                  <span className="flex items-center gap-1">
                    {legView.opponentSubmitted
                      ? <><CheckCircle2 size={12} className="text-emerald-400" /> Other referee has submitted</>
                      : <><Loader2 size={12} className="text-gray-500 animate-spin" /> Waiting for other referee...</>}
                  </span>
                  {legView.bothSubmitted && (
                    <span className={`font-bold ${legView.legStatus === 'Matched' ? 'text-emerald-400' : 'text-orange-400'}`}>
                      {legView.legStatus === 'Matched' ? '✓ Fully Matched' : '⚠ Discrepancy Found'}
                    </span>
                  )}
                </div>
              )}

              {/* Entries table */}
              {loadingLeg ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
                </div>
              ) : legError ? (
                <div className="py-12 text-center">
                  <AlertCircle size={40} className="w-10 h-10 text-red-400 mx-auto opacity-60 mb-3" />
                  <p className="text-sm font-semibold text-red-400 mb-1">{legError}</p>
                  <button
                    onClick={() => loadLegView(race.raceId, activeLegIndex)}
                    className="mt-3 px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-sm text-on-surface transition-all"
                  >
                    Retry
                  </button>
                </div>
              ) : entries.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mb-3">
                    {currentLegData?.status === 'Confirmed' ? (
                      <CheckCircle2 size={40} className="w-10 h-10 text-emerald-400 mx-auto opacity-60" />
                    ) : currentLegData?.status === 'Conflicted' ? (
                      <AlertCircle size={40} className="w-10 h-10 text-orange-400 mx-auto opacity-60" />
                    ) : (
                      <Info size={40} className="w-10 h-10 text-gray-500 mx-auto opacity-60" />
                    )}
                  </div>
                  <p className="text-sm font-semibold text-on-surface mb-1">
                    {currentLegData?.status === 'Confirmed'
                      ? 'This leg has been confirmed'
                      : currentLegData?.status === 'Conflicted'
                      ? 'This leg has a discrepancy — awaiting admin resolution'
                      : 'No entry data yet'}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {currentLegData?.status === 'Confirmed'
                      ? 'Your results have been recorded. Waiting for admin to confirm and continue the race.'
                      : currentLegData?.status === 'Conflicted'
                      ? 'Admin will review and decide the official result.'
                      : 'Waiting for data from the server...'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-5 py-3 text-left text-xs text-on-surface-variant font-medium uppercase tracking-wider w-16">Gate</th>
                        <th className="px-3 py-3 text-left text-xs text-on-surface-variant font-medium uppercase tracking-wider">Horse</th>
                        <th className="px-3 py-3 text-left text-xs text-on-surface-variant font-medium uppercase tracking-wider">Jockey</th>
                        <th className="px-3 py-3 text-center text-xs text-on-surface-variant font-medium uppercase tracking-wider w-28">Position</th>
                        <th className="px-3 py-3 text-center text-xs text-on-surface-variant font-medium uppercase tracking-wider w-20">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry, i) => {
                        const val = positions[activeLegIndex]?.[entry.entryId] ?? ''
                        const isLocked = isLegLocked
                        return (
                          <tr key={entry.entryId} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                            <td className="px-5 py-3 font-mono text-xs font-bold text-yellow-400/70">
                              #{String(entry.gateNumber ?? (i + 1)).padStart(2, '0')}
                            </td>
                            <td className="px-3 py-3">
                              <p className="font-semibold text-on-surface text-sm">{entry.horseName || `Horse #${entry.horseId}`}</p>
                            </td>
                            <td className="px-3 py-3 text-on-surface-variant text-sm">
                              {entry.jockeyName || '—'}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {isLocked ? (
                                <PositionBadge value={val} />
                              ) : (
                                <select
                                  value={val}
                                  onChange={e => setPosition(activeLegIndex, entry.entryId, e.target.value)}
                                  className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-2 py-1.5 text-sm font-mono text-on-surface focus:outline-none focus:border-yellow-400/60 transition-all"
                                >
                                  <option value="">—</option>
                                  {entries.map((_, n) => (
                                    <option key={n + 1} value={String(n + 1)}>{n + 1}</option>
                                  ))}
                                  <option value="DNF">DNF</option>
                                  <option value="DQ">DQ</option>
                                </select>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center font-mono text-sm font-bold text-yellow-400/70">
                              {val ? `${getLegPoints(val)}p` : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Footer actions */}
              {!isLegLocked && (
                <div className="px-5 py-4 border-t border-white/10">
                  {submitError && (
                    <p className="text-xs text-red-400 mb-3 flex items-center gap-1.5">
                      <AlertCircle size={13} />
                      {submitError}
                    </p>
                  )}
                  {draftSaved && (
                    <p className="text-xs text-emerald-400 mb-3 flex items-center gap-1.5">
                      <CheckCircle2 size={13} />
                      Draft saved successfully.
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs text-on-surface-variant/60 italic">
                      Each position can only be assigned to a single entry.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveDraft}
                        disabled={submitting || hasSubmitted}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/20 text-sm text-gray-300 hover:bg-white/10 transition-all disabled:opacity-50"
                      >
                        <Save size={14} />
                        Save Draft
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={!isFormValid || submitting || hasSubmitted}
                        className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-bold transition-all
                          ${isFormValid && !submitting && !hasSubmitted
                            ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                            : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
                          } disabled:opacity-50`}
                      >
                        {submitting
                          ? <><Loader2 size={14} className="animate-spin" /> Submitting...</>
                          : <><Send size={14} /> Submit Leg {legNumber}</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Leg legend */}
            <div className="mt-3 flex items-center gap-4 px-1 text-xs text-on-surface-variant">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-gray-500/20 border border-gray-600 text-gray-400 flex items-center justify-center text-[9px] font-bold">P1</span>
                1st = 6pts
              </span>
              <span>P2 = 5pts</span>
              <span>P3 = 4pts</span>
              <span>P4 = 3pts</span>
              <span>P5 = 2pts</span>
              <span>P6 = 1pt</span>
              <span>DNF/DQ = 0pt</span>
            </div>
          </>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-40">
            <Loader2 className="w-10 h-10 text-yellow-400 animate-spin mb-4" />
            <p className="text-on-surface-variant text-sm">Loading race...</p>
          </div>
        )}
      </div>
    </div>
  )
}
