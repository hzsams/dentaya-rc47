"use client";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import QuickLink from "@/app/ModuleQuickLink";
import Link from "@/lib/i18n/UiLink";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import AyaRobot from "@/app/ai/AyaRobot";
import DentayaIcon, { type DentayaIconName } from "@/app/DentayaIcon";
import { dy, useDentayaThemeRuntime } from "@/app/dentaya-theme";
import { dentayaError } from "@/lib/dentaya-errors";
import { buildOperationsAttention, buildOperationsMetrics, defaultOperationsSettings, operationsAyaSummary, operationsHealthScore, type OperationsAttention, type OperationsCase, type OperationsOrgType, type OperationsReview, type OperationsSettings, type OperationsShipment, } from "@/lib/operations-center";
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
    const { t: uiText, intlLocale } = useTranslation();
    useDentayaThemeRuntime();
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
    const loadData = useCallback(async (org: Organization, showSpinner = false) => {
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
                    .select("daily_case_capacity,warning_load_percent,target_turnaround_hours")
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
            setCapacityDraft(String(nextSettings.daily_case_capacity));
            setWarningDraft(String(nextSettings.warning_load_percent));
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
    const ayaSummary = organization
        ? operationsAyaSummary(organization.org_type, metrics, settings)
        : "Operasyon verileri hazırlanıyor.";
    const healthScore = operationsHealthScore(metrics, settings);
    const canManage = membership ? ["owner", "admin"].includes(membership.role) : false;
    async function saveCapacity() {
        if (!organization || !userId || !canManage)
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
        setSavingCapacity(true);
        setMessage("");
        const payload = {
            organization_id: organization.id,
            daily_case_capacity: capacity,
            warning_load_percent: warning,
            target_turnaround_hours: settings.target_turnaround_hours,
            created_by: userId,
            updated_by: userId,
        };
        const { error } = await supabase
            .from("organization_operations_settings")
            .upsert(payload, { onConflict: "organization_id" });
        if (error)
            setMessage(dentayaError(error, "Kapasite ayarı kaydedilemedi."));
        else {
            setSettings((current) => ({ ...current, daily_case_capacity: capacity, warning_load_percent: warning }));
            setMessage("Operasyon kapasitesi güncellendi.");
        }
        setSavingCapacity(false);
    }
    if (loading) return <LoadingExperience title="Operasyon merkezi hazırlanıyor…"/>;
    return (<UiNode as="main" id="main-content" style={ui.page}>
      <style>{responsiveCss}</style>

      <UiNode as="header" style={ui.header}>
        <UiNode as="div">
          <UiNode as="p" style={ui.kicker}>OPERASYON KONTROL MERKEZİ</UiNode>
          <UiNode as="h1" style={ui.title}>Günün bütün akışı tek ekranda.</UiNode>
          <UiNode as="p" style={ui.sub}>
            <UserText>{organization?.name ?? "DentAYA"}</UserText> · vaka, CAD, üretim, QC ve kurye darboğazlarını canlı izleyin.
          </UiNode>
        </UiNode>
        <UiNode as="div" style={ui.actions}>
          <UiNode as="button" type="button" style={ui.secondaryButton} onClick={() => organization && void loadData(organization, true)} disabled={refreshing}>
            {refreshing ? "Yenileniyor…" : "Veriyi Yenile"}
          </UiNode>
          <Link href="/ai?prompt=Bugün%20önce%20hangi%20operasyonlara%20müdahale%20etmeliyim%3F" style={ui.primaryLink}>
            AYA’ya Sor
          </Link>
          <Link href="/" style={ui.secondaryLink}>{uiText("Ana Sayfa")}</Link>
        </UiNode>
      </UiNode>

      {message ? <UiNode as="div" style={ui.notice}>{message}</UiNode> : null}

      <UiNode as="section" className="operations-hero-grid" style={ui.heroGrid}>
        <UiNode as="article" style={ui.ayaCard}>
          <UiNode as="div" style={ui.ayaTop}>
            <UiNode as="div">
              <UiNode as="p" style={ui.kicker}>AYA · GÜNLÜK ÖNCELİK</UiNode>
              <UiNode as="h2" style={ui.cardTitle}>{healthScore >= 85 ? "Akış dengeli" : healthScore >= 60 ? "Müdahale gereken işler var" : "Kritik operasyon sinyalleri"}</UiNode>
            </UiNode>
            <UiNode as="div" style={ui.scoreBubble}>{healthScore}</UiNode>
          </UiNode>
          <UiNode as="div" style={ui.robotWrap}>
            <AyaRobot state={healthScore < 60 ? "alert" : healthScore < 85 ? "thinking" : "ready"} score={100 - healthScore} modelMode="local" statusText={ayaSummary}/>
          </UiNode>
          <UiNode as="p" style={ui.ayaText}>{ayaSummary}</UiNode>
          <UiNode as="div" style={ui.ayaFooter}>
            <UiNode as="span">{metrics.overdueCases} termin riski</UiNode>
            <UiNode as="span">{metrics.lateShipments} geciken teslimat</UiNode>
            <UiNode as="span">{metrics.revisionCases} {uiText(" revizyon")}</UiNode>
          </UiNode>
        </UiNode>

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
      </UiNode>

      {organization?.org_type === "laboratory" ? (<UiNode as="section" id="capacity" style={ui.capacityCard}>
          <UiNode as="div" style={ui.capacityTop}>
            <UiNode as="div">
              <UiNode as="p" style={ui.kicker}>LAB KAPASİTESİ</UiNode>
              <UiNode as="h2" style={ui.cardTitle}>{metrics.capacityLoad}/{settings.daily_case_capacity} aktif iş yükü</UiNode>
              <UiNode as="p" style={ui.muted}>Tasarım, onay, üretim, QC ve hazır kuyruğu kapasite hesabına dahil.</UiNode>
            </UiNode>
            <UiNode as="strong" style={{ ...ui.capacityPercent, color: metrics.capacityPercent >= settings.warning_load_percent ? "#f0bd6a" : dy.accent }}>
              %{metrics.capacityPercent}
            </UiNode>
          </UiNode>
          <UiNode as="div" style={ui.capacityTrack}><UiNode as="span" style={{ ...ui.capacityFill, width: `${Math.min(100, metrics.capacityPercent)}%` }}/></UiNode>
          {canManage ? (<UiNode as="div" className="capacity-controls" style={ui.capacityControls}>
              <UiNode as="label" style={ui.fieldLabel}>Günlük kapasite<UiNode as="input" value={capacityDraft} onChange={(event) => setCapacityDraft(event.target.value)} inputMode="numeric" style={ui.input}/></UiNode>
              <UiNode as="label" style={ui.fieldLabel}>Uyarı eşiği %<UiNode as="input" value={warningDraft} onChange={(event) => setWarningDraft(event.target.value)} inputMode="numeric" style={ui.input}/></UiNode>
              <UiNode as="button" type="button" onClick={() => void saveCapacity()} disabled={savingCapacity} style={ui.smallPrimary}>
                {savingCapacity ? uiText("Kaydediliyor…") : "Kapasiteyi Kaydet"}
              </UiNode>
            </UiNode>) : null}
        </UiNode>) : null}

      <UiNode as="section" style={ui.pipelinePanel}>
        <UiNode as="div" style={ui.panelHeader}>
          <UiNode as="div">
            <UiNode as="p" style={ui.kicker}>AKIŞ BORU HATTI</UiNode>
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
            <UiNode as="p" style={ui.kicker}>ÖNCELİK KUYRUĞU</UiNode>
            <UiNode as="h2" style={ui.cardTitle}>Önce bunlara müdahale et</UiNode>
          </UiNode>
          <UiNode as="div" style={ui.filterWrap}>
            <UiNode as="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Vaka / gönderi ara" style={ui.search}/>
            <UiNode as="div" style={ui.filters}>
              {(["all", "critical", "case", "shipment"] as ViewFilter[]).map((item) => (<UiNode as="button" key={item} type="button" onClick={() => setFilter(item)} style={{ ...ui.filter, ...(filter === item ? ui.filterActive : {}) }}>
                  {item === "all" ? uiText("Tümü") : item === "critical" ? "Kritik" : item === "case" ? uiText("Vaka") : "Kurye"}
                </UiNode>))}
            </UiNode>
          </UiNode>
        </UiNode>

        {filteredAttention.length ? (<UiNode as="div" style={ui.attentionList}>
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
  *{box-sizing:border-box}
  .operations-hero-grid{grid-template-columns:minmax(290px,.8fr) minmax(0,1.4fr)}
  .operations-metrics{grid-template-columns:repeat(4,minmax(0,1fr))}
  .pipeline-grid{grid-template-columns:repeat(8,minmax(88px,1fr))}
  .quick-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
  .capacity-controls{grid-template-columns:repeat(2,minmax(150px,220px)) auto}
  @media(max-width:1100px){.operations-hero-grid{grid-template-columns:1fr}.operations-metrics{grid-template-columns:repeat(4,minmax(0,1fr))}.pipeline-grid{grid-template-columns:repeat(4,minmax(100px,1fr))}.quick-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:720px){.operations-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.pipeline-grid{grid-template-columns:repeat(2,minmax(100px,1fr))}.quick-grid{grid-template-columns:1fr}.capacity-controls{grid-template-columns:1fr}.operations-hero-grid{display:block!important}.operations-hero-grid>section{margin-top:12px}}
`;
const ui: Record<string, CSSProperties> = {
    page: { minHeight: "100vh", padding: "clamp(18px,3vw,34px)", background: dy.bg, color: dy.text, fontFamily: dy.fontFamily },
    center: { minHeight: "70vh", display: "grid", placeItems: "center", color: dy.muted },
    header: { display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 18 },
    kicker: { margin: "0 0 7px", color: dy.accent, fontWeight: 900, fontSize: 11, letterSpacing: ".14em" },
    title: { margin: 0, fontSize: "clamp(32px,5vw,58px)", letterSpacing: "-.045em", lineHeight: .98, maxWidth: 820 },
    sub: { margin: "12px 0 0", color: dy.muted, lineHeight: 1.6, maxWidth: 760 },
    actions: { display: "flex", gap: 8, flexWrap: "wrap" },
    primaryLink: { minHeight: 42, display: "inline-grid", placeItems: "center", padding: "0 14px", borderRadius: 11, background: dy.accent, color: dy.accentContrast, textDecoration: "none", fontWeight: 900 },
    secondaryLink: { minHeight: 42, display: "inline-grid", placeItems: "center", padding: "0 14px", borderRadius: 11, background: dy.surface, border: `1px solid ${dy.border}`, color: dy.text, textDecoration: "none", fontWeight: 800 },
    secondaryButton: { minHeight: 42, padding: "0 14px", borderRadius: 11, background: dy.surface, border: `1px solid ${dy.border}`, color: dy.text, fontWeight: 800, cursor: "pointer" },
    notice: { marginBottom: 14, padding: "11px 13px", borderRadius: 11, border: `1px solid ${dy.border}`, background: dy.surface2, color: dy.muted },
    heroGrid: { display: "grid", gap: 12, marginBottom: 12 },
    ayaCard: { padding: 18, borderRadius: 20, border: `1px solid ${dy.border}`, background: `linear-gradient(160deg,${dy.surface},${dy.surface2})`, boxShadow: `0 22px 55px ${dy.shadow}` },
    ayaTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
    cardTitle: { margin: 0, fontSize: "clamp(22px,3vw,31px)", letterSpacing: "-.025em" },
    scoreBubble: { width: 54, height: 54, borderRadius: 17, display: "grid", placeItems: "center", background: dy.accentSoft, color: dy.accent, fontWeight: 950, fontSize: 20, border: `1px solid ${dy.border}` },
    robotWrap: { display: "grid", placeItems: "center", minHeight: 144 },
    ayaText: { margin: "5px 0 12px", lineHeight: 1.6, color: dy.text },
    ayaFooter: { display: "flex", gap: 8, flexWrap: "wrap", color: dy.muted, fontSize: 11 },
    metricsGrid: { display: "grid", gap: 10 },
    metricCard: { minHeight: 128, padding: 14, borderRadius: 16, border: `1px solid ${dy.border}`, background: dy.surface, display: "grid", alignContent: "start", gap: 4 },
    metricIcon: { width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 10, background: dy.surface2, marginBottom: 2 },
    metricLabel: { color: dy.muted, fontSize: 11, fontWeight: 850 },
    metricValue: { fontSize: 30, lineHeight: 1 },
    metricDetail: { color: dy.muted, fontSize: 11 },
    capacityCard: { marginBottom: 12, padding: 18, borderRadius: 18, border: `1px solid ${dy.border}`, background: dy.surface },
    capacityTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" },
    capacityPercent: { fontSize: 34 },
    muted: { margin: "7px 0 0", color: dy.muted, lineHeight: 1.5, fontSize: 13 },
    capacityTrack: { height: 9, marginTop: 14, background: dy.surface2, borderRadius: 999, overflow: "hidden" },
    capacityFill: { display: "block", height: "100%", borderRadius: 999, background: dy.accent },
    capacityControls: { marginTop: 14, display: "grid", gap: 8, alignItems: "end" },
    fieldLabel: { display: "grid", gap: 5, color: dy.muted, fontSize: 11, fontWeight: 800 },
    input: { minHeight: 39, width: "100%", borderRadius: 9, border: `1px solid ${dy.border}`, background: dy.input, color: dy.text, padding: "0 10px", outline: "none" },
    smallPrimary: { minHeight: 39, border: 0, borderRadius: 9, padding: "0 13px", background: dy.accent, color: dy.accentContrast, fontWeight: 900, cursor: "pointer" },
    pipelinePanel: { marginBottom: 12, padding: 18, borderRadius: 18, border: `1px solid ${dy.border}`, background: dy.surface },
    panelHeader: { display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 14 },
    textLink: { color: dy.accent, textDecoration: "none", fontWeight: 850, fontSize: 13 },
    pipelineGrid: { display: "grid", gap: 8 },
    pipelineStep: { minHeight: 88, padding: 12, borderRadius: 13, background: dy.surface2, border: `1px solid ${dy.border}`, display: "grid", alignContent: "center", textAlign: "center" },
    pipelineValue: { fontSize: 25 },
    pipelineLabel: { marginTop: 3, color: dy.muted, fontSize: 11, fontWeight: 800 },
    attentionPanel: { marginBottom: 12, padding: 18, borderRadius: 18, border: `1px solid ${dy.border}`, background: dy.surface },
    filterWrap: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
    search: { minHeight: 38, minWidth: 210, borderRadius: 9, border: `1px solid ${dy.border}`, background: dy.input, color: dy.text, padding: "0 11px", outline: "none" },
    filters: { display: "flex", gap: 5, flexWrap: "wrap" },
    filter: { minHeight: 36, padding: "0 10px", borderRadius: 9, border: `1px solid ${dy.border}`, background: dy.surface2, color: dy.muted, cursor: "pointer", fontWeight: 800 },
    filterActive: { color: dy.accent, borderColor: dy.accent, background: dy.accentSoft },
    attentionList: { display: "grid", gap: 7 },
    attentionRow: { minHeight: 62, display: "grid", gridTemplateColumns: "8px 1fr auto", gap: 12, alignItems: "center", padding: "10px 12px", borderRadius: 12, border: `1px solid ${dy.border}`, background: dy.surface2, color: dy.text, textDecoration: "none" },
    signal: { width: 8, height: 34, borderRadius: 999 },
    attentionCopy: { display: "grid", gap: 3, minWidth: 0 },
    empty: { padding: 22, textAlign: "center", color: dy.muted, borderRadius: 12, background: dy.surface2 },
    quickGrid: { display: "grid", gap: 10 },
    quickCard: { padding: 15, minHeight: 86, display: "flex", gap: 12, alignItems: "center", borderRadius: 15, border: `1px solid ${dy.border}`, background: dy.surface, color: dy.text, textDecoration: "none" },
};
