'use client';
import {useState} from 'react';
import UiNode from '@/lib/i18n/UiNode';
import {useTranslation} from '@/lib/i18n';
import {cadInspectionText} from '@/lib/i18n/cad-inspection';
import {CAD_INSPECTION_DEFAULTS,normalizeCadInspection} from '@/lib/cad-inspection';
import type {CadSettings,CadViewMode} from './DesignViewport';
import CadIcon from './CadIcon';

type Tab='light'|'surface'|'section'|'camera';
export default function CadInspectionPanel({settings,patch,viewMode,onView,onClose,onFocus,onRotate,onFit,ready,initialTab='light'}:{settings:CadSettings;patch:(value:Partial<CadSettings>)=>void;viewMode:CadViewMode;onView:(value:CadViewMode)=>void;onClose:()=>void;onFocus:()=>void;onRotate:(value:'left'|'right')=>void;onFit:()=>void;ready:boolean;initialTab?:Tab}){
 const {locale}=useTranslation(),copy=cadInspectionText(locale);
 const [tab,setTab]=useState<Tab>(initialTab),config=normalizeCadInspection(settings);
 const toggle=(id:string,label:string,checked:boolean,onChange:(value:boolean)=>void)=><UiNode as="label" className="cad-inspection-toggle"><UiNode as="span">{label}</UiNode><UiNode as="input" type="checkbox" data-cad-inspection={id} checked={checked} onChange={event=>onChange(event.target.checked)}/></UiNode>;
 const slider=(id:string,label:string,value:number,min:number,max:number,step:number,onChange:(value:number)=>void,unit='')=><UiNode as="label" className="cad-inspection-range"><UiNode as="span">{label}<UiNode as="output">{Number(value.toFixed(2))}{unit}</UiNode></UiNode><UiNode as="input" type="range" data-cad-inspection={id} min={min} max={max} step={step} value={value} onChange={event=>onChange(Number(event.target.value))}/></UiNode>;
 return <UiNode as="section" className="cad-inspection-panel" aria-label={copy.title} translateChildren={false}>
  <UiNode as="header"><CadIcon name="flashlight" size={18}/><UiNode as="strong">{copy.title}</UiNode><UiNode as="button" type="button" className="cad-icon-command" aria-label={copy.close} onClick={onClose}><CadIcon name="close" size={17}/></UiNode></UiNode>
  <UiNode as="div" role="tablist" aria-label={copy.title} className="cad-inspection-tabs" onKeyDown={event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs:Tab[]=['light','surface','section','camera'],index=tabs.indexOf(tab),next=event.key==='Home'?0:event.key==='End'?3:(index+(event.key==='ArrowRight'?1:3))%4;setTab(tabs[next]);document.getElementById('cad-inspection-tab-'+tabs[next])?.focus();}}>
   {(['light','surface','section','camera'] as const).map(id=><UiNode as="button" type="button" role="tab" key={id} id={'cad-inspection-tab-'+id} data-inspection-tab={id} aria-controls="cad-inspection-content" aria-selected={tab===id} tabIndex={tab===id?0:-1} onClick={()=>setTab(id)}>{copy[id]}</UiNode>)}
  </UiNode>
  <UiNode as="fieldset" id="cad-inspection-content" role="tabpanel" aria-labelledby={'cad-inspection-tab-'+tab} disabled={!ready}>
   {tab==='light'&&<>
    {toggle('flashlight',copy.flashlight,config.inspection_flashlight,value=>patch({inspection_flashlight:value}))}
    <UiNode as="p">{copy.flashlightHelp}</UiNode>
    <UiNode as="label" className="cad-inspection-select"><UiNode as="span">{copy.aim}</UiNode><UiNode as="select" data-cad-inspection="flashlight-target" value={config.inspection_flashlight_target} onChange={event=>patch({inspection_flashlight_target:event.target.value==='pointer'?'pointer':'camera'})}><UiNode as="option" value="camera">{copy.cameraAim}</UiNode><UiNode as="option" value="pointer">{copy.pointerAim}</UiNode></UiNode></UiNode>
    {slider('flashlight-intensity',copy.intensity,config.inspection_flashlight_intensity,0,5,.1,value=>patch({inspection_flashlight_intensity:value}))}
    {slider('flashlight-cone',copy.cone,config.inspection_flashlight_cone_deg,10,65,1,value=>patch({inspection_flashlight_cone_deg:value}),'°')}
    {slider('exposure',copy.exposure,config.inspection_exposure,.3,2,.01,value=>patch({inspection_exposure:value}),'×')}
   </>}
   {tab==='surface'&&<>
    {toggle('edges',copy.edges,config.inspection_edges,value=>patch({inspection_edges:value}))}
    {toggle('normals',copy.normals,config.inspection_normals,value=>patch({inspection_normals:value}))}
    {toggle('faceted',copy.faceted,config.inspection_faceted,value=>patch({inspection_faceted:value}))}
    {toggle('interior',copy.interior,config.inspection_interior,value=>patch({inspection_interior:value}))}
    <UiNode as="p">{copy.surfaceHelp}</UiNode>
   </>}
   {tab==='section'&&<>
    {toggle('section',copy.cut,viewMode==='section',value=>onView(value?'section':'natural'))}
    <UiNode as="label" className="cad-inspection-select"><UiNode as="span">{copy.axis}</UiNode><UiNode as="select" data-cad-inspection="section-axis" value={settings.section_axis??'insertion'} onChange={event=>{patch({section_axis:event.target.value as CadSettings['section_axis']});onView('section');}}>{(['x','y','z','insertion'] as const).map(axis=><UiNode as="option" key={axis} value={axis}>{axis==='insertion'?copy.insertion:axis.toUpperCase()}</UiNode>)}</UiNode></UiNode>
    {toggle('section-invert',copy.invert,settings.section_inverted??false,value=>patch({section_inverted:value}))}
    {slider('section-offset',copy.offset,settings.section_offset_mm,-60,60,.25,value=>{patch({section_offset_mm:value});onView('section');},' mm')}
    <UiNode as="div" className="cad-inspection-actions"><UiNode as="button" type="button" data-cad-inspection="section-center" onClick={()=>{patch({section_centered:true,section_offset_mm:0});onView('section');}}>{copy.center}</UiNode><UiNode as="button" type="button" data-cad-inspection="section-origin" onClick={()=>{patch({section_centered:false,section_offset_mm:0});onView('section');}}>{copy.origin}</UiNode></UiNode>
    <UiNode as="p">{settings.section_centered?copy.centered:copy.world}</UiNode>
   </>}
   {tab==='camera'&&<><UiNode as="div" className="cad-inspection-actions"><UiNode as="button" type="button" data-cad-inspection="focus" onClick={onFocus}><CadIcon name="isolate" size={18}/>{copy.focus}</UiNode><UiNode as="button" type="button" data-cad-inspection="rotate-left" onClick={()=>onRotate('left')}><CadIcon name="undo" size={18}/>{copy.left}</UiNode><UiNode as="button" type="button" data-cad-inspection="rotate-right" onClick={()=>onRotate('right')}><CadIcon name="redo" size={18}/>{copy.right}</UiNode><UiNode as="button" type="button" onClick={onFit}><CadIcon name="fit" size={18}/>{copy.fit}</UiNode></UiNode><UiNode as="p">{copy.cameraHelp}</UiNode></>}
  </UiNode>
  <UiNode as="footer"><UiNode as="button" type="button" disabled={!ready} data-cad-inspection="reset" onClick={()=>{patch({...CAD_INSPECTION_DEFAULTS,section_offset_mm:0,section_inverted:false,section_centered:false});if(viewMode==='section')onView('natural');}}><CadIcon name="reset" size={15}/>{copy.reset}</UiNode></UiNode>
 </UiNode>;
}
