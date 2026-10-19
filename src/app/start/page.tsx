"use client";
import UiMessage from '@/lib/i18n/UiMessage';
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "@/lib/i18n/UiLink";
import { useRouter } from "next/navigation";
import WorkspaceLauncher from "@/app/WorkspaceLauncher";
import { dy, useDentayaThemeRuntime } from "@/app/dentaya-theme";
import { supabase } from "@/lib/supabase";
type OrgType = "clinic" | "laboratory" | "courier";
type GuideStep = {
    id: string;
    title: string;
    text: string;
    href: string;
    action: string;
};
const GUIDE: Record<OrgType, GuideStep[]> = {
    clinic: [
        { id: "patient", title: "Hastayı oluştur", text: "Hasta profilini yalnız gerekli kimlik ve iletişim bilgileriyle oluştur; klinik veriyi doğru hastaya bağla.", href: "/patients", action: "Hastaları Aç" },
        { id: "scan", title: "Taramayı bağla", text: "STL/PLY dosyasını Tarama Stüdyosu'ndan içe aktar; mesh sinyallerini kontrol et ve doğru hasta/vakaya bağla.", href: "/scan-studio", action: "Tarama Stüdyosu" },
        { id: "case", title: "Vakayı oluştur", text: "FDI, materyal, renk, termin ve laboratuvar bağlamını Vakalar ekranında tamamla.", href: "/cases", action: "Vakaları Aç" },
        { id: "message", title: "Teknik iletişimi kur", text: "Vaka bağlamındaki mesajları kullan; dosya ve kararların dağılmasını önle.", href: "/messages", action: "Mesajları Aç" },
        { id: "review", title: "Tasarımı incele", text: "Laboratuvarın gönderdiği CAD versiyonunu vaka ekranından incele; onay veya revizyon ver.", href: "/cases", action: "Onay Akışı" },
        { id: "finance", title: "Fiyat ve teslimatı kapat", text: "Hasta fiyatı, ödeme durumu ve fiziksel teslimat adımlarını ilgili modüllerden takip et.", href: "/finance", action: "Finansı Aç" },
    ],
    laboratory: [
        { id: "case", title: "Yeni işi kontrol et", text: "Atanan vakayı Vakalar ekranında aç; diş, materyal, renk, termin ve dosya bilgisini doğrula.", href: "/cases", action: "Vakaları Aç" },
        { id: "scan", title: "Tarama verisini hazırla", text: "Model/preparasyon taramasını Tarama Stüdyosu'nda bağla ve mesh sinyallerini kontrol et.", href: "/scan-studio", action: "Lab Tarama" },
        { id: "cad", title: "DentAYA Design'a geç", text: "Kaynak taramayı seç; margin, insertion axis, anatomy, contact ve review adımlarını sırayla tamamla.", href: "/design", action: "CAD'i Aç" },
        { id: "review", title: "Kliniğe gönder", text: "Tasarım versiyonunu review'a gönder. Klinik onayı gelmeden üretim tamamlandı kabul edilmez.", href: "/design", action: "Review Akışı" },
        { id: "production", title: "Üretim ve QC", text: "Onaylanan işi üretim ve kalite kontrol aşamalarında ilerlet; durum değişikliklerini vaka ekranında tut.", href: "/cases", action: "Üretim Akışı" },
        { id: "delivery", title: "Teslimatı başlat", text: "Hazır işi lojistik modülünden kurye/teslimat sürecine geçir.", href: "/logistics", action: "Lojistiği Aç" },
    ],
    courier: [
        { id: "task", title: "Görevi aç", text: "Atanan alım veya teslimat görevini Canlı Takip ekranında görüntüle.", href: "/logistics", action: "Canlı Takip" },
        { id: "status", title: "Durumu güncelle", text: "Alım, yolda ve teslim durumlarını yalnızca gerçek fiziksel hareket olduğunda güncelle.", href: "/logistics", action: "Gönderileri Aç" },
        { id: "notifications", title: "Bildirimleri kontrol et", text: "Yeni görev veya değişiklikleri Bildirim Merkezi'nden takip et.", href: "/notifications", action: "Bildirimler" },
    ],
};
const progressKey = (role: OrgType) => `dentaya:learning-progress:${role}`;
export default function StartPage() {
    const { t: uiText } = useTranslation();
    useDentayaThemeRuntime();
    const router = useRouter();
    const [role, setRole] = useState<OrgType>("clinic");
    const [orgName, setOrgName] = useState("DentAYA");
    const [ready, setReady] = useState(false);
    const [completed, setCompleted] = useState<string[]>([]);
    useEffect(() => {
        let active = true;
        async function boot() {
            const { data: auth } = await supabase.auth.getSession();
            const user = auth.session?.user;
            if (!user) {
                router.replace("/workspace");
                return;
            }
            const { data: membership } = await supabase.from("memberships").select("organization_id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
            if (!membership) {
                if (active)
                    setReady(true);
                return;
            }
            const { data: org } = await supabase.from("organizations").select("name,org_type").eq("id", membership.organization_id).maybeSingle();
            if (active && org) {
                setOrgName(org.name);
                setRole(org.org_type as OrgType);
            }
            if (active)
                setReady(true);
        }
        void boot();
        return () => { active = false; };
    }, [router]);
    useEffect(() => {
        if (!ready || typeof window === "undefined")
            return;
        try {
            const parsed = JSON.parse(window.localStorage.getItem(progressKey(role)) ?? "[]");
            setCompleted(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
        }
        catch {
            setCompleted([]);
        }
    }, [ready, role]);
    const steps = useMemo(() => GUIDE[role], [role]);
    const learnedCount = steps.filter((step) => completed.includes(step.id)).length;
    const learnedPercent = steps.length ? Math.round((learnedCount / steps.length) * 100) : 0;
    function persist(next: string[]) {
        setCompleted(next);
        try {
            window.localStorage.setItem(progressKey(role), JSON.stringify(next));
        }
        catch { /* local progress is optional */ }
    }
    function toggleStep(id: string) {
        persist(completed.includes(id) ? completed.filter((item) => item !== id) : [...completed, id]);
    }
    function resetProgress() { persist([]); }
    return (<UiNode as="main" style={ui.page}>
      <WorkspaceLauncher />
      <style>{`
        *{box-sizing:border-box}
        .guide-card{transition:transform var(--dy-motion-fast,150ms) ease,border-color var(--dy-motion-fast,150ms) ease,background var(--dy-motion-fast,150ms) ease}
        .guide-card:hover{transform:translateY(calc(var(--dy-motion-distance,8px) * -.25));border-color:var(--dy-accent,#6de2cf)!important}
        @media(max-width:820px){.guide-grid,.guide-shortcuts{grid-template-columns:1fr!important}.guide-head{flex-direction:column;align-items:flex-start!important}.guide-progress{grid-template-columns:1fr!important}}
      `}</style>

      <UiNode as="header" className="guide-head" style={ui.header}>
        <UiNode as="div">
          <Link href="/" style={ui.back}>← DentAYA</Link>
          <UiNode as="p" style={ui.eyebrow}>ÖĞRENİM & KULLANIM REHBERİ</UiNode>
          <UiNode as="h1" style={ui.title}>DentAYA&apos;yı adım adım kullan.</UiNode>
          <UiNode as="p" style={ui.subtitle}>
            <UiMessage source="{0} için rolüne uygun gerçek iş akışını gösterir. Her şeyi aynı anda öğrenmek yerine doğru modülü doğru sırada açarsın." values={[orgName]} userValues={[0]}/>
          </UiNode>
        </UiNode>
        <UiNode as="div" style={ui.roleBadge}>{ready ? roleLabel(role) : "Hazırlanıyor…"}</UiNode>
      </UiNode>

      <UiNode as="section" className="guide-progress" style={ui.progressPanel}>
        <UiNode as="div">
          <UiNode as="p" style={ui.eyebrow}>ÖĞRENİM İLERLEMESİ</UiNode>
          <UiNode as="strong" style={ui.progressTitle}><UiMessage source="{0}/{1} adım tamamlandı" values={[learnedCount,steps.length]} userValues={[0,1]}/></UiNode>
          <UiNode as="span" style={ui.progressText}>Bu işaretler yalnız bu cihazdaki öğrenim durumunu tutar; klinik veya vaka verisini değiştirmez.</UiNode>
        </UiNode>
        <UiNode as="div" style={ui.progressRight}>
          <UiNode as="div" style={ui.progressTrack}><UiNode as="span" style={{ ...ui.progressFill, width: `${learnedPercent}%` }}/></UiNode>
          <UiNode as="strong" style={ui.progressPercent}>%{learnedPercent}</UiNode>
          <UiNode as="button" type="button" onClick={resetProgress} disabled={!completed.length} style={{ ...ui.ghostButton, opacity: completed.length ? 1 : .5 }}>İlerlemeyi Sıfırla</UiNode>
        </UiNode>
      </UiNode>

      <UiNode as="section" style={ui.principle}>
        <UiNode as="strong">Temel çalışma kuralı</UiNode>
        <UiNode as="span">
          Klinik hasta ve klinik kararı yönetir. Laboratuvar dijital tasarım ve üretim akışını yönetir. Kurye yalnız fiziksel teslimat görevini görür. AYA kararın yerine geçmez; operasyonel bağlamı özetler ve sonraki adımı önerir.
        </UiNode>
      </UiNode>

      <UiNode as="section" style={ui.section}>
        <UiNode as="div" style={ui.sectionHead}>
          <UiNode as="div">
            <UiNode as="p" style={ui.eyebrow}>ROLÜNE GÖRE AKIŞ</UiNode>
            <UiNode as="h2" style={ui.h2}><UiMessage source="{0} başlangıç yolu" values={[roleLabel(role)]}/></UiNode>
          </UiNode>
          <UiNode as="span" style={ui.muted}><UiMessage source="{0} adım" values={[steps.length]} userValues={[0]}/></UiNode>
        </UiNode>
        <UiNode as="div" className="guide-grid" style={ui.grid}>
          {steps.map((step, index) => {
            const done = completed.includes(step.id);
            return (<UiNode as="article" key={step.id} className="guide-card" style={{ ...ui.card, ...(done ? ui.cardDone : {}) }}>
                <UiNode as="div" style={ui.cardTop}>
                  <UiNode as="div" style={{ ...ui.stepNo, ...(done ? ui.stepNoDone : {}) }}>{done ? "✓" : String(index + 1).padStart(2, "0")}</UiNode>
                  <UiNode as="button" type="button" onClick={() => toggleStep(step.id)} style={{ ...ui.learnButton, ...(done ? ui.learnButtonDone : {}) }}>
                    {done ? "Öğrenildi" : "Öğrendim"}
                  </UiNode>
                </UiNode>
                <UiNode as="div">
                  <UiNode as="h3" style={ui.cardTitle}>{step.title}</UiNode>
                  <UiNode as="p" style={ui.cardText}>{step.text}</UiNode>
                </UiNode>
                <Link href={step.href} style={ui.cardLink}>{step.action} →</Link>
              </UiNode>);
        })}
        </UiNode>
      </UiNode>

      <UiNode as="section" style={ui.section}>
        <UiNode as="div" style={ui.sectionHead}>
          <UiNode as="div">
            <UiNode as="p" style={ui.eyebrow}>HIZLI ÖĞREN</UiNode>
            <UiNode as="h2" style={ui.h2}>En önemli dört alan</UiNode>
          </UiNode>
        </UiNode>
        <UiNode as="div" className="guide-shortcuts" style={ui.shortcuts}>
          <Shortcut title="AYA Copilot" text="Vaka bağlamını özetler, eksik bilgiyi ve sıradaki operasyonel adımı gösterir." href="/ai"/>
          <Shortcut title={uiText("Vakalar")} text="Detaylı vaka listesi yalnız burada. Lobi ve merkez ekranları vaka listesiyle doldurulmaz." href="/cases"/>
          <Shortcut title={uiText("Tarama Stüdyosu")} text="STL/PLY içe aktarma, mesh kontrolü ve vaka/hasta bağlantısı için kullanılır." href="/scan-studio"/>
          <Shortcut title={uiText("Ayarlar")} text="Profil, tema, hareket, bildirim, kurum ve sistem davranışlarını yönetir." href="/settings"/>
        </UiNode>
      </UiNode>

      <UiNode as="section" style={ui.help}>
        <UiNode data-dy-copy-stack as="div">
          <UiNode as="strong">Takıldığında ne yapmalısın?</UiNode>
          <UiNode as="span">Önce AYA&apos;ya sor; sonra Bildirimler ve ilgili modülü aç. Teknik kontrol gerekiyorsa Sistem Kontrolü&apos;nü kullan.</UiNode>
        </UiNode>
        <UiNode as="div" style={ui.helpActions}>
          <Link href="/ai" style={ui.primary}>AYA&apos;ya Sor</Link>
          <Link href="/pilot-check" style={ui.secondary}>Sistem Kontrolü</Link>
          <Link href="/release-check" style={ui.secondary}>Release Check</Link>
        </UiNode>
      </UiNode>
    </UiNode>);
}
function Shortcut({ title, text, href }: {
    title: string;
    text: string;
    href: string;
}) {
    return <Link href={href} className="guide-card" style={ui.shortcut}><UiNode as="strong">{title}</UiNode><UiNode as="span">{text}</UiNode><UiNode as="b">Aç →</UiNode></Link>;
}
function roleLabel(role: OrgType) { return role === "clinic" ? "Klinik Kullanıcısı" : role === "laboratory" ? "Laboratuvar Kullanıcısı" : "Kurye Kullanıcısı"; }
const ui: Record<string, CSSProperties> = {
    page: { minHeight: "100vh", padding: "24px clamp(18px,4vw,52px) 64px", background: dy.bg, color: dy.text, fontFamily: dy.fontFamily, fontSize: 15 },
    header: { maxWidth: 1320, margin: "0 auto 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24 },
    back: { color: dy.muted, textDecoration: "none", fontSize: 13 }, eyebrow: { margin: "14px 0 7px", color: dy.accent, fontSize: 12, fontWeight: 900, letterSpacing: ".15em" },
    title: { maxWidth: 900, margin: "0 0 9px", fontSize: "clamp(38px,5vw,64px)", letterSpacing: "-.05em", lineHeight: 1.02 }, subtitle: { maxWidth: 820, margin: 0, color: dy.muted, lineHeight: 1.65 },
    roleBadge: { padding: "10px 13px", borderRadius: 999, border: `1px solid ${dy.border}`, background: dy.accentSoft, color: dy.accent, fontWeight: 900, whiteSpace: "nowrap" },
    progressPanel: { maxWidth: 1320, margin: "0 auto 12px", padding: 16, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(260px,.55fr)", gap: 20, alignItems: "center", border: `1px solid ${dy.border}`, borderRadius: 16, background: dy.surface },
    progressTitle: { display: "block", fontSize: 20 }, progressText: { display: "block", marginTop: 5, color: dy.muted, fontSize: 13, lineHeight: 1.5 }, progressRight: { display: "grid", gridTemplateColumns: "minmax(120px,1fr) auto", gap: 10, alignItems: "center" }, progressTrack: { height: 9, overflow: "hidden", borderRadius: 999, background: dy.input, border: `1px solid ${dy.border}` }, progressFill: { display: "block", height: "100%", borderRadius: 999, background: dy.accent, transition: "width var(--dy-motion-normal,240ms) ease" }, progressPercent: { color: dy.accent, fontSize: 13 }, ghostButton: { gridColumn: "1/-1", justifySelf: "end", minHeight: 34, padding: "0 10px", borderRadius: 9, border: `1px solid ${dy.border}`, background: dy.surface2, color: dy.muted, fontWeight: 800, cursor: "pointer" },
    principle: { maxWidth: 1320, margin: "0 auto 16px", padding: 16, display: "grid", gap: 6, border: `1px solid ${dy.border}`, borderRadius: 16, background: `linear-gradient(135deg,${dy.surface},${dy.accentSoft})`, color: dy.muted, lineHeight: 1.6 },
    section: { maxWidth: 1320, margin: "0 auto 18px" }, sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 14, marginBottom: 10 }, h2: { margin: 0, fontSize: 28, letterSpacing: "-.03em" }, muted: { color: dy.muted, fontSize: 13 },
    grid: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }, card: { minHeight: 210, padding: 18, display: "grid", gridTemplateRows: "auto 1fr auto", gap: 12, border: `1px solid ${dy.border}`, borderRadius: 18, background: dy.surface }, cardDone: { borderColor: dy.accent, background: `linear-gradient(145deg,${dy.surface},${dy.accentSoft})` }, cardTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }, stepNo: { width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 12, background: dy.accentSoft, color: dy.accent, fontWeight: 950 }, stepNoDone: { background: dy.accent, color: dy.accentContrast }, learnButton: { minHeight: 34, padding: "0 10px", borderRadius: 9, border: `1px solid ${dy.border}`, background: dy.surface2, color: dy.muted, fontWeight: 850, cursor: "pointer" }, learnButtonDone: { borderColor: dy.accent, color: dy.accent, background: dy.accentSoft }, cardTitle: { margin: "0 0 7px", fontSize: 20 }, cardText: { margin: 0, color: dy.muted, lineHeight: 1.6 }, cardLink: { color: dy.accent, textDecoration: "none", fontWeight: 900 },
    shortcuts: { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }, shortcut: { minHeight: 170, padding: 16, display: "grid", alignContent: "space-between", gap: 10, border: `1px solid ${dy.border}`, borderRadius: 16, background: dy.surface, color: dy.text, textDecoration: "none" },
    help: { maxWidth: 1320, margin: "0 auto", padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", border: `1px solid ${dy.border}`, borderRadius: 16, background: dy.surface2, color: dy.muted }, helpActions: { display: "flex", gap: 8, flexWrap: "wrap" },
    primary: { minHeight: 40, display: "inline-grid", placeItems: "center", padding: "0 13px", borderRadius: 10, background: dy.accent, color: dy.accentContrast, textDecoration: "none", fontWeight: 900 }, secondary: { minHeight: 40, display: "inline-grid", placeItems: "center", padding: "0 13px", borderRadius: 10, border: `1px solid ${dy.border}`, background: dy.surface, color: dy.text, textDecoration: "none", fontWeight: 850 },
};
