"use client";
import UiNode from "@/lib/i18n/UiNode";
import Image from "next/image";
import { useCustomization } from "./customization";
import { useEffect, useSyncExternalStore } from "react";
export const LOGO_OPTIONS = [
    { id: "01", name: "DENTAYA", description: "Simge ve yazı" },
    { id: "02", name: "Dental Arch", description: "Diş arkı" },
    { id: "03", name: "CAD Geometry", description: "CAD geometrisi" },
    { id: "06", name: "Crown", description: "Altın restorasyon", },
    { id: "09", name: "Bağ", description: "Klinik ve laboratuvar" },
    { id: "12", name: "Kalkan", description: "Dengeli amblem" },
    { id: "13", name: "Zirve", description: "Keskin A monogramı" },
    { id: "18", name: "Köprü", description: "Birbirine bağlı birimler" },
] as const;
export type LogoId = (typeof LOGO_OPTIONS)[number]["id"];
const STORAGE_KEY = "dentaya-logo-choice";
export const logoFiles: Record<LogoId, string> = {
    "01": "01_dental_form", "02": "02_dental_arch", "03": "03_cad_geometry",
    "06": "06_crown",
    "09": "09_link",
    "12": "12_shield",
    "13": "13_apex",
    "18": "18_bridge",
};
let currentLogo: LogoId = "01";
let initialized = false;
let storageFailed = false;
const listeners = new Set<() => void>();
const isLogo = (value: unknown): value is LogoId => LOGO_OPTIONS.some(option => option.id === value);
const legacyLogos: Record<string, LogoId> = {
    "04": "03", "05": "09", "07": "03", "08": "02", "10": "01",
    "11": "18", "14": "03", "15": "12", "16": "09", "17": "02",
};
export function normalizeBrandLogo(value: unknown): LogoId | null {
    if (isLogo(value)) return value;
    return typeof value === "string" && Object.hasOwn(legacyLogos, value) ? legacyLogos[value] : null;
}
function getLogo(): LogoId {
    if (!initialized) {
        initialized = true;
        try {
            const saved = window.localStorage.getItem(STORAGE_KEY);
            const normalized = normalizeBrandLogo(saved);
            if (normalized) {
                currentLogo = normalized;
                if (saved !== normalized) window.localStorage.setItem(STORAGE_KEY, normalized);
            }
        }
        catch {
            storageFailed = true;
        }
    }
    return currentLogo;
}
function handleStorage(event: StorageEvent) {
    if (event.key !== STORAGE_KEY && event.key !== null)
        return;
    currentLogo = normalizeBrandLogo(event.newValue) ?? "01";
    listeners.forEach(listener => listener());
}
function subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1)
        window.addEventListener("storage", handleStorage);
    return () => {
        listeners.delete(listener);
        if (!listeners.size)
            window.removeEventListener("storage", handleStorage);
    };
}
export function useBrandLogo(): LogoId {
    return useSyncExternalStore(subscribe, getLogo, () => "01");
}
export function chooseBrandLogo(id: LogoId): boolean {
    if (!isLogo(id))
        return false;
    initialized = true;
    currentLogo = id;
    try {
        window.localStorage.setItem(STORAGE_KEY, id);
        storageFailed = false;
    }
    catch {
        storageFailed = true;
    }
    listeners.forEach(listener => listener());
    return !storageFailed;
}
export function useBrandIconRuntime(route: string | null) {
    const id = useBrandLogo();
    useEffect(() => {
        const links = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]');
        const href = `/logos/${logoFiles[id]}_icon.svg?brand=38-premium`;
        if (links.length)
            links.forEach(link => { link.href = href; link.type = "image/svg+xml"; });
        else {
            const link = document.createElement("link");
            link.rel = "icon";
            link.href = href;
            link.type = "image/svg+xml";
            document.head.appendChild(link);
        }
    }, [id, route]);
}
export function BrandLogo({ width, height, priority = false }: {
    width: number;
    height: number;
    priority?: boolean;
}) {
    const file = logoFiles[useBrandLogo()];
    const custom = useCustomization();
    const h = Math.round(height * custom.logoScale / 100);
    const w = custom.logoMode === "icon" ? h : Math.round(width * custom.logoScale / 100);
    if (custom.logoMode === "icon")
        return <UiNode as="span" className="brand-lockup" data-logo-mode="icon"><Image src={`/logos/${file}_icon.svg?brand=38-premium`} alt="DENTAYA" width={w} height={h} priority={priority}/></UiNode>;
    const suffix = custom.logoMode === "word" ? "_word" : "";
    return <UiNode as="span" className="brand-lockup" data-logo-mode={custom.logoMode}>
    <Image className="brand-logo-dark" src={`/logos/${file}${suffix}.svg?brand=38-premium`} alt="DENTAYA" width={w} height={h} priority={priority}/>
    <Image className="brand-logo-light" src={`/logos/${file}${suffix}_light.svg?brand=38-premium`} alt="DENTAYA" width={w} height={h} priority={priority}/>
  </UiNode>;
}
export function BrandIcon({ width, height }: {
    width: number;
    height: number;
}) {
    const file = logoFiles[useBrandLogo()];
    return <Image src={`/logos/${file}_icon.svg?brand=38-premium`} alt="" width={width} height={height}/>;
}
