"use client";
import {updateCadWorkspace} from '@/lib/cad-workspace-preferences';
import { useEffect, useSyncExternalStore } from "react";

export const COLOR_PALETTES = [
  ["reference-midnight", "Neon Midnight", "#121747", "#1a2154", "#00b9f2"],
  ["reference-graphite", "Graphite Turquoise", "#0c0d0e", "#2d2e33", "#10adb1"],
  ["reference-turquoise", "Deep Turquoise", "#082a30", "#103d45", "#16cdb8"],
  ["reference-coral", "Deep Coral", "#2b1621", "#422433", "#ff7198"],
  ["studio-graphite", "Studio Graphite", "#12181e", "#1d2831", "#9fc5d9"],
  ["studio-steel", "Studio Steel", "#e9eef2", "#fafdff", "#355c73"],
  ["studio-ink", "Studio Ink", "#121c2a", "#1c2d42", "#b6cce6"],
  ["mineral-jade", "Mineral Jade", "#12231f", "#1c3730", "#a7d1bc"],
  ["mineral-pearl", "Mineral Pearl", "#eff1e8", "#fbfcf7", "#496457"],
  ["mineral-lagoon", "Mineral Lagoon", "#0e262c", "#193b43", "#a6d9d3"],
  ["heritage-oxford", "Heritage Oxford", "#181f1c", "#28392f", "#dfcc9d"],
  ["heritage-burgundy", "Heritage Burgundy", "#2a191f", "#40282f", "#e2c4b4"],
  ["heritage-brass", "Heritage Brass", "#f0e7d7", "#fff8ec", "#735b2f"],
  ["contrast-ivory", "Contrast Ivory", "#f8f7ef", "#ffffff", "#254b50"],
  ["contrast-midnight", "Contrast Midnight", "#090f15", "#17232e", "#e5cf80"],
  ["contrast-petrol", "Contrast Petrol", "#081d21", "#12343c", "#e1e9bb"],
  ["carbon", "Karbon", "#101215", "#1c2026", "#b9c6d7"],
  ["lagoon", "Lagün", "#081d22", "#10343a", "#60e0c1"],
  ["royal", "Kraliyet", "#171228", "#29203e", "#bd9cf0"],
  ["copper", "Bakır", "#211712", "#36271f", "#e7a36c"],
  ["cherry", "Vişne", "#25131b", "#3c202c", "#f1a2bb"],
  ["pine", "Çam", "#122019", "#21382c", "#aad7a7"],
  ["denim", "Denim", "#101c30", "#1c304a", "#91baff"],
  ["espresso", "Espresso", "#1c1917", "#322c26", "#d8c4a3"],
  ["porcelain", "Porselen", "#f5f7fa", "#ffffff", "#376698"],
  ["seafoam", "Deniz köpüğü", "#eaf8f3", "#f8fffc", "#246f5c"],
  ["lilac", "Leylak", "#f4effb", "#fffcff", "#79549d"],
  ["apricot", "Kayısı", "#fff1e5", "#fffbf5", "#a35323"],
  ["ice", "Buz", "#edf7fb", "#fbfeff", "#286b83"],
  ["linen", "Keten", "#f4f0e6", "#fffdf5", "#706335"],
  ["petal", "Gül yaprağı", "#fcf0f4", "#fffaff", "#9c4568"],
  ["olive", "Zeytin", "#f0f3e8", "#fcfef8", "#566b34"],
] as const;
export const ACCENT_COLORS = [
  "#7bdccb","#30bfa5","#188879","#17615b","#9be7c6","#4fbd88","#28754c","#b5d88a",
  "#93dff2","#47b4e0","#2587b6","#205a83","#99c5ff","#5896ef","#3466bc","#234079",
  "#c7b4f2","#a58adf","#8860b8","#68428e","#dfb1ef","#be77d1","#a044aa","#732b73",
  "#f5b5cf","#e887ae","#cb5686","#9e325f","#ffb4a7","#ef8274","#c9554e","#903930",
  "#f5ce8f","#e9b45e","#c38b34","#936122","#f5df94","#d6be67","#a8923b","#736128",
  "#d5dfe8","#a6b8c7","#788e9e","#4b616e","#d9ccbc","#b8a188","#90765a","#66513e",
] as const;
export const FONT_OPTIONS = {
  system: "Sistem", humanist: "Segoe UI", classic: "Georgia", mono: "Consolas", rounded: "Trebuchet",
} as const;
const FONTS = {
  system: "system-ui, sans-serif", humanist: "'Segoe UI', Arial, sans-serif",
  classic: "Georgia, 'Times New Roman', serif", mono: "Consolas, 'Courier New', monospace",
  rounded: "'Trebuchet MS', Arial, sans-serif",
};
export type Customization = {
  appearancePreset: string | null;
  style: string; lineHeight: number; controlSize: "normal" | "comfortable"; stripedRows: boolean; strongFocus: boolean;
  palette: string; accent: string | null; background: string | null; panel: string | null;
  font: keyof typeof FONT_OPTIONS; textScale: number; corners: number | null;
  shadow: "theme" | "none" | "soft" | "strong";
  buttons: "theme" | "square" | "rounded" | "pill";
  logoMode: "full" | "icon" | "word"; logoScale: number;
};
export const DEFAULT_CUSTOMIZATION: Customization = {
  appearancePreset: null,
  style: "custom", lineHeight: 1.5, controlSize: "normal", stripedRows: false, strongFocus: true,
  palette: "theme", accent: null, background: null, panel: null, font: "system", textScale: 100,
  corners: null, shadow: "theme", buttons: "theme", logoMode: "full", logoScale: 100,
};
export const INTERFACE_STYLES: {id:string;name:string;description:string;colors:[string,string,string];patch:Partial<Customization>}[] = [
 {id:'old-money',name:'Old Money',description:'Fildişi, orman yeşili ve klasik tipografi.',colors:['#ede9de','#faf7ef','#294e3d'],patch:{background:'#ede9de',panel:'#faf7ef',accent:'#294e3d',font:'classic',corners:6,shadow:'soft',buttons:'square'}},
 {id:'retro',name:'Retro',description:'Sıcak kâğıt, pas turuncusu ve belirgin çerçeveler.',colors:['#e7dfcc','#fff5df','#8e3d25'],patch:{background:'#e7dfcc',panel:'#fff5df',accent:'#8e3d25',font:'mono',corners:3,shadow:'strong',buttons:'square'}},
 {id:'atelier',name:'Atelier',description:'Keten yüzeyler, bakır detaylar ve sade kartlar.',colors:['#eee8e1','#fffaf4','#815438'],patch:{background:'#eee8e1',panel:'#fffaf4',accent:'#815438',font:'humanist',corners:12,shadow:'soft',buttons:'rounded'}},
 {id:'nordic',name:'Nordic',description:'Açık gri, mavi ve ferah köşeler.',colors:['#edf1f2','#ffffff','#356576'],patch:{background:'#edf1f2',panel:'#ffffff',accent:'#356576',font:'system',corners:20,shadow:'none',buttons:'rounded'}},
 {id:'noir',name:'Noir',description:'Kömür siyahı, gümüş ve keskin geometri.',colors:['#101113','#1c1e21','#cad0d8'],patch:{background:'#101113',panel:'#1c1e21',accent:'#cad0d8',font:'humanist',corners:4,shadow:'none',buttons:'square'}},
 {id:'botanical',name:'Botanical',description:'Adaçayı tonları ve yumuşak hatlar.',colors:['#e7eee4','#f7faf3','#3d6446'],patch:{background:'#e7eee4',panel:'#f7faf3',accent:'#3d6446',font:'rounded',corners:24,shadow:'soft',buttons:'pill'}},
 {id:'blueprint',name:'Blueprint',description:'Lacivert çalışma masası ve teknik tipografi.',colors:['#111f30','#192d43','#9ccbea'],patch:{background:'#111f30',panel:'#192d43',accent:'#9ccbea',font:'mono',corners:4,shadow:'none',buttons:'square'}},
 {id:'editorial',name:'Editorial',description:'Beyaz sayfa, bordo vurgu ve klasik yazı.',colors:['#f0eeeb','#ffffff','#813d4b'],patch:{background:'#f0eeeb',panel:'#ffffff',accent:'#813d4b',font:'classic',corners:0,shadow:'none',buttons:'square'}},
 {id:'japandi',name:'Japandi',description:'Taş, keten ve koyu zeytin; sakin bir masa.',colors:['#e7e3d9','#f7f3e9','#555a3c'],patch:{background:'#e7e3d9',panel:'#f7f3e9',accent:'#555a3c',font:'humanist',corners:8,shadow:'soft',buttons:'square'}},
 {id:'art-deco',name:'Art Deco',description:'Gece yeşili, pirinç ve geometrik çerçeveler.',colors:['#102721','#18362d','#d7bc79'],patch:{background:'#102721',panel:'#18362d',accent:'#d7bc79',font:'classic',corners:2,shadow:'strong',buttons:'square'}},
 {id:'riviera',name:'Riviera',description:'Kırık beyaz ve deniz mavisi.',colors:['#eaf0ef','#fcfcf6','#27617a'],patch:{background:'#eaf0ef',panel:'#fcfcf6',accent:'#27617a',font:'humanist',corners:14,shadow:'soft',buttons:'rounded'}},
 {id:'espresso',name:'Espresso',description:'Koyu kahve, sıcak krem ve bakır.',colors:['#221c19','#322820','#e1b987'],patch:{background:'#221c19',panel:'#322820',accent:'#e1b987',font:'classic',corners:10,shadow:'soft',buttons:'rounded'}},
 {id:'lavender',name:'Lavender',description:'Açık lavanta ve mürekkep moru.',colors:['#eeeaf5','#faf8ff','#665081'],patch:{background:'#eeeaf5',panel:'#faf8ff',accent:'#665081',font:'rounded',corners:22,shadow:'soft',buttons:'pill'}},
 {id:'terracotta',name:'Terracotta',description:'Kum, kiremit ve doğal yüzeyler.',colors:['#eee3d7','#fff6ea','#984d38'],patch:{background:'#eee3d7',panel:'#fff6ea',accent:'#984d38',font:'humanist',corners:14,shadow:'none',buttons:'rounded'}},
 {id:'ice',name:'Ice',description:'Buz beyazı, temiz çizgiler ve koyu turkuaz.',colors:['#e9f3f4','#ffffff','#216370'],patch:{background:'#e9f3f4',panel:'#ffffff',accent:'#216370',font:'system',corners:8,shadow:'none',buttons:'square'}},
 {id:'cobalt',name:'Cobalt',description:'Koyu lacivert ve elektrik mavisi detaylar.',colors:['#111b31','#1b2b47','#91b9ff'],patch:{background:'#111b31',panel:'#1b2b47',accent:'#91b9ff',font:'mono',corners:6,shadow:'soft',buttons:'square'}},
];
export function selectInterfaceStyle(id:string) {
 const preset=INTERFACE_STYLES.find(item=>item.id===id);
 if(!preset)return false;
 updateCadWorkspace({background:'theme'});
 return updateCustomization({palette:'theme',...preset.patch,style:id,appearancePreset:`style:${id}`});
}
const KEY = "dentaya:customization-v1";
let state = DEFAULT_CUSTOMIZATION;
let initialized = false;
const listeners = new Set<() => void>();
const hex = (v: unknown): v is string => typeof v === "string" && /^#[a-f0-9]{6}$/i.test(v);
const bounded = (v: unknown, min: number, max: number, fallback: number) => typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
export function validateCustomization(input: unknown): Customization {
  const v = input && typeof input === "object" ? input as Partial<Customization> : {};
  return {
    appearancePreset: typeof v.appearancePreset==='string' && /^(theme|style|palette):[a-z-]+$/.test(v.appearancePreset) ? v.appearancePreset : null,
    style: INTERFACE_STYLES.some(p=>p.id===v.style) ? v.style! : 'custom',
    lineHeight: bounded(v.lineHeight,1.3,1.9,1.5), controlSize:v.controlSize==='comfortable'?'comfortable':'normal',
    stripedRows:v.stripedRows===true, strongFocus:v.strongFocus!==false,
    palette: COLOR_PALETTES.some(p => p[0] === v.palette) ? v.palette! : "theme",
    accent: hex(v.accent) ? v.accent : null, background: hex(v.background) ? v.background : null,
    panel: hex(v.panel) ? v.panel : null,
    font: v.font && Object.hasOwn(FONT_OPTIONS, v.font) ? v.font : "system",
    textScale: bounded(v.textScale, 90, 125, 100), corners: v.corners === null || v.corners === undefined ? null : bounded(v.corners, 0, 28, 15),
    shadow: ["none", "soft", "strong"].includes(v.shadow ?? "") ? v.shadow! : "theme",
    buttons: ["square", "rounded", "pill"].includes(v.buttons ?? "") ? v.buttons! : "theme",
    logoMode: v.logoMode === "icon" || v.logoMode === "word" ? v.logoMode : "full",
    logoScale: bounded(v.logoScale, 80, 125, 100),
  };
}
function read(): Customization {
  try { return validateCustomization(JSON.parse(window.localStorage.getItem(KEY) || "{}")); }
  catch { return DEFAULT_CUSTOMIZATION; }
}
function get() {
  if (!initialized && typeof window !== "undefined") { state = read(); initialized = true; }
  return state;
}
export function readCustomization() { return get(); }
function onStorage(e: StorageEvent) {
  if (e.key !== KEY && e.key !== null) return;
  state = read(); initialized = true; applyCustomization(); listeners.forEach(fn => fn());
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => { listeners.delete(fn); if (!listeners.size) window.removeEventListener("storage", onStorage); };
}
export function useCustomization() { return useSyncExternalStore(subscribe, get, () => DEFAULT_CUSTOMIZATION); }
export function updateCustomization(patch: Partial<Customization>): boolean {
  state = validateCustomization({ ...get(), ...patch }); initialized = true;
  let saved = true;
  try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch { saved = false; }
  applyCustomization(); listeners.forEach(fn => fn()); return saved;
}
export function resetCustomization() { return updateCustomization(DEFAULT_CUSTOMIZATION); }

function rgb(hex: string) { return [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)); }
function mix(a: string, b: string, w: number) { const aa=rgb(a),bb=rgb(b); return '#'+aa.map((v,i)=>Math.round(v*(1-w)+bb[i]*w).toString(16).padStart(2,'0')).join(''); }
function luminance(color: string) { const a=rgb(color).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return a[0]*.2126+a[1]*.7152+a[2]*.0722; }
export function contrastText(color: string) { return luminance(color) > .179 ? "#000000" : "#ffffff"; }
const TRACKED = ["bg","surface","surface2","border","text","muted","accent","accent-soft","accent-contrast","input","panel-surface","panel-surface-2","font-family","font-body","font-small","font-label","radius","shadow"];
let baseline: Record<string,string> | null = null;
let baseScheme = "dark";
let contrastNotice = "";
export function customizationNotice() { return contrastNotice; }
function contrast(a: string, b: string) { const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
export function applyCustomization(captureBase = false) {
  if (typeof document === "undefined") return;
  const root=document.documentElement, s=root.style, value=get();
  if (captureBase || !baseline) {
    baseline=Object.fromEntries(TRACKED.map(key=>[key,s.getPropertyValue('--dy-'+key)]));
    baseScheme=s.colorScheme || "dark";
  }
  for (const [key,val] of Object.entries(baseline)) { if(val)s.setProperty('--dy-'+key,val);else s.removeProperty('--dy-'+key); }
  const preset=COLOR_PALETTES.find(p=>p[0]===value.palette);
  const bg=value.background ?? preset?.[2] ?? baseline.bg;
  const panel=value.panel ?? preset?.[3] ?? baseline.surface;
  const accent=value.accent ?? preset?.[4] ?? baseline.accent;
  const set=(k:string,v:string)=>s.setProperty('--dy-'+k,v);
  contrastNotice = "";
  const changedSurface=Boolean(preset || value.background || value.panel);
  if (changedSurface && hex(bg) && hex(panel)) {
    const light=luminance(panel)>.179;
    const score=(color:string)=>Math.min(contrast(color,bg),contrast(color,panel));
    const text=score("#000000")>score("#ffffff")?"#000000":"#ffffff";
    if(score(text)<4.5)contrastNotice="Arka plan ve panel çok farklı açıklıkta. Okunabilirlik için birbirine yakın açıklıkta renkler seçin.";
    set('bg',bg);set('surface',panel);set('surface2',mix(panel,text,.045));
    set('panel-surface',panel);set('panel-surface-2',mix(panel,text,.045));
    set('border',mix(panel,text,.22));set('text',text);set('muted',mix(panel,text,.72));set('input',mix(panel,bg,.5));
    root.dataset.dyColorFamily=light?'light':'dark';s.colorScheme=light?'light':'dark';
  } else { root.dataset.dyColorFamily=baseScheme.includes('light')?'light':'dark';s.colorScheme=baseScheme; }
  if (hex(accent) && hex(panel)) { set('accent',accent);set('accent-soft',mix(panel,accent,.18));set('accent-contrast',contrastText(accent)); }
  set('custom-text-scale', String(value.textScale/100));
  if(value.font!=='system')set('font-family',FONTS[value.font]);
  for(const k of ['body','small','label']) { const n=parseFloat(baseline['font-'+k]);if(Number.isFinite(n))set('font-'+k,`${n*value.textScale/100}px`); }
  if(value.corners!==null)set('radius',`${value.corners}px`);
  root.dataset.dyCustomCorners=value.corners===null?'false':'true';
  root.dataset.dyButtonShape=value.buttons;
  root.dataset.dyInterfaceStyle=value.style;
  root.dataset.dyControlSize=value.controlSize;
  root.dataset.dyStripedRows=String(value.stripedRows);
  root.dataset.dyStrongFocus=String(value.strongFocus);
  set('reading-line-height',String(value.lineHeight));
  root.dataset.dyShadow=value.shadow;
  window.dispatchEvent(new Event('dentaya-customization-change'));
  if(value.shadow!=='theme')set('shadow',value.shadow==='none'?'transparent':value.shadow==='soft'?'rgba(0,0,0,.12)':'rgba(0,0,0,.38)');
}
export function useCustomizationRuntime() {
  const value=useCustomization();
  useEffect(()=>{applyCustomization();},[value]);
}
