import { useState, useEffect } from "react";
import {
  User,
  Phone,
  Mail,
  Lock,
  Shield,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  profileErrorMessage,
} from "../../api/profile";

// ─── helpers ─────────────────────────────────────────────────────────────────
function initials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// "HORSE_OWNER" → "Horse Owner"
function roleLabel(role = "") {
  return role
    .split("_")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// createdAt (ISO) → "Oct 2018"
function memberSince(createdAt) {
  if (!createdAt) return "—";
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function FieldLabel({ children, tag }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
        {children}
      </span>
      {tag && (
        <span className="text-[10px] px-2 py-0.5 bg-white/8 text-gray-400 border border-white/10 rounded font-medium uppercase tracking-wider">
          {tag}
        </span>
      )}
    </div>
  );
}

function InputField({
  icon: Icon,
  value,
  onChange,
  type = "text",
  placeholder,
  readOnly,
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm transition-colors
        ${
          readOnly
            ? "bg-white/[0.03] border-white/8 cursor-not-allowed"
            : "bg-[#0d1424] border-white/10 hover:border-white/20 focus-within:border-emerald-500/50"
        }`}
    >
      {Icon && <Icon size={15} className="text-gray-500 flex-shrink-0" />}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`flex-1 bg-transparent outline-none placeholder-gray-600
          ${readOnly ? "text-gray-500 cursor-not-allowed" : "text-gray-200"}`}
      />
      {readOnly && <Lock size={13} className="text-gray-600 flex-shrink-0" />}
    </div>
  );
}

function PasswordField({ placeholder, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-[#0d1424] border-white/10 hover:border-white/20 focus-within:border-emerald-500/50 text-sm transition-colors">
      <Lock size={15} className="text-gray-500 flex-shrink-0" />
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-gray-200 placeholder-gray-600"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OwnerProfilePage() {
  const { user } = useAuth();
  const userId = user?.userId ?? user?.id;

  // ── Hồ sơ thật từ GET /api/auth/profile ──
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Trường sửa được
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [currentPassword, setCurrentPw] = useState("");
  const [newPassword, setNewPw] = useState("");
  const [confirmPassword, setConfirmPw] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let active = true;
    getMyProfile()
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setFullName(data.fullName ?? "");
        setPhone(data.phoneNumber ?? "");
      })
      .catch((err) => {
        if (active) setLoadError(profileErrorMessage(err, "Failed to load profile."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const wantsPasswordChange =
    currentPassword !== "" || newPassword !== "" || confirmPassword !== "";

  const handleSave = async () => {
    setSaveError("");

    if (!fullName.trim()) {
      setSaveError("Full name is required.");
      return;
    }

    // Đổi mật khẩu là tùy chọn — chỉ chạy khi user có nhập.
    if (wantsPasswordChange) {
      if (!currentPassword || !newPassword) {
        setSaveError("Enter both your current and new password.");
        return;
      }
      if (newPassword.length < 8) {
        setSaveError("New password must be at least 8 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setSaveError("New password and confirmation do not match.");
        return;
      }
    }

    setSaving(true);
    try {
      const updated = await updateMyProfile({ fullName, phoneNumber: phone });
      setProfile(updated);
      setFullName(updated.fullName ?? "");
      setPhone(updated.phoneNumber ?? "");

      if (wantsPasswordChange) {
        // BE lấy UserId từ JWT; route id chỉ cần khớp ràng buộc {userId:int}.
        await changeMyPassword(updated.userId ?? userId, {
          currentPassword,
          newPassword,
        });
        setCurrentPw("");
        setNewPw("");
        setConfirmPw("");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(profileErrorMessage(err, "Save failed."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-4 lg:py-8 flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 text-sm animate-pulse">Loading profile…</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-4 lg:py-8 max-w-5xl">
        <h1 className="text-2xl font-bold text-white mb-6">Owner Profile</h1>
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {loadError}
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 lg:py-8 max-w-5xl">
      {/* Page title */}
      <h1 className="text-2xl font-bold text-white mb-6">Owner Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">
        {/* ── Left card: avatar + meta ── */}
        <div className="bg-[#161d2e] border border-white/8 rounded-xl p-6 flex flex-col items-center text-center gap-4">
          {/* Avatar — ảnh từ BE; chưa có endpoint upload nên không có nút đổi ảnh
              (nút cũ chỉ preview local rồi mất khi reload). */}
          <div className="w-28 h-28 rounded-full bg-[#0d1424] border-2 border-white/10 overflow-hidden flex items-center justify-center">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-gray-500">
                {initials(fullName)}
              </span>
            )}
          </div>

          {/* Name + role */}
          <div>
            <p className="text-white font-bold text-lg">{fullName}</p>
            <p className="text-gray-400 text-sm mt-0.5">
              {roleLabel(profile?.role ?? "")}
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-white/8" />

          {/* Meta */}
          <div className="w-full space-y-3 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Account Status
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  profile?.isActive
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                }`}
              >
                {profile?.status ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Member Since
              </span>
              <span className="text-white text-sm font-semibold">
                {memberSince(profile?.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-5">
          {/* Personal Information */}
          <div className="bg-[#161d2e] border border-white/8 rounded-xl p-6">
            <h2 className="text-white font-bold text-base mb-5 flex items-center gap-2">
              <User size={17} className="text-emerald-400" />
              Personal Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <FieldLabel>Full Name</FieldLabel>
                <InputField
                  icon={User}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>

              {/* Phone */}
              <div>
                <FieldLabel>Phone Number</FieldLabel>
                <InputField
                  icon={Phone}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+44 7700 000000"
                />
              </div>

              {/* Email — full width, read only */}
              <div className="sm:col-span-2">
                <FieldLabel tag="Read-Only">Email Address</FieldLabel>
                <InputField icon={Mail} value={profile?.email ?? ""} readOnly />
              </div>
            </div>
          </div>

          {/* Security & Password */}
          <div className="bg-[#161d2e] border border-white/8 rounded-xl p-6">
            <h2 className="text-white font-bold text-base mb-5 flex items-center gap-2">
              <Shield size={17} className="text-yellow-400" />
              Security &amp; Password
            </h2>

            <div className="grid grid-cols-1 gap-4">
              {/* Current password — full width */}
              <div>
                <FieldLabel>Current Password</FieldLabel>
                <PasswordField
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPw(e.target.value)}
                />
              </div>

              {/* New + Confirm — side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>New Password</FieldLabel>
                  <PasswordField
                    placeholder="Create new password"
                    value={newPassword}
                    onChange={(e) => setNewPw(e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel>Confirm New Password</FieldLabel>
                  <PasswordField
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPw(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Save button ── */}
      <div className="flex flex-col items-end gap-2 mt-5">
        {saveError && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {saveError}
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all
            ${
              saved
                ? "bg-emerald-600 text-white"
                : "bg-yellow-500 hover:bg-yellow-400 text-black"
            } disabled:opacity-60`}
        >
          <Save size={15} />
          {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
