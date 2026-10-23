import { BRAND_LOGOS, BRAND_MATERIALS, type BrandLogoId } from "../brand-catalog";

// New captions use explicit English fallback outside Turkish.
function copy(locale: "tr" | "en") {
    return {
        atelier: "DENTAYA ATELIER",
        collection: `${BRAND_LOGOS.length} / ${locale === "tr" ? "KOLEKSİYON" : "COLLECTION"}`,
        artworkAlt: locale === "tr" ? `DENTAYA ${BRAND_LOGOS.length} özgün kabartmalı dental ve CAD logo koleksiyonu` : `DENTAYA collection of ${BRAND_LOGOS.length} original dimensional dental and CAD marks`,
        intro: locale === "tr" ? `${BRAND_LOGOS.length} özgün siluet. İşlenmiş yüzeyler, ışıklı kenarlar ve size ait bir DENTAYA imzası.` : `${BRAND_LOGOS.length} original silhouettes. Crafted surfaces, illuminated edges and a DENTAYA signature of your own.`,
        empty: locale === "tr" ? "Aramanızla eşleşen logo yok." : "No logos match your search.",
        names: Object.fromEntries(BRAND_LOGOS.map(logo => [logo.id, logo.name[locale]])) as Record<BrandLogoId, string>,
        descriptions: Object.fromEntries(BRAND_LOGOS.map(logo => [logo.id, logo.description[locale]])) as Record<BrandLogoId, string>,
        materials: Object.fromEntries(Object.values(BRAND_MATERIALS).map(material => [material.tr, material[locale]])) as Record<string, string>,
    };
}
const tr = copy("tr"), en = copy("en");
export function premiumBrandCopy(locale: string) { return locale === "tr" ? tr : en; }
export function brandLogoDescription(id: BrandLogoId) { return tr.descriptions[id]; }
