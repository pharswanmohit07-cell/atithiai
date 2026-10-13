import React from "react";

export default function SectionTitle({ eyebrow, title, description, as = "h2", className = "" }) {
  const Heading = as;
  return <div className={"section-title-block min-w-0 " + className}>
    {eyebrow && <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent-text">{eyebrow}</p>}
    <Heading className="font-display text-3xl leading-none tracking-wide text-text sm:text-4xl">{title}</Heading>
    <span className="section-progress mt-3 block h-[3px] w-14 rounded-full" aria-hidden="true"/>
    {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>}
  </div>;
}
