import React, { createContext, useCallback, useContext, useState } from "react";

const AuthContext = createContext(null);
const STORAGE_KEY = "atithi-demo-profile";
const ALLOWED_ROLES = ["guest", "manager"];
const ALLOWED_PERSONAS = ["Guest (Family)", "Guest (Solo)", "Hotel Manager"];

function readUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !ALLOWED_ROLES.includes(parsed.role) || !ALLOWED_PERSONAS.includes(parsed.persona)) return null;
    return {
      role: parsed.role,
      persona: parsed.persona,
      name: typeof parsed.name === "string" ? parsed.name.slice(0, 80) : "Demo guest",
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser);

  const login = useCallback((profile) => {
    const manager = profile?.role === "manager" || profile?.persona === "Hotel Manager";
    const safeUser = {
      role: manager ? "manager" : "guest",
      persona: manager ? "Hotel Manager" : profile?.persona === "Guest (Solo)" ? "Guest (Solo)" : "Guest (Family)",
      name: String(profile?.name || (manager ? "Hotel Manager (demo)" : "Demo guest")).slice(0, 80),
    };
    setUser(safeUser);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(safeUser)); } catch { /* The selected demo role remains available in memory. */ }
    return safeUser;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* In-memory logout still proceeds. */ }
  }, []);

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
