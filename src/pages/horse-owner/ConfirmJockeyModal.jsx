import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, CheckCircle2, AlertTriangle } from "lucide-react";
import { getHorseById, submitEntry } from "../../api/horseOwner";
import { getJockeyProfile } from "../../api/jockey";

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, emoji, name, sub, nameColor }) {
  return (
    <div className="flex items-center gap-3 bg-[#1e2a3a] border border-white/10 rounded-xl p-4">
      <div className="w-12 h-12 rounded-lg bg-[#2a3550] flex items-center justify-center flex-shrink-0 text-2xl">
        {emoji}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-0.5">
          {label}
        </p>
        <p
          className={`font-bold text-sm leading-tight ${nameColor ?? "text-white"}`}
        >
          {name ?? "—"}
        </p>
        {sub && <p className="text-gray-400 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen({ horseName, jockeyName, raceName, onClose }) {
  const navigate = useNavigate();
  return (
    <div className="p-8 flex flex-col items-center text-center gap-5">
      <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center">
        <CheckCircle2 size={40} className="text-emerald-400" />
      </div>
      <div>
        <h2 className="text-white font-bold text-2xl mb-2">Entry Submitted!</h2>
        <p className="text-gray-400 text-sm leading-relaxed max-w-[280px]">
          <span className="text-white font-semibold">
            {horseName ?? "Your horse"}
          </span>
          {" + "}
          <span className="text-white font-semibold">
            {jockeyName ?? "your jockey"}
          </span>
          {" have been submitted as an entry for "}
          <span className="text-white font-semibold">
            {raceName ?? "the race"}
          </span>
          {". Awaiting Admin approval."}
        </p>
      </div>

      {/* Note */}
      <div className="flex items-start gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left w-full">
        <AlertTriangle size={13} className="text-gray-500 shrink-0 mt-0.5" />
        <p className="text-gray-400 text-xs leading-relaxed">
          Other pending invitations for this horse in this race have been
          cancelled.
        </p>
      </div>

      <div className="flex flex-col gap-2 w-full">
        <button
          onClick={() => {
            onClose();
            navigate("/horse-owner/entries");
          }}
          className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm transition-colors"
        >
          View My Entries
        </button>
        <button
          onClick={onClose}
          className="w-full py-2.5 text-gray-400 hover:text-white text-sm transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function ConfirmJockeyModal({
  invitation: inv,
  onClose,
  onConfirmed,
}) {
  const [horse, setHorse] = useState(null);
  const [jockey, setJockey] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [h, j] = await Promise.allSettled([
          inv.horseId ? getHorseById(inv.horseId) : Promise.resolve(null),
          inv.jockeyId ? getJockeyProfile(inv.jockeyId) : Promise.resolve(null),
        ]);
        if (h.status === "fulfilled") setHorse(h.value);
        if (j.status === "fulfilled") setJockey(j.value);
      } catch (err) {
        setLoadError("Không tải được thông tin chi tiết.");
        console.error("ConfirmJockeyModal load failed:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [inv.horseId, inv.jockeyId]);

  const horseName = horse?.name ?? inv.horseName ?? `Horse #${inv.horseId}`;
  const horseBreed = horse?.breed ?? horse?.type ?? null;
  const jockeyName =
    jockey?.fullName ?? inv.jockeyName ?? `Jockey #${inv.jockeyId}`;
  const jockeyLicense = jockey?.licenseNumber
    ? `License #${jockey.licenseNumber}`
    : null;
  const jockeyWeight = jockey?.weight ? `${jockey.weight}kg` : null;
  const jockeySub =
    [jockeyLicense, jockeyWeight].filter(Boolean).join(" • ") || null;
  const raceName = inv.raceName ?? `Race #${inv.raceId}`;
  const raceSub = inv.tournamentName ?? null;

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      // TODO: when BE adds confirm-invitation endpoint, call it here first:
      // await confirmInvitation(inv.invitationId)
      // Then submitEntry automatically, or let BE handle entry creation on confirm.

      await submitEntry({
        horseId: inv.horseId,
        jockeyId: inv.jockeyId,
        raceId: inv.raceId,
      });

      setSubmitted(true);
      onConfirmed?.();
    } catch (err) {
      setSubmitError(
        err?.message || "Submit entry thất bại. Vui lòng thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──
  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
          <SuccessScreen
            horseName={horseName}
            jockeyName={jockeyName}
            raceName={raceName}
            onClose={onClose}
          />
        </div>
      </div>
    );
  }

  // ── Confirmation modal ──
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-[520px] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/8">
          <h2 className="text-white font-bold text-lg">
            Confirm Jockey Selection
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 bg-white/5 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : (
            <>
              {loadError && (
                <p className="text-yellow-400 text-xs bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-2">
                  {loadError} — Hiển thị thông tin cơ bản.
                </p>
              )}

              {/* Horse */}
              <InfoRow
                label="Horse"
                emoji="🐎"
                name={horseName}
                sub={horseBreed}
              />

              {/* Jockey */}
              <InfoRow
                label="Jockey"
                emoji="🏇"
                name={jockeyName}
                nameColor="text-yellow-400"
                sub={jockeySub}
              />

              {/* Race */}
              <InfoRow
                label="Race Details"
                emoji="🏆"
                name={raceName}
                sub={raceSub}
              />

              {/* Warning */}
              <div className="flex items-start gap-2.5 bg-yellow-400/8 border border-yellow-400/25 rounded-xl px-4 py-3">
                <AlertTriangle
                  size={15}
                  className="text-yellow-400 shrink-0 mt-0.5"
                />
                <p className="text-yellow-200/80 text-xs leading-relaxed">
                  Confirming this jockey will automatically cancel your other
                  pending invitations for this horse in this race.
                </p>
              </div>

              {submitError && (
                <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                  {submitError}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl border border-white/15 text-gray-300 hover:bg-white/5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              loading ||
              submitting ||
              !inv.horseId ||
              !inv.jockeyId ||
              !inv.raceId
            }
            className="flex-1 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-sm transition-colors"
          >
            {submitting ? "Submitting…" : "Confirm & Submit Entry"}
          </button>
        </div>
      </div>
    </div>
  );
}
