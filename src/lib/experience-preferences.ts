'use client';
import {useSyncExternalStore} from 'react';
export type ExperiencePace='calm'|'balanced'|'quick'|'off';
export const SOUND_TEXTURES=['ceramic','wood','silk','glass','paper','felt','water','studio'] as const;
export type SoundTexture=typeof SOUND_TEXTURES[number];
export const SOUND_EVENTS=['tap','tool','view','brush','complete','error','message'] as const;
export type ExperienceCue=typeof SOUND_EVENTS[number];
export type ExperiencePreferences={pace:ExperiencePace;soundEnabled:boolean;volume:number;texture:SoundTexture;scope:'cad'|'all';brushSound:boolean;eventLevels:Record<ExperienceCue,number>;pitch:number;variation:boolean;quietHours:boolean;quietStart:string;quietEnd:string;pageMotion:boolean;panelMotion:boolean;toothMotion:boolean};
export const DEFAULT_EXPERIENCE:ExperiencePreferences={pace:'calm',soundEnabled:true,volume:22,texture:'ceramic',scope:'cad',brushSound:true,eventLevels:{tap:70,tool:80,view:65,brush:35,complete:85,error:70,message:80},pitch:1,variation:true,quietHours:false,quietStart:'22:00',quietEnd:'08:00',pageMotion:true,panelMotion:true,toothMotion:true};
export const EXPERIENCE_KEY='dentaya:experience:v1',EXPERIENCE_EVENT='dentaya:experience';
export function normalizeExperience(value:unknown):ExperiencePreferences{const p=(value&&typeof value==='object'?value:{}) as Partial<ExperiencePreferences>;return {pace:['calm','balanced','quick','off'].includes(p.pace??'')?p.pace!:DEFAULT_EXPERIENCE.pace,soundEnabled:typeof p.soundEnabled==='boolean'?p.soundEnabled:true,volume:typeof p.volume==='number'&&Number.isFinite(p.volume)?Math.max(0,Math.min(100,p.volume)):22,texture:SOUND_TEXTURES.includes(p.texture as SoundTexture)?p.texture!:'ceramic',scope:p.scope==='all'?'all':'cad',brushSound:typeof p.brushSound==='boolean'?p.brushSound:true,eventLevels:Object.fromEntries(SOUND_EVENTS.map(k=>[k,clamp(p.eventLevels?.[k],0,100,DEFAULT_EXPERIENCE.eventLevels[k])])) as Record<ExperienceCue,number>,pitch:clamp(p.pitch,.75,1.25,1),variation:p.variation!==false,quietHours:p.quietHours===true,quietStart:clock(p.quietStart,"22:00"),quietEnd:clock(p.quietEnd,"08:00"),pageMotion:p.pageMotion!==false,panelMotion:p.panelMotion!==false,toothMotion:p.toothMotion!==false};}
const clamp=(v:unknown,a:number,b:number,f:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(a,Math.min(b,v)):f;
const clock=(v:unknown,f:string)=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v)?v:f;
export function isQuietTime(p:ExperiencePreferences,date=new Date()){if(!p.quietHours)return false;const minute=(s:string)=>Number(s.slice(0,2))*60+Number(s.slice(3));const a=minute(p.quietStart),b=minute(p.quietEnd),n=date.getHours()*60+date.getMinutes();return a===b||(a<b?n>=a&&n<b:n>=a||n<b);}
let rawCache:string|null|undefined,cached=DEFAULT_EXPERIENCE;
export function readExperience(){if(typeof window==='undefined')return DEFAULT_EXPERIENCE;try{const raw=localStorage.getItem(EXPERIENCE_KEY);if(raw!==rawCache){rawCache=raw;try{cached=normalizeExperience(raw?JSON.parse(raw):null);}catch{cached=DEFAULT_EXPERIENCE;}}return cached;}catch{return DEFAULT_EXPERIENCE;}}
function subscribe(fn:()=>void){const storage=(e:StorageEvent)=>{if(e.key===EXPERIENCE_KEY||e.key===null)fn();};window.addEventListener(EXPERIENCE_EVENT,fn);window.addEventListener('storage',storage);return()=>{window.removeEventListener(EXPERIENCE_EVENT,fn);window.removeEventListener('storage',storage);};}
export function useExperience(){return useSyncExternalStore(subscribe,readExperience,()=>DEFAULT_EXPERIENCE);}
export function saveExperience(patch:Partial<ExperiencePreferences>){try{localStorage.setItem(EXPERIENCE_KEY,JSON.stringify(normalizeExperience({...readExperience(),...patch})));window.dispatchEvent(new Event(EXPERIENCE_EVENT));return true;}catch{return false;}}
export function experienceDuration(kind:'click'|'panel'|'page'|'tooth'|'camera'='panel'){
 if(typeof window==='undefined')return 0;const p=readExperience(),root=document.documentElement;
 if((kind==='page'&&!p.pageMotion)||(kind==='panel'&&!p.panelMotion)||((kind==='tooth'||kind==='camera')&&!p.toothMotion)||p.pace==='off'||root.dataset.dentayaMotion==='off'||root.dataset.workspaceReducedMotion==='true'||matchMedia('(prefers-reduced-motion: reduce)').matches)return 0;
 if(root.dataset.dentayaMotion==='reduced')return kind==='tooth'?180:100;
 return ({calm:{click:170,panel:420,page:560,tooth:1150,camera:420},balanced:{click:120,panel:260,page:340,tooth:750,camera:260},quick:{click:80,panel:150,page:180,tooth:420,camera:150}} as const)[p.pace][kind];
}
