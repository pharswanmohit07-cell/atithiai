import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

export default function ImageCard({ src, alt, title, meta, selected = false, onClick, className = "" }) {
  const reduceMotion = useReducedMotion();
  return <motion.button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    whileHover={reduceMotion ? undefined : { y: -4, scale: 1.02 }}
    whileTap={reduceMotion ? undefined : { scale: 0.98 }}
    className={"image-card group relative isolate flex min-h-[8.5rem] min-w-0 overflow-hidden rounded-2xl border text-left text-white shadow-glass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 " + (selected ? "image-card-selected " : "") + className}
  >
    <img src={src} alt={alt} width="540" height="360" loading="lazy" decoding="async" className={"image-card-media absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.06] " + (selected ? "brightness-110 saturate-110" : "brightness-[.82] group-hover:brightness-100")} style={{ backgroundColor: "#3B1D7A" }}/>
    <span className="image-card-gradient absolute inset-0" aria-hidden="true"/>
    <span className="relative z-10 mt-auto block min-w-0 p-3.5 sm:p-4">
      <span className="block truncate font-display text-2xl leading-none tracking-wide sm:text-3xl">{title}</span>
      <span className="mt-1.5 block truncate text-[9px] font-extrabold uppercase tracking-[0.12em] text-white/80">{meta}</span>
    </span>
    {selected && <span className="image-card-check absolute right-2.5 top-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-amber-300 text-violet-950 shadow-lg" aria-label="Selected destination"><Check size={16} strokeWidth={3}/></span>}
  </motion.button>;
}
