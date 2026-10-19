"use client";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "@/lib/i18n/UiLink";
import { usePathname } from "next/navigation";
import { BrandLogo } from "./BrandLogo";
import ModuleWorkcard from "./ModuleWorkcard";
import ModuleNavigation from "./ModuleNavigation";
import DentayaIcon from "./DentayaIcon";
import LanguageSettings from "./LanguageSettings";
import ExperienceSettings from "./ExperienceSettings";
import AyaPreferencesPanel from "./ai/AyaPreferencesPanel";
import LogoPicker from "./LogoPicker";
import CustomizationPanel from "./CustomizationPanel";
import { professionalShellText } from '@/lib/i18n/professional-shell';
const MODULES: Record<string, [
    string,
    string
]> = {
    "pilot-flow": ["Pilot Akış Merkezi", "Doğrulama kayıtları"],
    "pilot-check": ["Sistem Kontrolü", "Pilot kontrolü"],
    "ops-health": ["Operasyon Sağlığı", "Olay akışı"],
    "release-check": ["RC Kontrolü", "Ürün sürümü"],
    training: ["Demo ve eğitim", "Gerçek taramalar ve kurgusal hasta senaryoları"],
    twin: ["Dijital model", "Hasta modelleri ve sürümleri"],
    community: ["Topluluk", "Meslektaşlar, forum ve makaleler"],
    cases: ["Vakalar", "Vaka kayıtları ve süreç takibi"], patients: ["Hastalar", "Hasta kayıtları ve vaka geçmişi"],
    scans: ["Taramalar", "Dijital modeller ve tarama kayıtları"], "scan-studio": ["Tarama stüdyosu", "Model inceleme ve tarama kontrolleri"],
    appointments: ["Randevular", "Takvim ve günlük plan"], finance: ["Finans", "Teklifler ve ödeme takibi"],
    messages: ["Mesajlar", "Ekip ve vaka görüşmeleri"], notifications: ["Bildirimler", "Güncellemeler ve bekleyen işler"],
    team: ["Ekip", "Üyeler ve çalışma alanı erişimi"], labs: ["Laboratuvar", "Laboratuvar bağlantıları"],
    logistics: ["Lojistik", "Teslimat ve sevkiyat takibi"], operations: ["Operasyon", "Günlük iş akışı"],
    settings: ["Ayarlar", "Çalışma alanını kişiselleştir"], clinic: ["Klinik", "Klinik çalışma alanı"], lab: ["Laboratuvar", "Laboratuvar çalışma alanı"],
};
type Preferences = {
    compact: boolean;
    navigation: boolean;
    reducedMotion: boolean;
};
const defaults: Preferences = { compact: true, navigation: true, reducedMotion: false };
const KEY = "dentaya:workspace-chrome-v1";
function readPreferences(): Preferences {
    try {
        const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
        return Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, typeof raw?.[key] === "boolean" ? raw[key] : value])) as Preferences;
    }
    catch {
        return defaults;
    }
}
export default function WorkspaceChrome({ children }: {
    children: ReactNode;
}) {
    const { t: uiText, intlLocale, locale } = useTranslation();
    const copy = professionalShellText(locale);
    const pathname = usePathname();
    const currentModule = MODULES[pathname.split("/")[1]];
    const available = Boolean(currentModule) || ["/", "/workspace", "/design", "/cad", "/ai"].includes(pathname);
    const [preferences, setPreferences] = useState(defaults);
    const [tab, setTab] = useState("appearance");
    const [message, setMessage] = useState("");
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => { dialog.current?.close(); }, [pathname]);
    function openPreferences() {
        if (document.querySelector('dialog[open]')) return;
        dialog.current?.showModal();
    }
    useEffect(() => {
        const sync = () => setPreferences(readPreferences());
        sync();
        window.addEventListener("storage", sync);
        return () => window.removeEventListener("storage", sync);
    }, []);
    useEffect(() => {
        document.documentElement.dataset.workspaceCompact = String(preferences.compact);
        document.documentElement.dataset.workspaceReducedMotion = String(preferences.reducedMotion);
    }, [preferences]);
    useEffect(() => {
        const open = () => { if (available && !document.querySelector('dialog[open]'))
            dialog.current?.showModal(); };
        const keyboard = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key === ",") {
            event.preventDefault();
            open();
        } };
        window.addEventListener("keydown", keyboard);
        window.addEventListener("dentaya:open-preferences", open);
        const unsubscribe = window.dentayaDesktop?.onOpenPreferences(open);
        return () => { window.removeEventListener("keydown", keyboard); window.removeEventListener("dentaya:open-preferences", open); unsubscribe?.(); };
    }, [available]);
    function update(patch: Partial<Preferences>) {
        const next = { ...preferences, ...patch };
        setPreferences(next);
        try {
            localStorage.setItem(KEY, JSON.stringify(next));
            setMessage("Tercihler bu cihaza kaydedildi.");
        }
        catch {
            setMessage("Tercihler uygulandı; bu cihazda kalıcı kayıt yapılamadı.");
        }
    }
    return <>
    {currentModule ? <UiNode as="div" className={`module-workspace professional-chrome ${preferences.navigation ? "" : "module-workspace--wide"}`}>
      {preferences.navigation && <UiNode as="aside" className="module-navigation"><UiNode as="div" className="module-brand"><BrandLogo width={164} height={36}/></UiNode><UiNode as="small">{uiText("ÇALIŞMA ALANI")}</UiNode>
        <ModuleNavigation pathname={pathname}/>
        <UiNode as="div" className="module-nav-foot"><Link href="/ai">{uiText("İsteğe bağlı AYA yardımcısı →")}</Link></UiNode>
      </UiNode>}
      <UiNode as="div" className="module-body"><UiNode as="header" className="module-header">{!preferences.navigation && <UiNode as="details" className="module-navigation-inline"><UiNode as="summary" translateChildren={false}>{copy.menu}</UiNode><UiNode as="div"><ModuleNavigation pathname={pathname}/></UiNode></UiNode>}<UiNode as="div"><UiNode as="small">DENTAYA / {uiText(currentModule[0]).toLocaleUpperCase(intlLocale())}</UiNode><UiNode as="p" className="module-header-context">{uiText(currentModule[1])}</UiNode></UiNode><UiNode as="button" onClick={openPreferences} translateChildren={false}><DentayaIcon name="settings" size={16}/> {copy.appearance}</UiNode></UiNode><UiNode as="div" className="module-content">{children}<ModuleWorkcard key={pathname.split("/")[1]} module={pathname.split("/")[1]}/></UiNode></UiNode>
    </UiNode> : children}
    {available && !currentModule && <UiNode as="button" className="workspace-settings-trigger" title="Hızlı ayarlar · Ctrl+," onClick={openPreferences}><DentayaIcon name="settings" size={16}/> {uiText(" Görünüm")}</UiNode>}
    {available && <UiNode as="dialog" ref={dialog} className="workspace-settings" aria-labelledby="workspace-settings-title" onClick={event => { if (event.target === dialog.current)
            dialog.current?.close(); }}>
      <UiNode as="div" className="workspace-settings-inner"><UiNode as="header"><UiNode as="div"><UiNode as="small">ÇALIŞMA ALANIN</UiNode><UiNode as="h2" id="workspace-settings-title">{uiText("Sana göre DentAYA")}</UiNode><UiNode as="p">{uiText("Ekrandan ayrılmadan düzenle.")}</UiNode></UiNode><UiNode as="button" autoFocus aria-label={uiText("Ayarları kapat")} onClick={() => dialog.current?.close()}>✕</UiNode></UiNode>
      <UiNode as="nav" aria-label={uiText("Ayar kategorileri")}>{[["appearance", "Renk ve görünüm"], ["brand", "Logo ve masaüstü"], ["work", "Çalışma düzeni"], ["experience", "Geçiş ve ses"], ["language", "Dil ve bölge"], ["aya", "AYA yerel"]].map(([id, label]) => <UiNode as="button" key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{uiText(label)}</UiNode>)}</UiNode>
      <UiNode as="div" className="workspace-settings-content">{tab === "language" ? <LanguageSettings /> : tab === "appearance" ? <CustomizationPanel /> : tab === "brand" ? <LogoPicker /> : tab === "experience" ? <ExperienceSettings /> : tab === "aya" ? <AyaPreferencesPanel /> : <UiNode as="div" className="workspace-options"><UiNode as="h3">Daha rahat bir çalışma alanı</UiNode><UiNode as="p">Tercihler bu cihazdaki modül ekranlarında uygulanır.</UiNode>
        {([["navigation", "Sol menüyü göster", "Ana sayfa, vakalar ve mesajlara hızlı erişim."], ["compact", "Sıkı yerleşim", "Modül çerçevesindeki boşlukları azalt."], ["reducedMotion", "Hareketi azalt", "Animasyon ve geçişleri azalt."]] as const).map(([id, label, detail]) => <UiNode as="label" key={id}><UiNode data-dy-copy-stack as="span"><UiNode as="strong">{uiText(label)}</UiNode><UiNode as="small">{uiText(detail)}</UiNode></UiNode><UiNode as="input" type="checkbox" checked={preferences[id]} onChange={e => update({ [id]: e.target.checked })}/></UiNode>)}
        <UiNode as="p">{uiText("Hızlı ayarlar: ")}<UiNode as="kbd">Ctrl</UiNode> + <UiNode as="kbd">,</UiNode> · Kapat: <UiNode as="kbd">Esc</UiNode></UiNode><Link href="/settings" onClick={() => dialog.current?.close()}>Tüm ayarlara git →</Link><UiNode as="p" role="status">{message}</UiNode>
      </UiNode>}</UiNode></UiNode>
    </UiNode>}
  </>;
}
