import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { getMyHorses } from "../../api/horseOwner";
import RegisterHorseModal from "./RegisterHorseModal";
import EditHorseModal from "./EditHorseModal";
import ViewHorseModal from "./ViewHorseModal";
import { useNavigate } from "react-router-dom";

const TABS = ["All", "Approved", "Pending", "Rejected", "Revoked"];

const STATUS_BADGE = {
  Approved: "bg-emerald-500/20 text-emerald-400 border border-emerald-700",
  Pending: "bg-yellow-500/20 text-yellow-400 border border-yellow-700",
  Rejected: "bg-red-500/20 text-red-400 border border-red-700",
  Revoked: "bg-gray-500/20 text-gray-400 border border-gray-600",
};

const EDITABLE_STATUSES = ["Pending", "Rejected"];

export default function MyHorsesPage() {
  const [horses, setHorses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editHorseId, setEditHorseId] = useState(null);
  const [viewHorseId, setViewHorseId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  const fetchHorses = () => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    getMyHorses()
      .then((data) => {
        const list = Array.isArray(data)
          ? data
          : (data?.data ?? data?.horses ?? data?.items ?? []);
        setHorses(list);
        setLoading(false);
      })
      .catch((err) => {
        console.error("getMyHorses failed:", err);
        setHorses([]);
        setLoading(false);
      });
  }, [refreshKey]);

  const filtered =
    activeTab === "All" ? horses : horses.filter((h) => h.status === activeTab);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Horses</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-4 py-2 rounded-lg text-sm"
        >
          <Plus size={16} />
          Register New Horse
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
              ${
                activeTab === tab
                  ? "bg-white text-black"
                  : "bg-white/10 text-gray-400 hover:bg-white/20"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-center mt-20">No horses found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((horse) => (
            <div
              key={horse.horseId}
              className="bg-[#1a2035] rounded-xl overflow-hidden border border-white/10"
            >
              {/* Image */}
              <div className="relative h-44 bg-gray-800">
                {horse.imageUrl ? (
                  <img
                    src={horse.imageUrl}
                    alt={horse.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
                    No Image
                  </div>
                )}
                <span
                  className={`absolute top-2 left-2 text-xs px-2.5 py-0.5 rounded-full ${STATUS_BADGE[horse.status]}`}
                >
                  {horse.status}
                </span>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="font-bold text-lg truncate">{horse.name}</div>
                <div className="text-sm text-gray-400">{horse.breed}</div>

                {horse.status === "Rejected" && horse.rejectionReason && (
                  <p className="text-red-400 text-xs mt-2 bg-red-900/20 px-2 py-1 rounded">
                    Reason: {horse.rejectionReason}
                  </p>
                )}

                <div className="flex gap-2 mt-4">
                  {EDITABLE_STATUSES.includes(horse.status) && (
                    <button
                      onClick={() => setEditHorseId(horse.horseId)}
                      className="flex-1 border border-white/20 hover:bg-white/10 text-sm py-1.5 rounded-lg transition-colors text-white"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() =>
                      navigate(`/horse-owner/horses/${horse.horseId}`)
                    }
                    className="flex-1 border border-emerald-500 text-emerald-400 hover:bg-emerald-600/20 text-sm py-1.5 rounded-lg transition-colors"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <RegisterHorseModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchHorses();
          }}
        />
      )}

      {editHorseId && (
        <EditHorseModal
          horseId={editHorseId}
          onClose={() => setEditHorseId(null)}
          onSuccess={() => {
            setEditHorseId(null);
            fetchHorses();
          }}
        />
      )}

      {viewHorseId && (
        <ViewHorseModal
          horseId={viewHorseId}
          onClose={() => setViewHorseId(null)}
        />
      )}
    </div>
  );
}
