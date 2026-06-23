import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, TrendingUp, Clock, ChevronRight, Wallet, Flag, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getMyWallet, getMyPredictions, getAllRaces, getAllTournaments } from '../../api/spectator'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBalance(n) {
  return Number(n ?? 0).toLocaleString('en-US')
}

function timeUntil(dt) {
  const diff = new Date(dt) - Date.now()
  if (diff <= 0) return 'Started'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `Starts in ${h}h` : `Starts in ${m}m`
}

function fmtDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Race Card ────────────────────────────────────────────────────────────────

function RaceCard({ race, tournament, onBet, delay }) {
  const until = timeUntil(race.scheduledAt || race.scheduledStartTime)

  return (
    <div
      className={`gs-card overflow-hidden flex flex-col animate-fade-in-up delay-row-${delay}`}
      style={{ opacity: 0, animationFillMode: 'forwards' }}
    >
      <div className="relative h-36 flex items-center justify-center overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #182028 0%, #0b141c 100%)' }}>
        <Flag className="w-12 h-12 text-primary/20" />
        <div className="absolute top-3 left-3">
          <span className="bg-primary/90 text-on-primary text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
            Scheduled
          </span>
        </div>
        <div className="absolute bottom-3 right-3">
          <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-md">
            {until}
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-3">
        <div>
          <h3 className="font-serif font-bold text-on-surface text-base leading-snug">{race.name}</h3>
          {tournament && (
            <p className="text-xs text-on-surface-variant mt-0.5">{tournament.name}</p>
          )}
          <p className="text-xs text-on-surface-variant mt-1">
            {fmtDate(race.scheduledAt || race.scheduledStartTime)}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-on-surface-variant">Top Favorite Odds</span>
          <span className="text-secondary font-bold font-mono">—</span>
        </div>

        <button
          onClick={() => onBet(race)}
          className="gs-btn gs-btn-secondary w-full justify-center mt-auto"
        >
          Place Bet
        </button>
      </div>
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, Icon, color, bg, loading }) {
  return (
    <div className="gs-card p-5">
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
        <Icon size={18} className={color} />
      </div>
      <p className="text-xs text-on-surface-variant font-medium mb-1">{label}</p>
      <p className={`text-2xl font-bold font-mono ${color}`}>{loading ? '—' : value}</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SpectatorDashboard() {
  const { user }  = useAuth()
  const navigate  = useNavigate()

  const [wallet,      setWallet]      = useState(null)
  const [predictions, setPredictions] = useState([])
  const [races,       setRaces]       = useState([])
  const [tournaments, setTournaments] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')
      try {
        const [w, p, r, t] = await Promise.all([
          getMyWallet(user?.userId),
          getMyPredictions(user?.userId),
          getAllRaces(),
          getAllTournaments(),
        ])
        if (!active) return
        setWallet(w)
        setPredictions(Array.isArray(p) ? p : (p?.data || []))
        setRaces(Array.isArray(r) ? r : (r?.data || []))
        setTournaments(Array.isArray(t) ? t : (t?.data || []))
      } catch (err) {
        if (active) setError(err?.message || 'Không tải được dữ liệu')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [user?.userId])

  const tournamentMap = useMemo(
    () => Object.fromEntries(tournaments.map(t => [t.tournamentId, t])),
    [tournaments],
  )

  const scheduledRaces = useMemo(
    () => races.filter(r => r.status === 'Scheduled').slice(0, 3),
    [races],
  )

  const activeCount   = predictions.filter(p => p.status === 'Pending').length
  const wonBets       = predictions.filter(p => p.status === 'Won').length
  const pendingSettle = predictions.filter(p => p.status === 'Pending').length

  const STATS = [
    { label: 'Active Predictions', value: activeCount,           Icon: Flag,        color: 'text-primary',   bg: 'bg-primary/10 border border-primary/20' },
    { label: 'Won Bets',           value: wonBets,               Icon: Trophy,      color: 'text-secondary', bg: 'bg-secondary/10 border border-secondary/20' },
    { label: 'Total Winnings',     value: '0 pts',               Icon: TrendingUp,  color: 'text-primary',   bg: 'bg-primary/10 border border-primary/20' },
    { label: 'Pending Settlement', value: pendingSettle,         Icon: Clock,       color: 'text-error',     bg: 'bg-error/10 border border-error/20' },
  ]

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-[1100px] mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div className="animate-fade-in-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
            <p className="text-on-surface-variant text-sm mb-1">Welcome Back,</p>
            <h1 className="font-serif text-3xl font-bold text-on-surface">{user?.fullName ?? 'Spectator'}</h1>
            <p className="text-on-surface-variant text-sm mt-1">
              Here's your spectator overview for today's races.
            </p>
          </div>

          {/* Wallet card */}
          <div
            className="gs-card-glow p-5 min-w-[220px] animate-fade-in-up delay-row-1"
            style={{ opacity: 0, animationFillMode: 'forwards' }}
          >
            <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Wallet size={14} />
              Point Wallet
            </p>
            <p className="text-3xl font-bold text-on-surface font-mono">
              {loading ? '—' : fmtBalance(wallet?.balance ?? 0)}
              <span className="text-base font-normal text-on-surface-variant ml-1.5">pts</span>
            </p>
            <p className="text-xs text-on-surface-variant mt-2 flex items-center gap-1">
              <Clock size={12} />
              Next top-up: Mon 00:00 (+100 pts)
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {STATS.map(({ label, value, Icon, color, bg }, i) => (
            <div
              key={label}
              className={`animate-fade-in-up delay-row-${i + 1}`}
              style={{ opacity: 0, animationFillMode: 'forwards' }}
            >
              <StatCard
                label={label}
                value={value}
                Icon={Icon}
                color={color}
                bg={bg}
                loading={loading}
              />
            </div>
          ))}
        </div>

        {/* Upcoming races */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-serif text-xl font-bold text-on-surface">Upcoming Races to Bet</h2>
            <button
              onClick={() => navigate('/spectator/races')}
              className="text-xs text-secondary font-bold flex items-center gap-1 hover:text-secondary/80 transition-colors bg-transparent border-none cursor-pointer"
            >
              View full card <ChevronRight size={14} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
            </div>
          ) : scheduledRaces.length === 0 ? (
            <div className="gs-card p-12 text-center text-on-surface-variant text-sm">
              Không có cuộc đua nào đang mở đặt cược.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {scheduledRaces.map((race, i) => (
                <RaceCard
                  key={race.raceId}
                  race={race}
                  tournament={tournamentMap[race.tournamentId]}
                  delay={(i % 4) + 1}
                  onBet={() => navigate('/spectator/races', { state: { selectedRaceId: race.raceId } })}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
