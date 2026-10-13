# Deploy Atithi AI on Netlify Free

This branch is an alternative while Vercel's daily deployment limit is reached. It keeps the Vite UI and adapts the existing Chat, Intent, Plan, and Lens handlers to Netlify Functions.

## Create the site

1. Sign in at https://app.netlify.com/ using GitHub.
2. Choose **Add new project** → **Import an existing project** → **GitHub**.
3. Select `pharswanmohit07-cell/atithiai`.
4. Choose branch `deploy/netlify-free` (not `main`).
5. Confirm build command `npm run build`, publish directory `dist`, and functions directory `netlify/functions`.
6. Deploy.

## Add Gemini variables

In the Netlify site's environment-variable settings, add:

- `GEMINI_API_KEY`: enter the key privately in the dashboard. Do not commit it to GitHub or prefix it with `VITE_`.
- `GEMINI_MODEL`: `gemini-3.8-flash`.

Make the variables available to production and deploy-preview contexts, then deploy again after saving.

Because the previous key was pasted into chat, rotate it first and use the replacement.

## Verify

1. Open the Netlify site URL.
2. Send a new question in Chat and check the status banner.
3. Open **Show on map**. The app uses keyless OpenStreetMap tiles with attribution; no separate map key is needed.
4. If a function fails, inspect Netlify's Function logs. Share any error text without secret values.

Netlify Free has a monthly usage-credit allowance and hard limits. This avoids buying Vercel credits, but is not unlimited.
