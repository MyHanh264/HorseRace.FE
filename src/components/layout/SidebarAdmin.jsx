import { NavLink, useLocation } from "react-router-dom";
import {
  TrendingUp,
  Users,
  Award,
  Trophy,
  Flag,
  AlertTriangle,
  Gavel,
  Wallet,
  PlusCircle,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const menuItems = [
  { path: "/admin", label: "Tổng Quan", icon: TrendingUp, end: true },
  { path: "/admin/users", label: "Người Dùng", icon: Users },
  { path: "/admin/horses", label: "Danh Sách Ngựa", icon: Award, badge: 3 },
  { path: "/admin/tournaments", label: "Giải Đấu", icon: Trophy },
  { path: "/admin/races", label: "Chặng Đua", icon: Flag },
  { path: "/admin/discrepancies", label: "Xử Lý Sai Lệch", icon: AlertTriangle },
  { path: "/admin/violations", label: "Vi Phạm Kỷ Luật", icon: Gavel },
  { path: "/admin/points", label: "Quản Lý Ví Điểm", icon: Wallet },
];

export default function SidebarAdmin() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const getInitials = (name) => {
    if (!name) return "A";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside
      className="w-[272px] h-screen fixed left-0 top-0 flex flex-col py-8 px-4 overflow-y-auto"
      style={{
        background: "#161B22",
        borderRight: "1px solid #30363D",
      }}
    >
      {/* Brand */}
      <div className="px-4 mb-8 flex flex-col gap-1.5 shrink-0">
        <span
          className="font-serif text-2xl font-black"
          style={{ color: "#58A6FF", letterSpacing: "-0.01em" }}
        >
          GrandStride
        </span>
        <span
          className="font-sans text-[10px] font-bold tracking-widest uppercase"
          style={{ color: "#8B949E" }}
        >
          Bảng Điều Khiển Admin
        </span>
      </div>

      {/* CTA Button */}
      <button
        className="w-full flex items-center justify-center gap-2.5 py-3 rounded-lg font-sans font-semibold text-sm mb-6 admin-ambient-glow transition-all hover:opacity-90 active:scale-[0.98]"
        style={{ background: "#22D3EE", color: "#0D1117" }}
      >
        <PlusCircle className="w-4 h-4 fill-current" />
        Đăng ký ngựa đua
      </button>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = item.end
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path) && item.path !== "/admin"
              ? true
              : location.pathname === item.path;

          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={isActive ? "admin-sidebar-link active" : "admin-sidebar-link"}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge != null && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: "rgba(248, 81, 73, 0.15)",
                    color: "#F85149",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer — User Profile */}
      <div
        className="mt-4 pt-4 flex flex-col gap-3"
        style={{ borderTop: "1px solid #30363D" }}
      >
        {/* User card */}
        <div
          className="p-3 rounded-xl flex items-center gap-3"
          style={{
            background: "#0D1117",
            border: "1px solid rgba(48, 54, 61, 0.5)",
          }}
        >
          <div
            className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold shrink-0"
            style={{
              border: "2px solid #22D3EE",
              background: "#161B22",
              color: "#22D3EE",
            }}
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName || "Admin"}
                className="w-full h-full object-cover"
              />
            ) : (
              getInitials(user?.fullName || "Admin")
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: "#E6EDF3" }}>
              {user?.fullName || "Ban Quản Trị"}
            </p>
            <p className="text-[10px] truncate" style={{ color: "#8B949E" }}>
              {user?.email || "admin@grandstride.com"}
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg font-sans font-medium text-sm transition-all hover:opacity-90"
          style={{
            background: "transparent",
            color: "#F85149",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(248, 81, 73, 0.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <LogOut className="w-4 h-4" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
