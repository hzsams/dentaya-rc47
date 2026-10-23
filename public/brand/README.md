# DentAYA Atelier

The shared catalogue contains 120 original dental, CAD and monogram marks. Each
has a distinct outlined SVG contour, bevel, sidewall, highlight and shadow layers.
These are dimensional vector illustrations, not 3D meshes. The product wordmark
uses stored DENTAYA letter contours rather than installed or remote fonts.

IDs `01`–`100` and all their 900 SVG, PNG and ICO files retain their RC55 bytes.
The first 18 IDs also retain their earlier preference mappings. The committed
`scripts/brand-source/rc55-stable-logos.json` snapshot protects the original
catalogue entries and assets during verification. Current and older settings
exports remain importable by ID. New IDs `101`–`120` use the same UI and Electron
allowlist as the existing marks.

`DentAYA_Premium_Atelier.webp` is the shipped settings overview of all 120 actual
exports. `DentAYA_Premium_Logo_Koleksiyonu.svg` and `.png` show the full lockups.
The compact overview keeps its 1672 × 941 canvas; the full board grows with the
catalogue. Older RC38 boards are historical references.

Rebuild all vector sources: `python3 scripts/build-brand-assets.py`.
Rebuild PNG and seven-size Windows ICO exports: `node scripts/render-brand-assets.mjs`
(requires Sharp). To export only appended marks while retaining prior raster
bytes, use `python3 scripts/build-brand-assets.py --from-id 101` and
`node scripts/render-brand-assets.mjs --from-id=101`. Both refresh the overview
artwork and identity index as well. Run `npm run verify:brand-assets` and
`npm run verify:desktop-brand` afterwards.

Every mark includes dark, light, wordmark, monochrome and icon SVG variants,
a 512 px PNG icon, and native 16, 24, 32, 48, 64, 128 and 256 px ICO frames.
No remote artwork service is required at runtime. Windows shell calls in the
source checks are mocked; the checks do not establish a real Windows install.
