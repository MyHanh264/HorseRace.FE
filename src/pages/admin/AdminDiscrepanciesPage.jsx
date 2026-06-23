import { useState, useEffect } from "react"
import {
  AlertTriangle,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  ArrowUp,
} from "lucide-react"
import {
  getDiscrepancies,
  resolveDiscrepancy,
  deleteDiscrepancy,
} from "../../api/admin"

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(date) {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function getStatusBadge(status) {
  switch (status) {
    case "PENDING":   return "gs-badge gs-badge-warning"
    case "RESOLVED":  return "gs-badge gs-badge-success"
    case "DISMISSED": return "gs-badge gs-badge-error"
    default:          return "gs-badge gs-badge-neutral"
  }
}

function getPriorityBadge(p) {
  switch (p) {
    case "LOW":    return "gs-badge gs-badge-neutral"
    case "MEDIUM": return "gs-badge gs-badge-secondary"
    case "HIGH":   return "gs-badge gs-badge-error"
    default:       return "gs-badge gs-badge-neutral"
  }
}

const TYPE_LABELS = {
  SCORE_DISPUTE:    "Score Dispute",
  VIOLATION:        "Violation",
  POINT_ADJUSTMENT: "Point Adjustment",
  RACE_RESULT:      "Race Result",
  JOCKEY_COMPLAINT: "Jockey Complaint",
  BETTING_DISPUTE:  "Betting Dispute",
  OTHER:            "Other",
}

const TABS = ["All", "PENDING", "RESOLVED", "DISMISSED"]
const PAGE_SIZE = 10

// ─── View Modal ──────────────────────────────────────────────────────────

function DiscrepancyModal({ item, onClose, onResolve, onDelete, actionLoading }) {
  if (!item) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div className="gs-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-secondary" />
            </div>
            <h2 className="font-serif font-bold text-on-surface">Discrepancy Details</h2>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-on-surface text-lg leading-snug flex-1 pr-4">
              {item.title}
            </h3>
            <div className="flex items-center gap-2 shrink-0">
              <span className={getPriorityBadge(item.priority)}>{item.priority}</span>
              <span className={getStatusBadge(item.status)}>{item.status}</span>
            </div>
          </div>

          {item.description && (
            <div className="bg-surface-container-low rounded-xl p-4">
              <p className="text-xs text-on-surface-variant mb-1.5 font-semibold uppercase tracking-wider">Description</p>
              <p className="text-sm text-on-surface">{item.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Type",    value: TYPE_LABELS[item.type] || item.type },
              { label: "Reporter", value: item.reporterName || item.reporterId || "—" },
              { label: "Subject",  value: item.subjectName || item.subjectId || "—" },
              { label: "Created",  value: formatDate(item.createdAt) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surface-container-low rounded-xl p-3">
                <p className="text-xs text-on-surface-variant mb-1">{label}</p>
                <p className="text-sm font-semibold text-on-surface">{value || "—"}</p>
              </div>
            ))}
          </div>

          {item.resolutionNotes && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
              <p className="text-xs text-emerald-400 mb-1.5 font-semibold uppercase tracking-wider">Resolution</p>
              <p className="text-sm text-emerald-300 font-semibold">{item.resolution}</p>
              <p className="text-xs text-emerald-300/70 mt-1">{item.resolutionNotes}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant/40">
          {item.status === "PENDING" && (
            <>
              <button
                onClick={() => onResolve(item.discrepancyId, "RESOLVED")}
                disabled={actionLoading === item.discrepancyId + "_resolve"}
                className="gs-btn gs-btn-success flex items-center gap-2 disabled:opacity-50"
              >
                {actionLoading === item.discrepancyId + "_resolve" ? (
                  <div className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Resolve
              </button>
              <button
                onClick={() => onResolve(item.discrepancyId, "DISMISSED")}
                disabled={actionLoading === item.discrepancyId + "_dismiss"}
                className="gs-btn gs-btn-error flex items-center gap-2 disabled:opacity-50"
              >
                {actionLoading === item.discrepancyId + "_dismiss" ? (
                  <div className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Dismiss
              </button>
            </>
          )}
          {item.status === "RESOLVED" && (
            <button
              onClick={() => onDelete(item.discrepancyId)}
              disabled={actionLoading === item.discrepancyId + "_delete"}
              className="gs-btn gs-btn-error flex items-center gap-2 disabled:opacity-50"
            >
              {actionLoading === item.discrepancyId + "_delete" ? (
                <div className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete Record
            </button>
          )}
          <button onClick={onClose} className="gs-btn gs-btn-ghost">Close</button>
        </div>
      </div>
    </div>
  )
}

// ─── Resolve Confirm Modal ─────────────────────────────────────────────────

function ResolveModal({ discrepancyId, resolution, onClose, onConfirm, submitting }) {
  const [notes, setNotes] = useState("")
  const isDismiss = resolution === "DISMISSED"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div className="gs-card w-full max-w-sm">
        <div className="p-6 text-center">
          <div
            className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center ${
              isDismiss ? "bg-error/10 border border-error/20" : "bg-emerald-500/10 border border-emerald-500/20"
            }`}
          >
            {isDismiss ? <XCircle className="w-7 h-7 text-error" /> : <CheckCircle className="w-7 h-7 text-emerald-400" />}
          </div>
          <h3 className="font-serif text-lg font-bold text-on-surface mb-1">
            {isDismiss ? "Dismiss Discrepancy?" : "Resolve Discrepancy?"}
          </h3>
          <p className="text-sm text-on-surface-variant">
            {isDismiss ? "This discrepancy will be marked as dismissed." : "This discrepancy will be marked as resolved."}
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes (optional)..."
            rows={3}
            className="w-full mt-4 bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40 resize-none"
          />
        </div>
        <div className="flex gap-3 p-5 border-t border-outline-variant/40">
          <button onClick={onClose} className="gs-btn gs-btn-ghost flex-1">Cancel</button>
          <button
            onClick={() => onConfirm(discrepancyId, resolution, notes)}
            disabled={submitting}
            className={`gs-btn flex-1 flex items-center justify-center gap-2 disabled:opacity-50 ${isDismiss ? "gs-btn-error" : "gs-btn-success"}`}
          >
            {submitting && <div className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────

function DeleteModal({ discrepancyId, onClose, onConfirm, submitting }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div className="gs-card w-full max-w-sm">
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-error/10 border border-error/20 mx-auto mb-4 flex items-center justify-center">
            <Trash2 className="w-7 h-7 text-error" />
          </div>
          <h3 className="font-serif text-lg font-bold text-on-surface mb-1">Delete Discrepancy?</h3>
          <p className="text-sm text-on-surface-variant">This action cannot be undone. The record will be permanently removed.</p>
        </div>
        <div className="flex gap-3 p-5 border-t border-outline-variant/40">
          <button onClick={onClose} className="gs-btn gs-btn-ghost flex-1">Cancel</button>
          <button
            onClick={() => onConfirm(discrepancyId)}
            disabled={submitting}
            className="gs-btn gs-btn-error flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting && <div className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function AdminDiscrepanciesPage() {
  const [list, setList]           = useState([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("All")
  const [page, setPage]           = useState(1)
  const [sort, setSort]           = useState("createdAt")
  const [sortDir, setSortDir]     = useState("desc")
  const [viewItem, setViewItem]   = useState(null)
  const [resolveData, setResolveData] = useState(null)
  const [deleteId, setDeleteId]   = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  // ── Load (stable pattern) ──
  useEffect(() => {
    let active = true
    setLoading(true)
    setError("")
    getDiscrepancies({
      page,
      pageSize: PAGE_SIZE,
      search: searchQuery,
      status: activeTab === "All" ? "" : activeTab,
      sort,
      order: sortDir,
    })
      .then((res) => {
        if (!active) return
        // Support both { data: [...], total: N } and flat [...arrays]
        const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []
        const totalCount = Array.isArray(res)
          ? res.total ?? data.length
          : (res?.total ?? (total > 0 ? total : data.length))
        setList(data)
        setTotal(totalCount)
      })
      .catch((err) => {
        if (!active) return
        setError(err?.message || "Failed to load discrepancies.")
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
    : sortDir === "asc" ? <ArrowUp size={10} className="text-secondary" />
    : <ArrowDown size={10} className="text-secondary" />

  // ── Handlers ──
  const handleResolveConfirm = (id, resolution, notes) => {
    setActionLoading(id + "_" + resolution.toLowerCase())
    resolveDiscrepancy(id, { resolution, notes })
      .then(() => { setResolveData(null); setViewItem(null); })
      .catch((err) => setError(err?.message || "Failed to resolve discrepancy."))
      .finally(() => setActionLoading(null))
  }

  const handleDeleteConfirm = (id) => {
    setActionLoading(id + "_delete")
    deleteDiscrepancy(id)
      .then(() => { setDeleteId(null); setViewItem(null); })
      .catch((err) => setError(err?.message || "Failed to delete discrepancy."))
      .finally(() => setActionLoading(null))
  }

  const pending   = list.filter((d) => d.status === "PENDING").length
  const resolved  = list.filter((d) => d.status === "RESOLVED").length
  const dismissed = list.filter((d) => d.status === "DISMISSED").length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const pageNumbers = []
  const maxVisible = 5
  let start = Math.max(1, Math.min(page - Math.floor(maxVisible / 2), totalPages - maxVisible + 1))
  for (let i = 0; i < Math.min(maxVisible, totalPages); i++) {
    pageNumbers.push(start + i)
  }

  return (
    <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8">

      {/* ── Page Header ── */}
      <div className="mb-8">
        <div className="animate-fade-in-up" style={{ opacity: 0, animationFillMode: "forwards" }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-on-surface">Discrepancy Resolution</h1>
              <p className="text-on-surface-variant text-sm">Review, resolve, and manage disputes, score conflicts, and complaints.</p>
            </div>
          </div>
          <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-secondary to-primary mt-3" />
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total",     value: total,     color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
          { label: "Pending",   value: pending,    color: "text-yellow-400",   bg: "bg-yellow-500/10",   border: "border-yellow-500/20" },
          { label: "Resolved",  value: resolved,   color: "text-emerald-400",  bg: "bg-emerald-500/10",   border: "border-emerald-500/20" },
          { label: "Dismissed", value: dismissed,  color: "text-red-400",     bg: "bg-red-500/10",      border: "border-red-500/20" },
        ].map((s, i) => (
          <div key={s.label} className={`gs-card p-4 flex items-center gap-3 animate-fade-in-up delay-row-${i + 1}`} style={{ opacity: 0, animationFillMode: "forwards" }}>
            <div className={`w-9 h-9 rounded-lg ${s.bg} border ${s.border} flex items-center justify-center shrink-0 ${s.color}`}>
              <AlertTriangle size={16} />
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
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError("")} className="ml-auto text-error/60 hover:text-error"><X className="w-4 h-4" /></button>
        </div>
      ) : null}

      {/* ── Table Card ── */}
      <div className="gs-card overflow-hidden">

        {/* Tabs + Search */}
        <div className="flex items-center justify-between px-5 border-b border-outline-variant/40 flex-wrap gap-2">
          <div className="flex">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setPage(1) }}
                className={`px-4 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab ? "text-secondary border-secondary" : "text-on-surface-variant border-transparent hover:text-on-surface"
                }`}
              >
                {tab === "All" ? "All Discrepancies" : tab}
              </button>
            ))}
          </div>
          <div className="relative py-3">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
            <input
              type="text" placeholder="Search by title..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
              className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg pl-9 pr-4 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40 w-52"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
              <span className="text-on-surface-variant text-sm">Loading discrepancies...</span>
            </div>
          </div>
        ) : list.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-on-surface-variant/40" />
            </div>
            <p className="text-on-surface font-semibold mb-1">{searchQuery ? "No results found" : "No discrepancies yet"}</p>
            <p className="text-on-surface-variant text-sm">
              {searchQuery ? "Try a different search term." : "All disputes and complaints will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th><button onClick={() => handleSort("title")} className="flex items-center gap-1">Title <SortIcon col="title" /></button></th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Reporter</th>
                  <th><button onClick={() => handleSort("createdAt")} className="flex items-center gap-1">Reported <SortIcon col="createdAt" /></button></th>
                  <th><button onClick={() => handleSort("status")} className="flex items-center gap-1">Status <SortIcon col="status" /></button></th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((d, i) => (
                  <tr key={d.discrepancyId} className={`animate-fade-in-up delay-row-${(i % 4) + 1}`} style={{ opacity: 0, animationFillMode: "forwards" }}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-4 h-4 text-secondary" />
                        </div>
                        <div>
                          <p className="font-semibold text-on-surface text-sm leading-snug max-w-[200px] truncate">{d.title}</p>
                          {d.description && <p className="text-[11px] text-on-surface-variant mt-0.5 max-w-[200px] truncate">{d.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="text-xs text-on-surface-variant">{TYPE_LABELS[d.type] || d.type || "—"}</td>
                    <td><span className={getPriorityBadge(d.priority)}>{d.priority || "—"}</span></td>
                    <td className="text-xs text-on-surface-variant">{d.reporterName || d.reporterId || "—"}</td>
                    <td className="text-xs text-on-surface-variant font-mono">{formatDate(d.createdAt)}</td>
                    <td><span className={getStatusBadge(d.status)}>{d.status}</span></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setViewItem(d)} title="View details" className="gs-btn gs-btn-ghost gs-btn-sm">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {d.status === "PENDING" && (
                          <>
                            <button onClick={() => setResolveData({ id: d.discrepancyId, resolution: "RESOLVED" })} title="Resolve" className="gs-btn gs-btn-success gs-btn-sm">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setResolveData({ id: d.discrepancyId, resolution: "DISMISSED" })} title="Dismiss" className="gs-btn gs-btn-error gs-btn-sm">
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {d.status === "RESOLVED" && (
                          <button onClick={() => setDeleteId(d.discrepancyId)} title="Delete" className="gs-btn gs-btn-ghost gs-btn-sm text-error hover:bg-error/10">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant/40">
            <span className="text-xs text-on-surface-variant">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="gs-btn gs-btn-ghost gs-btn-sm px-2">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {pageNumbers.map((p) => (
                <button key={p} onClick={() => setPage(p)} className={`gs-btn gs-btn-sm min-w-[32px] justify-center ${page === p ? "gs-btn-secondary" : "gs-btn-ghost"}`}>{p}</button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="gs-btn gs-btn-ghost gs-btn-sm px-2">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {viewItem && <DiscrepancyModal item={viewItem} onClose={() => setViewItem(null)} onResolve={(id, res) => setResolveData({ id, resolution: res })} onDelete={(id) => setDeleteId(id)} actionLoading={actionLoading} />}
      {resolveData && <ResolveModal discrepancyId={resolveData.id} resolution={resolveData.resolution} onClose={() => setResolveData(null)} onConfirm={handleResolveConfirm} submitting={!!actionLoading} />}
      {deleteId && <DeleteModal discrepancyId={deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDeleteConfirm} submitting={!!actionLoading} />}
    </div>
  )
}
