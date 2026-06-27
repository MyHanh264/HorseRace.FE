import { useState, useEffect } from "react";
import { X, Search, Calendar, Ruler, Users, Lock, Check, XCircle, CheckCheck } from "lucide-react";
import {
  getMyHorses,
  getRaces,
  getJockeys,
  sendInvitation,
} from "../../api/horseOwner";
import { useAuth } from "../../context/AuthContext";

function StepDots({ step }) {
  return (
    <div className="flex gap-1.5 mb-3">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`w-2.5 h-2.5 rounded-full transition-colors ${
            s <= step ? "bg-yellow-400" : "bg-white/20"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Step 1: Select Race ───────────────────────────────────────────────────
function Step1({ races, search, onSearch, selected, onSelect, onClose, onNext, formatDate }) {
  return (
    <div className="p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <StepDots step={1} />
          <h2 className="text-white font-bold text-xl">Step 1: Select Race</h2>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors mt-1">
          <X size={20} />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search races, tournaments, or distances..."
          className="w-full bg-[#1e2a3a] border border-white/10 text-white placeholder-gray-500 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500/50"
        />
      </div>

      {/* Race list */}
      <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
        {races.length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-sm">No races available.</p>
        ) : (
          races.map((race) => {
            const isSelected = selected?.raceId === race.raceId;
            return (
              <button
                key={race.raceId}
                onClick={() => onSelect(race)}
                className={`w-full text-left rounded-xl border p-4 transition-all ${
                  isSelected
                    ? "border-yellow-400 bg-yellow-400/5"
                    : "border-white/10 bg-[#1e2a3a] hover:border-white/20"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">{race.name ?? `Race #${race.raceId}`}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{race.tournamentName ?? "—"}</p>
                    <div className="flex items-center gap-3 mt-2 text-gray-500 text-xs flex-wrap">
                      {race.scheduledStartTime && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {formatDate(race.scheduledStartTime)}
                        </span>
                      )}
                      {race.distance && (
                        <span className="flex items-center gap-1">
                          <Ruler size={11} />
                          {race.distance}
                        </span>
                      )}
                      {race.numberOfLegs && (
                        <span className="flex items-center gap-1">
                          🏁 {race.numberOfLegs} Legs
                        </span>
                      )}
                      {race.maxHorses && (
                        <span className="flex items-center gap-1">
                          <Users size={11} />
                          {race.currentEntries ?? "?"}/{race.maxHorses} horses
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-colors ${
                    isSelected ? "border-yellow-400 bg-yellow-400" : "border-gray-600"
                  }`}>
                    {isSelected && <Check size={13} className="text-black" strokeWidth={3} />}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end pt-1">
        <button
          onClick={onNext}
          disabled={!selected}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          NEXT &rarr;
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Select Horse ──────────────────────────────────────────────────
function Step2({ horses, selected, onSelect, onClose, onBack, onNext, selectedRace, registeredHorseIds = new Set() }) {
  const canSelect = (horse) =>
    horse.status === "Approved" && !registeredHorseIds.has(horse.horseId);

  return (
    <div className="flex flex-col" style={{ maxHeight: "88vh" }}>
      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-6 pb-4 flex-shrink-0">
        <div>
          <h2 className="text-white font-bold text-xl">Đăng Ký Ngựa</h2>
          {selectedRace && (
            <p className="text-emerald-400 text-sm mt-0.5">{selectedRace.name}</p>
          )}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors mt-0.5">
          <X size={18} />
        </button>
      </div>

      {/* Race context banner */}
      {selectedRace && (
        <div className="mx-6 p-3.5 rounded-xl bg-[#0c1810] border-l-4 border-emerald-500 flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center flex-shrink-0 text-lg">
            🏁
          </div>
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">Chi tiết cuộc đua</p>
            <p className="text-white text-sm font-medium mt-0.5">
              {selectedRace.numberOfLegs} Legs
              {selectedRace.roundType ? ` • ${selectedRace.roundType}` : ""}
              {selectedRace.maxHorses ? ` • ${selectedRace.maxHorses} chỗ` : ""}
            </p>
          </div>
        </div>
      )}

      {/* Horse list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5">
        <p className="text-[11px] text-gray-500 uppercase tracking-widest font-semibold mb-1">
          Chọn Chiến Mã Của Bạn
        </p>

        {/* Warning */}
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-yellow-500/[0.08] border border-yellow-500/20">
          <span className="text-yellow-400 flex-shrink-0 leading-none mt-0.5">ⓘ</span>
          <p className="text-yellow-200/80 text-xs leading-relaxed">
            Chỉ những ngựa đã được phê duyệt và không ở trạng thái treo mới có thể tham gia đăng ký giải đấu này.
          </p>
        </div>

        {/* Horses */}
        {horses.length === 0 ? (
          <p className="text-center text-gray-600 text-sm py-8">Chưa có ngựa nào.</p>
        ) : (
          horses.map((horse) => {
            const isRegistered = registeredHorseIds.has(horse.horseId);
            const selectable = canSelect(horse);
            const isSelected = selected?.horseId === horse.horseId;

            // Per-state appearance
            let subText = "";
            let avatarContent;
            let avatarCls = "";

            if (isRegistered) {
              subText = "Đã có lịch thi đấu trong thời gian này";
              avatarCls = "bg-white/5 border-white/10 text-gray-500";
              avatarContent = <CheckCheck size={15} />;
            } else if (horse.status === "Pending") {
              subText = "Đang trong quá trình xét duyệt hồ sơ";
              avatarCls = "bg-white/5 border-white/10 text-gray-500";
              avatarContent = <Lock size={15} />;
            } else if (horse.status === "Rejected") {
              subText = horse.rejectionReason ?? "Chưa đạt yêu cầu về thể lực tối thiểu";
              avatarCls = "bg-red-500/10 border-red-500/20 text-red-400";
              avatarContent = <XCircle size={15} />;
            } else {
              // Approved + selectable
              avatarCls = isSelected
                ? "bg-yellow-400/20 border-yellow-400/40 text-yellow-400"
                : "bg-yellow-400/12 border-yellow-400/25 text-yellow-400";
              avatarContent = horse.name?.[0]?.toUpperCase() ?? "H";
            }

            const badgeCls = isRegistered
              ? "text-gray-400 bg-gray-500/10 border-gray-500/20"
              : horse.status === "Approved"
              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
              : horse.status === "Rejected"
              ? "text-red-400 bg-red-500/10 border-red-500/20"
              : "text-gray-400 bg-gray-500/10 border-gray-500/20";
            const badgeLabel = isRegistered ? "Đã đăng ký" : horse.status?.toUpperCase();

            return (
              <button
                key={horse.horseId}
                onClick={() => selectable && onSelect(horse)}
                disabled={!selectable}
                className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-4
                  ${isSelected
                    ? "bg-white/[0.06] border-yellow-400/40"
                    : selectable
                    ? "bg-white/[0.025] border-white/8 hover:border-white/[0.18] hover:bg-white/[0.04]"
                    : "bg-white/[0.015] border-white/5 opacity-60 cursor-not-allowed"
                  }`}
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0 text-sm font-bold ${avatarCls}`}>
                  {avatarContent}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${selectable ? "text-white" : "text-gray-400"}`}>
                      {horse.name ?? `Ngựa #${horse.horseId}`}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${badgeCls}`}>
                      {badgeLabel}
                    </span>
                  </div>
                  {subText && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{subText}</p>
                  )}
                </div>

                {/* Radio / Lock */}
                {selectable ? (
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                    ${isSelected ? "border-yellow-400 bg-yellow-400" : "border-gray-600"}`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-black" />}
                  </div>
                ) : (
                  <Lock size={13} className="text-gray-600 flex-shrink-0" />
                )}
              </button>
            );
          })
        )}

        {/* Footer note */}
        <p className="text-[11px] text-gray-600 pt-2 leading-relaxed">
          <span className="text-yellow-500/70 font-semibold">Lưu ý:</span> Admin sẽ xem xét đăng ký của bạn dựa trên các tiêu chí kỹ thuật và lịch sử thi đấu của ngựa. Kết quả sẽ được thông báo trong vòng 24 giờ.
        </p>
      </div>

      {/* Footer buttons */}
      <div className="flex gap-3 px-6 pb-6 pt-2 flex-shrink-0 border-t border-white/5">
        <button
          onClick={onBack}
          className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-sm font-medium transition-colors"
        >
          Hủy
        </button>
        <button
          onClick={onNext}
          disabled={!selected}
          className="flex-1 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm transition-colors"
        >
          Gửi Đăng Ký
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Find a Jockey ─────────────────────────────────────────────────
function Step3({ jockeys, search, onSearch, onClose, onBack, onInvite, selectedRace, selectedHorse }) {
  const [activeFilters, setActiveFilters] = useState([]);
  const [invitedIds, setInvitedIds] = useState(new Set());
  const [sendingId, setSendingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const toggleFilter = (f) =>
    setActiveFilters((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );

  const FILTERS = ["Win Rate 30%+", "Experience", "Available only"];

  // Chỉ hiện jockey có licenseNumber hợp lệ
  const validJockeys = jockeys.filter((j) => j.licenseNumber);

  const filtered = validJockeys.filter((j) => {
    const winRate = j.totalRaces > 0 ? Math.round((j.totalWins / j.totalRaces) * 100) : 0;
    const name = j.fullName ?? `Jockey #${j.userId}`;
    const matchSearch = `${name} ${j.licenseNumber ?? ""}`.toLowerCase().includes(search.toLowerCase());
    const matchWin = !activeFilters.includes("Win Rate 30%+") || winRate >= 30;
    const matchAvail = !activeFilters.includes("Available only") || j.isAvailable !== false;
    return matchSearch && matchWin && matchAvail;
  });

  const handleInviteClick = async (jockey) => {
    setErrorMsg("");
    setSuccessMsg("");
    setSendingId(jockey.userId);
    try {
      await onInvite(jockey);
      setInvitedIds((prev) => new Set([...prev, jockey.userId]));
      const jockeyLabel = jockey.fullName ?? `Jockey #${jockey.userId}`;
      setSuccessMsg(
        `Invitation sent to ${jockeyLabel} for ${selectedHorse?.name ?? "your horse"} in ${selectedRace?.name ?? "the race"}`
      );
    } catch (err) {
      const msg = err.message ?? "";
      if (msg.includes("400")) setErrorMsg("Invalid invitation request. Please check your selection.");
      else if (msg.includes("409")) setErrorMsg("An invitation to this jockey already exists.");
      else if (msg.includes("403")) setErrorMsg("You are not authorized to send this invitation.");
      else setErrorMsg("Failed to send invitation. Please try again.");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <StepDots step={3} />
          <h2 className="text-white font-bold text-xl">Step 3: Find a Jockey</h2>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors mt-1">
          <X size={20} />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by name or license..."
          className="w-full bg-[#1e2a3a] border border-white/10 text-white placeholder-gray-500 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500/50"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => toggleFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              activeFilters.includes(f)
                ? "bg-yellow-400 border-yellow-400 text-black"
                : "border-white/20 text-gray-300 hover:border-white/40"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Jockey list */}
      <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-sm">No eligible jockeys found.</p>
        ) : (
          filtered.map((jockey) => {
            const available = jockey.isAvailable !== false;
            const invited = invitedIds.has(jockey.userId);
            const sending = sendingId === jockey.userId;
            const displayName = jockey.fullName ?? `Jockey #${jockey.userId}`;
            const winRate = jockey.totalRaces > 0
              ? Math.round((jockey.totalWins / jockey.totalRaces) * 100)
              : 0;
            const initials = displayName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <div
                key={jockey.userId}
                className={`flex items-center gap-3 border rounded-xl px-4 py-3 transition-colors ${
                  invited
                    ? "bg-[#1e2a3a]/60 border-white/5"
                    : "bg-[#1e2a3a] border-white/10"
                }`}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 overflow-hidden">
                  {jockey.avatarUrl ? (
                    <img src={jockey.avatarUrl} alt={jockey.fullName} className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm">{displayName}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    License #{jockey.licenseNumber}
                    {jockey.weight ? ` • ${jockey.weight}kg` : ""}
                  </p>
                  {jockey.totalRaces > 0 && (
                    <p className="text-gray-500 text-xs mt-0.5">
                      {jockey.totalRaces} Races Completed
                      {" • "}
                      <span className="text-yellow-400 font-semibold">{winRate}% Win Rate</span>
                    </p>
                  )}
                </div>

                {/* Action button */}
                {invited ? (
                  <span className="flex-shrink-0 px-4 py-1.5 rounded-lg text-xs font-semibold bg-gray-700 text-gray-400">
                    Invited
                  </span>
                ) : (
                  <button
                    onClick={() => handleInviteClick(jockey)}
                    disabled={!available || sending}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      available && !sending
                        ? "bg-yellow-400 hover:bg-yellow-300 text-black"
                        : "bg-gray-700 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {sending ? "..." : available ? "Invite" : "Unavailable"}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3 text-emerald-400 text-sm">
          <Check size={16} className="flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error banner */}
      {errorMsg && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1 border border-white/10 text-gray-400 hover:text-white px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onClose}
          className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────
export default function SendInvitationModal({ onClose, onSuccess, initialRace = null, existingEntries = [] }) {
  const { user } = useAuth();
  const [step, setStep] = useState(initialRace ? 2 : 1);
  const [races, setRaces] = useState([]);
  const [horses, setHorses] = useState([]);
  const [jockeys, setJockeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selectedRace, setSelectedRace] = useState(initialRace);
  const [selectedHorse, setSelectedHorse] = useState(null);

  // Horse IDs already registered for the currently-selected race
  const registeredHorseIds = new Set(
    existingEntries
      .filter((e) => selectedRace && e.raceId === selectedRace.raceId)
      .map((e) => e.horseId)
  );
  const [raceSearch, setRaceSearch] = useState("");
  const [jockeySearch, setJockeySearch] = useState("");

  useEffect(() => {
    Promise.all([getRaces(), getMyHorses(), getJockeys()])
      .then(([r, h, j]) => {
        setRaces(Array.isArray(r) ? r : (r?.data ?? []));
        setHorses(Array.isArray(h) ? h : (h?.data ?? []));
        setJockeys(Array.isArray(j) ? j : (j?.data ?? []));
      })
      .catch(() => setLoadError("Không thể tải dữ liệu, vui lòng thử lại."))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const filteredRaces = races.filter((r) =>
    `${r.name ?? ""} ${r.tournamentName ?? ""}`.toLowerCase().includes(raceSearch.toLowerCase())
  );

  // onInvite chỉ gọi API và throw lỗi — Step3 tự quản lý UI state
  const handleInvite = async (jockey) => {
    await sendInvitation({
      horseOwnerId: user.userId,
      jockeyId: jockey.userId,
      horseId: selectedHorse.horseId,
      raceId: selectedRace.raceId,
      message: null,
    });
    onSuccess(); // báo parent refresh list, nhưng KHÔNG đóng modal
  };

  // onSuccess từ parent chỉ refresh list, không đóng modal
  // Done button trong Step3 gọi onClose trực tiếp

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Loading...</div>
        ) : loadError ? (
          <div className="p-10 text-center text-red-400 text-sm">{loadError}</div>
        ) : (
          <>
            {step === 1 && (
              <Step1
                races={filteredRaces}
                search={raceSearch}
                onSearch={setRaceSearch}
                selected={selectedRace}
                onSelect={setSelectedRace}
                onClose={onClose}
                onNext={() => setStep(2)}
                formatDate={formatDate}
              />
            )}
            {step === 2 && (
              <Step2
                horses={horses}
                selected={selectedHorse}
                onSelect={setSelectedHorse}
                onClose={onClose}
                onBack={initialRace ? onClose : () => setStep(1)}
                onNext={() => setStep(3)}
                selectedRace={selectedRace}
                registeredHorseIds={registeredHorseIds}
              />
            )}
            {step === 3 && (
              <Step3
                jockeys={jockeys}
                search={jockeySearch}
                onSearch={setJockeySearch}
                onClose={onClose}
                onBack={() => setStep(2)}
                onInvite={handleInvite}
                selectedRace={selectedRace}
                selectedHorse={selectedHorse}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
