export type HomeOrgType = "clinic" | "laboratory" | "courier";
export type HomeCase = { id:string; case_number:string; title:string; patient_reference:string; status:string; priority:string; due_date:string|null; updated_at:string };
export type HomeShipment = { id:string; tracking_code:string|null; courier_name:string|null; status:string; updated_at:string };
export type HomeCounts = { active:number; urgent:number; approval:number; overdue:number; today:number; pickup:number; inTransit:number; pickedUp:number };
export const EMPTY_HOME_COUNTS: HomeCounts = {active:0,urgent:0,approval:0,overdue:0,today:0,pickup:0,inTransit:0,pickedUp:0};
export function localDay(date=new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function isActiveCase(item:HomeCase) {return item.status!=='delivered'&&item.status!=='cancelled';}
export function homeCaseFlag(item:HomeCase,today=localDay()) {
  if(!isActiveCase(item))return null;
  if(item.due_date && item.due_date<today)return {label:'Termin geçti',tone:'danger',rank:0};
  if(item.priority==='urgent')return {label:'Acil',tone:'danger',rank:1};
  if(item.priority==='high')return {label:'Yüksek öncelik',tone:'warning',rank:2};
  if(item.status==='approval')return {label:'Onay bekliyor',tone:'accent',rank:3};
  if(item.due_date===today)return {label:'Bugün teslim',tone:'accent',rank:4};
  return null;
}
export function prioritizedCases(cases:HomeCase[],today=localDay()) { return cases.filter(c=>homeCaseFlag(c,today)).sort((a,b)=>homeCaseFlag(a,today)!.rank-homeCaseFlag(b,today)!.rank || (a.due_date??'9999').localeCompare(b.due_date??'9999') || a.id.localeCompare(b.id)); }
export function homeStatus(status:string) { const labels:Record<string,string>={new:'Yeni',accepted:'Kabul edildi',design:'Tasarım',approval:'Onay',production:'Üretim',qc:'Kalite kontrol',ready:'Hazır',shipped:'Yolda',delivered:'Teslim edildi',cancelled:'İptal',created:'Oluşturuldu',pickup_requested:'Alım bekliyor',picked_up:'Teslim alındı',in_transit:'Yolda'};return labels[status]??status; }
export function dueLabel(value:string|null,localeTag='tr-TR') { if(!value)return 'Termin belirtilmedi';const d=new Date(value+'T12:00:00');return Number.isNaN(d.getTime())?'Termin belirtilmedi':d.toLocaleDateString(localeTag,{day:'numeric',month:'short'}); }
export function notificationHref(path:string|null) { return path && /^\/(cases|design|messages|logistics|finance|notifications|appointments)(\/|\?|$)/.test(path) && !path.includes('\\') ? path : '/notifications'; }
