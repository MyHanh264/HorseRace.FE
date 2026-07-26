/**
 * Lõi mô phỏng đua ngựa — thuần hàm, không phụ thuộc React.
 *
 * ══ VÌ SAO PHẢI MÔ PHỎNG ═════════════════════════════════════════════════════
 * Backend KHÔNG có dữ liệu vị trí theo thời gian thực, và đó là chủ ý: Blind
 * Double-Entry (Flow 4) yêu cầu server mù trong lúc leg đang chạy. LegOfficialResult
 * chỉ lưu FinishPosition + ResultStatus — không split time, không tốc độ, không
 * quãng đường. Vị trí xuất hiện NGUYÊN KHỐI khi cả hai trọng tài submit và khớp.
 *
 * Nên animation ở đây là PHÁT LẠI DỰNG LẠI, không phải telemetry. Hai tính chất
 * bắt buộc phải giữ:
 *
 *   1. TẤT ĐỊNH — quỹ đạo sinh từ seed (raceId, legNumber), nên mọi khán giả
 *      xem CÙNG một cuộc đua. Với sản phẩm có cá cược, quỹ đạo ngẫu nhiên theo
 *      máy sẽ trông tùy tiện và làm mất niềm tin.
 *
 *   2. THỨ TỰ VỀ ĐÍCH ĐÚNG TUYỆT ĐỐI — đảm bảo bằng CẤU TRÚC thuật toán
 *      (xem buildTrajectories), không phải bằng may rủi rồi kiểm tra lại.
 */

// ─── PRNG tất định ────────────────────────────────────────────────────────────

/** Băm chuỗi → seed 32-bit (xmur3). */
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** PRNG mulberry32 — nhanh, phân bố đủ tốt cho mục đích hình ảnh. */
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bộ sinh số ngẫu nhiên tất định cho một leg cụ thể. */
export function createRng(raceId, legNumber) {
  const rand = mulberry32(xmur3(`hrs:${raceId}:${legNumber}`)());
  return {
    next: rand,
    /** Số thực trong [min, max). */
    range: (min, max) => min + rand() * (max - min),
    /** Số nguyên trong [min, max]. */
    int: (min, max) => Math.floor(min + rand() * (max - min + 1)),
  };
}

// ─── Giải mã vị trí ───────────────────────────────────────────────────────────

/**
 * RaceLiveLegResultDto.Position là MÃ HÓA, không phải hạng thuần:
 *   > 0 → hạng về đích;  -1 → DNF;  -2 → DQ.
 *
 * Đây là bẫy dễ sai nhất của payload này: sort trực tiếp trên `position` sẽ đẩy
 * ngựa DNF/DQ lên ĐẦU bảng. Luôn giải mã trước khi sort hay animate.
 */
export function decodePosition(position) {
  if (position === -1) return { rank: null, isDnf: true, isDq: false };
  if (position === -2) return { rank: null, isDnf: false, isDq: true };
  return { rank: position, isDnf: false, isDq: false };
}

/** So sánh để xếp bảng kết quả: người về đích trước lên trên, DNF/DQ xuống đáy. */
export function compareResults(a, b) {
  const da = decodePosition(a.position);
  const db = decodePosition(b.position);
  if (da.rank && db.rank) return da.rank - db.rank;
  if (da.rank) return -1;
  if (db.rank) return 1;
  // Cả hai đều không về đích: DQ (đã chạy hết) xếp trên DNF (bỏ cuộc giữa chừng).
  if (da.isDq !== db.isDq) return da.isDq ? -1 : 1;
  return a.entryId - b.entryId;
}

// ─── Màu sắc ──────────────────────────────────────────────────────────────────

/**
 * Áo nài — 12 màu tương phản cao, index theo GateNumber. Đây mới là thứ giúp
 * phân biệt ngựa khi nhìn lướt (màu lông thật quá gần nhau: bay/chestnut/brown).
 */
const SILKS = [
  { fill: "#e6c364", accent: "#3d2e00" }, // gold
  { fill: "#4aa3df", accent: "#0b2a3f" }, // blue
  { fill: "#e2574c", accent: "#3f0d0a" }, // red
  { fill: "#8dd6a6", accent: "#00391e" }, // emerald
  { fill: "#b07de8", accent: "#2a0d40" }, // violet
  { fill: "#f0913e", accent: "#3f2000" }, // orange
  { fill: "#f5f0e6", accent: "#3a352c" }, // cream
  { fill: "#3fc9c0", accent: "#03332f" }, // teal
  { fill: "#ee7bb0", accent: "#400d26" }, // pink
  { fill: "#98a63f", accent: "#232a05" }, // olive
  { fill: "#7c8aa0", accent: "#151c26" }, // slate
  { fill: "#c96a2e", accent: "#33150a" }, // rust
];

export function silkFor(gateNumber, entryId) {
  const idx = (gateNumber ?? entryId ?? 0) - 1;
  return SILKS[((idx % SILKS.length) + SILKS.length) % SILKS.length];
}

/** Horse.Color là free-text mô tả màu LÔNG (tiếng Anh lẫn tiếng Việt). */
const COAT_COLORS = {
  bay: "#7a4a24",
  chestnut: "#9c5426",
  brown: "#6b4423",
  black: "#2b2b2f",
  grey: "#9a9a9e",
  gray: "#9a9a9e",
  white: "#e4e2dc",
  palomino: "#d4a656",
  roan: "#8d7469",
  dun: "#b8945f",
  buckskin: "#c69a4e",
  nâu: "#6b4423",
  đen: "#2b2b2f",
  trắng: "#e4e2dc",
  xám: "#9a9a9e",
  hồng: "#c98878",
  vàng: "#c9a24e",
};

const COAT_FALLBACK = "#7a4a24";

export function coatColorFor(color) {
  if (!color) return COAT_FALLBACK;
  const key = String(color).trim().toLowerCase();
  if (COAT_COLORS[key]) return COAT_COLORS[key];
  // Chuỗi kiểu "Dark Bay" / "Ngựa nâu" — tìm từ khóa bên trong.
  const hit = Object.keys(COAT_COLORS).find((k) => key.includes(k));
  return hit ? COAT_COLORS[hit] : COAT_FALLBACK;
}

// ─── Dựng quỹ đạo ─────────────────────────────────────────────────────────────

export const RACE_DURATION_S = 26; // thời lượng phát lại một leg

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Dựng quỹ đạo cho toàn bộ ngựa của một leg đã có kết quả chính thức.
 *
 * @param entries  RaceLiveEntryDto[]  — danh sách ngựa (thứ tự theo GateNumber)
 * @param results  RaceLiveLegResultDto[] — kết quả đã confirm (position mã hóa)
 * @param seedKey  { raceId, legNumber } — khóa seed để mọi client khớp nhau
 * @returns { duration, runners: [{ entryId, finishTime, isDnf, isDq, rank, dropoutAt, progressAt(t) }] }
 *
 * ══ ĐẢM BẢO THỨ TỰ VỀ ĐÍCH ═══════════════════════════════════════════════════
 * Ngựa hạng r được gán thời điểm về đích t_r = t_{r-1} + delta_r với delta_r > 0.
 * Vì {t_r} đơn điệu tăng theo r, thứ tự cắt vạch đích ĐÚNG TUYỆT ĐỐI bất kể nhiễu.
 *
 * Nhiễu tạo kịch tính được nhân với envelope sin(π·t/t_i) — bằng 0 ở CẢ HAI đầu,
 * nên p(0) = 0 và p(t_i) = 1 chính xác. Nói cách khác: ngựa vượt nhau, bám đuổi,
 * đổi ngôi dẫn đầu thoải mái ở giữa đường, nhưng điểm mút không thể bị xê dịch.
 */
export function buildTrajectories(entries, results, { raceId, legNumber }) {
  const rng = createRng(raceId, legNumber);
  const resultByEntry = new Map(results.map((r) => [r.entryId, r]));

  // Xếp theo hạng thật để gán thời điểm về đích.
  const decoded = entries.map((e) => {
    const res = resultByEntry.get(e.entryId);
    const d = res ? decodePosition(res.position) : { rank: null, isDnf: false, isDq: false };
    return { entry: e, ...d, points: res?.points ?? 0 };
  });

  const finishers = decoded
    .filter((d) => d.rank !== null)
    .sort((a, b) => a.rank - b.rank);

  // DQ vẫn chạy hết cuộc đua (DQ là án phạt SAU đua — vị trí vật lý không được
  // ghi nhận), nên cho về đích ở nhóm cuối thay vì bỏ cuộc.
  const dqs = decoded.filter((d) => d.isDq);

  // 1) Khoảng cách thời gian giữa các hạng liên tiếp.
  const gaps = [];
  for (let i = 1; i < finishers.length + dqs.length; i++) {
    gaps.push(rng.range(0.15, 1.2));
  }
  const totalGap = gaps.reduce((s, g) => s + g, 0);

  // 2) Con dẫn đầu về đích ở ~78% thời lượng, phần còn lại chia cho các khoảng
  //    cách — scale lại để con cuối cùng vừa khít trong RACE_DURATION_S.
  const leaderFinish = RACE_DURATION_S * 0.78;
  const budget = RACE_DURATION_S - leaderFinish;
  const scale = totalGap > 0 ? Math.min(1, budget / totalGap) : 1;

  const ordered = [...finishers, ...dqs];
  const finishTimes = new Map();
  let t = leaderFinish;
  ordered.forEach((d, i) => {
    if (i > 0) t += gaps[i - 1] * scale;
    finishTimes.set(d.entry.entryId, t);
  });

  const runners = decoded.map((d) => {
    const entryId = d.entry.entryId;

    // Tham số kịch tính riêng cho từng ngựa, tất định theo seed.
    const amp = rng.range(0.03, 0.09);
    const f1 = rng.range(0.08, 0.18);
    const f2 = f1 * 2.3;
    const ph1 = rng.range(0, Math.PI * 2);
    const ph2 = rng.range(0, Math.PI * 2);

    // DNF bỏ cuộc đâu đó giữa đường.
    const dropoutAt = d.isDnf ? rng.range(0.45, 0.85) : null;
    const dropoutTime = d.isDnf ? RACE_DURATION_S * rng.range(0.45, 0.8) : null;

    const finishTime = finishTimes.get(entryId) ?? RACE_DURATION_S;

    // Chốt chặn đơn điệu: ngựa không bao giờ được lùi lại trên màn hình, kể cả
    // khi nhiễu đổi dấu. Giữ đỉnh đã đạt theo từng runner.
    let peak = 0;
    let lastT = -1;

    const progressAt = (time) => {
      // Tua ngược (người dùng bấm xem lại) → reset chốt đơn điệu.
      if (time < lastT) peak = 0;
      lastT = time;

      if (d.isDnf) {
        if (time >= dropoutTime) return dropoutAt;
        const u = clamp01(time / dropoutTime);
        const p = clamp01(Math.pow(u, 0.92) * dropoutAt);
        peak = Math.max(peak, p);
        return peak;
      }

      if (time >= finishTime) return 1;
      const u = clamp01(time / finishTime);
      const base = Math.pow(u, 0.92); // xuất phát nhanh hơn chút, giống ngựa thật
      const env = Math.sin(Math.PI * u); // = 0 ở u=0 và u=1 → giữ nguyên điểm mút
      const noise =
        amp * (Math.sin(2 * Math.PI * f1 * time + ph1) + 0.6 * Math.sin(2 * Math.PI * f2 * time + ph2));
      const p = clamp01(base + noise * env);
      peak = Math.max(peak, p);
      return peak;
    };

    return {
      entryId,
      entry: d.entry,
      rank: d.rank,
      points: d.points,
      isDnf: d.isDnf,
      isDq: d.isDq,
      finishTime,
      dropoutAt,
      // Thời điểm ngựa DNF thực sự dừng lại. FE chỉ được làm mờ + gắn nhãn DNF
      // TỪ mốc này trở đi — gắn ngay từ giây 0 là tiết lộ trước kết quả.
      dropoutTime,
      progressAt,
    };
  });

  return { duration: RACE_DURATION_S, runners };
}

/**
 * Chế độ "đàn ngựa" cho leg ĐANG chạy mà chưa có kết quả.
 *
 * Ngựa chạy SÁT nhau, chênh lệch tối đa ±3%, và UI không hiện số thứ hạng.
 * Đây là ràng buộc trung thực chứ không phải lựa chọn thẩm mỹ: nếu để ngựa tách
 * xa nhau khi server còn chưa biết kết quả, khán giả đang đặt cược sẽ đọc đó là
 * thứ hạng thật.
 */
export function packProgressAt(entryId, elapsedS, { raceId, legNumber }) {
  const rng = createRng(raceId, `${legNumber}:pack:${entryId}`);
  const f = rng.range(0.15, 0.35);
  const ph = rng.range(0, Math.PI * 2);
  const spread = rng.range(-0.03, 0.03);
  return clamp01(0.42 + spread + 0.02 * Math.sin(2 * Math.PI * f * elapsedS + ph));
}
