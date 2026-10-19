# DentAYA Production RC5 — E2E Workflow Lock QA

## Goal

RC5 locks the critical pilot path at the database boundary instead of relying only on UI buttons:

`Clinic → Case → Scan → Lab CAD → Design Review → Production → QC → Ready → Courier → Delivered`

## Critical fixes

- Case status changes now have database-level transition guards.
- Design submission is committed transactionally through `dentaya_submit_design_version`.
- Clinic design approval / revision is committed transactionally through `dentaya_review_design`.
- Only one active shipment can exist for a case.
- Shipment creation is transactional and idempotent through `dentaya_create_case_shipment`.
- A shipment created without a courier is no longer stranded: clinic/lab can assign a visible courier with `dentaya_assign_courier` before pickup.
- Courier status progression is enforced in the database: `created → pickup_requested → picked_up → in_transit → delivered`.
- Pickup requires a valid driver from the selected courier organization.
- `pickup_at` and `delivered_at` are server-stamped if missing.
- Shipment status continues to synchronize the case to `shipped` and `delivered` without giving couriers direct case-write access.
- Design review decisions are one-time and require the authenticated reviewer identity.

## Automated verification gate

Run from the project root:

```bash
npm install
npm run verify
```

`verify:migrations` now additionally checks:

- RC5 workflow RPC functions exist.
- workflow guard triggers exist.
- the one-active-shipment unique index exists.
- every migration still applies from zero in the embedded PostgreSQL verifier.

## Manual pilot acceptance

Use three separate authenticated accounts: clinic, lab, courier.

1. Clinic creates a patient/case and assigns the lab.
2. Lab accepts the case.
3. Lab selects/uploads the working scan and completes CAD.
4. Lab submits design v1. Confirm case becomes `approval` and exactly one pending review exists.
5. Clinic requests revision. Confirm case returns to `design`; the previous review cannot be changed again.
6. Lab submits v2. Clinic approves. Confirm case becomes `production`.
7. Lab completes production → QC → ready.
8. Create a shipment with no courier. Confirm the same case cannot create a second active shipment.
9. Assign a courier from the case delivery tab. Confirm status becomes `pickup_requested` and the courier account sees the job.
10. On courier account, verify pickup cannot continue before selecting a driver.
11. Select a driver, share device location, then progress `picked_up → in_transit → delivered`.
12. Confirm case automatically becomes `shipped`, then `delivered`.
13. Confirm clinic/lab see the same shipment state and latest courier location.
14. Attempt illegal regressions (for example `delivered → in_transit`, `qc → design`, second active shipment). They must be rejected.

## Deployment note

Before applying the RC5 migration to an existing database, check that no case currently has more than one active shipment. The new partial unique index intentionally fails instead of silently deleting or cancelling historical data.
