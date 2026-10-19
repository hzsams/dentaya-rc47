'use client';
import UiNode from '@/lib/i18n/UiNode';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {useTranslation} from '@/lib/i18n';
import {LOADING_PLAY_TEXT} from '@/lib/i18n/loading-play';
import {dentalFactLanguage} from '@/lib/dental-facts';
import {loadingCount,subscribeLoading} from '@/lib/loading-activity';
import MiniGameHub from './MiniGameHub';
import {MINI_GAME_TEXT} from '@/lib/i18n/mini-games';
export default function DentalBreakRuntime(){
 const {locale}=useTranslation(),language=dentalFactLanguage(locale),copy=LOADING_PLAY_TEXT[language],games=MINI_GAME_TEXT[language],count=useSyncExternalStore(subscribeLoading,loadingCount,()=>0),[open,setOpen]=useState(false),[startedDuringLoad,setStartedDuringLoad]=useState(false),trigger=useRef<HTMLElement|null>(null),close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const show=()=>{trigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setStartedDuringLoad(loadingCount()>0);setOpen(true);};window.addEventListener('dentaya:open-kusp',show);return()=>window.removeEventListener('dentaya:open-kusp',show);},[]);
 useEffect(()=>{if(!open)return;close.current?.focus();return()=>{const target=trigger.current?.isConnected?trigger.current:document.getElementById('main-content');target?.focus();};},[open]);
 if(!open)return null;
 return <UiNode as="aside" translateChildren={false} className="dental-break-sheet" role="dialog" aria-label={games.hub} lang={language} dir="ltr" onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape')setOpen(false);}} data-experience-silent>
  <UiNode as="header" translateChildren={false}><UiNode as="div" translateChildren={false}><UiNode as="small" translateChildren={false}>{copy.tag}</UiNode><UiNode as="h2" translateChildren={false}>{games.hub}</UiNode></UiNode><UiNode as="button" translateChildren={false} ref={close} type="button" aria-label={copy.close} onClick={()=>setOpen(false)}>×</UiNode></UiNode>
  {startedDuringLoad&&<UiNode as="p" translateChildren={false} className={'dental-break-status'+(!count?' is-ready':'')} role="status">{count?copy.loading:copy.ready}</UiNode>}
  <MiniGameHub/>
 </UiNode>;
}
