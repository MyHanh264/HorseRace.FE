import { useState } from "react"
import { Outlet } from "react-router-dom";
import SidebarAdmin from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import { useAuth } from "../../context/AuthContext";
import { getAccessToken, parseJwtPayload } from "../../utils/token";

export default function AdminLayout() {
  const [showDebug, setShowDebug] = useState(false);

  return (
    <div
      className="min-h-screen flex font-sans"
      style={{ background: "#0D1117", color: "#E6EDF3" }}
    >
      {/* Debug toggle — remove after debugging */}
      <button
        onClick={() => setShowDebug((s) => !s)}
        className="fixed bottom-4 right-4 z-[9999] px-3 py-1.5 rounded-lg text-[10px] font-mono bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30 transition-colors opacity-60"
        title="Toggle auth debug"
      >
        AUTH DEBUG
      </button>

      {showDebug && <AuthDebugOverlay />}

      {/* Fixed sidebar */}
      <SidebarAdmin />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 ml-[200px]">
        <AdminHeader />

        <main
          className="flex-1 p-8 overflow-y-auto"
          style={{ scrollbarWidth: "none" }}
        >
          <Outlet />
        </main>

        <footer
          className="h-14 px-8 flex justify-between items-center select-none"
          style={{
            borderTop: "1px solid #30363D",
            background: "#161B22",
            color: "#8B949E",
          }}
        >
          <span className="text-[10px] font-sans">
            &copy; {new Date().getFullYear()} GRANDSTRIDE TURF CLUB INC. TẤT CẢ
            QUYỀN ĐƯỢC BẢO LƯU
          </span>
          <span className="font-mono text-[10px] tracking-wide">
            PHL-V4.2 // CLOUD INGRESS ACTIVE
          </span>
        </footer>
      </div>
    </div>
  );
}

function AuthDebugOverlay() {
  const { user } = useAuth();
  const token = getAccessToken();
  const payload = token ? parseJwtPayload(token) : null;
  const tokenRole =
    payload?.role ??
    payload?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ??
    null;

  return (
    <div
      className="fixed bottom-12 right-4 z-[9999] w-72 p-4 rounded-xl border text-[11px] font-mono"
      style={{
        background: "#161B22",
        borderColor: "#30363D",
        color: "#E6EDF3",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <p className="text-yellow-400 font-bold mb-2 uppercase tracking-wider text-xs">Auth Debug</p>
      <div className="space-y-1.5">
        <div>
          <span style={{ color: "#8B949E" }}>user.role: </span>
          <span style={{ color: "#58A6FF" }}>{user?.role ?? "null"}</span>
        </div>
        <div>
          <span style={{ color: "#8B949E" }}>user.fullName: </span>
          <span>{user?.fullName ?? "null"}</span>
        </div>
        <div>
          <span style={{ color: "#8B949E" }}>token exists: </span>
          <span style={{ color: token ? "#3FB950" : "#F85149" }}>
            {token ? "YES" : "NO"}
          </span>
        </div>
        <div>
          <span style={{ color: "#8B949E" }}>payload.role: </span>
          <span style={{ color: "#58A6FF" }}>{tokenRole ?? "null"}</span>
        </div>
        {token && (
          <div>
            <span style={{ color: "#8B949E" }}>raw token: </span>
            <span style={{ color: "#3FB950", wordBreak: "break-all" }}>
              {token.slice(0, 20)}...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
