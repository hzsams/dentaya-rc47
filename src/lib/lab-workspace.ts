import {isActiveCase,localDay,type HomeCase} from './home-dashboard';
export const LAB_QUEUE_FILTERS=['active','priority','overdue','today','new','design','approval','production','all'] as const;
export type LabQueueFilter=typeof LAB_QUEUE_FILTERS[number];
export type LabCase=HomeCase&{case_type:string;tooth_codes:string[];material:string|null;shade:string|null};
export type LabCounts={active:number;priority:number;overdue:number;today:number;new:number;design:number;approval:number;production:number};
export const LAB_PAGE_SIZE=40;
export type HomeLabQueue='priority'|'today'|'recent'|'active'|'approval'|'overdue';
export function homeLabCases(cases:HomeCase[],queue:HomeLabQueue,today=localDay()){
 if(queue==='active')return cases.filter(isActiveCase);
 if(queue==='approval')return cases.filter(c=>isActiveCase(c)&&c.status==='approval');
 if(queue==='overdue')return cases.filter(c=>isActiveCase(c)&&c.due_date!==null&&c.due_date<today);
 return cases;
}
export function labNextAction(item:Pick<LabCase,'id'|'status'>){
 const detail='/cases/'+encodeURIComponent(item.id);
 if(item.status==='design')return {label:'Tasarımı aç',href:'/design?case='+encodeURIComponent(item.id),icon:'design' as const};
 if(item.status==='approval')return {label:'Klinik kararı incele',href:detail,icon:'case' as const};
 if(item.status==='production'||item.status==='qc')return {label:'Üretim / QC kaydını aç',href:detail,icon:'lab' as const};
 if(item.status==='ready'||item.status==='shipped')return {label:'Teslimat durumunu incele',href:detail,icon:'logistics' as const};
 if(item.status==='delivered')return {label:'Tamamlanan vakayı aç',href:detail,icon:'case' as const};
 return {label:'Kabul ve planlamayı aç',href:detail,icon:'case' as const};
}
export function searchLabPage(cases:LabCase[],query:string,locale='tr-TR'){
 const q=query.trim().toLocaleLowerCase(locale);
 return !q?cases:cases.filter(c=>[c.case_number,c.title,c.patient_reference,c.case_type,c.material,c.shade,...c.tooth_codes].filter(Boolean).join(' ').toLocaleLowerCase(locale).includes(q));
}
/** Epochs are invalidated on refresh/filter change and unmount; stale results never commit. */
export function createLabLoadGate(){let epoch=0;return {begin:()=>++epoch,isCurrent:(value:number)=>value===epoch,invalidate:()=>{epoch++;}};}
