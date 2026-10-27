import assert from 'node:assert/strict';
import {createAyaChatWorkspace,AYA_CHAT_WORKSPACE_KEY,AYA_CHAT_WORKSPACE_LIMIT,AYA_CHAT_WORKSPACE_TTL,type AyaChatWorkspace} from '../src/lib/aya-chat-workspace';
import type {AyaSession} from '../src/lib/aya-local-state';

// Pure tab/reload lifecycle checks; no desktop transport or model inference.
let time=1_800_000_000_000;
const values=new Map<string,string>();
const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},removeItem:(key:string)=>{values.delete(key);}};
const source={storage:()=>storage,now:()=>time};
const session=(id:string,answer='AUTHORITATIVE MODEL ANSWER'):AyaSession=>({id,title:id,updatedAt:time,messages:[{role:'user',content:'SAVED QUESTION'},{role:'assistant',content:answer,engine:'model'}],workingMemory:{goal:'PRIVATE MEMORY',decisions:[],openQuestions:[]}});
const work=(id:string):AyaChatWorkspace=>({id,messages:[{role:'user',content:'TRANSCRIPT SENTINEL'},{role:'assistant',content:'MODEL OUTPUT SENTINEL'}],workingMemory:{goal:'MEMORY SENTINEL',decisions:['PRIVATE NOTE SENTINEL'],openQuestions:[]},draft:'  Exact composer\ncharacters  ',pendingQuestion:'',revision:JSON.stringify(session(id)),updatedAt:time});

const tab=createAyaChatWorkspace(source);
tab.remember(work('a'),false);
assert.equal(values.get(AYA_CHAT_WORKSPACE_KEY),undefined,'History OFF does not persist any recovery record');
const inProcess=tab.restore(false,[]);
assert.deepEqual(inProcess?.messages,work('a').messages,'History OFF still restores its tab process conversation');
assert.equal(inProcess?.draft,work('a').draft);
inProcess!.messages[0].content='MUTATED COPY';
assert.equal(tab.restore(false,[])!.messages[0].content,'TRANSCRIPT SENTINEL','Restoring does not expose mutable cache references');
assert.equal(createAyaChatWorkspace(source).restore(false,[]),undefined,'A fresh process cannot recover History OFF work');

tab.remember(work('a'),true);
tab.remember({...work('b'),draft:'B DRAFT',pendingQuestion:'ORIGINAL PENDING QUESTION'},true);
const metadata=values.get(AYA_CHAT_WORKSPACE_KEY)!;
assert.doesNotMatch(metadata,/TRANSCRIPT SENTINEL|MODEL OUTPUT SENTINEL|MEMORY SENTINEL|PRIVATE NOTE SENTINEL|messages|workingMemory|references/);
assert.equal(JSON.parse(metadata).lastActiveId,'b');
const newer=session('b','NEWER AUTHORITATIVE ANSWER');
const reloaded=createAyaChatWorkspace(source).restore(true,[session('a'),newer]);
assert.equal(reloaded?.id,'b','Last active saved id selects its authoritative record');
assert.equal(reloaded?.messages[1].content,'NEWER AUTHORITATIVE ANSWER','Reload never loads a cached transcript');
assert.equal(reloaded?.revision,JSON.stringify(newer),'The optimistic save baseline is the authoritative current revision');
assert.equal(reloaded?.draft,'B DRAFT');assert.equal(reloaded?.pendingQuestion,'ORIGINAL PENDING QUESTION');
assert.equal(createAyaChatWorkspace(source).restore(true,[session('a')])?.id,'a','A deleted last active id falls back to existing history');
assert.equal(createAyaChatWorkspace(source).restore(true,[]),undefined,'Draft metadata cannot resurrect deleted history');
assert.deepEqual(tab.draft('a',true),{draft:work('a').draft,pendingQuestion:''},'Session draft is isolated from the currently active draft');
tab.forget('a',true);
assert.ok(!JSON.parse(values.get(AYA_CHAT_WORKSPACE_KEY)!).drafts.some((item:{id:string})=>item.id==='a'),'Delete clears inactive reload metadata');
assert.equal(tab.draft('a',true).draft,'','Delete also clears the process draft');
tab.forget('b',true);
assert.equal(tab.restore(true,[]),undefined,'Deleting the active record clears its process cache');
tab.remember(work('a'),true);tab.setHistoryEnabled(false);
assert.equal(values.get(AYA_CHAT_WORKSPACE_KEY),undefined,'Turning history OFF clears storage immediately');
assert.equal(tab.restore(false,[])?.id,'a','Changing the storage preference preserves process work');

const bounded=createAyaChatWorkspace(source);
for(let index=0;index<AYA_CHAT_WORKSPACE_LIMIT+5;index++){time++;bounded.remember({...work('bounded-'+index),draft:'x'.repeat(9000),pendingQuestion:'y'.repeat(9000)},true);}
const boundedMetadata=JSON.parse(values.get(AYA_CHAT_WORKSPACE_KEY)!);
assert.equal(boundedMetadata.drafts.length,AYA_CHAT_WORKSPACE_LIMIT);
assert.ok(boundedMetadata.drafts.every((item:{draft:string;pendingQuestion:string})=>item.draft.length<=8000&&item.pendingQuestion.length<=8000));
assert.equal(bounded.draft('bounded-0',true).draft,'','Old entries are evicted from both cache layers');
time+=AYA_CHAT_WORKSPACE_TTL+1;
assert.equal(bounded.restore(true,[]),undefined,'Expired process work is evicted');
assert.equal(values.get(AYA_CHAT_WORKSPACE_KEY),undefined,'Expired recovery storage is discarded');
values.set(AYA_CHAT_WORKSPACE_KEY,'{broken');
assert.equal(createAyaChatWorkspace(source).restore(true,[]),undefined);
assert.equal(values.get(AYA_CHAT_WORKSPACE_KEY),undefined,'Malformed recovery storage is removed');
const unavailable=createAyaChatWorkspace({now:()=>time,storage:()=>{throw Error('Storage unavailable');}});
unavailable.remember(work('safe'),true);assert.equal(unavailable.restore(true,[])?.id,'safe','Storage failure cannot discard process work');
console.log('AYA chat workspace: process continuity, metadata-only reload, authority/deletion, isolation, limits and storage failure passed.');
