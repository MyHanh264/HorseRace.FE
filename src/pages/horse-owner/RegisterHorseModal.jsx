import { useState } from "react";
import { X, CloudUpload, CheckCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { registerHorse } from "../../api/horseOwner";

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

export default function RegisterHorseModal({ onClose, onSuccess }) {
  const { user } = useAuth();
  const [step, setStep] = useState("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [touched, setTouched] = useState({});
  const [form, setForm] = useState({
    ownerId: user?.userId,
    name: "",
    breed: "Thoroughbred",
    yearOfBirth: "",
    color: "Bay",
    description: "",
    image: null,
  });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleBlur = (e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm((prev) => ({ ...prev, image: file }));
    setPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setForm((prev) => ({ ...prev, image: file }));
    setPreview(URL.createObjectURL(file));
  };

  const currentYear = new Date().getFullYear();
  const isNameError = touched.name && !form.name;
  const isYearError =
    touched.yearOfBirth &&
    (!form.yearOfBirth ||
      form.yearOfBirth < 1990 ||
      form.yearOfBirth > currentYear - 2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, yearOfBirth: true });
    setError("");

    if (!form.name || !form.yearOfBirth) return;
    if (form.yearOfBirth < 1990 || form.yearOfBirth > currentYear - 2) return;

    try {
      setLoading(true);
      const payload = {
        ownerId: user?.userId,
        name: form.name,
        breed: form.breed,
        birthYear: parseInt(form.yearOfBirth),
        color: form.color,
        imageUrl: "",
      };
      await registerHorse(payload); // ← chỉ truyền payload
      setStep("success");
    } catch {
      setError("Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // ── SUCCESS SCREEN ──────────────────────────────
  if (step === "success") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="relative bg-[#1a2035] rounded-2xl w-full max-w-md mx-4 border border-white/10 shadow-2xl p-8 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>

          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
              <CheckCircle className="text-emerald-400" size={32} />
            </div>
          </div>

          <h2 className="text-xl font-bold text-white mb-2">
            Horse Registered Successfully!
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            <span className="text-emerald-400 font-semibold">{form.name}</span>{" "}
            has been submitted for Admin review. You'll be notified once it's
            approved.
          </p>

          <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 mb-6 text-left">
            {preview ? (
              <img
                src={preview}
                alt={form.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center text-gray-500 text-xs">
                No img
              </div>
            )}
            <div>
              <p className="text-white font-semibold text-sm">{form.name}</p>
              <p className="text-gray-400 text-xs">
                {form.breed} · {form.yearOfBirth}
              </p>
              <span className="text-yellow-400 text-xs font-semibold">
                ● PENDING REVIEW
              </span>
            </div>
          </div>

          <button
            onClick={onSuccess}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-2.5 rounded-lg transition-colors"
          >
            View My Horses
          </button>
        </div>
      </div>
    );
  }

  // ── FORM SCREEN ─────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a2035] rounded-2xl w-full max-w-lg mx-4 border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-[#1a2035] z-10">
          <h2 className="text-lg font-bold text-white">Register New Horse</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Notice */}
          <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2.5">
            <span className="text-yellow-400 text-xs mt-0.5">ℹ</span>
            <p className="text-yellow-300 text-xs">
              Your horse will be reviewed by an Admin before it can compete.
              This usually takes 1-2 business days.
            </p>
          </div>

          {/* Horse Name */}
          <div>
            <label className="text-sm text-gray-300 mb-1 block">
              Horse Name <span className="text-red-400">*</span>
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. Thunder Runner"
              className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors
                ${isNameError ? "border-red-500" : "border-white/10 focus:border-emerald-500"}`}
            />
            {isNameError && (
              <p className="text-red-400 text-xs mt-1">
                ⚠ Horse Name is required
              </p>
            )}
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
                Year Born <span className="text-red-400">*</span>
              </label>
              <input
                name="yearOfBirth"
                value={form.yearOfBirth}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="2021"
                type="number"
                className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors
                  ${isYearError ? "border-red-500" : "border-white/10 focus:border-emerald-500"}`}
              />
              <p className="text-gray-500 text-xs mt-1">
                Enter the 4-digit birth year{" "}
                <span className="text-yellow-400 font-semibold">
                  MIN 2 YEARS OLD
                </span>
              </p>
              {isYearError && (
                <p className="text-red-400 text-xs mt-1">⚠ Invalid year</p>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-1 block">Color</label>
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

          {/* Description */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm text-gray-300">Description</label>
              <span className="text-xs text-gray-500">
                {form.description.length}/500
              </span>
            </div>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              maxLength={500}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
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
              disabled={loading}
              className="flex-1 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-semibold text-sm py-2.5 rounded-lg transition-colors"
            >
              {loading ? "Submitting..." : "🐴 Submit for Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
