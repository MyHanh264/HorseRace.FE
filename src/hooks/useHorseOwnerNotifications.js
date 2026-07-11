import { useEffect, useState } from "react";
import { getMyHorses, getInvitations, getMyEntries, getRaces } from "../api/horseOwner";

const POLL_MS = 45_000;

/**
 * Notification list (individual items, not grouped) for Horse Owner:
 * horse Approved/Rejected, jockey Accepts/Declines an invitation, entry
 * Approved/Rejected, a race has published results for an entry they entered.
 */
export function useHorseOwnerNotifications() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [horses, invitations, entries, races] = await Promise.all([
          getMyHorses().then((d) => (Array.isArray(d) ? d : (d?.data ?? []))),
          getInvitations().then((d) => (Array.isArray(d) ? d : (d?.data ?? d?.invitations ?? []))),
          getMyEntries().then((d) => (Array.isArray(d) ? d : (d?.data ?? []))),
          getRaces().then((d) => (Array.isArray(d) ? d : (d?.data ?? []))),
        ]);
        if (!active) return;

        const raceById = new Map(races.map((r) => [r.raceId, r]));
        const list = [];

        horses.forEach((h) => {
          if (h.status === "Approved") {
            list.push({
              id: `horse-approved-${h.horseId}`,
              type: "success",
              msg: `Horse "${h.name}" has been approved and is ready to compete.`,
              path: "/horse-owner/horses",
            });
          } else if (h.status === "Rejected") {
            list.push({
              id: `horse-rejected-${h.horseId}`,
              type: "error",
              msg: `Horse "${h.name}" was rejected${h.rejectionReason ? `: ${h.rejectionReason}` : "."}`,
              path: "/horse-owner/horses",
            });
          }
        });

        invitations.forEach((inv) => {
          if (inv.status === "Accepted") {
            list.push({
              id: `inv-accepted-${inv.invitationId}`,
              type: "success",
              msg: `The jockey has accepted the invitation for horse "${inv.horseName ?? `#${inv.horseId}`}".`,
              path: "/horse-owner/invitations",
            });
          } else if (inv.status === "Declined") {
            list.push({
              id: `inv-declined-${inv.invitationId}`,
              type: "error",
              msg: `The jockey has declined the invitation for horse "${inv.horseName ?? `#${inv.horseId}`}".`,
              path: "/horse-owner/invitations",
            });
          }
        });

        entries.forEach((e) => {
          if (e.status === "Approved") {
            list.push({
              id: `entry-approved-${e.entryId}`,
              type: "success",
              msg: `Race entry #${e.entryId} has been approved.`,
              path: "/horse-owner/entries",
            });
          } else if (e.status === "Rejected") {
            list.push({
              id: `entry-rejected-${e.entryId}`,
              type: "error",
              msg: `Race entry #${e.entryId} was rejected${e.rejectionReason ? `: ${e.rejectionReason}` : "."}`,
              path: "/horse-owner/entries",
            });
          }
        });

        const finishedRaceIds = new Set();
        entries.forEach((e) => {
          if (e.status !== "Approved") return;
          const race = raceById.get(e.raceId);
          if (race?.status === "Finished" && !finishedRaceIds.has(race.raceId)) {
            finishedRaceIds.add(race.raceId);
            list.push({
              id: `race-finished-${race.raceId}`,
              type: "success",
              msg: `Race "${race.name}" has results — check your bonus points.`,
              path: "/horse-owner/entries",
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
