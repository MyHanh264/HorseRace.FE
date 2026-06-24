import { useState, useEffect } from "react";
import { Plus, RefreshCw, AlertCircle, Eye, Edit } from "lucide-react";
import { getMyHorses } from "../../api/horseOwner";
import RegisterHorseModal from "./RegisterHorseModal";
import EditHorseModal from "./EditHorseModal";
import ViewHorseModal from "./ViewHorseModal";
import { useNavigate } from "react-router-dom";

const TABS = ["All", "Approved", "Pending", "Rejected"];

const STATUS_BADGE = {
  Approved: "bg-emerald-500/20 text-emerald-400 border border-emerald-700",
  Pending: "bg-yellow-500/20 text-yellow-400 border border-yellow-700",
  Rejected: "bg-red-500/20 text-red-400 border border-red-700",
};

const STATUS_LABEL = {
  Approved: "Đã duyệt",
  Pending: "Chờ duyệt",
  Rejected: "Từ chối",
};

export default function MyHorsesPage() {
  const [horses, setHorses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editHorseId, setEditHorseId] = useState(null);
  const [viewHorseId, setViewHorseId] = useState(null);
  const navigate = useNavigate();

  const fetchHorses = () => {
    setLoading(true);
    setError("");
    getMyHorses()
      .then((data) => {
        // axios wraps response in res.data, data might be array or { data: [...] }
        const list = Array.isArray(data)
          ? data
          : (data?.data ?? data?.horses ?? data?.items ?? []);
        setHorses(list);
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.error
          || err?.response?.data?.message
          || err instanceof Error
          ? err.message
          : "Không tải được danh sách ngựa.";
        setError(msg);
        setHorses([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHorses();
  }, []);

  const filtered =
    activeTab === "All" ? horses : horses.filter((h) => h.status === activeTab);

  const totalApproved = horses.filter((h) => h.status === "Approved").length;
  const totalPending = horses.filter((h) => h.status === "Pending").length;
  const totalRejected = horses.filter((h) => h.status === "Rejected").length;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Horses</h1>
          <p className="text-sm text-gray-400 mt-1">
            {horses.length > 0
              ? `${horses.length} ngựa · ${totalPending} chờ duyệt · ${totalApproved} đã duyệt`
              : "Quản lý danh sách ngựa của bạn"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchHorses}
            className="flex items-center gap-2 border border-white/20 hover:bg-white/10 text-sm py-2 px-3 rounded-lg transition-colors text-gray-300"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-4 py-2 rounded-lg text-sm"
          >
            <Plus size={16} />
            Register New Horse
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-4 flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-300">{error}</p>
          </div>
          <button
            onClick={() => setError("")}
            className="text-xs text-red-400 hover:text-red-300 underline shrink-0"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map((tab) => {
          const count =
            tab === "All"
              ? horses.length
              : tab === "Approved"
              ? totalApproved
              : tab === "Pending"
              ? totalPending
              : totalRejected;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2
                ${
                  activeTab === tab
                    ? "bg-yellow-500 text-black"
                    : "bg-white/10 text-gray-400 hover:bg-white/20"
                }`}
            >
              {tab}
              {count > 0 && (
                <span
                  className={`text-[11px] font-mono rounded-full px-1.5 py-0.5 ${
                    activeTab === tab ? "bg-black/20 text-black" : "bg-white/10"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 text-4xl">
            🐴
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            {error ? "Đã xảy ra lỗi" : horses.length === 0 ? "Chưa có ngựa nào" : "Không có ngựa"}
          </h3>
          <p className="text-gray-400 text-sm mb-6 text-center max-w-sm">
            {error
              ? "Không thể tải danh sách ngựa. Hãy thử lại."
              : horses.length === 0
              ? "Bạn chưa đăng ký ngựa nào. Nhấn \"Register New Horse\" để bắt đầu."
              : `Không có ngựa nào ở trạng thái "${activeTab}".`}
          </p>
          {!error && horses.length === 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-5 py-2.5 rounded-lg text-sm"
            >
              <Plus size={16} />
              Register Your First Horse
            </button>
          )}
          {error && (
            <button
              onClick={fetchHorses}
              className="flex items-center gap-2 border border-white/20 hover:bg-white/10 text-sm py-2 px-4 rounded-lg transition-colors text-gray-300"
            >
              <RefreshCw className="w-4 h-4" />
              Thử lại
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((horse) => (
            <div
              key={horse.horseId}
              className="bg-[#1a2035] rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-colors"
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
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-4xl">
                    🐴
                  </div>
                )}
                <span
                  className={`absolute top-2 left-2 text-xs px-2.5 py-0.5 rounded-full border ${
                    STATUS_BADGE[horse.status] || STATUS_BADGE.Pending
                  }`}
                >
                  {STATUS_LABEL[horse.status] || horse.status}
                </span>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="font-bold text-lg text-white truncate">{horse.name}</div>
                <div className="text-sm text-gray-400">{horse.breed || "—"}</div>

                {horse.status === "Rejected" && horse.rejectionReason && (
                  <p className="text-red-400 text-xs mt-2 bg-red-900/20 px-2 py-1 rounded">
                    Lý do: {horse.rejectionReason}
                  </p>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setEditHorseId(horse.horseId)}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-white/20 hover:bg-white/10 text-sm py-1.5 rounded-lg transition-colors text-gray-300"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Sửa
                  </button>
                  <button
                    onClick={() =>
                      navigate(`/horse-owner/horses/${horse.horseId}`)
                    }
                    className="flex-1 flex items-center justify-center gap-1.5 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/10 text-sm py-1.5 rounded-lg transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Xem
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
