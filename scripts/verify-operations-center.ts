import assert from "node:assert/strict";

import {
  buildOperationsAttention,
  buildOperationsMetrics,
  defaultOperationsSettings,
  operationsAyaSummary,
  operationsHealthScore,
  type OperationsCase,
  type OperationsReview,
  type OperationsShipment,
} from "../src/lib/operations-center.ts";

const now = new Date("2026-09-20T12:00:00+03:00");
const settings = { ...defaultOperationsSettings("laboratory"), daily_case_capacity: 4, warning_load_percent: 75 };

const cases: OperationsCase[] = [
  { id: "c1", case_number: "DYA-001", title: "Geç kalan kron", status: "production", priority: "urgent", due_date: "2026-09-19", created_at: "2026-09-18T08:00:00Z", updated_at: "2026-09-20T07:00:00Z" },
  { id: "c2", case_number: "DYA-002", title: "Revizyon", status: "design", priority: "high", due_date: "2026-09-22", created_at: "2026-09-19T08:00:00Z", updated_at: "2026-09-20T08:00:00Z" },
  { id: "c3", case_number: "DYA-003", title: "Onay", status: "approval", priority: "normal", due_date: "2026-09-23", created_at: "2026-09-19T08:00:00Z", updated_at: "2026-09-20T08:30:00Z" },
  { id: "c4", case_number: "DYA-004", title: "QC", status: "qc", priority: "normal", due_date: "2026-09-23", created_at: "2026-09-19T08:00:00Z", updated_at: "2026-09-20T09:00:00Z" },
  { id: "c5", case_number: "DYA-005", title: "Bugün teslim", status: "delivered", priority: "normal", due_date: "2026-09-20", created_at: "2026-09-18T08:00:00Z", updated_at: "2026-09-20T10:00:00+03:00" },
];

const reviews: OperationsReview[] = [
  { case_id: "c2", version_number: 1, status: "revision_requested", submitted_at: "2026-09-19T10:00:00Z", reviewed_at: "2026-09-19T11:00:00Z", updated_at: "2026-09-19T11:00:00Z" },
];

const shipments: OperationsShipment[] = [
  { id: "s1", case_id: "c4", tracking_code: "DYA-S1", status: "in_transit", eta_at: "2026-09-20T10:00:00+03:00", remaining_duration_seconds: 600, delivered_at: null, updated_at: "2026-09-20T08:00:00Z" },
  { id: "s2", case_id: "c3", tracking_code: "DYA-S2", status: "pickup_requested", eta_at: "2026-09-20T14:00:00+03:00", remaining_duration_seconds: 1800, delivered_at: null, updated_at: "2026-09-20T08:00:00Z" },
];

const metrics = buildOperationsMetrics(cases, reviews, shipments, settings, now);
assert.equal(metrics.activeCases, 4);
assert.equal(metrics.overdueCases, 1);
assert.equal(metrics.revisionCases, 1);
assert.equal(metrics.approvalCases, 1);
assert.equal(metrics.productionCases, 1);
assert.equal(metrics.qcCases, 1);
assert.equal(metrics.deliveredToday, 1);
assert.equal(metrics.activeShipments, 2);
assert.equal(metrics.lateShipments, 1);
assert.equal(metrics.pickupWaiting, 1);
assert.equal(metrics.capacityLoad, 4);
assert.equal(metrics.capacityPercent, 100);

const attention = buildOperationsAttention("laboratory", cases, reviews, shipments, settings, now);
assert.ok(attention.some((item) => item.id === "overdue-c1" && item.tone === "critical"));
assert.ok(attention.some((item) => item.id === "revision-c2"));
assert.ok(attention.some((item) => item.id === "late-shipment-s1"));
assert.ok(attention.some((item) => item.id === "capacity-warning"));
assert.match(operationsAyaSummary("laboratory", metrics, settings), /termini geçmiş/i);
assert.ok(operationsHealthScore(metrics, settings) < 100);

console.log(JSON.stringify({ status: "pass", metrics, attention: attention.map((item) => item.id) }, null, 2));
