import React from "react";

export default function Skeleton({ label = "Loading", lines = 2, className = "" }) {
  return <section role="status" aria-label={label} className={"glass-card mx-auto w-full max-w-6xl rounded-2xl p-5 sm:p-6 " + className}>
    <span className="sr-only">{label}</span>
    <div className="skeleton h-6 w-2/5 rounded-lg"/>
    <div className="skeleton mt-3 h-3 w-4/5 rounded-md"/>
    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {Array.from({ length: Math.max(1, Math.min(6, lines)) }, (_, index) => <div key={index} className="rounded-xl border border-border/60 p-3">
        <div className="skeleton h-24 rounded-lg sm:h-28"/>
        <div className="skeleton mt-3 h-4 w-3/4 rounded-md"/>
        <div className="skeleton mt-2 h-3 w-full rounded-md"/>
      </div>)}
    </div>
  </section>;
}
