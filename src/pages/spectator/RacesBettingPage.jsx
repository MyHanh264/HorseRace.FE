import { useState, useEffect, useMemo, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Flag, Search, Clock, AlertCircle, X, CheckCircle, ChevronRight, Trophy,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  getAllRaces, getRaceDetail, getAllTournaments, getMyWallet,
  getLegOdds, placeLegPrediction, getRaceLive,
  getRaceStandings, getRaceResults,
} from '../../api/spectator'
import { HorseCondition } from '../../components/StaminaBar'
import RaceResultsModal from '../../components/RaceResultsModal'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_META = {
  Scheduled:     { label: 'Scheduled',      cls: 'bg-primary/15 text-primary border border-primary/25' },
  InProgress:    { label: 'Live',           cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/25' },
  Paused:        { label: 'Paused',         cls: 'bg-orange-500/15 text-orange-400 border border-orange-500/25' },
  PendingResult: { label: 'Pending Result', cls: 'bg-violet-500/15 text-violet-400 border border-violet-500/25' },
  Finished:      { label: 'Finished',       cls: 'bg-surface-container-high text-on-surface-variant border border-outline-variant/50' },
}

// Trạng thái cửa cược của từng leg (từ live.legs[].executionStatus / isBettingOpen).
const LEG_BADGE = {
  open: { label: 'Open', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  live: { label: 'Live', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  done: { label: 'Done', cls: 'bg-surface-container-high text-on-surface-variant border-outline-variant/50' },
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

// ─── Bet Panel (PER-LEG) ────────────────────────────────────────────────────────
// Spectator chọn một Leg rồi cược 1 Entry về 1st của leg đó. Được cược cả leg CHƯA diễn ra
// (leg 1 chưa chạy vẫn cược leg 2; leg 1 đang chạy vẫn cược leg 3). BE chặn trùng (1 cược active
// mỗi race+leg) và tự khóa odds server-side — FE chỉ hiển thị + validate cơ bản.
// Panel này được remount theo key={race.raceId} ở component cha nên mọi state tự reset khi đổi race.

function BetPanel({ race, raceDetail, wallet, onBetPlaced }) {
  const numberOfLegs = raceDetail?.numberOfLegs ?? 0

  const [live, setLive]                 = useState(null)   // getRaceLive → legs[].executionStatus/isBettingOpen
  const [selectedLeg, setSelectedLeg]   = useState(null)
  const [legOdds, setLegOdds]           = useState(null)
  const [oddsLoading, setOddsLoading]   = useState(false)
  const [oddsError, setOddsError]       = useState('')

  const [selectedEntryId, setSelectedEntryId] = useState('')
  const [betAmount, setBetAmount]             = useState('')
  const [submitting, setSubmitting]           = useState(false)
  const [betError, setBetError]               = useState('')
  const [betSuccess, setBetSuccess]           = useState(false)
  const [showResults, setShowResults]         = useState(false)

  // Snapshot live → trạng thái cửa cược từng leg.
  const loadLive = useCallback(() => {
    if (!race?.raceId) return
    getRaceLive(race.raceId).then(setLive).catch(() => setLive(null))
  }, [race?.raceId])

  useEffect(() => { loadLive() }, [loadLive])

  // Trạng thái mỗi leg 1..N: mở cược / đang chạy / đã xong. Ưu tiên live.legs; nếu thiếu, suy từ
  // trạng thái race (Scheduled → coi như mở, odds sẽ trống nếu chưa đóng đăng ký).
  const legStates = useMemo(() => {
    const byNum = new Map((live?.legs ?? []).map(l => [l.legNumber, l]))
    const out = []
    for (let n = 1; n <= numberOfLegs; n++) {
      const ll = byNum.get(n)
      let open, status
      if (ll) { open = !!ll.isBettingOpen; status = ll.executionStatus }
      else if (race?.status === 'Scheduled') { open = true; status = 'PredictionOpen' }
      else { open = false; status = 'Unknown' }
      const badge = open ? LEG_BADGE.open : status === 'InProgress' ? LEG_BADGE.live : LEG_BADGE.done
      out.push({ legNumber: n, open, status, badge })
    }
    return out
  }, [live, numberOfLegs, race?.status])

  // Mặc định chọn leg đang mở đầu tiên (nếu không có, leg 1).
  useEffect(() => {
    if (selectedLeg != null || legStates.length === 0) return
    const firstOpen = legStates.find(l => l.open)
    setSelectedLeg(firstOpen?.legNumber ?? legStates[0].legNumber)
  }, [legStates, selectedLeg])

  // Odds + tình trạng ngựa của leg đang chọn.
  const loadLegOdds = useCallback(() => {
    if (!race?.raceId || selectedLeg == null) return
    setOddsLoading(true); setOddsError('')
    getLegOdds(race.raceId, selectedLeg)
      .then(d => { setLegOdds(d); setSelectedEntryId('') })
      .catch(err => {
        setLegOdds(null)
        const msg = err?.response?.data?.message
          ?? err?.response?.data?.detail
          ?? err?.message
          ?? 'Failed to load odds for this leg'
        setOddsError(msg)
      })
      .finally(() => setOddsLoading(false))
  }, [race?.raceId, selectedLeg])

  useEffect(() => { loadLegOdds() }, [loadLegOdds])

  const balance      = Number(wallet?.balance ?? 0)
  const legEntries   = legOdds?.entries ?? []
  const selectedLegState = legStates.find(l => l.legNumber === selectedLeg)
  // Chốt kép: vừa dựa live (đóng leg đang chạy) vừa dựa cờ isBettingOpen từ chính response odds.
  const bettingOpen  = !!(selectedLegState?.open && legOdds && legOdds.isBettingOpen)
  const selectedEntry = legEntries.find(e => e.entryId === Number(selectedEntryId))
  const selectedOdds  = selectedEntry?.currentOdds ?? 1.0
  const amount        = Number(betAmount) || 0
  const estPayout     = selectedEntryId && amount > 0 ? `~${fmtBalance(amount * selectedOdds)} pts` : '—'

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
      await placeLegPrediction(race.raceId, selectedLeg, {
        entryId:   Number(selectedEntryId),
        betAmount: amount,
      })
      setBetSuccess(true)
      setBetAmount('')
      setSelectedEntryId('')
      loadLive()       // cửa cược / pool có thể đổi
      loadLegOdds()    // pool của leg đổi → odds động cập nhật
      onBetPlaced?.()  // refresh ví ở trang cha
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

      {/* Leg selector */}
      {numberOfLegs > 0 && (
        <div>
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Choose a Leg</p>
          <div className="flex flex-wrap gap-2">
            {legStates.map(l => {
              const isActive = l.legNumber === selectedLeg
              return (
                <button
                  key={l.legNumber}
                  onClick={() => setSelectedLeg(l.legNumber)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                    isActive
                      ? 'bg-surface-container-highest text-on-surface border-secondary'
                      : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/40 hover:text-on-surface'
                  }`}
                >
                  Leg {l.legNumber}
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${l.badge.cls}`}>
                    {l.badge.label}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-on-surface-variant mt-2">
            You can bet legs that haven't started yet. A running leg (Live) is locked.
          </p>
        </div>
      )}

      {/* Contenders + condition (Feature 4) */}
      <div>
        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
          Contenders {selectedLeg != null ? `· Leg ${selectedLeg}` : ''}
        </p>

        {oddsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
          </div>
        ) : oddsError ? (
          <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/40 text-on-surface-variant text-sm">
            {oddsError}
          </div>
        ) : legEntries.length === 0 ? (
          <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/40 text-on-surface-variant text-sm">
            No odds yet — registration hasn't closed for this race, so odds aren't locked in.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left">Gate</th>
                  <th className="text-left">Horse</th>
                  <th className="text-left">Condition</th>
                  <th className="text-right">Odds</th>
                </tr>
              </thead>
              <tbody>
                {legEntries.map(e => (
                  <tr key={e.entryId}>
                    <td className="text-on-surface-variant">{e.gateNumber ?? '—'}</td>
                    <td className="font-semibold text-on-surface">{e.horseName ?? `Entry #${e.entryId}`}</td>
                    <td>
                      <HorseCondition stamina={e.horseStamina} health={e.horseHealthStatus} />
                    </td>
                    <td className="text-right text-secondary font-bold font-mono">
                      {e.currentOdds != null ? `${e.currentOdds}x` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bet form */}
      <div className="border-t border-outline-variant/40 pt-4">
        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Your Prediction</p>

        {betSuccess && (
          <div className="mb-3 p-3 rounded-lg bg-primary/10 border border-primary/25 text-primary text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            Bet placed on Leg {selectedLeg}!
          </div>
        )}

        {!bettingOpen && legEntries.length > 0 && !betSuccess && (
          <div className="mb-3 p-3 rounded-lg bg-surface-container border border-outline-variant/40 text-on-surface-variant text-sm">
            Betting is closed for this leg (it's already running or finished). Try a later leg.
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
              {legEntries.map(e => (
                <option key={e.entryId} value={e.entryId}>
                  {e.horseName ?? `Entry #${e.entryId}`} — {e.currentOdds}x
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

          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-container border border-outline-variant/30 text-sm">
            <span className="text-on-surface-variant">Est. Payout</span>
            <span className="text-secondary font-bold font-mono">{estPayout}</span>
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
            Points are deducted immediately. A bet can only be cancelled while its leg hasn't started.
          </p>
        </div>
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
            Pick a leg, review each horse's condition and odds, and lock in your prediction.
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
