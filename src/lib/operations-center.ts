export type OperationsOrgType = "clinic" | "laboratory" | "courier";

export type OperationsCaseStatus =
  | "new"
  | "accepted"
  | "design"
  | "approval"
  | "production"
  | "qc"
  | "ready"
  | "shipped"
  | "delivered"
  | "cancelled";

export type OperationsCase = {
  id: string;
  case_number: string;
  title: string;
  status: OperationsCaseStatus;
  priority: "low" | "normal" | "high" | "urgent";
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type OperationsReview = {
  case_id: string;
  version_number: number;
  status: "pending" | "approved" | "revision_requested" | "superseded";
  submitted_at: string;
  reviewed_at: string | null;
  updated_at: string;
};

export type OperationsShipment = {
  id: string;
  case_id: string;
  tracking_code: string | null;
  status: "created" | "pickup_requested" | "picked_up" | "in_transit" | "delivered" | "cancelled";
  eta_at: string | null;
  remaining_duration_seconds: number | null;
  delivered_at: string | null;
  updated_at: string;
};

export type OperationsSettings = {
  daily_case_capacity: number;
  warning_load_percent: number;
  target_turnaround_hours: number;
};

export type OperationsMetrics = {
  activeCases: number;
  overdueCases: number;
  urgentCases: number;
  newCases: number;
  acceptedCases: number;
  designCases: number;
  revisionCases: number;
  approvalCases: number;
  productionCases: number;
  qcCases: number;
  readyCases: number;
  shippedCases: number;
  deliveredToday: number;
  activeShipments: number;
  lateShipments: number;
  pickupWaiting: number;
  inTransit: number;
  capacityLoad: number;
  capacityPercent: number;
};

export type OperationsAttention = {
  id: string;
  kind: "case" | "shipment" | "system";
  tone: "critical" | "warning" | "accent" | "success";
  title: string;
  detail: string;
  href: string;
  score: number;
};

const activeCaseStatuses = new Set<OperationsCaseStatus>([
  "new",
  "accepted",
  "design",
  "approval",
  "production",
  "qc",
  "ready",
  "shipped",
]);

const activeShipmentStatuses = new Set<OperationsShipment["status"]>([
  "created",
  "pickup_requested",
  "picked_up",
  "in_transit",
]);

export function latestReviewByCase(reviews: OperationsReview[]) {
  const map = new Map<string, OperationsReview>();
  for (const review of reviews) {
    const current = map.get(review.case_id);
    if (!current || new Date(review.updated_at).getTime() > new Date(current.updated_at).getTime()) {
      map.set(review.case_id, review);
    }
  }
  return map;
}

export function buildOperationsMetrics(
  cases: OperationsCase[],
  reviews: OperationsReview[],
  shipments: OperationsShipment[],
  settings: OperationsSettings,
  now = new Date(),
): OperationsMetrics {
  const reviewMap = latestReviewByCase(reviews);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const nowMs = now.getTime();

  const activeCases = cases.filter((item) => activeCaseStatuses.has(item.status));
  const revisionCases = activeCases.filter((item) => {
    if (item.status !== "design") return false;
    return reviewMap.get(item.id)?.status === "revision_requested";
  }).length;

  const deliveredToday = cases.filter((item) => {
    if (item.status !== "delivered") return false;
    const value = new Date(item.updated_at).getTime();
    return value >= start.getTime() && value < end.getTime();
  }).length;

  const activeShipments = shipments.filter((item) => activeShipmentStatuses.has(item.status));
  const capacityLoad = activeCases.filter((item) =>
    ["accepted", "design", "approval", "production", "qc", "ready"].includes(item.status),
  ).length;

  return {
    activeCases: activeCases.length,
    overdueCases: activeCases.filter((item) => item.due_date && dueEndMs(item.due_date) < nowMs).length,
    urgentCases: activeCases.filter((item) => item.priority === "urgent" || item.priority === "high").length,
    newCases: activeCases.filter((item) => item.status === "new").length,
    acceptedCases: activeCases.filter((item) => item.status === "accepted").length,
    designCases: activeCases.filter((item) => item.status === "design").length,
    revisionCases,
    approvalCases: activeCases.filter((item) => item.status === "approval").length,
    productionCases: activeCases.filter((item) => item.status === "production").length,
    qcCases: activeCases.filter((item) => item.status === "qc").length,
    readyCases: activeCases.filter((item) => item.status === "ready").length,
    shippedCases: activeCases.filter((item) => item.status === "shipped").length,
    deliveredToday,
    activeShipments: activeShipments.length,
    lateShipments: activeShipments.filter((item) => item.eta_at && new Date(item.eta_at).getTime() < nowMs).length,
    pickupWaiting: activeShipments.filter((item) => item.status === "created" || item.status === "pickup_requested").length,
    inTransit: activeShipments.filter((item) => item.status === "in_transit").length,
    capacityLoad,
    capacityPercent: Math.min(999, Math.round((capacityLoad / Math.max(1, settings.daily_case_capacity)) * 100)),
  };
}

export function buildOperationsAttention(
  orgType: OperationsOrgType,
  cases: OperationsCase[],
  reviews: OperationsReview[],
  shipments: OperationsShipment[],
  settings: OperationsSettings,
  now = new Date(),
  localeTag = "tr-TR",
): OperationsAttention[] {
  const nowMs = now.getTime();
  const reviewMap = latestReviewByCase(reviews);
  const items: OperationsAttention[] = [];

  for (const item of cases) {
    if (!activeCaseStatuses.has(item.status)) continue;

    const overdue = item.due_date ? dueEndMs(item.due_date) < nowMs : false;
    if (overdue) {
      items.push({
        id: `overdue-${item.id}`,
        kind: "case",
        tone: "critical",
        title: `${item.case_number} · Termin geçti`,
        detail: `${item.title} · ${formatDue(item.due_date, localeTag)}`,
        href: `/cases/${item.id}`,
        score: 100 + priorityScore(item.priority),
      });
      continue;
    }

    if (item.status === "design" && reviewMap.get(item.id)?.status === "revision_requested") {
      items.push({
        id: `revision-${item.id}`,
        kind: "case",
        tone: "warning",
        title: `${item.case_number} · Revizyon bekliyor`,
        detail: `${item.title} · CAD tarafında yeni versiyon gerekli`,
        href: `/design?case=${item.id}`,
        score: 88 + priorityScore(item.priority),
      });
      continue;
    }

    if (item.status === "approval") {
      items.push({
        id: `approval-${item.id}`,
        kind: "case",
        tone: "warning",
        title: `${item.case_number} · Onay bekliyor`,
        detail: orgType === "clinic" ? "Klinik kararı bekleniyor" : "Klinik onayı bekleniyor",
        href: `/cases/${item.id}?tab=cad`,
        score: 82 + priorityScore(item.priority),
      });
      continue;
    }

    if (item.status === "qc") {
      items.push({
        id: `qc-${item.id}`,
        kind: "case",
        tone: "accent",
        title: `${item.case_number} · QC sırasında`,
        detail: `${item.title} · kalite kontrol tamamlanınca sevke hazırlanabilir`,
        href: `/cases/${item.id}`,
        score: 64 + priorityScore(item.priority),
      });
    }
  }

  for (const shipment of shipments) {
    if (!activeShipmentStatuses.has(shipment.status)) continue;
    const late = shipment.eta_at ? new Date(shipment.eta_at).getTime() < nowMs : false;
    if (late) {
      items.push({
        id: `late-shipment-${shipment.id}`,
        kind: "shipment",
        tone: "critical",
        title: `${shipment.tracking_code ?? "Gönderi"} · ETA geçti`,
        detail: "Canlı konum, kalan rota ve kurye durumunu kontrol et",
        href: "/logistics",
        score: 96,
      });
    } else if (shipment.status === "pickup_requested") {
      items.push({
        id: `pickup-${shipment.id}`,
        kind: "shipment",
        tone: "accent",
        title: `${shipment.tracking_code ?? "Gönderi"} · Alım bekliyor`,
        detail: "Kurye alım noktasına yönlendirildi",
        href: "/logistics",
        score: 58,
      });
    }
  }

  const metrics = buildOperationsMetrics(cases, reviews, shipments, settings, now);
  if (orgType === "laboratory" && metrics.capacityPercent >= settings.warning_load_percent) {
    items.push({
      id: "capacity-warning",
      kind: "system",
      tone: metrics.capacityPercent >= 100 ? "critical" : "warning",
      title: `Lab kapasitesi %${metrics.capacityPercent}`,
      detail: `${metrics.capacityLoad}/${settings.daily_case_capacity} aktif üretim yükü · eşik %${settings.warning_load_percent}`,
      href: "/operations#capacity",
      score: metrics.capacityPercent >= 100 ? 94 : 72,
    });
  }

  return items.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "tr"));
}

export function operationsAyaSummary(
  orgType: OperationsOrgType,
  metrics: OperationsMetrics,
  settings: OperationsSettings,
) {
  if (metrics.overdueCases > 0) {
    return `${metrics.overdueCases} termini geçmiş vaka var. İlk iş bunların neden beklediğini kontrol et.`;
  }
  if (metrics.lateShipments > 0) {
    return `${metrics.lateShipments} teslimat ETA süresini aşmış. Kurye konumu ve rotayı kontrol et.`;
  }
  if (metrics.revisionCases > 0) {
    return `${metrics.revisionCases} vaka revizyon bekliyor. CAD kuyruğunu önce temizlemek akışı hızlandırır.`;
  }
  if (metrics.approvalCases > 0) {
    return `${metrics.approvalCases} vaka onay bekliyor. Karar bekleyen işleri temizlemek üretim kuyruğunu açar.`;
  }
  if (orgType === "laboratory" && metrics.capacityPercent >= settings.warning_load_percent) {
    return `Laboratuvar yükü %${metrics.capacityPercent}. Yeni işleri kabul etmeden önce üretim ve QC kuyruğunu dengele.`;
  }
  if (metrics.pickupWaiting > 0) {
    return `${metrics.pickupWaiting} gönderi alım bekliyor. Kurye ataması ve rota durumunu doğrula.`;
  }
  return "Operasyon akışı dengeli görünüyor. Öncelikli sinyal yok; aktif işleri sırayla ilerletebilirsin.";
}

export function operationsHealthScore(metrics: OperationsMetrics, settings: OperationsSettings) {
  let score = 100;
  score -= metrics.overdueCases * 14;
  score -= metrics.lateShipments * 16;
  score -= metrics.revisionCases * 7;
  score -= metrics.approvalCases * 4;
  score -= metrics.urgentCases * 3;
  if (metrics.capacityPercent >= settings.warning_load_percent) score -= 8;
  if (metrics.capacityPercent >= 100) score -= 8;
  return Math.max(0, Math.min(100, score));
}

export function defaultOperationsSettings(orgType: OperationsOrgType): OperationsSettings {
  return {
    daily_case_capacity: orgType === "laboratory" ? 24 : orgType === "clinic" ? 40 : 60,
    warning_load_percent: 80,
    target_turnaround_hours: orgType === "courier" ? 8 : 72,
  };
}

function dueEndMs(value: string) {
  return new Date(`${value}T23:59:59.999`).getTime();
}

function formatDue(value: string | null,localeTag: string) {
  if (!value) return "termin yok";
  return new Date(`${value}T12:00:00`).toLocaleDateString(localeTag, { day: "2-digit", month: "short" });
}

function priorityScore(priority: OperationsCase["priority"]) {
  return priority === "urgent" ? 12 : priority === "high" ? 7 : priority === "normal" ? 2 : 0;
}
