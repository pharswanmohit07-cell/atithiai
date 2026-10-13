import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "atithi-theme";
const ThemeContext = createContext(null);

function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" || stored === "system"
      ? stored
      : "system";
  } catch {
    return "system";
  }
}

function readSystemPrefersDark() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    readSystemPrefersDark,
  );

  const setTheme = useCallback((nextTheme) => {
    if (nextTheme !== "light" && nextTheme !== "dark" && nextTheme !== "system") {
      return;
    }
    setThemeState(nextTheme);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // The theme still works for this session when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemPreference = (event) => setSystemPrefersDark(event.matches);
    setSystemPrefersDark(media.matches);

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", updateSystemPreference);
      return () => media.removeEventListener("change", updateSystemPreference);
    }

    // Safari versions before MediaQueryList.addEventListener.
    media.addListener(updateSystemPreference);
    return () => media.removeListener(updateSystemPreference);
  }, []);

  const resolvedTheme =
    theme === "system" ? (systemPrefersDark ? "dark" : "light") : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme;

    const themeColor = resolvedTheme === "dark" ? "#0B1421" : "#10434F";
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", themeColor);
  }, [resolvedTheme]);

  const value = useMemo(
    () => ({ theme, setTheme, resolvedTheme, isDark: resolvedTheme === "dark" }),
    [theme, setTheme, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
