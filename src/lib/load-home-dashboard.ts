import { supabase } from './supabase';
import { EMPTY_HOME_COUNTS, localDay, type HomeCase, type HomeShipment, type HomeOrgType } from './home-dashboard';
export async function loadHomeDashboard(org:{id:string;org_type:HomeOrgType}) {
  const counts={...EMPTY_HOME_COUNTS};
  if(org.org_type==='courier') {
    const list=()=>supabase.from('shipments').select('id,tracking_code,courier_name,status,updated_at',{count:'exact'}).eq('courier_org_id',org.id);
    const results=await Promise.all([
      list().not('status','in','(delivered,cancelled)').order('updated_at',{ascending:false}).limit(8),
      list().eq('status','pickup_requested').order('updated_at',{ascending:true}).limit(8),
      supabase.from('shipments').select('id',{count:'exact',head:true}).eq('courier_org_id',org.id).eq('status','in_transit'),
      supabase.from('shipments').select('id',{count:'exact',head:true}).eq('courier_org_id',org.id).eq('status','picked_up'),
    ]);
    for(const r of results)if(r.error)throw r.error;
    counts.active=results[0].count??0;counts.pickup=results[1].count??0;counts.inTransit=results[2].count??0;counts.pickedUp=results[3].count??0;
    const rows=[...(results[0].data??[]),...(results[1].data??[])] as HomeShipment[];
    return {counts,cases:[] as HomeCase[],shipments:Array.from(new Map(rows.map(r=>[r.id,r])).values())};
  }
  const field=org.org_type==='clinic'?'clinic_org_id':'lab_org_id',today=localDay();
  const rows=()=>supabase.from('cases').select('id,case_number,patient_reference,title,status,priority,due_date,updated_at',{count:'exact'}).eq(field,org.id).not('status','in','(delivered,cancelled)');
  const results=await Promise.all([
    supabase.from('cases').select('id',{count:'exact',head:true}).eq(field,org.id).not('status','in','(delivered,cancelled)'),
    rows().in('priority',['urgent','high']).order('priority',{ascending:false}).order('due_date',{ascending:true,nullsFirst:false}).limit(8),
    rows().eq('status','approval').order('due_date',{ascending:true,nullsFirst:false}).limit(6),
    rows().lt('due_date',today).order('due_date',{ascending:true}).limit(8),
    rows().eq('due_date',today).order('priority',{ascending:false}).limit(6),
    supabase.from('cases').select('id,case_number,patient_reference,title,status,priority,due_date,updated_at').eq(field,org.id).order('updated_at',{ascending:false}).limit(5),
  ]);
  for(const r of results)if(r.error)throw r.error;
  counts.active=results[0].count??0;counts.urgent=results[1].count??0;counts.approval=results[2].count??0;counts.overdue=results[3].count??0;counts.today=results[4].count??0;
  const all=results.slice(1).flatMap(r=>r.data??[]) as HomeCase[];
  return {counts,cases:Array.from(new Map(all.map(r=>[r.id,r])).values()),shipments:[] as HomeShipment[]};
}
