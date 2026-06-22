import { useState, useEffect, useMemo, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Flag, AlertCircle, Info, Lock, CheckCircle2, ChevronLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  getAllRaces, getRaceDetail, getAllEntries, getAllHorses,
  getAllUsers, submitLegResult,
} from '../../api/referee'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Pick Race Screen (when no raceId given) ──────────────────────────────────

function RacePickerScreen({ userId, onPick }) {
  const [races,   setRaces]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const list = await getAllRaces()
        const details = await Promise.allSettled(list.map(r => getRaceDetail(r.raceId)))
        const myInProgress = details
          .filter(r => r.status === 'fulfilled')
          .map(r => r.value)
          .filter(r => (r.referee1Id === userId || r.referee2Id === userId) &&
                       r.status?.replace(/\s+/g, '') === 'InProgress')
        setRaces(myInProgress)
      } catch { /* silent */ }
      finally { setLoading(false) }
    }
    load()
  }, [userId])

  if (loading) return (
    <div className="flex items-center justify-center py-40">
      <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="py-16 text-center">
      <Flag size={40} className="text-on-surface-variant/30 mx-auto mb-4" />
      {races.length === 0 ? (
        <>
          <p className="text-on-surface font-semibold">No races in progress</p>
          <p className="text-on-surface-variant text-sm mt-1">
            Races will appear here once they are started.
          </p>
        </>
      ) : (
        <>
          <p className="text-on-surface font-semibold mb-6">Select an in-progress race:</p>
          <div className="flex flex-col gap-3 max-w-sm mx-auto">
            {races.map(race => (
              <button
                key={race.raceId}
                onClick={() => onPick(race)}
                className="gs-card p-4 text-left hover:border-yellow-400/30 transition-all"
              >
                <p className="font-bold text-on-surface text-sm">{race.name}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">{fmtDateTime(race.scheduledStartTime)}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Position Select ──────────────────────────────────────────────────────────

function PositionSelect({ value, onChange, maxN, locked }) {
  if (locked) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20 text-sm font-bold font-mono text-primary">
        <Lock size={12} />
        {value === 'DNF' ? 'DNF' : value || '—'}
      </span>
    )
  }
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-2 py-1.5 text-sm font-mono text-on-surface focus:outline-none focus:border-yellow-400/60 transition-all w-20"
    >
      <option value="">—</option>
      {Array.from({ length: maxN }, (_, i) => i + 1).map(n => (
        <option key={n} value={String(n)}>{n}</option>
      ))}
      <option value="DNF">DNF</option>
    </select>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RefereeResultEntryPage() {
  const { user }   = useAuth()
  const location   = useLocation()
  const navigate   = useNavigate()
  const userId     = user?.userId

  const raceIdFromState = location.state?.raceId ?? null
  const readOnly        = location.state?.readOnly ?? false

  const [race,          setRace]          = useState(null)
  const [entries,       setEntries]       = useState([])
  const [horseMap,      setHorseMap]      = useState({})
  const [userMap,       setUserMap]       = useState({})
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [activeTab,     setActiveTab]     = useState(1) // leg number
  const [legPositions,  setLegPositions]  = useState({}) // {legNum: {entryId: '' | '1' | 'DNF'}}
  const [submittedLegs, setSubmittedLegs] = useState(new Set())
  const [submitting,    setSubmitting]    = useState(false)
  const [submitError,   setSubmitError]   = useState('')

  const loadRace = useCallback(async (raceId) => {
    setLoading(true)
    setError('')
    try {
      const [detail, allE, allH, allU] = await Promise.all([
        getRaceDetail(raceId),
        getAllEntries(),
        getAllHorses(),
        getAllUsers(),
      ])
      const raceEntries = allE.filter(e => e.raceId === raceId && e.status === 'Approved')
      const hMap = Object.fromEntries(allH.map(h => [h.horseId, h]))
      const uMap = Object.fromEntries(allU.map(u => [u.userId, u]))

      setRace(detail)
      setEntries(raceEntries)
      setHorseMap(hMap)
      setUserMap(uMap)

      // Init position state for all legs
      const initPos = {}
      for (let leg = 1; leg <= (detail.numberOfLegs ?? 1); leg++) {
        initPos[leg] = {}
        for (const e of raceEntries) {
          initPos[leg][e.entryId] = ''
        }
      }
      setLegPositions(initPos)
    } catch (err) {
      setError(err?.message || 'Không tải được thông tin cuộc đua')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (raceIdFromState) loadRace(raceIdFromState)
  }, [raceIdFromState, loadRace])

  // ── Position helpers ──
  function setPosition(legNum, entryId, value) {
    setLegPositions(prev => ({
      ...prev,
      [legNum]: { ...(prev[legNum] ?? {}), [entryId]: value },
    }))
  }

  const isLegValid = useCallback((legNum) => {
    const pos  = legPositions[legNum] ?? {}
    const vals = Object.values(pos)
    if (vals.some(v => v === '')) return false
    const nums = vals.filter(v => v !== 'DNF').map(Number)
    return new Set(nums).size === nums.length
  }, [legPositions])

  const handleSubmit = async () => {
    if (!race) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const results = entries.map(e => ({
        entryId:       e.entryId,
        finishPosition: legPositions[activeTab]?.[e.entryId] === 'DNF'
          ? null
          : Number(legPositions[activeTab]?.[e.entryId]),
      }))
      await submitLegResult({ raceId: race.raceId, legNumber: activeTab, results })
      setSubmittedLegs(prev => new Set([...prev, activeTab]))
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || 'Submit thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  const coRefId   = race ? (race.referee1Id === userId ? race.referee2Id : race.referee1Id) : null
  const coRefName = coRefId ? (userMap[coRefId]?.fullName ?? `User #${coRefId}`) : '—'

  const legs      = race ? Array.from({ length: race.numberOfLegs ?? 1 }, (_, i) => i + 1) : []
  const isLocked  = submittedLegs.has(activeTab) || readOnly

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-[900px] mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8 animate-fade-in-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
          <button
            onClick={() => navigate('/referee')}
            className="w-9 h-9 rounded-xl border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/25 flex items-center justify-center">
            <Flag size={20} className="text-yellow-400" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-on-surface">Result Entry</h1>
            <p className="text-on-surface-variant text-sm">Record finishing positions for each race leg.</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />{error}
          </div>
        )}

        {/* No race selected */}
        {!raceIdFromState && !loading && (
          <div className="gs-card">
            <div className="px-5 py-4 border-b border-outline-variant/40">
              <p className="font-semibold text-on-surface text-sm">Select Race</p>
            </div>
            <RacePickerScreen userId={userId} onPick={r => loadRace(r.raceId)} />
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-40">
            <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        )}

        {race && !loading && (
          <>
            {/* Race header */}
            <div
              className="gs-card p-6 mb-6"
              style={{ borderLeft: '3px solid rgba(251, 191, 36, 0.6)' }}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/25 uppercase tracking-wider">
                      {readOnly ? 'Finished' : 'Live Event'}
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      {fmtDateTime(race.scheduledStartTime || race.scheduledAt)}
                    </span>
                  </div>
                  <h2 className="font-serif text-3xl font-bold text-on-surface mb-1">{race.name}</h2>
                  <p className="text-sm text-on-surface-variant flex items-center gap-1.5">
                    Co-Referee:
                    <span className="text-on-surface font-semibold">{coRefName}</span>
                    <span className="text-xs text-on-surface-variant/60">(Pending Entry)</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Confirmed banner */}
            {submittedLegs.has(activeTab) && (
              <div className="mb-4 p-4 rounded-xl bg-primary/5 border border-primary/25 flex items-start gap-3">
                <CheckCircle2 size={18} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-primary">Leg {activeTab} Confirmed — Awaiting Co-Referee</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Your submission has been saved. Results will lock once Co-Referee submits matching data.
                  </p>
                </div>
              </div>
            )}

            {/* Leg tabs */}
            <div className="flex items-center gap-1 border-b border-outline-variant/40 mb-6">
              {legs.map(leg => (
                <button
                  key={leg}
                  onClick={() => setActiveTab(leg)}
                  className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all -mb-px
                    ${activeTab === leg
                      ? 'border-yellow-400 text-yellow-400'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                  Leg {leg}
                  {submittedLegs.has(leg) && (
                    <span className="ml-1.5 w-1.5 h-1.5 inline-block rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>

            {/* Result entry card */}
            <div className="gs-card overflow-hidden">
              {/* Card header */}
              <div className="px-5 py-4 border-b border-outline-variant/40 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-on-surface text-sm">
                    Leg {activeTab} Result Entry — Your Submission (Private)
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Enter the finishing positions as you observed them. Your entries remain hidden from other referees until all submissions are complete.
                  </p>
                </div>
                <span className={`shrink-0 text-[11px] font-bold px-3 py-1 rounded-lg border uppercase tracking-wider
                  ${isLocked
                    ? 'bg-primary/10 text-primary border-primary/25'
                    : 'bg-surface-container-high text-on-surface-variant border-outline-variant/40'
                  }`}
                >
                  Status: {isLocked ? 'Locked' : 'Open'}
                </span>
              </div>

              {/* Privacy note */}
              <div className="px-5 py-3 border-b border-outline-variant/30 bg-yellow-400/3">
                <p className="text-xs text-on-surface-variant flex items-center gap-2">
                  <Info size={13} className="text-yellow-400/60 shrink-0" />
                  Note: Other referees cannot see your input. Discrepancies will trigger a manual review flag.
                </p>
              </div>

              {/* Entries table */}
              {entries.length === 0 ? (
                <div className="py-16 text-center text-on-surface-variant text-sm">
                  No approved entries found for this race.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Entry</th>
                        <th>Horse</th>
                        <th>Jockey</th>
                        <th>Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry, i) => (
                        <tr key={entry.entryId}>
                          <td className="font-mono text-sm text-on-surface-variant font-bold">
                            #{String(entry.gateNumber ?? (i + 1)).padStart(2, '0')}
                          </td>
                          <td className="font-bold text-on-surface text-sm">
                            {horseMap[entry.horseId]?.name ?? `Horse #${entry.horseId}`}
                          </td>
                          <td className="text-sm text-on-surface-variant">—</td>
                          <td>
                            <PositionSelect
                              value={legPositions[activeTab]?.[entry.entryId] ?? ''}
                              onChange={val => setPosition(activeTab, entry.entryId, val)}
                              maxN={entries.length}
                              locked={isLocked}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Footer */}
              <div className="px-5 py-4 border-t border-outline-variant/40 flex items-center justify-between gap-4">
                <p className="text-xs text-on-surface-variant/60 italic">
                  Validation: Each position must be unique.
                </p>
                <div className="flex items-center gap-3">
                  {submitError && (
                    <p className="text-xs text-error">{submitError}</p>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={isLocked || !isLegValid(activeTab) || submitting}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all
                      ${!isLocked && isLegValid(activeTab)
                        ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                        : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
                      } disabled:opacity-60`}
                  >
                    {isLocked ? <Lock size={14} /> : null}
                    {submitting ? 'Submitting…' : `Submit Leg ${activeTab} Results`}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
