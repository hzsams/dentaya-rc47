'use strict';

const {readAgentReply}=require('./agent.cjs');
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const operation=(name,fields={})=>({
 type:'object',additionalProperties:false,required:['operation',...Object.keys(fields)],
 properties:{operation:{type:'string',enum:[name]},...fields},
});
const textField=maxLength=>({type:'string',minLength:1,maxLength});
const listField=maxItems=>({oneOf:[
 operation('keep'),
 operation('replace',{values:{type:'array',maxItems,items:textField(240)}}),
]});

function memoryTaskSchema(){
 return {
  type:'object',additionalProperties:false,required:['answer','goal','decisions','openQuestions','actions'],
  properties:{
   answer:{type:'string',enum:['Memory updated']},
   goal:{oneOf:[operation('keep'),operation('set',{value:textField(500)}),operation('clear')]},
   decisions:listField(5),
   openQuestions:listField(3),
   actions:{type:'array',maxItems:0,items:{type:'string'}},
  },
 };
}

function exact(value,keys){
 return object(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
}
function validText(value,limit){
 return typeof value==='string'&&value.length<=limit&&value.trim().length>0;
}

function readMemoryTaskReply(raw,input){
 if(typeof raw!=='string'||raw.length>64000)throw Error('LOCAL_INVALID_PLAN');
 let value;
 try{value=JSON.parse(raw.trim().replace(/^\x60\x60\x60(?:json)?\s*/i,'').replace(/\s*\x60\x60\x60$/,''));}
 catch{throw Error('LOCAL_INVALID_PLAN');}
 if(!exact(value,['answer','goal','decisions','openQuestions','actions'])||value.answer!=='Memory updated'||!Array.isArray(value.actions)||value.actions.length)throw Error('LOCAL_INVALID_PLAN');

 const {goal,decisions,openQuestions}=value;
 const goalOperation=goal?.operation;
 if(!['keep','set','clear'].includes(goalOperation)||!exact(goal,goalOperation==='set'?['operation','value']:['operation']))throw Error('LOCAL_INVALID_PLAN');
 if(goalOperation==='set'&&!validText(goal.value,500))throw Error('LOCAL_INVALID_PLAN');
 for(const [field,capacity] of [[decisions,5],[openQuestions,3]]){
  const action=field?.operation;
  if(!['keep','replace'].includes(action)||!exact(field,action==='replace'?['operation','values']:['operation']))throw Error('LOCAL_INVALID_PLAN');
  if(action==='replace'&&(!Array.isArray(field.values)||field.values.length>capacity||field.values.some(entry=>!validText(entry,240))))throw Error('LOCAL_INVALID_PLAN');
 }
 // Reuse the established latest-user reset guard and normalized storage format.
 return readAgentReply(JSON.stringify({
  answer:value.answer,
  goal:goalOperation==='set'?goal.value:'',
  decisions:decisions.values??[],
  openQuestions:openQuestions.values??[],
  actions:[],
  memoryUpdate:'patch',
  memoryPatch:{goal:goalOperation,decisions:decisions.operation,openQuestions:openQuestions.operation},
 }),{...input,cadContext:undefined});
}

module.exports={memoryTaskSchema,readMemoryTaskReply};
