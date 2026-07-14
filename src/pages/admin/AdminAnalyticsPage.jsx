import { useState, useEffect } from "react";
import {
  Users,
  Flag,
  Activity,
  Layers,
  AlertCircle,
} from "lucide-react";
import { getAllUser, getRaces } from "../../api/admin";
import api from "../../services/api";

const TIME_FILTERS = ["7d", "30d", "90d", "All Time"];
const FILTER_DAYS = { "7d": 7, "30d": 30, "90d": 90, "All Time": null };

function fmtCompact(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString("en-US");
}

export default function DashboardAdmin() {
  const [activeFilter, setActiveFilter] = useState("30d");
  const [totalUsers, setTotalUsers] = useState(null);
  const [activeHorses, setActiveHorses] = useState(null);
  const [races, setRaces] = useState([]);
  const [pointsInCirculation, setPointsInCirculation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now] = useState(() => Date.now()); // snapshot once — Date.now() can't be called during render

  useEffect(() => {
    let active = true;
    Promise.all([
      getAllUser({ page: 1, pageSize: 1 }),
      api.get("/api/horses").then((r) => (Array.isArray(r.data) ? r.data : [])),
      getRaces(),
      api.get("/api/admin/points/balances?pageSize=1000").then((r) => (Array.isArray(r.data?.items) ? r.data.items : [])),
    ])
      .then(([userPage, horses, raceList, balances]) => {
        if (!active) return;
        setTotalUsers(userPage?.total ?? null);
        setActiveHorses(horses.filter((h) => h.status === "Approved").length);
        setRaces(Array.isArray(raceList) ? raceList : (raceList?.data ?? []));
        setPointsInCirculation(balances.reduce((sum, b) => sum + (b.balance || 0), 0));
      })
      .catch((err) => { if (active) setError(err?.message || "Failed to load analytics"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false };
  }, []);

  // Only "Races" is genuinely time-windowed (has a scheduledAt to filter on) —
  // Users/Horses/Points are shown as current totals regardless of the period picked,
  // since there's no cheap way to reconstruct a historical snapshot from the current APIs.
  const days = FILTER_DAYS[activeFilter];
  const racesInPeriod = days == null
    ? races.length
    : races.filter((r) => {
        const t = new Date(r.scheduledAt ?? r.scheduledStartTime).getTime();
        return !Number.isNaN(t) && t >= Date.now() - days * 86400000;
      }).length;

  const STATS = [
    { label: "Total Users", value: fmtCompact(totalUsers), icon: Users, color: "text-primary", iconBg: "bg-primary-container/20", border: "border-primary/20" },
    { label: "Active Horses", value: fmtCompact(activeHorses), icon: Activity, color: "text-secondary", iconBg: "bg-secondary-container/20", border: "border-secondary/20" },
    { label: `Races (${activeFilter})`, value: fmtCompact(racesInPeriod), icon: Flag, color: "text-error", iconBg: "bg-error-container/20", border: "border-error/20" },
    { label: "Points in Circulation", value: fmtCompact(pointsInCirculation), icon: Layers, color: "text-on-surface-variant", iconBg: "bg-surface-container-high", border: "border-outline-variant" },
  ];

  return (
    <div className="p-8">
      {/* Section header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Platform Overview</h2>
          <p className="text-gray-400 text-sm mt-1">
            Current totals from the live system.
          </p>
        </div>

        {/* Time filters — only affects the Races stat (the only one with a real date to filter on) */}
        <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
          {TIME_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${
                  activeFilter === f
                    ? "bg-primary-container text-on-primary-container"
                    : "text-gray-400 hover:text-white"
                }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />{error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-[#161B22] border border-white/10 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-10 h-10 rounded-xl ${stat.iconBg} border ${stat.border} flex items-center justify-center`}
                >
                  <Icon size={18} className={stat.color} />
                </div>
              </div>
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
                {stat.label}
              </p>
              <p className="text-white text-3xl font-bold">{loading ? "—" : stat.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
