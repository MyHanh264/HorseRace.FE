import { useState, useEffect, useMemo } from "react";
import { Trophy, TrendingUp, Medal, Users, PawPrint, AlertCircle } from "lucide-react";
import { getCareerLeaderboard, getMyEntries, getRaceResults } from "../../api/horseOwner";

const TABS = [
  { key: "owners", label: "Owners", icon: Users },
  { key: "horses", label: "My Horses", icon: PawPrint },
];

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function RankBadge({ rank }) {
  if (rank === 1)
    return (
      <div className="w-8 h-8 rounded-full bg-secondary/15 border-2 border-secondary/50 flex items-center justify-center text-secondary text-xs font-bold flex-shrink-0">
        ★
      </div>
    );
  if (rank === 2)
    return (
      <div className="w-8 h-8 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-gray-300 text-xs font-bold flex-shrink-0">
        2
      </div>
    );
  if (rank === 3)
    return (
      <div className="w-8 h-8 rounded-full bg-orange-500/10 border-2 border-orange-500/30 flex items-center justify-center text-orange-400 text-xs font-bold flex-shrink-0">
        3
      </div>
    );
  return (
    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-xs font-bold flex-shrink-0">
      {rank}
    </div>
  );
}

export default function HorseOwnerLeaderboardPage() {
  const [activeTab, setActiveTab] = useState("owners");
  const [owners, setOwners] = useState([]);
  const [horses, setHorses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [ownerLb, entries, results] = await Promise.all([
          getCareerLeaderboard("HORSE_OWNER"),
          getMyEntries(),
          getRaceResults(),
        ]);
        if (!active) return;

        setOwners(
          ownerLb.map((o) => ({
            rank: o.rank,
            name: o.fullName,
            initials: getInitials(o.fullName),
            points: o.prizePoints,
          })),
        );

        // /api/entries is scoped to this owner's own rows for HORSE_OWNER (BE deliberately
        // hides other owners' entries here) — so this ranks only the horses this owner has
        // submitted, not every horse in the system. See api/horseOwner.js:getRaceStandings
        // for why the same limit applies elsewhere on this role.
        const entryIds = new Set((entries ?? []).map((e) => e.entryId));
        const entryById = new Map((entries ?? []).map((e) => [e.entryId, e]));
        const pointsByHorse = new Map();
        for (const r of results) {
          if (!entryIds.has(r.entryId)) continue;
          const entry = entryById.get(r.entryId);
          if (!entry) continue;
          const cur = pointsByHorse.get(entry.horseId) ?? {
            horseId: entry.horseId,
            name: entry.horseName ?? `Horse #${entry.horseId}`,
            pts: 0,
          };
          cur.pts += r.totalPoints ?? 0;
          pointsByHorse.set(entry.horseId, cur);
        }
        const horseRanking = [...pointsByHorse.values()]
          .sort((a, b) => b.pts - a.pts)
          .map((h, i) => ({ ...h, rank: i + 1 }));
        setHorses(horseRanking);
      } catch (err) {
        if (active) setError(err?.response?.data?.detail || err?.message || "Failed to load leaderboard.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false };
  }, []);

  const topOwners = useMemo(() => owners.slice(0, 20), [owners]);
  const topHorses = useMemo(() => horses.slice(0, 20), [horses]);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-secondary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">Ranked by career Prize Points</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer border-none
              ${
                activeTab === key
                  ? "bg-primary-container text-on-primary-container"
                  : "text-gray-400 hover:text-white bg-transparent"
              }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />{error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-7 h-7 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Owners */}
          {activeTab === "owners" && (
            <div className="bg-[#161B22] border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
                <Medal className="w-4 h-4 text-secondary" />
                <span className="text-sm font-bold text-white">Top Owners</span>
                <span className="ml-auto text-[11px] text-gray-500 font-mono uppercase tracking-wider">
                  Prize Points
                </span>
              </div>
              {topOwners.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-10">No published results yet.</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {topOwners.map((owner) => (
                    <div
                      key={owner.rank}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors"
                    >
                      <RankBadge rank={owner.rank} />
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-xs border-2 flex-shrink-0
                          ${
                            owner.rank === 1
                              ? "bg-secondary/15 border-secondary/40 text-secondary"
                              : "bg-surface-container-high border-outline-variant/50 text-on-surface-variant"
                          }`}
                      >
                        {owner.initials}
                      </div>
                      <span className="text-sm font-semibold text-white flex-1">{owner.name}</span>
                      <div className="flex items-center gap-1.5 text-primary text-xs font-bold">
                        <TrendingUp size={12} />
                        {owner.points.toLocaleString()} pts
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* My Horses — ranked among this owner's own stable only, see load() comment above */}
          {activeTab === "horses" && (
            <div className="bg-[#161B22] border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
                <Medal className="w-4 h-4 text-secondary" />
                <span className="text-sm font-bold text-white">My Horses</span>
                <span className="ml-auto text-[11px] text-gray-500 font-mono uppercase tracking-wider">
                  Accumulated Points
                </span>
              </div>
              {topHorses.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-10">No published results yet.</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {topHorses.map((horse) => (
                    <div
                      key={horse.horseId}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors"
                    >
                      <RankBadge rank={horse.rank} />
                      <span className="text-sm font-semibold text-white flex-1 truncate">{horse.name}</span>
                      <span className="text-on-surface font-mono text-xs font-bold bg-white/5 px-3 py-1 rounded-lg">
                        {horse.pts.toLocaleString()} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
