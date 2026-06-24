import { useCallback, useEffect, useState } from "react";
import {
  CircleCheck,
  XCircle,
  Undo2,
  Clock,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  getPendingHorses,
  approveHorse,
  rejectHorse,
  revokeHorse,
} from "../../api/admin";
import api from "../../services/api";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({ icon, count, label, colorClass, iconBgClass }) {
  return (
    <div className="gs-card p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${iconBgClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-on-surface font-mono">{count}</p>
        <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">
          {label}
        </p>
      </div>
    </div>
  );
}

function HorseDetailModal({ horse, onClose }) {
  if (!horse) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#1a2035] rounded-2xl w-full max-w-2xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-48 bg-gradient-to-br from-[#2a1a3a] to-[#1a2035]">
          {horse.imageUrl ? (
            <img src={horse.imageUrl} alt={horse.name} className="w-full h-full object-cover opacity-60" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">🐴</div>
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-4 left-5 right-5">
            <h2 className="text-2xl font-serif font-bold text-white mb-1">{horse.name}</h2>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              {
                Approved: "bg-emerald-500/20 text-emerald-400 border-emerald-700",
                Pending: "bg-yellow-500/20 text-yellow-400 border-yellow-700",
                Rejected: "bg-red-500/20 text-red-400 border-red-700",
                Revoked: "bg-gray-500/20 text-gray-400 border-gray-700",
              }[horse.status] || "bg-gray-500/20 text-gray-400 border-gray-700"
            }`}>
              {horse.status}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Giống", value: horse.breed || "—" },
              { label: "Màu lông", value: horse.color || "—" },
              { label: "Năm sinh", value: horse.birthYear || "—" },
              { label: "Ngày đăng ký", value: formatDate(horse.registeredAt || horse.createdAt) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surface-container-lowest rounded-xl p-3 border border-white/5">
                <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm font-semibold text-on-surface">{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-4 border border-white/5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-2">Chủ ngựa</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-container-highest border border-outline-variant/50 flex items-center justify-center text-sm font-bold text-on-surface-variant">
                {(horse.ownerName || "U").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-on-surface">{horse.ownerName || "—"}</p>
                <p className="text-xs text-on-surface-variant">{horse.ownerEmail || "—"}</p>
              </div>
            </div>
          </div>

          {(horse.status === "Rejected" || horse.status === "Revoked") && horse.rejectionReason && (
            <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
              <p className="text-xs text-red-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Lý do {horse.status === "Revoked" ? "thu hồi" : "từ chối"}
              </p>
              <p className="text-sm text-red-300">{horse.rejectionReason}</p>
            </div>
          )}

          {horse.description && (
            <div className="bg-surface-container-lowest rounded-xl p-4 border border-white/5">
              <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-2">Mô tả</p>
              <p className="text-sm text-on-surface leading-relaxed">{horse.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { key: "All", label: "Tất cả" },
  { key: "Pending", label: "Chờ duyệt" },
  { key: "Approved", label: "Đã duyệt" },
  { key: "Rejected", label: "Từ chối" },
  { key: "Revoked", label: "Thu hồi" },
];

const PAGE_SIZE = 10;

function getPageNumbers(current, total) {
  const pages = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= 2) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "ellipsis-gap") {
      pages.push("ellipsis-gap");
    }
  }
  return pages;
}

export default function AdminHorsesPage() {
  const [horses, setHorses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Pending");

  const [actionId, setActionId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [revokingId, setRevokingId] = useState(null);
  const [revokeReason, setRevokeReason] = useState("");

  const [selectedHorse, setSelectedHorse] = useState(null);
  const [page, setPage] = useState(1);

  const [exporting, setExporting] = useState(false);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const loadHorses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Gọi 2 API song song:
      // 1) /api/admin/horses/pending → trả horses ở trạng thái "Pending"
      //    Fields: horseId, name, breed, ownerId, ownerName, createdAt
      // 2) /api/horses → trả tất cả horses của tất cả owners
      //    Fields: horseId, name, status, breed (không có ownerName)
      //
      // FE sẽ merge 2 nguồn:
      //   - Horses có trong (1): gán status = "Pending"
      //   - Horses có trong (2): giữ nguyên status từ BE
      //   - Nếu 1 con ngựa vừa ở (1) vừa ở (2), dùng status từ (2) (đã approve rồi thì không còn ở pending nữa)

      const [pendingRes, allRes] = await Promise.allSettled([
        getPendingHorses(),
        api.get("/api/horses"),
      ]);

      // Build map từ allHorses để tra cứu nhanh
      const allHorsesMap = new Map();
      if (allRes.status === "fulfilled") {
        const allHorses = Array.isArray(allRes.value.data) ? allRes.value.data : [];
        allHorses.forEach((h) => {
          allHorsesMap.set(h.horseId, h);
        });
      }

      // Build danh sách horses từ pending list (thêm status = "Pending")
      const pendingHorses = [];
      if (pendingRes.status === "fulfilled") {
        const data = pendingRes.value;
        (Array.isArray(data) ? data : []).forEach((h) => {
          pendingHorses.push({
            ...h,
            status: "Pending",
          });
        });
      }

      // Merge: duyệt allHorses, ghi đè bằng pending nếu trùng horseId
      // pendingHorses giữ nguyên vì đang ở trạng thái Pending
      const allIds = new Set([...allHorsesMap.keys()]);
      const merged = [];

      // Thêm tất cả pending vào merged (những con đang pending)
      const pendingIds = new Set(pendingHorses.map((h) => h.horseId));
      pendingHorses.forEach((h) => merged.push(h));

      // Thêm tất cả allHorses mà KHÔNG có trong pending
      allIds.forEach((id) => {
        if (!pendingIds.has(id)) {
          merged.push(allHorsesMap.get(id));
        }
      });

      setHorses(merged);
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

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery]);

  const handleApprove = async (horseId) => {
    setActionId(horseId);
    setError("");
    try {
      await approveHorse(horseId);
      await loadHorses();
      showSuccess("Ngựa đã được duyệt thành công.");
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
      showSuccess("Ngựa đã bị từ chối.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Từ chối ngựa thất bại");
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
      showSuccess("Ngựa đã bị thu hồi. Các đơn đăng ký đang chờ đã được hủy.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thu hồi ngựa thất bại");
    } finally {
      setActionId(null);
    }
  };

  const handleExport = () => {
    setExporting(true);
    try {
      const headers = ["ID", "Tên", "Giống", "Màu", "Chủ ngựa", "Email", "Trạng thái", "Ngày đăng ký", "Lý do"];
      const rows = filtered.map((h) => [
        h.horseId,
        h.name,
        h.breed || "",
        h.color || "",
        h.ownerName || "",
        h.ownerEmail || "",
        h.status,
        formatDate(h.registeredAt || h.createdAt),
        h.rejectionReason || "",
      ]);
      const csv = [headers, ...rows]
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `horses_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const filtered = horses.filter((h) => {
    const matchTab = activeTab === "All" || h.status === activeTab;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      (h.name || "").toLowerCase().includes(q) ||
      (h.ownerName || "").toLowerCase().includes(q) ||
      (h.ownerEmail || "").toLowerCase().includes(q) ||
      (h.breed || "").toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pendingCount = horses.filter((h) => h.status === "Pending").length;
  const approvedCount = horses.filter((h) => h.status === "Approved").length;
  const rejectedCount = horses.filter((h) => h.status === "Rejected").length;
  const revokedCount = horses.filter((h) => h.status === "Revoked").length;

  return (
    <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8">
      {/* ── Header ───────────────────────────────────────── */}
      <div className="mb-8 animate-fade-in-up" style={{ opacity: 0, animationFillMode: "forwards" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-lg">
              🐴
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-on-surface">
                Quản lý Ngựa
              </h1>
              <p className="text-on-surface-variant text-sm">
                Phê duyệt, quản lý và giám sát đơn đăng ký ngựa thi đấu.
              </p>
            </div>
          </div>
          <button
            onClick={loadHorses}
            className="gs-btn gs-btn-ghost gs-btn-sm flex items-center gap-1.5"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
        </div>
        <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-primary to-secondary mt-4" />
      </div>

      {/* ── Stats ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="gs-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-on-surface font-mono">{pendingCount}</p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Chờ duyệt</p>
          </div>
        </div>
        <div className="gs-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CircleCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-on-surface font-mono">{approvedCount}</p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Đã duyệt</p>
          </div>
        </div>
        <div className="gs-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-on-surface font-mono">{rejectedCount}</p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Từ chối</p>
          </div>
        </div>
        <div className="gs-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-500/10 border border-gray-500/20 flex items-center justify-center shrink-0">
            <Undo2 className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-on-surface font-mono">{revokedCount}</p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Thu hồi</p>
          </div>
        </div>
      </div>

      {/* ── Alerts ───────────────────────────────────────── */}
      {error && (
        <div className="mb-4 auth-alert auth-alert--error flex items-start gap-3">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              className="ml-3 text-xs underline hover:no-underline"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 auth-alert auth-alert--success flex items-start gap-3">
          <CircleCheck className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── Toolbar ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
          <input
            type="text"
            placeholder="Tìm theo tên ngựa, chủ ngựa, email, giống..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant/40 text-sm rounded-xl pl-11 pr-4 py-3 text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
          />
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || filtered.length === 0}
          className="gs-btn gs-btn-ghost gs-btn-sm flex items-center gap-2 shrink-0"
        >
          <Download className="w-4 h-4" />
          Xuất CSV
        </button>
      </div>

      {/* ── Tabs ─────────────────────────────────────────── */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(({ key, label }) => {
          const cnt = key === "All" ? horses.length : horses.filter((h) => h.status === key).length;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all shrink-0 flex items-center gap-1.5
                ${activeTab === key
                  ? "bg-secondary text-black"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                }`}
            >
              {label}
              <span className={`text-[11px] font-mono rounded-full px-1.5 py-0.5 ${
                activeTab === key ? "bg-black/20 text-black" : "bg-surface-container-lowest text-on-surface-variant"
              }`}>
                {cnt}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Table ─────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-on-surface-variant text-sm">Đang tải danh sách ngựa...</span>
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
              ? `Không có kết quả cho "${searchQuery}"`
              : activeTab === "All"
              ? "Chưa có ngựa nào được đăng ký."
              : `Không có ngựa ở trạng thái "${activeTab}".`}
          </p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: "30%" }}>Ngựa</th>
                  <th style={{ width: "14%" }}>Giống / Màu</th>
                  <th style={{ width: "20%" }}>Chủ ngựa</th>
                  <th style={{ width: "12%" }}>Ngày đăng ký</th>
                  <th style={{ width: "10%" }}>Trạng thái</th>
                  <th style={{ width: "14%" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((horse) => (
                  <tr key={horse.horseId}>
                    {/* ── Ngựa ── */}
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-surface-container-high overflow-hidden shrink-0">
                          {horse.imageUrl ? (
                            <img src={horse.imageUrl} alt={horse.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-on-surface-variant">🐴</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-on-surface truncate">{horse.name}</p>
                          {horse.status === "Rejected" && horse.rejectionReason && (
                            <p className="text-red-400 text-xs mt-0.5 truncate flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              {horse.rejectionReason}
                            </p>
                          )}
                          {horse.status === "Revoked" && horse.rejectionReason && (
                            <p className="text-gray-400 text-xs mt-0.5 truncate flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              {horse.rejectionReason}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* ── Giống / Màu ── */}
                    <td>
                      <span className="text-sm text-on-surface">{horse.breed || "—"}</span>
                      <br />
                      <span className="text-xs text-on-surface-variant">{horse.color || "—"}</span>
                    </td>

                    {/* ── Chủ ngựa ── */}
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-surface-container-highest border border-outline-variant/50 flex items-center justify-center text-xs font-bold text-on-surface-variant shrink-0">
                          {(horse.ownerName || "U").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-on-surface truncate">{horse.ownerName || "—"}</p>
                          <p className="text-xs text-on-surface-variant truncate">{horse.ownerEmail || ""}</p>
                        </div>
                      </div>
                    </td>

                    {/* ── Ngày ── */}
                    <td className="text-on-surface-variant font-mono text-xs">
                      {formatDate(horse.registeredAt || horse.createdAt)}
                    </td>

                    {/* ── Status ── */}
                    <td>
                      <span className={`gs-badge ${{
                        Approved: "bg-emerald-500/20 text-emerald-400 border border-emerald-700",
                        Pending: "bg-yellow-500/20 text-yellow-400 border border-yellow-700",
                        Rejected: "bg-red-500/20 text-red-400 border border-red-700",
                        Revoked: "bg-gray-500/20 text-gray-400 border border-gray-700",
                      }[horse.status] || "gs-badge-neutral"}`}>
                        {horse.status === "Revoked" ? "Thu hồi" : horse.status}
                      </span>
                    </td>

                    {/* ── Actions ── */}
                    <td>
                      <div className="flex items-center gap-1.5">
                        {/* Xem chi tiết */}
                        <button
                          type="button"
                          onClick={() => setSelectedHorse(horse)}
                          className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Pending → Duyệt / Từ chối */}
                        {horse.status === "Pending" && rejectingId !== horse.horseId ? (
                          <>
                            <button
                              type="button"
                              disabled={actionId === horse.horseId}
                              onClick={() => handleApprove(horse.horseId)}
                              className="gs-btn gs-btn-primary gs-btn-sm flex items-center gap-1"
                              title="Duyệt ngựa"
                            >
                              {actionId === horse.horseId ? (
                                <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                              ) : (
                                <CircleCheck className="w-3.5 h-3.5" />
                              )}
                              Duyệt
                            </button>
                            <button
                              type="button"
                              disabled={actionId === horse.horseId}
                              onClick={() => setRejectingId(horse.horseId)}
                              className="gs-btn gs-btn-ghost gs-btn-sm text-red-400 hover:text-red-300"
                              title="Từ chối"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : null}

                        {/* Pending → đang mở form từ chối */}
                        {horse.status === "Pending" && rejectingId === horse.horseId ? (
                          <div className="flex flex-col gap-1.5 w-52">
                            <input
                              type="text"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Lý do từ chối (tuỳ chọn)"
                              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-error transition-all placeholder:text-on-surface-variant/40"
                              autoFocus
                            />
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                disabled={actionId === horse.horseId}
                                onClick={() => handleReject(horse.horseId)}
                                className="gs-btn gs-btn-danger gs-btn-xs flex items-center gap-1 flex-1 justify-center"
                              >
                                {actionId === horse.horseId ? (
                                  <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                  <CircleCheck className="w-3 h-3" />
                                )}
                                Xác nhận
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingId(null);
                                  setRejectReason("");
                                }}
                                className="gs-btn gs-btn-ghost gs-btn-xs"
                              >
                                Huỷ
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {/* Approved → Thu hồi */}
                        {horse.status === "Approved" && revokingId !== horse.horseId ? (
                          <button
                            type="button"
                            disabled={actionId === horse.horseId}
                            onClick={() => setRevokingId(horse.horseId)}
                            className="gs-btn gs-btn-ghost gs-btn-sm text-gray-400 hover:text-red-400 flex items-center gap-1"
                            title="Thu hồi ngựa"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                            Thu hồi
                          </button>
                        ) : null}

                        {/* Approved → đang mở form thu hồi */}
                        {horse.status === "Approved" && revokingId === horse.horseId ? (
                          <div className="flex flex-col gap-1.5 w-52">
                            <input
                              type="text"
                              value={revokeReason}
                              onChange={(e) => setRevokeReason(e.target.value)}
                              placeholder="Lý do thu hồi (tuỳ chọn)"
                              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-error transition-all placeholder:text-on-surface-variant/40"
                              autoFocus
                            />
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                disabled={actionId === horse.horseId}
                                onClick={() => handleRevoke(horse.horseId)}
                                className="gs-btn gs-btn-danger gs-btn-xs flex items-center gap-1 flex-1 justify-center"
                              >
                                {actionId === horse.horseId ? (
                                  <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                  <XCircle className="w-3 h-3" />
                                )}
                                Xác nhận
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRevokingId(null);
                                  setRevokeReason("");
                                }}
                                className="gs-btn gs-btn-ghost gs-btn-xs"
                              >
                                Huỷ
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {/* Rejected / Revoked → không có action */}
                        {(horse.status === "Rejected" || horse.status === "Revoked") && (
                          <span className="text-on-surface-variant text-xs px-1">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <p className="text-xs text-on-surface-variant">
                Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} trong {filtered.length} ngựa
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-40 flex items-center justify-center transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-on-surface" />
                </button>
                {getPageNumbers(page, totalPages).map((p) =>
                  p === "ellipsis-gap" ? (
                    <span key="ellipsis" className="px-1 text-on-surface-variant text-xs">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-medium transition-all flex items-center justify-center ${
                        page === p
                          ? "bg-secondary text-black"
                          : "bg-surface-container-high hover:bg-surface-container-highest text-on-surface"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-40 flex items-center justify-center transition-all"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-on-surface" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Horse Detail Modal ── */}
      {selectedHorse && (
        <HorseDetailModal horse={selectedHorse} onClose={() => setSelectedHorse(null)} />
      )}
    </div>
  );
}
