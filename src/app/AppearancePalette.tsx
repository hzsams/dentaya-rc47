"use client";
import { useEffect, useState } from "react";
import UiNode from "@/lib/i18n/UiNode";
import {dentalFactLanguage} from '@/lib/dental-facts';
import {WORK_TOOLS_TEXT} from '@/lib/i18n/work-tools';
import { useTranslation } from "@/lib/i18n";
import { useCustomization, customizationNotice } from "./customization";
import { DENTAYA_DEFAULT_PREFERENCES, readLocalDentayaPreferences, type DentayaPreferences } from "./dentaya-theme";
import { APPEARANCE_COLLECTIONS,appearanceCollection,type AppearanceCollection,APPEARANCE_PRESETS, customizeAppearanceColor, effectiveAppearanceColors, selectedAppearancePreset, selectAppearancePreset } from "./appearance-palette";

export default function AppearancePalette() {
  const {t,locale}=useTranslation(), value=useCustomization(),copy=WORK_TOOLS_TEXT[dentalFactLanguage(locale)];
  const [collection,setCollection]=useState<AppearanceCollection>('Studio');
  const [preferences,setPreferences]=useState(DENTAYA_DEFAULT_PREFERENCES);
  const [message,setMessage]=useState("");
  useEffect(()=>{
    const sync=()=>setPreferences(readLocalDentayaPreferences());
    const changed=(event:Event)=>setPreferences((event as CustomEvent<DentayaPreferences>).detail??readLocalDentayaPreferences());
    sync();window.addEventListener("dentaya-theme-change",changed);window.addEventListener("storage",sync);
    return()=>{window.removeEventListener("dentaya-theme-change",changed);window.removeEventListener("storage",sync);};
  },[]);
  const selected=selectedAppearancePreset(value,preferences),colors=effectiveAppearanceColors(value,preferences);
  const preset=APPEARANCE_PRESETS.find(p=>p.id===selected);
  function result(saved:boolean) {setMessage(saved?"Uygulandı ve bu cihaza kaydedildi.":"Uygulandı; cihaz kaydı kullanılamıyor. Yeniden açılışta tekrar ayarlamanız gerekebilir.");}
  return <UiNode as="section" className="appearance-palette" aria-label="Renkler ve görünüm">
    <UiNode as="div" className="appearance-palette-heading"><UiNode as="label">Renk paletleri<UiNode as="select" aria-label="Renk paletleri" value={selected} onChange={e=>result(selectAppearancePreset(e.target.value))}>
      <UiNode as="option" value="custom" disabled>Özel düzen</UiNode>
      {["Arayüz tarzları","Tema","Renk paletleri"].map(group=><UiNode as="optgroup" label={group} key={group}>{APPEARANCE_PRESETS.filter(p=>p.group===group).map(p=><UiNode as="option" key={p.id} value={p.id}>{t(p.name)}</UiNode>)}</UiNode>)}
    </UiNode></UiNode><UiNode as="button" type="button" onClick={()=>result(selectAppearancePreset(value.appearancePreset&&APPEARANCE_PRESETS.some(p=>p.id===value.appearancePreset)?value.appearancePreset:`theme:${preferences.theme}`))}>Tema rengine dön</UiNode></UiNode>
    <UiNode as="div" className="appearance-palette-preview"><UiNode as="span" className="palette-strip" aria-hidden="true">{colors.map((color,index)=><UiNode as="i" key={index} style={{background:color}}/>)}</UiNode><UiNode as="span" data-dy-copy-stack><UiNode as="strong">{preset?t(preset.name):t("Özel düzen")}</UiNode>{preset?.description&&<UiNode as="small">{t(preset.description)}</UiNode>}</UiNode></UiNode>
    <UiNode as="section" className="appearance-collections" translateChildren={false} aria-label={copy.collections}><UiNode as="div" className="appearance-collection-tabs" translateChildren={false} role="group" aria-label={copy.collections}>{APPEARANCE_COLLECTIONS.map(group=><UiNode as="button" type="button" translateChildren={false} key={group} aria-pressed={collection===group} onClick={()=>setCollection(group)}>{group}</UiNode>)}</UiNode><UiNode as="div" className="appearance-collection-grid" translateChildren={false}>{APPEARANCE_PRESETS.filter(p=>p.palette&&appearanceCollection(p.id)===collection).map(p=><UiNode as="button" type="button" translateChildren={false} key={p.id} aria-pressed={selected===p.id} data-palette-card={p.id} onClick={()=>result(selectAppearancePreset(p.id))}><UiNode as="span" translateChildren={false} className="palette-strip" aria-hidden="true">{p.colors.map((color,i)=><UiNode as="i" key={i} translateChildren={false} style={{background:color}}/>)}</UiNode><UiNode as="strong" translateChildren={false}>{t(p.name)}</UiNode></UiNode>)}</UiNode></UiNode>
    <UiNode as="details" className="appearance-palette-custom"><UiNode as="summary">Kendi rengini seç</UiNode><UiNode as="div" className="appearance-palette-colors">{([['background','Arka plan'],['panel','Panel rengi'],['accent','Vurgu rengi']] as const).map(([key,label],i)=><UiNode as="label" key={key}><UiNode as="span">{label}</UiNode><UiNode as="input" type="color" aria-label={label} value={colors[i]} onChange={e=>result(customizeAppearanceColor(key,e.target.value))}/><UiNode as="code">{colors[i]}</UiNode></UiNode>)}</UiNode></UiNode>
    <UiNode as="p" role="status" aria-live="polite">{message}{customizationNotice()?" "+t(customizationNotice()):""}</UiNode>
  </UiNode>;
}
