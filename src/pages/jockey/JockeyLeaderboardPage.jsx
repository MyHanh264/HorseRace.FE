import { useState, useEffect, useMemo } from "react";
import { Trophy, TrendingUp, Medal, Users, Flag, AlertCircle } from "lucide-react";
import { getCareerLeaderboard, getEntries, getRaceResults } from "../../api/jockey";

const TABS = [
  { key: "jockeys", label: "Jockeys", icon: Users },
  { key: "horses", label: "Horses", icon: Flag },
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

export default function JockeyLeaderboardPage() {
  const [activeTab, setActiveTab] = useState("jockeys");
  const [jockeys, setJockeys] = useState([]);
  const [horses, setHorses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [jockeyLb, entries, results] = await Promise.all([
          getCareerLeaderboard("JOCKEY"),
          getEntries(),
          getRaceResults(),
        ]);
        if (!active) return;

        setJockeys(
          jockeyLb.map((j) => ({
            rank: j.rank,
            name: j.fullName,
            initials: getInitials(j.fullName),
            points: j.prizePoints,
          })),
        );

        // No dedicated "horse leaderboard" endpoint — compute it client-side by summing
        // each horse's published RaceResult.TotalPoints across every race it has run.
        const entryById = new Map(entries.map((e) => [e.entryId, e]));
        const pointsByHorse = new Map();
        for (const r of results) {
          const entry = entryById.get(r.entryId);
          if (!entry) continue;
          const cur = pointsByHorse.get(entry.horseId) ?? {
            horseId: entry.horseId,
            name: entry.horseName ?? `Horse #${entry.horseId}`,
            stable: entry.horseOwnerName ?? "—",
            pts: 0,
          };
          cur.pts += r.totalPoints ?? 0;
          pointsByHorse.set(entry.horseId, cur);
        }
        const horseRanking = [...pointsByHorse.values()]
          .filter((h) => h.pts > 0)
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

  const topJockeys = useMemo(() => jockeys.slice(0, 20), [jockeys]);
  const topHorses  = useMemo(() => horses.slice(0, 20), [horses]);

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
          {/* Jockeys */}
          {activeTab === "jockeys" && (
            <div className="bg-[#161B22] border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
                <Medal className="w-4 h-4 text-secondary" />
                <span className="text-sm font-bold text-white">Top Jockeys</span>
                <span className="ml-auto text-[11px] text-gray-500 font-mono uppercase tracking-wider">
                  Prize Points
                </span>
              </div>
              {topJockeys.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-10">No published results yet.</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {topJockeys.map((jockey) => (
                    <div
                      key={jockey.rank}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors"
                    >
                      <RankBadge rank={jockey.rank} />
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-xs border-2 flex-shrink-0
                          ${
                            jockey.rank === 1
                              ? "bg-secondary/15 border-secondary/40 text-secondary"
                              : "bg-surface-container-high border-outline-variant/50 text-on-surface-variant"
                          }`}
                      >
                        {jockey.initials}
                      </div>
                      <span className="text-sm font-semibold text-white flex-1">{jockey.name}</span>
                      <div className="flex items-center gap-1.5 text-primary text-xs font-bold">
                        <TrendingUp size={12} />
                        {jockey.points.toLocaleString()} pts
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Horses */}
          {activeTab === "horses" && (
            <div className="bg-[#161B22] border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
                <Medal className="w-4 h-4 text-secondary" />
                <span className="text-sm font-bold text-white">Top Horses</span>
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
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{horse.name}</p>
                        <p className="text-[11px] text-gray-500 truncate">Owner: {horse.stable}</p>
                      </div>
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
