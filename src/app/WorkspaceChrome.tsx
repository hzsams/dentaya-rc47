"use client";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import Link from "@/lib/i18n/UiLink";
import { usePathname } from "next/navigation";
import { BrandLogo } from "./BrandLogo";
import ModuleWorkcard from "./ModuleWorkcard";
import ModuleNavigation from "./ModuleNavigation";
import DentayaIcon, { type DentayaIconName } from "./DentayaIcon";
import LanguageSettings from "./LanguageSettings";
import ExperienceSettings from "./ExperienceSettings";
import AyaPreferencesPanel from "./ai/AyaPreferencesPanel";
import LogoPicker from "./LogoPicker";
import CustomizationPanel from "./CustomizationPanel";
import { professionalShellText } from '@/lib/i18n/professional-shell';
import { desktopShellText } from '@/lib/i18n/desktop-shell';
import { DENTAYA_RELEASE } from '@/lib/release';
import './desktop-shell.css';
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
    logistics: ["Lojistik", "Teslimat ve sevkiyat takibi"], operations: ["İş takibi", "Günlük iş akışı"],
    settings: ["Ayarlar", "Çalışma alanını kişiselleştir"], clinic: ["Klinik", "Klinik çalışma alanı"], lab: ["Laboratuvar", "Laboratuvar çalışma alanı"],
};
type Preferences = {
    compact: boolean;
    navigation: boolean;
    reducedMotion: boolean;
};
const defaults: Preferences = { compact: true, navigation: true, reducedMotion: false };
const KEY = "dentaya:workspace-chrome-v1";
const PREFERENCE_TABS = [["appearance", "Renk ve görünüm"], ["brand", "Logo ve masaüstü"], ["work", "Çalışma düzeni"], ["experience", "Geçiş ve ses"], ["language", "Dil ve bölge"], ["aya", "AYA yerel"]] as const;
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
    const { t: uiText, locale } = useTranslation();
    const copy = professionalShellText(locale), desktopCopy=desktopShellText(locale);
    const pathname = usePathname();
    const currentModule = MODULES[pathname.split("/")[1]];
    const isCad=pathname==='/design'||pathname==='/cad';
    const isWorkspace=pathname==='/workspace',isAya=pathname==='/ai';
    const isLibrary=pathname==='/cad-library';
    const isDesktop=Boolean(currentModule)||isCad||isWorkspace||isAya||isLibrary;
    const available=isDesktop||pathname==='/';
    const moduleKey=pathname.split('/')[1];
    const moduleLabel=currentModule?uiText(currentModule[0]):isCad?'DentAYA Design':isAya?'AYA':isLibrary?uiText('Form kütüphanesi'):desktopCopy.workManager;
    const [preferences, setPreferences] = useState(defaults);
    const [tab, setTab] = useState("appearance");
    const [message, setMessage] = useState("");
    const [online,setOnline]=useState(true);
    const moduleMenu=useRef<HTMLDialogElement>(null);
    const moduleMenuTrigger=useRef<HTMLElement|null>(null);
    const menuButton=useRef<HTMLButtonElement>(null);
    const dialog = useRef<HTMLDialogElement>(null);
    const preferencesTrigger=useRef<HTMLElement|null>(null);
    const preferencesButton=useRef<HTMLButtonElement>(null);
    useEffect(() => { dialog.current?.close();moduleMenu.current?.close(); }, [pathname]);
    useEffect(()=>{
        const network=()=>setOnline(navigator.onLine);
        network();window.addEventListener('online',network);window.addEventListener('offline',network);
        return()=>{window.removeEventListener('online',network);window.removeEventListener('offline',network);};
    },[]);
    function openModuleMenu(){
        if(document.querySelector('dialog[open]'))return;
        moduleMenuTrigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
        moduleMenu.current?.showModal();
        moduleMenu.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
    }
    function restoreModuleMenuFocus(){
        const trigger=moduleMenuTrigger.current??menuButton.current;
        const active=document.activeElement;
        // Native close restores focus before its queued close event; preserve any newer focus choice.
        const needsFocus=!active||!active.isConnected||active===document.body||active===document.documentElement||moduleMenu.current?.contains(active);
        if(needsFocus&&!document.querySelector('dialog[open]')&&trigger?.isConnected)trigger.focus();
    }
    useEffect(()=>{
        const keyboard=(event:KeyboardEvent)=>{if(isDesktop&&event.altKey&&!event.ctrlKey&&!event.metaKey&&event.key.toLowerCase()==='m'){event.preventDefault();openModuleMenu();}};
        window.addEventListener('keydown',keyboard);window.addEventListener('dentaya:open-modules',openModuleMenu);return()=>{window.removeEventListener('keydown',keyboard);window.removeEventListener('dentaya:open-modules',openModuleMenu);};
    },[isDesktop]);
    function openPreferences() {
        if (document.querySelector('dialog[open]')) return;
        preferencesTrigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
        dialog.current?.showModal();
    }
    function restorePreferencesFocus(){
        const trigger=preferencesTrigger.current??preferencesButton.current;
        const active=document.activeElement;
        const needsFocus=!active||!active.isConnected||active===document.body||active===document.documentElement||dialog.current?.contains(active);
        if(needsFocus&&!document.querySelector('dialog[open]')&&trigger?.isConnected)trigger.focus();
    }
    function navigatePreferenceTabs(event:ReactKeyboardEvent<HTMLElement>){
        const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'];
        if(!keys.includes(event.key))return;
        const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
        const current=buttons.indexOf(event.target as HTMLButtonElement);
        if(current<0)return;
        event.preventDefault();
        const rtl=document.documentElement.dir==='rtl';
        const forward=event.key==='ArrowDown'||event.key===(rtl?'ArrowLeft':'ArrowRight');
        const index=event.key==='Home'?0:event.key==='End'?buttons.length-1:(current+(forward?1:-1)+buttons.length)%buttons.length;
        setTab(PREFERENCE_TABS[index][0]);buttons[index].focus();
    }
    useEffect(() => {
        const sync = () => setPreferences(readPreferences());
        sync();
        window.addEventListener("storage", sync);
        window.addEventListener("dentaya:workspace-chrome-change",sync);
        return () => {window.removeEventListener("storage", sync);window.removeEventListener("dentaya:workspace-chrome-change",sync);};
    }, []);
    useEffect(() => {
        document.documentElement.dataset.workspaceCompact = String(preferences.compact);
        document.documentElement.dataset.workspaceReducedMotion = String(preferences.reducedMotion);
    }, [preferences]);
    useEffect(() => {
        const open = () => { if (available) openPreferences(); };
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
    {isDesktop ? <UiNode as="div" className={`desktop-shell professional-chrome ${isCad?'desktop-shell--cad':''}`} data-desktop-module={moduleKey}>
      {!isCad&&<UiNode as="header" className="desktop-titlebar" translateChildren={false}>
        <UiNode as="div" className="desktop-brand-area">
          <UiNode as="button" ref={menuButton} type="button" onClick={openModuleMenu} title={desktopCopy.menuHint} aria-haspopup="dialog" aria-controls="desktop-module-menu" className="desktop-modules-button"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14"/></svg><UiNode as="span">{desktopCopy.modules}</UiNode><UiNode as="kbd" translateChildren={false}>{desktopCopy.menuHint}</UiNode></UiNode>
          <Link href="/workspace" className="desktop-brand" aria-label="DentAYA"><BrandLogo width={124} height={28} priority/></Link>
        </UiNode>
        <UiNode as="nav" className="desktop-document-tabs" aria-label={desktopCopy.workspaces} translateChildren={false}>
          <Link href="/workspace" aria-current={isWorkspace?'page':undefined}><DentayaIcon name="case" size={15}/><UiNode as="span">{desktopCopy.workManager}</UiNode></Link>
          <Link href="/design" aria-current={isCad?'page':undefined}><DentayaIcon name="design" size={15}/><UiNode as="span">{desktopCopy.design}</UiNode></Link>
          <Link href="/ai" aria-current={isAya?'page':undefined}><DentayaIcon name="ai" size={15}/><UiNode as="span">{desktopCopy.assistant}</UiNode></Link>
          {!isWorkspace&&!isCad&&!isAya&&<Link href={pathname} aria-current="page"><UiNode as="span">{moduleLabel}</UiNode></Link>}
        </UiNode>
        <UiNode as="div" className="desktop-titlebar-actions">
          <UiNode as="button" ref={preferencesButton} type="button" onClick={openPreferences} aria-label={desktopCopy.preferences} title={copy.appearance}><DentayaIcon name="settings" size={17}/></UiNode>
        </UiNode>
      </UiNode>}
      <UiNode as="div" className={`desktop-workspace module-workspace ${isCad||!preferences.navigation?'module-workspace--wide':''}`}>
        {!isCad&&preferences.navigation&&<UiNode as="aside" className="module-navigation desktop-module-navigation" aria-label={desktopCopy.modules} translateChildren={false}>
          <UiNode as="nav" className="studio-activity-dock" aria-label={desktopCopy.workspaces}>
            {([['/workspace', desktopCopy.workManager, 'case'], ['/design', desktopCopy.design, 'design'], ['/patients', uiText('Hastalar'), 'patient'], ['/scans', uiText('Taramalar'), 'scan'], ['/messages', uiText('Mesajlar'), 'message'], ['/finance', uiText('Finans'), 'finance'], ['/ai', 'AYA', 'ai']] as [string, string, DentayaIconName][]).map(([href,label,icon]) => <Link href={href} key={href} aria-current={pathname===href||pathname.startsWith(href+'/')?'page':undefined} title={label}><UiNode as="span" className="studio-dock-icon" data-icon={icon}><DentayaIcon name={icon} size={25}/></UiNode><UiNode as="span">{label}</UiNode></Link>)}
          </UiNode>
          <UiNode as="div" className="studio-dock-bottom"><Link href="/settings" title={uiText('Ayarlar')} aria-label={uiText('Ayarlar')}><DentayaIcon name="settings" size={23}/></Link></UiNode>
        </UiNode>}
        <UiNode as="div" className="module-body desktop-document">
          <UiNode as="div" className={`module-content desktop-content ${isWorkspace?'desktop-content--manager':''} ${isCad?'desktop-content--cad':''} ${isAya?'desktop-content--aya':''}`}>
            {children}
            {currentModule&&<ModuleWorkcard key={moduleKey} module={moduleKey}/>}
          </UiNode>
        </UiNode>
      </UiNode>
      {!isCad&&<UiNode as="footer" className="desktop-statusbar" translateChildren={false}>
        <UiNode as="span" className="desktop-status-module"><DentayaIcon name="shield" size={12}/>{moduleLabel}</UiNode>
        <UiNode as="span" className="desktop-network-status"><UiNode as="i" data-online={online} aria-hidden="true"/>{online?desktopCopy.networkAvailable:desktopCopy.offline}</UiNode>
        <UiNode as="code">{DENTAYA_RELEASE.version.replace('1.0.0-rc.','RC')}</UiNode>
      </UiNode>}
      <UiNode as="dialog" ref={moduleMenu} id="desktop-module-menu" className="desktop-module-menu" aria-label={desktopCopy.modules} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();moduleMenu.current?.close();}}} onClick={event=>{if(event.target===moduleMenu.current)moduleMenu.current?.close();}} onClose={restoreModuleMenuFocus}>
        <UiNode as="header" translateChildren={false}><UiNode as="strong">{desktopCopy.modules}</UiNode><UiNode as="button" type="button" aria-label={desktopCopy.closeMenu} onClick={()=>moduleMenu.current?.close()}>✕</UiNode></UiNode>
        <UiNode as="div" onClick={event=>{if((event.target as HTMLElement).closest('a'))moduleMenu.current?.close();}}><ModuleNavigation pathname={pathname}/></UiNode>
      </UiNode>
    </UiNode> : children}
    {available && !isDesktop && <UiNode as="button" ref={preferencesButton} className="workspace-settings-trigger" title="Hızlı ayarlar · Ctrl+," onClick={openPreferences}><DentayaIcon name="settings" size={16}/> {uiText(" Görünüm")}</UiNode>}
    {available && <UiNode as="dialog" ref={dialog} className="workspace-settings" aria-labelledby="workspace-settings-title" onClose={restorePreferencesFocus} onClick={event => { if (event.target === dialog.current)
            dialog.current?.close(); }}>
      <UiNode as="div" className="workspace-settings-inner"><UiNode as="header"><UiNode as="div"><UiNode as="small">ÇALIŞMA ALANIN</UiNode><UiNode as="h2" id="workspace-settings-title">{uiText("Sana göre DentAYA")}</UiNode><UiNode as="p">{uiText("Ekrandan ayrılmadan düzenle.")}</UiNode></UiNode><UiNode as="button" autoFocus aria-label={uiText("Ayarları kapat")} onClick={() => dialog.current?.close()}>✕</UiNode></UiNode>
      <UiNode as="nav" role="tablist" aria-label={uiText("Ayar kategorileri")} onKeyDown={navigatePreferenceTabs}>{PREFERENCE_TABS.map(([id, label]) => <UiNode as="button" type="button" role="tab" key={id} id={`workspace-preference-tab-${id}`} aria-selected={tab===id} aria-controls={`workspace-preference-panel-${id}`} tabIndex={tab===id?0:-1} onClick={() => setTab(id)}>{uiText(label)}</UiNode>)}</UiNode>
      <UiNode as="div" role="tabpanel" id={`workspace-preference-panel-${tab}`} aria-labelledby={`workspace-preference-tab-${tab}`} tabIndex={0} className="workspace-settings-content">{tab === "language" ? <LanguageSettings /> : tab === "appearance" ? <CustomizationPanel /> : tab === "brand" ? <LogoPicker /> : tab === "experience" ? <ExperienceSettings /> : tab === "aya" ? <AyaPreferencesPanel /> : <UiNode as="div" className="workspace-options"><UiNode as="h3">Daha rahat bir çalışma alanı</UiNode><UiNode as="p">Tercihler bu cihazdaki modül ekranlarında uygulanır.</UiNode>
        {([["navigation", desktopCopy.activityRail, desktopCopy.activityRailDetail], ["compact", "Sıkı yerleşim", "Modül çerçevesindeki boşlukları azalt."], ["reducedMotion", "Hareketi azalt", "Animasyon ve geçişleri azalt."]] as const).map(([id, label, detail]) => <UiNode as="label" key={id}><UiNode data-dy-copy-stack as="span"><UiNode as="strong">{uiText(label)}</UiNode><UiNode as="small">{uiText(detail)}</UiNode></UiNode><UiNode as="input" type="checkbox" checked={preferences[id]} onChange={e => update({ [id]: e.target.checked })}/></UiNode>)}
        <UiNode as="p">{uiText("Hızlı ayarlar: ")}<UiNode as="kbd">Ctrl</UiNode> + <UiNode as="kbd">,</UiNode> · Kapat: <UiNode as="kbd">Esc</UiNode></UiNode><Link href="/settings" onClick={() => dialog.current?.close()}>Tüm ayarlara git →</Link><UiNode as="p" role="status">{message}</UiNode>
      </UiNode>}</UiNode></UiNode>
    </UiNode>}
  </>;
}
