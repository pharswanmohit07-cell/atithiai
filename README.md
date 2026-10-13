# Atithi AI — Go beyond the usual

Atithi AI is a personalized travel companion for the hidden places, local stories and experiences that make a destination feel personal. It helps travelers explore beyond the usual, save ideas, assemble a flexible day plan, ask questions in their language, and translate signs or menus with Atithi Lens.

The current demonstration packs are Jaipur (India), Ubud (Bali, Indonesia) and Lisbon (Portugal). The interface is designed around travelers rather than a service-provider workflow.

## What you can do

- **Choose a destination:** select one of the three demonstration destinations from the welcome screen, header or Profile.
- **Discover:** browse 12 places, six experience ideas and ten local dishes for the selected pack. Place and experience listings carry a small Demo content note.
- **Plan:** save places from Discover or make a pack-based suggested day. The plan and conversation reset when the destination changes.
- **Atithi Lens:** scan a menu, fare board or notice, detect the text language, translate it, and optionally use speech playback. Menu notes are AI estimates. Price mode only works from amounts visibly readable in the image; it does not claim official rates or verified market prices.
- **Chat:** ask questions in the language you write in, or choose a reply language in the chat header.
- **Save notes:** save Lens results, food ideas and experience ideas into local travel notes.
- **Live weather:** see the latest available Open-Meteo observation for the selected pack's approximate coordinates and timezone.

## Technology

- Vite, React 18, React Router and Tailwind CSS 3
- React Leaflet and Leaflet for destination maps
- Framer Motion and Lucide React
- Vercel serverless functions under \`api/\`
- Gemini for optional chat and image interpretation
- Open-Meteo for live current-weather observations

## Run locally

Requires a supported Node.js release and npm.

\`\`\`bash
npm install
cp .env.example .env
npm run dev
\`\`\`

Set \`GEMINI_API_KEY\` in the server environment to enable Gemini. \`GEMINI_MODEL\` is optional and defaults to \`gemini-2.5-flash\`. Keep both values server-side. Never use a \`VITE_\` variable for a secret.

Validate source syntax and imports, then create a production bundle:

\`\`\`bash
npm run lint
npm run build
npx vercel dev
\`\`\`

Chat and Lens continue to show friendly local fallbacks if the Gemini key is absent or a request fails. Live weather requires an internet connection.

## Destination Pack format

Each pack is an ES module under \`src/data/destinations/\`; \`src/data/destinations/index.js\` is the shared registry for both the UI and API functions. All curated descriptions, stories, crowd estimates, host identities and spend values are demo/AI-assisted. Coordinates are approximate. Recheck story wording and local emergency guidance before any real-world release.

A pack uses this shape:

\`\`\`js
{
  id, city, country, lat, lon, timezone, locale,
  currency: { code, symbol },
  primaryLanguages,
  greeting,
  emergencyNumber,
  themeColors: { accent, accentSoft },
  places: [{
    id, name, lat, lon,
    category: "viewpoint" | "market" | "cafe" | "culture" | "nature" | "craft" | "wellness",
    isHiddenGem,
    crowdLevel: "low" | "medium" | "high",
    localStory,
    rainFriendly,
    indoor,
    bestTime: "morning" | "afternoon" | "evening" | "any",
    avgSpendLocal,
    durationMin,
    tags
  }],
  experiences: [{
    id, title, hostName, category, durationMin, priceLocal,
    communityLed, suitsWho, rainFriendly, localStory
  }],
  dishes: [{
    id, name, description,
    diet: { veg, vegan, nonVeg, halal, glutenFree },
    spiceLevel, whereToEat,
    priceRangeLocal: [low, high],
    bestTime, warm
  }]
}
\`\`\`

Each supplied demonstration pack currently has 12 places, six experience ideas and ten dishes. \`priceRangeLocal\` is a two-number illustrative range in the pack's currency. Dietary flags may be \`null\` when the information is uncertain; do not convert uncertainty into a dietary guarantee.

## How to add a pack

1. Create \`src/data/destinations/my-city.js\` with the same structure as the existing packs. Begin the file with a comment that the content is demo/AI-assisted and its coordinates are approximate.
2. Supply 12 place entries, six experience ideas and ten real local dishes. Write local stories in two cautious sentences, avoid invented dates and keep access or opening claims out unless verified.
3. Use the correct IANA timezone, locale and ISO 4217 currency code. Keep spend amounts as illustrative ranges in that local currency.
4. Add a comment beside the emergency number telling contributors to double-check it before travel or release; independently verify the number from a reliable local source.
5. Import the pack in \`src/data/destinations/index.js\` and add it to \`DESTINATIONS\`.
6. Run \`npm run lint\` and \`npm run build\`; then manually test the welcome destination cards, header/Profile switcher, weather, map, currency display, plan reset and Lens/chat flows.

Do not duplicate specific place names, coordinates, currencies or destination descriptions inside components. Read them from \`useDestination()\` and the selected pack.

## What is real vs demo

**Only weather is live.** The app requests current conditions from Open-Meteo using the selected pack's approximate coordinates and IANA timezone. Weather can be unavailable, and an observation does not verify venue access, opening hours, crowds, transport, ticketing or safety.

The destination stories, selected places, estimated crowd levels, experience hosts, experience durations, spend ranges and dish ranges are curated demonstration content. No reservation, payment, guide contact or venue check is performed. Atithi Lens interprets visible text and can be wrong; confirm translations, ingredients, local instructions and prices directly. Currency ranges in Lens are based only on readable amounts from the submitted image, and are not official rates or independently verified comparisons.

Travel plans, chat history and saved notes are stored in the current browser. Switching destinations clears the active plan and conversation so entries from one city do not appear in another city. The emergency button starts a phone call to the number listed in the selected pack; the app does not dispatch assistance.

## Environment and secrets

- \`GEMINI_API_KEY\`: server-side Gemini key
- \`GEMINI_MODEL\`: optional model identifier, default \`gemini-2.5-flash\`

\`.env\` is ignored by Git. Never commit populated environment files, expose API keys through the browser, or include secrets in client-side bundles.

## Accessibility and usability

The UI uses responsive layouts, focus outlines, touch-sized controls, theme switching and safe-area padding for mobile navigation. Verify layouts in a current browser and on the devices you plan to support.
