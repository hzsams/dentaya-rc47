# DentAYA Atelier

`DentAYA_Premium_Atelier.webp` is the shipped brand-settings artwork, edited with
the image generation tool from the existing RC38 identity presentation. Its
emerald, ivory and champagne surface treatment informs the vector collection.
The generated artwork is decorative; the product name remains real accessible
text and the operational logos remain independently exported outlined SVG files.

The 18 marks have distinct silhouettes and stable IDs `01`–`18`. The earlier
eight-family version mapped ten IDs to other marks; those IDs now have their own
designs. Current and older settings exports remain importable by ID.

Rebuild vector assets: `python3 scripts/build-brand-assets.py`.
Rebuild PNG exports: `node scripts/render-brand-assets.mjs` (requires Sharp).
Rebuild Windows icons: `python3 scripts/brand-source/build-icons.py` (Pillow).

`DentAYA_Premium_Logo_Koleksiyonu.svg` and `.png` present the actual exported
vector collection. Older RC38 boards are historical references.

All wordmarks use the stored DENTAYA letter contours. No remote fonts or artwork
services are required at runtime. Every family includes dark, light, wordmark,
monochrome and icon SVGs; Windows ICOs include 16–256 px resolutions.
