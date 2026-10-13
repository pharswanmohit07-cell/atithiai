import React from "react";

const TONES = {
  gold: "border-amber-300/30 bg-amber-300/10 text-amber-800 dark:text-amber-200",
  coral: "border-rose-300/30 bg-rose-300/10 text-rose-800 dark:text-rose-200",
  violet: "border-violet-300/30 bg-violet-300/10 text-violet-800 dark:text-violet-200",
  teal: "border-teal-300/30 bg-teal-300/10 text-teal-800 dark:text-teal-200",
  sky: "border-sky-300/30 bg-sky-300/10 text-sky-800 dark:text-sky-200",
  emerald: "border-emerald-300/30 bg-emerald-300/10 text-emerald-800 dark:text-emerald-200"
};

export default function Chip({ children, tone = "gold", icon: Icon, className = "" }) {
  return <span className={"inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold leading-tight " + (TONES[tone] || TONES.gold) + " " + className}>
    {Icon && <Icon size={12} aria-hidden="true"/ >}{children}
  </span>;
}
