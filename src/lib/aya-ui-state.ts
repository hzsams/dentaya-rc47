import {normalizeMemory,type AyaWorkingMemory} from '../../electron/aya/agent.cjs';

/** Status IPC calls can finish out of order, including across StrictMode cleanup. */
export function createAyaStatusRefreshGate() {
 let revision=0;
 return {
  begin:()=>++revision,
  isCurrent:(request:number)=>request===revision,
  invalidate:()=>{revision++;},
 };
}
export function selectAyaModel(current:string,models:ReadonlyArray<{name:string}>,preferred='') {
 return models.some(model=>model.name===current)?current:models.some(model=>model.name===preferred)?preferred:models[0]?.name??'';
}

export type AyaMemoryEdit={sessionId:string;baseline:string;goal:string;decisions:string;questions:string};
export type AyaMemoryEditResult={ok:true;memory:AyaWorkingMemory}|{ok:false;reason:'busy'|'session-changed'|'memory-changed'|'invalid'};
const memoryRevision=(memory:AyaWorkingMemory)=>JSON.stringify(normalizeMemory(memory));
export function beginAyaMemoryEdit(sessionId:string,memory:AyaWorkingMemory):AyaMemoryEdit {
 const normalized=normalizeMemory(memory);
 return {sessionId,baseline:memoryRevision(normalized),goal:normalized.goal,decisions:normalized.decisions.join('\n'),questions:normalized.openQuestions.join('\n')};
}
/** Never let a delayed editor overwrite a newer model result or another session. */
export function checkAyaMemoryEdit(edit:AyaMemoryEdit,sessionId:string,memory:AyaWorkingMemory,busy:boolean):AyaMemoryEditResult {
 if(edit.sessionId!==sessionId)return {ok:false,reason:'session-changed'};
 if(edit.baseline!==memoryRevision(memory))return {ok:false,reason:'memory-changed'};
 if(busy)return {ok:false,reason:'busy'};
 const decisions=edit.decisions.split('\n').map(line=>line.trim()).filter(Boolean),openQuestions=edit.questions.split('\n').map(line=>line.trim()).filter(Boolean);
 if(edit.goal.trim().length>500||decisions.length>5||openQuestions.length>3||[...decisions,...openQuestions].some(line=>line.length>240))return {ok:false,reason:'invalid'};
 return {ok:true,memory:normalizeMemory({goal:edit.goal,decisions,openQuestions})};
}
