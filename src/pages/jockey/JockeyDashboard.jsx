import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  Bell,
  Settings,
  LayoutDashboard,
  Mail,
  Flag,
  BarChart2,
  User,
  Trophy,
  Star,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getJockeyProfile,
  getJockeyInvitations,
  updateJockeyInvitation,
} from "../../api/jockey";

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

// ─── Nav items ────────────────────────────────────────────────────────────────
const navItems = [
  { to: "/jockey", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/jockey/invitations", label: "My Invitations", icon: Mail },
  { to: "/jockey/races", label: "My Races", icon: Flag },
  { to: "/jockey/leaderboard", label: "Leaderboard", icon: BarChart2 },
  { to: "/jockey/profile", label: "Profile", icon: User },
];

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, subColor, badge, icon: Icon }) {
  return (
    <div className="bg-[#141920] border border-white/10 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <span className="text-gray-400 text-sm leading-snug">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-gray-400" />
        </div>
      </div>
      <div>
        <p className="text-4xl font-bold text-white tracking-tight">
          {value ?? "—"}
        </p>
        {badge && (
          <span className="inline-block mt-2 text-xs px-2.5 py-0.5 rounded-md bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-medium">
            {badge}
          </span>
        )}
        {sub && !badge && (
          <p className={`text-xs mt-1.5 font-medium ${subColor ?? "text-gray-500"}`}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Invitation Card ──────────────────────────────────────────────────────────
function InvitationCard({ inv, onAccept, onDecline, accepting, declining }) {
  const isPending = inv.status === "Pending";
  const isAccepted = inv.status === "Accepted";
  const isDeclined = inv.status === "Declined";

  return (
    <div
      className={`bg-[#0d1117] border rounded-xl p-4 flex items-start gap-4 transition-opacity
        ${isPending ? "border-white/10" : "border-white/5"}
        ${isDeclined ? "opacity-50" : ""}`}
    >
      {/* Horse avatar */}
      <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 border border-white/10 flex items-center justify-center text-2xl flex-shrink-0">
        🐎
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-yellow-400 font-bold text-base truncate">
          {inv.horseName ?? `Horse #${inv.horseId ?? "?"}`}
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <User size={10} />
            {inv.ownerName ?? `Owner #${inv.horseOwnerId}`}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={10} />
            {fmtDate(inv.sentAt)}
          </span>
          {inv.raceName && (
            <span className="flex items-center gap-1">
              <Flag size={10} />
              {inv.raceName}
            </span>
          )}
        </div>
        {inv.odds && (
          <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-white/8 text-gray-400">
            Odds: {inv.odds}
          </span>
        )}
        {isAccepted && (
          <span className="inline-block mt-2 text-xs px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
            Accepted
          </span>
        )}
      </div>

      {/* Actions */}
      {isPending && (
        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={() => onAccept(inv.invitationId)}
            disabled={accepting === inv.invitationId}
            className="px-5 py-1.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black text-xs font-bold rounded-lg transition-colors"
          >
            {accepting === inv.invitationId ? "…" : "Accept"}
          </button>
          <button
            onClick={() => onDecline(inv.invitationId)}
            disabled={declining === inv.invitationId}
            className="px-5 py-1.5 border border-white/20 text-gray-300 text-xs font-semibold rounded-lg hover:bg-white/5 disabled:opacity-60 transition-colors"
          >
            {declining === inv.invitationId ? "…" : "Decline"}
          </button>
        </div>
      )}
      {isDeclined && (
        <span className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-500">
          Expired
        </span>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function JockeyDashboard() {
  const { user } = useAuth();
  const userId = user?.userId ?? user?.id;
  const firstName = user?.fullName?.split(" ")[0] ?? "there";

  const [profile, setProfile] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);
  const [declining, setDeclining] = useState(null);

  useEffect(() => {
    Promise.allSettled([getJockeyProfile(userId), getJockeyInvitations()])
      .then(([p, inv]) => {
        if (p.status === "fulfilled") setProfile(p.value);
        if (inv.status === "fulfilled") {
          const list = Array.isArray(inv.value)
            ? inv.value
            : (inv.value?.data ?? inv.value?.invitations ?? []);
          setInvitations(list);
        }
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const handleAccept = async (invitationId) => {
    setAccepting(invitationId);
    try {
      await updateJockeyInvitation(invitationId, "Accepted");
      setInvitations((prev) =>
        prev.map((i) =>
          i.invitationId === invitationId ? { ...i, status: "Accepted" } : i,
        ),
      );
    } catch (err) {
      console.error("Accept failed:", err);
    } finally {
      setAccepting(null);
    }
  };

  const handleDecline = async (invitationId) => {
    setDeclining(invitationId);
    try {
      await updateJockeyInvitation(invitationId, "Declined");
      setInvitations((prev) =>
        prev.map((i) =>
          i.invitationId === invitationId ? { ...i, status: "Declined" } : i,
        ),
      );
    } catch (err) {
      console.error("Decline failed:", err);
    } finally {
      setDeclining(null);
    }
  };

  const pending = invitations.filter((i) => i.status === "Pending");
  const winRate =
    profile?.totalRaces > 0
      ? ((profile.totalWins / profile.totalRaces) * 100).toFixed(1)
      : null;

  return (
    <div className="flex h-screen bg-[#0a0d14] text-white overflow-hidden">
      {/* ══════════ Sidebar ══════════ */}
      <aside className="w-52 flex flex-col bg-[#0d1117] border-r border-white/10 flex-shrink-0">
        {/* Avatar + brand */}
        <div className="flex flex-col items-center pt-8 pb-6 px-4 border-b border-white/10">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-600/40 to-yellow-900/40 border-2 border-yellow-500/50 flex items-center justify-center text-3xl mb-3">
            🏇
          </div>
          <p className="text-yellow-400 font-bold text-base">GrandStride</p>
          <p className="text-gray-400 text-xs mt-0.5">Elite Jockey</p>
          <span className="mt-2 text-xs px-3 py-0.5 rounded-full border border-yellow-500/40 text-yellow-400">
            Jockey Role
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors border-l-2
                ${
                  isActive
                    ? "border-l-yellow-400 bg-yellow-500/10 text-yellow-400"
                    : "border-l-transparent text-gray-400 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* ══════════ Main ══════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-end gap-2 px-8 py-3.5 border-b border-white/8 flex-shrink-0">
          <button className="w-8 h-8 rounded-lg hover:bg-white/8 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <Bell size={16} />
          </button>
          <button className="w-8 h-8 rounded-lg hover:bg-white/8 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <Settings size={16} />
          </button>
          <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-xs font-bold text-black ml-1">
            {user?.fullName?.[0] ?? "J"}
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-auto p-8 space-y-6">
          {/* Welcome */}
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
            <p className="text-gray-400 text-sm mt-1">
              Welcome back,{" "}
              <span className="text-yellow-400">{firstName}</span>. Your{" "}
              <span className="text-yellow-400">upcoming schedule</span> and{" "}
              <span className="text-yellow-400">invitations</span>.
            </p>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Pending Invitations"
              icon={Mail}
              value={loading ? "—" : pending.length}
              badge={!loading && pending.length > 0 ? "Action Required" : null}
              sub={!loading && pending.length === 0 ? "All clear" : null}
              subColor="text-gray-500"
            />
            <StatCard
              label="Upcoming Races"
              icon={Flag}
              value={0}
              sub="Next: TBA"
              subColor="text-emerald-400"
            />
            <StatCard
              label="Career Wins"
              icon={Trophy}
              value={loading ? "—" : (profile?.totalWins ?? 0)}
              sub={winRate ? `↑ ${winRate}% win rate` : null}
              subColor="text-emerald-400"
            />
            <StatCard
              label="Career Prize Points"
              icon={Star}
              value="—"
              sub="Coming soon"
              subColor="text-gray-500"
            />
          </div>

          {/* Two-column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
            {/* Invitation Inbox */}
            <div className="bg-[#141920] border border-white/8 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-bold text-base">
                  Invitation Inbox
                </h2>
                <button className="text-yellow-400 hover:text-yellow-300 text-sm flex items-center gap-1 transition-colors">
                  View All <ChevronRight size={14} />
                </button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-24 bg-white/5 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : invitations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3">
                  <Mail size={28} className="text-gray-700" />
                  <p className="text-gray-500 text-sm">No invitations yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {invitations.slice(0, 3).map((inv) => (
                    <InvitationCard
                      key={inv.invitationId}
                      inv={inv}
                      onAccept={handleAccept}
                      onDecline={handleDecline}
                      accepting={accepting}
                      declining={declining}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-4">
              {/* Upcoming Races placeholder */}
              <div className="bg-[#141920] border border-white/8 rounded-xl p-5 flex-1">
                <h2 className="text-white font-bold text-base mb-4">
                  My Upcoming Races
                </h2>
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Flag size={28} className="text-gray-700" />
                  <p className="text-gray-500 text-sm text-center">
                    Race schedule coming soon.
                  </p>
                </div>
              </div>

              {/* Jockey Masterclass card */}
              <div className="bg-emerald-950/60 border border-emerald-500/25 rounded-xl p-5">
                <h3 className="text-emerald-400 font-bold text-sm mb-1">
                  Jockey Masterclass
                </h3>
                <p className="text-gray-400 text-xs leading-relaxed mb-4">
                  Review recent race telemetry and improve your gate break
                  timing.
                </p>
                <button className="text-xs px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold transition-colors">
                  View Analysis
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
