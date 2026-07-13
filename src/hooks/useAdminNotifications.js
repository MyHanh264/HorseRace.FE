import { useEffect, useState } from "react";
import {
  getPendingHorses,
  getPendingEntries,
  getPendingUsers,
  getAllViolations,
  getRaces,
  getEntries,
} from "../api/admin";

const POLL_MS = 45_000;

function toArray(d) {
  return Array.isArray(d) ? d : (d?.data ?? d?.items ?? []);
}

/**
 * Notification list for Admin: pending-approval queues (horses/entries/users/
 * violations, grouped by count since these are already separate "todo queue"
 * pages), races that are Paused and need urgent intervention (mismatch
 * between the 2 referees — blocks the whole race), and entries the owner
 * withdrew themselves (informational — no action needed, but worth surfacing
 * since it silently disappears from the pending-review queue).
 */
export function useAdminNotifications() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [horsesRes, entriesRes, usersRes, violationsRes, racesRes, allEntriesRes] = await Promise.all([
          getPendingHorses(),
          getPendingEntries(),
          getPendingUsers(),
          getAllViolations({ status: "Pending" }),
          getRaces(),
          getEntries().catch(() => []),
        ]);
        if (!active) return;

        const pendingHorses = toArray(horsesRes);
        const pendingEntries = toArray(entriesRes);
        const pendingUsers = toArray(usersRes);
        const pendingViolations = toArray(violationsRes);
        const races = toArray(racesRes);
        const pausedRaces = races.filter((r) => r.status === "Paused");
        const withdrawnEntries = toArray(allEntriesRes).filter((e) => e.status === "Withdrawn");
        const raceById = new Map(races.map((r) => [r.raceId, r]));

        // Live queue/urgent items are re-evaluated fresh every poll, so pin them to "now"
        // — they should always outrank historical items like a withdrawn-entry notice.
        const now = Date.now();
        const list = [];

        if (pendingHorses.length > 0) {
          list.push({
            id: `queue-horses:${pendingHorses.map((h) => h.horseId).sort().join(",")}`,
            type: "warn",
            msg: `${pendingHorses.length} horses pending review.`,
            path: "/admin/horses",
            ts: now,
          });
        }
        if (pendingEntries.length > 0) {
          list.push({
            id: `queue-entries:${pendingEntries.map((e) => e.entryId).sort().join(",")}`,
            type: "warn",
            msg: `${pendingEntries.length} race entries pending review.`,
            path: "/admin/races",
            ts: now,
          });
        }
        if (pendingUsers.length > 0) {
          list.push({
            id: `queue-users:${pendingUsers.map((u) => u.userId).sort().join(",")}`,
            type: "warn",
            msg: `${pendingUsers.length} new accounts pending review.`,
            path: "/admin/users",
            ts: now,
          });
        }
        if (pendingViolations.length > 0) {
          list.push({
            id: `queue-violations:${pendingViolations.map((v) => v.violationId).sort().join(",")}`,
            type: "warn",
            msg: `${pendingViolations.length} violation reports pending review.`,
            path: "/admin/violations",
            ts: now,
          });
        }

        pausedRaces.forEach((r) => {
          list.push({
            id: `race-paused-${r.raceId}`,
            type: "error",
            msg: `Race "${r.name}" is paused — the 2 referees reported mismatched results, needs immediate attention.`,
            path: `/admin/races/${r.raceId}/conflict`,
            ts: now,
          });
        });

        // Races ready to publish but still blocked by an unresolved violation report —
        // surfaced here so Admin doesn't discover this only after opening Monitor.
        const violationCountByRace = {};
        pendingViolations.forEach((v) => {
          violationCountByRace[v.raceId] = (violationCountByRace[v.raceId] ?? 0) + 1;
        });
        races
          .filter((r) => r.status === "PendingResult" && violationCountByRace[r.raceId] > 0)
          .forEach((r) => {
            const count = violationCountByRace[r.raceId];
            list.push({
              id: `race-blocked-${r.raceId}`,
              type: "warn",
              msg: `Race "${r.name}" is ready to publish but has ${count} unresolved violation report${count > 1 ? "s" : ""}.`,
              path: `/admin/race-execution?raceId=${r.raceId}`,
              ts: now,
            });
          });

        withdrawnEntries.forEach((e) => {
          const race = raceById.get(e.raceId);
          list.push({
            id: `entry-withdrawn-${e.entryId}`,
            type: "info",
            msg: `Horse owner withdrew the entry for "${e.horseName ?? `Horse #${e.horseId}`}" in race "${race?.name ?? `#${e.raceId}`}".`,
            path: "/admin/races",
            ts: e.updatedAt,
          });
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
  }, []);

  return items;
}
