"use client";
import UiMessage from "@/lib/i18n/UiMessage";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { useToothAppearance, TOOTH_VIEWS, type ToothView } from '@/lib/tooth-appearance';
import ToothAnatomyView from './ToothAnatomyView';
import { ALL_TEETH, cleanToothPlan, linkKey, toothPlanWarnings, type ToothPlan, type ToothRole } from '@/lib/tooth-plan';
type Props = {
    selected: string[];
    plan?: ToothPlan;
    onChange: (codes: string[], plan: ToothPlan) => void;
    disabled?: boolean;
};
export default function ToothChart({ selected, plan, onChange, disabled = false }: Props) {
    const { t: uiText } = useTranslation();
    const appearance = useToothAppearance();
    const [view, setView] = useState<ToothView>(appearance.startView), [role, setRole] = useState<ToothRole>('single'), [active, setActive] = useState<string | null>(null);
    const current = cleanToothPlan(plan, selected), warnings = toothPlanWarnings(current);
    const top = view === 'occlusal';
    useEffect(() => setView(appearance.startView), [appearance.startView]);
    function choose(code: string) {
        if (disabled)
            return;
        if (view === 'front') {
            setView('occlusal');
            setActive(code);
            return;
        }
        setActive(code);
        const codes = selected.includes(code) ? selected.filter(c => c !== code) : ALL_TEETH.filter(c => selected.includes(c) || c === code);
        onChange(codes, cleanToothPlan({ ...current, roles: { ...current.roles, [code]: role } }, codes));
    }
    function applyRole(next: ToothRole) {
        setRole(next);
        if (active && selected.includes(active))
            onChange(selected, { ...current, roles: { ...current.roles, [active]: next } });
    }
    function toggleLink(a: string, b: string) {
        const key = linkKey(a, b), exists = current.links.includes(key), roles = { ...current.roles };
        if (!exists) {
            if (roles[a] === 'single')
                roles[a] = 'abutment';
            if (roles[b] === 'single')
                roles[b] = 'abutment';
        }
        onChange(selected, { roles, links: exists ? current.links.filter(l => l !== key) : [...current.links, key] });
    }
    return <UiNode as="section" className="tooth-chart" data-tooth-style={appearance.style} aria-label="Diş ve köprü planı"><UiNode as="header"><UiNode as="div"><UiNode as="span" className="tooth-eyebrow">DAİMİ DİŞLER · FDI</UiNode><UiNode as="h3">{top ? uiText("Restorasyon planı") : uiText("Diş seçimi")}</UiNode></UiNode><UiNode as="div" className="tooth-view-tabs" role="group" aria-label="Bakış yönü">{TOOTH_VIEWS.map(v => <UiNode as="button" key={v.id} type="button" aria-pressed={view === v.id} onClick={() => setView(v.id)}>{uiText(v.name)}</UiNode>)}</UiNode></UiNode><UiNode as="div" className="tooth-toolbar"><UiNode as="label">Seçim rolü<UiNode as="select" disabled={disabled} value={role} onChange={e => applyRole(e.target.value as ToothRole)}><UiNode as="option" value="single">{uiText("Tek üye")}</UiNode><UiNode as="option" value="abutment">{uiText("Dayanak")}</UiNode><UiNode as="option" value="pontic">{uiText("Pontic / gövde")}</UiNode></UiNode></UiNode><UiNode as="span">{active ? <UiMessage source="{0} · {1}" values={[active, selected.includes(active) ? ({ single: 'Tek üye', abutment: 'Dayanak', pontic: 'Pontic' }[current.roles[active]]) : 'Seçili değil']} userValues={[]}/> : 'Diş seçerek başlayın'}</UiNode><UiNode as="button" type="button" disabled={disabled || !selected.length} onClick={() => { onChange([], { roles: {}, links: [] }); setActive(null); }}>{uiText("Seçimi temizle")}</UiNode></UiNode>
    <ToothAnatomyView appearance={appearance} view={view} selected={selected} plan={current} onTooth={choose} onLink={toggleLink} disabled={disabled}/>

    <UiNode as="footer"><UiNode as="div" className="tooth-legend"><UiNode as="span"><UiNode as="i" className="legend-selected"/>Mavi · seçili diş</UiNode><UiNode as="span"><UiNode as="i" className="legend-pontic"/>Sarı · bağımsız pontic</UiNode><UiNode as="span"><UiNode as="i" className="legend-bridge"/>Mavi-sarı şerit · köprüye bağlı</UiNode><UiNode as="span"><UiNode as="i" className="legend-separate"/>Kesik bant · bağlantı yok</UiNode></UiNode><UiNode as="p">{selected.length ? <UiMessage source="Seçilen FDI: {0}" values={[ALL_TEETH.filter(c => selected.includes(c)).join(', ')]} userValues={[]}/> : 'Henüz diş seçilmedi.'}</UiNode><UiNode as="small">Yan yana seçili dişlerin arasındaki banda tıklayarak köprü kurun veya ayırın. Mavi-sarı şerit, dişin bir köprü bağlantısına dahil olduğunu gösterir. Renkler bağlantı planını gösterir; klinik uygunluk veya üretim onayı değildir.</UiNode>{warnings.map(w => <UiNode as="p" className="tooth-warning" role="status" key={w}>{w}</UiNode>)}</UiNode></UiNode>;
}
