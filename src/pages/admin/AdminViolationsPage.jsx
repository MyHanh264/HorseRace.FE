import { useCallback, useEffect, useState } from "react";
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
} from "../../api/admin";

// ─── Domain-aligned enums (Flow 6 — Violation Handling) ──────────────────────
// Source of truth: Domain/Aggregates/Entities/Violation.cs + GetAdminViolations handler.
//   Violation.Penalty  → "Warning" | "Demote" | "DQ"
//   Violation.Status   → "Pending" | "Approved" | "Rejected"
// Admin UI maps Status via GetAdminViolations handler:
//   Pending   → "Pending"  (chưa xử lý)
//   Approved  → "Resolved" (đã duyệt, đã áp penalty)
//   Rejected  → "Dismissed" (đã từ chối)

const PENALTY_CONFIG = {
  None: {
    color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    label: "Không phạt",
    icon: ShieldAlert,
    description: "Đơn bị từ chối — không áp dụng hình phạt nào.",
  },
  Warning: {
    color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    label: "Cảnh cáo",
    icon: AlertTriangle,
    description: "Chỉ ghi nhận, không thay đổi thứ hạng.",
  },
  Demote: {
    color: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    label: "Tụt hạng",
    icon: Minus,
    description: "Tụt 1 hạng ở chặng vi phạm, recompute Leg Points.",
  },
  DQ: {
    color: "bg-red-500/10 text-red-400 border-red-500/20",
    label: "Hủy kết quả (Race DQ)",
    icon: XCircle,
    description: "0 điểm toàn bộ chặng, xếp cuối race, 0 Prize khi Publish.",
  },
};

const VIOLATION_TYPES = {
  KhoiDongSom:        "Khởi động sớm",
  CuoiNguaNguyHiem:   "Cưỡi ngựa nguy hiểm",
  ViPhamRoi:          "Vi phạm roi",
  CanDuongDoiThu:     "Cản đường đối thủ",
  ViPhamDoping:       "Vi phạm doping",
  ViPhamTrangBi:      "Vi phạm trang bị",
  ViPhamDiemCan:      "Vi phạm điểm cân",
  Khac:               "Khác",
};

// Tabs trên UI khớp 1-1 với Status mà GetAdminViolations trả về cho FE.
const TABS = [
  { key: "All",       label: "Tất cả" },
  { key: "Pending",   label: "Chờ xử lý" },
  { key: "Resolved",  label: "Đã duyệt" },
  { key: "Dismissed", label: "Đã từ chối" },
];

const PAGE_SIZE = 15;

function formatDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function ViolationDetailModal({ item, onClose }) {
  if (!item) return null;
  const penalty = PENALTY_CONFIG[item.penalty] || null;

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
              <h2 className="font-serif font-bold text-on-surface">Chi tiết vi phạm</h2>
              <p className="text-xs text-on-surface-variant">ID: #{item.violationId}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all" aria-label="Đóng">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {penalty && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${penalty.color}`}>
                <penalty.icon className="w-3 h-3 inline mr-1" />
                Hình phạt: {penalty.label}
              </span>
            )}
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${item.status === "Resolved"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : item.status === "Dismissed"
                ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"}`}>
              {item.status === "Resolved" ? "Đã duyệt" : item.status === "Dismissed" ? "Đã từ chối" : "Chờ xử lý"}
            </span>
          </div>

          {/* Race */}
          <div className="bg-surface-container-lowest rounded-xl p-4 border border-white/5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Cuộc đua</p>
            <p className="text-sm font-semibold text-on-surface">{item.raceName || "—"}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">{formatDate(item.raceDate)}</p>
          </div>

          {/* Violator */}
          <div className="bg-surface-container-lowest rounded-xl p-4 border border-white/5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-2">Người vi phạm</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-container-highest border border-outline-variant/50 flex items-center justify-center text-sm font-bold text-on-surface-variant">
                {(item.violatorName || "U").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-on-surface">{item.violatorName || "—"}</p>
                <p className="text-xs text-on-surface-variant">{item.violatorRole || ""}</p>
              </div>
            </div>
          </div>

          {/* Type + Description */}
          <div className="bg-surface-container-lowest rounded-xl p-4 border border-white/5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-2">Loại vi phạm</p>
            <p className="text-sm font-semibold text-on-surface mb-3">
              {VIOLATION_TYPES[item.violationType] || item.violationType || "—"}
            </p>
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-2">Mô tả</p>
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
                {item.status === "Resolved" ? "Kết quả xử lý" : "Lý do từ chối"}
              </p>
              {penalty && penalty.label !== "Không phạt" && (
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
                {item.resolvedByAdminName ? `Xử lý bởi ${item.resolvedByAdminName}` : ""} · {formatDate(item.resolvedAt)}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/10 shrink-0">
          <button onClick={onClose} className="gs-btn gs-btn-ghost gs-btn-sm">Đóng</button>
        </div>
      </div>
    </div>
  );
}

function getPageNumbers(current, total) {
  const pages = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= 2) pages.push(i);
    else if (pages[pages.length - 1] !== "gap") pages.push("gap");
  }
  return pages;
}

// ─── Approve Modal: chọn Penalty (BẮT BUỘC) + AdminNote (optional) ───────────

function ApproveViolationModal({ item, onClose, onApproved }) {
  const [penalty,  setPenalty]  = useState("");
  const [adminNote,setAdminNote]= useState("");
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState("");
  const [confirmDQ,setConfirmDQ]= useState(false);

  const canSubmit = Boolean(penalty);

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setErr("");
    try {
      await approveViolation(item.violationId, { penalty, adminNote: adminNote.trim() || null });
      onApproved();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Duyệt vi phạm thất bại.");
    } finally {
      setSaving(false);
      setConfirmDQ(false);
    }
  };

  const handleSubmitClick = () => {
    if (!canSubmit) return;
    // Confirm trước khi áp dụng penalty nặng (DQ).
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
              <h2 className="font-serif font-bold text-on-surface">Duyệt biên bản vi phạm</h2>
              <p className="text-xs text-on-surface-variant">#{item.violationId} · {item.violatorName || "—"}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all" aria-label="Đóng">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          <p className="text-xs text-on-surface-variant uppercase tracking-wider">Chọn hình phạt <span className="text-red-400">*</span></p>
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
              Ghi chú của Admin (tuỳ chọn)
            </label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              placeholder="Ví dụ: Áp dụng theo quy chế mục 4.2..."
              className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-emerald-400/60 resize-none transition-all"
            />
          </div>

          {confirmDQ && (
            <div className="rounded-xl p-4 border border-red-500/30 bg-red-500/10 flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-300">Xác nhận Race DQ?</p>
                <p className="text-xs text-red-400/80 mt-1 leading-relaxed">
                  Hành động này sẽ đặt điểm toàn bộ các chặng của entry về <strong>0</strong>, xếp cuối race và không nhận Prize khi Publish. Bấm "Xác nhận DQ" để tiếp tục.
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
          <button onClick={onClose} disabled={saving} className="gs-btn gs-btn-ghost gs-btn-sm">Huỷ</button>
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
              ? "Đang xử lý..."
              : confirmDQ
                ? "Xác nhận DQ"
                : penalty === "DQ"
                  ? "Áp dụng DQ"
                  : "Duyệt vi phạm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reject Modal: nhập Reason (BẮT BUỘC) ────────────────────────────────────

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
      setErr(e?.response?.data?.message || e?.message || "Từ chối thất bại.");
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
              <h2 className="font-serif font-bold text-on-surface">Từ chối biên bản vi phạm</h2>
              <p className="text-xs text-on-surface-variant">#{item.violationId} · {item.violatorName || "—"}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all" aria-label="Đóng">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          <p className="text-sm text-on-surface leading-relaxed">
            Bạn sắp từ chối biên bản này. Vui lòng nhập lý do để lưu vào lịch sử xử lý.
          </p>
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest block mb-1.5">
              Lý do từ chối <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              autoFocus
              placeholder="Ví dụ: Bằng chứng video không đủ kết luận hành vi phạm..."
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
          <button onClick={onClose} disabled={saving} className="gs-btn gs-btn-ghost gs-btn-sm">Huỷ</button>
          <button
            onClick={submit}
            disabled={!canSubmit || saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-zinc-700 text-white hover:bg-zinc-600 disabled:opacity-50 transition-all"
          >
            <XCircle className="w-4 h-4" />
            {saving ? "Đang xử lý..." : "Xác nhận từ chối"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Modal: chỉnh sửa biên bản đã xử lý ─────────────────────────────────
// PATCH /api/violations/{id}: cho phép admin chỉnh penalty / adminNote / status
// sau khi xử lý. Vẫn giữ constraint: violation đang Pending không vào modal này
// (Flow 6 yêu cầu dùng Approve/Reject để chuyển trạng thái, không nhảy thẳng).
function EditViolationModal({ item, onClose, onSaved }) {
  const [penalty,   setPenalty]   = useState(item.penalty || "None");
  const [adminNote, setAdminNote] = useState(item.adminNote || "");
  const [status,    setStatus]    = useState(item.status || "Pending");
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState("");

  // Penalty hợp lệ phụ thuộc status.
  //   Pending   → "None" (không penalty khi chưa duyệt)
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
      // AdminNote là lý do reject khi Dismissed, hoặc ghi chú khi Resolved.
      await updateViolation(item.violationId, {
        // Gửi PascalCase đúng record BE (UpdateViolationCommand).
        ViolationId:         item.violationId,
        RaceId:              item.raceId,
        LegNumber:           item.legNumber || 1,
        EntryId:             item.entryId || 0,
        ReportedByRefereeId: item.reportedByRefereeId || 0,
        ViolationType:       item.violationType,
        Description:         item.description || null,
        Penalty:             penalty,
        Status:              status,
        ReviewedByAdminId:   item.reviewedByAdminId || null,
        AdminNote:           adminNote.trim() || null,
      });
      onSaved();
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.response?.data?.title;
      const firstError = e?.response?.data?.errors
        ? Object.values(e.response.data.errors).flat()[0]
        : null;
      setErr(detail || firstError || e?.message || "Cập nhật thất bại.");
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
              <h2 className="font-serif font-bold text-on-surface">Chỉnh sửa vi phạm</h2>
              <p className="text-xs text-on-surface-variant">#{item.violationId} · {item.violatorName || "—"}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all" aria-label="Đóng">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          {/* Status */}
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest block mb-1.5">
              Trạng thái
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { v: "Pending",   label: "Chờ xử lý", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40" },
                { v: "Resolved",  label: "Đã duyệt",  cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" },
                { v: "Dismissed", label: "Đã từ chối", cls: "bg-zinc-500/15 text-zinc-300 border-zinc-500/40" },
              ].map(opt => (
                <button
                  type="button"
                  key={opt.v}
                  onClick={() => {
                    setStatus(opt.v);
                    // Khi chuyển status, đảm bảo penalty hợp lệ.
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
              Hình phạt <span className="text-red-400">*</span>
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
              {status === "Dismissed" ? "Lý do từ chối" : status === "Resolved" ? "Ghi chú của Admin" : "Mô tả"}
            </label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              autoFocus
              placeholder={status === "Dismissed"
                ? "Nhập lý do từ chối biên bản..."
                : "Ghi chú xử lý (tuỳ chọn)..."}
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
          <button onClick={onClose} disabled={saving} className="gs-btn gs-btn-ghost gs-btn-sm">Huỷ</button>
          <button
            onClick={submit}
            disabled={!canSubmit || saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-blue-500 text-white hover:bg-blue-400 disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" />
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminViolationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [dismissedCount, setDismissedCount] = useState(0);

  // Action targets (single-item modal at a time).
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget,  setRejectTarget]  = useState(null);
  const [editTarget,    setEditTarget]    = useState(null);
  const [successMsg,    setSuccessMsg]    = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Dùng helper trong api/admin.js (không fetch trực tiếp theo FE rule).
      const data = await getAllViolations({
        page,
        pageSize: PAGE_SIZE,
        // BE nhận status: "Pending" | "Resolved" | "Dismissed" (xem GetAdminViolations).
        status: activeTab === "All" ? "" : activeTab,
      });
      setItems(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
      setTotal(data?.total || 0);
      setPendingCount(data?.pendingCount || 0);
      setResolvedCount(data?.resolvedCount || 0);
      // BE chỉ trả pendingCount/resolvedCount → dismissedCount lấy theo total - 2 kia.
      const dismissed = Math.max(0, (data?.total || 0) - (data?.pendingCount || 0) - (data?.resolvedCount || 0));
      setDismissedCount(dismissed);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Không tải được danh sách vi phạm.");
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

  const handleActionDone = (msg) => {
    setApproveTarget(null);
    setRejectTarget(null);
    setEditTarget(null);
    setSuccessMsg(msg);
    fetchData();
    // Auto-clear toast sau 3.5s.
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const handleExport = () => {
    const headers = ["ID", "Cuộc đua", "Người vi phạm", "Vai trò", "Loại vi phạm", "Hình phạt", "Trạng thái", "Lý do/Ghi chú", "Ngày lập", "Ngày xử lý"];
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
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (v.raceName || "").toLowerCase().includes(q) ||
      (v.violatorName || "").toLowerCase().includes(q) ||
      (VIOLATION_TYPES[v.violationType] || "").toLowerCase().includes(q) ||
      (v.description || "").toLowerCase().includes(q)
    );
  });

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
              <h1 className="font-serif text-2xl font-bold text-on-surface">Vi phạm kỷ luật</h1>
              <p className="text-on-surface-variant text-sm">
                Giám sát và quản lý các vi phạm trong quá trình thi đấu.
              </p>
            </div>
          </div>
          <button onClick={fetchData} className="gs-btn gs-btn-ghost gs-btn-sm flex items-center gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
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
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Chờ xử lý</p>
          </div>
        </div>
        <div className="gs-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-on-surface font-mono">{resolvedCount}</p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Đã duyệt</p>
          </div>
        </div>
        <div className="gs-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-500/10 border border-zinc-500/20 flex items-center justify-center shrink-0">
            <XCircle className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-on-surface font-mono">{dismissedCount}</p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Đã từ chối</p>
          </div>
        </div>
        <div className="gs-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-outline-variant/20 flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-on-surface-variant" />
          </div>
          <div>
            <p className="text-xl font-bold text-on-surface font-mono">{total}</p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Tổng cộng</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="mb-4 auth-alert auth-alert--success flex items-start gap-3">
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg("")} className="ml-3 text-xs underline hover:no-underline">Đóng</button>
          </div>
        </div>
      )}
      {error && (
        <div className="mb-4 auth-alert auth-alert--error flex items-start gap-3">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{error}</span>
            <button onClick={() => setError("")} className="ml-3 text-xs underline hover:no-underline">Đóng</button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
          <input
            type="text"
            placeholder="Tìm theo cuộc đua, người vi phạm, loại vi phạm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant/40 text-sm rounded-xl pl-11 pr-4 py-3 text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
          />
        </div>
        <button onClick={handleExport} disabled={filtered.length === 0} className="gs-btn gs-btn-ghost gs-btn-sm shrink-0 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Xuất CSV
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
            <span className="text-on-surface-variant text-sm">Đang tải...</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="gs-card p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-primary/60" />
          </div>
          <h3 className="font-serif text-xl font-bold text-on-surface mb-2">
            {searchQuery ? "Không tìm thấy kết quả" : "Không có vi phạm nào"}
          </h3>
          <p className="text-on-surface-variant text-sm">
            {searchQuery ? `Không có kết quả cho "${searchQuery}"` : "Chưa có biên bản vi phạm nào."}
          </p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap overflow-x-auto">
            <table className="admin-table table-fixed w-full">
              <colgroup>
                <col className="w-[70px]" />
                <col className="w-[18%]" />
                <col className="w-[20%]" />
                <col className="w-[16%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[20%]" />
              </colgroup>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cuộc đua</th>
                  <th>Người vi phạm</th>
                  <th>Loại vi phạm</th>
                  <th>Hình phạt</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((v) => {
                  const penaltyMeta = PENALTY_CONFIG[v.penalty];
                  const PenaltyIcon = penaltyMeta?.icon || Minus;
                  const isPending   = v.status === "Pending";
                  const isResolved  = v.status === "Resolved";
                  const isDismissed = v.status === "Dismissed";
                  return (
                    <tr key={v.violationId}>
                      <td className="text-on-surface-variant font-mono text-xs whitespace-nowrap">#{v.violationId}</td>
                      <td className="overflow-hidden">
                        <p className="text-sm font-medium text-on-surface truncate" title={v.raceName || ""}>
                          {v.raceName || "—"}
                        </p>
                      </td>
                      <td className="overflow-hidden">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-surface-container-highest border border-outline-variant/50 flex items-center justify-center text-xs font-bold text-on-surface-variant shrink-0">
                            {(v.violatorName || "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-on-surface truncate" title={v.violatorName || ""}>{v.violatorName || "—"}</p>
                            <p className="text-xs text-on-surface-variant truncate">{v.violatorRole || ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="overflow-hidden">
                        <span className="text-sm text-on-surface truncate block" title={VIOLATION_TYPES[v.violationType] || v.violationType || ""}>
                          {VIOLATION_TYPES[v.violationType] || v.violationType || "—"}
                        </span>
                      </td>
                      <td className="overflow-hidden">
                        {penaltyMeta && v.penalty !== "None" ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${penaltyMeta.color}`}>
                            <PenaltyIcon className="w-3 h-3 shrink-0" />
                            <span className="truncate">{penaltyMeta.label}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-on-surface-variant">—</span>
                        )}
                      </td>
                      <td className="overflow-hidden">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${
                          isResolved
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : isDismissed
                            ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                            : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                        }`}>
                          {isResolved ? "Đã duyệt" : isDismissed ? "Đã từ chối" : "Chờ xử lý"}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelected(v)}
                            className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all shrink-0"
                            title="Xem chi tiết"
                            aria-label="Xem chi tiết vi phạm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {isPending ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setApproveTarget(v)}
                                disabled={approveTarget !== null || rejectTarget !== null || editTarget !== null}
                                className="h-7 px-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 flex items-center gap-1 text-xs font-semibold text-emerald-400 disabled:opacity-40 transition-all"
                                title="Duyệt vi phạm"
                                aria-label="Duyệt vi phạm"
                              >
                                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                                Duyệt
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectTarget(v)}
                                disabled={approveTarget !== null || rejectTarget !== null || editTarget !== null}
                                className="h-7 px-2 rounded-lg bg-zinc-500/10 border border-zinc-500/30 hover:bg-zinc-500/20 flex items-center gap-1 text-xs font-semibold text-zinc-300 disabled:opacity-40 transition-all"
                                title="Từ chối vi phạm"
                                aria-label="Từ chối vi phạm"
                              >
                                <XCircle className="w-3.5 h-3.5 shrink-0" />
                                Từ chối
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditTarget(v)}
                              disabled={approveTarget !== null || rejectTarget !== null || editTarget !== null}
                              className="h-7 px-2 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 flex items-center gap-1 text-xs font-semibold text-blue-300 disabled:opacity-40 transition-all"
                              title="Chỉnh sửa biên bản"
                              aria-label="Chỉnh sửa biên bản"
                            >
                              <Edit3 className="w-3.5 h-3.5 shrink-0" />
                              Sửa
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
                Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} trong {filtered.length} mục
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

      {selected && <ViolationDetailModal item={selected} onClose={() => setSelected(null)} />}
      {approveTarget && (
        <ApproveViolationModal
          item={approveTarget}
          onClose={() => setApproveTarget(null)}
          onApproved={() => handleActionDone("Đã duyệt biên bản và áp dụng hình phạt.")}
        />
      )}
      {rejectTarget && (
        <RejectViolationModal
          item={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onRejected={() => handleActionDone("Đã từ chối biên bản vi phạm.")}
        />
      )}
      {editTarget && (
        <EditViolationModal
          item={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => handleActionDone("Đã cập nhật biên bản vi phạm.")}
        />
      )}
    </div>
  );
}
