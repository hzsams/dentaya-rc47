import {nextDentalFact,type DentalFact} from './dental-facts';

export const LOADING_READING_MS=5_000;
type LoadingSnapshot={count:number;session:number;scope:string;readUntil:number;readingDismissed:boolean;fact:DentalFact|null;paused:boolean};
const active=new Set<symbol>(),listeners=new Set<()=>void>();
const initial:LoadingSnapshot={count:0,session:0,scope:'',readUntil:0,readingDismissed:true,fact:null,paused:false};
let snapshot=initial,lastEndedAt=0,cancelledSession=0;
function publish(patch:Partial<LoadingSnapshot>){snapshot={...snapshot,...patch,count:active.size};listeners.forEach(fn=>fn());}
export function registerLoading(locale='tr',scope=''){
 const token=Symbol('loading'),now=Date.now();
 // A page, its data and its models share one five-second deadline. Completing a
 // stage, changing language or dismissing the reading screen never resets it.
 if(!active.size&&now>=snapshot.readUntil&&(!snapshot.session||now-lastEndedAt>500))snapshot={...initial,session:snapshot.session+1,readUntil:now+LOADING_READING_MS,readingDismissed:false,fact:nextDentalFact(locale)};
 const session=snapshot.session;
 const resumeCancelled=cancelledSession===session&&now<snapshot.readUntil;
 cancelledSession=0;active.add(token);publish({scope,...(resumeCancelled?{readingDismissed:false}:{})});
 return({cancelled=false}:{cancelled?:boolean}={})=>{
  if(!active.delete(token))return;
  if(!active.size)lastEndedAt=Date.now();
  const abandoned=cancelled&&!active.size&&session===snapshot.session;
  if(abandoned)cancelledSession=session;
  publish(abandoned?{readingDismissed:true}:{});
 };
}
export function loadingCount(){return active.size;}
export function loadingSnapshot(){return snapshot;}
export function loadingServerSnapshot(){return initial;}
export function subscribeLoading(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};}
export function dismissLoadingReading(session=snapshot.session){if(session===snapshot.session){cancelledSession=0;if(!snapshot.readingDismissed)publish({readingDismissed:true});}}
export function advanceLoadingFact(locale:string){publish({fact:nextDentalFact(locale)});}
export function toggleLoadingFactsPaused(){publish({paused:!snapshot.paused});}
export function openKuspGame(){window.dispatchEvent(new Event('dentaya:open-kusp'));}
