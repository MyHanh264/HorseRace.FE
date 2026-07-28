import { useState, useEffect, useMemo, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Flag, Search, Clock, AlertCircle, X, CheckCircle, ChevronRight, Trophy, Ban,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  getAllRaces, getRaceDetail, getAllTournaments, getMyWallet,
  getRaceOdds, placeRacePrediction,
  getRaceStandings, getRaceResults,
  getMyPredictions, getPredictionDetail, cancelPrediction,
} from '../../api/spectator'
import RaceResultsModal from '../../components/RaceResultsModal'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_META = {
  Scheduled:     { label: 'Scheduled',      cls: 'bg-primary/15 text-primary border border-primary/25' },
  InProgress:    { label: 'Live',           cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/25' },
  Paused:        { label: 'Paused',         cls: 'bg-orange-500/15 text-orange-400 border border-orange-500/25' },
  PendingResult: { label: 'Pending Result', cls: 'bg-violet-500/15 text-violet-400 border border-violet-500/25' },
  Finished:      { label: 'Finished',       cls: 'bg-surface-container-high text-on-surface-variant border border-outline-variant/50' },
}


const TABS = ['All Scheduled', 'Live', 'Recently Finished']

function fmtDateTime(dt) {
  if (!dt) return '—'
  const d = new Date(dt)
  const isToday = d.toDateString() === new Date().toDateString()
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return isToday ? `Today, ${time}` : `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${time}`
}

function fmtBalance(n) {
  return Number(n ?? 0).toLocaleString('en-US')
}

// ─── Countdown ────────────────────────────────────────────────────────────────

function Countdown({ target }) {
  const [display, setDisplay] = useState('')

  useEffect(() => {
    const tick = () => {
      const diff = new Date(target) - Date.now()
      if (diff <= 0) { setDisplay('00:00:00'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setDisplay(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])

  return (
    <span className="font-mono text-sm bg-primary/15 text-primary px-2 py-1 rounded-md border border-primary/25 flex items-center gap-1.5">
      <Clock className="w-3.5 h-3.5" />{display}
    </span>
  )
}

// ─── Bet Panel (race-level) ───────────────────────────────────────────────────
// Cược 1 Entry về 1st của cả race. Cửa mở khi race Scheduled và odds đã khóa (sau đóng ĐK).

function BetPanel({ race, raceDetail, wallet, onBetPlaced }) {
  const { user } = useAuth()
  const numberOfLegs = raceDetail?.numberOfLegs ?? 0

  const [raceOdds, setRaceOdds]           = useState(null)
  const [oddsLoading, setOddsLoading]   = useState(false)
  const [oddsError, setOddsError]       = useState('')

  const [selectedEntryId, setSelectedEntryId] = useState('')
  const [betAmount, setBetAmount]             = useState('')
  const [submitting, setSubmitting]           = useState(false)
  const [betError, setBetError]               = useState('')
  const [betSuccess, setBetSuccess]           = useState(false)
  const [showResults, setShowResults]         = useState(false)

  // Active prediction already placed for THIS race (BE allows at most 1 non-Cancelled
  // prediction per race+spectator) — shown instead of the bet form, so the spectator sees
  // what they already bet instead of filling out the form again and hitting a 400.
  const [activePrediction, setActivePrediction] = useState(null)
  const [activeLoading, setActiveLoading]       = useState(true)
  const [cancelling, setCancelling]             = useState(false)
  const [cancelError, setCancelError]           = useState('')

  const loadActivePrediction = useCallback(async () => {
    if (!race?.raceId || !user?.userId) { setActiveLoading(false); return }
    setActiveLoading(true)
    try {
      const mine = await getMyPredictions(user.userId)
      const active = (mine ?? []).find(p => p.raceId === race.raceId && p.status !== 'Cancelled')
      if (active) {
        const detail = await getPredictionDetail(active.predictionId).catch(() => null)
        setActivePrediction(detail ? { ...active, ...detail } : active)
      } else {
        setActivePrediction(null)
      }
    } catch {
      setActivePrediction(null)
    } finally {
      setActiveLoading(false)
    }
  }, [race?.raceId, user?.userId])

  useEffect(() => { loadActivePrediction() }, [loadActivePrediction])

  const handleCancelActive = async () => {
    if (!activePrediction) return
    setCancelling(true)
    setCancelError('')
    try {
      await cancelPrediction(activePrediction.predictionId)
      setActivePrediction(null)
      loadRaceOdds()
      onBetPlaced?.()
    } catch (err) {
      setCancelError(err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.message ?? 'Failed to cancel bet')
    } finally {
      setCancelling(false)
    }
  }

  const loadRaceOdds = useCallback(() => {
    if (!race?.raceId || race.status !== 'Scheduled') {
      setRaceOdds(null)
      setOddsError(race?.status !== 'Scheduled'
        ? 'Betting is only available while the race is Scheduled.'
        : '')
      return
    }
    setOddsLoading(true); setOddsError('')
    getRaceOdds(race.raceId)
      .then(d => { setRaceOdds(d); setSelectedEntryId('') })
      .catch(err => {
        setRaceOdds(null)
        const msg = err?.response?.data?.message
          ?? err?.response?.data?.detail
          ?? err?.message
          ?? 'Failed to load odds'
        setOddsError(msg)
      })
      .finally(() => setOddsLoading(false))
  }, [race?.raceId, race?.status])

  useEffect(() => { loadRaceOdds() }, [loadRaceOdds])

  const balance      = Number(wallet?.balance ?? 0)
  const raceEntries  = raceOdds?.entries ?? []
  // Cửa cược = [Admin đóng đăng ký → race xuất phát]. Đóng đăng ký là sinh odds và mở cược
  // luôn; race rời "Scheduled" là sổ tự đóng. Không có mốc nào khác ở giữa.
  const bettingOpen  = race?.status === 'Scheduled'
    && raceOdds?.oddsComputedAt != null
    && String(raceOdds?.raceStatus ?? '').toLowerCase() === 'scheduled'
  const selectedEntry = raceEntries.find(e => e.entryId === Number(selectedEntryId))
  const amount        = Number(betAmount) || 0

  // MỘT giá duy nhất: `odds` máy tính lúc đóng đăng ký, đứng yên tới hết race, và cũng chính
  // là giá khóa vào lệnh. Không có giá thứ hai nào để đối chiếu.
  const lockedOdds  = Number(selectedEntry?.odds ?? 0)
  const estPayout   = selectedEntryId && amount > 0 && lockedOdds > 0
    ? `${fmtBalance(Math.round(amount * lockedOdds * 100) / 100)} pts`
    : '—'

  const validate = () => {
    if (!selectedEntryId) return 'Please select a horse.'
    if (amount < 10) return 'Minimum bet is 10 points.'
    if (amount > balance * 0.5) return `Maximum 50% of balance (${fmtBalance(Math.floor(balance * 0.5))} pts).`
    if (amount > balance) return `Insufficient balance (you have ${fmtBalance(balance)} pts).`
    return null
  }

  const handlePlaceBet = async () => {
    const err = validate()
    if (err) { setBetError(err); return }
    setSubmitting(true)
    setBetError('')
    try {
      await placeRacePrediction(race.raceId, {
        EntryId: Number(selectedEntryId),
        BetAmount: amount,
      })
      setBetSuccess(true)
      setBetAmount('')
      setSelectedEntryId('')
      loadRaceOdds()
      loadActivePrediction()
      onBetPlaced?.()
    } catch (err) {
      const msg = err?.response?.data?.message
        ?? err?.response?.data?.detail
        ?? (typeof err?.response?.data === 'string' ? err.response.data : null)
        ?? err?.message
        ?? 'Failed to place bet'
      setBetError(`[${err?.response?.status ?? '?'}] ${msg}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (!race) return null

  return (
    <div className="gs-card p-5 flex flex-col gap-5">
      {/* Race info */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-serif font-bold text-on-surface text-lg leading-snug">{race.name}</h3>
          {race.status === 'Scheduled' && raceDetail?.scheduledStartTime && (
            <Countdown target={raceDetail.scheduledStartTime} />
          )}
          {race.status === 'Finished' && (
            <button
              onClick={() => setShowResults(true)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-yellow-400/10 text-yellow-400 border border-yellow-400/25 hover:bg-yellow-400/20 transition-all"
            >
              <Trophy size={13} /> View Results
            </button>
          )}
        </div>
        <p className="text-xs text-on-surface-variant">
          {numberOfLegs || '—'} Legs · {raceDetail?.roundType ?? '—'} · Max {raceDetail?.maxHorses ?? '—'} horses
        </p>
      </div>

      {showResults && (
        <RaceResultsModal
          raceId={race.raceId}
          raceName={race.name}
          onClose={() => setShowResults(false)}
          fetchStandings={getRaceStandings}
          fetchResults={getRaceResults}
        />
      )}

      {/* Contenders */}
      <div>
        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
          Contenders · Race winner (1st)
        </p>

        {oddsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
          </div>
        ) : oddsError ? (
          <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/40 text-on-surface-variant text-sm">
            {oddsError}
          </div>
        ) : raceEntries.length === 0 ? (
          <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/40 text-on-surface-variant text-sm">
            No odds yet — registration hasn't closed for this race, so odds aren't locked in.
          </div>
        ) : (
          // Cố ý KHÔNG dùng class .admin-table: nó ép min-width 820px (đo cho bảng Admin rộng),
          // nhét vào panel hẹp này thì cột Odds căn phải bị đẩy khỏi vùng nhìn thấy — trông y như
          // odds không có giá trị. Dựng bằng class tường minh để bảng co theo panel.
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-surface-container-high">
                <th className="text-left text-[11px] font-bold uppercase tracking-widest text-on-surface-variant px-3 py-2.5 border-b border-outline-variant">Gate</th>
                <th className="text-left text-[11px] font-bold uppercase tracking-widest text-on-surface-variant px-3 py-2.5 border-b border-outline-variant">Horse</th>
                <th className="text-right text-[11px] font-bold uppercase tracking-widest text-on-surface-variant px-3 py-2.5 border-b border-outline-variant whitespace-nowrap">Odds</th>
              </tr>
            </thead>
            <tbody>
              {raceEntries.map(e => (
                <tr key={e.entryId} className="border-b border-outline-variant/40 last:border-b-0">
                  <td className="px-3 py-2.5 text-on-surface-variant">{e.gateNumber ?? '—'}</td>
                  <td className="px-3 py-2.5 font-semibold text-on-surface">{e.horseName ?? `Entry #${e.entryId}`}</td>
                  <td className="px-3 py-2.5 text-right text-secondary font-bold font-mono whitespace-nowrap">
                    {Number.isFinite(Number(e.odds)) && Number(e.odds) > 0
                      ? `${Number(e.odds).toFixed(2)}x`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Bet form / already-bet summary */}
      <div className="border-t border-outline-variant/40 pt-4">
        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Your Prediction</p>

        {betSuccess && (
          <div className="mb-3 p-3 rounded-lg bg-primary/10 border border-primary/25 text-primary text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            Bet placed!
          </div>
        )}

        {activeLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-5 h-5 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
          </div>
        ) : activePrediction ? (
          // BE only allows 1 active (non-Cancelled) prediction per race+spectator — show what
          // was already bet instead of a form that would just 400 on submit.
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/25">
              <p className="text-xs text-on-surface-variant mb-1.5">You already have a bet on this race</p>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-on-surface">
                  {raceEntries.find(e => e.entryId === activePrediction.firstEntryId)?.horseName
                    ?? `Entry #${activePrediction.firstEntryId}`}
                </span>
                <span className="font-mono text-secondary font-bold shrink-0">
                  {fmtBalance(activePrediction.betAmount)} pts
                  {activePrediction.oddsLocked1 != null ? ` @ ${activePrediction.oddsLocked1}x` : ''}
                </span>
              </div>
            </div>

            {cancelError && (
              <div className="p-3 rounded-lg bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />{cancelError}
              </div>
            )}

            {/* Hủy cược đóng cùng lúc với đặt cược: race chạy rồi thì lệnh không rút ra được. */}
            {bettingOpen && (
              <button
                onClick={handleCancelActive}
                disabled={cancelling}
                className="gs-btn gs-btn-ghost w-full justify-center flex items-center gap-2 text-error disabled:opacity-50"
              >
                {cancelling
                  ? <div className="w-3 h-3 border-2 border-error/30 border-t-error rounded-full animate-spin" />
                  : <Ban className="w-3.5 h-3.5" />}
                Cancel Bet
              </button>
            )}
          </div>
        ) : (
          <>
            {!bettingOpen && raceEntries.length > 0 && !betSuccess && (
              <div className="mb-3 p-3 rounded-lg bg-surface-container border border-outline-variant/40 text-on-surface-variant text-sm">
                {raceOdds?.oddsComputedAt == null
                  ? 'Betting opens once the admin closes registration for this race.'
                  : 'Betting is closed for this race — it has already started.'}
              </div>
            )}

            {betError && (
              <div className="mb-3 p-3 rounded-lg bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />{betError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Pick 1st Place</label>
                <select
                  value={selectedEntryId}
                  onChange={e => { setSelectedEntryId(e.target.value); setBetError('') }}
                  disabled={!bettingOpen}
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all disabled:opacity-50"
                >
                  <option value="">Select Entry...</option>
                  {raceEntries.map(e => (
                    <option key={e.entryId} value={e.entryId}>
                      {e.horseName ?? `Entry #${e.entryId}`} — {Number(e.odds ?? 0).toFixed(2)}x
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Bet Amount (Pts)</label>
                <input
                  type="number"
                  min={10}
                  max={Math.floor(balance * 0.5)}
                  value={betAmount}
                  onChange={e => { setBetAmount(e.target.value); setBetError('') }}
                  disabled={!bettingOpen}
                  placeholder="0"
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40 disabled:opacity-50"
                />
              </div>

              {/* Giá trong bảng = giá khóa vào lệnh = giá dùng để trả thưởng. Một con số duy
                  nhất, không phụ thuộc số tiền đặt hay số người đã cược. */}
              <div className="py-2 px-3 rounded-lg bg-surface-container border border-outline-variant/30 text-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">Locked Odds</span>
                  <span className="font-bold font-mono text-on-surface">
                    {selectedEntryId && lockedOdds > 0 ? `${lockedOdds.toFixed(2)}x` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">Est. Payout</span>
                  <span className="text-secondary font-bold font-mono">{estPayout}</span>
                </div>
                <p className="text-xs text-on-surface-variant pt-1 border-t border-outline-variant/30">
                  Odds are set when registration closes and never move after that — the rate shown
                  here is exactly the one locked into your bet. Payout = stake × odds.
                </p>
              </div>

              <button
                onClick={handlePlaceBet}
                disabled={!bettingOpen || submitting}
                className="gs-btn gs-btn-secondary w-full justify-center flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <div className="w-3 h-3 border-2 border-on-secondary/30 border-t-on-secondary rounded-full animate-spin" />}
                Place Bet
              </button>

              <p className="text-center text-[11px] text-on-surface-variant">
                Current Balance: <span className="font-bold text-on-surface">{fmtBalance(balance)} pts</span>
              </p>
              <p className="text-center text-[11px] text-error/70">
                Points are deducted immediately. You can cancel until the organiser locks betting.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RacesBettingPage() {
  const { user }  = useAuth()
  const location  = useLocation()

  const [allRaces,     setAllRaces]     = useState([])
  const [raceDetails,  setRaceDetails]  = useState({})   // raceId → detail
  const [tournamentMap,setTournamentMap]= useState({})
  const [wallet,       setWallet]       = useState(null)

  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [activeTab,  setActiveTab]  = useState('All Scheduled')
  const [search,     setSearch]     = useState('')
  const [selectedId, setSelectedId] = useState(location.state?.selectedRaceId ?? null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [races, tournaments, w] = await Promise.all([
        getAllRaces(),
        getAllTournaments(),
        getMyWallet(user?.userId),
      ])
      setAllRaces(Array.isArray(races) ? races : [])
      setTournamentMap(Object.fromEntries((Array.isArray(tournaments) ? tournaments : []).map(t => [t.tournamentId, t])))
      setWallet(w)

      if (selectedId) {
        const detail = await getRaceDetail(selectedId)
        setRaceDetails(prev => ({ ...prev, [selectedId]: detail }))
      }
    } catch (err) {
      setError(err?.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [user?.userId, selectedId])

  useEffect(() => { load() }, [load])

  // Fetch detail when a race is selected (numberOfLegs cần cho bộ chọn leg)
  const handleSelectRace = async (race) => {
    setSelectedId(race.raceId)
    if (!raceDetails[race.raceId]) {
      try {
        const d = await getRaceDetail(race.raceId)
        setRaceDetails(prev => ({ ...prev, [race.raceId]: d }))
      } catch { /* ignore */ }
    }
  }

  // ── Filter ──
  const filteredRaces = useMemo(() => {
    let list = allRaces
    if (activeTab === 'All Scheduled') list = list.filter(r => r.status === 'Scheduled')
    else if (activeTab === 'Live')     list = list.filter(r => ['InProgress', 'Paused', 'PendingResult'].includes(r.status))
    else                               list = list.filter(r => r.status === 'Finished')

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r => r.name.toLowerCase().includes(q))
    }
    return list
  }, [allRaces, activeTab, search])

  const selectedRace   = allRaces.find(r => r.raceId === selectedId) ?? filteredRaces[0] ?? null
  const selectedDetail = selectedRace ? raceDetails[selectedRace.raceId] : null

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-[1200px] mx-auto">

        {/* Header */}
        <div className="mb-8 animate-fade-in-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
          <h1 className="font-serif text-3xl font-bold text-on-surface">Races &amp; Betting</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Pick a horse, review odds, and lock in your race winner prediction.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
            <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-surface-container-low border border-outline-variant/40 rounded-xl p-1 w-fit">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedId(null) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-surface-container-highest text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Left: race list */}
          <div className="w-[380px] shrink-0">
            <div className="gs-card overflow-hidden">
              <div className="px-4 py-3.5 border-b border-outline-variant/40">
                <p className="font-semibold text-on-surface text-sm mb-3">Upcoming Meets</p>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                  <input
                    type="text"
                    placeholder="Search races..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg pl-9 pr-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
                </div>
              ) : filteredRaces.length === 0 ? (
                <div className="py-12 text-center text-on-surface-variant text-sm">
                  No races found.
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/30 max-h-[520px] overflow-y-auto">
                  {filteredRaces.map(race => {
                    const detail   = raceDetails[race.raceId]
                    const tournId  = detail?.tournamentId
                    const tourn    = tournId ? tournamentMap[tournId] : null
                    const meta     = STATUS_META[race.status] ?? STATUS_META.Scheduled
                    const isActive = selectedRace?.raceId === race.raceId

                    return (
                      <button
                        key={race.raceId}
                        onClick={() => handleSelectRace(race)}
                        className={`w-full text-left px-4 py-4 transition-colors hover:bg-surface-container ${isActive ? 'bg-surface-container border-l-2 border-l-primary' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-on-surface text-sm leading-snug truncate">{race.name}</p>
                            {tourn && <p className="text-xs text-on-surface-variant mt-0.5 truncate">{tourn.name}</p>}
                            <p className="text-xs text-on-surface-variant mt-1">{fmtDateTime(race.scheduledAt || race.scheduledStartTime)}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant/50" />
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: bet panel */}
          <div className="flex-1 min-w-0">
            {selectedRace ? (
              <BetPanel
                key={selectedRace.raceId}
                race={selectedRace}
                raceDetail={selectedDetail}
                wallet={wallet}
                onBetPlaced={load}
              />
            ) : (
              <div className="gs-card p-12 text-center h-full flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center">
                  <Flag className="w-7 h-7 text-on-surface-variant/40" />
                </div>
                <p className="text-on-surface font-semibold">Select a race to view details</p>
                <p className="text-on-surface-variant text-sm">Click on any race in the list to see contenders and place your bet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
