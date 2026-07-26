import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Inbox } from "lucide-react";

const TYPE_DOT = {
  success: "bg-emerald-400",
  error: "bg-red-400",
  warn: "bg-yellow-400",
  info: "bg-sky-400",
};

// Số thông báo hiện tối đa trong dropdown. Cắt bớt để panel luôn gọn — phần còn
// lại chỉ đếm số, vì thông báo ở đây là "việc đang cần làm" chứ không phải hộp thư
// lưu trữ; ai muốn xem đủ thì vào đúng trang nghiệp vụ.
const MAX_VISIBLE = 6;

/**
 * Shared bell icon used across all roles. Does not fetch data itself —
 * receives `items` (from a per-role useXNotifications hook) and read state
 * (from useNotificationRead) via props.
 *
 * Thông báo **chỉ hiện khi bấm vào icon** — không tự bật, không toast. Xem ghi chú
 * trong `hooks/useNotificationRead.js` về lý do đã gỡ cơ chế toast tự động.
 */
export default function NotificationBell({
  items,
  unreadCount,
  isUnread,
  markAllRead,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  const visible = items.slice(0, MAX_VISIBLE);
  const hiddenCount = items.length - visible.length;

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative w-9 h-9 rounded-lg hover:bg-white/8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#161b22] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <p className="text-sm font-semibold text-white">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] text-gray-400 hover:text-white transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-gray-500">
              <Inbox size={22} />
              <p className="text-xs">No notifications</p>
            </div>
          ) : (
            <ul className="py-1">
              {visible.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      if (item.path) navigate(item.path);
                    }}
                    className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                        TYPE_DOT[item.type] ?? "bg-gray-400"
                      } ${isUnread(item.id) ? "" : "opacity-30"}`}
                    />
                    <span
                      className={`text-xs leading-relaxed ${
                        isUnread(item.id) ? "text-gray-200" : "text-gray-500"
                      }`}
                    >
                      {item.msg}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {hiddenCount > 0 && (
            <p className="px-4 py-2.5 text-[11px] text-gray-500 border-t border-white/10 bg-white/[0.02]">
              và {hiddenCount} thông báo khác
            </p>
          )}
        </div>
      )}
    </div>
  );
}
