# Atithi Lens sample photos

Atithi Lens expects these bundled sample image paths:

- `sample-taxi.jpg` — taxi fare board with example prices
- `sample-menu.jpg` — menu with clearly visible prices
- `sample-temple.jpg` — temple visitor notice board (no clear price)

Replace/add the JPEG files at these exact paths. They are illustrative sample assets, not photographs of official tariffs, real businesses, or current prices.

The UI includes a seeded, labelled demo result for each sample so the sample action still works if an image asset or analysis service is unavailable. Real image scans use `/api/lens`; successful sample results are cached in localStorage by sample ID.
