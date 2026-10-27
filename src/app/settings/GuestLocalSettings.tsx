'use client';
import {useEffect,useState,type KeyboardEvent} from 'react';
import UiNode from '@/lib/i18n/UiNode';
import Link from '@/lib/i18n/UiLink';
import {useTranslation} from '@/lib/i18n';
import {localSettingsText} from '@/lib/i18n/local-settings';
import DentayaIcon from '../DentayaIcon';
import CustomizationPanel from '../CustomizationPanel';
import ExperienceSettings from '../ExperienceSettings';
import LanguageSettings from '../LanguageSettings';
import AyaPreferencesPanel from '../ai/AyaPreferencesPanel';
const KEY='dentaya:workspace-chrome-v1';
const defaults={navigation:true,compact:true,reducedMotion:false};
type Preferences=typeof defaults;
type Tab='appearance'|'work'|'language'|'aya';
function read():Preferences{
 try{const raw=JSON.parse(localStorage.getItem(KEY)||'{}');return Object.fromEntries(Object.entries(defaults).map(([key,value])=>[key,typeof raw?.[key]==='boolean'?raw[key]:value])) as Preferences;}catch{return defaults;}
}
export default function GuestLocalSettings(){
 const {locale}=useTranslation(),copy=localSettingsText(locale);
 const [tab,setTab]=useState<Tab>('appearance'),[preferences,setPreferences]=useState(defaults),[message,setMessage]=useState('');
 const tabs=['appearance','work','language','aya'] as const;
 useEffect(()=>{const sync=()=>setPreferences(read());sync();window.addEventListener('storage',sync);window.addEventListener('dentaya:workspace-chrome-change',sync);return()=>{window.removeEventListener('storage',sync);window.removeEventListener('dentaya:workspace-chrome-change',sync);};},[]);
 function update(key:keyof Preferences,value:boolean){
  const next={...read(),[key]:value};setPreferences(next);
  try{localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new Event('dentaya:workspace-chrome-change'));setMessage(copy.saved);}catch{document.documentElement.dataset.workspaceCompact=String(next.compact);document.documentElement.dataset.workspaceReducedMotion=String(next.reducedMotion);setMessage(copy.failed);}
 }
 function navigate(event:KeyboardEvent<HTMLElement>){
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
  const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]')),current=buttons.indexOf(event.target as HTMLButtonElement);if(current<0)return;
  event.preventDefault();const rtl=document.documentElement.dir==='rtl',forward=event.key==='ArrowDown'||event.key===(rtl?'ArrowLeft':'ArrowRight');
  const index=event.key==='Home'?0:event.key==='End'?buttons.length-1:(current+(forward?1:-1)+buttons.length)%buttons.length;setTab(tabs[index]);buttons[index].focus();
 }
 return <UiNode as="main" className="settings-studio guest-local-settings" translateChildren={false}>
  <UiNode as="header" className="settings-titlebar"><UiNode as="div" className="settings-window-title"><DentayaIcon name="settings" size={18}/><UiNode as="h1">{copy.title}</UiNode></UiNode><Link href="/workspace">← {copy.back}</Link></UiNode>
  <UiNode as="div" className="settings-toolbar"><UiNode as="div" className="settings-toolbar-context"><UiNode as="strong">{copy.local}</UiNode><UiNode as="span">{copy.hint}</UiNode></UiNode></UiNode>
  <UiNode as="div" className="settings-shell"><UiNode as="nav" className="settings-nav" role="tablist" aria-orientation="vertical" aria-label={copy.categories} onKeyDown={navigate}>{tabs.map(id=><UiNode as="button" type="button" key={id} role="tab" id={`local-settings-${id}`} className="settings-nav-item" aria-selected={tab===id} aria-controls={`local-settings-panel-${id}`} tabIndex={tab===id?0:-1} onClick={()=>setTab(id)}>{copy[id]}</UiNode>)}</UiNode>
   <UiNode as="section" role="tabpanel" id={`local-settings-panel-${tab}`} aria-labelledby={`local-settings-${tab}`} tabIndex={0} className="settings-inspector settings-parameter-panel"><UiNode as="header" className="settings-panel-title"><UiNode as="h2">{copy[tab]}</UiNode></UiNode><UiNode as="div" className="settings-panel-body">
    {tab==='appearance'?<CustomizationPanel/>:tab==='language'?<LanguageSettings/>:tab==='aya'?<AyaPreferencesPanel/>:<><UiNode as="div" className="guest-layout-options">{(['navigation','compact','reducedMotion'] as const).map(key=><UiNode as="label" key={key}><UiNode as="span">{copy[key]}</UiNode><UiNode as="input" type="checkbox" checked={preferences[key]} onChange={e=>update(key,e.target.checked)}/></UiNode>)}<UiNode as="p" role="status">{message}</UiNode></UiNode><ExperienceSettings/></>}
   </UiNode></UiNode>
  </UiNode>
 </UiNode>;
}
