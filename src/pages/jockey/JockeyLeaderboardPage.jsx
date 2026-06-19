import { useState } from "react";
import { Trophy, TrendingUp, Medal, Users, Flag } from "lucide-react";
import { TOP_HORSES, TOP_JOCKEYS } from "../../constants";

const TABS = [
  { key: "jockeys", label: "Nài Ngựa", icon: Users },
  { key: "horses", label: "Chiến Mã", icon: Flag },
];

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

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-secondary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Bảng Xếp Hạng</h1>
          <p className="text-xs text-gray-400 mt-0.5">Kết quả tổng hợp từ 2024 – 2026</p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] font-bold text-red-400 uppercase tracking-wider">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
          </span>
          Live
        </span>
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

      {/* Jockeys */}
      {activeTab === "jockeys" && (
        <div className="bg-[#161B22] border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
            <Medal className="w-4 h-4 text-secondary" />
            <span className="text-sm font-bold text-white">Top Nài Ngựa</span>
            <span className="ml-auto text-[11px] text-gray-500 font-mono uppercase tracking-wider">
              Tổng thắng
            </span>
          </div>
          <div className="divide-y divide-white/5">
            {TOP_JOCKEYS.map((jockey) => (
              <div
                key={jockey.name}
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
                  {jockey.wins} thắng
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Horses */}
      {activeTab === "horses" && (
        <div className="bg-[#161B22] border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
            <Medal className="w-4 h-4 text-secondary" />
            <span className="text-sm font-bold text-white">Top Chiến Mã</span>
            <span className="ml-auto text-[11px] text-gray-500 font-mono uppercase tracking-wider">
              Điểm tích lũy
            </span>
          </div>
          <div className="divide-y divide-white/5">
            {TOP_HORSES.map((horse) => (
              <div
                key={horse.name}
                className="flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors"
              >
                <RankBadge rank={horse.rank} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{horse.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">Chuồng: {horse.stable}</p>
                </div>
                <span className="text-on-surface font-mono text-xs font-bold bg-white/5 px-3 py-1 rounded-lg">
                  {horse.pts.toLocaleString()} điểm
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-[11px] text-gray-600 mt-6">
        Dữ liệu cập nhật theo thời gian thực từ hệ thống GrandStride
      </p>
    </div>
  );
}
