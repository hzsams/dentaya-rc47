# DentAYA Production RC6 — Change Summary

- Added `dentaya_transition_case(uuid,text)` to make lab acceptance, production→QC and QC→ready atomic with case audit events.
- Updated case command center to call the transactional RPC instead of separate case update + event insert.
- Added `verify:e2e` embedded PostgreSQL test covering clinic → lab → CAD revision/approval → production → QC → courier → delivery.
- Added negative tests for unauthorized acceptance, illegal case jump, repeat review decision, stale design submission, duplicate active shipment, pickup without driver and status regressions.
- Main `npm run verify` now runs the E2E workflow gate before the production build.
- Migration count: 18.

## Local verification

```powershell
npm.cmd install
npm.cmd run verify
```
