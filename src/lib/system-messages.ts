import {formatUiMessage, type UiMessageSpec} from './i18n/message';

export type NotificationText = {title:string;body:string|null;entity_type:string|null};
const titles:Record<string,readonly string[]> = {
  case:['Yeni vaka','Vaka durumu güncellendi'],
  case_design_review:['Tasarım onayı bekliyor'],
  case_message:['Yeni vaka mesajı'],
  organization_message:['Yeni kurum mesajı'],
  shipment:['Teslimat durumu güncellendi'],
};
const caseStatuses:Record<string,string>={new:'Yeni',accepted:'Kabul Edildi',design:'Tasarım',approval:'Klinik Onayı',production:'Üretim',qc:'Kalite Kontrol',ready:'Teslimata Hazır',shipped:'Yolda',delivered:'Teslim Edildi',cancelled:'İptal'};
const shipmentStatuses:Record<string,string>={created:'Oluşturuldu',pickup_requested:'Alım Bekliyor',picked_up:'Teslim Alındı',in_transit:'Yolda',delivered:'Teslim Edildi',cancelled:'İptal'};
function isSystemTitle(row:NotificationText) {
  const type=row.entity_type??'';
  return Object.hasOwn(titles,type)&&titles[type].includes(row.title);
}
export function notificationTitle(row:NotificationText,t:(source:string)=>string) {
  return isSystemTitle(row)?t(row.title):row.title;
}
export function notificationBodyMessage(row:NotificationText):UiMessageSpec|null {
  if(!row.body||!isSystemTitle(row))return null;
  if(row.entity_type==='case_design_review') {
    const match=row.body.match(/^v(\d+) tasarım sürümü incelemeye gönderildi\.$/);
    return match?{source:'v{0} tasarım sürümü incelemeye gönderildi.',values:[match[1]],userValues:[0]}:null;
  }
  if(row.entity_type!=='case'&&row.entity_type!=='shipment')return null;
  // The last delimiter precedes the generated status. Everything before it is user data.
  const delimiter=row.body.lastIndexOf(' · ');
  if(delimiter<0)return null;
  const code=row.body.slice(delimiter+3),labels=row.entity_type==='case'?caseStatuses:shipmentStatuses;
  if(!Object.hasOwn(labels,code))return null;
  return {source:'{0} · {1}',values:[row.body.slice(0,delimiter),labels[code]],userValues:[0]};
}

const eventMessages:Record<string,readonly string[]> = {
  case_created:['Vaka oluşturuldu.'],
  case_accepted:['Laboratuvar vakayı kabul etti.'],
  production_completed:['Üretim tamamlandı ve vaka kalite kontrol aşamasına geçti.'],
  qc_completed:['Kalite kontrol tamamlandı. Vaka teslimata hazır.'],
  case_cancelled:['Vaka klinik tarafından iptal edildi.'],
};
export function caseEventMessage(row:{event_type:string;message:string|null},t:(source:string)=>string) {
  if(!row.message)return t('Vaka güncellendi.');
  if(Object.hasOwn(eventMessages,row.event_type)&&eventMessages[row.event_type].includes(row.message))return t(row.message);
  const patterns:Record<string,readonly [RegExp,string][]>={
    design_approved:[[/^Tasarım v(\d+) klinik tarafından onaylandı\.$/,'Tasarım v{0} klinik tarafından onaylandı.']],
    revision_requested:[[/^Tasarım v(\d+) için revizyon istendi: ([\s\S]+)$/,'Tasarım v{0} için revizyon istendi: {1}']],
    shipment_created:[[/^Kurye gönderisi oluşturuldu · ([\s\S]+)$/,'Kurye gönderisi oluşturuldu · {0}'],[/^Kurye alım talebi oluşturuldu · ([\s\S]+)$/,'Kurye alım talebi oluşturuldu · {0}']],
    courier_assigned:[[/^Kurye ağı atandı · ([\s\S]+)$/,'Kurye ağı atandı · {0}']],
    delivery_proof_recorded:[[/^Teslimat kanıtı kaydedildi · teslim alan: ([\s\S]+)$/,'Teslimat kanıtı kaydedildi · teslim alan: {0}']],
  };
  for(const [pattern,source] of Object.hasOwn(patterns,row.event_type)?patterns[row.event_type]:[]) {
    const match=row.message.match(pattern);
    if(match)return formatUiMessage({source,values:match.slice(1),userValues:match.slice(1).map((_,i)=>i)},t);
  }
  return row.message;
}
