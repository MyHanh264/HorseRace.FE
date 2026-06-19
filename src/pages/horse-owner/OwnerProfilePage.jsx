import { useState, useRef } from "react";
import {
  User,
  Phone,
  Mail,
  Lock,
  Shield,
  Camera,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// ─── mock (swap bằng API call sau) ───────────────────────────────────────────
const MOCK_PROFILE = {
  fullName: "Arthur Pendelton",
  email: "arthur.pendelton@grandstride.ext",
  phone: "+44 7700 900077",
  role: "Senior Owner & Stakeholder",
  status: "Active Member",
  memberSince: "Oct 2018",
  avatarUrl: null,
};

// ─── helpers ─────────────────────────────────────────────────────────────────
function initials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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

  // Merge auth context vào mock (khi có API thật thì fetch ở đây)
  const base = {
    ...MOCK_PROFILE,
    fullName: user?.fullName ?? MOCK_PROFILE.fullName,
    email: user?.email ?? MOCK_PROFILE.email,
  };

  const [fullName, setFullName] = useState(base.fullName);
  const [phone, setPhone] = useState(base.phone);
  const [currentPassword, setCurrentPw] = useState("");
  const [newPassword, setNewPw] = useState("");
  const [confirmPassword, setConfirmPw] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(base.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef();

  // Avatar upload preview
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarUrl(url);
  };

  const handleSave = async () => {
    setSaving(true);
    // TODO: gọi API update profile
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="p-8 max-w-5xl">
      {/* Page title */}
      <h1 className="text-2xl font-bold text-white mb-6">Owner Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">
        {/* ── Left card: avatar + meta ── */}
        <div className="bg-[#161d2e] border border-white/8 rounded-xl p-6 flex flex-col items-center text-center gap-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-[#0d1424] border-2 border-white/10 overflow-hidden flex items-center justify-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-gray-500">
                  {initials(fullName)}
                </span>
              )}
            </div>
            {/* Camera button */}
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 border-2 border-[#161d2e] flex items-center justify-center transition-colors"
            >
              <Camera size={14} className="text-white" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Name + role */}
          <div>
            <p className="text-white font-bold text-lg">{fullName}</p>
            <p className="text-gray-400 text-sm mt-0.5">{base.role}</p>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-white/8" />

          {/* Meta */}
          <div className="w-full space-y-3 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Account Status
              </span>
              <span className="text-xs px-2.5 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full font-semibold">
                {base.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Member Since
              </span>
              <span className="text-white text-sm font-semibold">
                {base.memberSince}
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
                <InputField icon={Mail} value={base.email} readOnly />
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
      <div className="flex justify-end mt-5">
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
