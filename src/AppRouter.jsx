import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import GuestAdminApp from "./App.jsx";
import PersonaSelector from "./components/PersonaSelector.jsx";
import OnboardingFlow from "./components/OnboardingFlow.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { useAppContext } from "./context/AppContext.jsx";

export function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" replace />;
}

export function RoleRoute({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== role) return <Navigate to={user.role === "staff" ? "/admin" : "/guest"} replace />;
  return children;
}

function GuestExperience() {
  const { user } = useAuth();
  const {
    persona, preferences, savePreferences, isOnboardingComplete, markOnboardingComplete, weather,
  } = useAppContext();
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  useEffect(() => {
    // Persona demo profiles already include a planning baseline; don't block entry with a form.
    if (user?.role === "guest" && !persona && !isOnboardingComplete(user.stayId)) setOnboardingOpen(true);
    else setOnboardingOpen(false);
  }, [user?.stayId, user?.role, persona, isOnboardingComplete]);

  useEffect(() => {
    const reopen = () => setOnboardingOpen(true);
    window.addEventListener("atithi:reopen-onboarding", reopen);
    return () => window.removeEventListener("atithi:reopen-onboarding", reopen);
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
        {onboardingOpen && user?.role === "guest" && !persona && (
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
          <Route path="/" element={<PersonaSelector />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/staff-login" element={<Navigate to="/" replace />} />
          <Route path="/guest" element={<ProtectedRoute><RoleRoute role="guest"><GuestExperience /></RoleRoute></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><RoleRoute role="staff"><GuestAdminApp /></RoleRoute></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}
