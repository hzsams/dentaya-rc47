'use client';
import UiNode from '@/lib/i18n/UiNode';
import { useEffect, useRef, useState } from 'react';
import CadIcon, { type CadIconName } from './CadIcon';
import { CAD_TOOL_LABELS } from './CadToolPalette';
import type { CadTool, CadViewMode } from './DesignViewport';
export default function CadContextMenu({ point, onClose, onTool, onView, onAction, tools, views, tool = 'orbit', viewMode = 'natural', canUndo = true, canRedo = true, ready = true, shortcuts = {} }: {
    point: {
        x: number;
        y: number;
    } | null;
    onClose: () => void;
    onTool: (tool: CadTool) => void;
    onView: (mode: CadViewMode) => void;
    onAction: (action: string) => void;
    tools: CadTool[];
    views: CadViewMode[];
    tool?: CadTool;
    viewMode?: CadViewMode;
    canUndo?: boolean;
    canRedo?: boolean;
    ready?: boolean;
    shortcuts?: Partial<Record<CadTool, string>>;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [section, setSection] = useState<'tools' | 'views' | 'objects'>('tools');
    useEffect(() => {
        if (!point)
            return;
        ref.current?.querySelector<HTMLButtonElement>('[role=menuitem]:not(:disabled)')?.focus();
        const click = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node))
            onClose(); };
        const key = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
                return;
            }
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
                e.preventDefault();
                const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('[role=menuitem]:not(:disabled)') ?? []);
                const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
                const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
                buttons[next]?.focus();
            }
        };
        window.addEventListener('pointerdown', click);
        window.addEventListener('keydown', key);
        return () => { window.removeEventListener('pointerdown', click); window.removeEventListener('keydown', key); };
    }, [point, onClose, section]);
    if (!point)
        return null;
    const run = (fn: () => void) => { fn(); onClose(); };
    const row = (id: string, label: string, icon: CadIconName, fn: () => void, disabled = false, active = false, key = '') => <UiNode as="button" type="button" role="menuitem" aria-label={label} key={id} disabled={disabled} data-active={active} onClick={() => run(fn)}><CadIcon name={icon} size={18}/><UiNode as="span">{label}</UiNode>{active ? <CadIcon name="check" size={14}/> : key && <UiNode as="kbd">{key}</UiNode>}</UiNode>;
    return <UiNode as="div" ref={ref} role="menu" aria-label="CAD sağ tık araçları" className="cad-context-menu" style={{ left: Math.max(8, Math.min(point.x, window.innerWidth - 270)), top: Math.max(8, Math.min(point.y, window.innerHeight - 456)) }} onContextMenu={e => e.preventDefault()}>
    <UiNode as="header"><CadIcon name="tools" size={16}/><UiNode as="strong">CAD araçları</UiNode></UiNode>
    <UiNode as="div" className="cad-context-tabs">{([['tools', 'Araçlar'], ['views', 'Görünüm'], ['objects', 'Nesneler']] as const).map(([id, label]) => <UiNode as="button" type="button" key={id} aria-pressed={section === id} onClick={() => setSection(id)}>{label}</UiNode>)}</UiNode>
    <UiNode as="div" className="cad-context-rows">
      {section === 'tools' && tools.map(id => row(id, CAD_TOOL_LABELS[id], id, () => onTool(id), !ready, tool === id, shortcuts[id]?.toUpperCase()))}
      {section === 'views' && views.map(id => row(id, ({ natural: 'Doğal görünüm', wireframe: 'Tel kafes', thickness: 'Mesafe haritası', contact: 'Temas haritası', undercut: 'Giriş ekseni', section: 'Kesit' })[id], id === 'contact' ? 'contacts' : id, () => onView(id), !ready, viewMode === id))}
      {section === 'objects' && ([['upper', 'Üst çene aç / kapat', 'top'], ['lower', 'Alt çene aç / kapat', 'bottom'], ['design', 'Restorasyon aç / kapat', 'design'], ['all', 'Tümünü göster', 'eye'], ['isolate', 'Yalnız restorasyon', 'isolate'], ['panel', 'Araç paneli aç / kapat', 'tools'], ['reset-panel', 'Panel konumunu sıfırla', 'reset']] as const).map(([id, label, icon]) => row(id, label, icon, () => onAction(id)))}
    </UiNode>
    <UiNode as="div" className="cad-context-footer">{row('undo', 'Geri al', 'undo', () => onAction('undo'), !canUndo, false, 'Ctrl Z')}{row('redo', 'Yinele', 'redo', () => onAction('redo'), !canRedo, false, 'Ctrl Y')}{row('fit', 'Ekrana sığdır', 'fit', () => onAction('fit'), !ready, false, 'Num 5')}</UiNode>
  </UiNode>;
}
