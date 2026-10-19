import {nextDentalFact,type DentalFact} from './dental-facts';

export const LOADING_READING_MS=10_000;
type LoadingSnapshot={count:number;session:number;readUntil:number;readingDismissed:boolean;fact:DentalFact|null;paused:boolean};
const active=new Set<symbol>(),listeners=new Set<()=>void>();
const initial:LoadingSnapshot={count:0,session:0,readUntil:0,readingDismissed:true,fact:null,paused:false};
let snapshot=initial,lastEndedAt=0;
function publish(patch:Partial<LoadingSnapshot>){snapshot={...snapshot,...patch,count:active.size};listeners.forEach(fn=>fn());}
export function registerLoading(locale='tr'){
 const token=Symbol('loading'),now=Date.now();
 // Consecutive page/model loaders share one window instead of adding ten seconds each.
 if(!active.size&&now>=snapshot.readUntil&&(!snapshot.session||now-lastEndedAt>500))snapshot={...initial,session:snapshot.session+1,readUntil:now+LOADING_READING_MS,readingDismissed:false,fact:nextDentalFact(locale)};
 active.add(token);publish({});
 return()=>{if(active.delete(token)){if(!active.size)lastEndedAt=Date.now();publish({});}};
}
export function loadingCount(){return active.size;}
export function loadingSnapshot(){return snapshot;}
export function loadingServerSnapshot(){return initial;}
export function subscribeLoading(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};}
export function dismissLoadingReading(session=snapshot.session){if(session===snapshot.session&&!snapshot.readingDismissed)publish({readingDismissed:true});}
export function advanceLoadingFact(locale:string){publish({fact:nextDentalFact(locale)});}
export function toggleLoadingFactsPaused(){publish({paused:!snapshot.paused});}
export function openKuspGame(){window.dispatchEvent(new Event('dentaya:open-kusp'));}
