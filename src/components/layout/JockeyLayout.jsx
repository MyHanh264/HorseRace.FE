import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LayoutDashboard, Mail, User } from "lucide-react";

const navItems = [
  { to: "/jockey", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/jockey/invitations", label: "Invitations", icon: Mail },
  { to: "/jockey/profile", label: "Profile", icon: User },
];

export default function JockeyLayout() {
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-[#0f1117] text-white">
      <aside className="w-52 flex flex-col bg-[#161b27] border-r border-white/10">
        {/* Brand */}
        <div className="p-5 border-b border-white/10">
          <div className="font-bold text-lg text-white">GrandStride</div>
          <div className="text-xs text-gray-400">Jockey</div>
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
                    ? "bg-yellow-500/20 text-yellow-400"
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
            <div className="w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center text-xs font-bold text-black">
              {user?.fullName?.[0] ?? "J"}
            </div>
            <div>
              <div className="text-sm font-medium truncate">
                {user?.fullName}
              </div>
              <div className="text-xs text-gray-400">
                Jockey ID: {user?.userId}
              </div>
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
