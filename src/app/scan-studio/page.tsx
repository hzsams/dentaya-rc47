import UiNode from "@/lib/i18n/UiNode";
import { Suspense } from "react";
import ScanStudioClient from "./ScanStudioClient";
export default function ScanStudioPage() {
    return (<Suspense fallback={<ScanStudioLoading />}>
      <ScanStudioClient />
    </Suspense>);
}
function ScanStudioLoading() {
    return (<UiNode as="main" style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            background: "var(--dy-bg, #07131d)",
            color: "var(--dy-muted, #8ba0af)",
            fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}>
      <UiNode data-dy-copy-stack as="div" style={{
            width: "min(520px, calc(100% - 32px))",
            padding: "24px",
            borderRadius: "16px",
            border: "1px solid var(--dy-border, #29465d)",
            background: "var(--dy-panel-surface, var(--dy-surface, #0b1c28))",
            textAlign: "center",
        }}>
        <UiNode as="strong" style={{
            display: "block",
            color: "var(--dy-text, #f2f6f8)",
            fontSize: "18px",
            marginBottom: "6px",
        }}>
          DentAYA Tarama Stüdyosu
        </UiNode>
        <UiNode as="span">Tarama çalışma alanı hazırlanıyor…</UiNode>
      </UiNode>
    </UiNode>);
}
