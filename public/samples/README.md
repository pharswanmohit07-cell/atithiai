# Atithi Lens sample images

Place the three optional sample photographs at these exact paths:

- `public/samples/generic-menu.jpg` — generic menu for Menu mode
- `public/samples/fare-board.jpg` — fare board for Price mode
- `public/samples/notice-sign.jpg` — public notice/sign for Scan mode

Lens keeps working before those image files are added: each sample button then shows the bundled, labelled result from `src/data/lensCache.js`. Those cached results are illustrative fallbacks, not real menus, provider quotes, or market prices. Uploaded photos are downscaled in the browser before analysis.
