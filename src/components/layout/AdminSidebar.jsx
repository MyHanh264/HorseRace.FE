import { NavLink } from "react-router-dom";
import {
  BarChart2,
  Users,
  List,
  Trophy,
  Flag,
  AlertTriangle,
  Shield,
  Layers,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const menuItems = [
  { path: "/admin", label: "Analytics", icon: BarChart2, end: true },
  { path: "/admin/users", label: "Users", icon: Users },
  { path: "/admin/horses", label: "Horses", icon: List },
  { path: "/admin/tournaments", label: "Tournaments", icon: Trophy },
  { path: "/admin/races", label: "Races", icon: Flag },
  { path: "/admin/discrepancies", label: "Discrepancies", icon: AlertTriangle },
  { path: "/admin/violations", label: "Violations", icon: Shield },
  { path: "/admin/point-management", label: "Point Management", icon: Layers },
];

function getInitials(name) {
  if (!name) return "A";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function SidebarAdmin() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-[200px] h-screen fixed left-0 top-0 flex flex-col bg-[#111418] border-r border-white/10 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-full bg-primary-container/50 border border-primary/20 flex items-center justify-center text-base flex-shrink-0">
          🏇
        </div>
        <div className="min-w-0">
          <p className="text-primary font-bold text-sm leading-tight">
            GrandStride
          </p>
          <p className="text-gray-500 text-[10px]">Admin Dashboard</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
        {menuItems.map(({ path, label, icon: Icon, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors w-full
              ${
                isActive
                  ? "bg-primary-container/30 text-primary font-semibold"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <Icon size={15} className="flex-shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer — user + logout */}
      <div className="p-3 border-t border-white/10 space-y-2">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-7 h-7 rounded-full bg-primary-container/60 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-on-primary-container flex-shrink-0">
            {getInitials(user?.fullName)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {user?.fullName || "Admin"}
            </p>
            <p className="text-[10px] text-gray-500 truncate">
              {user?.email ?? ""}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </aside>
  );
}
