import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";

function LegalPage({ title, updated, children }) {
  return (
    <main className="min-h-screen bg-bg px-4 py-8 text-text sm:px-6 sm:py-12">
      <article className="mx-auto max-w-3xl border border-border bg-surface p-5 sm:p-9">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-brand underline underline-offset-4">
          <ArrowLeft size={16} aria-hidden="true" /> Back to Atithi AI
        </Link>
        <header className="mt-8 border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <Compass size={24} aria-hidden="true" />
            <p className="text-sm font-semibold">Atithi AI</p>
          </div>
          <h1 className="mt-5 font-display text-4xl leading-tight sm:text-5xl">{title}</h1>
          <p className="mt-3 text-sm text-muted">Last updated {updated}</p>
        </header>
        <div className="legal-content mt-7 space-y-7 text-sm leading-7">{children}</div>
        <nav aria-label="Legal documents" className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-border pt-5 text-sm">
          <Link className="text-brand underline underline-offset-4" to="/privacy">Privacy policy</Link>
          <Link className="text-brand underline underline-offset-4" to="/terms">Terms and conditions</Link>
          <Link className="text-brand underline underline-offset-4" to="/">Home</Link>
        </nav>
      </article>
    </main>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy policy" updated="14 October 2026">
      <section>
        <h2 className="font-display text-2xl">Scope</h2>
        <p>Atithi AI is a travel-planning prototype for Jaipur, Ubud and Lisbon. This policy describes the data flows in this version of the app. Features and service providers may change before a public release.</p>
      </section>
      <section>
        <h2 className="font-display text-2xl">Information stored on your device</h2>
        <p>The app stores preferences and working trip data in your browser, including theme and language choices, travel preferences, saved places, plan items, chat history, Lens notes and locally saved suggestions. Browser storage remains on this device until you clear it, use the app's reset option, or remove the data through your browser settings. Clearing it can remove saved plans and preferences.</p>
      </section>
      <section>
        <h2 className="font-display text-2xl">Requests to other services</h2>
        <p>When you request travel chat, itinerary assistance or Lens analysis, the relevant text and, for Lens, an image you submit may be sent to this website's API and the AI provider configured for the deployment. Do not submit passwords, payment details, identity documents or other sensitive information. The provider's own handling of submitted content is governed by its terms and privacy policy.</p>
        <p>Weather requests use Open-Meteo and the approximate coordinates configured for the selected destination. The hosting provider may process standard technical request information when serving the website and its API.</p>
      </section>
      <section>
        <h2 className="font-display text-2xl">Accounts, bookings and payments</h2>
        <p>This prototype does not create a traveler account, take payment or complete travel bookings. Saving an experience request creates a note in this browser only. It does not contact a host.</p>
      </section>
      <section>
        <h2 className="font-display text-2xl">Your choices</h2>
        <p>You can change or reset locally stored preferences in the app where controls are provided, and clear the site's storage in your browser. You can choose not to use chat, plan assistance or Lens upload features. Standard network requests needed to serve the site may still occur.</p>
      </section>
      <section>
        <h2 className="font-display text-2xl">Changes and contact</h2>
        <p>This policy should be reviewed before a public commercial launch. To ask a question or report a privacy concern, contact the project maintainers through the <a className="text-brand underline underline-offset-4" href="https://github.com/pharswanmohit07-cell/atithiai/issues">project issue tracker</a>. Do not include private or sensitive personal information in a public issue.</p>
      </section>
    </LegalPage>
  );
}

export function TermsAndConditions() {
  return (
    <LegalPage title="Terms and conditions" updated="14 October 2026">
      <section>
        <h2 className="font-display text-2xl">Prototype use</h2>
        <p>Atithi AI is provided as a demonstration travel companion. By using the app, you agree to use it lawfully and understand that features and destination data may change during development.</p>
      </section>
      <section>
        <h2 className="font-display text-2xl">Information is not independently verified</h2>
        <p>Place descriptions, local stories, crowd estimates, prices, dietary notes, travel durations and experience details in the destination packs are illustrative and may be inaccurate or outdated. Recommendations and generated text can contain errors. Verify opening hours, access requirements, current prices, ingredients, transport, weather impacts and safety advice with reliable local sources before making decisions.</p>
      </section>
      <section>
        <h2 className="font-display text-2xl">No booking or emergency service</h2>
        <p>The app does not reserve accommodation, book tickets, contact hosts, confirm availability or dispatch emergency assistance. An emergency button, where shown, opens the device's phone handler for the listed number. Check local emergency guidance and confirm the correct number for your location.</p>
      </section>
      <section>
        <h2 className="font-display text-2xl">AI and translation features</h2>
        <p>Chat, itinerary assistance and Lens results are provided for general informational use. Translations, food identification, prices and interpretations may be wrong or incomplete. Do not rely on them alone for medical, dietary-allergy, legal, financial, access or safety decisions.</p>
      </section>
      <section>
        <h2 className="font-display text-2xl">Acceptable use and availability</h2>
        <p>Do not misuse the service, attempt unauthorized access, upload unlawful content, or interfere with other users or service providers. The app depends on network access and third-party services, so it may be unavailable or return incomplete results. No uninterrupted service is promised.</p>
      </section>
      <section>
        <h2 className="font-display text-2xl">Liability and changes</h2>
        <p>To the extent permitted by applicable law, use of this prototype is at your own discretion and risk. These terms do not remove rights that cannot legally be excluded. The project maintainers may update the app and these terms; the date above identifies the latest stated revision.</p>
      </section>
      <section>
        <h2 className="font-display text-2xl">Contact</h2>
        <p>For questions about these terms, use the <a className="text-brand underline underline-offset-4" href="https://github.com/pharswanmohit07-cell/atithiai/issues">project issue tracker</a>. Do not publish sensitive personal information.</p>
      </section>
    </LegalPage>
  );
}
