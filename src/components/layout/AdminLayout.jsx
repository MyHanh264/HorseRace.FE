import { Outlet } from "react-router-dom";
import SidebarAdmin from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import RoleShell from "./RoleShell";

export default function AdminLayout() {
  return (
    <RoleShell
      sidebar={<SidebarAdmin />}
      header={<AdminHeader />}
      sidebarWidth={200}
      footer={
        <footer
          className="min-h-14 px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between select-none"
          style={{
            borderTop: "1px solid #30363D",
            background: "#161B22",
            color: "#8B949E",
          }}
        >
          <span className="text-[10px] font-sans">
            &copy; {new Date().getFullYear()} GRANDSTRIDE TURF CLUB INC. ALL
            RIGHTS RESERVED
          </span>
          <span className="font-mono text-[10px] tracking-wide">
            PHL-V4.2 // CLOUD INGRESS ACTIVE
          </span>
        </footer>
      }
    >
      <Outlet />
    </RoleShell>
  );
}
