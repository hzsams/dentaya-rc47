"use client";

import { useEffect } from "react";
import { applyCustomization } from "./customization";
import { supabase } from "@/lib/supabase";
import {
  applyWorkspacePersonalization,
  loadWorkspacePersonalization,
} from "@/lib/dentaya-workspace-personalization";

export type DentayaTheme =
  | "midnight" | "ocean" | "emerald" | "violet" | "graphite" | "light"
  | "cobalt" | "aurora" | "rose" | "amber" | "frost" | "obsidian"
  | "teal" | "navy" | "sand" | "pearl" | "plum" | "slate"
  | "mint" | "sky" | "lavender" | "ivory" | "blush" | "sage";

export type MotionLevel = "full" | "reduced" | "off";
export type SurfaceStyle = "soft" | "solid" | "glass";
export type FontScale = "small" | "normal" | "large";

export type DentayaPreferences = {
  theme: DentayaTheme;
  motion_level: MotionLevel;
  compact_mode: boolean;
  surface_style: SurfaceStyle;
  font_scale: FontScale;
  custom_accent: string | null;
  use_custom_accent: boolean;
};

type Palette = {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  accentContrast: string;
  shadow: string;
  input: string;
};

export const THEME_OPTIONS: Array<{
  id: DentayaTheme;
  name: string;
  description: string;
  family: "dark" | "light";
  swatches: string[];
}> = [
  { id:"midnight", name:"DentAYA Studio", description:"Aydınlık klinik çalışma alanı", family:"light", swatches:["#ebe9f0","#ffffff","#72568f"] },
  { id:"ocean", name:"Ocean", description:"Klinik mavi ve canlı cyan", family:"dark", swatches:["#071520","#0b2634","#4cc9f0"] },
  { id:"emerald", name:"Emerald", description:"Sakin yeşil laboratuvar görünümü", family:"dark", swatches:["#071713","#0b241d","#66e0a3"] },
  { id:"violet", name:"Violet", description:"Teknolojik mor ve yumuşak kontrast", family:"dark", swatches:["#12101d","#1b1830","#b69cff"] },
  { id:"graphite", name:"Graphite", description:"Nötr ve profesyonel koyu palet", family:"dark", swatches:["#101315","#191d20","#78d5c8"] },
  { id:"light", name:"Light", description:"Aydınlık klinik çalışma alanı", family:"light", swatches:["#f3f7f7","#ffffff","#147c73"] },
  { id:"cobalt", name:"Cobalt", description:"Derin lacivert ve güçlü mavi", family:"dark", swatches:["#07101f","#0d1b31","#5f8cff"] },
  { id:"aurora", name:"Aurora", description:"Turkuaz-mor modern görünüm", family:"dark", swatches:["#09151a","#11252b","#70e4ce"] },
  { id:"rose", name:"Rose", description:"Sıcak bordo ve soft pembe", family:"dark", swatches:["#180d14","#28151f","#ff9fba"] },
  { id:"amber", name:"Amber", description:"Sıcak altın ve koyu kahve", family:"dark", swatches:["#171208","#251c0d","#f0bd5b"] },
  { id:"frost", name:"Frost", description:"Soğuk açık gri ve buz mavisi", family:"light", swatches:["#eef5f8","#ffffff","#2e7fa3"] },
  { id:"obsidian", name:"Obsidian", description:"Minimal siyah ve keskin turkuaz", family:"dark", swatches:["#08090b","#111317","#62e1cf"] },
  { id:"teal", name:"Teal Pro", description:"Dengeli koyu teal iş istasyonu", family:"dark", swatches:["#071716","#0c2624","#42d7c5"] },
  { id:"navy", name:"Navy", description:"Kurumsal lacivert ve açık mavi", family:"dark", swatches:["#08111e","#101e31","#6aa9ff"] },
  { id:"sand", name:"Sand", description:"Sıcak açık bej ve bakır vurgu", family:"light", swatches:["#f5f0e6","#fffaf1","#a96d31"] },
  { id:"pearl", name:"Pearl", description:"Beyaz, gri ve dental teal", family:"light", swatches:["#f7f8f8","#ffffff","#167f7a"] },
  { id:"plum", name:"Plum", description:"Derin erik moru ve lila", family:"dark", swatches:["#160d19","#28162e","#cf8df0"] },
  { id:"slate", name:"Slate", description:"Modern mavi-gri ve mint", family:"dark", swatches:["#0d1419","#172129","#76cfc0"] },
  { id:"mint", name:"Mint", description:"Açık mint ve dental yeşil", family:"light", swatches:["#eef9f5","#ffffff","#2f9c82"] },
  { id:"sky", name:"Sky", description:"Açık mavi ve temiz klinik görünüm", family:"light", swatches:["#eff7ff","#ffffff","#357fb8"] },
  { id:"lavender", name:"Lavender", description:"Açık lavanta ve sakin mor", family:"light", swatches:["#f6f2fb","#ffffff","#7b65b8"] },
  { id:"ivory", name:"Ivory", description:"Kırık beyaz ve sıcak altın vurgu", family:"light", swatches:["#fbf8f0","#ffffff","#a7792f"] },
  { id:"blush", name:"Blush", description:"Açık pudra ve sıcak gül tonu", family:"light", swatches:["#fff4f6","#ffffff","#b85d77"] },
  { id:"sage", name:"Sage", description:"Açık adaçayı ve doğal yeşil", family:"light", swatches:["#f1f6f1","#ffffff","#5f8868"] },
];

export const DENTAYA_DEFAULT_PREFERENCES: DentayaPreferences = {
  theme: "midnight",
  motion_level: "full",
  compact_mode: false,
  surface_style: "soft",
  font_scale: "normal",
  custom_accent: null,
  use_custom_accent: false,
};

const PALETTES: Record<DentayaTheme, Palette> = {
  midnight:{bg:"#ebe9f0",surface:"#ffffff",surface2:"#f2f0f5",border:"#c9c3d2",text:"#302b38",muted:"#77717e",accent:"#72568f",accentSoft:"#ece5f4",accentContrast:"#ffffff",shadow:"rgba(44,33,58,.15)",input:"#faf9fc"},
  ocean:{bg:"#071520",surface:"#0b2634",surface2:"#0d3141",border:"#26566e",text:"#eff9ff",muted:"#8eb3c8",accent:"#4cc9f0",accentSoft:"#0f3440",accentContrast:"#03131b",shadow:"rgba(0,0,0,.28)",input:"#081c28"},
  emerald:{bg:"#071713",surface:"#0b241d",surface2:"#103126",border:"#285f4d",text:"#f2faf7",muted:"#93b5a7",accent:"#66e0a3",accentSoft:"#103629",accentContrast:"#04130d",shadow:"rgba(0,0,0,.28)",input:"#091d18"},
  violet:{bg:"#12101d",surface:"#1b1830",surface2:"#241f3d",border:"#4b4368",text:"#f7f3ff",muted:"#aaa0c2",accent:"#b69cff",accentSoft:"#2b2450",accentContrast:"#140c27",shadow:"rgba(0,0,0,.30)",input:"#171426"},
  graphite:{bg:"#101315",surface:"#191d20",surface2:"#22272b",border:"#3b454b",text:"#f2f5f6",muted:"#9eaaaf",accent:"#78d5c8",accentSoft:"#1e3331",accentContrast:"#071210",shadow:"rgba(0,0,0,.30)",input:"#15191c"},
  light:{bg:"#f3f7f7",surface:"#ffffff",surface2:"#edf4f3",border:"#cbd9d7",text:"#102427",muted:"#647779",accent:"#147c73",accentSoft:"#d9efeb",accentContrast:"#ffffff",shadow:"rgba(14,41,43,.12)",input:"#f8fbfb"},
  cobalt:{bg:"#07101f",surface:"#0d1b31",surface2:"#122540",border:"#2f4d78",text:"#f2f6ff",muted:"#93a9c9",accent:"#5f8cff",accentSoft:"#172a50",accentContrast:"#061127",shadow:"rgba(0,0,0,.30)",input:"#0a1628"},
  aurora:{bg:"#09151a",surface:"#11252b",surface2:"#173039",border:"#315760",text:"#f2fbfa",muted:"#91aaa9",accent:"#70e4ce",accentSoft:"#173d39",accentContrast:"#051411",shadow:"rgba(0,0,0,.30)",input:"#0d1d22"},
  rose:{bg:"#180d14",surface:"#28151f",surface2:"#351c2a",border:"#654052",text:"#fff4f7",muted:"#c09baa",accent:"#ff9fba",accentSoft:"#482235",accentContrast:"#2b0714",shadow:"rgba(0,0,0,.31)",input:"#21111a"},
  amber:{bg:"#171208",surface:"#251c0d",surface2:"#312612",border:"#66542c",text:"#fff8e8",muted:"#baa982",accent:"#f0bd5b",accentSoft:"#483715",accentContrast:"#241703",shadow:"rgba(0,0,0,.31)",input:"#1f180b"},
  frost:{bg:"#eef5f8",surface:"#ffffff",surface2:"#e6f0f4",border:"#c0d3dc",text:"#13262f",muted:"#687f8b",accent:"#2e7fa3",accentSoft:"#d7eaf2",accentContrast:"#ffffff",shadow:"rgba(22,48,60,.11)",input:"#f7fbfc"},
  obsidian:{bg:"#08090b",surface:"#111317",surface2:"#171a1f",border:"#333941",text:"#f4f7f8",muted:"#949da5",accent:"#62e1cf",accentSoft:"#17322f",accentContrast:"#03120f",shadow:"rgba(0,0,0,.40)",input:"#0d0f12"},
  teal:{bg:"#071716",surface:"#0c2624",surface2:"#12312e",border:"#2d5d58",text:"#f0fbf9",muted:"#91ada8",accent:"#42d7c5",accentSoft:"#143c37",accentContrast:"#031411",shadow:"rgba(0,0,0,.30)",input:"#091d1b"},
  navy:{bg:"#08111e",surface:"#101e31",surface2:"#172a42",border:"#354e6e",text:"#f2f6fb",muted:"#92a4bb",accent:"#6aa9ff",accentSoft:"#1a3150",accentContrast:"#061324",shadow:"rgba(0,0,0,.30)",input:"#0b1726"},
  sand:{bg:"#f5f0e6",surface:"#fffaf1",surface2:"#eee5d7",border:"#d4c2ab",text:"#31261b",muted:"#786958",accent:"#a96d31",accentSoft:"#ead7c0",accentContrast:"#ffffff",shadow:"rgba(73,54,34,.12)",input:"#fffdf8"},
  pearl:{bg:"#f7f8f8",surface:"#ffffff",surface2:"#edf2f2",border:"#cbd6d6",text:"#172627",muted:"#657778",accent:"#167f7a",accentSoft:"#dcefed",accentContrast:"#ffffff",shadow:"rgba(20,47,48,.10)",input:"#fbfdfd"},
  plum:{bg:"#160d19",surface:"#28162e",surface2:"#341d3c",border:"#654272",text:"#fff4ff",muted:"#b79abd",accent:"#cf8df0",accentSoft:"#472753",accentContrast:"#25072f",shadow:"rgba(0,0,0,.32)",input:"#211225"},
  slate:{bg:"#0d1419",surface:"#172129",surface2:"#202d36",border:"#3a4f5b",text:"#f1f5f6",muted:"#95a4ab",accent:"#76cfc0",accentSoft:"#213936",accentContrast:"#061411",shadow:"rgba(0,0,0,.30)",input:"#121a20"},
  mint:{bg:"#eef9f5",surface:"#ffffff",surface2:"#e4f3ed",border:"#bfd9cf",text:"#17302a",muted:"#667f76",accent:"#2f9c82",accentSoft:"#d4eee5",accentContrast:"#ffffff",shadow:"rgba(34,73,61,.10)",input:"#f8fcfa"},
  sky:{bg:"#eff7ff",surface:"#ffffff",surface2:"#e6f1fb",border:"#bfd2e3",text:"#173047",muted:"#687e91",accent:"#357fb8",accentSoft:"#d9eaf7",accentContrast:"#ffffff",shadow:"rgba(30,61,90,.10)",input:"#f8fbff"},
  lavender:{bg:"#f6f2fb",surface:"#ffffff",surface2:"#eee7f6",border:"#d1c5df",text:"#2d2438",muted:"#7e708b",accent:"#7b65b8",accentSoft:"#e6def3",accentContrast:"#ffffff",shadow:"rgba(59,45,78,.10)",input:"#fcfaff"},
  ivory:{bg:"#fbf8f0",surface:"#ffffff",surface2:"#f2ecde",border:"#dccfb7",text:"#352d20",muted:"#7a6d59",accent:"#a7792f",accentSoft:"#efe3c7",accentContrast:"#ffffff",shadow:"rgba(71,57,31,.10)",input:"#fffdf8"},
  blush:{bg:"#fff4f6",surface:"#ffffff",surface2:"#f9e8ed",border:"#e4c4cd",text:"#3a252d",muted:"#886d77",accent:"#b85d77",accentSoft:"#f4dce3",accentContrast:"#ffffff",shadow:"rgba(78,46,56,.10)",input:"#fffafb"},
  sage:{bg:"#f1f6f1",surface:"#ffffff",surface2:"#e6eee6",border:"#c7d5c7",text:"#253126",muted:"#6f806f",accent:"#5f8868",accentSoft:"#dfe9df",accentContrast:"#ffffff",shadow:"rgba(44,66,46,.10)",input:"#fafcfa"},
};

function isHex(value: string | null | undefined) {
  return Boolean(value && /^#[0-9a-fA-F]{6}$/.test(value));
}

function hexRgb(hex: string) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0,2),16),
    g: parseInt(clean.slice(2,4),16),
    b: parseInt(clean.slice(4,6),16),
  };
}

function mixHex(a: string, b: string, weight: number) {
  const aa = hexRgb(a), bb = hexRgb(b);
  const w = Math.max(0, Math.min(1, weight));
  const channel = (x:number,y:number) => Math.round(x*(1-w)+y*w).toString(16).padStart(2,"0");
  return `#${channel(aa.r,bb.r)}${channel(aa.g,bb.g)}${channel(aa.b,bb.b)}`;
}

function contrastFor(hex: string) {
  const {r,g,b}=hexRgb(hex);
  const lum=(0.2126*r+0.7152*g+0.0722*b)/255;
  return lum > .62 ? "#071313" : "#ffffff";
}

export function dentayaThemeColors(theme: DentayaTheme) {
  const { bg, surface, accent } = PALETTES[theme] ?? PALETTES.midnight;
  return [bg, surface, accent] as const;
}

export function readLocalDentayaPreferences(): DentayaPreferences {
  if (typeof window === "undefined") return DENTAYA_DEFAULT_PREFERENCES;

  try {
    const raw = window.localStorage.getItem("dentaya:preferences");
    if (!raw) return DENTAYA_DEFAULT_PREFERENCES;

    const parsed = JSON.parse(raw) as Partial<DentayaPreferences>;
    const theme = THEME_OPTIONS.some((item) => item.id === parsed.theme)
      ? (parsed.theme as DentayaTheme)
      : "midnight";
    const motion: MotionLevel =
      parsed.motion_level === "reduced" || parsed.motion_level === "off"
        ? parsed.motion_level
        : "full";
    const surface: SurfaceStyle =
      parsed.surface_style === "solid" || parsed.surface_style === "glass"
        ? parsed.surface_style
        : "soft";
    const fontScale: FontScale =
      parsed.font_scale === "small" || parsed.font_scale === "large"
        ? parsed.font_scale
        : "normal";

    return {
      theme,
      motion_level: motion,
      compact_mode: Boolean(parsed.compact_mode),
      surface_style: surface,
      font_scale: fontScale,
      custom_accent: isHex(parsed.custom_accent) ? parsed.custom_accent! : null,
      use_custom_accent: Boolean(parsed.use_custom_accent),
    };
  } catch {
    return DENTAYA_DEFAULT_PREFERENCES;
  }
}

export function applyDentayaPreferences(preferences: DentayaPreferences) {
  if (typeof document === "undefined") return;

  const base = PALETTES[preferences.theme] ?? PALETTES.midnight;
  const palette: Palette = { ...base };

  if (preferences.use_custom_accent && isHex(preferences.custom_accent)) {
    const accent = preferences.custom_accent!;
    palette.accent = accent;
    palette.accentSoft = mixHex(base.surface, accent, .22);
    palette.accentContrast = contrastFor(accent);
  }

  const root = document.documentElement;
  root.dataset.dentayaTheme = preferences.theme;
  root.dataset.dentayaMotion = preferences.motion_level;
  root.dataset.dentayaCompact = preferences.compact_mode ? "true" : "false";
  root.dataset.dentayaSurface = preferences.surface_style;
  root.dataset.dentayaFontScale = preferences.font_scale;

  for (const [key, value] of Object.entries(palette)) {
    root.style.setProperty(
      `--dy-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`,
      value,
    );
  }

  const motion =
    preferences.motion_level === "off"
      ? { fast:"0ms", normal:"0ms", slow:"0ms", distance:"0px" }
      : preferences.motion_level === "reduced"
        ? { fast:"90ms", normal:"140ms", slow:"180ms", distance:"3px" }
        : { fast:"150ms", normal:"240ms", slow:"380ms", distance:"8px" };

  const font =
    preferences.font_scale === "small"
      ? { scale:".96", body:"14px", small:"12px", label:"11px" }
      : preferences.font_scale === "large"
        ? { scale:"1.07", body:"16px", small:"14px", label:"12px" }
        : { scale:"1", body:"15.5px", small:"13.5px", label:"12.5px" };

  root.style.setProperty("--dy-motion-fast", motion.fast);
  root.style.setProperty("--dy-motion-normal", motion.normal);
  root.style.setProperty("--dy-motion-slow", motion.slow);
  root.style.setProperty("--dy-motion-distance", motion.distance);
  root.style.setProperty("--dy-density", preferences.compact_mode ? ".90" : "1");
  root.style.setProperty("--dy-font-scale", font.scale);
  root.style.setProperty("--dy-font-body", font.body);
  root.style.setProperty("--dy-font-small", font.small);
  root.style.setProperty("--dy-font-label", font.label);
  root.style.setProperty(
    "--dy-font-family",
    "Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif",
  );

  const radius =
    preferences.surface_style === "solid"
      ? "10px"
      : preferences.surface_style === "glass"
        ? "19px"
        : "15px";

  root.style.setProperty("--dy-radius", radius);
  root.style.setProperty(
    "--dy-backdrop",
    preferences.surface_style === "glass"
      ? "blur(18px) saturate(1.15)"
      : "none",
  );

  if (preferences.surface_style === "glass") {
    root.style.setProperty(
      "--dy-panel-surface",
      `color-mix(in srgb, ${palette.surface} 84%, transparent)`,
    );
    root.style.setProperty(
      "--dy-panel-surface-2",
      `color-mix(in srgb, ${palette.surface2} 80%, transparent)`,
    );
  } else {
    root.style.setProperty("--dy-panel-surface", palette.surface);
    root.style.setProperty("--dy-panel-surface-2", palette.surface2);
  }

  const option = THEME_OPTIONS.find((item) => item.id === preferences.theme);
  root.style.colorScheme = option?.family === "light" ? "light" : "dark";

  let globalStyle = document.getElementById("dentaya-global-style") as HTMLStyleElement | null;
  if (!globalStyle) {
    globalStyle = document.createElement("style");
    globalStyle.id = "dentaya-global-style";
    document.head.appendChild(globalStyle);
  }
  globalStyle.textContent = `
    html, body { max-width: 100%; overflow-x: hidden; }
    body {
      font-family: var(--dy-font-family, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
      font-size: var(--dy-font-body, 15.5px);
      line-height: var(--dy-reading-line-height,1.48);
      background: var(--dy-bg, #07131d);
      color: var(--dy-text, #f2f6f8);
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }
    main, header, footer, nav, section, article, aside, div, form, label {
      min-width: 0;
    }
    h1, h2, h3, h4, p, span, strong, small, label, a, button {
      overflow-wrap: break-word;
      word-break: normal;
    }
    h1, h2, h3, h4 {
      font-family: inherit;
      font-variant-ligatures: common-ligatures;
      line-height: 1.12;
      margin-block-start: 0;
      margin-block-end: .48em;
      text-wrap: balance;
    }
    h1 { font-size: calc(2.2rem * var(--dy-heading-scale, 1)); }
    h2 { font-size: calc(1.6rem * var(--dy-heading-scale, 1)); }
    h3 { font-size: calc(1.18rem * var(--dy-heading-scale, 1)); }
    p {
      line-height: var(--dy-reading-line-height,1.62);
      margin-block-start: 0;
      margin-block-end: .9em;
    }
    h1 + p,
    h2 + p,
    h3 + p,
    h4 + p {
      margin-top: .45rem !important;
    }
    [data-dy-copy] > strong + span,
    [data-dy-copy] > strong + p,
    [data-dy-copy] > h1 + p,
    [data-dy-copy] > h2 + p,
    [data-dy-copy] > h3 + p {
      display: block;
      margin-top: .45rem;
    }
    [data-dy-card] {
      padding: calc(1rem * var(--dy-card-density, 1));
    }
    html[data-dentaya-card-style="outlined"] [data-dy-card] {
      background: transparent !important;
      box-shadow: none !important;
    }
    html[data-dentaya-card-style="minimal"] [data-dy-card] {
      border-color: transparent !important;
      box-shadow: none !important;
      background: transparent !important;
    }
    html[data-dentaya-module-icons="false"] [data-dy-module-icon] {
      display: none !important;
    }
    small {
      font-size: var(--dy-font-small, 13.5px);
      line-height: 1.45;
    }
    input, select, textarea, button {
      font-family: inherit;
      font-size: 14px;
      line-height: 1.35;
    }
    textarea { line-height: 1.5; }
    button, a { min-width: 0; }
    img, svg, canvas {
      max-width: 100%;
    }
    canvas {
      display: block;
    }
    button, a, input, select, textarea {
      touch-action: manipulation;
    }
    button, a {
      -webkit-tap-highlight-color: transparent;
    }
    :focus-visible {
      outline: 2px solid var(--dy-accent, #6de2cf);
      outline-offset: 2px;
    }
    @media (hover: none) {
      [class*="card"]:hover,
      [class*="row"]:hover {
        transform: none !important;
      }
    }
    @media (max-width: 720px) {
      input, select, textarea, button { font-size: 16px; }
      body { font-size: 15px; }
    }
    @media (max-width: 560px) {
      h1 { letter-spacing: -0.03em !important; }
    }
    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
  `;

  try {
    window.localStorage.setItem("dentaya:preferences", JSON.stringify(preferences));
  } catch {
    // Supabase remains the persistent source of truth.
  }

  applyCustomization(true);
  window.dispatchEvent(
    new CustomEvent("dentaya-theme-change", { detail: preferences }),
  );
}

export async function loadDentayaPreferences(): Promise<DentayaPreferences> {
  const local = readLocalDentayaPreferences();
  applyDentayaPreferences(local);

  const { data: authData } = await supabase.auth.getSession();
  const user = authData.session?.user;
  if (!user) return local;

  const { data } = await supabase
    .from("user_preferences")
    .select("theme,motion_level,compact_mode,surface_style,font_scale,custom_accent,use_custom_accent")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return local;

  const remote: DentayaPreferences = {
    theme: data.theme as DentayaTheme,
    motion_level: data.motion_level as MotionLevel,
    compact_mode: Boolean(data.compact_mode),
    surface_style: data.surface_style as SurfaceStyle,
    font_scale: data.font_scale as FontScale,
    custom_accent: isHex(data.custom_accent) ? data.custom_accent : null,
    use_custom_accent: Boolean(data.use_custom_accent),
  };

  applyDentayaPreferences(remote);
  return remote;
}

export async function saveDentayaPreferences(preferences: DentayaPreferences) {
  applyDentayaPreferences(preferences);

  const { data: authData } = await supabase.auth.getSession();
  const user = authData.session?.user;
  if (!user) return;

  const { error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: user.id,
        theme: preferences.theme,
        motion_level: preferences.motion_level,
        compact_mode: preferences.compact_mode,
        surface_style: preferences.surface_style,
        font_scale: preferences.font_scale,
        custom_accent: preferences.custom_accent,
        use_custom_accent: preferences.use_custom_accent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) throw error;
}

export function useDentayaThemeRuntime() {
  useEffect(() => {
    void loadDentayaPreferences();
    applyWorkspacePersonalization(loadWorkspacePersonalization());

    const handleWorkspace = () =>
      applyWorkspacePersonalization(loadWorkspacePersonalization());

    const onWorkspaceStorage = (event: StorageEvent) => { if (event.key === "dentaya:workspace-personalization" || event.key === null) handleWorkspace(); };
    window.addEventListener("storage", onWorkspaceStorage);
    window.addEventListener(
      "dentaya-workspace-personalization",
      handleWorkspace
    );

    return () => {
      window.removeEventListener("storage", onWorkspaceStorage);
      window.removeEventListener("dentaya-workspace-personalization", handleWorkspace);
    };
  }, []);
}

export const dy = {
  bg: "var(--dy-bg,#07131d)",
  surface: "var(--dy-panel-surface,var(--dy-surface,#0b1c28))",
  surface2: "var(--dy-panel-surface-2,var(--dy-surface2,#0d202c))",
  border: "var(--dy-border,#29465d)",
  text: "var(--dy-text,#f2f6f8)",
  muted: "var(--dy-muted,#8ba0af)",
  accent: "var(--dy-accent,#6de2cf)",
  accentSoft: "var(--dy-accent-soft,#12322f)",
  accentContrast: "var(--dy-accent-contrast,#04110e)",
  input: "var(--dy-input,#081722)",
  shadow: "var(--dy-shadow,rgba(0,0,0,.28))",
  radius: "var(--dy-radius,15px)",
  backdrop: "var(--dy-backdrop,none)",
  fontScale: "var(--dy-font-scale,1)",
  bodyFont: "var(--dy-font-body,15px)",
  smallFont: "var(--dy-font-small,13px)",
  labelFont: "var(--dy-font-label,11.5px)",
  fontFamily: "var(--dy-font-family,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif)",
};
