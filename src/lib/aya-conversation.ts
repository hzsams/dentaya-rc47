/** Model conversation and the explicitly selected, deterministic guide are separate paths. */
import {answerOwned} from '../../electron/aya/assistant.cjs';
import {answerMemory,isMemoryCommand} from '../../electron/aya/memory-dialogue.cjs';
import {suggestCadReply} from '../../electron/aya/cad-dialogue.cjs';
import {suggestSectionReply} from '../../electron/aya/section-dialogue.cjs';
import {answerCatalog,isCatalogQuestion,safetyReply} from '../../electron/aya/conversation.cjs';
import {ayaDocumentGuide} from './aya-guide';
import {ayaCadHelp,type AyaCadContext} from './aya-cad-assistance';
import {normalizeMemory,type AyaWorkingMemory,type AyaProposal} from '../../electron/aya/agent.cjs';
import type {AyaMessage,AyaOptions} from './aya-local-state';
import {normalizeAyaReferences} from './aya-references';

export type AyaReplyMode='conversation'|'guide';
export type AyaModelResult={ok:boolean;output?:string;error?:string;references?:AyaMessage['references'];workingMemory?:AyaWorkingMemory;proposals?:AyaProposal[]};
export type AyaReplySuccess={ok:true;kind:'model'|'guide'|'control'|'safety';output:string;engine:'model'|'guide'|'core';references:NonNullable<AyaMessage['references']>;workingMemory?:AyaWorkingMemory;proposals?:AyaProposal[]};
/** A failed inference is UI state, never an invented assistant turn or tool proposal. */
export type AyaReplyUnavailable={ok:false;kind:'unavailable';error:string;cancelled:boolean;references:[]};
export type AyaReply=AyaReplySuccess|AyaReplyUnavailable;
type Input={prompt:string;history?:AyaMessage[];workingMemory?:AyaWorkingMemory;knowledge?:unknown;cadContext?:AyaCadContext|null;options?:Partial<AyaOptions>;locale?:string;forceModel?:boolean;mode?:AyaReplyMode};
export async function resolveAyaReply(input:Input,{t=s=>s,callModel}:{t?:(s:string)=>string;callModel?:()=>Promise<AyaModelResult>}={}):Promise<AyaReply>{
 const {prompt,knowledge=[],cadContext=null,history=[],options={},locale='tr',forceModel=false,mode='conversation'}=input;
 if(!prompt.trim()||prompt.length>8000)throw Error('INVALID_PROMPT');
 const context={knowledge,cadContext,history,options,locale,workingMemory:input.workingMemory};
 const safety=safetyReply(prompt,{locale});if(safety)return {...safety,kind:'safety'};
 // Explicit session controls are deterministic, like editing the memory panel.
 // Ordinary recall and natural discussion still go to a ready local model.
 if(!forceModel&&isMemoryCommand(prompt)){const controlled=answerMemory(prompt,context);if(controlled)return {...controlled,kind:'control'};}
 const unavailable=(value:unknown):AyaReplyUnavailable=>{
  // Native/transport details are not user-authored content. Only bounded error
  // identifiers may reach the error UI; never echo a raw path or server message.
  const error=typeof value==='string'&&/^(?:LOCAL_|AYA_|MODEL_|GUIDE_)[A-Z0-9_]{1,64}$/.test(value)?value:'LOCAL_ERROR';
  return {ok:false,kind:'unavailable',error,cancelled:error==='LOCAL_CANCELLED'||error==='LOCAL_CONTEXT_CHANGED',references:[]};
 };
 // Conversation means an actual local inference, even for a known catalogue
 // question or identity. A missing/failed model cannot switch this path to Core.
 if(forceModel||mode==='conversation'){
  if(!callModel)return unavailable('MODEL_MISSING');
  try{
   const result=await callModel();
   if(result.ok&&typeof result.output==='string'&&result.output.trim())return {ok:true,kind:'model',engine:'model',output:result.output,references:normalizeAyaReferences(result.references),workingMemory:result.workingMemory?normalizeMemory(result.workingMemory):undefined,proposals:cadContext?result.proposals??[]:[]};
   const error=result.error||'LOCAL_EMPTY_RESPONSE';
   return unavailable(error);
  }catch(error){return unavailable(error instanceof Error&&error.name==='AbortError'?'LOCAL_CANCELLED':error instanceof Error?error.message:'LOCAL_ERROR');}
 }

 // This guide is reached only through an explicit selection. Its curated answers
 // and typed CAD suggestions remain available without impersonating inference.
 const guide=(reply:Omit<AyaReplySuccess,'kind'>):AyaReplySuccess=>({...reply,kind:'guide'});
 {
  const remembered=answerMemory(prompt,context);if(remembered)return guide(remembered);
  if(options.useKnowledge!==false&&/\bcmd\b/i.test(prompt)&&/kurulum|güncelle|guncelle|windows|derle/i.test(prompt)){
   const install=ayaDocumentGuide(prompt,t,history);if(install.output&&install.references?.some(r=>r.id==='desktop-install'))return guide({ok:true,engine:'guide',output:install.output,references:install.references});
  }
  // Exact catalogue questions are intentional definitions/checks, not CAD commands.
  const canonical=options.useKnowledge!==false&&isCatalogQuestion(prompt)?answerCatalog(prompt,context):null;
  if(canonical)return guide(canonical);
  const currentCad=suggestSectionReply(prompt,context)??suggestCadReply(prompt,context);if(currentCad)return guide(currentCad);
  const owned=answerOwned(prompt,{...context,includeCatalog:!cadContext},t);
  if(owned)return guide(owned);
  const cad=cadContext&&!cadContext.scope?ayaCadHelp(prompt,cadContext,t):null;
  if(cad)return guide({ok:true,engine:'core',output:cad,references:[]});
  const catalogue=options.useKnowledge!==false?answerCatalog(prompt,context):null;
  if(catalogue)return guide(catalogue);
 }
 if(options.useKnowledge!==false){const found=ayaDocumentGuide(prompt,t,history);if(found.ok&&found.output&&found.references?.length)return guide({ok:true,engine:'guide',output:found.output,references:found.references});}
 return unavailable('GUIDE_NO_MATCH');
}
