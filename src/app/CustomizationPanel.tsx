"use client";
import UiNode from "@/lib/i18n/UiNode";
import CadWorkspaceSettings from "./design/CadWorkspaceSettings";
import AppearancePalette from "./AppearancePalette";
import { applyAppearanceCustomization } from "./appearance-palette";
import { readLocalDentayaPreferences, THEME_OPTIONS } from "./dentaya-theme";
import { useRef, useState } from "react";
import { DEFAULT_CUSTOMIZATION, FONT_OPTIONS, customizationNotice, resetCustomization, updateCustomization, useCustomization, validateCustomization, type Customization } from "./customization";
import { normalizeBrandLogo, chooseBrandLogo, useBrandLogo } from "./BrandLogo";
export default function CustomizationPanel() {
    const value = useCustomization(), logo = useBrandLogo();
    const [message, setMessage] = useState("");
    const fileInput = useRef<HTMLInputElement>(null);
    function change(patch: Partial<Customization>) {
        const saved = updateCustomization({ ...patch, style: "custom" });
        setMessage((saved ? "Uygulandı ve bu cihaza kaydedildi." : "Uygulandı; cihaz kaydı kullanılamıyor. Yeniden açılışta tekrar ayarlamanız gerekebilir.") + " " + customizationNotice());
    }
    function exportStyle() {
        const blob = new Blob([JSON.stringify({ version: 2, theme: readLocalDentayaPreferences().theme, customization: value, logo }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url;
        a.download = 'DentAYA-Gorunum.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessage('Kişiselleştirme dosyası indirildi.');
    }
    async function importStyle(file?: File) {
        if (!file)
            return;
        try {
            if (file.size > 65536)
                throw Error('Dosya çok büyük. DentAYA görünüm dosyası seçin.');
            const json = JSON.parse(await file.text());
            if (!json || ![1,2].includes(json.version) || !json.customization || typeof json.customization !== 'object' || Array.isArray(json.customization))
                throw Error('Geçerli bir DentAYA görünüm dosyası seçin.');
            if (json.version === 2 && !THEME_OPTIONS.some(theme => theme.id === json.theme))
                throw Error('Geçerli bir DentAYA görünüm dosyası seçin.');
            const logoId = normalizeBrandLogo(json.logo);
            if (!logoId)
                throw Error('Görünüm dosyasındaki logo desteklenmiyor.');
            const saved = applyAppearanceCustomization(validateCustomization(json.customization), json.version === 2 ? json.theme : undefined);
            const logoSaved = chooseBrandLogo(logoId);
            setMessage(saved && logoSaved ? 'Görünüm içe aktarıldı ve kaydedildi.' : 'Görünüm uygulandı; cihaz kaydı kullanılamıyor.');
        }
        catch (error) {
            setMessage(error instanceof Error ? error.message : 'Dosya okunamadı.');
        }
        finally {
            if (fileInput.current)
                fileInput.current.value = '';
        }
    }
    return <UiNode as="div" className="customize-panel">
    <UiNode as="p">Bu bölümdeki değişiklikler anında uygulanır ve bu cihazda saklanır. “Tema rengine dön” ile mevcut temanızın renklerini kullanabilirsiniz.</UiNode>
    <AppearancePalette />
    <UiNode as="div" className="customize-controls">
      <UiNode as="label">Yazı tipi<UiNode as="select" value={value.font} onChange={e => change({ font: e.target.value as Customization['font'] })}>{Object.entries(FONT_OPTIONS).map(([id, name]) => <UiNode as="option" key={id} value={id}>{name}</UiNode>)}</UiNode></UiNode>
      <UiNode as="label">Yazı boyutu · %{value.textScale}<UiNode as="input" type="range" min={90} max={125} step={5} value={value.textScale} onChange={e => change({ textScale: Number(e.target.value) })}/></UiNode>
      <UiNode as="label">Logo boyutu · %{value.logoScale}<UiNode as="input" type="range" min={80} max={125} step={5} value={value.logoScale} onChange={e => change({ logoScale: Number(e.target.value) })}/></UiNode>
      <UiNode as="label">Logo görünümü<UiNode as="select" value={value.logoMode} onChange={e => change({ logoMode: e.target.value as Customization['logoMode'] })}><UiNode as="option" value="full">Simge ve yazı</UiNode><UiNode as="option" value="icon">Yalnız simge</UiNode><UiNode as="option" value="word">Yalnız yazı</UiNode></UiNode></UiNode>
      <UiNode as="label">Kart köşesi<UiNode as="select" value={value.corners ?? 'theme'} onChange={e => change({ corners: e.target.value === 'theme' ? null : Number(e.target.value) })}><UiNode as="option" value="theme">Temadan al</UiNode>{[0, 4, 8, 12, 16, 20, 24, 28].map(n => <UiNode as="option" key={n} value={n}>{n} px</UiNode>)}</UiNode></UiNode>
      <UiNode as="label">Gölge<UiNode as="select" value={value.shadow} onChange={e => change({ shadow: e.target.value as Customization['shadow'] })}><UiNode as="option" value="theme">Temadan al</UiNode><UiNode as="option" value="none">Kapalı</UiNode><UiNode as="option" value="soft">Hafif</UiNode><UiNode as="option" value="strong">Belirgin</UiNode></UiNode></UiNode>
      <UiNode as="label">Düğme biçimi<UiNode as="select" value={value.buttons} onChange={e => change({ buttons: e.target.value as Customization['buttons'] })}><UiNode as="option" value="theme">Temadan al</UiNode><UiNode as="option" value="square">Köşeli</UiNode><UiNode as="option" value="rounded">Yuvarlak</UiNode><UiNode as="option" value="pill">Kapsül</UiNode></UiNode></UiNode>
    </UiNode>
    <UiNode as="h3">Okuma ve erişim</UiNode><UiNode as="div" className="customize-controls">
      <UiNode as="label">Satır aralığı · {value.lineHeight.toFixed(1)}<UiNode as="input" type="range" min="1.3" max="1.9" step="0.1" value={value.lineHeight} onChange={e => change({ lineHeight: Number(e.target.value) })}/></UiNode>
      <UiNode as="label">Kontrol boyutu<UiNode as="select" value={value.controlSize} onChange={e => change({ controlSize: e.target.value as Customization['controlSize'] })}><UiNode as="option" value="normal">Standart</UiNode><UiNode as="option" value="comfortable">Rahat · en az 44 px</UiNode></UiNode></UiNode>
      <UiNode as="label"><UiNode as="input" type="checkbox" checked={value.stripedRows} onChange={e => change({ stripedRows: e.target.checked })}/>Tablolarda dönüşümlü satır rengi</UiNode>
      <UiNode as="label"><UiNode as="input" type="checkbox" checked={value.strongFocus} onChange={e => change({ strongFocus: e.target.checked })}/>Belirgin klavye odağı</UiNode>
    </UiNode>
    <CadWorkspaceSettings />
    <UiNode as="div" className="customize-sample"><UiNode as="strong">Görünüm önizlemesi</UiNode><UiNode as="p">Seçtiğiniz renkler, yazı tipi ve köşe biçimi bu kartta görünür.</UiNode><UiNode as="button" type="button" onClick={() => setMessage('Bu düğme seçtiğiniz görünümün önizlemesidir.')}>Örnek düğme</UiNode></UiNode>
    <UiNode as="div" className="customize-actions"><UiNode as="button" type="button" onClick={exportStyle}>Ek ayarları dışa aktar</UiNode><UiNode as="button" type="button" onClick={() => fileInput.current?.click()}>Ek ayarları yükle</UiNode><UiNode as="button" type="button" onClick={() => { const saved = resetCustomization(); setMessage(saved ? 'Ek kişiselleştirme ayarları sıfırlandı.' : 'Ayarlar sıfırlandı; cihaz kaydı kullanılamıyor.'); }}>Ek ayarları sıfırla</UiNode></UiNode>
    <UiNode as="input" ref={fileInput} type="file" accept=".json,application/json" hidden onChange={e => void importStyle(e.target.files?.[0])}/>
    <UiNode as="p" role="status" aria-live="polite">{message || `Logo görünümü: ${value.logoMode === DEFAULT_CUSTOMIZATION.logoMode ? 'Simge ve yazı' : value.logoMode === 'icon' ? 'Yalnız simge' : 'Yalnız yazı'}`}</UiNode>
  </UiNode>;
}
