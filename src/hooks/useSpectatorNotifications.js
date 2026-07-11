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
          if (p.status === "Won") {
            const payout = p.pointsWon ?? p.payout ?? null;
            list.push({
              id: `bet-won-${p.predictionId}`,
              type: "success",
              msg: `Congratulations! Your prediction won${payout ? `, +${payout} points` : ""}.`,
              path: "/spectator/predictions",
            });
          } else if (p.status === "Lost") {
            list.push({
              id: `bet-lost-${p.predictionId}`,
              type: "info",
              msg: `Prediction #${p.predictionId} did not win.`,
              path: "/spectator/predictions",
            });
          } else if (p.status === "Locked") {
            const race = raceById.get(p.raceId);
            list.push({
              id: `bet-locked-${p.predictionId}`,
              type: "warn",
              msg: `Your prediction for "${race?.name ?? `race #${p.raceId}`}" is locked, awaiting results.`,
              path: "/spectator/predictions",
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
  }, [userId]);

  return items;
}
