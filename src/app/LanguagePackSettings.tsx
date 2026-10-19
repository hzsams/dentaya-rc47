'use client';
import {useState} from 'react';
import {getLanguageEntries,installLanguagePack,loadLanguagePack,useTranslation,useLanguagePackCoverage} from '@/lib/i18n';
import {validTranslation} from '@/lib/i18n/pack-validation';
import manifest from '@/lib/i18n/ui-manifest.json';
import UiNode from '@/lib/i18n/UiNode';
import UiMessage from '@/lib/i18n/UiMessage';
export default function LanguagePackSettings(){
 const {locale}=useTranslation(),coverage=useLanguagePackCoverage(),[error,setError]=useState(''),[busy,setBusy]=useState(false),[success,setSuccess]=useState(false);
 async function exportPack(){setError('');try{await loadLanguagePack(locale);const json=JSON.stringify({version:1,locale,hash:manifest.hash,entries:getLanguageEntries(locale)},null,2),url=URL.createObjectURL(new Blob([json],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=`DentAYA-${locale}-rc31.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{setError('Dil paketi dışa aktarılamadı.');}}
 async function importPack(file?:File){if(!file)return;setError('');setSuccess(false);setBusy(true);try{
 if(file.size>6_000_000)throw Error('INVALID_PACK');const data=JSON.parse(await file.text());if(data.locale!==locale||data.hash!==manifest.hash||!data.entries||typeof data.entries!=='object'||Array.isArray(data.entries))throw Error('INVALID_PACK');const known=new Set(manifest.keys),values=Object.entries(data.entries);if(values.length>known.size||values.some(([source,value])=>!known.has(source)||!validTranslation(source,value)))throw Error('INVALID_PACK');await loadLanguagePack(locale);
 if(window.dentayaDesktop?.languagePackImport){const result=await window.dentayaDesktop.languagePackImport({locale,hash:manifest.hash,entries:data.entries});if(!result.ok)throw Error(result.error||'PACK_SAVE_FAILED');}else localStorage.setItem('dentaya:language-corrections:'+locale,JSON.stringify({hash:manifest.hash,entries:data.entries}));installLanguagePack(locale,data.entries);window.dispatchEvent(new Event('dentaya:language-pack'));setSuccess(true);
 }catch(reason){setError(reason instanceof Error&&reason.message==='INVALID_PACK'?'Dil paketi seçilen dil veya uygulama sürümüyle eşleşmiyor.':'Dil paketi bu cihazda kaydedilemedi.');}finally{setBusy(false);}}
 return <UiNode as="section" className="language-pack-settings"><UiNode as="h3">Hazır arayüz çevirileri</UiNode>
 <UiNode as="p">Menüler, butonlar, form alanları, açıklamalar, araç ipuçları, hata mesajları ve CAD araçları aynı dil paketini kullanır. İnternet, API anahtarı veya yerel model kurulumu gerekmez.</UiNode>
 <UiNode as="p" role="status">{coverage.ready?'Seçilen dilin bütün sabit arayüz metinleri hazır.':'Dil paketi yükleniyor…'} <UiMessage source="{0} / {1} metin" values={[coverage.completed,coverage.total]}/></UiNode>
 <UiNode as="p">Hasta ve kurum adları, yazdığınız içerikler, dosya adları ve diş numaraları korunur. Tarih ve sayı gösterimi seçilen dile uyar.</UiNode>
 {locale!=='tr'&&<UiNode as="details"><UiNode as="summary">Çeviri düzeltmelerini içe veya dışa aktar</UiNode><UiNode as="p">Hazır paketi dışa aktararak terimleri düzenleyebilir ve aynı dil ile sürüme ait düzeltmeleri bu cihazda kullanabilirsiniz. Düzeltme dosyası eksik olsa bile hazır paketin diğer çevirileri korunur.</UiNode><UiNode as="button" type="button" disabled={busy} onClick={()=>void exportPack()}>Dil paketini dışa aktar</UiNode><UiNode as="label">Düzeltilmiş dil paketini yükle<UiNode as="input" type="file" accept="application/json,.json" disabled={busy} onChange={event=>{const file=event.target.files?.[0];event.target.value='';void importPack(file);}}/></UiNode></UiNode>}
 {success&&<UiNode as="p" role="status">Çeviri düzeltmeleri kaydedildi.</UiNode>}{error&&<UiNode as="p" role="alert">{error}</UiNode>}</UiNode>;
}
