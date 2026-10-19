# DentAYA Production RC6 — Automated E2E Pilot Gate

RC6 does not redesign the CAD UI or courier map. It closes the remaining non-atomic case actions and turns the RC5 database workflow lock into an executable release gate.

## Atomic case actions

Lab acceptance, production completion and QC completion now use `dentaya_transition_case(...)`. The case status update and its audit event are committed in the same database transaction. A successful status change can no longer be left without its matching timeline event.

## New release gate

`npm run verify:e2e` now creates a fresh embedded PostgreSQL database, applies every Supabase migration from zero, seeds three isolated pilot identities (clinic, lab, courier), and executes the complete critical workflow:

`new → accepted → CAD v1 → revision → CAD v2 → approved → production → qc → ready → shipment → courier assignment → pickup → in_transit → delivered`

The test also deliberately attempts operations that must fail:

- clinic trying to accept a laboratory case
- `accepted → qc` case jump
- a second decision on a decided design review
- stale/concurrent design submission
- second active shipment for the same case
- pickup without a valid driver
- `delivered → in_transit` shipment regression
- `delivered → qc` case regression

## Verify command

```bash
npm install
npm run verify
```

The main `verify` command now includes `verify:e2e` before the production build.

A release should not be treated as pilot-ready unless this gate passes on the developer machine/CI environment with Node >=22 and npm >=11.
