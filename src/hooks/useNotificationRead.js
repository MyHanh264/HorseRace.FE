import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

function storageKey(userId) {
  return `hrs_notif_seen_${userId ?? "anon"}`;
}

function loadSeenSet(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenSet(userId, set) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify([...set]));
  } catch {
    // localStorage full/blocked — ignore, does not affect core functionality
  }
}

const TOAST_FN_BY_TYPE = {
  success: toast.success,
  error: toast.error,
  warn: toast.warning,
  info: toast.info,
};

/**
 * Tracks read/unread state for a list of notification items { id, type, msg, path }.
 * - "Read" state is stored by id in localStorage, scoped per userId (switching
 *   accounts on the same browser won't mix up notifications).
 * - Any item with a NEW id (never seen this session, not already in seen)
 *   fires a toast once via sonner. Toasts are skipped on the first fetch after
 *   entering the page/switching user, to avoid flooding toasts for pre-existing
 *   old notifications.
 */
export function useNotificationRead(items, userId) {
  const [trackedUserId, setTrackedUserId] = useState(userId);
  const [seen, setSeen] = useState(() => loadSeenSet(userId));
  const knownIdsRef = useRef(new Set());
  const isFirstRunRef = useRef(true);
  const navigate = useNavigate();

  // Switching accounts on the same browser (logging in as a different user) →
  // reload "read" state for the new user. Set state directly during render
  // (not inside an effect), following React's official pattern for "adjusting
  // state when a prop changes":
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (userId !== trackedUserId) {
    setTrackedUserId(userId);
    setSeen(loadSeenSet(userId));
  }

  // The ref is only mutated inside an effect, not during render — reset it here
  // separately when userId changes, apart from the toast effect below (which
  // depends on `items`).
  useEffect(() => {
    knownIdsRef.current = new Set();
    isFirstRunRef.current = true;
  }, [userId]);

  useEffect(() => {
    const currentIds = new Set(items.map((i) => i.id));

    if (!isFirstRunRef.current) {
      const newlyArrived = items.filter(
        (i) => !knownIdsRef.current.has(i.id) && !seen.has(i.id),
      );
      newlyArrived.forEach((item) => {
        const fn = TOAST_FN_BY_TYPE[item.type] ?? toast;
        fn(item.msg, {
          action: item.path
            ? { label: "View", onClick: () => navigate(item.path) }
            : undefined,
        });
      });
    }

    knownIdsRef.current = currentIds;
    isFirstRunRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const unreadCount = useMemo(
    () => items.filter((i) => !seen.has(i.id)).length,
    [items, seen],
  );

  function isUnread(id) {
    return !seen.has(id);
  }

  function markAllRead() {
    const next = new Set(seen);
    items.forEach((i) => next.add(i.id));
    setSeen(next);
    saveSeenSet(userId, next);
  }

  return { unreadCount, isUnread, markAllRead };
}
