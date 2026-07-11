import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, Settings } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "../NotificationBell";
import { useAdminNotifications } from "../../hooks/useAdminNotifications";
import { useNotificationRead } from "../../hooks/useNotificationRead";

// `path: null` = no real page yet (keeps the old behavior, just a UI tab toggle).
const TABS = [
  { label: "Dashboard", path: "/admin" },
  { label: "Reports", path: null },
  { label: "Audit Log", path: "/admin/audit-log" },
];

function getInitials(name) {
  if (!name) return "A";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function AdminHeader() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  // Only used for the "Reports" tab — no real page yet, keeps the old toggle behavior.
  const [localTab, setLocalTab] = useState("Dashboard");
  const notifItems = useAdminNotifications();
  const notifRead = useNotificationRead(notifItems, user?.userId);

  return (
    <header className="h-16 px-8 flex items-center justify-between sticky top-0 z-40 bg-[#111418] border-b border-white/10">
      {/* Left — brand + tabs */}
      <div className="flex items-center gap-8">
        <h1 className="text-white font-bold text-base whitespace-nowrap">
          GrandStride{" "}
          <span className="text-primary">Admin</span>
        </h1>
        <nav className="flex">
          {TABS.map(({ label, path }) => {
            const isActive = path
              ? location.pathname === path
              : localTab === label;
            return (
              <button
                key={label}
                onClick={() => {
                  if (path) navigate(path);
                  else setLocalTab(label);
                }}
                className={`px-4 py-2 text-sm transition-colors border-b-2
                  ${
                    isActive
                      ? "border-primary text-primary font-semibold"
                      : "border-transparent text-gray-400 hover:text-white"
                  }`}
              >
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right — search + icons + profile */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-4 py-1.5 text-xs text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-primary/50 w-40 transition-colors"
          />
        </div>
        <NotificationBell items={notifItems} {...notifRead} />
        <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
          <Settings size={16} />
        </button>
        <div className="flex items-center gap-2 pl-3 ml-1 border-l border-white/10">
          <span className="text-gray-300 text-xs font-medium">Admin</span>
          <div className="w-7 h-7 rounded-full bg-primary-container/60 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-on-primary-container">
            {getInitials(user?.fullName)}
          </div>
        </div>
      </div>
    </header>
  );
}
