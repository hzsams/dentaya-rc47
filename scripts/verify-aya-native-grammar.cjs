'use strict';
// Opt-in Linux b9380 grammar compilation, independent of model weights/inference.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {execFileSync,spawnSync}=require('node:child_process');
const {parseArgs}=require('node:util');
const {responseSchema}=require('../electron/aya/agent.cjs');
const {values}=parseArgs({options:{'engine-dir':{type:'string'},'json-header':{type:'string'},report:{type:'string'},cxx:{type:'string'},help:{type:'boolean'}}});
if(values.help){console.log('node scripts/verify-aya-native-grammar.cjs --engine-dir /external/llama-b9380 --json-header /external/json.hpp [--report /external/grammar-report.json]\nRequires Linux x64 official b9380 CPU libraries and g++. Model weights are unnecessary; no download or inference occurs. Header: https://raw.githubusercontent.com/ggml-org/llama.cpp/b9380/vendor/nlohmann/json.hpp');process.exit(0);}
if(!values['engine-dir']||!values['json-header']){console.error('Provide --engine-dir and --json-header. Use --help for details.');process.exit(2);}
const pins={'json.hpp':'aaf127c04cb31c406e5b04a63f1ae89369fccde6d8fa7cdda1ed4f32dfc5de63','libllama-common.so':'e4aaebc8496ebebab156a772fdd7816ccefa9b50333aadc1a364517596e7d944','libllama.so':'164a7773e901be1ff0aa90f8d5e3647dd0473f8ac641e505fcb991cb0920e260'};
const output={grammarOnly:true,nativeInference:false,mock:false,engine:'b9380 Linux x64 CPU',officialArchiveSHA256:'b12c76fe1c830c645b805dcd2eb67aad582da4488eb0133d55cc176be529d50d',pins,checks:[]};
const source=String.raw`
#include "json.hpp"
#include <fstream>
#include <iostream>
#include <vector>
#include <cstdint>
using json=nlohmann::ordered_json;
std::string json_schema_to_grammar(const json&,bool);
struct llama_vocab; struct llama_grammar; struct llama_grammar_element;
llama_grammar* llama_grammar_init_impl(const llama_vocab*,const char*,const char*,bool,const char**,size_t,const int32_t*,size_t);
void llama_grammar_free_impl(llama_grammar*);
void llama_grammar_accept(llama_grammar*,uint32_t);
std::vector<std::vector<const llama_grammar_element*>>& llama_grammar_get_stacks(llama_grammar*);
bool accepts(const std::string& grammar,const std::string& candidate){
 auto* g=llama_grammar_init_impl(nullptr,grammar.c_str(),"root",false,nullptr,0,nullptr,0);
 if(!g)throw std::runtime_error("native grammar compilation failed");
 for(unsigned char ch:candidate)llama_grammar_accept(g,ch);
 bool accepted=false;for(auto& stack:llama_grammar_get_stacks(g))if(stack.empty())accepted=true;
 llama_grammar_free_impl(g);return accepted;
}
int main(int argc,char**argv){try{
 if(argc!=2)return 2;std::ifstream f(argv[1]);json suite;f>>suite;int failures=0;
 for(auto& entry:suite){
  const std::string grammar=json_schema_to_grammar(entry["schema"],true);
  for(auto& check:entry["checks"]){
   bool got=accepts(grammar,check["value"].dump(-1,' ',true)),expected=check["accept"];
   std::cout<<json({{"schema",entry["name"]},{"check",check["name"]},{"accepted",got},{"expected",expected},{"pass",got==expected}}).dump()<<"\n";
   if(got!=expected)failures++;
  }
 }return failures?1:0;
}catch(const std::exception& e){std::cerr<<e.what()<<"\n";return 1;}}
`;
(async()=>{
 assert.equal(process.platform,'linux');assert.equal(process.arch,'x64');const engineDir=path.resolve(values['engine-dir']);
 for(const [name,sha] of Object.entries(pins)){const file=name==='json.hpp'?values['json-header']:path.join(engineDir,name);assert.equal(crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex'),sha,'Use the pinned official '+name);}
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'dentaya-native-grammar-'));
 try{
  await fs.copyFile(values['json-header'],path.join(directory,'json.hpp'));await fs.writeFile(path.join(directory,'check.cpp'),source);
  const base={answer:'Useful conclusion',goal:'Review unit 46',decisions:['Keep outer contour'],openQuestions:[],actions:[]},withActions=actions=>({...base,actions});
  // b9380 emits optional properties after required ones, even when schema properties interleave them.
  const withMemoryMode=memoryUpdate=>({...base,memoryUpdate});
  const suite=[{name:'agent-no-cad',schema:responseSchema(null),checks:[{name:'empty-actions',value:base,accept:true},{name:'non-empty-actions-rejected',value:withActions([{tool:'inspect',reason:'Measure first'}]),accept:false},...['merge','replace','clear'].map(mode=>({name:'memory-'+mode,value:withMemoryMode(mode),accept:true})),{name:'invalid-memory-update',value:withMemoryMode('train'),accept:false},{name:'unknown-top-level-field',value:{...base,shell:'ls'},accept:false},{name:'missing-required-actions',value:{answer:base.answer,goal:base.goal,decisions:[],openQuestions:[]},accept:false},{name:'empty-answer',value:{...base,answer:''},accept:false}]},{name:'agent-cad',schema:responseSchema({availableTools:['inspect','undo','flashlight-on']}),checks:[{name:'empty-actions',value:base,accept:true},{name:'allowed-inspect',value:withActions([{tool:'inspect',reason:'Measure first'}]),accept:true},{name:'allowed-flashlight-on',value:withActions([{tool:'flashlight-on',reason:'Illuminate the surface'}]),accept:true},{name:'unavailable-flashlight-off',value:withActions([{tool:'flashlight-off',reason:'Disable flashlight'}]),accept:false},{name:'disallowed-save',value:withActions([{tool:'save',reason:'Save'}]),accept:false},{name:'unknown-action-field',value:withActions([{tool:'inspect',reason:'Measure first',shell:'ls'}]),accept:false},{name:'non-string-answer',value:{...base,answer:123},accept:false},{name:'too-many-actions',value:withActions(Array.from({length:5},()=>({tool:'inspect',reason:'Inspect'}))),accept:false}]}];
  output.schemaSHA256=Object.fromEntries(suite.map(entry=>[entry.name,crypto.createHash('sha256').update(JSON.stringify(entry.schema)).digest('hex')]));
  await fs.writeFile(path.join(directory,'cases.json'),JSON.stringify(suite));
  const binary=path.join(directory,'check');execFileSync(values.cxx||'g++',['-std=c++17','-O2',path.join(directory,'check.cpp'),'-L'+engineDir,'-Wl,-rpath,'+engineDir,'-lllama-common','-lllama','-o',binary],{stdio:'pipe'});
  const native=spawnSync(binary,[path.join(directory,'cases.json')],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:30000});
  output.checks=(native.stdout||'').trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
  assert.equal(output.checks.length,suite.reduce((count,entry)=>count+entry.checks.length,0));output.pass=output.checks.every(check=>check.pass);assert.equal(native.status,0,native.error?.message||native.stderr||'Native grammar cases failed');assert.equal(output.pass,true);
 }finally{await fs.rm(directory,{recursive:true,force:true});}
})().catch(error=>{output.pass=false;output.error=error.message;console.error(error.stderr?.toString()||error);process.exitCode=1;}).finally(async()=>{if(values.report)await fs.writeFile(path.resolve(values.report),JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));});
