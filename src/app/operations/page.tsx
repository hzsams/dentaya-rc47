"use client";
import { workflowText, type WorkflowMessage } from "@/lib/i18n/workflow-safety";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import QuickLink from "@/app/ModuleQuickLink";
import Link from "@/lib/i18n/UiLink";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import DentayaIcon, { type DentayaIconName } from "@/app/DentayaIcon";
import { dy, useDentayaThemeRuntime } from "@/app/dentaya-theme";
import { dentayaError } from "@/lib/dentaya-errors";
import { buildOperationsAttention, buildOperationsMetrics, defaultOperationsSettings, type OperationsAttention, type OperationsCase, type OperationsOrgType, type OperationsReview, type OperationsSettings, type OperationsShipment, } from "@/lib/operations-center";
import { supabase } from "@/lib/supabase";
type Organization = {
    id: string;
    name: string;
    org_type: OperationsOrgType;
};
type Membership = {
    organization_id: string;
    role: string;
};
type ViewFilter = "all" | "critical" | "case" | "shipment";
const CASE_SELECT = "id,case_number,title,status,priority,due_date,created_at,updated_at";
const REVIEW_SELECT = "case_id,version_number,status,submitted_at,reviewed_at,updated_at";
const SHIPMENT_SELECT = "id,case_id,tracking_code,status,eta_at,remaining_duration_seconds,delivered_at,updated_at";
export default function OperationsPage() {
    const { t: uiText, intlLocale, locale } = useTranslation();
    useDentayaThemeRuntime();
    const copy = (source: WorkflowMessage, values?: readonly string[]) => workflowText(locale, source, values);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [message, setMessage] = useState("");
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [membership, setMembership] = useState<Membership | null>(null);
    const [userId, setUserId] = useState("");
    const [cases, setCases] = useState<OperationsCase[]>([]);
    const [reviews, setReviews] = useState<OperationsReview[]>([]);
    const [shipments, setShipments] = useState<OperationsShipment[]>([]);
    const [settings, setSettings] = useState<OperationsSettings>(defaultOperationsSettings("clinic"));
    const [filter, setFilter] = useState<ViewFilter>("all");
    const [query, setQuery] = useState("");
    const [capacityDraft, setCapacityDraft] = useState("24");
    const [warningDraft, setWarningDraft] = useState("80");
    const [savingCapacity, setSavingCapacity] = useState(false);
    const [capacityReady, setCapacityReady] = useState(false);
    const capacityLock = useRef(false);
    const capacityEdited = useRef(false);
    const [settingsVersion, setSettingsVersion] = useState<string | null>(null);
    const loadData = useCallback(async (org: Organization, showSpinner = false) => {
        setCapacityReady(false);
        if (showSpinner)
            setRefreshing(true);
        setMessage("");
        try {
            let caseQuery = supabase
                .from("cases")
                .select(CASE_SELECT)
                .order("updated_at", { ascending: false })
                .limit(400);
            if (org.org_type === "clinic")
                caseQuery = caseQuery.eq("clinic_org_id", org.id);
            if (org.org_type === "laboratory")
                caseQuery = caseQuery.eq("lab_org_id", org.id);
            const casePromise = org.org_type === "courier"
                ? Promise.resolve({ data: [], error: null })
                : caseQuery;
            const [caseResult, reviewResult, shipmentResult, settingsResult] = await Promise.all([
                casePromise,
                org.org_type === "courier"
                    ? Promise.resolve({ data: [], error: null })
                    : supabase
                        .from("case_design_reviews")
                        .select(REVIEW_SELECT)
                        .order("updated_at", { ascending: false })
                        .limit(700),
                supabase
                    .from("shipments")
                    .select(SHIPMENT_SELECT)
                    .order("updated_at", { ascending: false })
                    .limit(500),
                supabase
                    .from("organization_operations_settings")
                    .select("daily_case_capacity,warning_load_percent,target_turnaround_hours,updated_at")
                    .eq("organization_id", org.id)
                    .maybeSingle(),
            ]);
            if (caseResult.error)
                throw caseResult.error;
            if (reviewResult.error)
                throw reviewResult.error;
            if (shipmentResult.error)
                throw shipmentResult.error;
            if (settingsResult.error && settingsResult.error.code !== "PGRST116")
                throw settingsResult.error;
            const nextSettings = (settingsResult.data ?? defaultOperationsSettings(org.org_type)) as OperationsSettings;
            setCases((caseResult.data ?? []) as OperationsCase[]);
            setReviews((reviewResult.data ?? []) as OperationsReview[]);
            setShipments((shipmentResult.data ?? []) as OperationsShipment[]);
            setSettings(nextSettings);
            if (!capacityEdited.current) {
                setSettingsVersion(settingsResult.data?.updated_at ?? null);
                setCapacityDraft(String(nextSettings.daily_case_capacity));
                setWarningDraft(String(nextSettings.warning_load_percent));
            }
            setCapacityReady(true);
        }
        catch (error) {
            setMessage(dentayaError(error, "Operasyon verileri yüklenemedi."));
        }
        finally {
            if (showSpinner)
                setRefreshing(false);
        }
    }, []);
    useEffect(() => {
        let active = true;
        async function boot() {
            try {
                const { data: auth } = await supabase.auth.getSession();
                const user = auth.session?.user;
                if (!user) {
                    router.replace("/workspace");
                    return;
                }
                setUserId(user.id);
                const { data: membershipData, error: membershipError } = await supabase
                    .from("memberships")
                    .select("organization_id,role")
                    .eq("user_id", user.id)
                    .eq("status", "active")
                    .limit(1)
                    .maybeSingle();
                if (membershipError)
                    throw membershipError;
                if (!membershipData)
                    throw new Error("Aktif kurum üyeliği bulunamadı.");
                const currentMembership = membershipData as Membership;
                const { data: orgData, error: orgError } = await supabase
                    .from("organizations")
                    .select("id,name,org_type")
                    .eq("id", currentMembership.organization_id)
                    .maybeSingle();
                if (orgError)
                    throw orgError;
                if (!orgData)
                    throw new Error("Kurum bulunamadı.");
                if (!active)
                    return;
                const currentOrg = orgData as Organization;
                setMembership(currentMembership);
                setOrganization(currentOrg);
                setSettings(defaultOperationsSettings(currentOrg.org_type));
                await loadData(currentOrg);
            }
            catch (error) {
                if (active)
                    setMessage(dentayaError(error, "Operasyon merkezi başlatılamadı."));
            }
            finally {
                if (active)
                    setLoading(false);
            }
        }
        void boot();
        return () => {
            active = false;
        };
    }, [loadData, router]);
    useEffect(() => {
        if (!organization)
            return;
        const channel = supabase
            .channel(`operations-${organization.id}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "cases" }, () => void loadData(organization))
            .on("postgres_changes", { event: "*", schema: "public", table: "case_design_reviews" }, () => void loadData(organization))
            .on("postgres_changes", { event: "*", schema: "public", table: "shipments" }, () => void loadData(organization))
            .subscribe();
        const recover = () => void loadData(organization, true);
        window.addEventListener("dentaya-network-restored", recover);
        return () => {
            window.removeEventListener("dentaya-network-restored", recover);
            void supabase.removeChannel(channel);
        };
    }, [loadData, organization]);
    const metrics = useMemo(() => buildOperationsMetrics(cases, reviews, shipments, settings), [cases, reviews, shipments, settings]);
    const attention = useMemo(() => organization ? buildOperationsAttention(organization.org_type, cases, reviews, shipments, settings, new Date(), intlLocale()) : [], [organization, cases, reviews, shipments, settings, intlLocale]);
    const filteredAttention = useMemo(() => {
        const normalized = query.trim().toLocaleLowerCase(intlLocale());
        return attention.filter((item) => {
            if (filter === "critical" && item.tone !== "critical")
                return false;
            if (filter === "case" && item.kind !== "case")
                return false;
            if (filter === "shipment" && item.kind !== "shipment")
                return false;
            if (!normalized)
                return true;
            return `${uiText(item.title)} ${uiText(item.detail)} ${item.title} ${item.detail}`.toLocaleLowerCase(intlLocale()).includes(normalized);
        });
    }, [attention, filter, query, uiText, intlLocale]);
    const canManage = membership ? ["owner", "admin"].includes(membership.role) : false;
    async function saveCapacity() {
        if (!organization || !userId || !canManage || !capacityReady || refreshing || capacityLock.current)
            return;
        const capacity = Number(capacityDraft);
        const warning = Number(warningDraft);
        if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) {
            setMessage("Günlük kapasite 1 ile 500 arasında tam sayı olmalı.");
            return;
        }
        if (!Number.isInteger(warning) || warning < 40 || warning > 100) {
            setMessage("Kapasite uyarı eşiği %40 ile %100 arasında olmalı.");
            return;
        }
        if (!navigator.onLine) { setMessage(copy("Kapasite ayarı için bağlantı gerekli. Taslağınız korundu.")); return; }
        capacityLock.current = true;
        setSavingCapacity(true);
        setMessage("");
        try {
            const fields = { daily_case_capacity: capacity, warning_load_percent: warning,
                target_turnaround_hours: settings.target_turnaround_hours, updated_by: userId };
            const result = settingsVersion ? await supabase.from("organization_operations_settings").update(fields)
                .eq("organization_id", organization.id).eq("updated_at", settingsVersion).select("updated_at")
                : await supabase.from("organization_operations_settings").insert({ ...fields, organization_id: organization.id, created_by: userId }).select("updated_at");
            if (result.error?.code === "23505" || (!result.error && !result.data?.length)) {
                setMessage(copy("Kapasite ayarı başka bir oturumda değiştirildi veya işlem yetkiniz yok. Taslağınız korundu; güncel ayarı yeniden yükleyin.")); return;
            }
            if (result.error) throw result.error;
            setSettingsVersion(result.data?.[0]?.updated_at ?? null);
            capacityEdited.current = false;
            setSettings(current => ({ ...current, daily_case_capacity: capacity, warning_load_percent: warning }));
            setMessage("Operasyon kapasitesi güncellendi.");
        } catch (error) { setMessage(dentayaError(error, "Kapasite ayarı kaydedilemedi.")); }
        finally { capacityLock.current = false; setSavingCapacity(false); }
    }
    if (loading) return <LoadingExperience title="İş takibi"/>;
    return (<UiNode as="main" id="main-content" className="operations-workspace" style={ui.page}>
      <style>{responsiveCss}</style>

      <UiNode as="header" style={ui.header}>
        <UiNode as="div">
          <UiNode as="h1" style={ui.title}>İş takibi</UiNode>
          <UiNode as="p" style={ui.sub}><UserText>{organization?.name ?? "DentAYA"}</UserText></UiNode>
        </UiNode>
        <UiNode as="div" style={ui.actions}>
          <UiNode as="button" type="button" style={ui.secondaryButton} onClick={() => { if (organization && (!capacityEdited.current || window.confirm(uiText(copy("Kaydedilmemiş kapasite ayarından vazgeçip güncel veriyi yüklemek istiyor musunuz?"))))) { capacityEdited.current = false; void loadData(organization, true); } }} disabled={refreshing || savingCapacity}>
            {refreshing ? "Yenileniyor…" : "Veriyi Yenile"}
          </UiNode>
        </UiNode>
      </UiNode>

      {message ? <UiNode as="div" role="status" style={ui.notice}>{message}</UiNode> : null}

      <UiNode as="section" className="operations-metrics" style={ui.metricsGrid}>
          <Metric icon="case" label={uiText("Aktif Vaka")} value={metrics.activeCases} detail={`${metrics.urgentCases} öncelikli`}/>
          <Metric icon="calendar" label="Termin Geçti" value={metrics.overdueCases} detail="aktif vakalar" tone={metrics.overdueCases ? "critical" : "normal"}/>
          <Metric icon="design" label={uiText("Revizyon")} value={metrics.revisionCases} detail="CAD kuyruğu" tone={metrics.revisionCases ? "warning" : "normal"}/>
          <Metric icon="shield" label="Onay Bekliyor" value={metrics.approvalCases} detail="karar bekleyen"/>
          <Metric icon="lab" label="Üretim / QC" value={metrics.productionCases + metrics.qcCases} detail={`${metrics.qcCases} QC`}/>
          <Metric icon="logistics" label="Aktif Teslimat" value={metrics.activeShipments} detail={`${metrics.lateShipments} gecikmiş`} tone={metrics.lateShipments ? "critical" : "normal"}/>
          <Metric icon="logistics" label="Alım Bekliyor" value={metrics.pickupWaiting} detail="kurye akışı"/>
          <Metric icon="case" label="Bugün Tamamlandı" value={metrics.deliveredToday} detail="teslim edilen vaka" tone="success"/>
      </UiNode>

      {organization?.org_type === "laboratory" ? (<UiNode as="section" id="capacity" style={ui.capacityCard}>
          <UiNode as="div" style={ui.capacityTop}>
            <UiNode as="div">
              <UiNode as="h2" style={ui.cardTitle}>LAB KAPASİTESİ</UiNode>
              <UiNode as="p" style={ui.capacityLoad}>{metrics.capacityLoad}/{settings.daily_case_capacity} aktif iş yükü</UiNode>
              <UiNode as="p" style={ui.muted}>Tasarım, onay, üretim, QC ve hazır kuyruğu kapasite hesabına dahil.</UiNode>
            </UiNode>
            <UiNode as="strong" style={{ ...ui.capacityPercent, color: metrics.capacityPercent >= settings.warning_load_percent ? "#f0bd6a" : dy.accent }}>
              %{metrics.capacityPercent}
            </UiNode>
          </UiNode>
          <UiNode as="div" style={ui.capacityTrack}><UiNode as="span" style={{ ...ui.capacityFill, width: `${Math.min(100, metrics.capacityPercent)}%` }}/></UiNode>
          {canManage ? (<UiNode as="div" className="capacity-controls" style={ui.capacityControls}>
              <UiNode as="label" style={ui.fieldLabel}>Günlük kapasite<UiNode as="input" value={capacityDraft} disabled={savingCapacity || !capacityReady} onChange={(event) => { capacityEdited.current = true; setCapacityDraft(event.target.value); }} inputMode="numeric" style={ui.input}/></UiNode>
              <UiNode as="label" style={ui.fieldLabel}>Uyarı eşiği %<UiNode as="input" value={warningDraft} disabled={savingCapacity || !capacityReady} onChange={(event) => { capacityEdited.current = true; setWarningDraft(event.target.value); }} inputMode="numeric" style={ui.input}/></UiNode>
              <UiNode as="button" type="button" onClick={() => void saveCapacity()} disabled={savingCapacity || !capacityReady} style={ui.smallPrimary}>
                {savingCapacity ? uiText("Kaydediliyor…") : "Kapasiteyi Kaydet"}
              </UiNode>
            </UiNode>) : null}
        </UiNode>) : null}

      <UiNode as="section" style={ui.pipelinePanel}>
        <UiNode as="div" style={ui.panelHeader}>
          <UiNode as="div">
            <UiNode as="h2" style={ui.cardTitle}>Vaka hangi aşamada?</UiNode>
          </UiNode>
          <Link href="/cases" style={ui.textLink}>Tüm vakaları aç →</Link>
        </UiNode>
        <UiNode as="div" className="pipeline-grid" style={ui.pipelineGrid}>
          {[
            ["Yeni", metrics.newCases],
            ["Kabul", metrics.acceptedCases],
            ["Tasarım", metrics.designCases],
            ["Onay", metrics.approvalCases],
            ["Üretim", metrics.productionCases],
            ["QC", metrics.qcCases],
            ["Hazır", metrics.readyCases],
            ["Yolda", metrics.shippedCases],
        ].map(([label, value]) => (<UiNode data-dy-copy-stack as="div" key={label} style={ui.pipelineStep}>
              <UiNode as="strong" style={ui.pipelineValue}>{value}</UiNode>
              <UiNode as="span" style={ui.pipelineLabel}>{label}</UiNode>
            </UiNode>))}
        </UiNode>
      </UiNode>

      <UiNode as="section" style={ui.attentionPanel}>
        <UiNode as="div" style={ui.panelHeader}>
          <UiNode as="div">
            <UiNode as="h2" style={ui.cardTitle}>ÖNCELİK KUYRUĞU</UiNode>
          </UiNode>
          <UiNode as="div" style={ui.filterWrap}>
            <UiNode as="input" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Vaka / gönderi ara" placeholder="Vaka / gönderi ara" style={ui.search}/>
            <UiNode as="div" style={ui.filters}>
              {(["all", "critical", "case", "shipment"] as ViewFilter[]).map((item) => (<UiNode as="button" key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)} style={{ ...ui.filter, ...(filter === item ? ui.filterActive : {}) }}>
                  {item === "all" ? uiText("Tümü") : item === "critical" ? "Kritik" : item === "case" ? uiText("Vaka") : "Kurye"}
                </UiNode>))}
            </UiNode>
          </UiNode>
        </UiNode>

        {filteredAttention.length ? (<UiNode as="div" className="operations-attention-list" style={ui.attentionList}>
            {filteredAttention.slice(0, 20).map((item) => <AttentionRow key={item.id} item={item}/>)}
          </UiNode>) : (<UiNode as="div" style={ui.empty}>Bu filtrede bekleyen kritik iş yok.</UiNode>)}
      </UiNode>

      <UiNode as="section" className="quick-grid" style={ui.quickGrid}>
        <QuickLink icon="case" title={uiText("Vakalar")} detail="Vaka listesi ve detay akışı" href="/cases"/>
        <QuickLink icon="design" title="DentAYA Design" detail="CAD ve revizyon kuyruğu" href="/design"/>
        <QuickLink icon="logistics" title={uiText("Lojistik")} detail="Canlı kurye, rota ve teslimat" href="/logistics"/>
        <QuickLink icon="shield" title={uiText("Operasyon Sağlığı")} detail="Hata ve pilot telemetry" href="/ops-health"/>
      </UiNode>
    </UiNode>);
}
function Metric({ icon, label, value, detail, tone = "normal" }: {
    icon: DentayaIconName;
    label: string;
    value: number;
    detail: string;
    tone?: "normal" | "critical" | "warning" | "success";
}) {
    const { t: uiText } = useTranslation();
    const color = tone === "critical" ? "#ff8f8f" : tone === "warning" ? "#efc36e" : tone === "success" ? "#65d39a" : dy.accent;
    return (<UiNode as="article" style={ui.metricCard}>
      <UiNode as="div" style={{ ...ui.metricIcon, color }}><DentayaIcon name={icon} size={18}/></UiNode>
      <UiNode as="span" style={ui.metricLabel}>{uiText(label)}</UiNode>
      <UiNode as="strong" style={ui.metricValue}>{value}</UiNode>
      <UiNode as="span" style={ui.metricDetail}>{detail}</UiNode>
    </UiNode>);
}
function AttentionRow({ item }: {
    item: OperationsAttention;
}) {
    const color = item.tone === "critical" ? "#ff8f8f" : item.tone === "warning" ? "#efc36e" : item.tone === "success" ? "#65d39a" : dy.accent;
    return (<Link href={item.href} style={ui.attentionRow}>
      <UiNode as="span" style={{ ...ui.signal, background: color }}/>
      <UiNode data-dy-copy-stack as="div" style={ui.attentionCopy}>
        <UiNode as="strong">{item.title}</UiNode>
        <UiNode as="span">{item.detail}</UiNode>
      </UiNode>
      <UiNode as="span" style={{ color: dy.muted }}>→</UiNode>
    </Link>);
}
const responsiveCss = `
  .operations-workspace,.operations-workspace *{box-sizing:border-box}
  .operations-metrics{grid-template-columns:repeat(4,minmax(0,1fr))}
  .pipeline-grid{grid-template-columns:repeat(8,minmax(88px,1fr))}
  .quick-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
  .capacity-controls{grid-template-columns:repeat(2,minmax(150px,220px)) auto}
  @media(max-width:1100px){.pipeline-grid{grid-template-columns:repeat(4,minmax(100px,1fr))}.quick-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:720px){.operations-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.pipeline-grid{grid-template-columns:repeat(2,minmax(100px,1fr))}.quick-grid{grid-template-columns:1fr}.capacity-controls{grid-template-columns:1fr}}
`;
const ui: Record<string, CSSProperties> = {
    page: { minHeight: "100%", maxWidth: 1480, margin: "0 auto", padding: "clamp(14px,2vw,24px)", background: dy.bg, color: dy.text, fontFamily: dy.fontFamily },
    header: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 16 },
    title: { margin: 0, fontSize: 26, letterSpacing: "-.025em", lineHeight: 1.25 },
    sub: { margin: "4px 0 0", color: dy.muted, fontSize: 13, overflowWrap: "anywhere" },
    actions: { display: "flex", gap: 8, flexWrap: "wrap" },
    secondaryButton: { minHeight: 38, padding: "0 12px", borderRadius: 7, background: dy.surface, border: `1px solid ${dy.border}`, color: dy.text, fontWeight: 700, cursor: "pointer" },
    notice: { marginBottom: 12, padding: "10px 12px", borderRadius: 7, border: `1px solid ${dy.border}`, background: dy.surface2, color: dy.muted },
    cardTitle: { margin: 0, fontSize: 16, fontWeight: 750, letterSpacing: "-.01em" },
    metricsGrid: { display: "grid", gap: 8, marginBottom: 12 },
    metricCard: { minHeight: 100, padding: 12, borderRadius: 8, border: `1px solid ${dy.border}`, background: dy.surface, display: "grid", gridTemplateColumns: "1fr auto", alignContent: "start", alignItems: "center", gap: 4 },
    metricIcon: { gridColumn: 2, gridRow: "1 / 3", display: "grid", placeItems: "center" },
    metricLabel: { color: dy.muted, fontSize: 11, fontWeight: 700 },
    metricValue: { gridColumn: 1, fontSize: 27, lineHeight: 1.1 },
    metricDetail: { color: dy.muted, fontSize: 11 },
    capacityCard: { marginBottom: 12, padding: 16, borderRadius: 8, border: `1px solid ${dy.border}`, background: dy.surface },
    capacityLoad: { margin: "7px 0 0", fontWeight: 700, fontSize: 16 },
    capacityTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" },
    capacityPercent: { fontSize: 27 },
    muted: { margin: "7px 0 0", color: dy.muted, lineHeight: 1.5, fontSize: 13 },
    capacityTrack: { height: 9, marginTop: 14, background: dy.surface2, borderRadius: 999, overflow: "hidden" },
    capacityFill: { display: "block", height: "100%", borderRadius: 999, background: dy.accent },
    capacityControls: { marginTop: 14, display: "grid", gap: 8, alignItems: "end" },
    fieldLabel: { display: "grid", gap: 5, color: dy.muted, fontSize: 11, fontWeight: 800 },
    input: { minHeight: 39, width: "100%", borderRadius: 9, border: `1px solid ${dy.border}`, background: dy.input, color: dy.text, padding: "0 10px", outline: "none" },
    smallPrimary: { minHeight: 39, border: 0, borderRadius: 9, padding: "0 13px", background: dy.accent, color: dy.accentContrast, fontWeight: 900, cursor: "pointer" },
    pipelinePanel: { marginBottom: 12, padding: 16, borderRadius: 8, border: `1px solid ${dy.border}`, background: dy.surface },
    panelHeader: { display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 14 },
    textLink: { color: dy.accent, textDecoration: "none", fontWeight: 850, fontSize: 13 },
    pipelineGrid: { display: "grid", gap: 8 },
    pipelineStep: { minHeight: 65, padding: 10, borderRadius: 6, background: dy.surface2, border: `1px solid ${dy.border}`, display: "grid", alignContent: "center", textAlign: "center" },
    pipelineValue: { fontSize: 21 },
    pipelineLabel: { marginTop: 3, color: dy.muted, fontSize: 11, fontWeight: 800 },
    attentionPanel: { marginBottom: 12, padding: 16, borderRadius: 8, border: `1px solid ${dy.border}`, background: dy.surface },
    filterWrap: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
    search: { minHeight: 38, minWidth: 0, width: "min(240px,100%)", borderRadius: 7, border: `1px solid ${dy.border}`, background: dy.input, color: dy.text, padding: "0 11px", outline: "none" },
    filters: { display: "flex", gap: 5, flexWrap: "wrap" },
    filter: { minHeight: 36, padding: "0 10px", borderRadius: 9, border: `1px solid ${dy.border}`, background: dy.surface2, color: dy.muted, cursor: "pointer", fontWeight: 800 },
    filterActive: { color: dy.accent, borderColor: dy.accent, background: dy.accentSoft },
    attentionList: { display: "grid", gap: 7 },
    attentionRow: { minHeight: 54, display: "grid", gridTemplateColumns: "4px 1fr auto", gap: 10, alignItems: "center", padding: "9px 11px", borderRadius: 6, border: `1px solid ${dy.border}`, background: dy.surface2, color: dy.text, textDecoration: "none", fontSize: 13 },
    signal: { width: 4, height: 28, borderRadius: 999 },
    attentionCopy: { display: "grid", gap: 3, minWidth: 0, overflowWrap: "anywhere" },
    empty: { padding: 22, textAlign: "center", color: dy.muted, borderRadius: 12, background: dy.surface2 },
    quickGrid: { display: "grid", gap: 10 },
};
