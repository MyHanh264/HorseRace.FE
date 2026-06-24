import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { getHorseById } from "../../api/horseOwner";

const STATUS_STYLE = {
  Approved: "bg-emerald-500/20 text-emerald-400 border border-emerald-700",
  Pending: "bg-yellow-500/20 text-yellow-400 border border-yellow-700",
  Rejected: "bg-red-500/20 text-red-400 border border-red-700",
  Revoked: "bg-gray-500/20 text-gray-400 border border-gray-600",
};

export default function ViewHorseModal({ horseId, onClose }) {
  const [horse, setHorse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHorseById(horseId)
      .then((data) => setHorse(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [horseId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a2035] rounded-2xl w-full max-w-md mx-4 border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Horse Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="space-y-3">
              <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
              <div className="h-4 bg-white/5 rounded animate-pulse w-1/2" />
              <div className="h-4 bg-white/5 rounded animate-pulse w-1/3" />
            </div>
          ) : !horse ? (
            <p className="text-gray-400 text-center py-8">
              Không tìm thấy thông tin ngựa.
            </p>
          ) : (
            <>
              {/* Ảnh */}
              <div className="h-48 bg-gray-800 rounded-xl overflow-hidden mb-5">
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
              </div>

              {/* Status + Tên */}
              <div className="flex items-center gap-3 mb-4">
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full ${STATUS_STYLE[horse.status]}`}
                >
                  {horse.status}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">
                {horse.name}
              </h3>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Breed</p>
                  <p className="text-sm text-white font-medium">
                    {horse.breed}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Year Born</p>
                  <p className="text-sm text-white font-medium">
                    {horse.birthYear}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Color</p>
                  <p className="text-sm text-white font-medium">
                    {horse.color}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Horse ID</p>
                  <p className="text-sm text-white font-medium">
                    #{horse.horseId}
                  </p>
                </div>
              </div>

              {/* Rejection / revocation reason */}
              {(horse.status === "Rejected" || horse.status === "Revoked") &&
                horse.rejectionReason && (
                  <div className="mt-4 bg-red-900/20 border border-red-700 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400 mb-1">
                      {horse.status === "Revoked" ? "Revocation Reason" : "Rejection Reason"}
                    </p>
                    <p className="text-sm text-red-400">{horse.rejectionReason}</p>
                  </div>
                )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full border border-white/20 hover:bg-white/10 text-sm py-2.5 rounded-lg transition-colors text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
