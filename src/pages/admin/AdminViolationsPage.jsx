import { useState, useEffect } from "react"
import {
  ShieldAlert,
  Search,
  Eye,
  Edit2,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  ArrowUp,
  Plus,
  AlertCircle,
} from "lucide-react"
import {
  getViolations,
  createViolation,
  updateViolation,
  deleteViolation,
} from "../../api/admin"

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: "DOPING",                  label: "Doping" },
  { value: "UNSPORTSMANLIKE_CONDUCT", label: "Unsportsmanlike Conduct" },
  { value: "RULE_VIOLATION",         label: "Rule Violation" },
  { value: "BETTING_FRAUD",          label: "Betting Fraud" },
  { value: "HORSEMANSHIP_ABUSE",     label: "Horsemanship Abuse" },
  { value: "DOCUMENT_FORGERY",        label: "Document Forgery" },
]

const SEVERITY_OPTIONS = [
  { value: "LOW",      label: "Low" },
  { value: "MEDIUM",   label: "Medium" },
  { value: "HIGH",     label: "High" },
  { value: "CRITICAL", label: "Critical" },
]

const STATUS_TABS = ["All", "ACTIVE", "APPEALED", "SERVED", "EXPIRED"]
const PAGE_SIZE = 10

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function getStatusBadge(status) {
  switch (status) {
    case "ACTIVE":   return "gs-badge gs-badge-error"
    case "APPEALED": return "gs-badge gs-badge-warning"
    case "SERVED":   return "gs-badge gs-badge-success"
    case "EXPIRED":  return "gs-badge gs-badge-neutral"
    default:         return "gs-badge gs-badge-neutral"
  }
}

function getSeverityBadge(s) {
  switch (s) {
    case "LOW":      return "gs-badge gs-badge-neutral"
    case "MEDIUM":   return "gs-badge gs-badge-warning"
    case "HIGH":
    case "CRITICAL": return "gs-badge gs-badge-error"
    default:         return "gs-badge gs-badge-neutral"
  }
}

// ─── Form Modal (Create / Edit) ────────────────────────────────────────────

function ViolationFormModal({ violation, onClose, onSubmit, submitting, error }) {
  const isEdit = !!violation
  const [form, setForm] = useState({
    violatorName:    violation?.violatorName    ?? "",
    violationType:   violation?.violationType   ?? "RULE_VIOLATION",
    severity:        violation?.severity        ?? "MEDIUM",
    description:     violation?.description     ?? "",
    fineAmount:      violation?.fineAmount      ?? "",
    suspensionDays:  violation?.suspensionDays  ?? "",
    notes:           violation?.notes            ?? "",
  })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.violatorName.trim()) return
    onSubmit({
      violatorName:   form.violatorName.trim(),
      violationType:  form.violationType,
      severity:       form.severity,
      description:    form.description.trim() || null,
      fineAmount:     form.fineAmount ? Number(form.fineAmount) : null,
      suspensionDays: form.suspensionDays ? Number(form.suspensionDays) : null,
      notes:          form.notes.trim() || null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
      <div className="gs-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-error/10 border border-error/20 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-error" />
            </div>
            <h2 className="font-serif font-bold text-on-surface">{isEdit ? "Edit Violation" : "Record Violation"}</h2>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">Violator Name <span className="text-error">*</span></label>
            <input required value={form.violatorName} onChange={set("violatorName")} placeholder="e.g. John Smith"
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-error transition-all placeholder:text-on-surface-variant/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">Violation Type</label>
              <select value={form.violationType} onChange={set("violationType")}
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-error transition-all">
                {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">Severity</label>
              <select value={form.severity} onChange={set("severity")}
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-error transition-all">
                {SEVERITY_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">Fine Amount ($)</label>
              <input type="number" min="0" value={form.fineAmount} onChange={set("fineAmount")} placeholder="0"
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-error transition-all placeholder:text-on-surface-variant/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">Suspension (days)</label>
              <input type="number" min="0" value={form.suspensionDays} onChange={set("suspensionDays")} placeholder="0"
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-error transition-all placeholder:text-on-surface-variant/40"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">Description</label>
            <textarea rows={3} value={form.description} onChange={set("description")} placeholder="Describe the violation in detail..."
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-error transition-all placeholder:text-on-surface-variant/40 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">Admin Notes</label>
            <textarea rows={2} value={form.notes} onChange={set("notes")} placeholder="Internal notes (optional)..."
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-error transition-all placeholder:text-on-surface-variant/40 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="gs-btn gs-btn-ghost">Cancel</button>
            <button type="submit" disabled={submitting} className="gs-btn gs-btn-error flex items-center gap-2 disabled:opacity-50">
              {submitting && <div className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />}
              {isEdit ? "Save Changes" : "Record Violation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── View Modal ────────────────────────────────────────────────────────────

function ViolationDetailModal({ item, onClose, onEdit, onDelete, actionLoading }) {
  if (!item) return null
  const typeLabel = TYPE_OPTIONS.find((t) => t.value === item.violationType)?.label || item.violationType
  const sevLabel  = SEVERITY_OPTIONS.find((s) => s.value === item.severity)?.label || item.severity

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
      <div className="gs-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-error/10 border border-error/20 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-error" />
            </div>
            <h2 className="font-serif font-bold text-on-surface">Violation Details</h2>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-on-surface text-lg leading-snug flex-1 pr-4">{item.violatorName}</h3>
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              <span className={getSeverityBadge(item.severity)}>{sevLabel}</span>
              <span className={getStatusBadge(item.status)}>{item.status}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Violation Type", value: typeLabel },
              { label: "Fine Amount", value: item.fineAmount != null ? `$${Number(item.fineAmount).toLocaleString()}` : "—" },
              { label: "Suspension", value: item.suspensionDays ? `${item.suspensionDays} days` : "—" },
              { label: "Reported", value: fmtDate(item.createdAt) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surface-container-low rounded-xl p-3">
                <p className="text-xs text-on-surface-variant mb-1">{label}</p>
                <p className="text-sm font-semibold text-on-surface">{value}</p>
              </div>
            ))}
          </div>
          {item.description && (
            <div className="bg-surface-container-low rounded-xl p-4">
              <p className="text-xs text-on-surface-variant mb-1.5 font-semibold uppercase tracking-wider">Description</p>
              <p className="text-sm text-on-surface">{item.description}</p>
            </div>
          )}
          {item.notes && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
              <p className="text-xs text-amber-400 mb-1.5 font-semibold uppercase tracking-wider">Admin Notes</p>
              <p className="text-sm text-amber-300">{item.notes}</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant/40">
          <button onClick={() => onDelete(item.violationId)} disabled={actionLoading === item.violationId + "_delete"}
            className="gs-btn gs-btn-error flex items-center gap-2 disabled:opacity-50">
            {actionLoading === item.violationId + "_delete"
              ? <div className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
              : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
          <button onClick={() => onEdit(item)} className="gs-btn gs-btn-secondary flex items-center gap-2">
            <Edit2 className="w-4 h-4" />Edit
          </button>
          <button onClick={onClose} className="gs-btn gs-btn-ghost">Close</button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────

function DeleteModal({ violationId, onClose, onConfirm, submitting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
      <div className="gs-card w-full max-w-sm">
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-error/10 border border-error/20 mx-auto mb-4 flex items-center justify-center">
            <Trash2 className="w-7 h-7 text-error" />
          </div>
          <h3 className="font-serif text-lg font-bold text-on-surface mb-1">Delete Violation?</h3>
          <p className="text-sm text-on-surface-variant">This violation record will be permanently removed.</p>
        </div>
        <div className="flex gap-3 p-5 border-t border-outline-variant/40">
          <button onClick={onClose} className="gs-btn gs-btn-ghost flex-1">Cancel</button>
          <button onClick={() => onConfirm(violationId)} disabled={submitting}
            className="gs-btn gs-btn-error flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
            {submitting && <div className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function AdminViolationsPage() {
  const [list, setList]           = useState([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("All")
  const [page, setPage]           = useState(1)
  const [sort, setSort]           = useState("createdAt")
  const [sortDir, setSortDir]     = useState("desc")
  const [showForm, setShowForm]   = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [viewItem, setViewItem]   = useState(null)
  const [deleteId, setDeleteId]   = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]  = useState("")
  const [actionLoading, setActionLoading] = useState(null)

  // ── Load (stable pattern) ──
  useEffect(() => {
    let active = true
    setLoading(true)
    setError("")
    getViolations({
      page,
      pageSize: PAGE_SIZE,
      search: searchQuery,
      status: activeTab === "All" ? "" : activeTab,
      sort,
      order: sortDir,
    })
      .then((res) => {
        if (!active) return
        const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []
        setList(data)
        setTotal(Array.isArray(res) ? res.length : (res?.total ?? data.length))
      })
      .catch((err) => {
        if (!active) return
        setError(err?.message || "Failed to load violations.")
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, searchQuery, activeTab, sort, sortDir])

  // ── Sort ──
  const handleSort = (col) => {
    if (sort === col) setSortDir((d) => d === "asc" ? "desc" : "asc")
    else { setSort(col); setSortDir("asc") }
  }

  const SortIcon = ({ col }) =>
    sort !== col ? <ChevronLeft size={10} className="opacity-25" />
    : sortDir === "asc" ? <ArrowUp size={10} className="text-error" />
    : <ArrowDown size={10} className="text-error" />

  // ── Handlers ──
  const handleEdit = (item) => { setEditingItem(item); setFormError(""); setShowForm(true) }

  const handleDeleteConfirm = (id) => {
    setActionLoading(id + "_delete")
    deleteViolation(id)
      .then(() => { setDeleteId(null); setViewItem(null) })
      .catch((err) => setError(err?.message || "Failed to delete violation."))
      .finally(() => setActionLoading(null))
  }

  const handleFormSubmit = (formData) => {
    setSubmitting(true)
    setFormError("")
    const op = editingItem ? updateViolation(editingItem.violationId, formData) : createViolation(formData)
    op
      .then(() => { setShowForm(false); setEditingItem(null) })
      .catch((err) => setFormError(err?.message || "Failed to save violation."))
      .finally(() => setSubmitting(false))
  }

  const activeCount   = list.filter((v) => v.status === "ACTIVE").length
  const appealedCount = list.filter((v) => v.status === "APPEALED").length
  const servedCount   = list.filter((v) => v.status === "SERVED").length
  const expiredCount  = list.filter((v) => v.status === "EXPIRED").length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div className="animate-fade-in-up" style={{ opacity: 0, animationFillMode: "forwards" }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-error/10 border border-error/20 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-error" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-on-surface">Violation Management</h1>
              <p className="text-on-surface-variant text-sm">Track, enforce, and manage rule violations, suspensions, and sanctions.</p>
            </div>
          </div>
          <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-error to-amber-500 mt-3" />
        </div>
        <button onClick={() => { setEditingItem(null); setFormError(""); setShowForm(true) }}
          className="gs-btn gs-btn-error flex items-center gap-2 shrink-0">
          <Plus className="w-4 h-4" />Record Violation
        </button>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        {[
          { label: "Total",    value: total,          color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
          { label: "Active",   value: activeCount,    color: "text-red-400",    bg: "bg-red-500/10",     border: "border-red-500/20" },
          { label: "Appealed", value: appealedCount,  color: "text-yellow-400", bg: "bg-yellow-500/10",  border: "border-yellow-500/20" },
          { label: "Served",   value: servedCount,   color: "text-emerald-400",bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
          { label: "Expired",  value: expiredCount,   color: "text-gray-400",  bg: "bg-gray-500/10",   border: "border-gray-500/20" },
        ].map((s, i) => (
          <div key={s.label} className={`gs-card p-4 flex items-center gap-3 animate-fade-in-up delay-row-${i + 1}`}
            style={{ opacity: 0, animationFillMode: "forwards" }}>
            <div className={`w-9 h-9 rounded-lg ${s.bg} border ${s.border} flex items-center justify-center shrink-0 ${s.color}`}>
              <ShieldAlert size={16} />
            </div>
            <div>
              <p className="text-xl font-bold text-on-surface font-mono">{s.value}</p>
              <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Global Error ── */}
      {error ? (
        <div className="mb-5 p-4 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
          <button onClick={() => setError("")} className="ml-auto text-error/60 hover:text-error"><X className="w-4 h-4" /></button>
        </div>
      ) : null}

      {/* ── Table Card ── */}
      <div className="gs-card overflow-hidden">
        <div className="flex items-center justify-between px-5 border-b border-outline-variant/40 flex-wrap gap-2">
          <div className="flex flex-wrap">
            {STATUS_TABS.map((tab) => (
              <button key={tab} onClick={() => { setActiveTab(tab); setPage(1) }}
                className={`px-4 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab ? "text-error border-error" : "text-on-surface-variant border-transparent hover:text-on-surface"
                }`}>
                {tab === "All" ? "All Violations" : tab}
              </button>
            ))}
          </div>
          <div className="relative py-3">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
            <input type="text" placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
              className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg pl-9 pr-4 py-2 text-sm text-on-surface focus:outline-none focus:border-error transition-all placeholder:text-on-surface-variant/40 w-52"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-error/30 border-t-error rounded-full animate-spin" />
              <span className="text-on-surface-variant text-sm">Loading violations...</span>
            </div>
          </div>
        ) : list.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
              <ShieldAlert className="w-7 h-7 text-on-surface-variant/40" />
            </div>
            <p className="text-on-surface font-semibold mb-1">{searchQuery ? "No results found" : "No violations recorded"}</p>
            <p className="text-on-surface-variant text-sm">{searchQuery ? "Try a different search term." : 'Click "Record Violation" to add one.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th><button onClick={() => handleSort("violatorName")} className="flex items-center gap-1">Violator <SortIcon col="violatorName" /></button></th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Fine</th>
                  <th>Suspension</th>
                  <th><button onClick={() => handleSort("createdAt")} className="flex items-center gap-1">Date <SortIcon col="createdAt" /></button></th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((v, i) => (
                  <tr key={v.violationId} className={`animate-fade-in-up delay-row-${(i % 4) + 1}`}
                    style={{ opacity: 0, animationFillMode: "forwards" }}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-error/10 border border-error/20 flex items-center justify-center shrink-0">
                          <ShieldAlert className="w-4 h-4 text-error" />
                        </div>
                        <div>
                          <p className="font-semibold text-on-surface text-sm leading-snug">{v.violatorName}</p>
                          {v.description && <p className="text-[11px] text-on-surface-variant mt-0.5 max-w-[180px] truncate">{v.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="text-xs text-on-surface-variant">
                      {TYPE_OPTIONS.find((t) => t.value === v.violationType)?.label || v.violationType || "—"}
                    </td>
                    <td><span className={getSeverityBadge(v.severity)}>{v.severity || "—"}</span></td>
                    <td className="text-xs text-on-surface-variant font-mono">
                      {v.fineAmount != null ? `$${Number(v.fineAmount).toLocaleString()}` : "—"}
                    </td>
                    <td className="text-xs text-on-surface-variant">{v.suspensionDays ? `${v.suspensionDays} days` : "—"}</td>
                    <td className="text-xs text-on-surface-variant font-mono">{fmtDate(v.createdAt)}</td>
                    <td><span className={getStatusBadge(v.status)}>{v.status}</span></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setViewItem(v)} title="View details" className="gs-btn gs-btn-ghost gs-btn-sm">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleEdit(v)} title="Edit" className="gs-btn gs-btn-ghost gs-btn-sm">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteId(v.violationId)} title="Delete"
                          className="gs-btn gs-btn-ghost gs-btn-sm text-error hover:bg-error/10">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant/40">
            <span className="text-xs text-on-surface-variant">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="gs-btn gs-btn-ghost gs-btn-sm px-2">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`gs-btn gs-btn-sm min-w-[32px] justify-center ${page === p ? "gs-btn-error" : "gs-btn-ghost"}`}>{p}</button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="gs-btn gs-btn-ghost gs-btn-sm px-2">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showForm && <ViolationFormModal violation={editingItem} onClose={() => { setShowForm(false); setEditingItem(null) }}
        onSubmit={handleFormSubmit} submitting={submitting} error={formError} />}
      {viewItem && <ViolationDetailModal item={viewItem} onClose={() => setViewItem(null)} onEdit={handleEdit}
        onDelete={(id) => { setViewItem(null); setDeleteId(id) }} actionLoading={actionLoading} />}
      {deleteId && <DeleteModal violationId={deleteId} onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm} submitting={!!actionLoading} />}
    </div>
  )
}
