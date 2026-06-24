import { useState, useEffect, useCallback } from "react";
import {
  Trophy,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  AlertCircle,
} from "lucide-react";
import {
  getTournaments,
  getTournamentDetail,
  createTournament,
  updateTournament,
  deleteTournament,
} from "../../api/admin";

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ["All", "Active", "Upcoming", "Completed"];

const TAB_FILTER = {
  All: null,
  Active: ["Open", "Ongoing"],
  Upcoming: ["Draft"],
  Completed: ["Finished", "Cancelled"],
};

const STATUS_META = {
  Draft: {
    label: "Upcoming",
    cls: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  },
  Open: {
    label: "Active",
    cls: "bg-primary/15 text-primary border border-primary/25",
  },
  Ongoing: {
    label: "Active",
    cls: "bg-primary/15 text-primary border border-primary/25",
  },
  Finished: {
    label: "Completed",
    cls: "bg-surface-container-high text-on-surface-variant border border-outline-variant/50",
  },
  Cancelled: {
    label: "Cancelled",
    cls: "bg-error/15 text-error border border-error/25",
  },
};

const ALL_STATUSES = ["Draft", "Open", "Ongoing", "Finished", "Cancelled"];

const PAGE_SIZE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtId(id, startDate) {
  const year = startDate ? startDate.slice(0, 4) : new Date().getFullYear();
  return `TRN-${year}-${String(id).padStart(3, "0")}`;
}

function fmtDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[+m - 1]} ${+day}, ${y}`;
}

function toInputDate(d) {
  return d ? d.slice(0, 10) : "";
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function TournamentModal({ tournament, onClose, onSubmit, submitting, error }) {
  const isEdit = !!tournament;

  const [form, setForm] = useState({
    name: tournament?.name ?? "",
    description: tournament?.description ?? "",
    location: tournament?.location ?? "",
    startDate: toInputDate(tournament?.startDate),
    endDate: toInputDate(tournament?.endDate),
    logoUrl: tournament?.logoUrl ?? "",
    status: tournament?.status ?? "Draft",
    cancelReason: tournament?.cancelReason ?? "",
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name: form.name.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      startDate: form.startDate,
      endDate: form.endDate,
      logoUrl: form.logoUrl.trim() || null,
      status: form.status,
      cancelReason:
        form.status === "Cancelled" ? form.cancelReason.trim() || null : null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div className="gs-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-secondary" />
            </div>
            <h2 className="font-serif font-bold text-on-surface">
              {isEdit ? "Edit Tournament" : "Create Tournament"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
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
              onChange={set("name")}
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
              onChange={set("location")}
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
                onChange={set("startDate")}
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
                onChange={set("endDate")}
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
              onChange={set("description")}
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
              onChange={set("logoUrl")}
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
                onChange={set("status")}
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Cancel reason — only when status is Cancelled */}
          {isEdit && form.status === "Cancelled" && (
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Cancel Reason
              </label>
              <input
                value={form.cancelReason}
                onChange={set("cancelReason")}
                placeholder="Reason for cancellation..."
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="gs-btn gs-btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="gs-btn gs-btn-secondary flex items-center gap-2"
            >
              {submitting && (
                <div className="w-3 h-3 border-2 border-on-secondary/30 border-t-on-secondary rounded-full animate-spin" />
              )}
              {isEdit ? "Save Changes" : "Create Tournament"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getTournaments();
      setTournaments(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(err?.message || "Không tải được danh sách giải đấu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getTournaments()
      .then((data) => setTournaments(Array.isArray(data) ? data : []))
      .catch((err) =>
        setError(err?.message || "Không tải được danh sách giải đấu"),
      )
      .finally(() => setLoading(false));
  }, []);

  // ── Filter ──
  const filtered = tournaments.filter((t) => {
    const statusOk =
      !TAB_FILTER[activeTab] || TAB_FILTER[activeTab].includes(t.status);
    const q = searchQuery.toLowerCase();
    const searchOk =
      !q ||
      t.name.toLowerCase().includes(q) ||
      (t.location || "").toLowerCase().includes(q);
    return statusOk && searchOk;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Handlers ──
  const openCreate = () => {
    setEditingItem(null);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = async (t) => {
    setFormError("");
    try {
      const detail = await getTournamentDetail(t.tournamentId);
      setEditingItem(detail);
    } catch {
      setEditingItem(t);
    }
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    setError("");
    try {
      await deleteTournament(id);
      setDeletingId(null);
      await load();
    } catch (err) {
      setError(err?.message || "Xóa giải đấu thất bại");
      setDeletingId(null);
    }
  };

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    setFormError("");
    try {
      if (editingItem) {
        await updateTournament(editingItem.tournamentId, {
          tournamentId: editingItem.tournamentId,
          ...formData,
        });
      } else {
        await createTournament(formData);
      }
      setShowModal(false);
      await load();
    } catch (err) {
      setFormError(err?.message || "Lưu thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div
          className="animate-fade-in-up"
          style={{ opacity: 0, animationFillMode: "forwards" }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-on-surface">
                Tournament Management
              </h1>
              <p className="text-on-surface-variant text-sm">
                Oversee active series, schedule new events, and manage
                tournament lifecycles.
              </p>
            </div>
          </div>
          <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-secondary to-primary mt-3" />
        </div>

        <button
          onClick={openCreate}
          className="gs-btn gs-btn-secondary flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Tournament
        </button>
      </div>

      {/* ── Global Error ── */}
      {error && (
        <div className="mb-5 p-4 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button
            onClick={() => setError("")}
            className="ml-auto text-error/60 hover:text-error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Table Card ── */}
      <div className="gs-card overflow-hidden">
        {/* Tabs + Search */}
        <div className="flex items-center justify-between px-5 border-b border-outline-variant/40">
          <div className="flex">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setPage(1);
                }}
                className={`px-4 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab
                    ? "text-secondary border-secondary"
                    : "text-on-surface-variant border-transparent hover:text-on-surface"
                }`}
              >
                {tab === "All" ? "All Tournaments" : tab}
              </button>
            ))}
          </div>

          <div className="relative py-3">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
            <input
              type="text"
              placeholder="Search tournaments..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg pl-9 pr-4 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40 w-52"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
              <span className="text-on-surface-variant text-sm">
                Loading tournaments...
              </span>
            </div>
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
              <Trophy className="w-7 h-7 text-on-surface-variant/40" />
            </div>
            <p className="text-on-surface font-semibold mb-1">
              {searchQuery ? "No results found" : "No tournaments yet"}
            </p>
            <p className="text-on-surface-variant text-sm">
              {searchQuery
                ? "Try a different search term."
                : 'Click "Create Tournament" to get started.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tournament Name</th>
                  <th>Location</th>
                  <th>Dates</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((t, i) => {
                  const meta = STATUS_META[t.status] ?? {
                    label: t.status,
                    cls: "bg-surface-container-high text-on-surface-variant border border-outline-variant/50",
                  };
                  return (
                    <tr
                      key={t.tournamentId}
                      className={`animate-fade-in-up delay-row-${(i % 4) + 1}`}
                      style={{ opacity: 0, animationFillMode: "forwards" }}
                    >
                      {/* Name */}
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center shrink-0">
                            {t.logoUrl ? (
                              <img
                                src={t.logoUrl}
                                alt=""
                                className="w-6 h-6 object-contain rounded"
                              />
                            ) : (
                              <Trophy className="w-4 h-4 text-secondary" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-on-surface text-sm leading-snug">
                              {t.name}
                            </div>
                            <div className="text-[11px] text-on-surface-variant font-mono">
                              ID: {fmtId(t.tournamentId, t.startDate)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td>
                        <div className="flex items-center gap-1.5 text-sm text-on-surface-variant">
                          {t.location ? (
                            <>
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              {t.location}
                            </>
                          ) : (
                            "—"
                          )}
                        </div>
                      </td>

                      {/* Dates */}
                      <td>
                        <div className="flex items-center gap-1.5 text-sm text-on-surface-variant">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {fmtDate(t.startDate)} – {fmtDate(t.endDate)}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${meta.cls}`}
                        >
                          {meta.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        {deletingId === t.tournamentId ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-error">
                              Confirm delete?
                            </span>
                            <button
                              onClick={() => handleDelete(t.tournamentId)}
                              className="gs-btn gs-btn-danger gs-btn-sm"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="gs-btn gs-btn-ghost gs-btn-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit(t)}
                              className="gs-btn gs-btn-ghost gs-btn-sm flex items-center gap-1.5"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            <button
                              onClick={() => setDeletingId(t.tournamentId)}
                              className="gs-btn gs-btn-danger gs-btn-sm flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant/40">
            <span className="text-xs text-on-surface-variant">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}{" "}
              tournaments
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="gs-btn gs-btn-ghost gs-btn-sm px-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from(
                { length: Math.min(totalPages, 5) },
                (_, i) => i + 1,
              ).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`gs-btn gs-btn-sm min-w-[32px] justify-center ${page === p ? "gs-btn-secondary" : "gs-btn-ghost"}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="gs-btn gs-btn-ghost gs-btn-sm px-2"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <TournamentModal
          tournament={editingItem}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={formError}
        />
      )}
    </div>
  );
}
