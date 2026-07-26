import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, AlertTriangle, ShieldAlert, X, ChevronLeft, ChevronRight, History } from "lucide-react";
import { getRaces, getRaceExecutionStatus, getLegDetail } from "../../api/admin";

function fmtDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const POLL_MS = 15_000;
const PAGE_SIZE = 10;

// This page is the single place to discover & resolve leg conflicts (the 2 referees
// submitted mismatched results for a leg, pausing the race). Resolution itself happens
// on the dedicated AdminConflictResolutionPage (`/admin/races/:id/conflict`) — this page
// only surfaces which races currently need that.
export default function AdminDiscrepanciesPage() {
  const [activeConflicts, setActiveConflicts] = useState([]);
  const [resolvedHistory, setResolvedHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [conflictDismissed, setConflictDismissed] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const pollConflicts = useCallback(async () => {
    try {
      const races = await getRaces();
      const raceList = Array.isArray(races) ? races : [];
      // Only InProgress/Paused races have legs at all — a race still not started
      // has none, and one already Finished/PendingResult stops showing up here
      // (see its own Race Conflict page for that race's full history instead).
      const inProgressRaces = raceList.filter(
        (r) => r.status === "InProgress" || r.status === "Paused",
      );

      const conflicts = [];
      const resolvedLegRefs = [];
      for (const race of inProgressRaces) {
        try {
          const exec = await getRaceExecutionStatus(race.raceId);
          for (const leg of exec?.legs ?? []) {
            if (leg.status === "Conflicted") {
              conflicts.push({
                raceId: race.raceId,
                raceName: race.name,
                legIndex: leg.legIndex ?? 0,
                legNumber: (leg.legIndex ?? 0) + 1,
              });
            } else if (leg.status === "Resolved") {
              resolvedLegRefs.push({ raceId: race.raceId, raceName: race.name, legNumber: leg.legNumber });
            }
          }
        } catch { /* skip failed race checks */ }
      }

      setActiveConflicts(conflicts);
      setError("");

      setHistoryLoading(true);
      const details = await Promise.allSettled(
        resolvedLegRefs.map((r) => getLegDetail(r.raceId, r.legNumber)),
      );
      const history = details
        .map((d, i) => (d.status === "fulfilled" ? { ...d.value, raceName: resolvedLegRefs[i].raceName } : null))
        .filter(Boolean)
        .sort((a, b) => new Date(b.confirmedAt ?? 0) - new Date(a.confirmedAt ?? 0));
      setResolvedHistory(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conflicts.");
    } finally {
      setLoading(false);
      setHistoryLoading(false);
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
    <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in-up" style={{ opacity: 0, animationFillMode: "forwards" }}>
        <div className="flex items-center justify-between">
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
          <button onClick={pollConflicts} className="gs-btn gs-btn-ghost gs-btn-sm flex items-center gap-1.5">
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
                className="gs-card p-5 flex items-center justify-between gap-4"
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
            <div className="flex items-center justify-between mt-4">
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

      {/* Recently Resolved — legs Admin already overrode for races still
          InProgress/Paused. A race that's since finished stops appearing here;
          check that race's own Conflict page for its full history instead. */}
      {!loading && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-on-surface">Recently Resolved</h2>
          </div>
          {historyLoading ? (
            <div className="gs-card p-5 flex items-center gap-2 text-sm text-on-surface-variant">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : resolvedHistory.length === 0 ? (
            <div className="gs-card p-6 text-center text-sm text-on-surface-variant">
              No leg has been resolved by Admin yet (for races still in progress).
            </div>
          ) : (
            <div className="gs-card overflow-hidden">
              <div className="divide-y divide-white/5">
                {resolvedHistory.map((h) => (
                  <div key={`${h.raceId}-${h.legNumber}`} className="px-5 py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-on-surface">
                        {h.raceName} — Leg {h.legNumber}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5 italic">
                        {h.adminOverrideReason || 'No reason recorded'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="text-xs text-on-surface-variant font-mono">
                        {fmtDateTime(h.confirmedAt)}
                      </p>
                      <Link
                        to={`/admin/races/${h.raceId}/conflict`}
                        className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-all"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
