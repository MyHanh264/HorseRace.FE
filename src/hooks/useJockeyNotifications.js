import { useEffect, useState } from "react";
import { getJockeyInvitations, getRaces } from "../api/jockey";

const POLL_MS = 45_000;

/**
 * Notification list for Jockey: new invitations, horse owner
 * Confirms/Cancels an invitation, a race they're competing in starts or
 * has results.
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
            });
          } else if (inv.status === "Confirmed") {
            list.push({
              id: `inv-confirmed-${inv.invitationId}`,
              type: "success",
              msg: `The horse owner has confirmed you to compete with horse "${inv.horseName ?? `#${inv.horseId}`}".`,
              path: "/jockey/invitations",
            });
          } else if (inv.status === "Cancelled") {
            list.push({
              id: `inv-cancelled-${inv.invitationId}`,
              type: "info",
              msg: `Invitation for horse "${inv.horseName ?? `#${inv.horseId}`}" has been cancelled.`,
              path: "/jockey/invitations",
            });
          }
        });

        const acceptedRaceIds = new Set(
          invitations.filter((i) => ["Accepted", "Confirmed"].includes(i.status)).map((i) => i.raceId),
        );

        acceptedRaceIds.forEach((raceId) => {
          const race = raceById.get(raceId);
          if (!race) return;
          if (race.status === "InProgress") {
            list.push({
              id: `race-live-${race.raceId}`,
              type: "info",
              msg: `Race "${race.name}" you're competing in is now in progress.`,
              path: "/jockey/races",
            });
          } else if (race.status === "Finished") {
            list.push({
              id: `race-finished-${race.raceId}`,
              type: "success",
              msg: `Race "${race.name}" has results — check your performance.`,
              path: "/jockey/races",
            });
          }
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
