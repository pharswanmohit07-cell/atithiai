import React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AtithiAI from "./App.jsx";
import PersonaSelector from "./components/PersonaSelector.jsx";
import { useAuth } from "./context/AuthContext.jsx";

export function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" replace />;
}

export function RoleRoute({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== role) return <Navigate to={user.role === "manager" ? "/admin" : "/guest"} replace />;
  return children;
}

export default function AppRouter() {
  const location = useLocation();
  return (
    <Routes location={location}>
      <Route path="/" element={<PersonaSelector />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/guest" element={<ProtectedRoute><RoleRoute role="guest"><AtithiAI mode="guest" /></RoleRoute></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><RoleRoute role="manager"><AtithiAI mode="admin" /></RoleRoute></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
