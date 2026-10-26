import assert from 'node:assert/strict';
import {beginAyaMemoryEdit,checkAyaMemoryEdit,createAyaStatusRefreshGate,selectAyaModel} from '../src/lib/aya-ui-state';
import {addAyaMemory,importAyaKnowledgeFile,readAyaKnowledge,saveAyaKnowledge} from '../src/lib/aya-knowledge';

const memory={goal:'Cuma teslim',decisions:['Önce prova'],openQuestions:['Kurye saati?']};
const draft={...beginAyaMemoryEdit('session-a',memory),goal:'Kullanıcının tamamlanmamış taslağı'};
assert.deepEqual(checkAyaMemoryEdit(draft,'session-a',memory,true),{ok:false,reason:'busy'},'A submitted form cannot bypass the busy guard.');
assert.deepEqual(checkAyaMemoryEdit(draft,'session-b',{goal:'',decisions:[],openQuestions:[]},false),{ok:false,reason:'session-changed'},'A draft from another conversation cannot commit.');
const incoming={goal:'Pazartesi teslim',decisions:['Önce kayıt'],openQuestions:[]};
assert.deepEqual(checkAyaMemoryEdit(draft,'session-a',incoming,false),{ok:false,reason:'memory-changed'},'A newer model or explicit memory control cannot be overwritten by a stale editor.');
assert.equal(draft.goal,'Kullanıcının tamamlanmamış taslağı','Conflict detection preserves the draft.');
const reloaded=beginAyaMemoryEdit('session-a',incoming);
assert.deepEqual(checkAyaMemoryEdit(reloaded,'session-a',incoming,false),{ok:true,memory:incoming},'Explicit reload permits editing the current memory.');
assert.deepEqual(checkAyaMemoryEdit({...reloaded,decisions:'1\n2\n3\n4\n5\n6'},'session-a',incoming,false),{ok:false,reason:'invalid'});
assert.deepEqual(checkAyaMemoryEdit({...reloaded,questions:'a'.repeat(241)},'session-a',incoming,false),{ok:false,reason:'invalid'});
const accepted=checkAyaMemoryEdit({...reloaded,goal:'  Güncel hedef  ',decisions:'\n Kontrol \n\n Kaydet \n'},'session-a',incoming,false);
assert.deepEqual(accepted,{ok:true,memory:{goal:'Güncel hedef',decisions:['Kontrol','Kaydet'],openQuestions:[]}});

const gate=createAyaStatusRefreshGate();
const first=gate.begin(),second=gate.begin();
assert.equal(gate.isCurrent(first),false,'An earlier status result cannot replace the latest model list.');
assert.equal(gate.isCurrent(second),true);
let selected='model-b';
if(gate.isCurrent(second))selected=selectAyaModel(selected,[{name:'model-a'},{name:'model-b'}]);
if(gate.isCurrent(first))selected=selectAyaModel(selected,[]);
assert.equal(selected,'model-b','A valid chosen model survives both list reordering and a stale empty status result.');
const third=gate.begin();assert.equal(gate.isCurrent(second),false,'An older finally/catch cannot change a newer pending refresh.');
gate.invalidate();assert.equal(gate.isCurrent(third),false,'Cleanup invalidates pending status results.');
const afterRemount=gate.begin();assert.equal(gate.isCurrent(third),false);assert.equal(gate.isCurrent(afterRemount),true);
assert.equal(selectAyaModel('missing',[{name:'available'}]),'available');assert.equal(selectAyaModel('missing',[]),'');
assert.equal(selectAyaModel('',[{name:'first-model'},{name:'chosen-model'}],'chosen-model'),'chosen-model','A temporary empty runtime list cannot discard the explicit model preference on recovery.');
assert.equal(selectAyaModel('current-model',[{name:'first-model'},{name:'current-model'}],'missing-model'),'current-model','An available current model survives a missing saved preference.');
assert.equal(selectAyaModel('',[{name:'first-model'}],'missing-model'),'first-model','A genuinely removed preferred model falls back to an installed model.');

const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),oldStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
const store=new Map<string,string>();
Object.defineProperty(globalThis,'window',{configurable:true,value:{dispatchEvent(){}}});
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>store.get(key)??null,setItem:(key:string,value:string)=>store.set(key,value)}});
const note=(id:string)=>({id,title:id,content:'Synthetic note '+id,kind:'memory' as const});
function pendingFile(name='incoming.txt') {
 let resolve!:(value:string)=>void;
 const text=new Promise<string>(done=>{resolve=done;});
 return {file:{name,size:100,text:()=>text} as File,finish:resolve};
}
try {
 assert.equal(saveAyaKnowledge([note('delete-me')]),true);
 const firstImport=pendingFile(),importing=importAyaKnowledgeFile(firstImport.file);
 assert.equal(saveAyaKnowledge([]),true);assert.equal(addAyaMemory('Concurrent note','Synthetic concurrent content'),true);
 const concurrentId=readAyaKnowledge().items[0].id;
 assert.equal(saveAyaKnowledge(readAyaKnowledge().items,false),true);
 firstImport.finish('Synthetic imported document');await importing;
 assert.equal(readAyaKnowledge().items.some(item=>item.id==='delete-me'),false,'An import must not resurrect a note deleted while the file was being read.');
 assert.equal(readAyaKnowledge().items.some(item=>item.id===concurrentId),true,'An import preserves notes added while reading.');
 assert.equal(readAyaKnowledge().enabled,false,'A concurrent notebook opt-out is preserved.');
 assert.equal(readAyaKnowledge().items.length,2);

 assert.equal(saveAyaKnowledge([],true),true);
 const fileA=pendingFile('first.txt'),fileB=pendingFile('second.txt');
 const importA=importAyaKnowledgeFile(fileA.file),importB=importAyaKnowledgeFile(fileB.file);
 fileB.finish('Second document');await importB;fileA.finish('First document');await importA;
 assert.deepEqual(readAyaKnowledge().items.map(item=>item.title).sort(),['first','second'],'Concurrent imports merge with the latest committed notebook.');

 assert.equal(saveAyaKnowledge(Array.from({length:63},(_,i)=>note('capacity-'+i))),true);
 const capacityFile=pendingFile(),capacityImport=importAyaKnowledgeFile(capacityFile.file);
 assert.equal(addAyaMemory('Last available slot','Concurrent content'),true);
 capacityFile.finish('An additional document');await assert.rejects(capacityImport,/AYA_KNOWLEDGE_INVALID/);
 assert.equal(readAyaKnowledge().items.length,64,'Capacity is checked at commit; failure preserves existing notes.');
 assert.equal(readAyaKnowledge().items.at(-1)?.title,'Last available slot');

 assert.equal(saveAyaKnowledge([note('same-id')]),true);
 const duplicateFile=pendingFile('notes.json'),duplicateImport=importAyaKnowledgeFile(duplicateFile.file);
 duplicateFile.finish(JSON.stringify({format:'dentaya-aya-knowledge',version:1,items:[{...note('same-id'),content:'Explicit imported content'}]}));await duplicateImport;
 assert.equal(readAyaKnowledge().items.length,1,'Imports deduplicate by stable note id.');
 assert.equal(readAyaKnowledge().items[0].content,'Explicit imported content');
} finally {
 if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else Reflect.deleteProperty(globalThis,'window');
 if(oldStorage)Object.defineProperty(globalThis,'localStorage',oldStorage);else Reflect.deleteProperty(globalThis,'localStorage');
}
console.log('PASS: stale session/model-memory editor rejection, preserved draft and explicit reload, busy/length guards, latest status wins and chosen model retention, async notebook import deletion/addition/opt-out preservation, concurrent imports, capacity and deduplication. No browser or model inference.');
