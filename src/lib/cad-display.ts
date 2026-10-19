import * as THREE from 'three';
export type DisplayLayer='upper'|'lower'|'scan'|'design';
export type LayerPreferences={show_upper?:boolean;show_lower?:boolean;upper_opacity?:number;lower_opacity?:number;scan_opacity?:number;show_scan:boolean;show_design:boolean;opacity:number;show_annotations?:boolean;show_connectors?:boolean};
export function layerState(settings:LayerPreferences,layer:DisplayLayer){
 const visible=layer==='design'?settings.show_design:layer==='scan'?settings.show_scan:settings.show_scan&&(settings[`show_${layer}`]??true);
 const raw=layer==='design'?settings.opacity:layer==='scan'?(settings.scan_opacity??0.64):(settings[`${layer}_opacity`]??0.64);
 const opacity=Number.isFinite(raw)?Math.max(0,Math.min(1,raw)):1;
 return {visible:visible&&opacity>0,opacity};
}
export function applyMeshDisplay(mesh:THREE.Mesh|null,state:{visible:boolean;opacity:number}){
 if(!mesh)return;mesh.visible=state.visible;
 for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
  const transparent=state.opacity<0.999;
  if(material.transparent!==transparent){material.transparent=transparent;material.needsUpdate=true;}
  material.opacity=state.opacity;material.depthWrite=!transparent;
 }
}
export function visibleCadTarget(object:THREE.Object3D|null):object is THREE.Object3D{return Boolean(object?.visible);}
export function isContextClick(start:{x:number;y:number;pointer:number}|null,end:{x:number;y:number;pointer:number}){return Boolean(start&&start.pointer===end.pointer&&Math.hypot(start.x-end.x,start.y-end.y)<5);}
