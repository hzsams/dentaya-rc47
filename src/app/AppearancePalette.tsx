"use client";

import { useEffect, useState } from "react";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from "@/lib/i18n";
import {
  APPEARANCE_GROUPS,
  APPEARANCE_PRESETS,
  CITY_APPEARANCE_PRESETS,
  customizeAppearanceColor,
  effectiveAppearanceColors,
  selectedAppearancePreset,
  selectAppearancePreset,
} from "./appearance-palette";
import { customizationNotice, useCustomization } from "./customization";
import { DENTAYA_DEFAULT_PREFERENCES, readLocalDentayaPreferences, type DentayaPreferences } from "./dentaya-theme";

function PaletteSwatches({ colors }: { colors: readonly string[] }) {
  return <UiNode as="span" className="palette-strip" aria-hidden="true" translateChildren={false}>
    {colors.map((color, index) => <UiNode as="i" key={index} style={{ background: color }} translateChildren={false} />)}
  </UiNode>;
}

export default function AppearancePalette() {
  const { t, locale } = useTranslation();
  const value = useCustomization();
  const [preferences, setPreferences] = useState(DENTAYA_DEFAULT_PREFERENCES);
  const [message, setMessage] = useState("");
  const cityPalettes = locale === "tr" ? "Şehir paletleri" : "City palettes";

  useEffect(() => {
    const sync = () => setPreferences(readLocalDentayaPreferences());
    const changed = (event: Event) => setPreferences((event as CustomEvent<DentayaPreferences>).detail ?? readLocalDentayaPreferences());
    sync();
    window.addEventListener("dentaya-theme-change", changed);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("dentaya-theme-change", changed);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const selected = selectedAppearancePreset(value, preferences);
  const colors = effectiveAppearanceColors(value, preferences);
  const preset = APPEARANCE_PRESETS.find(preset => preset.id === selected);
  const restoreId = APPEARANCE_PRESETS.find(preset => preset.id === value.appearancePreset)?.id ?? `theme:${preferences.theme}`;

  function result(saved: boolean) {
    setMessage(saved ? "Uygulandı ve bu cihaza kaydedildi." : "Uygulandı; cihaz kaydı kullanılamıyor. Yeniden açılışta tekrar ayarlamanız gerekebilir.");
  }

  return <UiNode as="section" className="appearance-palette" aria-label="Renkler ve görünüm">
    <UiNode as="div" translateChildren={false} className="appearance-palette-heading">
      <UiNode as="label">
        Renk paletleri
        <UiNode as="select" aria-label="Renk paletleri" value={selected} onChange={event => result(selectAppearancePreset(event.target.value))}>
          <UiNode as="option" value="custom" disabled>Özel düzen</UiNode>
          {APPEARANCE_GROUPS.map(group => <UiNode as="optgroup" label={group === "city" ? cityPalettes : group} key={group}>
            {APPEARANCE_PRESETS.filter(preset => preset.group === group).map(preset => <UiNode as="option" key={preset.id} value={preset.id}>{preset.name}</UiNode>)}
          </UiNode>)}
        </UiNode>
      </UiNode>
      <UiNode as="button" type="button" onClick={() => result(selectAppearancePreset(restoreId))}>Tema rengine dön</UiNode>
    </UiNode>

    <UiNode as="div" translateChildren={false} className="appearance-palette-preview">
      <PaletteSwatches colors={colors} />
      <UiNode as="span" data-dy-copy-stack translateChildren={false}>
        <UiNode as="strong">{preset?.name ?? "Özel düzen"}</UiNode>
        {preset?.description && <UiNode as="small">{preset.description}</UiNode>}
      </UiNode>
    </UiNode>

    <UiNode as="div" translateChildren={false} className="appearance-city-palettes" role="group" aria-label={cityPalettes}>
      <UiNode as="strong" translateChildren={false}>{cityPalettes}</UiNode>
      <UiNode as="div" translateChildren={false} className="appearance-city-grid">
        {CITY_APPEARANCE_PRESETS.map(preset => <UiNode as="button" translateChildren={false}
          type="button"
          key={preset.id}
          aria-pressed={selected === preset.id}
          data-palette-card={preset.id}
          onClick={() => result(selectAppearancePreset(preset.id))}
        >
          <PaletteSwatches colors={preset.colors} />
          <UiNode as="span" translateChildren={false}>{preset.name}</UiNode>
        </UiNode>)}
      </UiNode>
    </UiNode>

    <UiNode as="details" className="appearance-palette-custom">
      <UiNode as="summary">Kendi rengini seç</UiNode>
      <UiNode as="div" translateChildren={false} className="appearance-palette-colors">
        {([['background', 'Arka plan'], ['panel', 'Panel rengi'], ['accent', 'Vurgu rengi']] as const).map(([key, label], index) => <UiNode as="label" key={key}>
          <UiNode as="span">{label}</UiNode>
          <UiNode as="input" type="color" aria-label={label} value={colors[index]} onChange={event => result(customizeAppearanceColor(key, event.target.value))} />
          <UiNode as="code" translateChildren={false}>{colors[index]}</UiNode>
        </UiNode>)}
      </UiNode>
    </UiNode>
    <UiNode as="p" role="status" aria-live="polite">{message}{customizationNotice() ? " " + t(customizationNotice()) : ""}</UiNode>
  </UiNode>;
}
