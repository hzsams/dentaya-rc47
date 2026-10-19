"use client";
import UiNode from "@/lib/i18n/UiNode";
import { useEffect, useState, type CSSProperties } from "react";
import Link from "@/lib/i18n/UiLink";
import { supabase } from "@/lib/supabase";
import { dy, useDentayaThemeRuntime } from "@/app/dentaya-theme";
import ConnectionStatus from "@/app/ConnectionStatus";
import UiMessage from "@/lib/i18n/UiMessage";
import { memberRoleLabel } from "@/lib/display-labels";
type Check = {
    label: string;
    detail: string;
    ok: boolean | null;
    required?: boolean;
    values?: string[];
    userValues?: number[];
};
export default function PilotCheckPage() {
    useDentayaThemeRuntime();
    const [checks, setChecks] = useState<Check[]>([]);
    const [running, setRunning] = useState(true);
    async function run() {
        setRunning(true);
        const next: Check[] = [];
        try {
        next.push({ label: "Tarayıcı bağlantısı", detail: navigator.onLine ? "Çevrimiçi" : "Çevrimdışı", ok: navigator.onLine });
        const canvas = document.createElement("canvas");
        const webgl = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
        next.push({ label: "3D / WebGL", detail: webgl ? "Tarayıcı 3D görüntülemeyi destekliyor" : "WebGL kullanılamıyor", ok: webgl });
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        const accessToken = sessionData.session?.access_token;
        next.push({ label: "Oturum", detail: user ? "Giriş aktif" : "Oturum yok", ok: Boolean(user) && !sessionError });
        try {
            const healthResponse = await fetch("/api/health", { cache: "no-store", headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} });
            const health = await healthResponse.json() as {
                status?: string;
                checks?: {
                    supabase?: boolean;
                    mapsEmbed?: boolean;
                    mapsGeocoding?: boolean;
                    mapsRoutes?: boolean;
                };
            };
            next.push({ label: "Sunucu yapılandırması", detail: health.status === "ready" ? "Zorunlu production servisleri hazır" : "Eksik production ortam değişkeni var", ok: health.status === "ready" });
            if (health.checks) {
                next.push({ label: "Google Maps", detail: health.checks.mapsRoutes && health.checks.mapsGeocoding ? "Routes + Geocoding hazır" : "Routes veya Geocoding anahtarı eksik", ok: Boolean(health.checks.mapsRoutes && health.checks.mapsGeocoding), required:false });
                next.push({ label: "Harita görünümü", detail: health.checks.mapsEmbed ? "Embed anahtarı hazır" : "Embed anahtarı yok; fallback görünüm kullanılır", ok: health.checks.mapsEmbed ?? false, required:false });
            }
            else {
                next.push({ label: "Sunucu ayrıntıları", detail: "Ayrıntılı health bilgisi yalnız doğrulanmış oturumlara açılır.", ok: Boolean(user) });
            }
        }
        catch {
            next.push({ label: "Sunucu sağlık kontrolü", detail: "/api/health yanıt vermedi", ok: false });
        }
        if (user) {
            const { data: membership, error: membershipError } = await supabase.from("memberships").select("organization_id,role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
            next.push({ label: "Kurum üyeliği", detail: membership ? "Aktif rol: {0}" : "Aktif üyelik yok", values:membership ? [memberRoleLabel(membership.role)] : undefined, ok: Boolean(membership) && !membershipError });
            if (membership) {
                const { data: org, error: orgError } = await supabase.from("organizations").select("name,org_type").eq("id", membership.organization_id).maybeSingle();
                next.push({ label: "Kurum erişimi", detail: org ? "{0} · {1}" : "Kurum okunamadı", values:org ? [org.name,org.org_type === "clinic" ? "Klinik" : org.org_type === "laboratory" ? "Laboratuvar" : "Kurye"]:undefined, userValues:[0], ok: Boolean(org) && !orgError });
                const { error: notificationError } = await supabase.from("notifications").select("id", { head: true, count: "exact" }).eq("organization_id", membership.organization_id);
                next.push({ label: "Veritabanı / RLS", detail: notificationError ? "Yetkili sorgu başarısız" : "Yetkili sorgu başarılı", ok: !notificationError });
            }
        }
        } catch {
            next.push({label:"Oturum ve kurum bağlantısı",detail:"Bağlantı kurulamadı. Yeniden deneyin.",ok:false});
        } finally {
            setChecks(next);
            setRunning(false);
        }
    }
    useEffect(() => { void run(); }, []);
    const requiredChecks = checks.filter(x => x.required !== false);
    const passed = requiredChecks.filter(x => x.ok === true).length;
    return <UiNode as="main" style={ui.page}>
    <ConnectionStatus />
    <UiNode as="header" style={ui.header}>
      <UiNode as="div"><Link href="/" style={ui.back}>← DentAYA</Link><UiNode as="p" style={ui.eyebrow}>PİLOT KONTROLÜ</UiNode><UiNode as="h1" style={ui.title}>Sistem Kontrolü</UiNode><UiNode as="p" style={ui.sub}>Pilot veya staging açmadan önce bu cihazın temel DentAYA gereksinimlerini hızlıca doğrula.</UiNode></UiNode>
      <UiNode as="button" type="button" onClick={() => void run()} disabled={running} style={ui.primary}>{running ? "Kontrol Ediliyor…" : "Tekrar Kontrol Et"}</UiNode>
    </UiNode>

    <UiNode as="section" style={ui.score}><UiNode as="strong">{passed}/{requiredChecks.length || 5}</UiNode><UiNode as="span">kontrol başarılı</UiNode></UiNode>

    <UiNode as="section" style={ui.grid}>{checks.map(item => <UiNode as="article" key={item.label} style={{ ...ui.card, borderColor: item.ok ? "rgba(99,204,152,.45)" : item.required===false ? dy.border : "rgba(232,120,120,.45)" }}><UiNode as="span" style={{ ...ui.dot, background: item.ok ? "#63cc98" : item.required===false ? dy.muted : "#e87878" }}/><UiNode as="div" className="dy-title-detail"><UiNode as="strong">{item.label}</UiNode><UiNode as="p">{item.values ? <UiMessage source={item.detail} values={item.values} userValues={item.userValues ?? []}/> : item.detail}</UiNode>{item.required===false && <UiNode as="small">İsteğe bağlı</UiNode>}</UiNode></UiNode>)}</UiNode>

    <UiNode as="section" style={ui.routes}>
      <UiNode as="div" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <UiNode data-dy-copy-stack as="div"><UiNode as="strong">Hızlı pilot rotaları</UiNode><UiNode as="span" style={{ display: "block", marginTop: 3, color: dy.muted, fontSize: 13 }}>Teknik kontrolden sonra uçtan uca vaka akışını doğrula.</UiNode></UiNode>
        <Link href="/pilot-flow" style={ui.primary}>Pilot Akışını Aç</Link>
      </UiNode>
      <UiNode as="div" style={ui.links}>{["/patients", "/cases", "/scan-studio", "/design", "/messages", "/finance", "/logistics", "/notifications"].map(href => <Link key={href} href={href} style={ui.link}>{href}</Link>)}</UiNode>
    </UiNode>
  </UiNode>;
}
const ui: Record<string, CSSProperties> = {
    page: { minHeight: "100vh", padding: "24px clamp(18px,4vw,52px) 60px", background: dy.bg, color: dy.text, fontFamily: "Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" },
    header: { maxWidth: 1100, margin: "0 auto 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }, back: { color: dy.muted, textDecoration: "none", fontSize: 13 }, eyebrow: { margin: "14px 0 6px", color: dy.accent, fontSize: 12, fontWeight: 900, letterSpacing: ".14em" }, title: { margin: "0 0 8px", fontSize: "clamp(34px,5vw,56px)", letterSpacing: "-.04em" }, sub: { maxWidth: 720, margin: 0, color: dy.muted, lineHeight: 1.6 }, primary: { minHeight: 42, padding: "0 14px", border: 0, borderRadius: 10, background: dy.accent, color: dy.accentContrast, fontWeight: 900, cursor: "pointer" }, score: { maxWidth: 1100, margin: "0 auto 10px", padding: 14, display: "flex", alignItems: "baseline", gap: 8, border: `1px solid ${dy.border}`, borderRadius: 13, background: dy.surface }, grid: { maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 8 }, card: { minHeight: 96, padding: 13, display: "grid", gridTemplateColumns: "10px minmax(0,1fr)", gap: 9, border: "1px solid", borderRadius: 12, background: dy.surface }, dot: { width: 8, height: 8, marginTop: 5, borderRadius: 999 }, routes: { maxWidth: 1100, margin: "12px auto 0", padding: 14, border: `1px solid ${dy.border}`, borderRadius: 13, background: dy.surface2 }, links: { marginTop: 9, display: "flex", gap: 7, flexWrap: "wrap" }, link: { padding: "7px 9px", border: `1px solid ${dy.border}`, borderRadius: 8, color: dy.accent, textDecoration: "none", fontSize: 13, fontWeight: 800 }
};
