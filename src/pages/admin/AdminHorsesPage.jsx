import { useCallback, useEffect, useState } from "react";
import {
  Horse,
  CircleCheck,
  XCircle,
  Undo2,
  Clock,
  Search,
} from "lucide-react";
import {
  getPendingHorses,
  approveHorse,
  rejectHorse,
  revokeHorse,
} from "../../api/admin";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN");
}

const STATUS_BADGE = {
  Approved: "bg-emerald-500/20 text-emerald-400 border border-emerald-700",
  Pending: "bg-yellow-500/20 text-yellow-400 border border-yellow-700",
  Rejected: "bg-red-500/20 text-red-400 border border-red-700",
  Revoked: "bg-gray-500/20 text-gray-400 border border-gray-700",
};

const TABS = ["All", "Pending", "Approved", "Rejected"];

export default function AdminHorsesPage() {
  const [horses, setHorses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Pending");
  const [actionId, setActionId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [revokingId, setRevokingId] = useState(null);
  const [revokeReason, setRevokeReason] = useState("");

  const loadHorses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getPendingHorses();
      setHorses(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách ngựa",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHorses();
  }, [loadHorses]);

  const handleApprove = async (horseId) => {
    setActionId(horseId);
    setError("");
    try {
      await approveHorse(horseId);
      await loadHorses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Duyệt ngựa thất bại");
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (horseId) => {
    setActionId(horseId);
    setError("");
    try {
      await rejectHorse(horseId, rejectReason.trim() || null);
      setRejectingId(null);
      setRejectReason("");
      await loadHorses();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Từ chối ngựa thất bại",
      );
    } finally {
      setActionId(null);
    }
  };

  const handleRevoke = async (horseId) => {
    setActionId(horseId);
    setError("");
    try {
      await revokeHorse(horseId, revokeReason.trim() || null);
      setRevokingId(null);
      setRevokeReason("");
      await loadHorses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thu hồi ngựa thất bại");
    } finally {
      setActionId(null);
    }
  };

  const filtered = horses.filter((h) => {
    const matchTab = activeTab === "All" || h.status === activeTab;
    const matchSearch =
      !searchQuery ||
      (h.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.ownerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.ownerEmail || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.breed || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchTab && matchSearch;
  });

  const pendingCount = horses.filter((h) => h.status === "Pending").length;
  const approvedCount = horses.filter((h) => h.status === "Approved").length;
  const rejectedCount = horses.filter((h) => h.status === "Rejected").length;

  return (
    <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8">
      {/* Header */}
      <div
        className="mb-8 animate-fade-in-up"
        style={{ opacity: 0, animationFillMode: "forwards" }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
            <Horse className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-on-surface">
              Quản lý Ngựa
            </h1>
            <p className="text-on-surface-variant text-sm">
              Phê duyệt và quản lý đơn đăng ký ngựa thi đấu.
            </p>
          </div>
        </div>
        <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-primary to-secondary mt-4" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div
          className="gs-card p-5 flex items-center gap-4 animate-fade-in-up delay-row-1"
          style={{ opacity: 0, animationFillMode: "forwards" }}
        >
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-on-surface font-mono">
              {pendingCount}
            </p>
            <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">
              Chờ duyệt
            </p>
          </div>
        </div>
        <div
          className="gs-card p-5 flex items-center gap-4 animate-fade-in-up delay-row-2"
          style={{ opacity: 0, animationFillMode: "forwards" }}
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CircleCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-on-surface font-mono">
              {approvedCount}
            </p>
            <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">
              Đã duyệt
            </p>
          </div>
        </div>
        <div
          className="gs-card p-5 flex items-center gap-4 animate-fade-in-up delay-row-3"
          style={{ opacity: 0, animationFillMode: "forwards" }}
        >
          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-on-surface font-mono">
              {rejectedCount}
            </p>
            <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">
              Đã từ chối
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error ? (
        <div className="mb-5 auth-alert auth-alert--error flex items-start gap-3">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Search bar */}
      <div className="mb-5 relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
        <input
          type="text"
          placeholder="Tìm theo tên ngựa, chủ ngựa, email hoặc giống..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-surface-container-lowest border border-outline-variant/40 text-sm rounded-xl pl-11 pr-4 py-3 text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
              ${
                activeTab === tab
                  ? "bg-secondary text-black"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-on-surface-variant text-sm">
              Đang tải danh sách...
            </span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="gs-card p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
            <CircleCheck className="w-8 h-8 text-primary/60" />
          </div>
          <h3 className="font-serif text-xl font-bold text-on-surface mb-2">
            {searchQuery ? "Không tìm thấy kết quả" : "Không có ngựa nào"}
          </h3>
          <p className="text-on-surface-variant text-sm">
            {searchQuery
              ? "Thử từ khóa khác."
              : "Không có ngựa trong danh mục này."}
          </p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ngựa</th>
                <th>Giống / Màu</th>
                <th>Chủ ngựa</th>
                <th>Ngày đăng ký</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((horse, i) => (
                <tr
                  key={horse.horseId}
                  className={`animate-fade-in-up delay-row-${(i % 4) + 1}`}
                  style={{ opacity: 0, animationFillMode: "forwards" }}
                >
                  {/* Cột: Ngựa */}
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-surface-container-high overflow-hidden shrink-0">
                        {horse.imageUrl ? (
                          <img
                            src={horse.imageUrl}
                            alt={horse.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-on-surface-variant">
                            🐴
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-on-surface">
                          {horse.name}
                        </p>
                        {horse.status === "Rejected" &&
                          horse.rejectionReason && (
                            <p className="text-red-400 text-xs mt-0.5">
                              Lý do: {horse.rejectionReason}
                            </p>
                          )}
                      </div>
                    </div>
                  </td>

                  {/* Cột: Giống / Màu */}
                  <td className="text-on-surface-variant text-sm">
                    <div>{horse.breed}</div>
                    <div className="text-xs text-on-surface-variant/60">
                      {horse.color}
                    </div>
                  </td>

                  {/* Cột: Chủ ngựa */}
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-surface-container-highest border border-outline-variant/50 flex items-center justify-center text-xs font-bold text-on-surface-variant">
                        {(horse.ownerName || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-on-surface">
                          {horse.ownerName || "—"}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {horse.ownerEmail || ""}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Cột: Ngày */}
                  <td className="text-on-surface-variant font-mono text-xs">
                    {formatDate(horse.registeredAt || horse.createdAt)}
                  </td>

                  {/* Cột: Status */}
                  <td>
                    <span
                      className={`gs-badge ${
                        STATUS_BADGE[horse.status] || "gs-badge-neutral"
                      }`}
                    >
                      {horse.status}
                    </span>
                  </td>

                  {/* Cột: Actions — phân biệt theo status */}
                  <td>
                    {/* ── Pending: đang mở form từ chối ── */}
                    {horse.status === "Pending" &&
                    rejectingId === horse.horseId ? (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) =>
                            setRejectReason(e.target.value)
                          }
                          placeholder="Lý do từ chối (tuỳ chọn)"
                          className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-error transition-all placeholder:text-on-surface-variant/40"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={actionId === horse.horseId}
                            onClick={() => handleReject(horse.horseId)}
                            className="gs-btn gs-btn-danger gs-btn-sm flex items-center gap-1.5"
                          >
                            {actionId === horse.horseId ? (
                              <div className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                            ) : (
                              <CircleCheck className="w-3.5 h-3.5" />
                            )}
                            Xác nhận
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingId(null);
                              setRejectReason("");
                            }}
                            className="gs-btn gs-btn-ghost gs-btn-sm"
                          >
                            Huỷ
                          </button>
                        </div>
                      </div>

                      /* ── Approved: đang mở form thu hồi ── */
                    ) : horse.status === "Approved" &&
                      revokingId === horse.horseId ? (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <input
                          type="text"
                          value={revokeReason}
                          onChange={(e) => setRevokeReason(e.target.value)}
                          placeholder="Lý do thu hồi (tuỳ chọn)"
                          className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-error transition-all placeholder:text-on-surface-variant/40"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={actionId === horse.horseId}
                            onClick={() => handleRevoke(horse.horseId)}
                            className="gs-btn gs-btn-danger gs-btn-sm flex items-center gap-1.5"
                          >
                            {actionId === horse.horseId ? (
                              <div className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            Xác nhận
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRevokingId(null);
                              setRevokeReason("");
                            }}
                            className="gs-btn gs-btn-ghost gs-btn-sm"
                          >
                            Huỷ
                          </button>
                        </div>
                      </div>

                      /* ── Pending: hiện nút Duyệt + Từ chối ── */
                    ) : horse.status === "Pending" ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={actionId === horse.horseId}
                          onClick={() => handleApprove(horse.horseId)}
                          className="gs-btn gs-btn-primary gs-btn-sm flex items-center gap-1.5"
                        >
                          {actionId === horse.horseId ? (
                            <div className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                          ) : (
                            <CircleCheck className="w-3.5 h-3.5" />
                          )}
                          Duyệt
                        </button>
                        <button
                          type="button"
                          disabled={actionId === horse.horseId}
                          onClick={() => setRejectingId(horse.horseId)}
                          className="gs-btn gs-btn-danger gs-btn-sm flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Từ chối
                        </button>
                      </div>

                      /* ── Approved: hiện nút Thu hồi ── */
                    ) : horse.status === "Approved" ? (
                      <button
                        type="button"
                        disabled={actionId === horse.horseId}
                        onClick={() => setRevokingId(horse.horseId)}
                        className="gs-btn gs-btn-ghost gs-btn-sm flex items-center gap-1.5 text-error"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        Thu hồi
                      </button>

                      /* ── Rejected / Revoked: không có action ── */
                    ) : (
                      <span className="text-on-surface-variant text-xs">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
