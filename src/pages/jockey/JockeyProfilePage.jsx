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
  Flag,
  Trophy,
  ListOrdered,
  Star,
  Info,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
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
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicense] = useState("");
  const [weight, setWeight] = useState("");
  const [biography, setBio] = useState("");
  const [account, setAccount] = useState(null);

  // stats (read-only from API)
  const [totalRaces, setTotalRaces] = useState(0);
  const [totalWins, setTotalWins] = useState(0);
  const [prizePoints, setPrizePoints] = useState(null);

  // ui state
  const [loading, setLoading] = useState(() => Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [profileExists, setProfileExists] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [updatingPw, setUpdatingPw] = useState(false);
  const [pwMessage, setPwMessage] = useState(null); // { type: "ok" | "error", text }

  // ── Fetch profile ──
  // Hai nguồn: /api/auth/profile (tài khoản: tên, SĐT, email) và
  // /api/jockey-profiles/{id} (nghề: license, cân nặng, bio + số liệu sự nghiệp).
  useEffect(() => {
    if (!userId) return;
    let active = true;

    Promise.allSettled([
      getMyProfile(),
      api.get(`/api/jockey-profiles/${userId}`).then((r) => r.data),
    ])
      .then(([accountRes, jockeyRes]) => {
        if (!active) return;

        if (accountRes.status === "fulfilled") {
          setAccount(accountRes.value);
          setFullName(accountRes.value.fullName ?? "");
          setPhone(accountRes.value.phoneNumber ?? "");
        } else {
          console.error("Fetch account profile failed:", accountRes.reason);
          setFullName(user?.fullName ?? "");
        }

        // 404 là hợp lệ: nài chưa tạo hồ sơ nghề bao giờ → form trống, Save sẽ POST tạo mới.
        if (jockeyRes.status === "fulfilled") {
          const data = jockeyRes.value;
          setLicense(data.licenseNumber ?? "");
          setWeight(data.weight != null ? String(data.weight) : "");
          setBio(data.bio ?? "");
          setTotalRaces(data.totalRaces ?? 0);
          setTotalWins(data.totalWins ?? 0);
          setPrizePoints(data.careerPrizePoints ?? 0);
          setProfileExists(true);
        } else {
          console.error("Fetch jockey profile failed:", jockeyRes.reason);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId, user?.fullName]);

  // ── Computed stats ──
  const winRate =
    totalRaces > 0 ? ((totalWins / totalRaces) * 100).toFixed(1) : "0";

  // ── Save ──
  // Lưu 2 nơi: tên/SĐT → /api/auth/profile; license/cân nặng/bio → /api/jockey-profiles.
  const handleSave = async () => {
    if (!userId) return;
    setSaveError("");

    if (!fullName.trim()) {
      setSaveError("Full name is required.");
      return;
    }
    if (weight !== "" && Number.isNaN(Number(weight))) {
      setSaveError("Weight must be a number.");
      return;
    }

    setSaving(true);
    try {
      const updatedAccount = await updateMyProfile({ fullName, phoneNumber: phone });
      setAccount(updatedAccount);
      setFullName(updatedAccount.fullName ?? "");
      setPhone(updatedAccount.phoneNumber ?? "");

      const payload = {
        userId,
        licenseNumber,
        weight: Number(weight) || 0,
        bio: biography,
      };

      if (profileExists) {
        const res = await api.put(`/api/jockey-profiles/${userId}`, payload);
        if (res.data?.success === false) {
          throw new Error("Update failed — profile does not exist.");
        }
      } else {
        await api.post(`/api/jockey-profiles`, payload);
        setProfileExists(true);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(profileErrorMessage(err, "Save failed."));
    } finally {
      setSaving(false);
    }
  };

  // ── Update password ──
  const handleUpdatePassword = async () => {
    setPwMessage(null);

    if (!currentPw || !newPw) {
      setPwMessage({ type: "error", text: "Enter both your current and new password." });
      return;
    }
    if (newPw.length < 8) {
      setPwMessage({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }

    setUpdatingPw(true);
    try {
      // BE lấy UserId từ JWT; route id chỉ cần khớp ràng buộc {userId:int}.
      await changeMyPassword(account?.userId ?? userId, {
        currentPassword: currentPw,
        newPassword: newPw,
      });
      setCurrentPw("");
      setNewPw("");
      setPwMessage({ type: "ok", text: "Password changed successfully." });
    } catch (err) {
      setPwMessage({
        type: "error",
        text: profileErrorMessage(err, "Password change failed."),
      });
    } finally {
      setUpdatingPw(false);
    }
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
              {/* Avatar — ảnh từ BE; chưa có endpoint upload nên không có nút đổi ảnh
                  (nút cũ chỉ preview local rồi mất khi reload). */}
              <div className="w-20 h-20 flex-shrink-0 rounded-full bg-[#0d1424] border-2 border-white/10 overflow-hidden flex items-center justify-center">
                {account?.avatarUrl ? (
                  <img
                    src={account.avatarUrl}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-gray-500">
                    {initials(fullName)}
                  </span>
                )}
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
                <InputField
                  icon={Mail}
                  value={account?.email ?? user?.email ?? ""}
                  readOnly
                />
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
              {pwMessage && (
                <p
                  className={`text-xs rounded-lg px-3 py-2 border ${
                    pwMessage.type === "ok"
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      : "text-red-400 bg-red-500/10 border-red-500/20"
                  }`}
                >
                  {pwMessage.text}
                </p>
              )}
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
                value={prizePoints == null ? "—" : prizePoints.toLocaleString("en-US")}
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
