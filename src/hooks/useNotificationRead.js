import { useMemo, useState } from "react";

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

/**
 * Tracks read/unread state for a list of notification items { id, type, msg, path }.
 * - "Read" state is stored by id in localStorage, scoped per userId (switching
 *   accounts on the same browser won't mix up notifications).
 * - Chỉ tính số chưa đọc để hiện badge trên icon chuông. **KHÔNG tự đẩy thông báo
 *   ra màn hình** — người dùng bấm vào chuông mới thấy danh sách (`NotificationBell`).
 *
 * Lịch sử: bản trước bắn 1 toast (sonner) cho mỗi item có id mới. Nhưng id của các
 * item nhóm-hàng-chờ được sinh TỪ CHÍNH NỘI DUNG — ví dụ `queue-horses:3,7,9` —
 * nên chỉ cần hàng chờ thay đổi (admin duyệt 1 con ngựa) là ra id khác, bị coi là
 * "thông báo mới" và bắn toast lại. Cộng với poll mỗi 45s trên nhiều hàng chờ, toast
 * xếp thành một cột dài ở góc phải. Đừng đưa cơ chế toast tự động này trở lại.
 */
export function useNotificationRead(items, userId) {
  const [trackedUserId, setTrackedUserId] = useState(userId);
  const [seen, setSeen] = useState(() => loadSeenSet(userId));

  // Switching accounts on the same browser (logging in as a different user) →
  // reload "read" state for the new user. Set state directly during render
  // (not inside an effect), following React's official pattern for "adjusting
  // state when a prop changes":
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (userId !== trackedUserId) {
    setTrackedUserId(userId);
    setSeen(loadSeenSet(userId));
  }

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
