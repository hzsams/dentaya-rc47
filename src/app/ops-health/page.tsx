"use client";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "@/lib/i18n/UiLink";
import { useRouter } from "next/navigation";
import { dy, useDentayaThemeRuntime } from "@/app/dentaya-theme";
import { dentayaError } from "@/lib/dentaya-errors";
import { supabase } from "@/lib/supabase";
import { DENTAYA_RELEASE } from "@/lib/release";
type Severity = "info" | "warning" | "error" | "critical";
type OperationalEvent = {
    id: string;
    event_type: string;
    severity: Severity;
    source: string;
    message: string;
    error_code: string | null;
    route: string | null;
    details: Record<string, unknown>;
    created_at: string;
};
type Membership = {
    organization_id: string;
    role: string;
};
const severityLabels: Record<Severity, string> = {
    info: "Bilgi",
    warning: "Uyarı",
    error: "Hata",
    critical: "Kritik",
};
export default function OpsHealthPage() {
    const { t: uiText, intlLocale } = useTranslation();
    useDentayaThemeRuntime();
    const router = useRouter();
    const [observedAt, setObservedAt] = useState(0);
    const [events, setEvents] = useState<OperationalEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [filter, setFilter] = useState<"all" | Severity>("all");
    useEffect(() => {
        let active = true;
        async function boot() {
            try {
                const { data: auth } = await supabase.auth.getSession();
                const user = auth.session?.user;
                if (!user) {
                    router.replace("/workspace");
                    return;
                }
                const { data: membership, error: membershipError } = await supabase
                    .from("memberships")
                    .select("organization_id,role")
                    .eq("user_id", user.id)
                    .eq("status", "active")
                    .limit(1)
                    .maybeSingle();
                if (membershipError)
                    throw membershipError;
                const current = membership as Membership | null;
                if (!current || !["owner", "admin"].includes(current.role)) {
                    if (active)
                        setMessage("Operasyon sağlığı ekranı yalnız kurum sahibi ve yöneticilere açıktır.");
                    return;
                }
                const { data, error } = await supabase
                    .from("operational_events")
                    .select("id,event_type,severity,source,message,error_code,route,details,created_at")
                    .eq("organization_id", current.organization_id)
                    .order("created_at", { ascending: false })
                    .limit(200);
                if (error)
                    throw error;
                if (active) {
                    setEvents((data ?? []) as OperationalEvent[]);
                    setObservedAt(Date.now());
                }
            }
            catch (error) {
                if (active)
                    setMessage(dentayaError(error, "Operasyon kayıtları alınamadı."));
            }
            finally {
                if (active)
                    setLoading(false);
            }
        }
        void boot();
        return () => {
            active = false;
        };
    }, [router]);
    const last24h = useMemo(() => {
        const cutoff = observedAt - 24 * 60 * 60 * 1000;
        return events.filter((event) => new Date(event.created_at).getTime() >= cutoff);
    }, [events, observedAt]);
    const visible = useMemo(() => (filter === "all" ? events : events.filter((event) => event.severity === filter)), [events, filter]);
    const stats = useMemo(() => ({
        total: last24h.length,
        critical: last24h.filter((event) => event.severity === "critical").length,
        errors: last24h.filter((event) => event.severity === "error").length,
        network: last24h.filter((event) => event.event_type === "network_recovered").length,
    }), [last24h]);
    return (<UiNode as="main" style={ui.page}>
      <UiNode as="header" style={ui.header}>
        <UiNode as="div">
          <UiNode as="p" style={ui.kicker}><UiNode as="span" translateChildren={false}>DentAYA {DENTAYA_RELEASE.version}</UiNode></UiNode>
          <UiNode as="h1" style={ui.title}>{uiText("Operasyon Sağlığı")}</UiNode>
          <UiNode as="p" style={ui.sub}>Kritik istemci hataları, route çökmeleri ve bağlantı geri dönüşlerini kurum bazında izleyin.</UiNode>
        </UiNode>
        <UiNode as="div" style={ui.actions}>
          <Link href="/pilot-check" style={ui.secondary}>Sistem Kontrolü</Link>
          <Link href="/" style={ui.secondary}>{uiText("Ana Sayfa")}</Link>
        </UiNode>
      </UiNode>

      <UiNode as="section" style={ui.cards}>
        <StatCard label="Son 24 saat" value={stats.total}/>
        <StatCard label="Kritik" value={stats.critical}/>
        <StatCard label="Hata" value={stats.errors}/>
        <StatCard label="Ağ geri dönüşü" value={stats.network}/>
      </UiNode>

      <UiNode as="section" style={ui.panel}>
        <UiNode as="div" style={ui.toolbar}>
          <UiNode as="strong">Olay akışı</UiNode>
          <UiNode as="div" style={ui.filters}>
            {(["all", "critical", "error", "warning", "info"] as const).map((item) => (<UiNode as="button" key={item} type="button" onClick={() => setFilter(item)} style={{ ...ui.filter, ...(filter === item ? ui.filterActive : {}) }}>
                {item === "all" ? uiText("Tümü") : severityLabels[item]}
              </UiNode>))}
          </UiNode>
        </UiNode>

        {loading ? <UiNode as="p" style={ui.empty}>Kayıtlar yükleniyor…</UiNode> : null}
        {!loading && message ? <UiNode as="p" style={ui.warning}>{message}</UiNode> : null}
        {!loading && !message && visible.length === 0 ? <UiNode as="p" style={ui.empty}>Bu filtrede operasyon olayı yok.</UiNode> : null}

        <UiNode as="div" style={ui.list}>
          {visible.map((event) => (<UiNode as="article" key={event.id} style={ui.event}>
              <UiNode as="div" style={ui.eventTop}>
                <UiNode as="span" style={{ ...ui.badge, ...(event.severity === "critical" ? ui.critical : event.severity === "error" ? ui.error : event.severity === "warning" ? ui.warn : ui.info) }}>
                  {severityLabels[event.severity]}
                </UiNode>
                <UiNode as="strong" style={ui.eventType}>{event.event_type}</UiNode>
                <UiNode as="time" style={ui.time}>{new Date(event.created_at).toLocaleString(intlLocale())}</UiNode>
              </UiNode>
              <UiNode as="p" style={ui.message}>{event.message}</UiNode>
              <UiNode as="div" style={ui.meta}>
                <UiNode as="span">Kaynak: {event.source}</UiNode>
                {event.route ? <UiNode as="span">Rota: {event.route}</UiNode> : null}
                {event.error_code ? <UiNode as="span">Kod: {event.error_code}</UiNode> : null}
              </UiNode>
            </UiNode>))}
        </UiNode>
      </UiNode>
    </UiNode>);
}
function StatCard({ label, value }: {
    label: string;
    value: number;
}) {
    const { t: uiText } = useTranslation();
    return (<UiNode as="article" style={ui.stat}>
      <UiNode as="span" style={ui.statLabel}>{uiText(label)}</UiNode>
      <UiNode as="strong" style={ui.statValue}>{value}</UiNode>
    </UiNode>);
}
const ui: Record<string, CSSProperties> = {
    page: { minHeight: "100vh", padding: "28px", background: dy.bg, color: dy.text },
    header: { display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 20 },
    kicker: { margin: "0 0 8px", color: dy.accent, fontSize: 12, fontWeight: 900, letterSpacing: ".13em" },
    title: { margin: 0, fontSize: "clamp(30px,4vw,52px)", lineHeight: 1 },
    sub: { maxWidth: 760, margin: "10px 0 0", color: dy.muted, lineHeight: 1.6 },
    actions: { display: "flex", gap: 8, flexWrap: "wrap" },
    secondary: { minHeight: 40, display: "inline-grid", placeItems: "center", padding: "0 13px", border: `1px solid ${dy.border}`, borderRadius: 10, background: dy.surface, color: dy.text, textDecoration: "none", fontWeight: 800 },
    cards: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginBottom: 14 },
    stat: { padding: 16, border: `1px solid ${dy.border}`, borderRadius: 14, background: dy.surface },
    statLabel: { display: "block", color: dy.muted, fontSize: 12, fontWeight: 800 },
    statValue: { display: "block", marginTop: 6, fontSize: 30 },
    panel: { border: `1px solid ${dy.border}`, borderRadius: 16, background: dy.surface, overflow: "hidden" },
    toolbar: { minHeight: 58, padding: "10px 14px", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", borderBottom: `1px solid ${dy.border}` },
    filters: { display: "flex", gap: 6, flexWrap: "wrap" },
    filter: { minHeight: 34, padding: "0 10px", border: `1px solid ${dy.border}`, borderRadius: 9, background: dy.surface2, color: dy.muted, cursor: "pointer", fontWeight: 800 },
    filterActive: { color: dy.accent, borderColor: dy.accent, background: dy.accentSoft },
    list: { display: "grid" },
    event: { padding: "14px 16px", borderBottom: `1px solid ${dy.border}` },
    eventTop: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
    badge: { borderRadius: 999, padding: "4px 8px", fontSize: 10, fontWeight: 900, letterSpacing: ".04em" },
    critical: { background: "rgba(255,90,90,.14)", color: "#ff8f8f" },
    error: { background: "rgba(255,130,90,.14)", color: "#ffad8f" },
    warn: { background: "rgba(255,190,90,.14)", color: "#efc36e" },
    info: { background: dy.accentSoft, color: dy.accent },
    eventType: { fontSize: 13 },
    time: { marginLeft: "auto", color: dy.muted, fontSize: 11 },
    message: { margin: "9px 0 8px", lineHeight: 1.5 },
    meta: { display: "flex", gap: 12, flexWrap: "wrap", color: dy.muted, fontSize: 11 },
    empty: { margin: 0, padding: 20, color: dy.muted },
    warning: { margin: 12, padding: 12, borderRadius: 10, background: "rgba(255,190,90,.12)", color: "#efc36e" },
};
