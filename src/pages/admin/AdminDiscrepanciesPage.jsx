import { useCallback, useEffect, useState } from "react";
import {
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  SlidersHorizontal,
  Flag,
  ShieldAlert,
} from "lucide-react";
import api from "../../services/api";
import { getRaceExecutionStatus } from "../../api/admin";

const TABS = [
  { key: "All", label: "Tất cả" },
  { key: "Pending", label: "Chờ xử lý" },
  { key: "Resolved", label: "Đã xử lý" },
  { key: "Dismissed", label: "Bác bỏ" },
];

const TYPE_LABELS = {
  PredictionMismatch: "Sai lệch dự đoán",
  ResultMismatch: "Sai lệch kết quả",
  PointCalculation: "Lỗi tính điểm",
  Other: "Khác",
};

const TYPE_COLORS = {
  PredictionMismatch: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ResultMismatch: "bg-red-500/10 text-red-400 border-red-500/20",
  PointCalculation: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Other: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const STATUS_BADGE = {
  Pending: "bg-yellow-500/20 text-yellow-400 border border-yellow-700",
  Resolved: "bg-emerald-500/20 text-emerald-400 border border-emerald-700",
  Dismissed: "bg-gray-500/20 text-gray-400 border border-gray-700",
};

const STATUS_LABELS = {
  Pending: "Chờ xử lý",
  Resolved: "Đã xử lý",
  Dismissed: "Bác bỏ",
};

function formatDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function DiscrepancyDetailModal({ item, onClose, onResolve }) {
  const [resolution, setResolution] = useState("");
  const [action, setAction] = useState("Dismissed");
  const [adjustedPoints, setAdjustedPoints] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!item) return null;

  const handleSubmit = async () => {
    if (!resolution.trim()) {
      setError("Vui lòng nhập nội dung xử lý.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onResolve(item.discrepancyId, {
        resolution: resolution.trim(),
        action,
        adjustedPointsAwarded: action === "AdjustPoints" ? parseInt(adjustedPoints) : 0,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xử lý thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#1a2035] rounded-2xl w-full max-w-2xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Flag className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-on-surface">Chi tiết sai lệch</h2>
              <p className="text-xs text-on-surface-variant">ID: #{item.discrepancyId}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          {/* Status + Type */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGE[item.status] || "gs-badge-neutral"}`}>
              {STATUS_LABELS[item.status] || item.status}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${TYPE_COLORS[item.type] || TYPE_COLORS.Other}`}>
              {TYPE_LABELS[item.type] || item.type}
            </span>
          </div>

          {/* Race info */}
          <div className="bg-surface-container-lowest rounded-xl p-4 border border-white/5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Cuộc đua</p>
            <p className="text-sm font-semibold text-on-surface">{item.raceName || "—"}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">{formatDate(item.raceDate)}</p>
          </div>

          {/* Reporter */}
          <div className="bg-surface-container-lowest rounded-xl p-4 border border-white/5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-2">Người báo cáo</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-outline-variant/50 flex items-center justify-center text-xs font-bold text-on-surface-variant">
                {(item.reportedByName || "U").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-on-surface">{item.reportedByName || "—"}</p>
                <p className="text-xs text-on-surface-variant">{item.reportedByEmail || ""} · {item.reportedByRole}</p>
              </div>
              <p className="ml-auto text-xs text-on-surface-variant">{formatDate(item.reportedAt)}</p>
            </div>
          </div>

          {/* Description */}
          <div className="bg-surface-container-lowest rounded-xl p-4 border border-white/5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-2">Mô tả</p>
            <p className="text-sm text-on-surface leading-relaxed">{item.description || "—"}</p>
          </div>

          {/* Prediction vs Official */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-container-lowest rounded-xl p-4 border border-blue-500/20">
              <p className="text-xs text-blue-400 uppercase tracking-wider mb-2">Dự đoán của người dùng</p>
              <p className="text-sm font-semibold text-on-surface">
                Hạng {item.userPrediction?.predictedPosition || "—"}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Thời gian: {item.userPrediction?.predictedTime || "—"}
              </p>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-4 border border-emerald-500/20">
              <p className="text-xs text-emerald-400 uppercase tracking-wider mb-2">Kết quả chính thức</p>
              <p className="text-sm font-semibold text-on-surface">
                Hạng {item.officialResult?.officialPosition || "—"}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Thời gian: {item.officialResult?.officialTime || "—"}
              </p>
            </div>
          </div>

          {/* Resolution */}
          {item.status !== "Pending" && item.resolution && (
            <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
              <p className="text-xs text-emerald-400 uppercase tracking-wider mb-2">Kết quả xử lý</p>
              <p className="text-sm text-emerald-300">{item.resolution}</p>
              {item.adjustedPointsAwarded !== null && (
                <p className="text-xs text-emerald-400 mt-1">
                  Điểm đã điều chỉnh: {item.adjustedPointsAwarded > 0 ? "+" : ""}{item.adjustedPointsAwarded}
                </p>
              )}
              <p className="text-xs text-emerald-500/60 mt-1">
                Xử lý bởi {item.resolvedByAdminName} · {formatDate(item.resolvedAt)}
              </p>
            </div>
          )}

          {/* Resolution form (Pending only) */}
          {item.status === "Pending" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-on-surface-variant uppercase tracking-wider mb-1 block">Hành động</label>
                <div className="flex gap-2">
                  {["Dismissed", "AdjustPoints"].map((a) => (
                    <button
                      key={a}
                      onClick={() => setAction(a)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        action === a
                          ? a === "Dismissed"
                            ? "bg-gray-500/20 text-gray-300 border-gray-500/40"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-surface-container-lowest text-on-surface-variant border-outline-variant/40 hover:border-outline-variant/60"
                      }`}
                    >
                      {a === "Dismissed" ? "Bác bỏ" : "Điều chỉnh điểm"}
                    </button>
                  ))}
                </div>
              </div>
              {action === "AdjustPoints" && (
                <div>
                  <label className="text-xs text-on-surface-variant uppercase tracking-wider mb-1 block">Điểm điều chỉnh</label>
                  <input
                    type="number"
                    value={adjustedPoints}
                    onChange={(e) => setAdjustedPoints(parseInt(e.target.value) || 0)}
                    placeholder="VD: 500"
                    className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all"
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-on-surface-variant uppercase tracking-wider mb-1 block">Nội dung xử lý *</label>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Mô tả cách xử lý sai lệch này..."
                  rows={3}
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all resize-none"
                />
              </div>
              {error && (
                <p className="text-red-400 text-xs flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {item.status === "Pending" && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 shrink-0">
            <button onClick={onClose} className="gs-btn gs-btn-ghost gs-btn-sm">Hủy</button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="gs-btn gs-btn-primary gs-btn-sm flex items-center gap-1.5"
            >
              {submitting ? (
                <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
              Xác nhận xử lý
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const PAGE_SIZE = 15;

function getPageNumbers(current, total) {
  const pages = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= 2) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "gap") {
      pages.push("gap");
    }
  }
  return pages;
}

export default function AdminDiscrepanciesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  // Conflict notifications for referee disputes
  const [activeConflicts, setActiveConflicts] = useState([]); // [{raceId, raceName, legIndex, legNumber}]
  const [conflictDismissed, setConflictDismissed] = useState({}); // {[raceId]: true}

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // ── Poll for active referee conflicts ──
  useEffect(() => {
    let mounted = true;

    async function pollConflicts() {
      try {
        const res = await api.get('/api/races');
        const races = Array.isArray(res.data) ? res.data : [];
        const inProgressRaces = races.filter(r =>
          r.status === 'InProgress' || r.status === 'Paused'
        );

        const conflicts = [];
        for (const race of inProgressRaces) {
          try {
            const execRes = await getRaceExecutionStatus(race.raceId);
            const exec = execRes?.data ?? execRes;
            const conflictedLegs = exec?.legs?.filter(l => l.status === 'Conflicted') ?? [];
            for (const leg of conflictedLegs) {
              if (!conflictDismissed[race.raceId]) {
                conflicts.push({
                  raceId: race.raceId,
                  raceName: race.name,
                  legIndex: leg.legIndex ?? 0,
                  legNumber: (leg.legIndex ?? 0) + 1,
                });
              }
            }
          } catch { /* skip failed race checks */ }
        }

        if (mounted) setActiveConflicts(conflicts);
      } catch { /* silent */ }
    }

    pollConflicts();
    const interval = setInterval(pollConflicts, 15000);
    return () => { mounted = false; clearInterval(interval); };
  }, [conflictDismissed]);

  const handleDismissConflict = (raceId) => {
    setConflictDismissed(prev => ({ ...prev, [raceId]: true }));
    setActiveConflicts(prev => prev.filter(c => c.raceId !== raceId));
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (activeTab !== "All") params.set("status", activeTab);
      const res = await api.get(`/api/admin/discrepancies?${params}`);
      const data = res.data;
      setItems(Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : []);
      setTotal(data.total || 0);
      setPendingCount(data.pendingCount || 0);
      setResolvedCount(data.resolvedCount || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách sai lệch.");
    } finally {
      setLoading(false);
    }
  }, [page, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery]);

  const handleResolve = async (discrepancyId, payload) => {
    await api.post(`/api/admin/discrepancies/${discrepancyId}/resolve`, payload);
    await fetchData();
    showSuccess("Sai lệch đã được xử lý.");
  };

  const handleExport = () => {
    const headers = ["ID", "Cuộc đua", "Người báo cáo", "Loại", "Trạng thái", "Ngày báo cáo", "Nội dung xử lý"];
    const rows = filtered.map((d) => [
      d.discrepancyId,
      d.raceName || "",
      d.reportedByName || "",
      d.type || "",
      d.status || "",
      formatDate(d.reportedAt),
      d.resolution || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `discrepancies_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = items.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (d.raceName || "").toLowerCase().includes(q) ||
      (d.reportedByName || "").toLowerCase().includes(q) ||
      (d.description || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in-up" style={{ opacity: 0, animationFillMode: "forwards" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Flag className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-on-surface">Xử lý Sai lệch</h1>
              <p className="text-on-surface-variant text-sm">
                Giám sát và xử lý các sai lệch kết quả dự đoán của người dùng.
              </p>
            </div>
          </div>
          <button onClick={fetchData} className="gs-btn gs-btn-ghost gs-btn-sm flex items-center gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
        </div>
        <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 mt-4" />
      </div>

      {/* Referee Conflict Alerts — hiện khi có conflict chưa được xử lý */}
      {activeConflicts.map((conflict) => (
        <div
          key={`${conflict.raceId}-${conflict.legIndex}`}
          className="mt-4 p-4 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-start gap-3 animate-fade-in-up"
        >
          <ShieldAlert size={20} className="text-orange-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-orange-400">
              Trọng tài chênh lệch kết quả
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Cuộc đua <span className="font-semibold text-orange-300">{conflict.raceName}</span> — Leg {conflict.legNumber} đang có conflict cần admin giải quyết.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`/admin/race-execution/${conflict.raceId}`}
              className="px-3 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-xs font-semibold text-orange-300 transition-all"
            >
              Xử lý ngay
            </a>
            <button
              onClick={() => handleDismissConflict(conflict.raceId)}
              className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all"
              title="Bỏ qua"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <div className="gs-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-on-surface font-mono">{pendingCount}</p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Chờ xử lý</p>
          </div>
        </div>
        <div className="gs-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-on-surface font-mono">{resolvedCount}</p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Đã xử lý</p>
          </div>
        </div>
        <div className="gs-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-outline-variant/20 flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-on-surface-variant" />
          </div>
          <div>
            <p className="text-xl font-bold text-on-surface font-mono">{total}</p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Tổng cộng</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 auth-alert auth-alert--error flex items-start gap-3">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{error}</span>
            <button onClick={() => setError("")} className="ml-3 text-xs underline hover:no-underline">Đóng</button>
          </div>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 auth-alert auth-alert--success flex items-start gap-3">
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
          <input
            type="text"
            placeholder="Tìm theo cuộc đua, người báo cáo, nội dung..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant/40 text-sm rounded-xl pl-11 pr-4 py-3 text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
          />
        </div>
        <button onClick={handleExport} disabled={filtered.length === 0} className="gs-btn gs-btn-ghost gs-btn-sm shrink-0 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Xuất CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {TABS.map(({ key, label }) => {
          const cnt = key === "All" ? total : key === "Pending" ? pendingCount : key === "Resolved" ? resolvedCount : filtered.length;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all shrink-0 flex items-center gap-1.5
                ${activeTab === key ? "bg-secondary text-black" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}
            >
              {label}
              <span className={`text-[11px] font-mono rounded-full px-1.5 py-0.5 ${activeTab === key ? "bg-black/20 text-black" : "bg-surface-container-lowest text-on-surface-variant"}`}>
                {cnt}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {activeTab === "Conflicts" ? (
        <div className="space-y-3">
          {activeConflicts.length === 0 ? (
            <div className="gs-card p-12 text-center">
              <ShieldAlert size={40} className="w-10 h-10 text-gray-500 mx-auto mb-4 opacity-60" />
              <h3 className="font-serif text-lg font-bold text-on-surface mb-2">Không có xung đột nào</h3>
              <p className="text-on-surface-variant text-sm">Tất cả các leg đều khớp giữa 2 referees.</p>
            </div>
          ) : activeConflicts.map((conflict) => (
            <div key={`${conflict.raceId}-${conflict.legIndex}`} className="gs-card p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                  <ShieldAlert size={24} className="text-orange-400" />
                </div>
                <div>
                  <p className="font-semibold text-on-surface">{conflict.raceName}</p>
                  <p className="text-sm text-on-surface-variant">Leg {conflict.legNumber} — 2 referees có kết quả khác nhau</p>
                </div>
              </div>
              <a
                href={`/admin/races/${conflict.raceId}/conflict`}
                className="px-4 py-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-sm font-semibold text-orange-300 transition-all"
              >
                Xem & Xử lý
              </a>
            </div>
          ))}
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-on-surface-variant text-sm">Đang tải...</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="gs-card p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-primary/60" />
          </div>
          <h3 className="font-serif text-xl font-bold text-on-surface mb-2">
            {searchQuery ? "Không tìm thấy kết quả" : "Không có sai lệch nào"}
          </h3>
          <p className="text-on-surface-variant text-sm">
            {searchQuery ? `Không có kết quả cho "${searchQuery}"` : "Chưa có báo cáo sai lệch nào."}
          </p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: "8%" }}>ID</th>
                  <th style={{ width: "22%" }}>Cuộc đua</th>
                  <th style={{ width: "18%" }}>Người báo cáo</th>
                  <th style={{ width: "12%" }}>Loại</th>
                  <th style={{ width: "15%" }}>Ngày báo cáo</th>
                  <th style={{ width: "10%" }}>Trạng thái</th>
                  <th style={{ width: "15%" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((d) => (
                  <tr key={d.discrepancyId}>
                    <td className="text-on-surface-variant font-mono text-xs">#{d.discrepancyId}</td>
                    <td>
                      <p className="text-sm font-medium text-on-surface truncate">{d.raceName || "—"}</p>
                      <p className="text-xs text-on-surface-variant">{formatDate(d.raceDate)}</p>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-surface-container-highest border border-outline-variant/50 flex items-center justify-center text-xs font-bold text-on-surface-variant shrink-0">
                          {(d.reportedByName || "U").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-on-surface truncate">{d.reportedByName || "—"}</p>
                          <p className="text-xs text-on-surface-variant truncate">{d.reportedByRole || ""}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${TYPE_COLORS[d.type] || TYPE_COLORS.Other}`}>
                        {TYPE_LABELS[d.type] || d.type || "—"}
                      </span>
                    </td>
                    <td className="text-on-surface-variant font-mono text-xs">{formatDate(d.reportedAt)}</td>
                    <td>
                      <span className={`gs-badge ${STATUS_BADGE[d.status] || "gs-badge-neutral"}`}>
                        {STATUS_LABELS[d.status] || d.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelected(d)}
                          className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {d.status === "Pending" && (
                          <button
                            type="button"
                            onClick={() => setSelected(d)}
                            className="gs-btn gs-btn-primary gs-btn-sm flex items-center gap-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Xử lý
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <p className="text-xs text-on-surface-variant">
                Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} trong {filtered.length} mục
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-40 flex items-center justify-center transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-on-surface" />
                </button>
                {getPageNumbers(page, totalPages).map((p, idx) =>
                  p === "gap" ? (
                    <span key={`gap-${idx}`} className="px-1 text-on-surface-variant text-xs">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-medium transition-all flex items-center justify-center ${
                        page === p ? "bg-secondary text-black" : "bg-surface-container-high hover:bg-surface-container-highest text-on-surface"
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

      {selected && (
        <DiscrepancyDetailModal
          item={selected}
          onClose={() => setSelected(null)}
          onResolve={handleResolve}
        />
      )}
    </div>
  );
}
