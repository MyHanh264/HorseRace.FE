import { useCallback, useEffect, useState } from "react";
import { approveUser, getPendingUsers, rejectUser } from "../../api/admin";
import {
  ShieldCheck,
  CircleCheck,
  XCircle,
  Clock,
  Search,
  UserPlus,
} from "lucide-react";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN");
}

function getRoleBadgeClass(role) {
  switch (role) {
    case "HORSE_OWNER":
      return "gs-badge gs-badge-secondary";
    case "JOCKEY":
      return "gs-badge gs-badge-primary";
    default:
      return "gs-badge gs-badge-neutral";
  }
}

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getPendingUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách chờ duyệt",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getPendingUsers()
      .then((data) => { if (active) setUsers(Array.isArray(data) ? data : []); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Không tải được danh sách chờ duyệt"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const handleApprove = async (userId) => {
    setActionId(userId);
    setError("");
    try {
      await approveUser(userId);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Duyệt tài khoản thất bại");
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (userId) => {
    setActionId(userId);
    setError("");
    try {
      await rejectUser(userId, rejectReason.trim() || null);
      setRejectingId(null);
      setRejectReason("");
      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Từ chối tài khoản thất bại",
      );
    } finally {
      setActionId(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      !searchQuery ||
      (u.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.roleName || u.roleCode || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  return (
      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8">
        {/* Page header */}
        <div
          className="mb-8 animate-fade-in-up"
          style={{ opacity: 0, animationFillMode: "forwards" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-on-surface">
                Bảng Quản Trị
              </h1>
              <p className="text-on-surface-variant text-sm">
                Duyệt tài khoản Chủ ngựa và Kỵ sĩ đang chờ phê duyệt.
              </p>
            </div>
          </div>
          <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-primary to-secondary mt-4" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div
            className="gs-card p-5 flex items-center gap-4 animate-fade-in-up delay-row-1"
            style={{ opacity: 0, animationFillMode: "forwards" }}
          >
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-on-surface font-mono">
                {users.length}
              </p>
              <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">
                Chờ duyệt
              </p>
            </div>
          </div>
          <div
            className="gs-card p-5 flex items-center gap-4 animate-fade-in-up delay-row-2"
            style={{ opacity: 0, animationFillMode: "forwards" }}
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-on-surface font-mono">—</p>
              <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">
                Đã duyệt hôm nay
              </p>
            </div>
          </div>
          <div
            className="gs-card p-5 flex items-center gap-4 animate-fade-in-up delay-row-3"
            style={{ opacity: 0, animationFillMode: "forwards" }}
          >
            <div className="w-10 h-10 rounded-lg bg-error/10 border border-error/20 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-error" />
            </div>
            <div>
              <p className="text-2xl font-bold text-on-surface font-mono">—</p>
              <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">
                Đã từ chối hôm nay
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error ? (
          <div className="mb-5 auth-alert auth-alert--error flex items-start gap-3">
            <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Search bar */}
        <div className="mb-5 relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, email hoặc vai trò..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant/40 text-sm rounded-xl pl-11 pr-4 py-3 text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-on-surface-variant text-sm">
                Đang tải danh sách...
              </span>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="gs-card p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
              <CircleCheck className="w-8 h-8 text-primary/60" />
            </div>
            <h3 className="font-serif text-xl font-bold text-on-surface mb-2">
              {searchQuery ? "Không tìm thấy kết quả" : "Tất cả đã được xử lý"}
            </h3>
            <p className="text-on-surface-variant text-sm">
              {searchQuery
                ? "Thử từ khóa khác."
                : "Không có tài khoản nào đang chờ duyệt."}
            </p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-3.5 h-3.5 text-on-surface-variant/60" />
                      Họ tên
                    </div>
                  </th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Ngày đăng ký</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((item, i) => (
                  <tr
                    key={item.userId}
                    className={`animate-fade-in-up delay-row-${(i % 4) + 1}`}
                    style={{ opacity: 0, animationFillMode: "forwards" }}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-outline-variant/50 flex items-center justify-center text-xs font-bold text-on-surface-variant">
                          {(item.fullName || "U").charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-on-surface">
                          {item.fullName}
                        </span>
                      </div>
                    </td>
                    <td className="text-on-surface-variant">{item.email}</td>
                    <td>
                      <span
                        className={getRoleBadgeClass(
                          item.roleName || item.roleCode,
                        )}
                      >
                        {item.roleName || item.roleCode}
                      </span>
                    </td>
                    <td className="text-on-surface-variant font-mono text-xs">
                      {formatDate(item.createdAt)}
                    </td>
                    <td>
                      {rejectingId === item.userId ? (
                        <div className="flex flex-col gap-2 min-w-[220px]">
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Lý do từ chối (tuỳ chọn)"
                            className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-error transition-all placeholder:text-on-surface-variant/40"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={actionId === item.userId}
                              onClick={() => handleReject(item.userId)}
                              className="gs-btn gs-btn-danger gs-btn-sm flex items-center gap-1.5"
                            >
                              <CircleCheck className="w-3.5 h-3.5" />
                              Xác nhận
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingId(null);
                                setRejectReason("");
                              }}
                              className="gs-btn gs-btn-ghost gs-btn-sm"
                            >
                              Huỷ
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={actionId === item.userId}
                            onClick={() => handleApprove(item.userId)}
                            className="gs-btn gs-btn-primary gs-btn-sm flex items-center gap-1.5"
                          >
                            {actionId === item.userId ? (
                              <div className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                            ) : (
                              <CircleCheck className="w-3.5 h-3.5" />
                            )}
                            Duyệt
                          </button>
                          <button
                            type="button"
                            disabled={actionId === item.userId}
                            onClick={() => setRejectingId(item.userId)}
                            className="gs-btn gs-btn-danger gs-btn-sm flex items-center gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Từ chối
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
  );
}
