import { motion } from "framer-motion";

const TONES = {
  saffron: {
    tile: "from-amber-700 via-orange-600 to-rose-600",
    glow: "shadow-[0_7px_22px_rgba(180,83,9,0.3)]",
  },
  teal: {
    tile: "from-teal-600 via-teal-700 to-indigo-800",
    glow: "shadow-[0_6px_18px_rgba(20,184,166,0.25)]",
  },
  coral: {
    tile: "from-rose-600 via-red-700 to-orange-700",
    glow: "shadow-[0_6px_18px_rgba(244,63,94,0.25)]",
  },
  violet: {
    tile: "from-violet-600 via-indigo-700 to-fuchsia-800",
    glow: "shadow-[0_6px_18px_rgba(139,92,246,0.25)]",
  },
  emerald: {
    tile: "from-emerald-600 via-teal-700 to-cyan-800",
    glow: "shadow-[0_6px_18px_rgba(16,185,129,0.25)]",
  },
  sky: {
    tile: "from-sky-600 via-blue-700 to-indigo-800",
    glow: "shadow-[0_6px_18px_rgba(14,165,233,0.25)]",
  },
};

const SIZES = {
  sm: { tile: "h-9 w-9 rounded-xl", icon: 18 },
  md: { tile: "h-11 w-11 rounded-xl", icon: 24 },
  lg: { tile: "h-14 w-14 rounded-2xl", icon: 28 },
};

export default function IconBadge({
  icon: Icon,
  tone = "teal",
  size = "md",
  pulse = false,
  className = "",
  label,
}) {
  if (!Icon) return null;

  const palette = TONES[tone] || TONES.teal;
  const dimensions = SIZES[size] || SIZES.md;
  const pulseAnimation = {
    scale: [1, 1.06, 1],
    boxShadow: [
      "0 0 0 rgba(244,63,94,0)",
      "0 0 18px rgba(244,63,94,0.42)",
      "0 0 0 rgba(244,63,94,0)",
    ],
  };

  return (
    <motion.span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      whileTap={{ scale: 0.9 }}
      animate={pulse ? pulseAnimation : { scale: 1 }}
      transition={
        pulse
          ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
          : { type: "spring", stiffness: 420, damping: 20 }
      }
      className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-br ${palette.tile} ${palette.glow} ${dimensions.tile} ${className}`}
    >
      <Icon
        size={dimensions.icon}
        strokeWidth={2.25}
        className="text-white drop-shadow-sm"
        aria-hidden="true"
      />
    </motion.span>
  );
}
