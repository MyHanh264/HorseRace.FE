import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { getInvitations, deleteInvitation } from "../../api/horseOwner";

const STATUS_BADGE = {
  Accepted: "bg-emerald-500/20 text-emerald-400 border border-emerald-700",
  Pending: "bg-yellow-500/20 text-yellow-400 border border-yellow-700",
  Declined: "bg-red-500/20 text-red-400 border border-red-700",
};

const TABS = ["Sent", "Pending Response"];

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Sent");
  const [refreshKey, setRefreshKey] = useState(0);

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

  // Filter theo tab
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
        <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
          + Send Invitation
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-b border-white/10 mt-6">
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
      <div className="bg-[#1a2035] rounded-xl border border-white/10 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-6 px-6 py-3 border-b border-white/10 text-xs text-gray-500 uppercase tracking-wider">
          <div className="col-span-2">Race</div>
          <div>Horse</div>
          <div>Jockey Name</div>
          <div>Sent Date</div>
          <div>Status / Action</div>
        </div>

        {/* Rows */}
        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 bg-white/5 rounded-lg animate-pulse"
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
              className="grid grid-cols-6 px-6 py-4 items-center border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
            >
              {/* Race */}
              <div className="col-span-2">
                <p className="text-white text-sm font-medium">—</p>
                <p className="text-gray-500 text-xs">Race info TBA</p>
              </div>

              {/* Horse */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs">
                  🐎
                </div>
                <p className="text-gray-300 text-sm">
                  Horse #{inv.horseOwnerId}
                </p>
              </div>

              {/* Jockey Name */}
              <div>
                <p className="text-gray-300 text-sm">Jockey #{inv.jockeyId}</p>
              </div>

              {/* Sent Date */}
              <div>
                <p className="text-gray-400 text-sm">
                  {formatDate(inv.sentAt)}
                </p>
              </div>

              {/* Status + Action */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border ${STATUS_BADGE[inv.status] ?? "bg-gray-500/20 text-gray-400 border-gray-600"}`}
                >
                  {inv.status}
                </span>

                {/* Action buttons */}
                {inv.status === "Accepted" && (
                  <button className="bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-semibold px-3 py-1 rounded-lg transition-colors">
                    Confirm
                  </button>
                )}
                {inv.status === "Pending" && (
                  <button
                    onClick={() => handleDelete(inv.invitationId)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
                {inv.status === "Declined" && (
                  <button
                    onClick={() => handleDelete(inv.invitationId)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
