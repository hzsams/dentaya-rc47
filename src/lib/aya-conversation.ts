/** One model-first policy for main chat and CAD, with an honest offline fallback. */
import {answerOwned} from '../../electron/aya/assistant.cjs';
import {answerDialogue} from '../../electron/aya/dialogue.cjs';
import {answerCatalog,fallbackReply,isCatalogQuestion,safetyReply} from '../../electron/aya/conversation.cjs';
import {ayaDocumentGuide} from './aya-guide';
import {ayaCadHelp,type AyaCadContext} from './aya-cad-assistance';
import {normalizeMemory,type AyaWorkingMemory,type AyaProposal} from '../../electron/aya/agent.cjs';
import type {AyaMessage,AyaOptions} from './aya-local-state';

type ModelResult={ok:boolean;output?:string;error?:string;references?:AyaMessage['references'];workingMemory?:AyaWorkingMemory;proposals?:AyaProposal[]};
export type AyaReply={ok:true;output:string;engine:'model'|'guide'|'core';references:NonNullable<AyaMessage['references']>;warning?:string;cancelled?:boolean;workingMemory?:AyaWorkingMemory;proposals?:AyaProposal[]};
type Input={prompt:string;history?:AyaMessage[];workingMemory?:AyaWorkingMemory;knowledge?:unknown;cadContext?:AyaCadContext|null;options?:Partial<AyaOptions>;locale?:string;forceModel?:boolean};
export async function resolveAyaReply(input:Input,{t=s=>s,callModel}:{t?:(s:string)=>string;callModel?:()=>Promise<ModelResult>}={}):Promise<AyaReply>{
 const {prompt,knowledge=[],cadContext=null,history=[],options={},locale='tr',forceModel=false}=input;
 if(!prompt.trim()||prompt.length>8000)throw Error('INVALID_PROMPT');
 const context={knowledge,cadContext,history,options,locale};
 const safety=safetyReply(prompt,{locale});if(safety)return safety;
 const modelFailure=(error:string):AyaReply=>{
  // A failed model must not make a basic product question unanswerable. Keep
  // cancellation final and label both the Core answer and the failed attempt.
  const known=error==='LOCAL_CANCELLED'?null:answerDialogue(prompt,context);
  if(known)return {...known,warning:error,output:known.output+'\n\n'+(locale==='tr'?'Yerel model bu isteği tamamlayamadı; bu yanıt AYA Core tarafından hazırlandı.':'The local model could not complete this request; AYA Core prepared this reply.')};
  return {...fallbackReply(prompt,{locale,history,modelEnabled:true,modelError:error}),warning:error,cancelled:error==='LOCAL_CANCELLED'};
 };
 // Ready models handle all normal language, including definitions and follow-ups.
 if(callModel){
  try{
   const result=await callModel();
   if(result.ok&&typeof result.output==='string'&&result.output.trim())return {ok:true,engine:'model',output:result.output,references:result.references??[],workingMemory:result.workingMemory?normalizeMemory(result.workingMemory):undefined,proposals:result.proposals??[]};
   const error=result.error||'LOCAL_EMPTY_RESPONSE';
   return modelFailure(error);
  }catch(error){return modelFailure(error instanceof Error&&(error.name==='AbortError'||error.message==='LOCAL_CANCELLED')?'LOCAL_CANCELLED':'LOCAL_ERROR');}
 }

 if(!forceModel){
  // Explicit session notes remain inspectable even while no model is available.
  const memoryQuestion=prompt.toLocaleLowerCase('tr').normalize('NFKD').replace(/\p{M}/gu,'').replace(/ı/g,'i');
  if(/(?:calisma|sohbet|konusma).*(?:hedef|karar|acik soru)|^(?:hedefimiz|aldigimiz kararlar|onceki kararimiz|neye karar vermistik|planimiz ne|what.*(?:our goal|we decide)|our goal|our decisions)/.test(memoryQuestion)){
   const memory=normalizeMemory(input.workingMemory),tr=locale==='tr';
   const output=memory.goal||memory.decisions.length||memory.openQuestions.length?
    [(tr?'Çalışma hedefi':'Work goal')+': '+(memory.goal||'—'),(tr?'Kararlar':'Decisions')+':',...memory.decisions.map(x=>'• '+x),(tr?'Açık sorular':'Open questions')+':',...memory.openQuestions.map(x=>'• '+x)].join('\n'):
    tr?'Bu sohbet için kayıtlı hedef veya karar yok. Sohbet ayarları → Bellek ve notlar bölümünde bir hedef ekleyebilirsiniz.':'No goal or decision is recorded for this conversation. Add a goal in Conversation settings → Memory and notes.';
   return {ok:true,engine:'core',output,references:[]};
  }
  if(options.useKnowledge!==false&&/\bcmd\b/i.test(prompt)&&/kurulum|güncelle|guncelle|windows|derle/i.test(prompt)){
   const install=ayaDocumentGuide(prompt,t,history);if(install.output&&install.references?.some(r=>r.id==='desktop-install'))return {ok:true,engine:'guide',output:install.output,references:install.references};
  }
  // Exact catalogue questions are intentional definitions/checks, not CAD commands.
  const canonical=options.useKnowledge!==false&&isCatalogQuestion(prompt)?answerCatalog(prompt,context):null;
  const owned=canonical??answerOwned(prompt,{...context,includeCatalog:!cadContext},t);
  if(owned)return owned;
  const cad=cadContext?ayaCadHelp(prompt,cadContext,t):null;
  if(cad)return {ok:true,engine:'core',output:cad,references:[]};
  const catalogue=options.useKnowledge!==false?answerCatalog(prompt,context):null;
  if(catalogue)return catalogue;
 }
 if(forceModel)return {...fallbackReply(prompt,{locale,history,modelError:'MODEL_MISSING'}),warning:'MODEL_MISSING'};
 if(options.useKnowledge!==false){const guide=ayaDocumentGuide(prompt,t,history);if(guide.ok&&guide.output&&guide.references?.length)return {ok:true,engine:'guide',output:guide.output,references:guide.references};}
 return fallbackReply(prompt,{locale,history,modelEnabled:false});
}
