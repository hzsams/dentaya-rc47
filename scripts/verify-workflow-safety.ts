import assert from "node:assert/strict";
import { requestIdentity, moneyInput, paymentStateError, cents } from "../src/lib/workflow-safety.ts";
import { teamInviteToken } from "../src/lib/team-invite.ts";
import { appointmentDateTime, dateKey, timeKey, conflicts } from "../src/lib/appointment-planner.ts";
import { isCalendarDate, isNonFutureDate, isFutureDate } from "../src/lib/dentaya-errors.ts";
import { workflowText } from "../src/lib/i18n/workflow-safety.ts";

const payload = { organization: "clinic-a", patient: "patient-a", body: "Kayıt" };
const first = requestIdentity(null, payload);
assert.equal(requestIdentity(first, { ...payload }).id, first.id, "An unchanged retry retains the database deduplication key");
for (const changed of [{ ...payload, organization: "clinic-b" }, { ...payload, patient: "patient-b" }, { ...payload, body: "Düzeltilen kayıt" }]) {
  assert.notEqual(requestIdentity(first, changed).id, first.id, "A changed payload must not recover an earlier record as its own result");
}
assert.notEqual(requestIdentity(null, payload).id, first.id, "A completed operation starts a fresh record");

for (const [input, expected] of [["0", 0], [" 1234.56 ", 1234.56], ["9999999999.99", 9999999999.99], ["01.20", 1.2]] as const) assert.equal(moneyInput(input), expected);
for (const input of ["", "-1", "NaN", "Infinity", "1e3", "1,50", "1.234", "10000000000", "1.2.3"]) assert.equal(moneyInput(input), null, `Invalid or silently rounded amount: ${input}`);
assert.equal(moneyInput("", true), 0);
assert.equal(cents(0.1 + 0.2), 30, "Receipt comparisons use cents instead of binary float equality");
assert.equal(paymentStateError("paid", 0.3, 0, 0.1 + 0.2), null);
assert.ok(paymentStateError("paid", 100, 10, 89.99));
assert.ok(paymentStateError("partial", 100, 0, 100));
assert.ok(paymentStateError("partial", 100, 0, 0));
assert.equal(paymentStateError("partial", 100, 10, 20), null);
assert.ok(paymentStateError("pending", 100, 0, 20));
assert.equal(paymentStateError("pending", 100, 0, 0), null);
assert.equal(workflowText("tr", "İndirim ({0})", ["EUR"]), "İndirim (EUR)");
assert.equal(workflowText("en", "İndirim ({0})", ["EUR"]), "Discount (EUR)");
assert.equal(workflowText("de", "Önceki mesajları yükle"), "Load earlier messages", "New copy has an explicit English fallback outside Turkish");
assert.match(workflowText("en", "Kaydedilmemiş değişiklikler var. Bu ekrandan ayrılmak istiyor musunuz?"), /unsaved changes/);

const token = "a0".repeat(24);
assert.equal(teamInviteToken(token.toUpperCase()), token);
assert.equal(teamInviteToken(`https://workspace.example/invite?token=${token}&source=team`), token);
assert.equal(teamInviteToken(`http://127.0.0.1:3210/invite?token=${token}`), token, "A recipient can paste a desktop-local link into their own application");
for (const value of ["", "a".repeat(47), "g".repeat(48), "https://workspace.example/invite", `https://workspace.example/?token=${token}bad`, "javascript:alert(1)"]) assert.equal(teamInviteToken(value), null);

for (const invalid of ["2025-02-29", "2026-02-31", "2026-13-01", "2026-00-10", "2026-1-01", "not-a-date"]) {
  assert.equal(isCalendarDate(invalid), false, invalid);
  assert.equal(isNonFutureDate(invalid), false, invalid);
  assert.equal(isFutureDate(invalid), false, invalid);
}
assert.equal(isCalendarDate("2024-02-29"), true);
assert.equal(isFutureDate(dateKey()), true, "Today's delivery date remains valid all day");
assert.equal(isNonFutureDate(""), true, "Unknown birth dates remain optional");
const localTime = new Date(2026, 9, 19, 15, 7);
assert.equal(timeKey(localTime), "15:07", "Edit values stay valid for HTML time inputs in 12-hour display locales");
assert.equal(appointmentDateTime(dateKey(localTime), timeKey(localTime))?.getTime(), localTime.getTime());
for (const [date, time] of [["2026-02-31", "15:00"], ["2026-10-19", "25:00"], ["2026-10-19", "03:07 PM"], ["2026-10-19", "24:00"], ["2026-10-19", "15:60"]]) assert.equal(appointmentDateTime(date, time), null);
const slot = { id: "new", patient_id: "p1", scheduled_at: "2026-10-19T12:00:00Z", duration_minutes: 30, status: "scheduled" };
assert.equal(conflicts([{ ...slot, id: "old", scheduled_at: "2026-10-19T11:45:00Z" }], slot).length, 1);
assert.equal(conflicts([{ ...slot, id: "old", scheduled_at: "2026-10-19T11:30:00Z" }], slot).length, 0, "Adjacent appointments do not overlap");
assert.equal(conflicts([{ ...slot, id: "old", status: "cancelled" }], slot).length, 0);
assert.equal(conflicts([{ ...slot, id: "old", patient_id: "p2" }], slot).length, 0, "Shared clinic capacity is not falsely treated as single-chair capacity");
console.log(JSON.stringify({ status: "pass", idempotentRetries: true, exactMoney: true, honestPaymentStates: true, desktopInvitationCodes: true, calendarDateValidation: true, localeSafeAppointmentEditing: true }));
