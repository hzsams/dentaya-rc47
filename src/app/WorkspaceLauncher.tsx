"use client";
import UserText from "@/lib/i18n/UserText";
import {useTranslation} from '@/lib/i18n';
import UiNode from "@/lib/i18n/UiNode";
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, } from "react";
import { usePathname, useRouter } from "next/navigation";
import { dy } from "@/app/dentaya-theme";
import DentayaIcon, { type DentayaIconName } from "@/app/DentayaIcon";
import { supabase } from "@/lib/supabase";
type OrgType = "clinic" | "laboratory" | "courier";
type Org = {
    id: string;
    name: string;
    org_type: OrgType;
};
type Membership = {
    organization_id: string;
    role: string;
};
type Item = {
    id: string;
    label: string;
    detail: string;
    href: string;
    group: "Ana" | "İş Akışı" | "Araçlar" | "Öğren";
    keywords?: string;
    icon: DentayaIconName;
};
export default function WorkspaceLauncher() {
 const {t:uiText,intlLocale}=useTranslation();
    const router = useRouter();
    const pathname = usePathname();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const ownerId = `launcher-${useId()}`;
    const [isOwner, setIsOwner] = useState(false);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [org, setOrg] = useState<Org | null>(null);
    const [membership, setMembership] = useState<Membership | null>(null);
    useEffect(() => {
        const id = ownerId;
        const current = document.body.dataset.dentayaLauncherOwner;
        if (!current) {
            document.body.dataset.dentayaLauncherOwner = id;
            setIsOwner(true);
        }
        return () => {
            if (document.body.dataset.dentayaLauncherOwner === id) {
                delete document.body.dataset.dentayaLauncherOwner;
            }
        };
    }, [ownerId]);
    useEffect(() => {
        if (!isOwner)
            return;
        let active = true;
        async function boot() {
            const { data: auth } = await supabase.auth.getSession();
            const user = auth.session?.user;
            if (!user)
                return;
            const { data: m } = await supabase
                .from("memberships")
                .select("organization_id,role")
                .eq("user_id", user.id)
                .eq("status", "active")
                .limit(1)
                .maybeSingle();
            if (!m)
                return;
            const currentMembership = m as Membership;
            const { data: o } = await supabase
                .from("organizations")
                .select("id,name,org_type")
                .eq("id", currentMembership.organization_id)
                .maybeSingle();
            if (!o || !active)
                return;
            const currentOrg = o as Org;
            setMembership(currentMembership);
            setOrg(currentOrg);
            // Hızlı Git yalnızca modül navigasyonudur; vaka ve teslimat listeleri kendi ekranlarında kalır.
        }
        void boot();
        return () => { active = false; };
    }, [isOwner]);
    useEffect(() => {
        if (!isOwner)
            return;
        function key(event: KeyboardEvent) {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                setOpen(v => !v);
            }
            if (event.key === "Escape")
                setOpen(false);
        }
        window.addEventListener("keydown", key);
        return () => window.removeEventListener("keydown", key);
    }, [isOwner]);
    useEffect(() => {
        if (!open) {
            setQuery("");
            return;
        }
        const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
        return () => window.clearTimeout(timer);
    }, [open]);
    const items = useMemo(() => buildItems(org, membership), [org, membership]);
    const filtered = useMemo(() => {
        const q = query.trim().toLocaleLowerCase(intlLocale());
        if (!q)
            return items;
        return items.filter(item => [uiText(item.label),uiText(item.detail),uiText(item.group),item.label,item.detail,item.keywords ?? ""]
            .join(" ")
            .toLocaleLowerCase(intlLocale())
            .includes(q));
    }, [items, query, uiText, intlLocale]);
    function go(href: string) {
        setOpen(false);
        router.push(href);
    }
    if (!isOwner || !org || pathname === "/design" || pathname === "/ai")
        return null;
    return <>


    <UiNode as="button" type="button" data-dentaya-launcher="true" onClick={() => setOpen(true)} style={ui.trigger} title="Hızlı Git · Ctrl/⌘ K" aria-label="Hızlı Git">
      <UiNode as="span" style={ui.diamond}>◇</UiNode>
      <UiNode as="span" className="dentaya-launcher-label">Hızlı Git</UiNode>
      <UiNode as="kbd" style={ui.kbd}>⌘K</UiNode>
    </UiNode>

    {open && <UiNode as="div" style={ui.overlay} onMouseDown={event => {
                if (event.target === event.currentTarget)
                    setOpen(false);
            }}>
      <UiNode as="section" style={ui.palette} role="dialog" aria-modal="true" aria-label="DentAYA hızlı navigasyon">
        <UiNode as="div" style={ui.searchRow}>
          <UiNode as="span" style={ui.searchIcon}>⌕</UiNode>
          <UiNode as="input" ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => {
                if (e.key === "Enter" && filtered[0]) {
                    e.preventDefault();
                    go(filtered[0].href);
                }
            }} placeholder="Hasta, vaka, CAD, ayarlar..." style={ui.search}/>
          <UiNode as="kbd" style={ui.escape}>ESC</UiNode>
        </UiNode>

        <UiNode as="div" style={ui.context}>
          <UiNode as="strong"><UserText>{org.name}</UserText></UiNode>
          <UiNode as="span">{orgLabel(org.org_type)} · {roleLabel(membership?.role)}</UiNode>
        </UiNode>

        <UiNode as="div" style={ui.results}>
          {filtered.length
                ? filtered.map((item, index) => <UiNode as="button" type="button" key={item.id} onClick={() => go(item.href)} style={{ ...ui.result, ...(index === 0 ? ui.firstResult : {}) }}>
                <UiNode as="span" data-dy-module-icon style={ui.resultIcon}>
                  <DentayaIcon name={item.icon} size={19}/>
                </UiNode>
                <UiNode as="div" style={ui.copy}>
                  <UiNode as="span" style={ui.group}>{item.group}</UiNode>
                  <UiNode as="strong">{item.label}</UiNode>
                  <UiNode as="small">{item.detail}</UiNode>
                </UiNode>
                <UiNode as="span" style={ui.arrow}>→</UiNode>
              </UiNode>)
                : <UiNode as="div" style={ui.empty}>Sonuç bulunamadı.</UiNode>}
        </UiNode>

        <UiNode as="footer" style={ui.footer}>
          <UiNode as="span">Enter · İlk sonucu aç</UiNode>
          <UiNode as="span">Esc · Kapat</UiNode>
        </UiNode>
      </UiNode>
    </UiNode>}

    <style>{`
      @media(max-width:700px){
        [data-dentaya-launcher="true"]{right:14px!important;bottom:14px!important}
        [data-dentaya-aya-dock="true"]{right:14px!important;bottom:66px!important}
        .dentaya-launcher-label{display:none}
      }
    `}</style>
  </>;
}
function buildItems(org: Org | null, membership: Membership | null): Item[] {
    if (!org)
        return [];
    const items: Item[] = [
        { id: "home", icon: "home", label: "Ana Sayfa", detail: "DentAYA ana kontrol paneli.", href: "/", group: "Ana", keywords: "dashboard home" },
        { id: "operations", icon: "home", label: "Operasyon Merkezi", detail: "Termin, revizyon, üretim ve kurye öncelikleri.", href: "/operations", group: "Ana", keywords: "operasyon kapasite termin gecikme günlük öncelik" },
        { id: "notifications", icon: "notification", label: "Bildirimler", detail: "Vaka, CAD, fiyat ve teslimat bildirimleri.", href: "/notifications", group: "Araçlar", keywords: "uyarı" },
        { id: "settings", icon: "settings", label: "Ayarlar", detail: "Profil, görünüm, bildirim ve kurum ayarları.", href: "/settings", group: "Araçlar", keywords: "tema profil" },
    ];
    if (membership?.role === "owner" || membership?.role === "admin") {
        items.push({ id: "team", icon: "team", label: "Ekip Yönetimi", detail: "Davet ve rol yönetimi.", href: "/team", group: "Araçlar", keywords: "ekip kullanıcı davet" }, { id: "ops-health", icon: "shield", label: "Operasyon Sağlığı", detail: "Pilot hata, bağlantı ve kritik olay kayıtları.", href: "/ops-health", group: "Araçlar", keywords: "hata log sağlık telemetry pilot" });
    }
    if (org.org_type === "clinic") {
        items.unshift({ id: "clinic", icon: "clinic", label: "Klinik Merkezi", detail: "Klinik operasyon görünümü.", href: "/clinic", group: "Ana" }, { id: "patients", icon: "patient", label: "Hastalar", detail: "Hasta kayıtları ve yeni hasta.", href: "/patients", group: "İş Akışı", keywords: "patient" }, { id: "appointments", icon: "calendar", label: "Randevular", detail: "Klinik takvimi ve randevular.", href: "/appointments", group: "İş Akışı", keywords: "takvim" }, { id: "cases", icon: "case", label: "Vakalar", detail: "Klinik-lab vaka akışı.", href: "/cases", group: "İş Akışı" }, { id: "scan-studio", icon: "scan", label: "Tarama Stüdyosu", detail: "STL / PLY taramasını bağla.", href: "/scan-studio", group: "İş Akışı", keywords: "scan stl ply" }, { id: "scans", icon: "scan", label: "3D Taramalar", detail: "Kayıtlı taramaları görüntüle.", href: "/scans", group: "İş Akışı" }, { id: "labs", icon: "lab", label: "Laboratuvarlar", detail: "Laboratuvar dizini.", href: "/labs", group: "İş Akışı" }, { id: "messages", icon: "message", label: "Mesajlar", detail: "Hekim ↔ teknisyen iletişimi.", href: "/messages", group: "İş Akışı" }, { id: "finance", icon: "finance", label: "Fiyat & Tahsilat", detail: "Lab maliyeti ve hasta fiyatı.", href: "/finance", group: "İş Akışı" }, { id: "ai", icon: "ai", label: "AYA Copilot", detail: "Vaka riskini, eksikleri ve sıradaki adımı birlikte analiz et.", href: "/ai", group: "Araçlar" });
    }
    if (org.org_type === "laboratory") {
        items.unshift({ id: "lab", icon: "lab", label: "Laboratuvar Merkezi", detail: "İş kuyruğu ve üretim görünümü.", href: "/lab", group: "Ana" }, { id: "cases", icon: "case", label: "Vakalar", detail: "Atanmış klinik vakaları.", href: "/cases", group: "İş Akışı" }, { id: "scan-studio", icon: "scan", label: "Lab Tarama", detail: "Model ve preparasyon taramaları.", href: "/scan-studio", group: "İş Akışı" }, { id: "design", icon: "design", label: "DentAYA Design", detail: "CAD çalışma alanı.", href: "/design", group: "İş Akışı", keywords: "cad marjin stl" }, { id: "messages", icon: "message", label: "Klinik Mesajları", detail: "Hekim ↔ teknisyen iletişimi.", href: "/messages", group: "İş Akışı" }, { id: "finance", icon: "finance", label: "Lab Fiyatlandırma", detail: "Kliniğe verilen vaka fiyatı.", href: "/finance", group: "İş Akışı" }, { id: "logistics", icon: "logistics", label: "Teslimat", detail: "Hazır ürün ve kurye süreci.", href: "/logistics", group: "İş Akışı" }, { id: "ai", icon: "ai", label: "AYA Copilot", detail: "Vaka riskini, eksikleri ve sıradaki adımı birlikte analiz et.", href: "/ai", group: "Araçlar" });
    }
    if (org.org_type === "courier") {
        items.unshift({ id: "logistics", icon: "logistics", label: "Canlı Takip", detail: "Alım, yolda ve teslimat görevleri.", href: "/logistics", group: "İş Akışı", keywords: "kurye shipment" });
    }
    items.push({ id: "release-check", icon: "shield", label: "Release Check", detail: "RC env, auth, RLS ve 3D kapılarını doğrula.", href: "/release-check", group: "Araçlar", keywords: "release rc staging" }, { id: "pilot-check", icon: "shield", label: "Sistem Kontrolü", detail: "Pilot teknik sağlık kontrolü.", href: "/pilot-check", group: "Araçlar" }, { id: "pilot-flow", icon: "guide", label: "Pilot Akışı", detail: "Uçtan uca vaka zincirini doğrula.", href: "/pilot-flow", group: "Araçlar" });
    items.push({ id: "start", icon: "guide", label: "Öğrenim Rehberi", detail: "Rolüne göre DentAYA'yı adım adım öğren.", href: "/start", group: "Öğren", keywords: "rehber eğitim kullanım kılavuzu" });
    return items;
}
function orgLabel(v: OrgType) { return v === "clinic" ? "Klinik" : v === "laboratory" ? "Laboratuvar" : "Kurye"; }
function roleLabel(v: string | undefined) {
    return ({ owner: "Kurum Sahibi", admin: "Yönetici", dentist: "Diş Hekimi", assistant: "Klinik Asistanı", technician: "Diş Teknisyeni", courier: "Kurye", viewer: "Salt Okunur" } as Record<string, string>)[v ?? ""] ?? v ?? "Kullanıcı";
}
const ui: Record<string, CSSProperties> = {
    ayaDock: { position: "fixed", zIndex: 1099, right: 20, bottom: 72, minHeight: 42, display: "inline-flex", alignItems: "center", gap: 8, padding: "0 12px", border: `1px solid ${dy.border}`, borderRadius: 12, background: dy.accentSoft, color: dy.accent, boxShadow: `0 16px 42px ${dy.shadow}`, fontSize: 12, fontWeight: 900, cursor: "pointer" },
    trigger: { position: "fixed", zIndex: 1100, right: 20, bottom: 20, minHeight: 42, display: "inline-flex", alignItems: "center", gap: 8, padding: "0 10px", border: `1px solid ${dy.border}`, borderRadius: 12, background: dy.surface, color: dy.text, boxShadow: `0 16px 42px ${dy.shadow}`, fontSize: 12, fontWeight: 850, cursor: "pointer" },
    diamond: { color: dy.accent, fontSize: 17 },
    kbd: { minWidth: 34, padding: "4px 6px", border: `1px solid ${dy.border}`, borderRadius: 7, background: dy.input, color: dy.muted, fontSize: 10, textAlign: "center" },
    overlay: { position: "fixed", inset: 0, zIndex: 1500, display: "grid", placeItems: "start center", padding: "min(12vh,100px) 16px 30px", background: "rgba(2,9,14,.72)", backdropFilter: "blur(10px)" },
    palette: { width: "min(720px,100%)", maxHeight: "min(720px,78vh)", overflow: "hidden", display: "grid", gridTemplateRows: "auto auto minmax(0,1fr) auto", border: `1px solid ${dy.border}`, borderRadius: 18, background: dy.surface, color: dy.text, boxShadow: `0 30px 90px ${dy.shadow}` },
    searchRow: { minHeight: 64, display: "grid", gridTemplateColumns: "26px minmax(0,1fr) auto", alignItems: "center", gap: 8, padding: "0 14px", borderBottom: `1px solid ${dy.border}` },
    searchIcon: { color: dy.accent, fontSize: 20 },
    search: { width: "100%", minHeight: 46, border: 0, outline: 0, background: "transparent", color: dy.text, fontSize: 17 },
    escape: { padding: "4px 7px", border: `1px solid ${dy.border}`, borderRadius: 7, background: dy.input, color: dy.muted, fontSize: 10 },
    context: { padding: "9px 14px 10px", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", borderBottom: `1px solid ${dy.border}`, color: dy.muted, fontSize: 12 },
    results: { overflowY: "auto", padding: 8, display: "grid", alignContent: "start", gap: 4 },
    result: { width: "100%", minHeight: 66, padding: "10px 11px", display: "grid", gridTemplateColumns: "40px minmax(0,1fr) auto", alignItems: "center", gap: 10, border: "1px solid transparent", borderRadius: 10, background: "transparent", color: dy.text, textAlign: "left", cursor: "pointer" },
    resultIcon: { width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 11, background: dy.accentSoft, color: dy.accent, border: `1px solid ${dy.border}` },
    firstResult: { borderColor: dy.border, background: dy.surface2 },
    copy: { minWidth: 0, display: "grid", gap: 2 },
    group: { color: dy.accent, fontSize: 10, fontWeight: 900, letterSpacing: ".09em" },
    arrow: { color: dy.muted, fontWeight: 900 },
    empty: { minHeight: 180, display: "grid", placeItems: "center", color: dy.muted },
    footer: { minHeight: 42, padding: "0 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderTop: `1px solid ${dy.border}`, color: dy.muted, fontSize: 11 },
};
