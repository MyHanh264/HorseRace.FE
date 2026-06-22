import { useState, useEffect } from "react";
import {
  Bell,
  Settings,
  Mail,
  Flag,
  User,
  Trophy,
  Star,
  Calendar,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getJockeyProfile,
  getJockeyInvitations,
  updateJockeyInvitation,
} from "../../api/jockey";

// Chức năng: Định dạng ngày từ chuỗi ISO
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
const STAT_META = {
  invitations: {
    accentColor: "bg-yellow-400",
    iconBg: "bg-yellow-400/10",
    iconColor: "text-yellow-400",
  },
  races: {
    accentColor: "bg-primary",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  wins: {
    accentColor: "bg-secondary",
    iconBg: "bg-secondary/10",
    iconColor: "text-secondary",
  },
  points: {
    accentColor: "bg-sky-400",
    iconBg: "bg-sky-400/10",
    iconColor: "text-sky-400",
  },
};

function StatCard({ id, label, value, sub, subColor, badge, icon: Icon }) {
  const { accentColor, iconBg, iconColor } = STAT_META[id] ?? STAT_META.invitations;
  return (
    <div className="gs-stat-card">
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[14px]"
        style={{ background: accentColor, opacity: 0.6 }}
      />
      <div className="flex items-start justify-between">
        <span className="gs-stat-card-label">{label}</span>
        <div className={`gs-stat-card-icon-wrap ${iconBg}`}>
          <span className={iconColor}><Icon size={16} /></span>
        </div>
      </div>
      <div>
        <p className="gs-stat-card-value">{value ?? "—"}</p>
        {badge && (
          <span className="gs-badge gs-badge-secondary mt-1.5">{badge}</span>
        )}
        {sub && !badge && (
          <p className={`gs-stat-card-sub ${subColor ?? "text-[var(--color-on-surface-variant)]"}`}>
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
      className={`gs-dash-card p-4 flex items-start gap-4 transition-opacity
        ${isDeclined ? "opacity-50" : ""}`}
    >
      <div className="gs-list-row-avatar bg-[var(--color-surface-container-high)] text-lg">
        🐎
      </div>

      <div className="flex-1 min-w-0">
        <p className="gs-list-row-name text-secondary font-bold">
          {inv.horseName ?? `Horse #${inv.horseId ?? "?"}`}
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-[var(--color-on-surface-variant)]">
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
          <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]">
            Odds: {inv.odds}
          </span>
        )}
        {isAccepted && (
          <span className="gs-badge gs-badge-primary mt-2">
            Accepted
          </span>
        )}
      </div>

      {isPending && (
        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={() => onAccept(inv.invitationId)}
            disabled={accepting === inv.invitationId}
            className="gs-btn gs-btn-primary gs-btn-sm w-[80px]"
          >
            {accepting === inv.invitationId ? "…" : "Accept"}
          </button>
          <button
            onClick={() => onDecline(inv.invitationId)}
            disabled={declining === inv.invitationId}
            className="gs-btn gs-btn-ghost gs-btn-sm w-[80px]"
          >
            {declining === inv.invitationId ? "…" : "Decline"}
          </button>
        </div>
      )}
      {isDeclined && (
        <span className="gs-badge gs-badge-neutral text-xs flex-shrink-0">
          Declined
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
    <main className="gs-main">
      {/* Topbar */}
      <div className="gs-topbar">
        <button className="gs-topbar-icon-btn">
          <Bell size={15} />
        </button>
        <button className="gs-topbar-icon-btn">
          <Settings size={15} />
        </button>
        <div className="gs-topbar-avatar">
          {user?.fullName?.[0] ?? "J"}
        </div>
      </div>

      {/* Page header */}
      <div className="gs-page-header">
        <div>
          <div className="gs-page-title-greeting text-secondary">Dashboard Overview</div>
          <h1 className="gs-page-title">Welcome back, {firstName}</h1>
          <p className="gs-page-subtitle">
            Your upcoming schedule and latest invitations.
          </p>
        </div>
      </div>

      <div className="portal-content space-y-5">
        {/* Stat cards */}
        <div className="gs-grid-4">
          <StatCard
            id="invitations"
            label="Pending Invitations"
            icon={Mail}
            value={loading ? "—" : pending.length}
            badge={!loading && pending.length > 0 ? "Action Required" : null}
            sub={!loading && pending.length === 0 ? "All clear" : null}
            subColor="text-[var(--color-on-surface-variant)]"
          />
          <StatCard
            id="races"
            label="Upcoming Races"
            icon={Flag}
            value={0}
            sub="Next: TBA"
            subColor="text-primary"
          />
          <StatCard
            id="wins"
            label="Career Wins"
            icon={Trophy}
            value={loading ? "—" : (profile?.totalWins ?? 0)}
            sub={winRate ? `${winRate}% win rate` : null}
            subColor="text-primary"
          />
          <StatCard
            id="points"
            label="Prize Points"
            icon={Star}
            value="—"
            sub="Coming soon"
            subColor="text-[var(--color-on-surface-variant)]"
          />
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          {/* Invitation Inbox */}
          <div className="gs-dash-card">
            <div className="gs-dash-card-header">
              <h2 className="gs-dash-card-title">Invitation Inbox</h2>
              <button className="text-primary hover:text-[var(--color-on-primary-container)] text-xs font-semibold transition-colors flex items-center gap-1">
                View All <ChevronRight size={13} />
              </button>
            </div>
            <div className="gs-dash-card-body">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="gs-skeleton h-24" />
                  ))}
                </div>
              ) : invitations.length === 0 ? (
                <div className="gs-empty-state">
                  <div className="gs-empty-state-icon">
                    <Mail size={24} className="text-[var(--color-on-surface-variant)]" />
                  </div>
                  <div className="gs-empty-state-title">No invitations yet</div>
                  <div className="gs-empty-state-desc">
                    You will see race invitations here when horse owners reach out.
                  </div>
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
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            {/* Upcoming Races */}
            <div className="gs-dash-card flex-1">
              <div className="gs-dash-card-header">
                <h2 className="gs-dash-card-title">My Upcoming Races</h2>
              </div>
              <div className="gs-dash-card-body">
                <div className="gs-empty-state">
                  <div className="gs-empty-state-icon">
                    <Flag size={24} className="text-[var(--color-on-surface-variant)]" />
                  </div>
                  <div className="gs-empty-state-title">No upcoming races</div>
                  <div className="gs-empty-state-desc">
                    Race schedule coming soon. Accept invitations to get started.
                  </div>
                </div>
              </div>
            </div>

            {/* Performance card */}
            <div className="gs-dash-card" style={{
              background: "linear-gradient(135deg, rgba(141,214,166,0.05) 0%, var(--color-surface-container-low) 100%)",
              border: "1px solid rgba(141,214,166,0.2)",
            }}>
              <div className="gs-dash-card-body">
                <div className="flex items-center gap-2 mb-3">
                  <div className="gs-stat-card-icon-wrap bg-primary/10">
                    <TrendingUp size={16} className="text-primary" />
                  </div>
                  <h3 className="gs-dash-card-title text-primary">Performance</h3>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[var(--color-on-surface-variant)] text-xs font-semibold uppercase tracking-wider">Career Win Rate</span>
                  <span className="text-secondary font-bold text-lg font-mono">{winRate ?? "—"}%</span>
                </div>
                <div className="w-full bg-[var(--color-surface-container-high)] rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-700"
                    style={{
                      width: winRate ? `${winRate}%` : "0%",
                      background: "linear-gradient(90deg, var(--color-primary), var(--color-secondary))",
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[var(--color-on-surface-variant)] text-xs font-semibold uppercase tracking-wider">Total Races</span>
                  <span className="text-[var(--color-on-surface)] font-bold text-sm">{loading ? "—" : (profile?.totalRaces ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[var(--color-on-surface-variant)] text-xs font-semibold uppercase tracking-wider">Total Wins</span>
                  <span className="text-secondary font-bold text-sm">{loading ? "—" : (profile?.totalWins ?? 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
