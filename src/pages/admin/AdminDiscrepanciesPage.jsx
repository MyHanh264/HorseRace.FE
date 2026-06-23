import { useEffect, useState, useCallback } from "react"
import {
  getAllDiscrepancies,
  resolveDiscrepancy,
  deleteDiscrepancy,
} from "../../api/admin"
import {
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle,
  XCircle,
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
  MessageSquare,
} from "lucide-react"

function formatDate(value) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  })
}

function getStatusBadge(status) {
  switch (status) {
    case "RESOLVED": return "gs-badge gs-badge-success"
    case "PENDING":  return "gs-badge gs-badge-warning"
    case "DISMISSED": return "gs-badge gs-badge-error"
    default: return "gs-badge gs-badge-neutral"
  }
}

function getPriorityBadge(p) {
  switch (p) {
    case "HIGH":   return "gs-badge gs-badge-error"
    case "MEDIUM": return "gs-badge gs-badge-warning"
    case "LOW":    return "gs-badge gs-badge-neutral"
    default: return "gs-badge gs-badge-neutral"
  }
}

const TYPE_LABELS = {
  SCORE_DISPUTE: "Score Dispute",
  RACE_RESULT: "Race Result",
  JOCKEY_COMPLAINT: "Jockey Complaint",
  BETTING_DISPUTE: "Betting Dispute",
  OTHER: "Other",
}

export default function AdminDiscrepanciesPage() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("createdAt")
  const [sortDir, setSortDir] = useState("desc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [tab, setTab] = useState("All")

  const [viewItem, setViewItem] = useState(null)
  const [resolvingId, setResolvingId] = useState(null)
  const [resolveData, setResolveData] = useState({ resolution: "", notes: "" })
  const [deletingId, setDeletingId] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await getAllDiscrepancies({ page, pageSize, search, sort, sortDirection: sortDir })
      let data = res.data || res || []
      if (tab !== "All") data = data.filter(d => d.status === tab)
      setList(data)
      setTotal(res.total || data.length)
      setTotalPages(res.totalPages || 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load discrepancies.")
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, sort, sortDir, tab])

  useEffect(() => { load() }, [load])

  const handleSort = (col) => {
    if (sort === col) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSort(col); setSortDir("asc") }
  }

  const handleResolve = async () => {
    if (!resolvingId) return
    setActionLoading(resolvingId)
    try {
      await resolveDiscrepancy(resolvingId, resolveData)
      setResolvingId(null)
      setResolveData({ resolution: "", notes: "" })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resolve.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id) => {
    setActionLoading(id)
    try {
      await deleteDiscrepancy(id)
      setDeletingId(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete.")
    } finally {
      setActionLoading(null)
    }
  }

  const SortIcon = ({ col }) => (
    sort !== col
      ? <ChevronUp size={12} className="opacity-20" />
      : sortDir === "asc"
        ? <ChevronUp size={12} className="text-primary" />
        : <ChevronDown size={12} className="text-primary" />
  )

  const stats = {
    total: list.length,
    pending: list.filter(d => d.status === "PENDING").length,
    resolved: list.filter(d => d.status === "RESOLVED").length,
    dismissed: list.filter(d => d.status === "DISMISSED").length,
  }

  return (
    <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8">
      {/* HEADER */}
      <div className="mb-8 animate-fade-in-up" style={{ opacity: 0, animationFillMode: "forwards" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-on-surface">Discrepancy Resolution</h1>
            <p className="text-on-surface-variant text-sm">Review and resolve disputes, score conflicts, and race result complaints.</p>
          </div>
        </div>
        <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-primary to-secondary mt-4" />
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total", value: stats.total, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
          { label: "Pending", value: stats.pending, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
          { label: "Resolved", value: stats.resolved, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
          { label: "Dismissed", value: stats.dismissed, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
        ].map((s, i) => (
          <div key={s.label} className={`gs-card p-5 flex items-center gap-4 animate-fade-in-up delay-row-${i + 1}`} style={{ opacity: 0, animationFillMode: "forwards" }}>
            <div className={`w-10 h-10 rounded-lg ${s.bg} border ${s.border} flex items-center justify-center shrink-0 ${s.color}`}>
              <AlertTriangle size={16} />
            </div>
            <div>
              <p className="text-2xl font-bold text-on-surface font-mono">{s.value}</p>
              <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-5 p-4 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-3">
          <X className="w-4 h-4 shrink-0" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
          <input
            type="text" placeholder="Search by title, reporter..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full bg-surface-container-lowest border border-outline-variant/40 text-sm rounded-xl pl-11 pr-4 py-3 text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
          />
        </div>
        <div className="flex gap-1 bg-surface-container-low rounded-xl p-1">
          {["All", "PENDING", "RESOLVED", "DISMISSED"].map(t => (
            <button key={t} onClick={() => { setTab(t); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t ? "bg-secondary text-on-secondary" : "text-on-surface-variant hover:bg-surface-container-high"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="admin-table-wrap">
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
            {loading ? (
              <tr><td colSpan={7} className="text-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-on-surface-variant text-sm">Loading...</span>
                </div>
              </td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={7}>
                <div className="gs-card p-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
                    <CheckCircle size={28} className="text-on-surface-variant/40" />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-on-surface mb-2">No discrepancies found</h3>
                  <p className="text-on-surface-variant text-sm">{search ? "Try a different keyword." : "No disputes have been filed."}</p>
                </div>
              </td></tr>
            ) : (
              list.map((d, i) => (
                <tr key={d.discrepancyId || i} className={`animate-fade-in-up delay-row-${(i % 4) + 1}`} style={{ opacity: 0, animationFillMode: "forwards" }}>
                  <td>
                    <p className="font-semibold text-on-surface">{d.title}</p>
                    {d.description && <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1">{d.description}</p>}
                  </td>
                  <td className="text-xs text-on-surface-variant">{TYPE_LABELS[d.type] || d.type || "—"}</td>
                  <td><span className={getPriorityBadge(d.priority)}>{d.priority || "—"}</span></td>
                  <td className="text-on-surface-variant text-xs">{d.reporterName || d.reporterId || "—"}</td>
                  <td className="text-on-surface-variant font-mono text-xs">{formatDate(d.createdAt)}</td>
                  <td><span className={getStatusBadge(d.status)}>{d.status}</span></td>
                  <td>
                    <div className="flex gap-1.5">
                      <button onClick={() => setViewItem(d)} title="View" className="gs-btn gs-btn-ghost gs-btn-sm"><Eye size={13} /></button>
                      {d.status === "PENDING" && (
                        <>
                          <button onClick={() => { setResolvingId(d.discrepancyId); setResolveData({ resolution: "RESOLVED", notes: "" }) }} title="Resolve" className="gs-btn gs-btn-success gs-btn-sm"><CheckCircle size={13} /></button>
                          <button onClick={() => { setResolvingId(d.discrepancyId); setResolveData({ resolution: "DISMISSED", notes: "" }) }} title="Dismiss" className="gs-btn gs-btn-danger gs-btn-sm"><XCircle size={13} /></button>
                        </>
                      )}
                      {d.status === "RESOLVED" && (
                        <button onClick={() => setDeletingId(d.discrepancyId)} title="Delete" className="gs-btn gs-btn-ghost gs-btn-sm text-error hover:bg-error/10"><Trash2 size={13} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {!loading && list.length > 0 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span>Rows per page:</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-2 py-1 text-xs text-on-surface focus:outline-none">
              {[5, 10, 20, 50].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-on-surface-variant font-mono">
              {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
            </span>
            <button onClick={() => setPage(p => p - 1)} disabled={page <= 1} className="gs-btn gs-btn-ghost gs-btn-sm"><ChevronLeft size={14} /></button>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="gs-btn gs-btn-ghost gs-btn-sm"><ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/40 w-full max-w-lg animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
            <div className="flex items-center justify-between p-5 border-b border-outline-variant/30">
              <h2 className="font-serif text-lg font-bold text-on-surface">Discrepancy Details</h2>
              <button onClick={() => setViewItem(null)} className="gs-btn gs-btn-ghost gs-btn-sm"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-on-surface">{viewItem.title}</h3>
                <div className="flex gap-2">
                  <span className={getPriorityBadge(viewItem.priority)}>{viewItem.priority}</span>
                  <span className={getStatusBadge(viewItem.status)}>{viewItem.status}</span>
                </div>
              </div>
              {viewItem.description && (
                <div className="bg-surface-container-low rounded-xl p-4">
                  <p className="text-xs text-on-surface-variant mb-1.5 flex items-center gap-1"><MessageSquare size={11} /> Description</p>
                  <p className="text-sm text-on-surface">{viewItem.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Type", value: TYPE_LABELS[viewItem.type] || viewItem.type },
                  { label: "Reporter", value: viewItem.reporterName || viewItem.reporterId || "—" },
                  { label: "Subject", value: viewItem.subjectName || viewItem.subjectId || "—" },
                  { label: "Reported At", value: formatDate(viewItem.createdAt) },
                ].map(f => (
                  <div key={f.label} className="bg-surface-container-low rounded-xl p-3">
                    <p className="text-xs text-on-surface-variant mb-1">{f.label}</p>
                    <p className="text-sm font-semibold text-on-surface">{f.value}</p>
                  </div>
                ))}
              </div>
              {viewItem.resolution && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-xs text-emerald-400 mb-1.5 flex items-center gap-1"><CheckCircle size={11} /> Resolution</p>
                  <p className="text-sm font-semibold text-emerald-300">{viewItem.resolution}</p>
                  {viewItem.notes && <p className="text-xs text-emerald-300/70 mt-1">{viewItem.notes}</p>}
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-outline-variant/30">
              {viewItem.status === "PENDING" && (
                <>
                  <button onClick={() => { setResolvingId(viewItem.discrepancyId); setResolveData({ resolution: "RESOLVED", notes: "" }); setViewItem(null) }}
                    className="gs-btn gs-btn-success flex-1 flex items-center justify-center gap-2"><CheckCircle size={14} /> Resolve</button>
                  <button onClick={() => { setResolvingId(viewItem.discrepancyId); setResolveData({ resolution: "DISMISSED", notes: "" }); setViewItem(null) }}
                    className="gs-btn gs-btn-danger flex-1 flex items-center justify-center gap-2"><XCircle size={14} /> Dismiss</button>
                </>
              )}
              <button onClick={() => setViewItem(null)} className="gs-btn gs-btn-ghost flex-1">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* RESOLVE MODAL */}
      {resolvingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/40 w-full max-w-sm animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
            <div className="p-6 text-center">
              <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center ${resolveData.resolution === "RESOLVED" ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                {resolveData.resolution === "RESOLVED"
                  ? <CheckCircle size={24} className="text-emerald-400" />
                  : <XCircle size={24} className="text-red-400" />}
              </div>
              <h3 className="font-serif text-lg font-bold text-on-surface mb-2">
                {resolveData.resolution === "RESOLVED" ? "Resolve Discrepancy" : "Dismiss Discrepancy"}
              </h3>
              <textarea value={resolveData.notes} onChange={e => setResolveData(p => ({ ...p, notes: e.target.value }))}
                placeholder="Add notes or reason..." rows={3}
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40 resize-none mt-3" />
            </div>
            <div className="flex gap-3 p-5 border-t border-outline-variant/30">
              <button onClick={() => { setResolvingId(null); setResolveData({ resolution: "", notes: "" }) }} className="gs-btn gs-btn-ghost flex-1">Cancel</button>
              <button onClick={handleResolve} disabled={actionLoading === resolvingId}
                className={`gs-btn flex-1 flex items-center justify-center gap-2 disabled:opacity-50 ${resolveData.resolution === "RESOLVED" ? "gs-btn-success" : "gs-btn-danger"}`}>
                {actionLoading === resolvingId ? <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" /> : null}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/40 w-full max-w-sm animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-error/10 border border-error/20 mx-auto mb-4 flex items-center justify-center"><Trash2 size={24} className="text-error" /></div>
              <h3 className="font-serif text-lg font-bold text-on-surface mb-2">Delete Discrepancy</h3>
              <p className="text-sm text-on-surface-variant">This will permanently delete this record.</p>
            </div>
            <div className="flex gap-3 p-5 border-t border-outline-variant/30">
              <button onClick={() => setDeletingId(null)} className="gs-btn gs-btn-ghost flex-1">Cancel</button>
              <button onClick={() => handleDelete(deletingId)} disabled={actionLoading === deletingId}
                className="gs-btn gs-btn-danger flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                {actionLoading === deletingId ? <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
