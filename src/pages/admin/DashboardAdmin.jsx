import { TrendingUp, Users, Award, Trophy, Flag, Clock, CheckCircle, AlertTriangle } from "lucide-react";

const stats = [
  {
    label: "Tổng người dùng",
    value: "1,234",
    icon: Users,
    color: "#58A6FF",
    bg: "rgba(88, 166, 255, 0.1)",
    border: "rgba(88, 166, 255, 0.2)",
    sub: "+12 từ tháng trước",
  },
  {
    label: "Ngựa đua đã đăng ký",
    value: "312",
    icon: Award,
    color: "#22D3EE",
    bg: "rgba(34, 211, 238, 0.1)",
    border: "rgba(34, 211, 238, 0.2)",
    sub: "48 chờ duyệt",
  },
  {
    label: "Giải đấu đang diễn ra",
    value: "4",
    icon: Trophy,
    color: "#E6C364",
    bg: "rgba(230, 195, 100, 0.1)",
    border: "rgba(230, 195, 100, 0.2)",
    sub: "1 sắp bắt đầu",
  },
  {
    label: "Chặng đua hôm nay",
    value: "7",
    icon: Flag,
    color: "#8DD6A6",
    bg: "rgba(141, 214, 166, 0.1)",
    border: "rgba(141, 214, 166, 0.2)",
    sub: "2 đã hoàn thành",
  },
];

const recentActivity = [
  { id: 1, text: "Người dùng mới đăng ký: Nguyễn Văn Minh", role: "JOCKEY", time: "5 phút trước", type: "user" },
  { id: 2, text: "Ngựa 'Tia Chớp' được duyệt tham gia giải Mùa Hè 2026", role: "HORSE", time: "18 phút trước", type: "horse" },
  { id: 3, text: "Kết quả chặng 3 - Trường đua Hà Nội đã được công bố", role: "RESULT", time: "42 phút trước", type: "race" },
  { id: 4, text: "Chu kỳ tính điểm Q2/2026 đã được cập nhật", role: "SYSTEM", time: "1 giờ trước", type: "system" },
  { id: 5, text: "Jockey Lê Thị Hoa yêu cầu cập nhật hồ sơ", role: "PENDING", time: "2 giờ trước", type: "pending" },
];

const roleBadge = {
  JOCKEY: { bg: "rgba(88, 166, 255, 0.12)", color: "#58A6FF", label: "Kỵ sĩ" },
  HORSE: { bg: "rgba(34, 211, 238, 0.12)", color: "#22D3EE", label: "Ngựa" },
  RESULT: { bg: "rgba(141, 214, 166, 0.12)", color: "#8DD6A6", label: "Kết quả" },
  SYSTEM: { bg: "rgba(230, 195, 100, 0.12)", color: "#E6C364", label: "Hệ thống" },
  PENDING: { bg: "rgba(248, 81, 73, 0.12)", color: "#F85149", label: "Chờ duyệt" },
  user: { bg: "rgba(88, 166, 255, 0.12)", color: "#58A6FF", label: "Người dùng" },
};

export default function DashboardAdmin() {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page header */}
      <div>
        <h1
          className="font-serif text-2xl font-black"
          style={{ color: "#E6EDF3" }}
        >
          Báo Cáo Phân Tích Tổng Quan
        </h1>
        <p className="text-sm mt-1" style={{ color: "#8B949E" }}>
          Theo dõi hoạt động hệ thống GrandStride Turf Club
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="admin-card p-6"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    background: stat.bg,
                    border: `1px solid ${stat.border}`,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <TrendingUp className="w-4 h-4" style={{ color: "#8B949E", opacity: 0.5 }} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B949E" }}>
                {stat.label}
              </p>
              <p className="text-3xl font-black mb-1" style={{ color: stat.color }}>
                {stat.value}
              </p>
              <p className="text-[11px]" style={{ color: "#8B949E" }}>
                {stat.sub}
              </p>
            </div>
          );
        })}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity — takes 2 columns */}
        <div
          className="lg:col-span-2 admin-card p-6"
          style={{ borderRadius: 12 }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-sm" style={{ color: "#E6EDF3" }}>
              Hoạt động gần đây
            </h2>
            <span
              className="text-[11px] px-3 py-1 rounded-full font-semibold"
              style={{
                background: "rgba(141, 214, 166, 0.1)",
                color: "#8DD6A6",
                border: "1px solid rgba(141, 214, 166, 0.2)",
              }}
            >
              Live
            </span>
          </div>

          <div className="space-y-1">
            {recentActivity.map((item) => {
              const badge = roleBadge[item.type] || roleBadge.user;
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer"
                  style={{ borderBottom: "1px solid rgba(48, 54, 61, 0.5)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(88, 166, 255, 0.04)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center mt-0.5 shrink-0"
                    style={{ background: badge.bg }}
                  >
                    {item.type === "user" && <Users className="w-3 h-3" style={{ color: badge.color }} />}
                    {item.type === "horse" && <Award className="w-3 h-3" style={{ color: badge.color }} />}
                    {item.type === "race" && <Flag className="w-3 h-3" style={{ color: badge.color }} />}
                    {item.type === "system" && <CheckCircle className="w-3 h-3" style={{ color: badge.color }} />}
                    {item.type === "pending" && <Clock className="w-3 h-3" style={{ color: badge.color }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: "#E6EDF3" }}>
                      {item.text}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        {badge.label}
                      </span>
                      <span className="text-[10px]" style={{ color: "#8B949E" }}>
                        {item.time}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column — Quick stats & system */}
        <div className="space-y-6">
          {/* System status */}
          <div className="admin-card p-6">
            <h2 className="font-semibold text-sm mb-4" style={{ color: "#E6EDF3" }}>
              Trạng thái hệ thống
            </h2>
            <div className="space-y-3">
              {[
                { label: "API Server", status: "Operational", ok: true },
                { label: "Database", status: "Operational", ok: true },
                { label: "Auth Service", status: "Operational", ok: true },
                { label: "Notification", status: "Degraded", ok: false },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "#8B949E" }}>{s.label}</span>
                  <span
                    className="text-[11px] font-semibold flex items-center gap-1.5"
                    style={{ color: s.ok ? "#8DD6A6" : "#F85149" }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: s.ok ? "#8DD6A6" : "#F85149" }}
                    />
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="admin-card p-6">
            <h2 className="font-semibold text-sm mb-4" style={{ color: "#E6EDF3" }}>
              Thao tác nhanh
            </h2>
            <div className="space-y-2">
              {[
                { label: "Duyệt tài khoản mới", icon: Users, color: "#58A6FF", count: 5 },
                { label: "Duyệt ngựa đua", icon: Award, color: "#22D3EE", count: 3 },
                { label: "Xử lý vi phạm", icon: AlertTriangle, color: "#F85149", count: 2 },
                { label: "Công bố kết quả", icon: Flag, color: "#8DD6A6", count: 0 },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    className="w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left"
                    style={{
                      background: action.count > 0 ? "rgba(88, 166, 255, 0.04)" : "transparent",
                      border: "1px solid rgba(48, 54, 61, 0.4)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(88, 166, 255, 0.08)";
                      e.currentTarget.style.borderColor = "rgba(88, 166, 255, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = action.count > 0 ? "rgba(88, 166, 255, 0.04)" : "transparent";
                      e.currentTarget.style.borderColor = "rgba(48, 54, 61, 0.4)";
                    }}
                  >
                    <Icon className="w-4 h-4 shrink-0" style={{ color: action.color }} />
                    <span className="flex-1 text-xs font-medium" style={{ color: "#E6EDF3" }}>
                      {action.label}
                    </span>
                    {action.count > 0 && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: "rgba(248, 81, 73, 0.15)", color: "#F85149" }}
                      >
                        {action.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
