"use client";
import UiMessage from "@/lib/i18n/UiMessage";
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useState } from 'react';
import Link from "@/lib/i18n/UiLink";
import { BrandLogo } from './BrandLogo';
import { uniqueModuleDestinations } from '@/lib/workspace-navigation';
import DentayaIcon, { type DentayaIconName } from './DentayaIcon';
import HomeNotifications from './HomeNotifications';
import OnboardingGuide from './OnboardingGuide';
import { dueLabel, homeCaseFlag, homeStatus, isActiveCase, localDay, prioritizedCases, type HomeCase, type HomeCounts, type HomeOrgType, type HomeShipment } from '@/lib/home-dashboard';
type Module = {
    title: string;
    href: string;
    icon: DentayaIconName;
};
type Props = {
    organization: {
        id: string;
        name: string;
        org_type: HomeOrgType;
        demo_mode: boolean;
    };
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
    const [menuOpen, setMenuOpen] = useState(false), [search, setSearch] = useState(''), [queueTab, setQueueTab] = useState<'priority' | 'today'>('priority');
    const courier = p.organization.org_type === 'courier', today = localDay();
    const kind = p.organization.org_type === 'clinic' ? 'Klinik' : courier ? 'Kurye' : 'Laboratuvar';
    const shared: Module[] = [{ title: 'Topluluk', href: '/community', icon: 'team' }, { title: 'Mesajlar', href: '/messages', icon: 'message' }, { title: 'Bildirimler', href: '/notifications', icon: 'notification' }];
    if (p.role === 'owner' || p.role === 'admin')
        shared.push({ title: 'Ekip', href: '/team', icon: 'team' });
    const workflows = [...p.modules.filter(m => m.href !== '/ai').filter(m => !shared.some(s => s.href === m.href) && m.href !== '/ai')];
    if (p.organization.org_type === 'clinic')
        workflows.unshift({ title: 'Klinik merkezi', href: '/clinic', icon: 'clinic' }, { title: 'Randevular', href: '/appointments', icon: 'calendar' });
    if (p.organization.org_type === 'clinic')
        workflows.push({ title: '3D tarama arşivi', href: '/scans', icon: 'scan' }, { title: 'Laboratuvarlar', href: '/labs', icon: 'lab' });
    if (p.organization.org_type === 'laboratory')
        workflows.push({ title: 'Teslimatlar', href: '/logistics', icon: 'logistics' });
    const matches = (m: {
        title: string;
    }) => `${uiText(m.title)} ${m.title}`.toLocaleLowerCase(intlLocale()).includes(search.toLocaleLowerCase(intlLocale()));
    const queue = queueTab === 'today' ? p.cases.filter(c => isActiveCase(c) && c.due_date === today).sort((a, b) => (homeCaseFlag(a, today)?.rank ?? 9) - (homeCaseFlag(b, today)?.rank ?? 9)) : prioritizedCases(p.cases, today);
    const recent = p.cases.filter(item => !queue.slice(0, 6).some(queued => queued.id === item.id)).sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5);
    const deliveries = [...p.shipments].sort((a, b) => Number(b.status === 'pickup_requested') - Number(a.status === 'pickup_requested') || a.updated_at.localeCompare(b.updated_at)).slice(0, 6);
    const stats = courier ? [
        { label: 'Aktif gönderi', value: p.counts?.active, detail: 'Devam eden teslimatlar', icon: 'logistics' as const },
        { label: 'Alım bekliyor', value: p.counts?.pickup, detail: 'Planlanacak alımlar', icon: 'case' as const },
        { label: 'Yolda', value: p.counts?.inTransit, detail: 'Dağıtımdaki gönderiler', icon: 'logistics' as const },
        { label: 'Teslim alındı', value: p.counts?.pickedUp, detail: 'Kurye tarafından alındı', icon: 'shield' as const },
    ] : [
        { label: 'Aktif vaka', value: p.counts?.active, detail: 'Tamamlanmamış tüm vakalar', icon: 'case' as const },
        { label: 'Geciken termin', value: p.counts?.overdue, detail: 'Teslim tarihi geçmiş işler', icon: 'calendar' as const },
        { label: 'Öncelikli', value: p.counts?.urgent, detail: 'Acil ve yüksek öncelikli', icon: 'notification' as const },
        { label: 'Onay bekliyor', value: p.counts?.approval, detail: 'Karar bekleyen vakalar', icon: 'shield' as const },
    ];
    function nav(items: Module[]) { return uniqueModuleDestinations(items).filter(matches).map(m => <Link href={m.href} key={m.href} onClick={() => setMenuOpen(false)}><UiNode as="span" className="home-nav-icon"><DentayaIcon name={m.icon} size={18}/></UiNode><UiNode as="span">{uiText(m.title)}</UiNode></Link>); }
    return <UiNode as="div" className="home-shell">
    <UiNode as="button" className="home-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="home-sidebar" onClick={() => setMenuOpen(v => !v)}>{menuOpen ? 'Menüyü kapat' : 'Modül menüsünü aç'}</UiNode>
    <UiNode as="aside" id="home-sidebar" className="home-sidebar" data-open={menuOpen} onKeyDown={e => {
            if (e.key === 'Escape')
                setMenuOpen(false);
        }}>
      <UiNode as="div" className="home-brand"><BrandLogo width={166} height={40}/></UiNode>
      <UiNode as="div" className="home-org"><UiNode as="span" className="home-org-mark"><UserText>{p.organization.name.slice(0, 1).toLocaleUpperCase('tr')}</UserText></UiNode><UiNode data-dy-copy-stack as="div"><UiNode as="strong"><UserText>{p.organization.name}</UserText></UiNode><UiNode as="small">{kind}{p.organization.demo_mode ? ' · Demo' : ''}</UiNode></UiNode></UiNode>
      <UiNode as="label" className="home-nav-search"><UiNode as="span">Modül ara</UiNode><UiNode as="input" type="search" placeholder={uiText("Modül ara…")} value={search} onChange={e => setSearch(e.target.value)}/></UiNode>
      <UiNode as="nav" aria-label="Modül menüsü" className="home-nav">
        <Link href="/workspace" aria-current="page"><DentayaIcon name="home" size={18}/><UiNode as="span">{uiText("Genel bakış")}</UiNode></Link>
        <UiNode as="p">İŞ AKIŞI</UiNode>{nav(workflows)}
        <UiNode as="p">{uiText("İLETİŞİM")}</UiNode>{nav(shared)}
        <UiNode as="p">ASİSTAN</UiNode>{nav([{ title: 'AYA asistan', href: '/ai', icon: 'ai' }])}
        {search && ![...workflows, ...shared, { title: 'AYA asistan', href: '/ai', icon: 'ai' }].some(matches) && <UiNode as="small" className="home-nav-empty">Eşleşen modül yok.</UiNode>}
      </UiNode>
      <UiNode as="div" className="home-sidebar-bottom"><Link href="/settings?section=workspace"><DentayaIcon name="settings" size={18}/>Çalışma alanı ayarları</Link><Link href="/start"><DentayaIcon name="guide" size={18}/>Başlangıç rehberi</Link><UiNode as="button" type="button" onClick={p.onSignOut}>{uiText("Çıkış yap")}</UiNode></UiNode>
    </UiNode>
    <UiNode as="main" className="home-main">
      <UiNode as="header" className="home-topbar"><UiNode as="div"><UiNode as="span" className="home-eyebrow">{uiText("ÇALIŞMA ALANI")}</UiNode><UiNode as="h1">{uiText("Genel bakış")}</UiNode></UiNode><UiNode as="div" className="home-top-actions"><UiNode as="span">{new Date().toLocaleDateString(intlLocale(), { day: 'numeric', month: 'long', year: 'numeric' })}</UiNode><UiNode as="button" type="button" onClick={p.onRefresh} disabled={p.loading}>{p.loading ? 'Güncelleniyor…' : uiText("Yenile")}</UiNode><UiNode as="button" type="button" aria-label={uiText("Görünümü düzenle")} onClick={() => window.dispatchEvent(new Event("dentaya:open-preferences"))}><DentayaIcon name="settings" size={19}/></UiNode></UiNode></UiNode>
      <UiNode as="div" className="home-main-inner">
        <UiNode as="section" className="home-welcome"><UiNode as="div"><UiNode as="h2">{p.name ? <UiMessage source="Merhaba, {0}" values={[p.name.split(' ')[0]]} userValues={[0]}/> : 'Hoş geldiniz'}</UiNode><UiNode as="p">{courier ? 'Alımlarınızı ve teslimat akışını buradan takip edin.' : 'Günün işlerini, yaklaşan terminleri ve ekip bildirimlerini takip edin.'}</UiNode></UiNode></UiNode>
        {p.error && <UiNode as="div" className="home-error" role="alert"><UiNode as="strong">Veriler güncellenemedi.</UiNode><UiNode as="span">{p.updatedAt ? 'Son başarılı güncellemedeki bilgiler gösteriliyor.' : 'Özet verileri şu anda alınamıyor.'} {p.error}</UiNode><UiNode as="button" type="button" onClick={p.onRefresh} disabled={p.loading}>{uiText("Tekrar dene")}</UiNode></UiNode>}
        <UiNode as="div" className="home-metrics" aria-label="İş özeti">{stats.map((s, i) => <UiNode as="article" className={`home-metric ${!courier && i === 1 && s.value ? 'has-warning' : ''}`} key={s.label}><UiNode as="div"><UiNode as="span">{uiText(s.label)}</UiNode><DentayaIcon name={s.icon} size={19}/></UiNode><UiNode as="strong">{s.value ?? '—'}</UiNode><UiNode as="small">{s.detail}</UiNode></UiNode>)}</UiNode>
        <UiNode as="div" className="home-data-time">{p.updatedAt ? <UiMessage source="Son güncelleme: {0}" values={[new Date(p.updatedAt).toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit' })]} userValues={[]}/> : p.loading ? 'Özet yükleniyor…' : 'Henüz güncellenmedi'}</UiNode>
        <UiNode as="div" className="home-columns">
          <UiNode as="div" className="home-primary-column">
            <UiNode as="section" className="home-panel" id="home-priority" aria-labelledby="home-priority-title">
              <UiNode as="div" className="home-panel-heading"><UiNode as="div"><UiNode as="span" className="home-eyebrow">{courier ? 'TESLİMAT AKIŞI' : 'ÖNCE ELE ALINACAKLAR'}</UiNode><UiNode as="h2" id="home-priority-title">{courier ? 'Alım ve teslimatlar' : queueTab === 'today' ? 'Bugünkü terminler' : 'Öncelikli işler'}</UiNode></UiNode></UiNode>
              {!courier && <UiNode as="div" className="home-queue-tabs" role="group" aria-label="İş listesi görünümü"><UiNode as="button" type="button" aria-pressed={queueTab === 'priority'} onClick={() => setQueueTab('priority')}>Öncelikli işler</UiNode><UiNode as="button" type="button" aria-pressed={queueTab === 'today'} onClick={() => setQueueTab('today')}>Bugün teslim <UiNode as="span">{p.counts?.today ?? '—'}</UiNode></UiNode></UiNode>}
              {!p.counts ? <UiNode as="p" className="home-empty">{p.loading ? 'İşler yükleniyor…' : 'Veriler yüklendiğinde işleriniz burada görünecek.'}</UiNode> : courier ? deliveries.length ? <UiNode as="div" className="home-work-list">{deliveries.map(s => <UiNode as="article" key={s.id} className="home-work-row"><UiNode as="span" className="home-work-icon"><DentayaIcon name="logistics" size={19}/></UiNode><UiNode data-dy-copy-stack as="span" className="home-work-copy"><UiNode as="strong">{s.tracking_code || 'Takip kodu bekleniyor'}</UiNode><UiNode as="small">{s.courier_name || 'Kurye bilgisi belirtilmedi'}</UiNode></UiNode><UiNode as="span" className={`home-badge ${s.status === 'pickup_requested' ? 'warning' : 'accent'}`}>{homeStatus(s.status)}</UiNode></UiNode>)}</UiNode> : <UiNode as="p" className="home-empty">Aktif alım veya teslimat bulunmuyor.</UiNode> : queue.length ? <UiNode as="div" className="home-work-list">{queue.slice(0, 6).map(c => { const flag = homeCaseFlag(c, today)!; return <Link key={c.id} href={`/cases/${encodeURIComponent(c.id)}`} className="home-work-row"><UiNode as="span" className={`home-work-icon ${flag.tone}`}><DentayaIcon name={flag.rank === 0 ? 'calendar' : 'case'} size={19}/></UiNode><UiNode data-dy-copy-stack as="span" className="home-work-copy"><UiNode as="strong">{c.case_number} · <UserText>{c.title || uiText('Vaka')}</UserText></UiNode><UiNode as="small">{homeStatus(c.status)} · {c.due_date ? <UiMessage source="Termin: {0}" values={[dueLabel(c.due_date, intlLocale())]} userValues={[]}/> : 'Termin belirtilmedi'}</UiNode></UiNode><UiNode as="span" className={`home-badge ${flag.tone}`}>{flag.label}</UiNode><UiNode as="span" className="home-row-arrow" aria-hidden="true">↗</UiNode></Link>; })}</UiNode> : <UiNode as="div" className="home-empty"><DentayaIcon name="shield" size={24}/><UiNode as="strong">{queueTab === 'today' ? 'Bugüne terminli aktif vaka yok.' : 'Öncelik gerektiren aktif iş bulunmuyor.'}</UiNode><UiNode as="p">İşler güncellendikçe liste yenilenir.</UiNode></UiNode>}
              <UiNode as="div" className="home-panel-note">{courier ? 'Önce alım bekleyen görevler gösterilir.' : 'Geciken terminler önce, ardından acil işler, yüksek öncelik ve onaylar gösterilir.'}</UiNode>
            </UiNode>
            {!courier && <UiNode as="section" className="home-panel" aria-labelledby="home-recent-title"><UiNode as="div" className="home-panel-heading"><UiNode as="h2" id="home-recent-title">Son güncellenen vakalar</UiNode></UiNode>{recent.length ? <UiNode as="div" className="home-recent-table"><UiNode as="div" className="home-table-head"><UiNode as="span">{uiText("Vaka")}</UiNode><UiNode as="span">{uiText("Durum")}</UiNode><UiNode as="span">Güncelleme</UiNode></UiNode>{recent.map(c => <Link className="home-table-row" key={c.id} href={`/cases/${encodeURIComponent(c.id)}`}><UiNode data-dy-copy-stack as="span"><UiNode as="strong">{c.case_number}</UiNode><UiNode as="small"><UserText>{c.title || uiText('Vaka')}</UserText></UiNode></UiNode><UiNode as="span">{homeStatus(c.status)}</UiNode><UiNode as="time" dateTime={c.updated_at}>{new Date(c.updated_at).toLocaleDateString(intlLocale(), { day: 'numeric', month: 'short' })}</UiNode></Link>)}</UiNode> : <UiNode as="p" className="home-empty">{p.counts ? 'Henüz vaka kaydı yok.' : 'Vaka bilgisi yüklenemedi.'}</UiNode>}</UiNode>}
          </UiNode>
          <UiNode as="aside" className="home-secondary-column" aria-label="Bildirimler ve yardımcı araçlar">
            <HomeNotifications orgId={p.organization.id} userId={p.userId}/>
          </UiNode>
        </UiNode>
        <OnboardingGuide />
        <UiNode as="footer" className="home-footer"><UiNode as="span"><UserText>{p.organization.name}</UserText> · {kind}</UiNode><UiNode as="span">DentAYA çalışma alanı</UiNode></UiNode>
      </UiNode>
    </UiNode>
  </UiNode>;
}
