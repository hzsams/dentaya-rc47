'use strict';
const fold=s=>String(s||'').toLocaleLowerCase('tr').normalize('NFKD').replace(/\p{M}/gu,'').replace(/ı/g,'i');
const units={m:1,metre:1,meter:1,metres:1,meters:1,cm:.01,santimetre:.01,centimeter:.01,mm:.001,milimetre:.001,millimeter:.001,um:.000001,'µm':.000001,'μm':.000001,mikron:.000001,micron:.000001,micrometre:.000001};
const canonical=u=>units[u]===1?'m':units[u]===.01?'cm':units[u]===.001?'mm':'µm';
function convertLength(prompt){
 const q=fold(prompt).replace(/^(olcu cevir|cevir|convert|hesapla)\s*:?\s*/,''),names=Object.keys(units).sort((a,b)=>b.length-a.length).join('|');
 const m=q.match(new RegExp('^(-?\\d+(?:[.,]\\d+)?)\\s*('+names+')\\s*(?:=|->|→|kac|to|in)?\\s*('+names+')(?:\\s*(?:eder|nedir|cevir))?[?.!]*$'));
 if(!m)return null;const value=Number(m[1].replace(',','.')),result=value*units[m[2]]/units[m[3]];
 if(!Number.isFinite(result)||Math.abs(result)>1e12)return null;return {value,from:canonical(m[2]),to:canonical(m[3]),result:Number(result.toPrecision(12))};
}
function percentage(prompt){const m=fold(prompt).replace(/^(hesapla|calculate)\s*:?\s*/,'').match(/^(-?\d+(?:[.,]\d+)?)\s*(?:%|yuzde|percent)\s*(-?\d+(?:[.,]\d+)?)[?.!]*$/);if(!m)return null;const amount=Number(m[1].replace(',','.')),percent=Number(m[2].replace(',','.')),result=amount*percent/100;return Number.isFinite(result)&&Math.abs(result)<=1e15?{amount,percent,result:Number(result.toPrecision(12))}:null;}
function cadChecklist(c,t=s=>s){if(!c)return [];const item=(id,ready,message,pending=false)=>({id,state:ready?'ready':pending?'pending':'attention',message:t(message)});return [
 item('setup',c.setupComplete,'İş tanımını tamamlayın'),
 item('scan',c.sourceReady&&c.modelReady,c.sourceReady?'Modelin yüklenmesini bekleyin.':'Kaynak seçilmedi'),
 item('marginStep',c.marginPoints>=3,'Geçerli bir kole çizgisi çizin.'),
 item('position',c.placed,'Koleye yerleştir'),
 item('visibility',c.visible,'Tümünü göster'),
 item('bite',c.upperReady&&c.lowerReady,'Antagonist ve kapanış verisini kontrol et'),
 item('save',!c.unsaved&&!c.saveFailed&&!c.isSaving,c.isSaving?'Kaydediliyor…':c.saveFailed?'CAD projesi kaydedilemedi.':'Kaydet ve çık',c.isSaving)
 ];}
function nextCadAction(c){if(!c||c.isSaving)return '';if(c.saveFailed)return 'save';if(!c.setupComplete)return 'setup';if(!c.sourceReady||!c.modelReady)return '';if(!c.visible&&c.placed)return 'show';if(c.marginPoints<3)return c.task==='files'?'next':'';if(!c.placed)return 'place';if(c.task==='contacts'&&!(c.upperReady&&c.lowerReady))return '';if(c.unsaved&&c.task==='review')return 'save';return c.task==='review'?'save':'next';}
function toolAnswer(prompt,{cadContext=null,locale='tr'}={},t=s=>s){
 const q=fold(prompt),en=locale!=='tr',conversion=convertLength(prompt);if(conversion)return `${conversion.value} ${conversion.from} = ${conversion.result} ${conversion.to}`;
 const percent=percentage(prompt);if(percent)return `${percent.amount} × ${percent.percent} / 100 = ${percent.result}`;
 if(/kontrol listesi|checklist|calisma kontrol|workspace check|neler eksik|eksikleri/.test(q)){
  const checks=cadChecklist(cadContext,t);if(checks.length)return [t('Çalışma ünitesi')+': '+(cadContext.unit||'—'),...checks.map(x=>(x.state==='ready'?'✓ ':x.state==='pending'?'… ':'○ ')+(x.state==='ready'?t(({setup:'İş tanımı',scan:'Tarama',marginStep:'Marjin çizgisi',position:'Koleye yerleştir',visibility:'Göster / Gizle',bite:'Kayıtlı kapanış',save:'CAD projesi kaydedildi.'})[x.id]):x.message))].join('\n');
  return en?'Work checklist\n1. Confirm the job, tooth numbers and material.\n2. Check the source and opposing scans.\n3. Review the margin and restoration.\n4. Record checks and save the project.':'Çalışma kontrolü\n1. İş tanımını, diş numaralarını ve materyali doğrula.\n2. Kaynak ve karşıt çene taramalarını kontrol et.\n3. Kole ve restorasyonu gözden geçir.\n4. Kontrolleri not edip projeyi kaydet.';
 }
 if(/teslim.*(not|mesaj|taslak)|devir.*(not|mesaj)|handoff|handover/.test(q)){
  const unit=cadContext?.unit||'[…]';return en?`Handoff draft\nCase: […]\nUnits: ${unit}\nRestoration / material: […]\nCompleted checks: […]\nOpen items: […]\nRequested delivery: […]\nAttachments / version: […]`:`Teslim notu taslağı\nVaka: […]\nÜniteler: ${unit}\nRestorasyon / materyal: […]\nYapılan kontroller: […]\nAçık kalan işler: […]\nİstenen teslim: […]\nEkler / sürüm: […]`;
 }
 return null;
}
module.exports={convertLength,percentage,cadChecklist,nextCadAction,toolAnswer};
