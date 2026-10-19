import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LANGUAGES,loadLanguagePack,translate} from '../src/lib/i18n';
import {caseEventMessage,notificationTitle,notificationBodyMessage} from '../src/lib/system-messages';
import {memberRoleLabel,vehicleLabel} from '../src/lib/display-labels';
import {formatUiMessage} from '../src/lib/i18n/message';
const rows=fs.readFileSync('src/lib/i18n/dental-glossary.tsv','utf8').trim().split('\n').map(row=>row.split('|'));
const header=rows.shift()!;
for(const {id} of LANGUAGES) {
  await loadLanguagePack(id);
  const t=(source:string)=>translate(source,id);
  const notification={entity_type:'case',title:'Vaka durumu güncellendi',body:'CASE-37 · Kaydet · Kullanıcı başlığı · accepted'};
  const spec=notificationBodyMessage(notification)!;
  assert.equal(formatUiMessage(spec,t),`CASE-37 · Kaydet · Kullanıcı başlığı · ${t('Kabul Edildi')}`);
  assert.equal(notificationTitle(notification,t),t('Vaka durumu güncellendi'));
  for(const entity_type of ['case_message','organization_message','unknown','__proto__','constructor','toString']) {
    const row={entity_type,title:'Kaydet',body:'Kaydet: Tasarım v1 için revizyon istendi: Sil'};
    assert.equal(notificationTitle(row,t),'Kaydet');
    assert.equal(notificationBodyMessage(row),null);
  }
  assert.equal(notificationBodyMessage({...notification,body:'CASE · custom_status'}),null);
  for(const code of ['__proto__','constructor','toString']) {
    assert.equal(caseEventMessage({event_type:code,message:'Kaydet'},t),'Kaydet');
    assert.equal(memberRoleLabel(code),code);
    assert.equal(vehicleLabel(code),code);
  }
  assert.equal(caseEventMessage({event_type:'message',message:'Kaydet'},t),'Kaydet');
  const history=caseEventMessage({event_type:'revision_requested',message:'Tasarım v37 için revizyon istendi: Kaydet · Diş 47'},t);
  assert.ok(history.endsWith('Kaydet · Diş 47'),id+': revision note stays at the end');
  assert.ok(history.includes('37'));
  assert.equal(history,formatUiMessage({source:'Tasarım v{0} için revizyon istendi: {1}',values:['37','Kaydet · Diş 47'],userValues:[0,1]},t));
  assert.equal(caseEventMessage({event_type:'case_accepted',message:'Laboratuvar vakayı kabul etti.'},t),t('Laboratuvar vakayı kabul etti.'));
  assert.equal(caseEventMessage({event_type:'case_cancelled',message:'Vaka klinik tarafından iptal edildi.'},t),t('Vaka klinik tarafından iptal edildi.'));
  if(id!=='tr') {
    const glossary=Object.fromEntries(header.map((key,index)=>[key,rows.find(row=>row[0]===id)![index]]));
    for(const [source,concept] of [['Ad','first_name'],['Diş Teknisyeni','technician'],['Altyapı','framework'],['Kusp tepelerini koru','preserve_cusps'],['Night Guard','night_guard'],['Üst ark','upper_arch'],['Alt ark','lower_arch'],['Cement Gap','cement_gap'],['Süre (dk)','duration']])assert.equal(t(source),glossary[concept],`${id}: dental context ${source}`);
    for(const key of ['Vaka durumu güncellendi','Laboratuvar vakayı kabul etti.','Vaka / Hasta Ref','READY','PASS','WARN','FAIL','Yenileniyor…']) {
      assert.notEqual(t(key),key,`${id}: untranslated ${key}`);
    }
  }
}
console.log('PASS: system notifications, case history, status labels and dental terminology in 46 languages; embedded patient names, notes, case titles and FDI identifiers preserved.');
