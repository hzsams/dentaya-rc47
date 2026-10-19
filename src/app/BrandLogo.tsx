"use client";
import UiNode from "@/lib/i18n/UiNode";
import Image from "next/image";
import { useCustomization } from "./customization";
import { useEffect, useSyncExternalStore } from "react";
import { brandLogoDescription } from "@/lib/i18n/brand";
export const LOGO_OPTIONS = [
    { id: "01", name: "DENTAYA", description: brandLogoDescription("01"), material: "Zümrüt" },
    { id: "02", name: "Dental Arch", description: brandLogoDescription("02"), material: "Yeşim" },
    { id: "03", name: "CAD Geometry", description: brandLogoDescription("03"), material: "Titanyum" },
    { id: "04", name: "Scan", description: brandLogoDescription("04"), material: "Titanyum" },
    { id: "05", name: "Yörünge", description: brandLogoDescription("05"), material: "Zümrüt" },
    { id: "06", name: "Crown", description: brandLogoDescription("06"), material: "Şampanya" },
    { id: "07", name: "Prizma", description: brandLogoDescription("07"), material: "Yeşim" },
    { id: "08", name: "Dalga", description: brandLogoDescription("08"), material: "Zümrüt" },
    { id: "09", name: "Bağ", description: brandLogoDescription("09"), material: "Şampanya" },
    { id: "10", name: "Işık", description: brandLogoDescription("10"), material: "Şampanya" },
    { id: "11", name: "Katman", description: brandLogoDescription("11"), material: "Titanyum" },
    { id: "12", name: "Kalkan", description: brandLogoDescription("12"), material: "Zümrüt" },
    { id: "13", name: "Zirve", description: brandLogoDescription("13"), material: "Titanyum" },
    { id: "14", name: "Kristal", description: brandLogoDescription("14"), material: "Şampanya" },
    { id: "15", name: "Odak", description: brandLogoDescription("15"), material: "Yeşim" },
    { id: "16", name: "Akış", description: brandLogoDescription("16"), material: "Yeşim" },
    { id: "17", name: "Lotus", description: brandLogoDescription("17"), material: "Şampanya" },
    { id: "18", name: "Köprü", description: brandLogoDescription("18"), material: "Zümrüt" },
] as const;
export type LogoId = (typeof LOGO_OPTIONS)[number]["id"];
export const BRAND_ASSET_VERSION = "premium-2";
const STORAGE_KEY = "dentaya-logo-choice";
export const logoFiles: Record<LogoId, string> = {
    "01": "01_dental_form", "02": "02_dental_arch", "03": "03_cad_geometry",
    "04": "04_scan", "05": "05_orbit", "06": "06_crown", "07": "07_prism", "08": "08_wave",
    "09": "09_link", "10": "10_spark", "11": "11_layer", "12": "12_shield", "13": "13_apex",
    "14": "14_diamond", "15": "15_focus", "16": "16_flow", "17": "17_petal", "18": "18_bridge",
};
let currentLogo: LogoId = "01";
let initialized = false;
let storageFailed = false;
const listeners = new Set<() => void>();
const isLogo = (value: unknown): value is LogoId => LOGO_OPTIONS.some(option => option.id === value);
export function normalizeBrandLogo(value: unknown): LogoId | null {
    return isLogo(value) ? value : null;
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
        const href = `/logos/${logoFiles[id]}_icon.svg?brand=${BRAND_ASSET_VERSION}`;
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
        return <UiNode as="span" className="brand-lockup" data-logo-mode="icon"><Image src={`/logos/${file}_icon.svg?brand=${BRAND_ASSET_VERSION}`} alt="DENTAYA" width={w} height={h} priority={priority}/></UiNode>;
    const suffix = custom.logoMode === "word" ? "_word" : "";
    return <UiNode as="span" className="brand-lockup" data-logo-mode={custom.logoMode}>
    <Image className="brand-logo-dark" src={`/logos/${file}${suffix}.svg?brand=${BRAND_ASSET_VERSION}`} alt="DENTAYA" width={w} height={h} priority={priority}/>
    <Image className="brand-logo-light" src={`/logos/${file}${suffix}_light.svg?brand=${BRAND_ASSET_VERSION}`} alt="DENTAYA" width={w} height={h} priority={priority}/>
  </UiNode>;
}
export function BrandIcon({ width, height }: {
    width: number;
    height: number;
}) {
    const file = logoFiles[useBrandLogo()];
    return <Image src={`/logos/${file}_icon.svg?brand=${BRAND_ASSET_VERSION}`} alt="" width={width} height={height}/>;
}
