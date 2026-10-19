# RC13 Operations Control Center QA

## Access / scope

- [ ] Clinic member sees only clinic-participant cases and shipments.
- [ ] Laboratory member sees only assigned laboratory cases and participant shipments.
- [ ] Courier workspace does not require case-list access and still shows shipment operations.
- [ ] Owner/admin can update laboratory capacity settings.
- [ ] Non-admin members can read capacity settings but cannot change them.

## Metrics

- [ ] Active case count excludes delivered/cancelled.
- [ ] Overdue count only includes active cases whose due date has ended.
- [ ] Revision count identifies a design case whose latest design review is `revision_requested`.
- [ ] Approval, production, QC, ready and shipped counts match case state.
- [ ] Completed-today count increments for cases delivered today.
- [ ] Active shipment count excludes delivered/cancelled.
- [ ] Late shipment count increments when active `eta_at` is in the past.
- [ ] Pickup queue counts created/pickup_requested deliveries.

## Priority queue

- [ ] Overdue case is ranked as critical.
- [ ] Late courier ETA is ranked as critical.
- [ ] Revision request appears ahead of normal QC work.
- [ ] Approval wait appears with direct case/CAD link.
- [ ] Pickup request links to logistics.
- [ ] Search and type filters work without losing realtime updates.

## Lab capacity

- [ ] Default capacity is usable before a custom setting exists.
- [ ] Capacity percentage uses accepted/design/approval/production/QC/ready workload.
- [ ] Warning appears at the configured threshold.
- [ ] Capacity input rejects values outside 1–500.
- [ ] Warning threshold rejects values outside 40–100.
- [ ] Save persists through `organization_operations_settings`.

## AYA / realtime

- [ ] AYA summary prioritizes overdue cases before lower-severity signals.
- [ ] AYA then prioritizes late shipments, revisions, approvals, capacity and pickup queue.
- [ ] Case update refreshes the control center through realtime.
- [ ] Design review update refreshes revision/approval metrics.
- [ ] Shipment update refreshes courier metrics.
- [ ] `dentaya-network-restored` triggers a fresh operational snapshot.
