import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  PawPrint,
  Mail,
  ClipboardList,
  Calendar,
  BarChart2,
  User,
} from "lucide-react";

const navItems = [
  { to: "/horse-owner", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/horse-owner/horses", label: "My Horses", icon: PawPrint },
  { to: "/horse-owner/invitations", label: "Invitations", icon: Mail },
  { to: "/horse-owner/entries", label: "My Entries", icon: ClipboardList },
  { to: "/horse-owner/schedule", label: "Race Schedule", icon: Calendar },
  { to: "/horse-owner/leaderboard", label: "Leaderboard", icon: BarChart2 },
  { to: "/horse-owner/profile", label: "Profile", icon: User },
];

export default function HorseOwnerLayout() {
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-[#0f1117] text-white">
      <aside className="w-52 flex flex-col bg-[#161b27] border-r border-white/10">
        {/* Brand */}
        <div className="p-5 border-b border-white/10">
          <div className="font-bold text-lg text-white">GrandStride</div>
          <div className="text-xs text-gray-400">Horse Owner</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                ${
                  isActive
                    ? "bg-emerald-600/20 text-emerald-400"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold">
              {user?.fullName?.[0] ?? "O"}
            </div>
            <div>
              <div className="text-sm font-medium truncate">
                {user?.fullName}
              </div>
              <div className="text-xs text-gray-400">Owner ID: {user?.userId}</div>
            </div>
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
