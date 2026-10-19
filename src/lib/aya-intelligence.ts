export type AyaRole =
  | "clinic"
  | "laboratory";

export type AyaAction =
  | "brief"
  | "next"
  | "missing"
  | "risk"
  | "cad"
  | "scan"
  | "handoff"
  | "finance"
  | "delivery"
  | "deep"
  | "custom";

export type AyaCase = {
  id: string;
  case_number: string;
  patient_reference: string;
  title: string;
  case_type: string;
  priority: string;
  status: string;
  due_date: string | null;
  tooth_codes: string[];
  material: string | null;
  shade: string | null;
  clinical_notes: string | null;
  lab_notes: string | null;
  updated_at: string;
};

export type AyaScan = {
  id: string;
  scan_origin: string;
  scan_purpose: string;
  completeness_score: number | null;
  metrics: Record<string, unknown> | null;
  captured_at: string;
};

export type AyaDesign = {
  id: string;
  status: string;
  workflow_stage: string;
  restoration_type: string | null;
  material: string | null;
  shade: string | null;
} | null;

export type AyaReview = {
  id: string;
  version_number: number;
  status: string;
  revision_note: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
} | null;

export type AyaQuote = {
  amount: number;
  currency: string;
  status: string;
  notes: string | null;
} | null;

export type AyaFinance = {
  patient_price: number;
  discount_amount: number;
  paid_amount: number;
  currency: string;
  payment_status: string;
} | null;

export type AyaShipment = {
  id: string;
  status: string;
  tracking_code: string | null;
  pickup_at: string | null;
  delivered_at: string | null;
  updated_at: string;
} | null;

export type AyaMessage = {
  body: string;
  sender_role: string | null;
  created_at: string;
};

export type AyaEvent = {
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  message: string | null;
  created_at: string;
};

export type AyaContext = {
  role: AyaRole;
  case: AyaCase;
  scans: AyaScan[];
  design: AyaDesign;
  review: AyaReview;
  quote: AyaQuote;
  finance: AyaFinance;
  shipment: AyaShipment;
  messageCount: number;
  recentMessages: AyaMessage[];
  eventCount: number;
  recentEvents: AyaEvent[];
};

export type AyaNextAction = {
  title: string;
  detail: string;
  href: string;
  urgency:
    | "now"
    | "soon"
    | "normal";
};

export type AyaInsight = {
  score: number;
  level:
    | "low"
    | "medium"
    | "high"
    | "critical";
  headline: string;
  nextAction: AyaNextAction;
  missing: string[];
  alerts: string[];
  positives: string[];
  scanNotes: string[];
  cadNotes: string[];
  financeNotes: string[];
  deliveryNotes: string[];
};

export function analyzeAyaContext(
  context: AyaContext
): AyaInsight {
  const c =
    context.case;

  const missing:
    string[] = [];

  if (!c.tooth_codes.length) {
    missing.push(
      "FDI diş numarası"
    );
  }

  if (!c.material) {
    missing.push(
      "materyal"
    );
  }

  if (!c.shade) {
    missing.push(
      "renk / shade"
    );
  }

  if (!c.due_date) {
    missing.push(
      "termin tarihi"
    );
  }

  if (
    context.role === "clinic" &&
    !c.clinical_notes
  ) {
    missing.push(
      "klinik not"
    );
  }

  if (
    context.role ===
      "laboratory" &&
    !c.lab_notes
  ) {
    missing.push(
      "laboratuvar notu"
    );
  }

  const alerts:
    string[] = [];

  const positives:
    string[] = [];

  const scanNotes =
    scanSignals(context);

  const cadNotes =
    cadSignals(context);

  const financeNotes =
    financeSignals(context);

  const deliveryNotes =
    deliverySignals(context);

  let score = 0;

  const days =
    dueDays(c.due_date);

  if (days !== null) {
    if (days < 0) {
      score += 36;
      alerts.push(
        `Termin ${Math.abs(days)} gün geçmiş.`
      );
    } else if (
      days <= 1
    ) {
      score += 26;
      alerts.push(
        `Termin ${days === 0 ? "bugün" : "yarın"}.`
      );
    } else if (
      days <= 3
    ) {
      score += 16;
      alerts.push(
        `Termin ${days} gün içinde.`
      );
    } else {
      positives.push(
        `Termin için yaklaşık ${days} gün var.`
      );
    }
  }

  if (
    c.priority ===
    "urgent"
  ) {
    score += 20;
    alerts.push(
      "Vaka acil öncelikte."
    );
  } else if (
    c.priority === "high"
  ) {
    score += 10;
    alerts.push(
      "Vaka yüksek öncelikte."
    );
  }

  score += Math.min(
    missing.length * 5,
    20
  );

  if (
    missing.length
  ) {
    alerts.push(
      `${missing.length} temel alan eksik.`
    );
  } else {
    positives.push(
      "Temel vaka alanları dolu."
    );
  }

  const scanWarning =
    context.scans.some(
      (scan) =>
        scan.completeness_score !==
          null &&
        Number(
          scan.completeness_score
        ) < 80
    ) ||
    context.scans.some(
      (scan) =>
        String(
          scan.metrics?.mesh_intake_status ??
            ""
        ) === "reject"
    );

  if (!context.scans.length) {
    score += 12;
    alerts.push(
      "Vakaya bağlı tarama görünmüyor."
    );
  } else if (scanWarning) {
    score += 14;
    alerts.push(
      "Tarama kalite/intake kontrolünde dikkat gerektiren sinyal var."
    );
  } else {
    positives.push(
      `${context.scans.length} tarama kaydı mevcut.`
    );
  }

  const approved =
    context.review?.status ===
    "approved";

  if (
    [
      "production",
      "qc",
      "ready",
      "shipped",
      "delivered",
    ].includes(
      c.status
    ) &&
    !approved
  ) {
    score += 22;
    alerts.push(
      "Vaka üretim veya sonrası aşamada fakat onaylanmış tasarım görünmüyor."
    );
  }

  if (
    c.status ===
      "approval" &&
    context.review?.status !==
      "pending"
  ) {
    score += 16;
    alerts.push(
      "Vaka klinik onayı aşamasında fakat bekleyen CAD incelemesi görünmüyor."
    );
  }

  if (
    context.shipment?.status ===
      "delivered" &&
    c.status !==
      "delivered"
  ) {
    score += 16;
    alerts.push(
      "Kurye teslim edilmiş fakat vaka durumu teslim edildi değil."
    );
  }

  if (
    context.quote?.status ===
      "sent" &&
    Number(
      context.quote.amount
    ) <= 0
  ) {
    score += 16;
    alerts.push(
      "Gönderilmiş laboratuvar fiyatı geçersiz."
    );
  }

  if (
    context.finance
  ) {
    const net =
      Number(
        context.finance
          .patient_price
      ) -
      Number(
        context.finance
          .discount_amount
      );

    if (
      Number(
        context.finance
          .paid_amount
      ) > net
    ) {
      score += 20;
      alerts.push(
        "Tahsil edilen tutar net hasta fiyatını aşıyor."
      );
    }
  }

  if (
    context.messageCount === 0
  ) {
    score += 4;
  } else {
    positives.push(
      `${context.messageCount} vaka mesajı mevcut.`
    );
  }

  score = clamp(
    score,
    0,
    100
  );

  const level:
    AyaInsight["level"] =
    score >= 70
      ? "critical"
      : score >= 45
        ? "high"
        : score >= 22
          ? "medium"
          : "low";

  const nextAction =
    decideNextAction(
      context,
      missing
    );

  const headline =
    level === "critical"
      ? "Bu vaka hemen dikkat istiyor."
      : level === "high"
        ? "Akışta önemli riskler var."
        : level === "medium"
          ? "Birkaç kontrolle akış güçlenir."
          : "Akış genel olarak kontrollü görünüyor.";

  return {
    score,
    level,
    headline,
    nextAction,
    missing,
    alerts,
    positives,
    scanNotes,
    cadNotes,
    financeNotes,
    deliveryNotes,
  };
}

export function localAyaAnswer(
  context: AyaContext,
  action: AyaAction,
  customPrompt = ""
) {
  const insight =
    analyzeAyaContext(
      context
    );

  const intent =
    action === "custom"
      ? detectIntent(
          customPrompt
        )
      : action;

  if (
    intent === "next"
  ) {
    return [
      "SIRADAKİ EN DOĞRU ADIM",
      "",
      insight.nextAction.title,
      insight.nextAction.detail,
      "",
      `Risk skoru: ${insight.score}/100 · ${riskLabel(insight.level)}`,
      "",
      insight.alerts.length
        ? `Önce kontrol et:\n- ${insight.alerts.join("\n- ")}`
        : "Akışı bloke eden belirgin alarm görünmüyor.",
    ].join("\n");
  }

  if (
    intent === "missing"
  ) {
    return [
      "EKSİK / TUTARSIZ BİLGİ",
      "",
      insight.missing.length
        ? `Eksik temel alanlar:\n- ${insight.missing.join("\n- ")}`
        : "Temel vaka alanları dolu.",
      "",
      insight.alerts.length
        ? `Akış uyarıları:\n- ${insight.alerts.join("\n- ")}`
        : "Akış tutarlılığında belirgin problem görünmüyor.",
      "",
      "Bu çıktı operasyon kontrolüdür; tanı veya klinik karar değildir.",
    ].join("\n");
  }

  if (
    intent === "risk"
  ) {
    return [
      "RİSK RADARI",
      "",
      `Skor: ${insight.score}/100 · ${riskLabel(insight.level)}`,
      insight.headline,
      "",
      insight.alerts.length
        ? `Risk sinyalleri:\n- ${insight.alerts.join("\n- ")}`
        : "Belirgin risk sinyali görünmüyor.",
      "",
      `Önerilen sonraki adım: ${insight.nextAction.title}`,
    ].join("\n");
  }

  if (
    intent === "scan"
  ) {
    return [
      "TARAMA KONTROLÜ",
      "",
      ...insight.scanNotes.map(
        (item) =>
          `- ${item}`
      ),
      "",
      "Not: Bu bölüm mesh/operasyon verisini değerlendirir; klinik teşhis değildir.",
    ].join("\n");
  }

  if (
    intent === "cad"
  ) {
    return [
      "CAD & ONAY DURUMU · YEREL KONTROL",
      "",
      "CAD araçlarını AYA olmadan kullanabilirsin. Bu özet model geometrisini ölçmez ve üretim onayı vermez.",
      ...insight.cadNotes.map(
        (item) =>
          `- ${item}`
      ),
      "",
      `Sonraki adım: ${insight.nextAction.title}`,
    ].join("\n");
  }

  if (
    intent === "finance"
  ) {
    return [
      "FİYAT / ÖDEME KONTROLÜ",
      "",
      ...insight.financeNotes.map(
        (item) =>
          `- ${item}`
      ),
      "",
      "Fiyat çıktıları operasyon desteğidir; muhasebe/ERP belgesi değildir.",
    ].join("\n");
  }

  if (
    intent === "delivery"
  ) {
    return [
      "TESLİMAT KONTROLÜ",
      "",
      ...insight.deliveryNotes.map(
        (item) =>
          `- ${item}`
      ),
      "",
      `Sonraki adım: ${insight.nextAction.title}`,
    ].join("\n");
  }

  if (
    intent === "handoff"
  ) {
    const c =
      context.case;

    return [
      "DEVİR ÖZETİ",
      "",
      `${c.case_number} · ${c.title}`,
      `İş: ${c.case_type}`,
      `FDI: ${c.tooth_codes.join(", ") || "—"}`,
      `Materyal / Renk: ${c.material || "—"} / ${c.shade || "—"}`,
      `Durum: ${caseStatusLabel(c.status)} · ${priorityLabel(c.priority)}`,
      `Termin: ${c.due_date || "—"}`,
      "",
      context.role === "clinic"
        ? `Klinik not: ${c.clinical_notes || "—"}`
        : `Lab not: ${c.lab_notes || "—"}`,
      "",
      insight.missing.length
        ? `Göndermeden önce kontrol: ${insight.missing.join(", ")}.`
        : "Temel devir alanları tamam.",
    ].join("\n");
  }

  const c =
    context.case;

  return [
    "AYA VAKA BRİFİ",
    "",
    `${c.case_number} · ${c.title}`,
    `${caseStatusLabel(c.status)} · ${priorityLabel(c.priority)}`,
    `FDI ${c.tooth_codes.join(", ") || "—"} · ${c.material || "Materyal yok"} · ${c.shade || "Renk yok"}`,
    "",
    `Risk: ${insight.score}/100 · ${riskLabel(insight.level)}`,
    insight.headline,
    "",
    `Sıradaki: ${insight.nextAction.title}`,
    insight.nextAction.detail,
    "",
    insight.alerts.length
      ? `Dikkat:\n- ${insight.alerts.slice(0, 4).join("\n- ")}`
      : "Dikkat gerektiren belirgin alarm görünmüyor.",
    "",
    insight.positives.length
      ? `Olumlu sinyaller:\n- ${insight.positives.slice(0, 4).join("\n- ")}`
      : "",
  ]
    .filter(
      (item) =>
        item !== ""
          ? true
          : true
    )
    .join("\n");
}

export function sanitizeAyaContextForModel(
  context: AyaContext
) {
  const insight =
    analyzeAyaContext(
      context
    );

  return {
    role: context.role,
    case: {
      case_number:
        context.case
          .case_number,
      title:
        context.case.title,
      case_type:
        context.case
          .case_type,
      priority:
        context.case
          .priority,
      status:
        context.case.status,
      due_date:
        context.case
          .due_date,
      tooth_codes:
        context.case
          .tooth_codes,
      material:
        context.case
          .material,
      shade:
        context.case.shade,
    },
    scans: context.scans.map(
      (scan) => ({
        origin:
          scan.scan_origin,
        purpose:
          scan.scan_purpose,
        completeness:
          scan.completeness_score,
        intake_status:
          scan.metrics?.mesh_intake_status ??
          null,
        non_manifold_edges:
          scan.metrics?.non_manifold_edges ??
          null,
        unit_hint:
          scan.metrics?.unit_hint ??
          null,
      })
    ),
    design: context.design,
    review: context.review
      ? {
          version_number:
            context.review
              .version_number,
          status:
            context.review
              .status,
        }
      : null,
    quote: context.quote
      ? {
          amount:
            context.quote.amount,
          currency:
            context.quote.currency,
          status:
            context.quote.status,
        }
      : null,
    finance:
      context.role ===
        "clinic" &&
      context.finance
        ? {
            patient_price:
              context.finance
                .patient_price,
            discount_amount:
              context.finance
                .discount_amount,
            paid_amount:
              context.finance
                .paid_amount,
            currency:
              context.finance
                .currency,
            payment_status:
              context.finance
                .payment_status,
          }
        : null,
    shipment:
      context.shipment
        ? {
            status:
              context.shipment
                .status,
            tracking_code:
              context.shipment
                .tracking_code,
          }
        : null,
    message_count:
      context.messageCount,
    event_count:
      context.eventCount,
    derived: {
      risk_score:
        insight.score,
      risk_level:
        insight.level,
      missing:
        insight.missing,
      alerts:
        insight.alerts,
      next_action:
        insight.nextAction,
    },
  };
}

export function ayaAuditSummary(
  context: AyaContext
) {
  const insight =
    analyzeAyaContext(
      context
    );

  return {
    risk_score:
      insight.score,
    risk_level:
      insight.level,
    missing_count:
      insight.missing.length,
    alert_count:
      insight.alerts.length,
    scan_count:
      context.scans.length,
    design_status:
      context.design?.status ??
      null,
    review_status:
      context.review?.status ??
      null,
    quote_status:
      context.quote?.status ??
      null,
    finance_status:
      context.finance?.payment_status ??
      null,
    shipment_status:
      context.shipment?.status ??
      null,
    message_count:
      context.messageCount,
    event_count:
      context.eventCount,
  };
}

function scanSignals(
  context: AyaContext
) {
  if (!context.scans.length) {
    return [
      "Vakaya bağlı tarama yok.",
    ];
  }

  const result:
    string[] = [
    `${context.scans.length} tarama kaydı mevcut.`,
  ];

  const latest =
    [...context.scans].sort(
      (a, b) =>
        new Date(
          b.captured_at
        ).getTime() -
        new Date(
          a.captured_at
        ).getTime()
    )[0];

  if (
    latest.completeness_score !==
    null
  ) {
    result.push(
      `Son tarama bütünlüğü: %${Number(latest.completeness_score).toFixed(0)}.`
    );
  }

  const intake =
    String(
      latest.metrics?.mesh_intake_status ??
        ""
    );

  if (intake) {
    result.push(
      `Mesh intake: ${intake}.`
    );
  }

  const nonManifold =
    Number(
      latest.metrics?.non_manifold_edges ??
        0
    );

  if (
    Number.isFinite(
      nonManifold
    ) &&
    nonManifold > 0
  ) {
    result.push(
      `${nonManifold} non-manifold kenar raporlanmış.`
    );
  }

  return result;
}

function cadSignals(
  context: AyaContext
) {
  const result:
    string[] = [];

  if (!context.design) {
    result.push(
      "CAD projesi henüz yok."
    );
  } else {
    result.push(
      `CAD: ${context.design.status} · ${context.design.workflow_stage}.`
    );
  }

  if (!context.review) {
    result.push(
      "Klinik tasarım incelemesi henüz yok."
    );
  } else {
    result.push(
      `Review v${context.review.version_number}: ${context.review.status}.`
    );
  }

  return result;
}

function financeSignals(
  context: AyaContext
) {
  const result:
    string[] = [];

  if (context.quote) {
    result.push(
      `Lab fiyatı: ${money(context.quote.amount, context.quote.currency)} · ${context.quote.status}.`
    );
  } else {
    result.push(
      "Lab fiyatı yok."
    );
  }

  if (
    context.role ===
    "clinic"
  ) {
    if (context.finance) {
      const net =
        Number(
          context.finance
            .patient_price
        ) -
        Number(
          context.finance
            .discount_amount
        );

      result.push(
        `Hasta net fiyatı: ${money(net, context.finance.currency)} · tahsilat ${money(context.finance.paid_amount, context.finance.currency)} · ${context.finance.payment_status}.`
      );
    } else {
      result.push(
        "Klinik hasta fiyatı kaydı yok."
      );
    }
  }

  return result;
}

function deliverySignals(
  context: AyaContext
) {
  if (!context.shipment) {
    return [
      "Gönderi kaydı yok.",
    ];
  }

  return [
    `Gönderi: ${shipmentStatusLabel(context.shipment.status)}${context.shipment.tracking_code ? ` · ${context.shipment.tracking_code}` : ""}.`,
  ];
}

function decideNextAction(
  context: AyaContext,
  missing: string[]
): AyaNextAction {
  const c =
    context.case;

  if (
    missing.includes(
      "FDI diş numarası"
    ) ||
    missing.includes(
      "materyal"
    ) ||
    missing.includes(
      "renk / shade"
    )
  ) {
    return {
      title:
        "İş emrindeki eksikleri tamamla",
      detail:
        `Önce ${missing.slice(0, 3).join(", ")} alanlarını netleştir.`,
      href:
        `/cases/${c.id}`,
      urgency: "now",
    };
  }

  if (!context.scans.length) {
    return {
      title:
        "Tarama ekle / doğrula",
      detail:
        "CAD veya üretim öncesi vakaya doğru taramanın bağlı olduğunu doğrula.",
      href:
        `/scan-studio?case=${c.id}`,
      urgency: "now",
    };
  }

  if (
    context.role ===
      "laboratory"
  ) {
    if (
      c.status === "new"
    ) {
      return {
        title:
          "Vakayı kabul et",
        detail:
          "İş kuyruğuna al ve teknik kontrolü başlat.",
        href:
          `/cases/${c.id}`,
        urgency: "now",
      };
    }

    if (!context.design) {
      return {
        title:
          "CAD projesini başlat",
        detail:
          "Kaynak taramayı seçip marjin / tasarım akışına geç.",
        href:
          `/design?case=${c.id}`,
        urgency: "soon",
      };
    }

    if (
      context.review?.status ===
      "revision_requested"
    ) {
      return {
        title:
          "Revizyonu işle",
        detail:
          "Klinik revizyon notunu kontrol edip yeni CAD sürümü hazırla.",
        href:
          `/design?case=${c.id}`,
        urgency: "now",
      };
    }

    if (
      context.review?.status ===
        "approved" &&
      ![
        "production",
        "qc",
        "ready",
        "shipped",
        "delivered",
      ].includes(
        c.status
      )
    ) {
      return {
        title:
          "Üretime geçir",
        detail:
          "Onaylanan tasarım sonrası üretim durumunu başlat.",
        href:
          `/cases/${c.id}`,
        urgency: "soon",
      };
    }

    if (
      c.status ===
      "production"
    ) {
      return {
        title:
          "Kalite kontrole geçir",
        detail:
          "Üretim sonrası QC adımını başlat.",
        href:
          `/cases/${c.id}`,
        urgency: "soon",
      };
    }

    if (
      c.status === "qc"
    ) {
      return {
        title:
          "Teslimata hazırla",
        detail:
          "QC sonrası vakayı hazır durumuna getir.",
        href:
          `/cases/${c.id}`,
        urgency: "soon",
      };
    }

    if (!context.quote) {
      return {
        title:
          "Lab fiyatını kaydet",
        detail:
          "Kliniğe gönderilecek vaka fiyatını oluştur.",
        href: "/finance",
        urgency: "normal",
      };
    }
  }

  if (
    context.role === "clinic"
  ) {
    if (
      c.status ===
        "approval" &&
      context.review?.status ===
        "pending"
    ) {
      return {
        title:
          "CAD kararını ver",
        detail:
          "Tasarımı onayla veya revizyon notu gönder.",
        href:
          `/cases/${c.id}?tab=cad`,
        urgency: "now",
      };
    }

    if (
      context.quote?.status ===
        "sent" &&
      !context.finance
    ) {
      return {
        title:
          "Hasta fiyatını oluştur",
        detail:
          "Lab maliyetini görüp klinik hasta fiyatını ayrı kaydet.",
        href: "/finance",
        urgency: "soon",
      };
    }
  }

  if (
    [
      "ready",
      "shipped",
    ].includes(
      c.status
    ) ||
    context.shipment
  ) {
    return {
      title:
        "Teslimatı takip et",
      detail:
        "Kurye durumunu ve vaka kapanışını kontrol et.",
      href:
        `/cases/${c.id}?tab=delivery`,
      urgency:
        c.status === "ready"
          ? "soon"
          : "normal",
    };
  }

  return {
    title:
      "Vaka merkezini kontrol et",
    detail:
      "Mesajlar, geçmiş ve mevcut aşamayı birlikte gözden geçir.",
    href:
      `/cases/${c.id}`,
    urgency: "normal",
  };
}

function detectIntent(
  prompt: string
): AyaAction {
  const value =
    prompt.toLocaleLowerCase(
      "tr-TR"
    );

  if (
    /(sıradaki|ne yap|sonraki|next)/i.test(
      value
    )
  ) {
    return "next";
  }

  if (
    /(risk|termin|gecik|acil)/i.test(
      value
    )
  ) {
    return "risk";
  }

  if (
    /(eksik|tamam|missing)/i.test(
      value
    )
  ) {
    return "missing";
  }

  if (
    /(cad|tasarım|marjin|onay|revizyon)/i.test(
      value
    )
  ) {
    return "cad";
  }

  if (
    /(scan|tarama|mesh|stl|ply)/i.test(
      value
    )
  ) {
    return "scan";
  }

  if (
    /(fiyat|ödeme|tahsil|quote|finance)/i.test(
      value
    )
  ) {
    return "finance";
  }

  if (
    /(kurye|teslim|shipment|lojistik)/i.test(
      value
    )
  ) {
    return "delivery";
  }

  if (
    /(devir|handoff|mesaj|teknisyen|hekim)/i.test(
      value
    )
  ) {
    return "handoff";
  }

  return "brief";
}

function dueDays(
  value:
    | string
    | null
) {
  if (!value) {
    return null;
  }

  return Math.ceil(
    (
      new Date(value).getTime() -
      Date.now()
    ) /
      86_400_000
  );
}

function riskLabel(
  level:
    AyaInsight["level"]
) {
  return level === "critical"
    ? "Kritik"
    : level === "high"
      ? "Yüksek"
      : level === "medium"
        ? "Orta"
        : "Düşük";
}

function caseStatusLabel(
  value: string
) {
  return (
    {
      new: "Yeni",
      accepted:
        "Kabul Edildi",
      design: "Tasarım",
      approval:
        "Klinik Onayı",
      production:
        "Üretim",
      qc: "Kalite Kontrol",
      ready:
        "Teslimata Hazır",
      shipped: "Yolda",
      delivered:
        "Teslim Edildi",
      cancelled: "İptal",
    } as Record<
      string,
      string
    >
  )[value] ?? value;
}

function priorityLabel(
  value: string
) {
  return (
    {
      low: "Düşük",
      normal: "Normal",
      high: "Yüksek",
      urgent: "Acil",
    } as Record<
      string,
      string
    >
  )[value] ?? value;
}

function shipmentStatusLabel(
  value: string
) {
  return (
    {
      created:
        "Oluşturuldu",
      pickup_requested:
        "Alım Bekliyor",
      picked_up:
        "Teslim Alındı",
      in_transit: "Yolda",
      delivered:
        "Teslim Edildi",
      cancelled: "İptal",
    } as Record<
      string,
      string
    >
  )[value] ?? value;
}

function money(
  value: number,
  currency: string
) {
  try {
    return new Intl.NumberFormat(
      "tr-TR",
      {
        style: "currency",
        currency:
          currency || "TRY",
        maximumFractionDigits: 0,
      }
    ).format(
      Number(value)
    );
  } catch {
    return `${value} ${currency}`;
  }
}

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}
