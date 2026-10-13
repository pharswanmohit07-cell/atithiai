import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";

export default function Toast({ message, onDismiss, className = "" }) {
  const reduceMotion = useReducedMotion();
  return <AnimatePresence initial={false}>
    {message && <motion.div role="status" aria-live="polite" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.2 }} className={"toast-surface flex items-center gap-2 rounded-xl border border-amber-300/50 bg-surface/95 px-3 py-2 text-xs font-bold text-text shadow-glass backdrop-blur " + className}>
      <CheckCircle2 size={15} className="shrink-0 text-teal-500" aria-hidden="true"/>
      <span className="min-w-0 flex-1">{message}</span>
      {onDismiss && <button type="button" onClick={onDismiss} aria-label="Dismiss message" className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg hover:bg-surface-2"><X size={13}/></button>}
    </motion.div>}
  </AnimatePresence>;
}
