'use client';
import UiNode from '@/lib/i18n/UiNode';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {useTranslation} from '@/lib/i18n';
import {DENTAL_FACTS,dentalFactLanguage,dentalFactSource,nextDentalFact,type DentalFact} from '@/lib/dental-facts';
import {LOADING_PLAY_TEXT} from '@/lib/i18n/loading-play';
import {advanceLoadingFact,loadingServerSnapshot,loadingSnapshot,openKuspGame,subscribeLoading,toggleLoadingFactsPaused} from '@/lib/loading-activity';
export default function DentalFacts({showGame=true,loading=false}:{showGame?:boolean;loading?:boolean}){
 const {locale}=useTranslation(),language=dentalFactLanguage(locale),copy=LOADING_PLAY_TEXT[language],[localFact,setFact]=useState<DentalFact|null>(null),[localPaused,setPaused]=useState(false),root=useRef<HTMLElement>(null),activity=useSyncExternalStore(subscribeLoading,loadingSnapshot,loadingServerSnapshot),fact=loading?activity.fact:localFact,paused=loading?activity.paused:localPaused;
 useEffect(()=>{if(!loading)setFact(nextDentalFact(language));},[language,loading]);
 useEffect(()=>{if(paused)return;let timer:ReturnType<typeof setInterval>|undefined;
  const start=()=>{clearInterval(timer);if(!document.hidden)timer=setInterval(()=>{if(!root.current?.contains(document.activeElement)){if(loading)advanceLoadingFact(language);else setFact(nextDentalFact(language));}},12000);};
  start();document.addEventListener('visibilitychange',start);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',start);};
 },[language,paused,loading]);
 const source=fact?dentalFactSource(fact):null;
 return <UiNode as="section" translateChildren={false} ref={root} className="dental-facts" lang={language} dir="ltr" aria-label={copy.fact} data-dental-fact={fact?.id??''}>
  <UiNode as="header" translateChildren={false}><UiNode as="span" translateChildren={false} className="dental-facts-icon" aria-hidden="true">✦</UiNode><UiNode as="span" translateChildren={false}>{copy.fact}</UiNode><UiNode as="span" translateChildren={false} className="dental-facts-count">{DENTAL_FACTS.length}</UiNode></UiNode>
  <UiNode as="p" translateChildren={false} className="dental-facts-sentence" aria-live="off">{fact?.[language]??'\u00a0'}</UiNode>
  <UiNode as="div" translateChildren={false} className="dental-facts-actions"><UiNode as="button" translateChildren={false} type="button" onClick={()=>loading?advanceLoadingFact(language):setFact(nextDentalFact(language))}>{copy.next}</UiNode><UiNode as="button" translateChildren={false} type="button" aria-pressed={paused} onClick={()=>loading?toggleLoadingFactsPaused():setPaused(p=>!p)}>{paused?copy.resume:copy.pause}</UiNode>{showGame&&<UiNode as="button" translateChildren={false} type="button" onClick={openKuspGame}>{copy.play}<UiNode as="span" translateChildren={false} aria-hidden="true"> ↗</UiNode></UiNode>}</UiNode>
  {source&&<UiNode as="a" translateChildren={false} className="dental-facts-source" href={source.url} target="_blank" rel="noopener noreferrer">{copy.source}: {source.name}</UiNode>}
 </UiNode>;
}
