import React from "react";

const TONES = {
  gold: "bg-surface-2 text-text",
  coral: "bg-surface-2 text-brand",
  violet: "bg-brand text-white",
  teal: "bg-surface-2 text-brand",
  sky: "bg-surface-2 text-brand",
  emerald: "bg-surface-2 text-brand",
};

export default function IconBadge({ icon: Icon, tone = "teal", size = "md", className = "" }) {
  const dimensions = size === "sm" ? "h-9 w-9" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const iconSize = size === "sm" ? 17 : size === "lg" ? 25 : 21;
  return (
    <span aria-hidden="true" className={"inline-flex shrink-0 items-center justify-center border border-border " + (TONES[tone] || TONES.teal) + " " + dimensions + " " + className}>
      {Icon && <Icon size={iconSize} strokeWidth={1.9} />}
    </span>
  );
}
