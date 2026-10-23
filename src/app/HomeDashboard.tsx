"use client";

import UiMessage from "@/lib/i18n/UiMessage";
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useRef, useState, type KeyboardEvent } from 'react';
import Link from "@/lib/i18n/UiLink";
import { uniqueModuleDestinations } from '@/lib/workspace-navigation';
import { memberRoleLabel } from '@/lib/display-labels';
import DentayaIcon, { type DentayaIconName } from './DentayaIcon';
import HomeNotifications from './HomeNotifications';
import LabManagerPanel from './LabManagerPanel';
import {homeLabCases,type HomeLabQueue} from '@/lib/lab-workspace';
import OnboardingGuide from './OnboardingGuide';
import { dueLabel, homeCaseFlag, homeStatus, isActiveCase, localDay, prioritizedCases, type HomeCase, type HomeCounts, type HomeOrgType, type HomeShipment } from '@/lib/home-dashboard';
import './workspace-desktop.css';

type Module = { title: string; href: string; icon: DentayaIconName };
type Props = {
    organization: { id: string; name: string; org_type: HomeOrgType; demo_mode: boolean };
    userId: string; name: string; role: string; modules: Module[];
    cases: HomeCase[]; shipments: HomeShipment[]; counts: HomeCounts | null;
    loading: boolean; error: string; updatedAt: string | null;
    onRefresh: () => void; onSignOut: () => void;
};

export default function HomeDashboard(p: Props) {
    const { t: uiText, intlLocale, locale } = useTranslation();
    const copy = locale === 'tr' ? {
        more:'Diğer araçlar', inspector:'Seçili iş', select:'Ayrıntılarını göster', open:'Vaka detayını aç',
        shipmentOpen:'Teslimatı aç', noSelection:'İncelenecek bir iş seçin.', noSelectionNote:'Listedeki bir kaydı seçtiğinizde ayrıntıları burada görünür.',
        updates:'Bildirimler ve başlangıç', account:'Oturum ve çalışma alanı', tools:'Çalışma araçları',
        rowHint:'Bir işi seçerek ayrıntılarını inceleyin. Ok tuşlarıyla listedeki seçimi değiştirebilirsiniz.',
        records:'İş listesi', selected:'Seçili', details:'İş ayrıntıları', lastChange:'Son değişiklik',
    } : {
        more:'More tools', inspector:'Selected job', select:'Show details', open:'Open case details',
        shipmentOpen:'Open shipment', noSelection:'Select a job to inspect.', noSelectionNote:'Select a record in the list to see its details here.',
        updates:'Notifications and getting started', account:'Session and workspace', tools:'Work tools',
        rowHint:'Select a job to inspect its details. Use the arrow keys to change the selected row.',
        records:'Job list', selected:'Selected', details:'Job details', lastChange:'Last change',
    };
    const [caseSearch, setCaseSearch] = useState('');
    const [queueTab, setQueueTab] = useState<HomeLabQueue>('priority');
    const [selectedId, setSelectedId] = useState('');
    const rowButtons = useRef(new Map<string, HTMLButtonElement>());
    const courier = p.organization.org_type === 'courier';
    const today = localDay();
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
    const modules = uniqueModuleDestinations([...workflows, ...shared, { title: 'AYA asistan', href: '/ai', icon: 'ai' as const }]);
    const order = courier ? ['/logistics','/operations','/messages','/ai'] : p.organization.org_type === 'clinic'
        ? ['/cases','/scan-studio','/patients','/appointments','/ai'] : ['/design','/scan-studio','/cases','/cad-library','/ai'];
    const commands = order.map(href => modules.find(m => m.href === href)).filter((m): m is Module => Boolean(m));
    const moreCommands = modules.filter(m => !commands.some(command => command.href === m.href));
    const priority = prioritizedCases(p.cases, today);
    const queue = queueTab === 'today'
        ? p.cases.filter(c => isActiveCase(c) && c.due_date === today).sort((a,b) => (homeCaseFlag(a,today)?.rank ?? 9) - (homeCaseFlag(b,today)?.rank ?? 9))
        : queueTab === 'recent' ? [...p.cases].sort((a,b) => b.updated_at.localeCompare(a.updated_at)) : queueTab==='priority'?priority:homeLabCases(p.cases,queueTab,today);
    const normalizedSearch = caseSearch.toLocaleLowerCase(intlLocale()).trim();
    const visibleCases = queue.filter(c => `${c.case_number} ${c.title} ${c.patient_reference} ${uiText(homeStatus(c.status))}`.toLocaleLowerCase(intlLocale()).includes(normalizedSearch));
    const deliveries = [...p.shipments].sort((a,b) => Number(b.status === 'pickup_requested') - Number(a.status === 'pickup_requested') || a.updated_at.localeCompare(b.updated_at))
        .filter(s => `${s.tracking_code ?? ''} ${s.courier_name ?? ''} ${uiText(homeStatus(s.status))}`.toLocaleLowerCase(intlLocale()).includes(normalizedSearch));
    const selectedCase = !courier && p.counts ? visibleCases.find(c => c.id === selectedId) ?? visibleCases[0] : undefined;
    const selectedShipment = courier && p.counts ? deliveries.find(s => s.id === selectedId) ?? deliveries[0] : undefined;
    const currentId = selectedCase?.id ?? selectedShipment?.id ?? '';
    const currentRows = courier ? deliveries : visibleCases;
    const stats = courier ? [
        { label:'Aktif gönderi', value:p.counts?.active }, { label:'Alım bekliyor', value:p.counts?.pickup },
        { label:'Yolda', value:p.counts?.inTransit }, { label:'Teslim alındı', value:p.counts?.pickedUp },
    ] : [
        { label:'Aktif vaka', value:p.counts?.active }, { label:'Geciken termin', value:p.counts?.overdue },
        { label:'Öncelikli', value:p.counts?.urgent }, { label:'Onay bekliyor', value:p.counts?.approval },
    ];
    function moveSelection(event:KeyboardEvent<HTMLButtonElement>,id:string) {
        if (!['ArrowDown','ArrowUp','Home','End'].includes(event.key)) return;
        event.preventDefault();
        const index = currentRows.findIndex(row => row.id === id);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? currentRows.length-1 : Math.max(0,Math.min(currentRows.length-1,index+(event.key==='ArrowDown'?1:-1)));
        const row = currentRows[next];
        if (row) { setSelectedId(row.id); rowButtons.current.get(row.id)?.focus(); }
    }
    const bindRow = (id:string,node:HTMLButtonElement|null) => { if(node)rowButtons.current.set(id,node);else rowButtons.current.delete(id); };
    const dateTime = (value:string) => new Date(value).toLocaleString(intlLocale(),{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});

    return <UiNode as="main" className="desktop-workspace-home" aria-busy={p.loading}>
        <UiNode as="header" className="desktop-home-toolbar">
            <UiNode as="div" className="desktop-home-heading"><DentayaIcon name="case" size={20}/><UiNode as="h1">İş takibi</UiNode><UiNode as="span" className="desktop-home-divider"/><UiNode as="span" className="desktop-home-org-name"><UserText>{p.organization.name}</UserText></UiNode>{p.organization.demo_mode&&<UiNode as="span" className="desktop-home-tag">Demo</UiNode>}</UiNode>
            <UiNode as="div" className="desktop-home-toolbar-actions">
                <UiNode as="span" className="desktop-home-sync">{p.updatedAt?<UiMessage source="Son güncelleme: {0}" values={[new Date(p.updatedAt).toLocaleTimeString(intlLocale(),{hour:'2-digit',minute:'2-digit'})]} userValues={[]}/>:p.loading?'Özet yükleniyor…':'Henüz güncellenmedi'}</UiNode>
                <UiNode as="button" type="button" className="desktop-home-button" onClick={p.onRefresh} disabled={p.loading}><DentayaIcon name="calendar" size={17}/>{p.loading?'Güncelleniyor…':uiText('Yenile')}</UiNode>
                <UiNode as="details" className="desktop-home-account-menu"><UiNode as="summary" aria-label={copy.account}><DentayaIcon name="team" size={18}/><UserText>{p.name||p.organization.name}</UserText></UiNode><UiNode as="div"><UiNode as="strong"><UserText>{p.name||p.organization.name}</UserText></UiNode><UiNode as="small">{uiText('Rol')}: {memberRoleLabel(p.role)}</UiNode><Link href="/settings?section=workspace"><DentayaIcon name="settings" size={16}/>Çalışma alanı ayarları</Link><UiNode as="button" type="button" onClick={p.onSignOut}>Çıkış yap</UiNode></UiNode></UiNode>
            </UiNode>
        </UiNode>
        <UiNode as="nav" className="desktop-home-command-ribbon" aria-label={copy.tools}>
            {commands.map(m=><Link data-module-destination={m.href} className="desktop-home-command" key={m.href} href={m.href}><UiNode as="span" className="desktop-home-command-icon"><DentayaIcon name={m.icon} size={29}/></UiNode><UiNode as="span">{uiText(m.title)}</UiNode></Link>)}
            {moreCommands.length>0&&<UiNode as="details" className="desktop-home-more-commands"><UiNode as="summary"><UiNode as="span" className="desktop-home-command-icon"><DentayaIcon name="home" size={27}/></UiNode><UiNode as="span" translateChildren={false}>{copy.more}</UiNode></UiNode><UiNode as="div">{moreCommands.map(m=><Link data-module-destination={m.href} key={m.href} href={m.href}><DentayaIcon name={m.icon} size={21}/>{uiText(m.title)}</Link>)}</UiNode></UiNode>}
        </UiNode>
        {p.error&&<UiNode as="div" className="desktop-home-error" role="alert"><DentayaIcon name="notification" size={19}/><UiNode as="div"><UiNode as="strong">Veriler güncellenemedi.</UiNode><UiNode as="span">{p.updatedAt?'Son başarılı güncellemedeki bilgiler gösteriliyor.':'Özet verileri şu anda alınamıyor.'} <UserText>{p.error}</UserText></UiNode></UiNode><UiNode as="button" type="button" onClick={p.onRefresh} disabled={p.loading}>Tekrar dene</UiNode></UiNode>}
        <UiNode as="div" className={"desktop-home-workbench"+(p.organization.org_type==='laboratory'?' desktop-home-workbench--laboratory':'')}>
            {p.organization.org_type==='laboratory'&&<LabManagerPanel counts={p.counts} queue={queueTab} role={p.role} onQueue={setQueueTab}/>}
            <UiNode as="section" className="desktop-home-records" id="home-queue-records" aria-labelledby="home-priority-title">
                <UiNode as="div" className="desktop-home-panel-heading"><DentayaIcon name={courier?'logistics':'case'} size={18}/><UiNode as="h2" id="home-priority-title">{courier?'Alım ve teslimatlar':copy.records}</UiNode><UiNode as="span" className="desktop-home-tag">{p.counts?currentRows.length:'—'}</UiNode></UiNode>
                <UiNode as="div" className="desktop-home-records-toolbar">
                    {!courier&&<UiNode as="div" className="desktop-home-view-buttons" role="group" aria-label="İş listesi görünümü">{([{id:'priority',caption:'Öncelikli işler',count:priority.length},{id:'today',caption:'Bugün teslim',count:p.counts?.today},{id:'recent',caption:'Son güncellenen vakalar',count:p.cases.length}] as const).map(tab=><UiNode as="button" key={tab.id} type="button" aria-pressed={queueTab===tab.id} onClick={()=>setQueueTab(tab.id)}>{uiText(tab.caption)}<UiNode as="b">{p.counts?tab.count:'—'}</UiNode></UiNode>)}</UiNode>}
                    <UiNode as="label" className="desktop-home-record-search"><DentayaIcon name="guide" size={16}/><UiNode as="input" type="search" aria-label="Vaka / gönderi ara" placeholder={uiText('Vaka / gönderi ara')} value={caseSearch} onChange={e=>setCaseSearch(e.target.value)}/></UiNode>
                </UiNode>
                <UiNode as="div" className="desktop-home-counters" aria-label="İş özeti">{stats.map(stat=><UiNode as="div" key={stat.label} className="desktop-home-counter"><UiNode as="span">{uiText(stat.label)}</UiNode><UiNode as="strong">{stat.value??'—'}</UiNode></UiNode>)}</UiNode>
                <UiNode as="div" className="desktop-home-table-scroll">
                    <UiNode as="table" className="desktop-home-table"><UiNode as="thead"><UiNode as="tr"><UiNode as="th" scope="col">{courier?'Gönderi':'Vaka / Hasta Ref'}</UiNode><UiNode as="th" scope="col">{courier?'Kurye':'Vaka'}</UiNode><UiNode as="th" scope="col">Durum</UiNode><UiNode as="th" scope="col">{courier?'Güncelleme':'Termin'}</UiNode>{!courier&&<UiNode as="th" scope="col">Öncelik</UiNode>}</UiNode></UiNode>
                    <UiNode as="tbody">{p.counts&&(courier?deliveries.map(s=><UiNode as="tr" key={s.id} data-selected={s.id===currentId}><UiNode as="td"><UiNode as="button" type="button" ref={node=>bindRow(s.id,node)} aria-pressed={s.id===currentId} aria-controls="desktop-home-selected-details" aria-label={copy.select+': '+(s.tracking_code||uiText('Takip kodu bekleniyor'))} className="desktop-home-row-select" onClick={()=>setSelectedId(s.id)} onKeyDown={e=>moveSelection(e,s.id)}><DentayaIcon name="logistics" size={20}/><UserText>{s.tracking_code||uiText('Takip kodu bekleniyor')}</UserText></UiNode></UiNode><UiNode as="td"><UserText>{s.courier_name||uiText('Kurye bilgisi belirtilmedi')}</UserText></UiNode><UiNode as="td"><UiNode as="span" className="desktop-home-status">{homeStatus(s.status)}</UiNode></UiNode><UiNode as="td"><UiNode as="time" dateTime={s.updated_at}>{dateTime(s.updated_at)}</UiNode></UiNode></UiNode>):visibleCases.map(c=>{const flag=homeCaseFlag(c,today);return <UiNode as="tr" key={c.id} data-selected={c.id===currentId}><UiNode as="td"><UiNode as="button" type="button" ref={node=>bindRow(c.id,node)} aria-pressed={c.id===currentId} aria-controls="desktop-home-selected-details" aria-label={copy.select+': '+c.case_number} className="desktop-home-row-select" onClick={()=>setSelectedId(c.id)} onKeyDown={e=>moveSelection(e,c.id)}><DentayaIcon name="case" size={20}/><UiNode as="span"><UiNode as="strong"><UserText>{c.case_number}</UserText></UiNode><UiNode as="small"><UserText>{c.patient_reference||'—'}</UserText></UiNode></UiNode></UiNode></UiNode><UiNode as="td" className="desktop-home-case-title"><UserText>{c.title||uiText('Vaka')}</UserText></UiNode><UiNode as="td"><UiNode as="span" className="desktop-home-status">{homeStatus(c.status)}</UiNode></UiNode><UiNode as="td"><UiNode as="span" className={flag?.rank===0?'desktop-home-danger':undefined}>{dueLabel(c.due_date,intlLocale())}</UiNode></UiNode><UiNode as="td">{flag?<UiNode as="span" className={`desktop-home-flag ${flag.tone}`}><UiNode as="i"/>{flag.label}</UiNode>:'—'}</UiNode></UiNode>;}))}</UiNode></UiNode>
                </UiNode>
                {(!p.counts||!currentRows.length)&&<UiNode as="div" className="desktop-home-empty"><UiNode as="div" className="desktop-home-empty-icon"><DentayaIcon name={courier?'logistics':'case'} size={33}/></UiNode><UiNode as="strong">{!p.counts?p.loading?'İşler yükleniyor…':'Veriler yüklendiğinde işleriniz burada görünecek.':normalizedSearch?'Sonuç bulunamadı.':courier?'Aktif alım veya teslimat bulunmuyor.':queueTab==='today'?'Bugüne terminli aktif vaka yok.':queueTab==='recent'?'Henüz vaka kaydı yok.':queueTab==='priority'?'Öncelik gerektiren aktif iş bulunmuyor.':'Bu görünümde aktif kayıt bulunmuyor.'}</UiNode><UiNode as="p">İşler güncellendikçe liste yenilenir.</UiNode>{normalizedSearch?<UiNode as="button" type="button" className="desktop-home-button" onClick={()=>setCaseSearch('')}>Aramayı Temizle</UiNode>:<Link className="desktop-home-button" href={courier?'/logistics':'/cases'}>{courier?'Teslimatlar':'Vaka listesini aç'}</Link>}</UiNode>}
                <UiNode as="div" className="desktop-home-records-note"><DentayaIcon name="guide" size={15}/><UiNode as="span" translateChildren={false}>{copy.rowHint}</UiNode></UiNode>
            </UiNode>
            <UiNode as="aside" className="desktop-home-inspector" aria-label={copy.inspector}>
                <UiNode as="div" className="desktop-home-panel-heading"><DentayaIcon name={courier?'logistics':'case'} size={18}/><UiNode as="h2" translateChildren={false}>{copy.inspector}</UiNode></UiNode>
                <UiNode as="section" id="desktop-home-selected-details" className="desktop-home-selected-details" aria-label={copy.details}>
                    {selectedCase?<><UiNode as="span" className="desktop-home-selection-kind">Vaka / Hasta Ref</UiNode><UiNode as="h3"><UserText>{selectedCase.case_number}</UserText></UiNode><UiNode as="p" className="desktop-home-selected-title"><UserText>{selectedCase.title||uiText('Vaka')}</UserText></UiNode><UiNode as="dl"><UiNode as="div"><UiNode as="dt">Vaka / Hasta Ref</UiNode><UiNode as="dd"><UserText>{selectedCase.patient_reference||'—'}</UserText></UiNode></UiNode><UiNode as="div"><UiNode as="dt">Durum</UiNode><UiNode as="dd">{homeStatus(selectedCase.status)}</UiNode></UiNode><UiNode as="div"><UiNode as="dt">Termin</UiNode><UiNode as="dd">{dueLabel(selectedCase.due_date,intlLocale())}</UiNode></UiNode><UiNode as="div"><UiNode as="dt">Öncelik</UiNode><UiNode as="dd">{uiText(({low:'Düşük',normal:'Normal',high:'Yüksek',urgent:'Acil'} as Record<string,string>)[selectedCase.priority]??selectedCase.priority)}</UiNode></UiNode><UiNode as="div"><UiNode as="dt" translateChildren={false}>{copy.lastChange}</UiNode><UiNode as="dd"><UiNode as="time" dateTime={selectedCase.updated_at}>{dateTime(selectedCase.updated_at)}</UiNode></UiNode></UiNode></UiNode><Link href={`/cases/${encodeURIComponent(selectedCase.id)}`} className="desktop-home-button desktop-home-button-primary"><DentayaIcon name="case" size={19}/><UiNode as="span" translateChildren={false}>{copy.open}</UiNode></Link></>:selectedShipment?<><UiNode as="span" className="desktop-home-selection-kind">Gönderi</UiNode><UiNode as="h3"><UserText>{selectedShipment.tracking_code||uiText('Takip kodu bekleniyor')}</UserText></UiNode><UiNode as="dl"><UiNode as="div"><UiNode as="dt">Kurye</UiNode><UiNode as="dd"><UserText>{selectedShipment.courier_name||uiText('Kurye bilgisi belirtilmedi')}</UserText></UiNode></UiNode><UiNode as="div"><UiNode as="dt">Durum</UiNode><UiNode as="dd">{homeStatus(selectedShipment.status)}</UiNode></UiNode><UiNode as="div"><UiNode as="dt" translateChildren={false}>{copy.lastChange}</UiNode><UiNode as="dd"><UiNode as="time" dateTime={selectedShipment.updated_at}>{dateTime(selectedShipment.updated_at)}</UiNode></UiNode></UiNode></UiNode><Link href="/logistics" className="desktop-home-button desktop-home-button-primary"><DentayaIcon name="logistics" size={19}/><UiNode as="span" translateChildren={false}>{copy.shipmentOpen}</UiNode></Link></>:<UiNode as="div" className="desktop-home-inspector-empty" translateChildren={false}><DentayaIcon name="case" size={34}/><UiNode as="strong">{copy.noSelection}</UiNode><UiNode as="p">{copy.noSelectionNote}</UiNode></UiNode>}
                </UiNode>
                <UiNode as="details" className="desktop-home-support"><UiNode as="summary" translateChildren={false}><DentayaIcon name="notification" size={18}/>{copy.updates}</UiNode><HomeNotifications orgId={p.organization.id} userId={p.userId}/><OnboardingGuide/><Link className="desktop-home-guide-link" href="/start"><DentayaIcon name="guide" size={18}/>Başlangıç rehberi</Link></UiNode>
            </UiNode>
        </UiNode>
    </UiNode>;
}
