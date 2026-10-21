"use client";
import UiNode from "@/lib/i18n/UiNode";
import Image from "next/image";
import { useState } from "react";
import { useLocale } from "@/lib/i18n";
import { premiumBrandCopy } from "@/lib/i18n/brand";
import { BRAND_ASSET_VERSION, BrandLogo, LOGO_OPTIONS, chooseBrandLogo, logoFiles, useBrandLogo } from "./BrandLogo";
export default function LogoPicker() {
    const locale = useLocale(), copy = premiumBrandCopy(locale);
    const selected = useBrandLogo();
    const [query, setQuery] = useState("");
    const [message, setMessage] = useState("");
    const [desktopBusy, setDesktopBusy] = useState(false);
    const options = LOGO_OPTIONS.map(option => ({...option, name:copy.names[option.id], description:copy.descriptions[option.id], material:copy.materials[option.material]}));
    const searchLocale = locale === "tr" ? "tr" : "en";
    const filtered = options.filter(option => `${option.name} ${option.description} ${option.material}`.toLocaleLowerCase(searchLocale).includes(query.trim().toLocaleLowerCase(searchLocale)));
    return <>
    <UiNode as="div" className="brand-premium-collection">
      <UiNode as="div" className="brand-premium-heading"><UiNode as="span" translateChildren={false}>{copy.atelier}</UiNode><UiNode as="span" translateChildren={false}>{copy.collection}</UiNode></UiNode>
      <Image className="brand-premium-artwork" src="/brand/DentAYA_Premium_Atelier.webp" alt={copy.artworkAlt} width={1672} height={941}/>
      <UiNode as="p" translateChildren={false}>{copy.intro}</UiNode>
    </UiNode>
    <UiNode as="div" className="logo-live-preview" aria-label="Seçili logo önizlemesi"><BrandLogo width={250} height={60}/></UiNode>
    <UiNode as="button" type="button" disabled={desktopBusy} className="desktop-logo-button" onClick={async () => {
            if (!window.dentayaDesktop) {
                setMessage("Bu işlem kurulu Windows DentAYA uygulamasında kullanılabilir.");
                return;
            }
            setDesktopBusy(true);
            try {
                const result = await window.dentayaDesktop.updateDesktopIcon(logoFiles[selected]);
                setMessage(result.message);
            }
            catch {
                setMessage("Masaüstü simgesi güncellenemedi.");
            }
            finally {
                setDesktopBusy(false);
            }
        }}>{desktopBusy ? "Simge güncelleniyor…" : "Masaüstü simgesine uygula"}</UiNode>
    <UiNode as="p" className="brand-premium-status" role="status" aria-live="polite">{message || `Seçili logo: ${options.find(option => option.id === selected)?.name}`}</UiNode>
    <UiNode as="label" className="logo-search">DentAYA logo seçenekleri<UiNode as="input" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Diş, tarama, geometri…"/></UiNode>
    <UiNode as="p" className="brand-premium-result-count" role="status" aria-live="polite">{filtered.length} / {LOGO_OPTIONS.length}</UiNode>
    <UiNode as="div" className="logo-choice-grid" role="group" aria-label="DentAYA logo seçenekleri">
      {filtered.map(option => <UiNode as="button" key={option.id} data-logo-id={option.id} type="button" className="logo-choice brand-premium-choice" aria-pressed={selected === option.id} onClick={() => {
                const saved = chooseBrandLogo(option.id);
                setMessage(saved ? `${option.name} uygulandı ve kaydedildi.` : `${option.name} uygulandı. Cihaz kaydı kullanılamıyor; yeniden açılışta tekrar seçmeniz gerekebilir.`);
            }}>
        <UiNode as="span" className="logo-choice-preview"><Image src={`/logos/${logoFiles[option.id]}_light.svg?brand=${BRAND_ASSET_VERSION}`} alt="" width={512} height={112} style={{ width: "100%", height: "auto" }}/></UiNode>
        <UiNode as="span" className="brand-premium-choice-heading"><UiNode as="strong" translateChildren={false}>{option.id} · {option.name}{selected === option.id ? " ✓" : ""}</UiNode><UiNode as="span" className="brand-premium-material" translateChildren={false}>{option.material}</UiNode></UiNode>
        <UiNode as="span" translateChildren={false}>{option.description}</UiNode>
      </UiNode>)}
    </UiNode>
    {!filtered.length && <UiNode as="p" className="brand-premium-empty" role="status" translateChildren={false}>{copy.empty}</UiNode>}
  </>;
}
