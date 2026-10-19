"use client";
import UiNode from "@/lib/i18n/UiNode";
import Image from "next/image";
import { useState } from "react";
import { BrandLogo, LOGO_OPTIONS, chooseBrandLogo, logoFiles, useBrandLogo } from "./BrandLogo";
export default function LogoPicker() {
    const selected = useBrandLogo();
    const [query, setQuery] = useState("");
    const [message, setMessage] = useState("");
    const [desktopBusy, setDesktopBusy] = useState(false);
    return <>
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
    <UiNode as="p" role="status" aria-live="polite">{message || `Seçili logo: ${LOGO_OPTIONS.find(option => option.id === selected)?.name}`}</UiNode>
    <UiNode as="label" className="logo-search">DentAYA logo seçenekleri<UiNode as="input" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Diş, tarama, geometri…"/></UiNode>
    <UiNode as="div" className="logo-choice-grid" role="group" aria-label="DentAYA logo seçenekleri">
      {LOGO_OPTIONS.filter(option => `${option.name} ${option.description}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"))).map(option => <UiNode as="button" key={option.id} type="button" className="logo-choice" aria-pressed={selected === option.id} onClick={() => {
                const saved = chooseBrandLogo(option.id);
                setMessage(saved ? `${option.name} uygulandı ve kaydedildi.` : `${option.name} uygulandı. Cihaz kaydı kullanılamıyor; yeniden açılışta tekrar seçmeniz gerekebilir.`);
            }}>
        <UiNode as="span" className="logo-choice-preview"><Image src={`/logos/${logoFiles[option.id]}_light.svg?brand=38`} alt="" width={512} height={112} style={{ width: "100%", height: "auto" }}/></UiNode>
        <UiNode as="strong">{String(LOGO_OPTIONS.indexOf(option) + 1).padStart(2, "0")} · {option.name}{selected === option.id ? " ✓" : ""}</UiNode>
        <UiNode as="span">{option.description}</UiNode>
      </UiNode>)}
    </UiNode>
  </>;
}
