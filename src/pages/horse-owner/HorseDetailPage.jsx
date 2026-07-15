import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trophy, Target, TrendingUp, BarChart2, AlertTriangle, RotateCw } from "lucide-react";
import { toast } from "sonner";
import {
  getHorseById,
  resubmitHorse,
  getMyEntries,
  getRaceResults,
  getRaces,
} from "../../api/horseOwner";

const STATUS_STYLE = {
  Approved: "bg-emerald-500/20 text-emerald-400 border border-emerald-700",
  Pending: "bg-yellow-500/20 text-yellow-400 border border-yellow-700",
  Rejected: "bg-red-500/20 text-red-400 border border-red-700",
};

const POSITION_STYLE = (pos) => {
  if (pos === 1) return "bg-yellow-500 text-black";
  if (pos === 2) return "bg-gray-300 text-black";
  if (pos === 3) return "bg-amber-600 text-white";
  return "bg-white/10 text-gray-300";
};

// ISO → "12 Aug 2026 · 14:30"
function formatRaceDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} · ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function HorseDetailPage() {
  const navigate = useNavigate();
  const { horseId } = useParams();
  const [horse, setHorse] = useState(null);
  const [entries, setEntries] = useState([]);
  const [raceResults, setRaceResults] = useState([]);
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resubmitting, setResubmitting] = useState(false);

  // BE chưa trả career stats trong GET /api/horses/{id} → ghép client-side:
  // entries (lọc theo ngựa) → entryId → race-results. /api/entries đã được BE scope
  // theo owner nên chỉ trả entry của chính mình.
  useEffect(() => {
    let active = true;

    Promise.allSettled([
      getHorseById(horseId),
      getMyEntries(),
      getRaceResults(),
      getRaces(),
    ])
      .then(([horseRes, entriesRes, resultsRes, racesRes]) => {
        if (!active) return;

        if (horseRes.status === "fulfilled") setHorse(horseRes.value);
        else console.error("Fetch horse failed:", horseRes.reason);

        // Stats là phụ — hỏng thì trang vẫn hiện, chỉ mất số liệu.
        if (entriesRes.status === "fulfilled")
          setEntries(Array.isArray(entriesRes.value) ? entriesRes.value : []);
        else console.error("Fetch entries failed:", entriesRes.reason);

        if (resultsRes.status === "fulfilled") setRaceResults(resultsRes.value);
        else console.error("Fetch race results failed:", resultsRes.reason);

        if (racesRes.status === "fulfilled")
          setRaces(Array.isArray(racesRes.value) ? racesRes.value : []);
        else console.error("Fetch races failed:", racesRes.reason);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [horseId]);

  const handleResubmit = async () => {
    setResubmitting(true);
    try {
      await resubmitHorse(horseId);
      toast.success("Horse resubmitted — awaiting Admin review.");
      const updated = await getHorseById(horseId);
      setHorse(updated);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Resubmit failed. Please try again.";
      toast.error(msg);
    } finally {
      setResubmitting(false);
    }
  };

  const raceById = useMemo(
    () => new Map(races.map((r) => [r.raceId, r])),
    [races],
  );

  // Entry của đúng con ngựa này (useParams trả string → so sánh theo Number).
  const horseEntries = useMemo(
    () => entries.filter((e) => e.horseId === Number(horseId)),
    [entries, horseId],
  );

  // Kết quả đã công bố của ngựa, sắp xếp mới → cũ theo giờ đua.
  const results = useMemo(() => {
    const entryIds = new Set(horseEntries.map((e) => e.entryId));
    return raceResults
      .filter((r) => entryIds.has(r.entryId))
      .map((r) => ({ ...r, scheduledAt: raceById.get(r.raceId)?.scheduledAt }))
      .sort(
        (a, b) =>
          new Date(b.scheduledAt ?? 0).getTime() -
          new Date(a.scheduledAt ?? 0).getTime(),
      );
  }, [horseEntries, raceResults, raceById]);

  // Race sắp tới ngựa đã có entry (chưa chạy xong).
  const upcoming = useMemo(
    () =>
      horseEntries
        .map((e) => ({ entry: e, race: raceById.get(e.raceId) }))
        .filter(
          ({ entry, race }) =>
            race &&
            entry.status !== "Rejected" &&
            entry.status !== "Withdrawn" &&
            race.status !== "Finished" &&
            race.status !== "Cancelled",
        )
        .sort(
          (a, b) =>
            new Date(a.race.scheduledAt).getTime() -
            new Date(b.race.scheduledAt).getTime(),
        ),
    [horseEntries, raceById],
  );

  // Race DQ vẫn có finalPosition (Publish xếp xuống cuối bảng) → phải loại theo isRaceDQ,
  // giống cách BE tính career stats của nài (PublishRaceResult: !IsDq && FinalPosition == 1).
  const totalRaces = results.length;
  const wins = results.filter((r) => !r.isRaceDQ && r.finalPosition === 1).length;
  const top3 = results.filter(
    (r) => !r.isRaceDQ && r.finalPosition != null && r.finalPosition <= 3,
  ).length;
  const winRate = totalRaces > 0 ? Math.round((wins / totalRaces) * 100) : 0;

  const ranked = results.filter((r) => !r.isRaceDQ && r.finalPosition != null);
  const avgFinish =
    ranked.length > 0
      ? (
          ranked.reduce((sum, r) => sum + r.finalPosition, 0) / ranked.length
        ).toFixed(1)
      : "—";

  const recentForm = results.slice(0, 5);

  if (loading) return <div className="px-4 sm:px-6 lg:px-8 py-4 lg:py-8 text-gray-400">Loading...</div>;
  if (!horse) return <div className="px-4 sm:px-6 lg:px-8 py-4 lg:py-8 text-red-400">Horse not found.</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 lg:py-8 max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate("/horse-owner/horses")}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm"
      >
        <ArrowLeft size={16} />
        Back to My Horses
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{horse.name}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {horse.breed} · {new Date().getFullYear() - horse.birthYear}yo ·{" "}
            {horse.color}
          </p>
        </div>
        <span
          className={`text-xs px-3 py-1 rounded-full ${STATUS_STYLE[horse.status]}`}
        >
          {horse.status}
        </span>
      </div>

      {/* Rejection reason + Resubmit for review */}
      {horse.status === "Rejected" && (
        <div className="flex items-start gap-3 bg-red-900/20 border border-red-700 rounded-xl px-4 py-3 mb-8">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-red-400 uppercase tracking-wider mb-1">
              Rejection Reason
            </p>
            <p className="text-sm text-red-300">
              {horse.rejectionReason || "—"}
            </p>
          </div>
          <button
            onClick={handleResubmit}
            disabled={resubmitting}
            className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-semibold text-xs px-3 py-2 rounded-lg transition-colors shrink-0"
          >
            <RotateCw className={`w-3.5 h-3.5 ${resubmitting ? "animate-spin" : ""}`} />
            {resubmitting ? "Resubmitting..." : "Resubmit for Review"}
          </button>
        </div>
      )}

      {/* Hero image */}
      <div className="h-56 bg-gray-800 rounded-2xl overflow-hidden mb-8">
        {horse.imageUrl ? (
          <img
            src={horse.imageUrl}
            alt={horse.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-6xl">
            🐎
          </div>
        )}
      </div>

      {/* Career Stats */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-emerald-500 rounded-full inline-block" />
          Career Stats
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            {
              label: "TOTAL RACES",
              value: totalRaces,
              sub: "races entered",
              icon: <BarChart2 size={16} />,
            },
            {
              label: "WINS",
              value: wins,
              sub: "1st place finishes",
              icon: <Trophy size={16} />,
            },
            {
              label: "TOP 3",
              value: top3,
              sub: "podium finishes",
              icon: <Target size={16} />,
            },
            {
              label: "WIN RATE",
              value: `${winRate}%`,
              sub: "",
              icon: <TrendingUp size={16} />,
            },
            {
              label: "AVG FINISH",
              value: avgFinish,
              sub: "average across races",
              icon: <BarChart2 size={16} />,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[#1a2035] rounded-xl p-4 border border-white/10"
            >
              <div className="text-emerald-400 mb-2">{stat.icon}</div>
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              {stat.sub && (
                <p className="text-xs text-gray-500 mt-1">{stat.sub}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Form */}
      <div className="bg-[#1a2035] rounded-xl border border-white/10 p-6 mb-8">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">
          Recent Form (Last 5 Races)
        </p>
        <div className="flex items-center gap-4">
          {recentForm.map((r, i) => (
            <div key={r.entryId} className="flex flex-col items-center gap-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${POSITION_STYLE(r.finalPosition)}`}
                title={raceById.get(r.raceId)?.name ?? `Race #${r.raceId}`}
              >
                {/* Race DQ / DNF không có thứ hạng chung cuộc */}
                {r.isRaceDQ ? "DQ" : (r.finalPosition ?? "–")}
              </div>
              {i === 0 && <p className="text-xs text-gray-500">Latest</p>}
            </div>
          ))}
          {recentForm.length === 0 && (
            <p className="text-gray-500 text-sm">No recent races.</p>
          )}
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Races */}
        <div className="bg-[#1a2035] rounded-xl border border-white/10 p-6">
          <h3 className="text-white font-bold mb-4">
            Upcoming Scheduled Races
          </h3>
          <div className="space-y-4">
            {upcoming.length === 0 && (
              <p className="text-gray-500 text-sm">No upcoming races.</p>
            )}
            {upcoming.map(({ entry, race }) => (
              <div
                key={entry.entryId}
                className="border-l-2 border-emerald-500 pl-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-400 text-xs font-semibold">
                      {formatRaceDate(race.scheduledAt)}
                    </p>
                    <p className="text-white text-sm font-medium">
                      {race.name}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {race.tournamentName ?? "—"}
                    </p>
                  </div>
                  <p
                    className={`text-xs font-semibold ${
                      entry.status === "Approved"
                        ? "text-emerald-400"
                        : "text-gray-500 italic"
                    }`}
                  >
                    {entry.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Horse Details */}
        <div className="bg-[#1a2035] rounded-xl border border-white/10 p-6">
          <h3 className="text-white font-bold mb-4">Horse Details</h3>
          <div className="space-y-3">
            {[
              // BE trả ownerName (không phải owner) — dùng sai tên field nên dòng này luôn trống.
              { label: "Owner", value: horse.ownerName ?? "—" },
              { label: "Breed", value: horse.breed ?? "—" },
              { label: "Color", value: horse.color ?? "—" },
              { label: "Born", value: horse.birthYear ?? "—" },
              // Ngựa không có nài cố định — nài gắn theo từng Entry/Race.
              {
                label: "Jockey (Next Race)",
                value: upcoming[0]?.entry.jockeyName ?? "TBA",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex justify-between items-center border-b border-white/5 pb-2"
              >
                <p className="text-gray-400 text-sm">{item.label}</p>
                <p className="text-white text-sm font-medium">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
