import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import GuestAdminApp from "./App.jsx";
import { GuestLoginPage, StaffLoginPage } from "./components/auth/LoginPages.jsx";
import OnboardingFlow from "./components/OnboardingFlow.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { useAppContext } from "./context/AppContext.jsx";

export function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  return user ? children : <Navigate to="/login" replace state={{ from: location }} />;
}

export function RoleRoute({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={user.role === "staff" ? "/admin" : "/"} replace />;
  return children;
}

function LoginGate({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to={user.role === "staff" ? "/admin" : "/"} replace /> : children;
}

function GuestExperience() {
  const { user } = useAuth();
  const { preferences, savePreferences, isOnboardingComplete, markOnboardingComplete } = useAppContext();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [weather, setWeather] = useState("sunny");

  useEffect(() => {
    if (user?.role === "guest" && !isOnboardingComplete(user.stayId)) setOnboardingOpen(true);
    else if (user?.role !== "guest") setOnboardingOpen(false);
  }, [user?.stayId, user?.role, isOnboardingComplete]);

  useEffect(() => {
    const reopen = () => setOnboardingOpen(true);
    const weatherChanged = (event) => setWeather(String(event.detail || "sunny"));
    window.addEventListener("atithi:reopen-onboarding", reopen);
    window.addEventListener("atithi:weather", weatherChanged);
    return () => {
      window.removeEventListener("atithi:reopen-onboarding", reopen);
      window.removeEventListener("atithi:weather", weatherChanged);
    };
  }, []);

  const close = () => {
    if (user?.stayId) markOnboardingComplete(user.stayId);
    setOnboardingOpen(false);
  };

  const accept = (plan) => {
    window.dispatchEvent(new CustomEvent("atithi:plan-accepted", { detail: plan }));
    close();
  };

  return (
    <>
      <GuestAdminApp />
      <AnimatePresence>
        {onboardingOpen && user?.role === "guest" && (
          <OnboardingFlow
            preferences={preferences}
            onPreferencesChange={savePreferences}
            weather={weather}
            onAccept={accept}
            onClose={close}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default function AppRouter() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="min-h-screen"
      >
        <Routes location={location}>
          <Route path="/login" element={<LoginGate><GuestLoginPage /></LoginGate>} />
          <Route path="/staff-login" element={<LoginGate><StaffLoginPage /></LoginGate>} />
          <Route path="/" element={<ProtectedRoute><RoleRoute role="guest"><GuestExperience /></RoleRoute></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><RoleRoute role="staff"><GuestAdminApp /></RoleRoute></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}
