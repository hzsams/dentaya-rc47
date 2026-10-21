'use client';
import {useSyncExternalStore} from 'react';
import {normalizeKnowledge,type KnowledgeItem} from '../../electron/aya/assistant.cjs';
export type {KnowledgeItem};
const KEY='dentaya:aya-knowledge:v1',EVENT='dentaya:aya-knowledge',EMPTY={enabled:true,items:[] as KnowledgeItem[]};
let cachedRaw:string|null|undefined,cached=EMPTY;
export function readAyaKnowledge(){if(typeof window==='undefined')return EMPTY;try{const raw=localStorage.getItem(KEY);if(raw!==cachedRaw){cachedRaw=raw;const p=JSON.parse(raw||'{}');cached={enabled:p.enabled!==false,items:normalizeKnowledge(p.items)};}return cached;}catch{return EMPTY;}}
function subscribe(fn:()=>void){const storage=(e:StorageEvent)=>{if(e.key===KEY||e.key===null)fn();};window.addEventListener(EVENT,fn);window.addEventListener('storage',storage);return()=>{window.removeEventListener(EVENT,fn);window.removeEventListener('storage',storage);};}
export function useAyaKnowledge(){return useSyncExternalStore(subscribe,readAyaKnowledge,()=>EMPTY);}
export function saveAyaKnowledge(items:unknown,enabled=readAyaKnowledge().enabled){try{const value={enabled,items:normalizeKnowledge(items)},text=JSON.stringify(value);if(text.length>950000)return false;localStorage.setItem(KEY,text);window.dispatchEvent(new Event(EVENT));return true;}catch{return false;}}
export function addAyaMemory(title:string,content:string){const old=readAyaKnowledge();if(old.items.length>=64||!title.trim()||!content.trim())return false;return saveAyaKnowledge([...old.items,{id:crypto.randomUUID(),title,content,kind:'memory'}]);}
export function exportAyaKnowledge(){return JSON.stringify({format:'dentaya-aya-knowledge',version:1,items:readAyaKnowledge().items});}
export function parseAyaKnowledge(text:string){if(text.length>950000)throw Error('AYA_KNOWLEDGE_INVALID');const p=JSON.parse(text);if(p.format!=='dentaya-aya-knowledge'||p.version!==1||!Array.isArray(p.items)||p.items.length>64||p.items.some((d:KnowledgeItem)=>!d||typeof d.title!=='string'||d.title.length>120||typeof d.content!=='string'||d.content.length>12000)||new Set(p.items.map((d:KnowledgeItem)=>d.id)).size!==p.items.length)throw Error('AYA_KNOWLEDGE_INVALID');const items=normalizeKnowledge(p.items);if(items.length!==p.items.length)throw Error('AYA_KNOWLEDGE_INVALID');return items;}
export async function importAyaKnowledgeFile(file:File){
 if(file.size>(/\.json$/i.test(file.name)?4*950000:512*1024))throw Error('AYA_KNOWLEDGE_INVALID');
 const text=await file.text();let items:KnowledgeItem[];
 if(/\.json$/i.test(file.name))items=parseAyaKnowledge(text);
 else {if(!/\.(txt|md)$/i.test(file.name)||!text.trim())throw Error('AYA_KNOWLEDGE_INVALID');const chunks=text.match(/[\s\S]{1,12000}/g)||[];if(chunks.length>16)throw Error('AYA_KNOWLEDGE_INVALID');items=chunks.map((content,i)=>({id:crypto.randomUUID(),title:file.name.replace(/\.(txt|md)$/i,'').slice(0,110)+(chunks.length>1?' · '+(i+1):''),content,kind:'document'}));}
 const current=readAyaKnowledge();
 const merged=Array.from(new Map([...current.items,...items].map(d=>[d.id,d])).values());if(merged.length>64||!saveAyaKnowledge(merged))throw Error('AYA_KNOWLEDGE_INVALID');return items.length;
}
