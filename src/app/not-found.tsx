"use client";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import Link from "@/lib/i18n/UiLink";
import { dy, useDentayaThemeRuntime } from "@/app/dentaya-theme";
export default function NotFound() {
    const { t: uiText } = useTranslation();
    useDentayaThemeRuntime();
    return (<UiNode as="main" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: dy.bg, color: dy.text, fontFamily: "Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <UiNode as="section" style={{ width: "min(620px,100%)", padding: 24, border: `1px solid ${dy.border}`, borderRadius: 18, background: dy.surface, textAlign: "center" }}>
        <UiNode as="p" style={{ margin: "0 0 8px", color: dy.accent, fontWeight: 900, letterSpacing: ".14em", fontSize: 12 }}>404</UiNode>
        <UiNode as="h1" style={{ margin: "0 0 9px", fontSize: "clamp(34px,6vw,58px)" }}>Bu sayfa bulunamadı</UiNode>
        <UiNode as="p" style={{ margin: "0 auto 18px", maxWidth: 500, color: dy.muted, lineHeight: 1.6 }}>Bağlantı eski olabilir veya bu çalışma alanı hesabın için mevcut olmayabilir.</UiNode>
        <UiNode as="div" style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          <Link href="/" style={{ minHeight: 42, display: "inline-grid", placeItems: "center", padding: "0 14px", borderRadius: 10, background: dy.accent, color: dy.accentContrast, textDecoration: "none", fontWeight: 900 }}>{uiText("Ana Sayfa")}</Link>
          <Link href="/cases" style={{ minHeight: 42, display: "inline-grid", placeItems: "center", padding: "0 14px", borderRadius: 10, border: `1px solid ${dy.border}`, background: dy.surface2, color: dy.text, textDecoration: "none", fontWeight: 850 }}>{uiText("Vakalar")}</Link>
        </UiNode>
      </UiNode>
    </UiNode>);
}
