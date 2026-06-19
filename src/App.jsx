import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AuthSessionSync from "./components/AuthSessionSync";
import RequireRole from "./components/RequireRole";

// Auth Pages
import LoginPage from "./pages/loginPage/LoginPage";
import ForgotPasswordPage from "./pages/loginPage/ForgotPasswordPage";
import ResetPasswordPage from "./pages/loginPage/ResetPasswordPage";
import RegisterPage from "./pages/registerPage/RegisterPage";

// Public Pages
import LandingDashboard from "./pages/customer/LandingDashboard";

// Admin
import AdminLayout from "./components/layout/AdminLayout";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";

// Spectator
import SpectatorDashboard from "./pages/spectator/SpectatorDashboard";

// Jockey
import JockeyDashboard from "./pages/jockey/JockeyDashboard";
import JockeyProfilePage from "./pages/jockey/JockeyProfilePage";
import JockeyInvitationPage from "./pages/jockey/JockeyInvitationPage";
import JockeyRacesPage from "./pages/jockey/JockeyRacesPage";
import JockeyLayout from "./components/layout/JockeyLayout";
import JockeyLeaderboardPage from "./pages/jockey/JockeyLeaderboardPage";

// Referee
import RefereeDashboard from "./pages/referee/RefereeDashboard";

// Horse Owner
import HorseOwnerDashboard from "./pages/horse-owner/HorseOwnerDashboard";
import HorseOwnerLayout from "./components/layout/HorseOwnerLayout";
import MyHorsesPage from "./pages/horse-owner/MyHorsesPage";
import MyEntriesPage from "./pages/horse-owner/MyEntriesPage";
import HorseDetailPage from "./pages/horse-owner/HorseDetailPage";
import InvitationsPage from "./pages/horse-owner/InvitationsPage";
import OwnerProfilePage from "./pages/horse-owner/OwnerProfilePage";

function App() {
  return (
    <BrowserRouter>
      <AuthSessionSync /> {/* ← đứng một mình, không bọc Routes */}
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingDashboard />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <RequireRole role="ADMIN">
              <AdminLayout />
            </RequireRole>
          }
        >
          <Route index element={<AdminAnalyticsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="horses" element={<div className="text-sm" style={{color:"#8B949E"}}>Trang quản lý ngựa đua đang được phát triển.</div>} />
          <Route path="tournaments" element={<div className="text-sm" style={{color:"#8B949E"}}>Trang quản lý giải đấu đang được phát triển.</div>} />
          <Route path="races" element={<div className="text-sm" style={{color:"#8B949E"}}>Trang quản lý chặng đua đang được phát triển.</div>} />
          <Route path="discrepancies" element={<div className="text-sm" style={{color:"#8B949E"}}>Trang xử lý sai lệch đang được phát triển.</div>} />
          <Route path="violations" element={<div className="text-sm" style={{color:"#8B949E"}}>Trang vi phạm kỷ luật đang được phát triển.</div>} />
          <Route path="point-management" element={<div className="text-sm p-8" style={{color:"#8B949E"}}>Point Management page coming soon.</div>} />
        </Route>

        {/* Spectator */}
        <Route
          path="/spectator"
          element={
            <RequireRole role="SPECTATOR">
              <SpectatorDashboard />
            </RequireRole>
          }
        />

        {/* Jockey */}
        <Route
          path="/jockey"
          element={
            <RequireRole role="JOCKEY">
              <JockeyLayout />
            </RequireRole>
          }
        >
          <Route index element={<JockeyDashboard />} />
          <Route path="invitations" element={<JockeyInvitationPage />} />
          <Route path="races" element={<JockeyRacesPage />} />
          <Route path="leaderboard" element={<JockeyLeaderboardPage />} />
          <Route path="profile" element={<JockeyProfilePage />} />
        </Route>

        {/* Referee */}
        <Route
          path="/referee"
          element={
            <RequireRole role="REFEREE">
              <RefereeDashboard />
            </RequireRole>
          }
        />

        {/* Horse Owner */}
        <Route
          path="/horse-owner"
          element={
            <RequireRole role="HORSE_OWNER">
              <HorseOwnerLayout />
            </RequireRole>
          }
        >
          <Route index element={<HorseOwnerDashboard />} />
          <Route path="horses" element={<MyHorsesPage />} />
          <Route path="horses/:horseId" element={<HorseDetailPage />} />
          <Route path="entries" element={<MyEntriesPage />} />
          <Route path="invitations" element={<InvitationsPage />} />
          <Route path="profile" element={<OwnerProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
