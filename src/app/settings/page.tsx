"use client";
import "./settings.css";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import {memberRoleLabel} from '@/lib/display-labels';
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useState, type CSSProperties, } from "react";
import Link from "@/lib/i18n/UiLink";
import { useRouter } from "next/navigation";
import ExperienceSettings from "@/app/ExperienceSettings";
import AyaPreferencesPanel from "@/app/ai/AyaPreferencesPanel";
import LanguageSettings from "../LanguageSettings";
import ToothAppearanceSettings from '@/app/ToothAppearanceSettings';
import LogoPicker from "@/app/LogoPicker";
import CustomizationPanel from "@/app/CustomizationPanel";
import { resetCustomization } from "@/app/customization";
import { selectAppearancePreset } from "@/app/appearance-palette";
import ConnectionStatus from "@/app/ConnectionStatus";
import DentayaIcon, { type DentayaIconName } from "@/app/DentayaIcon";
import { dentayaError, isReasonablePhone, isValidEmail } from "@/lib/dentaya-errors";
import { DEFAULT_NOTIFICATION_PREFERENCES, loadNotificationPreferences, saveNotificationPreferences, type NotificationPreferences } from "@/lib/notification-preferences";
import { supabase } from "@/lib/supabase";
import { DEFAULT_WORKSPACE_PERSONALIZATION, WORKSPACE_PRESETS, loadWorkspacePersonalization, saveWorkspacePersonalization, type WorkspaceCardStyle, type WorkspaceDensity, type WorkspaceHeaderScale, type WorkspacePersonalization, } from "@/lib/dentaya-workspace-personalization";
import { applyDentayaPreferences, DENTAYA_DEFAULT_PREFERENCES, dy, loadDentayaPreferences, saveDentayaPreferences, type DentayaPreferences, type FontScale, type MotionLevel, type SurfaceStyle, useDentayaThemeRuntime, } from "@/app/dentaya-theme";
type Org = {
    id: string;
    name: string;
    org_type: "clinic" | "laboratory" | "courier";
    directory_visible: boolean;
    demo_mode: boolean;
    address_line1: string | null;
    address_line2: string | null;
    address_district: string | null;
    address_city: string | null;
    address_postal_code: string | null;
    address_country_code: string | null;
    address_formatted: string | null;
    address_lat: number | null;
    address_lng: number | null;
    address_place_id: string | null;
    address_verified_at: string | null;
};
type ProfileForm = {
    fullName: string;
    email: string;
    phone: string;
};
type OrganizationForm = {
    name: string;
    directoryVisible: boolean;
    addressLine1: string;
    addressLine2: string;
    district: string;
    city: string;
    postalCode: string;
    countryCode: string;
    formattedAddress: string;
    latitude: string;
    longitude: string;
    placeId: string;
    addressVerifiedAt: string;
};
type Membership = {
    role: string;
};
type LabForm = {
    description: string;
    city: string;
    district: string;
    turnaround: string;
    contactEmail: string;
    website: string;
    specialties: string;
    services: string;
    materials: string;
    software: string;
    regions: string;
    accepts: boolean;
    express: boolean;
    pickup: boolean;
};
const emptyLab: LabForm = {
    description: "",
    city: "",
    district: "",
    turnaround: "",
    contactEmail: "",
    website: "",
    specialties: "",
    services: "",
    materials: "",
    software: "",
    regions: "",
    accepts: true,
    express: false,
    pickup: false,
};
export default function SettingsPage() {
    const { t: uiText } = useTranslation();
    useDentayaThemeRuntime();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [org, setOrg] = useState<Org | null>(null);
    const [membership, setMembership] = useState<Membership | null>(null);
    const [prefs, setPrefs] = useState<DentayaPreferences>(DENTAYA_DEFAULT_PREFERENCES);
    useEffect(() => {
        const sync = (event: Event) => setPrefs((event as CustomEvent<DentayaPreferences>).detail);
        window.addEventListener("dentaya-theme-change", sync);
        return () => window.removeEventListener("dentaya-theme-change", sync);
    }, []);
    const [lab, setLab] = useState<LabForm>(emptyLab);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [userId, setUserId] = useState("");
    const [profile, setProfile] = useState<ProfileForm>({
        fullName: "",
        email: "",
        phone: "",
    });
    const [organizationForm, setOrganizationForm] = useState<OrganizationForm>({
        name: "",
        directoryVisible: true,
        addressLine1: "",
        addressLine2: "",
        district: "",
        city: "",
        postalCode: "",
        countryCode: "TR",
        formattedAddress: "",
        latitude: "",
        longitude: "",
        placeId: "",
        addressVerifiedAt: "",
    });
    const [geocoding, setGeocoding] = useState(false);
    const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
    const [workspacePrefs, setWorkspacePrefs] = useState<WorkspacePersonalization>(DEFAULT_WORKSPACE_PERSONALIZATION);
    const [activeSection, setActiveSection] = useState<"account" | "appearance" | "workspace" | "notifications" | "organization" | "system">("account");
    useEffect(() => {
        const requested = new URLSearchParams(window.location.search).get("section");
        const allowed = [
            "account",
            "appearance",
            "workspace",
            "notifications",
            "organization",
            "system",
        ] as const;
        if (requested &&
            allowed.includes(requested as (typeof allowed)[number])) {
            setActiveSection(requested as (typeof allowed)[number]);
        }
    }, []);
    useEffect(() => {
        let active = true;
        async function init() {
            const { data: auth } = await supabase.auth.getSession();
            const user = auth.session?.user;
            if (!user) {
                router.replace("/workspace");
                return;
            }
            setUserId(user.id);
            const loaded = await loadDentayaPreferences();
            const [profileResult, notificationResult,] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("full_name,email,phone")
                    .eq("id", user.id)
                    .maybeSingle(),
                loadNotificationPreferences(user.id),
            ]);
            if (active) {
                setPrefs(loaded);
                setWorkspacePrefs(loadWorkspacePersonalization());
                setNotificationPrefs(notificationResult);
                setProfile({
                    fullName: profileResult.data?.full_name ??
                        "",
                    email: profileResult.data?.email ??
                        user.email ??
                        "",
                    phone: profileResult.data?.phone ??
                        "",
                });
            }
            const { data: membershipData, error: membershipError, } = await supabase
                .from("memberships")
                .select("organization_id,role")
                .eq("user_id", user.id)
                .eq("status", "active")
                .limit(1)
                .maybeSingle();
            if (membershipError ||
                !membershipData) {
                setMessage(dentayaError(membershipError, "Aktif kurum bulunamadı."));
                setLoading(false);
                return;
            }
            setMembership({
                role: membershipData.role,
            });
            const { data: organization, error: orgError, } = await supabase
                .from("organizations")
                .select("id,name,org_type,directory_visible,demo_mode,address_line1,address_line2,address_district,address_city,address_postal_code,address_country_code,address_formatted,address_lat,address_lng,address_place_id,address_verified_at")
                .eq("id", membershipData.organization_id)
                .maybeSingle();
            if (orgError ||
                !organization) {
                setMessage(dentayaError(orgError, "Kurum bilgisi alınamadı."));
                setLoading(false);
                return;
            }
            const current = organization as Org;
            if (!active) {
                return;
            }
            setOrg(current);
            setOrganizationForm({
                name: current.name,
                directoryVisible: Boolean(current.directory_visible),
                addressLine1: current.address_line1 ?? "",
                addressLine2: current.address_line2 ?? "",
                district: current.address_district ?? "",
                city: current.address_city ?? "",
                postalCode: current.address_postal_code ?? "",
                countryCode: current.address_country_code ?? "TR",
                formattedAddress: current.address_formatted ?? "",
                latitude: current.address_lat == null
                    ? ""
                    : String(current.address_lat),
                longitude: current.address_lng == null
                    ? ""
                    : String(current.address_lng),
                placeId: current.address_place_id ?? "",
                addressVerifiedAt: current.address_verified_at ?? "",
            });
            if (current.org_type ===
                "laboratory") {
                const { data: profile } = await supabase
                    .from("lab_profiles")
                    .select("description,city,district,turnaround_days,contact_email,website,specialties,services,supported_materials,software_stack,delivery_regions,accepts_new_cases,supports_express,pickup_available")
                    .eq("organization_id", current.id)
                    .maybeSingle();
                if (profile) {
                    setLab({
                        description: profile.description ??
                            "",
                        city: profile.city ?? "",
                        district: profile.district ??
                            "",
                        turnaround: profile.turnaround_days
                            ? String(profile.turnaround_days)
                            : "",
                        contactEmail: profile.contact_email ??
                            "",
                        website: profile.website ?? "",
                        specialties: (profile.specialties ??
                            []).join(", "),
                        services: (profile.services ??
                            []).join(", "),
                        materials: (profile.supported_materials ??
                            []).join(", "),
                        software: (profile.software_stack ??
                            []).join(", "),
                        regions: (profile.delivery_regions ??
                            []).join(", "),
                        accepts: Boolean(profile.accepts_new_cases),
                        express: Boolean(profile.supports_express),
                        pickup: Boolean(profile.pickup_available),
                    });
                }
            }
            setLoading(false);
        }
        void init();
        return () => {
            active = false;
        };
    }, [router]);
    function updatePrefs(next: Partial<DentayaPreferences>) {
        const updated = {
            ...prefs,
            ...next,
        };
        setPrefs(updated);
        applyDentayaPreferences(updated);
    }
    function updateWorkspacePrefs(next: Partial<WorkspacePersonalization>) {
        const updated = {
            ...workspacePrefs,
            ...next,
        };
        setWorkspacePrefs(updated);
        const saved = saveWorkspacePersonalization(updated);
        setMessage(saved ? "Çalışma düzeni uygulandı ve bu cihaza kaydedildi." : "Çalışma düzeni uygulandı; cihaz kaydı kullanılamıyor.");
    }
    const canManageOrganization = Boolean(org &&
        !org.demo_mode &&
        (membership?.role ===
            "owner" ||
            membership?.role ===
                "admin"));
    function updateOrganizationAddress(field: "addressLine1" | "addressLine2" | "district" | "city" | "postalCode" | "countryCode", value: string) {
        setOrganizationForm((current) => ({
            ...current,
            [field]: value,
            formattedAddress: "",
            latitude: "",
            longitude: "",
            placeId: "",
            addressVerifiedAt: "",
        }));
    }
    function organizationAddressQuery() {
        return [
            organizationForm.addressLine1,
            organizationForm.addressLine2,
            organizationForm.district,
            organizationForm.city,
            organizationForm.postalCode,
            organizationForm.countryCode,
        ]
            .map((value) => value.trim())
            .filter(Boolean)
            .join(", ");
    }
    async function verifyOrganizationAddress() {
        if (geocoding || !canManageOrganization) {
            return;
        }
        const address = organizationAddressQuery();
        if (!organizationForm.addressLine1.trim() || !organizationForm.city.trim()) {
            setMessage("Harita doğrulaması için en az açık adres ve şehir alanlarını doldur.");
            setActiveSection("organization");
            return;
        }
        setGeocoding(true);
        setMessage("");
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData.session?.access_token;
            if (!accessToken) {
                throw new Error("Oturum doğrulanamadı.");
            }
            const response = await fetch("/api/maps/geocode", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    address,
                }),
            });
            const result = await response.json() as {
                formattedAddress?: string;
                latitude?: number;
                longitude?: number;
                placeId?: string;
                error?: string;
            };
            if (!response.ok) {
                throw new Error(result.error ??
                    "Adres doğrulanamadı.");
            }
            if (typeof result.latitude !== "number" ||
                typeof result.longitude !== "number") {
                throw new Error("Google Maps koordinat döndürmedi.");
            }
            setOrganizationForm((current) => ({
                ...current,
                formattedAddress: result.formattedAddress ??
                    address,
                latitude: String(result.latitude),
                longitude: String(result.longitude),
                placeId: result.placeId ?? "",
                addressVerifiedAt: new Date().toISOString(),
            }));
            setMessage("Adres Google Maps üzerinde doğrulandı. Kalıcı olması için Tümünü Kaydet'e bas.");
        }
        catch (error) {
            setMessage(dentayaError(error instanceof Error
                ? { message: error.message }
                : { message: String(error) }, "Adres doğrulanamadı."));
        }
        finally {
            setGeocoding(false);
        }
    }
    function resetAppearance() {
        resetCustomization();
        selectAppearancePreset("theme:midnight");
        setPrefs(DENTAYA_DEFAULT_PREFERENCES);
        applyDentayaPreferences(DENTAYA_DEFAULT_PREFERENCES);
        setMessage("Görünüm varsayılanlara döndürüldü. Kalıcı olması için Kaydet'e bas.");
    }
    async function saveAll() {
        if (saving) {
            return;
        }
        if (!profile.fullName.trim()) {
            setMessage("Ad soyad alanı boş bırakılamaz.");
            return;
        }
        if (profile.fullName.trim().length >
            120) {
            setMessage("Ad soyad 120 karakterden uzun olamaz.");
            return;
        }
        if (profile.phone.trim() &&
            !isReasonablePhone(profile.phone)) {
            setMessage("Telefon numarası isteğe bağlıdır. Yazacaksan ülke koduyla birlikte geçerli biçimde gir.");
            setActiveSection("account");
            return;
        }
        if (canManageOrganization &&
            (organizationForm.name
                .trim().length < 2 ||
                organizationForm.name
                    .trim().length > 120)) {
            setMessage("Kurum adı 2 ile 120 karakter arasında olmalı.");
            return;
        }
        if (canManageOrganization &&
            org &&
            (org.org_type === "clinic" ||
                org.org_type === "laboratory") &&
            (organizationForm.addressLine1.trim() ||
                organizationForm.city.trim() ||
                organizationForm.district.trim() ||
                organizationForm.postalCode.trim()) &&
            (!organizationForm.addressLine1.trim() ||
                !organizationForm.city.trim())) {
            setMessage("Kurye adresi girilecekse açık adres ve şehir alanları zorunludur.");
            setActiveSection("organization");
            return;
        }
        if (org?.org_type ===
            "laboratory") {
            const turnaround = lab.turnaround
                ? Number(lab.turnaround)
                : null;
            if (turnaround !== null &&
                (!Number.isFinite(turnaround) ||
                    turnaround < 1 ||
                    turnaround > 120)) {
                setMessage("Ortalama teslim süresi 1 ile 120 gün arasında olmalı.");
                return;
            }
            if (lab.contactEmail.trim() &&
                !isValidEmail(lab.contactEmail)) {
                setMessage("Laboratuvar iletişim e-postası geçerli görünmüyor. Alan boş bırakılabilir.");
                setActiveSection("organization");
                return;
            }
            if (lab.description.length >
                2000) {
                setMessage("Laboratuvar açıklaması 2000 karakterden uzun olamaz.");
                return;
            }
        }
        setSaving(true);
        setMessage("");
        try {
            await saveDentayaPreferences(prefs);
            saveWorkspacePersonalization(workspacePrefs);
            if (userId) {
                const { error: profileError, } = await supabase
                    .from("profiles")
                    .upsert({
                    id: userId,
                    full_name: profile.fullName
                        .trim(),
                    email: profile.email ||
                        null,
                    phone: profile.phone
                        .trim() ||
                        null,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: "id",
                });
                if (profileError) {
                    throw profileError;
                }
                await saveNotificationPreferences(userId, notificationPrefs);
            }
            if (org &&
                canManageOrganization) {
                const { error: organizationError, } = await supabase
                    .from("organizations")
                    .update({
                    name: organizationForm.name
                        .trim(),
                    directory_visible: organizationForm.directoryVisible,
                    address_line1: organizationForm.addressLine1.trim() || null,
                    address_line2: organizationForm.addressLine2.trim() || null,
                    address_district: organizationForm.district.trim() || null,
                    address_city: organizationForm.city.trim() || null,
                    address_postal_code: organizationForm.postalCode.trim() || null,
                    address_country_code: organizationForm.countryCode.trim().toUpperCase() || "TR",
                    address_formatted: organizationForm.formattedAddress.trim() || null,
                    address_lat: organizationForm.latitude
                        ? Number(organizationForm.latitude)
                        : null,
                    address_lng: organizationForm.longitude
                        ? Number(organizationForm.longitude)
                        : null,
                    address_place_id: organizationForm.placeId || null,
                    address_verified_at: organizationForm.addressVerifiedAt || null,
                    updated_at: new Date().toISOString(),
                })
                    .eq("id", org.id);
                if (organizationError) {
                    throw organizationError;
                }
                setOrg((current) => current
                    ? {
                        ...current,
                        name: organizationForm.name
                            .trim(),
                        directory_visible: organizationForm.directoryVisible,
                        address_line1: organizationForm.addressLine1.trim() || null,
                        address_line2: organizationForm.addressLine2.trim() || null,
                        address_district: organizationForm.district.trim() || null,
                        address_city: organizationForm.city.trim() || null,
                        address_postal_code: organizationForm.postalCode.trim() || null,
                        address_country_code: organizationForm.countryCode.trim().toUpperCase() || "TR",
                        address_formatted: organizationForm.formattedAddress.trim() || null,
                        address_lat: organizationForm.latitude
                            ? Number(organizationForm.latitude)
                            : null,
                        address_lng: organizationForm.longitude
                            ? Number(organizationForm.longitude)
                            : null,
                        address_place_id: organizationForm.placeId || null,
                        address_verified_at: organizationForm.addressVerifiedAt || null,
                    }
                    : current);
            }
            if (org?.org_type ===
                "laboratory") {
                const arr = (value: string) => value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .slice(0, 40);
                const { error, } = await supabase
                    .from("lab_profiles")
                    .upsert({
                    organization_id: org.id,
                    description: lab.description
                        .trim() ||
                        null,
                    city: lab.city.trim() ||
                        null,
                    district: lab.district
                        .trim() ||
                        null,
                    turnaround_days: lab.turnaround
                        ? Number(lab.turnaround)
                        : null,
                    contact_email: lab.contactEmail
                        .trim() ||
                        null,
                    website: lab.website.trim() ||
                        null,
                    specialties: arr(lab.specialties),
                    services: arr(lab.services),
                    supported_materials: arr(lab.materials),
                    software_stack: arr(lab.software),
                    delivery_regions: arr(lab.regions),
                    accepts_new_cases: lab.accepts,
                    supports_express: lab.express,
                    pickup_available: lab.pickup,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: "organization_id",
                });
                if (error) {
                    throw error;
                }
            }
            setMessage("Ayarlar hesabınla senkronize edildi.");
        }
        catch (error) {
            setMessage(dentayaError(error instanceof Error
                ? error
                : {
                    message: String(error ?? ""),
                }, "Ayarlar kaydedilemedi."));
        }
        finally {
            setSaving(false);
        }
    }
    if (loading) return <LoadingExperience title="Ayarlar yükleniyor…"/>;
    return (<UiNode as="main" className="settings-studio" style={s.page}>
      <ConnectionStatus />
      <UiNode as="header" className="settings-titlebar" style={s.header}>
        <UiNode as="div" className="settings-window-title">
          <DentayaIcon name="settings" size={18}/>
          <UiNode as="h1" style={s.title}>{uiText(" Ayarlar ")}</UiNode>
        </UiNode>
        <Link href="/" style={s.back}>← Ana panel</Link>
      </UiNode>
      <UiNode as="div" className="settings-toolbar">
        <UiNode as="div" className="settings-toolbar-context">
          <UiNode as="strong"><UserText>{org?.name}</UserText></UiNode>
          <UiNode as="span">{memberRoleLabel(membership?.role ?? "member")}</UiNode>
        </UiNode>
        <UiNode as="div" style={s.headerActions}>
          <UiNode as="button" type="button" onClick={resetAppearance} style={s.secondaryButton}>Görünümü Sıfırla</UiNode>
          <UiNode as="button" type="button" onClick={() => void saveAll()} disabled={saving} style={s.primary}>
            {saving ? uiText("Kaydediliyor…") : "Tümünü Kaydet"}
          </UiNode>
        </UiNode>
      </UiNode>

      {message && (<UiNode as="div" style={s.notice}>
          {message}
        </UiNode>)}

      <UiNode as="div" className="settings-shell" style={s.shell}>
        <UiNode as="nav" className="settings-nav" aria-label={uiText("Ayarlar")} style={s.nav}>
          <NavButton active={activeSection ===
            "account"} icon="patient" label="Hesabım" detail="Profil ve erişim" onClick={() => setActiveSection("account")}/>

          <NavButton active={activeSection ===
            "appearance"} icon="settings" label={uiText("Görünüm")} detail="Tema ve hareket" onClick={() => setActiveSection("appearance")}/>

          <NavButton active={activeSection ===
            "workspace"} icon="home" label={uiText("Çalışma Alanı")} detail="Rol & yoğunluk" onClick={() => setActiveSection("workspace")}/>

          <NavButton active={activeSection ===
            "notifications"} icon="notification" label={uiText("Bildirimler")} detail="Kategori tercihleri" onClick={() => setActiveSection("notifications")}/>

          <NavButton active={activeSection ===
            "organization"} icon={org?.org_type === "laboratory" ? "lab" : "clinic"} label={org?.org_type ===
            "laboratory"
            ? "Laboratuvar Profili"
            : "Kurum"} detail="Profil bilgileri" onClick={() => setActiveSection("organization")}/>

          <NavButton active={activeSection ===
            "system"} icon="shield" label="Sistem" detail="Senkronizasyon" onClick={() => setActiveSection("system")}/>

          <Link data-dy-copy-stack href="/start" style={s.guideLink}>
            <UiNode as="strong">Öğrenim Rehberi</UiNode>
            <UiNode as="span">Rolüne göre kullanım akışı</UiNode>
          </Link>

          <Link data-dy-copy-stack href="/ai" style={s.guideLink}>
            <UiNode as="strong">AYA · Akıllı Yardım Asistanı</UiNode>
            <UiNode as="span">Vaka, modül, ayar ve kullanım yardımı</UiNode>
          </Link>

          <UiNode as="div" style={s.navIdentity}>
            <UiNode as="span">
              <UserText>{org?.name}</UserText>
            </UiNode>

            <UiNode as="strong">
              {orgTypeLabel(org?.org_type)}
            </UiNode>

            <UiNode as="small">
              {memberRoleLabel(membership?.role ?? "member")}
            </UiNode>
          </UiNode>
        </UiNode>

        <UiNode as="section" id="settings-content" className="settings-inspector" style={s.content}>
          {activeSection ===
            "account" && (<>
              <Panel eyebrow="HESAP" title="Kişisel profil" right={<UiNode as="span" style={s.tag}>
                    {roleLabel(membership?.role)}
                  </UiNode>}>
                <UiNode as="div" className="form-grid" style={s.formGrid}>
                  <Text label={uiText("Ad soyad")} value={profile.fullName} onChange={(value) => setProfile((current) => ({
                ...current,
                fullName: value,
            }))}/>

                  <Text label="Telefon (isteğe bağlı)" value={profile.phone} placeholder="+90 5xx xxx xx xx" inputMode="tel" onChange={(value) => setProfile((current) => ({
                ...current,
                phone: value,
            }))}/>

                  <UiNode as="label" style={s.field}>
                    <UiNode as="span">
                      {uiText(" E-posta ")}</UiNode>

                    <UiNode as="input" value={profile.email} readOnly style={{
                ...s.input,
                opacity: .72,
            }}/>
                  </UiNode>
                </UiNode>

                <UiNode as="p" style={s.panelText}>
                  E-posta adresi
                  oturum hesabından gelir.
                  Telefon alanı isteğe bağlıdır;
                  boş bırakman diğer ayarları
                  kaydetmene engel olmaz.
                  Ad soyad ve girersen telefon
                  profilinle birlikte senkronize edilir.
                </UiNode>
              </Panel>

              <Panel eyebrow="ERİŞİM" title="Rol ve kurum" right={(membership?.role ===
                "owner" ||
                membership?.role ===
                    "admin") ? (<Link href="/team" style={s.secondary}>
                      Ekip Yönetimi
                    </Link>) : undefined}>
                <UiNode as="div" className="settings-identity-grid" style={s.identityGrid}>
                  <Identity label="Kurum" value={org?.name ?? "—"}/>

                  <Identity label="Kurum türü" value={orgTypeLabel(org?.org_type)}/>

                  <Identity label={uiText("Rol")} value={roleLabel(membership?.role)}/>
                </UiNode>
              </Panel>
            </>)}

          {activeSection ===
            "appearance" && (<>
              <Panel eyebrow="KİŞİSEL STÜDYO" title="Renkler ve görünüm" right={<UiNode as="span" style={s.tag}>Otomatik kaydedilir</UiNode>}>
                <CustomizationPanel />
              </Panel>
              <Panel eyebrow="ETKİLEŞİM" title="Geçişler ve çalışma sesleri"><ExperienceSettings /></Panel><Panel eyebrow="YEREL ASİSTAN" title="AYA çalışma tercihleri"><AyaPreferencesPanel /></Panel>
              <LanguageSettings /><Panel eyebrow={uiText("DİŞ SEÇİMİ")} title={uiText("Anatomik görünüm")} right={<UiNode as="span" style={s.tag}>Otomatik kaydedilir</UiNode>}><ToothAppearanceSettings /></Panel>
              <Panel eyebrow="DENTAYA KİMLİĞİ" title="Logo seçimi" right={<UiNode as="span" style={s.tag}>Seçim bu cihazda saklanır</UiNode>}>
                <LogoPicker />
              </Panel>
              <UiNode as="div" className="preview-grid" style={s.previewGrid}>
                <Panel eyebrow="YÜZEY" title="Panel stili">
                  <UiNode as="div" className="choice-grid" style={s.choiceGrid}>
                    {([
                [
                    "soft",
                    "Yumuşak",
                    "Dengeli, yumuşak kartlar",
                ],
                [
                    "solid",
                    "Düz",
                    "Daha keskin ve sıkı",
                ],
                [
                    "glass",
                    "Cam",
                    "Şeffaf / modern katman",
                ],
            ] as [
                SurfaceStyle,
                string,
                string
            ][]).map(([id, label, detail,]) => (<ChoiceCard key={id} active={prefs.surface_style ===
                    id} title={label} detail={detail} onClick={() => updatePrefs({
                    surface_style: id,
                })}/>))}
                  </UiNode>
                </Panel>

                <Panel eyebrow="CANLI ÖNİZLEME" title={uiText("Çalışma alanı")}>
                  <UiNode as="div" style={s.previewCard}>
                    <UiNode as="div" style={s.previewTop}>
                      <UiNode as="div" style={s.fakeAvatar}>
                        DY
                      </UiNode>

                      <UiNode data-dy-copy-stack as="div">
                        <UiNode as="strong">
                          DentAYA
                          Workspace
                        </UiNode>

                        <UiNode as="span">
                          <UserText>{org?.name}</UserText>
                        </UiNode>
                      </UiNode>
                    </UiNode>

                    <UiNode as="div" style={s.previewMetric}>
                      <UiNode as="span">
                        {uiText(" Aktif vaka ")}</UiNode>
                      <UiNode as="strong">
                        12
                      </UiNode>
                    </UiNode>

                    <UiNode as="div" style={s.previewMetric}>
                      <UiNode as="span">
                        {uiText(" Onay ")}</UiNode>
                      <UiNode as="strong">
                        3
                      </UiNode>
                    </UiNode>

                    <UiNode as="span" className="settings-preview-action" style={s.primary}>
                      Örnek aksiyon
                    </UiNode>
                  </UiNode>
                </Panel>
              </UiNode>

              <Panel eyebrow="ERİŞİLEBİLİRLİK" title="Hareket & okunabilirlik">
                <SettingBlock title="Animasyon yoğunluğu" description="Sayfa geçişi ve mikro animasyonların hızını ayarlar.">
                  <Segmented value={prefs.motion_level} options={[
                [
                    "full",
                    "Tam",
                ],
                [
                    "reduced",
                    "Azaltılmış",
                ],
                [
                    "off",
                    "Kapalı",
                ],
            ]} onChange={(value) => updatePrefs({
                motion_level: value as MotionLevel,
            })}/>
                </SettingBlock>

                <SettingBlock title="Metin ölçeği" description="Ana arayüzde daha sıkı veya daha rahat okunabilirlik sağlar.">
                  <Segmented value={prefs.font_scale} options={[
                [
                    "small",
                    "Küçük",
                ],
                [
                    "normal",
                    "Normal",
                ],
                [
                    "large",
                    "Büyük",
                ],
            ]} onChange={(value) => updatePrefs({
                font_scale: value as FontScale,
            })}/>
                </SettingBlock>
              </Panel>
            </>)}

          {activeSection ===
            "workspace" && (<>
              <Panel eyebrow="HAZIR DÜZENLER" title="Ana sayfa düzeni" right={<UiNode as="span" style={s.tag}>Anında uygulanır</UiNode>}>
                <UiNode as="div" className="workspace-presets">
                  {WORKSPACE_PRESETS.map(preset => <UiNode as="button" key={preset.id} type="button" aria-pressed={Object.entries(preset.value).every(([key, value]) => workspacePrefs[key as keyof WorkspacePersonalization] === value)} onClick={() => updateWorkspacePrefs(preset.value)}>
                    <UiNode as="span" className={`workspace-preset-preview preset-${preset.id}`} aria-hidden="true"><UiNode as="i"/><UiNode as="span"><UiNode as="b"/><UiNode as="b"/><UiNode as="b"/></UiNode></UiNode>
                    <UiNode as="strong">{preset.name}</UiNode><UiNode as="span">{preset.description}</UiNode>
                  </UiNode>)}
                </UiNode>
                <UiNode as="p" style={{ color: dy.muted, fontSize: 13, lineHeight: 1.6 }}>Öncelikli işler ve bildirimler her düzende görünür. Alt seçeneklerle düzeni ayrıca özelleştirebilirsiniz.</UiNode>
              </Panel>
              <Panel eyebrow="KİŞİSEL ÇALIŞMA ALANI" title="DentAYA'yı kendine göre ayarla" right={<UiNode as="span" style={s.tag}>Canlı uygulanır</UiNode>}>
                <SettingBlock title="Kart yoğunluğu" description="Lobi ve merkez ekranlarında boşluk miktarını ayarlar.">
                  <Segmented value={workspacePrefs.density} options={[
                ["comfortable", "Rahat"],
                ["balanced", "Dengeli"],
                ["compact", "Sıkı"],
            ]} onChange={(value) => updateWorkspacePrefs({ density: value as WorkspaceDensity })}/>
                </SettingBlock>

                <SettingBlock title="Kart karakteri" description="Modül kartlarının dolu, çizgili veya minimal görünümünü seç.">
                  <Segmented value={workspacePrefs.cardStyle} options={[
                ["soft", "Yumuşak"],
                ["outlined", "Çizgili"],
                ["minimal", "Minimal"],
            ]} onChange={(value) => updateWorkspacePrefs({ cardStyle: value as WorkspaceCardStyle })}/>
                </SettingBlock>

                <SettingBlock title="Başlık ölçeği" description="Ana başlıkların sakin veya daha güçlü görünmesini ayarla.">
                  <Segmented value={workspacePrefs.headerScale} options={[
                ["calm", "Sakin"],
                ["balanced", "Dengeli"],
                ["strong", "Güçlü"],
            ]} onChange={(value) => updateWorkspacePrefs({ headerScale: value as WorkspaceHeaderScale })}/>
                </SettingBlock>

                <UiNode as="label" className="settings-toggle-row" style={s.toggleRow}>
                  <UiNode data-dy-copy-stack as="div">
                    <UiNode as="strong">Modül simgeleri</UiNode>
                    <UiNode as="span">Modül başlıklarının yanında işlevsel ikonları göster.</UiNode>
                  </UiNode>
                  <UiNode as="input" type="checkbox" checked={workspacePrefs.showModuleIcons} onChange={(event) => updateWorkspacePrefs({ showModuleIcons: event.target.checked })}/>
                </UiNode>

                <UiNode as="label" className="settings-toggle-row" style={s.toggleRow}>
                  <UiNode data-dy-copy-stack as="div">
                    <UiNode as="strong">Lobide AYA</UiNode>
                    <UiNode as="span">İsteğe bağlı AYA yardım bağlantısını ana ekranda göster.</UiNode>
                  </UiNode>
                  <UiNode as="input" type="checkbox" checked={workspacePrefs.showAyaLobby} onChange={(event) => updateWorkspacePrefs({ showAyaLobby: event.target.checked })}/>
                </UiNode>

                <UiNode as="label" className="settings-toggle-row" style={s.toggleRow}>
                  <UiNode data-dy-copy-stack as="div">
                    <UiNode as="strong">Çalışma düzeni önerisi</UiNode>
                    <UiNode as="span">Ana sayfadaki çalışma düzeni önerisini göster. Öncelikli işler görünür kalır.</UiNode>
                  </UiNode>
                  <UiNode as="input" type="checkbox" checked={workspacePrefs.showAttentionSummary} onChange={(event) => updateWorkspacePrefs({ showAttentionSummary: event.target.checked })}/>
                </UiNode>

                <UiNode as="label" className="settings-toggle-row" style={s.toggleRow}>
                  <UiNode data-dy-copy-stack as="div">
                    <UiNode as="strong">Merkezlenmiş içerik</UiNode>
                    <UiNode as="span">Geniş ekranlarda içerik genişliğini kontrollü tut.</UiNode>
                  </UiNode>
                  <UiNode as="input" type="checkbox" checked={workspacePrefs.centeredContent} onChange={(event) => updateWorkspacePrefs({ centeredContent: event.target.checked })}/>
                </UiNode>
              </Panel>

              <Panel eyebrow="YOĞUNLUK" title={uiText("Çalışma düzeni")}>
                <UiNode as="label" className="settings-toggle-row" style={s.toggleRow}>
                  <UiNode data-dy-copy-stack as="div">
                    <UiNode as="strong">
                      Kompakt görünüm
                    </UiNode>

                    <UiNode as="span">
                      Kart ve listelerde
                      daha fazla bilgiyi
                      aynı ekrana sığdırır.
                    </UiNode>
                  </UiNode>

                  <UiNode as="input" type="checkbox" checked={prefs.compact_mode} onChange={(event) => updatePrefs({
                compact_mode: event.target
                    .checked,
            })}/>
                </UiNode>
              </Panel>

              <Panel eyebrow={uiText("ROL")} title="Aktif çalışma alanı">
                <UiNode as="div" className="choice-grid" style={s.roleGrid}>
                  <WorkspaceCard active={org?.org_type ===
                "clinic"} title={uiText("Klinik")} detail="Hasta, Dental Twin, tarama, vaka ve laboratuvar koordinasyonu." href="/clinic"/>

                  <WorkspaceCard active={org?.org_type ===
                "laboratory"} title={uiText("Laboratuvar")} detail="Lab scan, CAD, onay, üretim, QC ve teslimat." href="/lab"/>

                  <WorkspaceCard active={org?.org_type ===
                "courier"} title="Kurye" detail="Aktif teslimatlar ve canlı lojistik." href="/logistics"/>
                </UiNode>
              </Panel>

              <Panel eyebrow="HIZLI ERİŞİM" title="Sık kullanılan alanlar">
                <UiNode as="div" style={s.quickLinks}>
                  {quickLinks(org?.org_type).map((item) => (<Link key={item.href} href={item.href} style={s.quickLink}>
                        <UiNode as="span">
                          {item.eyebrow}
                        </UiNode>

                        <UiNode as="strong">
                          {item.title}
                        </UiNode>
                      </Link>))}
                </UiNode>
              </Panel>
            </>)}

          {activeSection ===
            "notifications" && (<>
              <Panel eyebrow={uiText("BİLDİRİM MERKEZİ")} title="Gösterilecek bildirimler" right={<Link href="/notifications" style={s.secondary}>
                    Bildirimleri Aç
                  </Link>}>
                <UiNode as="p" style={s.panelText}>
                  Buradaki seçimler
                  yalnız senin hesabında
                  bildirim rozeti ve
                  listesinde hangi
                  kategorilerin
                  gösterileceğini
                  belirler.
                </UiNode>

                <UiNode as="div" style={s.systemRows}>
                  <NotificationToggle title="Vaka hareketleri" detail="Yeni vaka, kabul, üretim, QC ve teslimata hazır." value={notificationPrefs.case_enabled} onChange={(value) => setNotificationPrefs((current) => ({
                ...current,
                case_enabled: value,
            }))}/>

                  <NotificationToggle title="CAD & tasarım" detail="Klinik onayı, tasarım onayı ve revizyon." value={notificationPrefs.design_enabled} onChange={(value) => setNotificationPrefs((current) => ({
                ...current,
                design_enabled: value,
            }))}/>

                  <NotificationToggle title="Fiyat & ödeme" detail="Lab fiyatı ve klinik ödeme takibi." value={notificationPrefs.finance_enabled} onChange={(value) => setNotificationPrefs((current) => ({
                ...current,
                finance_enabled: value,
            }))}/>

                  <NotificationToggle title="Kurye & teslimat" detail="Alım, yolda, teslim ve iptal hareketleri." value={notificationPrefs.delivery_enabled} onChange={(value) => setNotificationPrefs((current) => ({
                ...current,
                delivery_enabled: value,
            }))}/>

                  <NotificationToggle title={uiText("Mesajlar")} detail="Hekim ↔ teknisyen ve kurum mesajları." value={notificationPrefs.message_enabled} onChange={(value) => setNotificationPrefs((current) => ({
                ...current,
                message_enabled: value,
            }))}/>

                  <NotificationToggle title="Sistem" detail="DentAYA sistem bildirimleri ve operasyonel uyarılar." value={notificationPrefs.system_enabled} onChange={(value) => setNotificationPrefs((current) => ({
                ...current,
                system_enabled: value,
            }))}/>
                </UiNode>
              </Panel>
            </>)}

          {activeSection ===
            "organization" && (<>
              <Panel eyebrow="KURUM" title="Çalışma alanı kimliği" right={(membership?.role ===
                "owner" ||
                membership?.role ===
                    "admin") ? (<Link href="/team" style={s.secondary}>
                      Ekip Yönetimi
                    </Link>) : undefined}>
                {canManageOrganization ? (<>
                    <UiNode as="div" className="form-grid" style={s.formGrid}>
                      <Text label="Kurum adı" value={organizationForm.name} onChange={(value) => setOrganizationForm((current) => ({
                    ...current,
                    name: value,
                }))} wide/>
                    </UiNode>

                    {(org?.org_type ===
                    "laboratory" ||
                    org?.org_type ===
                        "courier") && (<UiNode as="label" className="settings-toggle-row" style={s.toggleRow}>
                        <UiNode data-dy-copy-stack as="div">
                          <UiNode as="strong">
                            Dizinde görünür
                          </UiNode>

                          <UiNode as="span">
                            Uygun klinikler
                            kurumunu seçim
                            listelerinde
                            görebilir.
                          </UiNode>
                        </UiNode>

                        <UiNode as="input" type="checkbox" checked={organizationForm.directoryVisible} onChange={(event) => setOrganizationForm((current) => ({
                        ...current,
                        directoryVisible: event.target
                            .checked,
                    }))}/>
                      </UiNode>)}
                  </>) : (<UiNode as="div" className="settings-identity-grid" style={s.identityGrid}>
                    <Identity label="Kurum" value={org?.name ??
                    "—"}/>

                    <Identity label="Tür" value={orgTypeLabel(org?.org_type)}/>

                    <Identity label={uiText("Rol")} value={roleLabel(membership?.role)}/>
                  </UiNode>)}

                {org?.demo_mode && (<UiNode as="p" style={s.panelText}>
                    Sentetik demo
                    çalışma alanının
                    kurum kimliği
                    salt okunurdur.
                  </UiNode>)}
              </Panel>

              {(org?.org_type === "clinic" ||
                org?.org_type === "laboratory") && (<Panel eyebrow="KURYE ROTASI" title="Alım / teslimat adresi" right={organizationForm.addressVerifiedAt ? (<UiNode as="span" style={s.tag}>Harita doğrulandı</UiNode>) : (<UiNode as="span" style={s.tagMuted}>Koordinat bekliyor</UiNode>)}>
                  <UiNode as="p" style={s.panelText}>
                    Bu adres yeni kurye görevlerine otomatik aktarılır. Klinik teslim noktası, laboratuvar ise alım noktası olarak kullanılır.
                  </UiNode>

                  {canManageOrganization ? (<>
                      <UiNode as="div" className="form-grid" style={s.formGrid}>
                        <Text label="Açık adres" value={organizationForm.addressLine1} placeholder="Cadde, sokak, bina no" onChange={(value) => updateOrganizationAddress("addressLine1", value)} wide/>

                        <Text label="Adres devamı (isteğe bağlı)" value={organizationForm.addressLine2} placeholder="Kat, blok, klinik/lab adı" onChange={(value) => updateOrganizationAddress("addressLine2", value)} wide/>

                        <Text label="İlçe" value={organizationForm.district} onChange={(value) => updateOrganizationAddress("district", value)}/>

                        <Text label={uiText("Şehir")} value={organizationForm.city} onChange={(value) => updateOrganizationAddress("city", value)}/>

                        <Text label="Posta kodu" value={organizationForm.postalCode} inputMode="numeric" onChange={(value) => updateOrganizationAddress("postalCode", value)}/>

                        <Text label="Ülke kodu" value={organizationForm.countryCode} placeholder="TR" onChange={(value) => updateOrganizationAddress("countryCode", value.toUpperCase().slice(0, 2))}/>
                      </UiNode>

                      <UiNode as="div" style={s.addressActionRow}>
                        <UiNode as="button" type="button" onClick={() => void verifyOrganizationAddress()} disabled={geocoding} style={s.secondaryButton}>
                          {geocoding ? "Google Maps doğruluyor…" : "Google Maps ile doğrula"}
                        </UiNode>

                        {organizationForm.formattedAddress && (<UiNode as="div" style={s.addressVerifiedBox}>
                            <UiNode as="strong">Doğrulanan adres</UiNode>
                            <UiNode as="span">{organizationForm.formattedAddress}</UiNode>
                            {organizationForm.latitude && organizationForm.longitude && (<UiNode as="small">
                                {Number(organizationForm.latitude).toFixed(6)}, {Number(organizationForm.longitude).toFixed(6)}
                              </UiNode>)}
                          </UiNode>)}
                      </UiNode>
                    </>) : (<UiNode as="div" className="settings-identity-grid" style={s.identityGrid}>
                      <Identity label={uiText("Adres")} value={organizationForm.formattedAddress || organizationAddressQuery() || "Henüz girilmedi"}/>
                      <Identity label="Harita" value={organizationForm.addressVerifiedAt ? "Doğrulandı" : "Doğrulanmadı"}/>
                    </UiNode>)}
                </Panel>)}

              {org?.org_type ===
                "laboratory" && (<Panel eyebrow="LABORATUVAR DİZİNİ" title="Laboratuvar profili" right={<Link href="/labs" style={s.secondary}>
                      Dizini Gör
                    </Link>}>
                  <UiNode as="div" className="form-grid" style={s.formGrid}>
                    <Text label={uiText("Açıklama")} value={lab.description} onChange={(value) => setLab((current) => ({
                    ...current,
                    description: value,
                }))} wide/>

                    <Text label={uiText("Şehir")} value={lab.city} onChange={(value) => setLab((current) => ({
                    ...current,
                    city: value,
                }))}/>

                    <Text label="İlçe" value={lab.district} onChange={(value) => setLab((current) => ({
                    ...current,
                    district: value,
                }))}/>

                    <Text label="Ortalama teslim (gün)" value={lab.turnaround} onChange={(value) => setLab((current) => ({
                    ...current,
                    turnaround: value,
                }))}/>

                    <Text label="İletişim e-postası" value={lab.contactEmail} onChange={(value) => setLab((current) => ({
                    ...current,
                    contactEmail: value,
                }))}/>

                    <Text label="Web sitesi" value={lab.website} onChange={(value) => setLab((current) => ({
                    ...current,
                    website: value,
                }))}/>

                    <Text label="Uzmanlıklar (virgülle)" value={lab.specialties} onChange={(value) => setLab((current) => ({
                    ...current,
                    specialties: value,
                }))} wide/>

                    <Text label="Hizmetler (virgülle)" value={lab.services} onChange={(value) => setLab((current) => ({
                    ...current,
                    services: value,
                }))} wide/>

                    <Text label="Materyaller (virgülle)" value={lab.materials} onChange={(value) => setLab((current) => ({
                    ...current,
                    materials: value,
                }))} wide/>

                    <Text label="Yazılımlar (virgülle)" value={lab.software} onChange={(value) => setLab((current) => ({
                    ...current,
                    software: value,
                }))} wide/>

                    <Text label="Teslim bölgeleri (virgülle)" value={lab.regions} onChange={(value) => setLab((current) => ({
                    ...current,
                    regions: value,
                }))} wide/>
                  </UiNode>

                  <UiNode as="div" style={s.checks}>
                    <Check label="Yeni vaka kabul ediyorum" value={lab.accepts} onChange={(value) => setLab((current) => ({
                    ...current,
                    accepts: value,
                }))}/>

                    <Check label="Express üretim" value={lab.express} onChange={(value) => setLab((current) => ({
                    ...current,
                    express: value,
                }))}/>

                    <Check label="Alım hizmeti mevcut" value={lab.pickup} onChange={(value) => setLab((current) => ({
                    ...current,
                    pickup: value,
                }))}/>
                  </UiNode>
                </Panel>)}

              {org?.org_type !==
                "laboratory" && (<Panel eyebrow="ROL AYRIMI" title={org?.org_type ===
                    "clinic"
                    ? "Klinik alanı"
                    : "Kurye alanı"}>
                  <UiNode as="p" style={s.panelText}>
                    Bu hesapta
                    laboratuvar CAD
                    profili gösterilmez.
                    DentAYA rol ayrımını
                    korur ve yalnızca bu
                    kuruma uygun modülleri
                    açar.
                  </UiNode>
                </Panel>)}
            </>)}

          {activeSection ===
            "system" && (<>
              <Panel eyebrow="AYA" title="Akıllı Yardım Asistanı" right={<Link href="/ai" style={s.secondary}>
                    AYA&apos;yı Aç
                  </Link>}>
                <UiNode as="div" className="settings-identity-grid" style={s.identityGrid}>
                  <Identity label="Asistan adı" value="AYA"/>
                  <Identity label="Açılım" value="Akıllı Yardım Asistanı"/>
                  <Identity label="Kapsam" value="Vaka · Modül · Ayar · Rehber"/>
                </UiNode>

                <UiNode as="p" style={s.panelText}>
                  AYA, DentAYA içindeki vaka akışları kadar platform kullanımı,
                  modül yönlendirmesi, ayarlar ve öğrenim rehberi için de yardımcı olur.
                </UiNode>
              </Panel>

              <Panel eyebrow="SENKRONİZASYON" title="Tercih senkronizasyonu">
                <UiNode as="div" style={s.systemRows}>
                  <SystemRow title="Yerel önbellek" detail="Tema değişikliği anında bu cihazda uygulanır." state="Aktif"/>

                  <SystemRow title="Hesap senkronizasyonu" detail="Kaydet dediğinde tercihler Supabase hesabına yazılır." state="Hazır"/>

                  <SystemRow title="Rol bazlı UI" detail="Klinik, laboratuvar ve kurye ekranları ayrı navigasyon kullanır." state="Aktif"/>
                </UiNode>
              </Panel>

              <Panel eyebrow="KISAYOLLAR" title="Sistem araçları">
                <UiNode as="div" style={s.quickLinks}>
                  <Link href="/messages" style={s.quickLink}>
                    <UiNode as="span">
                      {uiText(" İLETİŞİM ")}</UiNode>
                    <UiNode as="strong">
                      {uiText(" Mesajlar ")}</UiNode>
                  </Link>

                  <Link href="/scans" style={s.quickLink}>
                    <UiNode as="span">
                      3D
                    </UiNode>
                    <UiNode as="strong">
                      {uiText(" Taramalar ")}</UiNode>
                  </Link>

                  <Link href="/cases" style={s.quickLink}>
                    <UiNode as="span">
                      İŞ AKIŞI
                    </UiNode>
                    <UiNode as="strong">
                      {uiText(" Vakalar ")}</UiNode>
                  </Link>

                  <Link href="/ai" style={s.quickLink}>
                    <UiNode as="span">
                      COPILOT
                    </UiNode>
                    <UiNode as="strong">
                      AYA · Akıllı Yardım Asistanı
                    </UiNode>
                  </Link>

                  <Link href="/release-check" style={s.quickLink}>
                    <UiNode as="span">
                      RELEASE
                    </UiNode>
                    <UiNode as="strong">
                      RC Kontrolü
                    </UiNode>
                  </Link>

                  <Link href="/pilot-check" style={s.quickLink}>
                    <UiNode as="span">
                      PİLOT
                    </UiNode>
                    <UiNode as="strong">
                      Sistem Kontrolü
                    </UiNode>
                  </Link>

                  <Link href="/pilot-flow" style={s.quickLink}>
                    <UiNode as="span">
                      UÇTAN UCA
                    </UiNode>
                    <UiNode as="strong">
                      Pilot Akışı
                    </UiNode>
                  </Link>

                  {(membership?.role ===
                "owner" ||
                membership?.role ===
                    "admin") && (<Link href="/team" style={s.quickLink}>
                      <UiNode as="span">
                        ERİŞİM
                      </UiNode>
                      <UiNode as="strong">
                        Ekip Yönetimi
                      </UiNode>
                    </Link>)}
                </UiNode>
              </Panel>
            </>)}
        </UiNode>
      </UiNode>
    </UiNode>);
}
function NavButton({ active, label, detail, icon, onClick, }: {
    active: boolean;
    label: string;
    detail: string;
    icon: DentayaIconName;
    onClick: () => void;
}) {
    return (<UiNode as="button" type="button" className="settings-nav-item" aria-pressed={active} aria-controls="settings-content" onClick={onClick} style={{
            ...s.navButton,
            ...(active
                ? s.navButtonActive
                : {}),
        }}>
      <UiNode as="span" style={{
            width: 28,
            height: 28,
            display: "grid",
            placeItems: "center",
            borderRadius: 4,
            background: active ? "#ffffff12" : "transparent",
            color: "inherit",
            border: "1px solid transparent",
        }}>
        <DentayaIcon name={icon} size={17}/>
      </UiNode>
      <UiNode data-dy-copy-stack as="span" style={{ display: "grid", gap: 3, textAlign: "left" }}>
        <UiNode as="strong">{label}</UiNode>
        <UiNode as="small">{detail}</UiNode>
      </UiNode>
    </UiNode>);
}
function Panel({ eyebrow, title, right, children, }: {
    eyebrow: string;
    title: string;
    right?: React.ReactNode;
    children: React.ReactNode;
}) {
    const { t: uiText } = useTranslation();
    return (<UiNode as="section" className="settings-parameter-panel" style={s.panel}>
      <UiNode as="header" className="settings-panel-title" style={s.sectionHead}>
        <UiNode as="div">
          <UiNode as="p" style={s.eyebrow}>
            {eyebrow}
          </UiNode>

          <UiNode as="h2" style={s.h2}>
            {uiText(title)}
          </UiNode>
        </UiNode>

        {right && <UiNode as="div" className="settings-panel-actions">{right}</UiNode>}
      </UiNode>
      <UiNode as="div" className="settings-panel-body">{children}</UiNode>
    </UiNode>);
}
function ChoiceCard({ active, title, detail, onClick, }: {
    active: boolean;
    title: string;
    detail: string;
    onClick: () => void;
}) {
    const { t: uiText } = useTranslation();
    return (<UiNode data-dy-copy-stack as="button" type="button" className="settings-card" aria-pressed={active} onClick={onClick} style={{
            ...s.choiceCard,
            borderColor: active
                ? dy.accent
                : dy.border,
            background: active
                ? dy.accentSoft
                : dy.surface2,
        }}>
      <UiNode as="strong">
        {uiText(title)}
      </UiNode>

      <UiNode as="span">
        {detail}
      </UiNode>
    </UiNode>);
}
function Segmented({ value, options, onChange, }: {
    value: string;
    options: [
        string,
        string
    ][];
    onChange: (value: string) => void;
}) {
    return (<UiNode as="div" style={s.segmented}>
      {options.map(([id, label]) => (<UiNode as="button" key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)} style={{
                ...s.segment,
                background: value === id
                    ? dy.accent
                    : dy.surface2,
                color: value === id
                    ? dy.accentContrast
                    : dy.text,
            }}>
            {label}
          </UiNode>))}
    </UiNode>);
}
function SettingBlock({ title, description, children, }: {
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (<UiNode as="div" className="settings-setting-block" style={s.settingBlock}>
      <UiNode data-dy-copy-stack as="div">
        <UiNode as="strong">
          {title}
        </UiNode>

        <UiNode as="span">
          {description}
        </UiNode>
      </UiNode>

      {children}
    </UiNode>);
}
function WorkspaceCard({ active, title, detail, href, }: {
    active: boolean;
    title: string;
    detail: string;
    href: string;
}) {
    const { t: uiText } = useTranslation();
    return (<Link href={href} style={{
            ...s.workspaceCard,
            opacity: active
                ? 1
                : 0.58,
            borderColor: active
                ? dy.accent
                : dy.border,
        }}>
      <UiNode as="span">
        {active
            ? uiText("AKTİF")
            : "DİĞER ROL"}
      </UiNode>

      <UiNode as="strong">
        {title}
      </UiNode>

      <UiNode as="small">
        {detail}
      </UiNode>
    </Link>);
}
function Identity({ label, value, }: {
    label: string;
    value: string;
}) {
    return (<UiNode as="div" style={s.identity}>
      <UiNode as="span">
        {label}
      </UiNode>

      <UiNode as="strong">
        <UserText>{value}</UserText>
      </UiNode>
    </UiNode>);
}
function SystemRow({ title, detail, state, }: {
    title: string;
    detail: string;
    state: string;
}) {
    return (<UiNode as="div" style={s.systemRow}>
      <UiNode data-dy-copy-stack as="div">
        <UiNode as="strong">
          {title}
        </UiNode>

        <UiNode as="span">
          {detail}
        </UiNode>
      </UiNode>

      <UiNode as="b">
        {state}
      </UiNode>
    </UiNode>);
}
function NotificationToggle({ title, detail, value, onChange, }: {
    title: string;
    detail: string;
    value: boolean;
    onChange: (value: boolean) => void;
}) {
    return (<UiNode as="label" className="settings-toggle-row" style={s.toggleRow}>
      <UiNode data-dy-copy-stack as="div">
        <UiNode as="strong">
          {title}
        </UiNode>

        <UiNode as="span">
          {detail}
        </UiNode>
      </UiNode>

      <UiNode as="input" type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)}/>
    </UiNode>);
}
function Text({ label, value, onChange, wide = false, placeholder, inputMode, }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    wide?: boolean;
    placeholder?: string;
    inputMode?: "text" | "tel" | "email" | "url" | "numeric" | "decimal" | "search" | "none";
}) {
    return (<UiNode as="label" style={{
            ...s.field,
            gridColumn: wide
                ? "1 / -1"
                : undefined,
        }}>
      <UiNode as="span">
        {label}
      </UiNode>

      <UiNode as="input" value={value} placeholder={placeholder} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} style={s.input}/>
    </UiNode>);
}
function Check({ label, value, onChange, }: {
    label: string;
    value: boolean;
    onChange: (value: boolean) => void;
}) {
    return (<UiNode as="label" style={s.check}>
      <UiNode as="input" type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)}/>

      <UiNode as="span">
        {label}
      </UiNode>
    </UiNode>);
}
function roleLabel(role: string | undefined) {
    return ({
        owner: "Kurum Sahibi",
        admin: "Yönetici",
        dentist: "Diş Hekimi",
        assistant: "Klinik Asistanı",
        technician: "Diş Teknisyeni",
        courier: "Kurye",
        viewer: "Salt Okunur",
    } as Record<string, string>)[role ?? ""] ??
        role ??
        "—";
}
function orgTypeLabel(type: Org["org_type"] | undefined) {
    if (type === "clinic") {
        return "Klinik";
    }
    if (type === "laboratory") {
        return "Laboratuvar";
    }
    if (type === "courier") {
        return "Kurye";
    }
    return "—";
}
function quickLinks(type: Org["org_type"] | undefined) {
    if (type === "clinic") {
        return [
            {
                eyebrow: "SCAN",
                title: "Tarama Stüdyosu",
                href: "/scan-studio",
            },
            {
                eyebrow: "TWIN",
                title: "Dental Twin",
                href: "/twin",
            },
            {
                eyebrow: "VAKA",
                title: "Vakalar",
                href: "/cases",
            },
            {
                eyebrow: "LAB",
                title: "Laboratuvarlar",
                href: "/labs",
            },
            {
                eyebrow: "HESAP",
                title: "Muhasebe & Fiyat",
                href: "/finance",
            },
        ];
    }
    if (type === "laboratory") {
        return [
            {
                eyebrow: "CAD",
                title: "DentAYA Design",
                href: "/design",
            },
            {
                eyebrow: "SCAN",
                title: "Lab Tarama Stüdyosu",
                href: "/scan-studio",
            },
            {
                eyebrow: "İŞLER",
                title: "Laboratuvar Merkezi",
                href: "/lab",
            },
            {
                eyebrow: "VAKA",
                title: "Vakalar",
                href: "/cases",
            },
            {
                eyebrow: "FİYAT",
                title: "Lab Fiyatlandırması",
                href: "/finance",
            },
        ];
    }
    return [
        {
            eyebrow: "CANLI",
            title: "Canlı Takip",
            href: "/logistics",
        },
    ];
}
const s: Record<string, CSSProperties> = {
    page: {
        minHeight: "100%",
        background: dy.bg,
        color: dy.text,
        padding: 16,
        fontFamily: dy.fontFamily,
        fontSize: `calc(13px * ${dy.fontScale} * var(--dy-custom-text-scale,1))`,
    },
    center: {
        maxWidth: 700,
        margin: "100px auto",
        padding: 25,
        border: `1px solid ${dy.border}`,
        borderRadius: 5,
        background: dy.surface,
        backdropFilter: dy.backdrop,
        textAlign: "center",
    },
    header: {
        minHeight: 43,
        margin: 0,
        padding: "8px 14px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        border: "1px solid var(--studio-border, var(--dy-border))",
        borderRadius: "5px 5px 0 0",
        color: "var(--studio-on-chrome, #fff)",
        background: "linear-gradient(color-mix(in srgb, var(--studio-chrome, var(--dy-accent)) 92%, white), var(--studio-chrome, var(--dy-accent)))",
        boxShadow: "inset 0 1px #ffffff24",
    },
    headerActions: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
    },
    back: {
        color: "inherit",
        textDecoration: "none",
        fontSize: 12,
        opacity: .9,
        whiteSpace: "nowrap",
    },
    eyebrow: {
        color: "inherit",
        fontWeight: 600,
        letterSpacing: ".08em",
        fontSize: 10,
        opacity: .78,
        margin: 0,
    },
    title: {
        fontSize: 16,
        fontWeight: 600,
        lineHeight: 1.3,
        letterSpacing: 0,
        margin: 0,
    },
    primary: {
        minHeight: 36,
        padding: "0 14px",
        borderRadius: 4,
        background: "linear-gradient(color-mix(in srgb, var(--dy-accent) 87%, white), var(--dy-accent))",
        color: dy.accentContrast,
        boxShadow: "inset 0 1px #ffffff38, 0 1px 2px #21192c20",
        border: "1px solid color-mix(in srgb, var(--dy-accent) 75%, #30283e)",
        fontWeight: 650,
        cursor: "pointer",
        textDecoration: "none",
    },
    secondary: {
        minHeight: 36,
        display: "inline-grid",
        placeItems: "center",
        padding: "0 13px",
        border: `1px solid ${dy.border}`,
        borderRadius: 4,
        background: "linear-gradient(var(--studio-button-top, var(--dy-surface)), var(--studio-button-bottom, var(--dy-surface2)))",
        color: dy.text,
        boxShadow: "inset 0 1px #ffffff80, 0 1px 2px #21192c12",
        fontWeight: 600,
        textDecoration: "none",
    },
    secondaryButton: {
        minHeight: 36,
        padding: "0 14px",
        border: `1px solid ${dy.border}`,
        borderRadius: 4,
        background: "linear-gradient(var(--studio-button-top, var(--dy-surface)), var(--studio-button-bottom, var(--dy-surface2)))",
        color: dy.text,
        boxShadow: "inset 0 1px #ffffff80, 0 1px 2px #21192c12",
        fontWeight: 600,
        cursor: "pointer",
    },
    notice: {
        maxWidth: "none",
        margin: "0 0 12px",
        padding: 12,
        border: `1px solid ${dy.border}`,
        borderRadius: 4,
        background: dy.surface2,
        color: dy.muted,
    },
    shell: {
        maxWidth: "none",
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "210px minmax(0,1fr)",
        gap: 12,
        alignItems: "start",
    },
    nav: {
        position: "sticky",
        top: 0,
        padding: 7,
        display: "grid",
        gap: 3,
        border: "1px solid #211d29",
        borderRadius: 5,
        background: "linear-gradient(90deg, #2b2833, #35313d)",
        color: "#e6e0ec",
        boxShadow: "inset 0 1px #ffffff0d, 0 1px 2px #21192c16",
    },
    navButton: {
        minHeight: 52,
        display: "grid",
        gridTemplateColumns: "28px minmax(0,1fr)",
        alignItems: "center",
        gap: 8,
        minWidth: 0,
        padding: "7px 8px",
        textAlign: "left",
        border: "1px solid transparent",
        borderRadius: 4,
        background: "transparent",
        color: "#ded8e5",
        cursor: "pointer",
    },
    navButtonActive: {
        borderColor: "#c9b9db55",
        background: "linear-gradient(color-mix(in srgb, var(--dy-accent) 65%, #6a5a77), color-mix(in srgb, var(--dy-accent) 60%, #372e43))",
        color: "#fff",
        boxShadow: "inset 0 1px #ffffff20, 0 1px 2px #0003",
    },
    guideLink: {
        padding: "10px 8px",
        display: "grid",
        gap: 3,
        borderTop: "1px solid #ffffff15",
        color: "#e1dbe9",
        textDecoration: "none",
        fontSize: 12,
    },
    navIdentity: {
        marginTop: 4,
        padding: "11px 8px 6px",
        display: "grid",
        gap: 4,
        borderTop: "1px solid #ffffff18",
        color: "#c2bbc9",
        fontSize: 11,
    },
    content: {
        minWidth: 0,
        display: "grid",
        gap: 12,
    },
    panel: {
        minWidth: 0,
        padding: 0,
        border: "1px solid var(--studio-border, var(--dy-border))",
        borderRadius: 5,
        background: "var(--studio-panel, var(--dy-surface))",
        boxShadow: "inset 0 1px #ffffff55, 0 2px 4px #21192c0b",
        overflow: "hidden",
    },
    sectionHead: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        minHeight: 38,
        padding: "8px 13px",
        borderBottom: "1px solid #21192c26",
        background: "linear-gradient(color-mix(in srgb, var(--studio-chrome, var(--dy-accent)) 90%, white), var(--studio-chrome, var(--dy-accent)))",
        color: "var(--studio-on-chrome, #fff)",
        boxShadow: "inset 0 1px #ffffff20",
    },
    h2: {
        margin: 0,
        fontSize: 13,
        fontWeight: 600,
        lineHeight: 1.35,
    },
    tag: {
        padding: "3px 6px",
        border: "1px solid #ffffff30",
        borderRadius: 3,
        background: "#ffffff12",
        color: "inherit",
        fontSize: 11,
        fontWeight: 500,
    },
    themes: {
        display: "grid",
        gridTemplateColumns: "repeat(4,minmax(0,1fr))",
        gap: 8,
    },
    themeCard: {
        minHeight: 112,
        textAlign: "left",
        padding: 11,
        border: "1px solid",
        borderRadius: 4,
        color: dy.text,
        cursor: "pointer",
        display: "grid",
        alignContent: "start",
        gap: 7,
    },
    swatches: {
        display: "flex",
        gap: 4,
    },
    swatch: {
        width: 20,
        height: 20,
        borderRadius: 7,
        border: "1px solid rgba(128,128,128,.18)",
    },
    previewGrid: {
        display: "grid",
        gridTemplateColumns: "minmax(0,1.2fr) minmax(280px,.8fr)",
        gap: 12,
    },
    choiceGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: 8,
    },
    choiceCard: {
        minHeight: 64,
        padding: 12,
        display: "grid",
        gap: 6,
        textAlign: "left",
        border: "1px solid",
        borderRadius: 4,
        color: dy.text,
        cursor: "pointer",
    },
    previewCard: {
        padding: 14,
        border: `1px solid ${dy.border}`,
        borderRadius: 5,
        background: dy.surface2,
        display: "grid",
        gap: 9,
    },
    previewTop: {
        display: "flex",
        gap: 10,
        alignItems: "center",
    },
    fakeAvatar: {
        width: 40,
        height: 40,
        borderRadius: 4,
        display: "grid",
        placeItems: "center",
        background: dy.accentSoft,
        color: dy.accent,
        fontWeight: 650,
    },
    previewMetric: {
        display: "flex",
        justifyContent: "space-between",
        padding: 9,
        borderRadius: 4,
        background: dy.input,
    },
    customAccentRow: {
        display: "grid",
        gridTemplateColumns: "minmax(260px,1fr) minmax(260px,1fr) auto",
        gap: 10,
        alignItems: "stretch",
    },
    colorPickerWrap: {
        minHeight: 72,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 12,
        border: `1px solid ${dy.border}`,
        borderRadius: 4,
        background: dy.surface2,
        color: dy.text,
    },
    colorPicker: {
        width: 48,
        height: 48,
        padding: 2,
        border: `1px solid ${dy.border}`,
        borderRadius: 4,
        background: dy.input,
        cursor: "pointer",
    },
    toggleRowCompact: {
        minHeight: 72,
        padding: 12,
        border: `1px solid ${dy.border}`,
        borderRadius: 4,
        background: dy.surface2,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
    },
    settingBlock: {
        minHeight: 60,
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) auto",
        alignItems: "center",
        gap: 18,
        padding: "10px 0",
        borderBottom: `1px solid ${dy.border}`,
    },
    segmented: {
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
    },
    segment: {
        minHeight: 36,
        padding: "0 11px",
        border: `1px solid ${dy.border}`,
        borderRadius: 4,
        cursor: "pointer",
        fontWeight: 600,
    },
    toggleRow: {
        minHeight: 60,
        padding: 12,
        border: `1px solid ${dy.border}`,
        borderRadius: 4,
        background: dy.surface2,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
    },
    roleGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(3,minmax(0,1fr))",
        gap: 8,
    },
    workspaceCard: {
        minHeight: 94,
        padding: 13,
        display: "grid",
        alignContent: "space-between",
        gap: 8,
        border: "1px solid",
        borderRadius: 4,
        background: dy.surface2,
        color: dy.text,
        textDecoration: "none",
    },
    quickLinks: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
        gap: 7,
    },
    quickLink: {
        minHeight: 58,
        padding: 11,
        display: "grid",
        alignContent: "space-between",
        gap: 7,
        border: `1px solid ${dy.border}`,
        borderRadius: 4,
        background: dy.surface2,
        color: dy.text,
        textDecoration: "none",
    },
    identityGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: 8,
    },
    identity: {
        minHeight: 62,
        padding: 11,
        display: "grid",
        gap: 5,
        borderRadius: 4,
        border: `1px solid ${dy.border}`,
        background: dy.surface2,
        color: dy.muted,
    },
    formGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2,minmax(0,1fr))",
        gap: 9,
    },
    field: {
        display: "grid",
        gap: 5,
        fontSize: 13,
        color: dy.muted,
    },
    input: {
        minHeight: 36,
        borderRadius: 4,
        border: `1px solid ${dy.border}`,
        background: dy.input,
        color: dy.text,
        padding: "0 11px",
    },
    checks: {
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        marginTop: 13,
    },
    check: {
        display: "flex",
        gap: 7,
        alignItems: "center",
        padding: "8px 10px",
        borderRadius: 4,
        border: `1px solid ${dy.border}`,
        background: dy.surface2,
    },
    addressActionRow: {
        marginTop: 14,
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        flexWrap: "wrap",
    },
    addressVerifiedBox: {
        flex: "1 1 360px",
        minWidth: 0,
        padding: 12,
        display: "grid",
        gap: 4,
        border: `1px solid ${dy.border}`,
        borderRadius: 4,
        background: dy.accentSoft,
        color: dy.text,
        fontSize: 13,
        lineHeight: 1.5,
    },
    tagMuted: {
        padding: "6px 9px",
        borderRadius: 3,
        border: `1px solid ${dy.border}`,
        background: dy.surface2,
        color: dy.muted,
        fontSize: 12,
        fontWeight: 600,
    },
    panelText: {
        margin: 0,
        color: dy.muted,
        lineHeight: 1.65,
    },
    systemRows: {
        display: "grid",
        gap: 7,
    },
    systemRow: {
        minHeight: 56,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        padding: "10px 11px",
        border: `1px solid ${dy.border}`,
        borderRadius: 4,
        background: dy.surface2,
    },
};
