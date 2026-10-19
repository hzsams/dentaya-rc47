"use client";
import { COLOR_PALETTES, INTERFACE_STYLES, readCustomization, updateCustomization, type Customization } from "./customization";
import { THEME_OPTIONS, applyDentayaPreferences, dentayaThemeColors, readLocalDentayaPreferences, type DentayaPreferences, type DentayaTheme } from "./dentaya-theme";
import { updateCadWorkspace } from "@/lib/cad-workspace-preferences";

type AppearancePreset = { id:string; name:string; description:string; group:string; colors:readonly string[]; theme?:DentayaTheme; style?:string; palette?:string; patch?:Partial<Customization> };
export const APPEARANCE_PRESETS:AppearancePreset[] = [
  ...INTERFACE_STYLES.map(style=>({id:`style:${style.id}`,name:style.name,description:style.description,group:"Arayüz tarzları",colors:style.colors,style:style.id,patch:style.patch})),
  ...THEME_OPTIONS.map(theme=>({id:`theme:${theme.id}`,name:theme.name,description:theme.description,group:"Tema",colors:dentayaThemeColors(theme.id),theme:theme.id})),
  ...COLOR_PALETTES.map(([id,name,...colors])=>({id:`palette:${id}`,name,description:"",group:"Renk paletleri",colors,palette:id})),
];
export function effectiveAppearanceColors(value:Customization, preferences:DentayaPreferences) {
  const base=dentayaThemeColors(preferences.theme), palette=COLOR_PALETTES.find(p=>p[0]===value.palette);
  return [value.background??palette?.[2]??base[0],value.panel??palette?.[3]??base[1],value.accent??palette?.[4]??(preferences.use_custom_accent&&preferences.custom_accent?preferences.custom_accent:base[2])] as const;
}
export function selectedAppearancePreset(value:Customization, preferences:DentayaPreferences) {
  const colors=effectiveAppearanceColors(value,preferences);
  const matches=(id:string|null)=>APPEARANCE_PRESETS.find(p=>p.id===id&&p.colors.every((c,i)=>c.toLowerCase()===colors[i].toLowerCase()));
  const selected=matches(value.appearancePreset)??matches(`style:${value.style}`)??(value.palette!=="theme"?matches(`palette:${value.palette}`):undefined);
  if(selected)return selected.id;
  if(value.background||value.panel||value.accent||preferences.use_custom_accent)return "custom";
  return `theme:${preferences.theme}`;
}
export function applyAppearanceCustomization(value:Customization, theme?:DentayaTheme) {
  const preferences={...readLocalDentayaPreferences(),...(theme?{theme}:{}),custom_accent:null,use_custom_accent:false};
  const saved=updateCustomization(value);
  const cadSaved=updateCadWorkspace({background:"theme"});
  applyDentayaPreferences(preferences);
  return saved&&cadSaved;
}
export function selectAppearancePreset(id:string) {
  const preset=APPEARANCE_PRESETS.find(p=>p.id===id);
  if(!preset)return false;
  const [background,panel,accent]=preset.colors;
  return applyAppearanceCustomization({...readCustomization(),...preset.patch,appearancePreset:preset.id,style:preset.style??"custom",palette:preset.palette??"theme",background,panel,accent},preset.theme);
}
export function customizeAppearanceColor(key:"background"|"panel"|"accent",color:string) {
  if(!/^#[a-f0-9]{6}$/i.test(color))return false;
  const value=readCustomization(),[background,panel,accent]=effectiveAppearanceColors(value,readLocalDentayaPreferences());
  return applyAppearanceCustomization({...value,style:"custom",background,panel,accent,[key]:color});
}

export const APPEARANCE_COLLECTIONS=['Studio','Mineral','Heritage','Contrast'] as const;
export type AppearanceCollection=typeof APPEARANCE_COLLECTIONS[number];
export function appearanceCollection(id:string):AppearanceCollection{
 if(/old-money|retro|atelier|art-deco|espresso|copper|linen|royal|cherry|heritage/.test(id))return 'Heritage';
 if(/botanical|japandi|lagoon|pine|ice|olive|mineral|seafoam/.test(id))return 'Mineral';
 if(/contrast|porcelain|lilac|petal|apricot/.test(id))return 'Contrast';
 return 'Studio';
}
