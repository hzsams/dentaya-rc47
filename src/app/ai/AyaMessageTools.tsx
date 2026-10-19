'use client';
import {useState} from 'react';
import UiNode from '@/lib/i18n/UiNode';
import {useTranslation} from '@/lib/i18n';
import {dentalFactLanguage} from '@/lib/dental-language';
import {WORK_TOOLS_TEXT} from '@/lib/i18n/work-tools';
import type {AyaMessage} from '@/lib/aya-local-state';
import {DENTAYA_RELEASE} from '@/lib/release';
export function CopyAyaResponse({text}:{text:string}){
 const {locale}=useTranslation(),copy=WORK_TOOLS_TEXT[dentalFactLanguage(locale)],[state,setState]=useState('');
 return <UiNode as="div" className="aya-response-tools" translateChildren={false}><UiNode as="button" type="button" onClick={async()=>{try{await navigator.clipboard.writeText(text);setState(copy.copied);}catch{setState(copy.copyFailed);}}}>{copy.copy}</UiNode><UiNode as="small" role="status">{state}</UiNode></UiNode>;
}
export function ExportAyaConversation({messages,sessionId,disabled=false}:{messages:AyaMessage[];sessionId:string;disabled?:boolean}){
 const {locale}=useTranslation(),copy=WORK_TOOLS_TEXT[dentalFactLanguage(locale)],[state,setState]=useState('');
 function download(){
  const blob=new Blob([JSON.stringify({format:'dentaya-aya-conversation',version:1,release:DENTAYA_RELEASE.version,exportedAt:new Date().toISOString(),sessionId,messages},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=`DentAYA_AYA_${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setState(copy.exported);
 }
 return <UiNode as="div" className="aya-response-tools" translateChildren={false}><UiNode as="button" type="button" disabled={disabled||!messages.length} onClick={download}>{copy.export}</UiNode><UiNode as="small" role="status">{state}</UiNode></UiNode>;
}
