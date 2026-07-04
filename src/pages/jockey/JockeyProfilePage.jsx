import { useState, useEffect, useRef } from "react";
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
  Flag,
  Trophy,
  ListOrdered,
  Star,
  Info,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

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
  suffix,
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
      {suffix && (
        <span className="text-gray-500 text-xs font-medium">{suffix}</span>
      )}
      {readOnly && <Lock size={13} className="text-gray-600 flex-shrink-0" />}
    </div>
  );
}

function PasswordField({ placeholder, value, onChange, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-[#0d1424] border-white/10 hover:border-white/20 focus-within:border-emerald-500/50 text-sm transition-colors">
      <Lock size={15} className="text-gray-500 flex-shrink-0" />
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete ?? "new-password"}
        className="flex-1 bg-transparent outline-none text-gray-200 placeholder-gray-600"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="text-gray-600 hover:text-gray-400 transition-colors"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

function StatCard({ icon: Icon, iconColor, value, suffix, label }) {
  return (
    <div className="bg-[#0d1424] border border-white/8 rounded-xl p-4 flex flex-col items-center gap-1">
      <Icon size={18} className={iconColor} />
      <div className="flex items-baseline gap-0.5">
        <span className="text-2xl font-bold text-white">{value}</span>
        {suffix && (
          <span className="text-xs text-gray-400 font-semibold">{suffix}</span>
        )}
      </div>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function JockeyProfilePage() {
  const { user } = useAuth();
  const userId = user?.userId ?? user?.id;

  // form state
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [licenseNumber, setLicense] = useState("");
  const [weight, setWeight] = useState("");
  const [biography, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);

  // stats (read-only từ API)
  const [totalRaces, setTotalRaces] = useState(0);
  const [totalWins, setTotalWins] = useState(0);

  // ui state
  const [loading, setLoading] = useState(() => Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [profileExists, setProfileExists] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [updatingPw, setUpdatingPw] = useState(false);
  const fileRef = useRef();

  // ── Fetch profile ──
  useEffect(() => {
    if (!userId) return;
    api
      .get(`/api/jockey-profiles/${userId}`)
      .then(({ data }) => {
        setLicense(data.licenseNumber ?? "");
        setWeight(data.weight != null ? String(data.weight) : "");
        setBio(data.bio ?? "");
        setTotalRaces(data.totalRaces ?? 0);
        setTotalWins(data.totalWins ?? 0);
        setProfileExists(true);
      })
      .catch((err) => console.error("Fetch jockey profile failed:", err))
      .finally(() => setLoading(false));
  }, [userId]);

  // ── Computed stats ──
  const winRate =
    totalRaces > 0 ? ((totalWins / totalRaces) * 100).toFixed(1) : "0";

  // ── Save ──
  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    setSaveError("");
    try {
      const payload = {
        userId,
        licenseNumber,
        weight: Number(weight) || 0,
        bio: biography,
      };

      if (profileExists) {
        const res = await api.put(`/api/jockey-profiles/${userId}`, payload);
        if (res.data?.success === false) {
          throw new Error("Cập nhật thất bại — profile không tồn tại.");
        }
      } else {
        await api.post(`/api/jockey-profiles`, payload);
        setProfileExists(true);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.detail ??
        err?.message ??
        "Lưu thất bại.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Update password ──
  const handleUpdatePassword = async () => {
    setUpdatingPw(true);
    try {
      // TODO: gọi API đổi password khi BE có endpoint
      await new Promise((r) => setTimeout(r, 600));
      setCurrentPw("");
      setNewPw("");
    } finally {
      setUpdatingPw(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUrl(URL.createObjectURL(file));
  };

  const bioMax = 500;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 text-sm animate-pulse">
          Loading profile…
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Jockey Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5 items-start">
        {/* ── Left column ── */}
        <div className="flex flex-col gap-5">
          {/* Personal Details */}
          <div className="bg-[#161d2e] border border-white/8 rounded-xl p-6">
            <div className="flex items-center gap-5 mb-5">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-full bg-[#0d1424] border-2 border-white/10 overflow-hidden flex items-center justify-center">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-gray-500">
                      {initials(fullName)}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-500 border-2 border-[#161d2e] flex items-center justify-center transition-colors"
                >
                  <Camera size={12} className="text-white" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <h2 className="text-white font-bold text-base">
                Personal Details
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Full Name</FieldLabel>
                <InputField
                  icon={User}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <FieldLabel>Phone Number</FieldLabel>
                <InputField
                  icon={Phone}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel tag="Read-only">Email Address</FieldLabel>
                <InputField icon={Mail} value={user?.email ?? ""} readOnly />
              </div>
            </div>
          </div>

          {/* Professional Identity */}
          <div className="bg-[#161d2e] border border-white/8 border-l-2 border-l-yellow-500/60 rounded-xl p-6">
            <h2 className="text-white font-bold text-base mb-5 flex items-center gap-2">
              <span className="text-yellow-400">🪪</span>
              Professional Identity
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <FieldLabel>License Number</FieldLabel>
                <InputField
                  value={licenseNumber}
                  onChange={(e) => setLicense(e.target.value)}
                  placeholder="#GS-0000"
                />
              </div>
              <div>
                <FieldLabel>Weight</FieldLabel>
                <InputField
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="52"
                  suffix="kg"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  Career Biography
                </span>
                <span className="text-xs text-gray-600">
                  Max {bioMax} characters
                </span>
              </div>
              <textarea
                value={biography}
                onChange={(e) => setBio(e.target.value.slice(0, bioMax))}
                rows={5}
                placeholder="Describe your racing career…"
                className="w-full bg-[#0d1424] border border-white/10 hover:border-white/20 focus:border-emerald-500/50 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none resize-none transition-colors"
              />
              <p className="text-right text-xs text-gray-600 mt-1">
                {biography.length}/{bioMax}
              </p>
            </div>
          </div>

          {/* Security */}
          <div className="bg-[#161d2e] border border-white/8 rounded-xl p-6">
            <h2 className="text-white font-bold text-base mb-5 flex items-center gap-2">
              <Shield size={17} className="text-emerald-400" />
              Security
            </h2>
            <div className="max-w-sm flex flex-col gap-4">
              <div>
                <FieldLabel>Current Password</FieldLabel>
                <PasswordField
                  placeholder="••••••••"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div>
                <FieldLabel>New Password</FieldLabel>
                <PasswordField
                  placeholder=""
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <button
                onClick={handleUpdatePassword}
                disabled={updatingPw}
                className="w-fit px-5 py-2 bg-white/8 hover:bg-white/12 border border-white/10 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {updatingPw ? "Updating…" : "Update Password"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-4">
          {/* Performance Stats */}
          <div className="bg-[#161d2e] border border-white/8 rounded-xl p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <span>📊</span> Performance Stats
            </p>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={Flag}
                iconColor="text-emerald-400"
                value={totalRaces}
                label="Total Races"
              />
              <StatCard
                icon={Trophy}
                iconColor="text-yellow-400"
                value={winRate}
                suffix="%"
                label="Win Rate"
              />
              <StatCard
                icon={ListOrdered}
                iconColor="text-emerald-400"
                value={totalWins}
                label="Total Wins"
              />
              <StatCard
                icon={Star}
                iconColor="text-yellow-400"
                value="—"
                label="Prize Points"
              />
            </div>
          </div>

          {/* Info box */}
          <div className="bg-yellow-500/8 border border-yellow-500/25 rounded-xl p-4 flex gap-3">
            <Info size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400 leading-relaxed">
              Profile must include{" "}
              <span className="text-white font-semibold">License Number</span>{" "}
              and <span className="text-white font-semibold">Weight</span> to
              appear in Horse Owner search results. Ensure{" "}
              <span className="text-yellow-400">
                this information is kept up to date.
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Save button */}
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
                : "bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300"
            } disabled:opacity-60`}
        >
          <Save size={15} />
          {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
