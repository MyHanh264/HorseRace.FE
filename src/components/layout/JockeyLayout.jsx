import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Mail, Flag, BarChart2, User } from "lucide-react";

const navItems = [
  { to: "/jockey", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/jockey/invitations", label: "My Invitations", icon: Mail },
  { to: "/jockey/races", label: "My Races", icon: Flag },
  { to: "/jockey/leaderboard", label: "Leaderboard", icon: BarChart2 },
  { to: "/jockey/profile", label: "Profile", icon: User },
];

export default function JockeyLayout() {

  return (
    <div className="flex h-screen bg-[#0f1117] text-white">
      <aside className="w-52 flex flex-col bg-[#0d1117] border-r border-white/10 flex-shrink-0">
        {/* Avatar + brand */}
        <div className="flex flex-col items-center pt-8 pb-6 px-4 border-b border-white/10">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-600/40 to-yellow-900/40 border-2 border-yellow-500/50 flex items-center justify-center text-3xl mb-3">
            🏇
          </div>
          <p className="text-yellow-400 font-bold text-base">GrandStride</p>
          <p className="text-gray-400 text-xs mt-0.5">Elite Jockey</p>
          <span className="mt-2 text-xs px-3 py-0.5 rounded-full border border-yellow-500/40 text-yellow-400">
            Jockey Role
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors border-l-2
                ${
                  isActive
                    ? "border-l-yellow-400 bg-yellow-500/10 text-yellow-400"
                    : "border-l-transparent text-gray-400 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom badge */}
        <div className="p-4 border-t border-white/10">
          <div className="w-full text-center text-xs px-3 py-1.5 rounded-lg border border-yellow-500/30 text-yellow-400">
            Jockey Role
          </div>
        </div>
      </aside>

      {/* Page content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
