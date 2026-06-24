import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trophy, Target, TrendingUp, BarChart2 } from "lucide-react";
import { getHorseById } from "../../api/horseOwner";

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

export default function HorseDetailPage() {
  const navigate = useNavigate();
  const { horseId } = useParams();
  const [horse, setHorse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHorseById(horseId)
      .then(setHorse)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [horseId]);

  const results = [];
  const upcoming = [];

  const totalRaces = results.length;
  const wins = 0;
  const top3 = 0;
  const winRate = 0;
  const avgFinish =
    totalRaces > 0
      ? (
          results.reduce((sum, r) => sum + r.finalPosition, 0) / totalRaces
        ).toFixed(1)
      : 0;
  const recentForm = [...results].reverse().slice(0, 5);

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>;
  if (!horse) return <div className="p-8 text-red-400">Horse not found.</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
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
        <div className="grid grid-cols-5 gap-3">
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
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${POSITION_STYLE(r.finalPosition)}`}
              >
                {r.finalPosition}
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
      <div className="grid grid-cols-2 gap-6">
        {/* Upcoming Races */}
        <div className="bg-[#1a2035] rounded-xl border border-white/10 p-6">
          <h3 className="text-white font-bold mb-4">
            Upcoming Scheduled Races
          </h3>
          <div className="space-y-4">
            {upcoming.map((race) => (
              <div
                key={race.raceId}
                className="border-l-2 border-emerald-500 pl-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-400 text-xs font-semibold">
                      {race.date} · {race.time}
                    </p>
                    <p className="text-white text-sm font-medium">
                      {race.name}
                    </p>
                    <p className="text-gray-500 text-xs">{race.venue}</p>
                  </div>
                  {race.status === "Entry Ready" ? (
                    <button className="bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                      Entry Ready
                    </button>
                  ) : (
                    <p className="text-gray-500 text-xs italic">
                      {race.status}
                    </p>
                  )}
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
              { label: "Owner", value: horse.owner },
              { label: "Breed", value: horse.breed },
              { label: "Color", value: horse.color },
              { label: "Born", value: horse.birthYear },
              { label: "Jockey (Reg.)", value: horse.jockey ?? "TBA" },
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
