"use client";
import { useEffect } from "react";
import { workflowText } from "./i18n/workflow-safety";

/** Browser/Electron close protection; route-specific switches still confirm locally. */
export function useUnsavedChanges(dirty: boolean, locale: string) {
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const confirmLeave = () => window.confirm(workflowText(locale, "Kaydedilmemiş değişiklikler var. Bu ekrandan ayrılmak istiyor musunuz?"));
    const beforeProgrammaticNavigation = (event: Event) => { if (!confirmLeave()) event.preventDefault(); };
    const beforeNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.download || (anchor.target && anchor.target !== "_self")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin === window.location.origin && destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      if (!confirmLeave()) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("dentaya:before-navigation", beforeProgrammaticNavigation);
    document.addEventListener("click", beforeNavigation, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); window.removeEventListener("dentaya:before-navigation", beforeProgrammaticNavigation); document.removeEventListener("click", beforeNavigation, true); };
  }, [dirty, locale]);
}
