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
  Lock,
  X,
  CheckCircle,
  XCircle,
  Trophy,
  Undo2,
  Gift,
  RotateCcw,
  Settings2,
} from "lucide-react";
import api from "../../services/api";

// Covers every literal `WalletTransaction.Type` string actually written by the BE
// (see RegisterCommandHandler/CreatePrediction/PublishRaceResult/LockUser/RunDailyTopUp/
// RunWeeklyTopUp/SetPointBalance/DeletePrediction/RevokeHorse/UnpublishRaceResult), plus
// the 4 values the Adjust Points modal itself sends (Credit/Debit/Bonus/Fine) — these are
// two different enums that happen to share this one column, not the same 4 values.
const TRANSACTION_TYPE_CONFIG = {
  Credit: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25", label: "Credit", icon: Plus },
  Debit: { color: "bg-red-500/10 text-red-400 border-red-500/25", label: "Debit", icon: Minus },
  Bonus: { color: "bg-sky-500/10 text-sky-400 border-sky-500/25", label: "Bonus", icon: TrendingUp },
  Fine: { color: "bg-orange-500/10 text-orange-400 border-orange-500/25", label: "Fine", icon: TrendingDown },
  Initial: { color: "bg-sky-500/10 text-sky-400 border-sky-500/25", label: "Initial", icon: Gift },
  BetPlaced: { color: "bg-red-500/10 text-red-400 border-red-500/25", label: "Bet Placed", icon: Minus },
  Payout: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25", label: "Payout", icon: Trophy },
  PayoutRollback: { color: "bg-orange-500/10 text-orange-400 border-orange-500/25", label: "Payout Reversed", icon: RotateCcw },
  BetRefund: { color: "bg-sky-500/10 text-sky-400 border-sky-500/25", label: "Refund", icon: Undo2 },
  DailyTopUp: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25", label: "Daily Top-Up", icon: TrendingUp },
  WeeklyTopUp: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25", label: "Weekly Top-Up", icon: TrendingUp },
  AdminSet: { color: "bg-violet-500/10 text-violet-400 border-violet-500/25", label: "Admin Set", icon: Settings2 },
};
const DEFAULT_TX_TYPE_CONFIG = { color: "bg-surface-container-high text-on-surface-variant border-outline-variant/40", label: null, icon: Coins };

const TABS = [
  { key: "Balances", label: "Balances" },
  { key: "Transactions", label: "Transaction History" },
];

const PAGE_SIZE_BALANCES = 20;
const PAGE_SIZE_TRANSACTIONS = 25;

function formatDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleString("en-US", {
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
    if (!selectedUser) { setError("Please select a user."); return; }
    const amt = parseInt(amount);
    if (!amt || amt <= 0) { setError("Points must be greater than 0."); return; }
    if (!reason.trim()) { setError("Please enter a reason."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await api.post("/api/admin/points/adjust", {
        userId: selectedUser.userId,
        amount: amt,
        type,
        reason: reason.trim(),
      });
      setSuccess(`${type === "Credit" || type === "Bonus" ? "Added" : "Deducted"} ${amt.toLocaleString("en-US")} points ${type === "Credit" || type === "Bonus" ? "to" : "from"} ${selectedUser.userName}. New balance: ${(res.data.newBalance || 0).toLocaleString("en-US")}`);
      setSelectedUser(null);
      setAmount("");
      setReason("");
      setType("Credit");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Adjustment failed.");
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
              <h2 className="font-serif font-bold text-on-surface">Adjust Points</h2>
              <p className="text-xs text-on-surface-variant">Manually add or deduct points</p>
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
              <label className="text-xs text-on-surface-variant uppercase tracking-wider mb-1.5 block">Select User *</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg pl-9 pr-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all"
                />
              </div>
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-white/5 space-y-1">
                {loadingBalances ? (
                  <div className="p-4 text-center text-xs text-on-surface-variant">Loading...</div>
                ) : filtered.length === 0 ? (
                  <div className="p-4 text-center text-xs text-on-surface-variant">No results found</div>
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
                        {b.balance.toLocaleString("en-US")}
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
                  <p className="text-xs text-on-surface-variant">Balance: {selectedUser.balance.toLocaleString("en-US")} pts</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-xs text-red-400 hover:text-red-300 underline">
                Change
              </button>
            </div>
          )}

          {/* Type */}
          <div>
            <label className="text-xs text-on-surface-variant uppercase tracking-wider mb-1.5 block">Transaction Type *</label>
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
            <label className="text-xs text-on-surface-variant uppercase tracking-wider mb-1.5 block">Points *</label>
            <div className="relative">
              <Coins className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 500"
                min="1"
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg pl-9 pr-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs text-on-surface-variant uppercase tracking-wider mb-1.5 block">Reason *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Referral bonus"
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
          <button onClick={onClose} className="gs-btn gs-btn-ghost gs-btn-sm">Close</button>
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
            Confirm
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
      setErrorBalances(err instanceof Error ? err.message : "Failed to load balances.");
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
      setErrorTransactions(err instanceof Error ? err.message : "Failed to load transaction history.");
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
    const headers = ["ID", "Name", "Email", "Balance", "Frozen"];
    const rows = balances.map((b) => [
      b.userId, b.userName || "", b.userEmail || "",
      b.balance, b.isFrozen ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `point_balances_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleExportTransactions = () => {
    const headers = ["ID", "User", "Email", "Type", "Points", "Balance After", "Reason", "Date"];
    const rows = transactions.map((t) => [
      t.transactionId, t.userName || "", t.userEmail || "",
      t.type, t.amount, t.balanceAfter, t.reason || "", formatDate(t.createdAt),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `point_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const totalPoints = balances.reduce((s, b) => s + (b.balance || 0), 0);
  const frozenCount = balances.filter((b) => b.isFrozen).length;

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
              <h1 className="font-serif text-2xl font-bold text-on-surface">Point Management</h1>
              <p className="text-on-surface-variant text-sm">
                Monitor user point balances and transaction history.
              </p>
            </div>
          </div>
          <button onClick={() => setShowAdjust(true)} className="gs-btn gs-btn-primary gs-btn-sm flex items-center gap-1.5">
            <Coins className="w-4 h-4" />
            Adjust Points
          </button>
        </div>
        <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 mt-4" />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <div className="gs-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Coins className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-on-surface font-mono">{totalPoints.toLocaleString("en-US")}</p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Total Points in Circulation</p>
          </div>
        </div>
        <div className="gs-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-red-400 font-mono">{frozenCount.toLocaleString("en-US")}</p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Frozen Wallets</p>
          </div>
        </div>
        <div className="gs-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-outline-variant/20 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-on-surface-variant" />
          </div>
          <div>
            <p className="text-lg font-bold text-on-surface font-mono">{totalBalances.toLocaleString("en-US")}</p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Users</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
          <input
            type="text"
            placeholder={activeTab === "Balances" ? "Search by name or email..." : "Search by name, email, reason..."}
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
          Refresh
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
          <div className="flex justify-end mb-3">
            <button onClick={handleExportBalances} disabled={balances.length === 0}
              className="gs-btn gs-btn-ghost gs-btn-sm shrink-0 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          {errorBalances && (
            <div className="mb-4 auth-alert auth-alert--error flex items-start gap-3">
              <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{errorBalances}</span>
                <button onClick={() => setErrorBalances("")} className="ml-3 text-xs underline">Close</button>
              </div>
            </div>
          )}

          {loadingBalances ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="text-on-surface-variant text-sm">Loading...</span>
              </div>
            </div>
          ) : balances.length === 0 ? (
            <div className="gs-card p-16 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
                <Coins className="w-8 h-8 text-primary/60" />
              </div>
              <h3 className="font-serif text-xl font-bold text-on-surface mb-2">
                {searchQuery ? "No results found" : "No balance data yet"}
              </h3>
            </div>
          ) : (
            <>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: "32%" }}>User</th>
                      <th style={{ width: "28%" }}>Email</th>
                      <th style={{ width: "20%" }}>Balance</th>
                      <th style={{ width: "20%" }}>Status</th>
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
                            {b.balance.toLocaleString("en-US")}
                          </span>
                        </td>
                        <td>
                          {b.isFrozen ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400">
                              <Lock className="w-3 h-3" /> Frozen
                            </span>
                          ) : (
                            <span className="text-xs text-on-surface-variant">Active</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPagesBal > 1 && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <p className="text-xs text-on-surface-variant">
                    Showing {(pageBalances - 1) * PAGE_SIZE_BALANCES + 1}–{Math.min(pageBalances * PAGE_SIZE_BALANCES, totalBalances)} of {totalBalances} users
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
            {["All", ...Object.keys(TRANSACTION_TYPE_CONFIG)].map((t) => {
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
                  {t === "All" ? "All" : cfg?.label || t}
                </button>
              );
            })}
            <button onClick={handleExportTransactions} disabled={transactions.length === 0}
              className="gs-btn gs-btn-ghost gs-btn-sm shrink-0 flex items-center gap-1.5 ml-auto">
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          {errorTransactions && (
            <div className="mb-4 auth-alert auth-alert--error flex items-start gap-3">
              <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{errorTransactions}</span>
                <button onClick={() => setErrorTransactions("")} className="ml-3 text-xs underline">Close</button>
              </div>
            </div>
          )}

          {loadingTransactions ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="text-on-surface-variant text-sm">Loading...</span>
              </div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="gs-card p-16 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
                <Coins className="w-8 h-8 text-primary/60" />
              </div>
              <h3 className="font-serif text-xl font-bold text-on-surface mb-2">
                {searchQuery ? "No results found" : "No transactions yet"}
              </h3>
            </div>
          ) : (
            <>
              <div className="admin-table-wrap">
                {/* table-layout: fixed makes the % widths below actually binding — without it,
                    a long unbroken Reason string (e.g. a manual adjust note with no spaces)
                    stretches the whole table instead of truncating inside its own column. */}
                <table className="admin-table" style={{ tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "18%" }}>User</th>
                      <th style={{ width: "13%" }}>Type</th>
                      <th style={{ width: "10%" }}>Points</th>
                      <th style={{ width: "11%" }}>Balance After</th>
                      <th style={{ width: "30%" }}>Reason</th>
                      <th style={{ width: "18%" }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTransactions.map((t) => {
                      const cfg = TRANSACTION_TYPE_CONFIG[t.type] || DEFAULT_TX_TYPE_CONFIG;
                      const TxIcon = cfg.icon;
                      // Derive from the real signed amount, not the type name — Payout/DailyTopUp/etc
                      // don't literally equal "Credit"/"Bonus", so that comparison always failed and
                      // showed every row (even winning payouts) as a red deduction.
                      const isPositive = Number(t.amount) >= 0;
                      return (
                        <tr key={t.transactionId}>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-surface-container-highest border border-outline-variant/50 flex items-center justify-center text-xs font-bold text-on-surface-variant shrink-0">
                                {(t.userName || "U").charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm text-on-surface truncate">{t.userName || "—"}</p>
                                <p className="text-xs text-on-surface-variant truncate">{t.userEmail || ""}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${cfg.color}`}>
                              <TxIcon className="w-3 h-3 shrink-0" />
                              {cfg.label || t.type || "—"}
                            </span>
                          </td>
                          <td>
                            <span className={`text-sm font-bold font-mono ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                              {isPositive ? "+" : "−"}{Math.abs(t.amount).toLocaleString("en-US")}
                            </span>
                          </td>
                          <td className="text-sm font-mono text-on-surface-variant">
                            {t.balanceAfter.toLocaleString("en-US")}
                          </td>
                          <td>
                            {/* break-words wraps to multiple lines instead of cutting text off —
                                table-layout: fixed on the table above keeps the column width
                                honest even for a long reason with no spaces to break on. */}
                            <p className="text-sm text-on-surface whitespace-normal break-words">
                              {t.reason || "—"}
                            </p>
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

              {totalTransactions > 0 && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <p className="text-xs text-on-surface-variant">
                    Showing {(pageTransactions - 1) * PAGE_SIZE_TRANSACTIONS + 1}–{Math.min(pageTransactions * PAGE_SIZE_TRANSACTIONS, totalTransactions)} of {totalTransactions} transactions
                  </p>
                  {totalPagesTx > 1 && (
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
                  )}
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
