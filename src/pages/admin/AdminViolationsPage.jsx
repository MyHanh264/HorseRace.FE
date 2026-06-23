import { useEffect, useState, useCallback } from "react"
import {
  getAllViolations,
  createViolation,
  updateViolation,
  deleteViolation,
} from "../../api/admin"
import {
  Shield, Search, Plus, ChevronLeft, ChevronRight,
  Eye, Edit, Trash2, X, ChevronUp, ChevronDown,
  AlertOctagon, User,
} from "lucide-react"

function formatDate(v) {
  if (!v) return "—"
  return new Date(v).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

function getSeverityBadge(s) {
  switch (s) {
    case "CRITICAL": case "HIGH": return "gs-badge gs-badge-error"
    case "MEDIUM": return "gs-badge gs-badge-warning"
    case "LOW": return "gs-badge gs-badge-neutral"
    default: return "gs-badge gs-badge-neutral"
  }
}

function getStatusBadge(s) {
  switch (s) {
    case "ACTIVE": return "gs-badge gs-badge-error"
    case "APPEALED": return "gs-badge gs-badge-warning"
    case "SERVED": case "EXPIRED": return "gs-badge gs-badge-success"
    default: return "gs-badge gs-badge-neutral"
  }
}

const VIOLATION_TYPES = ["DOPING", "UNSPORTSMANLIKE_CONDUCT", "RULE_VIOLATION", "BETTING_FRAUD", "HORSEMANSHIP_ABUSE", "DOCUMENT_FORGERY", "OTHER"]
const TYPE_LABELS = {
  DOPING: "Doping",
  UNSPORTSMANLIKE_CONDUCT: "Unsportsmanlike Conduct",
  RULE_VIOLATION: "Rule Violation",
  BETTING_FRAUD: "Betting Fraud",
  HORSEMANSHIP_ABUSE: "Horsemanship Abuse",
  DOCUMENT_FORGERY: "Document Forgery",
  OTHER: "Other",
}

const EMPTY_FORM = {
  violatorName: "", violatorType: "JOCKEY", violationType: "RULE_VIOLATION",
  description: "", severity: "MEDIUM", status: "ACTIVE", fineAmount: "", suspensionDays: "",
}

export default function AdminViolationsPage() {
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
  const [editItem, setEditItem] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await getAllViolations({ page, pageSize, search, sort, sortDirection: sortDir })
      let data = res.data || res || []
      if (tab !== "All") data = data.filter(v => v.status === tab)
      setList(data)
      setTotal(res.total || data.length)
      setTotalPages(res.totalPages || 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load violations.")
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, sort, sortDir, tab])

  useEffect(() => { load() }, [load])

  const handleSort = (col) => {
    if (sort === col) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSort(col); setSortDir("asc") }
  }

  const handleFormChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleCreate = async () => {
    setActionLoading("create")
    try {
      await createViolation({
        ...formData,
        fineAmount: formData.fineAmount ? Number(formData.fineAmount) : null,
        suspensionDays: formData.suspensionDays ? Number(formData.suspensionDays) : null,
      })
      setShowCreate(false)
      setFormData(EMPTY_FORM)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create.")
    } finally {
      setActionLoading(null)
    }
  }

  const openEdit = (v) => {
    setEditItem(v)
    setFormData({
      violatorName: v.violatorName || "",
      violatorType: v.violatorType || "JOCKEY",
      violationType: v.violationType || "RULE_VIOLATION",
      description: v.description || "",
      severity: v.severity || "MEDIUM",
      status: v.status || "ACTIVE",
      fineAmount: v.fineAmount || "",
      suspensionDays: v.suspensionDays || "",
    })
  }

  const handleUpdate = async () => {
    if (!editItem) return
    setActionLoading(editItem.violationId)
    try {
      await updateViolation(editItem.violationId, {
        ...formData,
        fineAmount: formData.fineAmount ? Number(formData.fineAmount) : null,
        suspensionDays: formData.suspensionDays ? Number(formData.suspensionDays) : null,
      })
      setEditItem(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id) => {
    setActionLoading(id)
    try { await deleteViolation(id); setDeletingId(null); await load() }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to delete.") }
    finally { setActionLoading(null) }
  }

  const SortIcon = ({ col }) => (
    sort !== col ? <ChevronUp size={12} className="opacity-20" />
    : sortDir === "asc" ? <ChevronUp size={12} className="text-primary" />
    : <ChevronDown size={12} className="text-primary" />
  )

  const stats = {
    total: list.length,
    active: list.filter(v => v.status === "ACTIVE").length,
    appealed: list.filter(v => v.status === "APPEALED").length,
    served: list.filter(v => ["EXPIRED", "SERVED"].includes(v.status)).length,
  }

  const closeModals = () => { setShowCreate(false); setEditItem(null) }

  return (
    <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8">
      {/* HEADER */}
      <div className="mb-8 animate-fade-in-up" style={{ opacity: 0, animationFillMode: "forwards" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-on-surface">Violation Management</h1>
            <p className="text-on-surface-variant text-sm">Track, issue, and manage rule violations and disciplinary actions.</p>
          </div>
        </div>
        <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-primary to-secondary mt-4" />
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total", value: stats.total, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
          { label: "Active", value: stats.active, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
          { label: "Appealed", value: stats.appealed, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
          { label: "Served", value: stats.served, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
        ].map((s, i) => (
          <div key={s.label} className={`gs-card p-5 flex items-center gap-4 animate-fade-in-up delay-row-${i + 1}`} style={{ opacity: 0, animationFillMode: "forwards" }}>
            <div className={`w-10 h-10 rounded-lg ${s.bg} border ${s.border} flex items-center justify-center shrink-0 ${s.color}`}>
              <Shield size={16} />
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
          <AlertOctagon className="w-4 h-4 shrink-0" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
          <input type="text" placeholder="Search by violator, type..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full bg-surface-container-lowest border border-outline-variant/40 text-sm rounded-xl pl-11 pr-4 py-3 text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40" />
        </div>
        <div className="flex gap-1 bg-surface-container-low rounded-xl p-1">
          {["All", "ACTIVE", "APPEALED", "SERVED", "EXPIRED"].map(t => (
            <button key={t} onClick={() => { setTab(t); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t ? "bg-secondary text-on-secondary" : "text-on-surface-variant hover:bg-surface-container-high"}`}>
              {t}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)} className="gs-btn gs-btn-primary flex items-center gap-2 shrink-0">
          <Plus size={15} /> Issue Violation
        </button>
      </div>

      {/* TABLE */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th><button onClick={() => handleSort("violatorName")} className="flex items-center gap-1">Violator <SortIcon col="violatorName" /></button></th>
              <th>Type</th>
              <th><button onClick={() => handleSort("severity")} className="flex items-center gap-1">Severity <SortIcon col="severity" /></button></th>
              <th><button onClick={() => handleSort("status")} className="flex items-center gap-1">Status <SortIcon col="status" /></button></th>
              <th>Fine</th>
              <th>Suspension</th>
              <th><button onClick={() => handleSort("createdAt")} className="flex items-center gap-1">Issued <SortIcon col="createdAt" /></button></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-on-surface-variant text-sm">Loading...</span>
                </div>
              </td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="gs-card p-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
                    <Shield size={28} className="text-on-surface-variant/40" />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-on-surface mb-2">No violations found</h3>
                  <p className="text-on-surface-variant text-sm">{search ? "Try a different keyword." : "No violations have been recorded."}</p>
                </div>
              </td></tr>
            ) : (
              list.map((v, i) => (
                <tr key={v.violationId || i} className={`animate-fade-in-up delay-row-${(i % 4) + 1}`} style={{ opacity: 0, animationFillMode: "forwards" }}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0">
                        <User size={14} className="text-on-surface-variant/50" />
                      </div>
                      <div>
                        <p className="font-semibold text-on-surface">{v.violatorName || "—"}</p>
                        <p className="text-xs text-on-surface-variant">{v.violatorType}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-xs text-on-surface-variant">{TYPE_LABELS[v.violationType] || v.violationType}</td>
                  <td><span className={getSeverityBadge(v.severity)}>{v.severity}</span></td>
                  <td><span className={getStatusBadge(v.status)}>{v.status}</span></td>
                  <td className="text-on-surface-variant text-xs">{v.fineAmount ? `$${v.fineAmount}` : "—"}</td>
                  <td className="text-on-surface-variant text-xs">{v.suspensionDays ? `${v.suspensionDays}d` : "—"}</td>
                  <td className="text-on-surface-variant font-mono text-xs">{formatDate(v.createdAt)}</td>
                  <td>
                    <div className="flex gap-1.5">
                      <button onClick={() => setViewItem(v)} className="gs-btn gs-btn-ghost gs-btn-sm"><Eye size={13} /></button>
                      <button onClick={() => openEdit(v)} className="gs-btn gs-btn-ghost gs-btn-sm"><Edit size={13} /></button>
                      <button onClick={() => setDeletingId(v.violationId)} className="gs-btn gs-btn-ghost gs-btn-sm text-error hover:bg-error/10"><Trash2 size={13} /></button>
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
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/40 w-full max-w-md animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
            <div className="flex items-center justify-between p-5 border-b border-outline-variant/30">
              <h2 className="font-serif text-lg font-bold text-on-surface">Violation Details</h2>
              <button onClick={() => setViewItem(null)} className="gs-btn gs-btn-ghost gs-btn-sm"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-on-surface">{TYPE_LABELS[viewItem.violationType] || viewItem.violationType}</h3>
                <div className="flex gap-2">
                  <span className={getSeverityBadge(viewItem.severity)}>{viewItem.severity}</span>
                  <span className={getStatusBadge(viewItem.status)}>{viewItem.status}</span>
                </div>
              </div>
              {viewItem.description && (
                <div className="bg-surface-container-low rounded-xl p-3">
                  <p className="text-xs text-on-surface-variant mb-1">Description</p>
                  <p className="text-sm text-on-surface">{viewItem.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Violator", value: viewItem.violatorName },
                  { label: "Violator Type", value: viewItem.violatorType },
                  { label: "Fine", value: viewItem.fineAmount ? `$${viewItem.fineAmount}` : "—" },
                  { label: "Suspension", value: viewItem.suspensionDays ? `${viewItem.suspensionDays} days` : "—" },
                  { label: "Issued", value: formatDate(viewItem.createdAt) },
                  { label: "Expiry", value: formatDate(viewItem.expiresAt) },
                ].map(f => (
                  <div key={f.label} className="bg-surface-container-low rounded-xl p-3">
                    <p className="text-xs text-on-surface-variant mb-1">{f.label}</p>
                    <p className="text-sm font-semibold text-on-surface">{f.value || "—"}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-outline-variant/30">
              <button onClick={() => { setViewItem(null); openEdit(viewItem) }} className="gs-btn gs-btn-primary flex-1 flex items-center justify-center gap-2"><Edit size={14} /> Edit</button>
              <button onClick={() => setViewItem(null)} className="gs-btn gs-btn-ghost flex-1">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {(showCreate || editItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/40 w-full max-w-md animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
            <div className="flex items-center justify-between p-5 border-b border-outline-variant/30">
              <h2 className="font-serif text-lg font-bold text-on-surface">{editItem ? "Edit Violation" : "Issue New Violation"}</h2>
              <button onClick={closeModals} className="gs-btn gs-btn-ghost gs-btn-sm"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Violator Name</label>
                  <input name="violatorName" value={formData.violatorName} onChange={handleFormChange} placeholder="Full name"
                    className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Violator Type</label>
                  <select name="violatorType" value={formData.violatorType} onChange={handleFormChange}
                    className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all">
                    {["JOCKEY", "HORSE_OWNER", "SPECTATOR", "REFEREE", "OTHER"].map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Violation Type</label>
                <select name="violationType" value={formData.violationType} onChange={handleFormChange}
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all">
                  {VIOLATION_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Severity</label>
                  <select name="severity" value={formData.severity} onChange={handleFormChange}
                    className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all">
                    {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Status</label>
                  <select name="status" value={formData.status} onChange={handleFormChange}
                    className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all">
                    {["ACTIVE", "APPEALED", "SERVED", "EXPIRED"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Fine ($)</label>
                  <input name="fineAmount" value={formData.fineAmount} onChange={handleFormChange} type="number" min="0" placeholder="e.g. 500"
                    className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Suspension (days)</label>
                  <input name="suspensionDays" value={formData.suspensionDays} onChange={handleFormChange} type="number" min="0" placeholder="e.g. 30"
                    className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Description</label>
                <textarea name="description" value={formData.description} onChange={handleFormChange} rows={3} placeholder="Describe the violation..."
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-outline-variant/30">
              <button onClick={closeModals} className="gs-btn gs-btn-ghost flex-1">Cancel</button>
              <button onClick={editItem ? handleUpdate : handleCreate}
                disabled={actionLoading === (editItem?.violationId || "create") || !formData.violatorName.trim()}
                className="gs-btn gs-btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                {actionLoading === (editItem?.violationId || "create") ? <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" /> : null}
                {editItem ? "Save Changes" : "Issue Violation"}
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
              <h3 className="font-serif text-lg font-bold text-on-surface mb-2">Delete Violation</h3>
              <p className="text-sm text-on-surface-variant">This action cannot be undone.</p>
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
