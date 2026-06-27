import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  PawPrint,
  Trophy,
  Mail,
  ClipboardList,
  User,
  LogOut,
} from "lucide-react";

const navItems = [
  { to: "/horse-owner", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/horse-owner/horses", label: "My Horses", icon: PawPrint },
  { to: "/horse-owner/tournaments", label: "Tournaments", icon: Trophy },
  { to: "/horse-owner/invitations", label: "Invitations", icon: Mail },
  { to: "/horse-owner/entries", label: "My Entries", icon: ClipboardList },
  { to: "/horse-owner/profile", label: "Profile", icon: User },
];

function getInitials(name) {
  if (!name) return "O";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function HorseOwnerLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen font-sans" style={{ background: "#0D1117", color: "#E6EDF3" }}>
      {/* Sidebar */}
      <aside className="w-[200px] h-screen fixed left-0 top-0 flex flex-col bg-[#111418] border-r border-white/10 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-full bg-primary-container/50 border border-primary/20 flex items-center justify-center text-base flex-shrink-0">
            🐴
          </div>
          <div className="min-w-0">
            <p className="text-primary font-bold text-sm leading-tight">GrandStride</p>
            <p className="text-gray-500 text-[10px]">Owner Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
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
                {user?.fullName || "Horse Owner"}
              </p>
              <p className="text-[10px] text-gray-500 truncate">{user?.email ?? ""}</p>
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

      {/* Page content */}
      <main className="flex-1 overflow-auto ml-[200px]">
        <Outlet />
      </main>
    </div>
  );
}
