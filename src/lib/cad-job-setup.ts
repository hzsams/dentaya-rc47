import {cleanToothPlan,readToothPlan,type ToothPlan} from "./tooth-plan";
export type CadUnitRole = "abutment" | "pontic" | "single" | "framework";

export type CadRestorationDesignType =
  | "anatomic_crown"
  | "coping"
  | "cutback_crown"
  | "temporary_crown"
  | "temporary_pontic"
  | "anatomic_pontic"
  | "reduced_pontic"
  | "primary_telescope"
  | "secondary_telescope"
  | "veneer"
  | "inlay_onlay"
  | "framework";

export type CadAttachmentType = "none" | "ball" | "locator" | "custom";
export type CadMorphologyStyle = "soft" | "balanced" | "strong";
export type CadToothForm = "natural" | "square" | "oval" | "triangular" | "youthful" | "worn";

export type CadUnitSetup = {
  id: string;
  tooth_code: string;
  role: CadUnitRole;
  design_type: CadRestorationDesignType;
  anatomy_code: string;
  tooth_form: CadToothForm;
  form_library_id?: string;
  morphology_style: CadMorphologyStyle;
  material: string | null;
  attachment_type: CadAttachmentType;
  temporary: boolean;
  notes: string;
};

export type CadJobSetup = {
  version: 1;
  tooth_plan?: ToothPlan;
  complete: boolean;
  active_unit_id: string | null;
  units: CadUnitSetup[];
  updated_at: string | null;
};

export const CAD_RESTORATION_OPTIONS: Array<{
  value: CadRestorationDesignType;
  label: string;
  group: string;
  description: string;
}> = [
  { value: "anatomic_crown", label: "Monolitik / Anatomik Kron", group: "Sabit", description: "Tam kontur kron." },
  { value: "coping", label: "Kapşon / Coping Altyapı", group: "Altyapı", description: "Porselen/üst yapı için coping altyapısı." },
  { value: "cutback_crown", label: "Cutback / İskelet Kron", group: "Altyapı", description: "Anatomik formdan kontrollü cutback." },
  { value: "temporary_crown", label: "Geçici Kron", group: "Geçici", description: "Geçici/eggshell restorasyon akışı." },
  { value: "temporary_pontic", label: "Geçici Pontic", group: "Geçici", description: "Geçici köprü gövdesi / eggshell pontic." },
  { value: "anatomic_pontic", label: "Anatomik Pontic", group: "Köprü", description: "Tam anatomik köprü gövdesi." },
  { value: "reduced_pontic", label: "Reduced Pontic", group: "Köprü", description: "Cutback uygulanmış pontic." },
  { value: "primary_telescope", label: "Primer Teleskop", group: "Teleskop", description: "Primer teleskop kron." },
  { value: "secondary_telescope", label: "Sekonder Teleskop", group: "Teleskop", description: "Sekonder teleskop yapı." },
  { value: "veneer", label: "Veneer", group: "Sabit", description: "Laminate veneer tasarımı." },
  { value: "inlay_onlay", label: "Inlay / Onlay", group: "Sabit", description: "İnley/onley restorasyonu." },
  { value: "framework", label: "İskelet / Framework", group: "İskelet", description: "Framework odaklı çalışma birimi." },
];

export const CAD_ATTACHMENT_OPTIONS: Array<{
  value: CadAttachmentType;
  label: string;
  description: string;
}> = [
  { value: "none", label: "Yok", description: "Ek attachment yok." },
  { value: "ball", label: "Topuz / Ball", description: "Ball attachment yerleşimi." },
  { value: "locator", label: "Locator", description: "Locator tipi retansiyon bileşeni." },
  { value: "custom", label: "Özel Attachment", description: "Özel/harici attachment için yer tutucu." },
];

export const CAD_UNIT_ROLE_OPTIONS: Array<{ value: CadUnitRole; label: string }> = [
  { value: "single", label: "Tek üye" },
  { value: "abutment", label: "Dayanak" },
  { value: "pontic", label: "Pontic" },
  { value: "framework", label: "İskelet" },
];

export const CAD_MORPHOLOGY_OPTIONS: Array<{ value: CadMorphologyStyle; label: string }> = [
  { value: "soft", label: "Yumuşak" },
  { value: "balanced", label: "Dengeli" },
  { value: "strong", label: "Belirgin" },
];

export const CAD_TOOTH_FORM_OPTIONS: Array<{
  value: CadToothForm;
  label: string;
  description: string;
}> = [
  { value: "natural", label: "Natural", description: "FDI anatomisine dengeli, doğal başlangıç formu." },
  { value: "square", label: "Kare", description: "Daha geniş proksimal yüzeyler ve daha dolgun gövde." },
  { value: "oval", label: "Oval", description: "Yuvarlatılmış geçişler ve daha yumuşak kontur." },
  { value: "triangular", label: "Üçgensel", description: "Servikal daralma ve daha belirgin insizal/oklüzal genişlik." },
  { value: "youthful", label: "Genç", description: "Daha belirgin tüberkül ve anatomik detay." },
  { value: "worn", label: "Aşınmış", description: "Daha düşük tüberkül ve düzleşmiş oklüzal karakter." },
];

function normalizeToothForm(value:unknown):CadToothForm {
 return CAD_TOOTH_FORM_OPTIONS.find(option=>option.value===value)?.value??'natural';
}
function validLibraryId(value:unknown){return typeof value==='string'&&/^form-[0-9a-f-]{36}$/.test(value)?value:undefined;}

function unitId(toothCode: string, index: number) {
  return `unit-${toothCode || "x"}-${index}`;
}

function inferDefaultDesign(caseType: string, isBridge: boolean, index: number, count: number): CadRestorationDesignType {
  const lower = caseType.toLocaleLowerCase("tr-TR");
  if (lower.includes("geçici") || lower.includes("temporary")) return "temporary_crown";
  if (lower.includes("teleskop")) return "primary_telescope";
  if (lower.includes("veneer") || lower.includes("lamina")) return "veneer";
  if (lower.includes("inlay") || lower.includes("onlay")) return "inlay_onlay";
  if (lower.includes("coping") || lower.includes("kapşon") || lower.includes("altyap")) return "coping";
  if (lower.includes("iskelet") || lower.includes("framework")) return "framework";
  if (isBridge && count > 2 && index > 0 && index < count - 1) return "anatomic_pontic";
  return "anatomic_crown";
}

function inferRole(designType: CadRestorationDesignType, isBridge: boolean): CadUnitRole {
  if (designType === "anatomic_pontic" || designType === "reduced_pontic" || designType === "temporary_pontic") return "pontic";
  if (designType === "framework") return "framework";
  if (isBridge) return "abutment";
  return "single";
}

export function buildDefaultCadJobSetup(
  toothCodes: string[],
  caseType = "",
  material: string | null = null,
): CadJobSetup {
  const clean = toothCodes.map((value) => String(value).trim()).filter(Boolean);
  const isBridge = /köprü|bridge/i.test(caseType);
  const units = clean.map((toothCode, index) => {
    const designType = inferDefaultDesign(caseType, isBridge, index, clean.length);
    return {
      id: unitId(toothCode, index),
      tooth_code: toothCode,
      role: inferRole(designType, isBridge),
      design_type: designType,
      anatomy_code: toothCode,
      tooth_form: "natural" as const,
      morphology_style: "balanced" as const,
      material,
      attachment_type: "none" as const,
      temporary: designType === "temporary_crown" || designType === "temporary_pontic",
      notes: "",
    };
  });

  return {
    version: 1,
    complete: false,
    active_unit_id: units[0]?.id ?? null,
    units,
    updated_at: null,
  };
}

export function normalizeCadJobSetup(
  input: CadJobSetup | null | undefined,
  toothCodes: string[],
  caseType = "",
  material: string | null = null,
): CadJobSetup {
  const fallback = buildDefaultCadJobSetup(input?.version===1 && Array.isArray(input.units)?input.units.map(u=>u.tooth_code):toothCodes, caseType, material);
  if (!input || input.version !== 1 || !Array.isArray(input.units)) return fallback;

  const existingByTooth = new Map(input.units.map((unit) => [String(unit.tooth_code), unit]));
  const baseCodes = new Set(fallback.units.map((unit) => unit.tooth_code));
  const units = fallback.units.map((base) => {
    const prior = existingByTooth.get(base.tooth_code);
    if (!prior) return base;
    return {
      ...base,
      ...prior,
      id: prior.id || base.id,
      tooth_code: base.tooth_code,
      anatomy_code: prior.anatomy_code || base.anatomy_code,
      tooth_form: normalizeToothForm(prior.tooth_form),
      form_library_id:validLibraryId(prior.form_library_id),
      material: prior.material ?? material,
      temporary: prior.design_type === "temporary_crown" || prior.design_type === "temporary_pontic" || Boolean(prior.temporary),
    };
  });

  // Keep units that were added explicitly in CAD setup even if the original case
  // only listed prepared/abutment teeth. This is required for pontics and framework units.
  for (const prior of input.units) {
    const toothCode = String(prior.tooth_code || "").trim();
    if (!toothCode || baseCodes.has(toothCode) || units.some((unit) => unit.tooth_code === toothCode)) continue;
    units.push({
      ...prior,
      id: prior.id || unitId(toothCode, units.length),
      tooth_code: toothCode,
      anatomy_code: prior.anatomy_code || toothCode,
      tooth_form: normalizeToothForm(prior.tooth_form),
      form_library_id:validLibraryId(prior.form_library_id),
      material: prior.material ?? material,
      temporary: prior.design_type === "temporary_crown" || prior.design_type === "temporary_pontic" || Boolean(prior.temporary),
    });
  }

  const activeExists = units.some((unit) => unit.id === input.active_unit_id);
  return {
    version: 1,
    complete: Boolean(input.complete) && units.length > 0,
    active_unit_id: activeExists ? input.active_unit_id : (units[0]?.id ?? null),
    units,
    updated_at: input.updated_at ?? null,
    tooth_plan:cleanToothPlan({links:input.tooth_plan?.links??[],roles:Object.fromEntries(units.map(u=>[u.tooth_code,u.role==='pontic'?'pontic':u.role==='abutment'?'abutment':'single']))},units.map(u=>u.tooth_code)),
  };
}

export function cadRestorationLabel(value: CadRestorationDesignType) {
  return CAD_RESTORATION_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

export function cadAttachmentLabel(value: CadAttachmentType) {
  return CAD_ATTACHMENT_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

export function cadToothFormLabel(value: CadToothForm) {
  return CAD_TOOTH_FORM_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

export function activeCadUnit(setup: CadJobSetup | null | undefined) {
  if (!setup?.units.length) return null;
  return setup.units.find((unit) => unit.id === setup.active_unit_id) ?? setup.units[0];
}

export function fdiToothLabel(code: string) {
  const normalized = String(code).trim();
  if (!/^\d{2}$/.test(normalized)) return `Diş ${normalized || "—"}`;
  const quadrant = Number(normalized[0]);
  const tooth = Number(normalized[1]);
  const permanentNames: Record<number, string> = {
    1: "Santral kesici",
    2: "Lateral kesici",
    3: "Kanin",
    4: "1. premolar",
    5: "2. premolar",
    6: "1. molar",
    7: "2. molar",
    8: "3. molar",
  };
  const side = quadrant === 1 || quadrant === 4 ? "sağ" : "sol";
  const arch = quadrant === 1 || quadrant === 2 ? "üst" : "alt";
  return `${normalized} · ${arch} ${side} ${permanentNames[tooth] ?? "diş"}`;
}

export function cadSetupFromCase(teeth:string[],caseType:string,material:string|null,notes?:string|null):CadJobSetup {const setup=buildDefaultCadJobSetup(teeth,caseType,material),plan=readToothPlan(notes,teeth);if(!plan)return setup;return {...setup,tooth_plan:plan,units:setup.units.map(u=>({...u,role:plan.roles[u.tooth_code],design_type:plan.roles[u.tooth_code]==='pontic'?'anatomic_pontic':u.design_type==='anatomic_pontic'?'anatomic_crown':u.design_type}))};}
