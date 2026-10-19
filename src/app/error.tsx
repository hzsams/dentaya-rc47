"use client";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect } from "react";
import Link from "@/lib/i18n/UiLink";
import { devError } from "@/lib/dev-log";
import { reportOperationalEvent } from "@/lib/operational-telemetry";
import { dy, useDentayaThemeRuntime } from "@/app/dentaya-theme";
import { professionalShellText } from '@/lib/i18n/professional-shell';
export default function GlobalError({ error, reset }: {
    error: Error & {
        digest?: string;
    };
    reset: () => void;
}) {
    const { t: uiText, locale } = useTranslation();
    const copy = professionalShellText(locale);
    useDentayaThemeRuntime();
    useEffect(() => {
        devError("DentAYA route error", error);
        void reportOperationalEvent({
            eventType: "route_error",
            severity: "critical",
            source: "route",
            message: error.message || "Route render error",
            errorCode: error.digest ?? null,
            route: typeof window !== "undefined" ? window.location.pathname : null,
            details: { digest: error.digest ?? null },
        });
    }, [error]);
    return (<UiNode as="main" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: dy.bg, color: dy.text, fontFamily: "Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <UiNode as="section" style={{ width: "min(640px,100%)", padding: 24, border: `1px solid ${dy.border}`, borderRadius: 18, background: dy.surface }}>
        <UiNode as="p" style={{ margin: "0 0 8px", color: "#e8bd73", fontWeight: 900, letterSpacing: ".13em", fontSize: 12 }}>BEKLENMEYEN HATA</UiNode>
        <UiNode as="h1" style={{ margin: "0 0 9px", fontSize: "clamp(30px,5vw,48px)" }}>Bu ekran tamamlanamadı</UiNode>
        <UiNode as="p" translateChildren={false} style={{ margin: "0 0 18px", color: dy.muted, lineHeight: 1.6 }}>{copy.failed}</UiNode>
        {error.digest && <UiNode as="p" translateChildren={false}>{copy.supportReference}: <UiNode as="code">{error.digest}</UiNode></UiNode>}
        <UiNode as="div" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <UiNode as="button" type="button" onClick={reset} style={{ minHeight: 42, padding: "0 14px", border: 0, borderRadius: 10, background: dy.accent, color: dy.accentContrast, fontWeight: 900, cursor: "pointer" }}>{uiText("Tekrar Dene")}</UiNode>
          <Link href="/" style={{ minHeight: 42, display: "inline-grid", placeItems: "center", padding: "0 14px", borderRadius: 10, border: `1px solid ${dy.border}`, background: dy.surface2, color: dy.text, textDecoration: "none", fontWeight: 850 }}>{uiText("Ana Sayfa")}</Link>
        </UiNode>
      </UiNode>
    </UiNode>);
}
