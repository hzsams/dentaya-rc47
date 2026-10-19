"use client";
import UiMessage from "@/lib/i18n/UiMessage";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "@/lib/i18n/UiLink";
import ConnectionStatus from "@/app/ConnectionStatus";
import { dy, useDentayaThemeRuntime } from "@/app/dentaya-theme";
import { DENTAYA_RELEASE } from "@/lib/release";
import { supabase } from "@/lib/supabase";
type CheckStatus = "pass" | "warn" | "fail";
type Check = {
    id: string;
    label: string;
    detail: string;
    status: CheckStatus;
};
type ManualGate = {
    id: string;
    title: string;
    detail: string;
};
const MANUAL_GATES: ManualGate[] = [
    { id: "build", title: "Production build", detail: "npm.cmd run build yerel projede hatasız tamamlandı." },
    { id: "clinic-lab", title: "Klinik → Lab pilot akışı", detail: "Klinik vaka oluşturdu, laboratuvar işi gördü ve rol sınırları doğru çalıştı." },
    { id: "scan-cad", title: "Scan + CAD + Review", detail: "STL/PLY içe aktarma, DentAYA Design ve klinik review akışı gerçek pilot senaryoda denendi." },
    { id: "finance", title: "Finans veri sınırı", detail: "Lab maliyeti ile kliniğin hasta fiyatı ayrı kaldı; laboratuvar hasta fiyatını görmedi." },
    { id: "delivery", title: "Kurye / teslimat", detail: "Gönderi oluşturma, durum ilerletme ve teslim kapanışı test edildi." },
    { id: "responsive", title: "Görsel QA", detail: "Lobi, klinik, lab, vaka, AYA, CAD, scan ve ayarlar laptop + dar ekranda kontrol edildi." },
    { id: "staging", title: "Staging smoke test", detail: "Vercel/staging ortamında auth, veri okuma/yazma ve ana rotalar yeniden kontrol edildi." },
];
const GATE_STORAGE_KEY = "dentaya:rc20-manual-gates";
export default function ReleaseCheckPage() {
    const { t: uiText } = useTranslation();
    useDentayaThemeRuntime();
    const [checks, setChecks] = useState<Check[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [manualDone, setManualDone] = useState<string[]>([]);
    useEffect(() => {
        try {
            const parsed = JSON.parse(window.localStorage.getItem(GATE_STORAGE_KEY) ?? "[]");
            setManualDone(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
        }
        catch {
            setManualDone([]);
        }
    }, []);
    useEffect(() => {
        let active = true;
        async function run() {
            const result: Check[] = [];
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
            const exposedServiceRole = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
            result.push({ id: "env-url", label: "Supabase URL", detail: supabaseUrl ? "Public Supabase URL mevcut." : "NEXT_PUBLIC_SUPABASE_URL eksik.", status: supabaseUrl ? "pass" : "fail" });
            result.push({ id: "env-anon", label: "Supabase client key", detail: anonKey ? "Public anon/publishable key mevcut." : "Supabase public client key eksik.", status: anonKey ? "pass" : "fail" });
            result.push({ id: "service-role", label: "Service-role sızıntısı", detail: exposedServiceRole ? "Kritik: service-role key NEXT_PUBLIC_ değişkeninde görünüyor." : "Client ortamında service-role key görünmüyor.", status: exposedServiceRole ? "fail" : "pass" });
            const online = typeof navigator === "undefined" ? true : navigator.onLine;
            result.push({ id: "network", label: "Ağ", detail: online ? "Tarayıcı çevrimiçi." : "İnternet bağlantısı yok.", status: online ? "pass" : "warn" });
            const webgl = detectWebGl();
            result.push({ id: "webgl", label: "WebGL", detail: webgl ? "3D görüntüleme için WebGL hazır." : "WebGL kullanılamıyor; CAD/scan ekranları çalışmayabilir.", status: webgl ? "pass" : "fail" });
            const ayaStatus = await fetch("/api/ai-assistant", { cache: "no-store" })
                .then(async (response) => response.ok ? await response.json() : { enabled: false, model: null })
                .catch(() => ({ enabled: false, model: null }));
            result.push({ id: "aya", label: "AYA Copilot", detail: ayaStatus.enabled ? `Bulut model bağlı · ${ayaStatus.model ?? "model"}` : "AYA Core çalışabilir; bulut model kapalı veya yapılandırılmamış.", status: "pass" });
            const host = typeof window === "undefined" ? "" : window.location.host;
            result.push({ id: "host", label: "Release host", detail: host || "Host belirlenemedi.", status: host.includes("localhost") || host.includes("127.0.0.1") ? "warn" : "pass" });
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            const user = sessionData.session?.user;
            result.push({ id: "auth", label: "Oturum", detail: user ? `Oturum aktif · ${user.email ?? user.id}` : sessionError ? sessionError.message : "Aktif oturum yok.", status: user ? "pass" : "warn" });
            if (user) {
                const { data: membership, error: membershipError } = await supabase
                    .from("memberships")
                    .select("organization_id,role")
                    .eq("user_id", user.id)
                    .eq("status", "active")
                    .limit(1)
                    .maybeSingle();
                result.push({ id: "membership", label: "Aktif üyelik", detail: membership ? `${membership.role} rolü aktif.` : membershipError ? membershipError.message : "Aktif kurum üyeliği yok.", status: membership ? "pass" : "warn" });
                if (membership) {
                    const { data: org, error: orgError } = await supabase
                        .from("organizations")
                        .select("id,name,org_type,demo_mode")
                        .eq("id", membership.organization_id)
                        .maybeSingle();
                    result.push({ id: "organization", label: "Çalışma alanı", detail: org ? `${org.name} · ${org.org_type}${org.demo_mode ? " · sentetik demo" : ""}` : orgError ? orgError.message : "Kurum okunamadı.", status: org ? "pass" : "fail" });
                    const moduleChecks = await Promise.all([
                        tableAccess("cases", "Vakalar"),
                        tableAccess("scan_sessions", "Tarama kayıtları"),
                        tableAccess("design_projects", "DentAYA Design"),
                        tableAccess("case_design_reviews", "Tasarım review"),
                        tableAccess("lab_case_quotes", "Lab fiyatları"),
                        tableAccess("shipments", "Lojistik"),
                        tableAccess("ai_sessions", "AYA geçmişi"),
                    ]);
                    result.push(...moduleChecks);
                }
            }
            if (active) {
                setChecks(result);
                setLoading(false);
            }
        }
        void run();
        return () => { active = false; };
    }, []);
    const blockers = useMemo(() => checks.filter((item) => item.status === "fail"), [checks]);
    const warnings = useMemo(() => checks.filter((item) => item.status === "warn"), [checks]);
    const manualMissing = MANUAL_GATES.filter((gate) => !manualDone.includes(gate.id));
    const automaticPass = !loading && blockers.length === 0;
    const freezeReady = automaticPass && manualMissing.length === 0;
    const manualPercent = Math.round((manualDone.filter((id) => MANUAL_GATES.some((gate) => gate.id === id)).length / MANUAL_GATES.length) * 100);
    function toggleGate(id: string) {
        const next = manualDone.includes(id) ? manualDone.filter((item) => item !== id) : [...manualDone, id];
        setManualDone(next);
        try {
            window.localStorage.setItem(GATE_STORAGE_KEY, JSON.stringify(next));
        }
        catch { /* local sign-off only */ }
    }
    async function copyReport() {
        const report = [
            `DentAYA ${DENTAYA_RELEASE.version}`,
            `Channel: ${DENTAYA_RELEASE.channel}`,
            `Target: ${DENTAYA_RELEASE.targetLabel}`,
            `Automatic blockers: ${blockers.length}`,
            `Warnings: ${warnings.length}`,
            `Manual gates: ${MANUAL_GATES.length - manualMissing.length}/${MANUAL_GATES.length}`,
            ...checks.map((item) => `${item.status.toUpperCase()} · ${item.label} · ${item.detail}`),
            ...MANUAL_GATES.map((gate) => `${manualDone.includes(gate.id) ? "DONE" : "OPEN"} · ${gate.title}`),
        ].join("\n");
        try {
            await navigator.clipboard.writeText(report);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        }
        catch {
            setCopied(false);
        }
    }
    return (<UiNode as="main" style={ui.page}>
      <ConnectionStatus />
      <style>{`
        *{box-sizing:border-box}
        @media(max-width:820px){.release-summary{grid-template-columns:repeat(2,minmax(0,1fr))!important}.release-grid{grid-template-columns:1fr!important}.release-header{align-items:flex-start!important}.release-actions{width:100%!important}}
        @media(max-width:520px){.release-summary{grid-template-columns:1fr!important}}
      `}</style>

      <UiNode as="header" className="release-header" style={ui.header}>
        <UiNode as="div">
          <Link href="/" style={ui.back}>← DentAYA</Link>
          <UiNode as="p" style={ui.eyebrow}>PRODUCTION RELEASE CANDIDATE</UiNode>
          <UiNode as="h1" style={ui.title}>Üretim hazırlık kontrolü.</UiNode>
          <UiNode as="p" style={ui.subtitle}>{DENTAYA_RELEASE.buildLabel} · {DENTAYA_RELEASE.version} · {DENTAYA_RELEASE.channel}</UiNode>
        </UiNode>
        <UiNode as="div" className="release-actions" style={ui.actions}>
          <UiNode as="button" type="button" onClick={() => void copyReport()} style={ui.secondary}>{copied ? "Kopyalandı" : "Raporu Kopyala"}</UiNode>
          <Link href="/pilot-flow" style={ui.primary}>Pilot Akışı</Link>
        </UiNode>
      </UiNode>

      <UiNode as="section" style={{ ...ui.freezeBanner, ...(freezeReady ? ui.freezeBannerReady : {}) }}>
        <UiNode as="div">
          <UiNode as="span" style={ui.freezeLabel}>{DENTAYA_RELEASE.targetLabel}</UiNode>
          <UiNode as="strong" style={ui.freezeTitle}>{loading ? "Kontroller çalışıyor…" : freezeReady ? "Üretim adayı için tüm kapılar işaretlendi." : "Üretim onayı öncesi açık işler var."}</UiNode>
          <UiNode as="p" style={ui.freezeText}>Otomatik teknik kontrol tek başına release onayı değildir. Build, pilot, rol sınırları ve staging smoke test ayrıca işaretlenir.</UiNode>
        </UiNode>
        <UiNode as="div" style={ui.freezeScore}>{freezeReady ? "READY" : <UiMessage source="{0}/{1}" values={[MANUAL_GATES.length - manualMissing.length, MANUAL_GATES.length]} userValues={[]}/>}</UiNode>
      </UiNode>

      <UiNode as="section" className="release-summary" style={ui.summary}>
        <Metric label="Bloker" value={String(blockers.length)} tone={blockers.length ? "fail" : "pass"}/>
        <Metric label="Uyarı" value={String(warnings.length)} tone={warnings.length ? "warn" : "pass"}/>
        <Metric label="Otomatik Kontrol" value={String(checks.length)} tone="neutral"/>
        <Metric label="Manuel Kabul" value={`%${manualPercent}`} tone={manualPercent === 100 ? "pass" : "warn"}/>
      </UiNode>

      <UiNode as="div" className="release-grid" style={ui.grid}>
        <UiNode as="section" style={ui.panel}>
          <UiNode as="div" style={ui.panelHead}>
            <UiNode data-dy-copy-stack as="div" className="dy-title-detail"><UiNode as="strong">Otomatik release gates</UiNode><UiNode as="span">Env, auth, RLS erişimi, WebGL ve ana veri yüzeyleri.</UiNode></UiNode>
            <UiNode as="span" style={{ ...ui.releaseBadge, color: blockers.length ? "#ff8b98" : "#63cc98" }}>{loading ? "KONTROL" : blockers.length ? "BLOKER VAR" : "TEKNİK GATE OK"}</UiNode>
          </UiNode>
          <UiNode as="div" style={ui.list}>
            {checks.map((item) => <CheckRow key={item.id} item={item}/>)}
            {!checks.length && loading ? <UiNode as="div" style={ui.loadingRow}>Kontroller hazırlanıyor…</UiNode> : null}
          </UiNode>
        </UiNode>

        <UiNode as="section" style={ui.panel}>
          <UiNode as="div" style={ui.panelHead}>
            <UiNode data-dy-copy-stack as="div" className="dy-title-detail"><UiNode as="strong">Manuel kabul kapıları</UiNode><UiNode as="span">Bunları yalnız gerçekten test ettikten sonra işaretle.</UiNode></UiNode>
            <UiNode as="span" style={ui.releaseBadge}>{MANUAL_GATES.length - manualMissing.length}/{MANUAL_GATES.length}</UiNode>
          </UiNode>
          <UiNode as="div" style={ui.gates}>
            {MANUAL_GATES.map((gate) => {
            const done = manualDone.includes(gate.id);
            return (<UiNode as="button" key={gate.id} type="button" onClick={() => toggleGate(gate.id)} style={{ ...ui.gate, ...(done ? ui.gateDone : {}) }}>
                  <UiNode as="span" style={{ ...ui.gateCheck, ...(done ? ui.gateCheckDone : {}) }}>{done ? "✓" : ""}</UiNode>
                  <UiNode data-dy-copy-stack as="span" className="dy-title-detail"><UiNode as="strong">{gate.title}</UiNode><UiNode as="small">{gate.detail}</UiNode></UiNode>
                </UiNode>);
        })}
          </UiNode>
        </UiNode>
      </UiNode>

      <UiNode as="section" style={ui.next}>
        <UiNode data-dy-copy-stack as="div">
          <UiNode as="strong">RC20 final doğrulama sırası</UiNode>
          <UiNode as="span">Build → Release Check → Pilot Flow → gerçek rol smoke test → staging → freeze.</UiNode>
        </UiNode>
        <UiNode as="div" style={ui.actions}>
          <Link href="/pilot-check" style={ui.secondaryLink}>Sistem Kontrolü</Link>
          <Link href="/pilot-flow" style={ui.secondaryLink}>Uçtan Uca Pilot</Link>
          <Link href="/start" style={ui.secondaryLink}>Öğrenim Rehberi</Link>
          <Link href="/settings" style={ui.secondaryLink}>{uiText("Ayarlar")}</Link>
        </UiNode>
      </UiNode>
    </UiNode>);
}
async function tableAccess(table: string, label: string): Promise<Check> {
    const { error } = await supabase.from(table).select("id", { head: true, count: "exact" }).limit(1);
    return { id: `table-${table}`, label, detail: error ? `Erişim kontrolü: ${error.message}` : "RLS kapsamındaki okuma sorgusu çalıştı.", status: error ? "warn" : "pass" };
}
function detectWebGl() {
    try {
        const canvas = document.createElement("canvas");
        return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    }
    catch {
        return false;
    }
}
function CheckRow({ item }: {
    item: Check;
}) {
    const color = item.status === "pass" ? "#63cc98" : item.status === "warn" ? "#e8bd73" : "#ff7487";
    return (<UiNode as="article" style={ui.row}>
      <UiNode as="span" style={{ ...ui.dot, background: color }}/>
      <UiNode data-dy-copy-stack as="div" className="dy-title-detail"><UiNode as="strong">{item.label}</UiNode><UiNode as="p" style={ui.detail}>{item.detail}</UiNode></UiNode>
      <UiNode as="b" style={{ color, fontSize: 12 }}>{item.status === "pass" ? "PASS" : item.status === "warn" ? "WARN" : "FAIL"}</UiNode>
    </UiNode>);
}
function Metric({ label, value, tone }: {
    label: string;
    value: string;
    tone: "pass" | "warn" | "fail" | "neutral";
}) {
    const { t: uiText } = useTranslation();
    const color = tone === "pass" ? "#63cc98" : tone === "warn" ? "#e8bd73" : tone === "fail" ? "#ff7487" : dy.text;
    return <UiNode as="div" style={ui.metric}><UiNode as="span">{uiText(label)}</UiNode><UiNode as="strong" style={{ color }}>{value}</UiNode></UiNode>;
}
const ui: Record<string, CSSProperties> = {
    page: { minHeight: "100vh", padding: "24px clamp(18px,4vw,52px) 64px", background: dy.bg, color: dy.text, fontFamily: dy.fontFamily },
    header: { maxWidth: 1320, margin: "0 auto 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }, back: { display: "inline-block", marginBottom: 12, color: dy.muted, textDecoration: "none", fontSize: 13 }, eyebrow: { margin: "0 0 7px", color: dy.accent, fontSize: 12, fontWeight: 900, letterSpacing: ".14em" }, title: { margin: 0, fontSize: "clamp(36px,6vw,60px)", letterSpacing: "-.05em", lineHeight: 1.02 }, subtitle: { margin: "8px 0 0", color: dy.muted }, actions: { display: "flex", gap: 8, flexWrap: "wrap" },
    primary: { minHeight: 42, display: "inline-grid", placeItems: "center", padding: "0 13px", borderRadius: 10, background: dy.accent, color: dy.accentContrast, textDecoration: "none", fontWeight: 900, fontSize: 13 }, secondary: { minHeight: 42, padding: "0 13px", border: `1px solid ${dy.border}`, borderRadius: 10, background: dy.surface, color: dy.text, fontWeight: 850, cursor: "pointer" }, secondaryLink: { minHeight: 40, display: "inline-grid", placeItems: "center", padding: "0 12px", border: `1px solid ${dy.border}`, borderRadius: 9, background: dy.surface2, color: dy.text, textDecoration: "none", fontWeight: 850, fontSize: 12 },
    freezeBanner: { maxWidth: 1320, margin: "0 auto 10px", padding: 17, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, flexWrap: "wrap", border: `1px solid ${dy.border}`, borderRadius: 16, background: `linear-gradient(135deg,${dy.surface},${dy.surface2})` }, freezeBannerReady: { borderColor: dy.accent, background: `linear-gradient(135deg,${dy.surface},${dy.accentSoft})` }, freezeLabel: { display: "block", marginBottom: 5, color: dy.accent, fontSize: 12, fontWeight: 950, letterSpacing: ".12em" }, freezeTitle: { display: "block", fontSize: 20 }, freezeText: { maxWidth: 850, margin: "5px 0 0", color: dy.muted, fontSize: 13, lineHeight: 1.55 }, freezeScore: { minWidth: 92, minHeight: 58, display: "grid", placeItems: "center", padding: "0 14px", borderRadius: 13, background: dy.input, border: `1px solid ${dy.border}`, color: dy.accent, fontWeight: 950 },
    summary: { maxWidth: 1320, margin: "0 auto 10px", display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }, metric: { minHeight: 90, padding: 13, display: "grid", alignContent: "center", gap: 4, border: `1px solid ${dy.border}`, borderRadius: 12, background: dy.surface, color: dy.muted },
    grid: { maxWidth: 1320, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(360px,.72fr)", gap: 10, alignItems: "start" }, panel: { padding: 14, display: "grid", gap: 12, border: `1px solid ${dy.border}`, borderRadius: 14, background: dy.surface }, panelHead: { display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", color: dy.muted, fontSize: 13 }, releaseBadge: { alignSelf: "flex-start", padding: "6px 8px", border: `1px solid ${dy.border}`, borderRadius: 999, background: dy.input, color: dy.accent, fontSize: 11, fontWeight: 950, letterSpacing: ".05em" }, list: { display: "grid", gap: 7 }, row: { minHeight: 70, padding: "10px 11px", display: "grid", gridTemplateColumns: "10px minmax(0,1fr) auto", alignItems: "center", gap: 10, border: `1px solid ${dy.border}`, borderRadius: 11, background: dy.surface2 }, dot: { width: 8, height: 8, borderRadius: 999 }, detail: { margin: "3px 0 0", color: dy.muted, fontSize: 12, lineHeight: 1.45 }, loadingRow: { padding: 18, color: dy.muted, textAlign: "center" },
    gates: { display: "grid", gap: 7 }, gate: { width: "100%", minHeight: 74, padding: 11, display: "grid", gridTemplateColumns: "28px minmax(0,1fr)", alignItems: "start", gap: 10, textAlign: "left", border: `1px solid ${dy.border}`, borderRadius: 11, background: dy.surface2, color: dy.text, cursor: "pointer" }, gateDone: { borderColor: dy.accent, background: dy.accentSoft }, gateCheck: { width: 25, height: 25, display: "grid", placeItems: "center", border: `1px solid ${dy.border}`, borderRadius: 8, background: dy.input, color: dy.accentContrast, fontWeight: 950 }, gateCheckDone: { background: dy.accent, borderColor: dy.accent },
    next: { maxWidth: 1320, margin: "10px auto 0", padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", border: `1px solid ${dy.border}`, borderRadius: 14, background: dy.surface2, color: dy.muted, fontSize: 13 },
};
