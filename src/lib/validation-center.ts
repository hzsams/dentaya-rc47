export const VALIDATION_REQUIREMENTS = [
  { id: "D-01", title: "Ürün kapsamı", detail: "Amaçlanan kullanım, desteklenen işlemler ve kullanım sınırlarını sürümle eşleştirin.", route: "/release-check" },
  { id: "D-02", title: "Vaka zinciri", detail: "Kayıt, laboratuvar kabulü, onay, üretim ve teslim adımlarını aynı vaka üzerinde doğrulayın.", route: "/cases" },
  { id: "D-03", title: "Dental veri", detail: "STL, OBJ ve PLY dosyalarının birimini, eksenini ve FDI eşleşmesini kontrol edin.", route: "/scan-studio" },
  { id: "D-04", title: "CAD tekrarlanabilirliği", detail: "Aynı girdi ve işlem dizisiyle geometriyi, kaydetme ve yeniden açma sonuçlarını karşılaştırın.", route: "/design" },
  { id: "D-05", title: "Revizyon ve onay", detail: "Tasarım sürümünü, inceleme kararını ve üretime aktarılan dosyayı birlikte kontrol edin.", route: "/cases" },
  { id: "D-06", title: "Erişim güvenliği", detail: "Rol yetkilerini, kurumlar arası veri ayrımını ve kritik işlem kayıtlarını sınayın.", route: "/team" },
  { id: "D-07", title: "Yedekleme ve geri yükleme", detail: "Gerçek bir yedekten dönüşü sınayın ve geri yüklenen verileri kaynak kayıtlarla karşılaştırın.", route: "/settings" },
  { id: "D-08", title: "Kesinti ve performans", detail: "Bağlantı kesintisi, yeniden deneme ve yük altında yanıt sürelerini ölçün.", route: "/ops-health" },
  { id: "D-09", title: "Dil ve erişilebilirlik", detail: "Tüm arayüz metinlerini, uzun çevirileri, klavye erişimini ve mobil yerleşimi kontrol edin.", route: "/settings" },
  { id: "D-10", title: "Kullanıcı görevleri", detail: "Hekim ve teknisyen görev tamamlama, işlem süresi ve kritik kullanım hatalarını protokole göre kaydedin.", route: "/pilot-flow" },
  { id: "D-11", title: "Risk ve araştırma izinleri", detail: "Araştırma türünü, risk değerlendirmesini ve gerekli etik, kurum ve otorite belge referanslarını kaydedin.", route: "/pilot-flow" },
  { id: "D-12", title: "Kurulum ve sürüm kapanışı", detail: "Windows kurulumunu, güncellemeyi ve destek senaryolarını hedef cihazda doğrulayın.", route: "/release-check" },
] as const;

export const VALIDATION_SCOPES = { synthetic: "Teknik / sentetik veri", usability: "Kullanıcı araştırması", retrospective: "Geriye dönük inceleme", prospective: "İleriye dönük klinik araştırma" } as const;
export const VALIDATION_OUTCOMES = { passed: "Başarılı", failed: "Başarısız", blocked: "Engellendi" } as const;
export const VALIDATION_SEVERITIES = { none: "Bulgu yok", low: "Düşük", medium: "Orta", high: "Yüksek", critical: "Kritik" } as const;
export type ValidationScope = keyof typeof VALIDATION_SCOPES;
export type ValidationOutcome = keyof typeof VALIDATION_OUTCOMES;
export type ValidationSeverity = keyof typeof VALIDATION_SEVERITIES;
export type ValidationRun = {
  id: string; organization_id: string; requirement_id: string; protocol_ref: string;
  release_version: string; data_scope: ValidationScope; outcome: ValidationOutcome;
  expected_result: string; observed_result: string; evidence_ref: string;
  authorization_ref: string; duration_seconds: number | null; issue_severity: ValidationSeverity;
  corrective_action: string; case_id: string | null; supersedes: string | null;
  created_by: string; created_at: string;
};
export type ValidationDraft = Omit<ValidationRun, "id" | "organization_id" | "created_by" | "created_at">;

export function validationDraftError(draft: ValidationDraft): string | null {
  if (!VALIDATION_REQUIREMENTS.some(r => r.id === draft.requirement_id)) return "Geçerli bir gereksinim seçin.";
  if (!Object.hasOwn(VALIDATION_SCOPES, draft.data_scope) || !Object.hasOwn(VALIDATION_OUTCOMES, draft.outcome) || !Object.hasOwn(VALIDATION_SEVERITIES, draft.issue_severity)) return "Geçerli bir sonuç ve araştırma türü seçin.";
  if (draft.protocol_ref.trim().length < 3 || draft.protocol_ref.length > 180 || draft.release_version.trim().length < 3 || draft.release_version.length > 80) return "Protokol ve ürün sürümünü belirtin.";
  if (draft.expected_result.trim().length < 10 || draft.observed_result.trim().length < 10 || draft.expected_result.length > 4000 || draft.observed_result.length > 4000) return "Kabul ölçütünü ve gözlenen sonucu açıkça yazın.";
  if (draft.evidence_ref.trim().length < 5 || draft.evidence_ref.length > 1000) return "İzlenebilir bir kanıt referansı ekleyin.";
  if (draft.authorization_ref.length > 1000 || (draft.data_scope !== "synthetic" && draft.authorization_ref.trim().length < 5)) return "Bu araştırma için izin ve veri kullanım belge referanslarını belirtin.";
  if (draft.duration_seconds !== null && (!Number.isInteger(draft.duration_seconds) || draft.duration_seconds < 0 || draft.duration_seconds > 864000)) return "İşlem süresini geçerli bir saniye değeriyle girin.";
  if (draft.outcome === "passed" && ["high", "critical"].includes(draft.issue_severity)) return "Açık yüksek veya kritik bulguyla başarılı sonuç kaydedilemez.";
  if (draft.corrective_action.length > 4000 || (draft.outcome !== "passed" && draft.corrective_action.trim().length < 10)) return "Başarısız veya engellenmiş sonuç için düzeltme adımını yazın.";
  return null;
}

export function latestValidationRuns(runs: ValidationRun[], version: string, protocol: string, scope: ValidationScope): ValidationRun[] {
  const latest = new Map<string, ValidationRun>();
  const replaced = new Set(runs.filter(r => r.release_version === version && r.protocol_ref === protocol.trim() && r.data_scope === scope).map(r=>r.supersedes).filter(Boolean));
  for (const run of [...runs].sort((a,b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))) {
    if (!replaced.has(run.id) && run.release_version === version && run.protocol_ref === protocol.trim() && run.data_scope === scope && !latest.has(run.requirement_id)) latest.set(run.requirement_id, run);
  }
  return [...latest.values()];
}

export function validationReport(runs: ValidationRun[], version: string, protocol: string, scope: ValidationScope, t: (source:string)=>string) {
  return {
    schema: "dentaya.validation-report.v1", product: "DentAYA", release_version: version,
    protocol_ref: protocol.trim(), data_scope: scope, exported_at: new Date().toISOString(),
    clinical_validation_verified: false, regulatory_approval_verified: false,
    limited_to_loaded_records: true,
    requirements: VALIDATION_REQUIREMENTS.map(r => ({ id:r.id, title:t(r.title), description:t(r.detail) })),
    records: runs.filter(r => r.release_version === version && r.protocol_ref === protocol.trim() && r.data_scope === scope),
  };
}

export function validationCsv(runs: ValidationRun[]) {
  const fields = ["id", "requirement_id", "protocol_ref", "release_version", "data_scope", "outcome", "expected_result", "observed_result", "evidence_ref", "authorization_ref", "duration_seconds", "issue_severity", "corrective_action", "case_id", "supersedes", "created_by", "created_at"] as const;
  const cell = (v: unknown) => { let text = String(v ?? ""); if (/^[\s\u0000-\u001f]*[=+@-]/u.test(text)) text = "'" + text; return '"' + text.replaceAll('"','""') + '"'; };
  return "\ufeff" + [fields.join(","), ...runs.map(r => fields.map(f => cell(r[f])).join(","))].join("\r\n");
}
