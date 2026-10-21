import assert from 'node:assert/strict';
import {normalizeAyaReferences} from '../src/lib/aya-references';
import {readAyaState,saveAyaOptions,saveAyaSession} from '../src/lib/aya-local-state';

const local={id:'manual',title:'CAD iş akışı',href:'/training#cad'},external={id:'fact:dental-221',title:'Mesh normals',href:'https://threejs.org/docs/#api/en/core/BufferGeometry'};
assert.deepEqual(normalizeAyaReferences(null),[]);
assert.deepEqual(normalizeAyaReferences([local,external]),[local,external]);
for(const href of ['javascript:alert(1)','data:text/html,test','http://example.com','//example.com','https://user:secret@example.com','https://example.com:8080/x','/\\example.com','https://example.com/\npath','file:///tmp/private']) {
  assert.deepEqual(normalizeAyaReferences([{...external,href}]),[],href);
}
assert.deepEqual(normalizeAyaReferences([local,{...external,id:local.id},external,{...local,id:'duplicate-url'}]),[local,external]);
assert.equal(normalizeAyaReferences(Array.from({length:20},(_,n)=>({id:String(n),title:'Reference '+n,href:'/training#'+n}))).length,8);
const long=normalizeAyaReferences([{id:'i'.repeat(100),title:'t'.repeat(300),href:'/training'}])[0];
assert.equal(long.id.length,80);assert.equal(long.title.length,200);
const originals=JSON.stringify([local,external]);normalizeAyaReferences([local,external]);assert.equal(JSON.stringify([local,external]),originals);

// Exercise the actual saved-conversation reader, including a newly loaded session.
const originalWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),originalStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
const data=new Map<string,string>();
const storage:Storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,String(value));},removeItem:key=>{data.delete(key);},clear:()=>data.clear(),key:index=>Array.from(data.keys())[index]??null,get length(){return data.size;}};
try {
  Object.defineProperty(globalThis,'window',{value:new EventTarget(),configurable:true});
  Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true});
  assert.equal(saveAyaOptions({saveHistory:true}),true);
  assert.equal(saveAyaSession({id:'references',title:'Reference persistence',updatedAt:1,messages:[{role:'assistant',engine:'model',content:'Grounded reply',references:[local,external,{id:'unsafe',title:'Unsafe',href:'javascript:alert(1)'}]}]}),true);
  assert.deepEqual(readAyaState().sessions[0].messages[0].references,[local,external]);
} finally {
  if(originalWindow)Object.defineProperty(globalThis,'window',originalWindow);else Reflect.deleteProperty(globalThis,'window');
  if(originalStorage)Object.defineProperty(globalThis,'localStorage',originalStorage);else Reflect.deleteProperty(globalThis,'localStorage');
}
console.log('PASS: selected references retain safe HTTPS/local links across saved history, reject executable URLs and credentials, deduplicate and respect source budgets.');
