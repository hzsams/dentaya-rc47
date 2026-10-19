"use client";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import DentalBreakRuntime from './loading-play/DentalBreakRuntime';
import LoadingReadingRuntime from './loading-play/LoadingReadingRuntime';
import LanguagePackRuntime from "./LanguagePackRuntime";
import LanguageRuntime from "./LanguageRuntime";
import { LanguageSelect } from "./LanguageSettings";
import ExperienceRuntime from "./ExperienceRuntime";
import WorkspaceChrome from "./WorkspaceChrome";
import { useEffect, useState, type ReactNode } from "react";
import { useDentayaThemeRuntime } from "@/app/dentaya-theme";
import { useCustomizationRuntime } from "./customization";
import { useBrandIconRuntime } from "@/app/BrandLogo";
import { usePathname } from "next/navigation";
import { supabaseConfiguration } from "@/lib/supabase";
import { reportOperationalEvent } from "@/lib/operational-telemetry";
export default function AppRuntime({ children }: {
    children: ReactNode;
}) {
    const { t: uiText } = useTranslation();
    useDentayaThemeRuntime();
    useCustomizationRuntime();
    const pathname = usePathname();
    useBrandIconRuntime(pathname);
    const [online, setOnline] = useState(true);
    const [reconnected, setReconnected] = useState(false);
    useEffect(() => {
        let offlineStartedAt: number | null = null;
        let reconnectTimer: number | null = null;
        const handleOffline = () => {
            offlineStartedAt = Date.now();
            setOnline(false);
            setReconnected(false);
        };
        const handleOnline = () => {
            const downtimeMs = offlineStartedAt ? Date.now() - offlineStartedAt : 0;
            setOnline(true);
            window.dispatchEvent(new CustomEvent("dentaya-network-restored"));
            if (downtimeMs >= 5000) {
                setReconnected(true);
                void reportOperationalEvent({
                    eventType: "network_recovered",
                    severity: "info",
                    source: "network",
                    message: "İstemci ağ bağlantısı yeniden kuruldu.",
                    route: window.location.pathname,
                    details: { downtimeMs },
                });
                reconnectTimer = window.setTimeout(() => setReconnected(false), 4000);
            }
            offlineStartedAt = null;
        };
        const handleWindowError = (event: ErrorEvent) => {
            void reportOperationalEvent({
                eventType: "browser_error",
                severity: "error",
                source: "client",
                message: event.message || "Tarayıcı hatası",
                route: window.location.pathname,
                details: { filename: event.filename, line: event.lineno, column: event.colno },
            });
        };
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason;
            const message = reason instanceof Error ? reason.message : String(reason ?? "Unhandled promise rejection");
            void reportOperationalEvent({
                eventType: "unhandled_rejection",
                severity: "error",
                source: "client",
                message,
                route: window.location.pathname,
            });
        };
        if (!window.navigator.onLine)
            handleOffline();
        else
            setOnline(true);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        window.addEventListener("error", handleWindowError);
        window.addEventListener("unhandledrejection", handleUnhandledRejection);
        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("error", handleWindowError);
            window.removeEventListener("unhandledrejection", handleUnhandledRejection);
            if (reconnectTimer)
                window.clearTimeout(reconnectTimer);
        };
    }, []);
    return (<>
      <LanguageRuntime /><LanguagePackRuntime /><LanguageSelect compact/><ExperienceRuntime />
      {!supabaseConfiguration.isConfigured && pathname !== "/" ? (<UiNode as="div" className="runtime-notice runtime-notice--setup" role="status">
          <UiNode as="strong">Kurulum tamamlanmalı</UiNode>
          <UiNode as="span">
            Supabase bağlantı bilgilerini <UiNode as="code">.env.local</UiNode> dosyasına ekleyin.
          </UiNode>
        </UiNode>) : null}
      {!online ? (<UiNode as="div" className="runtime-notice runtime-notice--offline" role="status">
          <UiNode as="strong">{uiText("Çevrimdışısınız")}</UiNode>
          <UiNode as="span">Bağlantı gelene kadar yeni işlemler kaydedilemez; açık ekranı incelemeye devam edebilirsiniz.</UiNode>
        </UiNode>) : null}
      {online && reconnected ? (<UiNode as="div" className="runtime-notice" role="status">
          <UiNode as="strong">{uiText("Bağlantı geri geldi")}</UiNode>
          <UiNode as="span">DentAYA yeniden çevrimiçi. İşlemlere devam edebilirsiniz.</UiNode>
        </UiNode>) : null}
      <UiNode as="div" id="main-content" className="app-content" tabIndex={-1}>
        <WorkspaceChrome>{children}</WorkspaceChrome>
        <LoadingReadingRuntime/>
        <DentalBreakRuntime/>
      </UiNode>
    </>);
}
