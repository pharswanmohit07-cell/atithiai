import { motion } from "framer-motion";

const TONES = {
  saffron: {
    tile: "from-amber-400 via-orange-400 to-yellow-500",
    glow: "shadow-[0_6px_18px_rgba(245,158,11,0.28)]",
  },
  teal: {
    tile: "from-teal-400 via-teal-500 to-cyan-600",
    glow: "shadow-[0_6px_18px_rgba(20,184,166,0.25)]",
  },
  coral: {
    tile: "from-rose-400 via-red-400 to-orange-500",
    glow: "shadow-[0_6px_18px_rgba(244,63,94,0.25)]",
  },
  violet: {
    tile: "from-violet-400 via-purple-500 to-fuchsia-500",
    glow: "shadow-[0_6px_18px_rgba(139,92,246,0.25)]",
  },
  emerald: {
    tile: "from-emerald-400 via-green-500 to-teal-600",
    glow: "shadow-[0_6px_18px_rgba(16,185,129,0.25)]",
  },
  sky: {
    tile: "from-sky-400 via-blue-500 to-cyan-500",
    glow: "shadow-[0_6px_18px_rgba(14,165,233,0.25)]",
  },
};

const SIZES = {
  sm: { tile: "h-9 w-9 rounded-xl", icon: 20 },
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
