import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Compass, Users } from "lucide-react";
import { DESTINATIONS } from "../data/destinations/index.js";
import { useDestination } from "../context/DestinationContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "./ui/ThemeToggle.jsx";

const CHOICES = [
  { persona: "Guest (Family)", role: "guest", title: "Guest (Family)", description: "A shared stay with food, local experiences and a clear family-friendly itinerary.", Icon: Users },
  { persona: "Guest (Solo)", role: "guest", title: "Guest (Solo)", description: "A personal itinerary, nearby discoveries and a simple way to ask the hotel team.", Icon: Compass },
  { persona: "Hotel Manager", role: "manager", title: "Hotel Manager", description: "Review guest requests, approve policy exceptions and keep people in control of decisions.", Icon: Building2 },
];

export default function PersonaSelector() {
  const navigate = useNavigate();
  const { destination, selectDestination } = useDestination();
  const { login } = useAuth();

  const choose = (choice) => {
    login({ persona: choice.persona, role: choice.role, name: choice.role === "manager" ? "Hotel Manager (demo)" : choice.persona });
    navigate(choice.role === "manager" ? "/admin" : "/guest", { replace: true });
  };

  return (
    <main className="min-h-screen bg-bg px-4 py-8 pb-[calc(env(safe-area-inset-bottom)+2rem)] text-text sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-accent-text">Atithi AI · Hotel Co-Host</p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight sm:text-6xl">A thoughtful AI co-host for three-star hotels.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">Help guests discover a destination, plan their stay and make requests — while hotel teams stay in control of approvals, availability and every money decision.</p>
          </div>
          <ThemeToggle compact />
        </header>

        <section className="mt-8 rounded-3xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <label htmlFor="destination-choice" className="block text-sm font-bold text-text">Choose destination</label>
          <p className="mt-1 text-xs leading-relaxed text-muted">Each destination pack is demo content. Weather is the only live data source.</p>
          <select id="destination-choice" value={destination.id} onChange={(event) => selectDestination(event.target.value)} className="mt-3 min-h-12 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text sm:max-w-lg">
            {DESTINATIONS.map((item) => <option key={item.id} value={item.id}>{item.city}, {item.country}</option>)}
          </select>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="rounded-full border border-border bg-bg px-3 py-1.5">{destination.hotel.name}</span>
            <span className="rounded-full border border-border bg-bg px-3 py-1.5">{destination.hotel.stars}-star hotel · Demo</span>
            <span className="rounded-full border border-border bg-bg px-3 py-1.5">{destination.currency.code} · {destination.locale}</span>
          </div>
        </section>

        <section className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
          {CHOICES.map(({ persona, title, description, Icon, ...choice }) => (
            <button key={persona} type="button" onClick={() => choose({ persona, title, ...choice })} className="group flex min-h-64 flex-col rounded-3xl border border-border bg-surface p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl focus-visible:outline-offset-4 sm:p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white"><Icon size={23} /></span>
              <span className="mt-5 block font-serif text-2xl">{title}</span>
              <span className="mt-2 flex-1 text-sm leading-relaxed text-muted">{description}</span>
              <span className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white group-hover:brightness-110">{choice.role === "manager" ? "Open manager dashboard" : "Continue as guest"} <ArrowRight size={16} /></span>
            </button>
          ))}
        </section>

        <p className="mt-7 max-w-3xl text-xs leading-relaxed text-muted">Demo only: hotel details, fees, experiences, partners and availability are illustrative. The assistant never books, charges, refunds or changes a price automatically. Staff review is required for requests involving money.</p>
      </div>
    </main>
  );
}
