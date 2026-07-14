import { Fragment, useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList, AlertCircle, SlidersHorizontal,
  ChevronLeft, ChevronRight, X, CheckSquare, Square,
  Zap, Flag, Users, ArrowUpDown,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  getAllRaces, getRaceDetail, getAllTournaments, getAllUsers,
  getAllEntries, getAllHorses, startRace,
} from '../../api/referee'

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

const STATUS_META = {
  InProgress:    { label: 'In Progress',    cls: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/25' },
  Scheduled:     { label: 'Scheduled',      cls: 'bg-primary/10 text-primary border border-primary/20' },
  Paused:        { label: 'Paused',         cls: 'bg-orange-500/10 text-orange-400 border border-orange-500/25' },
  PendingResult: { label: 'Pending Result', cls: 'bg-blue-400/10 text-blue-400 border border-blue-400/25' },
  Finished:      { label: 'Finished',       cls: 'bg-surface-container-high text-on-surface-variant border border-outline-variant/40' },
  Cancelled:     { label: 'Cancelled',      cls: 'bg-error/10 text-error border border-error/20' },
}

const STATUS_FILTER_OPTIONS = Object.keys(STATUS_META)

function getStatusMeta(s) {
  const key = s?.replace(/\s+/g, '')
  return STATUS_META[key] ?? { label: s ?? '—', cls: 'bg-surface-container-high text-on-surface-variant border border-outline-variant/40' }
}

function fmtDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// ─── Race Control Modal ────────────────────────────────────────────────────────

function RaceControlModal({ race, tournament, coReferee, userMap, onClose, onStarted }) {
  const [checklist, setChecklist] = useState({ entries: false, referees: false, track: false })
  const [entries,   setEntries]   = useState([])
  const [horseMap,  setHorseMap]  = useState({})
  const [starting,  setStarting]  = useState(false)
  const [startErr,  setStartErr]  = useState('')
  const [loadingEntries, setLoadingEntries] = useState(true)

  const allChecked = Object.values(checklist).every(Boolean)

  useEffect(() => {
    async function loadEntries() {
      try {
        const [allE, allH] = await Promise.all([getAllEntries(), getAllHorses()])
        const raceEntries  = allE.filter(e => e.raceId === race.raceId)
        const hMap         = Object.fromEntries(allH.map(h => [h.horseId, h]))
        setEntries(raceEntries)
        setHorseMap(hMap)
      } catch { /* silent */ }
      finally { setLoadingEntries(false) }
    }
    loadEntries()
  }, [race.raceId])

  const toggle = (key) => setChecklist(p => ({ ...p, [key]: !p[key] }))

  const handleStart = async () => {
    setStarting(true)
    setStartErr('')
    try {
      await startRace(race.raceId)
      onStarted()
    } catch (err) {
      setStartErr(err?.response?.data?.message || err?.message || 'Could not start race')
    } finally {
      setStarting(false)
    }
  }

  const CHECKLIST_ITEMS = [
    { key: 'entries',  label: 'Entries Verified',   desc: `All ${entries.length} horses and jockeys are weighed in and verified in the paddock.` },
    { key: 'referees', label: 'Referees Assigned',  desc: `2/2 Referees on station. ${coReferee ? `Co-Referee ${coReferee.fullName} confirmed.` : 'Co-Referee pending.'}` },
    { key: 'track',    label: 'Track Cleared',       desc: 'Ensure all personnel and equipment are off the turf before authorizing start.' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-[780px] gs-card overflow-hidden animate-fade-in-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/40">
          <div>
            <p className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-1">Race Control</p>
            <p className="text-xs text-on-surface-variant">{fmtDateTime(race.scheduledStartTime || race.scheduledAt)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Race headline */}
        <div className="px-6 py-5 border-b border-outline-variant/40" style={{ background: 'linear-gradient(90deg, #1a1400 0%, #0b141c 100%)' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-yellow-400/60 uppercase tracking-widest mb-1">
                {tournament?.name ?? '—'}
              </p>
              <h2 className="font-serif text-2xl font-bold text-on-surface">{race.name}</h2>
              <p className="text-on-surface-variant text-sm mt-1">
                {race.roundType ?? '—'} · {race.numberOfLegs ?? 1} Legs
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-on-surface-variant mb-1">Entries</p>
              <p className="text-2xl font-bold font-mono text-on-surface">{entries.length}</p>
              <p className="text-xs text-yellow-400 font-bold mt-0.5">Awaiting Start</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-0">
          {/* Left: checklist */}
          <div className="px-6 py-5 border-r border-outline-variant/40">
            <h3 className="text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
              <ClipboardList size={15} className="text-secondary" />
              Pre-Race Checklist
            </h3>
            <div className="space-y-3">
              {CHECKLIST_ITEMS.map(({ key, label, desc }) => {
                const checked = checklist[key]
                return (
                  <button
                    key={key}
                    onClick={() => toggle(key)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all
                      ${checked
                        ? 'bg-primary/5 border-primary/25'
                        : 'bg-surface-container-low border-outline-variant/30 hover:border-outline-variant'
                      }`}
                  >
                    {checked
                      ? <CheckSquare size={16} className="text-primary shrink-0 mt-0.5" />
                      : <Square     size={16} className="text-on-surface-variant shrink-0 mt-0.5" />
                    }
                    <div>
                      <p className={`text-sm font-semibold ${checked ? 'text-primary' : 'text-on-surface'}`}>{label}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right: start panel */}
          <div className="px-5 py-5 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-outline-variant/40 flex items-center justify-center">
              <Flag size={24} className={allChecked ? 'text-yellow-400' : 'text-on-surface-variant/40'} />
            </div>
            <div className="text-center">
              <p className="font-bold text-on-surface text-sm">Ready to Start?</p>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                Ensure all checklist items are complete before initiating the race sequence.
              </p>
            </div>

            {startErr && (
              <p className="text-xs text-error text-center">{startErr}</p>
            )}

            <button
              onClick={handleStart}
              disabled={!allChecked || starting}
              className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all
                ${allChecked
                  ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                  : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
                } disabled:opacity-60`}
            >
              <Zap size={15} />
              {starting ? 'Starting…' : 'Start Race'}
            </button>

            {!allChecked && (
              <p className="text-[11px] text-on-surface-variant text-center">Complete all checklist items first.</p>
            )}
          </div>
        </div>

        {/* Key Entries */}
        {loadingEntries ? null : entries.length > 0 && (
          <div className="px-6 py-4 border-t border-outline-variant/40">
            <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Users size={12} /> Key Entries
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {entries.slice(0, 3).map((e, i) => (
                <div key={e.entryId} className="gs-card px-4 py-3 min-w-[160px] shrink-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-6 h-6 rounded-full bg-secondary/20 text-secondary text-xs font-bold flex items-center justify-center border border-secondary/30">
                      {i + 1}
                    </span>
                    <span className="text-[10px] text-on-surface-variant">GATE {e.gateNumber ?? '—'}</span>
                  </div>
                  <p className="text-sm font-bold text-on-surface">Entry #{e.entryId}</p>
                  <p className="text-xs text-on-surface-variant">J: —</p>
                </div>
              ))}
              {entries.length > 3 && (
                <div className="gs-card px-4 py-3 min-w-[120px] shrink-0 flex items-center justify-center">
                  <p className="text-xs text-on-surface-variant font-semibold">View All {entries.length}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RefereeAssignedRacesPage() {
  const { user }     = useAuth()
  const navigate     = useNavigate()
  const userId       = user?.userId

  const [races,       setRaces]       = useState([])
  const [userMap,     setUserMap]     = useState({})
  const [tourneyMap,  setTourneyMap]  = useState({})
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [page,        setPage]        = useState(1)
  const [search,      setSearch]      = useState('')
  const [tourneyFilter, setTourneyFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortOrder,   setSortOrder]   = useState('asc') // 'asc' = soonest first, 'desc' = newest first
  const [modal,       setModal]       = useState(null) // race object for Race Control

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError('')
    try {
      const [basicList, allTourneys, allUsers] = await Promise.all([
        getAllRaces(),
        getAllTournaments(),
        getAllUsers(),
      ])

      const uMap = Object.fromEntries(allUsers.map(u => [u.userId, u]))
      const tMap = Object.fromEntries(allTourneys.map(t => [t.tournamentId, t]))

      // Fetch details for all races (to get referee IDs)
      const details = await Promise.allSettled(
        basicList.map(r => getRaceDetail(r.raceId))
      )

      const myRaces = details
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)
        .filter(r => r.referee1Id === userId || r.referee2Id === userId)

      setRaces(myRaces)
      setUserMap(uMap)
      setTourneyMap(tMap)
    } catch (err) {
      setError(err?.message || 'Failed to load the race list')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  const tournamentOptions = useMemo(() => {
    const seen = new Map()
    races.forEach(r => {
      const t = tourneyMap[r.tournamentId]
      if (t && !seen.has(t.tournamentId)) seen.set(t.tournamentId, t.name)
    })
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [races, tourneyMap])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return races
      .filter(r =>
        r.name?.toLowerCase().includes(q) ||
        tourneyMap[r.tournamentId]?.name?.toLowerCase().includes(q)
      )
      .filter(r => tourneyFilter === 'all' || String(r.tournamentId) === tourneyFilter)
      .filter(r => statusFilter === 'all' || r.status?.replace(/\s+/g, '') === statusFilter)
      .sort((a, b) => {
        const tA = tourneyMap[a.tournamentId]?.name ?? ''
        const tB = tourneyMap[b.tournamentId]?.name ?? ''
        if (tA !== tB) return tA.localeCompare(tB)
        const dA = new Date(a.scheduledStartTime || a.scheduledAt || 0)
        const dB = new Date(b.scheduledStartTime || b.scheduledAt || 0)
        return sortOrder === 'asc' ? dA - dB : dB - dA
      })
  }, [races, search, tourneyFilter, statusFilter, sortOrder, tourneyMap])

  // Race count per tournament, computed over the full filtered list (not just the visible page)
  // so the group header count stays correct across pagination.
  const tournamentCounts = useMemo(() => {
    const counts = {}
    filtered.forEach(r => { counts[r.tournamentId] = (counts[r.tournamentId] ?? 0) + 1 })
    return counts
  }, [filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function getCoRefereeId(race) {
    return race.referee1Id === userId ? race.referee2Id : race.referee1Id
  }

  function handleAction(race) {
    const s = race.status?.replace(/\s+/g, '')
    if (['InProgress', 'Finished', 'Paused', 'PendingResult'].includes(s)) navigate(`/referee/races/${race.raceId}`)
    else setModal(race)
  }

  const actionLabel = (race) => {
    const s = race.status?.replace(/\s+/g, '')
    if (s === 'InProgress')    return 'Enter Results'
    if (s === 'Paused')        return 'View Conflict'
    if (s === 'PendingResult') return 'View Standings'
    if (s === 'Finished')      return 'View Results'
    return 'View Details'
  }

  const actionCls = (race) => {
    const s = race.status?.replace(/\s+/g, '')
    if (s === 'InProgress') return 'bg-yellow-400 text-black hover:bg-yellow-300 font-bold'
    return 'gs-btn gs-btn-ghost'
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-[1100px] mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div className="animate-fade-in-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/25 flex items-center justify-center">
                <ClipboardList size={20} className="text-yellow-400" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold text-on-surface">My Assigned Races</h1>
                <p className="text-on-surface-variant text-sm">Manage and record results for your upcoming and ongoing events.</p>
              </div>
            </div>
            <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-yellow-400 to-secondary mt-3" />
          </div>

          <div className="flex items-center gap-3">
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search races…"
              className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-yellow-400/50 w-52 transition-all"
            />
            <div className="relative">
              <select
                value={tourneyFilter}
                onChange={e => { setTourneyFilter(e.target.value); setPage(1) }}
                className="appearance-none bg-surface-container-lowest border border-outline-variant/50 rounded-xl pl-4 pr-9 py-2 text-sm text-on-surface focus:outline-none focus:border-yellow-400/50 transition-all cursor-pointer"
              >
                <option value="all">All Tournaments</option>
                {tournamentOptions.map(t => (
                  <option key={t.id} value={String(t.id)}>{t.name}</option>
                ))}
              </select>
              <SlidersHorizontal size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
                className="appearance-none bg-surface-container-lowest border border-outline-variant/50 rounded-xl pl-4 pr-9 py-2 text-sm text-on-surface focus:outline-none focus:border-yellow-400/50 transition-all cursor-pointer"
              >
                <option value="all">All Statuses</option>
                {STATUS_FILTER_OPTIONS.map(s => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </select>
              <SlidersHorizontal size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
            </div>
            <button
              onClick={() => setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))}
              title={sortOrder === 'asc' ? 'Soonest first' : 'Newest first'}
              className="gs-btn gs-btn-ghost flex items-center gap-2 shrink-0"
            >
              <ArrowUpDown size={14} />
              {sortOrder === 'asc' ? 'Soonest first' : 'Newest first'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />{error}
          </div>
        )}

        {/* Table */}
        <div className="gs-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
            </div>
          ) : paginated.length === 0 ? (
            <div className="py-24 text-center">
              <ClipboardList size={40} className="text-on-surface-variant/30 mx-auto mb-4" />
              <p className="text-on-surface font-semibold">{search ? 'No races match your search' : 'No assigned races'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Race</th>
                    <th>Date &amp; Time</th>
                    <th>Distance</th>
                    <th>Co-Referee</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((race, i) => {
                    const coRefId   = getCoRefereeId(race)
                    const coRef     = userMap[coRefId]
                    const tournament = tourneyMap[race.tournamentId]
                    const meta       = getStatusMeta(race.status)
                    const prevRace   = paginated[i - 1]
                    const showGroupHeader = i === 0 || prevRace.tournamentId !== race.tournamentId

                    return (
                      <Fragment key={race.raceId}>
                        {showGroupHeader && (
                          <tr key={`group-${race.tournamentId}-${i}`} className="!bg-surface-container-low/60">
                            <td colSpan={6} className="!py-2">
                              <div className="flex items-center gap-2">
                                <div className="h-4 w-1 rounded-full bg-yellow-400/60" />
                                <span className="text-xs font-bold text-yellow-400/90 uppercase tracking-wider">
                                  {tournament?.name ?? 'Unassigned Tournament'}
                                </span>
                                <span className="text-[11px] text-on-surface-variant">
                                  {tournamentCounts[race.tournamentId] ?? 1} race{(tournamentCounts[race.tournamentId] ?? 1) > 1 ? 's' : ''}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr
                          key={race.raceId}
                          className={`animate-fade-in-up delay-row-${(i % 4) + 1}`}
                          style={{ opacity: 0, animationFillMode: 'forwards' }}
                        >
                          <td>
                            <p className="font-bold text-on-surface text-sm">{race.name}</p>
                            <p className="text-xs text-on-surface-variant mt-0.5">Race #{race.raceId}</p>
                          </td>
                          <td className="text-sm text-on-surface-variant whitespace-nowrap">
                            {fmtDateTime(race.scheduledStartTime || race.scheduledAt)}
                          </td>
                          <td className="text-sm text-on-surface-variant">—</td>
                          <td>
                            {coRef ? (
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-secondary/10 border border-secondary/25 flex items-center justify-center text-[10px] font-bold text-secondary">
                                  {getInitials(coRef.fullName)}
                                </div>
                                <span className="text-sm text-on-surface-variant">{coRef.fullName}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-on-surface-variant">—</span>
                            )}
                          </td>
                          <td>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${meta.cls}`}>
                              {meta.label}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => handleAction(race)}
                              className={`px-4 py-1.5 rounded-lg text-sm transition-all ${actionCls(race)}`}
                            >
                              {actionLabel(race)}
                            </button>
                          </td>
                        </tr>
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant/40">
              <span className="text-xs text-on-surface-variant">
                Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} assignments
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="gs-btn gs-btn-ghost gs-btn-sm px-2">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="gs-btn gs-btn-ghost gs-btn-sm px-2">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Race Control Modal */}
        {modal && (
          <RaceControlModal
            race={modal}
            tournament={tourneyMap[modal.tournamentId]}
            coReferee={userMap[getCoRefereeId(modal)]}
            userMap={userMap}
            onClose={() => setModal(null)}
            onStarted={() => { setModal(null); load() }}
          />
        )}

      </div>
    </div>
  )
}
