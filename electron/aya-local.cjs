'use strict';
const {prepareContext,retainedReferences,guide}=require('./aya/core.cjs');
const {readAgentReply,normalizeHistory,fitMessagesToBudget,CONTEXT_MARKER}=require('./aya/agent.cjs');
const ORIGIN='http://127.0.0.1:11434';
const {LANGUAGES}=require('./aya/language-packs.cjs');
const DOWNLOAD_MODEL='qwen3:4b';
function createLocalAya({fetchImpl=fetch,managed}={}){
 let active=null,pull=null,progress={running:false,status:'',completed:0,total:0};
 async function json(path,{body,signal,timeout=6000}={}){
  const response=await fetchImpl(ORIGIN+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(timeout)]):AbortSignal.timeout(timeout)});
  if(!response.ok)throw Error(response.status===404?'MODEL_MISSING':'LOCAL_REQUEST_FAILED');
  const reader=response.body.getReader();let size=0;const chunks=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2_000_000)throw Error('LOCAL_RESPONSE_TOO_LARGE');chunks.push(value);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}finally{await reader.cancel().catch(()=>{});}
 }
 function isLocal(m){return m&&typeof m.name==='string'&&m.name.length<=120&&m.size>0&&m.details?.format==='gguf'&&!m.remote_model&&!m.remote_host&&!/(?:^|[-:])cloud(?:$|[-:])/i.test(m.name);}
 async function models(){const data=await json('/api/tags');return (Array.isArray(data.models)?data.models:[]).filter(isLocal).map(m=>({name:m.name,size:m.size}));}
 async function status(){if(managed){const local=await managed.status();if(local.installed||local.progress.running||local.models.length)return {ok:local.installed,models:local.models,managed:local,progress:local.progress};try{return {ok:true,models:await models(),managed:local,progress:local.progress};}catch{return {ok:false,models:[],managed:local,progress:local.progress,error:'AYA_ENGINE_MISSING'};}}try{return {ok:true,models:await models(),progress:{...progress}};}catch{return {ok:false,models:[],error:'LOCAL_RUNTIME_MISSING',progress:{...progress}};}}
 async function chat(input,owner,translate=s=>s,onToken=()=>{}){
  if(active||pull||managed?.isBusy())return {ok:false,error:'LOCAL_BUSY'};
  if(!input||typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>8000||typeof input.model!=='string'||!input.model.trim()||input.model.length>120)return {ok:false,error:'INVALID_PROMPT'};
  const controller=new AbortController();active={owner,controller};
  const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(180000)]);
  try{
   const task=(async()=>{
   const prepared=prepareContext(input,translate),language=Object.hasOwn(LANGUAGES,input.locale)?LANGUAGES[input.locale]:LANGUAGES.tr;
   const history=normalizeHistory(input.history,input);
   const instructions='Reply in '+language+'. Base model: Qwen/user-selected. '+prepared.instructions;
   const messages=[{role:'system',content:instructions},{role:'user',content:CONTEXT_MARKER+JSON.stringify(prepared.context)},...history,{role:'user',content:input.prompt.trim()}];
   let references=prepared.references;
   const finish=result=>{signal.throwIfAborted();return {ok:true,...result,...(prepared.agent?readAgentReply(result.output,input):{}),model:input.model,references};};
   // Structured replies are displayed after validation, never streamed as executable JSON.
   if(managed&&input.model.startsWith('aya-local:')){
    const result=await managed.chat({model:input.model,options:prepared.options,responseSchema:prepared.agent?.schema,signal,onToken:prepared.agent?()=>{}:value=>{if(!signal.aborted)onToken(value);},onContext:budgeted=>{references=retainedReferences(prepared.references,budgeted);},messages});
    return finish(result);
   }
   if(!(await models()).some(m=>m.name===input.model))throw Error('MODEL_MISSING');
   signal.throwIfAborted();
   const info=await json('/api/show',{body:{model:input.model},signal});
   if(info.remote_model||info.remote_host||(Array.isArray(info.capabilities)&&!info.capabilities.includes('completion')))throw Error('LOCAL_MODEL_REQUIRED');
   // Ollama does not expose the selected model tokenizer here. UTF-8 bytes plus per-message
   // overhead give a conservative bound, rather than silently allowing its sliding window
   // to discard the user's initial task or the current CAD evidence.
   const budgeted=await fitMessagesToBudget(messages,{maxTokens:prepared.options.maxTokens,countTokens:items=>items.reduce((n,m)=>n+new TextEncoder().encode(m.content).length+16,0)});
   references=retainedReferences(prepared.references,budgeted);
   signal.throwIfAborted();
   const data=await json('/api/chat',{body:{model:input.model,stream:false,think:false,...(prepared.agent?{format:prepared.agent.schema}:{}),messages:budgeted,options:{num_ctx:8192,num_predict:prepared.options.maxTokens,temperature:prepared.agent?.cad?Math.min(.2,prepared.options.creativity):prepared.options.creativity},keep_alive:'5m'},signal,timeout:180000});
   if(prepared.agent&&data.done_reason==='length')throw Error('LOCAL_INVALID_PLAN');
   if(data.done!==true||typeof data.message?.content!=='string'||!data.message.content.trim())throw Error('LOCAL_EMPTY_RESPONSE');
   if(data.message.content.length>64000)throw Error('LOCAL_RESPONSE_TOO_LARGE');
   return finish({output:data.message.content.trim(),metrics:{milliseconds:Math.round((Number(data.total_duration)||0)/1e6),tokens:Math.max(0,Number(data.eval_count)||0)}});
   })();
   let abort;
   try{return await Promise.race([task,new Promise((_,reject)=>{abort=()=>reject(signal.reason);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();})]);}
   finally{signal.removeEventListener('abort',abort);}
  }catch(error){return {ok:false,error:error?.name==='AbortError'?'LOCAL_CANCELLED':error?.name==='TimeoutError'?'LOCAL_TIMEOUT':error?.message||'LOCAL_UNAVAILABLE'};}finally{if(active?.controller===controller)active=null;}
 }
 function cancel(owner){if(active?.owner===owner)active.controller.abort();return {ok:true};}
 function startDownload(owner){
  if(pull||active||managed?.isBusy())return {ok:false,error:'LOCAL_BUSY'};
  const controller=new AbortController();pull={owner,controller};progress={running:true,status:'Model indiriliyor…',completed:0,total:0};
  void(async()=>{let reader;try{
   const r=await fetchImpl(ORIGIN+'/api/pull',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:DOWNLOAD_MODEL,stream:true}),redirect:'error',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(3600000)])});
   if(!r.ok)throw Error('DOWNLOAD_FAILED');reader=r.body.getReader();const decoder=new TextDecoder();let pending='';
   while(true){const {done,value}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});if(pending.length>64000)throw Error('DOWNLOAD_FAILED');const lines=pending.split('\n');pending=lines.pop();for(const line of lines){if(!line.trim())continue;const v=JSON.parse(line);if(v.error)throw Error('DOWNLOAD_FAILED');progress={running:true,status:typeof v.status==='string'?v.status.slice(0,160):'Model indiriliyor…',completed:Number(v.completed)||0,total:Number(v.total)||0};}}
   if(!(await models()).some(m=>m.name===DOWNLOAD_MODEL))throw Error('MODEL_MISSING');progress={running:false,status:'Model indirildi. Model listesini yenileyip seçin.',completed:1,total:1};
  }catch{progress={running:false,status:controller.signal.aborted?'İndirme durduruldu.':'İndirme tamamlanamadı. Ollama ve internet bağlantısını kontrol edin.',completed:0,total:0};}finally{await reader?.cancel().catch(()=>{});pull=null;}})();
  return {ok:true};
 }
 function cancelDownload(owner){if(pull?.owner===owner)pull.controller.abort();return {ok:true};}
 return {status,chat,guide,cancel,startDownload,cancelDownload,isBusy:()=>Boolean(active||pull||managed?.isBusy())};
}
module.exports={createLocalAya,DOWNLOAD_MODEL};
