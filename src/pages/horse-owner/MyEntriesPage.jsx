import { useState, useEffect } from "react";
import { getMyEntries, getRaces } from "../../api/horseOwner";
import { ChevronDown, ChevronUp } from "lucide-react";

const STATUS_BADGE = {
  Approved: "bg-emerald-500 text-white",
  Pending: "bg-yellow-500 text-black",
  PendingReview: "bg-yellow-500 text-black",
  Rejected: "bg-red-500 text-white",
};

const STATUS_FILTERS = ["All", "Approved", "Pending", "Rejected"];

export default function MyEntriesPage() {
  const [entries, setEntries] = useState([]);
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([getMyEntries(), getRaces()])
      .then(([entriesData, racesData]) => {
        const entryList = Array.isArray(entriesData)
          ? entriesData
          : (entriesData?.data ?? entriesData?.entries ?? []);
        const raceList = Array.isArray(racesData)
          ? racesData
          : (racesData?.data ?? racesData?.races ?? []);
        setEntries(entryList);
        setRaces(raceList);
      })
      .catch((err) => {
        console.error("Failed:", err);
        setEntries([]);
        setRaces([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const getRaceById = (raceId) => races.find((r) => r.raceId === raceId);

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    return (
      new Date(dateStr).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }) + " GMT"
    );
  };

  const filtered = entries
    .filter((e) =>
      activeTab === "All"
        ? true
        : e.status === activeTab ||
          (activeTab === "Pending" && e.status === "PendingReview"),
    )
    .filter((e) => {
      if (!search) return true;
      const race = getRaceById(e.raceId);
      const q = search.toLowerCase();
      return (
        race?.name?.toLowerCase().includes(q) ||
        `horse #${e.horseId}`.toLowerCase().includes(q) ||
        e.status?.toLowerCase().includes(q)
      );
    });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">My Entries</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage and track your active and past race registrations.
          </p>
        </div>

        {/* Search + Filter buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 w-72">
            <svg
              className="w-4 h-4 text-gray-500 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entries, horses, or races..."
              className="bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none w-full"
            />
          </div>
          <button className="flex items-center gap-2 border border-white/20 text-gray-300 hover:bg-white/10 px-4 py-2 rounded-lg text-sm transition-colors">
            ☰ All Statuses
          </button>
          <button className="flex items-center gap-2 border border-white/20 text-gray-300 hover:bg-white/10 px-4 py-2 rounded-lg text-sm transition-colors">
            ☰ Date: Upcoming
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {STATUS_FILTERS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
              ${
                activeTab === tab
                  ? "bg-white text-black"
                  : "bg-white/10 text-gray-400 hover:bg-white/20"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#1a2035] rounded-xl border border-white/10 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-6 px-6 py-3 border-b border-white/10 text-xs text-gray-500 uppercase tracking-wider">
          <div className="col-span-2">Race & Date</div>
          <div>Tournament</div>
          <div>Horse & Jockey</div>
          <div>Status</div>
          <div>Action</div>
        </div>

        {/* Rows */}
        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-white/5 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 text-center py-16">
            {search ? `No results for "${search}"` : "No entries found."}
          </p>
        ) : (
          filtered.map((entry) => {
            const race = getRaceById(entry.raceId);
            return (
              <div
                key={entry.entryId}
                className="border-b border-white/5 last:border-0"
              >
                {/* Main row */}
                <div
                  className={`grid grid-cols-6 px-6 py-4 items-center hover:bg-white/5 transition-colors border-l-2
                  ${
                    entry.status === "Approved"
                      ? "border-l-emerald-500"
                      : entry.status === "Rejected"
                        ? "border-l-red-500"
                        : "border-l-yellow-500"
                  }`}
                >
                  {/* Race & Date */}
                  <div className="col-span-2">
                    <p className="text-white font-semibold text-sm">
                      {race?.name ?? `Race #${entry.raceId}`}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      🕐{" "}
                      {race
                        ? `${formatDate(race.scheduledAt)}, ${formatTime(race.scheduledAt)}`
                        : "—"}
                    </p>
                  </div>

                  {/* Tournament */}
                  <div>
                    <p className="text-gray-300 text-sm font-medium">
                      {entry.tournamentName ?? "—"}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {race?.status ?? "—"}
                    </p>
                  </div>

                  {/* Horse & Jockey */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center text-gray-600 text-xs">
                      {entry.horseImageUrl
                        ? <img src={entry.horseImageUrl} alt={entry.horseName} className="w-full h-full object-cover" />
                        : "🐎"}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">
                        {entry.horseName ?? `Horse #${entry.horseId}`}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {entry.jockeyName ?? "TBA"}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <div>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded font-semibold ${STATUS_BADGE[entry.status] ?? "bg-gray-500 text-white"}`}
                      >
                        {entry.status === "PendingReview"
                          ? "Pending Review"
                          : entry.status}
                      </span>
                    </div>
                    {race?.status === "InProgress" && (
                      <p className="text-emerald-400 text-xs">● Live</p>
                    )}
                    {race?.status === "Scheduled" && (
                      <p className="text-gray-400 text-xs">Upcoming</p>
                    )}
                  </div>

                  {/* Action */}
                  <div>
                    <button
                      onClick={() =>
                        setExpandedId(
                          expandedId === entry.entryId ? null : entry.entryId,
                        )
                      }
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {expandedId === entry.entryId ? (
                        <ChevronUp size={18} />
                      ) : (
                        <ChevronDown size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedId === entry.entryId && (
                  <div className="px-6 pb-5 pt-2 bg-white/5">
                    <div className="grid grid-cols-4 gap-3">
                      <div className="bg-[#1a2035] rounded-lg p-3 border border-white/10">
                        <p className="text-xs text-gray-500 mb-1">Entry ID</p>
                        <p className="text-sm text-white font-medium">
                          #{entry.entryId}
                        </p>
                      </div>
                      <div className="bg-[#1a2035] rounded-lg p-3 border border-white/10">
                        <p className="text-xs text-gray-500 mb-1">Race</p>
                        <p className="text-sm text-white font-medium">
                          {race?.name ?? `#${entry.raceId}`}
                        </p>
                      </div>
                      <div className="bg-[#1a2035] rounded-lg p-3 border border-white/10">
                        <p className="text-xs text-gray-500 mb-1">Scheduled</p>
                        <p className="text-sm text-white font-medium">
                          {race ? formatDate(race.scheduledAt) : "—"}
                        </p>
                      </div>
                      <div className="bg-[#1a2035] rounded-lg p-3 border border-white/10">
                        <p className="text-xs text-gray-500 mb-1">Horse ID</p>
                        <p className="text-sm text-white font-medium">
                          #{entry.horseId}
                        </p>
                      </div>
                      <div className="bg-[#1a2035] rounded-lg p-3 border border-white/10">
                        <p className="text-xs text-gray-500 mb-1">Jockey</p>
                        <p className="text-sm text-white font-medium">
                          {entry.jockeyName ?? "TBA"}
                        </p>
                      </div>
                      <div className="bg-[#1a2035] rounded-lg p-3 border border-white/10">
                        <p className="text-xs text-gray-500 mb-1">
                          Entry Status
                        </p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${STATUS_BADGE[entry.status]}`}
                        >
                          {entry.status}
                        </span>
                      </div>
                      <div className="bg-[#1a2035] rounded-lg p-3 border border-white/10">
                        <p className="text-xs text-gray-500 mb-1">
                          Race Status
                        </p>
                        <p className="text-sm text-white font-medium">
                          {race?.status ?? "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
