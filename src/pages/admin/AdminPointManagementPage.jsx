import { useEffect, useState, useCallback } from "react"
import {
  getJockeyLeaderboard,
  getPointAdjustmentHistory,
  adjustPoints,
} from "../../api/admin"
import {
  Layers,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  X,
  ChevronUp,
  ChevronDown,
  Star,
  Award,
  History,
  User,
  Trophy,
  Minus,
} from "lucide-react"

const TABS = ["Leaderboard", "Adjustment History", "Manual Adjust"]

const TARGET_TYPES = ["JOCKEY", "HORSE_OWNER", "REFEREE"]

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—"
}

export default function AdminPointManagementPage() {
  const [activeTab, setActiveTab] = useState("Leaderboard")

  // ── Leaderboard ──
  const [leaderboard, setLeaderboard] = useState([])
  const [lbLoading, setLbLoading] = useState(true)
  const [lbError, setLbError] = useState(null)
  const [lbPage, setLbPage] = useState(1)
  const [lbPageSize, setLbPageSize] = useState(10)
  const [lbTotal, setLbTotal] = useState(0)
  const [lbTotalPages, setLbTotalPages] = useState(0)
  const [lbSort, setLbSort] = useState("totalPoints")
  const [lbSortDir, setLbSortDir] = useState("desc")

  const [adjustModal, setAdjustModal] = useState(null) // { type: 'add'|'subtract', jockey, points: 0, reason: '' }
  const [adjustLoading, setAdjustLoading] = useState(false)

  // ── History ──
  const [history, setHistory] = useState([])
  const [histLoading, setHistLoading] = useState(true)
  const [histError, setHistError] = useState(null)
  const [histPage, setHistPage] = useState(1)
  const [histPageSize, setHistPageSize] = useState(10)
  const [histTotal, setHistTotal] = useState(0)
  const [histTotalPages, setHistTotalPages] = useState(0)
  const [histTargetType, setHistTargetType] = useState("")
  const [histTargetId, setHistTargetId] = useState("")

  // ── Manual Adjust ──
  const [manualForm, setManualForm] = useState({
    targetType: "JOCKEY",
    targetId: "",
    points: "",
    reason: "",
  })
  const [manualLoading, setManualLoading] = useState(false)
  const [manualSuccess, setManualSuccess] = useState("")
  const [manualError, setManualError] = useState("")

  useEffect(() => {
    if (activeTab === "Leaderboard") {
      loadLeaderboard()
    } else if (activeTab === "Adjustment History") {
      loadHistory()
    }
  }, [activeTab, lbPage, lbPageSize, lbSort, lbSortDir, histPage, histPageSize, histTargetType, histTargetId])

  const loadLeaderboard = useCallback(async () => {
    try {
      setLbLoading(true)
      setLbError(null)
      const response = await getJockeyLeaderboard({
        page: lbPage,
        pageSize: lbPageSize,
        sort: lbSort,
        sortDirection: lbSortDir,
      })
      const list = response.data || response || []
      setLeaderboard(list)
      setLbTotal(response.total || list.length)
      setLbTotalPages(response.totalPages || 1)
    } catch (err) {
      setLbError(err instanceof Error ? err.message : "Failed to load leaderboard.")
    } finally {
      setLbLoading(false)
    }
  }, [lbPage, lbPageSize, lbSort, lbSortDir])

  const loadHistory = useCallback(async () => {
    try {
      setHistLoading(true)
      setHistError(null)
      const response = await getPointAdjustmentHistory({
        page: histPage,
        pageSize: histPageSize,
        targetType: histTargetType,
        targetId: histTargetId,
      })
      const list = response.data || response || []
      setHistory(list)
      setHistTotal(response.total || list.length)
      setHistTotalPages(response.totalPages || 1)
    } catch (err) {
      setHistError(err instanceof Error ? err.message : "Failed to load history.")
    } finally {
      setHistLoading(false)
    }
  }, [histPage, histPageSize, histTargetType, histTargetId])

  const handleSort = useCallback(
    (col) => {
      if (lbSort === col) {
        setLbSortDir((d) => (d === "asc" ? "desc" : "asc"))
      } else {
        setLbSort(col)
        setLbSortDir("desc")
      }
    },
    [lbSort]
  )

  const openAdjustModal = useCallback((type, jockey) => {
    setAdjustModal({ type, jockey, points: "", reason: "" })
  }, [])

  const handleAdjustChange = useCallback((field, value) => {
    setAdjustModal((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleAdjustSubmit = useCallback(async () => {
    if (!adjustModal.points || !adjustModal.reason.trim()) return
    setAdjustLoading(true)
    try {
      const pointsVal = Number(adjustModal.points) * (adjustModal.type === "subtract" ? -1 : 1)
      await adjustPoints(
        "JOCKEY",
        adjustModal.jockey.jockeyId || adjustModal.jockey.id,
        pointsVal,
        adjustModal.reason.trim()
      )
      setAdjustModal(null)
      await loadLeaderboard()
    } catch (err) {
      setLbError(err instanceof Error ? err.message : "Failed to adjust points.")
      setAdjustModal(null)
    } finally {
      setAdjustLoading(false)
    }
  }, [adjustModal, loadLeaderboard])

  const handleManualChange = useCallback((e) => {
    const { name, value } = e.target
    setManualForm((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleManualSubmit = useCallback(async () => {
    if (!manualForm.targetId.trim() || !manualForm.points || !manualForm.reason.trim()) return
    setManualLoading(true)
    setManualSuccess("")
    setManualError("")
    try {
      await adjustPoints(
        manualForm.targetType,
        manualForm.targetId.trim(),
        Number(manualForm.points),
        manualForm.reason.trim()
      )
      setManualSuccess("Points adjusted successfully.")
      setManualForm({ targetType: "JOCKEY", targetId: "", points: "", reason: "" })
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Failed to adjust points.")
    } finally {
      setManualLoading(false)
    }
  }, [manualForm])

  const SortIcon = ({ col }) => {
    if (lbSort !== col) return <ChevronUp size={12} className="opacity-20" />
    return lbSortDir === "asc" ? (
      <ChevronUp size={12} className="text-primary" />
    ) : (
      <ChevronDown size={12} className="text-primary" />
    )
  }

  // Top 3 podium
  const top3 = leaderboard.slice(0, 3)

  const summaryStats = {
    totalJockeys: leaderboard.length,
    totalPoints: leaderboard.reduce((s, j) => s + (j.totalPoints || 0), 0),
    avgPoints:
      leaderboard.length > 0
        ? Math.round(
            leaderboard.reduce((s, j) => s + (j.totalPoints || 0), 0) /
              leaderboard.length
          )
        : 0,
  }

  const inputCls =
    "w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"

  return (
    <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8">
      {/* PAGE HEADER */}
      <div
        className="mb-8 animate-fade-in-up"
        style={{ opacity: 0, animationFillMode: "forwards" }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-on-surface">
              Point Management
            </h1>
            <p className="text-on-surface-variant text-sm">
              Manage jockey points, leaderboard, and manual adjustments.
            </p>
          </div>
        </div>
        <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-primary to-secondary mt-4" />
      </div>

      {/* TAB SWITCHER */}
      <div className="flex gap-1 bg-surface-container-low rounded-xl p-1 mb-6 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === tab
                ? "bg-secondary text-on-secondary"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── LEADERBOARD TAB ── */}
      {activeTab === "Leaderboard" && (
        <>
          {/* STATS CARDS */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              {
                label: "Total Jockeys",
                value: summaryStats.totalJockeys,
                icon: <User size={16} />,
                color: "text-blue-400",
                bg: "bg-blue-500/10",
                border: "border-blue-500/20",
              },
              {
                label: "Total Points",
                value: summaryStats.totalPoints.toLocaleString(),
                icon: <Star size={16} />,
                color: "text-yellow-400",
                bg: "bg-yellow-500/10",
                border: "border-yellow-500/20",
              },
              {
                label: "Avg Points",
                value: summaryStats.avgPoints,
                icon: <Award size={16} />,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
                border: "border-emerald-500/20",
              },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`gs-card p-4 flex items-center gap-3 animate-fade-in-up delay-row-${i + 1}`}
                style={{ opacity: 0, animationFillMode: "forwards" }}
              >
                <div
                  className={`w-9 h-9 rounded-lg ${stat.bg} border ${stat.border} flex items-center justify-center shrink-0 ${stat.color}`}
                >
                  {stat.icon}
                </div>
                <div>
                  <p className="text-xl font-bold text-on-surface font-mono">
                    {stat.value}
                  </p>
                  <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* PODIUM */}
          {!lbLoading && top3.length > 0 && (
            <div className="flex items-end justify-center gap-4 mb-8 animate-fade-in-up">
              {/* 2nd place */}
              {top3[1] && (
                <div className="flex flex-col items-center gap-2 order-1">
                  <div className="w-12 h-12 rounded-full bg-gray-400/20 border-2 border-gray-400/40 flex items-center justify-center text-xl font-bold text-gray-400">
                    {top3[1].jockeyName?.charAt(0) || "?"}
                  </div>
                  <div className="text-center">
                    <div className="text-2xl">🥈</div>
                    <p className="text-xs font-semibold text-on-surface mt-1">
                      {top3[1].jockeyName}
                    </p>
                    <p className="text-xs text-on-surface-variant font-mono">
                      {top3[1].totalPoints} pts
                    </p>
                  </div>
                  <div className="w-20 h-20 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-center justify-center text-3xl">
                    <Trophy className="text-gray-400 w-8 h-8" />
                  </div>
                </div>
              )}
              {/* 1st place */}
              {top3[0] && (
                <div className="flex flex-col items-center gap-2 order-2">
                  <div className="w-14 h-14 rounded-full bg-yellow-400/20 border-2 border-yellow-400/40 flex items-center justify-center text-xl font-bold text-yellow-400">
                    {top3[0].jockeyName?.charAt(0) || "?"}
                  </div>
                  <div className="text-center">
                    <div className="text-3xl">🥇</div>
                    <p className="text-sm font-bold text-on-surface mt-1">
                      {top3[0].jockeyName}
                    </p>
                    <p className="text-sm text-on-surface-variant font-mono">
                      {top3[0].totalPoints} pts
                    </p>
                  </div>
                  <div className="w-24 h-24 rounded-xl bg-yellow-500/10 border-2 border-yellow-500/30 flex items-center justify-center text-4xl">
                    <Trophy className="text-yellow-400 w-10 h-10" />
                  </div>
                </div>
              )}
              {/* 3rd place */}
              {top3[2] && (
                <div className="flex flex-col items-center gap-2 order-3">
                  <div className="w-12 h-12 rounded-full bg-orange-400/20 border-2 border-orange-400/40 flex items-center justify-center text-xl font-bold text-orange-400">
                    {top3[2].jockeyName?.charAt(0) || "?"}
                  </div>
                  <div className="text-center">
                    <div className="text-2xl">🥉</div>
                    <p className="text-xs font-semibold text-on-surface mt-1">
                      {top3[2].jockeyName}
                    </p>
                    <p className="text-xs text-on-surface-variant font-mono">
                      {top3[2].totalPoints} pts
                    </p>
                  </div>
                  <div className="w-20 h-20 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-center justify-center text-3xl">
                    <Trophy className="text-orange-400 w-8 h-8" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ERROR */}
          {lbError && (
            <div className="mb-5 auth-alert auth-alert--error flex items-start gap-3">
              <X className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">{lbError}</div>
              <button onClick={() => setLbError(null)} className="shrink-0">
                <X size={14} />
              </button>
            </div>
          )}

          {/* SORT CONTROLS */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { col: "totalPoints", label: "Points" },
              { col: "totalRaces", label: "Races" },
              { col: "wins", label: "Wins" },
              { col: "winRate", label: "Win Rate" },
            ].map(({ col, label }) => (
              <button
                key={col}
                onClick={() => handleSort(col)}
                className={`gs-btn gs-btn-sm flex items-center gap-1 ${
                  lbSort === col
                    ? "gs-btn-primary"
                    : "gs-btn-ghost"
                }`}
              >
                {label}
                <SortIcon col={col} />
              </button>
            ))}
          </div>

          {/* TABLE */}
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Jockey</th>
                  <th>
                    <button
                      onClick={() => handleSort("totalPoints")}
                      className="flex items-center gap-1"
                    >
                      Points <SortIcon col="totalPoints" />
                    </button>
                  </th>
                  <th>
                    <button
                      onClick={() => handleSort("totalRaces")}
                      className="flex items-center gap-1"
                    >
                      Races <SortIcon col="totalRaces" />
                    </button>
                  </th>
                  <th>
                    <button
                      onClick={() => handleSort("wins")}
                      className="flex items-center gap-1"
                    >
                      Wins <SortIcon col="wins" />
                    </button>
                  </th>
                  <th>
                    <button
                      onClick={() => handleSort("winRate")}
                      className="flex items-center gap-1"
                    >
                      Win Rate <SortIcon col="winRate" />
                    </button>
                  </th>
                  <th>Adjust</th>
                </tr>
              </thead>
              <tbody>
                {lbLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <span className="text-on-surface-variant text-sm">
                          Loading leaderboard...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="gs-card p-16 text-center">
                        <div className="w-16 h-16 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
                          <Trophy size={28} className="text-on-surface-variant/40" />
                        </div>
                        <h3 className="font-serif text-xl font-bold text-on-surface mb-2">
                          No jockeys found
                        </h3>
                        <p className="text-on-surface-variant text-sm">
                          No jockeys have been registered yet.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((j, i) => (
                    <tr
                      key={j.jockeyId || j.id}
                      className={`animate-fade-in-up delay-row-${(i % 4) + 1}`}
                      style={{ opacity: 0, animationFillMode: "forwards" }}
                    >
                      <td>
                        <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/40 flex items-center justify-center text-sm font-bold text-on-surface-variant">
                          {j.rank || i + 1}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-secondary/20 border border-secondary/30 flex items-center justify-center text-sm font-bold text-secondary shrink-0">
                            {j.jockeyName?.charAt(0) || "?"}
                          </div>
                          <p className="font-semibold text-on-surface">
                            {j.jockeyName || "—"}
                          </p>
                        </div>
                      </td>
                      <td>
                        <span className="text-yellow-400 font-bold font-mono">
                          {j.totalPoints}
                        </span>
                      </td>
                      <td className="text-on-surface-variant">{j.totalRaces}</td>
                      <td className="text-on-surface-variant">{j.wins}</td>
                      <td className="text-on-surface-variant">
                        {j.winRate != null ? `${j.winRate.toFixed(1)}%` : "—"}
                      </td>
                      <td>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => openAdjustModal("add", j)}
                            title="Add Points"
                            className="gs-btn gs-btn-success gs-btn-sm"
                          >
                            <TrendingUp size={13} />
                          </button>
                          <button
                            onClick={() => openAdjustModal("subtract", j)}
                            title="Deduct Points"
                            className="gs-btn gs-btn-danger gs-btn-sm"
                          >
                            <TrendingDown size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {!lbLoading && leaderboard.length > 0 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                <span>Rows per page:</span>
                <select
                  value={lbPageSize}
                  onChange={(e) => {
                    setLbPageSize(Number(e.target.value))
                    setLbPage(1)
                  }}
                  className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-2 py-1 text-xs text-on-surface focus:outline-none"
                >
                  {[5, 10, 20, 50].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-on-surface-variant font-mono">
                  {lbTotal === 0 ? 0 : (lbPage - 1) * lbPageSize + 1}–
                  {Math.min(lbPage * lbPageSize, lbTotal)} of {lbTotal}
                </span>
                <button
                  onClick={() => setLbPage((p) => p - 1)}
                  disabled={lbPage <= 1}
                  className="gs-btn gs-btn-ghost gs-btn-sm"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setLbPage((p) => p + 1)}
                  disabled={lbPage >= lbTotalPages}
                  className="gs-btn gs-btn-ghost gs-btn-sm"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── ADJUSTMENT HISTORY TAB ── */}
      {activeTab === "Adjustment History" && (
        <>
          {/* FILTERS */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                Target Type
              </label>
              <select
                value={histTargetType}
                onChange={(e) => {
                  setHistTargetType(e.target.value)
                  setHistPage(1)
                }}
                className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all min-w-[160px]"
              >
                <option value="">All</option>
                {TARGET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                Target ID
              </label>
              <input
                type="text"
                placeholder="Enter target ID..."
                value={histTargetId}
                onChange={(e) => {
                  setHistTargetId(e.target.value)
                  setHistPage(1)
                }}
                className="w-full bg-surface-container-lowest border border-outline-variant/40 text-sm rounded-xl px-4 py-2.5 text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
              />
            </div>
          </div>

          {/* ERROR */}
          {histError && (
            <div className="mb-5 auth-alert auth-alert--error flex items-start gap-3">
              <X className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">{histError}</div>
              <button onClick={() => setHistError(null)} className="shrink-0">
                <X size={14} />
              </button>
            </div>
          )}

          {/* TABLE */}
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Target</th>
                  <th>Type</th>
                  <th>Points</th>
                  <th>Reason</th>
                  <th>Adjusted By</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {histLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <span className="text-on-surface-variant text-sm">
                          Loading history...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="gs-card p-16 text-center">
                        <div className="w-16 h-16 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
                          <History size={28} className="text-on-surface-variant/40" />
                        </div>
                        <h3 className="font-serif text-xl font-bold text-on-surface mb-2">
                          No adjustment history
                        </h3>
                        <p className="text-on-surface-variant text-sm">
                          No point adjustments have been made yet.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  history.map((h, i) => (
                    <tr
                      key={h.historyId || h.id || i}
                      className={`animate-fade-in-up delay-row-${(i % 4) + 1}`}
                      style={{ opacity: 0, animationFillMode: "forwards" }}
                    >
                      <td className="font-semibold text-on-surface">
                        {h.targetId || h.targetName || "—"}
                      </td>
                      <td>
                        <span className="gs-badge gs-badge-neutral text-[10px]">
                          {h.targetType}
                        </span>
                      </td>
                      <td>
                        {h.points > 0 ? (
                          <span className="text-emerald-400 font-bold font-mono">
                            +{h.points}
                          </span>
                        ) : (
                          <span className="text-red-400 font-bold font-mono">
                            {h.points}
                          </span>
                        )}
                      </td>
                      <td className="text-on-surface-variant text-xs max-w-[200px] truncate">
                        {h.reason || "—"}
                      </td>
                      <td className="text-on-surface-variant text-xs">
                        {h.adjustedBy || "—"}
                      </td>
                      <td className="text-on-surface-variant font-mono text-xs">
                        {formatDate(h.createdAt || h.date)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {!histLoading && history.length > 0 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                <span>Rows per page:</span>
                <select
                  value={histPageSize}
                  onChange={(e) => {
                    setHistPageSize(Number(e.target.value))
                    setHistPage(1)
                  }}
                  className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-2 py-1 text-xs text-on-surface focus:outline-none"
                >
                  {[5, 10, 20, 50].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-on-surface-variant font-mono">
                  {histTotal === 0 ? 0 : (histPage - 1) * histPageSize + 1}–
                  {Math.min(histPage * histPageSize, histTotal)} of {histTotal}
                </span>
                <button
                  onClick={() => setHistPage((p) => p - 1)}
                  disabled={histPage <= 1}
                  className="gs-btn gs-btn-ghost gs-btn-sm"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setHistPage((p) => p + 1)}
                  disabled={histPage >= histTotalPages}
                  className="gs-btn gs-btn-ghost gs-btn-sm"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── MANUAL ADJUST TAB ── */}
      {activeTab === "Manual Adjust" && (
        <div className="max-w-md">
          <div className="gs-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                <Plus className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h2 className="font-serif text-lg font-bold text-on-surface">
                  Manual Point Adjustment
                </h2>
                <p className="text-on-surface-variant text-sm">
                  Manually add or deduct points for any user.
                </p>
              </div>
            </div>

            {manualSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 shrink-0" />
                {manualSuccess}
              </div>
            )}

            {manualError && (
              <div className="mb-4 p-3 rounded-lg bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
                <X className="w-4 h-4 shrink-0" />
                {manualError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                  Target Type
                </label>
                <select
                  name="targetType"
                  value={manualForm.targetType}
                  onChange={handleManualChange}
                  className={inputCls}
                >
                  {TARGET_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                  Target ID
                </label>
                <input
                  type="text"
                  name="targetId"
                  value={manualForm.targetId}
                  onChange={handleManualChange}
                  placeholder="Enter user ID"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                  Points (use negative to deduct)
                </label>
                <input
                  type="number"
                  name="points"
                  value={manualForm.points}
                  onChange={handleManualChange}
                  placeholder="e.g. 100 or -50"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                  Reason
                </label>
                <textarea
                  name="reason"
                  value={manualForm.reason}
                  onChange={handleManualChange}
                  placeholder="Describe why this adjustment is being made..."
                  rows={4}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <button
                onClick={handleManualSubmit}
                disabled={
                  manualLoading ||
                  !manualForm.targetId.trim() ||
                  !manualForm.points ||
                  !manualForm.reason.trim()
                }
                className="gs-btn gs-btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {manualLoading ? (
                  <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADJUST MODAL */}
      {adjustModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="bg-surface-container-low rounded-2xl border border-outline-variant/40 w-full max-w-sm animate-fade-in-up"
            style={{ animationFillMode: "forwards" }}
          >
            <div className="flex items-center justify-between p-5 border-b border-outline-variant/30">
              <h2 className="font-serif text-lg font-bold text-on-surface flex items-center gap-2">
                {adjustModal.type === "add" ? (
                  <>
                    <TrendingUp size={18} className="text-emerald-400" /> Add Points
                  </>
                ) : (
                  <>
                    <TrendingDown size={18} className="text-red-400" /> Deduct Points
                  </>
                )}
              </h2>
              <button
                onClick={() => setAdjustModal(null)}
                className="gs-btn gs-btn-ghost gs-btn-sm"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-surface-container-low rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary/20 border border-secondary/30 flex items-center justify-center text-sm font-bold text-secondary shrink-0">
                  {adjustModal.jockey.jockeyName?.charAt(0) || "?"}
                </div>
                <div>
                  <p className="font-semibold text-on-surface">
                    {adjustModal.jockey.jockeyName}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    Current: {adjustModal.jockey.totalPoints} pts
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                  Points
                </label>
                <input
                  type="number"
                  value={adjustModal.points}
                  onChange={(e) => handleAdjustChange("points", e.target.value)}
                  placeholder="Enter points"
                  min="1"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                  Reason
                </label>
                <textarea
                  value={adjustModal.reason}
                  onChange={(e) => handleAdjustChange("reason", e.target.value)}
                  placeholder="Describe why..."
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </div>
              {adjustModal.points > 0 && adjustModal.reason.trim() && (
                <div className="bg-surface-container-low rounded-xl p-3">
                  <p className="text-xs text-on-surface-variant mb-1">New Total</p>
                  <p className="text-lg font-bold font-mono text-on-surface">
                    {adjustModal.type === "add"
                      ? adjustModal.jockey.totalPoints + Number(adjustModal.points)
                      : adjustModal.jockey.totalPoints - Number(adjustModal.points)}{" "}
                    pts
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-outline-variant/30">
              <button
                onClick={() => setAdjustModal(null)}
                className="gs-btn gs-btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustSubmit}
                disabled={
                  adjustLoading ||
                  !adjustModal.points ||
                  !adjustModal.reason.trim()
                }
                className={`gs-btn flex-1 flex items-center justify-center gap-2 disabled:opacity-50 ${
                  adjustModal.type === "add"
                    ? "gs-btn-success"
                    : "gs-btn-danger"
                }`}
              >
                {adjustLoading ? (
                  <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                ) : adjustModal.type === "add" ? (
                  <TrendingUp size={14} />
                ) : (
                  <TrendingDown size={14} />
                )}
                {adjustModal.type === "add" ? "Add Points" : "Deduct Points"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
