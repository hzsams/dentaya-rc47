'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import type * as THREE from 'three';
import UiNode from '@/lib/i18n/UiNode';
import UserText from '@/lib/i18n/UserText';
import {useTranslation} from '@/lib/i18n';
import {supabase} from '@/lib/supabase';
import {CAD_FORM_AXES,CAD_FORM_MAX_FILE_BYTES,parseCadFormFile,prepareCadFormGeometry,createCadLibraryForm,decodeCadLibraryForm,listCadLibraryForms,saveCadLibraryForms,deleteCadLibraryForm,exportCadFormLibrary,importCadFormLibrary,type CadLibraryForm,type CadFormImportOptions} from '@/lib/cad-form-library';
import CadFormPreview from './CadFormPreview';
import './cad-library.css';
const codes=Array.from({length:4},(_,q)=>Array.from({length:8},(_,d)=>String(q+1)+String(d+1))).flat();
const defaults:CadFormImportOptions={scale:1,axis:'+Z',rotation:0};
function errorCaption(error:unknown){const code=error instanceof Error?error.message:'';return code==='CAD_FORM_NOT_SOLID'?'Form kapalı ve tek gövde olmalı.':code==='CAD_FORM_FILE_TYPE'?'STL veya OBJ dosyası seçin.':code.startsWith('CAD_FORM_')?'Form dosyası geçersiz.':'Bu cihazda kaydedilemedi.';}
export default function CadFormLibrary({ownerId:requestedOwner,anatomyCode,projectForms=[],onSelect}:{ownerId:string;anatomyCode?:string;projectForms?:CadLibraryForm[];onSelect?:(form:CadLibraryForm)=>void}){
 const [sessionOwner,setSessionOwner]=useState('');const ownerId=sessionOwner===requestedOwner?requestedOwner:'';
 const {t,intlLocale}=useTranslation();const [forms,setForms]=useState<CadLibraryForm[]>([]),[selectedId,setSelectedId]=useState(''),[query,setQuery]=useState(''),[name,setName]=useState(''),[code,setCode]=useState(anatomyCode??'46'),[sourceName,setSourceName]=useState(''),[options,setOptions]=useState(defaults),[source,setSource]=useState<THREE.BufferGeometry|null>(null),[preview,setPreview]=useState<THREE.BufferGeometry|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 const live=useRef(true),lock=useRef(false),generation=useRef(0),fileInput=useRef<HTMLInputElement>(null),bundleInput=useRef<HTMLInputElement>(null);
 const combined=useMemo(()=>ownerId?Array.from(new Map([...forms,...projectForms].map(f=>[f.id,f])).values()):[],[forms,projectForms,ownerId]);
 const selected=combined.find(f=>f.id===selectedId)??null;
 const matches=combined.filter(f=>(!anatomyCode||f.toothCode===anatomyCode)&&(!query||(`${f.name} ${f.toothCode}`).toLocaleLowerCase(intlLocale()).includes(query.toLocaleLowerCase(intlLocale()))));
 const prepared=useMemo(()=>{if(!source)return {geometry:null,error:''};try{return {geometry:prepareCadFormGeometry(source,options),error:''};}catch(error){return {geometry:null,error:errorCaption(error)};}},[source,options]);
 useEffect(()=>()=>prepared.geometry?.dispose(),[prepared]);useEffect(()=>()=>source?.dispose(),[source]);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{let active=true,revision=0;const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{revision++;if(active)setSessionOwner(session?.user.id??'');});const initial=revision;void supabase.auth.getSession().then(({data})=>{if(active&&revision===initial)setSessionOwner(data.session?.user.id??'');});return()=>{active=false;subscription.unsubscribe();};},[]);
 useEffect(()=>{let active=true;generation.current++;setForms([]);setSelectedId('');setSource(null);void listCadLibraryForms(ownerId).then(f=>{if(active)setForms(f);}).catch(e=>{if(active)setError(errorCaption(e));});return()=>{active=false;};},[ownerId]);
 useEffect(()=>{let active=true;let owned:THREE.BufferGeometry|null=null;setPreview(null);if(selected)void decodeCadLibraryForm(selected).then(g=>{owned=g;if(active)setPreview(g);else g.dispose();}).catch(e=>{if(active)setError(errorCaption(e));});return()=>{active=false;owned?.dispose();};},[selected]);
 async function loadFile(file:File,bundle=false){
  if(!ownerId||lock.current)return;const token=++generation.current;lock.current=true;setBusy(true);setError('');setSaved(false);setSelectedId('');setSource(null);
  try{
   if(file.size>(/\.json$/i.test(file.name)?50*1024*1024:CAD_FORM_MAX_FILE_BYTES))throw Error('CAD_FORM_FILE_SIZE');
   if(bundle){
    if(!/\.json$/i.test(file.name))throw Error('CAD_FORM_INVALID');
    const imported=await importCadFormLibrary(await file.text()),current=await listCadLibraryForms(ownerId);
    if(imported.some(f=>current.some(old=>old.id===f.id&&old.sha256!==f.sha256)))throw Error('CAD_FORM_INVALID');
    if(!live.current||token!==generation.current)return;await saveCadLibraryForms(ownerId,imported);const updated=await listCadLibraryForms(ownerId);if(!live.current||token!==generation.current)return;setForms(updated);setSelectedId((anatomyCode?imported.find(f=>f.toothCode===anatomyCode):imported[0])?.id??'');setSource(null);setSaved(true);return;
   }
   const g=parseCadFormFile(await file.arrayBuffer(),file.name);
   if(!live.current||token!==generation.current){g.dispose();return;}
   setSelectedId('');setSource(g);setSourceName(file.name);setName(file.name.replace(/\.(stl|obj)$/i,''));setCode(anatomyCode??'46');setOptions(defaults);
  }catch(e){if(live.current)setError(errorCaption(e));}finally{lock.current=false;if(live.current)setBusy(false);}
 }
 async function save(){
  if(!ownerId||!prepared.geometry||lock.current||!name.trim())return;const token=++generation.current;lock.current=true;setBusy(true);setError('');setSaved(false);
  try{
   const form=await createCadLibraryForm(prepared.geometry,{name,toothCode:code,sourceName});
   if(!live.current||token!==generation.current)return;await saveCadLibraryForms(ownerId,[form]);const updated=await listCadLibraryForms(ownerId);if(!live.current||token!==generation.current)return;setForms(updated);setSelectedId(form.id);setSource(null);setSaved(true);
  }catch(e){if(live.current)setError(errorCaption(e));}finally{lock.current=false;if(live.current)setBusy(false);}
 }
 async function remove(){
  if(!selected||!forms.some(f=>f.id===selected.id)||lock.current||!window.confirm(t('Sil')+': '+selected.name+'?'))return;
  const token=++generation.current;lock.current=true;setBusy(true);setError('');try{await deleteCadLibraryForm(ownerId,selected.id);if(live.current&&token===generation.current){setForms(await listCadLibraryForms(ownerId));setSelectedId('');}}catch(e){if(live.current)setError(errorCaption(e));}finally{lock.current=false;if(live.current)setBusy(false);}
 }
 function download(){if(!ownerId)return;try{const blob=new Blob([exportCadFormLibrary(forms)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='DentAYA_Form_Kutuphanesi.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError(errorCaption(e));}}
 return <UiNode as="div" className="cad-form-library" aria-busy={busy}>
  <UiNode as="p" className="cad-library-note">Form bu cihazda kaydedilir.</UiNode>
  <UiNode as="div" className="cad-library-toolbar"><UiNode as="button" type="button" disabled={busy||!ownerId} onClick={()=>fileInput.current?.click()}>Yeni form</UiNode><UiNode as="button" type="button" disabled={busy||!ownerId} onClick={()=>bundleInput.current?.click()}>İçe aktar</UiNode><UiNode as="button" type="button" disabled={busy||!forms.length} onClick={download}>Dışa aktar</UiNode><UiNode as="input" type="file" aria-label="Dosya seç" accept=".stl,.obj" ref={fileInput} hidden onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void loadFile(f);}}/><UiNode as="input" type="file" aria-label="İçe aktar" accept=".json" ref={bundleInput} hidden onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void loadFile(f,true);}}/></UiNode>
  <UiNode as="div" className="cad-library-content"><UiNode as="aside" className="cad-library-list"><UiNode as="input" aria-label="Ara" placeholder="Ara" value={query} onChange={e=>setQuery(e.target.value)}/>{matches.length===0&&<UiNode as="p">Henüz form eklenmedi.</UiNode>}{matches.map(f=><UiNode as="button" type="button" className="cad-library-item" key={f.id} aria-pressed={selectedId===f.id&&!source} disabled={busy} onClick={()=>{setSelectedId(f.id);setSource(null);setError('');setSaved(false);}}><UserText>{f.name}</UserText><UserText>{'FDI '+f.toothCode+' · '+f.sizeMm.map(n=>n.toFixed(2)).join(' × ')+' mm'}</UserText></UiNode>)}</UiNode>
   <UiNode as="section" className="cad-library-detail"><CadFormPreview geometry={prepared.geometry??preview}/>{source&&<UiNode as="div" className="cad-library-fields">
    <UiNode as="label">Form adı<UiNode as="input" aria-label="Form adı" maxLength={120} value={name} disabled={busy} onChange={e=>setName(e.target.value)}/></UiNode>
    <UiNode as="label">Anatomi / kron formu<UiNode as="select" aria-label="Anatomi / kron formu" value={code} disabled={busy} onChange={e=>setCode(e.target.value)}>{codes.map(c=><UiNode as="option" key={c} value={c} translateChildren={false}>{c}</UiNode>)}</UiNode></UiNode>
    <UiNode as="label">Dosya birimi<UiNode as="select" aria-label="Dosya birimi" value={options.scale} disabled={busy} onChange={e=>setOptions(o=>({...o,scale:Number(e.target.value)}))}><UiNode as="option" value={1} translateChildren={false}>mm</UiNode><UiNode as="option" value={10} translateChildren={false}>cm</UiNode><UiNode as="option" value={.001} translateChildren={false}>µm</UiNode></UiNode></UiNode>
    <UiNode as="label">Oklüzal<UiNode as="select" aria-label="Oklüzal" value={options.axis} disabled={busy} onChange={e=>setOptions(o=>({...o,axis:e.target.value as CadFormImportOptions['axis']}))}>{CAD_FORM_AXES.map(a=><UiNode as="option" key={a} value={a} translateChildren={false}>{a}</UiNode>)}</UiNode></UiNode>
    <UiNode as="button" type="button" disabled={busy} onClick={()=>setOptions(o=>({...o,rotation:(o.rotation+90)%360}))} translateChildren={false}>+90°</UiNode>
    <UiNode as="button" type="button" disabled={busy||!prepared.geometry||!name.trim()} onClick={()=>void save()}>{busy?'Kaydediliyor…':'Kaydet'}</UiNode>
   </UiNode>}
   {selected&&!source&&<><UiNode as="strong"><UserText>{selected.name}</UserText></UiNode><UserText>{'FDI '+selected.toothCode+' · '+selected.sizeMm.map(n=>n.toFixed(2)).join(' × ')+' mm'}</UserText><UiNode as="div" className="cad-library-actions">{onSelect&&<UiNode as="button" type="button" disabled={busy||!preview||Boolean(anatomyCode&&selected.toothCode!==anatomyCode)} onClick={()=>onSelect(selected)}>CAD’de kullan</UiNode>}{forms.some(f=>f.id===selected.id)&&<UiNode as="button" type="button" disabled={busy} onClick={()=>void remove()}>Sil</UiNode>}</UiNode></>}
   {(error||prepared.error)&&<UiNode as="p" role="alert">{error||prepared.error}</UiNode>}{saved&&<UiNode as="p" role="status">Kaydedildi</UiNode>}
  </UiNode></UiNode>
 </UiNode>;
}
