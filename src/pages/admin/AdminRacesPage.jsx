import { useEffect, useState, useCallback } from "react"
import {
  getAllRaces,
  getRaceById,
  approveRace,
  rejectRace,
  deleteRace,
  updateRace,
  createRace,
  startRace,
  finishRace,
} from "../../api/admin"
import {
  Flag,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  XCircle,
  Trash2,
  Eye,
  Edit,
  X,
  ChevronUp,
  ChevronDown,
  Play,
  Square,
  Calendar,
  Clock,
  Users,
  Trophy,
  MapPin,
} from "lucide-react"

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—"
}

function formatTime(value) {
  return value
    ? new Date(value).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : "—"
}

function getStatusBadgeClass(status) {
  switch (status) {
    case "FINISHED":
      return "gs-badge gs-badge-success"
    case "ONGOING":
      return "gs-badge gs-badge-warning"
    case "SCHEDULED":
      return "gs-badge gs-badge-neutral"
    case "REJECTED":
    case "CANCELLED":
      return "gs-badge gs-badge-error"
    default:
      return "gs-badge gs-badge-neutral"
  }
}

export default function AdminRacesPage() {
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("raceDate")
  const [sortDirection, setSortDirection] = useState("desc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [activeTab, setActiveTab] = useState("All")

  // Modals
  const [viewRace, setViewRace] = useState(null)
  const [editRace, setEditRace] = useState(null)
  const [createModal, setCreateModal] = useState(false)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectReason, setRejectReason] = useState("")
  const [deletingId, setDeletingId] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    raceDate: "",
    raceTime: "",
    trackName: "",
    distance: "",
    prizePool: "",
    tournamentId: "",
    status: "SCHEDULED",
    imageUrl: "",
  })

  useEffect(() => { loadRaces() }, [page, pageSize, search, sort, sortDirection, activeTab])

  const loadRaces = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getAllRaces({ page, pageSize, search, sort, sortDirection })
      let list = response.data || response || []
      if (activeTab !== "All") {
        list = list.filter((r) => r.status === activeTab)
      }
      setRaces(list)
      setTotal(response.total || list.length)
      setTotalPages(response.totalPages || 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load races.")
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, sort, sortDirection, activeTab])

  const handleSearch = useCallback((e) => { setSearch(e.target.value); setPage(1) }, [])
  const handleSort = useCallback((column) => {
    if (sort === column) setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
    else { setSort(column); setSortDirection("asc") }
  }, [sort])
  const handlePageChange = useCallback((p) => setPage(p), [])
  const handlePageSizeChange = useCallback((e) => { setPageSize(Number(e.target.value)); setPage(1) }, [])

  const handleApprove = useCallback(async (id) => {
    setActionLoading(id)
    try { await approveRace(id); await loadRaces() }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to approve race.") }
    finally { setActionLoading(null) }
  }, [loadRaces])

  const handleReject = useCallback(async (id) => {
    setActionLoading(id)
    try { await rejectRace(id, rejectReason.trim() || null); setRejectingId(null); setRejectReason(""); await loadRaces() }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to reject race.") }
    finally { setActionLoading(null) }
  }, [loadRaces, rejectReason])

  const handleDelete = useCallback(async (id) => {
    setActionLoading(id)
    try { await deleteRace(id); setDeletingId(null); await loadRaces() }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to delete race.") }
    finally { setActionLoading(null) }
  }, [loadRaces])

  const handleStart = useCallback(async (id) => {
    setActionLoading(id)
    try { await startRace(id); await loadRaces() }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to start race.") }
    finally { setActionLoading(null) }
  }, [loadRaces])

  const handleFinish = useCallback(async (id) => {
    setActionLoading(id)
    try { await finishRace(id); await loadRaces() }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to finish race.") }
    finally { setActionLoading(null) }
  }, [loadRaces])

  const openEditModal = useCallback((race) => {
    setEditRace(race)
    setFormData({
      name: race.name || "",
      raceDate: race.raceDate ? race.raceDate.slice(0, 10) : "",
      raceTime: race.raceTime || "",
      trackName: race.trackName || "",
      distance: race.distance || "",
      prizePool: race.prizePool || "",
      tournamentId: race.tournamentId || "",
      status: race.status || "SCHEDULED",
      imageUrl: race.imageUrl || "",
    })
  }, [])

  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleUpdateSubmit = useCallback(async () => {
    setActionLoading(editRace.raceId)
    try { await updateRace(editRace.raceId, formData); setEditRace(null); await loadRaces() }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to update race.") }
    finally { setActionLoading(null) }
  }, [editRace, formData, loadRaces])

  const handleCreateSubmit = useCallback(async () => {
    setActionLoading("create")
    try {
      await createRace(formData)
      setCreateModal(false)
      setFormData({ name: "", raceDate: "", raceTime: "", trackName: "", distance: "", prizePool: "", tournamentId: "", status: "SCHEDULED", imageUrl: "" })
      await loadRaces()
    }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to create race.") }
    finally { setActionLoading(null) }
  }, [formData, loadRaces])

  const openDeleteConfirm = useCallback((id) => setDeletingId(id), [])

  const stats = {
    total: races.length,
    scheduled: races.filter((r) => r.status === "SCHEDULED").length,
    ongoing: races.filter((r) => r.status === "ONGOING").length,
    finished: races.filter((r) => r.status === "FINISHED").length,
    cancelled: races.filter((r) => ["REJECTED", "CANCELLED"].includes(r.status)).length,
  }

  const SortIcon = ({ column }) => {
    if (sort !== column) return <ChevronUp size={12} className="opacity-20" />
    return sortDirection === "asc"
      ? <ChevronUp size={12} className="text-primary" />
      : <ChevronDown size={12} className="text-primary" />
  }

  const TABS = ["All", "SCHEDULED", "ONGOING", "FINISHED", "CANCELLED"]

  return (
    <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8">
      {/* PAGE HEADER */}
      <div className="mb-8 animate-fade-in-up" style={{ opacity: 0, animationFillMode: "forwards" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
            <Flag className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-on-surface">Race Management</h1>
            <p className="text-on-surface-variant text-sm">Schedule, start, finish, and manage all horse races.</p>
          </div>
        </div>
        <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-primary to-secondary mt-4" />
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Total", value: stats.total, icon: <Flag size={16} />, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
          { label: "Scheduled", value: stats.scheduled, icon: <Calendar size={16} />, color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/20" },
          { label: "Ongoing", value: stats.ongoing, icon: <Play size={16} />, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
          { label: "Finished", value: stats.finished, icon: <Trophy size={16} />, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
          { label: "Cancelled", value: stats.cancelled, icon: <XCircle size={16} />, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
        ].map((stat, i) => (
          <div key={stat.label} className={`gs-card p-4 flex items-center gap-3 animate-fade-in-up delay-row-${i + 1}`} style={{ opacity: 0, animationFillMode: "forwards" }}>
            <div className={`w-9 h-9 rounded-lg ${stat.bg} border ${stat.border} flex items-center justify-center shrink-0 ${stat.color}`}>{stat.icon}</div>
            <div>
              <p className="text-xl font-bold text-on-surface font-mono">{stat.value}</p>
              <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-5 auth-alert auth-alert--error flex items-start gap-3">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} className="shrink-0"><X size={14} /></button>
        </div>
      )}

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
          <input
            type="text"
            placeholder="Search by name, track..."
            value={search}
            onChange={handleSearch}
            className="w-full bg-surface-container-lowest border border-outline-variant/40 text-sm rounded-xl pl-11 pr-4 py-3 text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
          />
        </div>
        <div className="flex gap-1 bg-surface-container-low rounded-xl p-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeTab === tab ? "bg-secondary text-on-secondary" : "text-on-surface-variant hover:bg-surface-container-high"}`}>
              {tab}
            </button>
          ))}
        </div>
        <button onClick={() => setCreateModal(true)} className="gs-btn gs-btn-primary flex items-center gap-2 shrink-0">
          <Plus size={15} /> Add Race
        </button>
      </div>

      {/* TABLE */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>
                <button onClick={() => handleSort("name")} className="flex items-center gap-1">Race Name <SortIcon column="name" /></button>
              </th>
              <th>Track</th>
              <th>
                <button onClick={() => handleSort("raceDate")} className="flex items-center gap-1">Date <SortIcon column="raceDate" /></button>
              </th>
              <th>Time</th>
              <th>Distance</th>
              <th>
                <button onClick={() => handleSort("status")} className="flex items-center gap-1">Status <SortIcon column="status" /></button>
              </th>
              <th>Prize</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-on-surface-variant text-sm">Loading races...</span>
                </div>
              </td></tr>
            ) : races.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="gs-card p-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
                    <Flag size={28} className="text-on-surface-variant/40" />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-on-surface mb-2">No races found</h3>
                  <p className="text-on-surface-variant text-sm">{search ? "Try a different search keyword." : "No races have been scheduled yet."}</p>
                </div>
              </td></tr>
            ) : (
              races.map((r, i) => (
                <tr key={r.raceId} className={`animate-fade-in-up delay-row-${(i % 4) + 1}`} style={{ opacity: 0, animationFillMode: "forwards" }}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-surface-container-highest border border-outline-variant/40 flex items-center justify-center text-lg overflow-hidden shrink-0">
                        {r.imageUrl ? <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover" /> : <Flag size={15} className="text-on-surface-variant/40" />}
                      </div>
                      <div>
                        <p className="font-semibold text-on-surface">{r.name}</p>
                        {r.tournamentName && <p className="text-xs text-on-surface-variant">{r.tournamentName}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="text-on-surface-variant">
                    <span className="flex items-center gap-1.5"><MapPin size={12} className="text-on-surface-variant/50 shrink-0" />{r.trackName || "—"}</span>
                  </td>
                  <td className="text-on-surface-variant font-mono text-xs">{formatDate(r.raceDate)}</td>
                  <td className="text-on-surface-variant font-mono text-xs">{formatTime(r.raceTime)}</td>
                  <td className="text-on-surface-variant">{r.distance || "—"}</td>
                  <td><span className={getStatusBadgeClass(r.status)}>{r.status}</span></td>
                  <td className="text-on-surface-variant">{r.prizePool || "—"}</td>
                  <td>
                    {rejectingId === r.raceId ? (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <input type="text" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason (optional)"
                          className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-error transition-all placeholder:text-on-surface-variant/40" />
                        <div className="flex gap-2">
                          <button onClick={() => handleReject(r.raceId)} disabled={actionLoading === r.raceId} className="gs-btn gs-btn-danger gs-btn-sm flex items-center gap-1.5"><CircleCheck size={12} /> Confirm</button>
                          <button onClick={() => { setRejectingId(null); setRejectReason("") }} className="gs-btn gs-btn-ghost gs-btn-sm">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-1.5 items-center flex-wrap">
                        {r.status === "SCHEDULED" && (
                          <button onClick={() => handleStart(r.raceId)} disabled={actionLoading === r.raceId} title="Start Race" className="gs-btn gs-btn-success gs-btn-sm" title="Start"><Play size={13} /></button>
                        )}
                        {r.status === "ONGOING" && (
                          <button onClick={() => handleFinish(r.raceId)} disabled={actionLoading === r.raceId} title="Finish Race" className="gs-btn gs-btn-success gs-btn-sm"><Square size={13} /></button>
                        )}
                        {r.status === "SCHEDULED" && (
                          <>
                            <button onClick={() => handleApprove(r.raceId)} disabled={actionLoading === r.raceId} title="Approve" className="gs-btn gs-btn-success gs-btn-sm"><CircleCheck size={13} /></button>
                            <button onClick={() => setRejectingId(r.raceId)} disabled={actionLoading === r.raceId} title="Reject" className="gs-btn gs-btn-danger gs-btn-sm"><XCircle size={13} /></button>
                          </>
                        )}
                        <button onClick={() => setViewRace(r)} title="View" className="gs-btn gs-btn-ghost gs-btn-sm"><Eye size={13} /></button>
                        <button onClick={() => openEditModal(r)} title="Edit" className="gs-btn gs-btn-ghost gs-btn-sm"><Edit size={13} /></button>
                        {r.status === "SCHEDULED" && (
                          <button onClick={() => openDeleteConfirm(r.raceId)} disabled={actionLoading === r.raceId} title="Delete" className="gs-btn gs-btn-ghost gs-btn-sm text-error hover:bg-error/10"><Trash2 size={13} /></button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {!loading && races.length > 0 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span>Rows per page:</span>
            <select value={pageSize} onChange={handlePageSizeChange} className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-2 py-1 text-xs text-on-surface focus:outline-none">
              {[5, 10, 20, 50].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-on-surface-variant font-mono">
              {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
            </span>
            <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1} className="gs-btn gs-btn-ghost gs-btn-sm"><ChevronLeft size={14} /></button>
            <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages} className="gs-btn gs-btn-ghost gs-btn-sm"><ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      {/* VIEW RACE MODAL */}
      {viewRace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/40 w-full max-w-lg animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
            <div className="flex items-center justify-between p-5 border-b border-outline-variant/30">
              <h2 className="font-serif text-lg font-bold text-on-surface">Race Details</h2>
              <button onClick={() => setViewRace(null)} className="gs-btn gs-btn-ghost gs-btn-sm"><X size={16} /></button>
            </div>
            <div className="h-40 bg-surface-container-highest overflow-hidden">
              {viewRace.imageUrl ? <img src={viewRace.imageUrl} alt={viewRace.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-5xl">🏇</div>}
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-on-surface">{viewRace.name}</h3>
                <span className={getStatusBadgeClass(viewRace.status)}>{viewRace.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Track", value: viewRace.trackName, icon: <MapPin size={12} /> },
                  { label: "Race Date", value: formatDate(viewRace.raceDate) },
                  { label: "Race Time", value: formatTime(viewRace.raceTime) },
                  { label: "Distance", value: viewRace.distance || "—" },
                  { label: "Prize Pool", value: viewRace.prizePool || "—", icon: <Trophy size={12} /> },
                  { label: "Tournament", value: viewRace.tournamentName || "—" },
                ].map((field) => (
                  <div key={field.label} className="bg-surface-container-low rounded-xl p-3">
                    <p className="text-xs text-on-surface-variant mb-1 flex items-center gap-1">{field.icon}{field.label}</p>
                    <p className="text-sm font-semibold text-on-surface">{field.value || "—"}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-outline-variant/30">
              {viewRace.status === "SCHEDULED" && (
                <>
                  <button onClick={() => { handleApprove(viewRace.raceId); setViewRace(null) }} className="gs-btn gs-btn-success flex-1 flex items-center justify-center gap-2"><CircleCheck size={14} /> Approve</button>
                  <button onClick={() => { setRejectingId(viewRace.raceId); setViewRace(null) }} className="gs-btn gs-btn-danger flex-1 flex items-center justify-center gap-2"><XCircle size={14} /> Reject</button>
                </>
              )}
              {viewRace.status === "SCHEDULED" && (
                <button onClick={() => { handleStart(viewRace.raceId); setViewRace(null) }} className="gs-btn gs-btn-primary flex-1 flex items-center justify-center gap-2"><Play size={14} /> Start Race</button>
              )}
              {viewRace.status === "ONGOING" && (
                <button onClick={() => { handleFinish(viewRace.raceId); setViewRace(null) }} className="gs-btn gs-btn-success flex-1 flex items-center justify-center gap-2"><Square size={14} /> Finish Race</button>
              )}
              <button onClick={() => { setViewRace(null); openEditModal(viewRace) }} className="gs-btn gs-btn-primary flex-1 flex items-center justify-center gap-2"><Edit size={14} /> Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editRace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/40 w-full max-w-md animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
            <div className="flex items-center justify-between p-5 border-b border-outline-variant/30">
              <h2 className="font-serif text-lg font-bold text-on-surface">Edit Race</h2>
              <button onClick={() => setEditRace(null)} className="gs-btn gs-btn-ghost gs-btn-sm"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { name: "name", label: "Race Name", type: "text", placeholder: "e.g. Final Sprint" },
                { name: "trackName", label: "Track / Venue", type: "text", placeholder: "e.g. Happy Track" },
                { name: "raceDate", label: "Race Date", type: "date", placeholder: "" },
                { name: "raceTime", label: "Race Time", type: "time", placeholder: "" },
                { name: "distance", label: "Distance", type: "text", placeholder: "e.g. 1600m" },
                { name: "prizePool", label: "Prize Pool", type: "text", placeholder: "e.g. $50,000" },
                { name: "tournamentId", label: "Tournament ID", type: "number", placeholder: "e.g. 1" },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">{field.label}</label>
                  <input
                    type={field.type}
                    name={field.name}
                    value={formData[field.name]}
                    onChange={handleFormChange}
                    placeholder={field.placeholder}
                    className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Status</label>
                <select name="status" value={formData.status} onChange={handleFormChange}
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all">
                  {["SCHEDULED", "ONGOING", "FINISHED", "CANCELLED"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Image URL</label>
                <input type="url" name="imageUrl" value={formData.imageUrl} onChange={handleFormChange} placeholder="https://..."
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-outline-variant/30">
              <button onClick={() => setEditRace(null)} className="gs-btn gs-btn-ghost flex-1">Cancel</button>
              <button onClick={handleUpdateSubmit} disabled={actionLoading === editRace.raceId || !formData.name.trim()} className="gs-btn gs-btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                {actionLoading === editRace.raceId ? <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" /> : null}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/40 w-full max-w-md animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
            <div className="flex items-center justify-between p-5 border-b border-outline-variant/30">
              <h2 className="font-serif text-lg font-bold text-on-surface">Create New Race</h2>
              <button onClick={() => setCreateModal(false)} className="gs-btn gs-btn-ghost gs-btn-sm"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { name: "name", label: "Race Name", type: "text", placeholder: "e.g. Final Sprint" },
                { name: "trackName", label: "Track / Venue", type: "text", placeholder: "e.g. Happy Track" },
                { name: "raceDate", label: "Race Date", type: "date", placeholder: "" },
                { name: "raceTime", label: "Race Time", type: "time", placeholder: "" },
                { name: "distance", label: "Distance", type: "text", placeholder: "e.g. 1600m" },
                { name: "prizePool", label: "Prize Pool", type: "text", placeholder: "e.g. $50,000" },
                { name: "tournamentId", label: "Tournament ID", type: "number", placeholder: "e.g. 1" },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">{field.label}</label>
                  <input
                    type={field.type}
                    name={field.name}
                    value={formData[field.name]}
                    onChange={handleFormChange}
                    placeholder={field.placeholder}
                    className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Status</label>
                <select name="status" value={formData.status} onChange={handleFormChange}
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all">
                  {["SCHEDULED", "ONGOING", "FINISHED", "CANCELLED"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Image URL</label>
                <input type="url" name="imageUrl" value={formData.imageUrl} onChange={handleFormChange} placeholder="https://..."
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-outline-variant/30">
              <button onClick={() => setCreateModal(false)} className="gs-btn gs-btn-ghost flex-1">Cancel</button>
              <button onClick={handleCreateSubmit} disabled={actionLoading === "create" || !formData.name.trim()} className="gs-btn gs-btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                {actionLoading === "create" ? <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" /> : null}
                Create Race
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
              <h3 className="font-serif text-lg font-bold text-on-surface mb-2">Delete Race</h3>
              <p className="text-sm text-on-surface-variant mb-4">Are you sure? This action cannot be undone.</p>
            </div>
            <div className="flex gap-3 p-5 border-t border-outline-variant/30">
              <button onClick={() => setDeletingId(null)} className="gs-btn gs-btn-ghost flex-1">Cancel</button>
              <button onClick={() => handleDelete(deletingId)} disabled={actionLoading === deletingId} className="gs-btn gs-btn-danger flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                {actionLoading === deletingId ? <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT CONFIRM */}
      {rejectingId && !races.find((r) => r.raceId === rejectingId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/40 w-full max-w-sm animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-error/10 border border-error/20 mx-auto mb-4 flex items-center justify-center"><XCircle size={24} className="text-error" /></div>
              <h3 className="font-serif text-lg font-bold text-on-surface mb-2">Reject Race</h3>
              <p className="text-sm text-on-surface-variant mb-4">Are you sure you want to reject this race?</p>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason (optional)" rows={3}
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40 resize-none mb-4" />
            </div>
            <div className="flex gap-3 p-5 border-t border-outline-variant/30">
              <button onClick={() => { setRejectingId(null); setRejectReason("") }} className="gs-btn gs-btn-ghost flex-1">Cancel</button>
              <button onClick={() => handleReject(rejectingId)} disabled={actionLoading === rejectingId} className="gs-btn gs-btn-danger flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                {actionLoading === rejectingId ? <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" /> : null}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
