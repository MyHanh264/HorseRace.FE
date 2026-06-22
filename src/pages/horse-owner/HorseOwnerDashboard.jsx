import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  PawPrint,
  Mail,
  ClipboardList,
  Calendar,
  ChevronRight,
  Clock,
  Plus,
  ImageIcon,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getMyHorses,
  getInvitations,
  getMyEntries,
  getRaces,
} from "../../api/horseOwner";

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATUS_BADGE = {
  Approved: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",
  Pending: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40",
  Rejected: "bg-red-500/20 text-red-400 border border-red-500/40",
};

const AVATAR_COLORS = [
  "bg-indigo-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-rose-600",
  "bg-sky-600",
  "bg-amber-600",
];

function avatarColor(str = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtRaceDateTime(d) {
  if (!d) return { date: "—", time: "" };
  const dt = new Date(d);
  const date = dt
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
    .toUpperCase();
  const time = dt.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { date, time };
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

const STAT_META = {
  horses: {
    accentColor: "bg-primary",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  invitations: {
    accentColor: "bg-yellow-400",
    iconBg: "bg-yellow-400/10",
    iconColor: "text-yellow-400",
  },
  entries: {
    accentColor: "bg-sky-400",
    iconBg: "bg-sky-400/10",
    iconColor: "text-sky-400",
  },
  races: {
    accentColor: "bg-violet-400",
    iconBg: "bg-violet-400/10",
    iconColor: "text-violet-400",
  },
};

function StatCard({ id, icon, label, value, sub, subColor }) {
  const { accentColor, iconBg, iconColor } = STAT_META[id] ?? STAT_META.horses;
  return (
    <div className="gs-stat-card">
      <div
        className={`absolute top-0 left-0 right-0 h-[2px] rounded-t-[14px] ${accentColor}`}
        style={{ opacity: 0.6 }}
      />
      <div className="flex items-start justify-between">
        <span className="gs-stat-card-label">{label}</span>
        <div className={`gs-stat-card-icon-wrap ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
      <div>
        <p className="gs-stat-card-value">{value ?? "—"}</p>
        {sub && (
          <p className={`gs-stat-card-sub ${subColor ?? "text-[var(--color-on-surface-variant)]"}`}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── HorseRow ─────────────────────────────────────────────────────────────────

function HorseRow({ horse, onClick }) {
  const [imgErr, setImgErr] = useState(false);
  const showImg = horse.imageUrl && !imgErr;
  const age = horse.age ? `${horse.age}yo` : null;
  const breedPart = [age, horse.breed].filter(Boolean).join(" ");
  const trainerPart = horse.trainerName ? `Trainer: ${horse.trainerName}` : null;
  const sub = [breedPart, trainerPart].filter(Boolean).join(" • ");

  return (
    <button
      onClick={onClick}
      className="w-full gs-list-row group"
    >
      <div className="gs-list-row-avatar bg-[var(--color-surface-container-high)]">
        {showImg ? (
          <img
            src={horse.imageUrl}
            alt={horse.name}
            className="w-full h-full object-cover rounded-[9px]"
            onError={() => setImgErr(true)}
          />
        ) : (
          <ImageIcon size={16} className="text-[var(--color-on-surface-variant)]" />
        )}
      </div>
      <div className="gs-list-row-info">
        <p className="gs-list-row-name">{horse.name}</p>
        <p className="gs-list-row-sub">{sub || "—"}</p>
      </div>
      <span
        className={`text-[10px] px-2.5 py-1 rounded-lg border font-semibold flex-shrink-0
          ${STATUS_BADGE[horse.status] ?? "bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] border-[rgba(64,73,65,0.5)]"}`}
      >
        {horse.status ?? "Unknown"}
      </span>
      <ChevronRight
        size={14}
        className="text-[var(--color-outline)] flex-shrink-0 transition-colors group-hover:text-primary"
      />
    </button>
  );
}

// ─── InvitationRow ────────────────────────────────────────────────────────────

function InvitationRow({ inv }) {
  const name = inv.jockeyName ?? `Jockey #${inv.jockeyId}`;
  const color = avatarColor(name);
  const abbr = initials(name);

  return (
    <div className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-4 py-3 border-b border-[rgba(64,73,65,0.25)] last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}
        >
          {abbr}
        </div>
        <span className="text-[var(--color-on-surface)] text-sm truncate">{name}</span>
      </div>
      <span className="text-[var(--color-on-surface-variant)] text-sm truncate">
        {inv.raceName ?? "—"}
      </span>
      <span className="text-[var(--color-on-surface-variant)] text-sm whitespace-nowrap">
        {fmtDate(inv.sentAt)}
      </span>
      <button className="gs-btn gs-btn-outline-gold gs-btn-sm flex-shrink-0">
        Review
      </button>
    </div>
  );
}

// ─── RaceCard ─────────────────────────────────────────────────────────────────

function RaceCard({ race }) {
  const { date, time } = fmtRaceDateTime(
    race.scheduledStartTime ?? race.scheduledAt,
  );

  const participants = [race.jockeyName, race.trainerName].filter(Boolean);

  return (
    <div className="gs-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[var(--color-on-surface-variant)] text-xs font-medium">
          {date}
          {time ? ` • ${time}` : ""}
        </span>
        {race.roundType && (
          <span className="gs-badge gs-badge-neutral text-[10px]">
            {race.roundType}
          </span>
        )}
      </div>
      <p className="text-[var(--color-on-surface)] font-bold text-sm leading-snug">
        {race.name ?? `Race #${race.raceId}`}
      </p>
      <div className="flex items-center justify-between">
        {race.horseName && (
          <p className="text-[var(--color-on-surface-variant)] text-xs">
            Horse:{" "}
            <span className="text-[var(--color-on-surface)] font-medium">{race.horseName}</span>
          </p>
        )}
        {participants.length > 0 && (
          <div className="flex items-center gap-1">
            {participants.slice(0, 3).map((p, i) => (
              <div
                key={i}
                className={`w-6 h-6 rounded-full ${avatarColor(p)} flex items-center justify-center text-[10px] font-bold text-white`}
                title={p}
              >
                {initials(p)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function HorseOwnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [horses, setHorses] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [entries, setEntries] = useState([]);
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      getMyHorses(),
      getInvitations(),
      getMyEntries(),
      getRaces(),
    ])
      .then(([h, inv, ent, r]) => {
        if (h.status === "fulfilled")
          setHorses(Array.isArray(h.value) ? h.value : (h.value?.data ?? []));
        if (inv.status === "fulfilled")
          setInvitations(
            Array.isArray(inv.value)
              ? inv.value
              : (inv.value?.data ?? inv.value?.invitations ?? []),
          );
        if (ent.status === "fulfilled")
          setEntries(
            Array.isArray(ent.value) ? ent.value : (ent.value?.data ?? []),
          );
        if (r.status === "fulfilled")
          setRaces(Array.isArray(r.value) ? r.value : (r.value?.data ?? []));
      })
      .finally(() => setLoading(false));
  }, []);

  const approvedCount = horses.filter((h) => h.status === "Approved").length;
  const pendingInvitations = invitations.filter((i) => i.status === "Pending");
  const activeEntries = entries.filter((e) =>
    ["Approved", "Active"].includes(e.status),
  );
  const firstName = user?.fullName?.split(" ")[0] ?? "there";

  if (loading) {
    return (
      <main className="gs-main">
        <div className="gs-page-header">
          <div>
            <div className="gs-page-title-greeting text-primary">Welcome back</div>
            <h1 className="gs-page-title">{firstName}</h1>
            <p className="gs-page-subtitle">Loading your dashboard…</p>
          </div>
        </div>
        <div className="portal-content">
          <div className="gs-grid-4 mb-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="gs-stat-card gs-skeleton h-[120px]" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="gs-main">
      {/* Page header */}
      <div className="gs-page-header">
        <div>
          <div className="gs-page-title-greeting text-primary">Welcome back</div>
          <h1 className="gs-page-title">{firstName}</h1>
          <p className="gs-page-subtitle">
            Here is the latest overview of your stable's performance.
          </p>
        </div>
        <button
          onClick={() => navigate("/horse-owner/horses/register")}
          className="gs-btn gs-btn-primary flex-shrink-0"
        >
          <Plus size={15} />
          Register New Horse
        </button>
      </div>

      <div className="portal-content space-y-5">
        {/* Stat Cards */}
        <div className="gs-grid-4">
          <StatCard
            id="horses"
            label="My Horses"
            icon={<PawPrint size={18} />}
            value={horses.length}
            sub={`/ ${approvedCount} Approved`}
          />
          <StatCard
            id="invitations"
            label="Pending Invitations"
            icon={<Mail size={18} />}
            value={pendingInvitations.length}
            sub={pendingInvitations.length > 0 ? "Requires action" : "All clear"}
            subColor={
              pendingInvitations.length > 0 ? "text-yellow-400" : "text-[var(--color-on-surface-variant)]"
            }
          />
          <StatCard
            id="entries"
            label="Active Entries"
            icon={<ClipboardList size={18} />}
            value={activeEntries.length}
          />
          <StatCard
            id="races"
            label="Upcoming Races"
            icon={<Calendar size={18} />}
            value={races.length}
            sub="This Week"
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
          {/* Left column */}
          <div className="flex flex-col gap-5">
            {/* My Horses */}
            <div className="gs-dash-card">
              <div className="gs-dash-card-header">
                <h2 className="gs-dash-card-title">My Horses</h2>
                <button
                  onClick={() => navigate("/horse-owner/horses")}
                  className="text-primary hover:text-[var(--color-on-primary-container)] text-xs font-semibold transition-colors"
                >
                  View All →
                </button>
              </div>
              <div className="gs-dash-card-body py-1">
                {horses.length === 0 ? (
                  <div className="gs-empty-state">
                    <div className="gs-empty-state-icon">
                      <PawPrint size={24} className="text-[var(--color-on-surface-variant)]" />
                    </div>
                    <div className="gs-empty-state-title">No horses registered yet</div>
                    <div className="gs-empty-state-desc">
                      Get started by registering your first horse.
                    </div>
                  </div>
                ) : (
                  <div>
                    {horses.slice(0, 3).map((horse) => (
                      <HorseRow
                        key={horse.horseId}
                        horse={horse}
                        onClick={() =>
                          navigate(`/horse-owner/horses/${horse.horseId}`)
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pending Invitations */}
            <div className="gs-dash-card">
              <div className="gs-dash-card-header">
                <h2 className="gs-dash-card-title">Pending Invitations</h2>
                <button
                  onClick={() => navigate("/horse-owner/invitations")}
                  className="text-primary hover:text-[var(--color-on-primary-container)] text-xs font-semibold transition-colors"
                >
                  View All →
                </button>
              </div>
              <div className="gs-dash-card-body">
                {pendingInvitations.length === 0 ? (
                  <div className="gs-empty-state">
                    <div className="gs-empty-state-icon">
                      <Mail size={24} className="text-[var(--color-on-surface-variant)]" />
                    </div>
                    <div className="gs-empty-state-title">No pending invitations</div>
                    <div className="gs-empty-state-desc">
                      All caught up — no action required.
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-0 pb-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] opacity-60">
                      <span>Jockey / Sender</span>
                      <span>Race Event</span>
                      <span>Date</span>
                      <span>Action</span>
                    </div>
                    {pendingInvitations.slice(0, 3).map((inv) => (
                      <InvitationRow key={inv.invitationId} inv={inv} />
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right column — Upcoming Races */}
          <div className="gs-dash-card flex flex-col">
            <div className="gs-dash-card-header">
              <h2 className="gs-dash-card-title">Upcoming Races</h2>
            </div>
            <div className="gs-dash-card-body flex-1">
              {races.length === 0 ? (
                <div className="gs-empty-state flex-1">
                  <div className="gs-empty-state-icon">
                    <Clock size={24} className="text-[var(--color-on-surface-variant)]" />
                  </div>
                  <div className="gs-empty-state-title">No upcoming races</div>
                  <div className="gs-empty-state-desc">
                    Check back soon for the next race schedule.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {races.slice(0, 4).map((race) => (
                    <RaceCard key={race.raceId} race={race} />
                  ))}
                </div>
              )}
            </div>
            <div className="gs-dash-card-footer">
              <button
                onClick={() => navigate("/horse-owner/entries")}
                className="w-full text-center text-[var(--color-on-surface-variant)] hover:text-primary text-xs font-semibold transition-colors py-1"
              >
                View Full Schedule →
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
