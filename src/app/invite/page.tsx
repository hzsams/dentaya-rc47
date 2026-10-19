"use client";
import { workflowText, type WorkflowMessage } from "@/lib/i18n/workflow-safety";
import UiNode from "@/lib/i18n/UiNode";
import { getLocale, useTranslation } from '@/lib/i18n';
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "@/lib/i18n/UiLink";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import ConnectionStatus from "@/app/ConnectionStatus";
import { dy, useDentayaThemeRuntime } from "@/app/dentaya-theme";
import { dentayaError } from "@/lib/dentaya-errors";
import { supabase } from "@/lib/supabase";
import { teamInviteToken } from "@/lib/team-invite";
type AcceptResult = {
    organization_id: string;
    organization_name: string;
    role: string;
    already_accepted: boolean;
};
export default function InvitePage() {
    const { t: uiText, locale } = useTranslation();
    useDentayaThemeRuntime();
    const copy = (source: WorkflowMessage, values?: readonly string[]) => workflowText(locale, source, values);
    const router = useRouter();
    const [booting, setBooting] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState("");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [accepted, setAccepted] = useState<AcceptResult | null>(null);
    const [tokenInput, setTokenInput] = useState("");
    const acceptLock = useRef(false);
    useEffect(() => {
        let active = true;
        async function boot() {
            const raw = new URLSearchParams(window.location.search).get("token")?.trim() ?? "";
            const value = teamInviteToken(raw) ?? "";
            if (raw && !value) setMessage(workflowText(getLocale(), "Davet bağlantısı geçersiz. Yöneticinizden yeni bir davet kodu isteyin."));
            setToken(value);
            try { if (value) {
                window.localStorage.setItem("dentaya_pending_invite", value);
            } }
            catch { }
            try {
                const { data, error } = await supabase.auth.getSession();
                if (!active) return;
                if (error) setMessage(dentayaError(error));
                setUser(data.session?.user ?? null);
            } catch (error) { if (active) setMessage(dentayaError(error)); }
            finally { if (active) setBooting(false); }
        }
        void boot();
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (active)
                setUser(session?.user ?? null);
        });
        return () => {
            active = false;
            listener.subscription.unsubscribe();
        };
    }, []);
    function openToken() {
        const value = teamInviteToken(tokenInput);
        if (!value) { setMessage(copy("48 karakterlik davet kodunu veya tam davet bağlantısını yapıştırın.")); return; }
        setToken(value);
        setMessage("");
        try { window.localStorage.setItem("dentaya_pending_invite", value); } catch { }
    }
    async function acceptInvite() {
        if (!user || !token || acceptLock.current)
            return;
        acceptLock.current = true;
        setBusy(true);
        setMessage("");
        try {
        const { data, error } = await supabase.rpc("dentaya_accept_team_invite", { p_token: token });
        if (error || !data) {
            setMessage(dentayaError(error, "Ekip daveti kabul edilemedi."));
            return;
        }
        setAccepted(data as AcceptResult);
        try {
            window.localStorage.removeItem("dentaya_pending_invite");
        }
        catch { }
        } catch (error) { setMessage(dentayaError(error, "Ekip daveti kabul edilemedi.")); }
        finally { acceptLock.current = false; setBusy(false); }
    }
    if (booting)
        return <UiNode as="main" style={ui.center}>Davet kontrol ediliyor…</UiNode>;
    return <UiNode as="main" style={ui.page}>
    <ConnectionStatus />
    <UiNode as="section" style={ui.card}>
      <UiNode as="p" style={ui.eyebrow}>DENTAYA EKİP DAVETİ</UiNode>

      {accepted ? <>
        <UiNode as="h1" style={ui.title}>Ekibe katıldın</UiNode>
        <UiNode as="p" style={ui.text}>
          <UiNode as="strong">{accepted.organization_name}</UiNode>{" çalışma alanına "}
          <UiNode as="strong">{roleLabel(accepted.role)}</UiNode>{" rolüyle erişimin açıldı."}
        </UiNode>
        <UiNode as="button" type="button" onClick={() => router.replace("/workspace")} style={ui.primaryButton}>
          Çalışma Alanını Aç
        </UiNode>
      </> : !token ? <>
        <UiNode as="h1" style={ui.title}>{copy("Davet koduyla ekibe katıl")}</UiNode>
        <UiNode as="p" style={ui.text}>{copy("Kurum yöneticinizin paylaştığı davet kodunu veya bağlantısını bu cihazdaki DentAYA’ya yapıştırın.")}</UiNode>
        <UiNode as="label" style={ui.text}>{copy("Davet kodu veya bağlantısı")}<UiNode as="input" autoComplete="off" maxLength={2048} value={tokenInput} onChange={event => setTokenInput(event.target.value)} style={{ width: "100%", minHeight: 44, padding: 10, background: dy.input, color: dy.text, border: `1px solid ${dy.border}`, borderRadius: 10 }}/></UiNode>
        {message && <UiNode as="div" role="alert" style={ui.notice}>{message}</UiNode>}
        <UiNode as="button" type="button" disabled={!tokenInput.trim()} onClick={openToken} style={ui.primaryButton}>Daveti Aç</UiNode>
        <Link href="/" style={ui.secondaryLink}>{uiText("Ana Sayfa")}</Link>
      </> : !user ? <>
        <UiNode as="h1" style={ui.title}>Önce giriş yap</UiNode>
        <UiNode as="p" style={ui.text}>
          Davet bağlantısını kaydettik. Davetin gönderildiği e-posta hesabıyla giriş yap veya hesap oluştur.
          Girişten sonra ana sayfada “Bekleyen Ekip Daveti” kartı görünecek.
        </UiNode>
        <Link href="/" style={ui.primaryLink}>Giriş / Hesap Oluştur</Link>
      </> : <>
        <UiNode as="h1" style={ui.title}>Ekip davetini kabul et</UiNode>
        <UiNode as="p" style={ui.text}>
          Bu bağlantı e-posta adresine özel ve tek kullanımlıktır. Kabul ettiğinde hesabın davet eden kurumun çalışma alanına bağlanır.
        </UiNode>

        {message && <UiNode as="div" style={ui.notice}>{message}</UiNode>}

        <UiNode as="button" type="button" disabled={busy} onClick={() => void acceptInvite()} style={ui.primaryButton}>
          {busy ? "Davet Kontrol Ediliyor…" : "Daveti Kabul Et"}
        </UiNode>
        <Link href="/" style={ui.secondaryLink}>Vazgeç</Link>
      </>}
    </UiNode>
  </UiNode>;
}
function roleLabel(role: string) {
    return ({ admin: "Yönetici", dentist: "Diş Hekimi", assistant: "Klinik Asistanı",
        technician: "Diş Teknisyeni", courier: "Kurye", viewer: "Salt Okunur" } as Record<string, string>)[role] ?? role;
}
const ui: Record<string, CSSProperties> = {
    page: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 22, background: dy.bg, color: dy.text, fontFamily: "Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" },
    center: { minHeight: "100vh", display: "grid", placeItems: "center", background: dy.bg, color: dy.muted },
    card: { width: "min(620px,100%)", minHeight: 360, padding: "clamp(22px,5vw,42px)", display: "grid", alignContent: "center", gap: 11, border: `1px solid ${dy.border}`, borderRadius: 18, background: dy.surface, boxShadow: `0 24px 70px ${dy.shadow}` },
    eyebrow: { margin: 0, color: dy.accent, fontSize: 12, fontWeight: 900, letterSpacing: ".14em" },
    title: { margin: 0, fontSize: "clamp(34px,6vw,52px)", letterSpacing: "-.045em" },
    text: { margin: 0, color: dy.muted, lineHeight: 1.65 },
    notice: { padding: 11, border: `1px solid ${dy.border}`, borderRadius: 9, background: dy.surface2, color: dy.muted, fontSize: 13 },
    primaryButton: { minHeight: 44, padding: "0 14px", border: 0, borderRadius: 10, background: dy.accent, color: dy.accentContrast, fontSize: 14, fontWeight: 900, cursor: "pointer" },
    primaryLink: { minHeight: 44, display: "grid", placeItems: "center", padding: "0 14px", borderRadius: 10, background: dy.accent, color: dy.accentContrast, textDecoration: "none", fontSize: 14, fontWeight: 900 },
    secondaryLink: { minHeight: 42, display: "grid", placeItems: "center", padding: "0 14px", border: `1px solid ${dy.border}`, borderRadius: 10, background: dy.surface2, color: dy.text, textDecoration: "none", fontSize: 13, fontWeight: 850 },
};
