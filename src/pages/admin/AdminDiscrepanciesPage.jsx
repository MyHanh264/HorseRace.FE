import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, AlertTriangle, ShieldAlert, X, ChevronLeft, ChevronRight } from "lucide-react";
import { getRaces, getRaceExecutionStatus } from "../../api/admin";

const POLL_MS = 15_000;
const PAGE_SIZE = 10;

// This page is the single place to discover & resolve leg conflicts (the 2 referees
// submitted mismatched results for a leg, pausing the race). Resolution itself happens
// on the dedicated AdminConflictResolutionPage (`/admin/races/:id/conflict`) — this page
// only surfaces which races currently need that.
export default function AdminDiscrepanciesPage() {
  const [activeConflicts, setActiveConflicts] = useState([]);
  const [conflictDismissed, setConflictDismissed] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const pollConflicts = useCallback(async () => {
    try {
      const races = await getRaces();
      const raceList = Array.isArray(races) ? races : [];
      const inProgressRaces = raceList.filter(
        (r) => r.status === "InProgress" || r.status === "Paused",
      );

      const conflicts = [];
      for (const race of inProgressRaces) {
        try {
          const exec = await getRaceExecutionStatus(race.raceId);
          const conflictedLegs = exec?.legs?.filter((l) => l.status === "Conflicted") ?? [];
          for (const leg of conflictedLegs) {
            conflicts.push({
              raceId: race.raceId,
              raceName: race.name,
              legIndex: leg.legIndex ?? 0,
              legNumber: (leg.legIndex ?? 0) + 1,
            });
          }
        } catch { /* skip failed race checks */ }
      }

      setActiveConflicts(conflicts);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conflicts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    pollConflicts();
    const interval = setInterval(pollConflicts, POLL_MS);
    return () => clearInterval(interval);
  }, [pollConflicts]);

  const handleDismiss = (raceId) => {
    setConflictDismissed((prev) => ({ ...prev, [raceId]: true }));
  };

  const visibleConflicts = activeConflicts.filter((c) => !conflictDismissed[c.raceId]);
  const totalPages = Math.max(1, Math.ceil(visibleConflicts.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paginated = visibleConflicts.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in-up" style={{ opacity: 0, animationFillMode: "forwards" }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-on-surface">Race Conflicts</h1>
              <p className="text-on-surface-variant text-sm">
                Legs where the 2 referees reported mismatched results — resolve them before the race can resume.
              </p>
            </div>
          </div>
          <button onClick={pollConflicts} className="gs-btn gs-btn-ghost gs-btn-sm flex items-center justify-center gap-1.5 w-full sm:w-auto">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 mt-4" />
      </div>

      {error && (
        <div className="mb-4 auth-alert auth-alert--error flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{error}</span>
            <button onClick={() => setError("")} className="ml-3 text-xs underline hover:no-underline">Close</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-on-surface-variant text-sm">Loading...</span>
          </div>
        </div>
      ) : visibleConflicts.length === 0 ? (
        <div className="gs-card p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-primary/60" />
          </div>
          <h3 className="font-serif text-xl font-bold text-on-surface mb-2">No active conflicts</h3>
          <p className="text-on-surface-variant text-sm">All legs match between the 2 referees.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map((conflict) => (
              <div
                key={`${conflict.raceId}-${conflict.legIndex}`}
                className="gs-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                    <ShieldAlert size={24} className="text-orange-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">{conflict.raceName}</p>
                    <p className="text-sm text-on-surface-variant">
                      Leg {conflict.legNumber} — the 2 referees reported different results
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/admin/races/${conflict.raceId}/conflict`}
                    className="px-4 py-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-sm font-semibold text-orange-300 transition-all"
                  >
                    View &amp; Resolve
                  </Link>
                  <button
                    onClick={() => handleDismiss(conflict.raceId)}
                    className="w-9 h-9 rounded-lg bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all"
                    title="Dismiss (hide until next refresh)"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
              <p className="text-xs text-on-surface-variant">
                Showing {(pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(pageSafe * PAGE_SIZE, visibleConflicts.length)} of {visibleConflicts.length} conflicts
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageSafe === 1}
                  className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-40 flex items-center justify-center transition-all">
                  <ChevronLeft className="w-3.5 h-3.5 text-on-surface" />
                </button>
                <span className="text-xs text-on-surface font-mono px-2">
                  {pageSafe} / {totalPages}
                </span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={pageSafe === totalPages}
                  className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-40 flex items-center justify-center transition-all">
                  <ChevronRight className="w-3.5 h-3.5 text-on-surface" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
