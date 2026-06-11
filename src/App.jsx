import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AuthSessionSync from './components/AuthSessionSync'
import RequireRole from './components/RequireRole'
import ForgotPasswordPage from './pages/loginPage/ForgotPasswordPage'
import LoginPage from './pages/loginPage/LoginPage'
import ResetPasswordPage from './pages/loginPage/ResetPasswordPage'
import RegisterPage from './pages/registerPage/RegisterPage'
import LandingDashboard from './pages/customer/LandingDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import SpectatorDashboard from './pages/spectator/SpectatorDashboard'
import JockeyDashboard from './pages/jockey/JockeyDashboard'
import HorseOwnerDashboard from './pages/horse-owner/HorseOwnerDashboard'
import RefereeDashboard from './pages/referee/RefereeDashboard'

function App() {
  return (
    <BrowserRouter>
      <AuthSessionSync />
      <Routes>
        <Route path="/" element={<LandingDashboard />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/admin"
          element={
            <RequireRole role="ADMIN">
              <AdminDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/spectator"
          element={
            <RequireRole role="SPECTATOR">
              <SpectatorDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/jockey"
          element={
            <RequireRole role="JOCKEY">
              <JockeyDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/horse-owner"
          element={
            <RequireRole role="HORSE_OWNER">
              <HorseOwnerDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/referee"
          element={
            <RequireRole role="REFEREE">
              <RefereeDashboard />
            </RequireRole>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
