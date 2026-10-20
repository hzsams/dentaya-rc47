import {nextDentalFact,type DentalFact} from './dental-facts';

type LoadingSnapshot={count:number;session:number;scope:string;fact:DentalFact|null;paused:boolean};
const active=new Map<symbol,string>(),listeners=new Set<()=>void>();
const initial:LoadingSnapshot={count:0,session:0,scope:'',fact:null,paused:false};
let snapshot=initial;
function publish(patch:Partial<LoadingSnapshot>){snapshot={...snapshot,...patch,count:active.size};listeners.forEach(fn=>fn());}
export function registerLoading(locale='tr',scope=''){
 const token=Symbol('loading');
 // Activity follows actual owners, with no minimum display time or post-load
 // reading phase. Overlapping requests share a fact until the last one ends.
 if(!active.size)snapshot={...initial,session:snapshot.session+1,fact:nextDentalFact(locale)};
 active.set(token,scope);publish({scope});
 return(outcome:{cancelled?:boolean}={})=>{
  // Existing owners may identify cancellation; both outcomes release only this token.
  void outcome;
  if(!active.delete(token))return;
  publish({scope:Array.from(active.values()).at(-1)??''});
 };
}
export function loadingCount(){return active.size;}
export function loadingSnapshot(){return snapshot;}
export function loadingServerSnapshot(){return initial;}
export function subscribeLoading(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};}
export function advanceLoadingFact(locale:string){publish({fact:nextDentalFact(locale)});}
export function toggleLoadingFactsPaused(){publish({paused:!snapshot.paused});}
export function openKuspGame(){window.dispatchEvent(new Event('dentaya:open-kusp'));}
