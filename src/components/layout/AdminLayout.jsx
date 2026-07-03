import { Outlet } from "react-router-dom";
import SidebarAdmin from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

export default function AdminLayout() {
  return (
    <div
      className="min-h-screen flex font-sans"
      style={{ background: "#0D1117", color: "#E6EDF3" }}
    >
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
