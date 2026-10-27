import {readAyaState, type AyaMessage, type AyaSession} from './aya-local-state';
import type {AyaWorkingMemory} from '../../electron/aya/agent.cjs';

export const AYA_CHAT_WORKSPACE_KEY='dentaya:aya-chat-workspace:v1';
export const AYA_CHAT_WORKSPACE_LIMIT=12;
export const AYA_CHAT_WORKSPACE_TTL=4*60*60*1000;
const DRAFT_LIMIT=8000;
type DraftRecord={id:string;draft:string;pendingQuestion:string;updatedAt:number};
type DraftStore={version:1;lastActiveId:string;updatedAt:number;drafts:DraftRecord[]};
export type AyaChatWorkspace={id:string;messages:AyaMessage[];workingMemory:AyaWorkingMemory;draft:string;pendingQuestion:string;revision:string|null;updatedAt:number};
type StorageLike=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
type WorkspaceSource={storage?:()=>StorageLike|undefined;now?:()=>number};
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;

/** Full work stays in this tab's process. The optional reload store holds only drafts. */
export function createAyaChatWorkspace(source:WorkspaceSource={}) {
 const now=source.now??Date.now;
 const entries=new Map<string,AyaChatWorkspace>();
 let lastActiveId='';
 function storage(){try{return source.storage?.();}catch{return undefined;}}
 function clearStorage(){try{storage()?.removeItem(AYA_CHAT_WORKSPACE_KEY);}catch{}}
 function validTime(value:number){return Number.isFinite(value)&&value<=now()+60_000&&value>now()-AYA_CHAT_WORKSPACE_TTL;}
 function prune(){for(const [id,value] of entries)if(!validTime(value.updatedAt))entries.delete(id);while(entries.size>AYA_CHAT_WORKSPACE_LIMIT)entries.delete(entries.keys().next().value!);if(!entries.has(lastActiveId))lastActiveId='';}
 function readDrafts():DraftStore {
  const empty:DraftStore={version:1,lastActiveId:'',updatedAt:now(),drafts:[]};
  try {
   const raw=storage()?.getItem(AYA_CHAT_WORKSPACE_KEY);
   if(!raw)return empty;
   if(raw.length>450_000){clearStorage();return empty;}
   const value=JSON.parse(raw) as Partial<DraftStore>;
   if(value.version!==1||!validTime(value.updatedAt!)||!Array.isArray(value.drafts)){clearStorage();return empty;}
   return {version:1,lastActiveId:typeof value.lastActiveId==='string'?value.lastActiveId.slice(0,80):'',updatedAt:value.updatedAt!,drafts:value.drafts.slice(0,AYA_CHAT_WORKSPACE_LIMIT).filter(item=>item&&typeof item.id==='string'&&item.id.length>0&&validTime(item.updatedAt)).map(item=>({id:item.id.slice(0,80),draft:typeof item.draft==='string'?item.draft.slice(0,DRAFT_LIMIT):'',pendingQuestion:typeof item.pendingQuestion==='string'?item.pendingQuestion.slice(0,DRAFT_LIMIT):'',updatedAt:item.updatedAt}))};
  } catch {clearStorage();return empty;}
 }
 function persist(enabled:boolean) {
  if(!enabled){clearStorage();return;}
  const previous=readDrafts();
  const merged=new Map(previous.drafts.map(item=>[item.id,item]));
  for(const entry of entries.values())merged.set(entry.id,{id:entry.id,draft:entry.draft,pendingQuestion:entry.pendingQuestion,updatedAt:entry.updatedAt});
  const drafts=[...merged.values()].filter(item=>validTime(item.updatedAt)).sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,AYA_CHAT_WORKSPACE_LIMIT);
  try{storage()?.setItem(AYA_CHAT_WORKSPACE_KEY,JSON.stringify({version:1,lastActiveId:lastActiveId||previous.lastActiveId,updatedAt:now(),drafts}));}catch{}
 }
 return {
  remember(work:AyaChatWorkspace,historyEnabled:boolean){
   prune();
   const value=clone({...work,draft:work.draft.slice(0,DRAFT_LIMIT),pendingQuestion:work.pendingQuestion.slice(0,DRAFT_LIMIT),messages:work.messages.slice(-40),updatedAt:now()});
   entries.delete(value.id);entries.set(value.id,value);lastActiveId=value.id;prune();persist(historyEnabled);
  },
  restore(historyEnabled:boolean,sessions:AyaSession[]):AyaChatWorkspace|undefined {
   prune();
   if(!historyEnabled)clearStorage();
   const cached=entries.get(lastActiveId);
   if(cached)return clone(cached);
   if(!historyEnabled)return undefined;
   const stored=readDrafts();
   // Only the authoritative history supplies a transcript or working memory.
   // A cloned tab/reload draft cannot bring back a deleted conversation.
   const session=sessions.find(item=>item.id===stored.lastActiveId)??sessions[0];
   if(!session)return undefined;
   const draft=stored.drafts.find(item=>item.id===session.id);
   return {id:session.id,messages:clone(session.messages),workingMemory:clone(session.workingMemory??{goal:'',decisions:[],openQuestions:[]}),draft:draft?.draft??'',pendingQuestion:draft?.pendingQuestion??'',revision:JSON.stringify(session),updatedAt:now()};
  },
  draft(id:string,historyEnabled:boolean){
   prune();const work=entries.get(id);if(work)return {draft:work.draft,pendingQuestion:work.pendingQuestion};
   if(!historyEnabled){clearStorage();return {draft:'',pendingQuestion:''};}
   const item=readDrafts().drafts.find(value=>value.id===id);return {draft:item?.draft??'',pendingQuestion:item?.pendingQuestion??''};
  },
  forget(id:string,historyEnabled:boolean){
   entries.delete(id);if(lastActiveId===id)lastActiveId='';
   if(!historyEnabled){clearStorage();return;}
   const stored=readDrafts();stored.drafts=stored.drafts.filter(item=>item.id!==id);if(stored.lastActiveId===id)stored.lastActiveId='';
   try{storage()?.setItem(AYA_CHAT_WORKSPACE_KEY,JSON.stringify(stored));}catch{}
  },
  setHistoryEnabled(enabled:boolean){if(!enabled)clearStorage();else persist(true);},
 };
}
export const ayaChatWorkspace=createAyaChatWorkspace({storage:()=>typeof window==='undefined'?undefined:window.sessionStorage});
if(typeof window!=='undefined') {
 const syncHistoryPreference=()=>{if(!readAyaState().options.saveHistory)ayaChatWorkspace.setHistoryEnabled(false);};
 window.addEventListener('dentaya:aya-core',syncHistoryPreference);
 window.addEventListener('storage',syncHistoryPreference);
}
