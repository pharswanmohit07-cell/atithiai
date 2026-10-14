import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";

const NEEDS = [
  "finding places that feel local, not just popular",
  "understanding menus, signs and prices in another language",
  "plans that break when weather changes",
  "awkward gaps between check-out and departure (or arrival and check-in)",
  "trusting what an app tells you"
];

const COMPARISON = [
  ["Uses your profile", "Preferences are often spread across different tools.", "Uses your interests, pace, food preferences, budget and languages when ranking pack items."],
  ["Explains why each pick fits", "Reasons can be generic or separated from recommendations.", "Shows rule-based match reasons beside ranked items."],
  ["Adapts the plan to weather", "Travelers usually need to compare conditions and plans manually.", "Uses available live weather to flag weather-sensitive plan stops. It does not verify closures."],
  ["Helps with the check-in/check-out gap", "These gaps usually need manual planning and a separate message.", "Estimates a time gap, ranks short pack suggestions and drafts a question the traveler can send."],
  ["Scans menus/signs in your language", "Translation is often a separate step or app.", "Atithi Lens accepts a selected image and can interpret or translate it when AI is configured."],
  ["Labels what is demo or estimated", "Disclosure varies by product and listing.", "Labels pack stories, host names, crowds and spending values as demo or estimated."]
];

export default function AboutPage() {
  return <main className="min-h-screen bg-bg px-4 py-8 text-text sm:px-6 sm:py-12">
    <article className="mx-auto max-w-5xl border border-border bg-surface p-5 sm:p-9">
      <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand underline underline-offset-4"><ArrowLeft size={16} aria-hidden="true"/>Back to Atithi AI</Link>
      <header className="mt-7 border-b border-border pb-6">
        <div className="flex items-center gap-3"><Compass size={24} aria-hidden="true"/><p className="text-sm font-semibold">Atithi AI</p></div>
        <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight sm:text-5xl">Travel planning that explains its suggestions.</h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted">Atithi AI is a travel-planning prototype for Jaipur, Ubud and Lisbon. It combines destination-pack discovery, profile-based ranking, live weather when available, itinerary planning, and language tools in one place.</p>
      </header>

      <section className="mt-8" aria-labelledby="traveler-needs-title">
        <h2 id="traveler-needs-title" className="font-display text-2xl sm:text-3xl">Real traveler needs we solve</h2>
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {NEEDS.map((need, index) => <li key={need} className="flex items-start gap-3 border border-border bg-bg p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-border bg-surface text-xs font-bold">{index + 1}</span>
            <span className="text-sm leading-relaxed">{need.charAt(0).toUpperCase() + need.slice(1)}.</span>
          </li>)}
        </ul>
      </section>

      <section className="mt-9" aria-labelledby="difference-title">
        <h2 id="difference-title" className="font-display text-2xl sm:text-3xl">How we are different</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">This is a capability comparison, not a claim about every competitor. Typical alternatives vary, and individual maps, review apps and chatbots may offer similar features.</p>
        <div className="mt-4 overflow-hidden border border-border">
          <table className="w-full table-fixed border-collapse text-left text-xs sm:text-sm">
            <thead className="bg-surface-2">
              <tr>
                <th className="w-[28%] border-b border-border p-2.5 font-bold sm:p-3">Need</th>
                <th className="w-[34%] border-b border-border p-2.5 font-bold sm:p-3">Typical maps/review apps and general chatbots</th>
                <th className="w-[38%] border-b border-border p-2.5 font-bold sm:p-3">Atithi AI</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(([feature, typical, atithi]) => <tr key={feature}>
                <th scope="row" className="break-words border-b border-border p-2.5 align-top font-semibold sm:p-3">{feature}</th>
                <td className="break-words border-b border-border p-2.5 align-top leading-relaxed text-muted sm:p-3">{typical}</td>
                <td className="break-words border-b border-border p-2.5 align-top leading-relaxed sm:p-3">{atithi}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-9" aria-labelledby="real-demo-title">
        <h2 id="real-demo-title" className="font-display text-2xl sm:text-3xl">What is real today vs demo</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <article className="border border-border bg-bg p-4">
            <h3 className="text-base font-bold">Live or configured services</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">Current weather is fetched from Open-Meteo when the network and service are available. Gemini can generate chat or image interpretation when the deployment has its server-side credentials configured. Local fallback responses may appear when the provider is unavailable.</p>
          </article>
          <article className="border border-border bg-bg p-4">
            <h3 className="text-base font-bold">Demo or estimated content</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">Destination-pack places, prices, crowds, experiences, host names and local stories are illustrative or estimated. Simulated closures are demo events, not live alerts. Verify details with reliable local sources.</p>
          </article>
        </div>
        <p className="mt-3 border-l-2 border-brand bg-surface-2 p-3 text-sm leading-relaxed">Atithi AI does not contact hotels, hosts or staff, confirm availability, or make bookings. Human-help messages are drafts for the traveler to review and send themselves. Suggestions for local curation are saved in this browser and are not delivered to a curator.</p>
      </section>

      <nav aria-label="About and legal" className="mt-9 flex flex-wrap gap-x-5 gap-y-3 border-t border-border pt-5 text-sm">
        <Link to="/" className="text-brand underline underline-offset-4">Home</Link>
        <Link to="/privacy" className="text-brand underline underline-offset-4">Privacy policy</Link>
        <Link to="/terms" className="text-brand underline underline-offset-4">Terms and conditions</Link>
      </nav>
    </article>
  </main>;
}
