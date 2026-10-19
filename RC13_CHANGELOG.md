# DentAYA 1.0.0-rc.13 — Operations Control Center

RC13 keeps the Phase 1 scope focused on clinic + laboratory + CAD + courier operations. The patient module remains outside this release.

## Added

- New `/operations` Operations Control Center for clinic, laboratory and courier workspaces.
- Live operational KPIs: active cases, overdue cases, revisions, approvals, production/QC, active deliveries, pickup queue and completed-today count.
- Pipeline view for `new → accepted → design → approval → production → qc → ready → shipped`.
- Priority queue that ranks overdue cases, late courier ETAs, CAD revisions, approvals, QC and pickup waits.
- AYA daily-priority card with an operational health score and the first intervention recommendation.
- Laboratory capacity gauge with configurable daily case capacity and warning threshold for owner/admin roles.
- New `organization_operations_settings` table with RLS and admin-only writes.
- Realtime refresh from cases, design reviews and shipments, plus network-recovery refresh.
- Home workspace module links now include Operations Center for clinic, laboratory and courier roles.
- AYA platform routing now sends operational/overdue/late-work questions to `/operations`.
- New pure operations engine verifier: `npm run verify:operations`.

## Database

New migration:

`20260920000800_operations_control_center.sql`

Total migrations: **23**.

## Verification pipeline

`npm run verify` now runs:

1. ESLint
2. TypeScript
3. CAD verifier
4. Migration verifier
5. End-to-end workflow verifier
6. Operations-center logic verifier
7. Production build
