# DentAYA Production RC7 — Organization Address & Courier Route Layer

RC7 keeps the patient module out of scope and strengthens the current Phase 1 core: clinic + laboratory + CAD + courier.

## What changed

- Clinic and laboratory organizations now have a dedicated operational address model:
  - address line 1 / line 2
  - district / city / postal code / country code
  - Google formatted address
  - latitude / longitude
  - Google Place ID
  - verification timestamp
- Owners/admins can manage the route address from **Settings → Organization**.
- Added authenticated server-side Google Maps geocoding endpoint at `/api/maps/geocode`.
- The Google server key is kept in `GOOGLE_MAPS_GEOCODING_KEY` and is never exposed through `NEXT_PUBLIC_*`.
- Geocoding is limited to authenticated owner/admin users.
- New shipments automatically snapshot:
  - lab address as pickup
  - clinic address as dropoff
  - pickup/dropoff coordinates
- Pending shipments automatically refresh when the clinic or laboratory edits its address.
- Once a shipment reaches pickup/in-transit, its address snapshot is no longer rewritten by organization changes.
- Logistics search now also searches pickup/dropoff address text.
- Logistics detail view shows full pickup and dropoff addresses and whether route coordinates are ready.
- Migration verifier now checks the address columns, sync trigger and address helper function.
- E2E workflow now seeds verified clinic/lab coordinates and asserts that shipment route snapshots are copied correctly.
- Fixed the stray closing token in the RC6 E2E verification script while extending it for RC7.

## New migration

`20260920000400_organization_addresses.sql`

## Environment

```bash
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY=...
GOOGLE_MAPS_GEOCODING_KEY=...
```

## Release version

`1.0.0-rc.7`
