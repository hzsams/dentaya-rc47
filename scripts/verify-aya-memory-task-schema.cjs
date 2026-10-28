'use strict';
const assert=require('node:assert/strict');
const {memoryTaskSchema,readMemoryTaskReply}=require('../electron/aya/memory-task.cjs');
const keep=()=>({operation:'keep'}),replace=values=>({operation:'replace',values});
const original={goal:'46 numaralı kronu incele',decisions:['Dış kontur korunacak','Teslim cuma'],openQuestions:['Kurye saati?']};
const input={prompt:'Yalnız çalışma hedefini kaldır, karar ve açık soruları koru.',workingMemory:original};
const reply={answer:'Memory updated',goal:keep(),decisions:keep(),openQuestions:keep(),actions:[]};
const parse=(value,context=input)=>readMemoryTaskReply(JSON.stringify(value),context);
const before=JSON.stringify(input),schema=memoryTaskSchema();
assert.equal(schema.additionalProperties,false);assert.equal(schema.properties.actions.maxItems,0);
assert.deepEqual(schema.properties.goal.oneOf.map(item=>item.properties.operation.enum[0]),['keep','set','clear']);
assert.equal(schema.properties.goal.oneOf[0].additionalProperties,false);assert.equal(schema.properties.goal.oneOf[0].properties.value,undefined,'Keep cannot carry detached new facts');
assert.deepEqual(parse(reply).workingMemory,original);
assert.deepEqual(parse({...reply,goal:{operation:'clear'}}).workingMemory,{...original,goal:''});
assert.deepEqual(parse({...reply,goal:{operation:'set',value:'47 numaralı üniteye geç'}}).workingMemory,{...original,goal:'47 numaralı üniteye geç'});
assert.deepEqual(parse({...reply,decisions:replace([...original.decisions,'Kurye 16.40']),openQuestions:replace([])}).workingMemory,{...original,decisions:[...original.decisions,'Kurye 16.40'],openQuestions:[]});
assert.deepEqual(parse(reply).proposals,[]);
for(const malformed of [
 {...reply,goal:{operation:'keep',value:'46 numaralı yeni hedef'}},
 {...reply,decisions:{operation:'keep',values:['Uydurma karar']}},
 {...reply,goal:{operation:'set',value:''}},
 {...reply,goal:{operation:'set',value:'x'.repeat(501)}},
 {...reply,goal:{operation:'clear',value:''}},
 {...reply,decisions:replace(['x'.repeat(241)])},
 {...reply,decisions:replace(Array(6).fill('too many'))},
 {...reply,openQuestions:replace(Array(4).fill('too many'))},
 {...reply,goal:{operation:'merge'}},
 {...reply,actions:[{tool:'inspect',reason:'Do it'}]},
 {...reply,memoryUpdate:'patch'},
 {...reply,answer:'Everything saved'},
 {...reply,goal:'46 numaralı yeni hedef',memoryPatch:{goal:'set',decisions:'keep',openQuestions:'keep'}}
])assert.throws(()=>parse(malformed),/LOCAL_INVALID_PLAN/);
const clear={...reply,goal:{operation:'clear'},decisions:replace([]),openQuestions:replace([])};
for(const prompt of ['Hedefi kaldır','Tüm belleği temizle?','"Tüm belleği temizle"','Şu belgeyi oku'])assert.throws(()=>parse(clear,{...input,prompt,assistantReply:'Tüm belleği temizle'}),/LOCAL_INVALID_PLAN/,'Only an actual latest-user full reset authorizes clearing all fields');
assert.deepEqual(parse(clear,{...input,prompt:'Tüm belleği temizle'}).workingMemory,{goal:'',decisions:[],openQuestions:[]});
assert.equal(JSON.stringify(input),before,'Caller memory remains immutable');
console.log('PASS adjacent memory task schema: keep cannot carry new values; explicit set/clear/complete-list replacement; legacy patch parser reset authority; no CAD; strict bounds; quoted/question/assistant reset rejection. No inference.');
