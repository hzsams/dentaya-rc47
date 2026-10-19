# DentAYA RC8 — Courier Production QA

## 1. Environment

- `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` configured for the web domain.
- `GOOGLE_MAPS_GEOCODING_KEY` configured server-side.
- `GOOGLE_MAPS_ROUTES_KEY` configured server-side and Routes API enabled.
- Clinic and laboratory addresses verified under Ayarlar → Kurum.

## 2. Route and ETA

1. Open a shipment with verified clinic/lab coordinates.
2. Confirm planned Lab → Clinic distance and duration appear.
3. Assign a courier and driver.
4. Share courier location.
5. Before pickup, confirm active ETA targets the pickup point.
6. Mark pickup and start transit.
7. Refresh ETA and confirm active ETA now targets the clinic.
8. Open Google Maps navigation and verify it points to the correct next stop.

## 3. Live tracking security

- Location upload without a driver must be blocked by the UI.
- A courier location using another organization id must be rejected by the database.
- A courier user mapped to a driver must not publish location for a different assigned driver unless owner/admin.
- Delivered/cancelled shipments must reject new live-location samples.
- Clinic and laboratory participants can read the latest courier location but cannot publish courier location.

## 4. Delivery proof

1. Move a shipment to `in_transit`.
2. Directly marking it `delivered` must fail without proof.
3. Enter recipient name.
4. Optionally add PIN/code, note and JPG/PNG photo (≤ 8 MB from the app UI).
5. Complete delivery.
6. Confirm proof is visible to shipment participants.
7. Confirm readable code storage shows only the final masked suffix; the full code is hashed.
8. Confirm shipment and case both become delivered.
9. Confirm remaining route becomes 0 and actual travel metrics are populated.

## 5. Automated gate

Run:

```powershell
npm.cmd run verify
```

Expected gates: lint, strict TypeScript, CAD verifier, migration verifier, E2E verifier and Next production build.
