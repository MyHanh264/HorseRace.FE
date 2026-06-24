import { useState, useEffect } from "react";
import {
  CircleCheck,
  XCircle,
  Clock,
  History,
  Calendar,
  Ruler,
  Trophy,
} from "lucide-react";
import { getJockeyInvitations, updateJockeyInvitation } from "../../api/jockey";

const TABS = ["Pending", "All History"];

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Avatar màu hash theo string
const AVATAR_COLORS = [
  "bg-indigo-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-rose-600",
  "bg-sky-600",
  "bg-amber-600",
];
function avatarColor(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(str = "") {
  return String(str)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function InvitationCard({ inv, onAccept, onDecline, actioning }) {
  const isPending = inv.status === "Pending";
  const isAccepted = inv.status === "Accepted";
  const isDeclined = inv.status === "Declined";

  const ownerLabel = `Owner #${inv.horseOwnerId}`;
  const color = avatarColor(ownerLabel);
  const abbr = initials(ownerLabel);

  return (
    <div
      className={`bg-[#0f1628] rounded-xl overflow-hidden flex
      border border-white/8
      ${isPending ? "border-l-[3px] border-l-yellow-500" : ""}
      ${isAccepted ? "border-l-[3px] border-l-emerald-500" : ""}
      ${isDeclined ? "border-l-[3px] border-l-red-500 opacity-70" : ""}
    `}
    >
      {/* ── FROM ── */}
      <div className="flex flex-col items-center justify-center gap-1.5 px-5 py-5 w-[130px] flex-shrink-0 border-r border-white/8">
        <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-0.5">
          From
        </p>
        <div
          className={`w-11 h-11 rounded-full ${color} flex items-center justify-center text-sm font-bold text-white`}
        >
          {abbr}
        </div>
        <p className="text-white text-xs font-bold text-center leading-tight">
          {ownerLabel}
        </p>
        <p className="text-emerald-400 text-[10px] font-medium">Owner</p>
      </div>

      {/* ── HORSE ── */}
      <div className="flex items-center gap-3 px-5 py-5 w-[220px] flex-shrink-0 border-r border-white/8">
        {/* Horse image placeholder */}
        <div className="w-16 h-16 rounded-xl bg-gray-700/60 flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden">
          🐎
        </div>
        <div className="min-w-0">
          <p className="text-white font-bold text-sm">
            {inv.horseName ?? `Horse #${inv.horseId}`}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">— • —</p>
          {/* Stats badges */}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            <span className="flex items-center gap-1 text-[10px] px-2 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-md font-semibold">
              — <span className="text-emerald-300/60">Win Rate</span>
            </span>
            <span className="flex items-center gap-1 text-[10px] px-2 py-1 bg-white/8 text-gray-400 border border-white/10 rounded-md font-semibold">
              — <span className="text-gray-600">Avg Pos</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── RACE DETAILS ── */}
      <div className="flex-1 px-5 py-5 border-r border-white/8 min-w-0">
        <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1.5">
          Race Details
        </p>
        <p className="text-white font-bold text-sm leading-snug">—</p>
        <div className="flex flex-col gap-1.5 mt-2.5">
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <Calendar size={11} className="text-gray-600 flex-shrink-0" />
            <span>{fmtDate(inv.sentAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <Ruler size={11} className="text-gray-600 flex-shrink-0" />
            <span>—</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <Trophy size={11} className="text-gray-600 flex-shrink-0" />
            <span>—</span>
          </div>
        </div>
      </div>

      {/* ── ACTIONS ── */}
      <div className="flex flex-col items-stretch justify-center gap-2 px-5 py-5 w-[140px] flex-shrink-0">
        {isPending ? (
          <>
            <button
              onClick={() => onAccept(inv.invitationId)}
              disabled={actioning === inv.invitationId}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black text-xs font-bold rounded-lg transition-colors"
            >
              <CircleCheck size={13} />
              Accept
            </button>
            <button
              onClick={() => onDecline(inv.invitationId)}
              disabled={actioning === inv.invitationId}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-transparent hover:bg-red-500/10 border border-red-500/50 text-red-400 hover:text-red-300 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              <XCircle size={13} />
              Decline
            </button>
            <button className="text-gray-600 hover:text-gray-400 text-xs text-center transition-colors py-1">
              Add Reason
            </button>
          </>
        ) : (
          <span
            className={`text-xs px-2.5 py-1 rounded-md border font-medium uppercase tracking-wide text-center
            ${isAccepted ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : ""}
            ${isDeclined ? "bg-red-500/15 text-red-400 border-red-500/30" : ""}
          `}
          >
            {inv.status}
          </span>
        )}
      </div>
    </div>
  );
}

export default function JockeyInvitationsPage() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Pending");
  const [actioning, setActioning] = useState(null);

  useEffect(() => {
    getJockeyInvitations()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        setInvitations(list);
      })
      .catch((err) => console.error("Fetch invitations failed:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleAccept = async (invitationId) => {
    setActioning(invitationId);
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
      setActioning(null);
    }
  };

  const handleDecline = async (invitationId) => {
    setActioning(invitationId);
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
      setActioning(null);
    }
  };

  const pendingCount = invitations.filter((i) => i.status === "Pending").length;
  const filtered =
    activeTab === "Pending"
      ? invitations.filter((i) => i.status === "Pending")
      : invitations;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-white">My Invitations</h1>
        <p className="text-gray-400 text-sm mt-1">
          Manage incoming race offers and{" "}
          <span className="text-emerald-400">historical engagements.</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mt-6 mb-5 border-b border-white/10">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2
              ${
                activeTab === tab
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
          >
            {tab === "Pending" && <Clock size={13} />}
            {tab === "All History" && <History size={13} />}
            {tab}
            {tab === "Pending" && pendingCount > 0 && (
              <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Clock size={36} className="text-gray-700" />
          <p className="text-gray-500 text-sm">
            {activeTab === "Pending"
              ? "No pending invitations."
              : "No invitation history."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((inv) => (
            <InvitationCard
              key={inv.invitationId}
              inv={inv}
              onAccept={handleAccept}
              onDecline={handleDecline}
              actioning={actioning}
            />
          ))}
        </div>
      )}
    </div>
  );
}
