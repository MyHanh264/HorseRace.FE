import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Shield, AlertTriangle, CheckCircle2, ChevronLeft,
  Loader2, AlertCircle, RotateCcw, ArrowRight,
} from 'lucide-react'
import {
  getRaceDetail,
  getRacePauseInfo,
  getRaceExecutionStatus,
  resolveRaceConflict,
  resumeRace,
} from '../../api/admin'

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

function PositionBadge({ value }) {
  if (!value) return <span className="text-gray-600 font-mono">—</span>
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

// ─── Conflict Table ─────────────────────────────────────────────────────────

function ConflictTable({ comparison, decisions, onDecisionChange }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-4 py-3 text-left text-xs text-on-surface-variant font-medium uppercase tracking-wider">Entry</th>
            <th className="px-3 py-3 text-center text-xs text-on-surface-variant font-medium uppercase tracking-wider">Referee A</th>
            <th className="px-3 py-3 text-center text-xs text-on-surface-variant font-medium uppercase tracking-wider">Referee B</th>
            <th className="px-3 py-3 text-center text-xs text-on-surface-variant font-medium uppercase tracking-wider w-8"></th>
            <th className="px-3 py-3 text-center text-xs text-on-surface-variant font-medium uppercase tracking-wider">Official Result</th>
            <th className="px-3 py-3 text-center text-xs text-on-surface-variant font-medium uppercase tracking-wider">Points</th>
          </tr>
        </thead>
        <tbody>
          {comparison.map((item) => {
            const isMatch = item.referee1Position === item.referee2Position
            const hasConflict = !isMatch && item.referee1Position != null && item.referee2Position != null

            return (
              <tr
                key={item.entryId}
                className={`border-b border-white/5 ${hasConflict ? 'bg-orange-500/5' : ''}`}
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center font-mono text-sm font-bold text-yellow-400 border border-yellow-400/20">
                      #{item.gateNumber ?? '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-on-surface">
                        {item.horseName || `Entry #${item.entryId}`}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        Gate #{item.gateNumber ?? '—'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-4 text-center">
                  <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${
                    isMatch
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : hasConflict
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-white/5 border-white/10'
                  }`}>
                    <PositionBadge value={item.referee1Position} />
                    {isMatch && (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    )}
                    {hasConflict && (
                      <AlertTriangle size={14} className="text-red-400" />
                    )}
                  </div>
                </td>
                <td className="px-3 py-4 text-center">
                  <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${
                    isMatch
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : hasConflict
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-white/5 border-white/10'
                  }`}>
                    <PositionBadge value={item.referee2Position} />
                    {isMatch && (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    )}
                    {hasConflict && (
                      <AlertTriangle size={14} className="text-red-400" />
                    )}
                  </div>
                </td>
                <td className="px-3 py-4 text-center">
                  <ArrowRight size={16} className="text-gray-500" />
                </td>
                <td className="px-3 py-4 text-center">
                  <select
                    value={decisions[item.entryId] ?? item.referee1Position ?? 1}
                    onChange={(e) => onDecisionChange(item.entryId, Number(e.target.value))}
                    className="bg-surface-container-lowest border border-yellow-400/30 rounded-lg px-3 py-2 text-sm font-mono text-on-surface focus:outline-none focus:border-yellow-400/60 text-center min-w-[80px]"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                    <option value="-1">DNF</option>
                    <option value="-2">DQ</option>
                  </select>
                </td>
                <td className="px-3 py-4 text-center">
                  <span className="font-mono font-bold text-yellow-400">
                    {getLegPoints(decisions[item.entryId] ?? item.referee1Position)} pts
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Override Reason Box ────────────────────────────────────────────────────

function ReasonBox({ reason, onChange, disabled }) {
  return (
    <div>
      <label className="block text-sm font-medium text-on-surface mb-2">
        Override Reason <span className="text-red-400">*</span>
      </label>
      <textarea
        value={reason}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Explain the reason for this override decision (e.g., After reviewing finish line video...)"
        rows={4}
        className="w-full bg-surface-container-lowest border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface placeholder-gray-600 focus:outline-none focus:border-yellow-400/50 transition-all resize-none disabled:opacity-50"
      />
      <p className="text-xs text-on-surface-variant mt-1.5">
        This reason will be logged in the audit trail.
      </p>
    </div>
  )
}

// ─── Resolution Summary ─────────────────────────────────────────────────────

function ResolutionSummary({ comparison, decisions }) {
  const totalEntries = comparison.length
  const matchedPositions = comparison.filter(
    item => item.referee1Position === item.referee2Position
  ).length
  const conflictedPositions = totalEntries - matchedPositions

  const totalPoints = comparison.reduce((sum, item) => {
    return sum + getLegPoints(decisions[item.entryId] ?? item.referee1Position)
  }, 0)

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Entries</p>
        <p className="text-2xl font-bold font-mono text-on-surface">{totalEntries}</p>
      </div>
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Agreed</p>
        <p className="text-2xl font-bold font-mono text-emerald-400">{matchedPositions}</p>
      </div>
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
        <p className="text-xs text-red-400 uppercase tracking-wider mb-1">Conflicted</p>
        <p className="text-2xl font-bold font-mono text-red-400">{conflictedPositions}</p>
      </div>
    </div>
  )
}

// ─── Confirm Override Modal ─────────────────────────────────────────────────

function ConfirmOverrideModal({ raceName, legNumber, decisions, reason, onConfirm, onCancel, submitting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a2035] rounded-2xl w-full max-w-lg border border-white/10 shadow-2xl animate-fade-in-up">
        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
            <Shield size={20} className="text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Confirm Override</h2>
            <p className="text-xs text-gray-400">This action cannot be undone</p>
          </div>
        </div>

        <div className="p-6">
          <p className="text-sm text-on-surface mb-4">
            You are about to override the leg results for{' '}
            <span className="font-semibold text-yellow-400">{raceName}</span> (Leg {legNumber}).
          </p>

          <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 mb-4">
            <p className="text-xs text-orange-400 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                This will resume the race. All referees will be notified that the official result has been determined.
              </span>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-low border border-white/10">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-2">Override Reason</p>
            <p className="text-sm text-on-surface italic">
              {reason || 'No reason provided'}
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
              <><Loader2 size={14} className="animate-spin" /> Processing...</>
            ) : (
              <><Shield size={14} /> Confirm Override</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AdminConflictResolutionPage() {
  const { id: raceId } = useParams()
  const navigate = useNavigate()
  const isMountedRef = useRef(true)

  // Data state
  const [race, setRace] = useState(null)
  const [pauseInfo, setPauseInfo] = useState(null)
  const [execution, setExecution] = useState(null)

  // UI state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // Decisions state: { [entryId]: position }
  const [decisions, setDecisions] = useState({})
  const [overrideReason, setOverrideReason] = useState('')

  // ── Load data ──
  const loadData = useCallback(async () => {
    try {
      const [raceDetail, execData, pauseData] = await Promise.all([
        getRaceDetail(raceId),
        getRaceExecutionStatus(raceId),
        getRacePauseInfo(raceId),
      ])

      if (!isMountedRef.current) return

      setRace(raceDetail)
      setExecution(execData)
      setPauseInfo(pauseData)

      // Initialize decisions from side-by-side comparison
      if (pauseData?.conflictedLeg?.comparison) {
        const initialDecisions = {}
        pauseData.conflictedLeg.comparison.forEach(item => {
          // Default to Referee A's position
          initialDecisions[item.entryId] = item.referee1Position ?? item.referee2Position ?? 1
        })
        setDecisions(initialDecisions)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load race data')
      }
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [raceId])

  // ── Initial load ──
  useEffect(() => {
    isMountedRef.current = true
    loadData()
    return () => { isMountedRef.current = false }
  }, [loadData])

  // ── Polling ──
  useEffect(() => {
    if (success) return // Stop polling after successful resolution

    const pollRef = setInterval(() => {
      getRacePauseInfo(raceId)
        .then(pauseData => {
          if (isMountedRef.current) setPauseInfo(pauseData)
        })
        .catch(() => {})
    }, 5000)

    return () => clearInterval(pollRef)
  }, [raceId, success])

  // ── Handlers ──
  function handleDecisionChange(entryId, position) {
    setDecisions(prev => ({ ...prev, [entryId]: position }))
  }

  function getValidation() {
    if (!overrideReason.trim()) {
      return { valid: false, error: 'Please provide a reason for the override' }
    }
    if (overrideReason.trim().length < 10) {
      return { valid: false, error: 'Override reason must be at least 10 characters' }
    }
    return { valid: true, error: null }
  }

  async function handleOverride() {
    const validation = getValidation()
    if (!validation.valid) {
      setSubmitError(validation.error)
      return
    }

    setShowConfirmModal(true)
  }

  async function confirmOverride() {
    setSubmitting(true)
    setSubmitError('')

    const legIndex = pauseInfo?.conflictedLeg?.legIndex ?? 0

    try {
      // Resolve conflict
      await resolveRaceConflict(raceId, legIndex, {
        decisions: Object.entries(decisions).map(([entryId, officialPosition]) => ({
          entryId: Number(entryId),
          officialPosition,
        })),
        overrideReason: overrideReason.trim(),
      })

      // Resume race
      await resumeRace(raceId)

      setSuccess(true)
      setShowConfirmModal(false)

      // Redirect after success
      setTimeout(() => {
        navigate('/admin/race-execution')
      }, 2000)
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || 'Override failed')
      setShowConfirmModal(false)
    } finally {
      if (isMountedRef.current) setSubmitting(false)
    }
  }

  // ── Derived ──
  const comparison = pauseInfo?.conflictedLeg?.comparison ?? []
  const legNumber = (pauseInfo?.conflictedLeg?.legIndex ?? 0) + 1
  const legStatus = execution?.legs?.[pauseInfo?.conflictedLeg?.legIndex ?? 0]?.status

  const validation = getValidation()

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-yellow-400 animate-spin mx-auto mb-4" />
          <p className="text-on-surface-variant text-sm">Loading conflict data...</p>
        </div>
      </div>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate('/admin/race-execution')}
              className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
          <div className="gs-card p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 font-semibold mb-2">{error}</p>
            <button onClick={loadData} className="gs-btn gs-btn-primary mt-4">
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Success ──
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-on-surface mb-2">Conflict Resolved</h2>
          <p className="text-on-surface-variant mb-4">
            The race has been resumed with the official results.
          </p>
          <p className="text-sm text-on-surface-variant">
            Redirecting to Race Execution...
          </p>
        </div>
      </div>
    )
  }

  // ── No Conflict ──
  if (!pauseInfo?.conflictedLeg) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate('/admin/race-execution')}
              className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
          <div className="gs-card p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-on-surface mb-2">No Active Conflicts</h2>
            <p className="text-on-surface-variant mb-4">
              There are no conflicts to resolve for this race.
            </p>
            <button
              onClick={() => navigate('/admin/race-execution')}
              className="gs-btn gs-btn-primary"
            >
              Back to Race Execution
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
            onClick={() => navigate('/admin/race-execution')}
            className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
            <Shield size={20} className="text-orange-400" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-on-surface">Conflict Resolution</h1>
            <p className="text-xs text-on-surface-variant">
              Admin override for {race?.name || 'Race'}
            </p>
          </div>
        </div>

        {/* ── Conflict Alert ────────────────────────────────────── */}
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 mb-6 flex items-start gap-3">
          <AlertTriangle size={20} className="text-orange-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-orange-400">Conflict Detected</p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              The two referees have submitted different results for Leg {legNumber}.
              Review the discrepancies below and select the official result.
            </p>
          </div>
        </div>

        {/* ── Race Info ─────────────────────────────────────────── */}
        <div className="gs-card p-5 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-on-surface">{race?.name}</h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Leg {legNumber} · {comparison.length} entries · Race Status: {race?.status}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                legStatus === 'Conflicted'
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                  : 'bg-gray-500/15 text-gray-400 border border-gray-500/30'
              }`}>
                Status: {legStatus ?? '—'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Resolution Summary ────────────────────────────────── */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-on-surface mb-3">Conflict Summary</h3>
          <ResolutionSummary comparison={comparison} decisions={decisions} />
        </div>

        {/* ── Error ────────────────────────────────────────────── */}
        {submitError && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            {submitError}
          </div>
        )}

        {/* ── Conflict Table ───────────────────────────────────── */}
        <div className="gs-card overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-white/10">
            <h3 className="font-semibold text-on-surface text-sm">Side-by-Side Comparison</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Select the official result for each entry based on your review.
            </p>
          </div>

          <ConflictTable
            comparison={comparison}
            decisions={decisions}
            onDecisionChange={handleDecisionChange}
          />
        </div>

        {/* ── Override Reason ──────────────────────────────────── */}
        <div className="gs-card p-5 mb-6">
          <ReasonBox
            reason={overrideReason}
            onChange={setOverrideReason}
            disabled={submitting}
          />
        </div>

        {/* ── Actions ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <button
            onClick={() => navigate('/admin/race-execution')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/20 text-sm text-gray-300 hover:bg-white/10 transition-all"
          >
            <RotateCcw size={16} />
            Cancel
          </button>

          <button
            onClick={handleOverride}
            disabled={!validation.valid || submitting}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all
              ${validation.valid
                ? 'bg-yellow-400 hover:bg-yellow-300 text-black'
                : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
              } disabled:opacity-50`}
          >
            <Shield size={16} />
            Override & Resume Race
          </button>
        </div>

        {/* ── Legend ───────────────────────────────────────────── */}
        <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-on-surface-variant text-center">
            <span className="font-semibold">Legend:</span>{' '}
            <span className="inline-flex items-center gap-1 mx-2">
              <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/30" />
              Agreed
            </span>
            <span className="inline-flex items-center gap-1 mx-2">
              <span className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" />
              Conflicted
            </span>
            <span className="mx-2">|</span>
            <span className="font-semibold">Points:</span>{' '}
            1st=6 · 2nd=5 · 3rd=4 · 4th=3 · 5th=2 · 6th=1 · DNF/DQ=0
          </p>
        </div>
      </div>

      {/* ── Confirmation Modal ───────────────────────────────── */}
      {showConfirmModal && (
        <ConfirmOverrideModal
          raceName={race?.name}
          legNumber={legNumber}
          decisions={decisions}
          reason={overrideReason}
          onConfirm={confirmOverride}
          onCancel={() => setShowConfirmModal(false)}
          submitting={submitting}
        />
      )}
    </div>
  )
}
