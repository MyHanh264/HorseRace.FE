# Horse Race Management System — Frontend (HorseRace.FE)

## 1. Tech Stack FE

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | React | 19.2.6 |
| Build Tool | Vite | 8.0.12 |
| Language | JavaScript (ESM) | - |
| Styling | TailwindCSS | 4.3.0 |
| UI Library | Ant Design | 6.4.3 |
| Router | React Router | 7.15.1 |
| State | React Context + useState | - |
| HTTP Client | Axios | 1.16.1 |
| Icons | Lucide React + Phosphor Icons | - |
| Notifications | Sonner (toast) | 2.0.7 |
| Utilities | cmdk (command menu) | 1.1.1 |

---

## 2. Cấu trúc Thư mục FE

```
HorseRace.FE/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── api/                    # API call functions
│   │   ├── auth.js            # Login, register, logout, profile
│   │   ├── admin.js           # Admin operations
│   │   ├── spectator.js       # Spectator operations
│   │   ├── referee.js         # Referee operations
│   │   ├── jockey.js          # Jockey operations
│   │   └── horseOwner.js      # Horse owner operations
│   ├── assets/                # Static assets
│   ├── components/
│   │   ├── layout/           # Layout components
│   │   │   ├── AdminLayout.jsx
│   │   │   ├── AdminSidebar.jsx
│   │   │   ├── AdminHeader.jsx
│   │   │   ├── SpectatorLayout.jsx
│   │   │   ├── JockeyLayout.jsx
│   │   │   ├── HorseOwnerLayout.jsx
│   │   │   ├── RefereeLayout.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── DashboardLayout.jsx
│   │   │   └── AuthLayout.jsx
│   │   ├── AuthSessionSync.jsx    # Sync auth state with tab
│   │   ├── RequireRole.jsx        # Role-based route guard
│   │   └── RaceCard.jsx          # Race card component
│   ├── constants/
│   │   └── index.js           # Constants (mock data)
│   ├── context/
│   │   └── AuthContext.jsx    # Auth state management
│   ├── pages/
│   │   ├── admin/            # Admin pages
│   │   │   ├── AdminAnalyticsPage.jsx
│   │   │   ├── AdminUsersPage.jsx
│   │   │   ├── AdminHorsesPage.jsx
│   │   │   ├── AdminTournamentsPage.jsx
│   │   │   ├── AdminRacesPage.jsx
│   │   │   ├── AdminDiscrepanciesPage.jsx
│   │   │   ├── AdminViolationsPage.jsx
│   │   │   ├── AdminPointManagementPage.jsx
│   │   │   ├── AdminRaceExecutionPage.jsx
│   │   │   ├── AdminRaceEntriesPage.jsx
│   │   │   └── AdminConflictResolutionPage.jsx
│   │   ├── spectator/       # Spectator pages
│   │   │   ├── SpectatorDashboard.jsx
│   │   │   ├── RacesBettingPage.jsx
│   │   │   ├── MyPredictionsPage.jsx
│   │   │   ├── PointWalletPage.jsx
│   │   │   ├── LeaderboardPage.jsx
│   │   │   └── SpectatorProfilePage.jsx
│   │   ├── jockey/          # Jockey pages
│   │   │   ├── JockeyDashboard.jsx
│   │   │   ├── JockeyProfilePage.jsx
│   │   │   ├── JockeyInvitationPage.jsx
│   │   │   ├── JockeyRacesPage.jsx
│   │   │   └── JockeyLeaderboardPage.jsx
│   │   ├── referee/         # Referee pages
│   │   │   ├── RefereeAssignedRacesPage.jsx
│   │   │   ├── RefereeRaceDashboard.jsx
│   │   │   ├── LegSubmissionPage.jsx
│   │   │   ├── RefereeResultEntryPage.jsx
│   │   │   ├── RefereeViolationsPage.jsx
│   │   │   └── RefereeProfilePage.jsx
│   │   ├── horse-owner/     # Horse owner pages
│   │   │   ├── HorseOwnerDashboard.jsx
│   │   │   ├── MyHorsesPage.jsx
│   │   │   ├── HorseDetailPage.jsx
│   │   │   ├── RegisterHorseModal.jsx
│   │   │   ├── EditHorseModal.jsx
│   │   │   ├── ViewHorseModal.jsx
│   │   │   ├── ConfirmJockeyModal.jsx
│   │   │   ├── SendInvitationModal.jsx
│   │   │   ├── MyEntriesPage.jsx
│   │   │   ├── InvitationsPage.jsx
│   │   │   ├── OwnerProfilePage.jsx
│   │   │   └── HorseOwnerTournamentsPage.jsx
│   │   ├── customer/
│   │   │   ├── Dashboard.jsx
│   │   │   └── LandingDashboard.jsx
│   │   ├── loginPage/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── ForgotPasswordPage.jsx
│   │   │   └── ResetPasswordPage.jsx
│   │   └── registerPage/
│   │       └── RegisterPage.jsx
│   ├── services/
│   │   └── api.js          # Axios instance with interceptors
│   ├── utils/
│   │   ├── token.js        # Token management (localStorage)
│   │   ├── validation.js   # Form validation
│   │   ├── legValidation.js
│   │   └── horse.js
│   ├── App.jsx             # Main app with routes
│   ├── main.jsx            # Entry point
│   ├── index.css           # Global styles
│   └── App.css             # App-specific styles
├── index.html
├── package.json
├── vite.config.js          # Vite config with proxy
├── tailwind.config.js       # TailwindCSS config
├── eslint.config.js
├── jsconfig.json
└── README.md
```

---

## 3. Routing

### Route Structure

Routes được định nghĩa trong `src/App.jsx` sử dụng React Router v7:

```jsx
<BrowserRouter>
  <Routes>
    {/* Public */}
    <Route path="/" element={<LandingDashboard />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/register" element={<RegisterPage />} />

    {/* Admin - RequireRole wrapper */}
    <Route path="/admin" element={<RequireRole role="ADMIN"><AdminLayout /></RequireRole>}>
      <Route index element={<AdminAnalyticsPage />} />
      <Route path="users" element={<AdminUsersPage />} />
      <Route path="horses" element={<AdminHorsesPage />} />
      <Route path="tournaments" element={<AdminTournamentsPage />} />
      <Route path="races" element={<AdminRacesPage />} />
      <Route path="discrepancies" element={<AdminDiscrepanciesPage />} />
      <Route path="violations" element={<AdminViolationsPage />} />
      <Route path="point-management" element={<AdminPointManagementPage />} />
      <Route path="races/:raceId/entries" element={<AdminRaceEntriesPage />} />
      <Route path="race-execution" element={<AdminRaceExecutionPage />} />
      <Route path="races/:id/conflict" element={<AdminConflictResolutionPage />} />
    </Route>

    {/* Spectator */}
    <Route path="/spectator" element={<RequireRole role="SPECTATOR"><SpectatorLayout /></RequireRole>}>
      <Route index element={<SpectatorDashboard />} />
      <Route path="races" element={<RacesBettingPage />} />
      <Route path="predictions" element={<MyPredictionsPage />} />
      <Route path="wallet" element={<PointWalletPage />} />
      <Route path="leaderboard" element={<LeaderboardPage />} />
      <Route path="profile" element={<SpectatorProfilePage />} />
    </Route>

    {/* Jockey */}
    <Route path="/jockey" element={<RequireRole role="JOCKEY"><JockeyLayout /></RequireRole>}>
      <Route index element={<JockeyDashboard />} />
      <Route path="invitations" element={<JockeyInvitationPage />} />
      <Route path="races" element={<JockeyRacesPage />} />
      <Route path="leaderboard" element={<JockeyLeaderboardPage />} />
      <Route path="profile" element={<JockeyProfilePage />} />
    </Route>

    {/* Referee */}
    <Route path="/referee" element={<RequireRole role="REFEREE"><RefereeLayout /></RequireRole>}>
      <Route index element={<RefereeAssignedRacesPage />} />
      <Route path="races/:id" element={<RefereeRaceDashboard />} />
      <Route path="races/:id/legs/:legId" element={<LegSubmissionPage />} />
      <Route path="result-entry" element={<RefereeResultEntryPage />} />
      <Route path="violations" element={<RefereeViolationsPage />} />
      <Route path="profile" element={<RefereeProfilePage />} />
    </Route>

    {/* Horse Owner */}
    <Route path="/horse-owner" element={<RequireRole role="HORSE_OWNER"><HorseOwnerLayout /></RequireRole>}>
      <Route index element={<HorseOwnerDashboard />} />
      <Route path="horses" element={<MyHorsesPage />} />
      <Route path="horses/:horseId" element={<HorseDetailPage />} />
      <Route path="tournaments" element={<HorseOwnerTournamentsPage />} />
      <Route path="entries" element={<MyEntriesPage />} />
      <Route path="invitations" element={<InvitationsPage />} />
      <Route path="profile" element={<OwnerProfilePage />} />
    </Route>
  </Routes>
</BrowserRouter>
```

### Role-based Access Control
- `RequireRole` component check `user.role` từ `AuthContext`
- Redirect về `/login` nếu không có quyền

---

## 4. Quản lý State

### Auth State (`AuthContext.jsx`)

```jsx
const AuthContext = createContext(null)

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = getAccessToken()
    return token ? userFromToken(token) : null
  })

  const login = useCallback((data, remember = true) => {
    setAuthTokens({ accessToken, refreshToken, remember })
    setUser(userFromLoginData(data))
  }, [])

  const logout = useCallback(async () => {
    await logoutUser({ accessToken, refreshToken })
    clearSession()
  }, [clearSession])

  const value = {
    user,
    isAuthenticated: Boolean(user && getAccessToken()),
    login,
    logout,
    clearSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
```

### User Object Structure
```javascript
{
  userId: Number,
  email: String,
  fullName: String,
  role: String  // 'ADMIN' | 'SPECTATOR' | 'JOCKEY' | 'HORSE_OWNER' | 'REFEREE'
}
```

### Token Storage (`utils/token.js`)
- Access token: `auth_access_token`
- Refresh token: `auth_refresh_token`
- Remember flag: `auth_remember`
- Parse JWT payload để lấy user info

---

## 5. Gọi API

### Axios Instance (`services/api.js`)

```javascript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 10000,
})

// Request interceptor - add auth header
api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor - handle 401 & refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Auto-refresh on 401, retry original request
  }
)
```

### API Functions (`api/*.js`)

| File | Functions |
|------|-----------|
| `auth.js` | `loginUser`, `registerUser`, `logoutUser`, `getMyProfile`, `refreshAuthToken`, `forgotPassword`, `resetPassword` |
| `admin.js` | User/horse/entry management, points, discrepancies, violations |
| `spectator.js` | Predictions, wallet, leaderboard |
| `referee.js` | Race execution, leg submission, violations |
| `jockey.js` | Profile, invitations, races |
| `horseOwner.js` | Horses, entries, invitations, tournaments |

### Error Handling Pattern
```javascript
async function fetchData() {
  try {
    const res = await api.get('/endpoint')
    return res.data
  } catch (error) {
    const message = error.response?.data?.detail || 'Error message'
    toast.error(message)
    throw error
  }
}
```

---

## 6. Kiến trúc Component

### Layout Components
Mỗi role có layout riêng:
- `AdminLayout` — Sidebar + Header + Footer (dark theme)
- `SpectatorLayout` — Navigation + Content
- `JockeyLayout` — Dashboard style
- `HorseOwnerLayout` — Sidebar navigation
- `RefereeLayout` — Assignment-based navigation

### Component Pattern
```jsx
// Example component structure
export default function MyPage() {
  const { user } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData().then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spin />

  return (
    <div>
      <Title>Page Title</Title>
      {/* Content */}
    </div>
  )
}
```

### Modal Pattern (Ant Design)
```jsx
const [isModalOpen, setIsModalOpen] = useState(false)

return (
  <>
    <Button onClick={() => setIsModalOpen(true)}>Open</Button>
    <MyModal
      open={isModalOpen}
      onCancel={() => setIsModalOpen(false)}
      onSuccess={() => {
        setIsModalOpen(false)
        refetch()
      }}
    />
  </>
)
```

### Key Reusable Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `RequireRole` | `components/RequireRole.jsx` | Route guard theo role |
| `AuthSessionSync` | `components/AuthSessionSync.jsx` | Sync auth across tabs |
| `RaceCard` | `components/RaceCard.jsx` | Display race info card |
| `*Layout` | `components/layout/*` | Page layouts per role |

---

## 7. Styling

### TailwindCSS v4
- Sử dụng `@tailwindcss/vite` plugin
- Dark theme style inline (GitHub dark palette):
  - Background: `#0D1117`, `#161B22`
  - Text: `#E6EDF3`, `#8B949E`
  - Border: `#30363D`

### Ant Design Integration
- Override Ant Design theme variables
- Dùng Ant Design components: `Table`, `Modal`, `Form`, `Button`, `Select`, `DatePicker`, etc.

### CSS Variables
```css
:root {
  --bg-primary: #0D1117;
  --bg-secondary: #161B22;
  --text-primary: #E6EDF3;
  --text-secondary: #8B949E;
  --border: #30363D;
}
```

---

## 8. Các Trang/Tính năng Chính

### Public Pages
| Page | Component | Mô tả |
|------|-----------|--------|
| Landing | `LandingDashboard` | Trang chủ với hero, upcoming races, leaderboard |
| Login | `LoginPage` | Form đăng nhập |
| Register | `RegisterPage` | Form đăng ký (chọn role) |
| Forgot Password | `ForgotPasswordPage` | Quên mật khẩu (OTP) |
| Reset Password | `ResetPasswordPage` | Đặt lại mật khẩu |

### Admin Pages
| Page | Mô tả |
|------|--------|
| `AdminAnalyticsPage` | Dashboard analytics |
| `AdminUsersPage` | Quản lý users (approve/reject) |
| `AdminHorsesPage` | Quản lý horses (approve/reject/revoke) |
| `AdminTournamentsPage` | CRUD tournaments |
| `AdminRacesPage` | CRUD races |
| `AdminRaceEntriesPage` | Xem entries theo race |
| `AdminRaceExecutionPage` | Race execution control |
| `AdminConflictResolutionPage` | Resolve discrepancies |
| `AdminDiscrepanciesPage` | Xem discrepancies |
| `AdminViolationsPage` | Review violations |
| `AdminPointManagementPage` | Points management |

### Spectator Pages
| Page | Mô tả |
|------|--------|
| `SpectatorDashboard` | Dashboard chính |
| `RacesBettingPage` | Xem race & đặt cược |
| `MyPredictionsPage` | Lịch sử predictions |
| `PointWalletPage` | Quản lý ví điểm |
| `LeaderboardPage` | Bảng xếp hạng |

### Jockey Pages
| Page | Mô tả |
|------|--------|
| `JockeyDashboard` | Dashboard chính |
| `JockeyInvitationPage` | Xem/response invitations |
| `JockeyRacesPage` | Races đã tham gia |
| `JockeyLeaderboardPage` | Career leaderboard |
| `JockeyProfilePage` | Profile với stats |

### Referee Pages
| Page | Mô tả |
|------|--------|
| `RefereeAssignedRacesPage` | Races được assign |
| `RefereeRaceDashboard` | Race detail view |
| `LegSubmissionPage` | Submit leg results |
| `RefereeResultEntryPage` | Entry results |
| `RefereeViolationsPage` | Report violations |
| `RefereeProfilePage` | Profile |

### Horse Owner Pages
| Page | Mô tả |
|------|--------|
| `HorseOwnerDashboard` | Dashboard chính |
| `MyHorsesPage` | Quản lý horses |
| `HorseDetailPage` | Horse detail view |
| `RegisterHorseModal` | Đăng ký ngựa mới |
| `HorseOwnerTournamentsPage` | Xem tournaments |
| `MyEntriesPage` | Quản lý entries |
| `InvitationsPage` | Xem invitations (gửi/nhận) |
| `SendInvitationModal` | Mời jockey |

---

## 9. Quy ước Code FE

### File Naming
- Component: PascalCase `.jsx` (vd: `MyComponent.jsx`)
- Utils/Hooks: camelCase `.js` (vd: `useAuth.js`, `token.js`)
- Constants: PascalCase `.js` (vd: `Constants.js`)

### Component Structure
```jsx
import { useState, useEffect } from 'react'
import { Button, Modal } from 'antd'
import { useAuth } from '@/context/AuthContext'
import api from '@/services/api'

export default function MyPage() {
  // Hooks first
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)

  // Effects
  useEffect(() => {
    fetchData()
  }, [])

  // Handlers
  const handleSubmit = async (values) => {
    try {
      setLoading(true)
      await api.post('/endpoint', values)
      toast.success('Success')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

### API Error Handling
```javascript
function getErrorMessage(data, fallback) {
  return (
    data?.detail ||
    data?.title ||
    data?.error ||
    data?.message ||
    fallback
  )
}

// Usage
if (!res.ok) {
  const data = await res.json()
  throw new Error(getErrorMessage(data, 'Default error'))
}
```

### Import Aliases
```javascript
import { Button } from '@/components/ui'  // @ → src/
import api from '@/services/api'
import { useAuth } from '@/context/AuthContext'
```

---

## 10. Chạy & Build

### Development
```bash
cd HorseRace.FE
npm install
npm run dev    # http://localhost:5173
```

### Build Production
```bash
npm run build   # Output: dist/
npm run preview # Preview production build
```

### Proxy Configuration
`vite.config.js` proxy `/api` requests:
```javascript
server: {
  proxy: {
    '/api': {
      target: 'https://horseracemanagementsystem.onrender.com',
      changeOrigin: true,
    },
  },
}
```

### Environment Variables
| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_BASE_URL` | `''` (empty uses proxy) | Backend API URL |

---

## 11. Key Dependencies & Alternatives

### Icons
- `lucide-react` — General icons
- `@phosphor-icons/react` — Extended icon set
- `lucide-react` preferred for consistency

### UI Components
- Ant Design (`antd`) — Tables, Forms, Modals, Layout
- Base UI (`@base-ui/react`) — Accessible primitives
- Shadcn-style components via `shadcn` package

### Notifications
- `sonner` — Toast notifications
- Usage: `toast.success('Message')`, `toast.error('Error')`

---

## 12. Điểm đặc biệt / Gotchas

1. **Token refresh logic** — Axios interceptor handles 401，自动 refresh token and retry request
2. **Remember session** — `auth_remember` flag determines token storage duration
3. **Role normalization** — `normalizeRole()` converts backend role to FE format
4. **JWT payload parsing** — Extract user info from token without API call
5. **Mock data** — `constants/index.js` contains mock upcoming races for landing page
6. **Dark theme** — Admin pages use inline dark palette styles (not Tailwind dark mode)
7. **No Redux/Zustand** — Using Context API for simplicity
8. **API base URL** — Vite proxy for dev, set `VITE_API_BASE_URL` for production
9. **React 19** — Using latest React with new features
10. **Vite 8** — Fast HMR and build times

---

## 13. Tình trạng & việc cần làm (FE) — cập nhật 2026-07-08

> Đối chiếu FE với BE (báo cáo `.claude/BE_MISSING_APIS (1).md`). Danh sách đầy đủ + tiến độ ở [`.claude/TASKS.md`](../.claude/TASKS.md). Tổng quan dự án: [`../CLAUDE.md`](../CLAUDE.md).

### ✅ Đã khớp BE (không còn là gap)
- **Prediction (Flow 7):** `api/spectator.js` dùng đúng route mới — `placePrediction` → `POST /api/predictions/races/{raceId}` body `{EntryId, BetAmount}`; `cancelPrediction` → `DELETE /api/predictions/{id}/cancel`. (Docs cũ ghi "còn lệch route cũ" — **đã lỗi thời**.)

### ⚠️ FE đã sẵn nhưng chờ BE fix
- **`AdminUsersPage` / `getAllUser`** đã gửi `page, pageSize, search, role, status, sort, sortDirection` nhưng **BE `GET /api/users` chưa phân trang/filter** và response chỉ có `{ userId, email, fullName, roleId, isActive }` → FE đang tự `slice` client-side + thiếu field (`phoneNumber, avatarUrl, lockedUntil, createdAt, licenseNumber, weight, bio`). Chờ BE Task 5-6.
- **`createUser` (`api/admin.js`)** gửi payload `PasswordHash: data.password` (**plaintext**). BE hiện lưu thẳng không hash (bug) → khi BE sửa (Task 7) đổi field thành `Password`.

### 🟡 Dọn dẹp FE (không cần BE)
- **9 helper mồ côi trong `api/admin.js`** (không page nào dùng) — nên xóa: `getAllInvalidUser`, `getInvalidUserById`, `approveInvalidUser`, `rejectInvalidUser`, `getUserHistory`, `getUsersByStatus`, `approveRace`, `rejectRace`, `finishRace`. (Việc FE thuần — `.claude/TASKS.md` chỉ chứa task BE.)
- **Mock data còn lại:** `customer/Dashboard.jsx`, `customer/LandingDashboard.jsx` (landing tĩnh); `EditHorseModal` upload ảnh còn TODO. (`OwnerProfilePage` đã bỏ `MOCK_PROFILE` — xem mục "Đã sửa 2026-07-15".)

### 🔗 Endpoint BE có sẵn nhưng FE chưa nối
- `GET /api/admin/review-history` (audit trail duyệt hồ sơ) — chưa có UI gọi.
- `RacesBettingPage` odds — nên đọc `Entry.Odds` / `GET /api/predictions/races/{id}/odds` thay vì hardcode `1.0` / hiển thị "—".

### ✅ Đã sửa 2026-07-15 — hồ sơ & career stats (bỏ mock/fake-save)
> Module dùng chung mới: **`src/api/profile.js`** (`getMyProfile`, `updateMyProfile`, `changeMyPassword`, `profileErrorMessage`). Dùng axios instance — **không** đặt trong `api/auth.js` vì `services/api.js` đã import từ đó (vòng lặp import).
- **`OwnerProfilePage`** — bỏ `MOCK_PROFILE`; đọc thật từ `GET /api/auth/profile` (email/role/status/member-since), lưu thật qua `PUT /api/auth/profile`, đổi mật khẩu thật qua `PUT /api/users/{id}/change-password`. (Trước: Save chỉ `setTimeout(800)` rồi báo "Saved!".)
- **`JockeyProfilePage`** — đổi mật khẩu gọi API thật (trước là `setTimeout` giả); Tên/SĐT nay lưu qua `PUT /api/auth/profile` (trước chỉ gửi license/weight/bio nên sửa xong là mất); **Prize Points** đọc `careerPrizePoints` từ `GET /api/jockey-profiles/{id}` (trước hardcode "—" dù data có sẵn).
- **`HorseDetailPage`** — `horse.owner` → **`horse.ownerName`** (BE trả `ownerName`, dùng sai tên field nên dòng Owner luôn trống); Career Stats/Recent Form/Upcoming ghép client-side từ `/api/entries` + `/api/race-results` + `/api/races` (trước là mảng rỗng hardcode → luôn 0). Wins/Top-3 **loại `isRaceDQ`** cho khớp cách BE tính (`PublishRaceResult`: `!IsDq && FinalPosition == 1`).
- **Nút upload avatar đã gỡ** ở cả 2 trang profile: BE chưa có endpoint upload ảnh — nút cũ chỉ tạo object URL preview rồi mất khi reload (fake-save). Ảnh vẫn hiển thị từ `avatarUrl` của BE. Muốn có thật → cần endpoint upload BE trước.
- **`AdminAnalyticsPage` KHÔNG phải mock** (báo cáo cũ đã lỗi thời): từ commit `4f1804c` trang này gọi API thật (`getAllUser`, `/api/horses`, `getRaces`, `/api/admin/points/balances`); filter 7d/30d/90d có tác dụng thật lên stat "Races".

### 📁 File doc FE
- Doc FE = **file này (`HorseRace.FE/CLAUDE.md`)**. (Trước 2026-07-08 doc FE nằm ở `cursor.md` — đã đổi tên thành `CLAUDE.md`, nội dung giữ nguyên.)
- Ở gốc FE còn `README.md` (mặc định Vite). Spec cho AI tool nằm ở `.claude/API_SPEC_FOR_CLAUDE_CODE.md`, `.claude/API_SPEC_FOR_CURSOR.md`.
