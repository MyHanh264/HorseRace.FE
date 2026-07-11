import { useEffect, useState } from "react";
import { getAllRaces, getViolations } from "../api/referee";
import { useAuth } from "../context/AuthContext";

const POLL_MS = 45_000;

/**
 * Notification list for Referee: assigned race is Paused (mismatch needs
 * Admin to resolve), race has Finished, and violation reports they filed
 * that Admin approved/rejected.
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

        const assignedRaces = races.filter(
          (r) => r.referee1Id === userId || r.referee2Id === userId,
        );
        assignedRaces.forEach((r) => {
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
