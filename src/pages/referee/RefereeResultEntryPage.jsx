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

// Lưu session-key cho mỗi (raceId, legIndex) đã submit để chống
// duplicate khi user mở nhiều tab. Key reset khi tab đóng (sessionStorage).
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
  return new Date(dt).toLocaleString('vi-VN', {
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
        // Lọc races InProgress mà referee này được phân công
        const inProgress = list.filter(
          r => r.status === 'InProgress' || r.status === 'Paused',
        )
        // Lấy chi tiết để lọc referee
        const settled = await Promise.allSettled(
          inProgress.map(r => getRaceDetail(r.raceId)),
        )
        const myRaces = settled
          .filter(s => s.status === 'fulfilled')
          .map(s => s.value)
          .filter(r => r.referee1Id === userId || r.referee2Id === userId)
        setRaces(myRaces)
      } catch (err) {
        setError(err?.message || 'Không tải được danh sách cuộc đua.')
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
            ? 'Không có cuộc đua nào đang diễn ra'
            : 'Chọn cuộc đua để bắt đầu nhập kết quả'}
        </p>
      </div>

      {races.length === 0 ? (
        <div className="gs-card max-w-sm mx-auto p-10 text-center">
          <p className="text-on-surface-variant text-sm">
            Các cuộc đua bạn được phân công sẽ xuất hiện ở đây khi chúng bắt đầu.
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
                      <Zap size={11} /> Đang tạm dừng — chờ Admin xử lý
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

  // Submission
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitResult, setSubmitResult] = useState(null) // { status, message }

  // Local lock flag — set ngay khi user click submit (trước khi API trả về).
  // Cần thiết để chống double-click & multi-tab duplicate submission.
  // Khởi tạo là false vì raceId chưa có giá trị tại thời điểm init.
  // Đồng bộ sessionStorage trong useEffect bên dưới.
  const [hasSubmitted, setHasSubmitted] = useState(false)

  // Sync hasSubmitted từ sessionStorage khi race hoặc activeLegIndex thay đổi.
  useEffect(() => {
    // race.raceId là giá trị thực; preselectedRaceId chỉ dùng khi race chưa load.
    const id = race?.raceId ?? preselectedRaceId
    if (id == null) return
    const key = getSubmitSessionKey(id, activeLegIndex)
    if (typeof window !== 'undefined' && sessionStorage.getItem(key)) {
      setHasSubmitted(true)
    }
  }, [race, activeLegIndex, preselectedRaceId])

  // Referee view (blind)
  const [legView, setLegView] = useState(null)
  const [loadingLeg, setLoadingLeg] = useState(false)

  const pollRef = useRef(null)
  const isMountedRef = useRef(true)

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
      setError(err?.message || 'Không tải được thông tin cuộc đua.')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [])

  // ── Load leg view (blind) ──
  const loadLegView = useCallback(async (raceId, legIndex) => {
    setLoadingLeg(true)
    setDraftSaved(false)
    try {
      const view = await getRefereeLegView(raceId, legIndex)
      if (!isMountedRef.current) return
      setLegView(view)

      // Đồng bộ hasSubmitted từ sessionStorage + server (phòng trường hợp
      // tab khác đã submit trước khi polling nhận được update).
      const sessionFlag = typeof window !== 'undefined'
        && Boolean(sessionStorage.getItem(getSubmitSessionKey(raceId, legIndex)))
      if ((sessionFlag || view?.mySubmitted) && isMountedRef.current) {
        setHasSubmitted(true)
      }

      // Pre-fill positions from mySubmittedData if available
      if (view.mySubmittedData && Array.isArray(view.mySubmittedData)) {
        setPositions(prev => ({
          ...prev,
          [legIndex]: Object.fromEntries(
            view.mySubmittedData.map(item => [item.entryId, item.position ?? '']),
          ),
        }))
      } else {
        // Chỉ reset về rỗng khi CHƯA có entry nào được gán position.
        // Tránh stale-closure reset mất dữ liệu user đang nhập dở.
        const posSlice = positions[legIndex] ?? {}
        const hasAnyPosition = Object.values(posSlice).some(
          (p) => p !== null && p !== undefined && p !== '',
        )
        if (!hasAnyPosition && view.entries) {
          const empty = {}
          view.entries.forEach(e => { empty[e.entryId] = '' })
          setPositions(prev => ({ ...prev, [legIndex]: empty }))
        }
      }
    } catch (err) {
      if (!isMountedRef.current) return
      console.error('Failed to load leg view:', err)
    } finally {
      if (isMountedRef.current) setLoadingLeg(false)
    }
  }, [positions])

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

      // Kiểm tra sessionStorage từ tab khác đã submit chưa.
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
  // Polling vẫn chạy sau khi submit để nhận admin override.
  useEffect(() => {
    if (!race) return
    pollRef.current = setInterval(async () => {
      try {
        const [execData, standingsData] = await Promise.all([
          getRaceExecutionStatus(race.raceId),
          getRaceStandings(race.raceId).catch(() => []),
        ])
        if (!isMountedRef.current) return
        setExecution(execData)
        setStandings(standingsData)

        // Kiểm tra sessionStorage từ tab khác đã submit chưa.
        const sessionFlag = Boolean(
          sessionStorage.getItem(getSubmitSessionKey(race.raceId, activeLegIndex)),
        )
        if (sessionFlag) {
          setHasSubmitted(true)
        }

        // Reload leg view if current leg is still open
        if (execData.status === 'InProgress' || execData.status === 'Paused') {
          const currentLegIdx = execData.currentLegIndex ?? activeLegIndex
          const currentLeg = execData.legs?.[currentLegIdx]
          if (currentLeg && currentLeg.status === 'Pending') {
            loadLegView(race.raceId, currentLegIdx)
          }
        }
      } catch { /* silent polling fail */ }
    }, 8000)
    return () => clearInterval(pollRef.current)
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

  // Validation: mỗi position chỉ có 1 entry (không trùng rank, kể cả DNF/DQ)
  // Bug #7: dùng shared validateLegPositions để đảm bảo rule nhất quán
  // với LegSubmissionPage.
  function getLegValidation(legIndex) {
    const posMap = positions[legIndex] ?? {}
    const entries = (legView?.entries ?? []).map((e) => ({ entryId: e.entryId }))
    return validateLegPositions(entries, posMap)
  }

  // ── Save Draft ──
  const handleSaveDraft = async () => {
    if (!race) return
    // Bug #11: không cho save draft khi race không còn InProgress.
    if (execution?.status && execution.status !== 'InProgress') {
      setSubmitError('Không thể lưu nháp khi race không ở trạng thái InProgress.')
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
      setSubmitError(err?.message || 'Lưu nháp thất bại.')
    }
  }

  // ── Submit ──
  // Bug #1 + #2: set hasSubmitted + sessionStorage NGAY TRƯỚC khi gọi API,
  // để chống double-click race condition và duplicate từ tab khác.
  const handleSubmit = async () => {
    if (!race) return

    if (hasSubmitted || submitting) {
      // Đã submit (ở tab này hoặc tab khác) — bỏ qua để chống duplicate.
      return
    }

    const { valid } = getLegValidation(activeLegIndex)
    if (!valid) {
      setSubmitError('Vui lòng nhập đầy đủ và không trùng thứ hạng.')
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
      if (result.status === 'Matched' && !result.isRaceComplete) {
        setTimeout(() => {
          if (isMountedRef.current && result.nextLegIndex !== undefined) {
            setActiveLegIndex(result.nextLegIndex)
          }
        }, 2000)
      }
    } catch (err) {
      const msg = err?.response?.data?.error === 'ALREADY_SUBMITTED'
        ? 'Bạn đã submit kết quả cho Leg này rồi.'
        : err?.response?.data?.message
        || err?.message
        || 'Submit thất bại.'
      setSubmitError(msg)
      // Submit fail → mở lại UI cho user retry (Bug #1)
      setHasSubmitted(false)
      sessionStorage.removeItem(sessionKey)
    } finally {
      if (isMountedRef.current) setSubmitting(false)
    }
  }

  // ── Derived ──
  const currentLegData = execution?.legs?.[activeLegIndex]
  // hasSubmitted đảm bảo UI lock NGAY khi user click submit,
  // không đợi server response (chống double-click).
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
              Blind Double-Entry — kết quả của bạn được ẩn với referee kia cho đến khi cả 2 submit.
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
        {/* Race không còn InProgress → không cho nhập/save/submit. */}
        {race && execution?.status === 'Paused' && (
          <div className="mb-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3">
            <AlertCircle size={18} className="text-orange-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-orange-400">Race Paused</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Cuộc đua đang tạm dừng do có chênh lệch giữa 2 referees. Vui lòng chờ Admin xử lý.
              </p>
              <button
                onClick={() => navigate('/referee')}
                className="mt-3 px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold transition-all"
              >
                Quay lại Dashboard
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
                Cuộc đua đã kết thúc.
              </p>
              <button
                onClick={() => navigate('/referee')}
                className="mt-3 px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold transition-all"
              >
                Quay lại Dashboard
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
                  <p className="text-sm font-bold text-orange-400">Cuộc đua đang tạm dừng</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Đã phát hiện chênh lệch giữa 2 referees. Admin đang xem xét và sẽ resume race.
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
                      → Chuyển sang Leg {submitResult.nextLegIndex + 1} trong giây lát...
                    </p>
                  )}
                </div>
              </div>
            )}

            {submitResult?.status === 'Conflicted' && (
              <div className="mb-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3 animate-fade-in-up">
                <AlertCircle size={18} className="text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-orange-400">Chênh lệch phát hiện — Race Paused</p>
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
                      Leg {legNumber} — Kết quả của bạn
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {isLegLocked
                        ? 'Đã submit · không thể sửa'
                        : 'Nhập thứ hạng cho từng Entry · dữ liệu ẩn với referee kia'}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[11px] font-bold px-3 py-1 rounded-lg border uppercase tracking-wider
                    ${isLegLocked
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-700'
                      : 'bg-surface-container-high text-on-surface-variant border-white/10'
                    }`}
                  >
                    {isLegLocked ? 'Đã khóa' : 'Đang mở'}
                  </span>
                </div>
              </div>

              {/* Privacy notice */}
              <div className="px-5 py-2.5 border-b border-yellow-400/10 bg-yellow-400/5 flex items-center gap-2">
                <EyeOff size={13} className="text-yellow-400/70 shrink-0" />
                <p className="text-xs text-on-surface-variant">
                  <span className="text-yellow-400/80 font-medium">Blind Entry: </span>
                  Dữ liệu của bạn KHÔNG hiển thị cho referee kia cho đến khi cả 2 submit.
                  Server tự động so sánh khi cả 2 đã submit.
                </p>
              </div>

              {/* Status from legView */}
              {legView && (
                <div className="px-5 py-2 border-b border-white/5 bg-white/3 flex items-center gap-4 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    {legView.mySubmitted
                      ? <><CheckCircle2 size={12} className="text-emerald-400" /> Đã submit</>
                      : <><Lock size={12} className="text-gray-500" /> Chưa submit</>}
                  </span>
                  <span className="flex items-center gap-1">
                    {legView.opponentSubmitted
                      ? <><CheckCircle2 size={12} className="text-emerald-400" /> Referee kia đã submit</>
                      : <><Loader2 size={12} className="text-gray-500 animate-spin" /> Đang chờ referee kia...</>}
                  </span>
                  {legView.bothSubmitted && (
                    <span className={`font-bold ${legView.legStatus === 'Matched' ? 'text-emerald-400' : 'text-orange-400'}`}>
                      {legView.legStatus === 'Matched' ? '✓ Khớp hoàn toàn' : '⚠ Có chênh lệch'}
                    </span>
                  )}
                </div>
              )}

              {/* Entries table */}
              {loadingLeg ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
                </div>
              ) : entries.length === 0 ? (
                <div className="py-16 text-center text-on-surface-variant text-sm">
                  Không có entries nào cho leg này.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-5 py-3 text-left text-xs text-on-surface-variant font-medium uppercase tracking-wider w-16">Gate</th>
                        <th className="px-3 py-3 text-left text-xs text-on-surface-variant font-medium uppercase tracking-wider">Horse</th>
                        <th className="px-3 py-3 text-left text-xs text-on-surface-variant font-medium uppercase tracking-wider">Jockey</th>
                        <th className="px-3 py-3 text-center text-xs text-on-surface-variant font-medium uppercase tracking-wider w-28">Thứ hạng</th>
                        <th className="px-3 py-3 text-center text-xs text-on-surface-variant font-medium uppercase tracking-wider w-20">Điểm</th>
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
                      Đã lưu nháp thành công.
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs text-on-surface-variant/60 italic">
                      Mỗi thứ hạng chỉ gán cho 1 Entry duy nhất.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveDraft}
                        disabled={submitting || hasSubmitted}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/20 text-sm text-gray-300 hover:bg-white/10 transition-all disabled:opacity-50"
                      >
                        <Save size={14} />
                        Lưu nháp
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
                          ? <><Loader2 size={14} className="animate-spin" /> Đang gửi...</>
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
            <p className="text-on-surface-variant text-sm">Đang tải cuộc đua...</p>
          </div>
        )}
      </div>
    </div>
  )
}
