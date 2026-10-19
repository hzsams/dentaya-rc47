# DentAYA 1.0.0-rc.8 — Production Courier Ops

RC8 turns the courier module from a route viewer into an operational delivery layer.

## Added

- Server-side Google Maps **Routes API** integration with traffic-aware distance and ETA.
- Planned laboratory → clinic route metrics plus remaining courier → next-stop metrics.
- Persisted route distance, duration, ETA and encoded route polyline on each shipment.
- Google Maps navigation handoff for the assigned courier.
- Hardened live-location writes: shipment courier organization, driver assignment and actor identity are validated in the database.
- Live-location freshness state in the UI: live / delayed / stale-offline.
- Immutable delivery-proof records with recipient name, optional confirmation code, note and optional JPG/PNG proof photo.
- Delivery can no longer be marked complete without a delivery proof.
- Actual travel duration and approximate travelled distance are derived at completion from courier timestamps/location samples.
- Shipment proof photos are stored under `shipments/<shipment-id>/proof/...` in the existing private `dentaya-files` bucket.
- RC8 E2E verification now checks route persistence, cross-organization location rejection and proof-required delivery.

## Database

New migration:

`20260920000500_production_courier_ops.sql`

The project now contains **20 migrations**.

## Environment

```env
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY=
GOOGLE_MAPS_GEOCODING_KEY=
GOOGLE_MAPS_ROUTES_KEY=
```

Keep `GOOGLE_MAPS_GEOCODING_KEY` and `GOOGLE_MAPS_ROUTES_KEY` server-only.
