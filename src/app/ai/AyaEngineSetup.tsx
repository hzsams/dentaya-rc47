'use client';
import {useRef,useState} from 'react';
import UiNode from '@/lib/i18n/UiNode';
import {ayaDownloadStatus} from '@/lib/aya-download-status';
import {ayaSetupError} from '@/lib/aya-setup-status';
import {ayaInspectorText,ayaSetupText} from '@/lib/i18n/aya-setup';
import {useTranslation} from '@/lib/i18n';
import AyaSetupProgress from './AyaSetupProgress';
import './aya-engine-setup.css';
type Status=Awaited<ReturnType<NonNullable<NonNullable<Window['dentayaDesktop']>['localAyaStatus']>>>;
export default function AyaEngineSetup({status,model,busy,checking,onChoose,onRefresh,onError}:{status:Status;model:string;busy:boolean;checking:boolean;onChoose:(model:string)=>void;onRefresh:()=>Promise<void>;onError:(error:string)=>void;beforeAcceptance?:()=>Promise<boolean>;onAcceptanceBusyChange?:(busy:boolean)=>void}){
 const [working,setWorking]=useState(false),lock=useRef(false);
 const {locale,t}=useTranslation();
 async function run(action:'install'|'import'|'stop'|'cancel'|'refresh'|'ollama'|'ollama-cancel'){
  if(lock.current)return;lock.current=true;setWorking(true);onError('');
  try{
   if(action!=='refresh'){
    const api=window.dentayaDesktop,result=await(action==='install'?api?.localAyaInstall?.():action==='import'?api?.localAyaImportModel?.():action==='cancel'?api?.localAyaInstallCancel?.():action==='ollama'?api?.localAyaDownload?.():action==='ollama-cancel'?api?.localAyaCancelDownload?.():api?.localAyaEngineStop?.());
    if(!result?.ok&&result?.error!=='LOCAL_CANCELLED')onError(ayaSetupError(result?.error,locale));
   }
  }catch{onError(ayaSetupError(undefined,locale));}
  finally{
   try{await onRefresh();}catch{onError(ayaSetupError(undefined,locale));}
   lock.current=false;setWorking(false);
  }
 }
 const ollamaProgress=status.ollama?.progress;
 const downloadCopy=ayaSetupText(locale),copy=ayaInspectorText(locale);
 const selected=status.models.find(item=>item.name===model);
 const progress=status.progress,stage=progress.status==='engine'?'Model dosyaları doğrulanıyor…':progress.status==='model'?'Model indiriliyor…':progress.status==='ready'?'Model indirildi. Model listesini yenileyip seçin.':progress.status==='cancelled'?'İndirme durduruldu.':progress.status==='failed'?ayaSetupError(status.managed?.error,locale):ayaDownloadStatus(progress.status);
 return <UiNode as="section" className="aya-local-setup aya-engine-setup"><UiNode as="h3" translateChildren={false}>{copy.title}</UiNode><UiNode as="div">
  <UiNode as="p" translateChildren={false}>{copy.privacy}</UiNode>
  <UiNode as="ol" className="aya-setup-steps" translateChildren={false}>
   <UiNode as="li"><UiNode as="strong">{copy.engine}</UiNode><UiNode as="span" data-ready={Boolean(status.managed?.installed||status.ollama?.online)}>{status.managed?.installed?`${copy.managed} · ${status.managed.version}`:status.ollama?.online?copy.ollamaOnline:copy.missing}</UiNode></UiNode>
   <UiNode as="li"><UiNode as="strong">{copy.model}</UiNode><UiNode as="span" data-ready={Boolean(selected)}>{selected?`${selected.label??selected.name} · ${(selected.size/1e9).toFixed(2)} GB`:copy.choose}</UiNode></UiNode>
   <UiNode as="li"><UiNode as="strong">{copy.ready}</UiNode><UiNode as="span">{copy.replyHint}</UiNode></UiNode>
  </UiNode>
  <UiNode as="label">Kurulu yerel model<UiNode as="select" aria-label="Kurulu yerel model" value={model} disabled={busy||working||checking} onChange={e=>onChoose(e.target.value)}><UiNode as="option" value="">Model seçin</UiNode>{status.models.map(m=><UiNode as="option" key={m.name} value={m.name} translateChildren={false}>{m.label??m.name} · {(m.size/1e9).toFixed(2)} GB</UiNode>)}</UiNode></UiNode>
  <UiNode as="p" translateChildren={false}>{copy.baseline}</UiNode>
  <UiNode as="div" className="aya-engine-actions"><UiNode as="button" type="button" disabled={busy||working||checking||progress.running||ollamaProgress?.running||status.managed?.running} onClick={()=>void run('install')}>Yerel motoru kur</UiNode><UiNode as="button" type="button" disabled={checking||busy||working} onClick={()=>void run('refresh')}>{checking?'Kontrol ediliyor…':'Motoru ve modelleri yenile'}</UiNode>{status.managed?.running&&<UiNode as="button" type="button" disabled={busy||working} onClick={()=>void run('stop')}>Durdur</UiNode>}</UiNode>
  {progress.running&&<UiNode as="button" type="button" disabled={working} onClick={()=>void run('cancel')}>İndirmeyi durdur</UiNode>}
  {status.managed&&!status.managed.installed&&status.managed.models.length>0&&<UiNode as="p" role="status" translateChildren={false}>{ayaSetupError('AYA_ENGINE_MISSING',locale)}</UiNode>}
  {progress.status&&<AyaSetupProgress progress={progress} label={copy.progress} stage={progress.status==='failed'?stage:t(stage)} locale={locale}/>}
  <UiNode as="details" className="aya-other-models"><UiNode as="summary" translateChildren={false}>{copy.alternative}</UiNode>
  <UiNode as="button" type="button" disabled={busy||working||checking||progress.running||ollamaProgress?.running||status.managed?.running} onClick={()=>void run('import')}>Yerel model ekle</UiNode>
  <UiNode as="section" className="aya-ollama-setup" translateChildren={false}><UiNode as="strong">{downloadCopy.title}</UiNode><UiNode as="p">{downloadCopy.hint}</UiNode>{status.ollama?.online?<UiNode as="button" type="button" disabled={busy||working||checking||progress.running||ollamaProgress?.running} onClick={()=>void run('ollama')}>{downloadCopy.download}</UiNode>:<UiNode as="p">{downloadCopy.offline} <UiNode as="a" href="https://ollama.com/download/windows" target="_blank" rel="noopener noreferrer">{downloadCopy.getOllama} ↗</UiNode></UiNode>}
  {ollamaProgress?.running&&<UiNode as="button" type="button" disabled={working} onClick={()=>void run('ollama-cancel')}>{downloadCopy.cancel}</UiNode>}
  {ollamaProgress?.status&&<AyaSetupProgress progress={ollamaProgress} label={copy.ollamaProgress} stage={t(ayaDownloadStatus(ollamaProgress.status))} locale={locale}/>}</UiNode></UiNode>
 </UiNode></UiNode>;
}
