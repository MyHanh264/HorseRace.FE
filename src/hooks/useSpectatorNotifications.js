import { useEffect, useState } from "react";
import { getMyPredictions, getAllRaces } from "../api/spectator";
import { useAuth } from "../context/AuthContext";

const POLL_MS = 45_000;

/**
 * Notification list for Spectator: Won/Lost predictions after a race is
 * published, and races currently in progress (bets locked) for
 * Pending/Locked predictions.
 */
export function useSpectatorNotifications() {
  const { user } = useAuth();
  const userId = user?.userId;
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    async function load() {
      try {
        const [predictions, races] = await Promise.all([
          getMyPredictions(userId),
          getAllRaces(),
        ]);
        if (!active) return;

        const raceById = new Map(races.map((r) => [r.raceId, r]));
        const list = [];

        predictions.forEach((p) => {
          const race = raceById.get(p.raceId);
          if (p.status === "Won") {
            const payout = p.pointsWon ?? p.payout ?? null;
            list.push({
              id: `bet-won-${p.predictionId}`,
              type: "success",
              msg: `Congratulations! Your prediction for "${race?.name ?? `race #${p.raceId}`}" won${payout ? `, +${payout} points` : ""}.`,
              path: "/spectator/predictions",
              ts: race?.scheduledAt,
            });
          } else if (p.status === "Lost") {
            list.push({
              id: `bet-lost-${p.predictionId}`,
              type: "info",
              msg: `Your prediction for "${race?.name ?? `race #${p.raceId}`}" did not win.`,
              path: "/spectator/predictions",
              ts: race?.scheduledAt,
            });
          } else if (p.status === "Locked") {
            list.push({
              id: `bet-locked-${p.predictionId}`,
              type: "warn",
              msg: `Your prediction for "${race?.name ?? `race #${p.raceId}`}" is locked, awaiting results.`,
              path: "/spectator/predictions",
              ts: race?.scheduledAt,
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
