import { Search, Bell, Settings, Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function AdminHeader() {
  const { user } = useAuth();

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
    <header
      className="h-20 px-8 flex items-center justify-between sticky top-0 z-40"
      style={{
        background: "#161B22",
        borderBottom: "1px solid #30363D",
      }}
    >
      {/* Left section */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          className="md:hidden p-2 rounded-lg transition-colors"
          style={{ color: "#8B949E" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#21262D")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1
          className="font-serif text-lg font-black uppercase"
          style={{ color: "#58A6FF", letterSpacing: "0.05em" }}
        >
          GrandStride
        </h1>
      </div>

      {/* Center — Search */}
      <div className="relative group hidden md:block">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "#8B949E" }}
        />
        <input
          type="text"
          placeholder="Tìm kiếm hồ sơ..."
          className="w-60 text-xs rounded-full pl-9 pr-4 py-2 transition-all focus:outline-none"
          style={{
            background: "#21262D",
            border: "1px solid #30363D",
            color: "#E6EDF3",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#22D3EE";
            e.target.style.boxShadow = "0 0 0 3px rgba(34, 211, 238, 0.15)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#30363D";
            e.target.style.boxShadow = "none";
          }}
        />
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-1">
        {/* Notification bell */}
        <button
          className="relative p-2 rounded-lg transition-colors"
          style={{ color: "#8B949E" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#21262D")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <Bell className="w-5 h-5" />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full animate-pulse"
            style={{ background: "#F85149" }}
          />
        </button>

        {/* Settings */}
        <button
          className="p-2 rounded-lg transition-all"
          style={{ color: "#8B949E" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#21262D";
            e.currentTarget.style.transform = "rotate(45deg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.transform = "rotate(0deg)";
          }}
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Divider */}
        <div
          className="h-8 w-px mx-1"
          style={{ background: "#30363D" }}
        />

        {/* Profile */}
        <div className="flex items-center gap-3 pl-4">
          <span
            className="hidden lg:inline font-semibold text-xs"
            style={{ color: "#22D3EE" }}
          >
            Ban Điều Hành
          </span>
          <div
            className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold shrink-0"
            style={{
              border: "2px solid #22D3EE",
              background: "#0D1117",
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
        </div>
      </div>
    </header>
  );
}
