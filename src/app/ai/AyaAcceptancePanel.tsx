'use client';
import {useEffect,useRef,useState} from 'react';
import {createAyaAcceptanceRunner,AYA_ACCEPTANCE_STEP_COUNT,type AyaAcceptanceReport,type AyaAcceptanceProgress} from '../../../electron/aya/acceptance.cjs';
import UiNode from '@/lib/i18n/UiNode';
import UserText from '@/lib/i18n/UserText';
import {useTranslation} from '@/lib/i18n';
import {ayaAcceptanceCheckText,ayaAcceptanceText} from '@/lib/i18n/aya-acceptance';
import {ayaSetupError} from '@/lib/aya-setup-status';
type Props={model:string;disabled:boolean;beforeAcceptance?:()=>Promise<boolean>;onAcceptanceBusyChange?:(busy:boolean)=>void;onRunningChange?:(busy:boolean)=>void};
export default function AyaAcceptancePanel({model,disabled,beforeAcceptance,onAcceptanceBusyChange,onRunningChange}:Props){
 const {locale}=useTranslation(),copy=ayaAcceptanceText(locale);
 const [running,setRunning]=useState(false),[cancelling,setCancelling]=useState(false),[report,setReport]=useState<AyaAcceptanceReport|null>(null),[progress,setProgress]=useState<AyaAcceptanceProgress|null>(null),[error,setError]=useState('');
 const lock=useRef(false),controller=useRef<AbortController|null>(null),mounted=useRef(true);
 const [runner]=useState(()=>createAyaAcceptanceRunner({chat:async input=>await window.dentayaDesktop?.localAyaChat?.(input)??{ok:false,error:'LOCAL_RUNTIME_MISSING'},cancel:async()=>{await window.dentayaDesktop?.localAyaCancel?.();}}));
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.current?.abort();};},[runner]);
 async function start(){
  if(lock.current||disabled||!model)return;
  lock.current=true;setRunning(true);setCancelling(false);setError('');setReport(null);setProgress(null);
  const abort=new AbortController();controller.current=abort;
  onRunningChange?.(true);onAcceptanceBusyChange?.(true);
  try{
   if(beforeAcceptance&&!await beforeAcceptance()){if(mounted.current)setError(copy.engineBusy);return;}
   if(abort.signal.aborted)return;
   const result=await runner.run({model,locale,provenance:'desktop-local',signal:abort.signal,onProgress:value=>{if(mounted.current)setProgress(value);}});
   if(mounted.current)setReport(result);
  }catch{if(mounted.current)setError(ayaSetupError(undefined,locale));}
  finally{await runner.whenIdle();controller.current=null;lock.current=false;if(mounted.current){setRunning(false);setCancelling(false);}onRunningChange?.(false);onAcceptanceBusyChange?.(false);}
 }
 function cancel(){setCancelling(true);controller.current?.abort();}
 function exportReport(){
  if(!report||running)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=`DentAYA-AYA-acceptance-${report.startedAt}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),0);
 }
 const completed=report?.steps.length??(progress?progress.step-(progress.status==='running'?1:0):0);
 return <UiNode as="section" className="aya-acceptance-panel" aria-labelledby="aya-acceptance-title" translateChildren={false}>
  <UiNode as="h3" id="aya-acceptance-title">{copy.title}</UiNode><UiNode as="p">{copy.hint}</UiNode><UiNode as="p">{copy.review}</UiNode>
  <UiNode as="div" className="aya-engine-actions"><UiNode as="button" type="button" disabled={disabled||running||!model} onClick={()=>void start()}>{copy.start}</UiNode>{running&&<UiNode as="button" type="button" disabled={cancelling} onClick={cancel}>{copy.cancel}</UiNode>}{report&&<UiNode as="button" type="button" disabled={running} onClick={exportReport}>{copy.export}</UiNode>}</UiNode>
  {!model&&<UiNode as="p">{copy.awaiting}</UiNode>}
  {running&&<UiNode as="div" className="aya-setup-progress"><UiNode as="p" role="status">{cancelling?copy.stopping:copy.running} · {Math.min(AYA_ACCEPTANCE_STEP_COUNT,completed+1)} / {AYA_ACCEPTANCE_STEP_COUNT}</UiNode><UiNode as="progress" aria-label={copy.progress} max={AYA_ACCEPTANCE_STEP_COUNT} value={completed}/></UiNode>}
  {error&&<UiNode as="p" role="alert">{error}</UiNode>}
  {report&&<><UiNode as="p" role="status">{copy[report.status]}</UiNode>{report.error&&report.status!=='cancelled'&&<UiNode as="p" role="alert">{ayaSetupError(report.error,locale)}</UiNode>}<UiNode as="details" className="aya-acceptance-transcript"><UiNode as="summary">{copy.transcript} · {report.steps.length} / {AYA_ACCEPTANCE_STEP_COUNT}</UiNode>{report.steps.map((step,index)=><UiNode as="article" key={step.id}><UiNode as="h4">{index+1} · {copy[step.kind]}</UiNode><UiNode as="strong">{copy.prompt}</UiNode><UiNode as="pre"><UserText>{step.prompt}</UserText></UiNode><UiNode as="strong">{copy.reply}</UiNode><UiNode as="pre"><UserText>{step.output||copy.empty}</UserText></UiNode><UiNode as="ul">{step.checks.map(check=><UiNode as="li" key={check.id}>{check.category==='contract'?copy.contract:copy.signal} · <UserText>{ayaAcceptanceCheckText(locale,check.id)}</UserText> · {check.pass?copy.pass:copy.fail}</UiNode>)}</UiNode></UiNode>)}</UiNode></>}
 </UiNode>;
}
