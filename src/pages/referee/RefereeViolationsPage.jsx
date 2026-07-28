import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, AlertCircle, CheckCircle2, X, Plus,
  ChevronLeft, ChevronRight, SlidersHorizontal, Shield,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  getAllRaces, getRaceDetail, getAllEntries, getAllHorses, getViolations, reportViolation,
  getAllTournaments,
} from '../../api/referee'

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

const VIOLATION_TYPES = [
  'KhoiDongSom',     // FalseStart
  'CuoiNguaNguyHiem',// DangerousRiding
  'ViPhamRoi',       // WhipViolation
  'CanDuongDoiThu',  // Obstruction
  'ViPhamDoping',    // DopingViolation
  'ViPhamTrangBi',   // EquipmentViolation
  'Khac',            // Other
]

const VIOLATION_TYPE_LABELS = {
  KhoiDongSom:       'False Start',
  CuoiNguaNguyHiem:  'Dangerous Riding',
  ViPhamRoi:         'Whip Violation',
  CanDuongDoiThu:    'Obstruction',
  ViPhamDoping:      'Doping Violation',
  ViPhamTrangBi:     'Equipment Violation',
  Khac:              'Other',
}

// Trọng tài KHÔNG đề xuất án phạt — Admin là người ra quyết định xử phạt khi duyệt báo cáo.
// Trước đây form có ô "Proposed Sanction" mặc định "Warning", nên một báo cáo còn Pending đã
// hiện sẵn án phạt ở bảng Admin, trông y như đã có phán quyết. BE nay luôn lưu Penalty = "None"
// lúc tạo và bỏ qua field này kể cả khi client vẫn gửi.

const STATUS_META = {
  Pending:             { label: 'Pending',                cls: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/25' },
  Approved:            { label: 'Approved',                cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' },
  Rejected:            { label: 'Rejected',                cls: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/30' },
}

function getStatusMeta(s) {
  return STATUS_META[s] ?? { label: s ?? '—', cls: 'bg-surface-container-high text-on-surface-variant border border-outline-variant/40' }
}

// What actually happened to the entry's score as a result of this report — shown so the
// reporting referee can see whether/how many points were deducted, not just Approved/Rejected.
const PENALTY_META = {
  None:    { label: 'No Penalty', cls: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20' },
  Warning: { label: 'Warning',     cls: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
  Demote:  { label: 'Demoted',     cls: 'bg-orange-500/10 text-orange-400 border border-orange-500/20' },
  DQ:      { label: 'Disqualified',cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
}

function getPenaltyMeta(p) {
  return PENALTY_META[p] ?? null
}

function fmtIncidentId(v) {
  // BE GetViolationList doesn't return createdAt — fall back to violationId.
  return `#V-${String(v.violationId).padStart(3, '0')}`
}

function fmtDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// ─── Report Modal ─────────────────────────────────────────────────────────────

// Only races that have actually started have Legs — CreateViolationCommandHandler throws
// "Cuộc đua chưa bắt đầu" otherwise. Finished/Cancelled races are already settled/closed
// and shouldn't collect new reports, so only these 3 in-flight statuses are reportable.
const REPORTABLE_STATUSES = ['Paused', 'InProgress', 'PendingResult']
const REPORTABLE_STATUS_LABEL = { Paused: 'Paused', InProgress: 'In Progress', PendingResult: 'Pending Result' }

function ReportViolationModal({ assignedRaces, raceEntries, horseMap, onClose, onReported }) {
  const [raceId,    setRaceId]    = useState('')
  const [entryId,   setEntryId]   = useState('')
  const [type,      setType]      = useState('')
  const [desc,      setDesc]      = useState('')
  const [saving,    setSaving]    = useState(false)
  const [err,       setErr]       = useState('')

  const reportableRaces = useMemo(() => assignedRaces
    .filter(r => REPORTABLE_STATUSES.includes(r.status))
    .sort((a, b) => REPORTABLE_STATUSES.indexOf(a.status) - REPORTABLE_STATUSES.indexOf(b.status)
      || new Date(b.scheduledStartTime || b.scheduledAt || 0) - new Date(a.scheduledStartTime || a.scheduledAt || 0)),
    [assignedRaces])

  const availableEntries = raceId
    ? (raceEntries[Number(raceId)] ?? []).filter(e => e.status === 'Approved')
    : []

  const canSubmit = raceId && entryId && type && desc.trim()

  const handleSubmit = async () => {
    setSaving(true)
    setErr('')
    try {
      await reportViolation({
        raceId:        Number(raceId),
        entryId:       Number(entryId),
        violationType: type,
        description:   desc.trim(),
      })
      onReported()
    } catch (e) {
      // BE usually returns ProblemDetails (title/detail) on a bind failure, or a plain message.
      const detail = e?.response?.data?.detail || e?.response?.data?.title
      const title  = e?.response?.data?.title
      const firstError = e?.response?.data?.errors
        ? Object.values(e.response.data.errors).flat()[0]
        : null
      setErr(detail || firstError || title || e?.message || 'Failed to submit report.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-[520px] gs-card overflow-hidden animate-fade-in-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/40">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={17} className="text-yellow-400" />
            <h2 className="font-bold text-on-surface text-sm">Report a Violation</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Race */}
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest block mb-1.5">Race</label>
            <select
              value={raceId}
              onChange={e => { setRaceId(e.target.value); setEntryId('') }}
              className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-yellow-400/60 transition-all"
            >
              <option value="">-- Select a race --</option>
              {reportableRaces.map(r => (
                <option key={r.raceId} value={r.raceId}>{r.name} ({REPORTABLE_STATUS_LABEL[r.status]})</option>
              ))}
            </select>
            {reportableRaces.length === 0 && (
              <p className="text-xs text-on-surface-variant mt-1.5">
                No in-progress or unpublished race is currently assigned to you — a race must be started before a violation can be filed against it.
              </p>
            )}
          </div>

          {/* Entry */}
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest block mb-1.5">Entry (Horse)</label>
            <select
              value={entryId}
              onChange={e => setEntryId(e.target.value)}
              disabled={!raceId}
              className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-yellow-400/60 transition-all disabled:opacity-50"
            >
              <option value="">-- Select entry --</option>
              {availableEntries.map(e => (
                <option key={e.entryId} value={e.entryId}>
                  {horseMap[e.horseId]?.name ?? `Entry #${e.entryId}`}
                  {e.gateNumber ? ` (Gate ${e.gateNumber})` : ''}
                </option>
              ))}
            </select>
            {raceId && availableEntries.length === 0 && (
              <p className="text-xs text-on-surface-variant mt-1.5">No approved entry found for this race.</p>
            )}
          </div>

          {/* Type */}
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest block mb-1.5">Violation Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-yellow-400/60 transition-all"
            >
              <option value="">-- Select violation type --</option>
              {VIOLATION_TYPES.map(t => (
                <option key={t} value={t}>{VIOLATION_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest block mb-1.5">Description</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={4}
              placeholder="Describe the incident in detail..."
              className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-yellow-400/60 resize-none transition-all"
            />
          </div>

          {err && <p className="text-xs text-error">{err}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex justify-end gap-3">
          <button onClick={onClose} className="gs-btn gs-btn-ghost">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RefereeViolationsPage() {
  const { user }      = useAuth()
  const userId        = user?.userId

  const [violations,   setViolations]  = useState([])
  const [assignedRaces,setAssignedRaces] = useState([])
  const [raceEntries,  setRaceEntries] = useState({})  // {raceId: [entries]}
  const [raceMap,      setRaceMap]     = useState({})
  const [tourneyMap,   setTourneyMap]  = useState({})
  const [horseMap,     setHorseMap]    = useState({})
  const [loading,      setLoading]     = useState(true)
  const [error,        setError]       = useState('')
  const [reportModal,  setReportModal] = useState(false)
  const [page,         setPage]        = useState(1)
  const [statusFilter, setStatusFilter] = useState('All')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [allV, allR, allE, allH, allT] = await Promise.all([
        getViolations(),
        getAllRaces(),
        getAllEntries(),
        getAllHorses(),
        getAllTournaments(),
      ])

      const details = await Promise.allSettled(allR.map(r => getRaceDetail(r.raceId)))
      const myRaces = details
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)
        .filter(r => r.referee1Id === userId || r.referee2Id === userId)

      const rMap = Object.fromEntries(myRaces.map(r => [r.raceId, r]))
      const tMap = Object.fromEntries(allT.map(t => [t.tournamentId, t]))
      const hMap = Object.fromEntries(allH.map(h => [h.horseId, h]))

      // Group entries by raceId
      const eByRace = {}
      for (const e of allE) {
        if (!eByRace[e.raceId]) eByRace[e.raceId] = []
        eByRace[e.raceId].push(e)
      }

      // GET /api/violations returns every violation in the system, not just this referee's
      // own reports (BE doesn't scope it) — filter here so "Recent Reports"/the stat cards
      // above only reflect what THIS referee personally filed, not every referee's reports.
      setViolations(allV.filter(v => v.reportedByRefereeId === userId))
      setAssignedRaces(myRaces)
      setRaceMap(rMap)
      setTourneyMap(tMap)
      setRaceEntries(eByRace)
      setHorseMap(hMap)
    } catch (err) {
      setError(err?.message || 'Failed to load violations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stats ──
  const activeCount  = useMemo(() => violations.filter(v => v.status === 'Pending').length, [violations])
  const approvedCount= useMemo(() => violations.filter(v => v.status === 'Approved').length, [violations])
  const rejectedCount= useMemo(() => violations.filter(v => v.status === 'Rejected').length, [violations])

  const STATUS_FILTERS = ['All', 'Pending', 'Approved', 'Rejected']

  const filtered = useMemo(() =>
    statusFilter === 'All' ? violations : violations.filter(v => v.status === statusFilter),
  [violations, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const STATS = [
    { label: 'Pending',  value: activeCount,   Icon: Shield,       sub: 'Reported by referee, awaiting admin', cls: 'text-yellow-400',  bg: 'bg-yellow-400/10 border border-yellow-400/25' },
    { label: 'Approved', value: approvedCount, Icon: CheckCircle2, sub: 'Penalty applied to race',             cls: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/30' },
    { label: 'Rejected', value: rejectedCount, Icon: X,            sub: 'No penalty applied',                  cls: 'text-zinc-400',   bg: 'bg-zinc-500/10 border border-zinc-500/30' },
  ]

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-[1100px] mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div className="animate-fade-in-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/25 flex items-center justify-center">
                <AlertTriangle size={20} className="text-yellow-400" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold text-on-surface">Disciplinary Violations</h1>
                <p className="text-on-surface-variant text-sm">Track, file, and manage violation reports across races.</p>
              </div>
            </div>
            <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-yellow-400 to-secondary mt-3" />
          </div>

          <button
            onClick={() => setReportModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-yellow-400 text-black hover:bg-yellow-300 transition-all"
          >
            <Plus size={16} /> Report a Violation
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />{error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {STATS.map(({ label, value, Icon, sub, cls, bg }, i) => (
            <div
              key={label}
              className={`gs-card p-5 animate-fade-in-up delay-row-${i + 1}`}
              style={{ opacity: 0, animationFillMode: 'forwards' }}
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{label}</p>
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon size={16} className={cls} />
                </div>
              </div>
              <p className={`text-4xl font-bold font-mono ${cls}`}>
                {loading ? '—' : String(value).padStart(2, '0')}
              </p>
              <p className="text-xs text-on-surface-variant mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="gs-card overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant/40 flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-serif font-bold text-on-surface">Recent Reports</h2>
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-on-surface-variant" />
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
                className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-yellow-400/60 transition-all"
              >
                {STATUS_FILTERS.map(f => (
                  <option key={f} value={f}>
                    {f === 'All' ? 'All Statuses' : getStatusMeta(f).label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
            </div>
          ) : paginated.length === 0 ? (
            <div className="py-20 text-center">
              <AlertTriangle size={36} className="text-on-surface-variant/30 mx-auto mb-3" />
              <p className="text-on-surface font-semibold">No violation reports yet</p>
              <p className="text-on-surface-variant text-sm mt-1">Click "Report a Violation" to report an incident.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Incident ID</th>
                    <th>Entry (Horse &amp; Jockey)</th>
                    <th>Violation Type</th>
                    <th>Date &amp; Race</th>
                    <th>Status</th>
                    <th>Penalty</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((v, i) => {
                    const race       = raceMap[v.raceId]
                    const tournament = race ? tourneyMap[race.tournamentId] : null
                    const entries = raceEntries[v.raceId] ?? []
                    const entry   = entries.find(e => e.entryId === v.entryId)
                    const horse   = horseMap[entry?.horseId]
                    const meta    = getStatusMeta(v.status)
                    const penaltyMeta = getPenaltyMeta(v.penalty)

                    return (
                      <tr
                        key={v.violationId}
                        className={`animate-fade-in-up delay-row-${(i % 4) + 1}`}
                        style={{ opacity: 0, animationFillMode: 'forwards' }}
                      >
                        <td className="font-mono text-sm text-on-surface-variant font-bold whitespace-nowrap">
                          {fmtIncidentId(v)}
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-surface-container-high border border-outline-variant/40 flex items-center justify-center text-xs font-bold text-on-surface-variant shrink-0">
                              {entry?.gateNumber ?? '?'}
                            </div>
                            <div>
                              <p className="font-bold text-on-surface text-sm">{horse?.name ?? `Entry #${v.entryId}`}</p>
                              <p className="text-xs text-on-surface-variant">{entry?.jockeyName ?? 'J: —'}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <p className="font-semibold text-on-surface text-sm">
                            {VIOLATION_TYPE_LABELS[v.violationType] ?? v.violationType}
                          </p>
                          {v.description && (
                            <p className="text-xs text-on-surface-variant mt-0.5 max-w-[280px] whitespace-normal break-words">{v.description}</p>
                          )}
                        </td>
                        <td className="text-sm text-on-surface-variant">
                          <p>{fmtDate(v.createdAt)}</p>
                          {race ? (
                            <Link
                              to={`/referee/races/${race.raceId}`}
                              className="text-xs mt-0.5 text-yellow-400 hover:text-yellow-300 hover:underline inline-block"
                              title="Open race dashboard — points, status, published state"
                            >
                              {race.name}
                            </Link>
                          ) : (
                            <p className="text-xs mt-0.5">Race #{v.raceId}</p>
                          )}
                          {tournament?.name && (
                            <p className="text-[10px] mt-0.5 text-on-surface-variant/70">{tournament.name}</p>
                          )}
                        </td>
                        <td>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${meta.cls}`}>
                            {v.status === 'Approved'  && <CheckCircle2 size={11} />}
                            {v.status === 'Rejected'  && <X size={11} />}
                            {meta.label}
                          </span>
                        </td>
                        <td>
                          {v.status === 'Pending' ? (
                            <span className="text-xs text-on-surface-variant">—</span>
                          ) : penaltyMeta ? (
                            <>
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${penaltyMeta.cls}`}>
                                {penaltyMeta.label}
                              </span>
                              {/* Admin's note used to only live inside a hover-only `title`
                                  tooltip on the badge above — invisible unless you happened
                                  to hover exactly on it. Show it outright instead. */}
                              {v.adminNote && (
                                <p className="text-xs text-on-surface-variant mt-1 max-w-[220px] whitespace-normal break-words italic">
                                  "{v.adminNote}"
                                </p>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-on-surface-variant">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant/40">
              <span className="text-xs text-on-surface-variant">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} items
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="gs-btn gs-btn-ghost gs-btn-sm px-2">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="gs-btn gs-btn-ghost gs-btn-sm px-2">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {reportModal && (
        <ReportViolationModal
          assignedRaces={assignedRaces}
          raceEntries={raceEntries}
          horseMap={horseMap}
          onClose={() => setReportModal(false)}
          onReported={() => { setReportModal(false); load() }}
        />
      )}
    </div>
  )
}
