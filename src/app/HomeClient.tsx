"use client";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useRef, useState, type CSSProperties, } from "react";
import Link from "@/lib/i18n/UiLink";
import { BrandLogo } from "@/app/BrandLogo";
import type { RealtimeChannel, User, } from "@supabase/supabase-js";
import HomeDashboard from "@/app/HomeDashboard";
import { loadHomeDashboard } from "@/lib/load-home-dashboard";
import type { HomeCounts } from "@/lib/home-dashboard";
import { type DentayaIconName } from "@/app/DentayaIcon";
import { supabase } from "@/lib/supabase";
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
    const { t: uiText } = useTranslation();
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
    if (!user) {
        return (<UiNode as="main" style={page}>
        <style>
          {globalCss}
        </style>

        <UiNode as="div" className="dentaya-auth-shell" style={authShell}>
          <UiNode as="section" style={authIntro}>
            <UiNode as="p" style={eyebrow}>
              DENTAYA
            </UiNode>

            <UiNode as="h1" style={authTitle}>
              Dijital diş
              hekimliği için
              ortak çalışma
              alanı.
            </UiNode>

            <UiNode as="p" style={heroText}>
              Klinik, laboratuvar
              ve vaka süreçlerini
              tek yerde yönet.
              Tasarım dosyalarını,
              iletişimi ve teslimat
              akışını aynı vaka
              üzerinden takip et.
            </UiNode>

            <UiNode as="div" style={introSteps}>
              <UiNode data-dy-copy-stack as="div">
                <UiNode as="strong">
                  {uiText(" Klinik ")}</UiNode>
                <UiNode as="span">
                  Hasta, vaka,
                  laboratuvar ve
                  randevu yönetimi
                </UiNode>
              </UiNode>

              <UiNode data-dy-copy-stack as="div">
                <UiNode as="strong">
                  {uiText(" Laboratuvar ")}</UiNode>
                <UiNode as="span">
                  Tasarım, üretim,
                  onay ve teslimat
                  süreci
                </UiNode>
              </UiNode>

              <UiNode data-dy-copy-stack as="div">
                <UiNode as="strong">
                  Canlı takip
                </UiNode>
                <UiNode as="span">
                  Vaka teslimatlarını
                  ve kurye akışını
                  takip et
                </UiNode>
              </UiNode>
            </UiNode>
          </UiNode>

          <UiNode as="section" style={authCard}>
            <UiNode as="div" style={authTabs}>
              <UiNode as="button" type="button" onClick={() => setAuthMode("login")} style={authMode ===
                "login"
                ? activeTab
                : tab}>
                Giriş
              </UiNode>

              <UiNode as="button" type="button" onClick={() => setAuthMode("register")} style={authMode ===
                "register"
                ? activeTab
                : tab}>
                Hesap Oluştur
              </UiNode>
            </UiNode>

            {authMode ===
                "register" && (<Field label={uiText("Ad Soyad")} value={authName} onChange={setAuthName} placeholder={uiText("Ad Soyad")}/>)}

            <Field label={uiText("E-posta")} value={authEmail} onChange={setAuthEmail} placeholder="ornek@dentaya.com" type="email"/>

            <Field label={uiText("Şifre")} value={authPassword} onChange={setAuthPassword} placeholder="Şifren" type="password"/>

            {message && (<UiNode as="div" style={messageBox}>
                {message}
              </UiNode>)}

            <UiNode as="button" type="button" disabled={authBusy} onClick={submitAuth} style={primaryButton}>
              {authBusy
                ? "İşleniyor..."
                : authMode ===
                    "login"
                    ? uiText("Giriş Yap")
                    : "Hesap Oluştur"}
            </UiNode>
          </UiNode>
        </UiNode>
      </UiNode>);
    }
    if (!membership ||
        !organization) {
        return (<UiNode as="main" style={page}>
        <style>
          {globalCss}
        </style>

        <UiNode as="section" style={onboardingCard}>
          <UiNode as="div" style={brand}>
            <BrandLogo width={181} height={40}/>
          </UiNode>

          {pendingInviteToken && (<UiNode as="div" style={pendingInviteCard}>
              <UiNode data-dy-copy-stack as="div" style={{ display: "grid", gap: 4 }}>
                <UiNode as="strong">Bekleyen Ekip Daveti</UiNode>
                <UiNode as="span">
                  Bir çalışma alanı seni ekibine davet etmiş. Yeni kurum oluşturmadan önce bu daveti kabul edebilirsin.
                </UiNode>
              </UiNode>

              <Link href={`/invite?token=${encodeURIComponent(pendingInviteToken)}`} style={primaryButton}>
                Daveti Aç
              </Link>
            </UiNode>)}

          <UiNode as="p" style={eyebrow}>
            İLK KURULUM
          </UiNode>

          <UiNode as="h1" style={onboardingTitle}>
            Çalışma alanını
            oluşturalım.
          </UiNode>

          <UiNode as="p" style={heroText}>
            Kurum tipini seç.
            Bu seçim ana panelde
            hangi iş akışlarının
            gösterileceğini
            belirler.
          </UiNode>

          <UiNode as="div" style={orgChoices}>
            <OrgChoice active={orgType ===
                "clinic"} title={uiText("Klinik")} description="Hasta, vaka, laboratuvar ve randevu süreçleri." onClick={() => setOrgType("clinic")}/>

            <OrgChoice active={orgType ===
                "laboratory"} title={uiText("Laboratuvar")} description="Vaka kabulü, tasarım, onay, üretim ve teslimat." onClick={() => setOrgType("laboratory")}/>

            <OrgChoice active={orgType ===
                "courier"} title="Kurye" description="Teslimatlar, sürücüler ve canlı konum akışı." onClick={() => setOrgType("courier")}/>
          </UiNode>

          <Field label="Kurum Adı" value={orgName} onChange={setOrgName} placeholder="Kurum adını yaz"/>

          {message && (<UiNode as="div" style={messageBox}>
              {message}
            </UiNode>)}

          <UiNode as="div" style={onboardingActions}>
            <UiNode as="button" type="button" disabled={orgBusy} onClick={createOrganization} style={primaryButton}>
              {orgBusy
                ? "Oluşturuluyor..."
                : "Çalışma Alanını Oluştur"}
            </UiNode>

            <UiNode as="button" type="button" onClick={signOut} style={secondaryButton}>
              {uiText(" Çıkış Yap ")}</UiNode>
          </UiNode>
        </UiNode>
      </UiNode>);
    }
    return <HomeDashboard organization={organization} userId={user.id} name={profile?.full_name ?? ""} role={membership.role} modules={getFocusedModules(organization.org_type)} cases={cases} shipments={shipments} counts={dashboardCounts} loading={dashboardLoading} error={message} updatedAt={dashboardUpdatedAt} onRefresh={() => void loadDashboardData(organization)} onSignOut={() => void signOut()}/>;
}
function Field({ label, value, onChange, placeholder, type = "text", }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    type?: string;
}) {
    const { t: uiText } = useTranslation();
    return (<UiNode as="label" style={field}>
      <UiNode as="span" style={fieldLabel}>
        {uiText(label)}
      </UiNode>

      <UiNode as="input" value={value} type={type} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} style={input}/>
    </UiNode>);
}
function OrgChoice({ active, title, description, onClick, }: {
    active: boolean;
    title: string;
    description: string;
    onClick: () => void;
}) {
    return (<UiNode data-dy-copy-stack as="button" type="button" onClick={onClick} style={{
            ...orgChoice,
            ...(active
                ? orgChoiceActive
                : {}),
        }}>
      <UiNode as="strong">
        {title}
      </UiNode>

      <UiNode as="span">
        {description}
      </UiNode>
    </UiNode>);
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
const globalCss = `
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
  }

  a {
    text-decoration: none;
  }

  button,
  input {
    font: inherit;
  }

  .module-card,
  .recent-row {
    transition:
      transform .16s ease,
      border-color .16s ease,
      background .16s ease;
  }

  .module-card:hover {
    transform: translateY(-3px);
    border-color: #347068 !important;
    background: var(--dy-surface2, #0d202c) !important;
  }

  .recent-row:hover {
    border-color: #31586b !important;
    background: var(--dy-surface, #0b1c28) !important;
  }

  @media(max-width: 980px) {
    .dentaya-home-placeholder {
      display: none;
    }
  }

  @media(max-width: 760px) {
    header {
      align-items: flex-start !important;
      flex-direction: column !important;
    }
  }
`;
const page: CSSProperties = {
    minHeight: "100vh",
    padding: "0 4.5vw 60px",
    color: "var(--dy-text, #f2f6f8)",
    background: "linear-gradient(180deg,var(--dy-bg,#07131d),var(--dy-bg,#07131d))",
    fontFamily: "Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    fontSize: "15px",
};
const brand: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "30px",
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: "-1.6px",
};
const eyebrow: CSSProperties = {
    margin: 0,
    color: "var(--dy-accent, #6de2cf)",
    fontSize: "12px",
    fontWeight: 900,
    letterSpacing: "2.4px",
};
const heroText: CSSProperties = {
    maxWidth: "660px",
    margin: 0,
    color: "var(--dy-muted, #8ba0af)",
    fontSize: "14px",
    lineHeight: 1.7,
};
const primaryButton: CSSProperties = {
    width: "100%",
    padding: "13px 16px",
    border: "none",
    borderRadius: "10px",
    background: "var(--dy-accent, #6de2cf)",
    color: "var(--dy-accent-contrast, #03110e)",
    fontWeight: 900,
    cursor: "pointer",
};
const secondaryButton: CSSProperties = {
    padding: "11px 13px",
    borderRadius: "9px",
    border: "1px solid var(--dy-border, #29465d)",
    background: "var(--dy-surface2, #0d1e2a)",
    color: "var(--dy-text, #d5e0e6)",
    cursor: "pointer",
};
const authShell: CSSProperties = {
    width: "min(1180px,100%)",
    minHeight: "100vh",
    margin: "0 auto",
    padding: "7vh 0",
    display: "grid",
    gridTemplateColumns: "minmax(0,1.2fr) minmax(330px,.8fr)",
    gap: "25px",
    alignItems: "center",
};
const authIntro: CSSProperties = {
    padding: "20px 4vw 20px 0",
};
const authTitle: CSSProperties = {
    maxWidth: "720px",
    margin: "10px 0 18px",
    fontSize: "clamp(47px,6vw,78px)",
    lineHeight: 0.98,
    letterSpacing: "-4px",
};
const introSteps: CSSProperties = {
    marginTop: "35px",
    display: "grid",
    gap: "8px",
};
const authCard: CSSProperties = {
    padding: "24px",
    display: "grid",
    gap: "14px",
    background: "linear-gradient(145deg,var(--dy-surface, #0b1c28),var(--dy-bg, #07131d))",
    border: "1px solid var(--dy-border,#29465d)",
    borderRadius: "18px",
    boxShadow: "0 35px 90px rgba(0,0,0,.26)",
};
const authTabs: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "6px",
};
const tab: CSSProperties = {
    padding: "11px",
    borderRadius: "8px",
    border: "1px solid var(--dy-border,#29465d)",
    background: "var(--dy-input,#081722)",
    color: "var(--dy-muted, #8296a5)",
    cursor: "pointer",
};
const activeTab: CSSProperties = {
    ...tab,
    background: "var(--dy-accent-soft, #12322f)",
    color: "var(--dy-accent, #91e9dc)",
    border: "1px solid var(--dy-accent,#6de2cf)",
};
const field: CSSProperties = {
    display: "grid",
    gap: "6px",
};
const fieldLabel: CSSProperties = {
    color: "var(--dy-muted, #8ea1af)",
    fontSize: "12px",
};
const input: CSSProperties = {
    width: "100%",
    padding: "12px",
    color: "var(--dy-text,#f2f6f8)",
    background: "var(--dy-bg, #06131d)",
    border: "1px solid var(--dy-border, #29465d)",
    borderRadius: "9px",
    outline: "none",
};
const messageBox: CSSProperties = {
    padding: "11px 12px",
    border: "1px solid var(--dy-border,#29465d)",
    borderRadius: "9px",
    color: "var(--dy-accent, #91ded3)",
    background: "var(--dy-accent-soft, #10282e)",
    fontSize: "13px",
    lineHeight: 1.5,
};
const pendingInviteCard: CSSProperties = {
    width: "100%",
    marginBottom: "16px",
    padding: "13px",
    display: "grid",
    gap: "9px",
    border: "1px solid var(--dy-accent,#6de2cf)",
    borderRadius: "12px",
    background: "var(--dy-accent-soft,rgba(109,226,207,.08))",
    color: "var(--dy-text,#eef7fb)",
};
const onboardingCard: CSSProperties = {
    width: "min(760px,100%)",
    margin: "7vh auto",
    padding: "28px",
    background: "linear-gradient(145deg,var(--dy-surface, #0b1c28),var(--dy-bg, #07131d))",
    border: "1px solid var(--dy-border,#29465d)",
    borderRadius: "18px",
};
const onboardingTitle: CSSProperties = {
    margin: "8px 0 12px",
    fontSize: "clamp(36px,5vw,55px)",
    letterSpacing: "-2px",
    lineHeight: 1,
};
const orgChoices: CSSProperties = {
    margin: "24px 0",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
    gap: "8px",
};
const orgChoice: CSSProperties = {
    padding: "15px",
    display: "grid",
    gap: "7px",
    textAlign: "left",
    color: "var(--dy-text,#f2f6f8)",
    background: "var(--dy-panel-surface-2,var(--dy-input,#081722))",
    border: "1px solid var(--dy-border,#29465d)",
    borderRadius: "11px",
    cursor: "pointer",
};
const orgChoiceActive: CSSProperties = {
    background: "var(--dy-accent-soft, #12322f)",
    border: "1px solid var(--dy-accent,#6de2cf)",
    color: "var(--dy-accent, #a7eee3)",
};
const onboardingActions: CSSProperties = {
    marginTop: "15px",
    display: "grid",
    gap: "8px",
};

