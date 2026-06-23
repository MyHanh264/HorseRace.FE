import { useState, useEffect } from "react"
import {
  Trophy,
  Search,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  ArrowUp,
  Plus,
  Minus,
  AlertCircle,
  Medal,
  TrendingUp,
  TrendingDown,
  History,
  BarChart3,
} from "lucide-react"
import {
  getJockeyLeaderboard,
  getPointsHistory,
  adjustPoints,
} from "../../api/admin"

const PAGE_SIZE = 10

function fmtDate(d) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function fmtDatetime(d) {
  if (!d) return "—"
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

// ─── Adjust Modal ───────────────────────────────────────────────────────────

function AdjustPointsModal({ target, onClose, onConfirm, submitting, error }) {
  const [points, setPoints]   = useState("")
  const [reason, setReason]   = useState("")
  const [direction, setDirection] = useState("add")

  if (!target) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const p = Number(points)
    if (!p || p <= 0) return
    onConfirm({
      targetType: target.targetType ?? "JOCKEY",
      targetId:   target.jockeyId ?? target.userId ?? target.id,
      points:     direction === "subtract" ? -Math.abs(p) : Math.abs(p),
      reason:     reason.trim() || null,
    })
  }

  const current = target.totalPoints ?? target.points ?? 0
  const newTotal = direction === "add" ? current + Number(points) : Math.max(0, current - Number(points))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
      <div className="gs-card w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-secondary" />
            </div>
            <h2 className="font-serif font-bold text-on-surface">Adjust Points</h2>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 pt-4">
          <div className="bg-surface-container-low rounded-xl p-3 mb-4">
            <p className="text-xs text-on-surface-variant mb-1">Adjusting points for</p>
            <p className="font-semibold text-on-surface">{target.jockeyName || target.userName || target.name || "—"}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">Current: <span className="font-mono font-bold text-secondary">{current} pts</span></p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="px-6 pb-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Adjustment Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setDirection("add")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
                  direction === "add"
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                    : "bg-surface-container-low border-outline-variant/40 text-on-surface-variant hover:border-emerald-500/30"
                }`}>
                <Plus className="w-4 h-4" />Add Points
              </button>
              <button type="button" onClick={() => setDirection("subtract")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
                  direction === "subtract"
                    ? "bg-red-500/10 border-red-500 text-red-400"
                    : "bg-surface-container-low border-outline-variant/40 text-on-surface-variant hover:border-red-500/30"
                }`}>
                <Minus className="w-4 h-4" />Deduct Points
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Points <span className="text-error">*</span>
            </label>
            <input type="number" min="1" required value={points} onChange={(e) => setPoints(e.target.value)} placeholder="e.g. 10"
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40 font-mono text-center text-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">Reason</label>
            <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Winner of Spring Championship..."
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40 resize-none"
            />
          </div>
          {points && Number(points) > 0 && (
            <div className={`rounded-xl p-3 text-center font-mono font-bold text-lg ${
              direction === "add" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}>
              {direction === "add" ? "+" : "−"}{points} pts
              {" "}<span className="text-xs font-normal opacity-60">→ new total: {newTotal}</span>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="gs-btn gs-btn-ghost">Cancel</button>
            <button type="submit" disabled={submitting || !points || Number(points) <= 0}
              className={`gs-btn flex items-center gap-2 disabled:opacity-50 ${direction === "add" ? "gs-btn-success" : "gs-btn-error"}`}>
              {submitting && <div className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />}
              Confirm Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── History Detail Modal ───────────────────────────────────────────────────

function HistoryDetailModal({ item, onClose }) {
  if (!item) return null
  const pts = item.points ?? 0
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
      <div className="gs-card w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center">
              <History className="w-4 h-4 text-secondary" />
            </div>
            <h2 className="font-serif font-bold text-on-surface">Adjustment Details</h2>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <div className="bg-surface-container-low rounded-xl p-3">
            <p className="text-xs text-on-surface-variant mb-1">Jockey</p>
            <p className="text-sm font-semibold text-on-surface">{item.jockeyName || item.userName || item.name || "—"}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-container-low rounded-xl p-3">
              <p className="text-xs text-on-surface-variant mb-1">Change</p>
              <p className={`text-lg font-bold font-mono ${pts >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {pts >= 0 ? "+" : ""}{pts}
              </p>
            </div>
            <div className="bg-surface-container-low rounded-xl p-3">
              <p className="text-xs text-on-surface-variant mb-1">Admin</p>
              <p className="text-sm font-semibold text-on-surface">{item.adminName || "—"}</p>
            </div>
          </div>
          <div className="bg-surface-container-low rounded-xl p-3">
            <p className="text-xs text-on-surface-variant mb-1">Reason</p>
            <p className="text-sm text-on-surface">{item.reason || "—"}</p>
          </div>
          <div className="bg-surface-container-low rounded-xl p-3">
            <p className="text-xs text-on-surface-variant mb-1">Timestamp</p>
            <p className="text-sm font-mono text-on-surface">{fmtDatetime(item.createdAt)}</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-outline-variant/40 flex justify-end">
          <button onClick={onClose} className="gs-btn gs-btn-ghost">Close</button>
        </div>
      </div>
    </div>
  )
}

// ─── Podium Card ───────────────────────────────────────────────────────────

function PodiumCard({ rank, name, points, delay }) {
  const podiumColors = {
    1: { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400", medal: "1" },
    2: { bg: "bg-slate-400/10 border-slate-400/30",  text: "text-slate-300", medal: "2" },
    3: { bg: "bg-orange-500/10 border-orange-500/30",text: "text-orange-400",medal: "3" },
  }
  const c = podiumColors[rank] || podiumColors[3]
  return (
    <div className={`gs-card p-4 flex flex-col items-center gap-2 animate-fade-in-up delay-row-${delay}`}
      style={{ opacity: 0, animationFillMode: "forwards" }}>
      <div className={`w-16 h-16 rounded-full ${c.bg} border-2 flex items-center justify-center`}>
        <Medal className={`w-7 h-7 ${c.text}`} />
      </div>
      <p className="font-semibold text-on-surface text-sm text-center max-w-[100px] truncate">{name}</p>
      <p className={`text-xl font-bold font-mono ${c.text}`}>{points} pts</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function AdminPointManagementPage() {
  const [tab, setTab]             = useState("leaderboard")
  const [leaderboard, setLeaderboard] = useState([])
  const [lbTotal, setLbTotal]     = useState(0)
  const [lbLoading, setLbLoading] = useState(true)
  const [lbError, setLbError]     = useState("")
  const [lbSearch, setLbSearch]   = useState("")
  const [lbPage, setLbPage]       = useState(1)
  const [history, setHistory]     = useState([])
  const [histTotal, setHistTotal] = useState(0)
  const [histLoading, setHistLoading] = useState(false)
  const [histError, setHistError] = useState("")
  const [histSearch, setHistSearch] = useState("")
  const [histPage, setHistPage]   = useState(1)
  const [adjustTarget, setAdjustTarget] = useState(null)
  const [viewHistory, setViewHistory]   = useState(null)
  const [submitting, setSubmitting]     = useState(false)
  const [adjustError, setAdjustError]   = useState("")

  // ── Load Leaderboard (stable pattern) ──
  useEffect(() => {
    let active = true
    setLbLoading(true)
    setLbError("")
    getJockeyLeaderboard({ page: lbPage, pageSize: PAGE_SIZE, search: lbSearch })
      .then((res) => {
        if (!active) return
        const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []
        setLeaderboard(data)
        setLbTotal(Array.isArray(res) ? res.length : (res?.total ?? data.length))
      })
      .catch((err) => { if (active) setLbError(err?.message || "Failed to load leaderboard.") })
      .finally(() => { if (active) setLbLoading(false) })
    return () => { active = false }
  }, [lbPage, lbSearch])

  // ── Load History (stable pattern) ──
  useEffect(() => {
    if (tab !== "history") return
    let active = true
    setHistLoading(true)
    setHistError("")
    getPointsHistory({ page: histPage, pageSize: PAGE_SIZE, search: histSearch })
      .then((res) => {
        if (!active) return
        const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []
        setHistory(data)
        setHistTotal(Array.isArray(res) ? res.length : (res?.total ?? data.length))
      })
      .catch((err) => { if (active) setHistError(err?.message || "Failed to load history.") })
      .finally(() => { if (active) setHistLoading(false) })
    return () => { active = false }
  }, [tab, histPage, histSearch])

  // ── Adjust Points ──
  const handleAdjustConfirm = ({ targetType, targetId, points, reason }) => {
    setSubmitting(true)
    setAdjustError("")
    adjustPoints(targetType, targetId, points, reason)
      .then(() => setAdjustTarget(null))
      .catch((err) => setAdjustError(err?.message || "Failed to adjust points."))
      .finally(() => setSubmitting(false))
  }

  const lbTotalPages = Math.max(1, Math.ceil(lbTotal / PAGE_SIZE))
  const histTotalPages = Math.max(1, Math.ceil(histTotal / PAGE_SIZE))
  const top3 = leaderboard.slice(0, 3)
  const rest = leaderboard.slice(3)

  return (
    <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8">

      {/* ── Page Header ── */}
      <div className="mb-8">
        <div className="animate-fade-in-up" style={{ opacity: 0, animationFillMode: "forwards" }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-on-surface">Point Management</h1>
              <p className="text-on-surface-variant text-sm">Monitor jockey rankings, view point history, and make point adjustments.</p>
            </div>
          </div>
          <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-secondary to-primary mt-3" />
        </div>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex gap-1 bg-surface-container-low rounded-xl p-1 mb-8 w-fit">
        <button onClick={() => setTab("leaderboard")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === "leaderboard" ? "bg-secondary text-white shadow-sm" : "text-on-surface-variant hover:text-on-surface"
          }`}>
          <BarChart3 className="w-4 h-4" />Leaderboard
        </button>
        <button onClick={() => setTab("history")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === "history" ? "bg-secondary text-white shadow-sm" : "text-on-surface-variant hover:text-on-surface"
          }`}>
          <History className="w-4 h-4" />Adjustment History
        </button>
      </div>

      {/* ── LEADERBOARD TAB ── */}
      {tab === "leaderboard" && (
        <>
          {!lbLoading && top3.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-6 max-w-2xl mx-auto">
              {top3.map((j, i) => (
                <PodiumCard key={j.jockeyId || j.userId || i} rank={i + 1}
                  name={j.jockeyName || j.userName || j.name || "—"}
                  points={j.totalPoints ?? j.points ?? 0}
                  delay={i + 1} />
              ))}
            </div>
          )}

          {lbError && (
            <div className="mb-5 p-4 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />{lbError}
              <button onClick={() => setLbError("")} className="ml-auto text-error/60 hover:text-error"><X className="w-4 h-4" /></button>
            </div>
          )}

          <div className="gs-card overflow-hidden">
            <div className="flex items-center justify-end px-5 border-b border-outline-variant/40 py-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                <input type="text" placeholder="Search jockey..."
                  value={lbSearch}
                  onChange={(e) => { setLbSearch(e.target.value); setLbPage(1) }}
                  className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg pl-9 pr-4 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40 w-52"
                />
              </div>
            </div>

            {lbLoading ? (
              <div className="flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
                  <span className="text-on-surface-variant text-sm">Loading leaderboard...</span>
                </div>
              </div>
            ) : rest.length === 0 && top3.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-14 h-14 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
                  <Trophy className="w-7 h-7 text-on-surface-variant/40" />
                </div>
                <p className="text-on-surface font-semibold mb-1">No jockeys found</p>
                <p className="text-on-surface-variant text-sm">
                  {lbSearch ? "Try a different search term." : "Leaderboard data will appear here."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Jockey</th>
                      <th>Points</th>
                      <th>Races</th>
                      <th>Wins</th>
                      <th>Win Rate</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rest.map((j, i) => {
                      const rank = i + 4
                      const points = j.totalPoints ?? j.points ?? 0
                      const races = j.raceCount ?? j.totalRaces ?? 0
                      const wins = j.winCount ?? j.wins ?? 0
                      const rate = races > 0 ? ((wins / races) * 100).toFixed(1) : "0.0"
                      return (
                        <tr key={j.jockeyId || j.userId || i}
                          className={`animate-fade-in-up delay-row-${((i + 4) % 4) + 1}`}
                          style={{ opacity: 0, animationFillMode: "forwards" }}>
                          <td><span className="font-mono font-bold text-on-surface-variant">#{rank}</span></td>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center shrink-0">
                                <Medal className="w-4 h-4 text-secondary" />
                              </div>
                              <p className="font-semibold text-on-surface text-sm">
                                {j.jockeyName || j.userName || j.name || "—"}
                              </p>
                            </div>
                          </td>
                          <td><span className="font-mono font-bold text-secondary text-lg">{points}</span></td>
                          <td className="text-on-surface-variant text-sm">{races}</td>
                          <td className="text-on-surface-variant text-sm">{wins}</td>
                          <td className="text-on-surface-variant text-sm">{rate}%</td>
                          <td>
                            <button onClick={() => setAdjustTarget(j)} title="Adjust points"
                              className="gs-btn gs-btn-success gs-btn-sm flex items-center gap-1">
                              <Plus className="w-3 h-3" /><Minus className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!lbLoading && lbTotal > PAGE_SIZE && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant/40">
                <span className="text-xs text-on-surface-variant">
                  Showing {Math.min((lbPage - 1) * PAGE_SIZE + 1, lbTotal)}–{Math.min(lbPage * PAGE_SIZE, lbTotal)} of {lbTotal}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setLbPage((p) => Math.max(1, p - 1))} disabled={lbPage === 1}
                    className="gs-btn gs-btn-ghost gs-btn-sm px-2"><ChevronLeft className="w-4 h-4" /></button>
                  {Array.from({ length: Math.min(lbTotalPages, 5) }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => setLbPage(p)}
                      className={`gs-btn gs-btn-sm min-w-[32px] justify-center ${lbPage === p ? "gs-btn-secondary" : "gs-btn-ghost"}`}>{p}</button>
                  ))}
                  <button onClick={() => setLbPage((p) => Math.min(lbTotalPages, p + 1))} disabled={lbPage === lbTotalPages}
                    className="gs-btn gs-btn-ghost gs-btn-sm px-2"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === "history" && (
        <>
          {histError && (
            <div className="mb-5 p-4 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />{histError}
              <button onClick={() => setHistError("")} className="ml-auto text-error/60 hover:text-error"><X className="w-4 h-4" /></button>
            </div>
          )}

          <div className="gs-card overflow-hidden">
            <div className="flex items-center justify-end px-5 border-b border-outline-variant/40 py-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                <input type="text" placeholder="Search..."
                  value={histSearch}
                  onChange={(e) => { setHistSearch(e.target.value); setHistPage(1) }}
                  className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg pl-9 pr-4 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40 w-52"
                />
              </div>
            </div>

            {histLoading ? (
              <div className="flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
                  <span className="text-on-surface-variant text-sm">Loading history...</span>
                </div>
              </div>
            ) : history.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-14 h-14 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
                  <History className="w-7 h-7 text-on-surface-variant/40" />
                </div>
                <p className="text-on-surface font-semibold mb-1">No adjustments yet</p>
                <p className="text-on-surface-variant text-sm">
                  {histSearch ? "Try a different search term." : "Point adjustments will appear here."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Jockey</th>
                      <th>Change</th>
                      <th>Admin</th>
                      <th>Reason</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => {
                      const pts = h.points ?? 0
                      const isPositive = pts >= 0
                      return (
                        <tr key={h.pointHistoryId || h.id || i}
                          className={`animate-fade-in-up delay-row-${(i % 4) + 1}`}
                          style={{ opacity: 0, animationFillMode: "forwards" }}>
                          <td><p className="font-semibold text-on-surface text-sm">{h.jockeyName || h.userName || h.name || "—"}</p></td>
                          <td>
                            <span className={`inline-flex items-center gap-1 font-mono font-bold text-sm ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                              {isPositive ? "+" : ""}{pts}
                            </span>
                          </td>
                          <td className="text-on-surface-variant text-xs">{h.adminName || "—"}</td>
                          <td className="text-on-surface-variant text-xs max-w-[200px] truncate">{h.reason || "—"}</td>
                          <td className="text-on-surface-variant text-xs font-mono">{fmtDate(h.createdAt)}</td>
                          <td>
                            <button onClick={() => setViewHistory(h)} title="View details" className="gs-btn gs-btn-ghost gs-btn-sm">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!histLoading && histTotal > PAGE_SIZE && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant/40">
                <span className="text-xs text-on-surface-variant">
                  Showing {Math.min((histPage - 1) * PAGE_SIZE + 1, histTotal)}–{Math.min(histPage * PAGE_SIZE, histTotal)} of {histTotal}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setHistPage((p) => Math.max(1, p - 1))} disabled={histPage === 1}
                    className="gs-btn gs-btn-ghost gs-btn-sm px-2"><ChevronLeft className="w-4 h-4" /></button>
                  {Array.from({ length: Math.min(histTotalPages, 5) }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => setHistPage(p)}
                      className={`gs-btn gs-btn-sm min-w-[32px] justify-center ${histPage === p ? "gs-btn-secondary" : "gs-btn-ghost"}`}>{p}</button>
                  ))}
                  <button onClick={() => setHistPage((p) => Math.min(histTotalPages, p + 1))} disabled={histPage === histTotalPages}
                    className="gs-btn gs-btn-ghost gs-btn-sm px-2"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Modals ── */}
      {adjustTarget && (
        <AdjustPointsModal target={adjustTarget} onClose={() => setAdjustTarget(null)}
          onConfirm={handleAdjustConfirm} submitting={submitting} error={adjustError} />
      )}
      {viewHistory && (
        <HistoryDetailModal item={viewHistory} onClose={() => setViewHistory(null)} />
      )}
    </div>
  )
}
