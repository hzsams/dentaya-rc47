'use client';
import {useCallback,useSyncExternalStore} from 'react';
import catalog from './catalog.json';
import manifest from './ui-manifest.json';
import {LANGUAGES,isLocale,languageInfo,type Locale} from './locales';
import {bundledLoaders} from './bundled';
import {validTranslation} from './pack-validation';
export {LANGUAGES,languageInfo,type Locale} from './locales';
const KEY='dentaya:locale:v1',listeners=new Set<()=>void>();
let current:Locale='tr',revision=0,activation=0;
const entries=catalog as Record<string,Partial<Record<Locale,string>>>;
const normalize=(source:string)=>source.trim().replace(/\s+/g,' ').toLocaleLowerCase('tr');
const known=new Map(manifest.keys.map(source=>[normalize(source),source]));
const bundled=new Map<Locale,Map<string,string>>(),overrides=new Map<Locale,Map<string,string>>(),loading=new Map<Locale,Promise<void>>();
type Coverage={completed:number;total:number;ready:boolean};
const coverage=new Map<Locale,Coverage>();
for(const language of LANGUAGES){const completed=language.id==='tr'?known.size:new Set(Object.entries(entries).filter(([key,values])=>known.has(normalize(key))&&values[language.id]).map(([key])=>normalize(key))).size;coverage.set(language.id,{completed,total:known.size,ready:completed===known.size});}
const normalized=new Map(Object.keys(entries).map(key=>[normalize(key),key]));
const aliases:Record<string,string>=Object.assign(Object.create(null),{'laboratuvarlar':'Laboratuvar','çalışma alanın':'Çalışma alanı','muhasebe & fiyat':'Finans','lab tarama':'Taramalar','tarama':'Taramalar'});
const escape=(source:string)=>source.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const patterns=manifest.keys.filter(key=>/\{\d+\}/.test(key)).sort((a,b)=>b.replace(/\{\d+\}/g,'').length-a.replace(/\{\d+\}/g,'').length).map(key=>({key,regex:new RegExp('^'+key.split(/\{\d+\}/g).map(escape).join('(.*?)')+'$','iu'),slots:[...key.matchAll(/\{(\d+)\}/g)].map(match=>Number(match[1]))}));
function notify(){for(const listener of listeners)listener();}
function updateCoverage(locale:Locale){const keys=new Set([...(bundled.get(locale)?.keys()??[]),...(overrides.get(locale)?.keys()??[])]);for(const [key,values] of Object.entries(entries))if(values[locale]&&known.has(normalize(key)))keys.add(normalize(key));coverage.set(locale,{completed:keys.size,total:known.size,ready:keys.size===known.size});revision++;notify();}
export function installLanguagePack(locale:Locale,values:Record<string,string>){const map=new Map<string,string>();for(const [key,value] of Object.entries(values)){const source=known.get(normalize(key));if(source&&validTranslation(source,value))map.set(normalize(source),value);}overrides.set(locale,map);updateCoverage(locale);}
export function getLanguagePackCoverage(locale:Locale){return coverage.get(locale)!;}
export function getLanguageEntries(locale:Locale){if(locale==='tr')return Object.fromEntries(manifest.keys.map(key=>[key,key]));return Object.fromEntries(manifest.keys.flatMap(key=>{const value=lookup(key,locale);return value?[[key,value]]:[];}));}
export async function loadLanguagePack(locale:Locale):Promise<void>{
 if(locale==='tr'||bundled.has(locale))return;if(loading.has(locale))return loading.get(locale)!;
 const task=(async()=>{const {default:pack}=await bundledLoaders[locale]();if(pack.locale!==locale||pack.hash!==manifest.hash||Object.keys(pack.entries).length!==manifest.keys.length)throw Error('INVALID_PACK');const map=new Map<string,string>();for(const source of manifest.keys){const value=pack.entries[source];if(!validTranslation(source,value))throw Error('INVALID_PACK');map.set(normalize(source),value);}bundled.set(locale,map);
 if(typeof window!=='undefined')try{const saved=JSON.parse(localStorage.getItem('dentaya:language-corrections:'+locale)||'null');if(saved?.hash===manifest.hash&&saved.entries)installLanguagePack(locale,saved.entries);}catch{}updateCoverage(locale);
 })();loading.set(locale,task);try{await task;}finally{loading.delete(locale);}
}
function lookup(source:string,locale:Locale){const key=normalize(source);return overrides.get(locale)?.get(key)||bundled.get(locale)?.get(key)||(normalized.has(key)?entries[normalized.get(key)!]?.[locale]:undefined);}
export function translate(source:string,locale:Locale):string {
 if(locale==='tr'||!source)return source;const plain=source.trim(),full=lookup(plain,locale);if(full)return source.replace(plain,()=>full);
 const alias=aliases[normalize(plain)];if(alias){const value=lookup(alias,locale);if(value)return source.replace(plain,()=>value);}if(!/\p{L}/u.test(plain))return source;
 for(const rule of patterns){const translated=lookup(rule.key,locale);if(!translated)continue;const match=plain.match(rule.regex);if(match){const uiSlots=(manifest.templateUiSlots as Record<string,number[]>)[rule.key]??[],values=new Map(rule.slots.map((slot,index)=>[slot,uiSlots.includes(slot)?lookup(match[index+1],locale)??match[index+1]:match[index+1]]));return source.replace(plain,()=>translated.replace(/\{(\d+)\}/g,(_match,slot)=>values.get(Number(slot))??''));}}
 const decorated=plain.match(/^([←→+◉○✓\s]*)(.*?)([→↑↓■…:!\s]*)$/u);if(decorated&&(decorated[1]||decorated[3])){const value=lookup(decorated[2],locale)||lookup(aliases[normalize(decorated[2])]||'',locale);if(value)return source.replace(plain,()=>`${decorated[1]}${value}${decorated[3]}`);}return source;
}
export function getLocale(){return current;}
export function currentIntlLocale(){return languageInfo(current).tag;}
function storage(event:StorageEvent){if(event.key===KEY||event.key===null)void initializeLocale();else if(event.key?.startsWith('dentaya:language-corrections:')){const locale=event.key.slice('dentaya:language-corrections:'.length);if(isLocale(locale))try{const saved=JSON.parse(event.newValue||'null');installLanguagePack(locale,saved?.hash===manifest.hash?saved.entries||{}:{});}catch{}}}
function subscribe(listener:()=>void){listeners.add(listener);if(listeners.size===1)window.addEventListener('storage',storage);return()=>{listeners.delete(listener);if(!listeners.size)window.removeEventListener('storage',storage);};}
export function useLocale(){return useSyncExternalStore(subscribe,getLocale,()=> 'tr' as Locale);}
export function useLanguagePackCoverage(){const locale=useLocale();return useSyncExternalStore(subscribe,()=>coverage.get(locale)!,()=>coverage.get('tr')!);}
function commitLocale(next:Locale,persist:boolean){current=next;let saved=true;if(persist)try{localStorage.setItem(KEY,next);}catch{saved=false;}notify();return saved;}
export async function changeLocale(next:unknown,persist=true){if(!isLocale(next))return false;const sequence=++activation;await loadLanguagePack(next);return sequence===activation?commitLocale(next,persist):true;}
export async function initializeLocale(){let next:Locale='tr';try{const value=localStorage.getItem(KEY);if(isLocale(value))next=value;}catch{}try{await changeLocale(next,false);}catch{}}
export function setLocale(next:unknown){if(!isLocale(next))return false;activation++;const saved=commitLocale(next,true);void loadLanguagePack(next).catch(()=>{});return saved;}
export function useTranslation(){const locale=useLocale(),packRevision=useSyncExternalStore(subscribe,()=>revision,()=>0);const t=useCallback((source:string)=>{void packRevision;return translate(source,locale);},[locale,packRevision]);const intlLocale=useCallback(()=>languageInfo(locale).tag,[locale]);return {t,intlLocale,locale};}
