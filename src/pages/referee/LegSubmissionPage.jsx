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

// ─── Constants ────────────────────────────────────────────────────────────────

const LEG_POINTS = { 1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 }

function getLegPoints(pos) {
  if (!pos || pos < 1) return 0
  return LEG_POINTS[pos] ?? 0
}

function fmtDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('vi-VN', {
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

function DraggableEntryItem({ entry, position, isDragging, isLocked, onPositionChange, onDNF, onDQ }) {
  const handleSelect = (e) => {
    if (isLocked) return
    onPositionChange(Number(e.target.value))
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
        {position ? `#${position}` : '—'}
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
        {position && (
          <span className="text-xs font-mono text-yellow-400/70">
            {getLegPoints(position)} pts
          </span>
        )}

        {isLocked ? (
          <PositionBadge value={position} />
        ) : (
          <>
            <select
              value={position ?? ''}
              onChange={handleSelect}
              className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-2 py-1.5 text-sm font-mono text-on-surface focus:outline-none focus:border-yellow-400/60 transition-all"
            >
              <option value="">—</option>
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

  const totalPoints = rankedEntries.reduce((sum, e) => sum + getLegPoints(positions[e.entryId]), 0)

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
                <span className="text-xs font-mono text-yellow-400">{getLegPoints(positions[entry.entryId])} pts</span>
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

function SubmitConfirmationModal({ entries, positions, onConfirm, onCancel, submitting }) {
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
            disabled={submitting}
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

  // Positions state: { [entryId]: position | -1 | -2 | null }
  const [positions, setPositions] = useState({})

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

      // Initialize positions from mySubmittedData if available
      if (viewData.mySubmittedData && Array.isArray(viewData.mySubmittedData)) {
        setPositions(prev => {
          const newPos = { ...prev }
          viewData.mySubmittedData.forEach(item => {
            newPos[item.entryId] = item.position ?? null
          })
          return newPos
        })
      } else if (!positions[viewData.entries?.[0]?.entryId] && viewData.entries) {
        // Initialize empty positions
        const emptyPos = {}
        viewData.entries.forEach(e => { emptyPos[e.entryId] = null })
        setPositions(emptyPos)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load leg data')
      }
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [raceId, legIndex])

  // ── Initial load ──
  useEffect(() => {
    isMountedRef.current = true
    loadLegData()
    return () => { isMountedRef.current = false }
  }, [loadLegData])

  // ── Polling for updates ──
  useEffect(() => {
    if (!legView?.mySubmitted) {
      const pollRef = setInterval(() => {
        getRefereeLegView(raceId, legIndex)
          .then(view => {
            if (isMountedRef.current) {
              setLegView(view)
              if (view.mySubmitted) {
                // Update positions from submitted data
                if (view.mySubmittedData) {
                  setPositions(prev => {
                    const newPos = { ...prev }
                    view.mySubmittedData.forEach(item => {
                      newPos[item.entryId] = item.position ?? null
                    })
                    return newPos
                  })
                }
              }
            }
          })
          .catch(() => {})
      }, 5000)
      return () => clearInterval(pollRef)
    }
  }, [raceId, legIndex, legView?.mySubmitted])

  // ── Position handlers ──
  function handlePositionChange(entryId, position) {
    setPositions(prev => ({ ...prev, [entryId]: position }))
    setDraftSaved(false)
    setSubmitResult(null)
  }

  // ── Validation ──
  function getValidation() {
    const entries = legView?.entries ?? []
    const posEntries = Object.entries(positions)

    // Check all assigned
    const unassigned = entries.filter(e => !positions[e.entryId] && positions[e.entryId] !== 0)
    if (unassigned.length > 0) {
      return { valid: false, error: `Please assign positions to all entries (${unassigned.length} remaining)` }
    }

    // Check duplicates (only for positive positions)
    const positivePositions = posEntries
      .filter(([_, pos]) => pos > 0)
      .map(([id, pos]) => ({ id: Number(id), pos }))
    const usedPositions = {}
    for (const { id, pos } of positivePositions) {
      if (usedPositions[pos] !== undefined) {
        return { valid: false, error: `Duplicate position: ${pos}` }
      }
      usedPositions[pos] = id
    }

    return { valid: true, error: null }
  }

  // ── Save Draft ──
  const handleSaveDraft = async () => {
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
  const handleSubmit = async () => {
    const validation = getValidation()
    if (!validation.valid) {
      setSubmitError(validation.error)
      return
    }

    setSubmitting(true)
    setSubmitError('')

    const entries = legView?.entries ?? []
    const payload = Object.entries(positions)
      .filter(([_, pos]) => pos !== null && pos !== undefined)
      .map(([entryId, position]) => ({ entryId: Number(entryId), position }))

    try {
      const result = await submitLegResult(raceId, legIndex, payload)
      setSubmitResult(result)
      setShowConfirmModal(false)

      // Reload data
      await loadLegData()
    } catch (err) {
      const msg = err?.response?.data?.error === 'ALREADY_SUBMITTED'
        ? 'You have already submitted results for this leg.'
        : err?.response?.data?.message || err?.message || 'Submission failed.'
      setSubmitError(msg)
    } finally {
      if (isMountedRef.current) setSubmitting(false)
    }
  }

  // ── Derived ──
  const entries = legView?.entries ?? []
  const isLocked = legView?.mySubmitted || submitResult?.status === 'Matched'
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
                disabled={!isFormValid}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all
                  ${isFormValid
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
            1st=6 · 2nd=5 · 3rd=4 · 4th=3 · 5th=2 · 6th=1 · DNF/DQ=0
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
        />
      )}
    </div>
  )
}
