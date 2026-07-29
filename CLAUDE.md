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
│   │   ├── profile.js         # getMyProfile / updateMyProfile / changeMyPassword
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
│   │   ├── live/             # Live Race simulation (2026-07-19)
│   │   │   ├── RaceTrack.jsx
│   │   │   ├── HorseSprite.jsx
│   │   │   └── RaceReplayPlayer.jsx
│   │   ├── OddsBoardModal.jsx     # Bảng odds READ-ONLY cho Admin (3 trang admin dùng chung)
│   │   ├── AuthSessionSync.jsx    # Sync auth state with tab
│   │   ├── RequireRole.jsx        # Role-based route guard
│   │   ├── NotificationBell.jsx   # Dropdown chuông thông báo (mọi role)
│   │   ├── RaceResultsModal.jsx   # Modal xem kết quả race
│   │   └── RaceCard.jsx          # Race card component
│   │   # (StaminaBar.jsx ĐÃ XÓA 2026-07-25 — BE gỡ Horse.Stamina)
│   ├── constants/
│   │   └── index.js           # Constants (mock data)
│   ├── context/
│   │   └── AuthContext.jsx    # Auth state management
│   ├── hooks/
│   │   ├── useRaceLiveHub.js          # SignalR + poll dự phòng 30s
│   │   ├── useNotificationRead.js     # trạng thái đã đọc (localStorage)
│   │   ├── useAdminNotifications.js
│   │   ├── useRefereeNotifications.js
│   │   ├── useJockeyNotifications.js
│   │   ├── useHorseOwnerNotifications.js
│   │   └── useSpectatorNotifications.js
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
│   │   │   ├── AdminAuditLogPage.jsx        # GET /api/admin/review-history
│   │   │   └── AdminConflictResolutionPage.jsx
│   │   ├── spectator/       # Spectator pages
│   │   │   ├── SpectatorDashboard.jsx
│   │   │   ├── RacesBettingPage.jsx
│   │   │   ├── LiveRacesPage.jsx
│   │   │   ├── LiveRaceDetailPage.jsx
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
│   │   ├── raceSim.js      # Lõi mô phỏng đua (PRNG tất định, decodePosition)
│   │   └── horse.js
│   │   # (horseCondition.js ĐÃ XÓA 2026-07-25 — cùng lý do StaminaBar)
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
      <Route path="audit-log" element={<AdminAuditLogPage />} />
    </Route>

    {/* Spectator */}
    <Route path="/spectator" element={<RequireRole role="SPECTATOR"><SpectatorLayout /></RequireRole>}>
      <Route index element={<SpectatorDashboard />} />
      <Route path="races" element={<RacesBettingPage />} />
      <Route path="live" element={<LiveRacesPage />} />
      <Route path="live/:raceId" element={<LiveRaceDetailPage />} />
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
| `AdminAuditLogPage` | Audit trail — `GET /api/admin/review-history` |

### Spectator Pages
| Page | Mô tả |
|------|--------|
| `SpectatorDashboard` | Dashboard chính |
| `RacesBettingPage` | Xem race & đặt cược **race-level** (1 ngựa về nhất / cả race). Không có bộ chọn chặng, không có thanh thể lực |
| `LiveRacesPage` | Danh sách race đang diễn ra |
| `LiveRaceDetailPage` | Theo dõi trực tiếp + mô phỏng đua (SignalR) |
| `MyPredictionsPage` | Lịch sử predictions |
| `PointWalletPage` | Quản lý ví điểm |
| `LeaderboardPage` | Bảng xếp hạng — dùng `GET /api/leaderboards/spectators` |

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
| `RefereeRaceDashboard` | Race detail view + panel lịch sử leg đã được Admin resolve (`getLegDetail`) |
| `LegSubmissionPage` | Submit leg results (blind) + hiện quyết định/lý do của Admin sau tranh chấp |
| `RefereeViolationsPage` | Report violations |
| `RefereeProfilePage` | Profile — lưu qua `PUT /api/auth/profile` (T-24) |
| ~~`RefereeResultEntryPage`~~ | **Đã xóa** cùng route `/referee/result-entry` |
| ~~`RefereeDashboard`~~ | **Đã xóa** 2026-07-29 (mồ côi — T-16) |

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

> ⛔ **Không viết test tự động cho FE** (không Vitest/Jest/RTL/Playwright). Nhóm test thủ công theo [`.claude/TEST_PLAN_2026-07-26.md`](../.claude/TEST_PLAN_2026-07-26.md). Kiểm chứng bằng `npm run build` + mô tả cách test tay (vào trang nào, bấm gì, kỳ vọng gì). Đừng đề xuất bổ sung test như một việc cần làm.

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

### Deploy lên Vercel (production)

> Dev và production **khác hẳn nhau về mặt origin**: dev có Vite proxy nên `/api/...` là **same-origin** (không có CORS); production build **không có proxy** nên mọi request là **cross-origin** sang Render ⇒ phụ thuộc hoàn toàn vào `Cors:AllowedOrigins` của BE.

1. **`VITE_API_BASE_URL` phải set trong Vercel** (Settings → Environment Variables) = `https://horseracemanagementsystem.onrender.com`, và phải bật cho **cả Production lẫn Preview**. Biến `VITE_*` được **nhúng cứng lúc build** — set xong phải **deploy lại**, không phải restart. Thiếu biến này thì request đi vào chính domain Vercel → 404 (không phải lỗi CORS).
   - Kiểm nhanh trên bản đã deploy: mở `/assets/index-*.js` rồi tìm chuỗi `onrender.com` — có nghĩa là đã nhúng đúng.
2. **`vercel.json`** (đã thêm ở gốc FE) rewrite mọi path về `/index.html`. Thiếu file này thì React Router deep link **404 thật** (`/login`, `/admin/races` khi F5 hoặc mở link trực tiếp) vì Vercel đi tìm file tĩnh theo path. Rewrite chạy **sau** filesystem nên `/assets/*` vẫn được phục vụ bình thường.
3. **CORS phía BE**: origin của bản deploy phải nằm trong `Cors:AllowedOrigins`. ⚠️ **Vercel đổi hostname mỗi lần deploy** (preview: `horse-race-fe-git-<branch>-<scope>.vercel.app`) nên BE hỗ trợ wildcard `https://horse-race-fe-*.vercel.app` — xem [BE CLAUDE.md](../HorseRaceManagementSystem/CLAUDE.md) mục 8. Đổi tên project Vercel hoặc gắn custom domain thì **phải thêm origin/pattern mới bên BE rồi redeploy Render**.
4. **Không** dùng `rewrites` của Vercel để proxy `/api/*` sang Render: rewrite của Vercel **không nâng cấp WebSocket**, SignalR (`/api/hubs/race-live`) sẽ tụt xuống long-polling hoặc chết. Cứ để gọi thẳng cross-origin + CORS.

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

## 13. Tình trạng & việc cần làm (FE) — cập nhật 2026-07-26

> **HEAD `d421935`**, working tree sạch, `npm run build` **pass**.
> **T-19 + T-23 + T-24 đã đóng:** FE khớp BE race-level (`getRaceOdds`/`placeRacePrediction`, body `entryId`), gỡ Start Leg/statistics, Live dùng `startedAt`/`confirmedAt`, xóa `StaminaBar`/`horseCondition.js`, 2 trang profile chuyển sang `PUT /api/auth/profile`. Việc còn lại: [T-13…T-16](../.claude/TASKS.md).

### ✅ Vẫn đồng bộ với BE
- **User Management:** `getAllUser` đọc đúng shape phân trang `{ items, total, page, pageSize }` (bỏ `slice` client-side). `createUser` gửi field **`Password`** (plaintext, BE hash BCrypt) — không còn `PasswordHash`. `getRoleMap` nay normalize PascalCase của BE (`RoleId/Code/Name`) về camelCase.
- **Audit trail** — `AdminAuditLogPage` + route `/admin/audit-log`, nối `GET /api/admin/review-history`.
- **Race:** form Tạo/Sửa Race gửi **`scheduledEndTime`** (ISO, bắt buộc — thiếu → 400). BE chống trùng lịch trả lỗi ở `error.response.data.detail`.
- **Live Race:** `GET /api/races/{id}/live` + SignalR; replay dùng `startedAt`/`confirmedAt` (không còn `executionStatus`).
- **Đặt cược:** `POST /api/predictions/races/{raceId}` body **`{ entryId, betAmount }`** — ⚠️ tên field phải đúng `entryId` (ASP.NET Core bind case-insensitive nhưng **không** đồng nghĩa; `FirstEntryId` từng làm hỏng cả tính năng — T-23). Odds khóa vào lệnh = `entry.odds`, đúng bằng số hiện trên bảng.

### 🆕 Đợt 2026-07-28 (đợt 2) — ODDS RÚT VỀ **MỘT CON SỐ TĨNH**

> ⚠️ Đợt này **thay thế hoàn toàn** mô hình "odds hai tầng + khóa cược" ban hành sáng cùng ngày (mô tả cũ đã gỡ khỏi file này). Mọi thứ liên quan tới `publishedOdds` · `suggestedOdds` · `oddsPublishedAt` · `bettingLockedAt` · `isBettingOpen` · `canEdit` · `houseMarginPercent` đều **không còn tồn tại ở cả BE lẫn FE**.

**Mô hình:** đóng đăng ký sinh **một** con số `odds` cho mỗi ngựa (máy tính từ lịch sử thắng), rồi giữ nguyên tới hết cuộc đua. Không biên nhà cái, không ai sửa được, mọi role nhìn cùng một số — và đó cũng là số khóa vào lệnh cược. **Cửa cược mở ngay khi đóng đăng ký, tự đóng khi race start.**

| Thay đổi | Chi tiết |
|---|---|
| **`OddsManagementModal` → `OddsBoardModal`** | File cũ **đã xóa**. Bản mới `src/components/OddsBoardModal.jsx` là bảng **read-only** 5 cột (Gate · Horse/Jockey · Career 1st · Odds · Bets) — không ô nhập, không Save/Publish/Lock/Reset. Vẫn nhúng ở cả 3 trang admin, nút đổi tên **View Odds** |
| **`api/admin.js`** | **Xóa** `updateRaceOdds`, `publishRaceOdds`, `lockRaceBetting`. Giữ mỗi `getRaceOddsBoard` |
| **`api/referee.js`** | **Xóa** `lockRaceBetting` |
| **3 trang admin** | Hai cột odds → **một cột `Odds`** đọc `entry.odds` (BE đổi tên `currentOdds` → `odds`, bỏ `publishedOdds`). `minOdds` (chip "Fav") đọc `odds`. Banner "Registration Closed" từ **3 trạng thái xuống 1 câu**. `regInfo` chỉ còn `oddsComputedAt` |
| **Start Race** | Điều kiện **duy nhất** là `oddsComputedAt != null` (đăng ký đã đóng) — ở cả 3 trang admin lẫn `RefereeAssignedRacesPage`. Tooltip đổi thành *"Close registration first"* |
| **`RefereeAssignedRacesPage`** | **Xóa nút "Lock Betting"** + state `bettingLockedAt`/`locking` + handler. Panel start nay nói rõ: *"Starting the race closes betting automatically"* |
| **`RacesBettingPage`** | `bettingOpen = race.status === 'Scheduled' && raceOdds.oddsComputedAt != null && raceStatus === 'scheduled'`. Nút **Cancel Bet** dùng chung `bettingOpen`. `Est. Payout = betAmount × odds` **giữ nguyên** |
| **`JockeyRacesPage`** | `publishedOdds` → `odds` (cả entry của nài lẫn danh sách contenders). `oddsLocked = !!race.oddsComputedAt` **giữ nguyên** — trang này vốn chưa từng migrate sang `oddsPublishedAt` nên nay lại thành đúng |

**Không phải sửa** (đã rà): `LiveRaceDetailPage`/`LiveRacesPage`/`components/live/*`/`useRaceLiveHub`/`raceSim` không đọc `odds`; `MyPredictionsPage`/`SpectatorDashboard` đọc `oddsLocked1` — **field này không đổi**; `PointWalletPage`/`LeaderboardPage` không đụng odds.

**Trạng thái:** `npm run build` **pass**. `npx eslint src` = 79 vấn đề — **mức nền có sẵn của repo** (39 `no-unused-vars` rải khắp nơi + các rule `react-hooks/*` là idiom chung của codebase), không phải do đợt này; 2 unused-vars còn lại trong `RefereeAssignedRacesPage` (`userMap` prop, `horseMap`) là nợ có từ trước, không nằm trong phạm vi đợt.

### 🆕 Đợt 2026-07-26 (5 commit: `9523820` → `d421935`)

| Commit | Nội dung |
|---|---|
| `9523820` *fix cancel race* | `AdminRacesPage`/`AdminRaceExecutionPage` xử lý hủy race; gỡ block chết ở `HorseOwnerDashboard` |
| `0543b74` *fix error message* | `AdminHorsesPage`/`AdminRacesPage` đọc message lỗi BE tử tế hơn |
| `cbdcb03` *fix noti, admin resolve conflict* | **`AdminConflictResolutionPage` +272 dòng** — panel lịch sử leg đã resolve; `getEntries(raceId)` truyền `?raceId=`; thêm `getLegDetail` vào `api/admin.js`; `AdminDiscrepanciesPage` + `AdminAuditLogPage` bổ sung |
| `3d78f6e` *fix referee, live race, page* | Thêm `getLegDetail` vào `api/referee.js`; `LegSubmissionPage` + `RefereeRaceDashboard` hiện quyết định Admin sau tranh chấp; `LiveRacesPage` lọc/hiển thị tốt hơn |
| `d421935` *fix delete button report…* | Gỡ nút **"Report Emergency"** giả trong `RefereeLayout`; chỉnh `useRefereeNotifications` |

**Ghi chú kiến trúc:** để hiện "Admin đã xử tranh chấp thế nào", FE dùng **`GET /api/legs/{raceId}/{legNumber}`** (`getLegDetail`, `LegsController` cho cả REFEREE lẫn ADMIN) — nó chỉ trả **quyết định cuối cùng** (`adminOverrideReason`, `confirmedAt`, `confirmationType`), không lộ bản nhập blind của trọng tài kia. Đây là lựa chọn có chủ đích, giữ Blind Double-Entry.

### 🆕 2026-07-29 — `AdminViolationsPage` nuốt mất message lỗi của BE (T-31, **vá cục bộ**)

**Triệu chứng:** modal Approve Violation chỉ hiện *"Request failed with status code 400"*, không lý do gì.

**Nguyên nhân:** BE trả `ProblemDetails` — `{ title, detail, status, traceId }` — câu giải thích của handler nằm ở **`detail`**. FE lại đọc `err.response.data.message`, **field BE không bao giờ gửi** ⇒ luôn `undefined` ⇒ rơi xuống `err.message` của axios.

**Đã vá:** thêm helper cục bộ `errorText(e, fallback)` **trong chính `AdminViolationsPage.jsx`** (`detail` → `errors` validate model-binding → `title` → `err.message` → fallback), dùng ở 4 chỗ: approve · reject · load list · update. Không thêm file mới, không đụng file nào khác.

> ⚠️ **Lỗi này còn ở ~19 chỗ khác trong `src/`** (danh sách + cách sửa: [T-31](../.claude/TASKS.md)). **Cố ý hoãn** — sát ngày demo, đổi 21 file để chữa một triệu chứng chỉ gặp ở màn Violation là rủi ro không đáng. Bản refactor gom về `src/utils/apiError.js` đã làm xong và **nằm trong `git stash`** của repo FE (`stash@{0}`, message *"T-31 full refactor (option 2) - backup 2026-07-29"*) — demo xong thì `git stash pop` rồi build lại.
>
> **Khi viết code mới:** đọc `err.response.data.detail` (**không** phải `.message`). Trong file `AdminViolationsPage.jsx` thì dùng `errorText`.

### ✅ Đã đóng 2026-07-29 — T-13…T-16 (dọn FE)

| Mã | Đã làm |
|---|---|
| **T-13** | `AdminRacesPage.jsx` → `DeleteConfirmModal`: `CAN_DELETE_STATUSES` từ `['Scheduled','Cancelled','Finished']` về **`['Scheduled']`**, khớp BE (`DELETE /api/races/{id}` là **soft-cancel**, chỉ nhận `Scheduled`). Comment sai *"BE handles the IsDeleted flag internally"* thay bằng mô tả đúng: set `Status = Cancelled`, cascade Entry → `Withdrawn` + Invitation → `Cancelled` + **hoàn 100% điểm cược**; domain **không có** cột `IsDeleted`, và **không có** đường khôi phục |
| **T-14** | Xóa **10 helper API mồ côi**: `api/admin.js` (`getUsersByStatus`, `getAllInvalidUser`, `getInvalidUserById`, `approveInvalidUser`, `rejectInvalidUser`, `getUserHistory`, `approveRace`, `rejectRace`, `finishRace`) + `api/referee.js` (`submitLegResult_legacy`). Verify 0 nơi gọi trước khi xóa; endpoint BE tương ứng vẫn còn |
| **T-15** | `api/admin.js → getRacePauseInfo`: bỏ câu sai *"ADMIN-only per spec — Referee must NOT call this"*, thay bằng mô tả đúng (ADMIN + REFEREE được gán; referee **bắt buộc** `?legNumber=` và leg phải `Resolved`). Kèm sửa comment `getLegDetail` nói *"BE hasn't added Leg to ReviewHistory yet"* — BE đã thêm từ `5b65328` |
| **T-16** | Xóa `src/pages/referee/RefereeDashboard.jsx` (mồ côi; khác `RefereeRaceDashboard.jsx` đang dùng thật) |

### 🆕 Hành vi BE mới cần biết khi làm UI (2026-07-26)
- **Race tự hủy:** race `Scheduled` sẽ bị worker hủy khi qua `scheduledEndTime`, hoặc qua `scheduledStartTime` mà có < 2 entry `Pending`/`Approved`. UI nên chấp nhận việc một race đang xem đột ngột thành `Cancelled` sau lần refetch.
- **Sửa race:** `PUT /api/races/{id}` nay **chỉ nhận race `Scheduled`**; `POST /api/races` từ chối `scheduledStartTime` trong quá khứ → nút Edit nên disable khi race đã rời `Scheduled`.
- **Vi phạm sau khi Publish:** tạo/duyệt/từ chối/sửa vi phạm đều bị chặn khi race `Finished` (*"Race already published — unpublish it first."*) → nên disable nút thay vì để người dùng nhận 400.
- **`GET /api/races/{id}/pause` nay REFEREE cũng gọi được** với `?legNumber=n` cho leg đã `Resolved`. FE hiện **chưa dùng** đường này (dùng `getLegDetail` thay thế) — nếu wire vào thì nhớ truyền `legNumber`.

### 🟡 Dọn dẹp FE còn lại
> T-14/T-15/T-16 **đã làm xong** 2026-07-29 (xem bảng ở trên). Còn lại:
- **Mock data:** `customer/Dashboard.jsx`, `customer/LandingDashboard.jsx` (landing tĩnh); `EditHorseModal` upload ảnh còn TODO (BE chưa có endpoint upload).
- **Unused vars có sẵn** ở `RefereeAssignedRacesPage.jsx`: prop `userMap` truyền vào `RaceControlModal` nhưng không dùng, `horseMap` set mà không đọc.
- Nhóm endpoint BE tương ứng với 10 helper vừa xóa (`/api/admin/users/invalid/*`, `/api/admin/races/{id}/approve|reject|finish`, `/api/admin/users/{id}/history`) **vẫn còn ở `AdminController`** và chưa trang nào dùng → cân nhắc gỡ nốt phía BE.

### 🔒 Scope dữ liệu cá nhân (BE đã siết 2026-07-26 — T-25)
`GET /api/point-wallets`, `/api/wallet-transactions`, `/api/predictions` (list **và** `/{id}`) nay chỉ trả dữ liệu **của chính người gọi** (ADMIN vẫn thấy tất cả). Trước đây chúng trả toàn bộ bảng và FE tự lọc — tức mọi khán giả đọc được ví & lệnh cược của người khác.
- `getMyWallet` / `getMyPredictions` / `getWalletTransactions` **giữ nguyên** — phần lọc client-side nay là no-op vô hại, cứ để lại làm lớp phòng thủ.
- ⚠️ **Đừng viết trang nào dựa vào việc các endpoint này trả dữ liệu người khác.** Cần số liệu nhiều người → dùng endpoint tổng hợp.
- `LeaderboardPage` đã chuyển sang **`GET /api/leaderboards/spectators`** (`getSpectatorBettingLeaderboard`) — trả sẵn `rank/fullName/totalBets/wonBets/winRate/totalStaked/totalWinnings`, không còn tự gom từ `/api/predictions` và không còn gọi `getAllUsers`.

### 🔗 Endpoint BE có sẵn nhưng FE chưa nối
> Rà lại 2026-07-26. **Đã nối rồi** (bỏ khỏi danh sách này): `GET /api/jockeys/search` → `getJockeys` trong `api/horseOwner.js`; `POST /api/horses/{id}/resubmit` → `MyHorsesPage` + `HorseDetailPage`.
- `GET`/`PUT /api/admin/points/{userId}` (xem ví + 20 giao dịch gần nhất / đặt thẳng số dư).
- `GET /api/leaderboards/tournament/{tournamentId}` (chỉ `career` + `spectators` đang được dùng).
- `POST /api/admin/points/daily-topup` (nạp bù ví < 10 điểm lên 10 — chỉ trigger thủ công).
- `GET /api/admin/races/{id}/publication-review` — trả `pendingViolationCount` + `hasUnresolvedTie`. ⚠️ BE **không còn** chặn Publish khi còn vi phạm Pending, nên nếu muốn khóa nút Publish thì FE phải tự dùng cờ này.
- `GET /api/races/{id}/pause?legNumber=n` **cho REFEREE** (leg đã `Resolved`) — mới 2026-07-26, FE đang dùng `getLegDetail` thay thế.
- `GET /api/admin/review-history?entity=Leg` — audit các lần Admin override kết quả leg (mới 2026-07-26); `AdminAuditLogPage` hiện chưa có tab cho entity `Leg`.
- *(`GET /api/horses/{id}/statistics` đã bị BE gỡ — bỏ khỏi danh sách này.)*

### ✅ Thêm 2026-07-20 → 25

| File | Vai trò |
|---|---|
| `src/pages/admin/AdminAuditLogPage.jsx` | Audit trail — tab lọc theo entity (User/Horse/Entry/Race/Violation), search, phân trang |
| `src/components/NotificationBell.jsx` + `src/hooks/use*Notifications.js` (5 role) + `useNotificationRead.js` | Chuông thông báo per-role; trạng thái đã đọc lưu localStorage. Gắn ở `AdminHeader` + 4 layout còn lại |
| `src/components/RaceResultsModal.jsx` | Modal xem kết quả race |
| `AdminRacesPage` — `DeleteConfirmModal` | Xóa/hủy race (⚠️ lệch điều kiện với BE — xem trên) |

### ✅ Thêm 2026-07-19 — Live Race + mô phỏng đua (Spectator)

> Trang này **chưa từng tồn tại** trước 2026-07-19, dù `../CLAUDE.md` §5 đánh dấu ✅ từ 2026-07-15 — chỉ backend được làm. `@microsoft/signalr` khi đó nằm trong `node_modules` nhưng **không có trong `package.json`** (mất khi `npm ci`); nay đã khai báo đúng.

**File mới**

| File | Vai trò |
|---|---|
| `src/hooks/useRaceLiveHub.js` | SignalR + poll dự phòng 30s. BE đẩy **đúng** payload của `GET /api/races/{id}/live` nên một setter dùng chung cho cả hai nguồn. |
| `src/utils/raceSim.js` | Lõi mô phỏng thuần hàm: PRNG tất định, `decodePosition`, dựng quỹ đạo, bảng màu áo nài + màu lông. |
| `src/components/live/RaceTrack.jsx` | Đường đua SVG: cột tên **cố định** bên trái + vùng đua trượt theo camera (clip riêng nên tên không bao giờ bị ngựa đè). |
| `src/components/live/HorseSprite.jsx` | Ngựa + nài, gốc tọa độ ở **mũi ngựa** ngang mặt đất; `SPRITE_SCALE = 0.6` để vừa một lane (`LANE_H = 66`). |
| `src/components/live/RaceReplayPlayer.jsx` | Máy trạng thái + vòng lặp `rAF`. |
| `src/pages/spectator/LiveRacesPage.jsx`, `LiveRaceDetailPage.jsx` | Danh sách + chi tiết (`/spectator/live`, `/spectator/live/:raceId`). |

**Ràng buộc phải giữ khi sửa về sau**
- **Không có telemetry.** BE không lưu bất kỳ thời gian/vị trí per-entry nào — Blind Double-Entry khiến server mù trong lúc leg chạy. Animation là **phát lại dựng lại**, phải gắn nhãn đúng như vậy trên UI.
- **Seed tất định** `(raceId, legNumber)` — mọi khán giả phải thấy cùng một cuộc đua. Đừng thay bằng `Math.random()`.
- **Chế độ `pack`** (leg đang chạy): ngựa sát nhau, `showRanks={false}`. Đừng "cải tiến" cho ngựa tách xa nhau — khán giả đang cược sẽ đọc thành thứ hạng thật.
- `Position` là **mã hóa** (`-1` DNF, `-2` DQ) — luôn `decodePosition` trước khi sort/animate.
- Ngựa DNF chỉ lộ (mờ + nhãn) **từ `dropoutTime`**, không phải từ giây 0.
- `vite.config.js` phải giữ **`ws: true`** ở proxy `/api`, nếu không SignalR âm thầm tụt xuống long-polling.
- 🆕 **Effect chọn phase trong `RaceReplayPlayer` phải so `legSignature`, không được chỉ dựa vào identity của `leg`** (sửa 2026-07-29). `useRaceLiveHub` gọi `setSnapshot` với JSON vừa nhận nên `leg` là object **mới** sau mỗi push SignalR / mỗi lần poll 30s. Trước đây effect chạy lại theo identity → rơi vào nhánh `alreadySeen` (autoplay đánh dấu `seen` ngay lúc bắt đầu đếm ngược) → `seek(RACE_DURATION_S)` + `phase = 'finished'` ⇒ **replay đang chạy bị cắt ngang, ngựa nhảy phắt về đích**. Replay dài 29s mà poll 30s nên gần như lần nào cũng bị cắt, ở một điểm ngẫu nhiên.
- 🆕 **`visibilitychange` chỉ skip tới cuối khi vắng mặt ≥ `HIDDEN_SKIP_MS` (5s)** (sửa cùng đợt). Trước đây skip vô điều kiện: liếc sang cửa sổ khác một giây là mất replay. Vòng lặp rAF vốn đã đóng băng đồng hồ khi `document.hidden` nên vắng ngắn thì chạy tiếp chỗ cũ mới đúng.
- Bảng `standings` từ `GetRaceLive` là **tạm tính** (không xử lý DQ, không tie-break chặng cuối) — BE yêu cầu FE gắn nhãn rõ.

**Payload `GET /api/races/{id}/live` (cũng là payload push SignalR) — cập nhật 2026-07-25 sau revert BE**

```jsonc
{
  "entries": [{
    "entryId": 1, "horseId": 7, "gateNumber": 3,
    "horseName": "…", "jockeyName": "…",
    "color": "Bay", "imageUrl": null,        // màu lông free-text
    "odds": 4.20                             // đã khóa lúc đóng đăng ký
    // ❌ ĐÃ BỊ GỠ: "stamina", "healthStatus"
  }],
  "legs": [{
    "legIndex": 0, "legNumber": 1,
    "status": "Confirmed",            // blind: Pending|AwaitingSecondReferee|Confirmed|Conflicted|Resolved
    "isConfirmed": true, "isConflicted": false,
    "confirmationType": "AutoMatched",
    "startedAt": "…", "finishedAt": "…", "confirmedAt": "…",
    "results": []                     // RỖNG nếu leg chưa Confirmed/Resolved
    // ❌ ĐÃ BỊ GỠ: "executionStatus", "isBettingOpen"
  }]
}
```

- `startedAt` + `confirmedAt` cho phép mọi client **đồng bộ pha replay** và đếm giờ khi leg đang chạy.
- ✅ **`executionStatus` và `isBettingOpen` không còn tồn tại** — FE đã ngừng đọc (T-19 đóng). Cửa cược nay là race-level: `race.status === 'Scheduled' && race.oddsComputedAt != null`.
- Payload **cố ý KHÔNG có** `referee1Submitted`/`referee2Submitted` (khác `GET /races/{id}/execution`) — giữ Blind Double-Entry.

### ✅ Đã sửa 2026-07-15 — hồ sơ & career stats (bỏ mock/fake-save)
> Module dùng chung mới: **`src/api/profile.js`** (`getMyProfile`, `updateMyProfile`, `changeMyPassword`, `profileErrorMessage`). Dùng axios instance — **không** đặt trong `api/auth.js` vì `services/api.js` đã import từ đó (vòng lặp import).
- **`OwnerProfilePage`** — bỏ `MOCK_PROFILE`; đọc thật từ `GET /api/auth/profile` (email/role/status/member-since), lưu thật qua `PUT /api/auth/profile`, đổi mật khẩu thật qua `PUT /api/users/{id}/change-password`. (Trước: Save chỉ `setTimeout(800)` rồi báo "Saved!".)
- **`JockeyProfilePage`** — đổi mật khẩu gọi API thật (trước là `setTimeout` giả); Tên/SĐT nay lưu qua `PUT /api/auth/profile` (trước chỉ gửi license/weight/bio nên sửa xong là mất); **Prize Points** đọc `careerPrizePoints` từ `GET /api/jockey-profiles/{id}` (trước hardcode "—" dù data có sẵn).
- **`HorseDetailPage`** — `horse.owner` → **`horse.ownerName`** (BE trả `ownerName`, dùng sai tên field nên dòng Owner luôn trống); Career Stats/Recent Form/Upcoming ghép client-side từ `/api/entries` + `/api/race-results` + `/api/races` (trước là mảng rỗng hardcode → luôn 0). Wins/Top-3 **loại `isRaceDQ`** cho khớp cách BE tính (`PublishRaceResult`: `!IsDq && FinalPosition == 1`).
- **Nút upload avatar đã gỡ** ở cả 2 trang profile: BE chưa có endpoint upload ảnh — nút cũ chỉ tạo object URL preview rồi mất khi reload (fake-save). Ảnh vẫn hiển thị từ `avatarUrl` của BE. Muốn có thật → cần endpoint upload BE trước.
- **`AdminAnalyticsPage` KHÔNG phải mock** (báo cáo cũ đã lỗi thời): từ commit `4f1804c` trang này gọi API thật (`getAllUser`, `/api/horses`, `getRaces`, `/api/admin/points/balances`); filter 7d/30d/90d có tác dụng thật lên stat "Races".

### 📁 File doc FE
- Doc FE = **file này (`HorseRace.FE/CLAUDE.md`)**. (Bản `cursor.md` trùng lặp cũ đã bị xóa 2026-07-19.)
- Ở gốc FE còn `README.md` (mặc định Vite). Đặc tả API cho AI tool: `.claude/API_SPEC_FOR_CLAUDE_CODE.md`.
