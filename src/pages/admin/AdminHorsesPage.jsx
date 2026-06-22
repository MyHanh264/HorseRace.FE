import { useEffect, useState, useCallback } from 'react'
import { getAllHorse, approveHorse, rejectHorse, deleteHorse, updateHorse, createHorse } from '../../api/admin'
import {
  List,
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
  Swords,
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
      return "gs-badge gs-badge-success"
    case "PENDING":
      return "gs-badge gs-badge-warning"
    case "REJECTED":
      return "gs-badge gs-badge-error"
    default:
      return "gs-badge gs-badge-neutral"
  }
}

function StatusDot({ status }) {
  const colors = {
    APPROVED: "bg-emerald-400",
    PENDING: "bg-yellow-400",
    REJECTED: "bg-red-400",
  }
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${
        colors[status] || "bg-gray-400"
      }`}
    />
  )
}

export default function AdminHorsesPage() {
  const [horses, setHorses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("createdAt")
  const [sortDirection, setSortDirection] = useState("desc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [activeTab, setActiveTab] = useState("All")

  // Modal states
  const [viewHorse, setViewHorse] = useState(null)
  const [editHorse, setEditHorse] = useState(null)
  const [createModal, setCreateModal] = useState(false)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectReason, setRejectReason] = useState("")
  const [deletingId, setDeletingId] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  // Edit / Create form state
  const [formData, setFormData] = useState({
    name: "",
    breed: "",
    birthYear: "",
    color: "",
    trainerName: "",
    imageUrl: "",
  })

  useEffect(() => { loadHorses() }, [page, pageSize, search, sort, sortDirection, activeTab])

  const loadHorses = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getAllHorse({ page, pageSize, search, sort, sortDirection })
      let list = response.data || response || []
      if (activeTab !== "All") {
        list = list.filter((h) => h.status === activeTab)
      }
      setHorses(list)
      setTotal(response.total || list.length)
      setTotalPages(response.totalPages || 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load horses.")
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

  const handlePageChange = useCallback((p) => { setPage(p) }, [])
  const handlePageSizeChange = useCallback((e) => {
    setPageSize(Number(e.target.value))
    setPage(1)
  }, [])

  const handleApprove = useCallback(async (id) => {
    setActionLoading(id)
    try {
      await approveHorse(id)
      await loadHorses()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve horse.")
    } finally {
      setActionLoading(null)
    }
  }, [loadHorses])

  const handleReject = useCallback(async (id) => {
    setActionLoading(id)
    try {
      await rejectHorse(id, rejectReason.trim() || null)
      setRejectingId(null)
      setRejectReason("")
      await loadHorses()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject horse.")
    } finally {
      setActionLoading(null)
    }
  }, [loadHorses, rejectReason])

  const handleDelete = useCallback(async (id) => {
    setActionLoading(id)
    try {
      await deleteHorse(id)
      setDeletingId(null)
      await loadHorses()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete horse.")
    } finally {
      setActionLoading(null)
    }
  }, [loadHorses])

  const openEditModal = useCallback((horse) => {
    setEditHorse(horse)
    setFormData({
      name: horse.name || "",
      breed: horse.breed || "",
      birthYear: horse.birthYear || "",
      color: horse.color || "",
      trainerName: horse.trainerName || "",
      imageUrl: horse.imageUrl || "",
    })
  }, [])

  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleUpdateSubmit = useCallback(async () => {
    setActionLoading(editHorse.horseId)
    try {
      await updateHorse(editHorse.horseId, formData)
      setEditHorse(null)
      await loadHorses()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update horse.")
    } finally {
      setActionLoading(null)
    }
  }, [editHorse, formData, loadHorses])

  const handleCreateSubmit = useCallback(async () => {
    setActionLoading("create")
    try {
      await createHorse(formData)
      setCreateModal(false)
      setFormData({ name: "", breed: "", birthYear: "", color: "", trainerName: "", imageUrl: "" })
      await loadHorses()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create horse.")
    } finally {
      setActionLoading(null)
    }
  }, [formData, loadHorses])

  const openDeleteConfirm = useCallback((id) => { setDeletingId(id) }, [])

  // Stats
  const stats = {
    total: horses.length,
    approved: horses.filter((h) => h.status === "APPROVED").length,
    pending: horses.filter((h) => h.status === "PENDING").length,
    rejected: horses.filter((h) => h.status === "REJECTED").length,
  }

  const SortIcon = ({ column }) => {
    if (sort !== column) return <ChevronUp size={12} className="opacity-20" />
    return sortDirection === "asc"
      ? <ChevronUp size={12} className="text-primary" />
      : <ChevronDown size={12} className="text-primary" />
  }

  const TABS = ["All", "APPROVED", "PENDING", "REJECTED"]

  return (
    <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8">

      {/* PAGE HEADER */}
      <div className="mb-8 animate-fade-in-up" style={{ opacity: 0, animationFillMode: "forwards" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
            <Swords className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-on-surface">Horse Management</h1>
            <p className="text-on-surface-variant text-sm">View, approve, edit, and manage all registered horses.</p>
          </div>
        </div>
        <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-primary to-secondary mt-4" />
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Horses", value: stats.total, icon: <List size={16} />, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
          { label: "Approved", value: stats.approved, icon: <CircleCheck size={16} />, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
          { label: "Pending", value: stats.pending, icon: <Search size={16} />, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
          { label: "Rejected", value: stats.rejected, icon: <XCircle size={16} />, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
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

      {/* TOOLBAR: Search + Tabs + Create */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
          <input
            type="text"
            placeholder="Search by name, breed, or owner..."
            value={search}
            onChange={handleSearch}
            className="w-full bg-surface-container-lowest border border-outline-variant/40 text-sm rounded-xl pl-11 pr-4 py-3 text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-container-low rounded-xl p-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab
                  ? "bg-secondary text-on-secondary"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Create */}
        <button
          onClick={() => setCreateModal(true)}
          className="gs-btn gs-btn-primary flex items-center gap-2 shrink-0"
        >
          <Plus size={15} />
          Add Horse
        </button>
      </div>

      {/* TABLE */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>
                <button onClick={() => handleSort("name")} className="flex items-center gap-1">
                  Horse Name <SortIcon column="name" />
                </button>
              </th>
              <th>Breed</th>
              <th>Color</th>
              <th>Age</th>
              <th>
                <button onClick={() => handleSort("ownerName")} className="flex items-center gap-1">
                  Owner <SortIcon column="ownerName" />
                </button>
              </th>
              <th>
                <button onClick={() => handleSort("status")} className="flex items-center gap-1">
                  Status <SortIcon column="status" />
                </button>
              </th>
              <th>
                <button onClick={() => handleSort("createdAt")} className="flex items-center gap-1">
                  Registered <SortIcon column="createdAt" />
                </button>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span className="text-on-surface-variant text-sm">Loading horses...</span>
                  </div>
                </td>
              </tr>
            ) : horses.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="gs-card p-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
                      <Swords size={28} className="text-on-surface-variant/40" />
                    </div>
                    <h3 className="font-serif text-xl font-bold text-on-surface mb-2">No horses found</h3>
                    <p className="text-on-surface-variant text-sm">
                      {search ? "Try a different search keyword." : "No horses have been registered yet."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              horses.map((horse, i) => (
                <tr
                  key={horse.horseId}
                  className={`animate-fade-in-up delay-row-${(i % 4) + 1}`}
                  style={{ opacity: 0, animationFillMode: "forwards" }}
                >
                  {/* Horse Name + Image */}
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-surface-container-highest border border-outline-variant/40 flex items-center justify-center text-lg overflow-hidden shrink-0">
                        {horse.imageUrl ? (
                          <img src={horse.imageUrl} alt={horse.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>🐴</span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-on-surface">{horse.name}</p>
                        {horse.trainerName && (
                          <p className="text-xs text-on-surface-variant">Trainer: {horse.trainerName}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="text-on-surface-variant">{horse.breed || "—"}</td>
                  <td className="text-on-surface-variant">{horse.color || "—"}</td>
                  <td className="text-on-surface-variant">
                    {horse.birthYear ? new Date().getFullYear() - horse.birthYear + " yo" : "—"}
                  </td>
                  <td>
                    <p className="text-on-surface-variant">{horse.ownerName || horse.owner || "—"}</p>
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(horse.status)}>
                      {horse.status}
                    </span>
                  </td>
                  <td className="text-on-surface-variant font-mono text-xs">
                    {formatDate(horse.createdAt)}
                  </td>
                  <td>
                    {/* Reject inline form */}
                    {rejectingId === horse.horseId ? (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Rejection reason (optional)"
                          className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-error transition-all placeholder:text-on-surface-variant/40"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReject(horse.horseId)}
                            disabled={actionLoading === horse.horseId}
                            className="gs-btn gs-btn-danger gs-btn-sm flex items-center gap-1.5"
                          >
                            <CircleCheck size={12} />
                            Confirm
                          </button>
                          <button
                            onClick={() => { setRejectingId(null); setRejectReason("") }}
                            className="gs-btn gs-btn-ghost gs-btn-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-1.5 items-center">
                        {/* Approve */}
                        {horse.status !== "APPROVED" && (
                          <button
                            onClick={() => handleApprove(horse.horseId)}
                            disabled={actionLoading === horse.horseId}
                            title="Approve"
                            className="gs-btn gs-btn-success gs-btn-sm"
                          >
                            <CircleCheck size={13} />
                          </button>
                        )}
                        {/* Reject */}
                        {horse.status !== "REJECTED" && (
                          <button
                            onClick={() => setRejectingId(horse.horseId)}
                            disabled={actionLoading === horse.horseId}
                            title="Reject"
                            className="gs-btn gs-btn-danger gs-btn-sm"
                          >
                            <XCircle size={13} />
                          </button>
                        )}
                        {/* View */}
                        <button
                          onClick={() => setViewHorse(horse)}
                          title="View details"
                          className="gs-btn gs-btn-ghost gs-btn-sm"
                        >
                          <Eye size={13} />
                        </button>
                        {/* Edit */}
                        <button
                          onClick={() => openEditModal(horse)}
                          title="Edit"
                          className="gs-btn gs-btn-ghost gs-btn-sm"
                        >
                          <Edit size={13} />
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => openDeleteConfirm(horse.horseId)}
                          disabled={actionLoading === horse.horseId}
                          title="Delete"
                          className="gs-btn gs-btn-ghost gs-btn-sm text-error hover:bg-error/10"
                        >
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
      {!loading && horses.length > 0 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-2 py-1 text-xs text-on-surface focus:outline-none"
            >
              {[5, 10, 20, 50].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-on-surface-variant font-mono">
              {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
            </span>
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="gs-btn gs-btn-ghost gs-btn-sm"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="gs-btn gs-btn-ghost gs-btn-sm"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ===== MODALS ===== */}

      {/* VIEW HORSE MODAL */}
      {viewHorse && (
        <HorseModal
          horse={viewHorse}
          onClose={() => setViewHorse(null)}
          onEdit={() => { setViewHorse(null); openEditModal(viewHorse) }}
          onApprove={() => { handleApprove(viewHorse.horseId); setViewHorse(null) }}
          onReject={() => setRejectingId(viewHorse.horseId)}
        />
      )}

      {/* EDIT HORSE MODAL */}
      {editHorse && (
        <HorseFormModal
          title="Edit Horse"
          formData={formData}
          onChange={handleFormChange}
          onClose={() => setEditHorse(null)}
          onSubmit={handleUpdateSubmit}
          loading={actionLoading === editHorse.horseId}
          submitLabel="Save Changes"
        />
      )}

      {/* CREATE HORSE MODAL */}
      {createModal && (
        <HorseFormModal
          title="Register New Horse"
          formData={formData}
          onChange={handleFormChange}
          onClose={() => {
            setCreateModal(false)
            setFormData({ name: "", breed: "", birthYear: "", color: "", trainerName: "", imageUrl: "" })
          }}
          onSubmit={handleCreateSubmit}
          loading={actionLoading === "create"}
          submitLabel="Create Horse"
        />
      )}

      {/* DELETE CONFIRM MODAL */}
      {deletingId && (
        <ConfirmModal
          title="Delete Horse"
          message="Are you sure you want to delete this horse? This action cannot be undone."
          loading={actionLoading === deletingId}
          onConfirm={() => handleDelete(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}

      {/* REJECT CONFIRM MODAL (standalone — for when reject was triggered from view modal) */}
      {rejectingId && !horses.find((h) => h.horseId === rejectingId) && (
        <ConfirmModal
          title="Reject Horse"
          message="Are you sure you want to reject this horse?"
          extraInput
          extraValue={rejectReason}
          onExtraChange={(v) => setRejectReason(v)}
          loading={actionLoading === rejectingId}
          onConfirm={() => handleReject(rejectingId)}
          onCancel={() => { setRejectingId(null); setRejectReason("") }}
        />
      )}
    </div>
  )
}

// ===== SUB-COMPONENTS =====

function HorseModal({ horse, onClose, onEdit, onApprove, onReject }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="bg-surface-container-low rounded-2xl border border-outline-variant/40 w-full max-w-lg animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-outline-variant/30">
          <h2 className="font-serif text-lg font-bold text-on-surface">Horse Details</h2>
          <button onClick={onClose} className="gs-btn gs-btn-ghost gs-btn-sm"><X size={16} /></button>
        </div>
        {/* Image */}
        <div className="h-48 bg-surface-container-highest overflow-hidden">
          {horse.imageUrl ? (
            <img src={horse.imageUrl} alt={horse.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">🐴</div>
          )}
        </div>
        {/* Body */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-on-surface">{horse.name}</h3>
            <span className={getStatusBadgeClass(horse.status)}>{horse.status}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Breed", value: horse.breed },
              { label: "Color", value: horse.color },
              { label: "Birth Year", value: horse.birthYear },
              { label: "Age", value: horse.birthYear ? new Date().getFullYear() - horse.birthYear + " years old" : "—" },
              { label: "Owner", value: horse.ownerName || horse.owner },
              { label: "Trainer", value: horse.trainerName || "—" },
            ].map((field) => (
              <div key={field.label} className="bg-surface-container-low rounded-xl p-3">
                <p className="text-xs text-on-surface-variant mb-1">{field.label}</p>
                <p className="text-sm font-semibold text-on-surface">{field.value || "—"}</p>
              </div>
            ))}
          </div>
          {horse.rejectionReason && (
            <div className="bg-error/10 border border-error/20 rounded-xl p-3">
              <p className="text-xs text-error font-semibold mb-1">Rejection Reason</p>
              <p className="text-sm text-error/80">{horse.rejectionReason}</p>
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-outline-variant/30">
          {horse.status !== "APPROVED" && (
            <button onClick={onApprove} className="gs-btn gs-btn-success flex-1 flex items-center justify-center gap-2">
              <CircleCheck size={14} /> Approve
            </button>
          )}
          {horse.status !== "REJECTED" && (
            <button onClick={onReject} className="gs-btn gs-btn-danger flex-1 flex items-center justify-center gap-2">
              <XCircle size={14} /> Reject
            </button>
          )}
          <button onClick={onEdit} className="gs-btn gs-btn-primary flex-1 flex items-center justify-center gap-2">
            <Edit size={14} /> Edit
          </button>
        </div>
      </div>
    </div>
  )
}

function HorseFormModal({ title, formData, onChange, onClose, onSubmit, loading, submitLabel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="bg-surface-container-low rounded-2xl border border-outline-variant/40 w-full max-w-md animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
        <div className="flex items-center justify-between p-5 border-b border-outline-variant/30">
          <h2 className="font-serif text-lg font-bold text-on-surface">{title}</h2>
          <button onClick={onClose} className="gs-btn gs-btn-ghost gs-btn-sm"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {[
            { name: "name", label: "Horse Name", type: "text", placeholder: "e.g. Thunder Bolt" },
            { name: "breed", label: "Breed", type: "text", placeholder: "e.g. Thoroughbred" },
            { name: "color", label: "Color", type: "text", placeholder: "e.g. Bay" },
            { name: "birthYear", label: "Birth Year", type: "number", placeholder: "e.g. 2020" },
            { name: "trainerName", label: "Trainer Name", type: "text", placeholder: "e.g. John Smith" },
            { name: "imageUrl", label: "Image URL", type: "url", placeholder: "https://..." },
          ].map((field) => (
            <div key={field.name}>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                {field.label}
              </label>
              <input
                type={field.type}
                name={field.name}
                value={formData[field.name]}
                onChange={onChange}
                placeholder={field.placeholder}
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3 p-5 border-t border-outline-variant/30">
          <button onClick={onClose} className="gs-btn gs-btn-ghost flex-1">Cancel</button>
          <button
            onClick={onSubmit}
            disabled={loading || !formData.name.trim()}
            className="gs-btn gs-btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" /> : null}
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmModal({ title, message, extraInput, extraValue, onExtraChange, loading, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="bg-surface-container-low rounded-2xl border border-outline-variant/40 w-full max-w-sm animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-error/10 border border-error/20 mx-auto mb-4 flex items-center justify-center">
            <Trash2 size={24} className="text-error" />
          </div>
          <h3 className="font-serif text-lg font-bold text-on-surface mb-2">{title}</h3>
          <p className="text-sm text-on-surface-variant mb-4">{message}</p>
          {extraInput && (
            <textarea
              value={extraValue}
              onChange={(e) => onExtraChange(e.target.value)}
              placeholder="Reason (optional)"
              rows={3}
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40 resize-none mb-4"
            />
          )}
        </div>
        <div className="flex gap-3 p-5 border-t border-outline-variant/30">
          <button onClick={onCancel} className="gs-btn gs-btn-ghost flex-1">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="gs-btn gs-btn-danger flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" /> : null}
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}