import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import RequireRole from "./components/RequireRole";
import ForgotPasswordPage from "./pages/loginPage/ForgotPasswordPage";
import LoginPage from "./pages/loginPage/LoginPage";
import ResetPasswordPage from "./pages/loginPage/ResetPasswordPage";
import RegisterPage from "./pages/registerPage/RegisterPage";
import LandingDashboard from "./pages/customer/LandingDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingDashboard />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* <Route
          path="/admin"
          element={
            <RequireRole role="ADMIN">
              <AdminLayout />
            </RequireRole>
          }
        > */}
        {/* <Route index element={<DashboardAdmin />} />
        </Route>
        <Route
          path="/spectator"
          element={
            <RequireRole role="SPECTATOR">
              <SpectatorLayout />
            </RequireRole>
          }
        >
          <Route index element={<SpectatorHomePage />} />
          <Route path="profile" element={<SpectatorProfilePage />} />
        </Route>
        <Route
          path="/jockey"
          element={
            <RequireRole role="JOCKEY">
              <JockeyLayout />
            </RequireRole>
          }
        >
          <Route index element={<JockeyHomePage />} />
          <Route path="profile" element={<JockeyProfilePage />} />
        </Route>
        <Route
          path="/horse-owner"
          element={
            <RequireRole role="HORSE_OWNER">
              <HorseOwnerLayout />
            </RequireRole>
          }
        >
          <Route index element={<HorseOwnerHomePage />} />
          <Route path="profile" element={<HorseOwnerProfilePage />} />
        </Route> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
