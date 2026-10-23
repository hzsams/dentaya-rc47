import {supabase} from './supabase';
import {localDay} from './home-dashboard';
import {LAB_PAGE_SIZE,type LabCase,type LabCounts,type LabQueueFilter} from './lab-workspace';
const columns='id,case_number,patient_reference,title,case_type,priority,status,due_date,tooth_codes,material,shade,updated_at';
export async function loadLabWorkspacePage(orgId:string,filter:LabQueueFilter,page:number,today=localDay()){
 const scoped=(head=false)=>supabase.from('cases').select(columns,{count:'exact',head}).eq('lab_org_id',orgId);
 const apply=(query:ReturnType<typeof scoped>,kind:LabQueueFilter)=>{
  if(kind==='all')return query.neq('status','cancelled');
  const active=query.not('status','in','(delivered,cancelled)');
  switch(kind){
   case 'priority':return active.in('priority',['urgent','high']);
   case 'overdue':return active.lt('due_date',today);
   case 'today':return active.eq('due_date',today);
   case 'new':return active.eq('status','new');
   case 'design':return active.eq('status','design');
   case 'approval':return active.eq('status','approval');
   case 'production':return active.in('status',['production','qc','ready']);
   default:return active;
  }
 };
 const keys=['active','priority','overdue','today','new','design','approval','production'] as const;
 const start=Math.max(0,Math.floor(page))*LAB_PAGE_SIZE;
 const [rows,...counts]=await Promise.all([
  apply(scoped(),filter).order('due_date',{ascending:true,nullsFirst:false}).order('updated_at',{ascending:false}).order('id',{ascending:true}).range(start,start+LAB_PAGE_SIZE-1),
  ...keys.map(key=>apply(scoped(true),key)),
 ]);
 for(const result of [rows,...counts])if(result.error)throw result.error;
 return {cases:(rows.data??[]) as LabCase[],total:rows.count??0,counts:Object.fromEntries(keys.map((key,i)=>[key,counts[i].count??0])) as LabCounts};
}
