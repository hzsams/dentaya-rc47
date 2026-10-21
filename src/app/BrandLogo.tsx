"use client";
import UiNode from "@/lib/i18n/UiNode";
import Image from "next/image";
import { useCustomization } from "./customization";
import { useEffect, useSyncExternalStore } from "react";
import { BRAND_LOGOS, BRAND_MATERIALS, BRAND_ASSET_VERSION, type BrandLogoId } from "@/lib/brand-catalog";
export { BRAND_ASSET_VERSION };
export type LogoId = BrandLogoId;
export const LOGO_OPTIONS = BRAND_LOGOS.map(logo => ({
    id: logo.id, name: logo.name.tr, description: logo.description.tr,
    material: BRAND_MATERIALS[logo.material].tr,
}));
const STORAGE_KEY = "dentaya-logo-choice";
export const logoFiles = Object.fromEntries(BRAND_LOGOS.map(logo => [logo.id, logo.file])) as Record<LogoId, string>;
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
