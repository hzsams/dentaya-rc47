import catalog from "../../electron/brand-catalog.json";

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type NonZeroDigit = Exclude<Digit, "0">;
export type BrandLogoId = `0${NonZeroDigit}` | `${NonZeroDigit}${Digit}` | `1${"0" | "1"}${Digit}` | "120";
export type BrandMaterial = keyof typeof catalog.materials;

// The same committed catalog drives SVG exports and the packaged Electron
// allowlist. Saved IDs 01–18 retain their original file stems.
export const BRAND_ASSET_VERSION = catalog.version;
export const BRAND_LOGOS = catalog.logos.map(logo => ({
    ...logo, id: logo.id as BrandLogoId, material: logo.material as BrandMaterial,
}));
export const BRAND_MATERIALS = catalog.materials;
