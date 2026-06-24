import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Flag, AlertTriangle, CheckCircle2, Zap, ChevronLeft,
  RefreshCw, Loader2, AlertCircle, Lock, Eye, Shield,
  ChevronRight,
} from 'lucide-react'
import {
  getRaces, getRaceDetail,
  getRaceExecutionStatus, getRacePauseInfo,
  resolveRaceConflict, resumeRace, getRaceStandings,
  startRace,
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

// ─── Override Modal ─────────────────────────────────────────────────────────

function OverrideModal({ race, legIndex, pauseInfo, onClose, onResolved }) {
  const [decisions, setDecisions] = useState(() => {
    // Pre-fill with side-by-side data, default to referee1 positions
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
      if (usedPositions[pos] !== undefined) {
        errors.push({ entryId, conflictWith: usedPositions[pos], position: pos })
      }
      usedPositions[pos] = Number(entryId)
    })
    return { valid: errors.length === 0, errors }
  }

  async function handleOverride() {
    if (!overrideReason.trim()) {
      setError('Bắt buộc nhập lý do override.')
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
      const payload = {
        decisions: Object.entries(decisions).map(([entryId, officialPosition]) => ({
          entryId: Number(entryId),
          officialPosition,
        })),
        overrideReason: overrideReason.trim(),
      }
      await resolveRaceConflict(race.raceId, legIndex, payload)
      onResolved()
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Override thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#1a2035] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#1a2035] border-b border-white/10 px-6 py-4 flex items-start justify-between gap-4 z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={16} className="text-orange-400" />
              <h2 className="text-lg font-bold text-white">Override Leg {legIndex + 1} Result</h2>
            </div>
            <p className="text-xs text-gray-400">
              Kết quả giữa 2 referees không khớp. Admin xác nhận kết quả chính thức.
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all shrink-0">
            ✕
          </button>
        </div>

        {/* Conflict info */}
        <div className="px-6 py-4 border-b border-white/5 bg-orange-500/5">
          <div className="flex items-center gap-2 text-orange-400 text-xs font-semibold mb-2">
            <AlertTriangle size={13} />
            Phát hiện chênh lệch — Race tạm dừng
          </div>
          <p className="text-xs text-gray-400">
            Paused at: {fmtDateTime(pauseInfo?.pausedAt)} · Leg {legIndex + 1}
          </p>
        </div>

        {/* Side-by-side comparison */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-4 gap-2 mb-2 text-center">
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider col-span-1">Entry</div>
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider col-span-1">Referee A</div>
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider col-span-1">Referee B</div>
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider col-span-1">Official</div>
          </div>
          {entries.map(item => (
            <div key={item.entryId} className="grid grid-cols-4 gap-2 items-center py-2 border-b border-white/5 last:border-0">
              <div className="text-sm font-semibold text-white truncate">
                {item.horseName || `Entry #${item.entryId}`}
              </div>
              <div className="text-center">
                <span className={`inline-block px-3 py-1 rounded text-sm font-bold font-mono ${
                  item.isMatch ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                }`}>
                  {item.referee1Position ?? '—'}
                </span>
              </div>
              <div className="text-center">
                <span className={`inline-block px-3 py-1 rounded text-sm font-bold font-mono ${
                  item.isMatch ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                }`}>
                  {item.referee2Position ?? '—'}
                </span>
              </div>
              <div className="text-center">
                <select
                  value={decisions[item.entryId] ?? 1}
                  onChange={e => setPosition(item.entryId, e.target.value)}
                  className="w-full bg-surface-container-lowest border border-yellow-400/30 rounded-lg px-2 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-yellow-400/60 text-center"
                >
                  {entries.map((_, n) => (
                    <option key={n + 1} value={n + 1}>{n + 1}</option>
                  ))}
                  <option value="-1">DNF</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        {/* Override reason */}
        <div className="px-6 pb-4">
          <label className="block text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wider">
            Lý do Override <span className="text-red-400">*</span>
          </label>
          <textarea
            value={overrideReason}
            onChange={e => setOverrideReason(e.target.value)}
            placeholder="Mô tả lý do chọn kết quả này (VD: Sau khi xem lại video finish line)"
            rows={3}
            className="w-full bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400/50 transition-all resize-none"
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between gap-3">
          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertCircle size={12} />
              {error}
            </p>
          )}
          {!error && <div />}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-white/20 text-sm text-gray-300 hover:bg-white/10 transition-all"
            >
              Hủy
            </button>
            <button
              onClick={handleOverride}
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black text-sm font-bold transition-all disabled:opacity-50"
            >
              {submitting
                ? <><Loader2 size={14} className="animate-spin" /> Đang xử lý...</>
                : <><CheckCircle2 size={14} /> Confirm Override</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Leg Status Chip ─────────────────────────────────────────────────────────

function LegStatusChip({ status }) {
  const meta = {
    Confirmed:  { cls: 'bg-emerald-500/20 text-emerald-400 border border-emerald-700', label: '✓ Confirmed' },
    Pending:    { cls: 'bg-yellow-500/20 text-yellow-400 border border-yellow-700', label: '⏳ Pending' },
    Conflicted: { cls: 'bg-orange-500/20 text-orange-400 border border-orange-700', label: '⚠ Conflict' },
  }[status] ?? { cls: 'bg-gray-500/20 text-gray-400 border border-gray-700', label: status }

  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.cls}`}>{meta.label}</span>
}

// ─── Race Execution Card ──────────────────────────────────────────────────────

function RaceExecutionCard({ race, execution, standings, onMonitor, onStart }) {
  const [showPauseModal, setShowPauseModal] = useState(false)
  const [pauseInfo, setPauseInfo] = useState(null)
  const [loadingPause, setLoadingPause] = useState(false)
  const [resolving, setResolving] = useState(false)

  async function loadPauseInfo() {
    setLoadingPause(true)
    try {
      const info = await getRacePauseInfo(race.raceId)
      setPauseInfo(info)
      setShowPauseModal(true)
    } catch (err) {
      alert(err?.message || 'Không tải được thông tin pause.')
    } finally {
      setLoadingPause(false)
    }
  }

  async function handleResume() {
    if (!confirm('Resume cuộc đua?')) return
    setResolving(true)
    try {
      await resumeRace(race.raceId)
      onMonitor()
    } catch (err) {
      alert(err?.message || 'Resume thất bại.')
    } finally {
      setResolving(false)
    }
  }

  const legs = execution?.legs ?? []
  const hasConflict = legs.some(l => l.status === 'Conflicted')

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
                    disabled={resolving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-all disabled:opacity-50"
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

        {/* Standings */}
        {standings.length > 0 && (
          <div className="px-5 pb-4">
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-medium mb-2">Current Standings</p>
            <div className="space-y-1">
              {standings.slice(0, 6).map((s, i) => (
                <div key={s.entryId} className="flex items-center gap-3 text-sm py-1 border-b border-white/5 last:border-0">
                  <span className={`w-5 text-center font-bold text-sm ${
                    i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'
                  }`}>
                    {i + 1}
                  </span>
                  <span className="text-on-surface font-medium flex-1 truncate">{s.horseName || `Entry #${s.entryId}`}</span>
                  <span className="font-mono text-yellow-400/70 text-xs">{s.totalPoints}p</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Override modal */}
      {showPauseModal && pauseInfo && (
        <OverrideModal
          race={race}
          legIndex={pauseInfo.conflictedLeg?.legIndex ?? 0}
          pauseInfo={pauseInfo}
          onClose={() => setShowPauseModal(false)}
          onResolved={() => {
            setShowPauseModal(false)
            onMonitor()
          }}
        />
      )}
    </>
  )
}

// ─── Race Picker Modal ───────────────────────────────────────────────────────

function RaceSelectModal({ races, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#1a2035] rounded-2xl w-full max-w-md border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Select Race to Monitor</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-gray-400 hover:text-white">✕</button>
        </div>
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {races.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-8">No races available.</p>
          ) : races.map(race => (
            <button
              key={race.raceId}
              onClick={() => onSelect(race)}
              className="w-full text-left gs-card p-4 hover:border-yellow-400/30 transition-all"
            >
              <p className="font-bold text-on-surface text-sm">{race.name}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">{fmtDateTime(race.scheduledStartTime)}</p>
              <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                race.status === 'InProgress' ? 'bg-amber-500/15 text-amber-400'
                : race.status === 'Paused' ? 'bg-orange-500/15 text-orange-400'
                : 'bg-gray-500/15 text-gray-400'
              }`}>{race.status}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AdminRaceExecutionPage() {
  const navigate = useNavigate()
  const isMountedRef = useRef(true)

  const [allRaces, setAllRaces] = useState([])
  const [selectedRace, setSelectedRace] = useState(null)
  const [execution, setExecution] = useState(null)
  const [standings, setStandings] = useState([])
  const [pauseInfo, setPauseInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [startingRace, setStartingRace] = useState(null)

  // Poll refs
  const pollRef = useRef(null)

  // Load all races
  const loadRaces = useCallback(async () => {
    try {
      const races = await getRaces()
      if (!isMountedRef.current) return
      // Show: Scheduled, InProgress, Paused, PendingResult
      setAllRaces(races.filter(r =>
        ['Scheduled', 'InProgress', 'Paused', 'PendingResult'].includes(r.status),
      ))
    } catch (err) {
      if (isMountedRef.current) setError(err?.message || 'Không tải được danh sách races.')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [])

  // Load execution for selected race
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

  // Start polling when a race is selected
  useEffect(() => {
    if (!selectedRace) return
    loadExecution(selectedRace.raceId)
    pollRef.current = setInterval(() => loadExecution(selectedRace.raceId), 6000)
    return () => clearInterval(pollRef.current)
  }, [selectedRace, loadExecution])

  // Auto-select first InProgress race
  useEffect(() => {
    if (!selectedRace && allRaces.length > 0) {
      const inProgress = allRaces.find(r => r.status === 'InProgress' || r.status === 'Paused')
      if (inProgress) setSelectedRace(inProgress)
    }
  }, [allRaces, selectedRace])

  async function handleStartRace(race) {
    if (!confirm(`Bắt đầu "${race.name}"?\n\nTất cả cược cho race này sẽ bị khóa.`)) return
    setStartingRace(race.raceId)
    try {
      await startRace(race.raceId)
      await loadRaces()
      const updated = allRaces.find(r => r.raceId === race.raceId)
      if (updated) setSelectedRace({ ...updated, status: 'InProgress' })
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Start race thất bại.')
    } finally {
      setStartingRace(null)
    }
  }

  const executableRaces = allRaces.filter(r => r.status === 'InProgress' || r.status === 'Paused')
  const selectedExecution = selectedRace ? execution : null

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/admin/races')}
          className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/25 flex items-center justify-center">
          <Flag size={20} className="text-yellow-400" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-bold text-on-surface">Race Execution</h1>
          <p className="text-xs text-on-surface-variant">Giám sát Blind Double-Entry · xử lý conflict · override kết quả</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
          >
            <RefreshCw size={12} /> Switch Race
          </button>
          <button
            onClick={() => { loadRaces(); if (selectedRace) loadExecution(selectedRace.raceId) }}
            className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle size={16} />{error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-40">
          <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* No race selected */}
          {!selectedRace && !loading && allRaces.length === 0 && (
            <div className="gs-card p-16 text-center">
              <Flag size={40} className="text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-on-surface mb-2">Không có cuộc đua nào đang thực thi</h3>
              <p className="text-sm text-on-surface-variant">
                Các cuộc đua sẽ xuất hiện ở đây khi được bắt đầu.
              </p>
            </div>
          )}

          {/* InProgress races list */}
          {!selectedRace && !loading && allRaces.length > 0 && (
            <div className="space-y-4">
              {allRaces.map(race => (
                <RaceExecutionCard
                  key={race.raceId}
                  race={race}
                  execution={null}
                  standings={[]}
                  onMonitor={() => setSelectedRace(race)}
                  onStart={handleStartRace}
                />
              ))}
            </div>
          )}

          {/* Selected race detail */}
          {selectedRace && selectedExecution && (
            <div className="space-y-4">
              {/* Back + race info */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setSelectedRace(null); setExecution(null); setPauseInfo(null) }}
                  className="text-xs text-on-surface-variant hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
                >
                  ← Back to list
                </button>
                <div className="flex-1">
                  <h2 className="font-serif text-xl font-bold text-on-surface">{selectedRace.name}</h2>
                  <p className="text-xs text-on-surface-variant">
                    {selectedExecution.totalLegs ?? selectedRace.numberOfLegs} legs ·{' '}
                    {selectedExecution.isBetsLocked ? '🔒 Bets locked' : 'Bets open'}
                  </p>
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-all"
                    >
                      <ChevronRight size={12} /> Resume Race
                    </button>
                  </div>
                )}
              </div>

              {/* Legs status grid */}
              <div className="gs-card overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h3 className="font-semibold text-on-surface text-sm">Leg Status</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {selectedExecution.legs?.map((leg, idx) => (
                    <div key={idx} className="px-5 py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          leg.status === 'Confirmed' ? 'bg-emerald-500 text-white'
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
                        {leg.results && leg.results.length > 0 && (
                          <div className="flex gap-1 text-xs text-gray-400">
                            {leg.results.slice(0, 3).map(r => (
                              <span key={r.entryId} className="font-mono">{r.position}p</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conflict alert */}
              {selectedRace.status === 'Paused' && pauseInfo && (
                <div className="gs-card border-orange-500/30">
                  <div className="px-5 py-4 border-b border-orange-500/20 bg-orange-500/5 flex items-start gap-3">
                    <AlertTriangle size={18} className="text-orange-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold text-orange-400 text-sm">Chênh lệch phát hiện — Cuộc đua tạm dừng</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Side-by-side comparison hiển thị bên dưới. Admin xác nhận kết quả chính thức.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setPauseInfo(pauseInfo) // ensure it's set
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold transition-all shrink-0"
                    >
                      <Shield size={12} /> Override Now
                    </button>
                  </div>

                  {/* Side-by-side table */}
                  <div className="px-5 py-4">
                    <div className="grid grid-cols-4 gap-2 mb-2 text-center text-[10px] text-gray-500 uppercase tracking-wider">
                      <div className="col-span-1 text-left">Entry</div>
                      <div className="col-span-1">Referee A</div>
                      <div className="col-span-1">Referee B</div>
                      <div className="col-span-1 text-center">Điểm</div>
                    </div>
                    {pauseInfo.sideBySideComparison?.map(item => (
                      <div key={item.entryId} className="grid grid-cols-4 gap-2 items-center py-2 border-b border-white/5 last:border-0">
                        <div className="text-sm font-semibold text-white truncate col-span-1">
                          {item.horseName || `Entry #${item.entryId}`}
                        </div>
                        <div className="col-span-1 text-center">
                          <span className={`inline-block px-3 py-1 rounded text-sm font-bold font-mono ${
                            item.isMatch ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                          }`}>
                            {item.referee1Position ?? '—'}
                          </span>
                        </div>
                        <div className="col-span-1 text-center">
                          <span className={`inline-block px-3 py-1 rounded text-sm font-bold font-mono ${
                            item.isMatch ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                          }`}>
                            {item.referee2Position ?? '—'}
                          </span>
                        </div>
                        <div className="col-span-1 text-center font-mono text-sm text-yellow-400">
                          {item.isMatch
                            ? `${getLegPoints(item.referee1Position)}p`
                            : '⚠ conflict'}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Override button */}
                  <div className="px-5 pb-5">
                    <OverrideModal
                      race={selectedRace}
                      legIndex={pauseInfo.conflictedLeg?.legIndex ?? 0}
                      pauseInfo={pauseInfo}
                      onClose={() => {}}
                      onResolved={() => {
                        loadExecution(selectedRace.raceId)
                        loadRaces()
                      }}
                    />
                    <button
                      onClick={() => setPauseInfo({ ...pauseInfo })}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black text-sm font-bold transition-all"
                    >
                      <Shield size={14} /> Override & Confirm Leg Result
                    </button>
                  </div>
                </div>
              )}

              {/* Standings */}
              {standings.length > 0 && (
                <div className="gs-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/10">
                    <h3 className="font-semibold text-on-surface text-sm">Live Standings</h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">{standings.length} entries · cập nhật tự động</p>
                  </div>
                  <div className="divide-y divide-white/5">
                    {standings.map((s, i) => (
                      <div key={s.entryId} className="px-5 py-3 flex items-center gap-4">
                        <span className={`w-6 text-center font-bold text-lg ${
                          i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'
                        }`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-on-surface truncate">{s.horseName || `Entry #${s.entryId}`}</p>
                          {s.currentPosition && (
                            <p className="text-[10px] text-gray-500">Current pos: {s.currentPosition}</p>
                          )}
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
        </>
      )}

      {/* Race picker modal */}
      {showPicker && (
        <RaceSelectModal
          races={allRaces}
          onSelect={race => { setSelectedRace(race); setShowPicker(false) }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
