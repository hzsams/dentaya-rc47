# DentAYA Production RC4 · Kurye & CAD UX QA

## Scope

This revision is focused on the two operational surfaces that were still too close to an MVP shell:

- `/logistics`: courier operations, location sharing, route visibility, search and next-action flow.
- `/design`: a practical step-by-step CAD mode with one clear action per workflow step, while keeping advanced fit/shell/undercut controls in Expert mode.

## Implemented

### Courier tracking

- Added shipment search across tracking number, case number/title and pickup/drop-off labels.
- Added a selected-shipment route surface with pickup, courier and drop-off points.
- Added real browser geolocation capture with accuracy, heading, speed and timestamp.
- Added an explicit live-tracking toggle that watches the device location and persists a throttled update approximately every 15 seconds.
- Added `courier_locations` insert flow scoped to the selected shipment and courier organization.
- Added realtime refresh for newly inserted courier locations.
- Added a single next operational status action instead of presenting every status transition at once.
- Added location freshness and external map handoff for the current courier point.
- Fixed route projection so real coordinates are not compressed against the zero meridian.
- Prevented new location writes after a shipment is delivered or cancelled.
- Added a real case-to-courier handoff: ready cases can create one active shipment from the case delivery tab, optionally selecting a visible courier network.
- Added idempotent client request IDs and an active-shipment guard so the same case cannot accidentally open duplicate live deliveries.
- Added realtime shipment refresh in the case command center.
- Added a database trigger that moves the case to `shipped` / `delivered` when courier operations move the shipment, without granting couriers direct case-write access.
- Made clinic design decisions race-safe: the case transition is conditional on the visible status, and a failed review write compensates the case status instead of leaving the two records split.

### CAD workstation

- Added a prominent “ŞİMDİKİ TEK İŞ” action card to the inspector.
- Added context-aware quick actions for scan, margin, anatomy, contacts, thickness and review.
- Kept the normal mode focused on the active workflow step.
- Moved Internal Fit, Crown Shell / Intaglio and insertion-axis/undercut controls behind the Uzman mode.
- Localized the mode labels to “Adım adım” and “Uzman” for a clearer operator-facing interface.
- Reworked the workstation shell around an Exocad-style left operation rail: workflow, model tools, undo/redo, fit and full tool access are grouped in one vertical panel.
- Removed the duplicate top tool cluster and the always-visible object/file column from the primary working surface; the viewport now gets the visual priority.

### Google Maps

- Added a real Google Maps Embed route surface for pickup → courier → delivery when `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` is configured.
- Uses Google Maps directions mode with driving, metric units, Turkish labels and intermediate courier waypoint support.
- Keeps a built-in route preview and external “Haritada aç” handoff when the key is intentionally absent, so the screen does not fail in local development.
- Directions mode now uses pickup/drop-off labels as a fallback, so the Google route can render before coordinates are captured.

### End-to-end boundary fixed

The previous handoff stopped at “Kurye Sürecini Aç”: the case opened logistics, but there was no way to create the shipment. The delivery tab now creates the route record, writes its audit event, and keeps the case and shipment statuses synchronized through the courier lifecycle.

## Verification

Executed from the project root:

```text
npm run lint -- --max-warnings=0  ✓
npm run typecheck                ✓
npm run verify:cad               ✓
npm run verify:migrations        ✓
npm run build                    ✓
```

Build result: Next.js 16.3.5 production build completed successfully with 27 routes.

## Operational note

The route surface is self-contained and does not require a third-party map API key. “Haritada aç” hands the selected point to Google Maps. Live location sharing still requires the browser/device location permission and a signed-in courier organization.
