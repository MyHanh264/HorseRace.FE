import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { getInvitations, deleteInvitation } from "../../api/horseOwner";
import SendInvitationModal from "./SendInvitationModal";
import ConfirmJockeyModal from "./ConfirmJockeyModal";

const STATUS_BADGE = {
  Accepted: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",
  Pending: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40",
  Declined: "bg-red-500/20 text-red-400 border border-red-500/40",
};

const ROW_ACCENT = {
  Accepted: "border-l-2 border-l-emerald-500",
  Pending: "border-l-2 border-l-transparent",
  Declined: "border-l-2 border-l-transparent",
};

const TABS = ["Sent", "Pending Response"];

function HorseAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-[#2a3350] border border-white/10 flex items-center justify-center flex-shrink-0">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="text-gray-400"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M6 20v-1a6 6 0 0 1 12 0v1" />
      </svg>
    </div>
  );
}

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Sent");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [confirmInv, setConfirmInv] = useState(null);

  useEffect(() => {
    getInvitations()
      .then((data) => {
        const list = Array.isArray(data)
          ? data
          : (data?.data ?? data?.invitations ?? []);
        setInvitations(list);
      })
      .catch((err) => {
        console.error("getInvitations failed:", err);
        setInvitations([]);
      })
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const handleDelete = async (invitationId) => {
    if (!confirm("Are you sure you want to delete this invitation?")) return;
    try {
      await deleteInvitation(invitationId);
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const filtered =
    activeTab === "Pending Response"
      ? invitations.filter((i) => i.status === "Pending")
      : invitations;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-white">Invitations</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage riding requests and confirm jockey bookings.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
        >
          + Send Invitation
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mt-6 mb-5 border-b border-white/10">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px
              ${
                activeTab === tab
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#161d2e] rounded-xl border border-white/8 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2.2fr_1.6fr_1.6fr_1.1fr_1fr_1fr] px-6 py-3 border-b border-white/8 text-xs text-gray-500 uppercase tracking-wider">
          <div>Race</div>
          <div>Horse</div>
          <div>Jockey Name</div>
          <div>Sent Date</div>
          <div>Status</div>
          <div className="text-right">Action</div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-white/5 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 text-center py-16">
            No invitations found.
          </p>
        ) : (
          filtered.map((inv) => (
            <div
              key={inv.invitationId}
              className={`grid grid-cols-[2.2fr_1.6fr_1.6fr_1.1fr_1fr_1fr] px-6 py-4 items-center
                border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors
                ${ROW_ACCENT[inv.status] ?? "border-l-2 border-l-transparent"}`}
            >
              {/* Race */}
              <div>
                <p className="text-white text-sm font-semibold">
                  {inv.raceName ?? "—"}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {inv.surface && inv.distance
                    ? `${inv.surface} • ${inv.distance}`
                    : "Race info TBA"}
                </p>
              </div>

              {/* Horse */}
              <div className="flex items-center gap-2.5">
                <HorseAvatar />
                <p className="text-gray-300 text-sm">
                  {inv.horseName ?? `Horse #${inv.horseOwnerId}`}
                </p>
              </div>

              {/* Jockey Name */}
              <div>
                <p className="text-gray-300 text-sm">
                  {inv.jockeyName ?? `Jockey #${inv.jockeyId}`}
                </p>
              </div>

              {/* Sent Date */}
              <div>
                <p className="text-gray-400 text-sm">
                  {formatDate(inv.sentAt)}
                </p>
              </div>

              {/* Status */}
              <div>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-md border font-medium uppercase tracking-wide
                    ${STATUS_BADGE[inv.status] ?? "bg-gray-500/20 text-gray-400 border-gray-600/40"}`}
                >
                  {inv.status}
                </span>
              </div>

              {/* Action */}
              <div className="flex items-center justify-end gap-2">
                {inv.status === "Accepted" && (
                  <button
                    onClick={() => setConfirmInv(inv)}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold px-4 py-1.5 rounded-lg transition-colors"
                  >
                    Confirm
                  </button>
                )}
                {inv.status === "Pending" && (
                  <button
                    onClick={() => handleDelete(inv.invitationId)}
                    className="w-8 h-8 rounded-full border border-white/10 bg-white/5 hover:border-red-500/40 hover:bg-red-500/10 flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
                {inv.status === "Declined" && (
                  <button
                    onClick={() => handleDelete(inv.invitationId)}
                    className="w-8 h-8 rounded-lg border border-white/10 bg-white/5 hover:border-red-500/40 hover:bg-red-500/10 flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirm Jockey Modal */}
      {confirmInv && (
        <ConfirmJockeyModal
          invitation={confirmInv}
          onClose={() => setConfirmInv(null)}
          onConfirmed={() => {
            setConfirmInv(null);
            setLoading(true);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {/* Send Invitation Modal */}
      {showModal && (
        <SendInvitationModal
          onClose={() => {
            setShowModal(false);
            setLoading(true);
            setRefreshKey((k) => k + 1);
          }}
          onSuccess={() => {
            setLoading(true);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
