import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Flag, AlertCircle, CheckCircle2, ChevronLeft, Loader2,
  Save, Send, EyeOff, Lock, GripVertical, X, AlertTriangle,
  Zap, Clock, Trophy,
} from 'lucide-react'
import {
  getRefereeLegView,
  saveLegDraft,
  submitLegResult,
  getRaceExecutionStatus,
  getRaceStandings,
} from '../../api/referee'
import { validateLegPositions, getLegPoints } from '../../utils/legValidation'

// Store a session key for each (userId, raceId, legIndex) that has been submitted, to prevent
// duplicates when the user opens multiple tabs. Key resets when the tab closes (sessionStorage).
// BUG FIX: Include userId in the key so two different referees using the same browser
// (e.g. testing on the same machine) do NOT share the same submitted flag.
function getSubmitSessionKey(raceId, legIndex, userId) {
  return `referee-submitted-${userId ?? 'anon'}-${raceId}-${legIndex}`
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Leg Points tính TUYẾN TÍNH theo sĩ số (N - hạng + 1) — công thức dùng chung ở
// utils/legValidation.js, khớp RaceExecutionConstants.LegPointsFor bên BE.

function fmtDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Position Badge ─────────────────────────────────────────────────────────

function PositionBadge({ value, size = 'sm' }) {
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

// ─── Drag and Drop Entry Item ────────────────────────────────────────────────

// BUG FIX: totalEntries is passed so the select can generate position options 1..n
function DraggableEntryItem({ entry, position, totalEntries, isDragging, isLocked, onPositionChange, onDNF, onDQ }) {
  const handleSelect = (e) => {
    if (isLocked) return
    const val = e.target.value
    if (val === '') {
      onPositionChange(null)
    } else {
      onPositionChange(Number(val))
    }
  }

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-xl border transition-all
        ${isDragging
          ? 'border-yellow-400/50 bg-yellow-400/5 shadow-lg shadow-yellow-400/10'
          : 'border-white/10 bg-white/5 hover:border-white/20'
        }
        ${isLocked ? 'opacity-75' : ''}
      `}
    >
      {!isLocked && (
        <div className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300">
          <GripVertical size={18} />
        </div>
      )}

      <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center font-mono text-lg font-bold text-yellow-400 border border-yellow-400/20">
        {position && position > 0 ? `#${position}` : position === -1 ? 'DNF' : position === -2 ? 'DQ' : '—'}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-on-surface text-sm truncate">
          {entry.horseName || `Horse #${entry.horseId}`}
        </p>
        <p className="text-xs text-on-surface-variant">
          Gate #{entry.gateNumber ?? '?'} · Jockey: {entry.jockeyName || '—'}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {position && position > 0 && (
          <span className="text-xs font-mono text-yellow-400/70">
            {getLegPoints(position, totalEntries)} pts
          </span>
        )}

        {isLocked ? (
          <PositionBadge value={position} />
        ) : (
          <>
            {/* BUG FIX: Generate numeric positions 1..n dynamically based on number of entries */}
            <select
              value={position ?? ''}
              onChange={handleSelect}
              className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-2 py-1.5 text-sm font-mono text-on-surface focus:outline-none focus:border-yellow-400/60 transition-all"
            >
              <option value="">— Select —</option>
              {Array.from({ length: totalEntries }, (_, i) => i + 1).map(pos => (
                <option key={pos} value={String(pos)}>P{pos}</option>
              ))}
              <option value="-1">DNF</option>
              <option value="-2">DQ</option>
            </select>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Submission Summary Panel ─────────────────────────────────────────────────

function SubmissionSummary({ positions, entries, isLocked }) {
  const rankedEntries = entries
    .filter(e => {
      const pos = positions[e.entryId]
      return pos && pos > 0 && pos < 100
    })
    .sort((a, b) => positions[a.entryId] - positions[b.entryId])

  const dnfEntries = entries.filter(e => positions[e.entryId] === -1)
  const dqEntries = entries.filter(e => positions[e.entryId] === -2)

  const totalPoints = rankedEntries.reduce(
    (sum, e) => sum + getLegPoints(positions[e.entryId], entries.length), 0)

  return (
    <div className="space-y-4">
      {/* Ranked List */}
      <div>
        <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-2">
          <Trophy size={12} className="text-yellow-400" /> Final Rankings
        </h4>
        {rankedEntries.length === 0 ? (
          <p className="text-xs text-on-surface-variant italic">No rankings assigned yet</p>
        ) : (
          <div className="space-y-1">
            {rankedEntries.map((entry, idx) => (
              <div key={entry.entryId} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  idx === 0 ? 'bg-yellow-400/20 text-yellow-400' :
                  idx === 1 ? 'bg-gray-300/20 text-gray-300' :
                  idx === 2 ? 'bg-orange-400/20 text-orange-400' :
                  'bg-white/10 text-on-surface-variant'
                }`}>
                  {idx + 1}
                </span>
                <span className="text-sm text-on-surface flex-1 truncate">
                  {entry.horseName || `Horse #${entry.horseId}`}
                </span>
                <span className="text-xs font-mono text-yellow-400">{getLegPoints(positions[entry.entryId], entries.length)} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DNF */}
      {dnfEntries.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <AlertCircle size={12} /> Did Not Finish
          </h4>
          <div className="space-y-1">
            {dnfEntries.map(entry => (
              <div key={entry.entryId} className="flex items-center gap-2 p-2 rounded-lg bg-gray-500/10">
                <span className="text-xs text-gray-400">DNF</span>
                <span className="text-sm text-on-surface-variant flex-1 truncate">
                  {entry.horseName || `Horse #${entry.horseId}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DQ */}
      {dqEntries.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <X size={12} /> Disqualified
          </h4>
          <div className="space-y-1">
            {dqEntries.map(entry => (
              <div key={entry.entryId} className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
                <span className="text-xs text-red-400">DQ</span>
                <span className="text-sm text-on-surface-variant flex-1 truncate">
                  {entry.horseName || `Horse #${entry.horseId}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total */}
      {rankedEntries.length > 0 && (
        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-sm text-on-surface-variant">Total Points:</span>
          <span className="text-lg font-bold text-yellow-400 font-mono">{totalPoints} pts</span>
        </div>
      )}
    </div>
  )
}

// ─── Submit Confirmation Modal ───────────────────────────────────────────────

function SubmitConfirmationModal({ entries, positions, onConfirm, onCancel, submitting, hasSubmitted }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a2035] rounded-2xl w-full max-w-md border border-white/10 shadow-2xl animate-fade-in-up">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 size={20} className="text-yellow-400" />
            Confirm Submission
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Once submitted, you cannot edit your results.
          </p>
        </div>

        <div className="p-6">
          <p className="text-sm text-on-surface mb-4">
            You are about to submit your leg results for <span className="font-semibold text-yellow-400">{entries.length}</span> entries.
          </p>

          <div className="p-4 rounded-xl bg-yellow-400/5 border border-yellow-400/20 mb-4">
            <p className="text-xs text-yellow-400/80 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                This action is <strong>irreversible</strong>. Your results will be hidden from the other referee until they submit as well.
              </span>
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 rounded-lg border border-white/20 text-sm text-gray-300 hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting || hasSubmitted}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black text-sm font-bold transition-all disabled:opacity-50"
          >
            {submitting ? (
              <><Loader2 size={14} className="animate-spin" /> Submitting...</>
            ) : (
              <><Send size={14} /> Confirm Submit</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Waiting Panel ──────────────────────────────────────────────────────────

function WaitingPanel({ legStatus, opponentSubmitted, legNumber }) {
  return (
    <div className="p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 size={32} className="text-emerald-400" />
      </div>
      <h3 className="text-lg font-bold text-on-surface mb-2">Submission Complete</h3>
      <p className="text-sm text-on-surface-variant mb-4">
        Your results for Leg {legNumber} have been submitted.
      </p>

      <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-left mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-2 h-2 rounded-full ${opponentSubmitted ? 'bg-emerald-400' : 'bg-yellow-400 animate-pulse'}`} />
          <span className="text-xs text-on-surface-variant font-medium">
            {opponentSubmitted ? 'Opponent Referee Submitted' : 'Waiting for Opponent Referee'}
          </span>
        </div>
        <p className="text-xs text-on-surface-variant">
          {opponentSubmitted
            ? 'Both referees have submitted. Results will be compared automatically.'
            : 'Your submission is hidden. The other referee will submit their results separately.'
          }
        </p>
      </div>

      {legStatus === 'AwaitingSecondReferee' && (
        <div className="flex items-center justify-center gap-2 text-sm text-blue-400">
          <Loader2 size={14} className="animate-spin" />
          Waiting for referee confirmation...
        </div>
      )}

      {legStatus === 'Conflicted' && (
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <p className="text-sm text-orange-400 font-semibold flex items-center gap-2 justify-center">
            <AlertTriangle size={16} />
            Conflict Detected
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            The race has been paused. An admin will review and resolve the discrepancy.
          </p>
        </div>
      )}

      {legStatus === 'Matched' && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-sm text-emerald-400 font-semibold flex items-center gap-2 justify-center">
            <CheckCircle2 size={16} />
            Results Matched
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            Your submission matches the other referee. Leg {legNumber} confirmed!
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function LegSubmissionPage() {
  const { id: raceId, legId } = useParams()
  const navigate = useNavigate()
  const isMountedRef = useRef(true)

  const legIndex = parseInt(legId, 10)
  const legNumber = legIndex + 1

  // Data state
  const [legView, setLegView] = useState(null)
  const [execution, setExecution] = useState(null)
  const [standings, setStandings] = useState([])

  // UI state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draftSaved, setDraftSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitResult, setSubmitResult] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // BUG FIX: Read userId from localStorage token to include in sessionStorage key.
  // Without this, two different referees using the same browser share the same flag.
  const currentUserId = (() => {
    try {
      const token = localStorage.getItem('auth_access_token')
      if (!token) return null
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.userId ?? payload.sub ?? payload.nameid ?? null
    } catch { return null }
  })()

  // Local lock flag — set immediately when the user clicks submit (before the API responds).
  // Needed to prevent double-click & multi-tab duplicate submission.
  // BUG FIX: Use userId-scoped key so referee A and referee B don't share the flag.
  const [hasSubmitted, setHasSubmitted] = useState(() => {
    if (typeof window === 'undefined') return false
    return Boolean(sessionStorage.getItem(getSubmitSessionKey(raceId, legIndex, currentUserId)))
  })

  // Positions state: { [entryId]: position | -1 | -2 | null }
  const [positions, setPositions] = useState({})

  // Use a ref to avoid stale closures without causing a re-render loop
  const positionsRef = useRef(positions)
  useEffect(() => { positionsRef.current = positions }, [positions])

  // ── Load data ──
  const loadLegData = useCallback(async () => {
    try {
      const [viewData, execData, standingsData] = await Promise.all([
        getRefereeLegView(raceId, legIndex),
        getRaceExecutionStatus(raceId),
        getRaceStandings(raceId).catch(() => []),
      ])

      if (!isMountedRef.current) return

      setLegView(viewData)
      setExecution(execData)
      setStandings(standingsData)

      // Sync hasSubmitted from sessionStorage + server (in case
      // another tab already submitted before polling picks up the update).
      // BUG FIX: Use userId-scoped key to avoid false-positive for the other referee.
      const sessionFlag = typeof window !== 'undefined'
        && Boolean(sessionStorage.getItem(getSubmitSessionKey(raceId, legIndex, currentUserId)))
      if ((sessionFlag || viewData?.mySubmitted) && isMountedRef.current) {
        setHasSubmitted(true)
      }

      // Initialize positions from mySubmittedData if available
      if (viewData.mySubmittedData && Array.isArray(viewData.mySubmittedData)) {
        setPositions(prev => {
          const newPos = { ...prev }
          viewData.mySubmittedData.forEach(item => {
            newPos[item.entryId] = item.position ?? null
          })
          return newPos
        })
      } else {
        // Only reset to empty when NO entry has been assigned a position yet.
        // Avoids a stale-closure reset wiping out data the user is mid-typing.
        // Use a ref instead of state to avoid a dependency loop.
        const hasAnyPosition = Object.values(positionsRef.current).some(
          (p) => p !== null && p !== undefined && p !== '',
        )
        if (!hasAnyPosition && viewData.entries) {
          const emptyPos = {}
          viewData.entries.forEach((e) => { emptyPos[e.entryId] = null })
          setPositions(prev => {
            // Only set if the current state is also empty (avoid overwriting user input)
            const hasCurrentValue = Object.values(prev).some(v => v !== null && v !== undefined && v !== '')
            if (hasCurrentValue) return prev
            return emptyPos
          })
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load leg data')
      }
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  // Removed positions from deps - use positionsRef instead to avoid a re-render loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceId, legIndex])

  // ── Initial load ──
  useEffect(() => {
    isMountedRef.current = true
    loadLegData()
    return () => { isMountedRef.current = false }
  }, [loadLegData])

  // ── Polling for updates ──
  // Only poll to check status - do NOT continuously reload the entire leg view,
  // to avoid a race condition that reloads the modal while the user is entering data.
  // Use a ref to track the previous legView state instead of a state dependency, to avoid an infinite loop.
  useEffect(() => {
    const POLL_MS = 5000
    let previousOpponentSubmitted = null

    const pollRef = setInterval(async () => {
      try {
        const view = await getRefereeLegView(raceId, legIndex)
        if (!isMountedRef.current) return

        // Only update the fields that are needed, don't reset the entire legView
        // BUG FIX: Use userId-scoped key
        const sessionFlag = Boolean(
          sessionStorage.getItem(getSubmitSessionKey(raceId, legIndex, currentUserId)),
        )
        if (view?.mySubmitted || sessionFlag) {
          setHasSubmitted(true)
        }

        // Once the admin override is done or both referees agree,
        // the leg transitions to Confirmed/Resolved.
        const legStatus = view?.legStatus
        if (legStatus === 'Confirmed' || legStatus === 'Resolved') {
          // Leg has been confirmed - check whether there's a next leg
          // Fetch execution status to know if there's a next leg
          getRaceExecutionStatus(raceId).then(execData => {
            if (!isMountedRef.current) return
            const nextLegIdx = execData?.currentLegIndex
            if (nextLegIdx !== undefined && nextLegIdx !== legIndex) {
              // There's a next leg - navigate to it
              navigate(`/referee/races/${raceId}/legs/${nextLegIdx}`)
            } else if (!view?.mySubmitted) {
              // No more legs, or the leg is already complete - go back to dashboard
              navigate(`/referee/races/${raceId}`)
            }
          }).catch(() => {
            // If the fetch fails, still show the result
            if (isMountedRef.current) setLegView(view)
          })
          return
        }

        // Only update the opponentSubmitted status if it changed
        // Use a local variable instead of state to avoid triggering the effect
        if (previousOpponentSubmitted === null || view.opponentSubmitted !== previousOpponentSubmitted) {
          if (view.opponentSubmitted !== legView?.opponentSubmitted) {
            setLegView(prev => prev ? { ...prev, opponentSubmitted: view.opponentSubmitted } : view)
          }
          previousOpponentSubmitted = view.opponentSubmitted
        }

        // Only reload everything when the submitted data changes
        if (view.mySubmitted && view.mySubmittedData) {
          setPositions((prev) => {
            const newPos = { ...prev }
            let hasChanges = false
            view.mySubmittedData.forEach((item) => {
              if (newPos[item.entryId] !== (item.position ?? null)) {
                hasChanges = true
                newPos[item.entryId] = item.position ?? null
              }
            })
            return hasChanges ? newPos : prev
          })
        }
      } catch {
        /* silent — a polling failure shouldn't spam the UI */
      }
    }, POLL_MS)
    return () => clearInterval(pollRef)
  // Removed legView from deps - use a local tracking variable instead of state to avoid an infinite loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceId, legIndex, navigate])

  // ── Position handlers ──
  function handlePositionChange(entryId, position) {
    setPositions(prev => ({ ...prev, [entryId]: position }))
    setDraftSaved(false)
    setSubmitResult(null)
  }

  // ── Validation ──
  // Use the shared util to ensure consistent rules between the 2 referee pages,
  // including the duplicate DNF/DQ check (Bug #7).
  function getValidation() {
    const entries = legView?.entries ?? []
    return validateLegPositions(entries, positions)
  }

  // ── Save Draft ──
  const handleSaveDraft = async () => {
    // Don't allow saving a draft when the race is no longer InProgress (Bug #11)
    if (execution?.status && execution.status !== 'InProgress') {
      setSubmitError('Cannot save draft when the race is not in InProgress status.')
      return
    }

    const entries = legView?.entries ?? []
    const payload = Object.entries(positions)
      .filter(([_, pos]) => pos !== null && pos !== undefined)
      .map(([entryId, position]) => ({ entryId: Number(entryId), position }))

    try {
      await saveLegDraft(raceId, legIndex, payload)
      setDraftSaved(true)
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || 'Failed to save draft')
    }
  }

  // ── Submit ──
  // Bug #1 + #2: set hasSubmitted + sessionStorage IMMEDIATELY BEFORE calling the API,
  // to prevent the double-click race condition and duplicates from another tab.
  const handleSubmit = async () => {
    if (hasSubmitted || submitting) {
      // Already submitted (in this tab or another tab) — skip to prevent duplicates.
      return
    }

    const validation = getValidation()
    if (!validation.valid) {
      setSubmitError(validation.error)
      return
    }

    // BUG FIX: Use userId-scoped sessionStorage key
    const sessionKey = getSubmitSessionKey(raceId, legIndex, currentUserId)
    setHasSubmitted(true)
    sessionStorage.setItem(sessionKey, String(Date.now()))
    setSubmitting(true)
    setSubmitError('')

    const payload = Object.entries(positions)
      .filter(([_, pos]) => pos !== null && pos !== undefined)
      .map(([entryId, position]) => ({ entryId: Number(entryId), position }))

    try {
      const result = await submitLegResult(raceId, legIndex, payload)
      setSubmitResult(result)
      setShowConfirmModal(false)

      // Reload data
      await loadLegData()

      // Auto-advance to next leg if both referees matched
      // Prefer result.nextLegIndex, fall back to execution.currentLegIndex
      if (result.status === 'Matched') {
        const nextLegIdx = result.nextLegIndex ?? execution?.currentLegIndex
        if (nextLegIdx !== undefined && nextLegIdx !== legIndex) {
          setTimeout(() => {
            navigate(`/referee/races/${raceId}/legs/${nextLegIdx}`)
          }, 2000)
        }
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Submission failed.'
      setSubmitError(msg)
      // Submit failed → reopen the UI so the user can retry
      setHasSubmitted(false)
      sessionStorage.removeItem(sessionKey)
    } finally {
      if (isMountedRef.current) setSubmitting(false)
    }
  }

  // ── Derived ──
  const entries = legView?.entries ?? []
  // hasSubmitted ensures the UI locks IMMEDIATELY when the user clicks submit,
  // without waiting for the server response (prevents double-click).
  const isLocked = legView?.mySubmitted
    || hasSubmitted
    || submitResult?.status === 'Matched'
  const validation = isLocked ? null : getValidation()
  const isFormValid = validation?.valid ?? false

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-yellow-400 animate-spin mx-auto mb-4" />
          <p className="text-on-surface-variant text-sm">Loading leg data...</p>
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
              onClick={() => navigate(`/referee/races/${raceId}`)}
              className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
          <div className="gs-card p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 font-semibold mb-2">{error}</p>
            <button onClick={loadLegData} className="gs-btn gs-btn-primary mt-4">
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Race Status Guards (Bug #6) ──
  // Race is no longer InProgress → don't allow entering/saving/submitting.
  if (execution?.status === 'Paused') {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate(`/referee/races/${raceId}`)}
              className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
          <div className="gs-card p-8 text-center">
            <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-orange-400 mb-2">Race Paused</h2>
            <p className="text-on-surface-variant mb-4">
              The race is paused due to a discrepancy between the two referees.
              Please wait for admin resolution.
            </p>
            <button
              onClick={() => navigate(`/referee/races/${raceId}`)}
              className="gs-btn gs-btn-primary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (execution?.status === 'Finished') {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate(`/referee/races/${raceId}`)}
              className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
          <div className="gs-card p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-emerald-400 mb-2">Race Finished</h2>
            <p className="text-on-surface-variant mb-4">The race has finished.</p>
            <button
              onClick={() => navigate(`/referee/races/${raceId}`)}
              className="gs-btn gs-btn-primary"
            >
              View Results
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (execution?.status === 'Cancelled') {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate(`/referee/races/${raceId}`)}
              className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
          <div className="gs-card p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-400 mb-2">Race Cancelled</h2>
            <p className="text-on-surface-variant mb-4">The race has been cancelled.</p>
            <button
              onClick={() => navigate(`/referee/races/${raceId}`)}
              className="gs-btn gs-btn-primary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Locked / Submitted State ──
  if (isLocked) {
    return (
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate(`/referee/races/${raceId}`)}
              className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/25 flex items-center justify-center">
              <Lock size={20} className="text-yellow-400" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-on-surface">Leg {legNumber} Results</h1>
              <p className="text-xs text-on-surface-variant">Submitted · Read Only</p>
            </div>
          </div>

          {/* Submission Summary */}
          <div className="gs-card overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-on-surface text-sm">Your Submission</h3>
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <CheckCircle2 size={14} /> Submitted
              </span>
            </div>
            <div className="p-5">
              <SubmissionSummary positions={positions} entries={entries} isLocked={true} />
            </div>
          </div>

          {/* Waiting Panel */}
          <div className="gs-card">
            <WaitingPanel
              legStatus={legView?.legStatus}
              opponentSubmitted={legView?.opponentSubmitted}
              legNumber={legNumber}
            />
          </div>
        </div>
      </div>
    )
  }

  // ── Main Render ──
  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(`/referee/races/${raceId}`)}
            className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/25 flex items-center justify-center">
            <Flag size={20} className="text-yellow-400" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-on-surface">Leg {legNumber} Entry</h1>
            <p className="text-xs text-on-surface-variant">
              Blind submission · Your data is hidden from the other referee
            </p>
          </div>
        </div>

        {/* ── Error ─────────────────────────────────────────────── */}
        {submitError && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            {submitError}
          </div>
        )}

        {/* ── Status Bar ────────────────────────────────────────── */}
        <div className="p-4 rounded-xl bg-yellow-400/5 border border-yellow-400/20 mb-6">
          <div className="flex items-center gap-4 text-xs text-on-surface-variant">
            <span className="flex items-center gap-1.5">
              <EyeOff size={12} className="text-yellow-400/70" />
              <span className="text-yellow-400/80 font-medium">Blind Entry Active</span>
            </span>
            <span>|</span>
            <span className="flex items-center gap-1.5">
              <Clock size={12} />
              {legView?.opponentSubmitted ? 'Opponent submitted' : 'Waiting for opponent'}
            </span>
            <span>|</span>
            <span>
              {entries.length} entries · {Object.values(positions).filter(p => p !== null && p !== undefined).length} assigned
            </span>
          </div>
        </div>

        {/* ── Two Column Layout ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Entry Ranking (2 columns) */}
          <div className="lg:col-span-2">
            <div className="gs-card overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10">
                <h3 className="font-semibold text-on-surface text-sm">Rank Entries</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Drag to reorder or use dropdown to assign positions
                </p>
              </div>

              <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                {/* Sorted by position */}
                {[...entries]
                  .map(e => ({ entry: e, position: positions[e.entryId] }))
                  .sort((a, b) => {
                    if (a.position === null || a.position === undefined) return 1
                    if (b.position === null || b.position === undefined) return -1
                    if (a.position < 0) return 1
                    if (b.position < 0) return -1
                    return a.position - b.position
                  })
                  .map(({ entry, position }) => (
                    <DraggableEntryItem
                      key={entry.entryId}
                      entry={entry}
                      position={position}
                      totalEntries={entries.length}
                      isDragging={false}
                      isLocked={false}
                      onPositionChange={(pos) => handlePositionChange(entry.entryId, pos)}
                      onDNF={() => handlePositionChange(entry.entryId, -1)}
                      onDQ={() => handlePositionChange(entry.entryId, -2)}
                    />
                  ))
                }
              </div>
            </div>
          </div>

          {/* Right: Summary Panel (1 column) */}
          <div>
            <div className="gs-card overflow-hidden sticky top-6">
              <div className="px-5 py-4 border-b border-white/10">
                <h3 className="font-semibold text-on-surface text-sm">Submission Summary</h3>
              </div>
              <div className="p-4">
                <SubmissionSummary positions={positions} entries={entries} isLocked={false} />

                {/* Validation Status */}
                {!validation?.valid && (
                  <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-400 flex items-start gap-2">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      {validation?.error}
                    </p>
                  </div>
                )}

                {validation?.valid && (
                  <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-xs text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 size={14} />
                      All positions assigned correctly
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Actions ──────────────────────────────────────────── */}
        <div className="mt-6 p-5 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-on-surface font-medium">Ready to submit?</p>
              <p className="text-xs text-on-surface-variant">
                Save draft to continue later, or submit when ready.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveDraft}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/20 text-sm text-gray-300 hover:bg-white/10 transition-all"
              >
                <Save size={16} />
                Save Draft
              </button>
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={!isFormValid || hasSubmitted}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all
                  ${isFormValid && !hasSubmitted
                    ? 'bg-yellow-400 hover:bg-yellow-300 text-black'
                    : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
                  }`}
              >
                <Send size={16} />
                Submit Leg {legNumber}
              </button>
            </div>
          </div>
        </div>

        {/* ── Leg Legend ───────────────────────────────────────── */}
        <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-on-surface-variant text-center">
            <span className="font-semibold">Points:</span>{' '}
            scaled to the field of {entries.length} horses — 1st={entries.length}
            {entries.length > 1 && <> · 2nd={entries.length - 1}</>}
            {' '}· last=1 · DNF/DQ=0
          </p>
        </div>
      </div>

      {/* ── Confirmation Modal ─────────────────────────────────── */}
      {showConfirmModal && (
        <SubmitConfirmationModal
          entries={entries}
          positions={positions}
          onConfirm={handleSubmit}
          onCancel={() => setShowConfirmModal(false)}
          submitting={submitting}
          hasSubmitted={hasSubmitted}
        />
      )}
    </div>
  )
}
