# RC7 Address Routing QA

1. Sign in as a clinic owner/admin and open Settings → Organization.
2. Enter the clinic operational address, click **Google Maps ile doğrula**, then save.
3. Sign in as a laboratory owner/admin and repeat for the laboratory.
4. Complete a case until `ready` and create a courier shipment.
5. Confirm the shipment shows the laboratory address as pickup and the clinic address as delivery.
6. Confirm the route map receives pickup/dropoff coordinates.
7. Before pickup, edit either organization address and confirm a `created` / `pickup_requested` shipment refreshes.
8. Move the shipment to `picked_up`, edit an organization address again and confirm the active route snapshot no longer changes.
9. Confirm a non-owner/non-admin cannot use the server geocoding endpoint.
10. Run `npm run verify` and require all migration, E2E, typecheck, lint and build gates to pass before staging.
