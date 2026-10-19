"use client";
import SystemNotificationBody from '@/app/SystemNotificationBody';
import {notificationTitle} from '@/lib/system-messages';
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import Link from "@/lib/i18n/UiLink";
import { supabase } from '@/lib/supabase';
import { categoryEnabled, DEFAULT_NOTIFICATION_PREFERENCES, loadNotificationPreferences, type NotificationCategory, type NotificationPreferences } from '@/lib/notification-preferences';
import { notificationHref } from '@/lib/home-dashboard';
type Row = {
    id: string;
    title: string;
    body: string | null;
    severity: string;
    is_read: boolean;
    action_path: string | null;
    created_at: string;
    entity_type: string | null;
};
export default function HomeNotifications({ orgId, userId }: {
    orgId: string;
    userId: string;
}) {
    const { t: uiText, intlLocale } = useTranslation();
    const [rows, setRows] = useState<Row[]>([]), [unread, setUnread] = useState<number | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [retry, setRetry] = useState(0);
    useEffect(() => {
        let active = true, preferences = DEFAULT_NOTIFICATION_PREFERENCES, sequence = 0;
        async function load() {
            const request = ++sequence;
            setLoading(true);
            try {
                const categories: NotificationCategory[] = ['case', 'design', 'finance', 'delivery', 'message', 'system'];
                const enabled = categories.filter(c => categoryEnabled(preferences, c));
                if (!enabled.length) {
                    if (active) {
                        setRows([]);
                        setUnread(0);
                        setError('');
                        setLoading(false);
                    }
                    return;
                }
                const [recent, count] = await Promise.all([
                    supabase.from('notifications').select('id,title,body,severity,is_read,action_path,created_at,entity_type').eq('organization_id', orgId).in('category', enabled).order('created_at', { ascending: false }).limit(5),
                    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).in('category', enabled).eq('is_read', false),
                ]);
                if (recent.error || count.error)
                    throw Error('Bildirimler yüklenemedi.');
                if (active && request === sequence) {
                    setRows((recent.data ?? []) as Row[]);
                    setUnread(count.count ?? 0);
                    setError('');
                }
            }
            catch {
                if (active && request === sequence)
                    setError('Bildirimler yüklenemedi.');
            }
            finally {
                if (active && request === sequence)
                    setLoading(false);
            }
        }
        void loadNotificationPreferences(userId).then(p => { if (active) {
            preferences = p;
            void load();
        } }).catch(() => { if (active) {
            setError('Bildirim ayarları yüklenemedi.');
            setLoading(false);
        } });
        const channel = supabase.channel(`home-feed-${orgId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `organization_id=eq.${orgId}` }, () => { void load(); }).subscribe();
        const onPrefs = (e: Event) => { const detail = (e as CustomEvent<NotificationPreferences>).detail; if (detail) {
            preferences = detail;
            void load();
        } };
        window.addEventListener('dentaya-notification-preferences-change', onPrefs);
        return () => { active = false; void supabase.removeChannel(channel); window.removeEventListener('dentaya-notification-preferences-change', onPrefs); };
    }, [orgId, userId, retry]);
    async function markRead(row: Row) {
        if (row.is_read)
            return;
        const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', row.id).eq('organization_id', orgId);
        if (!error) {
            setRows(current => current.map(item => item.id === row.id ? { ...item, is_read: true } : item));
            setRetry(current => current + 1);
        }
    }
    return <UiNode as="section" className="home-panel home-notifications" aria-labelledby="home-notifications-title">
    <UiNode as="div" className="home-panel-heading"><UiNode as="h2" id="home-notifications-title">{uiText("Bildirimler")}</UiNode><UiNode as="span" className="home-count">{unread === null ? '—' : unread} okunmamış</UiNode></UiNode>
    {error ? <UiNode as="div" className="home-empty" role="status"><UiNode as="p">{error}</UiNode><UiNode as="button" type="button" onClick={() => setRetry(v => v + 1)}>{uiText("Tekrar dene")}</UiNode></UiNode> : loading && !rows.length ? <UiNode as="p" className="home-empty">Bildirimler yükleniyor…</UiNode> : rows.length ? <UiNode as="div" className="home-feed">{rows.map(row => <Link key={row.id} href={notificationHref(row.action_path)} onClick={() => void markRead(row)} className="home-feed-row"><UiNode as="span" className={`home-feed-dot ${!row.is_read ? 'is-unread' : ''}`} aria-label={row.is_read ? 'Okundu' : 'Okunmadı'}/><UiNode as="span"><UiNode as="strong"><UserText>{notificationTitle(row,uiText)}</UserText></UiNode>{row.body && <UiNode as="p"><SystemNotificationBody row={row}/></UiNode>}<UiNode as="small">{new Date(row.created_at).toLocaleString(intlLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{row.severity === 'critical' ? ' · Kritik' : row.severity === 'warning' ? ' · Uyarı' : ''}</UiNode></UiNode></Link>)}</UiNode> : <UiNode as="p" className="home-empty">Görüntülenecek bildirim yok.</UiNode>}
    <Link className="home-panel-footer" href="/notifications">Tüm bildirimler →</Link>
  </UiNode>;
}
