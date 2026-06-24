import { useCallback, useEffect, useState } from "react";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Minus,
  TrendingUp,
  TrendingDown,
  Coins,
  User,
  Eye,
  X,
  CheckCircle,
  XCircle,
} from "lucide-react";
import api from "../../services/api";

const TRANSACTION_TYPE_CONFIG = {
  Credit: { color: "bg-emerald-500/10 text-emerald-400", label: "Cộng", icon: Plus },
  Debit: { color: "bg-red-500/10 text-red-400", label: "Trừ", icon: Minus },
  Bonus: { color: "bg-blue-500/10 text-blue-400", label: "Thưởng", icon: TrendingUp },
  Fine: { color: "bg-orange-500/10 text-orange-400", label: "Phạt", icon: TrendingDown },
};

const TABS = [
  { key: "Balances", label: "Số dư" },
  { key: "Transactions", label: "Lịch sử giao dịch" },
];

const PAGE_SIZE_BALANCES = 20;
const PAGE_SIZE_TRANSACTIONS = 25;

function formatDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function AdjustPointsModal({ onClose }) {
  const [balances, setBalances] = useState([]);
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchUser, setSearchUser] = useState("");
  const [type, setType] = useState("Credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api.get("/api/admin/points/balances?pageSize=50").then((r) => {
      setBalances(Array.isArray(r.data.items) ? r.data.items : []);
    }).catch(() => {}).finally(() => setLoadingBalances(false));
  }, []);

  const filtered = balances.filter((b) => {
    if (!searchUser) return true;
    const q = searchUser.toLowerCase();
    return (
      (b.userName || "").toLowerCase().includes(q) ||
      (b.userEmail || "").toLowerCase().includes(q)
    );
  });

  const handleSubmit = async () => {
    if (!selectedUser) { setError("Vui lòng chọn người dùng."); return; }
    const amt = parseInt(amount);
    if (!amt || amt <= 0) { setError("Số điểm phải lớn hơn 0."); return; }
    if (!reason.trim()) { setError("Vui lòng nhập lý do."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await api.post("/api/admin/points/adjust", {
        userId: selectedUser.userId,
        amount: amt,
        type,
        reason: reason.trim(),
      });
      setSuccess(`Đã ${type === "Credit" || type === "Bonus" ? "cộng" : "trừ"} ${amt.toLocaleString("vi-VN")} điểm cho ${selectedUser.userName}. Số dư mới: ${(res.data.newBalance || 0).toLocaleString("vi-VN")}`);
      setSelectedUser(null);
      setAmount("");
      setReason("");
      setType("Credit");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Điều chỉnh thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#1a2035] rounded-2xl w-full max-w-lg border border-white/10 shadow-2xl animate-fade-in-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Coins className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-on-surface">Điều chỉnh điểm</h2>
              <p className="text-xs text-on-surface-variant">Thêm hoặc trừ điểm thủ công</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          {success && (
            <div className="auth-alert auth-alert--success flex items-start gap-2 text-sm">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Select user */}
          {!selectedUser ? (
            <div>
              <label className="text-xs text-on-surface-variant uppercase tracking-wider mb-1.5 block">Chọn người dùng *</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc email..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg pl-9 pr-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all"
                />
              </div>
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-white/5 space-y-1">
                {loadingBalances ? (
                  <div className="p-4 text-center text-xs text-on-surface-variant">Đang tải...</div>
                ) : filtered.length === 0 ? (
                  <div className="p-4 text-center text-xs text-on-surface-variant">Không tìm thấy</div>
                ) : (
                  filtered.map((b) => (
                    <button
                      key={b.userId}
                      onClick={() => { setSelectedUser(b); setSuccess(""); }}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-surface-container-high transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-surface-container-highest border border-outline-variant/50 flex items-center justify-center text-xs font-bold text-on-surface-variant">
                          {(b.userName || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-on-surface">{b.userName}</p>
                          <p className="text-xs text-on-surface-variant">{b.userEmail}</p>
                        </div>
                      </div>
                      <span className="text-sm font-mono font-bold text-blue-400">
                        {b.currentBalance.toLocaleString("vi-VN")}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-xl p-3 border border-secondary/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-outline-variant/50 flex items-center justify-center text-xs font-bold text-on-surface-variant">
                  {(selectedUser.userName || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-on-surface">{selectedUser.userName}</p>
                  <p className="text-xs text-on-surface-variant">Số dư: {selectedUser.currentBalance.toLocaleString("vi-VN")} điểm</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-xs text-red-400 hover:text-red-300 underline">
                Đổi
              </button>
            </div>
          )}

          {/* Type */}
          <div>
            <label className="text-xs text-on-surface-variant uppercase tracking-wider mb-1.5 block">Loại giao dịch *</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TRANSACTION_TYPE_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setType(key)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all flex items-center gap-2 ${
                      type === key
                        ? `${cfg.color} border-current`
                        : "bg-surface-container-lowest text-on-surface-variant border-outline-variant/40 hover:border-outline-variant/60"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs text-on-surface-variant uppercase tracking-wider mb-1.5 block">Số điểm *</label>
            <div className="relative">
              <Coins className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="VD: 500"
                min="1"
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg pl-9 pr-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs text-on-surface-variant uppercase tracking-wider mb-1.5 block">Lý do *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Thưởng khi giới thiệu bạn bè"
              rows={2}
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all resize-none"
            />
          </div>

          {error && (
            <div className="auth-alert auth-alert--error flex items-start gap-2 text-sm">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 shrink-0">
          <button onClick={onClose} className="gs-btn gs-btn-ghost gs-btn-sm">Đóng</button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !selectedUser}
            className="gs-btn gs-btn-primary gs-btn-sm flex items-center gap-1.5"
          >
            {submitting ? (
              <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <Coins className="w-3.5 h-3.5" />
            )}
            Xác nhận
          </button>
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

export default function AdminPointManagementPage() {
  const [activeTab, setActiveTab] = useState("Balances");
  const [searchQuery, setSearchQuery] = useState("");
  const [balances, setBalances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [errorBalances, setErrorBalances] = useState("");
  const [errorTransactions, setErrorTransactions] = useState("");
  const [pageBalances, setPageBalances] = useState(1);
  const [pageTransactions, setPageTransactions] = useState(1);
  const [totalBalances, setTotalBalances] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [showAdjust, setShowAdjust] = useState(false);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("All");

  const fetchBalances = useCallback(async () => {
    setLoadingBalances(true);
    setErrorBalances("");
    try {
      const params = new URLSearchParams({ page: String(pageBalances), pageSize: String(PAGE_SIZE_BALANCES) });
      if (searchQuery) params.set("search", searchQuery);
      const res = await api.get(`/api/admin/points/balances?${params}`);
      const data = res.data;
      setBalances(Array.isArray(data.items) ? data.items : []);
      setTotalBalances(data.total || 0);
    } catch (err) {
      setErrorBalances(err instanceof Error ? err.message : "Không tải được số dư.");
    } finally {
      setLoadingBalances(false);
    }
  }, [pageBalances, searchQuery]);

  const fetchTransactions = useCallback(async () => {
    setLoadingTransactions(true);
    setErrorTransactions("");
    try {
      const params = new URLSearchParams({ page: String(pageTransactions), pageSize: String(PAGE_SIZE_TRANSACTIONS) });
      if (searchQuery) params.set("search", searchQuery);
      if (transactionTypeFilter !== "All") params.set("type", transactionTypeFilter);
      const res = await api.get(`/api/admin/points/transactions?${params}`);
      const data = res.data;
      setTransactions(Array.isArray(data.items) ? data.items : []);
      setTotalTransactions(data.total || 0);
    } catch (err) {
      setErrorTransactions(err instanceof Error ? err.message : "Không tải được lịch sử giao dịch.");
    } finally {
      setLoadingTransactions(false);
    }
  }, [pageTransactions, searchQuery, transactionTypeFilter]);

  useEffect(() => { fetchBalances(); }, [fetchBalances]);
  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  useEffect(() => {
    setPageBalances(1);
    setPageTransactions(1);
  }, [searchQuery, transactionTypeFilter]);

  const handleExportBalances = () => {
    const headers = ["ID", "Tên", "Email", "Số dư hiện tại", "Tổng nạp", "Tổng tiêu", "Lần cuối"];
    const rows = balances.map((b) => [
      b.userId, b.userName || "", b.userEmail || "",
      b.currentBalance, b.totalEarned, b.totalSpent,
      formatDate(b.lastTransactionAt),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `point_balances_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleExportTransactions = () => {
    const headers = ["ID", "Người dùng", "Email", "Loại", "Số điểm", "Số dư sau", "Lý do", "Ngày"];
    const rows = transactions.map((t) => [
      t.transactionId, t.userName || "", t.userEmail || "",
      t.type, t.amount, t.balanceAfter, t.reason || "", formatDate(t.createdAt),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `point_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const totalPoints = balances.reduce((s, b) => s + (b.currentBalance || 0), 0);
  const totalEarned = balances.reduce((s, b) => s + (b.totalEarned || 0), 0);
  const totalSpent = balances.reduce((s, b) => s + (b.totalSpent || 0), 0);

  const totalPagesBal = Math.max(1, Math.ceil(totalBalances / PAGE_SIZE_BALANCES));
  const paginatedBalances = balances;
  const totalPagesTx = Math.max(1, Math.ceil(totalTransactions / PAGE_SIZE_TRANSACTIONS));
  const paginatedTransactions = transactions;

  return (
    <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in-up" style={{ opacity: 0, animationFillMode: "forwards" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Coins className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-on-surface">Quản lý Điểm</h1>
              <p className="text-on-surface-variant text-sm">
                Giám sát số dư và lịch sử giao dịch điểm của người dùng.
              </p>
            </div>
          </div>
          <button onClick={() => setShowAdjust(true)} className="gs-btn gs-btn-primary gs-btn-sm flex items-center gap-1.5">
            <Coins className="w-4 h-4" />
            Điều chỉnh điểm
          </button>
        </div>
        <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 mt-4" />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="gs-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Coins className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-on-surface font-mono">{totalPoints.toLocaleString("vi-VN")}</p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Tổng điểm lưu hành</p>
          </div>
        </div>
        <div className="gs-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-emerald-400 font-mono">{totalEarned.toLocaleString("vi-VN")}</p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Tổng nạp vào</p>
          </div>
        </div>
        <div className="gs-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-red-400 font-mono">{totalSpent.toLocaleString("vi-VN")}</p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Tổng đã tiêu</p>
          </div>
        </div>
        <div className="gs-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-outline-variant/20 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-on-surface-variant" />
          </div>
          <div>
            <p className="text-lg font-bold text-on-surface font-mono">{totalBalances.toLocaleString("vi-VN")}</p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Người dùng</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
          <input
            type="text"
            placeholder={activeTab === "Balances" ? "Tìm theo tên hoặc email..." : "Tìm theo tên, email, lý do..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant/40 text-sm rounded-xl pl-11 pr-4 py-3 text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
          />
        </div>
        <button
          onClick={activeTab === "Balances" ? fetchBalances : fetchTransactions}
          className="gs-btn gs-btn-ghost gs-btn-sm shrink-0 flex items-center gap-1.5"
        >
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-5">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5
              ${activeTab === key ? "bg-secondary text-black" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── BALANCES TAB ── */}
      {activeTab === "Balances" && (
        <>
          {errorBalances && (
            <div className="mb-4 auth-alert auth-alert--error flex items-start gap-3">
              <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{errorBalances}</span>
                <button onClick={() => setErrorBalances("")} className="ml-3 text-xs underline">Đóng</button>
              </div>
            </div>
          )}

          {loadingBalances ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="text-on-surface-variant text-sm">Đang tải...</span>
              </div>
            </div>
          ) : balances.length === 0 ? (
            <div className="gs-card p-16 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
                <Coins className="w-8 h-8 text-primary/60" />
              </div>
              <h3 className="font-serif text-xl font-bold text-on-surface mb-2">
                {searchQuery ? "Không tìm thấy" : "Chưa có dữ liệu số dư"}
              </h3>
            </div>
          ) : (
            <>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: "25%" }}>Người dùng</th>
                      <th style={{ width: "20%" }}>Email</th>
                      <th style={{ width: "14%" }}>Số dư</th>
                      <th style={{ width: "13%" }}>Tổng nạp</th>
                      <th style={{ width: "13%" }}>Tổng tiêu</th>
                      <th style={{ width: "15%" }}>Lần cuối giao dịch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBalances.map((b) => (
                      <tr key={b.userId}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-outline-variant/50 flex items-center justify-center text-xs font-bold text-on-surface-variant shrink-0">
                              {(b.userName || "U").charAt(0).toUpperCase()}
                            </div>
                            <p className="text-sm font-medium text-on-surface truncate">{b.userName || "—"}</p>
                          </div>
                        </td>
                        <td className="text-sm text-on-surface-variant truncate">{b.userEmail || "—"}</td>
                        <td>
                          <span className="text-sm font-bold font-mono text-blue-400">
                            {b.currentBalance.toLocaleString("vi-VN")}
                          </span>
                        </td>
                        <td className="text-sm text-emerald-400 font-mono">
                          {b.totalEarned.toLocaleString("vi-VN")}
                        </td>
                        <td className="text-sm text-red-400 font-mono">
                          {b.totalSpent.toLocaleString("vi-VN")}
                        </td>
                        <td className="text-on-surface-variant font-mono text-xs">
                          {formatDate(b.lastTransactionAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPagesBal > 1 && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <p className="text-xs text-on-surface-variant">
                    Hiển thị {(pageBalances - 1) * PAGE_SIZE_BALANCES + 1}–{Math.min(pageBalances * PAGE_SIZE_BALANCES, totalBalances)} trong {totalBalances} người dùng
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPageBalances((p) => Math.max(1, p - 1))} disabled={pageBalances === 1}
                      className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-40 flex items-center justify-center transition-all">
                      <ChevronLeft className="w-3.5 h-3.5 text-on-surface" />
                    </button>
                    {getPageNumbers(pageBalances, totalPagesBal).map((p, idx) =>
                      p === "gap" ? <span key={`g-${idx}`} className="px-1 text-on-surface-variant text-xs">…</span> : (
                        <button key={p} onClick={() => setPageBalances(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-medium transition-all flex items-center justify-center ${pageBalances === p ? "bg-secondary text-black" : "bg-surface-container-high hover:bg-surface-container-highest text-on-surface"}`}>
                          {p}
                        </button>
                      )
                    )}
                    <button onClick={() => setPageBalances((p) => Math.min(totalPagesBal, p + 1))} disabled={pageBalances === totalPagesBal}
                      className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-40 flex items-center justify-center transition-all">
                      <ChevronRight className="w-3.5 h-3.5 text-on-surface" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── TRANSACTIONS TAB ── */}
      {activeTab === "Transactions" && (
        <>
          {/* Type filter */}
          <div className="flex gap-1.5 mb-5 flex-wrap">
            {["All", "Credit", "Debit", "Bonus", "Fine"].map((t) => {
              const cfg = TRANSACTION_TYPE_CONFIG[t];
              return (
                <button
                  key={t}
                  onClick={() => setTransactionTypeFilter(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    transactionTypeFilter === t
                      ? cfg ? `${cfg.color} border-current` : "bg-surface-container-high text-on-surface"
                      : "bg-surface-container-lowest text-on-surface-variant border-outline-variant/40"
                  }`}
                >
                  {t === "All" ? "Tất cả" : cfg?.label || t}
                </button>
              );
            })}
            <button onClick={handleExportTransactions} disabled={transactions.length === 0}
              className="gs-btn gs-btn-ghost gs-btn-sm shrink-0 flex items-center gap-1.5 ml-auto">
              <Download className="w-3.5 h-3.5" />
              Xuất CSV
            </button>
          </div>

          {errorTransactions && (
            <div className="mb-4 auth-alert auth-alert--error flex items-start gap-3">
              <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{errorTransactions}</span>
                <button onClick={() => setErrorTransactions("")} className="ml-3 text-xs underline">Đóng</button>
              </div>
            </div>
          )}

          {loadingTransactions ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="text-on-surface-variant text-sm">Đang tải...</span>
              </div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="gs-card p-16 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
                <Coins className="w-8 h-8 text-primary/60" />
              </div>
              <h3 className="font-serif text-xl font-bold text-on-surface mb-2">
                {searchQuery ? "Không tìm thấy" : "Chưa có giao dịch nào"}
              </h3>
            </div>
          ) : (
            <>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: "22%" }}>Người dùng</th>
                      <th style={{ width: "12%" }}>Loại</th>
                      <th style={{ width: "12%" }}>Số điểm</th>
                      <th style={{ width: "12%" }}>Số dư sau</th>
                      <th style={{ width: "22%" }}>Lý do</th>
                      <th style={{ width: "20%" }}>Ngày</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTransactions.map((t) => {
                      const cfg = TRANSACTION_TYPE_CONFIG[t.type] || TRANSACTION_TYPE_CONFIG.Credit;
                      const TxIcon = cfg.icon;
                      const isPositive = t.type === "Credit" || t.type === "Bonus";
                      return (
                        <tr key={t.transactionId}>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-surface-container-highest border border-outline-variant/50 flex items-center justify-center text-xs font-bold text-on-surface-variant shrink-0">
                                {(t.userName || "U").charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm text-on-surface truncate">{t.userName || "—"}</p>
                                <p className="text-xs text-on-surface-variant truncate">{t.userRole || ""}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
                              <TxIcon className="w-3 h-3 inline mr-0.5" />
                              {cfg.label}
                            </span>
                          </td>
                          <td>
                            <span className={`text-sm font-bold font-mono ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                              {isPositive ? "+" : "−"}{Math.abs(t.amount).toLocaleString("vi-VN")}
                            </span>
                          </td>
                          <td className="text-sm font-mono text-on-surface-variant">
                            {t.balanceAfter.toLocaleString("vi-VN")}
                          </td>
                          <td>
                            <p className="text-sm text-on-surface truncate" title={t.reason || ""}>
                              {t.reason || "—"}
                            </p>
                            {t.referenceId && (
                              <p className="text-xs text-on-surface-variant/60 font-mono truncate">
                                ref: {t.referenceId}
                              </p>
                            )}
                          </td>
                          <td className="text-on-surface-variant font-mono text-xs">
                            {formatDate(t.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPagesTx > 1 && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <p className="text-xs text-on-surface-variant">
                    Hiển thị {(pageTransactions - 1) * PAGE_SIZE_TRANSACTIONS + 1}–{Math.min(pageTransactions * PAGE_SIZE_TRANSACTIONS, totalTransactions)} trong {totalTransactions} giao dịch
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPageTransactions((p) => Math.max(1, p - 1))} disabled={pageTransactions === 1}
                      className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-40 flex items-center justify-center transition-all">
                      <ChevronLeft className="w-3.5 h-3.5 text-on-surface" />
                    </button>
                    {getPageNumbers(pageTransactions, totalPagesTx).map((p, idx) =>
                      p === "gap" ? <span key={`g-${idx}`} className="px-1 text-on-surface-variant text-xs">…</span> : (
                        <button key={p} onClick={() => setPageTransactions(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-medium transition-all flex items-center justify-center ${pageTransactions === p ? "bg-secondary text-black" : "bg-surface-container-high hover:bg-surface-container-highest text-on-surface"}`}>
                          {p}
                        </button>
                      )
                    )}
                    <button onClick={() => setPageTransactions((p) => Math.min(totalPagesTx, p + 1))} disabled={pageTransactions === totalPagesTx}
                      className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-40 flex items-center justify-center transition-all">
                      <ChevronRight className="w-3.5 h-3.5 text-on-surface" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {showAdjust && <AdjustPointsModal onClose={() => setShowAdjust(false)} />}
    </div>
  );
}
