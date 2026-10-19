'use client';
import UiNode from '@/lib/i18n/UiNode';
import CadIcon from './CadIcon';
import type { CadTool } from './DesignViewport';
export const CAD_TOOL_LABELS: Record<CadTool, string> = { orbit: 'Döndür', add: 'Ekle', reduce: 'Çıkar', smooth: 'Yumuşat', flatten: 'Düzleştir', margin: 'Marjin çiz', measure: 'Ölçüm', connector: 'Bağlantı' };
export default function CadToolPalette({ tools, tool, onSelect, shortcuts, disabled = false, compact = false }: {
    tools: CadTool[];
    tool: CadTool;
    onSelect: (tool: CadTool) => void;
    shortcuts: Partial<Record<CadTool, string>>;
    disabled?: boolean;
    compact?: boolean;
}) {
    return <UiNode as="div" className={`cad-tool-palette${compact ? ' cad-tool-palette--compact' : ''}`} aria-label="Manuel CAD araçları">
    {tools.map(id => <UiNode as="button" type="button" className="cad-command" key={id} aria-label={CAD_TOOL_LABELS[id]} title={CAD_TOOL_LABELS[id]} aria-pressed={tool === id} disabled={disabled} data-cad-tool={id} data-cad-state-cue onClick={() => onSelect(id)}>
      <CadIcon name={id} size={compact ? 21 : 27}/><UiNode as="span">{CAD_TOOL_LABELS[id]}</UiNode><UiNode as="kbd">{shortcuts[id]?.toUpperCase()}</UiNode>
    </UiNode>)}
  </UiNode>;
}
