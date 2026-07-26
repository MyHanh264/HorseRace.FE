import { useCallback, useEffect, useRef, useState } from "react";
import { HubConnectionBuilder, HttpTransportType, LogLevel } from "@microsoft/signalr";
import { getRaceLive } from "../api/spectator";
import { getAccessToken } from "../utils/token";

const HUB_PATH = "/api/hubs/race-live";

// RaceLiveBroadcastBehavior nuốt lỗi push (BE ghi chú "client vẫn còn poll dự phòng 30s
// để bắt kịp"), nên poll là lưới an toàn bắt buộc chứ không phải tùy chọn.
const POLL_MS = 30_000;

/**
 * Snapshot theo dõi trực tiếp của một race.
 *
 * BE đẩy qua SignalR **đúng** payload của GET /api/races/{id}/live (RaceLiveResponse),
 * nên cả hai nguồn dùng chung một setter — không cần merge hay reducer riêng.
 *
 * Trả về { snapshot, connState, error, refetch }.
 */
export function useRaceLiveHub(raceId) {
  const [snapshot, setSnapshot] = useState(null);
  const [connState, setConnState] = useState("connecting"); // connecting|live|polling|closed
  const [error, setError] = useState(null);

  // Giữ trong ref để interval/handler không phải tái tạo mỗi lần snapshot đổi.
  const raceIdRef = useRef(raceId);
  useEffect(() => {
    raceIdRef.current = raceId;
  }, [raceId]);

  const refetch = useCallback(async () => {
    const id = raceIdRef.current;
    if (!id) return;
    try {
      const data = await getRaceLive(id);
      setSnapshot(data);
      setError(null);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Không tải được dữ liệu cuộc đua");
    }
  }, []);

  // ─── Nạp lần đầu + poll dự phòng ────────────────────────────────────────────
  useEffect(() => {
    if (!raceId) return;
    let active = true;

    const tick = async () => {
      // Tab ẩn thì không poll — người dùng không nhìn, và snapshot sẽ được nạp lại
      // ngay khi họ quay lại (listener visibilitychange bên dưới).
      if (document.hidden) return;
      if (!active) return;
      await refetch();
    };

    tick();
    const timer = setInterval(tick, POLL_MS);

    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [raceId, refetch]);

  // ─── SignalR ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!raceId) return;

    const base = import.meta.env.VITE_API_BASE_URL || "";
    const connection = new HubConnectionBuilder()
      .withUrl(`${base}${HUB_PATH}`, {
        // BE đọc JWT từ query string (?access_token=), có guard theo path hub.
        // Interceptor Bearer của axios KHÔNG áp dụng cho transport SignalR.
        accessTokenFactory: () => getAccessToken(),
        transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    let disposed = false;

    const join = async () => {
      try {
        await connection.invoke("JoinRace", Number(raceId));
      } catch {
        // Vào group thất bại thì chỉ mất push, poll vẫn chạy → hạ cấp êm.
      }
    };

    connection.on("RaceLiveChanged", (payload) => {
      if (disposed) return;
      // Chỉ nhận payload của đúng race đang xem (phòng khi group bị lệch sau reconnect).
      if (payload?.raceId && payload.raceId !== Number(raceIdRef.current)) return;
      setSnapshot(payload);
      setError(null);
    });

    connection.onreconnected(() => {
      if (disposed) return;
      setConnState("live");
      // Group SignalR lưu trong RAM tiến trình → mất sau reconnect, phải join lại.
      join();
      // Bù khoảng trống lúc mất kết nối.
      refetch();
    });

    connection.onreconnecting(() => {
      if (!disposed) setConnState("polling");
    });

    connection.onclose(() => {
      if (!disposed) setConnState("polling");
    });

    connection
      .start()
      .then(() => {
        if (disposed) return;
        setConnState("live");
        return join();
      })
      .catch(() => {
        // Hub chết không phải lỗi chí mạng: poll 30s vẫn giữ trang sống.
        if (!disposed) setConnState("polling");
      });

    return () => {
      disposed = true;
      connection.off("RaceLiveChanged");
      // invoke LeaveRace có thể reject nếu kết nối đã đóng — nuốt rồi stop().
      Promise.resolve(connection.invoke("LeaveRace", Number(raceId)))
        .catch(() => {})
        .finally(() => connection.stop().catch(() => {}));
    };
  }, [raceId, refetch]);

  return { snapshot, connState, error, refetch };
}
