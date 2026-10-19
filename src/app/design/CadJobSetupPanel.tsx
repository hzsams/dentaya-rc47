"use client";
import UiMessage from "@/lib/i18n/UiMessage";

import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import ToothChart from "@/app/ToothChart";
import { cleanToothPlan } from "@/lib/tooth-plan";
import type { CSSProperties, ReactNode } from "react";
import { CAD_ATTACHMENT_OPTIONS, CAD_MORPHOLOGY_OPTIONS, CAD_RESTORATION_OPTIONS, CAD_TOOTH_FORM_OPTIONS, CAD_UNIT_ROLE_OPTIONS, buildDefaultCadJobSetup, cadAttachmentLabel, cadRestorationLabel, fdiToothLabel, type CadJobSetup, type CadRestorationDesignType, type CadUnitSetup, } from "@/lib/cad-job-setup";
const FDI_CODES = [
    "18", "17", "16", "15", "14", "13", "12", "11",
    "21", "22", "23", "24", "25", "26", "27", "28",
    "48", "47", "46", "45", "44", "43", "42", "41",
    "31", "32", "33", "34", "35", "36", "37", "38",
];
type Props = {
    open: boolean;
    caseNumber?: string;
    caseTitle?: string;
    setup: CadJobSetup;
    onChange: (setup: CadJobSetup) => void;
    onClose: () => void;
    onConfirm: () => void;
    onOpenLibrary?: (unitId:string) => void;
    libraryNames?:Record<string,string>;
};
export default function CadJobSetupPanel({ open, caseNumber, caseTitle, setup, onChange, onClose, onConfirm, onOpenLibrary, libraryNames={}, }: Props) {
    const { t: uiText } = useTranslation();
    if (!open)
        return null;
    function patchUnit(id: string, patch: Partial<CadUnitSetup>) {
        onChange({
            ...setup,
            complete: false,
            active_unit_id: setup.active_unit_id ?? id,
            updated_at: new Date().toISOString(),
            units: setup.units.map((unit) => {
                if (unit.id !== id)
                    return unit;
                const next = { ...unit, ...patch };
                if(patch.anatomy_code!==undefined&&patch.anatomy_code!==unit.anatomy_code||patch.tooth_form!==undefined||['primary_telescope','secondary_telescope'].includes(next.design_type))next.form_library_id=undefined;
                next.temporary = next.design_type === "temporary_crown" || next.design_type === "temporary_pontic";
                if (next.design_type === "anatomic_pontic" || next.design_type === "reduced_pontic" || next.design_type === "temporary_pontic") {
                    next.role = "pontic";
                }
                if (next.design_type === "framework")
                    next.role = "framework";
                return next;
            }),
        });
    }
    function addUnit(toothCode: string) {
        if (!toothCode || setup.units.some((unit) => unit.tooth_code === toothCode))
            return;
        const created = buildDefaultCadJobSetup([toothCode], "", setup.units[0]?.material ?? null).units[0];
        if (!created)
            return;
        onChange({
            ...setup,
            complete: false,
            active_unit_id: created.id,
            updated_at: new Date().toISOString(),
            units: [...setup.units, created],
        });
    }
    function removeUnit(id: string) {
        const units = setup.units.filter((unit) => unit.id !== id);
        onChange({
            ...setup,
            complete: false,
            active_unit_id: setup.active_unit_id === id
                ? (units[0]?.id ?? null)
                : setup.active_unit_id,
            updated_at: new Date().toISOString(),
            units,
            tooth_plan: cleanToothPlan(setup.tooth_plan, units.map(u => u.tooth_code)),
        });
    }
    function applyAll(designType: CadRestorationDesignType) {
        onChange({
            ...setup,
            complete: false,
            updated_at: new Date().toISOString(),
            units: setup.units.map((unit) => {
                const preservePontic = unit.role === "pontic";
                const unitDesign = preservePontic
                    ? designType === "temporary_crown"
                        ? "temporary_pontic"
                        : designType === "coping" || designType === "cutback_crown"
                            ? "reduced_pontic"
                            : designType === "anatomic_crown"
                                ? "anatomic_pontic"
                                : designType
                    : designType;
                return {
                    ...unit,
                    design_type: unitDesign,
                    role: unitDesign === "anatomic_pontic" || unitDesign === "reduced_pontic" || unitDesign === "temporary_pontic"
                        ? "pontic"
                        : unitDesign === "framework"
                            ? "framework"
                            : setup.units.length > 1
                                ? "abutment"
                                : "single",
                    temporary: unitDesign === "temporary_crown" || unitDesign === "temporary_pontic",
                };
            }),
        });
    }
    const completeEnough = setup.units.length > 0 && setup.units.every((unit) => Boolean(unit.design_type && unit.anatomy_code));
    function setPrimaryDesign(unit: CadUnitSetup, design: "crown" | "coping" | "cutback") {
        const designType: CadRestorationDesignType = unit.role === "pontic"
            ? design === "crown"
                ? "anatomic_pontic"
                : "reduced_pontic"
            : design === "crown"
                ? "anatomic_crown"
                : design === "coping"
                    ? "coping"
                    : "cutback_crown";
        patchUnit(unit.id, { design_type: designType });
    }
    return (<UiNode as="div" style={s.backdrop} role="dialog" aria-modal="true" aria-label="CAD iş tanımı">
      <UiNode as="section" style={s.modal}>
        <UiNode as="header" style={s.header}>
          <UiNode as="div">
            <UiNode as="span" style={s.eyebrow}>0 · İŞ TANIMI / RESTORASYON SETUP</UiNode>
            <UiNode as="h2" style={s.title}>CAD başlamadan önce ne tasarladığımızı tanımla</UiNode>
            <UiNode as="p" style={s.lead}>
              {caseNumber || "Vaka"}{caseTitle ? <UiMessage source=" · {0}" values={[caseTitle]} userValues={[]}/> : ""} — her diş/ünite için restorasyon, kron formu ve attachment seçimi.
            </UiNode>
          </UiNode>
          <UiNode as="button" type="button" style={s.ghostButton} onClick={onClose}>{uiText("Kapat")}</UiNode>
        </UiNode>

        <UiNode as="div" style={s.quickBar}>
          <UiNode as="span" style={s.quickLabel}>Hızlı kurulum</UiNode>
          <UiNode as="button" type="button" style={s.quickButton} onClick={() => applyAll("anatomic_crown")}>Monolitik</UiNode>
          <UiNode as="button" type="button" style={s.quickButton} onClick={() => applyAll("coping")}>Kapşon / Coping</UiNode>
          <UiNode as="button" type="button" style={s.quickButton} onClick={() => applyAll("cutback_crown")}>Cutback / İskelet</UiNode>
          <UiNode as="button" type="button" style={s.quickButton} onClick={() => applyAll("temporary_crown")}>Geçici</UiNode>
          <UiNode as="button" type="button" style={s.quickButton} onClick={() => applyAll("primary_telescope")}>Primer teleskop</UiNode>
          <UiNode as="span" style={s.quickDivider}/>
          <UiNode as="select" aria-label="CAD ünitesi ekle" defaultValue="" onChange={(event) => {
            addUnit(event.target.value);
            event.currentTarget.value = "";
        }} style={s.addUnitSelect}>
            <UiNode as="option" value="">+ Diş / pontic ünitesi ekle…</UiNode>
            {FDI_CODES
            .filter((code) => !setup.units.some((unit) => unit.tooth_code === code))
            .map((code) => <UiNode as="option" key={code} value={code}>{fdiToothLabel(code)}</UiNode>)}
          </UiNode>
        </UiNode>

        <UiNode as="div" style={s.body}><UiNode as="div"><ToothChart selected={setup.units.map(u => u.tooth_code)} plan={{ roles: Object.fromEntries(setup.units.map(u => [u.tooth_code, u.role === 'pontic' ? 'pontic' : u.role === 'abutment' ? 'abutment' : 'single'])), links: setup.tooth_plan?.links ?? [] }} onChange={(codes, plan) => { const units = codes.map(code => { const prior = setup.units.find(u => u.tooth_code === code); const unit = prior ?? buildDefaultCadJobSetup([code], "", setup.units[0]?.material ?? null).units[0]; return { ...unit, role: plan.roles[code], design_type: plan.roles[code] === 'pontic' ? (unit.design_type === 'reduced_pontic' ? 'reduced_pontic' as const : 'anatomic_pontic' as const) : unit.design_type.includes('pontic') ? 'anatomic_crown' as const : unit.design_type }; }); onChange({ ...setup, units, tooth_plan: plan, complete: false, active_unit_id: units.some(u => u.id === setup.active_unit_id) ? setup.active_unit_id : units[0]?.id ?? null, updated_at: new Date().toISOString() }); }}/><UiNode as="p" style={{ fontSize: 12, color: 'var(--dy-muted)' }}>Bağlantı planı projeyle kaydedilir. Üretim geometrisi için CAD bağlantılarını ayrıca yerleştirin ve kontrol edin.</UiNode></UiNode>
          {setup.units.length === 0 ? (<UiNode as="div" style={s.empty}>Bu vakada henüz CAD ünitesi yok. Yukarıdaki “Diş / pontic ünitesi ekle” alanından FDI dişini seçerek başlayabilirsin.</UiNode>) : setup.units.map((unit) => (<UiNode as="article" key={unit.id} style={{
                ...s.unitCard,
                ...(setup.active_unit_id === unit.id ? s.unitCardActive : {}),
            }}>
              <UiNode as="button" type="button" onClick={() => onChange({ ...setup, active_unit_id: unit.id })} style={s.unitHeading}>
                <UiNode as="span" style={s.toothBadge}>{unit.tooth_code}</UiNode>
                <UiNode data-dy-copy-stack as="span">
                  <UiNode as="strong" style={s.unitTitle}>{fdiToothLabel(unit.tooth_code)}</UiNode>
                  <UiNode as="small" style={s.unitSummary}>
                    {cadRestorationLabel(unit.design_type)} · {unit.form_library_id?<UiNode as="span" translateChildren={false}>{libraryNames[unit.form_library_id]??unit.form_library_id}</UiNode>:CAD_TOOTH_FORM_OPTIONS.find((item) => item.value === unit.tooth_form)?.label ?? "Natural"} · {cadAttachmentLabel(unit.attachment_type)}
                  </UiNode>
                </UiNode>
                {setup.active_unit_id === unit.id && <UiNode as="span" style={s.activeBadge}>AKTİF ÜNİTE</UiNode>}
              </UiNode>

              <UiNode as="div" style={s.primaryDesignWrap}>
                <UiNode as="span" style={s.primaryDesignLabel}>RESTORASYON ÇEKİRDEĞİ</UiNode>
                <UiNode as="div" style={s.primaryDesignGrid}>
                  <UiNode data-dy-copy-stack as="button" type="button" onClick={() => setPrimaryDesign(unit, "crown")} style={{ ...s.designCard, ...(unit.design_type === "anatomic_crown" || unit.design_type === "anatomic_pontic" ? s.designCardActive : {}) }}>
                    <UiNode as="strong">Tam Kron</UiNode>
                    <UiNode as="small">Tam anatomik başlangıç</UiNode>
                  </UiNode>
                  <UiNode data-dy-copy-stack as="button" type="button" onClick={() => setPrimaryDesign(unit, "coping")} style={{ ...s.designCard, ...(unit.design_type === "coping" || unit.design_type === "reduced_pontic" ? s.designCardActive : {}) }}>
                    <UiNode as="strong">Kapşon / Coping</UiNode>
                    <UiNode as="small">Azaltılmış altyapı gövdesi</UiNode>
                  </UiNode>
                  <UiNode data-dy-copy-stack as="button" type="button" onClick={() => setPrimaryDesign(unit, "cutback")} style={{ ...s.designCard, ...(unit.design_type === "cutback_crown" ? s.designCardActive : {}) }}>
                    <UiNode as="strong">Cutback</UiNode>
                    <UiNode as="small">Kontrollü anatomik redüksiyon</UiNode>
                  </UiNode>
                </UiNode>
              </UiNode>

              <UiNode as="div" style={s.grid}>
                <Field label="Ünite rolü">
                  <UiNode as="select" value={unit.role} onChange={(e) => patchUnit(unit.id, { role: e.target.value as CadUnitSetup["role"] })} style={s.select}>
                    {CAD_UNIT_ROLE_OPTIONS.map((option) => <UiNode as="option" key={option.value} value={option.value}>{option.label}</UiNode>)}
                  </UiNode>
                </Field>

                <Field label="Restorasyon / altyapı">
                  <UiNode as="select" value={unit.design_type} onChange={(e) => patchUnit(unit.id, { design_type: e.target.value as CadUnitSetup["design_type"] })} style={s.select}>
                    {CAD_RESTORATION_OPTIONS.map((option) => <UiNode as="option" key={option.value} value={option.value}>{option.label}</UiNode>)}
                  </UiNode>
                </Field>

                <Field label="Anatomi / kron formu">
                  <UiNode as="select" value={unit.anatomy_code} onChange={(e) => patchUnit(unit.id, { anatomy_code: e.target.value })} style={s.select}>
                    {FDI_CODES.map((code) => <UiNode as="option" key={code} value={code}>{fdiToothLabel(code)}</UiNode>)}
                  </UiNode>
                </Field>

                {!unit.form_library_id&&<Field label="Diş formu">
                  <UiNode as="select" aria-label="Diş formu" value={unit.tooth_form} onChange={e=>patchUnit(unit.id,{tooth_form:e.target.value as CadUnitSetup['tooth_form']})} style={s.select}>
                    {CAD_TOOTH_FORM_OPTIONS.map(option=><UiNode as="option" key={option.value} value={option.value}>{option.label}</UiNode>)}
                  </UiNode>
                </Field>}
                {!["primary_telescope","secondary_telescope"].includes(unit.design_type)&&<UiNode as="div" style={s.field}>
                  <UiNode as="span">Form kütüphanesi</UiNode>
                  {unit.form_library_id&&<UiNode as="strong" translateChildren={false}>{libraryNames[unit.form_library_id]??unit.form_library_id}</UiNode>}
                  <UiNode as="button" type="button" style={s.select} onClick={()=>onOpenLibrary?.(unit.id)}>Form kütüphanesi</UiNode>
                  {unit.form_library_id&&<UiNode as="button" type="button" style={s.select} onClick={()=>patchUnit(unit.id,{form_library_id:undefined})}>Sıfırla</UiNode>}
                </UiNode>}

                {!unit.form_library_id&&<Field label="Morfoloji karakteri">
                  <UiNode as="select" value={unit.morphology_style} onChange={(e) => patchUnit(unit.id, { morphology_style: e.target.value as CadUnitSetup["morphology_style"] })} style={s.select}>
                    {CAD_MORPHOLOGY_OPTIONS.map((option) => <UiNode as="option" key={option.value} value={option.value}>{option.label}</UiNode>)}
                  </UiNode>
                </Field>}

                <Field label="Materyal">
                  <UiNode as="input" value={unit.material ?? ""} onChange={(e) => patchUnit(unit.id, { material: e.target.value || null })} placeholder="Örn. Zirkonya" style={s.input}/>
                </Field>

                <Field label="Ek bileşen / attachment">
                  <UiNode as="select" value={unit.attachment_type} onChange={(e) => patchUnit(unit.id, { attachment_type: e.target.value as CadUnitSetup["attachment_type"] })} style={s.select}>
                    {CAD_ATTACHMENT_OPTIONS.map((option) => <UiNode as="option" key={option.value} value={option.value}>{option.label}</UiNode>)}
                  </UiNode>
                </Field>
              </UiNode>

              <UiNode as="label" style={s.notesLabel}>
                <UiNode as="span">Teknik not</UiNode>
                <UiNode as="input" value={unit.notes} onChange={(e) => patchUnit(unit.id, { notes: e.target.value })} placeholder="Örn. bukkal cutback artır, topuzu distal konumlandır..." style={s.notesInput}/>
              </UiNode>
              <UiNode data-dy-copy-stack as="div" style={s.formHint}>
                <UiNode as="strong">Canlı başlangıç geometrisi</UiNode>
                <UiNode as="span">
                  Kron seçildiğinde seçilen diş formundan tam anatomik başlangıç, Kapşon/Coping seçildiğinde aynı kütüphanenin azaltılmış altyapısı,
                  Cutback seçildiğinde kontrollü redüksiyon oluşturulur. Form veya restorasyon değiştiğinde 3D model anında yeniden kurulur.
                </UiNode>
              </UiNode>
              <UiNode as="div" style={s.unitFooter}>
                <UiNode as="button" type="button" style={s.removeButton} onClick={() => removeUnit(unit.id)}>
                  Üniteyi kaldır
                </UiNode>
              </UiNode>
            </UiNode>))}
        </UiNode>

        <UiNode as="footer" style={s.footer}>
          <UiNode data-dy-copy-stack as="div" style={s.footerInfo}>
            <UiNode as="strong">{setup.units.length} ünite tanımlı</UiNode>
            <UiNode as="span">Seçimler proje ayarlarıyla birlikte kaydedilir ve aktif ünitenin başlangıç anatomisini değiştirir.</UiNode>
          </UiNode>
          <UiNode as="button" type="button" disabled={!completeEnough} onClick={onConfirm} style={{ ...s.confirmButton, opacity: completeEnough ? 1 : 0.45, cursor: completeEnough ? "pointer" : "not-allowed" }}>
            İş tanımını onayla · CAD&apos;e başla
          </UiNode>
        </UiNode>
      </UiNode>
    </UiNode>);
}
function Field({ label, children }: {
    label: string;
    children: ReactNode;
}) {
    const { t: uiText } = useTranslation();
    return <UiNode as="label" style={s.field}><UiNode as="span">{uiText(label)}</UiNode>{children}</UiNode>;
}
const s: Record<string, CSSProperties> = {
    backdrop: { position: "fixed", inset: 0, zIndex: 200, background: "rgba(3,10,15,.86)", backdropFilter: "blur(10px)", display: "grid", placeItems: "center", padding: 18 },
    modal: { width: "min(1120px, 100%)", maxHeight: "min(900px, calc(100vh - 36px))", overflow: "hidden", display: "grid", gridTemplateRows: "auto auto minmax(0,1fr) auto", background: "var(--dy-surface,#0b1c28)", color: "var(--dy-text,#f2f6f8)", border: "1px solid var(--dy-border,#29465d)", borderRadius: 16, boxShadow: "0 28px 90px rgba(0,0,0,.48)" },
    header: { display: "flex", justifyContent: "space-between", gap: 18, padding: "20px 22px 16px", borderBottom: "1px solid var(--dy-border,#29465d)" },
    eyebrow: { display: "block", color: "var(--dy-accent,#6de2cf)", fontSize: 11, fontWeight: 900, letterSpacing: ".12em" },
    title: { margin: "6px 0 5px", fontSize: 24, lineHeight: 1.2 },
    lead: { margin: 0, color: "var(--dy-muted,#8ba0af)", fontSize: 13 },
    ghostButton: { alignSelf: "start", minHeight: 36, padding: "0 12px", borderRadius: 9, border: "1px solid var(--dy-border,#29465d)", background: "transparent", color: "var(--dy-text,#f2f6f8)", cursor: "pointer" },
    quickBar: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 7, padding: "10px 22px", borderBottom: "1px solid var(--dy-border,#29465d)", background: "var(--dy-surface2,#0d202c)" },
    quickLabel: { marginRight: 4, color: "var(--dy-muted,#8ba0af)", fontSize: 11, fontWeight: 900, letterSpacing: ".08em" },
    quickButton: { minHeight: 32, padding: "0 10px", borderRadius: 8, border: "1px solid var(--dy-border,#29465d)", background: "var(--dy-input,#071722)", color: "var(--dy-text,#f2f6f8)", cursor: "pointer", fontSize: 12, fontWeight: 800 },
    quickDivider: { width: 1, height: 24, background: "var(--dy-border,#29465d)", margin: "0 2px" },
    addUnitSelect: { minHeight: 32, minWidth: 210, padding: "0 9px", borderRadius: 8, border: "1px solid var(--dy-accent,#6de2cf)", background: "var(--dy-input,#071722)", color: "var(--dy-text,#f2f6f8)", outline: "none", fontSize: 12, fontWeight: 800 },
    body: { minHeight: 0, overflowY: "auto", padding: 16, display: "grid", gridAutoRows: "max-content", alignContent: "start", gap: 12 },
    empty: { padding: 22, border: "1px dashed var(--dy-border,#29465d)", color: "var(--dy-muted,#8ba0af)", borderRadius: 12 },
    unitCard: { borderWidth: 1, borderStyle: "solid", borderColor: "var(--dy-border,#29465d)", borderRadius: 12, background: "var(--dy-surface2,#0d202c)", overflow: "hidden" },
    unitCardActive: { borderColor: "var(--dy-accent,#6de2cf)", boxShadow: "inset 3px 0 0 var(--dy-accent,#6de2cf)" },
    unitHeading: { width: "100%", display: "grid", gridTemplateColumns: "46px minmax(0,1fr) auto", gap: 10, alignItems: "center", padding: "12px 14px", border: 0, borderBottom: "1px solid var(--dy-border,#29465d)", background: "transparent", color: "inherit", textAlign: "left", cursor: "pointer" },
    toothBadge: { width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 10, background: "var(--dy-accentSoft,rgba(109,226,207,.12))", color: "var(--dy-accent,#6de2cf)", fontWeight: 950, fontSize: 15 },
    unitTitle: { display: "block", fontSize: 14 },
    unitSummary: { display: "block", marginTop: 3, color: "var(--dy-muted,#8ba0af)", fontSize: 11 },
    activeBadge: { padding: "5px 8px", borderRadius: 999, background: "var(--dy-accentSoft,rgba(109,226,207,.12))", color: "var(--dy-accent,#6de2cf)", fontSize: 9, fontWeight: 950, letterSpacing: ".06em" },
    primaryDesignWrap: { padding: "12px 14px 0" },
    primaryDesignLabel: { display: "block", marginBottom: 7, color: "var(--dy-muted,#8ba0af)", fontSize: 9, fontWeight: 950, letterSpacing: ".11em" },
    primaryDesignGrid: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 },
    designCard: { minHeight: 66, display: "grid", gap: 3, alignContent: "center", padding: "9px 10px", borderRadius: 10, borderWidth: 1, borderStyle: "solid", borderColor: "var(--dy-border,#29465d)", background: "var(--dy-input,#071722)", color: "var(--dy-text,#f2f6f8)", textAlign: "left", cursor: "pointer" },
    designCardActive: { borderColor: "var(--dy-accent,#6de2cf)", background: "var(--dy-accentSoft,rgba(109,226,207,.11))", boxShadow: "inset 0 0 0 1px rgba(109,226,207,.18)" },
    grid: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10, padding: 14 },
    field: { display: "grid", gap: 5, color: "var(--dy-muted,#8ba0af)", fontSize: 10, fontWeight: 850, letterSpacing: ".04em" },
    select: { width: "100%", minHeight: 38, padding: "0 9px", borderRadius: 8, border: "1px solid var(--dy-border,#29465d)", background: "var(--dy-input,#071722)", color: "var(--dy-text,#f2f6f8)", outline: "none", fontSize: 12 },
    input: { width: "100%", minHeight: 38, padding: "0 9px", borderRadius: 8, border: "1px solid var(--dy-border,#29465d)", background: "var(--dy-input,#071722)", color: "var(--dy-text,#f2f6f8)", outline: "none", fontSize: 12 },
    notesLabel: { display: "grid", gridTemplateColumns: "100px minmax(0,1fr)", gap: 10, alignItems: "center", padding: "0 14px 14px", color: "var(--dy-muted,#8ba0af)", fontSize: 10, fontWeight: 850 },
    notesInput: { width: "100%", minHeight: 36, padding: "0 9px", borderRadius: 8, border: "1px solid var(--dy-border,#29465d)", background: "var(--dy-input,#071722)", color: "var(--dy-text,#f2f6f8)", outline: "none", fontSize: 12 },
    formHint: { display: "grid", gap: 4, margin: "0 14px 10px", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(99,228,207,.16)", background: "rgba(10,31,37,.58)", color: "#9db5b9", fontSize: 11, lineHeight: 1.45 },
    unitFooter: { display: "flex", justifyContent: "flex-end", padding: "0 14px 12px" },
    removeButton: { minHeight: 30, padding: "0 9px", borderRadius: 7, border: "1px solid rgba(255,120,120,.32)", background: "transparent", color: "#ff9a9a", cursor: "pointer", fontSize: 11, fontWeight: 800 },
    footer: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", padding: "14px 18px", borderTop: "1px solid var(--dy-border,#29465d)", background: "var(--dy-surface2,#0d202c)" },
    footerInfo: { display: "grid", gap: 3, minWidth: 0 },
    confirmButton: { minHeight: 42, padding: "0 16px", borderRadius: 9, border: "1px solid var(--dy-accent,#6de2cf)", background: "var(--dy-accent,#6de2cf)", color: "var(--dy-accentContrast,#06201b)", fontWeight: 950 },
};
