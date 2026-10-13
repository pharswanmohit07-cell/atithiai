import React from "react";

const TONES = {
  gold: "from-amber-300 via-yellow-400 to-orange-400 shadow-amber-500/20",
  coral: "from-rose-400 via-pink-500 to-orange-400 shadow-rose-500/20",
  violet: "from-violet-500 via-purple-600 to-indigo-700 shadow-violet-500/25",
  teal: "from-teal-400 via-emerald-500 to-cyan-600 shadow-teal-500/20",
  sky: "from-sky-400 via-blue-500 to-indigo-600 shadow-sky-500/20",
  emerald: "from-emerald-400 via-green-500 to-teal-600 shadow-emerald-500/20",
};

export default function IconBadge({ icon: Icon, tone = "gold", size = "md", className = "" }) {
  const dimensions = size === "sm" ? "h-9 w-9 rounded-xl" : size === "lg" ? "h-14 w-14 rounded-2xl" : "h-11 w-11 rounded-2xl";
  const iconSize = size === "sm" ? 17 : size === "lg" ? 25 : 21;
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-br text-white shadow-lg ring-1 ring-white/20 ${TONES[tone] || TONES.gold} ${dimensions} ${className}`}>
      {Icon && <Icon size={iconSize} strokeWidth={2.15} />}
    </span>
  );
}
