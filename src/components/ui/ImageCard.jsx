import React from "react";
import { Check, MapPin } from "lucide-react";

export default function ImageCard({ title, meta, selected = false, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={"image-card relative flex min-h-28 min-w-0 items-start justify-between gap-3 border p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus " + (selected ? "image-card-selected " : "") + className}
    >
      <span className="flex min-w-0 items-start gap-3">
        <span className="image-card-mark flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-surface" aria-hidden="true">
          <MapPin size={18} strokeWidth={1.8} />
        </span>
        <span className="min-w-0">
          <span className="block font-display text-2xl leading-tight">{title}</span>
          <span className="mt-1 block text-xs leading-relaxed text-muted">{meta}</span>
        </span>
      </span>
      {selected && <Check size={18} className="mt-1 shrink-0 text-brand" aria-label="Selected destination" />}
    </button>
  );
}
