import { useEffect, useState } from "react";
import { getJockeyInvitations, getRaces } from "../api/jockey";

const POLL_MS = 45_000;
const STARTING_SOON_MS = 45 * 60 * 1000; // warn inside the last 45 minutes before scheduled start

function fmtTime(dt) {
  return new Date(dt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Notification list for Jockey: new invitations, horse owner
 * Confirms/Cancels an invitation, a race they're competing in starting soon,
 * is in progress, or has results.
 */
export function useJockeyNotifications() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [invRes, racesRes] = await Promise.all([
          getJockeyInvitations(),
          getRaces(),
        ]);
        if (!active) return;

        const invitations = Array.isArray(invRes) ? invRes : (invRes?.data ?? invRes?.invitations ?? []);
        const races = Array.isArray(racesRes) ? racesRes : (racesRes?.data ?? []);
        const raceById = new Map(races.map((r) => [r.raceId, r]));

        const list = [];

        invitations.forEach((inv) => {
          if (inv.status === "Pending") {
            list.push({
              id: `inv-pending-${inv.invitationId}`,
              type: "warn",
              msg: `New invitation for horse "${inv.horseName ?? `#${inv.horseId}`}".`,
              path: "/jockey/invitations",
              ts: inv.sentAt,
            });
          } else if (inv.status === "Confirmed") {
            list.push({
              id: `inv-confirmed-${inv.invitationId}`,
              type: "success",
              msg: `The horse owner has confirmed you to compete with horse "${inv.horseName ?? `#${inv.horseId}`}".`,
              path: "/jockey/invitations",
              ts: inv.sentAt,
            });
          } else if (inv.status === "Cancelled") {
            list.push({
              id: `inv-cancelled-${inv.invitationId}`,
              type: "info",
              msg: `Invitation for horse "${inv.horseName ?? `#${inv.horseId}`}" has been cancelled.`,
              path: "/jockey/invitations",
              ts: inv.sentAt,
            });
          }
        });

        const acceptedRaceIds = new Set(
          invitations.filter((i) => ["Accepted", "Confirmed"].includes(i.status)).map((i) => i.raceId),
        );

        const now = Date.now();

        acceptedRaceIds.forEach((raceId) => {
          const race = raceById.get(raceId);
          if (!race) return;
          if (race.status === "Scheduled" && race.scheduledAt) {
            const msUntilStart = new Date(race.scheduledAt).getTime() - now;
            if (msUntilStart > 0 && msUntilStart <= STARTING_SOON_MS) {
              list.push({
                id: `race-starting-soon-${race.raceId}`,
                type: "warn",
                msg: `Race "${race.name}" you're competing in starts soon, at ${fmtTime(race.scheduledAt)}.`,
                path: "/jockey/races",
                ts: now,
              });
            }
          }
          if (race.status === "InProgress") {
            list.push({
              id: `race-live-${race.raceId}`,
              type: "info",
              msg: `Race "${race.name}" you're competing in is now in progress.`,
              path: "/jockey/races",
              ts: race.scheduledAt,
            });
          } else if (race.status === "Finished") {
            list.push({
              id: `race-finished-${race.raceId}`,
              type: "success",
              msg: `Race "${race.name}" has results — check your performance.`,
              path: "/jockey/races",
              ts: race.scheduledAt,
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
  }, []);

  return items;
}
