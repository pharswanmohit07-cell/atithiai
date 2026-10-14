import React from "react";
import { CheckCircle2, X } from "lucide-react";

export default function Toast({ message, onDismiss, className = "" }) {
  if (!message) return null;
  return (
    <div role="status" aria-live="polite" className={"toast-surface flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs font-semibold text-text " + className}>
      <CheckCircle2 size={15} className="shrink-0 text-brand" aria-hidden="true" />
      <span className="min-w-0 flex-1">{message}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss message" className="inline-flex min-h-8 min-w-8 items-center justify-center border border-border bg-surface">
          <X size={13} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
