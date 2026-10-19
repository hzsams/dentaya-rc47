"use client";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import UiMessage from "@/lib/i18n/UiMessage";
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "@/lib/i18n/UiLink";
import WorkspaceLauncher from "@/app/WorkspaceLauncher";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { dy, useDentayaThemeRuntime } from "@/app/dentaya-theme";
type LabProfile = {
    organization_id: string;
    description: string | null;
    city: string | null;
    district: string | null;
    specialties: string[];
    turnaround_days: number | null;
    accepts_new_cases: boolean;
    website: string | null;
    contact_email: string | null;
    services: string[];
    supported_materials: string[];
    software_stack: string[];
    delivery_regions: string[];
    supports_express: boolean;
    pickup_available: boolean;
    verification_status: "unverified" | "profile_verified" | "pilot_verified";
    demo_rating: number | null;
    demo_review_count: number;
};
type Lab = LabProfile & {
    id: string;
    name: string;
    demo_mode: boolean;
};
type CurrentOrg = {
    id: string;
    name: string;
    org_type: "clinic" | "laboratory" | "courier";
};
export default function LabsPage() {
    const { t: uiText } = useTranslation();
    useDentayaThemeRuntime();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [labs, setLabs] = useState<Lab[]>([]);
    const [currentOrg, setCurrentOrg] = useState<CurrentOrg | null>(null);
    const [userId, setUserId] = useState("");
    const [search, setSearch] = useState("");
    const [city, setCity] = useState("all");
    const [specialty, setSpecialty] = useState("all");
    const [expressOnly, setExpressOnly] = useState(false);
    const [sort, setSort] = useState<"recommended" | "fastest" | "name">("recommended");
    const [busyLab, setBusyLab] = useState("");
    const [message, setMessage] = useState("");
    useEffect(() => {
        let active = true;
        async function init() {
            const { data: authData } = await supabase.auth.getSession();
            const user = authData.session?.user;
            if (!user) {
                router.replace("/workspace");
                return;
            }
            setUserId(user.id);
            const { data: membership } = await supabase
                .from("memberships")
                .select("organization_id")
                .eq("user_id", user.id)
                .eq("status", "active")
                .limit(1)
                .maybeSingle();
            if (!membership) {
                setMessage("Aktif kurum bulunamadı.");
                setLoading(false);
                return;
            }
            const { data: org } = await supabase
                .from("organizations")
                .select("id,name,org_type")
                .eq("id", membership.organization_id)
                .maybeSingle();
            if (!org) {
                setMessage("Kurum bilgisi alınamadı.");
                setLoading(false);
                return;
            }
            const typedOrg = org as CurrentOrg;
            if (typedOrg.org_type !== "clinic") {
                router.replace("/lab");
                return;
            }
            if (!active)
                return;
            setCurrentOrg(typedOrg);
            await loadLabs();
            setLoading(false);
        }
        void init();
        return () => { active = false; };
    }, [router]);
    async function loadLabs() {
        const [{ data: orgRows, error: orgError }, { data: profileRows, error: profileError }] = await Promise.all([
            supabase
                .from("organizations")
                .select("id,name,org_type,demo_mode,directory_visible")
                .eq("org_type", "laboratory")
                .eq("directory_visible", true)
                .order("name").limit(150),
            supabase
                .from("lab_profiles")
                .select("organization_id,description,city,district,specialties,turnaround_days,accepts_new_cases,website,contact_email,services,supported_materials,software_stack,delivery_regions,supports_express,pickup_available,verification_status,demo_rating,demo_review_count").limit(150),
        ]);
        if (orgError || profileError) {
            setMessage(orgError?.message ?? profileError?.message ?? "Laboratuvar dizini yüklenemedi.");
            return;
        }
        const typedProfiles = (profileRows ?? []) as LabProfile[];
        const profileMap = new Map<string, LabProfile>(typedProfiles.map((p) => [p.organization_id, p]));
        const rows: Lab[] = (orgRows ?? []).map((o) => {
            const profile = profileMap.get(o.id);
            return {
                id: o.id,
                name: o.name,
                demo_mode: Boolean(o.demo_mode),
                organization_id: o.id,
                description: profile?.description ?? null,
                city: profile?.city ?? null,
                district: profile?.district ?? null,
                specialties: profile?.specialties ?? [],
                turnaround_days: profile?.turnaround_days ?? null,
                accepts_new_cases: profile?.accepts_new_cases ?? true,
                website: profile?.website ?? null,
                contact_email: profile?.contact_email ?? null,
                services: profile?.services ?? [],
                supported_materials: profile?.supported_materials ?? [],
                software_stack: profile?.software_stack ?? [],
                delivery_regions: profile?.delivery_regions ?? [],
                supports_express: profile?.supports_express ?? false,
                pickup_available: profile?.pickup_available ?? false,
                verification_status: profile?.verification_status ?? "unverified",
                demo_rating: profile?.demo_rating ?? null,
                demo_review_count: profile?.demo_review_count ?? 0,
            };
        });
        setLabs(rows);
    }
    const cities = useMemo(() => [...new Set(labs.map((x) => x.city).filter(Boolean) as string[])].sort(), [labs]);
    const specialties = useMemo(() => [...new Set(labs.flatMap((x) => [...x.specialties, ...x.services]))].sort(), [labs]);
    const filtered = useMemo(() => {
        const needle = search.trim().toLocaleLowerCase("tr-TR");
        const result = labs.filter((lab) => {
            if (city !== "all" && lab.city !== city)
                return false;
            if (specialty !== "all" && ![...lab.specialties, ...lab.services].includes(specialty))
                return false;
            if (expressOnly && !lab.supports_express)
                return false;
            if (!needle)
                return true;
            const hay = [lab.name, lab.description, lab.city, lab.district, ...lab.specialties, ...lab.services, ...lab.supported_materials, ...lab.software_stack]
                .filter(Boolean).join(" ").toLocaleLowerCase("tr-TR");
            return hay.includes(needle);
        });
        return result.sort((a, b) => {
            if (sort === "fastest")
                return (a.turnaround_days ?? 999) - (b.turnaround_days ?? 999);
            if (sort === "name")
                return a.name.localeCompare(b.name, "tr");
            const scoreA = (a.demo_rating ?? 0) * 10 - (a.turnaround_days ?? 10) + (a.supports_express ? 2 : 0) + (a.verification_status !== "unverified" ? 2 : 0);
            const scoreB = (b.demo_rating ?? 0) * 10 - (b.turnaround_days ?? 10) + (b.supports_express ? 2 : 0) + (b.verification_status !== "unverified" ? 2 : 0);
            return scoreB - scoreA;
        });
    }, [labs, search, city, specialty, expressOnly, sort]);
    async function openConversation(lab: Lab) {
        if (!currentOrg || currentOrg.org_type !== "clinic")
            return;
        setBusyLab(lab.id);
        setMessage("");
        const { data, error } = await supabase
            .from("organization_conversations")
            .upsert({
            clinic_org_id: currentOrg.id,
            lab_org_id: lab.id,
            status: "active",
            created_by: userId || null,
            updated_at: new Date().toISOString(),
        }, { onConflict: "clinic_org_id,lab_org_id" })
            .select("id")
            .single();
        setBusyLab("");
        if (error) {
            setMessage(error.message);
            return;
        }
        router.push(`/messages?conversation=${data.id}`);
    }
    if (loading) return <LoadingExperience title="Laboratuvar dizini yükleniyor…"/>;
    return (<UiNode as="main" style={styles.page}>
      <WorkspaceLauncher />
      <style>{`
        *{box-sizing:border-box}
        @keyframes dyEnter{from{opacity:0;transform:translateY(var(--dy-motion-distance,8px))}to{opacity:1;transform:none}}
        .dy-enter{animation:dyEnter var(--dy-motion-normal,240ms) ease both}
        .lab-card{transition:transform var(--dy-motion-fast,150ms) ease,border-color var(--dy-motion-fast,150ms) ease,box-shadow var(--dy-motion-fast,150ms) ease}
        .lab-card:hover{transform:translateY(-3px);border-color:var(--dy-accent,#6de2cf)!important;box-shadow:0 18px 45px var(--dy-shadow,rgba(0,0,0,.28))}
        .dy-btn{transition:transform var(--dy-motion-fast,150ms) ease,opacity var(--dy-motion-fast,150ms) ease,background var(--dy-motion-fast,150ms) ease}
        .dy-btn:hover{transform:translateY(-1px)}
        @media(max-width:800px){.lab-toolbar{grid-template-columns:1fr!important}.lab-grid{grid-template-columns:1fr!important}.lab-header{flex-direction:column!important;align-items:flex-start!important}}
      `}</style>

      <UiNode as="header" className="lab-header dy-enter" style={styles.header}>
        <UiNode as="div">
          <Link href="/clinic" style={styles.back}>← Klinik Merkezi</Link>
          <UiNode as="p" style={styles.eyebrow}>LABORATUVAR AĞI</UiNode>
          <UiNode as="h1" style={styles.title}>Laboratuvar Bul</UiNode>
          <UiNode as="p" style={styles.sub}>Uzmanlık, materyal, yazılım, teslim süresi ve express kapasitesine göre laboratuvar ara. Vaka açmadan önce doğrudan mesajlaş.</UiNode>
        </UiNode>
        <UiNode as="div" style={styles.headerButtons}>
          <Link className="dy-btn" href="/messages" style={styles.secondaryButton}>{uiText("Mesajlar")}</Link>
          <Link className="dy-btn" href="/cases" style={styles.primaryButton}>{uiText("Vakalar")}</Link>
        </UiNode>
      </UiNode>

      {message && <UiNode as="div" style={styles.notice}>{message}</UiNode>}

      <UiNode as="section" className="lab-toolbar dy-enter" style={styles.toolbar}>
        <UiNode as="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Lab, uzmanlık, materyal veya yazılım ara" style={styles.input}/>
        <UiNode as="select" value={city} onChange={(e) => setCity(e.target.value)} style={styles.input}>
          <UiNode as="option" value="all">Tüm şehirler</UiNode>{cities.map((x) => <UiNode as="option" key={x} value={x}>{x}</UiNode>)}
        </UiNode>
        <UiNode as="select" value={specialty} onChange={(e) => setSpecialty(e.target.value)} style={styles.input}>
          <UiNode as="option" value="all">Tüm uzmanlıklar</UiNode>{specialties.map((x) => <UiNode as="option" key={x} value={x}>{x}</UiNode>)}
        </UiNode>
        <UiNode as="select" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} style={styles.input}>
          <UiNode as="option" value="recommended">Önerilen</UiNode><UiNode as="option" value="fastest">En hızlı</UiNode><UiNode as="option" value="name">Ada göre</UiNode>
        </UiNode>
        <UiNode as="label" style={styles.checkLabel}><UiNode as="input" type="checkbox" checked={expressOnly} onChange={(e) => setExpressOnly(e.target.checked)}/> Express</UiNode>
      </UiNode>

      <UiNode as="div" style={styles.countLine}><UiNode as="strong">{filtered.length}</UiNode> laboratuvar gösteriliyor <UiNode as="span">•</UiNode> {labs.filter((x) => x.accepts_new_cases).length} tanesi yeni vaka kabul ediyor</UiNode>

      <UiNode as="section" className="lab-grid" style={styles.grid}>
        {filtered.map((lab, i) => (<UiNode as="article" key={lab.id} className="lab-card dy-enter" style={{ ...styles.card, animationDelay: `${Math.min(i, 8) * 35}ms` }}>
            <UiNode as="div" style={styles.cardTop}>
              <UiNode as="div">
                <UiNode as="div" style={styles.badgeRow}>
                  {lab.verification_status !== "unverified" && <UiNode as="span" style={styles.verified}>✓ Profil doğrulandı</UiNode>}
                  {lab.demo_mode && <UiNode as="span" style={styles.demoBadge}>SENTETİK DEMO</UiNode>}
                  {lab.supports_express && <UiNode as="span" style={styles.expressBadge}>HIZLI</UiNode>}
                </UiNode>
                <UiNode as="h2" style={styles.labName}><UserText>{lab.name}</UserText></UiNode>
                <UiNode as="div" style={styles.location}><UserText>{[lab.district, lab.city].filter(Boolean).join(" · ") || uiText("Konum belirtilmedi")}</UserText></UiNode>
              </UiNode>
              <UiNode data-dy-copy-stack as="div" style={styles.scoreBox}>
                <UiNode as="strong">{lab.demo_rating ? lab.demo_rating.toFixed(1) : "—"}</UiNode>
                <UiNode as="span">{lab.demo_rating ? <UiMessage source="★ · {0} demo" values={[lab.demo_review_count]} userValues={[]}/> : "puan yok"}</UiNode>
              </UiNode>
            </UiNode>

            <UiNode as="p" style={styles.description}>{lab.description ?? "Laboratuvar profil bilgileri güncelleniyor."}</UiNode>

            <UiNode as="div" style={styles.metrics}>
              <Metric label="Teslim" value={lab.turnaround_days ? `${lab.turnaround_days} gün` : "—"}/>
              <Metric label={uiText("Yeni vaka")} value={lab.accepts_new_cases ? "Açık" : "Kapalı"}/>
              <Metric label="Alım" value={lab.pickup_available ? "Var" : "Yok"}/>
            </UiNode>

            <ChipGroup label="Uzmanlık" values={lab.specialties}/>
            <ChipGroup label="Materyal" values={lab.supported_materials}/>
            <ChipGroup label="Dijital altyapı" values={lab.software_stack}/>

            <UiNode as="div" style={styles.actions}>
              {currentOrg?.org_type === "clinic" ? (<UiNode as="button" className="dy-btn" type="button" onClick={() => openConversation(lab)} disabled={busyLab === lab.id} style={styles.primaryButton}>
                  {busyLab === lab.id ? "Açılıyor…" : "Mesaj Gönder"}
                </UiNode>) : (<Link className="dy-btn" href="/messages" style={styles.primaryButton}>{uiText("Mesajlar")}</Link>)}
              <Link className="dy-btn" href="/cases" style={styles.secondaryButton}>Vaka Ekranı</Link>
            </UiNode>
          </UiNode>))}
      </UiNode>

      {filtered.length === 0 && <UiNode as="div" style={styles.empty}>Filtrelere uyan laboratuvar bulunamadı.</UiNode>}
    </UiNode>);
}
function Metric({ label, value }: {
    label: string;
    value: string;
}) {
    const { t: uiText } = useTranslation();
    return <UiNode as="div" style={styles.metric}><UiNode as="span">{uiText(label)}</UiNode><UiNode as="strong">{value}</UiNode></UiNode>;
}
function ChipGroup({ label, values }: {
    label: string;
    values: string[];
}) {
    if (!values.length)
        return null;
    return <UiNode as="div" style={styles.chipGroup}><UiNode as="span" style={styles.chipLabel}>{label}</UiNode><UiNode as="div" style={styles.chips}>{values.slice(0, 6).map((x) => <UiNode as="span" key={x} style={styles.chip}>{x}</UiNode>)}</UiNode></UiNode>;
}
const styles: Record<string, CSSProperties> = {
    page: { minHeight: "100vh", background: dy.bg, color: dy.text, padding: "clamp(18px,3vw,42px)", fontFamily: "Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", fontSize: 15 },
    center: { maxWidth: 720, margin: "100px auto", padding: 28, border: `1px solid ${dy.border}`, borderRadius: 22, background: dy.surface, textAlign: "center" },
    header: { maxWidth: 1320, margin: "0 auto 26px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24 },
    back: { color: dy.muted, textDecoration: "none", fontSize: 14 }, eyebrow: { color: dy.accent, fontWeight: 800, letterSpacing: ".18em", fontSize: 13, margin: "18px 0 8px" },
    title: { fontSize: "clamp(32px,5vw,58px)", lineHeight: 1, margin: "0 0 12px", letterSpacing: "-.04em" }, sub: { maxWidth: 820, color: dy.muted, lineHeight: 1.65, margin: 0 },
    headerButtons: { display: "flex", gap: 10, flexWrap: "wrap" }, primaryButton: { border: 0, borderRadius: 13, padding: "11px 15px", background: dy.accent, color: dy.accentContrast, fontWeight: 850, textDecoration: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" },
    secondaryButton: { border: `1px solid ${dy.border}`, borderRadius: 13, padding: "10px 14px", background: dy.surface, color: dy.text, fontWeight: 750, textDecoration: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" },
    notice: { maxWidth: 1320, margin: "0 auto 18px", padding: "12px 14px", border: `1px solid ${dy.border}`, borderRadius: 13, background: dy.surface2, color: dy.text },
    toolbar: { maxWidth: 1320, margin: "0 auto 14px", display: "grid", gridTemplateColumns: "minmax(240px,1.7fr) repeat(3,minmax(140px,.7fr)) auto", gap: 10, padding: 12, border: `1px solid ${dy.border}`, borderRadius: 18, background: dy.surface },
    input: { width: "100%", minHeight: 44, padding: "0 12px", borderRadius: 11, border: `1px solid ${dy.border}`, background: dy.input, color: dy.text, outline: "none" },
    checkLabel: { display: "flex", alignItems: "center", gap: 8, color: dy.text, padding: "0 8px", whiteSpace: "nowrap" }, countLine: { maxWidth: 1320, margin: "0 auto 18px", color: dy.muted, fontSize: 14, display: "flex", gap: 6 },
    grid: { maxWidth: 1320, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 16 },
    card: { border: `1px solid ${dy.border}`, borderRadius: 22, background: dy.surface, padding: 20, boxShadow: `0 9px 25px ${dy.shadow}` }, cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }, badgeRow: { display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 9 },
    verified: { fontSize: 13, fontWeight: 850, padding: "5px 8px", borderRadius: 999, background: dy.accentSoft, color: dy.accent }, demoBadge: { fontSize: 13, fontWeight: 850, padding: "5px 8px", borderRadius: 999, background: "#292313", color: "#eed690" }, expressBadge: { fontSize: 13, fontWeight: 850, padding: "5px 8px", borderRadius: 999, background: "#173748", color: "#a8eee4" },
    labName: { margin: "0 0 5px", fontSize: 22, letterSpacing: "-.02em" }, location: { fontSize: 14, color: dy.muted }, scoreBox: { minWidth: 82, textAlign: "right", padding: "9px 11px", borderRadius: 14, background: dy.surface2, border: `1px solid ${dy.border}` },
    description: { color: dy.muted, lineHeight: 1.55, minHeight: 48 }, metrics: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, margin: "14px 0" }, metric: { background: dy.surface2, border: `1px solid ${dy.border}`, borderRadius: 13, padding: "9px 10px", display: "grid", gap: 4 },
    chipGroup: { marginTop: 11 }, chipLabel: { fontSize: 13, color: dy.muted, fontWeight: 750 }, chips: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }, chip: { padding: "5px 8px", borderRadius: 999, border: `1px solid ${dy.border}`, background: dy.input, color: dy.text, fontSize: 13 },
    actions: { display: "flex", gap: 9, marginTop: 18, flexWrap: "wrap" }, empty: { maxWidth: 1320, margin: "20px auto", padding: 24, textAlign: "center", border: `1px dashed ${dy.border}`, borderRadius: 18, color: dy.muted },
};
