'use strict';
const {readAgentReply}=require('./agent.cjs');
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const branch=(operation,extra={})=>({type:'object',additionalProperties:false,required:['operation',...Object.keys(extra)],properties:{operation:{type:'string',enum:[operation]},...extra}});
function memoryTaskSchema(){
 const list=maxItems=>({oneOf:[branch('keep'),branch('replace',{values:{type:'array',maxItems,items:{type:'string',minLength:1,maxLength:240}}})]});
 return {type:'object',additionalProperties:false,required:['answer','goal','decisions','openQuestions','actions'],properties:{answer:{type:'string',enum:['Memory updated']},goal:{oneOf:[branch('keep'),branch('set',{value:{type:'string',minLength:1,maxLength:500}}),branch('clear')]},decisions:list(5),openQuestions:list(3),actions:{type:'array',maxItems:0,items:{type:'string'}}}};
}
function readMemoryTaskReply(raw,input){
 const invalid=()=>{throw Error('LOCAL_INVALID_PLAN');};
 if(typeof raw!=='string'||raw.length>64000)return invalid();
 let value;try{value=JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));}catch{return invalid();}
 const exact=(item,keys)=>object(item)&&Object.keys(item).length===keys.length&&keys.every(key=>Object.hasOwn(item,key));
 if(!exact(value,['answer','goal','decisions','openQuestions','actions'])||value.answer!=='Memory updated'||!Array.isArray(value.actions)||value.actions.length)return invalid();
 const goal=value.goal;
 if(!object(goal)||!['keep','set','clear'].includes(goal.operation)||!exact(goal,goal.operation==='set'?['operation','value']:['operation']))return invalid();
 if(goal.operation==='set'&&(typeof goal.value!=='string'||!goal.value.trim()||goal.value.length>500))return invalid();
 const lists={};
 for(const [key,limit] of [['decisions',5],['openQuestions',3]]){
  const item=value[key];
  if(!object(item)||!['keep','replace'].includes(item.operation)||!exact(item,item.operation==='replace'?['operation','values']:['operation']))return invalid();
  if(item.operation==='replace'&&(!Array.isArray(item.values)||item.values.length>limit||item.values.some(entry=>typeof entry!=='string'||!entry.trim()||entry.length>240)))return invalid();
  lists[key]=item.operation==='replace'?item.values:[];
 }
 // The adjacent operations map to the established patch parser. Its explicit
 // latest-user full-reset guard remains the only authority for clearing all work.
 return readAgentReply(JSON.stringify({answer:value.answer,goal:goal.operation==='set'?goal.value:'',...lists,actions:[],memoryUpdate:'patch',memoryPatch:{goal:goal.operation,decisions:value.decisions.operation,openQuestions:value.openQuestions.operation}}),{...input,cadContext:undefined});
}
module.exports={memoryTaskSchema,readMemoryTaskReply};
