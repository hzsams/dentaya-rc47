'use client';
import UiNode from '@/lib/i18n/UiNode';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {useTranslation} from '@/lib/i18n';
import {usePathname} from 'next/navigation';
import {dentalFactLanguage} from '@/lib/dental-language';
import {LOADING_PLAY_TEXT} from '@/lib/i18n/loading-play';
import {LOADING_READING_MS,dismissLoadingReading,loadingServerSnapshot,loadingSnapshot,subscribeLoading} from '@/lib/loading-activity';
import LoadingExperience from './LoadingExperience';

export default function LoadingReadingRuntime(){
 const {locale}=useTranslation(),pathname=usePathname(),copy=LOADING_PLAY_TEXT[dentalFactLanguage(locale)],activity=useSyncExternalStore(subscribeLoading,loadingSnapshot,loadingServerSnapshot),[seconds,setSeconds]=useState(LOADING_READING_MS/1000),button=useRef<HTMLButtonElement>(null),dialog=useRef<HTMLElement>(null);
 const visible=activity.session>0&&!activity.count&&!activity.readingDismissed&&(!activity.scope||activity.scope===pathname);
 useEffect(()=>{
  if(activity.readingDismissed)return;
  const remaining=activity.readUntil-Date.now();
  if(remaining<=0){dismissLoadingReading(activity.session);return;}
  const update=()=>setSeconds(Math.max(0,Math.ceil((activity.readUntil-Date.now())/1000)));
  update();const tick=window.setInterval(update,250),end=window.setTimeout(()=>dismissLoadingReading(activity.session),remaining);
  return()=>{window.clearInterval(tick);window.clearTimeout(end);};
 },[activity.session,activity.readUntil,activity.readingDismissed]);
 useEffect(()=>{
  if(!visible)return;
  const target=button.current,surface=dialog.current,previous=document.activeElement;target?.focus();
  return()=>{
   if(document.activeElement===document.body||surface?.contains(document.activeElement)){
    const restore=previous instanceof HTMLElement&&previous!==document.body&&previous.isConnected&&!surface?.contains(previous)?previous:document.getElementById('main-content');
    restore?.focus({preventScroll:true});
   }
  };
 },[visible]);
 if(!visible)return null;
 return <UiNode as="section" translateChildren={false} ref={dialog} className="dy-loading-reading" role="dialog" aria-label={copy.fact} data-loading-reading data-loading-deadline={activity.readUntil} data-loading-session={activity.session} data-experience-silent onKeyDown={e=>{
  e.stopPropagation();if(e.key==='Escape')dismissLoadingReading(activity.session);
  if(e.key==='Tab'){
   const items=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]'));
   const first=items[0],last=items.at(-1);
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  }
 }}>
  <LoadingExperience reading title={copy.ready}/>
  <UiNode as="footer" translateChildren={false} className="dy-loading-reading-controls"><UiNode as="span" translateChildren={false} aria-hidden="true">{copy.automaticTransition} · {seconds} {copy.seconds}</UiNode><UiNode as="button" translateChildren={false} ref={button} type="button" onClick={()=>dismissLoadingReading(activity.session)}>{copy.continueWork} →</UiNode></UiNode>
 </UiNode>;
}
