'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import UiNode from '@/lib/i18n/UiNode';
import UserText from '@/lib/i18n/UserText';
import {useTranslation} from '@/lib/i18n';
import type {AyaCadContext} from '@/lib/aya-cad-assistance';
import {ayaProposalBlock,type AyaActionResult} from '@/lib/aya-cad-agent';
import {resolveAyaReply} from '@/lib/aya-conversation';
import {fallbackReply} from '../../../electron/aya/conversation.cjs';
import {normalizeMemory,type AyaWorkingMemory,type AyaProposal,type AyaCadTool} from '../../../electron/aya/agent.cjs';
import {ayaAgentText} from '@/lib/i18n/aya-agent';
import {CopyAyaResponse} from '../ai/AyaMessageTools';
import {WORK_TOOLS_TEXT} from '@/lib/i18n/work-tools';
import {dentalFactLanguage} from '@/lib/dental-facts';
import {cadChecklist,nextCadAction} from '../../../electron/aya/assistant.cjs';
import {readAyaKnowledge} from '@/lib/aya-knowledge';
import {readAyaState,type AyaMessage} from '@/lib/aya-local-state';
import AyaKnowledgePanel from '../ai/AyaKnowledgePanel';
type Message=AyaMessage&{proposals?:AyaProposal[]};
type Event={tool:AyaCadTool;ok:boolean;result:string};
type Session={messages:Message[];memory:AyaWorkingMemory;events:Event[]};
// Panel close/reopen keeps the current task in process memory, scoped to project/source/unit.
const sessions=new Map<string,Session>();
const sessionListeners=new Map<string,Set<(session:Session)=>void>>();
function cacheSession(scope:string,session:Session){
 if(!scope)return;
 sessions.delete(scope);sessions.set(scope,session);
 while(sessions.size>8)sessions.delete(sessions.keys().next().value!);
}
type Props={context:AyaCadContext;onClose:()=>void;onRun?:(p:AyaProposal)=>Promise<AyaActionResult>;onPlace?:()=>void;onSave?:()=>void;onSetup?:()=>void;onShow?:()=>void;onNext?:()=>void};
export default function CadAyaPanel({context,onClose,onRun,onPlace,onSave,onSetup,onShow,onNext}:Props){
 const {t,locale}=useTranslation(),copy=ayaAgentText(locale),toolsCopy=WORK_TOOLS_TEXT[dentalFactLanguage(locale)];
 const scope=context.scope??'',saved=sessions.get(scope);
 const [draft,setDraft]=useState(''),[messages,setMessages]=useState<Message[]>(()=>saved?.messages??[]),[memory,setMemory]=useState(()=>saved?.memory??normalizeMemory(null)),[events,setEvents]=useState<Event[]>(()=>saved?.events??[]);
 const [activeAction,setActiveAction]=useState<AyaCadTool|null>(null);
 const [busy,setBusy]=useState(false),[model,setModel]=useState(''),[error,setError]=useState(''),[models,setModels]=useState<{name:string;size:number;label?:string}[]>([]);
 const live=useRef(true),lock=useRef(false),request=useRef(''),contextRef=useRef(context),logRef=useRef<HTMLDivElement|null>(null),followBottom=useRef(true);
 const cancelPending=useRef<((reason:string)=>void)|null>(null),requestSnapshot=useRef('');
 // Publish committed context before a click; render must never mutate a shared ref.
 useLayoutEffect(()=>{contextRef.current=context;if(request.current&&requestSnapshot.current!==context.snapshot)cancelPending.current?.('LOCAL_CONTEXT_CHANGED');},[context]);
 function cancel(){cancelPending.current?.('LOCAL_CANCELLED');void window.dentayaDesktop?.localAyaCancel?.();}

 useLayoutEffect(()=>{cacheSession(scope,{messages:messages.slice(-64),memory,events:events.slice(-8)});},[scope,messages,memory,events]);
 useEffect(()=>{
  if(!scope)return;
  const update=(session:Session)=>{if(live.current){setMessages(session.messages);setMemory(session.memory);setEvents(session.events);}};
  const listeners=sessionListeners.get(scope)??new Set<(session:Session)=>void>();listeners.add(update);sessionListeners.set(scope,listeners);
  return()=>{listeners.delete(update);if(!listeners.size)sessionListeners.delete(scope);};
 },[scope]);
 useEffect(()=>{const log=logRef.current;if(log&&followBottom.current)log.scrollTop=log.scrollHeight;},[messages,busy]);
 async function refreshModels(){
  try{const result=await window.dentayaDesktop?.localAyaStatus?.();if(live.current&&result?.ok){setModels(result.models);setModel(current=>result.models.some(m=>m.name===current)?current:result.models[0]?.name??'');}}catch{}
 }
 useEffect(()=>{live.current=true;void refreshModels();const focus=()=>void refreshModels();window.addEventListener('focus',focus);
  return()=>{live.current=false;window.removeEventListener('focus',focus);if(request.current){cancelPending.current?.('LOCAL_CANCELLED');void window.dentayaDesktop?.localAyaCancel?.();}};
 },[]);
 async function send(text=draft,previous=messages,actionEvents=events){
  const prompt=text.trim();if(!prompt||prompt.length>8000||lock.current||contextRef.current.isSaving)return;
  lock.current=true;followBottom.current=true;setBusy(true);setDraft('');setError('');
  const requestId=crypto.randomUUID(),captured=contextRef.current;
  request.current=requestId;requestSnapshot.current=captured.snapshot??'';
  const base=previous.slice(-64);setMessages([...base,{role:'user',content:prompt}]);
  let timeout:ReturnType<typeof setTimeout>|undefined;
  try{
   const notebook=readAyaKnowledge(),api=window.dentayaDesktop,options=readAyaState().options,cadContext={...captured,recentActions:actionEvents.slice(-8)};
   const result=await resolveAyaReply({prompt,cadContext,knowledge:notebook.enabled?notebook.items:[],history:base,options,locale},{t,callModel:model&&api?.localAyaChat?()=>{
    const cancelled=new Promise<{ok:false;error:string}>(resolve=>{cancelPending.current=reason=>{resolve({ok:false,error:reason});if(reason!=='LOCAL_CANCELLED')void api.localAyaCancel?.();};timeout=setTimeout(()=>cancelPending.current?.('LOCAL_TIMEOUT'),185000);});
    return Promise.race([api.localAyaChat!({agent:true,workingMemory:memory,requestId,prompt,model,locale,detail:'detailed',options,history:base,knowledge:notebook.enabled?notebook.items:[],useMemory:notebook.enabled,cadContext}),cancelled]);
   }:undefined});
   if(!live.current||request.current!==requestId)return;
   // A response for another geometry/task cannot change this task's memory or offer executable tools.
   if(captured.scope!==contextRef.current.scope||captured.snapshot!==contextRef.current.snapshot){setDraft(prompt);setError(copy.stale);return;}
   setMessages([...base,{role:'user',content:prompt},{role:'assistant',content:result.output,engine:result.engine,references:result.references,proposals:result.proposals}]);
   if(result.workingMemory)setMemory(result.workingMemory);
   if(result.cancelled||result.warning)setDraft(prompt);
   if(result.warning)setError(result.warning==='LOCAL_INVALID_PLAN'?copy.invalid:t('Yerel model yanıt veremedi. Motoru ve model seçimini kontrol edin.'));
  }catch{if(live.current&&request.current===requestId){const reply=fallbackReply(prompt,{locale,history:base,modelError:'LOCAL_ERROR'});setMessages([...base,{role:'user',content:prompt},{role:'assistant',content:reply.output,engine:'core'}]);setDraft(prompt);}}
  finally{if(timeout)clearTimeout(timeout);if(request.current===requestId){lock.current=false;request.current='';cancelPending.current=null;if(live.current){setBusy(false);}}}
 }
 async function apply(proposal:AyaProposal){
  if(!onRun||lock.current)return;
  const captured=contextRef.current;
  if(ayaProposalBlock(proposal,captured)){setError(copy.stale);return;}
  lock.current=true;setBusy(true);setActiveAction(proposal.tool);setError('');followBottom.current=true;
  let result:AyaActionResult;
  try{result=await onRun(proposal);}catch{result={ok:false,message:copy.failed};}
  lock.current=false;
  const cached=sessions.get(captured.scope??''),nextEvents=[...(cached?.events??events),{tool:proposal.tool,ok:result.ok,result:result.message}].slice(-8);
  const nextMessages:Message[]=[...(cached?.messages??messages),{role:'assistant',engine:'core',content:copy.toolResult+' · '+copy.tools[proposal.tool]+'\n'+(result.ok?copy.done:copy.failed)+' · '+result.message}];
  // Publish the actual result into its original unit, including a panel reopened before completion.
  const session={messages:nextMessages.slice(-64),memory:cached?.memory??memory,events:nextEvents};
  if(captured.scope)cacheSession(captured.scope,session);
  if(!live.current){if(captured.scope)for(const update of sessionListeners.get(captured.scope)??[])update(session);return;}
  setBusy(false);setActiveAction(null);
  if(captured.scope!==contextRef.current.scope)return;
  setEvents(nextEvents);setMessages(nextMessages);if(!result.ok)setError(result.message);
  // One bounded follow-up interprets actual check output, only for the unchanged geometry.
  if(result.ok&&proposal.tool==='inspect'&&model){await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));if(live.current&&captured.scope===contextRef.current.scope&&captured.dataToken===contextRef.current.dataToken)void send(copy.interpret,nextMessages,nextEvents);}
 }
 const checks=cadChecklist(context,t),legacy=nextCadAction(context),legacyActions={setup:{label:t('İş tanımı'),run:onSetup},show:{label:t('Tümünü göster'),run:onShow},place:{label:t('Koleye yerleştir'),run:onPlace},save:{label:t('Kaydet ve çık'),run:onSave},next:{label:t('Sonraki'),run:onNext}};
 const currentProposal=(tool:AyaCadTool):AyaProposal=>({tool,reason:copy.tools[tool],scope:context.scope??'',snapshot:context.snapshot??''});
 return <UiNode as="section" className="cad-aya-panel" role="dialog" aria-label="AYA çalışma asistanı">
  <UiNode as="header"><UiNode as="strong" translateChildren={false}>{copy.title}</UiNode><UiNode as="button" type="button" onClick={onClose}>Kapat</UiNode></UiNode>
  <UiNode as="p"><UiNode as="span">Çalışma ünitesi</UiNode><UserText>{' · '+(context.unit||'—')}</UserText></UiNode>
  <UiNode as="p" className="aya-agent-status" translateChildren={false}>{model?copy.model:copy.fallback}</UiNode>
  <UiNode as="details" className="cad-aya-checklist"><UiNode as="summary" translateChildren={false}>{toolsCopy.check}<UiNode as="small">{checks.filter(item=>item.state==='ready').length} / {checks.length}</UiNode></UiNode><UiNode as="p" translateChildren={false}>{toolsCopy.snapshot}</UiNode><UiNode as="ul">{checks.map(item=><UiNode as="li" key={item.id} data-check-id={item.id} data-check-state={item.state} title={item.state==='ready'?undefined:item.message} translateChildren={false}><UiNode as="span">{toolsCopy[item.id]}</UiNode><UiNode as="strong">{toolsCopy[item.state]}</UiNode></UiNode>)}</UiNode></UiNode>
  {!onRun&&legacy&&<UiNode as="div" className="cad-aya-next" translateChildren={false}><UiNode as="small">{toolsCopy.nextAction}</UiNode><UiNode as="button" type="button" onClick={legacyActions[legacy].run}>{legacyActions[legacy].label}</UiNode></UiNode>}
  {onRun&&<UiNode as="div" className="cad-aya-actions" translateChildren={false}><UiNode as="button" type="button" disabled={busy||context.isSaving} onClick={()=>void send(copy.review)}>{copy.refresh}</UiNode>{(['inspect','show-all','undo','save'] as const).filter(id=>context.availableTools?.includes(id)).map(id=><UiNode as="button" type="button" key={id} data-aya-tool={id} disabled={busy} onClick={()=>void apply(currentProposal(id))}>{copy.tools[id]}</UiNode>)}</UiNode>}
  <UiNode as="details" className="aya-working-memory" translateChildren={false}><UiNode as="summary">{copy.memory}</UiNode><UiNode as="strong">{copy.goal}</UiNode><UserText>{memory.goal||'—'}</UserText>{memory.decisions.map((s,i)=><UiNode as="p" key={'d'+i}><UserText>{s}</UserText></UiNode>)}{memory.openQuestions.map((s,i)=><UiNode as="p" key={'q'+i}><UserText>{s}</UserText></UiNode>)}<UiNode as="button" disabled={busy} onClick={()=>setMemory(normalizeMemory(null))}>{copy.clear}</UiNode></UiNode>
  {onRun&&<UiNode as="details" className="aya-cad-evidence" translateChildren={false}><UiNode as="summary">{copy.evidence}</UiNode>{context.report?<UiNode as="div"><UiNode as="p">{context.report.boundaryEdges??'—'} {copy.openEdges}</UiNode><UiNode as="p">{context.report.contactReference==='antagonist'?`${context.report.collisionSamples??0} / ${context.report.samples??0} ${copy.samples}`:copy.noAntagonist}</UiNode>{context.report.minimumWallEstimateMm!==undefined&&<UiNode as="p">{copy.estimate}: {context.report.minimumWallEstimateMm.toFixed(2)} mm</UiNode>}{context.report.warnings.map((s,i)=><UiNode as="p" key={i}><UserText>{s}</UserText></UiNode>)}</UiNode>:<UiNode as="p">{copy.noReport}</UiNode>}</UiNode>}
  {models.length>0&&<UiNode as="label">Kurulu yerel model<UiNode as="select" value={model} disabled={busy} onChange={e=>setModel(e.target.value)} aria-label="Kurulu yerel model">{models.map(m=><UiNode as="option" key={m.name} value={m.name} translateChildren={false}>{m.label??m.name}</UiNode>)}</UiNode></UiNode>}
  <AyaKnowledgePanel/>
  <UiNode as="div" role="log" ref={logRef} onScroll={e=>{const log=e.currentTarget;followBottom.current=log.scrollHeight-log.scrollTop-log.clientHeight<40;}} className="cad-aya-messages" aria-live="polite">
   {messages.map((m,i)=><UiNode as="article" key={i}><UiNode as="strong">{m.role==='user'?'Siz':m.engine==='model'?'AYA · yerel':m.engine==='core'?'AYA Core':'Uygulama rehberi · belge metni'}</UiNode><UserText>{m.content}</UserText>{m.references?.map(r=><UiNode as="small" key={r.id}><UserText>{r.title}</UserText></UiNode>)}
    {Boolean(m.proposals?.length)&&<UiNode as="div" className="aya-proposals" translateChildren={false}><UiNode as="strong">{copy.actions}</UiNode>{m.proposals!.map(p=>{const stale=ayaProposalBlock(p,context)!==null;return <UiNode as="div" key={p.tool} data-proposal-tool={p.tool}><UiNode as="strong">{copy.tools[p.tool]}</UiNode><UserText>{p.reason}</UserText><UiNode as="button" type="button" disabled={busy||stale||!onRun} onClick={()=>void apply(p)}>{stale?copy.stale:copy.apply}</UiNode></UiNode>;})}</UiNode>}
    {m.role==='assistant'&&<CopyAyaResponse text={m.content}/>}</UiNode>)}
   {busy&&<UiNode as="p" role="status" translateChildren={false}>{copy.planning}</UiNode>}
  </UiNode>
  {error&&<UiNode as="p" role="alert"><UserText>{error}</UserText></UiNode>}
  <UiNode as="form" onSubmit={e=>{e.preventDefault();void send();}}><UiNode as="textarea" aria-label="AYA’ya mesajınız" placeholder="AYA’ya bir şey sorun…" maxLength={8000} rows={3} value={draft} onChange={e=>setDraft(e.target.value)} disabled={busy||context.isSaving}/>{busy?activeAction?<UiNode as="button" key="action" type="button" disabled translateChildren={false}>{copy.tools[activeAction]}</UiNode>:<UiNode as="button" key="stop" type="button" onClick={e=>{e.preventDefault();cancel();}}>Durdur</UiNode>:<UiNode as="button" key="send" type="submit" disabled={context.isSaving||!draft.trim()}>Gönder</UiNode>}</UiNode>
  <UiNode as="small" translateChildren={false}>{copy.copied}</UiNode>
 </UiNode>;
}
