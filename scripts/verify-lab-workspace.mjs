import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function module(name,require=()=>({})){const exports={},code=ts.transpileModule(fs.readFileSync(new URL('../src/lib/'+name,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports,require,Date,Map,Set,Number,Math,Object,encodeURIComponent});return exports;}
const home=module('home-dashboard.ts'),lib=module('lab-workspace.ts',()=>home),today='2026-10-23';
const statuses=['new','accepted','design','approval','production','qc','ready','shipped','delivered','cancelled'];
const cases=Array.from({length:230},(_,i)=>({id:'case-'+String(i).padStart(3,'0'),lab_org_id:i>=220?'other-lab':'lab-1',case_number:'LAB-'+i,title:i===2?'İmplant çalışması':'Kuron '+i,patient_reference:'REF-'+i,status:statuses[i%statuses.length],priority:i%3===0?'urgent':i%7===0?'high':'normal',due_date:i%4===0?'2026-10-22':i%4===1?today:i%4===2?'2026-10-24':null,updated_at:'2026-10-22T12:00:00Z',case_type:'crown',tooth_codes:['46'],material:'Zirkonya',shade:'A2'}));
const source=JSON.stringify(cases),queries=[];let failing=false;
class Query{
 constructor(){this.filters=[];this.options={};this.start=0;this.end=Infinity;this.sort=[];queries.push(this);}
 select(columns,options){this.columns=columns;this.options=options;return this;}
 eq(k,v){this.filters.push(r=>r[k]===v);return this;}
 neq(k,v){this.filters.push(r=>r[k]!==v);return this;}
 in(k,values){this.filters.push(r=>values.includes(r[k]));return this;}
 not(k,operator,value){assert.equal(operator,'in');const values=value.slice(1,-1).split(',');this.filters.push(r=>!values.includes(r[k]));return this;}
 lt(k,v){this.filters.push(r=>r[k]!==null&&r[k]<v);return this;}
 order(k,opt){this.sort.push([k,opt]);return this;}
 range(a,b){this.start=a;this.end=b;return this;}
 then(resolve,reject){
  if(failing)return Promise.resolve({error:{message:'synthetic read failure'},data:null,count:null}).then(resolve,reject);
  const selected=cases.filter(r=>this.filters.every(fn=>fn(r))),rows=[...selected].sort((a,b)=>{for(const [key,opt] of this.sort){if(a[key]===b[key])continue;if(a[key]==null)return opt.nullsFirst?-1:1;if(b[key]==null)return opt.nullsFirst?1:-1;return String(a[key]).localeCompare(String(b[key]))*(opt.ascending?1:-1);}return 0;});
  return Promise.resolve({error:null,data:this.options.head?null:rows.slice(this.start,this.end+1),count:selected.length}).then(resolve,reject);
 }
}
const loader=module('load-lab-workspace.ts',name=>name==='./supabase'?{supabase:{from:table=>{assert.equal(table,'cases');return new Query();}}}:name==='./home-dashboard'?home:lib);
const own=cases.filter(c=>c.lab_org_id==='lab-1'),active=own.filter(home.isActiveCase),expected={active:active.length,priority:active.filter(c=>['urgent','high'].includes(c.priority)).length,overdue:active.filter(c=>c.due_date&&c.due_date<today).length,today:active.filter(c=>c.due_date===today).length,new:active.filter(c=>c.status==='new').length,design:active.filter(c=>c.status==='design').length,approval:active.filter(c=>c.status==='approval').length,production:active.filter(c=>['production','qc','ready'].includes(c.status)).length};
for(const filter of lib.LAB_QUEUE_FILTERS){const result=await loader.loadLabWorkspacePage('lab-1',filter,0,today);assert.equal(result.total,filter==='all'?own.filter(c=>c.status!=='cancelled').length:expected[filter]);assert.equal(JSON.stringify(result.counts),JSON.stringify(expected));assert.ok(result.cases.every(c=>c.lab_org_id==='lab-1'));assert.ok(!result.cases.some(c=>c.status==='cancelled'));assert.ok(result.cases.length<=lib.LAB_PAGE_SIZE);}
const first=await loader.loadLabWorkspacePage('lab-1','active',0,today),second=await loader.loadLabWorkspacePage('lab-1','active',1,today);assert.equal(first.cases.length,40);assert.equal(second.cases.length,40);assert.equal(first.total,176);assert.ok(second.cases.every(c=>!first.cases.some(a=>a.id===c.id)),'Pagination reaches distinct real records beyond preview limits');assert.ok(first.counts.active>first.cases.length,'Organization totals are exact rather than the current page size');
assert.deepEqual(Array.from(lib.homeLabCases(own,'approval',today),c=>c.status),Array.from({length:22},()=> 'approval'));
assert.ok(lib.homeLabCases(own,'overdue',today).every(c=>home.isActiveCase(c)&&c.due_date<today));assert.equal(lib.homeLabCases(own,'active',today).length,176);
assert.equal(lib.searchLabPage(first.cases,'not a case').length,0);assert.equal(lib.searchLabPage(cases,'İMPLANT','tr-TR')[0].id,'case-002');assert.ok(lib.searchLabPage(cases,'46').length>200);assert.equal(JSON.stringify(cases),source,'Filters and searches never modify records');
for(const status of statuses){const action=lib.labNextAction({id:'case/a?b=c',status});assert.ok(action.href.startsWith(status==='design'?'/design?case=':'/cases/'));assert.ok(action.href.endsWith('case%2Fa%3Fb%3Dc'));assert.ok(action.label&&action.icon);}
assert.match(lib.labNextAction({id:'one',status:'approval'}).label,/Klinik/);assert.match(lib.labNextAction({id:'one',status:'qc'}).label,/QC/);
const gate=lib.createLabLoadGate(),old=gate.begin(),fresh=gate.begin();assert.equal(gate.isCurrent(old),false);assert.equal(gate.isCurrent(fresh),true);gate.invalidate();assert.equal(gate.isCurrent(fresh),false,'Unmount/filter cancellation invalidates even the last issued request');
failing=true;await assert.rejects(loader.loadLabWorkspacePage('lab-1','active',0,today));
console.log(JSON.stringify({pass:true,organizationScoped:true,exactCountsBeyondPagination:true,allNineQueueFilters:true,stableDistinctPages:true,caseAndCadNextActions:true,localPageSearch:true,homePreviewFilters:true,staleRefreshGate:true,failedReadRejectsPartialResults:true,fixtureCases:cases.length,backend:'synthetic query fixture; no production data'},null,2));
