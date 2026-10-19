"use client";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "@/lib/i18n/UiLink";
import { useRouter } from "next/navigation";
import ConnectionStatus from "@/app/ConnectionStatus";
import NotificationCenter from "@/app/NotificationCenter";
import { dy, useDentayaThemeRuntime } from "@/app/dentaya-theme";
import { dentayaError } from "@/lib/dentaya-errors";
import { supabase } from "@/lib/supabase";
type OrgType = "clinic" | "laboratory" | "courier";
type Organization = {
    id: string;
    name: string;
    org_type: OrgType;
};
type Membership = {
    organization_id: string;
    role: string;
};
type TeamMember = {
    membership_id: string;
    user_id: string;
    full_name: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
};
type InviteRow = {
    id: string;
    organization_id: string;
    email: string;
    role: string;
    expires_at: string;
    invited_by: string;
    accepted_at: string | null;
    revoked_at: string | null;
    created_at: string;
};
type CreatedInvite = {
    invite_id: string;
    organization_id: string;
    email: string;
    role: string;
    token: string;
    expires_at: string;
};
export default function TeamPage() {
    const { t: uiText, intlLocale } = useTranslation();
    useDentayaThemeRuntime();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [membership, setMembership] = useState<Membership | null>(null);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [invites, setInvites] = useState<InviteRow[]>([]);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("");
    const [expiresDays, setExpiresDays] = useState("7");
    const [freshLink, setFreshLink] = useState("");
    const [freshInviteEmail, setFreshInviteEmail] = useState("");
    const [copied, setCopied] = useState(false);
    const isAdmin = membership?.role === "owner" || membership?.role === "admin";
    const isOwner = membership?.role === "owner";
    const roleOptions = useMemo(() => rolesForOrg(organization?.org_type), [organization?.org_type]);
    useEffect(() => {
        let active = true;
        async function boot() {
            const { data: auth } = await supabase.auth.getSession();
            const user = auth.session?.user;
            if (!user) {
                router.replace("/workspace");
                return;
            }
            const { data: membershipData, error: membershipError } = await supabase
                .from("memberships").select("organization_id,role")
                .eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
            if (membershipError || !membershipData) {
                setMessage(dentayaError(membershipError, "Aktif kurum üyeliği bulunamadı."));
                setLoading(false);
                return;
            }
            const currentMembership = membershipData as Membership;
            const { data: orgData, error: orgError } = await supabase
                .from("organizations").select("id,name,org_type")
                .eq("id", currentMembership.organization_id).maybeSingle();
            if (orgError || !orgData) {
                setMessage(dentayaError(orgError, "Kurum bilgisi alınamadı."));
                setLoading(false);
                return;
            }
            if (!active)
                return;
            const currentOrg = orgData as Organization;
            setMembership(currentMembership);
            setOrganization(currentOrg);
            if (["owner", "admin"].includes(currentMembership.role)) {
                setInviteRole(rolesForOrg(currentOrg.org_type)[0]?.value ?? "viewer");
                await loadTeam(currentOrg.id);
            }
            if (active)
                setLoading(false);
        }
        void boot();
        return () => { active = false; };
    }, [router]);
    useEffect(() => {
        function recover() {
            if (organization && isAdmin)
                void loadTeam(organization.id);
        }
        window.addEventListener("dentaya-network-restored", recover);
        return () => window.removeEventListener("dentaya-network-restored", recover);
    }, [organization, isAdmin]);
    async function loadTeam(orgId: string) {
        const [membersResult, invitesResult] = await Promise.all([
            supabase.rpc("dentaya_team_members"),
            supabase.from("organization_invites")
                .select("id,organization_id,email,role,expires_at,invited_by,accepted_at,revoked_at,created_at")
                .eq("organization_id", orgId).order("created_at", { ascending: false }),
        ]);
        if (membersResult.error)
            setMessage(dentayaError(membersResult.error, "Ekip üyeleri yüklenemedi."));
        if (invitesResult.error)
            setMessage(dentayaError(invitesResult.error, "Ekip davetleri yüklenemedi."));
        setMembers((membersResult.data ?? []) as TeamMember[]);
        setInvites((invitesResult.data ?? []) as InviteRow[]);
    }
    async function createInvite(emailOverride?: string, roleOverride?: string) {
        if (!organization || !isAdmin || busy)
            return;
        const email = (emailOverride ?? inviteEmail).trim().toLowerCase();
        const role = roleOverride ?? inviteRole;
        if (!email) {
            setMessage("Davet edilecek e-posta adresini yaz.");
            return;
        }
        setBusy(true);
        setMessage("");
        setFreshLink("");
        setCopied(false);
        const { data, error } = await supabase.rpc("dentaya_create_team_invite", {
            p_email: email,
            p_role: role,
            p_expires_days: Math.max(1, Math.min(Number(expiresDays) || 7, 30)),
        });
        setBusy(false);
        if (error || !data) {
            setMessage(dentayaError(error, "Ekip daveti oluşturulamadı."));
            return;
        }
        const created = data as CreatedInvite;
        const link = `${window.location.origin}/invite?token=${encodeURIComponent(created.token)}`;
        setFreshLink(link);
        setFreshInviteEmail(created.email);
        setInviteEmail("");
        await loadTeam(organization.id);
    }
    async function copyInvite() {
        if (!freshLink)
            return;
        try {
            await navigator.clipboard.writeText(freshLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        }
        catch {
            setMessage("Davet bağlantısı panoya kopyalanamadı.");
        }
    }
    async function revokeInvite(id: string) {
        if (!organization || busy)
            return;
        setBusy(true);
        setMessage("");
        const { error } = await supabase.rpc("dentaya_revoke_team_invite", { p_invite_id: id });
        setBusy(false);
        if (error) {
            setMessage(dentayaError(error, "Davet iptal edilemedi."));
            return;
        }
        await loadTeam(organization.id);
    }
    async function setMemberStatus(member: TeamMember) {
        if (!organization || busy)
            return;
        const next = member.status === "active" ? "suspended" : "active";
        setBusy(true);
        setMessage("");
        const { error } = await supabase.rpc("dentaya_set_team_member_status", {
            p_membership_id: member.membership_id, p_status: next,
        });
        setBusy(false);
        if (error) {
            setMessage(dentayaError(error, "Ekip üyeliği güncellenemedi."));
            return;
        }
        await loadTeam(organization.id);
    }
    async function changeRole(member: TeamMember, role: string) {
        if (!organization || !isOwner || busy || member.role === "owner")
            return;
        setBusy(true);
        setMessage("");
        const { error } = await supabase.rpc("dentaya_set_team_member_role", {
            p_membership_id: member.membership_id, p_role: role,
        });
        setBusy(false);
        if (error) {
            setMessage(dentayaError(error, "Ekip rolü güncellenemedi."));
            return;
        }
        await loadTeam(organization.id);
    }
    const pendingInvites = invites.filter(i => !i.accepted_at && !i.revoked_at && new Date(i.expires_at).getTime() > Date.now());
    if (loading) return <LoadingExperience title="Ekip yönetimi hazırlanıyor…"/>;
    if (!organization || !membership)
        return <UiNode as="main" style={ui.center}>{message || "Çalışma alanı bulunamadı."}</UiNode>;
    if (!isAdmin) {
        return <UiNode as="main" style={ui.page}>
      <ConnectionStatus />
      <UiNode as="section" style={ui.accessCard}>
        <UiNode as="p" style={ui.eyebrow}>EKİP YÖNETİMİ</UiNode>
        <UiNode as="h1" style={ui.title}>Yönetici yetkisi gerekiyor</UiNode>
        <UiNode as="p" style={ui.subtitle}>Ekip üyeleri ve davetler yalnız kurum sahibi veya yönetici tarafından yönetilebilir.</UiNode>
        <Link href="/settings" style={ui.primaryLink}>Ayarlara Dön</Link>
      </UiNode>
    </UiNode>;
    }
    return <UiNode as="main" style={ui.page}>
    <ConnectionStatus />
    <style>{`
      *{box-sizing:border-box}
      @media(max-width:900px){.team-grid{grid-template-columns:1fr!important}}
      @media(max-width:680px){
        .team-header{align-items:flex-start!important}
        .team-member{grid-template-columns:1fr!important}
        .team-member-actions{justify-content:flex-start!important}
        .team-form{grid-template-columns:1fr!important}
      }
    `}</style>

    <UiNode as="header" className="team-header" style={ui.header}>
      <UiNode as="div">
        <Link href="/settings" style={ui.back}>{uiText("← Ayarlar")}</Link>
        <UiNode as="p" style={ui.eyebrow}>KURUM & YETKİ</UiNode>
        <UiNode as="h1" style={ui.title}>Ekip Yönetimi</UiNode>
        <UiNode as="p" style={ui.subtitle}><UserText>{organization.name}</UserText> çalışma alanına kullanıcı davet et, rol ata ve pilot erişimini kontrol et.</UiNode>
      </UiNode>
      <NotificationCenter />
    </UiNode>

    {message && <UiNode as="div" style={ui.notice}>{message}</UiNode>}

    <UiNode as="section" className="team-grid" style={ui.grid}>
      <UiNode as="div" style={ui.stack}>
        <UiNode as="section" style={ui.panel}>
          <UiNode data-dy-copy-stack as="div" style={ui.panelTitle}>
            <UiNode as="strong">Yeni ekip daveti</UiNode>
            <UiNode as="span">Davet bağlantısı yalnız yazdığın e-posta hesabı tarafından kabul edilir.</UiNode>
          </UiNode>

          <UiNode as="div" className="team-form" style={ui.inviteForm}>
            <UiNode as="label" style={ui.field}><UiNode as="span">{uiText("E-posta")}</UiNode>
              <UiNode as="input" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="hekim@klinik.com" style={ui.input}/>
            </UiNode>

            <UiNode as="label" style={ui.field}><UiNode as="span">{uiText("Rol")}</UiNode>
              <UiNode as="select" value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={ui.input}>
                {roleOptions.map(r => <UiNode as="option" key={r.value} value={r.value}>{r.label}</UiNode>)}
              </UiNode>
            </UiNode>

            <UiNode as="label" style={ui.field}><UiNode as="span">Süre</UiNode>
              <UiNode as="select" value={expiresDays} onChange={e => setExpiresDays(e.target.value)} style={ui.input}>
                <UiNode as="option" value="1">1 gün</UiNode><UiNode as="option" value="3">3 gün</UiNode>
                <UiNode as="option" value="7">7 gün</UiNode><UiNode as="option" value="14">14 gün</UiNode><UiNode as="option" value="30">30 gün</UiNode>
              </UiNode>
            </UiNode>

            <UiNode as="button" type="button" disabled={busy} onClick={() => void createInvite()} style={ui.primaryButton}>
              Davet Bağlantısı Oluştur
            </UiNode>
          </UiNode>

          {freshLink && <UiNode as="div" style={ui.inviteResult}>
            <UiNode data-dy-copy-stack as="div" className="dy-title-detail"><UiNode as="strong">Davet hazır</UiNode><UiNode as="span">{freshInviteEmail} için bağlantıyı güvenli şekilde paylaş.</UiNode></UiNode>
            <UiNode as="div" style={ui.linkBox}><UiNode as="code">{freshLink}</UiNode></UiNode>
            <UiNode as="button" type="button" onClick={() => void copyInvite()} style={ui.secondaryButton}>
              {copied ? "Kopyalandı" : "Bağlantıyı Kopyala"}
            </UiNode>
          </UiNode>}
        </UiNode>

        <UiNode as="section" style={ui.panel}>
          <UiNode data-dy-copy-stack as="div" style={ui.panelTitle}>
            <UiNode as="strong">Aktif ekip</UiNode>
            <UiNode as="span">Kurum sahibi sabittir. Rol değiştirme yalnız kurum sahibindedir.</UiNode>
          </UiNode>

          <UiNode as="div" style={ui.list}>
            {members.map(member => <UiNode as="article" key={member.membership_id} className="team-member" style={ui.member}>
              <UiNode as="div" style={ui.memberCopy}>
                <UiNode as="strong"><UserText>{member.full_name}</UserText></UiNode><UiNode as="span">{member.email}</UiNode>
                <UiNode as="small">Katılım {formatDate(member.created_at, intlLocale())}</UiNode>
              </UiNode>

              <UiNode as="div">
                {isOwner && member.role !== "owner"
                ? <UiNode as="select" value={member.role} disabled={busy} onChange={e => void changeRole(member, e.target.value)} style={ui.roleSelect}>
                      {roleOptions.map(r => <UiNode as="option" key={r.value} value={r.value}>{r.label}</UiNode>)}
                    </UiNode>
                : <UiNode as="span" style={ui.roleBadge}>{roleLabel(member.role)}</UiNode>}
              </UiNode>

              <UiNode as="div" className="team-member-actions" style={ui.memberActions}>
                <UiNode as="span" style={{ ...ui.statusBadge, color: member.status === "active" ? "#63cc98" : "#e8bd73" }}>
                  {member.status === "active" ? uiText("AKTİF") : "PASİF"}
                </UiNode>
                {member.role !== "owner" && <UiNode as="button" type="button" disabled={busy} onClick={() => void setMemberStatus(member)} style={ui.ghostButton}>
                  {member.status === "active" ? "Pasifleştir" : "Aktifleştir"}
                </UiNode>}
              </UiNode>
            </UiNode>)}
          </UiNode>
        </UiNode>
      </UiNode>

      <UiNode as="aside" style={ui.stack}>
        <UiNode as="section" style={ui.panel}>
          <UiNode data-dy-copy-stack as="div" style={ui.panelTitle}>
            <UiNode as="strong">Bekleyen davetler</UiNode>
            <UiNode as="span">Eski bağlantıyı yeniden paylaşmak yerine yeni bağlantı üret.</UiNode>
          </UiNode>

          {pendingInvites.length
            ? <UiNode as="div" style={ui.list}>{pendingInvites.map(invite => <UiNode as="article" key={invite.id} style={ui.inviteItem}>
                <UiNode as="strong">{invite.email}</UiNode>
                <UiNode as="span">{roleLabel(invite.role)} · {formatExpiry(invite.expires_at)}</UiNode>
                <UiNode as="div" style={ui.inlineActions}>
                  <UiNode as="button" type="button" disabled={busy} onClick={() => void createInvite(invite.email, invite.role)} style={ui.secondaryButton}>Yeni Bağlantı</UiNode>
                  <UiNode as="button" type="button" disabled={busy} onClick={() => void revokeInvite(invite.id)} style={ui.dangerButton}>İptal Et</UiNode>
                </UiNode>
              </UiNode>)}</UiNode>
            : <UiNode as="div" style={ui.empty}>Bekleyen ekip daveti yok.</UiNode>}
        </UiNode>

        <UiNode as="section" style={ui.boundary}>
          <UiNode as="strong">Pilot erişim kuralı</UiNode>
          <UiNode as="span">Bir kullanıcı aynı anda tek aktif kuruma bağlıdır. Bu kural klinik, laboratuvar ve kurye yetki sınırlarını açık tutar.</UiNode>
        </UiNode>

        <UiNode as="section" style={ui.boundary}>
          <UiNode as="strong">{organization.org_type === "clinic" ? "Klinik rolleri" : organization.org_type === "laboratory" ? "Laboratuvar rolleri" : "Kurye rolleri"}</UiNode>
          <UiNode as="span">{roleOptions.map(r => uiText(r.label)).join(" · ")}</UiNode>
        </UiNode>
      </UiNode>
    </UiNode>
  </UiNode>;
}
function rolesForOrg(type: OrgType | undefined) {
    if (type === "clinic")
        return [
            { value: "admin", label: "Yönetici" }, { value: "dentist", label: "Diş Hekimi" },
            { value: "assistant", label: "Klinik Asistanı" }, { value: "viewer", label: "Salt Okunur" },
        ];
    if (type === "laboratory")
        return [
            { value: "admin", label: "Yönetici" }, { value: "technician", label: "Diş Teknisyeni" }, { value: "viewer", label: "Salt Okunur" },
        ];
    return [
        { value: "admin", label: "Yönetici" }, { value: "courier", label: "Kurye" }, { value: "viewer", label: "Salt Okunur" },
    ];
}
function roleLabel(role: string) {
    return ({ owner: "Kurum Sahibi", admin: "Yönetici", dentist: "Diş Hekimi", assistant: "Klinik Asistanı",
        technician: "Diş Teknisyeni", courier: "Kurye", viewer: "Salt Okunur" } as Record<string, string>)[role] ?? role;
}
function formatDate(value: string, localeTag: string = "tr-TR") {
    return new Intl.DateTimeFormat(localeTag, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}
function formatExpiry(value: string) {
    const days = Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
    return days > 0 ? `${days} gün kaldı` : "Süresi doldu";
}
const ui: Record<string, CSSProperties> = {
    page: { minHeight: "100vh", padding: "24px clamp(18px,4vw,52px) 64px", background: dy.bg, color: dy.text, fontFamily: "Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" },
    center: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: dy.bg, color: dy.muted },
    header: { maxWidth: 1320, margin: "0 auto 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16 },
    back: { color: dy.muted, textDecoration: "none", fontSize: 13 },
    eyebrow: { margin: "14px 0 6px", color: dy.accent, fontSize: 12, fontWeight: 900, letterSpacing: ".14em" },
    title: { margin: "0 0 8px", fontSize: "clamp(36px,5vw,58px)", letterSpacing: "-.045em" },
    subtitle: { maxWidth: 760, margin: 0, color: dy.muted, lineHeight: 1.6 },
    notice: { maxWidth: 1320, margin: "0 auto 12px", padding: 12, border: `1px solid ${dy.border}`, borderRadius: 10, background: dy.surface2, color: dy.muted },
    grid: { maxWidth: 1320, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(320px,.65fr)", gap: 10, alignItems: "start" },
    stack: { display: "grid", gap: 10 },
    panel: { padding: 15, display: "grid", gap: 13, border: `1px solid ${dy.border}`, borderRadius: 14, background: dy.surface },
    panelTitle: { display: "grid", gap: 4, color: dy.muted, fontSize: 13 },
    inviteForm: { display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(160px,.45fr) minmax(120px,.3fr) auto", gap: 8, alignItems: "end" },
    field: { display: "grid", gap: 5, color: dy.muted, fontSize: 12, fontWeight: 800 },
    input: { width: "100%", minHeight: 42, padding: "0 10px", border: `1px solid ${dy.border}`, borderRadius: 9, background: dy.input, color: dy.text, fontSize: 14, outline: "none" },
    primaryButton: { minHeight: 42, padding: "0 13px", border: 0, borderRadius: 9, background: dy.accent, color: dy.accentContrast, fontWeight: 900, cursor: "pointer" },
    primaryLink: { minHeight: 42, display: "inline-grid", placeItems: "center", padding: "0 13px", borderRadius: 9, background: dy.accent, color: dy.accentContrast, textDecoration: "none", fontSize: 13, fontWeight: 900 },
    secondaryButton: { minHeight: 38, padding: "0 10px", border: `1px solid ${dy.border}`, borderRadius: 8, background: dy.surface2, color: dy.text, fontSize: 12, fontWeight: 850, cursor: "pointer" },
    dangerButton: { minHeight: 38, padding: "0 10px", border: "1px solid rgba(232,120,120,.45)", borderRadius: 8, background: "rgba(232,120,120,.08)", color: "#e87878", fontSize: 12, fontWeight: 850, cursor: "pointer" },
    ghostButton: { minHeight: 34, padding: "0 9px", border: `1px solid ${dy.border}`, borderRadius: 8, background: "transparent", color: dy.muted, fontSize: 12, fontWeight: 800, cursor: "pointer" },
    inviteResult: { padding: 12, display: "grid", gap: 8, border: `1px solid ${dy.accent}`, borderRadius: 11, background: dy.accentSoft, color: dy.muted },
    linkBox: { overflowX: "auto", padding: 9, borderRadius: 8, background: dy.input, color: dy.text, fontSize: 12 },
    list: { display: "grid", gap: 7 },
    member: { minHeight: 86, padding: 12, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(140px,.45fr) auto", alignItems: "center", gap: 10, border: `1px solid ${dy.border}`, borderRadius: 11, background: dy.surface2 },
    memberCopy: { minWidth: 0, display: "grid", gap: 3, color: dy.muted, fontSize: 13 },
    roleSelect: { width: "100%", minHeight: 38, padding: "0 9px", border: `1px solid ${dy.border}`, borderRadius: 8, background: dy.input, color: dy.text },
    roleBadge: { display: "inline-flex", minHeight: 30, alignItems: "center", padding: "0 9px", borderRadius: 999, background: dy.accentSoft, color: dy.accent, fontSize: 12, fontWeight: 850 },
    memberActions: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 7, flexWrap: "wrap" },
    statusBadge: { fontSize: 11, fontWeight: 900, letterSpacing: ".08em" },
    inviteItem: { padding: 11, display: "grid", gap: 5, border: `1px solid ${dy.border}`, borderRadius: 10, background: dy.surface2, color: dy.muted, fontSize: 13 },
    inlineActions: { display: "flex", gap: 7, flexWrap: "wrap", marginTop: 5 },
    empty: { minHeight: 130, display: "grid", placeItems: "center", color: dy.muted, border: `1px dashed ${dy.border}`, borderRadius: 10 },
    boundary: { padding: 13, display: "grid", gap: 5, border: `1px solid ${dy.border}`, borderRadius: 12, background: dy.surface2, color: dy.muted, fontSize: 13, lineHeight: 1.5 },
    accessCard: { maxWidth: 680, minHeight: 320, margin: "70px auto", padding: 24, display: "grid", alignContent: "center", gap: 9, border: `1px solid ${dy.border}`, borderRadius: 16, background: dy.surface },
};
