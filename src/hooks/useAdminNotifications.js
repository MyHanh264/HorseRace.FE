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
const STARTING_SOON_MS = 45 * 60 * 1000; // warn inside the last 45 minutes before scheduled start
const LOW_TURNOUT_WARNING_MS = 48 * 60 * 60 * 1000; // warn inside the last 48h before start if turnout is low
const MIN_APPROVED_ENTRIES = 2; // CloseRegistration/StartRace both hard-require >=2 Approved entries

function fmtTime(dt) {
  return new Date(dt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

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
        const allEntries = toArray(allEntriesRes);
        const withdrawnEntries = allEntries.filter((e) => e.status === "Withdrawn");
        const raceById = new Map(races.map((r) => [r.raceId, r]));

        const approvedCountByRace = {};
        allEntries.forEach((e) => {
          if (e.status === "Approved") approvedCountByRace[e.raceId] = (approvedCountByRace[e.raceId] ?? 0) + 1;
        });

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

        races
          .filter((r) => r.status === "Scheduled" && r.scheduledAt)
          .forEach((r) => {
            const msUntilStart = new Date(r.scheduledAt).getTime() - now;
            if (msUntilStart > 0 && msUntilStart <= STARTING_SOON_MS) {
              list.push({
                id: `race-starting-soon-${r.raceId}`,
                type: "info",
                msg: `Race "${r.name}" starts soon, at ${fmtTime(r.scheduledAt)}.`,
                path: "/admin/races",
                ts: now,
              });
            } else if (msUntilStart <= 0) {
              // Past its scheduled time but still Scheduled — either nobody's started it yet,
              // or it's missing a precondition (referees/odds/entries) that's blocking start.
              list.push({
                id: `race-overdue-${r.raceId}`,
                type: "error",
                msg: `Race "${r.name}" was scheduled for ${fmtTime(r.scheduledAt)} but hasn't started yet.`,
                path: "/admin/races",
                ts: now,
              });
            }
          });

        // Low-turnout risk: registration still open, race starts soon, but not enough
        // approved entries yet — CloseRegistration/StartRace both hard-require ≥2 Approved,
        // so anything below that will block the race entirely if nobody notices in time.
        // Purely informational — Admin decides whether to chase more entries, wait, or
        // cancel manually; nothing here auto-extends or auto-cancels the race.
        races
          .filter((r) => r.status === "Scheduled" && !r.registrationCloseAt && r.scheduledAt)
          .forEach((r) => {
            const msUntilStart = new Date(r.scheduledAt).getTime() - now;
            if (msUntilStart <= 0 || msUntilStart > LOW_TURNOUT_WARNING_MS) return;
            const approved = approvedCountByRace[r.raceId] ?? 0;
            if (approved >= MIN_APPROVED_ENTRIES) return;
            list.push({
              id: `race-low-turnout-${r.raceId}`,
              type: "warn",
              msg: `Race "${r.name}" starts soon (${fmtTime(r.scheduledAt)}) with only ${approved} approved entr${approved === 1 ? "y" : "ies"} — needs ${MIN_APPROVED_ENTRIES} to close registration/start. Chase more entries or cancel manually.`,
              path: "/admin/races",
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
