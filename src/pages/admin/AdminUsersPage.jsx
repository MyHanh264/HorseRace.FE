import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAllUser,
  getPendingUsers,
  getUserById,
  approveUser,
  rejectUser,
  createUser,
  updateUser,
  deleteUser,
  lockUser,
  unlockUser,
  getUsersByStatus,
  getRoleMap,
  getRoleCodeById,
} from "../../api/admin";
import {
  ShieldCheck,
  CircleCheck,
  XCircle,
  Clock,
  Search,
  UserPlus,
  Users,
  Lock,
  LockOpen,
  Eye,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  UserX,
  UserCheck,
  RefreshCw,
  Shield,
  Trophy,
} from "lucide-react";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB");
}

function formatDateShort(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getRoleBadgeClass(role) {
  switch (role) {
    case "HORSE_OWNER":
      return "gs-badge gs-badge-secondary";
    case "JOCKEY":
      return "gs-badge gs-badge-primary";
    case "ADMIN":
      return "gs-badge gs-badge-warning";
    case "SPECTATOR":
      return "gs-badge gs-badge-neutral";
    default:
      return "gs-badge gs-badge-neutral";
  }
}

function getRoleLabel(role) {
  switch (role) {
    case "HORSE_OWNER":
      return "Horse Owner";
    case "JOCKEY":
      return "Jockey";
    case "ADMIN":
      return "Admin";
    case "SPECTATOR":
      return "Spectator";
    default:
      return role || "—";
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case "ACTIVE":
    case "APPROVED":
      return "gs-badge gs-badge-success";
    case "LOCKED":
    case "REJECTED":
    case "INACTIVE":
      return "gs-badge gs-badge-error";
    case "PENDING":
      return "gs-badge gs-badge-warning";
    case "DELETED":
      return "gs-badge gs-badge-neutral";
    default:
      return "gs-badge gs-badge-neutral";
  }
}

function getStatusLabel(status) {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "LOCKED":
      return "Locked";
    case "INACTIVE":
      return "Inactive";
    case "DELETED":
      return "Deleted";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    default:
      return status || "—";
  }
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, iconCls, label, value, sub }) {
  return (
    <div className="gs-card p-5 flex items-start gap-4 animate-fade-in-up">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconCls}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className="text-2xl font-bold text-on-surface font-mono">{value}</p>
        {sub && <p className="text-xs text-on-surface-variant mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Role Options (for Create/Edit modal) ────────────────────────────────────
const ROLE_OPTIONS = [
  {
    code: "SPECTATOR",
    title: "Spectator",
    description: "Watch races, predict results, and earn rewards.",
    icon: "◎",
  },
  {
    code: "HORSE_OWNER",
    title: "Horse Owner",
    description: "Register horses, hire jockeys, and manage schedules.",
    icon: "♞",
  },
  {
    code: "JOCKEY",
    title: "Jockey",
    description: "Receive invitations, confirm rides, and track your career.",
    icon: "⚑",
  },
  {
    code: "ADMIN",
    title: "Admin",
    description: "Full system access and management capabilities.",
    icon: "★",
  },
];

// ─── User Modal (Create/Edit) - Similar to Registration Page ─────────────────
function UserModal({ user, onClose, onSubmit, submitting, error }) {
  const isEdit = !!user;
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    password: "",
    confirmPassword: "",
    roleCode: user?.roleCode || user?.role || "SPECTATOR",
    phoneNumber: user?.phoneNumber || "",
    licenseNumber: user?.licenseNumber || "",
    weight: user?.weight || "",
    bio: user?.bio || "",
  });

  const isJockey = form.roleCode === "JOCKEY";

  const validate = () => {
    if (!form.fullName?.trim()) return "Full name is required.";
    if (!form.email?.includes("@")) return "Please enter a valid email address.";
    if (!isEdit) {
      if (!form.password || form.password.length < 8)
        return "Password must be at least 8 characters.";
      if (form.password !== form.confirmPassword)
        return "Passwords do not match.";
    }
    if (!form.phoneNumber?.trim()) return "Phone number is required.";
    if (isJockey) {
      if (!form.licenseNumber?.trim())
        return "License number is required for jockeys.";
      const w = parseFloat(form.weight);
      if (Number.isNaN(w) || w <= 0)
        return "Weight must be a valid positive number.";
    }
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      onSubmit({ error: validationError });
      return;
    }

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phoneNumber: form.phoneNumber.trim(),
      roleCode: form.roleCode,
    };

    if (!isEdit) {
      payload.password = form.password;
    }

    if (isJockey) {
      payload.licenseNumber = form.licenseNumber.trim();
      payload.weight = parseFloat(form.weight);
      if (form.bio?.trim()) payload.bio = form.bio.trim();
    }

    onSubmit({ data: { ...payload, userId: user?.userId } });
  };

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const inputCls =
    "w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div className="gs-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/40 sticky top-0 bg-surface-container-low z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              {isEdit ? (
                <Edit2 className="w-4 h-4 text-primary" />
              ) : (
                <UserPlus className="w-4 h-4 text-primary" />
              )}
            </div>
            <h2 className="font-serif font-bold text-on-surface">
              {isEdit ? "Edit User" : "Create New Account"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5">
          {/* Role selector */}
          {!isEdit && (
            <fieldset className="mb-5">
              <legend className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
                Select Role
              </legend>
              <div className="register-role-grid">
                {ROLE_OPTIONS.map((role) => (
                  <label
                    key={role.code}
                    className={`register-role-card ${
                      form.roleCode === role.code ? " is-selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="roleCode"
                      value={role.code}
                      checked={form.roleCode === role.code}
                      onChange={() => setField("roleCode", role.code)}
                    />
                    <span className="register-role-icon" aria-hidden="true">
                      {role.icon}
                    </span>
                    <span className="register-role-title">{role.title}</span>
                    <span className="register-role-desc">{role.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {/* Form fields */}
          <div className="register-grid">
            <label className="register-field register-field--full">
              <span>Full Name</span>
              <input
                type="text"
                name="fullName"
                placeholder="John Smith"
                value={form.fullName}
                onChange={(e) => setField("fullName", e.target.value)}
                required
                className={inputCls}
              />
            </label>

            <label className="register-field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                placeholder="user@example.com"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                required
                className={inputCls}
              />
            </label>

            <label className="register-field">
              <span>Phone Number</span>
              <input
                type="tel"
                name="phoneNumber"
                placeholder="0900000000"
                value={form.phoneNumber}
                onChange={(e) => setField("phoneNumber", e.target.value)}
                required
                className={inputCls}
              />
            </label>

            {!isEdit && (
              <>
                <label className="register-field">
                  <span>Password</span>
                  <div className="register-input-wrap">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Min. 8 characters"
                      value={form.password}
                      onChange={(e) => setField("password", e.target.value)}
                      required
                      minLength={8}
                      className={inputCls}
                    />
                    <button
                      type="button"
                      className="register-toggle-pw"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>

                <label className="register-field">
                  <span>Confirm Password</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Re-enter password"
                    value={form.confirmPassword}
                    onChange={(e) =>
                      setField("confirmPassword", e.target.value)
                    }
                    required
                    className={inputCls}
                  />
                </label>
              </>
            )}
          </div>

          {/* Jockey fields */}
          {isJockey && (
            <fieldset className="mt-4">
              <legend className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
                Jockey Profile
              </legend>
              <div className="register-grid">
                <label className="register-field">
                  <span>License Number</span>
                  <input
                    type="text"
                    name="licenseNumber"
                    placeholder="e.g. JKY-2024-001"
                    value={form.licenseNumber}
                    onChange={(e) => setField("licenseNumber", e.target.value)}
                    required={isJockey}
                    className={inputCls}
                  />
                </label>

                <label className="register-field">
                  <span>Weight (kg)</span>
                  <input
                    type="number"
                    name="weight"
                    min="1"
                    step="0.1"
                    placeholder="53"
                    value={form.weight}
                    onChange={(e) => setField("weight", e.target.value)}
                    required={isJockey}
                    className={inputCls}
                  />
                </label>

                <label className="register-field register-field--full">
                  <span>Bio / Experience</span>
                  <textarea
                    name="bio"
                    rows={2}
                    placeholder="Briefly describe your racing experience..."
                    value={form.bio}
                    onChange={(e) => setField("bio", e.target.value)}
                    className={inputCls}
                  />
                </label>
              </div>
            </fieldset>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-outline-variant/30">
            <button type="button" onClick={onClose} className="gs-btn gs-btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="gs-btn gs-btn-primary flex items-center gap-2"
            >
              {submitting && (
                <div className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
              )}
              {isEdit ? "Save Changes" : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── User Detail Modal ───────────────────────────────────────────────────────
function UserDetailModal({
  user,
  onClose,
  onEdit,
  onLock,
  onUnlock,
  loading,
  onRestore,
}) {
  if (!user) return null;

  const isDeleted = user.status === "DELETED";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div className="gs-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/40">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-lg font-bold text-primary">
              {(user.fullName || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-serif font-bold text-on-surface">
                {user.fullName || "—"}
              </h2>
              <p className="text-xs text-on-surface-variant">User Profile</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Role & Status badges */}
          <div className="flex items-center gap-3">
            <span className={getRoleBadgeClass(user.roleCode || user.role)}>
              {getRoleLabel(user.roleCode || user.role)}
            </span>
            <span className={getStatusBadgeClass(user.status)}>
              {getStatusLabel(user.status)}
            </span>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-1">
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold">
                Email
              </p>
              <p className="text-sm text-on-surface font-medium break-all">
                {user.email || "—"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold">
                Phone
              </p>
              <p className="text-sm text-on-surface font-medium">
                {user.phoneNumber || "—"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold">
                Created At
              </p>
              <p className="text-sm text-on-surface font-mono">
                {formatDate(user.createdAt)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold">
                Last Updated
              </p>
              <p className="text-sm text-on-surface font-mono">
                {formatDate(user.updatedAt || user.modifiedAt)}
              </p>
            </div>
            {user.licenseNumber && (
              <div className="space-y-1">
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold">
                  License Number
                </p>
                <p className="text-sm text-on-surface font-mono">
                  {user.licenseNumber}
                </p>
              </div>
            )}
            {user.weight && (
              <div className="space-y-1">
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold">
                  Weight
                </p>
                <p className="text-sm text-on-surface font-mono">
                  {user.weight} kg
                </p>
              </div>
            )}
          </div>

          {/* Reasons */}
          {user.lockReason && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/25">
              <p className="text-[10px] text-error uppercase tracking-widest font-semibold mb-1">
                Lock Reason
              </p>
              <p className="text-sm text-error">{user.lockReason}</p>
            </div>
          )}

          {user.rejectionReason && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/25">
              <p className="text-[10px] text-error uppercase tracking-widest font-semibold mb-1">
                Rejection Reason
              </p>
              <p className="text-sm text-error">{user.rejectionReason}</p>
            </div>
          )}

          {user.bio && (
            <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/30">
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold mb-1">
                Bio
              </p>
              <p className="text-sm text-on-surface">{user.bio}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/30">
            <button onClick={onClose} className="gs-btn gs-btn-ghost">
              Close
            </button>
            {isDeleted ? (
              <button
                onClick={onRestore}
                disabled={loading}
                className="gs-btn gs-btn-primary flex items-center gap-2"
              >
                {loading && (
                  <div className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                )}
                <UserCheck className="w-4 h-4" />
                Restore User
              </button>
            ) : (
              <>
                {user.status === "LOCKED" ? (
                  <button
                    onClick={onUnlock}
                    disabled={loading}
                    className="gs-btn gs-btn-success flex items-center gap-2"
                  >
                    <LockOpen className="w-4 h-4" />
                    Unlock
                  </button>
                ) : (
                  <button
                    onClick={onLock}
                    disabled={loading}
                    className="gs-btn gs-btn-danger flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    Lock
                  </button>
                )}
                <button onClick={onEdit} className="gs-btn gs-btn-primary flex items-center gap-2">
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Lock Confirmation Modal ─────────────────────────────────────────────────
function LockConfirmModal({ user, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div className="gs-card w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-error/10 border border-error/20 flex items-center justify-center">
              <Lock className="w-4 h-4 text-error" />
            </div>
            <h2 className="font-serif font-bold text-on-surface">
              Lock Account
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-on-surface">
            Are you sure you want to lock the account for{" "}
            <strong>{user?.fullName}</strong>?
          </p>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for locking this account..."
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-error transition-all placeholder:text-on-surface-variant/40 resize-none"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="gs-btn gs-btn-ghost">
              Cancel
            </button>
            <button
              onClick={() => onConfirm(reason.trim() || null)}
              disabled={loading}
              className="gs-btn gs-btn-danger flex items-center gap-2"
            >
              {loading && (
                <div className="w-3 h-3 border-2 border-error/30 border-t-error rounded-full animate-spin" />
              )}
              Lock Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirmation ─────────────────────────────────────────────────────
function DeleteConfirmModal({ user, onClose, onConfirm, loading }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div className="gs-card w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-error/10 border border-error/20 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-error" />
            </div>
            <h2 className="font-serif font-bold text-on-surface">
              Delete User
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-on-surface">
            Are you sure you want to permanently delete the account for{" "}
            <strong>{user?.fullName}</strong>? This action cannot be undone.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="gs-btn gs-btn-ghost">
              Cancel
            </button>
            <button
              onClick={() => onConfirm(user.userId)}
              disabled={loading}
              className="gs-btn gs-btn-danger flex items-center gap-2"
            >
              {loading && (
                <div className="w-3 h-3 border-2 border-error/30 border-t-error rounded-full animate-spin" />
              )}
              Delete User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab Config ─────────────────────────────────────────────────────────────
const TABS = [
  { id: "all", label: "All Users", icon: Users },
  { id: "pending", label: "Pending", icon: Clock },
  { id: "approved", label: "Approved", icon: CircleCheck },
  { id: "rejected", label: "Rejected", icon: XCircle },
  { id: "deleted", label: "Deleted", icon: UserX },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  // ── Tab State ──
  const [activeTab, setActiveTab] = useState("all");

  // ── Data State ──
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Stats State ──
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    deleted: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Role Map ──
  const [roleMap, setRoleMap] = useState([]);
  const [allUsersCache, setAllUsersCache] = useState([]);

  // ── Pagination ──
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);

  // ── Search ──
  const [searchQuery, setSearchQuery] = useState("");

  // ── Modals ──
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);

  // ── Actions ──
  const [actionId, setActionId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // ── Load Role Map + Stats ──
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      // Load role map first
      const roles = await getRoleMap();
      setRoleMap(roles || []);

      // Backend returns flat array from /api/users (UserListItemResponse)
      // Also load pending list separately
      const [allData, pendingData] = await Promise.allSettled([
        getAllUser(),
        getPendingUsers(),
      ]);

      const allUsers =
        allData.status === "fulfilled" && Array.isArray(allData.value)
          ? allData.value
          : [];
      setAllUsersCache(allUsers);

      const pendingUsers =
        pendingData.status === "fulfilled" && Array.isArray(pendingData.value)
          ? pendingData.value
          : [];

      // Backend only returns UserListItemResponse: { userId, email, fullName, roleId, isActive }
      // No "status" or "deleted" fields. So:
      //  - Approved = active users (isActive=true) and NOT in pending list
      //  - Rejected / Locked = inactive users (isActive=false)
      //  - Deleted: backend has no flag for deleted, so 0
      const pendingIds = new Set(pendingUsers.map((u) => u.userId));
      const activeCount = allUsers.filter(
        (u) => u.isActive && !pendingIds.has(u.userId)
      ).length;
      const inactiveCount = allUsers.filter((u) => !u.isActive).length;

      setStats({
        total: allUsers.length,
        approved: activeCount,
        rejected: inactiveCount,
        pending: pendingUsers.length,
        deleted: 0, // Backend doesn't expose deleted flag in list
      });
    } catch (err) {
      console.error("Failed to load stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // ── Load Data by Tab ──
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Ensure role map is loaded
      if (roleMap.length === 0) {
        const roles = await getRoleMap();
        setRoleMap(roles || []);
      }

      if (activeTab === "pending") {
        const data = await getPendingUsers();
        const items = Array.isArray(data) ? data : [];
        setUsers(items);
        setTotalUsers(items.length);
      } else if (activeTab === "all") {
        const data = await getAllUser();
        let items = Array.isArray(data) ? data : [];
        setAllUsersCache(items);

        // Client-side search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          items = items.filter(
            (u) =>
              u.fullName?.toLowerCase().includes(q) ||
              u.email?.toLowerCase().includes(q)
          );
        }

        // Client-side pagination
        const start = (page - 1) * pageSize;
        const paged = items.slice(start, start + pageSize);

        setUsers(paged);
        setTotalUsers(items.length);
      } else {
        // approved/rejected/deleted tabs - filter from allUsersCache
        const statusMap = {
          approved: "APPROVED",
          rejected: "REJECTED",
          deleted: "DELETED",
        };
        let all = allUsersCache;
        if (all.length === 0) {
          const data = await getAllUser();
          all = Array.isArray(data) ? data : [];
          setAllUsersCache(all);
        }

        const pendingIds = new Set();
        try {
          const pendingData = await getPendingUsers();
          if (Array.isArray(pendingData)) {
            pendingData.forEach((u) => pendingIds.add(u.userId));
          }
        } catch {}

        let filtered = all;
        if (activeTab === "approved") {
          filtered = all.filter((u) => u.isActive && !pendingIds.has(u.userId));
        } else if (activeTab === "rejected") {
          filtered = all.filter((u) => !u.isActive);
        } else if (activeTab === "deleted") {
          filtered = []; // Backend doesn't expose deleted flag
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (u) =>
              u.fullName?.toLowerCase().includes(q) ||
              u.email?.toLowerCase().includes(q)
          );
        }

        const start = (page - 1) * pageSize;
        const paged = filtered.slice(start, start + pageSize);

        setUsers(paged);
        setTotalUsers(filtered.length);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to load ${activeTab} users.`
      );
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, pageSize, searchQuery, roleMap, allUsersCache]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when tab or search changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery]);

  // ── Handlers: Approve/Reject (Pending tab) ──
  const handleApprove = async (userId) => {
    setActionId(userId);
    setError("");
    try {
      await approveUser(userId);
      await loadData();
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve account.");
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
      await loadData();
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject account.");
    } finally {
      setActionId(null);
    }
  };

  // ── Handlers: CRUD ──
  const handleCreateUser = async ({ data, error: validationError }) => {
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      await createUser(data);
      setShowUserModal(false);
      await loadData();
      await loadStats();
    } catch (err) {
      setFormError(
        err?.response?.data?.detail ||
          err?.message ||
          "Failed to create user."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async ({ data, error: validationError }) => {
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      await updateUser(data.userId, data);
      setShowUserModal(false);
      setEditingUser(null);
      await loadData();
    } catch (err) {
      setFormError(
        err?.response?.data?.detail ||
          err?.message ||
          "Failed to update user."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    setActionLoading(true);
    setError("");
    try {
      await deleteUser(userId);
      setShowDeleteModal(false);
      setDeletingUser(null);
      await loadData();
      await loadStats();
    } catch (err) {
      setError(
        err?.response?.data?.detail || err?.message || "Delete failed."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ── Handlers: Lock/Unlock ──
  const handleLockUser = async (reason) => {
    setActionLoading(true);
    setError("");
    try {
      await lockUser(selectedUser.userId, reason);
      setShowLockModal(false);
      await loadData();
      const updated = await getUserById(selectedUser.userId);
      setSelectedUser(updated);
      await loadStats();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Lock failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlockUser = async () => {
    setActionLoading(true);
    setError("");
    try {
      await unlockUser(selectedUser.userId);
      await loadData();
      const updated = await getUserById(selectedUser.userId);
      setSelectedUser(updated);
      await loadStats();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Unlock failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreUser = async () => {
    setActionLoading(true);
    setError("");
    try {
      await updateUser(selectedUser.userId, { status: "ACTIVE" });
      setShowDetailModal(false);
      await loadData();
      await loadStats();
    } catch (err) {
      setError(
        err?.response?.data?.detail || err?.message || "Restore failed."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ── UI Handlers ──
  const openCreate = () => {
    setEditingUser(null);
    setFormError("");
    setShowUserModal(true);
  };

  const openEdit = async (user) => {
    try {
      const detailed = await getUserById(user.userId);
      // Map roleId → roleCode for the form
      const roleCode =
        detailed.roleCode ||
        getRoleCodeById(detailed.roleId) ||
        user.roleCode ||
        "SPECTATOR";
      setEditingUser({ ...user, ...detailed, roleCode });
    } catch {
      const roleCode = user.roleCode || getRoleCodeById(user.roleId) || "SPECTATOR";
      setEditingUser({ ...user, roleCode });
    }
    setFormError("");
    setShowUserModal(true);
  };

  const openDetail = async (user) => {
    try {
      const detailed = await getUserById(user.userId);
      // Merge with list data so we have fullName, email even if detail omits them
      setSelectedUser({
        ...user,
        ...detailed,
        roleCode: detailed.roleCode || getRoleCodeById(detailed.roleId) || user.roleCode,
      });
    } catch {
      setSelectedUser({
        ...user,
        roleCode: user.roleCode || getRoleCodeById(user.roleId),
      });
    }
    setShowDetailModal(true);
  };

  const openLock = () => {
    setShowDetailModal(false);
    setShowLockModal(true);
  };

  const openDelete = (user) => {
    setDeletingUser(user);
    setShowDeleteModal(true);
  };

  const totalPages = Math.ceil(totalUsers / pageSize) || 1;

  // ── Render Table Row ──
  const renderUserRow = (item, index) => {
    const isPending = activeTab === "pending";

    // Backend returns: { userId, email, fullName, roleId, isActive }
    // Backend pending users might have different fields
    // Backend detail returns: { userId, email, fullName, phoneNumber, roleId, isActive, ... }
    const userRole =
      item.roleCode ||
      item.role ||
      (item.roleId !== undefined ? getRoleCodeById(item.roleId) : null) ||
      "UNKNOWN";

    // Derive status: backend doesn't return a "status" string, only isActive
    let userStatus = item.status;
    if (!userStatus) {
      if (item.isActive === false) userStatus = "INACTIVE";
      else if (item.isActive === true) userStatus = "ACTIVE";
      else userStatus = "UNKNOWN";
    }

    return (
      <tr
        key={item.userId}
        className={`animate-fade-in-up delay-row-${(index % 4) + 1}`}
        style={{ opacity: 0, animationFillMode: "forwards" }}
      >
        <td>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-outline-variant/50 flex items-center justify-center text-xs font-bold text-on-surface-variant">
              {(item.fullName || "U").charAt(0).toUpperCase()}
            </div>
            <span className="font-semibold text-on-surface">
              {item.fullName || "—"}
            </span>
          </div>
        </td>
        <td className="text-on-surface-variant">{item.email || "—"}</td>
        <td>
          <span className={getRoleBadgeClass(userRole)}>
            {getRoleLabel(userRole)}
          </span>
        </td>
        {!isPending && (
          <td>
            <span className={getStatusBadgeClass(userStatus)}>
              {getStatusLabel(userStatus)}
            </span>
          </td>
        )}
        <td className="text-on-surface-variant font-mono text-xs">
          {item.createdAt ? formatDateShort(item.createdAt) : "—"}
        </td>
        <td>
          {isPending ? (
            rejectingId === item.userId ? (
              <div className="flex flex-col gap-2 min-w-[220px]">
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Rejection reason (optional)"
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
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingId(null);
                      setRejectReason("");
                    }}
                    className="gs-btn gs-btn-ghost gs-btn-sm"
                  >
                    Cancel
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
                  Approve
                </button>
                <button
                  type="button"
                  disabled={actionId === item.userId}
                  onClick={() => setRejectingId(item.userId)}
                  className="gs-btn gs-btn-danger gs-btn-sm flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openDetail(item)}
                className="gs-btn gs-btn-ghost gs-btn-sm flex items-center gap-1.5"
                title="View details"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => openEdit(item)}
                className="gs-btn gs-btn-ghost gs-btn-sm flex items-center gap-1.5"
                title="Edit user"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              {activeTab !== "deleted" && (
                <button
                  onClick={() => openDelete(item)}
                  className="gs-btn gs-btn-danger gs-btn-sm flex items-center gap-1.5"
                  title="Delete user"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </td>
      </tr>
    );
  };

  // ── Render ──
  return (
    <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8">
      {/* Page Header */}
      <div
        className="mb-8 animate-fade-in-up"
        style={{ opacity: 0, animationFillMode: "forwards" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-on-surface">
                User Management
              </h1>
              <p className="text-on-surface-variant text-sm">
                Manage accounts, roles, and access permissions.
              </p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="gs-btn gs-btn-primary flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Create User
          </button>
        </div>
        <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-primary to-secondary mt-4" />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Users}
          iconCls="bg-secondary/10 border border-secondary/20 text-secondary"
          label="Total Users"
          value={statsLoading ? "—" : stats.total}
        />
        <StatCard
          icon={CircleCheck}
          iconCls="bg-primary/10 border border-primary/20 text-primary"
          label="Approved"
          value={statsLoading ? "—" : stats.approved}
        />
        <StatCard
          icon={XCircle}
          iconCls="bg-error/10 border border-error/20 text-error"
          label="Rejected / Locked"
          value={statsLoading ? "—" : stats.rejected}
        />
        <StatCard
          icon={Clock}
          iconCls="bg-amber-500/10 border border-amber-500/20 text-amber-400"
          label="Pending"
          value={statsLoading ? "—" : stats.pending}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 auth-alert auth-alert--error flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="ml-auto text-xs text-error hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 bg-surface-container-low border border-outline-variant/40 rounded-xl p-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const countMap = {
            all: stats.total,
            pending: stats.pending,
            approved: stats.approved,
            rejected: stats.rejected,
            deleted: stats.deleted,
          };
          const count = countMap[tab.id];

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {count > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id
                      ? "bg-on-primary/20 text-on-primary"
                      : "bg-error text-white"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search & Filters (only for paginated tabs) */}
      {activeTab !== "pending" && (
        <div className="mb-5 relative max-w-md">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
          <input
            type="text"
            placeholder="Search by name, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant/40 text-sm rounded-xl pl-11 pr-4 py-3 text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
          />
        </div>
      )}

{/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-on-surface-variant text-sm">
              Loading users...
            </span>
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="gs-card p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
            <Users className="w-8 h-8 text-on-surface-variant/60" />
          </div>
          <h3 className="font-serif text-xl font-bold text-on-surface mb-2">
            {searchQuery ? "No results found" : `No ${activeTab} users`}
          </h3>
          <p className="text-on-surface-variant text-sm">
            {searchQuery
              ? "Try different search criteria."
              : activeTab === "pending"
              ? "No accounts are awaiting approval."
              : "No users found in this category."}
          </p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-3.5 h-3.5 text-on-surface-variant/60" />
                      User
                    </div>
                  </th>
                  <th>Email</th>
                  <th>Role</th>
                  {activeTab !== "pending" && <th>Status</th>}
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>{users.map(renderUserRow)}</tbody>
            </table>
          </div>

          {/* Pagination */}
          {activeTab !== "pending" && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-on-surface-variant">
                Showing {(page - 1) * pageSize + 1}-
                {Math.min(page * pageSize, totalUsers)} of {totalUsers}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="gs-btn gs-btn-ghost gs-btn-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-on-surface font-mono px-3">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="gs-btn gs-btn-ghost gs-btn-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showUserModal && (
        <UserModal
          user={editingUser}
          onClose={() => {
            setShowUserModal(false);
            setEditingUser(null);
          }}
          onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
          submitting={submitting}
          error={formError}
        />
      )}

      {showDetailModal && selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedUser(null);
          }}
          onEdit={() => openEdit(selectedUser)}
          onLock={openLock}
          onUnlock={handleUnlockUser}
          onRestore={handleRestoreUser}
          loading={actionLoading}
        />
      )}

      {showLockModal && selectedUser && (
        <LockConfirmModal
          user={selectedUser}
          onClose={() => setShowLockModal(false)}
          onConfirm={handleLockUser}
          loading={actionLoading}
        />
      )}

      {showDeleteModal && deletingUser && (
        <DeleteConfirmModal
          user={deletingUser}
          onClose={() => {
            setShowDeleteModal(false);
            setDeletingUser(null);
          }}
          onConfirm={handleDeleteUser}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
