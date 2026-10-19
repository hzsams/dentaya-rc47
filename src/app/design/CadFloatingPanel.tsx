'use client';
import UiNode from '@/lib/i18n/UiNode';
import CadIcon from './CadIcon';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
const KEY = 'dentaya:cad-floating-panel-v3';
export default function CadFloatingPanel({ visible, onClose, children, title = 'Tasarım araçları', revealKey }: { visible: boolean; onClose: () => void; children: ReactNode; title?: string; revealKey?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const positionRef = useRef(position);
  useLayoutEffect(() => { positionRef.current = position; }, [position]);
  const drag = useRef<{ pointer: number; x: number; y: number; left: number; top: number } | null>(null);
  function topBoundary() { return Math.max(64, (document.querySelector('.cad-viewport-frame')?.getBoundingClientRect().top ?? 86) + 8); }
  function clamp(x: number, y: number) {
    const width = ref.current?.offsetWidth || Math.min(320, window.innerWidth - 16);
    const top = topBoundary();
    const height = Math.min(ref.current?.offsetHeight || 420, window.innerHeight - top - 38);
    return { x: Math.max(8, Math.min(window.innerWidth - width - 12, x)), y: Math.max(top, Math.min(Math.max(top, window.innerHeight - height - 38), y)) };
  }
  function initial() { return clamp(window.innerWidth - Math.min(320, window.innerWidth - 16) - 20, topBoundary()); }
  useEffect(() => { setCollapsed(false); drag.current = null; }, [revealKey]);
  useEffect(() => {
    const reset = () => { setPosition(initial()); setCollapsed(false); try { localStorage.removeItem(KEY); } catch {} };
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      setPosition(saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) ? clamp(saved.x, saved.y) : initial());
    } catch { setPosition(initial()); }
    const resize = () => setPosition(p => p ? clamp(p.x, p.y) : initial());
    const observer = new ResizeObserver(resize);
    if (ref.current) observer.observe(ref.current);
    window.addEventListener('resize', resize);
    window.addEventListener('dentaya:reset-cad-panel', reset);
    return () => { observer.disconnect(); window.removeEventListener('resize', resize); window.removeEventListener('dentaya:reset-cad-panel', reset); };
  // All measurements are taken at the time of interaction, including after a resize.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!visible || !ref.current) return;
    const observer = new ResizeObserver(() => setPosition(p => p ? clamp(p.x, p.y) : initial()));
    observer.observe(ref.current);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  function save(p: { x: number; y: number }) { setPosition(p); try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} }
  function endDrag() { if (drag.current && positionRef.current) save(positionRef.current); drag.current = null; }
  if (!visible) return null;
  return <UiNode as="section" ref={ref} className="cad-floating-panel" aria-label="Tasarım araç paneli" style={{ left: position?.x ?? 'calc(100vw - 340px)', top: position?.y ?? 94 }}>
    <UiNode as="header" className="cad-panel-header">
      <UiNode as="button" className="cad-panel-handle" type="button" aria-label="Araç panelini taşı" title="Sürükle veya yön tuşlarıyla taşı" onPointerDown={e => {
        if (e.button !== 0 || !position) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { pointer: e.pointerId, x: e.clientX, y: e.clientY, left: position.x, top: position.y };
      }} onPointerMove={e => { const d = drag.current; if (d && d.pointer === e.pointerId) setPosition(clamp(d.left + e.clientX - d.x, d.top + e.clientY - d.y)); }} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag} onKeyDown={e => {
        if (!position || !['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
        e.preventDefault(); const n = e.shiftKey ? 40 : 10;
        save(clamp(position.x + (e.key === 'ArrowRight' ? n : e.key === 'ArrowLeft' ? -n : 0), position.y + (e.key === 'ArrowDown' ? n : e.key === 'ArrowUp' ? -n : 0)));
      }}><CadIcon name="grip" size={16}/><UiNode as="strong">{title}</UiNode></UiNode>
      <UiNode as="button" type="button" aria-label={collapsed ? 'Paneli genişlet' : 'Paneli daralt'} aria-expanded={!collapsed} onClick={() => setCollapsed(v => !v)}><CadIcon name={collapsed ? 'expand' : 'collapse'} size={18}/></UiNode>
      <UiNode as="button" type="button" aria-label="Araç panelini gizle" onClick={onClose}><CadIcon name="close" size={18}/></UiNode>
    </UiNode>
    {!collapsed && <UiNode as="div" className="cad-floating-body">{children}</UiNode>}
  </UiNode>;
}
