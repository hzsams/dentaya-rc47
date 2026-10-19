"use client";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useState, type CSSProperties, } from "react";
import { supabase } from "@/lib/supabase";
import { dy } from "@/app/dentaya-theme";
import WorkspaceLauncher from "@/app/WorkspaceLauncher";
export default function ConnectionStatus() {
    const { t: uiText } = useTranslation();
    const [online, setOnline] = useState(true);
    const [restored, setRestored] = useState(false);
    useEffect(() => {
        const initial = typeof navigator === "undefined"
            ? true
            : navigator.onLine;
        setOnline(initial);
        let timer: ReturnType<typeof setTimeout> | null = null;
        function onOffline() {
            setOnline(false);
            setRestored(false);
        }
        function onOnline() {
            setOnline(true);
            setRestored(true);
            try {
                supabase.realtime.connect();
            }
            catch {
                // Realtime client retries itself; banner still gives manual retry.
            }
            window.dispatchEvent(new CustomEvent("dentaya-network-restored"));
            if (timer) {
                clearTimeout(timer);
            }
            timer = setTimeout(() => setRestored(false), 3000);
        }
        window.addEventListener("offline", onOffline);
        window.addEventListener("online", onOnline);
        return () => {
            window.removeEventListener("offline", onOffline);
            window.removeEventListener("online", onOnline);
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, []);
    function retry() {
        if (typeof navigator !==
            "undefined" &&
            !navigator.onLine) {
            return;
        }
        try {
            supabase.realtime.connect();
        }
        catch {
            // Page reload below is the final recovery path.
        }
        window.location.reload();
    }
    const showBanner = !online || restored;
    return (<>
      <WorkspaceLauncher />

      <style>{`
        @media(max-width:560px){
          .dentaya-connection{
            grid-template-columns:10px minmax(0,1fr)!important;
          }
          .dentaya-connection button{
            grid-column:2;
            width:100%;
          }
        }
      `}</style>
    {showBanner && (<UiNode as="aside" className="dentaya-connection" role="status" aria-live="polite" style={{
                ...styles.banner,
                borderColor: online
                    ? "rgba(99,204,152,.5)"
                    : "rgba(232,189,115,.55)",
            }}>
      <UiNode as="span" style={{
                ...styles.dot,
                background: online
                    ? "#63cc98"
                    : "#e8bd73",
            }}/>

      <UiNode data-dy-copy-stack as="div" style={styles.copy}>
        <UiNode as="strong">
          {online
                ? uiText("Bağlantı geri geldi")
                : "İnternet bağlantısı kesildi"}
        </UiNode>

        <UiNode as="span">
          {online
                ? "Canlı veriler yeniden bağlanıyor."
                : "Kaydetme ve canlı takip işlemleri bağlantı gelene kadar bekleyebilir."}
        </UiNode>
      </UiNode>

      {!online && (<UiNode as="button" type="button" onClick={retry} style={styles.button}>
          {uiText(" Tekrar Dene ")}</UiNode>)}
    </UiNode>)}
    </>);
}
const styles: Record<string, CSSProperties> = {
    banner: {
        position: "fixed",
        zIndex: 2000,
        left: "50%",
        bottom: 18,
        width: "min(620px,calc(100vw - 28px))",
        transform: "translateX(-50%)",
        display: "grid",
        gridTemplateColumns: "10px minmax(0,1fr) auto",
        alignItems: "center",
        gap: 10,
        padding: "11px 12px",
        border: "1px solid",
        borderRadius: 13,
        background: dy.surface,
        color: dy.text,
        boxShadow: `0 18px 50px ${dy.shadow}`,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 999,
    },
    copy: {
        minWidth: 0,
        display: "grid",
        gap: 2,
        fontSize: 13,
    },
    button: {
        minHeight: 36,
        padding: "0 10px",
        border: `1px solid ${dy.border}`,
        borderRadius: 9,
        background: dy.surface2,
        color: dy.text,
        fontWeight: 850,
        cursor: "pointer",
    },
};
