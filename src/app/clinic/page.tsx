"use client";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import NotificationCenter from "@/app/NotificationCenter";
import OnboardingGuide from "@/app/OnboardingGuide";
import { supabase } from "@/lib/supabase";
import { dy, useDentayaThemeRuntime } from "@/app/dentaya-theme";
type Org = {
    id: string;
    name: string;
    org_type: "clinic" | "laboratory" | "courier";
};
type Patient = {
    id: string;
    first_name: string;
    last_name: string;
    external_ref: string | null;
};
type CaseRow = {
    id: string;
    case_number: string;
    patient_reference: string;
    title: string;
    status: string;
    priority: string;
    due_date: string | null;
    updated_at: string;
};
type ScanRow = {
    id: string;
    patient_id: string;
    captured_at: string;
};
export default function ClinicWorkspacePage() {
    const { t: uiText } = useTranslation();
    useDentayaThemeRuntime();
    const router = useRouter();
    const [org, setOrg] = useState<Org | null>(null);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [cases, setCases] = useState<CaseRow[]>([]);
    const [scans, setScans] = useState<ScanRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    useEffect(() => {
        let active = true;
        async function boot() {
            const { data: session } = await supabase.auth.getSession();
            const user = session.session?.user;
            if (!user) {
                router.replace("/workspace");
                return;
            }
            const { data: membership, error: membershipError } = await supabase
                .from("memberships")
                .select("organization_id")
                .eq("user_id", user.id)
                .eq("status", "active")
                .limit(1)
                .maybeSingle();
            if (membershipError || !membership) {
                setMessage(membershipError?.message ?? "Aktif kurum bulunamadı.");
                setLoading(false);
                return;
            }
            const { data: orgData, error: orgError } = await supabase
                .from("organizations")
                .select("id,name,org_type")
                .eq("id", membership.organization_id)
                .maybeSingle();
            if (orgError || !orgData) {
                setMessage(orgError?.message ?? "Kurum bulunamadı.");
                setLoading(false);
                return;
            }
            const currentOrg = orgData as Org;
            if (currentOrg.org_type !== "clinic") {
                router.replace(currentOrg.org_type === "laboratory" ? "/lab" : "/logistics");
                return;
            }
            setOrg(currentOrg);
            const [patientResult, caseResult] = await Promise.all([
                supabase
                    .from("patients")
                    .select("id,first_name,last_name,external_ref")
                    .eq("owning_org_id", currentOrg.id)
                    .order("created_at", { ascending: false })
                    .limit(120),
                supabase
                    .from("cases")
                    .select("id,case_number,patient_reference,title,status,priority,due_date,updated_at")
                    .eq("clinic_org_id", currentOrg.id)
                    .order("updated_at", { ascending: false })
                    .limit(120),
            ]);
            if (!active)
                return;
            if (patientResult.error)
                setMessage(patientResult.error.message);
            if (caseResult.error)
                setMessage(caseResult.error.message);
            const patientRows = (patientResult.data ?? []) as Patient[];
            setPatients(patientRows);
            setCases((caseResult.data ?? []) as CaseRow[]);
            if (patientRows.length) {
                const { data: scanData, error: scanError } = await supabase
                    .from("scan_sessions")
                    .select("id,patient_id,captured_at")
                    .in("patient_id", patientRows.map((item) => item.id))
                    .order("captured_at", { ascending: false })
                    .limit(500);
                if (active) {
                    setScans((scanData ?? []) as ScanRow[]);
                    if (scanError)
                        setMessage(scanError.message);
                }
            }
            if (active)
                setLoading(false);
        }
        void boot();
        return () => {
            active = false;
        };
    }, [router]);
    const activeCases = cases.filter((item) => !["delivered", "cancelled"].includes(item.status));
    const approvals = cases.filter((item) => item.status === "approval");
    const urgentCases = activeCases.filter((item) => item.priority === "urgent" || item.priority === "high");
    const scanCountByPatient = useMemo(() => {
        const map = new Map<string, number>();
        for (const scan of scans) {
            map.set(scan.patient_id, (map.get(scan.patient_id) ?? 0) + 1);
        }
        return map;
    }, [scans]);
    const patientsWithScans = patients.filter((item) => (scanCountByPatient.get(item.id) ?? 0) > 0).length;
    if (loading) return <LoadingExperience title="Klinik çalışma alanı hazırlanıyor…"/>;
    if (!org)
        return <UiNode as="main" style={ui.center}>{message || "Klinik çalışma alanı açılamadı."}</UiNode>;
    return (<UiNode as="main" style={ui.page}>
      <style>{`
        * { box-sizing: border-box; }
        .clinic-module, .clinic-card {
          transition: transform var(--dy-motion-fast,150ms), border-color var(--dy-motion-fast,150ms), background var(--dy-motion-fast,150ms);
        }
        .clinic-module:hover, .clinic-card:hover {
          transform: translateY(-3px);
          border-color: var(--dy-accent,#6de2cf) !important;
        }
        @media (max-width: 980px) {
          .clinic-header { flex-direction: column; align-items: flex-start !important; }
          .clinic-hero, .clinic-grid, .clinic-summary { grid-template-columns: 1fr !important; }
          .clinic-stats { grid-template-columns: repeat(2,minmax(0,1fr)) !important; }
        }
        @media (max-width: 560px) {
          .clinic-stats { grid-template-columns: 1fr !important; }
          .clinic-actions { width: 100%; }
          .clinic-actions a, .clinic-actions button { flex: 1 1 100%; }
        }
      `}</style>

      <UiNode as="header" className="clinic-header" style={ui.header}>
        <UiNode as="div">
          <UiNode as="p" style={ui.eyebrow}>{uiText("KLİNİK ÇALIŞMA ALANI")}</UiNode>
          <UiNode as="h1" style={ui.title}><UserText>{org.name}</UserText></UiNode>
        </UiNode>

        <UiNode as="div" className="clinic-actions" style={ui.actions}>
          <NotificationCenter />
        </UiNode>
      </UiNode>

      {message && <UiNode as="div" style={ui.notice}>{message}</UiNode>}

      <OnboardingGuide />

      <UiNode as="section" className="clinic-stats" style={ui.stats}>
        <Stat label={uiText("Hastalar")} value={patients.length} detail="klinik kayıt"/>
        <Stat label={uiText("Aktif Vaka")} value={activeCases.length} detail="devam eden süreç"/>
        <Stat label="Onay Bekliyor" value={approvals.length} detail="tasarım kararı"/>
        <Stat label={uiText("Taramalar")} value={scans.length} detail="toplanan veri"/>
      </UiNode>

      <UiNode as="section" className="clinic-hero" style={ui.hero}>
        <UiNode as="div" style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <UiNode as="div">
            <UiNode as="p" style={ui.eyebrow}>KLİNİK</UiNode>
            <UiNode as="h2" style={ui.heroTitle}>Klinik işlemleri</UiNode>
          </UiNode>

          <UiNode as="div" className="clinic-summary" style={ui.summaryGrid}>
            <SummaryCard title="Hasta havuzu" value={patients.length} detail="Kayıtlı hasta sayısı" tone="accent"/>
            <SummaryCard title="Tarama hazır" value={patientsWithScans} detail="En az bir taraması olan hasta" tone="success"/>
            <SummaryCard title="Karar bekliyor" value={approvals.length} detail="Klinik onayı gereken tasarım" tone="warning"/>
          </UiNode>
        </UiNode>

        <UiNode as="aside" className="work-action-panel" aria-label="İş kuyruğu">
          <UiNode as="span" className="work-kicker">İŞ KUYRUĞU</UiNode><UiNode as="h2">Kontrol sizde</UiNode><UiNode as="p">Öncelikli kayıtları inceleyin, ardından ilgili modülde işlemi tamamlayın.</UiNode>
          <UiNode as="div" className="work-queue-row"><UiNode as="span">Öncelikli vakalar<UiNode as="small">Acil veya yüksek öncelik</UiNode></UiNode><UiNode as="strong">{urgentCases.length}</UiNode></UiNode>
          <UiNode as="div" className="work-queue-row"><UiNode as="span">Karar bekleyen işler<UiNode as="small">Klinik onayı</UiNode></UiNode><UiNode as="strong">{approvals.length}</UiNode></UiNode>
        </UiNode>
      </UiNode>

      <UiNode as="section" style={ui.section}>
        <UiNode as="div" style={ui.sectionHead}>
          <UiNode as="div">
            <UiNode as="p" style={ui.eyebrow}>OPERASYON GÖRÜNÜMÜ</UiNode>
            <UiNode as="h2" style={ui.sectionTitle}>Liste yerine özet</UiNode>
          </UiNode>
        </UiNode>

        <UiNode as="div" className="clinic-grid" style={ui.overviewGrid}>
          <OverviewCard title="Hasta ve tarama durumu" detail={`${patients.length} hasta, ${scans.length} toplam tarama, ${patientsWithScans} taramalı hasta.`} hint="Dental Twin ve tarama geçmişi için ilgili hasta veya tarama modülünü aç."/>
          <OverviewCard title="Laboratuvar akışı" detail={`${activeCases.length} aktif vaka, ${approvals.length} klinik kararı bekleyen tasarım.`} hint="Onay, revizyon ve laboratuvar takibini Vaka ekranında sürdür."/>
          <OverviewCard title="Öncelik kontrolü" detail={`${urgentCases.length} öncelikli vaka, ${approvals.length} karar bekleyen tasarım.`} hint="Vaka listesini açarak durum, termin ve sorumlu bilgilerini kontrol edin."/>
        </UiNode>
      </UiNode>
    </UiNode>);
}
function Stat({ label, value, detail }: {
    label: string;
    value: number;
    detail: string;
}) {
    const { t: uiText } = useTranslation();
    return (<UiNode as="article" style={ui.stat}>
      <UiNode as="span">{uiText(label)}</UiNode>
      <UiNode as="strong">{value}</UiNode>
      <UiNode as="small">{detail}</UiNode>
    </UiNode>);
}
function SummaryCard({ title, value, detail, tone, }: {
    title: string;
    value: number;
    detail: string;
    tone: "accent" | "warning" | "success";
}) {
    const toneColor = tone === "warning" ? "#e8bd73" : tone === "success" ? "#63cc98" : dy.accent;
    return (<UiNode as="article" className="clinic-card" style={{
            ...ui.summaryCard,
            borderColor: tone === "warning" ? "rgba(232,189,115,.32)" : tone === "success" ? "rgba(99,204,152,.28)" : dy.border,
        }}>
      <UiNode as="span" style={{ ...ui.moduleEye, color: toneColor }}>{title}</UiNode>
      <UiNode as="strong" style={{ fontSize: 34, lineHeight: 1 }}>{value}</UiNode>
      <UiNode as="p" style={ui.summaryText}>{detail}</UiNode>
    </UiNode>);
}
function OverviewCard({ title, detail, hint }: {
    title: string;
    detail: string;
    hint: string;
}) {
    return (<UiNode as="article" className="clinic-card" style={ui.overviewCard}>
      <UiNode as="strong" style={{ fontSize: 18 }}>{title}</UiNode>
      <UiNode as="p" style={ui.overviewText}>{detail}</UiNode>
      <UiNode as="span" style={ui.overviewHint}>{hint}</UiNode>
    </UiNode>);
}
const ui: Record<string, CSSProperties> = {
    page: {
        minHeight: "100vh",
        padding: "22px clamp(18px,4vw,52px) 60px",
        background: dy.bg,
        color: dy.text,
        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: 15,
    },
    center: {
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: dy.bg,
        color: dy.muted,
    },
    header: {
        maxWidth: 1460,
        margin: "0 auto 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: 24,
    },
    back: {
        color: dy.muted,
        textDecoration: "none",
        fontSize: 13,
    },
    eyebrow: {
        margin: "13px 0 7px",
        color: dy.accent,
        fontSize: 13,
        fontWeight: 900,
        letterSpacing: ".16em",
    },
    title: {
        margin: "0 0 9px",
        fontSize: "clamp(26px,3vw,34px)",
        letterSpacing: "-.05em",
    },
    sub: {
        maxWidth: 800,
        margin: 0,
        color: dy.muted,
        lineHeight: 1.65,
        fontSize: 14,
    },
    actions: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        marginTop: 16,
    },
    primary: {
        minHeight: 42,
        display: "inline-grid",
        placeItems: "center",
        padding: "0 14px",
        borderRadius: 12,
        background: dy.accent,
        color: dy.accentContrast,
        textDecoration: "none",
        fontWeight: 900,
        fontSize: 13,
    },
    secondary: {
        minHeight: 42,
        display: "inline-grid",
        placeItems: "center",
        padding: "0 14px",
        borderRadius: 12,
        border: `1px solid ${dy.border}`,
        background: dy.surface,
        color: dy.text,
        textDecoration: "none",
        fontWeight: 800,
        fontSize: 13,
    },
    primaryWide: {
        minHeight: 44,
        display: "grid",
        placeItems: "center",
        borderRadius: 14,
        background: dy.accent,
        color: dy.accentContrast,
        textDecoration: "none",
        fontWeight: 900,
    },
    notice: {
        maxWidth: 1460,
        margin: "0 auto 12px",
        padding: "11px 13px",
        borderRadius: 12,
        border: `1px solid ${dy.border}`,
        background: dy.surface2,
        color: dy.muted,
        fontSize: 13,
    },
    stats: {
        maxWidth: 1460,
        margin: "0 auto 12px",
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 9,
    },
    stat: {
        minHeight: 108,
        padding: 16,
        display: "grid",
        alignContent: "space-between",
        gap: 5,
        borderRadius: 16,
        border: `1px solid ${dy.border}`,
        background: dy.surface,
    },
    hero: {
        maxWidth: 1460,
        margin: "0 auto 12px",
        padding: 22,
        display: "grid",
        gridTemplateColumns: "minmax(0,1.1fr) minmax(320px,.9fr)",
        gap: 18,
        borderRadius: 10,
        border: `1px solid ${dy.border}`,
        background: dy.surface,
    },
    heroTitle: {
        margin: "4px 0 10px",
        fontSize: "clamp(22px,2.4vw,28px)",
        letterSpacing: "-.04em",
    },
    summaryGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
        gap: 9,
    },
    summaryCard: {
        minHeight: 148,
        padding: 14,
        display: "grid",
        gap: 8,
        borderRadius: 8,
        border: `1px solid ${dy.border}`,
        background: dy.surface,
        color: dy.text,
        textDecoration: "none",
    },
    summaryText: {
        margin: 0,
        color: dy.muted,
        lineHeight: 1.55,
        fontSize: 13,
    },
    ayaPanel: {
        padding: 16,
        display: "grid",
        gap: 14,
        alignContent: "start",
        borderRadius: 20,
        border: `1px solid ${dy.border}`,
        background: "rgba(7,17,24,.56)",
        backdropFilter: "blur(12px)",
    },
    ayaTitle: {
        margin: "0 0 6px",
        fontSize: 26,
    },
    ayaText: {
        margin: 0,
        color: dy.muted,
        lineHeight: 1.55,
        fontSize: 14,
    },
    section: {
        maxWidth: 1460,
        margin: "0 auto 12px",
        padding: "12px 0 0",
    },
    sectionHead: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: 14,
        marginBottom: 10,
    },
    sectionTitle: {
        margin: 0,
        fontSize: 28,
    },
    smallMuted: {
        color: dy.muted,
        fontSize: 13,
    },
    inlineLink: {
        color: dy.accent,
        fontWeight: 800,
        textDecoration: "none",
    },
    moduleGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
        gap: 10,
    },
    module: {
        minHeight: 180,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        borderRadius: 8,
        border: `1px solid ${dy.border}`,
        background: dy.surface,
        color: dy.text,
        textDecoration: "none",
    },
    moduleEye: {
        color: dy.accent,
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: ".16em",
        textTransform: "uppercase",
    },
    moduleTitle: {
        marginTop: 16,
        fontSize: 20,
    },
    moduleText: {
        margin: "8px 0 0",
        color: dy.muted,
        fontSize: 14,
        lineHeight: 1.6,
    },
    arrow: {
        marginTop: "auto",
        color: dy.accent,
        fontWeight: 850,
    },
    overviewGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
        gap: 10,
    },
    overviewCard: {
        minHeight: 164,
        padding: 16,
        display: "grid",
        gap: 10,
        borderRadius: 8,
        border: `1px solid ${dy.border}`,
        background: dy.surface,
    },
    overviewText: {
        margin: 0,
        color: dy.text,
        fontSize: 15,
        lineHeight: 1.6,
    },
    overviewHint: {
        color: dy.muted,
        fontSize: 13,
        lineHeight: 1.55,
    },
};
