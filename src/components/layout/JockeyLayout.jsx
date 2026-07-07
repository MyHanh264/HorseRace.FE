import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Mail, Flag, BarChart2, User, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// Chức năng: Định nghĩa các mục điều hướng cho thanh sidebar
const navItems = [
  { to: "/jockey", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/jockey/invitations", label: "My Invitations", icon: Mail },
  { to: "/jockey/races", label: "My Races", icon: Flag },
  { to: "/jockey/leaderboard", label: "Leaderboard", icon: BarChart2 },
  { to: "/jockey/profile", label: "Profile", icon: User },
];

// Chức năng: Lấy chữ cái viết tắt từ tên người dùng
function getInitials(name) {
  if (!name) return "J";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function JockeyLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="gs-sidebar">
      {/* Brand header */}
      <div className="gs-sidebar-brand">
        <div className="gs-sidebar-brand-icon">🏇</div>
        <div>
          <div className="gs-sidebar-brand-name">GrandStride</div>
          <div className="gs-sidebar-brand-role">Jockey Portal</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="gs-sidebar-nav">
        <div className="gs-sidebar-section-label">Menu</div>
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `gs-sidebar-link${isActive ? " active" : ""}`
            }
          >
            <span className="gs-sidebar-icon">
              <Icon size={16} />
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer — user + logout */}
      <div className="gs-sidebar-footer">
        <div className="gs-sidebar-user">
          <div className="gs-sidebar-user-avatar">{getInitials(user?.fullName)}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="gs-sidebar-user-name">{user?.fullName || "Jockey"}</div>
            <div className="gs-sidebar-user-email">{user?.email ?? ""}</div>
          </div>
        </div>
        <button onClick={logout} className="gs-sidebar-logout">
          <span className="gs-sidebar-logout-icon">
            <LogOut size={15} />
          </span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
