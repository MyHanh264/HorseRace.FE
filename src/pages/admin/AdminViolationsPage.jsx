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
  ShieldAlert,
  Ban,
  Minus,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import api from "../../services/api";

const SEVERITY_CONFIG = {
  Warning: { color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", label: "Cảnh cáo", icon: AlertTriangle },
  Fine: { color: "bg-orange-500/10 text-orange-400 border-orange-500/20", label: "Phạt tiền", icon: Minus },
  Suspension: { color: "bg-red-500/10 text-red-400 border-red-500/20", label: "Đình chỉ", icon: Ban },
  Disqualification: { color: "bg-purple-500/10 text-purple-400 border-purple-500/20", label: "Hủy kết quả", icon: XCircle },
};

const VIOLATION_TYPES = {
  FalseStart: "Khởi động sớm",
  DangerousRiding: "Cưỡi ngựa nguy hiểm",
  WhipViolation: "Vi phạm roi",
  Obstruction: "Cản đường đối thủ",
  DopingViolation: "Vi phạm doping",
  EquipmentViolation: "Vi phạm trang bị",
  Other: "Khác",
};

const TABS = [
  { key: "All", label: "Tất cả" },
  { key: "Pending", label: "Chờ xử lý" },
  { key: "Resolved", label: "Đã xử lý" },
  { key: "Appealed", label: "Khiếu nại" },
];

const PAGE_SIZE = 15;

function formatDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function ViolationDetailModal({ item, onClose }) {
  if (!item) return null;
  const sev = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.Other;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#1a2035] rounded-2xl w-full max-w-2xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-on-surface">Chi tiết vi phạm</h2>
              <p className="text-xs text-on-surface-variant">ID: #{item.violationId}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${sev.color}`}>
              <sev.icon className="w-3 h-3 inline mr-1" />
              {sev.label}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${item.status === "Resolved"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : item.status === "Appealed"
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"}`}>
              {item.status === "Resolved" ? "Đã xử lý" : item.status === "Appealed" ? "Khiếu nại" : "Chờ xử lý"}
            </span>
          </div>

          {/* Race */}
          <div className="bg-surface-container-lowest rounded-xl p-4 border border-white/5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Cuộc đua</p>
            <p className="text-sm font-semibold text-on-surface">{item.raceName || "—"}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">{formatDate(item.raceDate)}</p>
          </div>

          {/* Violator */}
          <div className="bg-surface-container-lowest rounded-xl p-4 border border-white/5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-2">Người vi phạm</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-container-highest border border-outline-variant/50 flex items-center justify-center text-sm font-bold text-on-surface-variant">
                {(item.violatorName || "U").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-on-surface">{item.violatorName || "—"}</p>
                <p className="text-xs text-on-surface-variant">{item.violatorRole || ""}</p>
              </div>
            </div>
          </div>

          {/* Type + Description */}
          <div className="bg-surface-container-lowest rounded-xl p-4 border border-white/5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-2">Loại vi phạm</p>
            <p className="text-sm font-semibold text-on-surface mb-3">
              {VIOLATION_TYPES[item.violationType] || item.violationType || "—"}
            </p>
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-2">Mô tả</p>
            <p className="text-sm text-on-surface leading-relaxed">{item.description || "—"}</p>
          </div>

          {/* Penalty */}
          {(item.fineAmount || item.suspensionDays || item.penalty) && (
            <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/20">
              <p className="text-xs text-red-400 uppercase tracking-wider mb-2">Hình phạt</p>
              <div className="space-y-2">
                {item.fineAmount && (
                  <p className="text-sm text-red-300">
                    <span className="text-red-500 font-semibold">
                      {Number(item.fineAmount).toLocaleString("vi-VN")}
                    </span>{" "}
                    VNĐ phạt tiền
                  </p>
                )}
                {item.suspensionDays && (
                  <p className="text-sm text-red-300">
                    Đình chỉ <span className="text-red-400 font-semibold">{item.suspensionDays}</span> ngày
                  </p>
                )}
                {item.penalty && (
                  <p className="text-sm text-red-300 leading-relaxed">{item.penalty}</p>
                )}
              </div>
            </div>
          )}

          {/* Issued by */}
          <div className="bg-surface-container-lowest rounded-xl p-4 border border-white/5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-2">Người lập biên bản</p>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-on-surface">{item.issuedByRefereeName || "—"}</p>
              <p className="text-xs text-on-surface-variant">{formatDate(item.issuedAt)}</p>
            </div>
          </div>

          {/* Resolution */}
          {item.status === "Resolved" && item.penalty && (
            <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
              <p className="text-xs text-emerald-400 uppercase tracking-wider mb-2">Kết quả xử lý</p>
              <p className="text-sm text-emerald-300 leading-relaxed">{item.penalty}</p>
              <p className="text-xs text-emerald-500/60 mt-1">
                {item.resolvedByAdminName ? `Xử lý bởi ${item.resolvedByAdminName}` : ""} · {formatDate(item.resolvedAt)}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t border-white/10 shrink-0">
          <button onClick={onClose} className="gs-btn gs-btn-ghost gs-btn-sm">Đóng</button>
        </div>
      </div>
    </div>
  );
}

function getPageNumbers(current, total) {
  const pages = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= 2) pages.push(i);
    else if (pages[pages.length - 1] !== "gap") pages.push("gap");
  }
  return pages;
}

export default function AdminViolationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (activeTab !== "All") params.set("status", activeTab);
      const res = await api.get(`/api/admin/violations?${params}`);
      const data = res.data;
      setItems(Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : []);
      setTotal(data.total || 0);
      setPendingCount(data.pendingCount || 0);
      setResolvedCount(data.resolvedCount || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách vi phạm.");
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

  const handleExport = () => {
    const headers = ["ID", "Cuộc đua", "Người vi phạm", "Vai trò", "Loại vi phạm", "Mức độ", "Phạt tiền", "Đình chỉ (ngày)", "Trạng thái", "Ngày lập"];
    const rows = filtered.map((v) => [
      v.violationId, v.raceName || "", v.violatorName || "", v.violatorRole || "",
      VIOLATION_TYPES[v.violationType] || v.violationType || "",
      v.severity || "", v.fineAmount || "", v.suspensionDays || "", v.status || "",
      formatDate(v.issuedAt),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `violations_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = items.filter((v) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (v.raceName || "").toLowerCase().includes(q) ||
      (v.violatorName || "").toLowerCase().includes(q) ||
      (VIOLATION_TYPES[v.violationType] || "").toLowerCase().includes(q) ||
      (v.description || "").toLowerCase().includes(q)
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
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-on-surface">Vi phạm kỷ luật</h1>
              <p className="text-on-surface-variant text-sm">
                Giám sát và quản lý các vi phạm trong quá trình thi đấu.
              </p>
            </div>
          </div>
          <button onClick={fetchData} className="gs-btn gs-btn-ghost gs-btn-sm flex items-center gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
        </div>
        <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-red-500 to-orange-500 mt-4" />
      </div>

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

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
          <input
            type="text"
            placeholder="Tìm theo cuộc đua, người vi phạm, loại vi phạm..."
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
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-on-surface-variant text-sm">Đang tải...</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="gs-card p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-primary/60" />
          </div>
          <h3 className="font-serif text-xl font-bold text-on-surface mb-2">
            {searchQuery ? "Không tìm thấy kết quả" : "Không có vi phạm nào"}
          </h3>
          <p className="text-on-surface-variant text-sm">
            {searchQuery ? `Không có kết quả cho "${searchQuery}"` : "Chưa có biên bản vi phạm nào."}
          </p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: "8%" }}>ID</th>
                  <th style={{ width: "20%" }}>Cuộc đua</th>
                  <th style={{ width: "17%" }}>Người vi phạm</th>
                  <th style={{ width: "15%" }}>Loại vi phạm</th>
                  <th style={{ width: "12%" }}>Mức độ</th>
                  <th style={{ width: "13%" }}>Ngày lập</th>
                  <th style={{ width: "15%" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((v) => {
                  const sev = SEVERITY_CONFIG[v.severity] || { color: "bg-gray-500/10 text-gray-400 border-gray-500/20", label: v.severity || "—" };
                  const SevIcon = sev.icon || Minus;
                  return (
                    <tr key={v.violationId}>
                      <td className="text-on-surface-variant font-mono text-xs">#{v.violationId}</td>
                      <td>
                        <p className="text-sm font-medium text-on-surface truncate">{v.raceName || "—"}</p>
                        <p className="text-xs text-on-surface-variant">{formatDate(v.raceDate)}</p>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-surface-container-highest border border-outline-variant/50 flex items-center justify-center text-xs font-bold text-on-surface-variant shrink-0">
                            {(v.violatorName || "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-on-surface truncate">{v.violatorName || "—"}</p>
                            <p className="text-xs text-on-surface-variant truncate">{v.violatorRole || ""}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-sm text-on-surface">
                          {VIOLATION_TYPES[v.violationType] || v.violationType || "—"}
                        </span>
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${sev.color}`}>
                          <SevIcon className="w-3 h-3 inline mr-0.5" />
                          {sev.label}
                        </span>
                      </td>
                      <td className="text-on-surface-variant font-mono text-xs">{formatDate(v.issuedAt)}</td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelected(v)}
                            className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {v.fineAmount && (
                            <span className="text-xs text-orange-400 font-mono" title="Phạt tiền">
                              {Number(v.fineAmount).toLocaleString("vi-VN")}
                            </span>
                          )}
                          {v.suspensionDays && (
                            <span className="text-xs text-red-400 font-mono" title="Đình chỉ">
                              {v.suspensionDays}d
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      {selected && <ViolationDetailModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
