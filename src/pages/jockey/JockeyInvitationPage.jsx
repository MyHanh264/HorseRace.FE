import { useState, useEffect } from "react";
import {
  CircleCheck,
  XCircle,
  Clock,
  History,
  Calendar,
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

// Avatar color hashed from string
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

function InvitationCard({ inv, onAccept, onDeclineClick, actioning }) {
  const isPending   = inv.status === "Pending";
  const isAccepted  = inv.status === "Accepted" || inv.status === "Confirmed";
  const isDeclined  = inv.status === "Declined";
  const isCancelled = inv.status === "Cancelled";

  const ownerLabel = inv.horseOwnerName || `Owner #${inv.horseOwnerId}`;
  const color = avatarColor(ownerLabel);
  const abbr = initials(ownerLabel);

  return (
    <div
      className={`bg-[#0f1628] rounded-xl overflow-hidden flex
      border border-white/8
      ${isPending   ? "border-l-[3px] border-l-yellow-500" : ""}
      ${isAccepted  ? "border-l-[3px] border-l-emerald-500" : ""}
      ${isDeclined  ? "border-l-[3px] border-l-red-500 opacity-70" : ""}
      ${isCancelled ? "border-l-[3px] border-l-gray-500 opacity-60" : ""}
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
        </div>
      </div>

      {/* ── RACE DETAILS ── */}
      <div className="flex-1 px-5 py-5 border-r border-white/8 min-w-0">
        <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1.5">
          Race Details
        </p>
        <p className="text-white font-bold text-sm leading-snug">
          {inv.raceName || `Race #${inv.raceId}`}
        </p>
        <div className="flex flex-col gap-1.5 mt-2.5">
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <Calendar size={11} className="text-gray-600 flex-shrink-0" />
            <span>{fmtDate(inv.sentAt)}</span>
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
              onClick={() => onDeclineClick(inv)}
              disabled={actioning === inv.invitationId}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-transparent hover:bg-red-500/10 border border-red-500/50 text-red-400 hover:text-red-300 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              <XCircle size={13} />
              Decline
            </button>
          </>
        ) : isCancelled ? (
          <div className="text-center">
            <span className="text-xs px-2.5 py-1 rounded-md border font-medium bg-gray-500/15 text-gray-400 border-gray-500/30">
              Cancelled
            </span>
            <p className="text-gray-500 text-[10px] mt-2 leading-tight">
              Horse owner has<br />chosen another jockey
            </p>
          </div>
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
  const [declineInv, setDeclineInv] = useState(null);
  const [declineReason, setDeclineReason] = useState("");
  const [declineError, setDeclineError] = useState("");

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

  const handleDeclineConfirm = async () => {
    const invitationId = declineInv.invitationId;
    setActioning(invitationId);
    setDeclineError("");
    try {
      await updateJockeyInvitation(invitationId, "Declined", declineReason.trim() || null);
      setInvitations((prev) =>
        prev.map((i) =>
          i.invitationId === invitationId ? { ...i, status: "Declined" } : i,
        ),
      );
      setDeclineInv(null);
      setDeclineReason("");
    } catch (err) {
      const detail = err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.message;
      setDeclineError(detail ?? "Failed to decline invitation.");
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
              onDeclineClick={(i) => { setDeclineInv(i); setDeclineReason(""); setDeclineError(""); }}
              actioning={actioning}
            />
          ))}
        </div>
      )}

      {/* Decline reason modal */}
      {declineInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="text-white font-bold text-lg mb-2">Decline Invitation?</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Let{" "}
              <span className="text-white font-semibold">
                {declineInv.horseOwnerName || `Owner #${declineInv.horseOwnerId}`}
              </span>
              {" know why you're declining "}
              <span className="text-white font-semibold">
                {declineInv.horseName ?? `Horse #${declineInv.horseId}`}
              </span>
              {" (optional)."}
            </p>

            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. Already booked for another race that day"
              rows={3}
              maxLength={300}
              className="w-full bg-[#0f1628] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 resize-none mb-4"
            />

            {declineError && (
              <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">
                {declineError}
              </p>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => { setDeclineInv(null); setDeclineError(""); }}
                disabled={actioning === declineInv.invitationId}
                className="flex-1 py-2.5 rounded-xl border border-white/15 text-gray-300 hover:bg-white/5 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeclineConfirm}
                disabled={actioning === declineInv.invitationId}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold text-sm transition-colors"
              >
                {actioning === declineInv.invitationId ? "Declining…" : "Decline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
