'use client';
// RC29 browser verification fixture: stable marker for safe temporary-route cleanup.
import {useEffect,useRef,useState} from 'react';
import UiNode from '@/lib/i18n/UiNode';
import UiLink from '@/lib/i18n/UiLink';
import UiMessage from '@/lib/i18n/UiMessage';
import UserText from '@/lib/i18n/UserText';
import SystemNotificationBody from '@/app/SystemNotificationBody';
import {notificationTitle} from '@/lib/system-messages';
import {ayaDownloadStatus} from '@/lib/aya-download-status';
import {useTranslation,installLanguagePack,setLocale,changeLocale,getLocale,getLanguagePackCoverage,translate} from '@/lib/i18n';
import LanguageSettings from '../LanguageSettings';
import ExperienceSettings from '../ExperienceSettings';
import AyaChat from '../ai/AyaChat';
import ToothChart from '../ToothChart';
import {synthesizeCue} from '@/lib/experience-audio';
import {saveAyaOptions,readAyaState,clearAyaSessions} from '@/lib/aya-local-state';
export default function Fixture(){
 const {t}=useTranslation();
 const notification={entity_type:"case",title:"Vaka durumu güncellendi",body:"CASE-47 · Kaydet · accepted"};
 const [value,setValue]=useState('Kaydet'),[selected,setSelected]=useState(['47','46']);
 const ref=useRef<HTMLButtonElement>(null),link=useRef<HTMLAnchorElement>(null),file=useRef<HTMLInputElement>(null);
 useEffect(()=>{Reflect.set(window,'rc29Fixture',{installLanguagePack,setLocale,changeLocale,getLocale,getLanguagePackCoverage,translate,synthesizeCue,saveAyaOptions,readAyaState,clearAyaSessions,refs:()=>({button:ref.current?.tagName,link:link.current?.tagName,href:link.current?.getAttribute('href'),file:file.current?.tagName})});return()=>{Reflect.deleteProperty(window,'rc29Fixture');};},[]);
 return <main style={{padding:24,maxWidth:1120,margin:'auto'}}>
  <h1>RC32 — UI verification</h1>
  <div id="ui-checks" style={{display:'grid',gap:15,padding:20}}>
   <UiNode as="button" id="translated-action" type="button" ref={ref} title="Kaydet" aria-label="Kaydet">Kaydet</UiNode>
   <UiNode as="p" id="translated-paragraph">Sekiz ses dokusu ve olay başına ayrı düzey. Önizleme sessiz saatleri atlar.</UiNode>
   <UiNode as="input" id="controlled-input" placeholder="Hasta adı" title="Kaydet" aria-label="Hasta adı" value={value} onChange={e=>setValue(e.target.value)}/>
   <UiLink id="translated-link" href="/cases" ref={link}>Vakalar</UiLink>
   <UiNode as="p" id="user-content"><UserText><UiNode as="strong">Kaydet</UiNode> Hasta adı: Kaydet</UserText></UiNode>
   <UiNode as="p" id="fdi-message"><UiMessage source="{0} · {1}" values={['47','Dayanak']}/></UiNode>
   <UiNode as="p" id="welcome-message"><UiMessage source="Merhaba, {0}" values={['Kaydet $&']} userValues={[0]}/></UiNode>
   <UiNode as="button" type="button" id="protected-attribute" title="Kaydet" uiMessages={{title:{source:'{0}',values:['Kaydet'],userValues:[0]}}}>Kaydet</UiNode>
   <UiNode as="p" id="selected-teeth" translateChildren={false}>{selected.join(',')}</UiNode>
  </div>
  <UiNode as="form" id="file-form"><UiNode as="input" ref={file} id="localized-file" type="file" aria-label="Dosya seç"/></UiNode><UiNode as="select" id="fdi-option" defaultValue="47"><UiNode as="optgroup" label="Alt çene"><UiNode as="option" value="47">47</UiNode></UiNode></UiNode>
  <UiNode as="strong" id="system-case-title"><UserText>{notificationTitle(notification,t)}</UserText></UiNode>
  <UiNode as="p" id="system-case-body"><SystemNotificationBody row={notification}/></UiNode>
  <UiNode as="p" id="scan-context-label">Vaka / Hasta Ref</UiNode>
  <UiNode as="p" id="engine-progress-label">{ayaDownloadStatus("verifying sha256 digest")}</UiNode>
  <LanguageSettings/>
  <section id="sound-controls" style={{marginTop:30}}><ExperienceSettings/></section>
  <section id="tooth-controls" style={{marginTop:30}}><ToothChart selected={selected} onChange={codes=>setSelected(codes)}/></section>
  <section className="aya-page" style={{marginTop:30}}><AyaChat/></section>
 </main>;
}
