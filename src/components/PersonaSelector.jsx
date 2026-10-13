import React from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, HeartPulse, Mountain, ShieldCheck, Users } from "lucide-react";
import { PERSONA_OPTIONS, useAppContext } from "../context/AppContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import IconBadge from "./ui/IconBadge.jsx";

const ICONS = {
  pilgrim: HeartPulse,
  trekker: Mountain,
  "tourism-officer": ShieldCheck,
};
export default function PersonaSelector() {
  const navigate = useNavigate();
  const location = useLocation();
  const { persona: savedPersona, selectPersona } = useAppContext();
  const { login } = useAuth();

  const choosePersona = (option) => {
    const persona = selectPersona(option.id);
    if (!persona) return;
    if (persona.role === "staff") {
      login({ role: "staff", name: persona.name });
    } else {
      login({ role: "guest", name: persona.name, room: "", stayId: `PERSONA-${persona.id.toUpperCase()}` });
    }
    const query = new URLSearchParams(location.search);
    const destination = persona.role === "staff" ? "/admin" : "/guest";
    const queryString = query.toString();
    navigate(`${destination}${queryString ? `?${queryString}` : ""}`, { replace: true });
  };

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4 py-10 text-text sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_10%,rgba(249,194,139,.32),transparent_42%),radial-gradient(ellipse_at_85%_75%,rgba(71,126,102,.22),transparent_42%)] dark:bg-[radial-gradient(ellipse_at_15%_10%,rgba(121,67,89,.26),transparent_42%),radial-gradient(ellipse_at_85%_75%,rgba(41,94,83,.25),transparent_42%)]" />
      <div className="w-full max-w-6xl">
        <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4 }} className="mx-auto mb-9 max-w-2xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-xl shadow-black/10"><Mountain size={27}/></div>
          <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[.28em] text-accent-text">Atithi AI · Himalayan Trip Guardian</p>
          <h1 className="mt-3 font-serif text-4xl leading-[1.02] sm:text-6xl">Every journey has<br/><span className="italic">its own needs.</span></h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">Choose a demo persona to explore safer corridor decisions, health-aware planning, disruption signals and community-first travel. No login or password needed.</p>
          {savedPersona && <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-2 text-[11px] text-muted"><Users size={13}/> Last selected: <strong className="text-text">{savedPersona.name}</strong></p>}
        </motion.header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          {PERSONA_OPTIONS.map((option, index) => {
            const Icon = ICONS[option.id] || Users;
            const isPilgrim = option.id === "pilgrim";
            const isOfficer = option.role === "staff";
            return (
              <motion.button
                key={option.id}
                type="button"
                onClick={() => choosePersona(option)}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: .08 * index, duration: .38 }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: .99 }}
                className="group flex min-h-[300px] flex-col rounded-[28px] border border-border bg-surface/90 p-5 text-left shadow-sm transition-shadow hover:shadow-xl sm:p-6"
              >
                <IconBadge icon={Icon} tone={isPilgrim ? "coral" : isOfficer ? "sky" : "emerald"} size="lg" />
                <span className="mt-5 flex items-start justify-between gap-2">
                  <span><span className="block font-serif text-2xl sm:text-3xl">{option.name}</span><span className="mt-1 block text-[11px] font-semibold text-accent-text">{option.description}</span></span>
                  <ArrowRight size={18} className="mt-1 shrink-0 text-muted transition-transform group-hover:translate-x-1"/>
                </span>
                <span className="mt-4 block flex-1 text-sm leading-relaxed text-muted">{option.subtitle}</span>
                <span className="mt-5 flex flex-wrap gap-2">
                  {(isPilgrim ? ["62 years", "BP / hypertension · demo", "Gentle pace"] : option.id === "trekker" ? ["28 years", "Fit · demo", "Trail-aware"] : ["Regional overview", "Safety signals", "Local economy"]).map((tag) => <span key={tag} className="rounded-full border border-border bg-surface-2 px-2.5 py-1.5 text-[9px] font-semibold text-muted">{tag}</span>)}
                </span>
                <span className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-xs font-bold text-white transition group-hover:brightness-110">{isOfficer ? "Open officer dashboard" : "Continue as this persona"} <ArrowRight size={14}/></span>
              </motion.button>
            );
          })}
        </div>
        <p className="mx-auto mt-7 max-w-3xl text-center text-[10px] leading-relaxed text-muted">Demonstration profiles only. The health tags are not medical records or medical advice; live weather and corridor coordinates are approximate planning context. Always follow current official route and emergency guidance.</p>
      </div>
    </main>
  );
}
