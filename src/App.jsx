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
import AdminTournamentsPage from "./pages/admin/AdminTournamentsPage";
import AdminRacesPage from "./pages/admin/AdminRacesPage";
import AdminHorsesPage from "./pages/admin/AdminHorsesPage";
import AdminDiscrepanciesPage from "./pages/admin/AdminDiscrepanciesPage";
import AdminViolationsPage from "./pages/admin/AdminViolationsPage";
import AdminPointManagementPage from "./pages/admin/AdminPointManagementPage";

// Spectator
import SpectatorLayout from "./components/layout/SpectatorLayout";
import SpectatorDashboard from "./pages/spectator/SpectatorDashboard";
import RacesBettingPage from "./pages/spectator/RacesBettingPage";
import MyPredictionsPage from "./pages/spectator/MyPredictionsPage";
import PointWalletPage from "./pages/spectator/PointWalletPage";
import LeaderboardPage from "./pages/spectator/LeaderboardPage";
import SpectatorProfilePage from "./pages/spectator/SpectatorProfilePage";

// Jockey
import JockeyDashboard from "./pages/jockey/JockeyDashboard";
import JockeyProfilePage from "./pages/jockey/JockeyProfilePage";
import JockeyInvitationPage from "./pages/jockey/JockeyInvitationPage";
import JockeyRacesPage from "./pages/jockey/JockeyRacesPage";
import JockeyLayout from "./components/layout/JockeyLayout";
import JockeyLeaderboardPage from "./pages/jockey/JockeyLeaderboardPage";

// Referee
import RefereeLayout from "./components/layout/RefereeLayout";
import RefereeAssignedRacesPage from "./pages/referee/RefereeAssignedRacesPage";
import RefereeResultEntryPage from "./pages/referee/RefereeResultEntryPage";
import RefereeViolationsPage from "./pages/referee/RefereeViolationsPage";
import RefereeProfilePage from "./pages/referee/RefereeProfilePage";

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
          <Route path="horses" element={<AdminHorsesPage />} />
          <Route path="tournaments" element={<AdminTournamentsPage />} />
          <Route path="races" element={<AdminRacesPage />} />
          <Route path="discrepancies" element={<AdminDiscrepanciesPage />} />
          <Route path="violations" element={<AdminViolationsPage />} />
          <Route path="point-management" element={<AdminPointManagementPage />} />
        </Route>

        {/* Spectator */}
        <Route
          path="/spectator"
          element={
            <RequireRole role="SPECTATOR">
              <SpectatorLayout />
            </RequireRole>
          }
        >
          <Route index element={<SpectatorDashboard />} />
          <Route path="races" element={<RacesBettingPage />} />
          <Route path="predictions" element={<MyPredictionsPage />} />
          <Route path="wallet" element={<PointWalletPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="profile" element={<SpectatorProfilePage />} />
        </Route>

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
              <RefereeLayout />
            </RequireRole>
          }
        >
          <Route index element={<RefereeAssignedRacesPage />} />
          <Route path="result-entry" element={<RefereeResultEntryPage />} />
          <Route path="violations" element={<RefereeViolationsPage />} />
          <Route path="profile" element={<RefereeProfilePage />} />
        </Route>

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
