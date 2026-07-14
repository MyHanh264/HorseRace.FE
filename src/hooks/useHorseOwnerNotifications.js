import { useEffect, useState } from "react";
import { getMyHorses, getInvitations, getMyEntries, getRaces } from "../api/horseOwner";

const POLL_MS = 45_000;
const DEADLINE_WARNING_MS = 48 * 60 * 60 * 1000; // warn inside the last 48h before registration closes
const STARTING_SOON_MS = 45 * 60 * 1000; // warn inside the last 45 minutes before scheduled start

function fmtTime(dt) {
  return new Date(dt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Notification list (individual items, not grouped) for Horse Owner:
 * horse Approved/Rejected, jockey Accepts/Declines an invitation, entry
 * Approved/Rejected, a race with an approved entry starting soon, a race has
 * published results for an entry they entered, and a registration-deadline
 * risk warning when a race they engaged with is about to close registration
 * with no confirmed entry yet.
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
              ts: h.createdAt,
            });
          } else if (h.status === "Rejected") {
            list.push({
              id: `horse-rejected-${h.horseId}`,
              type: "error",
              msg: `Horse "${h.name}" was rejected${h.rejectionReason ? `: ${h.rejectionReason}` : "."}`,
              path: "/horse-owner/horses",
              ts: h.createdAt,
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
              ts: inv.sentAt,
            });
          } else if (inv.status === "Declined") {
            list.push({
              id: `inv-declined-${inv.invitationId}`,
              type: "error",
              msg: `The jockey has declined the invitation for horse "${inv.horseName ?? `#${inv.horseId}`}".`,
              path: "/horse-owner/invitations",
              ts: inv.sentAt,
            });
          }
        });

        entries.forEach((e) => {
          const race = raceById.get(e.raceId);
          const horseLabel = e.horseName ?? `#${e.horseId}`;
          const raceLabel = race?.name ?? `#${e.raceId}`;
          if (e.status === "Approved") {
            list.push({
              id: `entry-approved-${e.entryId}`,
              type: "success",
              msg: `Entry for horse "${horseLabel}" in race "${raceLabel}" has been approved.`,
              path: "/horse-owner/entries",
              ts: e.submittedAt,
            });
          } else if (e.status === "Rejected") {
            list.push({
              id: `entry-rejected-${e.entryId}`,
              type: "error",
              msg: `Entry for horse "${horseLabel}" in race "${raceLabel}" was rejected${e.rejectionReason ? `: ${e.rejectionReason}` : "."}`,
              path: "/horse-owner/entries",
              ts: e.submittedAt,
            });
          }
        });

        const finishedRaceIds = new Set();
        const startingSoonRaceIds = new Set();
        const nowForRaces = Date.now();
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
              ts: race.scheduledAt,
            });
          }
          if (race?.status === "Scheduled" && race.scheduledAt && !startingSoonRaceIds.has(race.raceId)) {
            const msUntilStart = new Date(race.scheduledAt).getTime() - nowForRaces;
            if (msUntilStart > 0 && msUntilStart <= STARTING_SOON_MS) {
              startingSoonRaceIds.add(race.raceId);
              list.push({
                id: `race-starting-soon-${race.raceId}`,
                type: "warn",
                msg: `Race "${race.name}" — your horse "${e.horseName ?? `#${e.horseId}`}" — starts soon, at ${fmtTime(race.scheduledAt)}.`,
                path: "/horse-owner/entries",
                ts: nowForRaces,
              });
            }
          }
        });

        // Registration-deadline risk: races the owner engaged with (sent invitations for)
        // that close soon without a confirmed entry yet.
        const now = Date.now();
        races.forEach((race) => {
          if (race.status !== "Scheduled" || !race.registrationCloseAt) return;
          const msLeft = new Date(race.registrationCloseAt).getTime() - now;
          if (msLeft <= 0 || msLeft > DEADLINE_WARNING_MS) return;

          const raceInvitations = invitations.filter((inv) => inv.raceId === race.raceId);
          if (raceInvitations.length === 0) return;

          const hasActiveEntry = entries.some(
            (e) => e.raceId === race.raceId && (e.status === "Pending" || e.status === "Approved"),
          );
          if (hasActiveEntry) return;

          const hasLivePath = raceInvitations.some(
            (inv) => inv.status === "Pending" || inv.status === "Accepted",
          );

          list.push(
            hasLivePath
              ? {
                  id: `deadline-risk-${race.raceId}`,
                  type: "warn",
                  msg: `Registration for "${race.name}" closes soon and you don't have a confirmed entry yet.`,
                  path: "/horse-owner/invitations",
                  ts: now,
                }
              : {
                  id: `deadline-risk-${race.raceId}`,
                  type: "error",
                  msg: `All jockeys declined your invitations for "${race.name}" and registration closes soon — invite another jockey now.`,
                  path: "/horse-owner/invitations",
                  ts: now,
                },
          );
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
