import React, { createContext, useCallback, useContext, useState } from "react";
import { MOCK_GUESTS, MOCK_STAFF } from "../data/guests.js";

const AuthContext = createContext(null);
const STORAGE_KEY = "atithi-auth";

function initialUser() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const user = JSON.parse(saved);
      if (user && ["guest", "staff"].includes(user.role) && user.name) return user;
    }
  } catch { /* Invalid demo-auth data is ignored. */ }
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo") === "1") {
    return window.location.pathname === "/admin" || window.location.pathname === "/staff-login"
      ? { role: "staff", name: MOCK_STAFF[0].name }
      : { role: "guest", name: MOCK_GUESTS[0].name, room: MOCK_GUESTS[0].room, stayId: MOCK_GUESTS[0].stayId };
  }
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(initialUser);
  const login = useCallback((nextUser) => {
    const safeUser = nextUser?.role === "staff"
      ? { role: "staff", name: String(nextUser.name || "Atithi staff") }
      : { role: "guest", name: String(nextUser.name || "Guest"), room: String(nextUser.room || ""), stayId: String(nextUser.stayId || "") };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(safeUser)); } catch { /* Demo auth remains usable for this session when storage is blocked. */ }
    setUser(safeUser);
    return safeUser;
  }, []);
  const logout = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* In-memory logout still proceeds if storage is blocked. */ }
    setUser(null);
  }, []);
  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
