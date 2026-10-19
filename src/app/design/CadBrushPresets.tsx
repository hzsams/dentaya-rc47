"use client";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useState } from "react";
import type { CadSettings } from "./DesignViewport";
type Brush = Pick<CadSettings, "brush_radius_mm" | "brush_strength_mm" | "brush_hardness" | "brush_falloff" | "brush_shape" | "smoothing" | "preserve_shape" | "occlusal_only">;
type Preset = {
    name: string;
    brush: Brush;
};
const KEY = "dentaya:cad-brush-presets-v1";
export function validBrush(value: unknown): value is Brush {
    if (!value || typeof value !== "object")
        return false;
    const b = value as Brush;
    return [[b.brush_radius_mm, 0.2, 8], [b.brush_strength_mm, 0.01, 1], [b.brush_hardness, 0, 0.92], [b.brush_falloff, 0.35, 3.5], [b.smoothing, 0, 1]].every(([v, min, max]) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max) && ["round", "flat", "pointed"].includes(b.brush_shape) && typeof b.preserve_shape === "boolean" && typeof b.occlusal_only === "boolean";
}
export default function CadBrushPresets({ settings, onApply }: {
    settings: CadSettings;
    onApply: (brush: Brush) => void;
}) {
    const { t: uiText } = useTranslation();
    const [presets, setPresets] = useState<Preset[]>([]), [name, setName] = useState(""), [message, setMessage] = useState("");
    useEffect(() => {
        const sync = () => {
            try {
                const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
                setPresets(Array.isArray(parsed) ? parsed.filter(p => p && typeof p.name === "string" && p.name.length <= 32 && validBrush(p.brush)).slice(0, 12) : []);
            }
            catch {
                setMessage("Kayıtlı fırça ayarları okunamadı.");
            }
        };
        sync();
        window.addEventListener("storage", sync);
        return () => window.removeEventListener("storage", sync);
    }, []);
    function save(next: Preset[]) {
        setPresets(next);
        try {
            localStorage.setItem(KEY, JSON.stringify(next));
            return true;
        }
        catch {
            setMessage("Ayar bu oturumda hazır; cihaz kaydı yapılamadı.");
            return false;
        }
    }
    return <UiNode as="div" className="cad-brush-presets"><UiNode as="strong">Kişisel fırçalarım</UiNode><UiNode as="p">Yarıçap, güç, yumuşatma ve şekil tercihlerini birlikte sakla.</UiNode>
    <UiNode as="div" className="cad-brush-save"><UiNode as="input" aria-label="Fırça ayarı adı" placeholder="Örn. İnce fissür" value={name} maxLength={32} onChange={e => setName(e.target.value)}/><UiNode as="button" type="button" disabled={!name.trim() || presets.length >= 12} onClick={() => {
            const { brush_radius_mm, brush_strength_mm, brush_hardness, brush_falloff, brush_shape, smoothing, preserve_shape, occlusal_only } = settings;
            const brush = { brush_radius_mm, brush_strength_mm, brush_hardness, brush_falloff, brush_shape, smoothing, preserve_shape, occlusal_only };
            if (!validBrush(brush)) {
                setMessage("Fırça değerleri desteklenen aralıkta değil.");
                return;
            }
            if (presets.some(p => p.name.toLocaleLowerCase("tr") === name.trim().toLocaleLowerCase("tr"))) {
                setMessage("Bu ad kullanılıyor. Başka bir ad seç.");
                return;
            }
            if (save([...presets, { name: name.trim(), brush }]))
                setMessage("Fırça ayarı kaydedildi.");
            setName("");
        }}>{uiText("Kaydet")}</UiNode></UiNode>
    {presets.map((preset, index) => <UiNode as="div" className="cad-brush-preset" key={preset.name}><UiNode data-dy-copy-stack as="button" type="button" onClick={() => { onApply({ brush_radius_mm: preset.brush.brush_radius_mm, brush_strength_mm: preset.brush.brush_strength_mm, brush_hardness: preset.brush.brush_hardness, brush_falloff: preset.brush.brush_falloff, brush_shape: preset.brush.brush_shape, smoothing: preset.brush.smoothing, preserve_shape: preset.brush.preserve_shape, occlusal_only: preset.brush.occlusal_only }); setMessage(`${preset.name} uygulandı.`); }}><UiNode as="strong">{preset.name}</UiNode><UiNode as="small">r {preset.brush.brush_radius_mm.toFixed(1)} mm · güç {preset.brush.brush_strength_mm.toFixed(2)} mm</UiNode></UiNode><UiNode as="button" type="button" aria-label={`${preset.name} ayarını sil`} onClick={() => {
                if (save(presets.filter((_, i) => i !== index)))
                    setMessage("Kayıtlı fırça kaldırıldı.");
            }} uiMessages={{ "aria-label": { source: "{0} ayar\u0131n\u0131 sil", values: [preset.name], userValues: [0] } }}>×</UiNode></UiNode>)}
    <UiNode as="small" role="status">{message || `${presets.length}/12 kayıt · Bu cihazda saklanır`}</UiNode>
  </UiNode>;
}
