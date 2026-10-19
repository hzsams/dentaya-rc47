import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
function module(file,require=()=>({})){const exports={};const js=ts.transpileModule(fs.readFileSync(new URL('../src/lib/'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(js,{exports,require,Date,Map});return exports;}
const helper=module('home-dashboard.ts');
const today='2026-09-25';
const row=(id,patch={})=>({id:String(id),case_number:'DY-'+id,title:'Test',patient_reference:'',status:'design',priority:'normal',due_date:null,updated_at:'2026-09-25T08:00:00Z',clinic_org_id:'clinic-1',lab_org_id:'lab-1',...patch});
const fixtures=[row(1,{due_date:'2026-09-24'}),row(2,{priority:'urgent'}),row(3,{priority:'high'}),row(4,{status:'approval'}),row(5,{due_date:today}),row(6,{status:'delivered',priority:'urgent',due_date:'2026-09-23'}),row(7,{status:'cancelled',priority:'urgent'})];
assert.deepEqual(Array.from(helper.prioritizedCases(fixtures,today),r=>r.id),['1','2','3','4','5']);
assert.equal(helper.homeCaseFlag(row(8,{due_date:today}),today).label,'Bugün teslim');
for(const p of ['https://bad.test','//bad.test','/cases\\bad','/api/change'])assert.equal(helper.notificationHref(p),'/notifications');
assert.equal(helper.notificationHref('/cases/abc?tab=delivery'),'/cases/abc?tab=delivery');
const cases=[...Array.from({length:30},(_,i)=>row(i,{priority:i<3?'urgent':'normal',status:i>=3&&i<10?'approval':'design',due_date:i<2?'2026-09-24':i<5?today:null})),row(60,{status:'delivered',priority:'urgent'}),row(61,{clinic_org_id:'other',lab_org_id:'other',priority:'urgent'})];
const shipments=Array.from({length:16},(_,i)=>({id:'s'+i,courier_org_id:i===15?'other':'courier-1',status:i<3?'pickup_requested':i<7?'in_transit':i<12?'picked_up':'delivered',updated_at:'2026-09-25T08:00:00Z'}));
let fail=false;const queries=[];
class Query {
 constructor(table){this.table=table;this.filters=[];this.options={};this.max=Infinity;this.sort=[];queries.push(this);}
 select(columns,options={}){this.options=options;return this;}
 eq(k,v){this.filters.push(r=>r[k]===v);return this;}
 in(k,v){this.filters.push(r=>v.includes(r[k]));return this;}
 not(k,operator,v){assert.equal(operator,'in');const values=v.slice(1,-1).split(',');this.filters.push(r=>!values.includes(r[k]));return this;}
 lt(k,v){this.filters.push(r=>r[k]!==null&&r[k]<v);return this;}
 order(k,options){this.sort.push([k,options]);return this;}
 limit(v){this.max=v;return this;}
 then(resolve,reject){if(fail)return Promise.resolve({error:{message:'offline'},data:null,count:null}).then(resolve,reject);const selected=(this.table==='cases'?cases:shipments).filter(r=>this.filters.every(f=>f(r)));const rows=[...selected].sort((a,b)=>{for(const [key,opt] of this.sort){if(a[key]===b[key])continue;if(a[key]==null)return opt.nullsFirst? -1:1;if(b[key]==null)return opt.nullsFirst?1:-1;return String(a[key]).localeCompare(String(b[key]))*(opt.ascending?1:-1);}return 0;});return Promise.resolve({error:null,count:this.options.count==='exact'?selected.length:null,data:this.options.head?null:rows.slice(0,this.max)}).then(resolve,reject);}
}
const loader=module('load-home-dashboard.ts',name=>name==='./supabase'?{supabase:{from:table=>new Query(table)}}:{...helper,localDay:()=>today});
for(const [org_type,id] of [['clinic','clinic-1'],['laboratory','lab-1']]){const d=await loader.loadHomeDashboard({org_type,id});assert.equal(d.counts.active,30);assert.equal(d.counts.urgent,3);assert.equal(d.counts.approval,7);assert.equal(d.counts.overdue,2);assert.equal(d.counts.today,3);assert.ok(d.cases.length<30);assert.ok(!d.cases.some(c=>c.id==='61'));assert.equal(new Set(d.cases.map(c=>c.id)).size,d.cases.length);}
const courier=await loader.loadHomeDashboard({org_type:'courier',id:'courier-1'});assert.equal(courier.counts.active,12);assert.equal(courier.counts.pickup,3);assert.equal(courier.counts.inTransit,4);assert.equal(courier.counts.pickedUp,5);assert.ok(!courier.shipments.some(s=>s.courier_org_id==='other'));
fail=true;await assert.rejects(loader.loadHomeDashboard({org_type:'clinic',id:'clinic-1'}));
console.log('PASS: exact counts beyond preview limits, organization filters, completed exclusions, urgency order, today dates, courier counts, deduplication, failed loads, notification paths.');
