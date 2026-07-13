import { useState, useEffect } from "react";
import { Calendar, ChevronRight, CircleCheck, Flag } from "lucide-react";
import { getRaces, getEntries, getRaceResults } from "../../api/jockey";
import { useAuth } from "../../context/AuthContext";

const TABS = ["Upcoming", "Completed"];

function fmtDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  const diff = Math.round((date - new Date()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function fmtTime(d) {
  if (!d) return "";
  return (
    new Date(d).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }) + " GMT"
  );
}

function isTomorrow(d) {
  if (!d) return false;
  return Math.round((new Date(d) - new Date()) / 86400000) === 1;
}

// Position/DQ label from a published RaceResult row (null while the race hasn't been published yet).
function positionLabel(result) {
  if (!result) return null;
  if (result.isRaceDQ) return "DQ";
  switch (result.finalPosition) {
    case 1: return "1ST PLACE";
    case 2: return "2ND PLACE";
    case 3: return "3RD PLACE";
    default: return result.finalPosition ? `#${result.finalPosition}` : null;
  }
}

// ── Featured card (large left) ───────────────────────────────────────────────
function FeaturedRaceCard({ race }) {
  const tomorrow = isTomorrow(race.scheduledAt);
  return (
    <div className="bg-[#141c2e] border border-white/10 rounded-2xl p-6 flex flex-col justify-between min-h-[220px] relative overflow-hidden">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          {race.roundType && (
            <span className="text-[10px] px-2.5 py-1 rounded border border-white/15 text-gray-400 font-semibold uppercase tracking-widest">
              {race.roundType}
            </span>
          )}
          <h2 className="text-white font-bold text-2xl leading-tight mt-2">
            {race.name ?? `Race #${race.raceId}`}
          </h2>
          <p className="text-gray-500 text-xs mt-1">
            {race.tournamentName ?? "—"}
          </p>
        </div>

        {/* Date/time */}
        <div className="text-right flex-shrink-0">
          {tomorrow ? (
            <>
              <p className="text-yellow-400 font-bold text-lg leading-tight">
                Tomorrow
              </p>
              <p className="text-gray-400 text-xs mt-0.5">
                {fmtTime(race.scheduledAt)}
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-200 font-semibold text-sm">
                {fmtDate(race.scheduledAt)}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">
                {fmtTime(race.scheduledAt)}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Bottom row — mount + action */}
      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center text-sm flex-shrink-0">
            🐎
          </div>
          <div>
            <p className="text-gray-500 text-[10px] uppercase tracking-wider">
              Mount
            </p>
            <p className="text-white text-sm font-bold">
              {race.entry?.horseName ?? "—"}
            </p>
          </div>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-colors">
          View Details <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Small upcoming card ───────────────────────────────────────────────────────
function SmallRaceCard({ race }) {
  return (
    <div className="bg-[#141c2e] border border-white/10 rounded-2xl p-5 flex flex-col justify-between min-h-[180px]">
      {/* Top */}
      <div className="flex items-start justify-between gap-2">
        <div>
          {race.roundType && (
            <span className="text-[10px] px-2 py-0.5 rounded border border-yellow-500/30 text-yellow-400 bg-yellow-500/10 font-semibold uppercase tracking-widest">
              {race.roundType}
            </span>
          )}
          <h3 className="text-white font-bold text-base leading-snug mt-2">
            {race.name ?? `Race #${race.raceId}`}
          </h3>
          <p className="text-gray-500 text-xs mt-0.5">
            {race.tournamentName ?? "—"}
          </p>
        </div>
        <Calendar size={15} className="text-gray-600 flex-shrink-0 mt-1" />
      </div>

      {/* Bottom */}
      <div className="mt-4 space-y-2">
        <div>
          <p className="text-gray-600 text-[10px] uppercase tracking-wider">
            Date &amp; Time
          </p>
          <p className="text-gray-300 text-xs font-medium mt-0.5">
            {fmtDate(race.scheduledAt)}
            {fmtTime(race.scheduledAt) ? ` • ${fmtTime(race.scheduledAt)}` : ""}
          </p>
        </div>
        <div>
          <p className="text-gray-600 text-[10px] uppercase tracking-wider">
            Mount
          </p>
          <p className="text-white text-xs font-bold mt-0.5">
            {race.entry?.horseName ?? "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Completed card ────────────────────────────────────────────────────────────
function CompletedRaceCard({ race }) {
  const placement = positionLabel(race.result);
  const isDq = race.result?.isRaceDQ;
  return (
    <div className="bg-[#141c2e] border border-white/10 rounded-2xl p-5 flex flex-col justify-between min-h-[180px] opacity-90">
      {/* Top */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <CircleCheck size={15} className="text-gray-500 flex-shrink-0" />
          <h3 className="text-gray-400 font-bold text-base leading-snug line-through decoration-gray-600">
            {race.name ?? `Race #${race.raceId}`}
          </h3>
        </div>
        {placement && (
          <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider whitespace-nowrap flex-shrink-0 ${
            isDq
              ? "border-red-500/40 text-red-400 bg-red-500/10"
              : "border-yellow-500/40 text-yellow-400 bg-yellow-500/10"
          }`}>
            {placement}
          </span>
        )}
      </div>

      {/* Bottom */}
      <div className="mt-4 space-y-2">
        <div>
          <p className="text-gray-600 text-[10px] uppercase tracking-wider">
            Mount
          </p>
          <p className="text-gray-400 text-xs font-semibold mt-0.5">
            {race.entry?.horseName ?? "—"}
          </p>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <p className="text-gray-600 text-[10px] uppercase tracking-wider">
            Points
          </p>
          <p className="text-yellow-400 text-sm font-bold">
            {race.result ? `${race.result.totalPoints} pts` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function JockeyRacesPage() {
  const { user } = useAuth();
  const userId = user?.userId ?? user?.id;

  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Upcoming");

  useEffect(() => {
    Promise.all([getRaces(), getEntries(), getRaceResults()])
      .then(([racesData, entriesData, resultsData]) => {
        const raceList = Array.isArray(racesData) ? racesData : (racesData?.data ?? []);
        const entryList = Array.isArray(entriesData) ? entriesData : [];
        const resultList = Array.isArray(resultsData) ? resultsData : [];

        const resultMap = {};
        resultList.forEach((r) => { resultMap[r.entryId] = r; });

        // JOCKEY entries aren't scoped server-side, so filter to this jockey's confirmed mounts.
        const myEntries = entryList.filter(
          (e) => e.jockeyId === userId && e.status === "Approved",
        );

        const myRaces = myEntries
          .map((entry) => {
            const race = raceList.find((r) => r.raceId === entry.raceId);
            if (!race) return null;
            return { ...race, entry, result: resultMap[entry.entryId] ?? null };
          })
          .filter(Boolean);

        setRaces(myRaces);
      })
      .catch((err) => console.error("Failed to load jockey races:", err))
      .finally(() => setLoading(false));
  }, [userId]);

  const upcoming = races.filter((r) => r.status === "Scheduled");
  const completed = races.filter(
    (r) => r.status === "Finished" || r.status === "Cancelled",
  );
  const filtered = activeTab === "Upcoming" ? upcoming : completed;
  const [featured, ...rest] = filtered;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">My Races</h1>

        {/* Tab toggle */}
        <div className="flex bg-[#0f1628] border border-white/10 rounded-xl p-1 gap-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors
                ${
                  activeTab === tab
                    ? "bg-[#1e2a3a] text-white shadow"
                    : "text-gray-500 hover:text-gray-300"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-52 bg-white/5 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Flag size={32} className="text-gray-700" />
          <p className="text-gray-500 text-sm">
            No {activeTab.toLowerCase()} races.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Row 1: featured (large) + first small */}
          {featured && (
            <div className="grid grid-cols-[1.4fr_1fr] gap-4">
              <FeaturedRaceCard race={featured} />
              {rest[0] &&
                (activeTab === "Completed" ? (
                  <CompletedRaceCard race={rest[0]} />
                ) : (
                  <SmallRaceCard race={rest[0]} />
                ))}
            </div>
          )}

          {/* Row 2+: remaining in 2-col grid */}
          {rest.length > 1 && (
            <div className="grid grid-cols-2 gap-4">
              {rest
                .slice(1)
                .map((race) =>
                  activeTab === "Completed" ? (
                    <CompletedRaceCard key={race.raceId} race={race} />
                  ) : (
                    <SmallRaceCard key={race.raceId} race={race} />
                  ),
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
