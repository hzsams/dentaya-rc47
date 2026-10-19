// New Atelier captions use explicit English fallback outside Turkish.
// Existing application captions continue to use the bundled language packs.
const names = {
    "01": "DENTAYA", "02": "Dental Arch", "03": "CAD Geometry", "04": "Scan",
    "05": "Yörünge", "06": "Crown", "07": "Prizma", "08": "Dalga", "09": "Bağ",
    "10": "Işık", "11": "Katman", "12": "Kalkan", "13": "Zirve", "14": "Kristal",
    "15": "Odak", "16": "Akış", "17": "Lotus", "18": "Köprü",
};
const tr = {
    atelier: "DENTAYA ATELIER", collection: "18 / KOLEKSİYON",
    artworkAlt: "DENTAYA zümrüt, porselen ve şampanya yüzeyli kabartmalı marka koleksiyonu",
    intro: "İşlenmiş yüzeyler, dengeli oranlar ve size ait bir DENTAYA imzası.",
    empty: "Aramanızla eşleşen logo yok.", names,
    materials: { "Zümrüt": "Zümrüt", "Yeşim": "Yeşim", "Titanyum": "Titanyum", "Şampanya": "Şampanya" },
    descriptions: {
        "01": "İşlenmiş zümrüt yüzey ve şampanya kenar", "02": "Diş arkı ve yumuşak yeşim yansımaları",
        "03": "Hassas geometri ve titanyum yüzey", "04": "Tarama çerçevesi ve merkez kristali",
        "05": "Eksenler etrafında dengeli bağlantı", "06": "Restorasyon tacı ve sıcak metal tonları",
        "07": "Üç yüzeyli hacim ve derinlik", "08": "Kesintisiz dental form akışı",
        "09": "Klinik ve laboratuvar için DA monogramı", "10": "Çok yönlü ışık ve simetrik odak",
        "11": "Üst üste işlenmiş üç yüzey", "12": "DENTAYA imzalı koruyucu amblem",
        "13": "Keskin A monogramı ve metal kenarlar", "14": "Fasetli elmas ve şampanya ışığı",
        "15": "Halka içinde hassas merkez", "16": "Karşılıklı hareket ve iş birliği",
        "17": "Doğal yapraklar ve dengeli oranlar", "18": "Birbirine bağlı birimler ve ortak zemin",
    },
};
const en = {
    atelier: "DENTAYA ATELIER", collection: "18 / COLLECTION",
    artworkAlt: "DENTAYA dimensional identity collection in emerald, porcelain and champagne",
    intro: "Crafted surfaces, balanced proportions and a DENTAYA signature of your own.",
    empty: "No logos match your search.",
    names: {...names, "05": "Orbit", "07": "Prism", "08": "Wave", "09": "Link", "10": "Lumen", "11": "Layer", "12": "Shield", "13": "Apex", "14": "Crystal", "15": "Focus", "16": "Flow", "18": "Bridge"},
    materials: { "Zümrüt": "Emerald", "Yeşim": "Jade", "Titanyum": "Titanium", "Şampanya": "Champagne" },
    descriptions: {
        "01": "Crafted emerald surface with champagne edges", "02": "Dental arch with soft jade reflections",
        "03": "Precise geometry with a titanium finish", "04": "Scan frame with a crystal centre",
        "05": "Balanced connections around shared axes", "06": "Restoration crown in warm metal tones",
        "07": "Three-dimensional prism with distinct faces", "08": "Continuous flow inspired by dental form",
        "09": "DA monogram connecting clinic and laboratory", "10": "Multidirectional light and symmetric focus",
        "11": "Three precisely stacked surfaces", "12": "Protective emblem with the DENTAYA signature",
        "13": "Sharp A monogram with metallic edges", "14": "Faceted diamond in champagne light",
        "15": "A precise centre within a balanced ring", "16": "Reciprocal movement and collaboration",
        "17": "Natural petals and balanced proportions", "18": "Connected units on shared foundations",
    },
};
export function premiumBrandCopy(locale: string) { return locale === "tr" ? tr : en; }
export function brandLogoDescription(id: keyof typeof names) { return tr.descriptions[id]; }
