import {cadRoleColor,type CadColorSettings} from './cad-color-groups';
import * as THREE from 'three';
import {layerState,type DisplayLayer,type LayerPreferences} from './cad-display';
export type JawArch='upper'|'lower';
export type CadDisplaySettings=LayerPreferences&CadColorSettings&{auto_hide_antagonist?:boolean;jaw_opening_mm?:number;layer_opacity_memory?:Partial<Record<DisplayLayer,number>>;unit_visibility?:Record<string,{visible?:boolean;opacity?:number}>};
export type CadSceneState={upperReady:boolean;lowerReady:boolean;activeVisible:boolean;antagonistReady:boolean;renderedUnits:number;autoHidden:JawArch|'';openingMm:number};
export const EMPTY_CAD_SCENE:CadSceneState={upperReady:false,lowerReady:false,activeVisible:false,antagonistReady:false,renderedUnits:0,autoHidden:'',openingMm:0};
// Role colors follow the technical reference; theme lighting must not tint them.
export const CAD_TECHNICAL_COLORS={working:'#83827e',antagonist:'#ff4800',restoration:'#f2d56b',margin:'#65bd55',background:'#252b32'} as const;
export function workingJaw(fdi:string|undefined,fallback?:string):JawArch{return /^[12][1-8]$/.test(fdi??'')?'upper':/^[34][1-8]$/.test(fdi??'')?'lower':fallback==='lower'?'lower':'upper';}
export const oppositeJaw=(arch:JawArch):JawArch=>arch==='upper'?'lower':'upper';
const alpha=(n:unknown,fallback=1)=>typeof n==='number'&&Number.isFinite(n)?Math.max(0,Math.min(1,n)):fallback;
const field=(layer:DisplayLayer)=>layer==='design'?'opacity':layer+'_opacity';
export function viewDefaults(raw:Partial<CadDisplaySettings>|undefined,arch:JawArch){return {render_palette:'technical' as const,auto_hide_antagonist:false,jaw_opening_mm:0,upper_opacity:arch==='upper'?1:.5,lower_opacity:arch==='lower'?1:.5,scan_opacity:1,...raw};}
export function cadLayerPatch(s:CadDisplaySettings,layer:DisplayLayer,action:'visible'|'opacity'|'isolate',value:number|boolean):Partial<CadDisplaySettings>{
 const opacityField=field(layer),raw=alpha((s as unknown as Record<string,unknown>)[opacityField],layer==='design'?1:.64);
 if(action==='isolate')return {...(layer!=='design'&&s.scan_opacity===0?{scan_opacity:alpha(s.layer_opacity_memory?.scan,1)}:{}),show_scan:layer!=='design',show_design:layer==='design',show_upper:layer==='upper'||layer==='scan',show_lower:layer==='lower'||layer==='scan',auto_hide_antagonist:false,...(raw===0?{[opacityField]:alpha(s.layer_opacity_memory?.[layer],1),...(layer==='scan'?{upper_opacity:alpha(s.layer_opacity_memory?.upper,1),lower_opacity:alpha(s.layer_opacity_memory?.lower,1)}:{})}:{})};
 if(action==='visible'){const on=Boolean(value);return {[`show_${layer}`]:on,...(on&&(layer==='upper'||layer==='lower')?{show_scan:true,...(s.scan_opacity===0?{scan_opacity:alpha(s.layer_opacity_memory?.scan,1)}:{})}:{}),...(on&&raw===0?{[opacityField]:alpha(s.layer_opacity_memory?.[layer],1),...(layer==='scan'?{upper_opacity:alpha(s.layer_opacity_memory?.upper,1),lower_opacity:alpha(s.layer_opacity_memory?.lower,1)}:{})}:{})};}
 const next=alpha(value),memory={...s.layer_opacity_memory,[layer]:next>0?next:raw>0?raw:s.layer_opacity_memory?.[layer]??1};
 if(layer==='scan')return {scan_opacity:next,upper_opacity:next,lower_opacity:next,layer_opacity_memory:{...memory,upper:next>0?next:s.upper_opacity||s.layer_opacity_memory?.upper||1,lower:next>0?next:s.lower_opacity||s.layer_opacity_memory?.lower||1},...(next>0?{show_scan:true}:{})};
 return {[opacityField]:next,layer_opacity_memory:memory,...(layer==='design'?{shell_preview_opacity:next}:{}),...(next>0?{[`show_${layer}`]:true,...(layer==='upper'||layer==='lower'?{show_scan:true,...(s.scan_opacity===0?{scan_opacity:alpha(s.layer_opacity_memory?.scan,1)}:{})}:{})}:{})};
}
export function allCadVisible():Partial<CadDisplaySettings>{return {show_upper:true,show_lower:true,show_scan:true,show_design:true,upper_opacity:1,lower_opacity:1,scan_opacity:1,opacity:1,show_annotations:true,show_connectors:true,unit_visibility:{},auto_hide_antagonist:false};}
export function allCadHidden():Partial<CadDisplaySettings>{return {show_scan:false,show_design:false,show_annotations:false,show_connectors:false};}
export function cadScanColor(s:CadDisplaySettings,arch:string|undefined,working:JawArch){const opposing=arch===oppositeJaw(working);return cadRoleColor(s,opposing?'antagonist':'working');}
export function jawOpening(s:CadDisplaySettings){return typeof s.jaw_opening_mm==='number'&&Number.isFinite(s.jaw_opening_mm)?Math.max(0,Math.min(12,s.jaw_opening_mm)):0;}
export function antagonistAutoHidden(enabled:boolean,cameraFromTarget:THREE.Vector3,insertion:THREE.Vector3){return enabled&&cameraFromTarget.lengthSq()>1e-8&&insertion.lengthSq()>1e-8&&cameraFromTarget.clone().normalize().dot(insertion.clone().normalize())>.35;}
export function unitDisplayState(s:CadDisplaySettings,id:string){const root=layerState(s,'design'),unit=s.unit_visibility?.[id];return {visible:root.visible&&unit?.visible!==false&&alpha(unit?.opacity)>0,opacity:root.opacity*alpha(unit?.opacity)};}
