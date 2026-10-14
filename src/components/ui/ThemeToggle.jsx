import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext.jsx";

const THEME_ORDER = ["system", "light", "dark"];
const THEME_DETAILS = {
  system: { Icon: Monitor, label: "System theme" },
  light: { Icon: Sun, label: "Light theme" },
  dark: { Icon: Moon, label: "Dark theme" },
};

export default function ThemeToggle({ className = "", compact = false }) {
  const { theme, setTheme } = useTheme();
  const detail = THEME_DETAILS[theme] || THEME_DETAILS.system;
  const nextTheme = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];
  const nextLabel = THEME_DETAILS[nextTheme].label;

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      aria-label={detail.label + ". Switch to " + nextLabel.toLowerCase() + "."}
      title={detail.label + ". Click for " + nextLabel.toLowerCase()}
      className={"inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 border border-border bg-surface text-text " + className}
    >
      <detail.Icon size={20} strokeWidth={2} aria-hidden="true" />
      {!compact && <span className="sr-only">{detail.label}</span>}
    </button>
  );
}
