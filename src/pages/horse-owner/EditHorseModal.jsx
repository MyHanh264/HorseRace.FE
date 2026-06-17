import { useState, useEffect } from "react";
import { X, CloudUpload } from "lucide-react";
import { getHorseById, updateHorse } from "../../api/horseOwner";

const BREEDS = [
  "Thoroughbred",
  "Arabian",
  "Quarter Horse",
  "Mongolian",
  "Andalusian",
  "Morgan",
  "Appaloosa",
  "Warmblood",
];

const COLORS = [
  "Bay",
  "Black",
  "Chestnut",
  "Grey",
  "White",
  "Palomino",
  "Roan",
  "Dun",
];

export default function EditHorseModal({ horseId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({
    name: "",
    breed: "Thoroughbred",
    birthYear: "",
    color: "Bay",
    imageUrl: "",
  });

  // Load thông tin ngựa hiện tại
  useEffect(() => {
    getHorseById(horseId)
      .then((data) => {
        setForm({
          name: data.name || "",
          breed: data.breed || "Thoroughbred",
          birthYear: data.birthYear || "",
          color: data.color || "Bay",
          imageUrl: data.imageUrl || "",
        });
        if (data.imageUrl) setPreview(data.imageUrl);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [horseId]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    // TODO: upload ảnh lên server lấy URL, tạm thời dùng preview
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name) {
      setError("Horse Name is required.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name,
        breed: form.breed,
        birthYear: parseInt(form.birthYear),
        color: form.color,
        imageUrl: form.imageUrl,
      };
      await updateHorse(horseId, payload);
      onSuccess();
    } catch {
      setError("Cập nhật thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a2035] rounded-2xl w-full max-w-lg mx-4 border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-[#1a2035] z-10">
          <h2 className="text-lg font-bold text-white">Edit Horse</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-10 bg-white/5 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Horse Name */}
            <div>
              <label className="text-sm text-gray-300 mb-1 block">
                Horse Name <span className="text-red-400">*</span>
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Thunder Runner"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Breed */}
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Breed</label>
              <select
                name="breed"
                value={form.breed}
                onChange={handleChange}
                className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {BREEDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Born + Color */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">
                  Year Born
                </label>
                <input
                  name="birthYear"
                  value={form.birthYear}
                  onChange={handleChange}
                  type="number"
                  placeholder="2021"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">
                  Color
                </label>
                <select
                  name="color"
                  value={form.color}
                  onChange={handleChange}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {COLORS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Upload ảnh */}
            <div>
              <label className="text-sm text-gray-300 mb-1 block">
                Horse Photo
              </label>
              <label
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors overflow-hidden"
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <CloudUpload size={28} />
                    <span className="text-xs">
                      Drag image here or click to browse
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImage}
                  className="hidden"
                />
              </label>
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-400 text-sm bg-red-900/20 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2 pb-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-white/20 hover:bg-white/10 text-sm py-2.5 rounded-lg transition-colors text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
