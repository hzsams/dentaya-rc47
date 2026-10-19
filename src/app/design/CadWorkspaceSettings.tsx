'use client';
import UiNode from "@/lib/i18n/UiNode";
import { useState } from 'react';
import { DEFAULT_CAD_WORKSPACE, updateCadWorkspace, useCadWorkspace, type CadWorkspacePreferences } from '@/lib/cad-workspace-preferences';
export default function CadWorkspaceSettings() {
    const p = useCadWorkspace(), [message, setMessage] = useState('');
    function update(patch: Partial<CadWorkspacePreferences>) { setMessage(updateCadWorkspace(patch) ? 'CAD çalışma ayarları bu cihaza kaydedildi.' : 'Uygulandı; cihaz kaydı kullanılamıyor.'); }
    return <UiNode as="section" className="cad-workspace-settings"><UiNode as="h3">CAD sahnesi ve fare</UiNode><UiNode as="p">Arayüz tarzı CAD panellerinde de kullanılır. Model görünümü açıkken diş seçimindeki renk ve yüzey takip edilir; analiz renkleri kendi anlamını korur.</UiNode><UiNode as="button" type="button" onClick={() => { update({ background: "theme", followToothStyle: true }); window.dispatchEvent(new Event("dentaya:open-preferences")); }}>Seçilen görünümü CAD’e uygula / değiştir</UiNode><UiNode as="div" className="customize-controls">
  {([['rotateSpeed', 'Döndürme hızı'], ['zoomSpeed', 'Yakınlaştırma hızı'], ['panSpeed', 'Kaydırma hızı']] as const).map(([key, label]) => <UiNode as="label" key={key}>{label} · {p[key].toFixed(2)}×<UiNode as="input" type="range" min="0.25" max="2" step="0.05" value={p[key]} onChange={e => update({ [key]: Number(e.target.value) })}/></UiNode>)}
  {([['followToothStyle', 'Diş seçimindeki model görünümünü kullan'], ['grid', 'Zemin ızgarası'], ['axes', 'XYZ eksenleri'], ['damping', 'Yumuşak kamera duruşu']] as const).map(([key, label]) => <UiNode as="label" key={key}><UiNode as="input" type="checkbox" checked={p[key]} onChange={e => update({ [key]: e.target.checked })}/>{label}</UiNode>)}
 </UiNode><UiNode as="button" type="button" onClick={() => update(DEFAULT_CAD_WORKSPACE)}>CAD çalışma ayarlarını sıfırla</UiNode><UiNode as="p" role="status">{message || 'Bu seçenekler görünümü ve fare kontrolünü değiştirir; model geometrisini değiştirmez.'}</UiNode></UiNode>;
}
