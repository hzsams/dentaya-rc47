"use client";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import UiMessage from "@/lib/i18n/UiMessage";
import UserText from '@/lib/i18n/UserText';
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "@/lib/i18n/UiLink";
import WorkspaceLauncher from "@/app/WorkspaceLauncher";
import { useRouter } from "next/navigation";
import EmptyStateCard from "@/app/EmptyStateCard";
import { supabase } from "@/lib/supabase";
import { dy, useDentayaThemeRuntime } from "@/app/dentaya-theme";
import ScanModelViewer from "./ScanModelViewer";
import ScanCompareViewer from "./ScanCompareViewer";
type ScanSubject = {
    id: string;
    label: string;
    reference: string | null;
    demo_mode: boolean;
};
type Org = {
    id: string;
    name: string;
    org_type: "clinic" | "laboratory" | "courier";
};
type CaseSubject = {
    id: string;
    patient_id: string;
    patient_reference: string;
    case_number: string;
    title: string;
};
type Scan = {
    id: string;
    scan_ref: string;
    patient_id: string;
    case_id: string | null;
    scan_type: string;
    arch: string;
    scanner_brand: string | null;
    scanner_model: string | null;
    captured_at: string;
    file_name: string | null;
    mesh_points: number | null;
    triangle_count: number | null;
    completeness_score: number | null;
    occlusion_rms_mm: number | null;
    shade_reference: string | null;
    metrics: Record<string, unknown> | null;
    notes: string | null;
    demo_mode: boolean;
    storage_bucket: string | null;
    storage_path: string | null;
    scan_origin: "clinic" | "laboratory";
    scan_purpose: string | null;
};
export default function ScansPage() {
    const { t: uiText, intlLocale } = useTranslation();
    useDentayaThemeRuntime();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [org, setOrg] = useState<Org | null>(null);
    const [subjects, setSubjects] = useState<ScanSubject[]>([]);
    const [selectedPatient, setSelectedPatient] = useState("");
    const [scans, setScans] = useState<Scan[]>([]);
    const [notice, setNotice] = useState("");
    const [arch, setArch] = useState("all");
    const [origin, setOrigin] = useState("all");
    const [viewerScan, setViewerScan] = useState<Scan | null>(null);
    const [compareOpen, setCompareOpen] = useState(false);
    useEffect(() => {
        let active = true;
        async function init() {
            const { data: auth } = await supabase.auth.getSession();
            const user = auth.session?.user;
            if (!user) {
                router.replace("/workspace");
                return;
            }
            const { data: m } = await supabase.from("memberships").select("organization_id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
            if (!m) {
                setNotice("Aktif kurum bulunamadı.");
                setLoading(false);
                return;
            }
            const { data: o } = await supabase.from("organizations").select("id,name,org_type").eq("id", m.organization_id).maybeSingle();
            if (!o) {
                setNotice("Kurum bilgisi alınamadı.");
                setLoading(false);
                return;
            }
            const current = o as Org;
            if (!active)
                return;
            setOrg(current);
            if (current.org_type === "courier") {
                setNotice("Tarama Merkezi klinik ve laboratuvar çalışma alanları içindir.");
                setLoading(false);
                return;
            }
            let rows: ScanSubject[] = [];
            if (current.org_type === "clinic") {
                const { data, error } = await supabase.from("patients").select("id,external_ref,first_name,last_name,demo_mode").eq("owning_org_id", current.id).order("created_at", { ascending: false }).limit(300);
                if (error) {
                    setNotice(error.message);
                    setLoading(false);
                    return;
                }
                rows = ((data ?? []) as Array<{
                    id: string;
                    external_ref: string | null;
                    first_name: string;
                    last_name: string;
                    demo_mode: boolean;
                }>).map(p => ({ id: p.id, label: `${p.first_name} ${p.last_name}`.trim(), reference: p.external_ref, demo_mode: p.demo_mode }));
            }
            else {
                const { data, error } = await supabase.from("cases").select("id,patient_id,patient_reference,case_number,title").eq("lab_org_id", current.id).neq("status", "cancelled").order("updated_at", { ascending: false }).limit(300);
                if (error) {
                    setNotice(error.message);
                    setLoading(false);
                    return;
                }
                const caseRows = (data ?? []) as CaseSubject[];
                const seen = new Set<string>();
                rows = caseRows.filter(c => {
                    if (seen.has(c.patient_id))
                        return false;
                    seen.add(c.patient_id);
                    return true;
                }).map(c => ({ id: c.patient_id, label: c.patient_reference, reference: `${c.case_number} · ${c.title}`, demo_mode: false }));
            }
            if (!active)
                return;
            setSubjects(rows);
            const requested = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("patient") ?? "" : "";
            setSelectedPatient(rows.some(x => x.id === requested) ? requested : (rows.find(x => x.demo_mode)?.id ?? rows[0]?.id ?? ""));
            setLoading(false);
        }
        void init();
        return () => { active = false; };
    }, [router]);
    useEffect(() => {
        if (!selectedPatient) {
            setScans([]);
            return;
        }
        void loadScans(selectedPatient);
    }, [selectedPatient]);
    async function loadScans(patientId: string) {
        const { data, error } = await supabase.from("scan_sessions").select("id,scan_ref,patient_id,case_id,scan_type,arch,scanner_brand,scanner_model,captured_at,file_name,mesh_points,triangle_count,completeness_score,occlusion_rms_mm,shade_reference,metrics,notes,demo_mode,storage_bucket,storage_path,scan_origin,scan_purpose").eq("patient_id", patientId).order("captured_at", { ascending: false }).limit(500);
        if (error) {
            setNotice(error.message);
            return;
        }
        setScans((data ?? []) as Scan[]);
    }
    const subject = subjects.find(x => x.id === selectedPatient) ?? null;
    const filtered = useMemo(() => scans.filter(x => (arch === "all" || x.arch === arch) && (origin === "all" || x.scan_origin === origin)), [scans, arch, origin]);
    const comparison = useMemo(() => {
        if (filtered.length < 2)
            return null;
        const newest = filtered[0];
        const older = filtered.find(x => x.arch === newest.arch && x.id !== newest.id) ?? filtered[1];
        return { newest, older };
    }, [filtered]);
    if (loading) return <LoadingExperience title="Tarama verileri yükleniyor…"/>;
    return <UiNode as="main" style={s.page}>
    <WorkspaceLauncher />
    <style>{`*{box-sizing:border-box}@keyframes scanIn{from{opacity:0;transform:translateY(var(--dy-motion-distance,8px))}to{opacity:1;transform:none}}.scan-card{animation:scanIn var(--dy-motion-normal,240ms) ease both;transition:transform var(--dy-motion-fast,150ms) ease,border-color var(--dy-motion-fast,150ms) ease}.scan-card:hover{transform:translateY(-2px);border-color:var(--dy-accent,#6de2cf)!important}@media(max-width:950px){.scan-layout{grid-template-columns:1fr!important}.scan-stats{grid-template-columns:repeat(2,minmax(0,1fr))!important}} @media(max-width:780px){.scan-toolbar{grid-template-columns:1fr!important}} @media(max-width:560px){.scan-stats{grid-template-columns:1fr!important}.scan-card{padding:12px!important}}`}</style>
    <UiNode as="header" style={s.header}><UiNode as="div"><Link href={org?.org_type === "laboratory" ? "/lab" : "/clinic"} style={s.back}>← {org?.org_type === "laboratory" ? "Laboratuvar Merkezi" : "Klinik Merkezi"}</Link><UiNode as="p" style={s.eyebrow}>3D TARAMA VERİLERİ</UiNode><UiNode as="h1" style={s.title}>Tarama Merkezi</UiNode><UiNode as="p" style={s.sub}>{org?.org_type === "laboratory" ? "Klinikten gelen ve laboratuvarda üretilen ana model, karşıt çene, kapanış, preparasyon ve referans taramalarını aynı vaka zincirinde görüntüle." : "Ağız içi taramaları zaman içinde karşılaştır; klinik ve laboratuvar kaynaklarını ve 3D modelleri tek ekranda izle."}</UiNode></UiNode><UiNode as="div" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Link href="/scan-studio" style={s.primaryScan}>+ Yeni Tarama</Link>{org?.org_type === "laboratory" ? <Link href="/design" style={s.secondary}>DentAYA Design</Link> : <Link href="/patients" style={s.secondary}>{uiText("Hastalar")}</Link>}</UiNode></UiNode>
    {notice && <UiNode as="div" style={s.notice}>{notice}</UiNode>}
    <UiNode as="section" className="scan-toolbar" style={s.toolbar}><UiNode as="label"><UiNode as="span" style={s.label}>{org?.org_type === "laboratory" ? "Vaka / Hasta Ref" : uiText("Hasta")}</UiNode><UiNode as="select" value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)} style={s.input}>{subjects.map(p => <UiNode as="option" key={p.id} value={p.id}><UserText>{p.label}</UserText>{p.demo_mode ? " · Demo" : ""}</UiNode>)}</UiNode></UiNode><UiNode as="label"><UiNode as="span" style={s.label}>Ark / Bölge</UiNode><UiNode as="select" value={arch} onChange={e => setArch(e.target.value)} style={s.input}><UiNode as="option" value="all">Tüm bölgeler</UiNode><UiNode as="option" value="upper">Üst ark</UiNode><UiNode as="option" value="lower">Alt ark</UiNode><UiNode as="option" value="full">Tam ark</UiNode><UiNode as="option" value="bite">Kapanış</UiNode><UiNode as="option" value="tooth">Tek diş</UiNode></UiNode></UiNode><UiNode as="label"><UiNode as="span" style={s.label}>Kaynak</UiNode><UiNode as="select" value={origin} onChange={e => setOrigin(e.target.value)} style={s.input}><UiNode as="option" value="all">Klinik + Laboratuvar</UiNode><UiNode as="option" value="clinic">{uiText("Klinik")}</UiNode><UiNode as="option" value="laboratory">{uiText("Laboratuvar")}</UiNode></UiNode></UiNode><UiNode as="div" style={s.patientTag}><UiNode as="span">Aktif bağlam</UiNode><UiNode as="strong"><UserText>{subject?.label ?? "—"}</UserText></UiNode><UiNode as="small"><UserText>{subject?.reference ?? ""}</UserText></UiNode></UiNode></UiNode>

    {comparison && <UiNode as="section" style={s.compare}>
      <UiNode as="div"><UiNode as="p" style={s.eyebrow}>ZAMAN İÇİNDE KARŞILAŞTIRMA</UiNode><UiNode as="h2" style={s.h2}>{archLabel(comparison.newest.arch)} · son iki tarama</UiNode><UiNode as="p" style={s.sub}>Aynı ark/bölge için yeni ve önceki kayıt arasındaki teknik değişim.</UiNode>{comparison.newest.storage_path && comparison.older.storage_path && <UiNode as="button" type="button" onClick={() => setCompareOpen(true)} style={s.compare3dButton}>◫ 3D Karşılaştır</UiNode>}</UiNode>
      <UiNode as="div" className="scan-stats" style={s.compareGrid}>
        <Delta label="Tarama bütünlüğü" oldValue={comparison.older.completeness_score} newValue={comparison.newest.completeness_score} unit="%" inverse={false}/>
        <Delta label="Oklüzyon RMS" oldValue={comparison.older.occlusion_rms_mm} newValue={comparison.newest.occlusion_rms_mm} unit=" mm" inverse/>
        <Delta label="Mesh noktası" oldValue={comparison.older.mesh_points} newValue={comparison.newest.mesh_points} unit="" inverse={false}/>
        <UiNode as="div" style={s.stat}><UiNode as="span">Süre</UiNode><UiNode as="strong">{daysBetween(comparison.older.captured_at, comparison.newest.captured_at)} gün</UiNode><UiNode as="small">iki tarama arası</UiNode></UiNode>
      </UiNode>
    </UiNode>}

    <UiNode as="div" className="scan-layout" style={s.layout}>
      <UiNode as="section" style={s.timeline}>
        <UiNode as="div" style={s.sectionHead}><UiNode as="h2" style={s.h2}>Tarama Zaman Çizelgesi</UiNode><UiNode as="span">{filtered.length} kayıt</UiNode></UiNode>
        {filtered.map((scan, i) => <UiNode as="article" key={scan.id} className="scan-card" style={{ ...s.card, animationDelay: `${i * 35}ms` }}>
          <UiNode as="div" style={s.cardTop}><UiNode as="div"><UiNode as="div" style={s.badges}><UiNode as="span" style={s.archBadge}>{archLabel(scan.arch)}</UiNode><UiNode as="span" style={scan.scan_origin === "laboratory" ? s.labOrigin : s.clinicOrigin}>{scan.scan_origin === "laboratory" ? "LAB TARAMASI" : "KLİNİK TARAMASI"}</UiNode>{scan.scan_purpose && <UiNode as="span" style={s.purpose}>{purposeLabel(scan.scan_purpose)}</UiNode>}{scan.demo_mode && <UiNode as="span" style={s.demo}>SENTETİK DEMO</UiNode>}</UiNode><UiNode as="h3" style={s.scanTitle}><UserText>{scan.scan_ref}</UserText></UiNode><UiNode as="div" style={s.meta}>{fmt(scan.captured_at, intlLocale())} · {[scan.scanner_brand, scan.scanner_model].filter(Boolean).join(" ") || "Tarayıcı belirtilmedi"}</UiNode></UiNode><UiNode as="div" style={s.quality}><UiNode as="strong">{scan.completeness_score != null ? <UiMessage source="%{0}" values={[scan.completeness_score]} userValues={[]}/> : "—"}</UiNode><UiNode as="span">bütünlük</UiNode></UiNode></UiNode>
          <UiNode as="div" className="scan-stats" style={s.metrics}><Metric label="RMS" value={scan.occlusion_rms_mm != null ? `${scan.occlusion_rms_mm} mm` : "—"}/><Metric label="Mesh" value={scan.mesh_points ? number(scan.mesh_points, intlLocale()) : "—"}/><Metric label="Üçgen" value={scan.triangle_count ? number(scan.triangle_count, intlLocale()) : "—"}/><Metric label={uiText("Renk")} value={scan.shade_reference ?? "—"}/></UiNode>
          {scan.file_name && <UiNode as="div" style={s.fileRow}><UiNode as="div" style={s.file}>◫ <UserText>{scan.file_name}</UserText></UiNode><UiNode as="div" style={s.fileActions}>{scan.storage_path && <UiNode as="button" type="button" onClick={() => setViewerScan(scan)} style={s.viewerButton}>3D Aç</UiNode>}{org?.org_type === "laboratory" && scan.case_id && <Link href={`/design?case=${scan.case_id}`} style={s.designLink}>CAD ile Aç</Link>}</UiNode></UiNode>}
          <MetricJson metrics={scan.metrics}/>
          {scan.notes && <UiNode as="p" style={s.notes}><UserText>{scan.notes}</UserText></UiNode>}
        </UiNode>)}
        {!filtered.length && (<EmptyStateCard eyebrow="3D TARAMA" title={scans.length === 0 ? "Henüz tarama kaydı yok" : "Bu filtrede tarama yok"} description={scans.length === 0
                ? "Yeni Tarama ile STL / PLY dosyasını hasta veya vakaya bağla. Sonraki kayıtlar burada zaman çizelgesi oluşturur."
                : "Ark veya kaynak filtresini değiştirerek diğer taramaları görüntüleyebilirsin."} actionLabel={scans.length === 0 ? "Yeni Tarama" : "Filtreleri Temizle"} {...(scans.length === 0
            ? { actionHref: `/scan-studio${selectedPatient ? `?patient=${selectedPatient}` : ""}` }
            : { onAction: () => { setArch("all"); setOrigin("all"); } })} secondaryLabel="Başlangıç Rehberi" secondaryHref="/start"/>)}
      </UiNode>
      <UiNode as="aside" style={s.side}><UiNode as="h3" style={s.sideTitle}>3D veri omurgası</UiNode><UiNode as="p" style={s.sideText}>Her tarama; kaynak kurum, amaç, tarayıcı, zaman, mesh yoğunluğu, bütünlük ve vaka bağlantısıyla saklanır. Böylece klinik ve laboratuvar aynı modelin hangi aşamada üretildiğini kaybetmez.</UiNode><UiNode data-dy-copy-stack as="div" style={s.sideBox}><UiNode as="strong">3D Zaman Karşılaştırması</UiNode><UiNode as="span">Son iki aynı-ark taramasını yan yana veya üst üste aç. Üst üste görünüm görsel önizlemedir; klinik yüzey registrasyonu/ölçümü olarak kullanılmaz.</UiNode></UiNode><UiNode data-dy-copy-stack as="div" style={s.sideBox}><UiNode as="strong">Güvenlik</UiNode><UiNode as="span">Demo kayıtları SENTETİK DEMO etiketiyle ayrılır. Gerçek taramalar hasta/kurum yetkisi üzerinden RLS ile görünür.</UiNode></UiNode></UiNode>
    </UiNode>
    {viewerScan && viewerScan.storage_path && <ScanModelViewer scanId={viewerScan.id} bucket={viewerScan.storage_bucket} path={viewerScan.storage_path} fileName={viewerScan.file_name ?? viewerScan.scan_ref} scanRef={viewerScan.scan_ref} demoMode={viewerScan.demo_mode} onClose={() => setViewerScan(null)}/>}
    {compareOpen && comparison && comparison.older.storage_path && comparison.newest.storage_path && <ScanCompareViewer older={{ bucket: comparison.older.storage_bucket, path: comparison.older.storage_path, fileName: comparison.older.file_name ?? comparison.older.scan_ref, scanRef: comparison.older.scan_ref, capturedAt: comparison.older.captured_at, demoMode: comparison.older.demo_mode }} newer={{ bucket: comparison.newest.storage_bucket, path: comparison.newest.storage_path, fileName: comparison.newest.file_name ?? comparison.newest.scan_ref, scanRef: comparison.newest.scan_ref, capturedAt: comparison.newest.captured_at, demoMode: comparison.newest.demo_mode }} onClose={() => setCompareOpen(false)}/>}
  </UiNode>;
}
function Metric({ label, value }: {
    label: string;
    value: string;
}) {
    const { t: uiText } = useTranslation();
    return <UiNode as="div" style={s.stat}><UiNode as="span">{uiText(label)}</UiNode><UiNode as="strong">{value}</UiNode></UiNode>;
}
function Delta({ label, oldValue, newValue, unit, inverse }: {
    label: string;
    oldValue: number | null;
    newValue: number | null;
    unit: string;
    inverse: boolean;
}) { const valid = oldValue != null && newValue != null; const d = valid ? newValue! - oldValue! : 0; const good = valid && (inverse ? d < 0 : d > 0); return <UiNode as="div" style={s.stat}><UiNode as="span">{label}</UiNode><UiNode as="strong">{valid ? <UiMessage source="{0}{1}" values={[newValue, unit]} userValues={[]}/> : "—"}</UiNode>{valid && <UiNode as="small" style={{ color: Math.abs(d) < .0001 ? dy.muted : good ? "#6fe0a3" : "#eed690" }}>{d > 0 ? "+" : ""}{Number.isInteger(d) ? d : d.toFixed(3)}{unit} vs önceki</UiNode>}</UiNode>; }
function MetricJson({ metrics }: {
    metrics: Record<string, unknown> | null;
}) {
    if (!metrics || !Object.keys(metrics).length)
        return null;
    return <UiNode as="div" style={s.metricJson}>{Object.entries(metrics).slice(0, 8).map(([k, v]) => <UiNode as="div" key={k}><UiNode as="span">{prettyKey(k)}</UiNode><UiNode as="strong">{String(v)}</UiNode></UiNode>)}</UiNode>;
}
function prettyKey(k: string) { return k.replaceAll("_", " ").replace(/\b\w/g, m => m.toUpperCase()); }
function purposeLabel(v: string) {
    return ({
        clinical: "Klinik",
        intraoral: "Ağız içi",
        preop: "Tedavi öncesi",
        working_model: "Çalışma modeli",
        master_model: "Ana model",
        antagonist: "Karşıt çene",
        bite: "Kapanış",
        die: "Preparasyon",
        waxup: "Mum model",
        verification: "Doğrulama",
        design_reference: "Tasarım referansı",
        other: "Diğer"
    } as Record<string, string>)[v] ?? v.replaceAll("_", " ");
}
function archLabel(v: string) { return ({ upper: "Üst ark", lower: "Alt ark", bite: "Kapanış", full: "Tam ark", tooth: "Tek diş", other: "Diğer" } as Record<string, string>)[v] ?? v; }
function fmt(v: string, localeTag: string = "tr-TR") {
    try {
        return new Intl.DateTimeFormat(localeTag, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(v));
    }
    catch {
        return v;
    }
}
function number(v: number, localeTag: string = "tr-TR") { return new Intl.NumberFormat(localeTag).format(v); }
function daysBetween(a: string, b: string) { return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)); }
const s: Record<string, CSSProperties> = {
    page: { minHeight: "100vh", background: dy.bg, color: dy.text, padding: "clamp(18px,3vw,42px)", fontFamily: "Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", fontSize: 15 }, center: { maxWidth: 700, margin: "100px auto", padding: 25, border: `1px solid ${dy.border}`, borderRadius: 20, background: dy.surface, textAlign: "center" }, header: { maxWidth: 1320, margin: "0 auto 20px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20 }, back: { color: dy.muted, textDecoration: "none", fontSize: 14 }, eyebrow: { color: dy.accent, fontWeight: 850, letterSpacing: ".17em", fontSize: 14, margin: "15px 0 7px" }, title: { fontSize: "clamp(32px,5vw,56px)", lineHeight: 1, letterSpacing: "-.04em", margin: "0 0 10px" }, h2: { fontSize: 22, margin: "0 0 7px" }, sub: { color: dy.muted, lineHeight: 1.6, maxWidth: 820, margin: 0 }, primaryScan: { padding: "10px 14px", borderRadius: 12, background: dy.accent, color: dy.accentContrast, textDecoration: "none", fontWeight: 850, border: `1px solid ${dy.accent}` }, secondary: { padding: "10px 14px", borderRadius: 12, background: dy.surface, color: dy.text, textDecoration: "none", fontWeight: 750, border: `1px solid ${dy.border}` }, notice: { maxWidth: 1320, margin: "0 auto 14px", padding: 11, borderRadius: 12, border: `1px solid ${dy.border}`, background: dy.surface2 }, toolbar: { maxWidth: 1320, margin: "0 auto 14px", display: "grid", gridTemplateColumns: "minmax(220px,1fr) minmax(150px,.55fr) minmax(150px,.55fr) minmax(190px,.65fr)", gap: 10, padding: 12, border: `1px solid ${dy.border}`, background: dy.surface, borderRadius: 17 }, label: { display: "block", fontSize: 14, color: dy.muted, margin: "0 0 5px 2px", fontWeight: 750 }, input: { width: "100%", minHeight: 42, borderRadius: 11, border: `1px solid ${dy.border}`, background: dy.input, color: dy.text, padding: "0 11px" }, patientTag: { border: `1px solid ${dy.border}`, background: dy.surface2, borderRadius: 12, padding: "7px 10px", display: "grid" }, compare: { maxWidth: 1320, margin: "0 auto 14px", padding: 18, border: `1px solid ${dy.border}`, borderRadius: 20, background: `linear-gradient(135deg, ${dy.surface}, ${dy.accentSoft})`, display: "grid", gridTemplateColumns: "minmax(240px,.8fr) minmax(0,1.5fr)", gap: 18, alignItems: "center" }, compareGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }, compare3dButton: { marginTop: 12, minHeight: 39, padding: "0 13px", borderRadius: 11, border: `1px solid ${dy.accent}`, background: dy.accentSoft, color: dy.accent, fontWeight: 850, cursor: "pointer" }, layout: { maxWidth: 1320, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 14, alignItems: "start" }, timeline: { display: "grid", gap: 11 }, sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "center", color: dy.muted }, card: { padding: 18, borderRadius: 19, border: `1px solid ${dy.border}`, background: dy.surface, boxShadow: `0 8px 24px ${dy.shadow}` }, cardTop: { display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }, badges: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 7 }, archBadge: { fontSize: 14, fontWeight: 850, padding: "4px 7px", borderRadius: 999, background: dy.accentSoft, color: dy.accent }, demo: { fontSize: 14, fontWeight: 850, padding: "4px 7px", borderRadius: 999, background: "#292313", color: "#eed690" }, labOrigin: { fontSize: 14, fontWeight: 900, padding: "4px 7px", borderRadius: 999, background: "color-mix(in srgb, #5f8cff 18%, transparent)", color: "#8eacff" }, clinicOrigin: { fontSize: 14, fontWeight: 900, padding: "4px 7px", borderRadius: 999, background: dy.accentSoft, color: dy.accent }, purpose: { fontSize: 14, fontWeight: 850, padding: "4px 7px", borderRadius: 999, background: dy.input, color: dy.muted }, scanTitle: { margin: "0 0 4px", fontSize: 19 }, meta: { fontSize: 14, color: dy.muted }, quality: { padding: "8px 10px", borderRadius: 12, border: `1px solid ${dy.border}`, background: dy.surface2, textAlign: "right", display: "grid" }, metrics: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 13 }, stat: { padding: "9px 10px", borderRadius: 12, border: `1px solid ${dy.border}`, background: dy.surface2, display: "grid", gap: 3 }, fileRow: { marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }, fileActions: { display: "flex", gap: 7, flexWrap: "wrap" }, file: { padding: "8px 10px", borderRadius: 10, background: dy.input, color: dy.muted, fontSize: 14 }, viewerButton: { minHeight: 38, padding: "0 12px", borderRadius: 10, border: `1px solid ${dy.border}`, background: dy.accentSoft, color: dy.accent, fontWeight: 850, cursor: "pointer", fontSize: 14 }, designLink: { minHeight: 38, display: "grid", placeItems: "center", padding: "0 12px", borderRadius: 10, background: dy.accent, color: dy.accentContrast, textDecoration: "none", fontWeight: 900, fontSize: 14 }, metricJson: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 7, marginTop: 10 }, notes: { margin: "10px 0 0", color: dy.muted, lineHeight: 1.55, fontSize: 14 }, side: { position: "sticky", top: 16, padding: 18, borderRadius: 19, border: `1px solid ${dy.border}`, background: dy.surface }, sideTitle: { margin: "0 0 8px" }, sideText: { color: dy.muted, lineHeight: 1.6, fontSize: 14 }, sideBox: { display: "grid", gap: 5, padding: 11, borderRadius: 12, border: `1px solid ${dy.border}`, background: dy.surface2, marginTop: 9, fontSize: 14, color: dy.muted }, empty: { padding: 22, textAlign: "center", border: `1px dashed ${dy.border}`, borderRadius: 15, color: dy.muted },
};
