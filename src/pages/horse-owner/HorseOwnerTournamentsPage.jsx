import { useState, useEffect, useMemo } from "react";
import {
  Trophy, Calendar, ChevronLeft, Search, Flag, Users,
} from "lucide-react";
import { getTournaments, getRaces, getMyEntries, getInvitations } from "../../api/horseOwner";
import { useAuth } from "../../context/AuthContext";
import SendInvitationModal from "./SendInvitationModal";
import ConfirmJockeyModal from "./ConfirmJockeyModal";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDateOnly(s) {
  if (!s) return "—";
  const p = String(s).split("T")[0].split("-");
  return p.length < 3 ? s : `${p[2]}/${p[1]}/${p[0]}`;
}

function fmtDate(s) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function fmtTime(s) {
  if (!s) return "";
  return new Date(s).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit",
  });
}

function daysLeft(s) {
  if (!s) return null;
  return Math.ceil((new Date(s) - new Date()) / 864e5);
}

// ─── constants ────────────────────────────────────────────────────────────────

const T_STATUS = {
  Active:    { label: "ĐANG MỞ ĐK",   cls: "text-yellow-400 border-yellow-400/50 bg-yellow-400/10" },
  Upcoming:  { label: "SẮP DIỄN RA",  cls: "text-blue-400   border-blue-400/50   bg-blue-400/10"   },
  Finished:  { label: "ĐÃ KẾT THÚC", cls: "text-gray-400   border-gray-500/50   bg-gray-500/10"   },
  Cancelled: { label: "ĐÃ HỦY",       cls: "text-red-400    border-red-500/50    bg-red-500/10"    },
};

const ENTRY_STATUS = {
  Pending:  { label: "Chờ duyệt",    cls: "text-yellow-400 bg-yellow-500/10 border border-yellow-500/20" },
  Approved: { label: "Đã chấp nhận", cls: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" },
  Rejected: { label: "Đã từ chối",   cls: "text-red-400    bg-red-500/10    border border-red-500/20"    },
};

// Race card image gradients
const RACE_BG = [
  "linear-gradient(145deg,#040e0a 0%,#071a0c 45%,#0d2610 75%,#091408 100%)",
  "linear-gradient(145deg,#060810 0%,#0b1020 45%,#0e1a2e 75%,#070a14 100%)",
  "linear-gradient(145deg,#0d0800 0%,#1e1000 45%,#1a0e00 75%,#0d0800 100%)",
  "linear-gradient(145deg,#0a0010 0%,#160028 45%,#100020 75%,#06000c 100%)",
];

// ─── TournamentListCard ───────────────────────────────────────────────────────

function TournamentListCard({ tournament, racesCount, onSelect }) {
  const meta = T_STATUS[tournament.status] ?? T_STATUS.Upcoming;
  return (
    <button
      onClick={() => onSelect(tournament)}
      className="w-full text-left bg-[#0d1117] border border-white/8 hover:border-white/20 rounded-2xl overflow-hidden transition-all group"
    >
      {/* Mini hero */}
      <div
        className="relative h-28 overflow-hidden"
        style={{
          background:
            "linear-gradient(150deg,#040d10 0%,#071a0c 35%,#0f2a06 65%,#120e00 100%)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 75% 45%,rgba(210,155,20,0.30) 0%,transparent 58%)",
          }}
        />
        <div className="absolute inset-0 flex items-end justify-end pr-6 pb-4 select-none pointer-events-none">
          <span className="text-7xl opacity-10">🏆</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0d1117]" />
      </div>

      <div className="px-5 pb-5 -mt-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-white font-bold text-base leading-snug group-hover:text-yellow-300 transition-colors truncate">
              {tournament.name}
            </p>
            <p className="text-gray-500 text-xs mt-0.5">
              {fmtDateOnly(tournament.startDate)} – {fmtDateOnly(tournament.endDate)}
            </p>
          </div>
          <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold flex-shrink-0 mt-0.5 ${meta.cls}`}>
            {meta.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-gray-500 text-xs">
          <Flag size={11} />
          <span>{tournament.raceCount} cuộc đua</span>
        </div>
      </div>
    </button>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, subCls = "text-gray-500", valueCls = "text-white", borderCls = "border-emerald-500/35" }) {
  return (
    <div className={`border ${borderCls} rounded-xl px-5 py-4 bg-white/[0.025] flex flex-col gap-1`}>
      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">{label}</p>
      <p className={`text-[22px] font-bold font-mono leading-tight ${valueCls}`}>{value}</p>
      {sub && <p className={`text-xs leading-tight ${subCls}`}>{sub}</p>}
    </div>
  );
}

// ─── RaceCard ─────────────────────────────────────────────────────────────────

function RaceCard({ race, myEntry, myInvitation, index, onRegister, onConfirm }) {
  const canRegister = race.status === "Scheduled";
  const filled = race.currentEntries ?? 0;
  const max = race.maxHorses ?? 1;
  const pct = Math.min(100, Math.round((filled / max) * 100));

  return (
    <div className="flex items-stretch bg-[#0b0f14] rounded-xl overflow-hidden border border-white/5 hover:border-white/12 transition-colors">

      {/* Race thumbnail */}
      <div
        className="relative w-48 h-[130px] flex-shrink-0 overflow-hidden"
        style={{ background: RACE_BG[index % RACE_BG.length] }}
      >
        {/* Abstract track lines */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "repeating-linear-gradient(168deg,transparent 0,transparent 16px,rgba(255,255,255,0.35) 16px,rgba(255,255,255,0.35) 17px)",
          }}
        />
        {/* right fade */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0b0f14]/90" />
        {/* horse emoji watermark */}
        <span className="absolute bottom-2 right-3 text-4xl opacity-15 select-none pointer-events-none">
          🏇
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 px-5 py-4 flex flex-col justify-between min-w-0">
        <div>
          <p className="text-white font-bold text-[15px] leading-snug">
            {race.name}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 text-gray-400 text-xs">
            <Calendar size={11} className="text-gray-600 flex-shrink-0" />
            <span>
              {fmtDate(race.scheduledAt)}
              {race.scheduledAt && ` · ${fmtTime(race.scheduledAt)}`}
            </span>
          </div>

          {/* Tags */}
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            {race.roundType && (
              <span className="text-[11px] px-2.5 py-0.5 rounded bg-white/6 border border-white/10 text-gray-300">
                {race.roundType}
              </span>
            )}
            <span className="text-[11px] px-2.5 py-0.5 rounded bg-white/6 border border-white/10 text-gray-300">
              {race.numberOfLegs} Legs
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded bg-white/6 border border-white/10 text-gray-300 flex items-center gap-1">
              <Users size={10} />
              {race.maxHorses} chỗ
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-[11px] text-gray-500 mb-1.5">
            <span>Tiến trình đăng ký</span>
            <span>{filled}/{max} chỗ</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/6 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="flex flex-col items-center justify-center px-5 w-[164px] flex-shrink-0 border-l border-white/5">
        {myEntry ? (
          <span className={`text-[11px] px-3 py-1.5 rounded-lg font-semibold text-center ${ENTRY_STATUS[myEntry.status]?.cls ?? "text-gray-400 bg-gray-500/10 border border-gray-500/20"}`}>
            {ENTRY_STATUS[myEntry.status]?.label ?? myEntry.status}
          </span>
        ) : myInvitation ? (
          myInvitation.status === "Accepted" ? (
            <button
              onClick={() => onConfirm(myInvitation)}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm transition-colors"
            >
              Confirm Jockey →
            </button>
          ) : (
            <span className="text-[11px] px-3 py-1.5 rounded-lg font-semibold text-center text-yellow-400 bg-yellow-400/10 border border-yellow-400/25">
              Đã mời Jockey
            </span>
          )
        ) : canRegister ? (
          <button
            onClick={() => onRegister(race)}
            className="w-full py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm transition-colors"
          >
            Đăng Ký Ngựa
          </button>
        ) : (
          <span className="text-gray-600 text-xs text-center">{race.status}</span>
        )}
      </div>
    </div>
  );
}

// ─── Detail view tabs ─────────────────────────────────────────────────────────

const TABS = ["CÁC CUỘC ĐUA", "ĐĂNG KÝ CỦA TÔI"];

function TournamentDetail({ tournament, races, entryByRace, activeInvByRace, onBack, onRegister, onConfirm }) {
  const [activeTab, setActiveTab] = useState("CÁC CUỘC ĐUA");
  const [search, setSearch] = useState("");

  const myRaces = races.filter((r) => entryByRace[r.raceId]);

  // Earliest reg deadline across races
  const regDeadline = races.reduce((earliest, r) => {
    if (!r.registrationCloseAt) return earliest;
    return !earliest || new Date(r.registrationCloseAt) < new Date(earliest)
      ? r.registrationCloseAt
      : earliest;
  }, null);
  const days = daysLeft(regDeadline);

  const displayed = (activeTab === "ĐĂNG KÝ CỦA TÔI" ? myRaces : races).filter(
    (r) => r.name?.toLowerCase().includes(search.toLowerCase()),
  );

  const status = T_STATUS[tournament.status] ?? T_STATUS.Upcoming;

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Top mini-nav ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-3 bg-[#080c12] border-b border-white/5 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-gray-300 hover:text-white text-sm transition-colors flex-shrink-0"
        >
          <ChevronLeft size={16} />
          <span className="font-medium">Giải Đấu</span>
        </button>

        {/* Search */}
        <div className="flex-1 max-w-sm mx-auto relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm giải đấu..."
            className="w-full bg-[#0f151e] border border-white/10 text-white placeholder-gray-600 rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-white/20"
          />
        </div>

        {/* User avatar placeholder */}
        <div className="w-8 h-8 rounded-full bg-yellow-400/20 border border-yellow-400/30 flex items-center justify-center flex-shrink-0 text-yellow-400 text-xs font-bold">
          O
        </div>
      </div>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div
        className="relative flex-shrink-0 overflow-hidden"
        style={{
          minHeight: 240,
          background:
            "linear-gradient(155deg,#02070c 0%,#040f06 25%,#071a04 45%,#0d1e00 65%,#100c00 85%,#060408 100%)",
        }}
      >
        {/* Golden glow — upper right */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 72% 35%,rgba(215,155,15,0.42) 0%,rgba(180,110,0,0.18) 30%,transparent 58%)",
          }}
        />
        {/* Atmospheric bottom haze */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 40% 90%,rgba(15,45,10,0.30) 0%,transparent 55%)",
          }}
        />
        {/* Subtle horizontal track lines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,transparent 0,transparent 40px,rgba(255,255,255,1) 40px,rgba(255,255,255,1) 41px)",
          }}
        />
        {/* Ghost trophy watermark */}
        <div className="absolute right-8 bottom-4 text-[180px] leading-none opacity-[0.055] select-none pointer-events-none">
          🏆
        </div>
        {/* Bottom fade to content */}
        <div
          className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent, rgba(8,12,18,1))",
          }}
        />

        {/* Content */}
        <div className="relative px-8 pt-8 pb-10">
          {/* Trophy + badge */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-yellow-400/15 border border-yellow-400/30 flex items-center justify-center">
              <Trophy size={16} className="text-yellow-400" />
            </div>
            <span className={`text-[11px] font-bold px-3 py-1 rounded-full border tracking-widest ${status.cls}`}>
              {status.label}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-white text-[32px] font-extrabold leading-tight tracking-tight mb-2">
            {tournament.name}
          </h1>

          {/* Dates */}
          <p className="text-gray-400/80 text-sm">
            {fmtDateOnly(tournament.startDate)} – {fmtDateOnly(tournament.endDate)}
          </p>
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 px-6 py-4 bg-[#080c12] flex-shrink-0">
        <StatCard
          label="Số Cuộc Đua"
          value={tournament.raceCount}
          sub="Cuộc đua"
          borderCls="border-emerald-500/35"
        />
        <StatCard
          label="Quy Mô"
          value={races[0]?.maxHorses ?? "—"}
          sub="Ngựa / cuộc"
          borderCls="border-emerald-500/35"
        />
        <StatCard
          label="Hạn Đăng Ký"
          value={regDeadline ? fmtDate(regDeadline) : "—"}
          sub={
            days !== null
              ? days > 0
                ? `Còn ${days} ngày`
                : "Đã hết hạn"
              : undefined
          }
          valueCls={regDeadline ? "text-red-400" : "text-gray-600"}
          subCls={days !== null && days > 0 ? "text-red-400/70" : "text-gray-600"}
          borderCls="border-emerald-500/35"
        />
        <StatCard
          label="Tổng Thưởng"
          value="—"
          sub="điểm"
          valueCls="text-yellow-400"
          borderCls="border-yellow-400/35"
        />
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex border-b border-white/8 bg-[#080c12] px-6 flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-1 py-3.5 mr-6 text-[11px] font-bold uppercase tracking-widest transition-colors border-b-2 -mb-px flex items-center gap-2
              ${activeTab === tab
                ? "border-white text-white"
                : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
          >
            {tab}
            {tab === "ĐĂNG KÝ CỦA TÔI" && myRaces.length > 0 && (
              <span className="bg-yellow-400/20 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none">
                {myRaces.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Race list ─────────────────────────────────────────────────── */}
      <div className="flex-1 bg-[#080c12] px-6 py-5 space-y-3">
        {displayed.length === 0 ? (
          <div className="text-center py-16 text-gray-700">
            <Flag size={36} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">
              {activeTab === "ĐĂNG KÝ CỦA TÔI"
                ? "Bạn chưa đăng ký cuộc đua nào."
                : "Chưa có cuộc đua nào trong giải này."}
            </p>
          </div>
        ) : (
          displayed.map((race, i) => (
            <RaceCard
              key={race.raceId}
              race={race}
              myEntry={entryByRace[race.raceId]}
              myInvitation={activeInvByRace[race.raceId]}
              index={i}
              onRegister={onRegister}
              onConfirm={onConfirm}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HorseOwnerTournamentsPage() {
  const { user } = useAuth();
  const [tournaments, setTournaments]   = useState([]);
  const [races, setRaces]               = useState([]);
  const [myEntries, setMyEntries]       = useState([]);
  const [myInvitations, setMyInvitations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState(null);
  const [registerRace, setRegisterRace] = useState(null);
  const [confirmInv, setConfirmInv]     = useState(null);

  const refreshData = () =>
    Promise.all([getMyEntries(), getInvitations()])
      .then(([e, inv]) => {
        setMyEntries(Array.isArray(e) ? e : (e?.data ?? []));
        setMyInvitations(Array.isArray(inv) ? inv : (inv?.data ?? inv?.invitations ?? []));
      })
      .catch(console.error);

  useEffect(() => {
    Promise.all([getTournaments(), getRaces(), getMyEntries(), getInvitations()])
      .then(([t, r, e, inv]) => {
        setTournaments(Array.isArray(t) ? t : (t?.data ?? []));
        setRaces(Array.isArray(r) ? r : (r?.data ?? []));
        setMyEntries(Array.isArray(e) ? e : (e?.data ?? []));
        setMyInvitations(Array.isArray(inv) ? inv : (inv?.data ?? inv?.invitations ?? []));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const racesByTournament = useMemo(() => {
    const map = {};
    races.forEach((r) => {
      if (!map[r.tournamentId]) map[r.tournamentId] = [];
      map[r.tournamentId].push(r);
    });
    return map;
  }, [races]);

  const entryByRace = useMemo(() => {
    const map = {};
    myEntries.forEach((e) => { map[e.raceId] = e; });
    return map;
  }, [myEntries]);

  // Map raceId → invitation đang active (Pending hoặc Accepted)
  const activeInvByRace = useMemo(() => {
    const map = {};
    myInvitations
      .filter((inv) => inv.status === "Pending" || inv.status === "Accepted")
      .forEach((inv) => { map[inv.raceId] = inv; });
    return map;
  }, [myInvitations]);

  // ── loading ──
  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-44 bg-white/4 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  // ── empty ──
  if (!loading && tournaments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-36 gap-4">
        <Trophy size={48} className="text-gray-700" />
        <p className="text-gray-500 text-sm">Chưa có giải đấu nào được tổ chức.</p>
      </div>
    );
  }

  // ── DETAIL VIEW ──
  if (selected) {
    return (
      <>
        <TournamentDetail
          tournament={selected}
          races={racesByTournament[selected.tournamentId] ?? []}
          entryByRace={entryByRace}
          activeInvByRace={activeInvByRace}
          onBack={() => setSelected(null)}
          onRegister={setRegisterRace}
          onConfirm={setConfirmInv}
        />

        {registerRace && (
          <SendInvitationModal
            initialRace={registerRace}
            existingEntries={myEntries}
            onClose={() => setRegisterRace(null)}
            onSuccess={refreshData}
          />
        )}

        {confirmInv && (
          <ConfirmJockeyModal
            invitation={confirmInv}
            onClose={() => setConfirmInv(null)}
            onConfirmed={() => {
              setConfirmInv(null);
              refreshData();
            }}
          />
        )}
      </>
    );
  }

  // ── LIST VIEW ──
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Giải Đấu</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Chọn giải đấu và đăng ký ngựa của bạn
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {tournaments.map((t) => (
          <TournamentListCard
            key={t.tournamentId}
            tournament={t}
            racesCount={racesByTournament[t.tournamentId]?.length ?? 0}
            onSelect={setSelected}
          />
        ))}
      </div>
    </div>
  );
}
