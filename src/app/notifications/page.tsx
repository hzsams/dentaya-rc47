"use client";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useMemo, useState, type CSSProperties, } from "react";
import Link from "@/lib/i18n/UiLink";
import ConnectionStatus from "@/app/ConnectionStatus";
import { useRouter } from "next/navigation";
import type { RealtimeChannel, } from "@supabase/supabase-js";
import { dentayaError } from "@/lib/dentaya-errors";
import { categoryEnabled, DEFAULT_NOTIFICATION_PREFERENCES, loadNotificationPreferences, type NotificationPreferences } from "@/lib/notification-preferences";
import { supabase } from "@/lib/supabase";
import { dy, useDentayaThemeRuntime, } from "@/app/dentaya-theme";
type Category = "case" | "design" | "finance" | "delivery" | "message" | "system";
type NotificationRow = {
    id: string;
    organization_id: string;
    title: string;
    body: string | null;
    severity: "info" | "success" | "warning" | "critical";
    is_read: boolean;
    entity_type: string | null;
    entity_id: string | null;
    category: Category;
    action_path: string | null;
    created_at: string;
};
type Org = {
    id: string;
    name: string;
    org_type: string;
};
const FILTERS: Array<{
    id: "all" | "unread" | Category;
    label: string;
}> = [
    {
        id: "all",
        label: "Tümü",
    },
    {
        id: "unread",
        label: "Okunmamış",
    },
    {
        id: "case",
        label: "Vaka",
    },
    {
        id: "design",
        label: "CAD",
    },
    {
        id: "finance",
        label: "Fiyat",
    },
    {
        id: "delivery",
        label: "Kurye",
    },
    {
        id: "message",
        label: "Mesaj",
    },
    {
        id: "system",
        label: "Sistem",
    },
];
export default function NotificationsPage() {
    const { t: uiText, intlLocale } = useTranslation();
    useDentayaThemeRuntime();
    const router = useRouter();
    const [org, setOrg] = useState<Org | null>(null);
    const [notifications, setNotifications,] = useState<NotificationRow[]>([]);
    const [filter, setFilter,] = useState<"all" | "unread" | Category>("all");
    const [loading, setLoading] = useState(true);
    const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
    const [message, setMessage] = useState("");
    useEffect(() => {
        let active = true;
        let channel: RealtimeChannel | null = null;
        async function boot() {
            const { data: auth } = await supabase.auth
                .getSession();
            const user = auth.session?.user;
            if (!user) {
                router.replace("/workspace");
                return;
            }
            const loadedPreferences = await loadNotificationPreferences(user.id);
            if (active) {
                setPreferences(loadedPreferences);
            }
            const { data: membership, } = await supabase
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
            const { data: orgData, } = await supabase
                .from("organizations")
                .select("id,name,org_type")
                .eq("id", membership.organization_id)
                .maybeSingle();
            if (!orgData) {
                setMessage("Kurum bilgisi alınamadı.");
                setLoading(false);
                return;
            }
            const current = orgData as Org;
            if (!active)
                return;
            setOrg(current);
            await load(current.id);
            if (!active)
                return;
            channel =
                supabase
                    .channel(`notification-page-${current.id}`)
                    .on("postgres_changes", {
                    event: "*",
                    schema: "public",
                    table: "notifications",
                    filter: `organization_id=eq.${current.id}`,
                }, () => {
                    void load(current.id);
                })
                    .subscribe();
            setLoading(false);
        }
        void boot();
        return () => {
            active = false;
            if (channel) {
                void supabase
                    .removeChannel(channel);
            }
        };
    }, [router]);
    async function load(organizationId: string) {
        const { data, error, } = await supabase
            .from("notifications")
            .select("id,organization_id,title,body,severity,is_read,entity_type,entity_id,category,action_path,created_at")
            .eq("organization_id", organizationId)
            .order("created_at", {
            ascending: false,
        })
            .limit(100);
        if (error) {
            setMessage(dentayaError(error, "Bildirimler yüklenemedi."));
            return;
        }
        setNotifications((data ??
            []) as NotificationRow[]);
    }
    useEffect(() => {
        function recover() {
            if (org) {
                void load(org.id);
            }
        }
        window.addEventListener("dentaya-network-restored", recover);
        return () => window.removeEventListener("dentaya-network-restored", recover);
    }, [org]);
    async function markOne(item: NotificationRow) {
        if (!item.is_read) {
            await supabase
                .from("notifications")
                .update({
                is_read: true,
            })
                .eq("id", item.id);
            setNotifications((current) => current.map((entry) => entry.id ===
                item.id
                ? {
                    ...entry,
                    is_read: true,
                }
                : entry));
        }
        router.push(actionPath(item));
    }
    async function markAll() {
        if (!org)
            return;
        await supabase
            .from("notifications")
            .update({
            is_read: true,
        })
            .eq("organization_id", org.id)
            .eq("is_read", false);
        setNotifications((current) => current.map((item) => ({
            ...item,
            is_read: true,
        })));
    }
    useEffect(() => {
        function onPreferences(event: Event) {
            const detail = (event as CustomEvent<NotificationPreferences>).detail;
            if (detail) {
                setPreferences(detail);
            }
        }
        window.addEventListener("dentaya-notification-preferences-change", onPreferences);
        return () => window.removeEventListener("dentaya-notification-preferences-change", onPreferences);
    }, []);
    const filtered = useMemo(() => notifications.filter((item) => {
        if (!categoryEnabled(preferences, item.category)) {
            return false;
        }
        if (filter ===
            "all") {
            return true;
        }
        if (filter ===
            "unread") {
            return !item.is_read;
        }
        return (item.category ===
            filter);
    }), [
        filter,
        notifications,
        preferences,
    ]);
    const unread = notifications.filter((item) => !item.is_read &&
        categoryEnabled(preferences, item.category)).length;
    if (loading) return <LoadingExperience title="Bildirim Merkezi hazırlanıyor…"/>;
    return (<UiNode as="main" style={ui.page}>
      <ConnectionStatus />
      <style>{`
        * { box-sizing:border-box; }

        .notification-card {
          transition:
            transform var(--dy-motion-fast,150ms) ease,
            border-color var(--dy-motion-fast,150ms) ease;
        }

        .notification-card:hover {
          transform:translateY(-1px);
          border-color:var(--dy-accent,#6de2cf)!important;
        }

        @media(max-width:760px) {
          .notification-header {
            flex-direction:column!important;
            align-items:flex-start!important;
          }

          .notification-card {
            grid-template-columns:10px minmax(0,1fr)!important;
          }

          .notification-card-time {
            grid-column:2;
            justify-self:start!important;
            text-align:left!important;
          }
        }
      `}</style>

      <UiNode as="header" className="notification-header" style={ui.header}>
        <UiNode as="div">
          <Link href="/" style={ui.back}>
            ← DentAYA
          </Link>

          <UiNode as="p" style={ui.eyebrow}>
            AKILLI BİLDİRİMLER
          </UiNode>

          <UiNode as="h1" style={ui.title}>
            {uiText(" Bildirim Merkezi ")}</UiNode>

          <UiNode as="p" style={ui.subtitle}>
            Vaka, CAD, fiyat,
            mesaj ve kurye
            hareketleri doğrudan
            yapılması gereken
            işe bağlanır.
          </UiNode>
        </UiNode>

        <UiNode as="div" style={ui.headerRight}>
          <UiNode as="div" style={ui.counter}>
            <UiNode as="span">
              Okunmamış
            </UiNode>
            <UiNode as="strong">
              {unread}
            </UiNode>
          </UiNode>

          {unread > 0 && (<UiNode as="button" type="button" onClick={() => void markAll()} style={ui.secondary}>
              Tümünü Okundu Yap
            </UiNode>)}
        </UiNode>
      </UiNode>

      {message && (<UiNode as="div" style={ui.notice}>
          {message}
        </UiNode>)}

      <UiNode as="section" style={ui.filters}>
        {FILTERS.map((item) => (<UiNode as="button" key={item.id} type="button" onClick={() => setFilter(item.id)} style={{
                ...ui.filter,
                ...(filter ===
                    item.id
                    ? ui.filterActive
                    : {}),
            }}>
              {item.label}
            </UiNode>))}
      </UiNode>

      <UiNode as="section" style={ui.list}>
        {filtered.length ? (filtered.map((item) => (<UiNode as="button" key={item.id} type="button" className="notification-card" onClick={() => void markOne(item)} style={{
                ...ui.card,
                borderColor: item.is_read
                    ? dy.border
                    : dy.accent,
                background: item.is_read
                    ? dy.surface
                    : dy.accentSoft,
            }}>
                <UiNode as="span" style={{
                ...ui.dot,
                background: severityColor(item.severity),
            }}/>

                <UiNode as="div" style={ui.copy}>
                  <UiNode as="div" style={ui.cardTop}>
                    <UiNode as="span" style={ui.category}>
                      {categoryLabel(item.category)}
                    </UiNode>

                    {!item.is_read && (<UiNode as="span" style={ui.unread}>
                        {uiText(" YENİ ")}</UiNode>)}
                  </UiNode>

                  <UiNode as="strong" style={ui.cardTitle}>
                    {item.title}
                  </UiNode>

                  {item.body && (<UiNode as="p" style={ui.body}>
                      <UserText>{item.body}</UserText>
                    </UiNode>)}
                </UiNode>

                <UiNode as="div" className="notification-card-time" style={ui.cardTime}>
                  <UiNode as="span">
                    {formatDateTime(item.created_at, intlLocale())}
                  </UiNode>

                  <UiNode as="b">
                    Aç →
                  </UiNode>
                </UiNode>
              </UiNode>))) : (<UiNode data-dy-copy-stack as="div" style={ui.empty}>
            <UiNode as="strong">
              Bu filtrede bildirim yok
            </UiNode>
            <UiNode as="span">
              Yeni bir işlem
              olduğunda burada
              görünecek.
            </UiNode>
          </UiNode>)}
      </UiNode>
    </UiNode>);
}
function actionPath(item: NotificationRow) {
    if (item.action_path) {
        return item.action_path;
    }
    if (item.entity_type ===
        "case" &&
        item.entity_id) {
        return `/cases/${item.entity_id}`;
    }
    if (item.entity_type ===
        "conversation") {
        return "/messages";
    }
    return "/";
}
function categoryLabel(value: Category) {
    return ({
        case: "Vaka",
        design: "CAD",
        finance: "Fiyat",
        delivery: "Kurye",
        message: "Mesaj",
        system: "Sistem",
    } as Record<Category, string>)[value];
}
function severityColor(value: NotificationRow["severity"]) {
    return ({
        info: dy.accent,
        success: "#63cc98",
        warning: "#e8bd73",
        critical: "#e87878",
    } as Record<NotificationRow["severity"], string>)[value];
}
function formatDateTime(value: string, localeTag: string = "tr-TR") {
    return new Intl.DateTimeFormat(localeTag, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}
const ui: Record<string, CSSProperties> = {
    page: {
        minHeight: "100vh",
        padding: "24px clamp(18px,3.5vw,50px) 60px",
        background: dy.bg,
        color: dy.text,
        fontFamily: "Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    },
    center: {
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: dy.bg,
        color: dy.muted,
    },
    header: {
        maxWidth: 1240,
        margin: "0 auto 16px",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 18,
    },
    back: {
        color: dy.muted,
        textDecoration: "none",
        fontSize: 13,
    },
    eyebrow: {
        margin: "14px 0 6px",
        color: dy.accent,
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: ".14em",
    },
    title: {
        margin: "0 0 8px",
        fontSize: "clamp(34px,4vw,52px)",
        letterSpacing: "-.04em",
    },
    subtitle: {
        maxWidth: 720,
        margin: 0,
        color: dy.muted,
        lineHeight: 1.58,
    },
    headerRight: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
    },
    counter: {
        minWidth: 104,
        minHeight: 54,
        padding: "8px 11px",
        display: "grid",
        gap: 2,
        border: `1px solid ${dy.border}`,
        borderRadius: 11,
        background: dy.surface,
        color: dy.muted,
    },
    secondary: {
        minHeight: 42,
        padding: "0 13px",
        border: `1px solid ${dy.border}`,
        borderRadius: 10,
        background: dy.surface,
        color: dy.text,
        fontWeight: 850,
        cursor: "pointer",
    },
    notice: {
        maxWidth: 1240,
        margin: "0 auto 12px",
        padding: 12,
        border: `1px solid ${dy.border}`,
        borderRadius: 10,
        background: dy.surface2,
        color: dy.muted,
    },
    filters: {
        maxWidth: 1240,
        margin: "0 auto 10px",
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
    },
    filter: {
        minHeight: 38,
        padding: "0 12px",
        border: `1px solid ${dy.border}`,
        borderRadius: 999,
        background: dy.surface,
        color: dy.muted,
        fontWeight: 800,
        cursor: "pointer",
    },
    filterActive: {
        borderColor: dy.accent,
        background: dy.accentSoft,
        color: dy.text,
    },
    list: {
        maxWidth: 1240,
        margin: "0 auto",
        display: "grid",
        gap: 7,
    },
    card: {
        width: "100%",
        minHeight: 122,
        padding: 14,
        display: "grid",
        gridTemplateColumns: "10px minmax(0,1fr) 135px",
        alignItems: "start",
        gap: 12,
        textAlign: "left",
        border: "1px solid",
        borderRadius: 13,
        color: dy.text,
        cursor: "pointer",
    },
    dot: {
        width: 8,
        height: 8,
        marginTop: 6,
        borderRadius: 999,
    },
    copy: {
        minWidth: 0,
        display: "grid",
        gap: 5,
    },
    cardTop: {
        display: "flex",
        gap: 7,
        alignItems: "center",
        flexWrap: "wrap",
    },
    category: {
        color: dy.accent,
        fontSize: 12,
        fontWeight: 900,
    },
    unread: {
        padding: "3px 6px",
        borderRadius: 999,
        background: dy.accent,
        color: dy.accentContrast,
        fontSize: 11,
        fontWeight: 900,
    },
    cardTitle: {
        fontSize: 16,
    },
    body: {
        margin: 0,
        maxWidth: 840,
        color: dy.muted,
        fontSize: 14,
        lineHeight: 1.5,
        overflowWrap: "anywhere",
    },
    cardTime: {
        display: "grid",
        justifyItems: "end",
        gap: 8,
        color: dy.muted,
        fontSize: 13,
        textAlign: "right",
    },
    empty: {
        minHeight: 240,
        padding: 24,
        display: "grid",
        placeItems: "center",
        alignContent: "center",
        gap: 6,
        border: `1px dashed ${dy.border}`,
        borderRadius: 14,
        color: dy.muted,
        textAlign: "center",
    },
};
