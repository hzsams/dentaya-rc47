"use client";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useState } from 'react';
import Link from "@/lib/i18n/UiLink";
import DentayaIcon, { type DentayaIconName } from './DentayaIcon';
const groups: {
    title: string;
    items: [
        string,
        string,
        DentayaIconName
    ][];
}[] = [
    { title: 'Çalışma', items: [['/workspace', 'Genel bakış', 'home'], ['/cases', 'Vakalar', 'case'], ['/patients', 'Hastalar', 'patient'], ['/appointments', 'Randevular', 'calendar']] },
    { title: 'Tasarım ve üretim', items: [['/scans', 'Taramalar', 'scan'], ['/scan-studio', 'Tarama stüdyosu', 'scan'], ['/design', 'CAD çalışma alanı', 'design'], ['/cad-library','Form kütüphanesi','design'], ['/training', 'Demo ve eğitim', 'guide'], ['/operations', 'İş takibi', 'shield'], ['/logistics', 'Teslimatlar', 'logistics']] },
    { title: 'İletişim', items: [['/community', 'Topluluk', 'team'], ['/messages', 'Mesajlar', 'message'], ['/notifications', 'Bildirimler', 'notification']] },
    { title: 'Yönetim', items: [['/clinic', 'Klinik', 'clinic'], ['/labs', 'Laboratuvar', 'lab'], ['/finance', 'Finans', 'finance'], ['/team', 'Ekip', 'team'], ['/settings', 'Ayarlar', 'settings']] },
    { title: 'Kalite ve pilot', items: [['/pilot-flow', 'Doğrulama kayıtları', 'shield'], ['/pilot-check', 'Sistem Kontrolü', 'guide'], ['/ops-health', 'Operasyon Sağlığı', 'shield'], ['/release-check', 'RC Kontrolü', 'guide']] },
];
export default function ModuleNavigation({ pathname }: {
    pathname: string;
}) {
    const { t: uiText, intlLocale } = useTranslation();
    const [query, setQuery] = useState('');
    const matches = (label: string) => `${uiText(label)} ${label}`.toLocaleLowerCase(intlLocale()).includes(query.trim().toLocaleLowerCase(intlLocale()));
    const visible = groups.map(g => ({ ...g, items: g.items.filter(([, label]) => matches(label)) })).filter(g => g.items.length);
    return <><UiNode as="label" className="module-search"><UiNode as="span">{uiText("Modül bul")}</UiNode><UiNode as="input" type="search" placeholder={uiText("Modül ara…")} value={query} onChange={e => setQuery(e.target.value)}/></UiNode><UiNode as="nav" aria-label={uiText("Çalışma alanı menüsü")}>{visible.map(g => <UiNode as="section" className="module-nav-group" key={g.title}><UiNode as="h2">{uiText(g.title)}</UiNode>{g.items.map(([href, label, icon]) => <Link key={href} href={href} aria-current={pathname === href || pathname.startsWith(href + '/') ? 'page' : undefined}><DentayaIcon name={icon} size={18}/><UiNode as="span">{uiText(label)}</UiNode></Link>)}</UiNode>)}{!visible.length && <UiNode as="p" className="module-no-results">{uiText("Modül bulunamadı.")}</UiNode>}</UiNode></>;
}
