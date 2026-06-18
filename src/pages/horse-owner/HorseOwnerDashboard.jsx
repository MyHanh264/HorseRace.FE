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
    accentClass: "border-t-emerald-500",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
  },
  invitations: {
    accentClass: "border-t-yellow-500",
    iconBg: "bg-yellow-500/15",
    iconColor: "text-yellow-400",
  },
  entries: {
    accentClass: "border-t-sky-500",
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-400",
  },
  races: {
    accentClass: "border-t-violet-500",
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-400",
  },
};

function StatCard({ id, icon, label, value, sub, subColor }) {
  const { accentClass, iconBg, iconColor } = STAT_META[id] ?? STAT_META.horses;
  return (
    <div
      className={`bg-[#161d2e] border border-white/8 border-t-2 ${accentClass} rounded-xl p-5 flex flex-col gap-3`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-gray-400 text-sm font-medium leading-snug">
          {label}
        </span>
        <div
          className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}
        >
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
      <div>
        <p className="text-4xl font-bold text-white tracking-tight">
          {value ?? "—"}
        </p>
        {sub && (
          <p
            className={`text-xs mt-1.5 font-medium ${subColor ?? "text-gray-500"}`}
          >
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
  const trainerPart = horse.trainerName
    ? `Trainer: ${horse.trainerName}`
    : null;
  const sub = [breedPart, trainerPart].filter(Boolean).join(" • ");

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3 px-2 hover:bg-white/5 rounded-lg transition-colors group"
    >
      {/* Avatar */}
      <div className="w-12 h-12 rounded-xl bg-[#0f1628] border border-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
        {showImg ? (
          <img
            src={horse.imageUrl}
            alt={horse.name}
            className="w-full h-full object-cover"
            onError={() => setImgErr(true)}
          />
        ) : (
          <ImageIcon size={18} className="text-gray-600" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 text-left min-w-0">
        <p className="text-white font-semibold text-sm">{horse.name}</p>
        <p className="text-gray-500 text-xs mt-0.5 truncate">{sub || "—"}</p>
      </div>

      {/* Badge */}
      <span
        className={`text-xs px-2.5 py-0.5 rounded-full border font-medium flex-shrink-0 uppercase tracking-wide
          ${STATUS_BADGE[horse.status] ?? "bg-gray-500/20 text-gray-400 border-gray-600/40"}`}
      >
        {horse.status ?? "Unknown"}
      </span>

      <ChevronRight
        size={15}
        className="text-gray-700 group-hover:text-gray-400 flex-shrink-0 transition-colors"
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
    <div className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-4 py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}
        >
          {abbr}
        </div>
        <span className="text-gray-200 text-sm truncate">{name}</span>
      </div>

      <span className="text-gray-400 text-sm truncate">
        {inv.raceName ?? "—"}
      </span>

      <span className="text-gray-500 text-sm whitespace-nowrap">
        {fmtDate(inv.sentAt)}
      </span>

      <button className="border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
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

  // Collect participant avatars (jockey + trainer initials as example)
  const participants = [race.jockeyName, race.trainerName].filter(Boolean);

  return (
    <div className="bg-[#0d1424] border border-white/8 rounded-xl p-4 flex flex-col gap-2">
      {/* Date + grade */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-gray-400 text-xs font-medium">
          {date}
          {time ? ` • ${time}` : ""}
        </span>
        {race.roundType && (
          <span className="text-xs px-2 py-0.5 bg-[#1e2840] text-gray-400 border border-white/10 rounded-md font-medium">
            {race.roundType}
          </span>
        )}
      </div>

      {/* Race name */}
      <p className="text-white font-bold text-sm leading-snug">
        {race.name ?? `Race #${race.raceId}`}
      </p>

      {/* Horse + participants */}
      <div className="flex items-center justify-between mt-0.5">
        {race.horseName && (
          <p className="text-gray-500 text-xs">
            Horse:{" "}
            <span className="text-gray-300 font-medium">{race.horseName}</span>
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
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 text-sm animate-pulse">
          Loading dashboard…
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-3xl font-bold text-white">
              Welcome back, {firstName}
            </h1>
            <span className="text-xs px-2.5 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full font-semibold tracking-widest uppercase">
              Horse Owner
            </span>
          </div>
          <p className="text-gray-400 text-sm">
            Here is the latest overview of your stable's performance.
          </p>
        </div>

        <button
          onClick={() => navigate("/horse-owner/horses/register")}
          className="flex items-center gap-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap flex-shrink-0"
        >
          <Plus size={16} />
          Register New Horse
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          sub={pendingInvitations.length > 0 ? "Requires Action" : "All clear"}
          subColor={
            pendingInvitations.length > 0 ? "text-yellow-400" : "text-gray-500"
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

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          {/* My Horses */}
          <div className="bg-[#161d2e] border border-white/8 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-bold text-base">My Horses</h2>
              <button
                onClick={() => navigate("/horse-owner/horses")}
                className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
              >
                View All
              </button>
            </div>

            {horses.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                No horses registered yet.
              </p>
            ) : (
              <div className="divide-y divide-white/5">
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

          {/* Pending Invitations */}
          <div className="bg-[#161d2e] border border-white/8 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-bold text-base">
                Pending Invitations
              </h2>
              <button
                onClick={() => navigate("/horse-owner/invitations")}
                className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
              >
                View All
              </button>
            </div>

            {pendingInvitations.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                No pending invitations.
              </p>
            ) : (
              <>
                {/* Table header */}
                <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-0 pb-2 mb-1 text-xs text-gray-500 uppercase tracking-wider">
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

        {/* Right column — Upcoming Races */}
        <div className="bg-[#161d2e] border border-white/8 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-base">Upcoming Races</h2>
          </div>

          {races.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-12 gap-3">
              <Clock size={32} className="text-gray-700" />
              <p className="text-gray-500 text-sm">No upcoming races.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 flex-1">
              {races.slice(0, 4).map((race) => (
                <RaceCard key={race.raceId} race={race} />
              ))}
            </div>
          )}

          <button
            onClick={() => navigate("/horse-owner/entries")}
            className="mt-4 w-full text-center text-gray-500 hover:text-gray-300 text-sm font-medium transition-colors py-2"
          >
            View Full Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
