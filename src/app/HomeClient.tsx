"use client";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import UiNode from "@/lib/i18n/UiNode";
import UserText from "@/lib/i18n/UserText";
import { useTranslation } from '@/lib/i18n';
import { workflowText } from '@/lib/i18n/workflow-safety';
import { professionalShellText } from '@/lib/i18n/professional-shell';
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "@/lib/i18n/UiLink";
import type { RealtimeChannel, User, } from "@supabase/supabase-js";
import HomeDashboard from "@/app/HomeDashboard";
import { loadHomeDashboard } from "@/lib/load-home-dashboard";
import type { HomeCounts } from "@/lib/home-dashboard";
import DentayaIcon, { type DentayaIconName } from "@/app/DentayaIcon";
import { supabase, supabaseConfiguration } from "@/lib/supabase";
import { useDentayaThemeRuntime } from "@/app/dentaya-theme";
type OrgType = "clinic" | "laboratory" | "courier";
type Organization = {
    id: string;
    name: string;
    org_type: OrgType;
    demo_mode: boolean;
};
type Membership = {
    organization_id: string;
    role: string;
    status: string;
};
type Profile = {
    full_name: string | null;
    email: string | null;
};
type CaseStatus = "new" | "accepted" | "design" | "approval" | "production" | "qc" | "ready" | "shipped" | "delivered" | "cancelled";
type CaseRow = {
    id: string;
    case_number: string;
    patient_reference: string;
    title: string;
    status: CaseStatus;
    priority: "low" | "normal" | "high" | "urgent";
    due_date: string | null;
    updated_at: string;
};
type ShipmentRow = {
    id: string;
    tracking_code: string | null;
    courier_name: string | null;
    status: "created" | "pickup_requested" | "picked_up" | "in_transit" | "delivered" | "cancelled";
    updated_at: string;
};
export default function HomePage() {
    const { t: uiText, locale } = useTranslation();
    useDentayaThemeRuntime();
    const [dashboardCounts, setDashboardCounts] = useState<HomeCounts | null>(null);
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const [dashboardUpdatedAt, setDashboardUpdatedAt] = useState<string | null>(null);
    const dashboardRequestRef = useRef(0);
    const dashboardOrgRef = useRef("");
    const [booting, setBooting] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [membership, setMembership] = useState<Membership | null>(null);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [cases, setCases] = useState<CaseRow[]>([]);
    const [shipments, setShipments] = useState<ShipmentRow[]>([]);
    const [message, setMessage] = useState("");
    const [authMode, setAuthMode] = useState<"login" | "register">("login");
    const [authEmail, setAuthEmail] = useState("");
    const [authPassword, setAuthPassword] = useState("");
    const [authName, setAuthName] = useState("");
    const [authBusy, setAuthBusy] = useState(false);
    const [orgName, setOrgName] = useState("");
    const [orgType, setOrgType] = useState<OrgType>("clinic");
    const [orgBusy, setOrgBusy] = useState(false);
    const [pendingInviteToken, setPendingInviteToken] = useState("");
    const dashboardLoaderRef = useRef<(currentOrg: Organization) => Promise<void>>(async () => undefined);
    const loadWorkspace = useCallback(async (currentUser: User) => {
        setMessage("");
        const [profileResult, membershipResult,] = await Promise.all([
            supabase
                .from("profiles")
                .select("full_name,email")
                .eq("id", currentUser.id)
                .maybeSingle(),
            supabase
                .from("memberships")
                .select("organization_id,role,status")
                .eq("user_id", currentUser.id)
                .eq("status", "active")
                .limit(1)
                .maybeSingle(),
        ]);
        if (profileResult.error) {
            setMessage(profileResult.error
                .message);
        }
        setProfile((profileResult.data ??
            null) as Profile | null);
        if (membershipResult.error) {
            setMessage(membershipResult.error
                .message);
            setMembership(null);
            setOrganization(null);
            setCases([]);
            setShipments([]);
            return;
        }
        const currentMembership = (membershipResult.data ??
            null) as Membership | null;
        setMembership(currentMembership);
        if (!currentMembership) {
            setOrganization(null);
            setCases([]);
            setShipments([]);
            return;
        }
        const { data: orgData, error: orgError, } = await supabase
            .from("organizations")
            .select(`
            id,
            name,
            org_type,
            demo_mode
            `)
            .eq("id", currentMembership.organization_id)
            .maybeSingle();
        if (orgError ||
            !orgData) {
            setMessage(orgError?.message ??
                "Kurum bilgisi alınamadı.");
            setOrganization(null);
            return;
        }
        const currentOrg = orgData as Organization;
        setOrganization(currentOrg);
        await dashboardLoaderRef.current(currentOrg);
    }, []);
    const loadDashboardData = useCallback(async (currentOrg: Organization) => {
        const request = ++dashboardRequestRef.current;
        if (dashboardOrgRef.current !== currentOrg.id) {
            dashboardOrgRef.current = currentOrg.id;
            setCases([]);
            setShipments([]);
            setDashboardCounts(null);
            setDashboardUpdatedAt(null);
        }
        setDashboardLoading(true);
        try {
            const data = await loadHomeDashboard(currentOrg);
            if (request !== dashboardRequestRef.current)
                return;
            setCases(data.cases as CaseRow[]);
            setShipments(data.shipments as ShipmentRow[]);
            setDashboardCounts(data.counts);
            setDashboardUpdatedAt(new Date().toISOString());
            setMessage("");
        }
        catch {
            if (request === dashboardRequestRef.current)
                setMessage("Çalışma alanı bilgilerine ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.");
        }
        finally {
            if (request === dashboardRequestRef.current)
                setDashboardLoading(false);
        }
    }, []);
    useEffect(() => {
        dashboardLoaderRef.current =
            loadDashboardData;
    }, [loadDashboardData]);
    useEffect(() => {
        try {
            setPendingInviteToken(window.localStorage.getItem("dentaya_pending_invite") ?? "");
        }
        catch {
            setPendingInviteToken("");
        }
    }, [user?.id]);
    useEffect(() => {
        let mounted = true;
        async function boot() {
            const { data, } = await supabase.auth
                .getSession();
            if (!mounted) {
                return;
            }
            const currentUser = data.session?.user ??
                null;
            setUser(currentUser);
            if (currentUser) {
                await loadWorkspace(currentUser);
            }
            if (mounted) {
                setBooting(false);
            }
        }
        boot();
        const { data: listener, } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) {
                return;
            }
            const nextUser = session?.user ??
                null;
            setUser(nextUser);
            if (nextUser) {
                await loadWorkspace(nextUser);
            }
            else {
                dashboardRequestRef.current++;
                setDashboardCounts(null);
                setDashboardUpdatedAt(null);
                setProfile(null);
                setMembership(null);
                setOrganization(null);
                setCases([]);
                setShipments([]);
            }
            setBooting(false);
        });
        return () => {
            mounted = false;
            listener.subscription.unsubscribe();
        };
    }, [loadWorkspace]);
    useEffect(() => {
        if (!organization) {
            return;
        }
        let channel: RealtimeChannel | null = null;
        if (organization.org_type ===
            "courier") {
            channel = supabase
                .channel(`home-shipments-${organization.id}`)
                .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "shipments",
                filter: `courier_org_id=eq.${organization.id}`,
            }, () => {
                loadDashboardData(organization);
            })
                .subscribe();
        }
        else {
            channel = supabase
                .channel(`home-cases-${organization.id}`)
                .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "cases",
                filter: `${organization.org_type === "clinic" ? "clinic_org_id" : "lab_org_id"}=eq.${organization.id}`,
            }, () => {
                loadDashboardData(organization);
            })
                .subscribe();
        }
        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [
        organization,
        loadDashboardData,
    ]);
    useEffect(() => {
        if (!organization)
            return;
        const refresh = () => { if (document.visibilityState === "visible")
            void loadDashboardData(organization); };
        const timer = window.setInterval(refresh, 60000);
        document.addEventListener("visibilitychange", refresh);
        window.addEventListener("dentaya-network-restored", refresh);
        return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("dentaya-network-restored", refresh); };
    }, [organization, loadDashboardData]);
    async function submitAuth() {
        if (!authEmail.trim() ||
            !authPassword.trim()) {
            setMessage("E-posta ve şifre gerekli.");
            return;
        }
        setAuthBusy(true);
        setMessage("");
        if (authMode ===
            "login") {
            const { error, } = await supabase.auth
                .signInWithPassword({
                email: authEmail.trim(),
                password: authPassword,
            });
            if (error) {
                setMessage(error.message);
            }
            setAuthBusy(false);
            return;
        }
        if (!authName.trim()) {
            setMessage("Ad soyad gerekli.");
            setAuthBusy(false);
            return;
        }
        const { data, error, } = await supabase.auth
            .signUp({
            email: authEmail.trim(),
            password: authPassword,
            options: {
                emailRedirectTo: `${window.location.origin}/workspace`,
                data: {
                    full_name: authName.trim(),
                },
            },
        });
        if (error) {
            setMessage(error.message);
            setAuthBusy(false);
            return;
        }
        if (!data.session) {
            setMessage("Kayıt oluşturuldu. E-posta doğrulaması gerekiyorsa gelen kutunu kontrol et.");
        }
        else {
            setMessage("Hesap oluşturuldu.");
        }
        setAuthBusy(false);
    }
    async function createOrganization() {
        if (!user) {
            return;
        }
        if (!orgName.trim()) {
            setMessage("Kurum adını yaz.");
            return;
        }
        setOrgBusy(true);
        setMessage("");
        const { error, } = await supabase.rpc("create_my_organization", {
            p_name: orgName.trim(),
            p_org_type: orgType,
        });
        if (error) {
            setMessage(error.message);
            setOrgBusy(false);
            return;
        }
        await loadWorkspace(user);
        setOrgBusy(false);
    }
    async function signOut() {
        await supabase.auth
            .signOut();
        setMessage("");
    }
    if (booting) return <LoadingExperience title="Çalışma alanı hazırlanıyor..."/>;
    if (user && membership && organization) {
        return <HomeDashboard organization={organization} userId={user.id} name={profile?.full_name ?? ""} role={membership.role} modules={getFocusedModules(organization.org_type)} cases={cases} shipments={shipments} counts={dashboardCounts} loading={dashboardLoading} error={message} updatedAt={dashboardUpdatedAt} onRefresh={() => void loadDashboardData(organization)} onSignOut={() => void signOut()}/>;
    }
    const shellCopy = professionalShellText(locale);
    const connectionLabel = supabaseConfiguration.isConfigured ? uiText(user ? "İLK KURULUM" : "Önce giriş yap") : supabaseConfiguration.status === "invalid" ? shellCopy.invalidTitle : shellCopy.setupTitle;
    return <UiNode as="main" className="desktop-workspace-home desktop-home-access">
        <UiNode as="header" className="desktop-home-toolbar">
            <UiNode as="div" className="desktop-home-heading"><DentayaIcon name="home" size={19}/><UiNode as="h1">Çalışma alanı</UiNode><UiNode as="span" className="desktop-home-divider"/><UiNode as="span" className="desktop-home-muted">{user ? 'İLK KURULUM' : 'Giriş / Hesap Oluştur'}</UiNode></UiNode>
            <UiNode as="button" type="button" className="desktop-home-button" onClick={() => window.dispatchEvent(new Event("dentaya:open-preferences"))}><DentayaIcon name="settings" size={15}/>Görünüm</UiNode>
        </UiNode>
        <UiNode as="div" className="desktop-home-access-grid">
            <UiNode as="aside" className="desktop-home-context" aria-label="Aktif çalışma alanı">
                <UiNode as="div" className="desktop-home-context-title"><DentayaIcon name="case" size={17}/><UiNode as="strong">İş takibi</UiNode></UiNode>
                <UiNode as="span" className="desktop-home-section-label">Durum</UiNode>
                <UiNode as="dl" className="desktop-home-context-details"><UiNode as="div"><UiNode as="dt">Oturum</UiNode><UiNode as="dd">{user ? 'Giriş aktif' : 'Önce giriş yap'}</UiNode></UiNode><UiNode as="div"><UiNode as="dt">Kurum</UiNode><UiNode as="dd">{user ? 'İLK KURULUM' : '—'}</UiNode></UiNode><UiNode as="div"><UiNode as="dt">Kurum erişimi</UiNode><UiNode as="dd">Bağlantı gerekli</UiNode></UiNode></UiNode>
                <UiNode as="div" className="desktop-home-context-bottom"><Link href="/start"><DentayaIcon name="guide" size={15}/>Başlangıç rehberi</Link><Link href="/settings"><DentayaIcon name="settings" size={15}/>Ayarlar</Link></UiNode>
            </UiNode>
            <UiNode as="div" className="desktop-home-access-workarea">
                <UiNode as="section" className="desktop-home-launch-panel" aria-labelledby="desktop-home-tools-title">
                    <UiNode as="div" className="desktop-home-records-toolbar"><UiNode as="div"><DentayaIcon name="design" size={17}/><UiNode as="h2" id="desktop-home-tools-title">Araçlar</UiNode></UiNode><UiNode as="span" className="desktop-home-muted">Hızlı erişim</UiNode></UiNode>
                    <UiNode as="div" className="desktop-home-launch-tools">
                        <Link href="/design" className="desktop-home-tool desktop-home-tool-cad"><UiNode as="span" className="desktop-home-tool-mark"><DentayaIcon name="design" size={25}/></UiNode><UiNode as="div"><UiNode as="strong">DentAYA Design</UiNode><UiNode as="p">Tarama, marjin ve tasarım akışını aç.</UiNode><UiNode as="small">Kurum erişimi</UiNode></UiNode><UiNode as="span" className="desktop-home-tool-arrow" aria-hidden="true">↗</UiNode></Link>
                        <Link href="/ai" className="desktop-home-tool"><UiNode as="span" className="desktop-home-tool-mark"><DentayaIcon name="ai" size={25}/></UiNode><UiNode as="div"><UiNode as="strong">AYA çalışma asistanı</UiNode><UiNode as="p">Yerel sohbet API anahtarı veya DentAYA oturumu istemez. Mesajlar yalnızca bu bilgisayardaki modele iletilir; buluta otomatik geçilmez.</UiNode><UiNode as="small">Yerel</UiNode></UiNode><UiNode as="span" className="desktop-home-tool-arrow" aria-hidden="true">↗</UiNode></Link>
                        <Link href="/cad-library" className="desktop-home-tool"><UiNode as="span" className="desktop-home-tool-mark"><DentayaIcon name="case" size={23}/></UiNode><UiNode as="div"><UiNode as="strong">Form kütüphanesi</UiNode><UiNode as="p">STL veya OBJ dosyası seçin.</UiNode><UiNode as="small">Yerel</UiNode></UiNode><UiNode as="span" className="desktop-home-tool-arrow" aria-hidden="true">↗</UiNode></Link>
                        <Link href="/training" className="desktop-home-tool"><UiNode as="span" className="desktop-home-tool-mark"><DentayaIcon name="guide" size={23}/></UiNode><UiNode as="div"><UiNode as="strong">Demo ve eğitim</UiNode><UiNode as="p">CAD workstation akışını öğren</UiNode><UiNode as="small">Yerel</UiNode></UiNode><UiNode as="span" className="desktop-home-tool-arrow" aria-hidden="true">↗</UiNode></Link>
                    </UiNode>
                </UiNode>
                <UiNode as="section" className="desktop-home-records desktop-home-access-records" aria-labelledby="desktop-home-cases-title">
                    <UiNode as="div" className="desktop-home-records-toolbar"><UiNode as="div"><DentayaIcon name="case" size={17}/><UiNode as="h2" id="desktop-home-cases-title">Vaka kayıtları ve süreç takibi</UiNode></UiNode><UiNode as="span" className="desktop-home-tag">Bağlantı gerekli</UiNode></UiNode>
                    <UiNode as="div" className="desktop-home-table-scroll"><UiNode as="table" className="desktop-home-table"><UiNode as="thead"><UiNode as="tr"><UiNode as="th" scope="col">Vaka / Hasta Ref</UiNode><UiNode as="th" scope="col">Durum</UiNode><UiNode as="th" scope="col">Termin</UiNode><UiNode as="th" scope="col">Öncelik</UiNode></UiNode></UiNode><UiNode as="tbody"/></UiNode></UiNode>
                    <UiNode as="div" className="desktop-home-empty"><UiNode as="div" className="desktop-home-empty-icon"><DentayaIcon name="case" size={30}/></UiNode><UiNode as="strong">{user ? 'Çalışma alanını oluşturalım.' : 'Önce giriş yap'}</UiNode><UiNode as="p">Veriler yüklendiğinde işleriniz burada görünecek.</UiNode><Link href="/invite" className="desktop-home-button"><DentayaIcon name="team" size={15}/>{workflowText(locale, "Davet koduyla katıl")}</Link></UiNode>
                    <UiNode as="div" className="desktop-home-records-note"><DentayaIcon name="shield" size={14}/><UiNode as="span">Hasta/kurum yetkisi ile görüntülenir.</UiNode></UiNode>
                </UiNode>
            </UiNode>
            <UiNode as="aside" className="desktop-home-account-panel" aria-label={user ? uiText('Kurum üyeliği') : uiText('Giriş / Hesap Oluştur')}>
                <UiNode as="div" className="desktop-home-inspector-heading"><DentayaIcon name={user ? 'clinic' : 'shield'} size={16}/><UiNode as="h2">{user ? 'İLK KURULUM' : 'Oturum'}</UiNode></UiNode>
                {user && <UiNode as="div" className="desktop-home-account-user"><UiNode as="strong"><UserText>{profile?.full_name || user.email || '—'}</UserText></UiNode><UiNode as="small">Giriş aktif</UiNode></UiNode>}
                <UiNode as="div" className="desktop-home-connection-note" role="status"><UiNode as="span" className="desktop-home-connection-dot"/><UiNode as="div"><UiNode as="strong">{user ? uiText('Kurum üyeliği') : connectionLabel}</UiNode><UiNode as="p">{supabaseConfiguration.isConfigured ? uiText('Hasta, tarama ve vaka akışını modül bazında yönet.') : shellCopy.setupDescription}</UiNode></UiNode></UiNode>
                {pendingInviteToken && <UiNode as="div" className="desktop-home-pending-invite"><UiNode as="strong">Bekleyen Ekip Daveti</UiNode><UiNode as="p">Bir çalışma alanı seni ekibine davet etmiş. Yeni kurum oluşturmadan önce bu daveti kabul edebilirsin.</UiNode><Link href={`/invite?token=${encodeURIComponent(pendingInviteToken)}`} className="desktop-home-button desktop-home-button-primary">Daveti Aç</Link></UiNode>}
                {!user ? <UiNode as="form" className="desktop-home-account-form" onSubmit={event => { event.preventDefault(); void submitAuth(); }}>
                    <UiNode as="div" className="desktop-home-auth-tabs" role="group" aria-label="Giriş / Hesap Oluştur"><UiNode as="button" type="button" aria-pressed={authMode === 'login'} onClick={() => setAuthMode('login')}>Giriş</UiNode><UiNode as="button" type="button" aria-pressed={authMode === 'register'} onClick={() => setAuthMode('register')}>Hesap Oluştur</UiNode></UiNode>
                    {authMode === 'register' && <Field label={uiText('Ad Soyad')} value={authName} onChange={setAuthName} placeholder={uiText('Ad Soyad')}/>}
                    <Field label={uiText('E-posta')} value={authEmail} onChange={setAuthEmail} placeholder="ornek@dentaya.com" type="email"/>
                    <Field label={uiText('Şifre')} value={authPassword} onChange={setAuthPassword} placeholder={uiText('Şifre')} type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}/>
                    {message && <UiNode as="div" className="desktop-home-form-message" role="status">{message}</UiNode>}
                    <UiNode as="button" type="submit" className="desktop-home-button desktop-home-button-primary" disabled={authBusy}>{authBusy ? 'İşleniyor...' : authMode === 'login' ? uiText('Giriş Yap') : 'Hesap Oluştur'}</UiNode>
                    <Link href="/invite" className="desktop-home-account-invite"><DentayaIcon name="team" size={15}/>{workflowText(locale, 'Davet koduyla katıl')}<UiNode as="span" aria-hidden="true">↗</UiNode></Link>
                </UiNode> : <UiNode as="form" className="desktop-home-account-form" onSubmit={event => { event.preventDefault(); void createOrganization(); }}>
                    <UiNode as="h3">Çalışma alanını oluşturalım.</UiNode><UiNode as="p" className="desktop-home-form-description">Kurum tipini seç. Bu seçim ana panelde hangi iş akışlarının gösterileceğini belirler.</UiNode>
                    <UiNode as="div" className="desktop-home-org-choices" role="group" aria-label="Kurum türü"><OrgChoice active={orgType === 'clinic'} title={uiText('Klinik')} description="Hasta, vaka, laboratuvar ve randevu süreçleri." onClick={() => setOrgType('clinic')}/><OrgChoice active={orgType === 'laboratory'} title={uiText('Laboratuvar')} description="Vaka kabulü, tasarım, onay, üretim ve teslimat." onClick={() => setOrgType('laboratory')}/><OrgChoice active={orgType === 'courier'} title={uiText('Kurye')} description="Teslimatlar, sürücüler ve canlı konum akışı." onClick={() => setOrgType('courier')}/></UiNode>
                    <Field label={uiText('Kurum Adı')} value={orgName} onChange={setOrgName} placeholder={uiText('Kurum adını yaz')}/>
                    {message && <UiNode as="div" className="desktop-home-form-message" role="status">{message}</UiNode>}
                    <UiNode as="button" type="submit" className="desktop-home-button desktop-home-button-primary" disabled={orgBusy}>{orgBusy ? 'Oluşturuluyor...' : 'Çalışma Alanını Oluştur'}</UiNode><Link href="/invite" className="desktop-home-account-invite"><DentayaIcon name="team" size={15}/>{workflowText(locale, 'Davet koduyla katıl')}</Link><UiNode as="button" type="button" className="desktop-home-button" onClick={() => void signOut()}>Çıkış Yap</UiNode>
                </UiNode>}
                <UiNode as="div" className="desktop-home-account-foot"><DentayaIcon name="shield" size={16}/><UiNode as="span">Hasta/kurum yetkisi ile görüntülenir.</UiNode></UiNode>
            </UiNode>
        </UiNode>
        <UiNode as="footer" className="desktop-home-statusbar"><UiNode as="span"><UiNode as="i" data-state="pending"/>{connectionLabel}</UiNode><UiNode as="span">DentAYA çalışma alanı</UiNode></UiNode>
    </UiNode>;
}
function Field({ label, value, onChange, placeholder, type = "text", autoComplete }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    type?: string;
    autoComplete?: string;
}) {
    return <UiNode as="label" className="desktop-home-field"><UiNode as="span">{label}</UiNode><UiNode as="input" value={value} type={type} onChange={event => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete ?? (type === 'email' ? 'email' : undefined)}/></UiNode>;
}
function OrgChoice({ active, title, description, onClick }: {
    active: boolean;
    title: string;
    description: string;
    onClick: () => void;
}) {
    return <UiNode as="button" type="button" className="desktop-home-org-choice" aria-pressed={active} onClick={onClick}><UiNode as="span" className="desktop-home-choice-radio"/><UiNode as="span"><UiNode as="strong">{title}</UiNode><UiNode as="small">{description}</UiNode></UiNode></UiNode>;
}
export function getFocusedModules(orgType: OrgType): Array<{
    eyebrow: string;
    title: string;
    description: string;
    href: string;
    icon: DentayaIconName;
}> {
    if (orgType === "clinic") {
        return [
            { eyebrow: "OPERASYON", title: "Operasyon Merkezi", description: "Termin, onay, üretim ve kurye darboğazlarını tek ekranda izle.", href: "/operations", icon: "home" },
            { eyebrow: "HASTA", title: "Hastalar", description: "Yeni hasta kaydı ve mevcut hasta profilleri.", href: "/patients", icon: "patient" },
            { eyebrow: "TARAMA", title: "Tarama Stüdyosu", description: "Ağız içi STL/PLY taramalarını düzenle ve bağla.", href: "/scan-studio", icon: "scan" },
            { eyebrow: "VAKA", title: "Vakalar", description: "Vaka detaylarını yalnızca gerektiğinde buradan aç.", href: "/cases", icon: "case" },
            { eyebrow: "HESAP", title: "Muhasebe & Fiyat", description: "Lab maliyeti ve hasta fiyatlarını ayrı takip et.", href: "/finance", icon: "finance" },
            { eyebrow: "AI", title: "AYA · Akıllı Yardım Asistanı", description: "Klinik akışı yorumlayan akıllı yardımcıyı aç.", href: "/ai", icon: "ai" },
            { eyebrow: "İLETİŞİM", title: "Mesajlar", description: "Hekim ve laboratuvar mesajlarını tek yerde gör.", href: "/messages", icon: "message" },
        ];
    }
    if (orgType === "laboratory") {
        return [
            { eyebrow: "MERKEZ", title: "Lab Merkezi", description: "Laboratuvar modüllerine sade giriş ekranı.", href: "/lab", icon: "lab" },
            { eyebrow: "OPERASYON", title: "Operasyon Merkezi", description: "Kapasite, revizyon, üretim, QC ve teslimat darboğazlarını izle.", href: "/operations", icon: "home" },
            { eyebrow: "CAD", title: "DentAYA Design", description: "Tarama, marjin ve tasarım akışını aç.", href: "/design", icon: "design" },
            { eyebrow: "CAD", title: "Form kütüphanesi", description: "Form kütüphanesi", href: "/cad-library", icon: "design" },
            { eyebrow: "TARAMA", title: "Lab Tarama", description: "Ana model, karşıt çene ve diğer taramaları yönet.", href: "/scan-studio", icon: "scan" },
            { eyebrow: "VAKA", title: "Vakalar", description: "Vaka listesini sadece gerektiğinde aç.", href: "/cases", icon: "case" },
            { eyebrow: "FİYAT", title: "Lab Fiyatlandırma", description: "Kliniğe gidecek lab fiyatlarını yönetin.", href: "/finance", icon: "finance" },
            { eyebrow: "AI", title: "AYA · Akıllı Yardım Asistanı", description: "Operasyon ve tasarım odaklı akıllı asistan.", href: "/ai", icon: "ai" },
        ];
    }
    return [
        { eyebrow: "OPERASYON", title: "Operasyon Merkezi", description: "Aktif teslimat, gecikme ve günlük öncelikleri tek ekranda izle.", href: "/operations", icon: "home" },
        { eyebrow: "LIVE", title: "Canlı Takip", description: "Teslimatların canlı durumunu izle.", href: "/logistics", icon: "logistics" },
        { eyebrow: "BİLDİRİM", title: "Bildirimler", description: "Operasyon uyarıları ve akış sinyalleri.", href: "/notifications", icon: "notification" },
        { eyebrow: "AI", title: "AYA · Akıllı Yardım Asistanı", description: "Takip özetlerini yorumlayan akıllı asistan.", href: "/ai", icon: "ai" },
    ];
}
