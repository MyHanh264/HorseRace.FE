import { useEffect, useState, useCallback } from "react"
import {
  getAllTournaments,
  approveTournament,
  rejectTournament,
  deleteTournament,
  updateTournament,
  createTournament,
} from "../../api/admin"
import {
  Trophy,
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
  Calendar,
  MapPin,
  DollarSign,
  Users,
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

function getStatusBadgeClass(status) {
  switch (status) {
    case "APPROVED":
    case "ONGOING":
    case "COMPLETED":
      return "gs-badge gs-badge-success"
    case "PENDING":
      return "gs-badge gs-badge-warning"
    case "REJECTED":
    case "CANCELLED":
      return "gs-badge gs-badge-error"
    default:
      return "gs-badge gs-badge-neutral"
  }
}

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("startDate")
  const [sortDirection, setSortDirection] = useState("desc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [activeTab, setActiveTab] = useState("All")

  // Modal states
  const [viewTournament, setViewTournament] = useState(null)
  const [editTournament, setEditTournament] = useState(null)
  const [createModal, setCreateModal] = useState(false)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectReason, setRejectReason] = useState("")
  const [deletingId, setDeletingId] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    startDate: "",
    endDate: "",
    prizePool: "",
    imageUrl: "",
    organizerName: "",
  })

  useEffect(() => {
    loadTournaments()
  }, [page, pageSize, search, sort, sortDirection, activeTab])

  const loadTournaments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getAllTournaments({ page, pageSize, search, sort, sortDirection })
      let list = response.data || response || []
      if (activeTab !== "All") {
        list = list.filter((t) => t.status === activeTab)
      }
      setTournaments(list)
      setTotal(response.total || list.length)
      setTotalPages(response.totalPages || 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tournaments.")
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, sort, sortDirection, activeTab])

  const handleSearch = useCallback((e) => {
    setSearch(e.target.value)
    setPage(1)
  }, [])

  const handleSort = useCallback((column) => {
    if (sort === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSort(column)
      setSortDirection("asc")
    }
  }, [sort])

  const handlePageChange = useCallback((p) => setPage(p), [])
  const handlePageSizeChange = useCallback((e) => {
    setPageSize(Number(e.target.value))
    setPage(1)
  }, [])

  const handleApprove = useCallback(async (id) => {
    setActionLoading(id)
    try {
      await approveTournament(id)
      await loadTournaments()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve tournament.")
    } finally {
      setActionLoading(null)
    }
  }, [loadTournaments])

  const handleReject = useCallback(async (id) => {
    setActionLoading(id)
    try {
      await rejectTournament(id, rejectReason.trim() || null)
      setRejectingId(null)
      setRejectReason("")
      await loadTournaments()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject tournament.")
    } finally {
      setActionLoading(null)
    }
  }, [loadTournaments, rejectReason])

  const handleDelete = useCallback(async (id) => {
    setActionLoading(id)
    try {
      await deleteTournament(id)
      setDeletingId(null)
      await loadTournaments()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete tournament.")
    } finally {
      setActionLoading(null)
    }
  }, [loadTournaments])

  const openEditModal = useCallback((tournament) => {
    setEditTournament(tournament)
    setFormData({
      name: tournament.name || "",
      description: tournament.description || "",
      location: tournament.location || "",
      startDate: tournament.startDate || "",
      endDate: tournament.endDate || "",
      prizePool: tournament.prizePool || "",
      imageUrl: tournament.imageUrl || "",
      organizerName: tournament.organizerName || "",
    })
  }, [])

  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleUpdateSubmit = useCallback(async () => {
    setActionLoading(editTournament.tournamentId)
    try {
      await updateTournament(editTournament.tournamentId, formData)
      setEditTournament(null)
      await loadTournaments()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tournament.")
    } finally {
      setActionLoading(null)
    }
  }, [editTournament, formData, loadTournaments])

  const handleCreateSubmit = useCallback(async () => {
    setActionLoading("create")
    try {
      await createTournament(formData)
      setCreateModal(false)
      setFormData({ name: "", description: "", location: "", startDate: "", endDate: "", prizePool: "", imageUrl: "", organizerName: "" })
      await loadTournaments()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tournament.")
    } finally {
      setActionLoading(null)
    }
  }, [formData, loadTournaments])

  const stats = {
    total: tournaments.length,
    approved: tournaments.filter((t) => ["APPROVED", "ONGOING", "COMPLETED"].includes(t.status)).length,
    pending: tournaments.filter((t) => t.status === "PENDING").length,
    rejected: tournaments.filter((t) => ["REJECTED", "CANCELLED"].includes(t.status)).length,
  }

  const SortIcon = ({ column }) => {
    if (sort !== column) return <ChevronUp size={12} className="opacity-20" />
    return sortDirection === "asc"
      ? <ChevronUp size={12} className="text-primary" />
      : <ChevronDown size={12} className="text-primary" />
  }

  const TABS = ["All", "PENDING", "APPROVED", "ONGOING", "COMPLETED", "REJECTED", "CANCELLED"]

  return (
    <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8">
      {/* PAGE HEADER */}
      <div className="mb-8 animate-fade-in-up" style={{ opacity: 0, animationFillMode: "forwards" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-on-surface">Tournament Management</h1>
            <p className="text-on-surface-variant text-sm">Create, approve, and manage all horse racing tournaments.</p>
          </div>
        </div>
        <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-primary to-secondary mt-4" />
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total", value: stats.total, icon: <Trophy size={16} />, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
          { label: "Active", value: stats.approved, icon: <CircleCheck size={16} />, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
          { label: "Pending", value: stats.pending, icon: <Search size={16} />, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
          { label: "Cancelled", value: stats.rejected, icon: <XCircle size={16} />, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`gs-card p-5 flex items-center gap-4 animate-fade-in-up delay-row-${i + 1}`}
            style={{ opacity: 0, animationFillMode: "forwards" }}
          >
            <div className={`w-10 h-10 rounded-lg ${stat.bg} border ${stat.border} flex items-center justify-center shrink-0 ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-on-surface font-mono">{stat.value}</p>
              <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ERROR ALERT */}
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
            placeholder="Search by name, location..."
            value={search}
            onChange={handleSearch}
            className="w-full bg-surface-container-lowest border border-outline-variant/40 text-sm rounded-xl pl-11 pr-4 py-3 text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
          />
        </div>

        <div className="flex gap-1 bg-surface-container-low rounded-xl p-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === tab
                  ? "bg-secondary text-on-secondary"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCreateModal(true)}
          className="gs-btn gs-btn-primary flex items-center gap-2 shrink-0"
        >
          <Plus size={15} />
          Add Tournament
        </button>
      </div>

      {/* TABLE */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>
                <button onClick={() => handleSort("name")} className="flex items-center gap-1">
                  Tournament Name <SortIcon column="name" />
                </button>
              </th>
              <th>Location</th>
              <th>
                <button onClick={() => handleSort("startDate")} className="flex items-center gap-1">
                  Start Date <SortIcon column="startDate" />
                </button>
              </th>
              <th>End Date</th>
              <th>
                <button onClick={() => handleSort("status")} className="flex items-center gap-1">
                  Status <SortIcon column="status" />
                </button>
              </th>
              <th>
                <button onClick={() => handleSort("createdAt")} className="flex items-center gap-1">
                  Created <SortIcon column="createdAt" />
                </button>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span className="text-on-surface-variant text-sm">Loading tournaments...</span>
                  </div>
                </td>
              </tr>
            ) : tournaments.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="gs-card p-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
                      <Trophy size={28} className="text-on-surface-variant/40" />
                    </div>
                    <h3 className="font-serif text-xl font-bold text-on-surface mb-2">No tournaments found</h3>
                    <p className="text-on-surface-variant text-sm">
                      {search ? "Try a different search keyword." : "No tournaments have been created yet."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              tournaments.map((t, i) => (
                <tr
                  key={t.tournamentId}
                  className={`animate-fade-in-up delay-row-${(i % 4) + 1}`}
                  style={{ opacity: 0, animationFillMode: "forwards" }}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-surface-container-highest border border-outline-variant/40 flex items-center justify-center text-lg overflow-hidden shrink-0">
                        {t.imageUrl ? (
                          <img src={t.imageUrl} alt={t.name} className="w-full h-full object-cover" />
                        ) : (
                          <Trophy size={16} className="text-on-surface-variant/40" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-on-surface">{t.name}</p>
                        {t.organizerName && (
                          <p className="text-xs text-on-surface-variant">By {t.organizerName}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="text-on-surface-variant">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-on-surface-variant/50 shrink-0" />
                      {t.location || "—"}
                    </span>
                  </td>
                  <td className="text-on-surface-variant font-mono text-xs">{formatDate(t.startDate)}</td>
                  <td className="text-on-surface-variant font-mono text-xs">{formatDate(t.endDate)}</td>
                  <td>
                    <span className={getStatusBadgeClass(t.status)}>{t.status}</span>
                  </td>
                  <td className="text-on-surface-variant font-mono text-xs">{formatDate(t.createdAt)}</td>
                  <td>
                    {rejectingId === t.tournamentId ? (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Rejection reason (optional)"
                          className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-error transition-all placeholder:text-on-surface-variant/40"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleReject(t.tournamentId)} disabled={actionLoading === t.tournamentId} className="gs-btn gs-btn-danger gs-btn-sm flex items-center gap-1.5">
                            <CircleCheck size={12} /> Confirm
                          </button>
                          <button onClick={() => { setRejectingId(null); setRejectReason("") }} className="gs-btn gs-btn-ghost gs-btn-sm">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-1.5 items-center">
                        {t.status !== "APPROVED" && t.status !== "ONGOING" && t.status !== "COMPLETED" && (
                          <button onClick={() => handleApprove(t.tournamentId)} disabled={actionLoading === t.tournamentId} title="Approve" className="gs-btn gs-btn-success gs-btn-sm">
                            <CircleCheck size={13} />
                          </button>
                        )}
                        {t.status !== "REJECTED" && t.status !== "CANCELLED" && (
                          <button onClick={() => setRejectingId(t.tournamentId)} disabled={actionLoading === t.tournamentId} title="Reject" className="gs-btn gs-btn-danger gs-btn-sm">
                            <XCircle size={13} />
                          </button>
                        )}
                        <button onClick={() => setViewTournament(t)} title="View details" className="gs-btn gs-btn-ghost gs-btn-sm"><Eye size={13} /></button>
                        <button onClick={() => openEditModal(t)} title="Edit" className="gs-btn gs-btn-ghost gs-btn-sm"><Edit size={13} /></button>
                        <button onClick={() => setDeletingId(t.tournamentId)} disabled={actionLoading === t.tournamentId} title="Delete" className="gs-btn gs-btn-ghost gs-btn-sm text-error hover:bg-error/10">
                          <Trash2 size={13} />
                        </button>
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
      {!loading && tournaments.length > 0 && (
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

      {/* VIEW MODAL */}
      {viewTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/40 w-full max-w-lg animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
            <div className="flex items-center justify-between p-5 border-b border-outline-variant/30">
              <h2 className="font-serif text-lg font-bold text-on-surface">Tournament Details</h2>
              <button onClick={() => setViewTournament(null)} className="gs-btn gs-btn-ghost gs-btn-sm"><X size={16} /></button>
            </div>
            <div className="h-40 bg-surface-container-highest overflow-hidden">
              {viewTournament.imageUrl ? (
                <img src={viewTournament.imageUrl} alt={viewTournament.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl">🏆</div>
              )}
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-on-surface">{viewTournament.name}</h3>
                <span className={getStatusBadgeClass(viewTournament.status)}>{viewTournament.status}</span>
              </div>
              {viewTournament.description && <p className="text-sm text-on-surface-variant">{viewTournament.description}</p>}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Location", value: viewTournament.location, icon: <MapPin size={12} /> },
                  { label: "Start Date", value: formatDate(viewTournament.startDate) },
                  { label: "End Date", value: formatDate(viewTournament.endDate) },
                  { label: "Prize Pool", value: viewTournament.prizePool, icon: <DollarSign size={12} /> },
                  { label: "Organizer", value: viewTournament.organizerName || "—" },
                  { label: "Participants", value: viewTournament.participantCount || "—" },
                ].map((field) => (
                  <div key={field.label} className="bg-surface-container-low rounded-xl p-3">
                    <p className="text-xs text-on-surface-variant mb-1 flex items-center gap-1">{field.icon}{field.label}</p>
                    <p className="text-sm font-semibold text-on-surface">{field.value || "—"}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-outline-variant/30">
              {viewTournament.status === "PENDING" && (
                <>
                  <button onClick={() => { handleApprove(viewTournament.tournamentId); setViewTournament(null) }} className="gs-btn gs-btn-success flex-1 flex items-center justify-center gap-2"><CircleCheck size={14} /> Approve</button>
                  <button onClick={() => { setRejectingId(viewTournament.tournamentId); setViewTournament(null) }} className="gs-btn gs-btn-danger flex-1 flex items-center justify-center gap-2"><XCircle size={14} /> Reject</button>
                </>
              )}
              <button onClick={() => { setViewTournament(null); openEditModal(viewTournament) }} className="gs-btn gs-btn-primary flex-1 flex items-center justify-center gap-2"><Edit size={14} /> Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/40 w-full max-w-md animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
            <div className="flex items-center justify-between p-5 border-b border-outline-variant/30">
              <h2 className="font-serif text-lg font-bold text-on-surface">Edit Tournament</h2>
              <button onClick={() => setEditTournament(null)} className="gs-btn gs-btn-ghost gs-btn-sm"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { name: "name", label: "Tournament Name", type: "text", placeholder: "e.g. Spring Championship" },
                { name: "location", label: "Location / Venue", type: "text", placeholder: "e.g. Happy Track, Ho Chi Minh" },
                { name: "startDate", label: "Start Date", type: "date", placeholder: "" },
                { name: "endDate", label: "End Date", type: "date", placeholder: "" },
                { name: "prizePool", label: "Prize Pool", type: "text", placeholder: "e.g. $100,000" },
                { name: "organizerName", label: "Organizer Name", type: "text", placeholder: "e.g. GrandStride Club" },
                { name: "imageUrl", label: "Image URL", type: "url", placeholder: "https://..." },
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
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Tournament description..."
                  rows={3}
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-outline-variant/30">
              <button onClick={() => setEditTournament(null)} className="gs-btn gs-btn-ghost flex-1">Cancel</button>
              <button onClick={handleUpdateSubmit} disabled={actionLoading === editTournament.tournamentId || !formData.name.trim()} className="gs-btn gs-btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                {actionLoading === editTournament.tournamentId ? <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" /> : null}
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
              <h2 className="font-serif text-lg font-bold text-on-surface">Create New Tournament</h2>
              <button onClick={() => setCreateModal(false)} className="gs-btn gs-btn-ghost gs-btn-sm"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { name: "name", label: "Tournament Name", type: "text", placeholder: "e.g. Spring Championship" },
                { name: "location", label: "Location / Venue", type: "text", placeholder: "e.g. Happy Track" },
                { name: "startDate", label: "Start Date", type: "date", placeholder: "" },
                { name: "endDate", label: "End Date", type: "date", placeholder: "" },
                { name: "prizePool", label: "Prize Pool", type: "text", placeholder: "e.g. $100,000" },
                { name: "organizerName", label: "Organizer Name", type: "text", placeholder: "e.g. GrandStride Club" },
                { name: "imageUrl", label: "Image URL", type: "url", placeholder: "https://..." },
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
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Tournament description..."
                  rows={3}
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-outline-variant/30">
              <button onClick={() => setCreateModal(false)} className="gs-btn gs-btn-ghost flex-1">Cancel</button>
              <button onClick={handleCreateSubmit} disabled={actionLoading === "create" || !formData.name.trim()} className="gs-btn gs-btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                {actionLoading === "create" ? <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" /> : null}
                Create Tournament
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
              <div className="w-14 h-14 rounded-full bg-error/10 border border-error/20 mx-auto mb-4 flex items-center justify-center">
                <Trash2 size={24} className="text-error" />
              </div>
              <h3 className="font-serif text-lg font-bold text-on-surface mb-2">Delete Tournament</h3>
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

      {/* REJECT CONFIRM (standalone) */}
      {rejectingId && !tournaments.find((t) => t.tournamentId === rejectingId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/40 w-full max-w-sm animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-error/10 border border-error/20 mx-auto mb-4 flex items-center justify-center">
                <XCircle size={24} className="text-error" />
              </div>
              <h3 className="font-serif text-lg font-bold text-on-surface mb-2">Reject Tournament</h3>
              <p className="text-sm text-on-surface-variant mb-4">Are you sure you want to reject this tournament?</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason (optional)"
                rows={3}
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40 resize-none mb-4"
              />
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


const TABS = ['All', 'Active', 'Upcoming', 'Completed']

const TAB_FILTER = {
  All: null,
  Active: ['Open', 'Ongoing'],
  Upcoming: ['Draft'],
  Completed: ['Finished', 'Cancelled'],
}

const STATUS_META = {
  Draft:     { label: 'Upcoming',  cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/25' },
  Open:      { label: 'Active',    cls: 'bg-primary/15 text-primary border border-primary/25' },
  Ongoing:   { label: 'Active',    cls: 'bg-primary/15 text-primary border border-primary/25' },
  Finished:  { label: 'Completed', cls: 'bg-surface-container-high text-on-surface-variant border border-outline-variant/50' },
  Cancelled: { label: 'Cancelled', cls: 'bg-error/15 text-error border border-error/25' },
}

const ALL_STATUSES = ['Draft', 'Open', 'Ongoing', 'Finished', 'Cancelled']

const PAGE_SIZE = 10

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtId(id, startDate) {
  const year = startDate ? startDate.slice(0, 4) : new Date().getFullYear()
  return `TRN-${year}-${String(id).padStart(3, '0')}`
}

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[+m - 1]} ${+day}, ${y}`
}

function toInputDate(d) {
  return d ? d.slice(0, 10) : ''
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function TournamentModal({ tournament, onClose, onSubmit, submitting, error }) {
  const isEdit = !!tournament

  const [form, setForm] = useState({
    name:        tournament?.name        ?? '',
    description: tournament?.description ?? '',
    location:    tournament?.location    ?? '',
    startDate:   toInputDate(tournament?.startDate),
    endDate:     toInputDate(tournament?.endDate),
    logoUrl:     tournament?.logoUrl     ?? '',
    status:      tournament?.status      ?? 'Draft',
    cancelReason: tournament?.cancelReason ?? '',
  })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      name:         form.name.trim(),
      description:  form.description.trim() || null,
      location:     form.location.trim()    || null,
      startDate:    form.startDate,
      endDate:      form.endDate,
      logoUrl:      form.logoUrl.trim()     || null,
      status:       form.status,
      cancelReason: form.status === 'Cancelled' ? (form.cancelReason.trim() || null) : null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
      <div className="gs-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-secondary" />
            </div>
            <h2 className="font-serif font-bold text-on-surface">
              {isEdit ? 'Edit Tournament' : 'Create Tournament'}
            </h2>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Tournament Name <span className="text-error">*</span>
            </label>
            <input
              required
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Dubai World Cup Series"
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Location
            </label>
            <input
              value={form.location}
              onChange={set('location')}
              placeholder="e.g. Meydan Racecourse"
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Start Date <span className="text-error">*</span>
              </label>
              <input
                required
                type="date"
                value={form.startDate}
                onChange={set('startDate')}
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                End Date <span className="text-error">*</span>
              </label>
              <input
                required
                type="date"
                value={form.endDate}
                min={form.startDate}
                onChange={set('endDate')}
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={set('description')}
              placeholder="Optional description..."
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40 resize-none"
            />
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Logo URL
            </label>
            <input
              type="url"
              value={form.logoUrl}
              onChange={set('logoUrl')}
              placeholder="https://..."
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
            />
          </div>

          {/* Status (edit only) */}
          {isEdit && (
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={form.status}
                onChange={set('status')}
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all"
              >
                {ALL_STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {/* Cancel reason — only when status is Cancelled */}
          {isEdit && form.status === 'Cancelled' && (
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Cancel Reason
              </label>
              <input
                value={form.cancelReason}
                onChange={set('cancelReason')}
                placeholder="Reason for cancellation..."
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="gs-btn gs-btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="gs-btn gs-btn-secondary flex items-center gap-2"
            >
              {submitting && <div className="w-3 h-3 border-2 border-on-secondary/30 border-t-on-secondary rounded-full animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Tournament'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
