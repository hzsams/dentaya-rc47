export type RequestIdentity = { fingerprint: string; id: string };

/** A retry reuses its key only while the submitted record is identical. */
export function requestIdentity(previous: RequestIdentity | null, payload: unknown): RequestIdentity {
  const fingerprint = JSON.stringify(payload);
  return previous?.fingerprint === fingerprint ? previous : { fingerprint, id: crypto.randomUUID() };
}

/** PostgreSQL numeric(12,2) accepts at most ten digits before the decimal. */
export function moneyInput(value: string, allowEmpty = false): number | null {
  const normalized = value.trim();
  if (!normalized) return allowEmpty ? 0 : null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount <= 9_999_999_999.99 ? amount : null;
}

export function cents(value: number): number { return Math.round(value * 100); }

export function paymentStateError(status: string, price: number, discount: number, paid: number): WorkflowMessage | null {
  const net = cents(price) - cents(discount), received = cents(paid);
  if (status === "paid" && received !== net) return "Ödendi durumu için tahsilat net hasta fiyatına eşit olmalı.";
  if (status === "partial" && (received <= 0 || received >= net)) return "Kısmi ödeme için tahsilat 0 ile net hasta fiyatı arasında olmalı.";
  if (status === "pending" && received > 0) return "Tahsilat varsa Kısmi ödeme veya Ödendi durumunu seçin.";
  return null;
}
import type { WorkflowMessage } from "./i18n/workflow-safety";
