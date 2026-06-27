# HRS — Đặc tả API đầy đủ cho Frontend (Cursor)

> **Dành cho Cursor:** dùng file này làm ngữ cảnh khi code Frontend (React + Vite + axios).
> Có thể gắn vào chat (`@API_SPEC_FOR_CURSOR.md`) hoặc thêm vào `.cursor/rules`. Khi sinh code gọi API,
> bám đúng path / method / body / response bên dưới. Nguồn sự thật: BE `HorseRaceManagementSystem/`.
> Cập nhật: 2026-06-25. Backend build 0 lỗi; cả 8 Main Flow đã có orchestration thật.

---

## 0. Quy ước chung (ĐỌC TRƯỚC)

- **Base URL:** dev dùng proxy Vite `/api` → `https://horseracemanagementsystem.onrender.com`. Override bằng env `VITE_API_BASE_URL`. Luôn gọi đường dẫn bắt đầu `/api/...`.
- **Xác thực:** JWT Bearer. Header `Authorization: Bearer <accessToken>` cho mọi endpoint trừ nhóm public ở Auth. FE đã có axios instance `src/services/api.js` tự gắn token + refresh khi 401.
- **Claims trong JWT:** `sub` = userId, `email`, `role` (1 trong: `ADMIN`, `REFEREE`, `HORSE_OWNER`, `JOCKEY`, `SPECTATOR`), `fullName`.
- **Identity lấy từ token (QUAN TRỌNG):** nhiều endpoint ghi **bỏ qua** các trường định danh trong body và lấy từ JWT: `HorseOwnerId` (mời nài/nộp Entry), `SpectatorId` (đặt cược), `RefereeUserId` (báo cáo/đua), `AdminId`. FE có thể vẫn gửi nhưng **server ghi đè**. ⇒ không cần (và không nên) tin các id đó ở client.
- **Định dạng lỗi:** `ProblemDetails` JSON `{ status, title, detail, instance }`. FE nên đọc `detail` → `title` → `message`. Mã: **400** (InvalidOperation — vi phạm nghiệp vụ), **401** (chưa đăng nhập), **403** (sai role), **404** (không tìm thấy).
- **Phân trang:** các endpoint admin nhận `?page=&pageSize=` và trả `{ items, total, ... }`. Một số GET generic trả mảng thuần (FE tự lọc/sắp).
- **Vai trò → trang chủ:** `ADMIN→/admin`, `SPECTATOR→/spectator`, `JOCKEY→/jockey`, `REFEREE→/referee`, `HORSE_OWNER→/horse-owner`.

---

## 1. Auth — `/api/auth` (public, trừ profile/logout)

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/api/auth/register/spectator` | public | `{email, password, fullName, phoneNumber?}` | 201 `RegisterResponse` |
| POST | `/api/auth/register/horse-owner` | public | `{email, password, fullName, phoneNumber?}` | 201 (Pending — chờ admin duyệt) |
| POST | `/api/auth/register/jockey` | public | `{email, password, fullName, phoneNumber?, licenseNumber, weight, bio?}` | 201 (Pending) |
| POST | `/api/auth/login` | public | `{email, password}` | `{accessToken, refreshToken, ...user}` |
| POST | `/api/auth/refresh-token` | public | `{refreshToken}` | `{accessToken, refreshToken}` (rotation) |
| POST | `/api/auth/logout` | Bearer | `{refreshToken}` | 204 |
| GET | `/api/auth/profile` | Bearer | — | `{ user: {userId, email, fullName, phoneNumber, avatarUrl, role, status, isActive, licenseNumber, weight, bio, isProfileComplete, createdAt} }` |
| POST | `/api/auth/forgot-password` | public | `{email}` | `{message, otp, expiresInMinutes}` — ⚠️ DEV: **OTP trả trong response** (chưa có email service) |
| POST | `/api/auth/reset-password` | public | `{email, otpCode, newPassword, confirmPassword}` | `{success, message}` |

- `GET /api/auth/profile` trả về `{ user }` — FE lấy `data.user ?? data`.
- OTP gồm 6 chữ số, hết hạn 15 phút.

---

## 2. Flow 1 — Đăng ký & duyệt ngựa

**Horse Owner — `/api/horses`** (GET cho mọi user đăng nhập; ghi = HORSE_OWNER)

| Method | Path | Auth | Body / Note |
|---|---|---|---|
| POST | `/api/horses` | HORSE_OWNER | `{name, breed?, birthYear?, color?, imageUrl?}` — OwnerId từ JWT → `{horseId}` |
| GET | `/api/horses?status=` | Bearer | Owner thấy ngựa của mình; lọc theo status |
| GET | `/api/horses/{id}` | Bearer | chi tiết |
| PUT | `/api/horses/{id}` | HORSE_OWNER | sửa (chỉ khi `Pending`; chặn khi Approved/Rejected) |
| DELETE | `/api/horses/{id}` | HORSE_OWNER | xóa |

**Admin — `/api/admin`** (tất cả = ADMIN)

| Method | Path | Body |
|---|---|---|
| GET | `/api/admin/horses` | tất cả ngựa |
| GET | `/api/admin/horses/pending` | ngựa chờ duyệt |
| POST | `/api/admin/horses/{id}/approve` | → `Approved` |
| POST | `/api/admin/horses/{id}/reject` | `{reason}` (bắt buộc) → `Rejected` |
| POST | `/api/admin/horses/{id}/revoke` | thu hồi ngựa đã duyệt + auto-cancel Entry Pending dùng ngựa đó |

**Horse status:** `Pending → Approved | Rejected`; `Approved →` (revoke).

---

## 3. Flow 2 — Mời nài & nộp Entry

**JockeyProfiles — `/api/jockey-profiles`** (tìm nài)
- `GET /api/jockey-profiles` → **chỉ hiện nài có LicenseNumber + Weight**. Item: `{userId, fullName, licenseNumber, totalRaces, totalWins}`.
- `GET /api/jockey-profiles/{userId}` chi tiết; `PUT /api/jockey-profiles/{userId}` nài cập nhật hồ sơ.

**Invitations — `/api/jockey-invitations`** (Bearer; scope theo role)
- `POST` [HORSE_OWNER] body `{jockeyId, horseId, raceId, message?}` — HorseOwnerId từ JWT. Validate: ngựa `Approved` + thuộc owner, race `Scheduled`, nài role JOCKEY + có License/Weight, chống trùng invitation active. → `{invitationId}`.
- `GET` → scope theo role: nài thấy lời mời **nhận**, owner thấy lời mời **gửi**, admin thấy tất cả. Item: `{invitationId, horseOwnerId, horseOwnerName, jockeyId, jockeyName, raceId, raceName, horseId, horseName, status, sentAt}`.
- `PUT /api/jockey-invitations/{id}` body `{status, responseReason?}` — **identity & quyền lấy từ JWT**:
  - `status="Accepted"|"Declined"` → chỉ **nài được mời**.
  - `status="Confirmed"|"Cancelled"` → chỉ **chủ ngựa**. Khi `Confirmed` → **tự Cancel** mọi invitation active khác cùng (ngựa+race); chặn 1 nài confirm cho 2 ngựa khác nhau trong cùng race.
  - ⚠️ FE chỉ gửi `{status, responseReason}` — **không gửi invitationId trong body** (lấy từ route).
- `DELETE /api/jockey-invitations/{id}`.

**Entries — `/api/entries`** (Bearer)
- `POST` [HORSE_OWNER] body `{raceId, horseId}` — HorseOwnerId từ JWT, **JockeyId tự lấy từ invitation `Confirmed`** (không cần gửi). Validate ngựa Approved+sở hữu, race Scheduled, chống trùng. → `{entryId}`.
- `GET /api/entries?raceId=` → **HORSE_OWNER chỉ thấy của mình**; referee/spectator/admin thấy tất cả. Item: `{entryId, raceId, horseId, horseName, horseImageUrl, jockeyId, jockeyName, jockeyAvatarUrl, horseOwnerId, horseOwnerName, gateNumber, status, submittedAt, approvedAt, currentOdds, tournamentName}`.
- `GET /api/entries/{id}`, `PUT`, `DELETE`.

**Admin duyệt Entry — `/api/admin`** (ADMIN)
- `GET /api/admin/entries/pending`
- `POST /api/admin/entries/{id}/approve`
- `POST /api/admin/entries/{id}/reject` body `{reason}`

**Luồng chuẩn (FE):** owner gửi invitation → nài `Accepted` → owner `Confirmed` (các invitation khác tự Cancel) → owner `POST /entries` (jockey suy ra từ Confirmed) → admin approve entry.

---

## 4. Flow 3 — Tournament, Race & Đăng ký

**Tournaments — `/api/tournaments`** (GET mọi user; ghi = ADMIN)
- `POST` [ADMIN] `{name, venue?, logoUrl?, startDate, endDate}` → tournamentId. `GET`, `GET/{id}`, `PUT/{id}` [ADMIN], `DELETE/{id}` [ADMIN].

**Races — `/api/races`** (GET mọi user; ghi = ADMIN)
- `POST` [ADMIN] `{tournamentId, name, scheduledStartTime, numberOfLegs (1-10), maxHorses, roundType, referee1Id, referee2Id}` → raceId. **Validate 2 referee khác nhau.**
- `GET /api/races`, `GET /api/races/{id}`.
- `PUT /api/races/{id}` [ADMIN] — **khóa NumberOfLegs khi race đã rời `Scheduled`**.
- `DELETE /api/races/{id}` [ADMIN].

**Đăng ký (RaceExecutionController, cùng prefix `/api/races`)**
- `POST /api/races/{id}/open-registration` [ADMIN] → `{raceId, registrationOpenAt}`.
- `POST /api/races/{id}/close-registration` [ADMIN] → `{raceId, approvedEntries, rejectedEntries}`.
  **Tác dụng:** auto-reject Entry `Pending` còn lại + **khóa Odds per-Entry** (theo win rate ngựa) + **gán GateNumber** + set `OddsComputedAt`. **Phải đóng đăng ký trước khi Start.**

**Race status:** `Scheduled → InProgress → (Paused) → PendingResult → Finished | Cancelled`.

---

## 5. Flow 4-5 — Vận hành đua (Blind double-entry & Resolve)

> **`legIndex` là 0-based** (legNumber = legIndex + 1). **Position encoding:** `1..n` = thứ hạng, `-1` = DNF, `-2` = DQ, `''`/null = chưa nhập.

| Method | Path | Auth | Note |
|---|---|---|---|
| POST | `/api/races/{id}/start` | REFEREE,ADMIN | Scheduled→InProgress, tạo Legs, khóa cược. **Yêu cầu đã đóng đăng ký.** → `{raceId, status, totalLegs}` |
| POST | `/api/races/{id}/resume` | ADMIN | Paused→InProgress (sau resolve) → `{raceId, status}` |
| GET | `/api/races/{id}/execution` | Bearer | trạng thái đầy đủ (xem dưới) |
| GET | `/api/races/{id}/standings` | Bearer | bảng điểm live |
| GET | `/api/races/{id}/pause` | REFEREE,ADMIN | so sánh 2 submission leg đang Conflicted |
| GET | `/api/races/{id}/legs/{legIndex}/referee-view` | REFEREE | view blind (ẩn input referee kia) |
| PUT | `/api/races/{id}/legs/{legIndex}/draft` | REFEREE | `{entries:[{entryId, position}]}` → `{saved:true}` (validate-only) |
| POST | `/api/races/{id}/legs/{legIndex}/submit` | REFEREE | `{entries:[{entryId, position}]}` → kết quả khớp/lệch |
| POST | `/api/races/{id}/legs/{legIndex}/override` | ADMIN | `{decisions:[{entryId, officialPosition}], overrideReason}` |

**`GET execution` →**
```json
{ "raceId":1, "status":"InProgress", "isBetsLocked":true, "totalLegs":3, "currentLegIndex":0,
  "legs":[ {"legIndex":0,"legNumber":1,"status":"Pending","referee1Submitted":false,
            "referee2Submitted":false,"mySubmitted":false,
            "results":[{"entryId":5,"position":1,"points":6}]} ] }
```
**`GET standings` →** `[{entryId, gateNumber, horseName, jockeyName, totalPoints, legWins, legTop3, position}]` (sắp giảm theo điểm).

**`GET referee-view` →**
```json
{ "raceId":1,"legIndex":0,"legNumber":1,
  "entries":[{"entryId":5,"gateNumber":1,"horseId":3,"horseName":"Bão","jockeyName":"A"}],
  "mySubmittedData":[{"entryId":5,"position":1}], "mySubmitted":true,
  "opponentSubmitted":false, "bothSubmitted":false, "legStatus":null }
```
**`POST submit` →** `{ "status":"AwaitingSecondReferee"|"Matched"|"Conflicted", "legIndex":0,"legNumber":1, "message":"...", "isRaceComplete":false, "nextLegIndex":1 }`. Khi cả 2 submit khớp → leg `Confirmed`; lệch → leg `Conflicted` + race `Paused`.

**`GET pause` →** `{ raceId, raceStatus, conflictedLeg: {legIndex, legNumber, comparison:[{entryId, gateNumber, horseName, referee1Position, referee2Position}]} | null }`.

**Leg status:** `Pending → AwaitingSecondReferee → Confirmed | Conflicted → Resolved`.
**Leg Points:** 1st=6, 2nd=5, 3rd=4, 4th=3, 5th=2, 6th=1, 7th+/DNF/DQ=0.

---

## 6. Flow 6 — Xử lý vi phạm

**Referee báo cáo — `/api/violations`** [REFEREE,ADMIN]
- `POST /api/violations` body `{raceId, entryId, violationType, description}` — RefereeId từ JWT, Status=`Pending`, LegNumber mặc định leg hiện hành. → `{violationId}`.
- `GET /api/violations` danh sách (CRUD).

**Admin xử lý — `/api/admin`** [ADMIN]
- `GET /api/admin/violations?status=&page=&pageSize=` → `{items, total, pendingCount, resolvedCount}`. Item: `{violationId, raceId, raceName, violatorName, violatorRole, violationType, description, penalty, status, resolvedByAdminName, resolvedAt, createdAt}`. (status FE: `Pending|Resolved|Dismissed`.)
- `POST /api/admin/violations/{id}/approve` body `{penalty: "Warning"|"Demote"|"DQ", adminNote?}` → áp **ngay vào standings**:
  - `Warning` = chỉ ghi nhận; `Demote` = tụt 1 hạng ở leg; `DQ` = Race DQ (0 điểm toàn race → xếp cuối khi publish).
- `POST /api/admin/violations/{id}/reject` body `{reason}` (bắt buộc).

---

## 7. Flow 7 — Ví điểm & Đặt cược

**Predictions — `/api/predictions`** (Bearer; ghi = SPECTATOR)
- `POST` [SPECTATOR] body `{raceId, firstEntryId, betAmount}` — **SpectatorId từ JWT; odds khóa server-side** (FE không cần tính odds). Validate: min 10, ≤ 50% số dư, **tối đa 1 dự đoán active/race**, race `Scheduled`, ví không đóng băng. → `{predictionId}`.
  - (Có thể gửi thêm `secondEntryId/thirdEntryId/oddsLocked*` nhưng **server bỏ qua** — chỉ dự đoán 1st.)
- `GET /api/predictions` → trả tất cả (FE lọc theo `spectatorId`). Item: `{predictionId, raceId, spectatorId, firstEntryId, betAmount, oddsLocked1, status, createdAt, cancelledAt}`.
- `DELETE /api/predictions/{id}` [SPECTATOR] → hủy (**chỉ khi `Pending` & race `Scheduled`**, hoàn 100%, **chỉ hủy được của chính mình**).

**Ví (đọc) — Bearer**
- `GET /api/point-wallets` → list `{walletId, spectatorId, balance, isFrozen, ...}` (FE lọc ví của mình theo spectatorId).
- `GET /api/wallet-transactions` → list `{walletTransactionId, walletId, spectatorId, type, amount, balanceAfter, reason, createdAt}`. Type: `BetPlaced|Payout|PayoutRollback|BetRefund|WeeklyTopUp|Credit|Bonus|...`.

**Admin quản lý điểm — `/api/admin/points`** [ADMIN]
- `GET /balances?search=&page=&pageSize=` → `{items:[{userId, userName, userEmail, role, balance, isFrozen}], total}`.
- `GET /transactions?search=&type=&page=&pageSize=` → `{items:[{transactionId, userId, userName, userEmail, type, amount, balanceAfter, reason, createdAt}], total}`.
- `POST /adjust` body `{userId, amount, type, reason}` (`Credit|Bonus|Refund` = cộng; còn lại = trừ) → `{userId, newBalance}`.
- `POST /weekly-topup` → `{walletsToppedUp, weekStart}` (thường tự chạy thứ Hai qua background service).

**Khóa/Mở khóa account — `/api/admin/users`** [ADMIN]
- `POST /api/admin/users/{id}/lock` body `{reason?}` → `{userId, status, refundedPredictions}` (Spectator: **hoàn cược Pending + đóng băng ví**).
- `POST /api/admin/users/{id}/unlock` → `{userId, status}` (gỡ đóng băng).

**Ví quy tắc:** bắt đầu 100 điểm; +100 mỗi **thứ Hai 00:00** (tự động); số dư không âm.

---

## 8. Flow 8 — Công bố kết quả, Quyết toán & Leaderboard

**Publish — `/api/races`** [ADMIN]
- `POST /api/races/{id}/publish` → `{raceId, status, resultsCount, settledPredictions, totalPayout}`. **Atomic:** lưu RaceResult + xếp hạng (tie-break: tổng điểm → nhiều 1st → nhiều 2nd → vị trí leg cuối; Race DQ xuống đáy/0đ), cộng **Prize Points** (1st=1000, 2nd=600, 3rd=400, 4th=200, 5th=100, 6th+/DQ=0) cho Owner & Jockey, cập nhật Career stats Jockey, **quyết toán dự đoán** (`payout = betAmount × oddsLocked` nếu đoán đúng 1st), cộng ví, Race→`Finished`.
- `POST /api/races/{id}/unpublish` → `{raceId, status, reversedPayouts}` (rollback đối xứng, race→`PendingResult`).

**Leaderboards — `/api/leaderboards`** (Bearer)
- `GET /api/leaderboards/career?role=` → `[{rank, userId, fullName, role, prizePoints}]` (toàn giải; `role=JOCKEY|HORSE_OWNER` để lọc).
- `GET /api/leaderboards/tournament/{tournamentId}?role=` → cùng shape (trong 1 giải).
- Tính on-read từ Prize Points → tự cập nhật khi publish/unpublish.

---

## 9. Admin — Discrepancies & Users (bổ sung)

- `GET /api/admin/users/pending` · `POST /api/admin/users/{id}/approve` · `POST /api/admin/users/{id}/reject` body `{reason}`.
- `PUT /api/users/{id}/change-password` [Bearer] body `{currentPassword, newPassword}` — **UserId từ JWT** (route id bị bỏ qua; chỉ đổi mật khẩu của chính mình).
- `GET /api/admin/discrepancies?status=&page=&pageSize=` → `{items, total, pendingCount, resolvedCount}`. Item: `{discrepancyId, raceId, raceName, raceDate, reportedByName, reportedByEmail, reportedByRole, reportedAt, type, status, description, userPrediction, officialResult, resolution, adjustedPointsAwarded, resolvedByAdminName, resolvedAt}`.
- `POST /api/admin/discrepancies/{id}/resolve` body `{resolution, action: "Dismissed"|"AdjustPoints", adjustedPointsAwarded}`.

---

## 10. CRUD generic (ít dùng trực tiếp ở FE)

Các controller sau chỉ có CRUD chuẩn `POST / GET / GET{id} / PUT{id} / DELETE{id}`, **role-locked**:
- `/api/users` (GET mọi user; create/delete = ADMIN), `/api/roles` (ADMIN), `/api/spectators`, `/api/legs` (REFEREE,ADMIN), `/api/leg-referee-entries` (REFEREE,ADMIN — dữ liệu blind, không dùng để hiển thị công khai), `/api/leg-official-results` (REFEREE,ADMIN), `/api/race-results` (ghi = REFEREE,ADMIN), `/api/point-wallets` (ghi = ADMIN), `/api/wallet-transactions` (ghi = ADMIN), `/api/prize-point-transactions` (ADMIN), `/api/settlement-runs` (ADMIN), `/api/prediction-settlements` (ADMIN), `/api/tournaments`, `/api/violations`.
- **Ưu tiên dùng các endpoint nghiệp vụ** ở mục 2-8 thay vì CRUD trần (vận hành đua, đặt cược, publish… đều có endpoint riêng).

---

## 11. Bảng trạng thái & hằng số

| Đối tượng | Giá trị |
|---|---|
| Horse.status | `Pending` `Approved` `Rejected` |
| Entry.status | `Pending` `Approved` `Rejected` `Cancelled` |
| Invitation.status | `Pending` `Accepted` `Declined` `Confirmed` `Cancelled` `Expired` |
| Race.status | `Scheduled` `InProgress` `Paused` `PendingResult` `Finished` `Cancelled` |
| Leg.status | `Pending` `AwaitingSecondReferee` `Confirmed` `Conflicted` `Resolved` |
| Prediction.status | `Pending` `Won` `Lost` `Cancelled` |
| Violation.status | `Pending` `Approved` `Rejected` · Penalty: `Warning` `Demote` `DQ` |
| Position code (referee) | `1..n` thứ hạng · `-1` DNF · `-2` DQ |
| Leg Points | 6 / 5 / 4 / 3 / 2 / 1 / 0 (1st→6th, còn lại 0) |
| Prize Points | 1000 / 600 / 400 / 200 / 100 / 0 |
| Role codes | `ADMIN` `REFEREE` `HORSE_OWNER` `JOCKEY` `SPECTATOR` |

---

## 12. Các luồng end-to-end điển hình (cho FE)

1. **Đăng ký ngựa (Owner):** `POST /horses` → admin `POST /admin/horses/{id}/approve`.
2. **Mời nài → Entry (Owner):** `GET /jockey-profiles` → `POST /jockey-invitations` → (nài) `PUT /{id}` status=Accepted → (owner) `PUT /{id}` status=Confirmed → `POST /entries` → admin `POST /admin/entries/{id}/approve`.
3. **Mở giải (Admin):** `POST /tournaments` → `POST /races` (2 referee) → `POST /races/{id}/close-registration` (khóa odds + gán cổng).
4. **Đặt cược (Spectator):** xem odds qua `GET /entries?raceId=` (field `currentOdds`) → `POST /predictions {raceId, firstEntryId, betAmount}` → có thể `DELETE /predictions/{id}` khi race còn Scheduled.
5. **Chạy đua (Referee×2):** admin `POST /races/{id}/start` → mỗi referee `GET .../legs/{i}/referee-view` → `POST .../submit` → nếu Conflicted: admin `GET /races/{id}/pause` → `POST .../override` → `POST /races/{id}/resume`. Lặp đến hết leg.
6. **Vi phạm:** referee `POST /violations` → admin `POST /admin/violations/{id}/approve {penalty}`.
7. **Công bố (Admin):** race `PendingResult` → `POST /races/{id}/publish` → ví spectator thắng được cộng payout; leaderboard cập nhật. Sai sót → `POST /races/{id}/unpublish`.

---

## 13. Lưu ý khi code FE

- Dùng axios instance `src/services/api.js` (đã có refresh-token). Module `api/auth.js`, `api/jockey.js` đang dùng `fetch` — nên thống nhất dần.
- **Không tự tính odds** ở client cho việc đặt cược — server khóa odds. Hiển thị odds qua `entry.currentOdds`.
- Gửi `status`/`responseReason` cho invitation update; **không gửi invitationId trong body**.
- Khi gọi endpoint vận hành đua dùng **legIndex 0-based**.
- Bắt lỗi: đọc `err.response.data.detail || .title || .message`.
- Một số GET trả **toàn bộ** danh sách (predictions, point-wallets, wallet-transactions) → FE lọc theo `spectatorId`/`walletId` của user hiện tại.
