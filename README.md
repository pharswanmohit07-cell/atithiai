# Atithi AI — AI Co-Host for Three-Star Hotels

Atithi AI is a demo product concept for hotel owners and managers who want to help guests discover a destination, plan a stay, understand hotel policies and contact the team. The hotel team retains control over every decision involving prices, fees, refunds, bookings and availability.

The app is destination-agnostic. Its destination registry currently includes demo packs for Jaipur, Ubud and Lisbon. The hotels, partner identities, policies, flexible check-in/out fees, itinerary suggestions and service requests shown in the demo are illustrative rather than commercial offers.

## Product workflow

- **Guest landing:** choose a destination and continue as Guest (Family) or Guest (Solo).
- **Stay planning:** use the selected destination pack to browse well-known places, local dishes and curated experience ideas.
- **Live weather:** read the latest available Open-Meteo observation for the selected pack's coordinates and timezone. Weather does not establish opening hours, venue availability, transport conditions or safety.
- **Hotel services:** request early check-in, late check-out, local experiences, food guidance or a human follow-up.
- **Price Lens:** optionally read visible text from a supplied image. The result is an AI estimate, never an official tariff or a finding of overcharging.
- **Stay Pass:** create a local summary and self-generated QR. It is not an official registration or booking confirmation.
- **Manager view:** review pending guest requests and approve or decline them manually. No payment or reservation is made automatically.

## Technology

- Vite, React 18, React Router and Tailwind CSS 3
- React Leaflet and Leaflet for the destination map
- Framer Motion and Lucide React
- Vercel serverless functions under `api/`
- Gemini for optional AI answers and itinerary suggestions
- Open-Meteo for live weather observations
- `qrcode` and `html-to-image` loaded dynamically when Stay Pass export is requested

## Run locally

Requires a supported Node.js release and npm.

```bash
npm install
cp .env.example .env
npm run dev
```

Set `GEMINI_API_KEY` in the server environment to enable Gemini. `GEMINI_MODEL` is optional; it defaults to `gemini-2.5-flash`. Keep both values server-side. Never use a `VITE_` variable for a secret.

Check source syntax and imports, then create a production bundle:

```bash
npm run lint
npm run build
npx vercel dev
```

If no Gemini key is configured, chat, itinerary and price-image flows use friendly local fallbacks. Live weather still requires an internet connection. Cached demo mode bypasses AI requests.

## Destination Pack format

Each pack is a plain JavaScript module exported from `src/data/destinations/`. The registry at `src/data/destinations/index.js` is the single index used by the UI and serverless functions.

```js
{
  id: "sample-city",
  city: "Sample City",
  country: "Sample Country",
  lat: 0,
  lon: 0,
  timezone: "Region/City",
  locale: "en-XX",
  currency: { code: "XXX", symbol: "¤" },
  primaryLanguages: ["English"],
  hotel: {
    name: "Sample Hotel (demo)",
    stars: 3,
    rooms: 40,
    checkIn: "14:00",
    checkOut: "11:00",
    phone: "Not configured (demo)",
    flexTiers: {
      early: [{ from: "10:00", fee: 10 }],
      late: [{ until: "13:00", fee: 10 }]
    }
  },
  places: [],
  experiences: [],
  dishes: [],
  disruptionLabels: [],
  emergencyNumber: "112"
}
```

Coordinates are approximate. Hotel names, room counts, policies, fees and contacts are demo values. Every experience must include a clearly visible `Demo listing` tag. Do not publish a phone number or fee unless an owner has verified it. Each pack's emergency number must be checked with reliable local guidance before real use.

## How to add a new pack

1. Add `src/data/destinations/my-city.js` with the same schema as the existing packs.
2. Include eight well-known places with approximate coordinates, category, tags, rain-friendly flag and estimated lower-crowd flag.
3. Include six illustrative experiences, each tagged `Demo listing`, and eight dishes with diet flags, spice level and a cautious venue suggestion.
4. Use the destination's correct IANA timezone, locale and ISO 4217 currency code. Keep sample fees in that currency and label them as demo estimates in the UI.
5. Add a comment to double-check the local emergency number; verify that number before real travel.
6. Import the pack in `src/data/destinations/index.js` and add it to `DESTINATIONS`.
7. Run `npm run lint` and `npm run build`, then manually check the destination selector, weather state, map, currency formatting, services, cached demo mode and manager request queue.

The application obtains destination names, coordinates, currency, languages, places, experiences, dishes, hotel name, policy tiers and emergency number from this pack. Avoid duplicating destination constants in UI components or prompts.

## What is real vs demo

**Only weather is live.** The app requests current weather from Open-Meteo using the selected pack's approximate coordinates and IANA timezone. Weather can be stale or unavailable if the device is offline or the service fails.

The hotel itself, room count, guest identity, itinerary, flexible check-in/out fees, partners, experiences, dishes' venue suggestions, requests and manager decisions are demonstrations. Real place names and approximate coordinates are for destination orientation only; the app does not verify opening hours, crowd levels, tickets, transport, reservations or safety. Price Lens reads visible text but cannot verify a fair price without a trusted comparison list.

No money moves through the demo. A button press creates a request for human review; a manager must independently verify the policy and details before confirming an offer or booking. Request statuses are demonstration workflow states, not a connection to hotel operations systems. Emergency links call the displayed local number on the guest's device; the app does not dispatch help.

The Stay Pass QR is built locally in the browser from the visible demo summary. It is self-generated and is not an official registration, room key, identity credential or booking confirmation.

## Environment and secrets

- `GEMINI_API_KEY`: server-side Gemini key
- `GEMINI_MODEL`: optional model identifier, default `gemini-2.5-flash`

`.env` is ignored by Git. Never commit populated environment files, expose API keys through the browser, or include secrets in client-side bundles.

## Accessibility and usability

The UI uses responsive layouts, visible focus outlines, touch-sized controls, theme switching and safe-area padding for mobile navigation. Always verify with the current browser and device before a live demo.
