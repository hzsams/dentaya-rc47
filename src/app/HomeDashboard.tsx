"use client";

import UiMessage from "@/lib/i18n/UiMessage";
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useState } from 'react';
import Link from "@/lib/i18n/UiLink";
import { uniqueModuleDestinations } from '@/lib/workspace-navigation';
import { memberRoleLabel } from '@/lib/display-labels';
import DentayaIcon, { type DentayaIconName } from './DentayaIcon';
import HomeNotifications from './HomeNotifications';
import OnboardingGuide from './OnboardingGuide';
import { dueLabel, homeCaseFlag, homeStatus, isActiveCase, localDay, prioritizedCases, type HomeCase, type HomeCounts, type HomeOrgType, type HomeShipment } from '@/lib/home-dashboard';
import './workspace-desktop.css';

type Module = { title: string; href: string; icon: DentayaIconName };
type Props = {
    organization: { id: string; name: string; org_type: HomeOrgType; demo_mode: boolean };
    userId: string;
    name: string;
    role: string;
    modules: Module[];
    cases: HomeCase[];
    shipments: HomeShipment[];
    counts: HomeCounts | null;
    loading: boolean;
    error: string;
    updatedAt: string | null;
    onRefresh: () => void;
    onSignOut: () => void;
};

export default function HomeDashboard(p: Props) {
    const { t: uiText, intlLocale } = useTranslation();
    const [search, setSearch] = useState('');
    const [caseSearch, setCaseSearch] = useState('');
    const [queueTab, setQueueTab] = useState<'priority' | 'today' | 'recent'>('priority');
    const courier = p.organization.org_type === 'courier';
    const today = localDay();
    const kind = p.organization.org_type === 'clinic' ? 'Klinik' : courier ? 'Kurye' : 'Laboratuvar';
    const shared: Module[] = [
        { title: 'Topluluk', href: '/community', icon: 'team' },
        { title: 'Mesajlar', href: '/messages', icon: 'message' },
        { title: 'Bildirimler', href: '/notifications', icon: 'notification' },
    ];
    if (p.role === 'owner' || p.role === 'admin') shared.push({ title: 'Ekip', href: '/team', icon: 'team' });
    const workflows = p.modules.filter(m => m.href !== '/ai' && !shared.some(s => s.href === m.href));
    if (p.organization.org_type === 'clinic') {
        workflows.unshift({ title: 'Klinik merkezi', href: '/clinic', icon: 'clinic' }, { title: 'Randevular', href: '/appointments', icon: 'calendar' });
        workflows.push({ title: '3D tarama arşivi', href: '/scans', icon: 'scan' }, { title: 'Laboratuvarlar', href: '/labs', icon: 'lab' });
    }
    if (p.organization.org_type === 'laboratory') workflows.push({ title: 'Teslimatlar', href: '/logistics', icon: 'logistics' });
    const moduleMatches = (m: Module) => `${uiText(m.title)} ${m.title}`.toLocaleLowerCase(intlLocale()).includes(search.toLocaleLowerCase(intlLocale()));
    const modules = uniqueModuleDestinations([...workflows, ...shared, { title: 'AYA asistan', href: '/ai', icon: 'ai' as const }]).filter(moduleMatches);
    const priority = prioritizedCases(p.cases, today);
    const queue = queueTab === 'today'
        ? p.cases.filter(c => isActiveCase(c) && c.due_date === today).sort((a, b) => (homeCaseFlag(a, today)?.rank ?? 9) - (homeCaseFlag(b, today)?.rank ?? 9))
        : queueTab === 'recent' ? [...p.cases].sort((a, b) => b.updated_at.localeCompare(a.updated_at)) : priority;
    const normalizedSearch = caseSearch.toLocaleLowerCase(intlLocale()).trim();
    const visibleCases = queue.filter(c => `${c.case_number} ${c.title} ${c.patient_reference} ${uiText(homeStatus(c.status))}`.toLocaleLowerCase(intlLocale()).includes(normalizedSearch));
    const deliveries = [...p.shipments]
        .sort((a, b) => Number(b.status === 'pickup_requested') - Number(a.status === 'pickup_requested') || a.updated_at.localeCompare(b.updated_at))
        .filter(s => `${s.tracking_code ?? ''} ${s.courier_name ?? ''} ${uiText(homeStatus(s.status))}`.toLocaleLowerCase(intlLocale()).includes(normalizedSearch));
    const stats = courier ? [
        { label: 'Aktif gönderi', value: p.counts?.active, icon: 'logistics' as const },
        { label: 'Alım bekliyor', value: p.counts?.pickup, icon: 'case' as const },
        { label: 'Yolda', value: p.counts?.inTransit, icon: 'logistics' as const },
        { label: 'Teslim alındı', value: p.counts?.pickedUp, icon: 'shield' as const },
    ] : [
        { label: 'Aktif vaka', value: p.counts?.active, icon: 'case' as const },
        { label: 'Geciken termin', value: p.counts?.overdue, icon: 'calendar' as const },
        { label: 'Öncelikli', value: p.counts?.urgent, icon: 'notification' as const },
        { label: 'Onay bekliyor', value: p.counts?.approval, icon: 'shield' as const },
    ];

    return <UiNode as="main" className="desktop-workspace-home" aria-busy={p.loading}>
        <UiNode as="header" className="desktop-home-toolbar">
            <UiNode as="div" className="desktop-home-heading"><DentayaIcon name="home" size={19}/><UiNode as="h1">İş takibi</UiNode><UiNode as="span" className="desktop-home-divider"/><UiNode as="span" className="desktop-home-org-name"><UserText>{p.organization.name}</UserText></UiNode>{p.organization.demo_mode && <UiNode as="span" className="desktop-home-tag">Demo</UiNode>}</UiNode>
            <UiNode as="div" className="desktop-home-toolbar-actions"><UiNode as="button" type="button" className="desktop-home-button" onClick={p.onRefresh} disabled={p.loading}><DentayaIcon name="calendar" size={15}/>{p.loading ? 'Güncelleniyor…' : uiText('Yenile')}</UiNode><Link className="desktop-home-button desktop-home-button-primary" href={courier ? '/logistics' : '/cases'}><DentayaIcon name={courier ? 'logistics' : 'case'} size={15}/>{courier ? 'Teslimatlar' : 'Vakaları Aç'}</Link></UiNode>
        </UiNode>

        <UiNode as="section" className="desktop-home-modulebar" aria-label="Hızlı erişim">
            <UiNode as="label" className="desktop-home-module-search"><DentayaIcon name="guide" size={15}/><UiNode as="input" type="search" aria-label="Modül ara" placeholder={uiText('Modül ara…')} value={search} onChange={e => setSearch(e.target.value)}/></UiNode>
            <UiNode as="div" className="desktop-home-module-links">{modules.map(m => <Link key={m.href} href={m.href}><DentayaIcon name={m.icon} size={16}/><UiNode as="span">{uiText(m.title)}</UiNode></Link>)}{!modules.length && <UiNode as="span" className="desktop-home-muted">Eşleşen modül yok.</UiNode>}</UiNode>
        </UiNode>

        {p.error && <UiNode as="div" className="desktop-home-error" role="alert"><DentayaIcon name="notification" size={18}/><UiNode as="div"><UiNode as="strong">Veriler güncellenemedi.</UiNode><UiNode as="span">{p.updatedAt ? 'Son başarılı güncellemedeki bilgiler gösteriliyor.' : 'Özet verileri şu anda alınamıyor.'} <UiNode as="span">{p.error}</UiNode></UiNode></UiNode><UiNode as="button" type="button" onClick={p.onRefresh} disabled={p.loading}>Tekrar dene</UiNode></UiNode>}

        <UiNode as="div" className="desktop-home-workbench">
            <UiNode as="aside" className="desktop-home-context" aria-label="Aktif çalışma alanı">
                <UiNode as="div" className="desktop-home-context-title"><DentayaIcon name={courier ? 'logistics' : p.organization.org_type === 'clinic' ? 'clinic' : 'lab'} size={17}/><UiNode as="strong">{kind}</UiNode></UiNode>
                <UiNode as="div" className="desktop-home-context-org"><UserText>{p.organization.name}</UserText></UiNode>
                <UiNode as="span" className="desktop-home-section-label">İŞ KUYRUĞU</UiNode>
                {courier ? <UiNode as="div" className="desktop-home-context-current"><DentayaIcon name="logistics" size={16}/><UiNode as="span">Alım ve teslimatlar</UiNode><UiNode as="b">{p.counts?.active ?? '—'}</UiNode></UiNode> : <UiNode as="div" className="desktop-home-view-buttons" role="group" aria-label="İş listesi görünümü">
                    <UiNode as="button" type="button" aria-pressed={queueTab === 'priority'} onClick={() => setQueueTab('priority')}><DentayaIcon name="notification" size={16}/><UiNode as="span">Öncelikli işler</UiNode><UiNode as="b">{p.counts ? priority.length : '—'}</UiNode></UiNode>
                    <UiNode as="button" type="button" aria-pressed={queueTab === 'today'} onClick={() => setQueueTab('today')}><DentayaIcon name="calendar" size={16}/><UiNode as="span">Bugün teslim</UiNode><UiNode as="b">{p.counts?.today ?? '—'}</UiNode></UiNode>
                    <UiNode as="button" type="button" aria-pressed={queueTab === 'recent'} onClick={() => setQueueTab('recent')}><DentayaIcon name="case" size={16}/><UiNode as="span">Son güncellenen vakalar</UiNode><UiNode as="b">{p.counts ? p.cases.length : '—'}</UiNode></UiNode>
                </UiNode>}
                <UiNode as="div" className="desktop-home-context-bottom"><UiNode as="span" className="desktop-home-section-label">Oturum</UiNode><UiNode as="strong"><UserText>{p.name || p.organization.name}</UserText></UiNode><UiNode as="small">{uiText('Rol')}: <UiNode as="span">{memberRoleLabel(p.role)}</UiNode></UiNode><Link href="/settings?section=workspace"><DentayaIcon name="settings" size={14}/>Çalışma alanı ayarları</Link><UiNode as="button" type="button" onClick={p.onSignOut}>Çıkış yap</UiNode></UiNode>
            </UiNode>

            <UiNode as="div" className="desktop-home-workarea">
                <UiNode as="div" className="desktop-home-counters" aria-label="İş özeti">{stats.map((stat, index) => <UiNode as="div" key={stat.label} className="desktop-home-counter" data-warning={!courier && index === 1 && Boolean(stat.value)}><DentayaIcon name={stat.icon} size={16}/><UiNode as="span">{uiText(stat.label)}</UiNode><UiNode as="strong">{stat.value ?? '—'}</UiNode></UiNode>)}</UiNode>
                <UiNode as="section" className="desktop-home-records" aria-labelledby="home-priority-title">
                    <UiNode as="div" className="desktop-home-records-toolbar"><UiNode as="div"><UiNode as="h2" id="home-priority-title">{courier ? 'Alım ve teslimatlar' : queueTab === 'today' ? 'Bugünkü terminler' : queueTab === 'recent' ? 'Son güncellenen vakalar' : 'Öncelikli işler'}</UiNode><UiNode as="span" className="desktop-home-tag">{p.counts ? courier ? deliveries.length : visibleCases.length : '—'}</UiNode></UiNode><UiNode as="input" type="search" className="desktop-home-record-search" aria-label="Vaka / gönderi ara" placeholder={uiText('Vaka / gönderi ara')} value={caseSearch} onChange={e => setCaseSearch(e.target.value)}/></UiNode>
                    <UiNode as="div" className="desktop-home-table-scroll">
                        <UiNode as="table" className="desktop-home-table"><UiNode as="thead"><UiNode as="tr"><UiNode as="th" scope="col">{courier ? 'Gönderi' : 'Vaka / Hasta Ref'}</UiNode><UiNode as="th" scope="col">{courier ? 'Kurye' : 'Vaka'}</UiNode><UiNode as="th" scope="col">Durum</UiNode><UiNode as="th" scope="col">{courier ? 'Güncelleme' : 'Termin'}</UiNode>{!courier && <UiNode as="th" scope="col">Öncelik</UiNode>}</UiNode></UiNode>
                            <UiNode as="tbody">{p.counts && (courier ? deliveries.map(s => <UiNode as="tr" key={s.id}><UiNode as="td"><Link href="/logistics" className="desktop-home-record-link"><DentayaIcon name="logistics" size={16}/><UserText>{s.tracking_code || uiText('Takip kodu bekleniyor')}</UserText></Link></UiNode><UiNode as="td"><UserText>{s.courier_name || uiText('Kurye bilgisi belirtilmedi')}</UserText></UiNode><UiNode as="td"><UiNode as="span" className={`desktop-home-status ${s.status === 'pickup_requested' ? 'warning' : 'accent'}`}>{homeStatus(s.status)}</UiNode></UiNode><UiNode as="td"><UiNode as="time" dateTime={s.updated_at}>{new Date(s.updated_at).toLocaleDateString(intlLocale(), { day: 'numeric', month: 'short' })}</UiNode></UiNode></UiNode>) : visibleCases.map(c => { const flag = homeCaseFlag(c, today); return <UiNode as="tr" key={c.id}><UiNode as="td"><Link className="desktop-home-record-link" href={`/cases/${encodeURIComponent(c.id)}`}><DentayaIcon name="case" size={16}/><UiNode as="span"><UiNode as="strong"><UserText>{c.case_number}</UserText></UiNode><UiNode as="small"><UserText>{c.patient_reference || '—'}</UserText></UiNode></UiNode></Link></UiNode><UiNode as="td" className="desktop-home-case-title"><Link href={`/cases/${encodeURIComponent(c.id)}`}><UserText>{c.title || uiText('Vaka')}</UserText></Link></UiNode><UiNode as="td"><UiNode as="span" className="desktop-home-status">{homeStatus(c.status)}</UiNode></UiNode><UiNode as="td"><UiNode as="span" className={flag?.rank === 0 ? 'desktop-home-danger' : undefined}>{dueLabel(c.due_date, intlLocale())}</UiNode></UiNode><UiNode as="td">{flag ? <UiNode as="span" className={`desktop-home-flag ${flag.tone}`}><UiNode as="i"/>{flag.label}</UiNode> : '—'}</UiNode></UiNode>; }))}</UiNode>
                        </UiNode>
                    </UiNode>
                    {(!p.counts || (courier ? !deliveries.length : !visibleCases.length)) && <UiNode as="div" className="desktop-home-empty"><UiNode as="div" className="desktop-home-empty-icon"><DentayaIcon name={courier ? 'logistics' : 'case'} size={29}/></UiNode><UiNode as="strong">{!p.counts ? p.loading ? 'İşler yükleniyor…' : 'Veriler yüklendiğinde işleriniz burada görünecek.' : normalizedSearch ? 'Sonuç bulunamadı.' : courier ? 'Aktif alım veya teslimat bulunmuyor.' : queueTab === 'today' ? 'Bugüne terminli aktif vaka yok.' : queueTab === 'recent' ? 'Henüz vaka kaydı yok.' : 'Öncelik gerektiren aktif iş bulunmuyor.'}</UiNode><UiNode as="p">İşler güncellendikçe liste yenilenir.</UiNode>{normalizedSearch ? <UiNode as="button" type="button" className="desktop-home-button" onClick={() => setCaseSearch('')}>Aramayı Temizle</UiNode> : <Link className="desktop-home-button" href={courier ? '/logistics' : '/cases'}>{courier ? 'Teslimatlar' : 'Vaka listesini aç'}</Link>}</UiNode>}
                    <UiNode as="div" className="desktop-home-records-note"><DentayaIcon name="shield" size={13}/><UiNode as="span">{courier ? 'Önce alım bekleyen görevler gösterilir.' : 'Geciken terminler önce, ardından acil işler, yüksek öncelik ve onaylar gösterilir.'}</UiNode></UiNode>
                </UiNode>
            </UiNode>

            <UiNode as="aside" className="desktop-home-inspector" aria-label="Bildirimler ve yardımcı araçlar"><UiNode as="section" className="desktop-home-today"><UiNode as="div" className="desktop-home-inspector-heading"><DentayaIcon name="calendar" size={15}/><UiNode as="h2">Bugün</UiNode></UiNode><UiNode as="time" dateTime={today}>{new Date().toLocaleDateString(intlLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}</UiNode><UiNode as="p">{courier ? 'Alımlarınızı ve teslimat akışını buradan takip edin.' : 'Günün işlerini, yaklaşan terminleri ve ekip bildirimlerini takip edin.'}</UiNode></UiNode><HomeNotifications orgId={p.organization.id} userId={p.userId}/><UiNode as="div" className="desktop-home-onboarding"><OnboardingGuide/></UiNode><Link className="desktop-home-guide-link" href="/start"><DentayaIcon name="guide" size={16}/>Başlangıç rehberi<UiNode as="span" aria-hidden="true">↗</UiNode></Link></UiNode>
        </UiNode>

        <UiNode as="footer" className="desktop-home-statusbar"><UiNode as="span"><UiNode as="i" data-state={p.error ? 'warning' : p.updatedAt ? 'ready' : 'pending'}/>{p.updatedAt ? <UiMessage source="Son güncelleme: {0}" values={[new Date(p.updatedAt).toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit' })]} userValues={[]}/> : p.loading ? 'Özet yükleniyor…' : 'Henüz güncellenmedi'}</UiNode><UiNode as="span"><UserText>{p.organization.name}</UserText> · {kind}</UiNode></UiNode>
    </UiNode>;
}
