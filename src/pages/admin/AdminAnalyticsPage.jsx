import { useState } from "react";
import {
  Users,
  Flag,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
} from "lucide-react";

const TIME_FILTERS = ["7d", "30d", "90d", "All Time"];

const STATS = [
  {
    label: "Total Users",
    value: "14,209",
    change: "12.5%",
    up: true,
    icon: Users,
    color: "text-primary",
    iconBg: "bg-primary-container/20",
    border: "border-primary/20",
  },
  {
    label: "Active Horses",
    value: "3,842",
    change: "3.2%",
    up: true,
    icon: Activity,
    color: "text-secondary",
    iconBg: "bg-secondary-container/20",
    border: "border-secondary/20",
  },
  {
    label: "Races This Month",
    value: "412",
    change: "1.4%",
    up: false,
    icon: Flag,
    color: "text-error",
    iconBg: "bg-error-container/20",
    border: "border-error/20",
  },
  {
    label: "Points in Circulation",
    value: "2.4M",
    change: "24.8%",
    up: true,
    icon: Layers,
    color: "text-on-surface-variant",
    iconBg: "bg-surface-container-high",
    border: "border-outline-variant",
  },
];

export default function DashboardAdmin() {
  const [activeFilter, setActiveFilter] = useState("30d");

  return (
    <div className="p-8">
      {/* Section header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Platform Overview</h2>
          <p className="text-gray-400 text-sm mt-1">
            Real-time telemetry and performance metrics.
          </p>
        </div>

        {/* Time filters */}
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
                <span
                  className={`text-xs font-semibold flex items-center gap-1 ${
                    stat.up ? "text-primary" : "text-error"
                  }`}
                >
                  {stat.up ? (
                    <TrendingUp size={12} />
                  ) : (
                    <TrendingDown size={12} />
                  )}
                  {stat.up ? "↑" : "↓"} {stat.change}
                </span>
              </div>
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
                {stat.label}
              </p>
              <p className="text-white text-3xl font-bold">{stat.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
