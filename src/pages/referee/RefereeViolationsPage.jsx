import { useState, useEffect, useMemo } from 'react'
import {
  AlertTriangle, AlertCircle, CheckCircle2, X, Plus,
  ChevronLeft, ChevronRight, SlidersHorizontal, Shield,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  getAllRaces, getRaceDetail, getAllEntries, getAllHorses, getViolations, reportViolation,
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
  KhoiDongSom:       'Khởi động sớm',
  CuoiNguaNguyHiem:  'Cưỡi ngựa nguy hiểm',
  ViPhamRoi:         'Vi phạm roi',
  CanDuongDoiThu:    'Cản đường đối thủ',
  ViPhamDoping:      'Vi phạm doping',
  ViPhamTrangBi:     'Vi phạm trang bị',
  Khac:              'Khác',
}

const STATUS_META = {
  Pending:             { label: 'Chờ xử lý',              cls: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/25' },
  Approved:            { label: 'Đã duyệt',               cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' },
  Rejected:            { label: 'Đã từ chối',             cls: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/30' },
}

function getStatusMeta(s) {
  return STATUS_META[s] ?? { label: s ?? '—', cls: 'bg-surface-container-high text-on-surface-variant border border-outline-variant/40' }
}

function fmtIncidentId(v) {
  // BE GetViolationList không trả createdAt — fallback theo violationId.
  return `#V-${String(v.violationId).padStart(3, '0')}`
}

function fmtDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// ─── Report Modal ─────────────────────────────────────────────────────────────

function ReportViolationModal({ assignedRaces, raceEntries, horseMap, onClose, onReported }) {
  const [raceId,    setRaceId]    = useState('')
  const [entryId,   setEntryId]   = useState('')
  const [type,      setType]      = useState('')
  const [desc,      setDesc]      = useState('')
  const [saving,    setSaving]    = useState(false)
  const [err,       setErr]       = useState('')

  const availableEntries = raceId ? (raceEntries[Number(raceId)] ?? []) : []

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
      // BE thường trả ProblemDetails (title/detail) khi bind fail, hoặc plain message.
      const detail = e?.response?.data?.detail || e?.response?.data?.title
      const title  = e?.response?.data?.title
      const firstError = e?.response?.data?.errors
        ? Object.values(e.response.data.errors).flat()[0]
        : null
      setErr(detail || firstError || title || e?.message || 'Gửi biên bản thất bại.')
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
            <h2 className="font-bold text-on-surface text-sm">Lập biên bản vi phạm</h2>
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
              <option value="">-- Chọn cuộc đua --</option>
              {assignedRaces.map(r => (
                <option key={r.raceId} value={r.raceId}>{r.name}</option>
              ))}
            </select>
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
              <option value="">-- Chọn entry --</option>
              {availableEntries.map(e => (
                <option key={e.entryId} value={e.entryId}>
                  {horseMap[e.horseId]?.name ?? `Entry #${e.entryId}`}
                  {e.gateNumber ? ` (Gate ${e.gateNumber})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest block mb-1.5">Violation Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-yellow-400/60 transition-all"
            >
              <option value="">-- Chọn loại vi phạm --</option>
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
              placeholder="Mô tả chi tiết sự việc..."
              className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-yellow-400/60 resize-none transition-all"
            />
          </div>

          {err && <p className="text-xs text-error">{err}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex justify-end gap-3">
          <button onClick={onClose} className="gs-btn gs-btn-ghost">Huỷ</button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? 'Đang gửi...' : 'Gửi biên bản'}
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
      const [allV, allR, allE, allH] = await Promise.all([
        getViolations(),
        getAllRaces(),
        getAllEntries(),
        getAllHorses(),
      ])

      const details = await Promise.allSettled(allR.map(r => getRaceDetail(r.raceId)))
      const myRaces = details
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)
        .filter(r => r.referee1Id === userId || r.referee2Id === userId)

      const rMap = Object.fromEntries(myRaces.map(r => [r.raceId, r]))
      const hMap = Object.fromEntries(allH.map(h => [h.horseId, h]))

      // Group entries by raceId
      const eByRace = {}
      for (const e of allE) {
        if (!eByRace[e.raceId]) eByRace[e.raceId] = []
        eByRace[e.raceId].push(e)
      }

      setViolations(allV)
      setAssignedRaces(myRaces)
      setRaceMap(rMap)
      setRaceEntries(eByRace)
      setHorseMap(hMap)
    } catch (err) {
      setError(err?.message || 'Không tải được vi phạm')
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
    { label: 'Chờ xử lý',     value: activeCount,   Icon: Shield,       sub: 'Referee đã báo cáo, chờ Admin',  cls: 'text-yellow-400', bg: 'bg-yellow-400/10 border border-yellow-400/25' },
    { label: 'Đã duyệt',       value: approvedCount, Icon: AlertTriangle, sub: 'Đã áp dụng penalty vào race',     cls: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/30' },
    { label: 'Đã từ chối',     value: rejectedCount, Icon: CheckCircle2,  sub: 'Mùa giải hiện tại',               cls: 'text-zinc-400',  bg: 'bg-zinc-500/10 border border-zinc-500/30' },
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
                <h1 className="font-serif text-2xl font-bold text-on-surface">Vi phạm kỷ luật</h1>
                <p className="text-on-surface-variant text-sm">Theo dõi, lập và quản lý biên bản vi phạm trong các cuộc đua.</p>
              </div>
            </div>
            <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-yellow-400 to-secondary mt-3" />
          </div>

          <button
            onClick={() => setReportModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-yellow-400 text-black hover:bg-yellow-300 transition-all"
          >
            <Plus size={16} /> Lập biên bản vi phạm
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
            <h2 className="font-serif font-bold text-on-surface">Biên bản gần đây</h2>
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-on-surface-variant" />
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
                className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-yellow-400/60 transition-all"
              >
                {STATUS_FILTERS.map(f => (
                  <option key={f} value={f}>
                    {f === 'All' ? 'Tất cả trạng thái' : getStatusMeta(f).label}
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
              <p className="text-on-surface font-semibold">Chưa có biên bản vi phạm</p>
              <p className="text-on-surface-variant text-sm mt-1">Nhấn "Lập biên bản vi phạm" để báo cáo sự việc.</p>
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
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((v, i) => {
                    const race    = raceMap[v.raceId]
                    const entries = raceEntries[v.raceId] ?? []
                    const entry   = entries.find(e => e.entryId === v.entryId)
                    const horse   = horseMap[entry?.horseId]
                    const meta    = getStatusMeta(v.status)

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
                              <p className="text-xs text-on-surface-variant">J: —</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <p className="font-semibold text-on-surface text-sm">
                            {VIOLATION_TYPE_LABELS[v.violationType] ?? v.violationType}
                          </p>
                          {v.description && (
                            <p className="text-xs text-on-surface-variant mt-0.5 max-w-[220px] truncate">{v.description}</p>
                          )}
                        </td>
                        <td className="text-sm text-on-surface-variant">
                          <p>{fmtDate(v.createdAt)}</p>
                          {race && <p className="text-xs mt-0.5">{race.name}</p>}
                        </td>
                        <td>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${meta.cls}`}>
                            {v.status === 'Approved'  && <CheckCircle2 size={11} />}
                            {v.status === 'Rejected'  && <X size={11} />}
                            {meta.label}
                          </span>
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
                Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length} mục
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
