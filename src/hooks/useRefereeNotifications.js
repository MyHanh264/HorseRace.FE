import { useEffect, useState } from "react";
import { getAllRaces, getViolations, getRaceExecutionStatus } from "../api/referee";
import { useAuth } from "../context/AuthContext";

const POLL_MS = 45_000;
const STARTING_SOON_MS = 45 * 60 * 1000; // warn inside the last 45 minutes before scheduled start

function fmtTime(dt) {
  return new Date(dt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Notification list for Referee: an assigned race starting soon (still
 * Scheduled), assigned race is Paused (mismatch needs Admin to resolve),
 * a leg Admin just resolved after such a mismatch, race has Finished, and
 * violation reports they filed that Admin approved/rejected.
 */
export function useRefereeNotifications() {
  const { user } = useAuth();
  const userId = user?.userId;
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    async function load() {
      try {
        const [races, violations] = await Promise.all([
          getAllRaces(),
          getViolations(),
        ]);
        if (!active) return;

        const list = [];
        const now = Date.now();

        const assignedRaces = races.filter(
          (r) => r.referee1Id === userId || r.referee2Id === userId,
        );
        assignedRaces.forEach((r) => {
          if (r.status === "Scheduled" && r.scheduledAt) {
            const msUntilStart = new Date(r.scheduledAt).getTime() - now;
            if (msUntilStart > 0 && msUntilStart <= STARTING_SOON_MS) {
              list.push({
                id: `race-starting-soon-${r.raceId}`,
                type: "warn",
                msg: `Race "${r.name}" you're assigned to starts soon, at ${fmtTime(r.scheduledAt)}.`,
                path: "/referee",
                ts: now,
              });
            }
          }
          if (r.status === "Paused") {
            list.push({
              id: `race-paused-${r.raceId}`,
              type: "warn",
              msg: `Race "${r.name}" is paused — the 2 referees' results don't match, awaiting Admin resolution.`,
              path: `/referee/races/${r.raceId}`,
              ts: r.scheduledAt,
            });
          } else if (r.status === "Finished") {
            list.push({
              id: `race-finished-${r.raceId}`,
              type: "success",
              msg: `Race "${r.name}" results have been published.`,
              path: `/referee/races/${r.raceId}`,
              ts: r.scheduledAt,
            });
          }
        });

        // Legs Admin resolved after a referee mismatch. "Resolved" is only ever
        // reached via Admin override (the state machine has no other path to it),
        // so no extra field from BE is needed to know this happened — only the
        // "Paused" notification exists for the mismatch itself, nothing announces
        // it once fixed, so this fills that gap. Only worth checking races that
        // have actually run (Scheduled ones have no legs yet).
        const racesToCheck = assignedRaces.filter((r) => r.status !== "Scheduled");
        if (racesToCheck.length > 0) {
          const executions = await Promise.allSettled(
            racesToCheck.map((r) => getRaceExecutionStatus(r.raceId)),
          );
          executions.forEach((result, i) => {
            if (result.status !== "fulfilled") return;
            const r = racesToCheck[i];
            const resolvedLegs = (result.value?.legs ?? []).filter(
              (l) => l.status === "Resolved",
            );
            resolvedLegs.forEach((l) => {
              list.push({
                id: `leg-resolved-${r.raceId}-${l.legNumber}`,
                type: "success",
                msg: `Leg ${l.legNumber} of race "${r.name}" was resolved by Admin after a mismatch.`,
                path: `/referee/races/${r.raceId}/legs/${l.legIndex}`,
                ts: r.scheduledAt,
              });
            });
          });
        }

        const myViolations = violations.filter(
          (v) => v.reportedByRefereeId === userId,
        );
        myViolations.forEach((v) => {
          if (v.status === "Approved") {
            list.push({
              id: `violation-approved-${v.violationId}`,
              type: "success",
              msg: `Violation report #${v.violationId} was approved by Admin (${v.penalty ?? "—"}).`,
              path: "/referee/violations",
              // BE doesn't return a timestamp for violations — use the ID as a recency proxy.
              ts: v.violationId,
            });
          } else if (v.status === "Rejected") {
            list.push({
              id: `violation-rejected-${v.violationId}`,
              type: "error",
              msg: `Violation report #${v.violationId} was rejected by Admin.`,
              path: "/referee/violations",
              ts: v.violationId,
            });
          }
        });

        list.sort((a, b) => new Date(b.ts ?? 0) - new Date(a.ts ?? 0));
        setItems(list);
      } catch {
        // silent — don't break the layout due to a notification load error
      }
    }

    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [userId]);

  return items;
}
