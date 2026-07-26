import { useEffect, useState } from 'react'
import { X, Trophy, AlertTriangle } from 'lucide-react'

// Cross-role "final results" view for a Finished/published race. Combines two sources:
//   - GET /api/races/{id}/standings — has HorseName/JockeyName/GateNumber (not owner-scoped,
//     unlike /api/entries which HORSE_OWNER can only see its own rows for).
//   - GET /api/race-results — the official post-publish record (correct tie-break, IsRaceDQ),
//     written once at Publish and immutable after.
// Callers inject their own role-scoped api functions so this component stays role-agnostic.
export default function RaceResultsModal({ raceId, raceName, onClose, fetchStandings, fetchResults, footer }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])
  // True once Publish has actually run (GET /api/race-results has rows for this race).
  // Before that, callers may still open this same modal as a Publish preview — in that
  // case there's no official finalPosition yet, so fall back to the live standings' own
  // provisional Position (same ranking Publish will persist) instead of showing "—" for
  // every single row.
  const [hasOfficialResults, setHasOfficialResults] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')
      try {
        const [standings, results] = await Promise.all([
          fetchStandings(raceId),
          fetchResults(),
        ])
        if (!active) return

        const raceResults = (results ?? []).filter((r) => r.raceId === raceId)
        const resultByEntry = new Map(raceResults.map((r) => [r.entryId, r]))
        if (!active) return
        setHasOfficialResults(raceResults.length > 0)

        const merged = (standings ?? []).map((s) => {
          const r = resultByEntry.get(s.entryId)
          return {
            entryId: s.entryId,
            gateNumber: s.gateNumber,
            horseName: s.horseName,
            jockeyName: s.jockeyName,
            totalPoints: r?.totalPoints ?? s.totalPoints,
            finalPosition: r?.finalPosition ?? s.position ?? null,
            isRaceDQ: r?.isRaceDQ ?? false,
          }
        })

        merged.sort((a, b) => {
          if (a.isRaceDQ !== b.isRaceDQ) return a.isRaceDQ ? 1 : -1
          if (a.finalPosition == null && b.finalPosition == null) return 0
          if (a.finalPosition == null) return 1
          if (b.finalPosition == null) return -1
          return a.finalPosition - b.finalPosition
        })

        setRows(merged)
      } catch (e) {
        setError(e?.response?.data?.detail || e?.response?.data?.title || e?.message || 'Failed to load results.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [raceId, fetchStandings, fetchResults])

  const medalFor = (pos) => (pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      {/* .admin-table (used below) carries a global min-width:820px — the modal must be at
          least that wide, otherwise the table forces its own horizontal scrollbar and the
          user can't see the full row at a glance. */}
      <div className="w-full max-w-[880px] gs-card overflow-hidden animate-fade-in-up max-h-[85vh] flex flex-col" style={{ opacity: 0, animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <Trophy size={17} className="text-yellow-400" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-on-surface text-sm">Race Results</h2>
                {!loading && !hasOfficialResults && rows.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                    Provisional — not yet published
                  </span>
                )}
              </div>
              {raceName && <p className="text-xs text-on-surface-variant">{raceName}</p>}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-error flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />{error}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-on-surface-variant text-center">No results found for this race.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Pos</th>
                  <th>Gate</th>
                  <th>Horse</th>
                  <th>Jockey</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.entryId}>
                    <td className="font-mono text-sm font-bold">
                      {r.isRaceDQ ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/25">DQ</span>
                      ) : (
                        <span className="text-on-surface">{medalFor(r.finalPosition) ?? `#${r.finalPosition ?? '—'}`}</span>
                      )}
                    </td>
                    <td className="text-sm text-on-surface-variant">{r.gateNumber ?? '—'}</td>
                    <td className="text-sm font-semibold text-on-surface">{r.horseName}</td>
                    <td className="text-sm text-on-surface-variant">{r.jockeyName}</td>
                    <td className="text-sm font-mono text-on-surface">{r.totalPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {footer && <div className="shrink-0">{footer}</div>}
      </div>
    </div>
  )
}
