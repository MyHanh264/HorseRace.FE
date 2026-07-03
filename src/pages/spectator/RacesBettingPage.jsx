import { useState, useEffect, useMemo, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Flag, Search, Clock, AlertCircle, X, CheckCircle, ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  getAllRaces, getRaceDetail, getAllEntries, getAllHorses,
  getAllTournaments, getMyWallet, getMyPredictions, placePrediction,
} from '../../api/spectator'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_META = {
  Scheduled:  { label: 'Scheduled',  cls: 'bg-primary/15 text-primary border border-primary/25' },
  InProgress: { label: 'Live',       cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/25' },
  Finished:   { label: 'Finished',   cls: 'bg-surface-container-high text-on-surface-variant border border-outline-variant/50' },
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

// ─── Bet Panel ────────────────────────────────────────────────────────────────

function BetPanel({ race, raceDetail, entries, horseMap, wallet, myPredictions, onBetPlaced }) {
  const { user } = useAuth()

  const [selectedEntryId, setSelectedEntryId] = useState('')
  const [betAmount, setBetAmount]             = useState('')
  const [submitting, setSubmitting]           = useState(false)
  const [betError, setBetError]               = useState('')
  const [betSuccess, setBetSuccess]           = useState(false)

  const balance      = Number(wallet?.balance ?? 0)
  const alreadyBet   = myPredictions.some(p => p.raceId === race.raceId)
  const canBet       = race.status === 'Scheduled' && !alreadyBet
  const amount       = Number(betAmount) || 0
  const estPayout    = selectedEntryId && amount > 0 ? `~${fmtBalance(amount * 2)} pts` : '—'

  const validate = () => {
    if (!selectedEntryId) return 'Hãy chọn ngựa đua.'
    if (amount < 10) return 'Đặt cược tối thiểu là 10 điểm.'
    if (amount > balance * 0.5) return `Tối đa 50% số dư (${fmtBalance(balance * 0.5)} pts).`
    if (amount > balance) return 'Số dư không đủ.'
    return null
  }

  const handlePlaceBet = async () => {
    const err = validate()
    if (err) { setBetError(err); return }
    setSubmitting(true)
    setBetError('')
    try {
      await placePrediction({
        raceId:        race.raceId,
        spectatorId:   user.userId,
        firstEntryId:  Number(selectedEntryId),
        secondEntryId: Number(selectedEntryId),
        thirdEntryId:  Number(selectedEntryId),
        betAmount:     amount,
        oddsLocked1:   1.0,
        oddsLocked2:   1.0,
        oddsLocked3:   1.0,
      })
      setBetSuccess(true)
      setBetAmount('')
      setSelectedEntryId('')
      onBetPlaced?.()
    } catch (err) {
      setBetError(err?.response?.data?.message || err?.message || 'Đặt cược thất bại')
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
        </div>
        <p className="text-xs text-on-surface-variant">
          {raceDetail?.numberOfLegs ?? '—'} Legs · {raceDetail?.roundType ?? '—'} · Max {raceDetail?.maxHorses ?? '—'} horses
        </p>
      </div>

      {/* Contenders */}
      {entries.length > 0 && (
        <div>
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Top Contenders Odds</p>
          <div className="space-y-2">
            {entries.slice(0, 4).map(e => {
              const horse = horseMap[e.horseId]
              return (
                <div key={e.entryId} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-surface-container-high border border-outline-variant/40 flex items-center justify-center text-xs font-bold text-on-surface-variant">
                      {horse?.name?.charAt(0) ?? '?'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{horse?.name ?? `Entry #${e.entryId}`}</p>
                    </div>
                  </div>
                  <span className="text-secondary font-bold font-mono text-sm">—</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Bet form */}
      <div className="border-t border-outline-variant/40 pt-4">
        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Your Prediction</p>

        {betSuccess && (
          <div className="mb-3 p-3 rounded-lg bg-primary/10 border border-primary/25 text-primary text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            Đặt cược thành công!
          </div>
        )}

        {alreadyBet && !betSuccess && (
          <div className="mb-3 p-3 rounded-lg bg-surface-container border border-outline-variant/40 text-on-surface-variant text-sm">
            Bạn đã đặt cược cho cuộc đua này.
          </div>
        )}

        {!alreadyBet && !betSuccess && (
          <>
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
                  disabled={!canBet}
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all"
                >
                  <option value="">Select Entry...</option>
                  {entries.filter(e => e.status === 'Approved').map(e => (
                    <option key={e.entryId} value={e.entryId}>
                      {horseMap[e.horseId]?.name ?? `Entry #${e.entryId}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Bet Amount (Pts)</label>
                <input
                  type="number"
                  min={10}
                  max={balance * 0.5}
                  value={betAmount}
                  onChange={e => { setBetAmount(e.target.value); setBetError('') }}
                  disabled={!canBet}
                  placeholder="0"
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
                />
              </div>

              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-container border border-outline-variant/30 text-sm">
                <span className="text-on-surface-variant">Est. Payout</span>
                <span className="text-secondary font-bold font-mono">{estPayout}</span>
              </div>

              <button
                onClick={handlePlaceBet}
                disabled={!canBet || submitting}
                className="gs-btn gs-btn-secondary w-full justify-center flex items-center gap-2"
              >
                {submitting && <div className="w-3 h-3 border-2 border-on-secondary/30 border-t-on-secondary rounded-full animate-spin" />}
                Place Bet
              </button>

              <p className="text-center text-[11px] text-on-surface-variant">
                Current Balance: <span className="font-bold text-on-surface">{fmtBalance(balance)} pts</span>
              </p>
              {race.status === 'Scheduled' && (
                <p className="text-center text-[11px] text-error/70">
                  Points will be deducted immediately. Bets lock 5 mins before start.
                </p>
              )}
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
  const [allEntries,   setAllEntries]   = useState([])
  const [horseMap,     setHorseMap]     = useState({})
  const [tournamentMap,setTournamentMap]= useState({})
  const [wallet,       setWallet]       = useState(null)
  const [myPredictions,setMyPredictions]= useState([])

  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [activeTab,  setActiveTab]  = useState('All Scheduled')
  const [search,     setSearch]     = useState('')
  const [selectedId, setSelectedId] = useState(location.state?.selectedRaceId ?? null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [races, entries, horses, tournaments, w, preds] = await Promise.all([
        getAllRaces(),
        getAllEntries(),
        getAllHorses(),
        getAllTournaments(),
        getMyWallet(user?.userId),
        getMyPredictions(user?.userId),
      ])
      setAllRaces(Array.isArray(races) ? races : [])
      setAllEntries(Array.isArray(entries) ? entries : [])
      setHorseMap(Object.fromEntries((Array.isArray(horses) ? horses : []).map(h => [h.horseId, h])))
      setTournamentMap(Object.fromEntries((Array.isArray(tournaments) ? tournaments : []).map(t => [t.tournamentId, t])))
      setWallet(w)
      setMyPredictions(Array.isArray(preds) ? preds : [])

      // Fetch race details for selected or all in view (lazy)
      if (selectedId) {
        const detail = await getRaceDetail(selectedId)
        setRaceDetails(prev => ({ ...prev, [selectedId]: detail }))
      }
    } catch (err) {
      setError(err?.message || 'Không tải được dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [user?.userId, selectedId])

  useEffect(() => { load() }, [load])

  // Fetch detail when a race is selected
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
    else if (activeTab === 'Live')     list = list.filter(r => r.status === 'InProgress')
    else                               list = list.filter(r => r.status === 'Finished')

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r => r.name.toLowerCase().includes(q))
    }
    return list
  }, [allRaces, activeTab, search])

  const selectedRace   = allRaces.find(r => r.raceId === selectedId) ?? filteredRaces[0] ?? null
  const selectedDetail = selectedRace ? raceDetails[selectedRace.raceId] : null
  const selectedEntries = selectedRace ? allEntries.filter(e => e.raceId === selectedRace.raceId) : []

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-[1200px] mx-auto">

        {/* Header */}
        <div className="mb-8 animate-fade-in-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
          <h1 className="font-serif text-3xl font-bold text-on-surface">Races &amp; Betting</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Analyze form, review odds, and lock in your predictions for the upcoming meets.
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
                  Không có cuộc đua nào.
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
                race={selectedRace}
                raceDetail={selectedDetail}
                entries={selectedEntries}
                horseMap={horseMap}
                wallet={wallet}
                myPredictions={myPredictions}
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
