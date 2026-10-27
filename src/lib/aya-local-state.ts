'use client';
import {useSyncExternalStore} from 'react';
import {normalizeAyaReferences,type AyaReference} from './aya-references';
import {normalizeMemory,type AyaWorkingMemory} from '../../electron/aya/agent.cjs';
export type AyaOptions={role:'general'|'clinic'|'lab';style:'concise'|'explained'|'checklist';creativity:number;maxTokens:512|1024|1536|2048;useKnowledge:boolean;useNote:boolean;note:string;saveHistory:boolean;enterSends:boolean};
export type AyaMessage={role:'user'|'assistant';content:string;engine?:'model'|'guide'|'core';references?:AyaReference[]};
export type AyaSession={id:string;title:string;updatedAt:number;messages:AyaMessage[];workingMemory?:AyaWorkingMemory};
export const DEFAULT_AYA_OPTIONS:AyaOptions={role:'general',style:'concise',creativity:.3,maxTokens:1024,useKnowledge:true,useNote:false,note:'',saveHistory:false,enterSends:true};
const KEY='dentaya:aya-core:v1',EVENT='dentaya:aya-core',empty={options:DEFAULT_AYA_OPTIONS,sessions:[] as AyaSession[]};
export function normalizeAyaOptions(v:unknown):AyaOptions{const p=(v&&typeof v==='object'?v:{}) as Partial<AyaOptions>;return {role:p.role==='clinic'||p.role==='lab'?p.role:'general',style:p.style==='explained'||p.style==='checklist'?p.style:'concise',creativity:typeof p.creativity==='number'&&Number.isFinite(p.creativity)?Math.max(0,Math.min(.8,p.creativity)):.3,maxTokens:[512,1024,1536,2048].includes(p.maxTokens??0)?p.maxTokens!:1024,useKnowledge:p.useKnowledge!==false,useNote:p.useNote===true,note:typeof p.note==='string'?p.note.slice(0,1500):'',saveHistory:p.saveHistory===true,enterSends:p.enterSends!==false};}
let rawCache:string|null|undefined,cache=empty;
function normalizeSession(s:AyaSession):AyaSession{return {id:s.id.slice(0,80),title:s.title.slice(0,70),updatedAt:Number.isFinite(s.updatedAt)?s.updatedAt:0,workingMemory:normalizeMemory(s.workingMemory),messages:s.messages.slice(-40).filter(m=>m&&(m.role==='user'||m.role==='assistant')&&typeof m.content==='string').map(m=>({role:m.role,content:m.content.slice(0,64000),engine:m.engine==='guide'?'guide':m.engine==='core'?'core':'model',references:normalizeAyaReferences(m.references)}))};}
export function readAyaState(){if(typeof window==='undefined')return empty;try{const raw=localStorage.getItem(KEY);if(raw!==rawCache){rawCache=raw;const p=JSON.parse(raw||'{}'),options=normalizeAyaOptions(p?.options),sessions=options.saveHistory&&Array.isArray(p?.sessions)?p.sessions.slice(0,12).filter((s:AyaSession)=>s&&typeof s.id==='string'&&typeof s.title==='string'&&Array.isArray(s.messages)).map(normalizeSession):[];cache={options,sessions};}return cache;}catch{cache=empty;return cache;}}
function subscribe(fn:()=>void){const storage=(e:StorageEvent)=>{if(e.key===KEY||e.key===null)fn();};window.addEventListener(EVENT,fn);window.addEventListener('storage',storage);return()=>{window.removeEventListener(EVENT,fn);window.removeEventListener('storage',storage);};}
export function useAyaState(){return useSyncExternalStore(subscribe,readAyaState,()=>empty);}
function write(options:AyaOptions,list:AyaSession[]){try{const data={options,sessions:options.saveHistory?list.slice(0,12).map(s=>({...s,messages:s.messages.slice(-40)})):[]};if(data.sessions[0])while(JSON.stringify(data.sessions[0]).length>900000&&data.sessions[0].messages.length>1)data.sessions[0].messages.shift();while(JSON.stringify(data).length>1_200_000&&data.sessions.length)data.sessions.pop();localStorage.setItem(KEY,JSON.stringify(data));window.dispatchEvent(new Event(EVENT));return true;}catch{return false;}}
export function saveAyaOptions(patch:Partial<AyaOptions>){const p=readAyaState();return write(normalizeAyaOptions({...p.options,...patch}),p.sessions);}
export function saveAyaSession(s:AyaSession){const p=readAyaState();return !p.options.saveHistory||write(p.options,[s,...p.sessions.filter(x=>x.id!==s.id)]);}
/** Compare the last read canonical record; no persisted schema or timestamp-only identity. */
export function ayaSessionRevision(session:AyaSession|undefined):string|null{return session?JSON.stringify(session):null;}
export type AyaSessionSaveResult='saved'|'unchanged'|'disabled'|'conflict'|'failed';
/** Optimistic check against the latest read; localStorage is not a cross-window transaction. */
export function saveAyaSessionIfCurrent(s:AyaSession,expected:string|null):AyaSessionSaveResult{
 const p=readAyaState();
 if(!p.options.saveHistory)return 'disabled';
 const stored=p.sessions.find(session=>session.id===s.id);
 if(ayaSessionRevision(stored)!==expected)return 'conflict';
 // Viewing/reopening an unchanged conversation is not new activity. Compare the
 // same canonical fields used by reads, while keeping the full revision gate.
 if(stored&&JSON.stringify({...normalizeSession(stored),updatedAt:0})===JSON.stringify({...normalizeSession(s),updatedAt:0}))return 'unchanged';
 return write(p.options,[s,...p.sessions.filter(session=>session.id!==s.id)])?'saved':'failed';
}
export function deleteAyaSession(id:string){const p=readAyaState();return write(p.options,p.sessions.filter(s=>s.id!==id));}
export function clearAyaSessions(){return write(readAyaState().options,[]);}
