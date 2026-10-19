"use client";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useMemo, useState, type CSSProperties, } from "react";
import Link from "@/lib/i18n/UiLink";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { dy, useDentayaThemeRuntime, } from "@/app/dentaya-theme";
type Patient = {
    id: string;
    external_ref: string | null;
    first_name: string;
    last_name: string;
    date_of_birth: string | null;
    demo_mode: boolean;
};
type Scan = {
    id: string;
    patient_id: string;
    scan_ref: string;
    captured_at: string;
    arch: string;
    scanner_brand: string | null;
    scanner_model: string | null;
    completeness_score: number | null;
    occlusion_rms_mm: number | null;
    demo_mode: boolean;
};
type ToothStatus = {
    patient_id: string;
    tooth_code: string;
    condition: string;
    material: string | null;
    shade: string | null;
};
type DentalRecord = {
    patient_id: string;
    record_type: string;
    recorded_at: string;
};
type Annotation = {
    scan_id: string;
    severity: "info" | "watch" | "attention";
};
export default function DentalTwinPage() {
    const { t: uiText, intlLocale } = useTranslation();
    useDentayaThemeRuntime();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [scans, setScans] = useState<Scan[]>([]);
    const [toothStatuses, setToothStatuses,] = useState<ToothStatus[]>([]);
    const [dentalRecords, setDentalRecords,] = useState<DentalRecord[]>([]);
    const [annotations, setAnnotations,] = useState<Annotation[]>([]);
    const [search, setSearch] = useState("");
    const [notice, setNotice] = useState("");
    useEffect(() => {
        let active = true;
        async function initialize() {
            const { data: authData, } = await supabase.auth.getSession();
            const user = authData.session?.user;
            if (!user) {
                router.replace("/workspace");
                return;
            }
            const { data: membership, error: membershipError, } = await supabase
                .from("memberships")
                .select("organization_id")
                .eq("user_id", user.id)
                .eq("status", "active")
                .limit(1)
                .maybeSingle();
            if (membershipError ||
                !membership) {
                if (active) {
                    setNotice(membershipError?.message ??
                        "Aktif kurum bulunamadı.");
                    setLoading(false);
                }
                return;
            }
            const { data: organization, error: organizationError, } = await supabase
                .from("organizations")
                .select("id,org_type")
                .eq("id", membership.organization_id)
                .maybeSingle();
            if (organizationError ||
                !organization) {
                if (active) {
                    setNotice(organizationError?.message ??
                        "Kurum bilgisi alınamadı.");
                    setLoading(false);
                }
                return;
            }
            if (organization.org_type !==
                "clinic") {
                if (active) {
                    setNotice("Dental Twin çalışma alanı şu anda klinik hesapları için açık.");
                    setLoading(false);
                }
                return;
            }
            const { data: patientData, error: patientError, } = await supabase
                .from("patients")
                .select("id,external_ref,first_name,last_name,date_of_birth,demo_mode")
                .eq("owning_org_id", organization.id)
                .order("created_at", {
                ascending: false,
            })
                .limit(300);
            if (patientError) {
                if (active) {
                    setNotice(patientError.message);
                    setLoading(false);
                }
                return;
            }
            const patientRows = (patientData ??
                []) as Patient[];
            if (!active) {
                return;
            }
            setPatients(patientRows);
            const patientIds = patientRows.map((item) => item.id);
            if (!patientIds.length) {
                setLoading(false);
                return;
            }
            const [scanResult, toothResult, recordResult,] = await Promise.all([
                supabase
                    .from("scan_sessions")
                    .select("id,patient_id,scan_ref,captured_at,arch,scanner_brand,scanner_model,completeness_score,occlusion_rms_mm,demo_mode")
                    .in("patient_id", patientIds)
                    .order("captured_at", {
                    ascending: false,
                }),
                supabase
                    .from("tooth_status")
                    .select("patient_id,tooth_code,condition,material,shade")
                    .in("patient_id", patientIds),
                supabase
                    .from("dental_records")
                    .select("patient_id,record_type,recorded_at")
                    .in("patient_id", patientIds)
                    .order("recorded_at", {
                    ascending: false,
                }),
            ]);
            if (!active) {
                return;
            }
            if (scanResult.error) {
                setNotice(scanResult.error.message);
            }
            if (toothResult.error) {
                setNotice(toothResult.error.message);
            }
            if (recordResult.error) {
                setNotice(recordResult.error.message);
            }
            const scanRows = (scanResult.data ??
                []) as Scan[];
            setScans(scanRows);
            setToothStatuses((toothResult.data ??
                []) as ToothStatus[]);
            setDentalRecords((recordResult.data ??
                []) as DentalRecord[]);
            const scanIds = scanRows.map((item) => item.id);
            if (scanIds.length) {
                const { data: annotationData, error: annotationError, } = await supabase
                    .from("scan_annotations")
                    .select("scan_id,severity")
                    .in("scan_id", scanIds);
                if (active &&
                    !annotationError) {
                    setAnnotations((annotationData ??
                        []) as Annotation[]);
                }
                if (active &&
                    annotationError) {
                    setNotice(annotationError.message);
                }
            }
            if (active) {
                setLoading(false);
            }
        }
        void initialize();
        return () => {
            active = false;
        };
    }, [router]);
    const filteredPatients = useMemo(() => {
        const query = search
            .trim()
            .toLocaleLowerCase("tr-TR");
        if (!query) {
            return patients;
        }
        return patients.filter((patient) => {
            const haystack = [
                patient.first_name,
                patient.last_name,
                patient.external_ref ??
                    "",
            ]
                .join(" ")
                .toLocaleLowerCase("tr-TR");
            return haystack.includes(query);
        });
    }, [patients, search]);
    const totalLongitudinal = useMemo(() => patients.filter((patient) => scans.filter((scan) => scan.patient_id ===
        patient.id).length >= 2).length, [patients, scans]);
    if (loading) return <LoadingExperience title="Dental Twin hazırlanıyor…"/>;
    return (<UiNode as="main" style={styles.page}>
      <style>
        {`
          * { box-sizing: border-box; }

          @keyframes twinEnter {
            from {
              opacity: 0;
              transform: translateY(var(--dy-motion-distance, 8px));
            }
            to {
              opacity: 1;
              transform: none;
            }
          }

          .twin-card {
            animation: twinEnter var(--dy-motion-normal, 240ms) ease both;
            transition:
              transform var(--dy-motion-fast, 150ms) ease,
              border-color var(--dy-motion-fast, 150ms) ease,
              box-shadow var(--dy-motion-fast, 150ms) ease;
          }

          .twin-card:hover {
            transform: translateY(-3px);
            border-color: var(--dy-accent, #6de2cf) !important;
            box-shadow: 0 16px 42px rgba(0,0,0,.22);
          }

          @media (max-width: 850px) {
            .twin-hero {
              grid-template-columns: 1fr !important;
            }

            .twin-stats {
              grid-template-columns: repeat(2, 1fr) !important;
            }
          }
        `}
      </style>

      <UiNode as="header" style={styles.header}>
        <UiNode as="div">
          <Link href="/" style={styles.back}>
            ← Ana panel
          </Link>

          <UiNode as="p" style={styles.eyebrow}>
            DENTAYA · DENTAL TWIN
          </UiNode>

          <UiNode as="h1" style={styles.title}>
            Hastanın dijital ağız
            geçmişine tek yerden gir.
          </UiNode>

          <UiNode as="p" style={styles.subtitle}>
            Diş bazlı kayıtları,
            zaman içindeki taramaları,
            3D karşılaştırmaları ve
            yüzey notlarını hastaya
            bağlı tek bir zaman
            çizgisinde yönet.
          </UiNode>
        </UiNode>

        <UiNode as="div" style={styles.headerActions}>
          <Link href="/patients" style={styles.secondary}>
            Hasta Yönetimi
          </Link>

          <Link href="/scans" style={styles.primary}>
            3D Tarama Merkezi
          </Link>
        </UiNode>
      </UiNode>

      {notice && (<UiNode as="div" style={styles.notice}>
          {notice}
        </UiNode>)}

      <UiNode as="section" className="twin-stats" style={styles.stats}>
        <Stat label={uiText("Hasta")} value={patients.length} detail="Dental Twin erişilebilir"/>

        <Stat label="Zaman İçinde Dental Twin" value={totalLongitudinal} detail="2+ tarama kaydı"/>

        <Stat label="Tarama" value={scans.length} detail="3D / zaman içi kayıt"/>

        <Stat label="Yüzey Notu" value={annotations.length} detail="3D işaret / annotation"/>
      </UiNode>

      <UiNode as="section" className="twin-hero" style={styles.explainer}>
        <UiNode as="div" style={styles.explainerMain}>
          <UiNode as="p" style={styles.eyebrow}>
            NASIL ÇALIŞIR?
          </UiNode>

          <UiNode as="h2" style={styles.sectionTitle}>
            Hasta → kayıt → tarama
            → karşılaştırma.
          </UiNode>

          <UiNode as="p" style={styles.subtitle}>
            Ana panelden Dental
            Twin&apos;e gir, hastayı seç
            ve tek tıkla o hastanın
            tarama zaman çizelgesine
            geç. Aynı ark için birden
            fazla tarama varsa 3D
            zaman karşılaştırması
            otomatik kullanılabilir.
          </UiNode>
        </UiNode>

        <UiNode as="div" style={styles.steps}>
          <Step number="01" title={uiText("Hasta")} text="Hasta kimliği ve dental kayıt omurgası."/>

          <Step number="02" title="Twin" text="Diş kayıtları, tarama sayısı ve uzun dönem durum."/>

          <Step number="03" title="3D" text="STL/PLY görüntüleme, eski-yeni karşılaştırma ve yüzey notları."/>
        </UiNode>
      </UiNode>

      <UiNode as="section" style={styles.directory}>
        <UiNode as="div" style={styles.sectionHead}>
          <UiNode as="div">
            <UiNode as="p" style={styles.eyebrow}>
              HASTA TWIN&apos;LERİ
            </UiNode>

            <UiNode as="h2" style={styles.sectionTitle}>
              Bir hasta seç
            </UiNode>
          </UiNode>

          <UiNode as="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hasta adı veya referans ara" style={styles.search}/>
        </UiNode>

        <UiNode as="div" style={styles.grid}>
          {filteredPatients.map((patient, index) => {
            const patientScans = scans.filter((scan) => scan.patient_id ===
                patient.id);
            const patientTeeth = toothStatuses.filter((tooth) => tooth.patient_id ===
                patient.id);
            const patientRecords = dentalRecords.filter((record) => record.patient_id ===
                patient.id);
            const scanIds = new Set(patientScans.map((scan) => scan.id));
            const patientAnnotations = annotations.filter((annotation) => scanIds.has(annotation.scan_id));
            const lastScan = patientScans[0] ??
                null;
            const longitudinal = patientScans.length >=
                2;
            return (<UiNode as="article" key={patient.id} className="twin-card" style={{
                    ...styles.card,
                    animationDelay: `${index * 35}ms`,
                }}>
                  <UiNode as="div" style={styles.cardTop}>
                    <UiNode as="div" style={styles.avatar}>
                      {initials(patient)}
                    </UiNode>

                    <UiNode as="div">
                      <UiNode as="div" style={styles.badges}>
                        <UiNode as="span" style={longitudinal
                    ? styles.longitudinal
                    : styles.baseline}>
                          {longitudinal
                    ? "ZAMAN İÇİNDE"
                    : "BAŞLANGIÇ"}
                        </UiNode>

                        {patient.demo_mode && (<UiNode as="span" style={styles.demo}>
                            SENTETİK
                          </UiNode>)}
                      </UiNode>

                      <UiNode as="h3" style={styles.patientName}>
                        <UserText>{patient.first_name}</UserText>{" "}
                        <UserText>{patient.last_name}</UserText>
                      </UiNode>

                      <UiNode as="p" style={styles.reference}>
                        {patient.external_ref ??
                    "Hasta referansı yok"}
                      </UiNode>
                    </UiNode>
                  </UiNode>

                  <UiNode as="div" style={styles.metrics}>
                    <MiniMetric label="Tarama" value={patientScans.length}/>

                    <MiniMetric label="Diş Kaydı" value={patientTeeth.length}/>

                    <MiniMetric label="Zaman Çizelgesi" value={patientRecords.length}/>

                    <MiniMetric label="3D Not" value={patientAnnotations.length}/>
                  </UiNode>

                  <UiNode as="div" style={styles.lastScan}>
                    <UiNode as="span">
                      Son tarama
                    </UiNode>

                    <UiNode as="strong">
                      {lastScan
                    ? formatDate(lastScan.captured_at, intlLocale())
                    : "Henüz yok"}
                    </UiNode>

                    {lastScan && (<UiNode as="small">
                        {archLabel(lastScan.arch)}
                        {" · "}
                        {[
                        lastScan.scanner_brand,
                        lastScan.scanner_model,
                    ]
                        .filter(Boolean)
                        .join(" ") ||
                        "Tarayıcı belirtilmedi"}
                      </UiNode>)}
                  </UiNode>

                  <UiNode as="div" style={styles.cardActions}>
                    <Link href={`/scans?patient=${patient.id}`} style={styles.primaryWide}>
                      Twin Aç →
                    </Link>

                    <Link href="/patients" style={styles.secondaryWide}>
                      Hasta Kaydı
                    </Link>
                  </UiNode>
                </UiNode>);
        })}
        </UiNode>

        {!filteredPatients.length && (<UiNode as="div" style={styles.empty}>
            Hasta bulunamadı.
          </UiNode>)}
      </UiNode>
    </UiNode>);
}
function Stat({ label, value, detail, }: {
    label: string;
    value: number;
    detail: string;
}) {
    const { t: uiText } = useTranslation();
    return (<UiNode as="div" style={styles.stat}>
      <UiNode as="span">{uiText(label)}</UiNode>

      <UiNode as="strong">{value}</UiNode>

      <UiNode as="small">{detail}</UiNode>
    </UiNode>);
}
function Step({ number, title, text, }: {
    number: string;
    title: string;
    text: string;
}) {
    return (<UiNode as="div" style={styles.step}>
      <UiNode as="span" style={styles.stepNumber}>
        {number}
      </UiNode>

      <UiNode as="strong">{title}</UiNode>

      <UiNode as="small">{text}</UiNode>
    </UiNode>);
}
function MiniMetric({ label, value, }: {
    label: string;
    value: number;
}) {
    return (<UiNode data-dy-copy-stack as="div" style={styles.miniMetric}>
      <UiNode as="strong">{value}</UiNode>
      <UiNode as="span">{label}</UiNode>
    </UiNode>);
}
function initials(patient: Patient) {
    return `${patient.first_name[0] ?? ""}${patient.last_name[0] ?? ""}`.toUpperCase();
}
function formatDate(value: string, localeTag: string = "tr-TR") {
    return new Intl.DateTimeFormat(localeTag, {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
}
function archLabel(value: string) {
    const labels: Record<string, string> = {
        upper: "Üst ark",
        lower: "Alt ark",
        full: "Tam ark",
        bite: "Kapanış",
        tooth: "Tek diş",
        other: "Diğer",
    };
    return labels[value] ?? value;
}
const styles: Record<string, CSSProperties> = {
    page: {
        minHeight: "100vh",
        padding: "22px clamp(18px,4vw,54px) 55px",
        background: dy.bg,
        color: dy.text,
        fontFamily: "Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif",
        fontSize: 15,
    },
    center: {
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        color: dy.muted,
    },
    header: {
        maxWidth: 1500,
        margin: "0 auto",
        paddingBottom: 34,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: 28,
        borderBottom: `1px solid ${dy.border}`,
    },
    back: {
        display: "inline-block",
        marginBottom: 24,
        color: dy.muted,
        fontSize: 13,
    },
    eyebrow: {
        margin: 0,
        color: dy.accent,
        fontSize: 13,
        fontWeight: 900,
        letterSpacing: "2.3px",
    },
    title: {
        maxWidth: 850,
        margin: "10px 0 15px",
        fontSize: "clamp(42px,5.8vw,75px)",
        lineHeight: 0.98,
        letterSpacing: "-4px",
    },
    subtitle: {
        maxWidth: 760,
        margin: 0,
        color: dy.muted,
        fontSize: 14,
        lineHeight: 1.75,
    },
    headerActions: {
        display: "flex",
        flexWrap: "wrap",
        gap: 9,
    },
    primary: {
        padding: "12px 15px",
        borderRadius: 10,
        background: dy.accent,
        color: dy.accentContrast,
        fontWeight: 900,
        fontSize: 13,
    },
    secondary: {
        padding: "11px 14px",
        borderRadius: 10,
        background: dy.surface2,
        color: dy.text,
        border: `1px solid ${dy.border}`,
        fontWeight: 800,
        fontSize: 13,
    },
    notice: {
        maxWidth: 1500,
        margin: "18px auto 0",
        padding: "12px 14px",
        border: `1px solid ${dy.border}`,
        borderRadius: 11,
        background: dy.surface2,
        color: dy.muted,
        fontSize: 13,
    },
    stats: {
        maxWidth: 1500,
        margin: "22px auto",
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 10,
    },
    stat: {
        minHeight: 112,
        padding: 17,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        borderRadius: 15,
        background: `linear-gradient(145deg,${dy.surface2},${dy.bg})`,
        border: `1px solid ${dy.border}`,
    },
    explainer: {
        maxWidth: 1500,
        margin: "0 auto 25px",
        padding: 23,
        display: "grid",
        gridTemplateColumns: "minmax(0,1.15fr) minmax(420px,.85fr)",
        gap: 20,
        borderRadius: 18,
        border: `1px solid ${dy.border}`,
        background: `linear-gradient(135deg,${dy.surface},${dy.bg})`,
    },
    explainerMain: {
        padding: 8,
    },
    sectionTitle: {
        margin: "8px 0 10px",
        fontSize: "clamp(24px,3vw,38px)",
        letterSpacing: "-1.5px",
    },
    steps: {
        display: "grid",
        gap: 8,
    },
    step: {
        padding: "13px 14px",
        display: "grid",
        gridTemplateColumns: "42px 110px 1fr",
        alignItems: "center",
        gap: 10,
        borderRadius: 12,
        background: dy.input,
        border: `1px solid ${dy.border}`,
    },
    stepNumber: {
        color: dy.accent,
        fontSize: 13,
        fontWeight: 900,
    },
    directory: {
        maxWidth: 1500,
        margin: "0 auto",
        paddingTop: 26,
        borderTop: `1px solid ${dy.border}`,
    },
    sectionHead: {
        marginBottom: 16,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: 18,
    },
    search: {
        width: "min(390px,100%)",
        minHeight: 43,
        padding: "0 13px",
        borderRadius: 11,
        border: `1px solid ${dy.border}`,
        background: dy.input,
        color: dy.text,
        outline: "none",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(295px,1fr))",
        gap: 11,
    },
    card: {
        minHeight: 350,
        padding: 17,
        display: "flex",
        flexDirection: "column",
        borderRadius: 16,
        background: `linear-gradient(145deg,${dy.surface2},${dy.bg})`,
        border: `1px solid ${dy.border}`,
    },
    cardTop: {
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
    },
    avatar: {
        width: 48,
        height: 48,
        flex: "0 0 48px",
        display: "grid",
        placeItems: "center",
        borderRadius: 14,
        background: dy.accentSoft,
        color: dy.accent,
        fontWeight: 900,
        fontSize: 14,
    },
    badges: {
        minHeight: 20,
        display: "flex",
        flexWrap: "wrap",
        gap: 5,
    },
    longitudinal: {
        padding: "4px 7px",
        borderRadius: 999,
        background: dy.accentSoft,
        color: dy.accent,
        fontSize: 13,
        fontWeight: 900,
        letterSpacing: ".08em",
    },
    baseline: {
        padding: "4px 7px",
        borderRadius: 999,
        background: dy.input,
        color: dy.muted,
        fontSize: 13,
        fontWeight: 900,
        letterSpacing: ".08em",
    },
    demo: {
        padding: "4px 7px",
        borderRadius: 999,
        background: "#2d2413",
        color: "#e5ca87",
        fontSize: 13,
        fontWeight: 900,
    },
    patientName: {
        margin: "8px 0 3px",
        fontSize: 19,
    },
    reference: {
        margin: 0,
        color: dy.muted,
        fontSize: 13,
    },
    metrics: {
        margin: "18px 0",
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 6,
    },
    miniMetric: {
        minHeight: 70,
        padding: 9,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        borderRadius: 10,
        background: dy.input,
        border: `1px solid ${dy.border}`,
    },
    lastScan: {
        marginTop: "auto",
        padding: 13,
        display: "grid",
        gap: 4,
        borderRadius: 11,
        background: dy.input,
        border: `1px solid ${dy.border}`,
    },
    cardActions: {
        marginTop: 11,
        display: "grid",
        gridTemplateColumns: "1.15fr .85fr",
        gap: 7,
    },
    primaryWide: {
        minHeight: 42,
        display: "grid",
        placeItems: "center",
        borderRadius: 10,
        background: dy.accent,
        color: dy.accentContrast,
        fontWeight: 900,
        fontSize: 13,
    },
    secondaryWide: {
        minHeight: 42,
        display: "grid",
        placeItems: "center",
        borderRadius: 10,
        background: dy.surface2,
        color: dy.text,
        border: `1px solid ${dy.border}`,
        fontWeight: 800,
        fontSize: 13,
    },
    empty: {
        minHeight: 180,
        display: "grid",
        placeItems: "center",
        color: dy.muted,
        borderRadius: 15,
        border: `1px dashed ${dy.border}`,
    },
};
