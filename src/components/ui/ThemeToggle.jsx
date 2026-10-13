import { AnimatePresence, motion } from "framer-motion";
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
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      onClick={() => setTheme(nextTheme)}
      aria-label={`${detail.label}. Switch to ${nextLabel.toLowerCase()}.`}
      title={`${detail.label} · Click for ${nextLabel.toLowerCase()}`}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-surface/90 text-text shadow-sm backdrop-blur transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${compact ? "h-10 w-10" : "h-11 w-11"} ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -35, scale: 0.65, y: 3 }}
          animate={{ opacity: 1, rotate: 0, scale: 1, y: 0 }}
          exit={{ opacity: 0, rotate: 35, scale: 0.65, y: -3 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="inline-flex items-center justify-center"
        >
          <detail.Icon size={20} strokeWidth={2.25} aria-hidden="true" />
        </motion.span>
      </AnimatePresence>
      {!compact && <span className="sr-only">{detail.label}</span>}
    </motion.button>
  );
}
