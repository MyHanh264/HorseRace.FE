import { useCallback, useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  ShieldAlert,
  Minus,
  SlidersHorizontal,
  AlertOctagon,
  Edit3,
  Save,
} from "lucide-react";
import {
  getAllViolations,
  approveViolation,
  rejectViolation,
  updateViolation,
  getRaces,
  getAllUser,
} from "../../api/admin";

// ─── Domain-aligned enums (Flow 6 — Violation Handling) ──────────────────────
// Source of truth: Domain/Aggregates/Entities/Violation.cs + GetAdminViolations handler.
//   Violation.Penalty  → "Warning" | "Demote" | "DQ"
//   Violation.Status   → "Pending" | "Approved" | "Rejected"
// Admin UI maps Status via GetAdminViolations handler:
//   Pending   → "Pending"  (not yet processed)
//   Approved  → "Resolved" (approved, penalty applied)
//   Rejected  → "Dismissed" (rejected)

// UI label → domain value (BE's UpdateViolationCommandHandler only accepts the domain strings).
const STATUS_UI_TO_DOMAIN = {
  Pending: "Pending",
  Resolved: "Approved",
  Dismissed: "Rejected",
};

const PENALTY_CONFIG = {
  None: {
    color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    label: "No Penalty",
    icon: ShieldAlert,
    description: "Report was rejected — no penalty applied.",
  },
  Warning: {
    color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    label: "Warning",
    icon: AlertTriangle,
    description: "Recorded only, no change to ranking.",
  },
  Demote: {
    color: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    label: "Demote",
    icon: Minus,
    description: "Drops 1 position in the violated leg, recomputes Leg Points.",
  },
  DQ: {
    color: "bg-red-500/10 text-red-400 border-red-500/20",
    label: "Disqualify (Race DQ)",
    icon: XCircle,
    description: "0 points for all legs, last place in race, 0 Prize when published.",
  },
};

const VIOLATION_TYPES = {
  KhoiDongSom:        "Early Start",
  CuoiNguaNguyHiem:   "Dangerous Riding",
  ViPhamRoi:          "Whip Violation",
  CanDuongDoiThu:     "Obstruction",
  ViPhamDoping:       "Doping Violation",
  ViPhamTrangBi:      "Equipment Violation",
  ViPhamDiemCan:      "Weight Violation",
  Khac:               "Other",
};

// UI tabs map 1-1 to the Status that GetAdminViolations returns to the FE.
const TABS = [
  { key: "All",       label: "All" },
  { key: "Pending",   label: "Pending" },
  { key: "Resolved",  label: "Resolved" },
  { key: "Dismissed", label: "Dismissed" },
];

const PAGE_SIZE = 15;

function formatDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleString("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function ViolationDetailModal({ item, refereeNames, raceTournamentMap, onClose }) {
  if (!item) return null;
  const penalty = PENALTY_CONFIG[item.penalty] || null;
  const { jockeyName, horseName } = parseViolator(item.violatorName);
  const tournamentName = raceTournamentMap?.[item.raceId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#1a2035] rounded-2xl w-full max-w-2xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-on-surface">Violation Details</h2>
              <p className="text-xs text-on-surface-variant">ID: #{item.violationId}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {penalty && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${penalty.color}`}>
                <penalty.icon className="w-3 h-3 inline mr-1" />
                Penalty: {penalty.label}
              </span>
            )}
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${item.status === "Resolved"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : item.status === "Dismissed"
                ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"}`}>
              {item.status === "Resolved" ? "Resolved" : item.status === "Dismissed" ? "Dismissed" : "Pending"}
            </span>
          </div>

          {/* Race */}
          <div className="bg-surface-container-lowest rounded-xl p-4 border border-white/5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Race</p>
            <p className="text-sm font-semibold text-on-surface">{item.raceName || "—"}</p>
            {tournamentName && <p className="text-xs text-on-surface-variant mt-0.5">{tournamentName}</p>}
            <p className="text-xs text-on-surface-variant mt-0.5">
              Leg {item.legNumber} · Reported {formatDate(item.createdAt)}
            </p>
          </div>

          {/* Violator */}
          <div className="bg-surface-container-lowest rounded-xl p-4 border border-white/5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-2">Violator</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-container-highest border border-outline-variant/50 flex items-center justify-center text-sm font-bold text-on-surface-variant">
                {(horseName || "U").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-on-surface">{horseName || "—"}</p>
                <p className="text-xs text-on-surface-variant">{jockeyName}</p>
              </div>
            </div>
          </div>

          {/* Reported By */}
          <div className="bg-surface-container-lowest rounded-xl p-4 border border-white/5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Reported By</p>
            <p className="text-sm font-semibold text-on-surface">
              {refereeNames?.[item.reportedByRefereeId] || `Referee #${item.reportedByRefereeId}`}
            </p>
          </div>

          {/* Type + Description */}
          <div className="bg-surface-container-lowest rounded-xl p-4 border border-white/5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-2">Violation Type</p>
            <p className="text-sm font-semibold text-on-surface mb-3">
              {VIOLATION_TYPES[item.violationType] || item.violationType || "—"}
            </p>
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-2">Description</p>
            <p className="text-sm text-on-surface leading-relaxed">{item.description || "—"}</p>
          </div>

          {/* Resolution / Rejection note */}
          {item.status !== "Pending" && (
            <div className={`rounded-xl p-4 border ${
              item.status === "Resolved"
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-zinc-500/10 border-zinc-500/20"
            }`}>
              <p className={`text-xs uppercase tracking-wider mb-2 ${
                item.status === "Resolved" ? "text-emerald-400" : "text-zinc-400"
              }`}>
                {item.status === "Resolved" ? "Resolution" : "Rejection Reason"}
              </p>
              {penalty && penalty.label !== "No Penalty" && (
                <p className={`text-sm mb-1 ${item.status === "Resolved" ? "text-emerald-300" : "text-zinc-300"}`}>
                  Penalty: <span className="font-semibold">{penalty.label}</span>
                </p>
              )}
              {item.adminNote && (
                <p className={`text-sm leading-relaxed ${item.status === "Resolved" ? "text-emerald-300" : "text-zinc-300"}`}>
                  {item.adminNote}
                </p>
              )}
              <p className={`text-xs mt-1 ${item.status === "Resolved" ? "text-emerald-500/60" : "text-zinc-500/60"}`}>
                {item.resolvedByAdminName ? `Processed by ${item.resolvedByAdminName}` : ""} · {formatDate(item.resolvedAt)}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/10 shrink-0">
          <button onClick={onClose} className="gs-btn gs-btn-ghost gs-btn-sm">Close</button>
        </div>
      </div>
    </div>
  );
}

// BE sends ViolatorName pre-formatted as "Jockey (Horse)" (GetAdminViolations.cs:142) —
// split it back apart so the table/modal can label each clearly instead of one run-on
// string that just gets truncated illegibly in a narrow column.
function parseViolator(violatorName) {
  const match = /^(.*?)\s*\((.+)\)\s*$/.exec(violatorName || "");
  if (!match) return { jockeyName: violatorName || "—", horseName: "" };
  return { jockeyName: match[1] || "—", horseName: match[2] || "" };
}

function getPageNumbers(current, total) {
  const pages = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= 2) pages.push(i);
    else if (pages[pages.length - 1] !== "gap") pages.push("gap");
  }
  return pages;
}

// ─── Approve Modal: select Penalty (REQUIRED) + AdminNote (optional) ─────────

function ApproveViolationModal({ item, siblings = [], onClose, onApproved }) {
  const [penalty,  setPenalty]  = useState("");
  const [adminNote,setAdminNote]= useState("");
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState("");
  const [confirmDQ,setConfirmDQ]= useState(false);

  // Other reports targeting the SAME entry in the SAME leg — could be the same real-world
  // incident described twice, or 2 genuinely separate violations. The system can't tell which,
  // so it never auto-merges or blocks — it just makes sure Admin sees this before stacking a
  // second penalty on top of one that already moved this entry's ranking.
  const alreadyPenalized = siblings.filter(s => s.status === "Resolved" && s.penalty !== "Warning" && s.penalty !== "None");
  const otherPending = siblings.filter(s => s.status === "Pending");

  const canSubmit = Boolean(penalty);

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setErr("");
    try {
      await approveViolation(item.violationId, { penalty, adminNote: adminNote.trim() || null });
      onApproved();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Failed to approve violation.");
    } finally {
      setSaving(false);
      setConfirmDQ(false);
    }
  };

  const handleSubmitClick = () => {
    if (!canSubmit) return;
    // Confirm before applying a severe penalty (DQ).
    if (penalty === "DQ" && !confirmDQ) {
      setConfirmDQ(true);
      return;
    }
    submit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#1a2035] rounded-2xl w-full max-w-lg border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-on-surface">Approve Violation Report</h2>
              <p className="text-xs text-on-surface-variant">#{item.violationId} · {item.violatorName || "—"}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          {alreadyPenalized.length > 0 && (
            <div className="rounded-xl p-4 border border-red-500/30 bg-red-500/10 flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-300">This entry was already penalized in this leg</p>
                <p className="text-xs text-red-200/80 mt-1">
                  {alreadyPenalized.map(s => `#${s.violationId} (${VIOLATION_TYPES[s.violationType] || s.violationType}) — ${s.penalty} applied`).join("; ")}.
                  Approving this report will stack an <strong>additional</strong> penalty on top — only continue if this is genuinely a separate incident, not the same one reported twice.
                </p>
              </div>
            </div>
          )}
          {otherPending.length > 0 && (
            <div className="rounded-xl p-3 border border-amber-500/25 bg-amber-500/5 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/80">
                {otherPending.length} other report{otherPending.length > 1 ? "s" : ""} still pending for this same entry/leg
                ({otherPending.map(s => `#${s.violationId}`).join(", ")}) — worth reviewing together before deciding.
              </p>
            </div>
          )}

          <p className="text-xs text-on-surface-variant uppercase tracking-wider">Select Penalty <span className="text-red-400">*</span></p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {Object.entries(PENALTY_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const active = penalty === key;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setPenalty(key)}
                  className={`text-left rounded-xl p-3 border transition-all ${
                    active
                      ? `${cfg.color} ring-1 ring-offset-0 ring-current`
                      : "bg-surface-container-lowest border-outline-variant/40 hover:border-outline-variant"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4" />
                    <p className="font-semibold text-sm">{cfg.label}</p>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-snug">{cfg.description}</p>
                </button>
              );
            })}
          </div>

          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest block mb-1.5">
              Admin Note (optional)
            </label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              placeholder="e.g. Applied per regulation section 4.2..."
              className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-emerald-400/60 resize-none transition-all"
            />
          </div>

          {confirmDQ && (
            <div className="rounded-xl p-4 border border-red-500/30 bg-red-500/10 flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-300">Confirm Race DQ?</p>
                <p className="text-xs text-red-400/80 mt-1 leading-relaxed">
                  This action will set all leg points for the entry to <strong>0</strong>, place it last in the race, and it will receive no Prize when published. Click "Confirm DQ" to continue.
                </p>
              </div>
            </div>
          )}

          {err && (
            <div className="auth-alert auth-alert--error flex items-start gap-2 text-sm">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{err}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/10 shrink-0">
          <button onClick={onClose} disabled={saving} className="gs-btn gs-btn-ghost gs-btn-sm">Cancel</button>
          <button
            onClick={handleSubmitClick}
            disabled={!canSubmit || saving}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              penalty === "DQ"
                ? "bg-red-500 text-white hover:bg-red-400 disabled:opacity-50"
                : "bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-50"
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            {saving
              ? "Processing..."
              : confirmDQ
                ? "Confirm DQ"
                : penalty === "DQ"
                  ? "Apply DQ"
                  : "Approve Violation"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reject Modal: enter Reason (REQUIRED) ───────────────────────────────────

function RejectViolationModal({ item, onClose, onRejected }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  const canSubmit = reason.trim().length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setErr("");
    try {
      await rejectViolation(item.violationId, reason.trim());
      onRejected();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Failed to reject.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#1a2035] rounded-2xl w-full max-w-lg border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-500/10 border border-zinc-500/20 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-on-surface">Reject Violation Report</h2>
              <p className="text-xs text-on-surface-variant">#{item.violationId} · {item.violatorName || "—"}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          <p className="text-sm text-on-surface leading-relaxed">
            You are about to reject this report. Please enter a reason to save in the processing history.
          </p>
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest block mb-1.5">
              Rejection Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              autoFocus
              placeholder="e.g. Video evidence is inconclusive regarding the violation..."
              className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-zinc-400/60 resize-none transition-all"
            />
          </div>

          {err && (
            <div className="auth-alert auth-alert--error flex items-start gap-2 text-sm">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{err}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/10 shrink-0">
          <button onClick={onClose} disabled={saving} className="gs-btn gs-btn-ghost gs-btn-sm">Cancel</button>
          <button
            onClick={submit}
            disabled={!canSubmit || saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-zinc-700 text-white hover:bg-zinc-600 disabled:opacity-50 transition-all"
          >
            <XCircle className="w-4 h-4" />
            {saving ? "Processing..." : "Confirm Rejection"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Modal: edit an already-processed report ─────────────────────────────
// PATCH /api/violations/{id}: allows admin to adjust penalty / adminNote / status
// after processing. Still keeps the constraint: a Pending violation does not
// use this modal (Flow 6 requires Approve/Reject to change status, no direct jump).
function EditViolationModal({ item, onClose, onSaved }) {
  const [penalty,   setPenalty]   = useState(item.penalty || "None");
  const [adminNote, setAdminNote] = useState(item.adminNote || "");
  const [status,    setStatus]    = useState(item.status || "Pending");
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState("");

  // Valid penalty depends on status.
  //   Pending   → "None" (no penalty while not yet resolved)
  //   Resolved  → Warning | Demote | DQ
  //   Dismissed → None
  const penaltyOptions = status === "Dismissed"
    ? ["None"]
    : status === "Pending"
      ? ["None"]
      : ["Warning", "Demote", "DQ"];

  const canSubmit = status && (
    status === "Pending" || status === "Dismissed" || ["Warning", "Demote", "DQ"].includes(penalty)
  ) && penalty;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setErr("");
    try {
      // AdminNote is the rejection reason when Dismissed, or a note when Resolved.
      await updateViolation(item.violationId, {
        // Send PascalCase matching the BE record (UpdateViolationCommand).
        ViolationId:         item.violationId,
        RaceId:              item.raceId,
        LegNumber:           item.legNumber || 1,
        EntryId:             item.entryId || 0,
        ReportedByRefereeId: item.reportedByRefereeId || 0,
        ViolationType:       item.violationType,
        Description:         item.description || null,
        Penalty:             penalty,
        Status:              STATUS_UI_TO_DOMAIN[status] ?? status,
        ReviewedByAdminId:   item.reviewedByAdminId || null,
        AdminNote:           adminNote.trim() || null,
      });
      onSaved();
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.response?.data?.title;
      const firstError = e?.response?.data?.errors
        ? Object.values(e.response.data.errors).flat()[0]
        : null;
      setErr(detail || firstError || e?.message || "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#1a2035] rounded-2xl w-full max-w-lg border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Edit3 className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-on-surface">Edit Violation</h2>
              <p className="text-xs text-on-surface-variant">#{item.violationId} · {item.violatorName || "—"}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          {/* Status */}
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest block mb-1.5">
              Status
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { v: "Pending",   label: "Pending", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40" },
                { v: "Resolved",  label: "Resolved",  cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" },
                { v: "Dismissed", label: "Dismissed", cls: "bg-zinc-500/15 text-zinc-300 border-zinc-500/40" },
              ].map(opt => (
                <button
                  type="button"
                  key={opt.v}
                  onClick={() => {
                    setStatus(opt.v);
                    // When status changes, ensure penalty stays valid.
                    if (opt.v === "Pending" || opt.v === "Dismissed") setPenalty("None");
                    else if (penalty === "None") setPenalty("Warning");
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    status === opt.v ? opt.cls : "bg-surface-container-lowest border-outline-variant/40 text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Penalty */}
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest block mb-1.5">
              Penalty <span className="text-red-400">*</span>
            </label>
            <div className={`grid grid-cols-2 gap-2 ${penaltyOptions.length === 1 ? "" : "sm:grid-cols-4"}`}>
              {penaltyOptions.map(key => {
                const cfg = PENALTY_CONFIG[key];
                const Icon = cfg.icon;
                const active = penalty === key;
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setPenalty(key)}
                    className={`text-left rounded-xl p-3 border transition-all ${
                      active
                        ? `${cfg.color} ring-1 ring-offset-0 ring-current`
                        : "bg-surface-container-lowest border-outline-variant/40 hover:border-outline-variant"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 shrink-0" />
                      <p className="font-semibold text-sm truncate">{cfg.label}</p>
                    </div>
                    <p className="text-[11px] text-on-surface-variant leading-snug line-clamp-2">{cfg.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AdminNote */}
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest block mb-1.5">
              {status === "Dismissed" ? "Rejection Reason" : status === "Resolved" ? "Admin Note" : "Description"}
            </label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              autoFocus
              placeholder={status === "Dismissed"
                ? "Enter the reason for rejecting the report..."
                : "Processing note (optional)..."}
              className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-blue-400/60 resize-none transition-all"
            />
          </div>

          {err && (
            <div className="auth-alert auth-alert--error flex items-start gap-2 text-sm">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{err}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/10 shrink-0">
          <button onClick={onClose} disabled={saving} className="gs-btn gs-btn-ghost gs-btn-sm">Cancel</button>
          <button
            onClick={submit}
            disabled={!canSubmit || saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-blue-500 text-white hover:bg-blue-400 disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminViolationsPage() {
  // Deep link from Race Execution's "N pending violations" badge — jumps straight to
  // that race's reports instead of the full list.
  const [searchParams, setSearchParams] = useSearchParams();
  const raceIdFilter = searchParams.get("raceId");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Deep-linked with a raceId → jump straight to Pending, since that's the actionable tab.
  const [activeTab, setActiveTab] = useState(() => (raceIdFilter ? "Pending" : "All"));
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [dismissedCount, setDismissedCount] = useState(0);
  // raceId → status — once a race is Finished (published), its RaceResult is already
  // frozen; approving/rejecting/editing a violation after that would silently diverge
  // from what's shown to other roles, so those actions are disabled for those rows.
  const [raceStatusMap, setRaceStatusMap] = useState({});
  const [raceTournamentMap, setRaceTournamentMap] = useState({});
  // refereeUserId → full name — BE only returns ReportedByRefereeId (a bare int) on
  // AdminViolationItem, no joined name, so resolve it client-side the same way other
  // Admin pages already do for id→name lookups.
  const [refereeNames, setRefereeNames] = useState({});
  // Full unfiltered/unpaginated violation list, used only to detect "another report already
  // targets this same (race, leg, entry)" when Approving — `items` above is paginated/filtered
  // by the active tab, so it can't reliably answer that on its own.
  const [allViolationsFlat, setAllViolationsFlat] = useState([]);

  // Action targets (single-item modal at a time).
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget,  setRejectTarget]  = useState(null);
  const [editTarget,    setEditTarget]    = useState(null);
  const [successMsg,    setSuccessMsg]    = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Use the helper in api/admin.js (no direct fetch per FE rule).
      const data = await getAllViolations({
        page,
        pageSize: PAGE_SIZE,
        // BE accepts status: "Pending" | "Resolved" | "Dismissed" (see GetAdminViolations).
        status: activeTab === "All" ? "" : activeTab,
      });
      setItems(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
      setTotal(data?.total || 0);
      setPendingCount(data?.pendingCount || 0);
      setResolvedCount(data?.resolvedCount || 0);
      // BE only returns pendingCount/resolvedCount → dismissedCount is derived as total minus those two.
      const dismissed = Math.max(0, (data?.total || 0) - (data?.pendingCount || 0) - (data?.resolvedCount || 0));
      setDismissedCount(dismissed);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load violation list.");
    } finally {
      setLoading(false);
    }
  }, [page, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery]);

  useEffect(() => {
    getRaces()
      .then(races => {
        const map = {};
        const tMap = {};
        (Array.isArray(races) ? races : []).forEach(r => {
          map[r.raceId] = r.status;
          tMap[r.raceId] = r.tournamentName;
        });
        setRaceStatusMap(map);
        setRaceTournamentMap(tMap);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    getAllUser({ page: 1, pageSize: 1000 })
      .then(data => {
        const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        const map = {};
        list.forEach(u => { map[u.userId] = u.fullName; });
        setRefereeNames(map);
      })
      .catch(() => {});
  }, []);

  const fetchAllViolationsFlat = useCallback(() => {
    getAllViolations({ page: 1, pageSize: 500 })
      .then(data => {
        const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setAllViolationsFlat(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchAllViolationsFlat();
  }, [fetchAllViolationsFlat]);

  const handleActionDone = (msg) => {
    setApproveTarget(null);
    setRejectTarget(null);
    setEditTarget(null);
    setSuccessMsg(msg);
    fetchData();
    fetchAllViolationsFlat();
    // Auto-clear toast after 3.5s.
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const handleExport = () => {
    const headers = ["ID", "Race", "Violator", "Role", "Violation Type", "Penalty", "Status", "Reason/Note", "Created Date", "Resolved Date"];
    const rows = filtered.map((v) => [
      v.violationId,
      v.raceName || "",
      v.violatorName || "",
      v.violatorRole || "",
      VIOLATION_TYPES[v.violationType] || v.violationType || "",
      PENALTY_CONFIG[v.penalty]?.label || v.penalty || "",
      v.status || "",
      v.adminNote || "",
      formatDate(v.createdAt),
      formatDate(v.resolvedAt),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `violations_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = items.filter((v) => {
    if (raceIdFilter && String(v.raceId) !== String(raceIdFilter)) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (v.raceName || "").toLowerCase().includes(q) ||
      (v.violatorName || "").toLowerCase().includes(q) ||
      (VIOLATION_TYPES[v.violationType] || "").toLowerCase().includes(q) ||
      (v.description || "").toLowerCase().includes(q)
    );
  });

  const raceFilterName = raceIdFilter
    ? items.find((v) => String(v.raceId) === String(raceIdFilter))?.raceName
    : null;

  const clearRaceFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("raceId");
    setSearchParams(next);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in-up" style={{ opacity: 0, animationFillMode: "forwards" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-on-surface">Disciplinary Violations</h1>
              <p className="text-on-surface-variant text-sm">
                Monitor and manage violations during competition.
              </p>
            </div>
          </div>
          <button onClick={fetchData} className="gs-btn gs-btn-ghost gs-btn-sm flex items-center gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-red-500 to-orange-500 mt-4" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="gs-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-on-surface font-mono">{pendingCount}</p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Pending</p>
          </div>
        </div>
        <div className="gs-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-on-surface font-mono">{resolvedCount}</p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Resolved</p>
          </div>
        </div>
        <div className="gs-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-500/10 border border-zinc-500/20 flex items-center justify-center shrink-0">
            <XCircle className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-on-surface font-mono">{dismissedCount}</p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Dismissed</p>
          </div>
        </div>
        <div className="gs-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-outline-variant/20 flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-on-surface-variant" />
          </div>
          <div>
            <p className="text-xl font-bold text-on-surface font-mono">{total}</p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Total</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="mb-4 auth-alert auth-alert--success flex items-start gap-3">
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg("")} className="ml-3 text-xs underline hover:no-underline">Close</button>
          </div>
        </div>
      )}
      {error && (
        <div className="mb-4 auth-alert auth-alert--error flex items-start gap-3">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{error}</span>
            <button onClick={() => setError("")} className="ml-3 text-xs underline hover:no-underline">Close</button>
          </div>
        </div>
      )}

      {/* Deep-link filter chip */}
      {raceIdFilter && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/10 border border-secondary/25 text-sm text-on-surface">
          <ShieldAlert className="w-4 h-4 text-secondary shrink-0" />
          <span>
            Showing reports for race <strong>{raceFilterName || `#${raceIdFilter}`}</strong> only.
          </span>
          <button onClick={clearRaceFilter} className="ml-auto text-xs underline hover:no-underline text-secondary">
            Clear filter
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
          <input
            type="text"
            placeholder="Search by race, violator, violation type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant/40 text-sm rounded-xl pl-11 pr-4 py-3 text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
          />
        </div>
        <button onClick={handleExport} disabled={filtered.length === 0} className="gs-btn gs-btn-ghost gs-btn-sm shrink-0 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {TABS.map(({ key, label }) => {
          const cnt = key === "All" ? total : key === "Pending" ? pendingCount : key === "Resolved" ? resolvedCount : dismissedCount;
          return (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setPage(1); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all shrink-0 flex items-center gap-1.5
                ${activeTab === key ? "bg-secondary text-black" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}
            >
              {label}
              <span className={`text-[11px] font-mono rounded-full px-1.5 py-0.5 ${activeTab === key ? "bg-black/20 text-black" : "bg-surface-container-lowest text-on-surface-variant"}`}>
                {cnt}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-on-surface-variant text-sm">Loading...</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="gs-card p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-primary/60" />
          </div>
          <h3 className="font-serif text-xl font-bold text-on-surface mb-2">
            {searchQuery ? "No results found" : "No violations found"}
          </h3>
          <p className="text-on-surface-variant text-sm">
            {searchQuery ? `No results for "${searchQuery}"` : "No violation reports yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap overflow-x-auto">
            {/* Auto layout (no table-fixed/colgroup) + whitespace-nowrap on every text cell —
                columns size to their content and text stays on one line instead of wrapping
                into a cramped multi-line mess. min-w gives enough room for that; overflow-x-auto
                above handles horizontal scroll on narrower screens instead of wrapping/clipping. */}
            <table className="admin-table w-full min-w-[1500px]">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Race</th>
                  <th>Violator</th>
                  <th>Reported By</th>
                  <th>Violation Type</th>
                  <th>Penalty</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((v) => {
                  const penaltyMeta = PENALTY_CONFIG[v.penalty];
                  const PenaltyIcon = penaltyMeta?.icon || Minus;
                  const isPending   = v.status === "Pending";
                  const isResolved  = v.status === "Resolved";
                  const isDismissed = v.status === "Dismissed";
                  const isRaceFinished = raceStatusMap[v.raceId] === "Finished";
                  // Other reports for the same entry+leg — surfaced here so Admin notices
                  // before even opening Approve, not just at the point of approving.
                  const siblingCount = allViolationsFlat.filter(o =>
                    o.violationId !== v.violationId &&
                    o.raceId === v.raceId &&
                    o.legNumber === v.legNumber &&
                    o.entryId === v.entryId
                  ).length;
                  const { jockeyName, horseName } = parseViolator(v.violatorName);
                  const tournamentName = raceTournamentMap[v.raceId];
                  return (
                    <tr key={v.violationId}>
                      <td className="text-on-surface-variant font-mono text-xs whitespace-nowrap align-top py-3">#{v.violationId}</td>
                      <td className="align-top py-3 pr-3 whitespace-nowrap">
                        {v.raceName ? (
                          <Link
                            to={`/admin/race-execution?raceId=${v.raceId}`}
                            className="text-sm font-medium text-primary hover:underline block leading-snug"
                            title={`Open ${v.raceName} in Race Monitor`}
                          >
                            {v.raceName}
                          </Link>
                        ) : (
                          <p className="text-sm font-medium text-on-surface">—</p>
                        )}
                        {tournamentName && (
                          <p className="text-xs text-on-surface-variant mt-0.5 leading-snug">{tournamentName}</p>
                        )}
                      </td>
                      <td className="align-top py-3 pr-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-surface-container-highest border border-outline-variant/50 flex items-center justify-center text-xs font-bold text-on-surface-variant shrink-0">
                            {(horseName || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-on-surface leading-snug">{horseName || "—"}</p>
                              {siblingCount > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-semibold border border-amber-500/30 shrink-0"
                                  title={`${siblingCount} other report(s) for this same entry in Leg ${v.legNumber}`}
                                >
                                  <AlertTriangle className="w-2.5 h-2.5" /> {siblingCount}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-on-surface-variant leading-snug">{jockeyName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="align-top py-3 pr-3 whitespace-nowrap">
                        <span className="text-sm text-on-surface leading-snug">
                          {refereeNames[v.reportedByRefereeId] || `Referee #${v.reportedByRefereeId}`}
                        </span>
                      </td>
                      <td className="align-top py-3 pr-3 whitespace-nowrap">
                        <span className="text-sm text-on-surface leading-snug">
                          {VIOLATION_TYPES[v.violationType] || v.violationType || "—"}
                        </span>
                      </td>
                      <td className="align-top py-3 pr-3">
                        {penaltyMeta && v.penalty !== "None" ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${penaltyMeta.color}`}>
                            <PenaltyIcon className="w-3 h-3 shrink-0" />
                            <span className="whitespace-nowrap">{penaltyMeta.label}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-on-surface-variant">—</span>
                        )}
                      </td>
                      <td className="align-top py-3 pr-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${
                          isResolved
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : isDismissed
                            ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                            : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                        }`}>
                          {isResolved ? "Resolved" : isDismissed ? "Dismissed" : "Pending"}
                        </span>
                      </td>
                      <td className="align-top py-3">
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelected(v)}
                            className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all shrink-0"
                            title="View details"
                            aria-label="View violation details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {isPending ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setApproveTarget(v)}
                                disabled={isRaceFinished || approveTarget !== null || rejectTarget !== null || editTarget !== null}
                                className="h-7 px-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 flex items-center gap-1 text-xs font-semibold text-emerald-400 disabled:opacity-40 transition-all"
                                title={isRaceFinished ? "Race already published — unpublish it first to process violations." : "Approve violation"}
                                aria-label="Approve violation"
                              >
                                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectTarget(v)}
                                disabled={isRaceFinished || approveTarget !== null || rejectTarget !== null || editTarget !== null}
                                className="h-7 px-2 rounded-lg bg-zinc-500/10 border border-zinc-500/30 hover:bg-zinc-500/20 flex items-center gap-1 text-xs font-semibold text-zinc-300 disabled:opacity-40 transition-all"
                                title={isRaceFinished ? "Race already published — unpublish it first to process violations." : "Reject violation"}
                                aria-label="Reject violation"
                              >
                                <XCircle className="w-3.5 h-3.5 shrink-0" />
                                Reject
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditTarget(v)}
                              disabled={isRaceFinished || approveTarget !== null || rejectTarget !== null || editTarget !== null}
                              className="h-7 px-2 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 flex items-center gap-1 text-xs font-semibold text-blue-300 disabled:opacity-40 transition-all"
                              title={isRaceFinished ? "Race already published — unpublish it first to edit violations." : "Edit report"}
                              aria-label="Edit report"
                            >
                              <Edit3 className="w-3.5 h-3.5 shrink-0" />
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <p className="text-xs text-on-surface-variant">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} items
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-40 flex items-center justify-center transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-on-surface" />
                </button>
                {getPageNumbers(page, totalPages).map((p, idx) =>
                  p === "gap" ? (
                    <span key={`gap-${idx}`} className="px-1 text-on-surface-variant text-xs">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-medium transition-all flex items-center justify-center ${
                        page === p ? "bg-secondary text-black" : "bg-surface-container-high hover:bg-surface-container-highest text-on-surface"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-40 flex items-center justify-center transition-all"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-on-surface" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {selected && <ViolationDetailModal item={selected} refereeNames={refereeNames} raceTournamentMap={raceTournamentMap} onClose={() => setSelected(null)} />}
      {approveTarget && (
        <ApproveViolationModal
          item={approveTarget}
          siblings={allViolationsFlat.filter(v =>
            v.violationId !== approveTarget.violationId &&
            v.raceId === approveTarget.raceId &&
            v.legNumber === approveTarget.legNumber &&
            v.entryId === approveTarget.entryId
          )}
          onClose={() => setApproveTarget(null)}
          onApproved={() => handleActionDone("Report approved and penalty applied.")}
        />
      )}
      {rejectTarget && (
        <RejectViolationModal
          item={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onRejected={() => handleActionDone("Violation report rejected.")}
        />
      )}
      {editTarget && (
        <EditViolationModal
          item={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => handleActionDone("Violation report updated.")}
        />
      )}
    </div>
  );
}
