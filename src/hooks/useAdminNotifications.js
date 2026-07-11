import { useEffect, useState } from "react";
import {
  getPendingHorses,
  getPendingEntries,
  getPendingUsers,
  getAllViolations,
  getRaces,
} from "../api/admin";

const POLL_MS = 45_000;

function toArray(d) {
  return Array.isArray(d) ? d : (d?.data ?? d?.items ?? []);
}

/**
 * Notification list for Admin: pending-approval queues (horses/entries/users/
 * violations, grouped by count since these are already separate "todo queue"
 * pages) and races that are Paused and need urgent intervention (mismatch
 * between the 2 referees — blocks the whole race).
 */
export function useAdminNotifications() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [horsesRes, entriesRes, usersRes, violationsRes, racesRes] = await Promise.all([
          getPendingHorses(),
          getPendingEntries(),
          getPendingUsers(),
          getAllViolations({ status: "Pending" }),
          getRaces(),
        ]);
        if (!active) return;

        const pendingHorses = toArray(horsesRes);
        const pendingEntries = toArray(entriesRes);
        const pendingUsers = toArray(usersRes);
        const pendingViolations = toArray(violationsRes);
        const races = toArray(racesRes);
        const pausedRaces = races.filter((r) => r.status === "Paused");

        const list = [];

        if (pendingHorses.length > 0) {
          list.push({
            id: `queue-horses:${pendingHorses.map((h) => h.horseId).sort().join(",")}`,
            type: "warn",
            msg: `${pendingHorses.length} horses pending review.`,
            path: "/admin/horses",
          });
        }
        if (pendingEntries.length > 0) {
          list.push({
            id: `queue-entries:${pendingEntries.map((e) => e.entryId).sort().join(",")}`,
            type: "warn",
            msg: `${pendingEntries.length} race entries pending review.`,
            path: "/admin/races",
          });
        }
        if (pendingUsers.length > 0) {
          list.push({
            id: `queue-users:${pendingUsers.map((u) => u.userId).sort().join(",")}`,
            type: "warn",
            msg: `${pendingUsers.length} new accounts pending review.`,
            path: "/admin/users",
          });
        }
        if (pendingViolations.length > 0) {
          list.push({
            id: `queue-violations:${pendingViolations.map((v) => v.violationId).sort().join(",")}`,
            type: "warn",
            msg: `${pendingViolations.length} violation reports pending review.`,
            path: "/admin/violations",
          });
        }

        pausedRaces.forEach((r) => {
          list.push({
            id: `race-paused-${r.raceId}`,
            type: "error",
            msg: `Race "${r.name}" is paused — the 2 referees reported mismatched results, needs immediate attention.`,
            path: "/admin/race-execution",
          });
        });

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
