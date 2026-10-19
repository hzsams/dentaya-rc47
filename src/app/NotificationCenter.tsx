"use client";
import SystemNotificationBody from '@/app/SystemNotificationBody';
import {notificationTitle} from '@/lib/system-messages';
import UiMessage from "@/lib/i18n/UiMessage";
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useMemo, useRef, useState, type CSSProperties, } from "react";
import Link from "@/lib/i18n/UiLink";
import { useRouter } from "next/navigation";
import type { RealtimeChannel, } from "@supabase/supabase-js";
import ConnectionStatus from "@/app/ConnectionStatus";
import { categoryEnabled, DEFAULT_NOTIFICATION_PREFERENCES, loadNotificationPreferences, type NotificationPreferences } from "@/lib/notification-preferences";
import { supabase } from "@/lib/supabase";
import { dy } from "@/app/dentaya-theme";
type NotificationRow = {
    id: string;
    organization_id: string;
    title: string;
    body: string | null;
    severity: "info" | "success" | "warning" | "critical";
    is_read: boolean;
    entity_type: string | null;
    entity_id: string | null;
    category: "case" | "design" | "finance" | "delivery" | "message" | "system";
    action_path: string | null;
    created_at: string;
};
export default function NotificationCenter() {
    const { t: uiText, intlLocale } = useTranslation();
    const router = useRouter();
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);
    const [orgId, setOrgId] = useState("");
    const [notifications, setNotifications,] = useState<NotificationRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
    useEffect(() => {
        let active = true;
        let channel: RealtimeChannel | null = null;
        async function boot() {
            const { data: auth } = await supabase.auth
                .getSession();
            const user = auth.session?.user;
            if (!user)
                return;
            const { data: membership, } = await supabase
                .from("memberships")
                .select("organization_id")
                .eq("user_id", user.id)
                .eq("status", "active")
                .limit(1)
                .maybeSingle();
            if (!active ||
                !membership) {
                return;
            }
            const organizationId = membership.organization_id;
            setOrgId(organizationId);
            const loadedPreferences = await loadNotificationPreferences(user.id);
            if (active) {
                setPreferences(loadedPreferences);
            }
            await loadNotifications(organizationId);
            if (!active)
                return;
            channel =
                supabase
                    .channel(`notifications-${organizationId}`)
                    .on("postgres_changes", {
                    event: "*",
                    schema: "public",
                    table: "notifications",
                    filter: `organization_id=eq.${organizationId}`,
                }, () => {
                    void loadNotifications(organizationId);
                })
                    .subscribe();
        }
        void boot();
        return () => {
            active = false;
            if (channel) {
                void supabase
                    .removeChannel(channel);
            }
        };
    }, []);
    useEffect(() => {
        function onPreferences(event: Event) {
            const detail = (event as CustomEvent<NotificationPreferences>).detail;
            if (detail) {
                setPreferences(detail);
            }
        }
        window.addEventListener("dentaya-notification-preferences-change", onPreferences);
        return () => {
            window.removeEventListener("dentaya-notification-preferences-change", onPreferences);
        };
    }, []);
    useEffect(() => {
        if (!open)
            return;
        function onPointerDown(event: PointerEvent) {
            const target = event.target as Node;
            if (rootRef.current &&
                !rootRef.current.contains(target)) {
                setOpen(false);
            }
        }
        window.addEventListener("pointerdown", onPointerDown);
        return () => {
            window.removeEventListener("pointerdown", onPointerDown);
        };
    }, [open]);
    async function loadNotifications(organizationId: string) {
        setLoading(true);
        const { data } = await supabase
            .from("notifications")
            .select("id,organization_id,title,body,severity,is_read,entity_type,entity_id,category,action_path,created_at")
            .eq("organization_id", organizationId)
            .order("created_at", {
            ascending: false,
        })
            .limit(30);
        setNotifications((data ??
            []) as NotificationRow[]);
        setLoading(false);
    }
    async function openNotification(item: NotificationRow) {
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
        setOpen(false);
        router.push(resolveActionPath(item));
    }
    async function markAllRead() {
        if (!orgId)
            return;
        await supabase
            .from("notifications")
            .update({
            is_read: true,
        })
            .eq("organization_id", orgId)
            .eq("is_read", false);
        setNotifications((current) => current.map((item) => ({
            ...item,
            is_read: true,
        })));
    }
    const visibleNotifications = useMemo(() => notifications.filter((item) => categoryEnabled(preferences, item.category)), [
        notifications,
        preferences,
    ]);
    const unreadCount = useMemo(() => visibleNotifications.filter((item) => !item.is_read).length, [visibleNotifications]);
    return (<UiNode as="div" ref={rootRef} style={styles.root}>
      <ConnectionStatus />

      <UiNode as="button" type="button" onClick={() => setOpen((value) => !value)} aria-label={uiText("Bildirimler")} aria-expanded={open} style={{
            ...styles.trigger,
            borderColor: unreadCount > 0
                ? dy.accent
                : dy.border,
        }}>
        <BellIcon />

        <UiNode as="span" style={styles.triggerText}>
          {uiText(" Bildirimler ")}</UiNode>

        {unreadCount > 0 && (<UiNode as="span" style={styles.badge}>
            {unreadCount >
                99
                ? "99+"
                : unreadCount}
          </UiNode>)}
      </UiNode>

      {open && (<UiNode as="section" style={styles.popover}>
          <UiNode as="header" style={styles.header}>
            <UiNode data-dy-copy-stack as="div">
              <UiNode as="strong" style={styles.title}>
                {uiText(" Bildirim Merkezi ")}</UiNode>

              <UiNode as="span" style={styles.sub}>
                {unreadCount
                ? <UiMessage source="{0} okunmamış bildirim" values={[unreadCount]} userValues={[]}/> : "Tüm bildirimler okundu"}
              </UiNode>
            </UiNode>

            {unreadCount >
                0 && (<UiNode as="button" type="button" onClick={() => void markAllRead()} style={styles.markAll}>
                Tümünü okundu yap
              </UiNode>)}
          </UiNode>

          <UiNode as="div" style={styles.list}>
            {loading &&
                visibleNotifications.length ===
                    0 ? (<UiNode as="div" style={styles.empty}>
                Bildirimler
                yükleniyor…
              </UiNode>) : visibleNotifications.length ? (visibleNotifications
                .slice(0, 8)
                .map((item) => (<UiNode as="button" key={item.id} type="button" onClick={() => void openNotification(item)} style={{
                    ...styles.item,
                    background: item.is_read
                        ? dy.surface
                        : dy.accentSoft,
                    borderColor: item.is_read
                        ? dy.border
                        : dy.accent,
                }}>
                      <UiNode as="span" style={{
                    ...styles.dot,
                    background: severityColor(item.severity),
                }}/>

                      <UiNode as="span" style={styles.itemCopy}>
                        <UiNode as="span" style={styles.itemTop}>
                          <UiNode as="strong">
                            <UserText>{notificationTitle(item,uiText)}</UserText>
                          </UiNode>

                          <UiNode as="small">
                            {categoryLabel(item.category)}
                          </UiNode>
                        </UiNode>

                        {item.body && (<UiNode as="span" style={styles.body}>
                            <SystemNotificationBody row={item}/>
                          </UiNode>)}

                        <UiNode as="span" style={styles.time}>
                          {formatRelative(item.created_at, intlLocale())}
                        </UiNode>
                      </UiNode>
                    </UiNode>))) : (<UiNode data-dy-copy-stack as="div" style={styles.empty}>
                <UiNode as="strong">
                  Yeni bildirim yok
                </UiNode>
                <UiNode as="span">
                  Vaka, CAD,
                  fiyat ve kurye
                  hareketleri burada
                  görünecek.
                </UiNode>
              </UiNode>)}
          </UiNode>

          <UiNode as="footer" style={styles.footer}>
            <Link href="/notifications" onClick={() => setOpen(false)} style={styles.allLink}>
              Tüm Bildirimleri Aç →
            </Link>
          </UiNode>
        </UiNode>)}
    </UiNode>);
}
function resolveActionPath(item: NotificationRow) {
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
    return "/notifications";
}
function categoryLabel(value: NotificationRow["category"]) {
    return ({
        case: "Vaka",
        design: "CAD",
        finance: "Fiyat",
        delivery: "Kurye",
        message: "Mesaj",
        system: "Sistem",
    } as Record<NotificationRow["category"], string>)[value];
}
function severityColor(value: NotificationRow["severity"]) {
    return ({
        info: dy.accent,
        success: "#63cc98",
        warning: "#e8bd73",
        critical: "#e87878",
    } as Record<NotificationRow["severity"], string>)[value];
}
function formatRelative(value: string, localeTag: string = "tr-TR") {
    const time = new Date(value).getTime();
    const diff = Date.now() - time;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diff <
        minute) {
        return "Şimdi";
    }
    if (diff <
        hour) {
        return new Intl.RelativeTimeFormat(localeTag,{numeric:'auto'}).format(-Math.max(1,Math.floor(diff/minute)),'minute');
    }
    if (diff <
        day) {
        return new Intl.RelativeTimeFormat(localeTag,{numeric:'auto'}).format(-Math.max(1,Math.floor(diff/hour)),'hour');
    }
    if (diff <
        7 * day) {
        return new Intl.RelativeTimeFormat(localeTag,{numeric:'auto'}).format(-Math.max(1,Math.floor(diff/day)),'day');
    }
    return new Intl.DateTimeFormat(localeTag, {
        day: "2-digit",
        month: "short",
    }).format(new Date(value));
}
function BellIcon() {
    return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 21h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>);
}
const styles: Record<string, CSSProperties> = {
    root: {
        position: "relative",
    },
    trigger: {
        minHeight: 42,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "0 11px",
        border: "1px solid",
        borderRadius: 10,
        background: dy.surface,
        color: dy.text,
        fontWeight: 800,
        cursor: "pointer",
    },
    triggerText: {
        fontSize: 14,
    },
    badge: {
        minWidth: 23,
        height: 23,
        display: "grid",
        placeItems: "center",
        padding: "0 6px",
        borderRadius: 999,
        background: dy.accent,
        color: dy.accentContrast,
        fontSize: 12,
        fontWeight: 900,
    },
    popover: {
        position: "absolute",
        zIndex: 1000,
        top: "calc(100% + 9px)",
        right: 0,
        width: "min(430px,calc(100vw - 28px))",
        overflow: "hidden",
        border: `1px solid ${dy.border}`,
        borderRadius: 16,
        background: dy.surface,
        boxShadow: `0 24px 72px ${dy.shadow}`,
    },
    header: {
        minHeight: 76,
        padding: "13px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        borderBottom: `1px solid ${dy.border}`,
    },
    title: {
        display: "block",
        fontSize: 16,
    },
    sub: {
        display: "block",
        marginTop: 3,
        color: dy.muted,
        fontSize: 13,
    },
    markAll: {
        border: 0,
        background: "transparent",
        color: dy.accent,
        fontSize: 13,
        fontWeight: 850,
        cursor: "pointer",
    },
    list: {
        maxHeight: 540,
        overflowY: "auto",
        display: "grid",
        gap: 0,
    },
    item: {
        width: "100%",
        minHeight: 104,
        display: "grid",
        gridTemplateColumns: "10px minmax(0,1fr)",
        gap: 10,
        padding: "12px 14px",
        textAlign: "left",
        border: 0,
        borderBottom: `1px solid ${dy.border}`,
        color: dy.text,
        cursor: "pointer",
    },
    dot: {
        width: 8,
        height: 8,
        marginTop: 6,
        borderRadius: 999,
    },
    itemCopy: {
        minWidth: 0,
        display: "grid",
        gap: 5,
    },
    itemTop: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 10,
    },
    body: {
        color: dy.muted,
        fontSize: 13,
        lineHeight: 1.45,
        overflowWrap: "anywhere",
    },
    time: {
        color: dy.muted,
        fontSize: 12,
    },
    empty: {
        minHeight: 180,
        padding: 22,
        display: "grid",
        placeItems: "center",
        alignContent: "center",
        gap: 5,
        textAlign: "center",
        color: dy.muted,
    },
    footer: {
        padding: 11,
        borderTop: `1px solid ${dy.border}`,
    },
    allLink: {
        minHeight: 38,
        display: "grid",
        placeItems: "center",
        borderRadius: 9,
        background: dy.surface2,
        color: dy.accent,
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 900,
    },
};
