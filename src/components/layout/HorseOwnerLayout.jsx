import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  PawPrint,
  Mail,
  ClipboardList,
  User,
  LogOut,
} from "lucide-react";

// Chức năng: Định nghĩa các mục điều hướng cho thanh sidebar
const navItems = [
  { to: "/horse-owner", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/horse-owner/horses", label: "My Horses", icon: PawPrint },
  { to: "/horse-owner/invitations", label: "Invitations", icon: Mail },
  { to: "/horse-owner/entries", label: "My Entries", icon: ClipboardList },
  { to: "/horse-owner/profile", label: "Profile", icon: User },
];

// Chức năng: Lấy chữ cái viết tắt từ tên người dùng
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
    <div className="gs-sidebar">
      {/* Brand header */}
      <div className="gs-sidebar-brand">
        <div className="gs-sidebar-brand-icon">🐴</div>
        <div>
          <div className="gs-sidebar-brand-name">GrandStride</div>
          <div className="gs-sidebar-brand-role">Owner Portal</div>
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
            <div className="gs-sidebar-user-name">{user?.fullName || "Horse Owner"}</div>
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
