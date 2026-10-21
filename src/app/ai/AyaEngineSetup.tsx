'use client';
import {useRef,useState} from 'react';
import UiNode from '@/lib/i18n/UiNode';
import UiMessage from '@/lib/i18n/UiMessage';
import {ayaDownloadStatus} from '@/lib/aya-download-status';
import {ayaSetupError} from '@/lib/aya-setup-status';
import {useTranslation} from '@/lib/i18n';
type Status=Awaited<ReturnType<NonNullable<NonNullable<Window['dentayaDesktop']>['localAyaStatus']>>>;
export default function AyaEngineSetup({status,model,busy,checking,onChoose,onRefresh,onError}:{status:Status;model:string;busy:boolean;checking:boolean;onChoose:(model:string)=>void;onRefresh:()=>Promise<void>;onError:(error:string)=>void}){
 const [working,setWorking]=useState(false),lock=useRef(false);
 const {locale}=useTranslation();
 async function run(action:'install'|'import'|'stop'){
  if(lock.current)return;lock.current=true;setWorking(true);
  try{const api=window.dentayaDesktop,result=await(action==='install'?api?.localAyaInstall?.():action==='import'?api?.localAyaImportModel?.():api?.localAyaEngineStop?.());if(!result?.ok&&result?.error!=='LOCAL_CANCELLED')onError(ayaSetupError(result?.error,locale));await onRefresh();}catch{onError(ayaSetupError(undefined,locale));}finally{lock.current=false;setWorking(false);}
 }
 const progress=status.progress,stage=progress.status==='engine'?'Model dosyaları doğrulanıyor…':progress.status==='model'?'Model indiriliyor…':progress.status==='ready'?'Model indirildi. Model listesini yenileyip seçin.':progress.status==='cancelled'?'İndirme durduruldu.':progress.status==='failed'?ayaSetupError(status.managed?.error,locale):ayaDownloadStatus(progress.status);
 return <UiNode as="details" className="aya-local-setup aya-engine-setup" open={!status.models.length}><UiNode as="summary">Model ve çalışma ayarları</UiNode><UiNode as="div">
  <UiNode as="p">Yerel sohbet API anahtarı veya DentAYA oturumu istemez. Mesajlar yalnızca bu bilgisayardaki modele iletilir; buluta otomatik geçilmez.</UiNode>
  <UiNode as="strong" translateChildren={false}>AYA Local · llama.cpp · Qwen3 1.7B</UiNode>
  <UiNode as="p">İlk indirme internet ve boş disk alanı ister. Sonrasında yerel sohbet çevrimdışı çalışabilir. Hız bilgisayarın belleği ve işlemcisine bağlıdır; daha küçük kurulu modelleri de seçebilirsin.</UiNode>
  <UiNode as="p" translateChildren={false}>1.85 GB · CPU · GGUF</UiNode>
  <UiNode as="label">Kurulu yerel model<UiNode as="select" aria-label="Kurulu yerel model" value={model} disabled={busy||working||checking} onChange={e=>onChoose(e.target.value)}><UiNode as="option" value="">Model seçin</UiNode>{status.models.map(m=><UiNode as="option" key={m.name} value={m.name} translateChildren={false}>{m.label??m.name} · {(m.size/1e9).toFixed(2)} GB</UiNode>)}</UiNode></UiNode>
  <UiNode as="div" className="aya-engine-actions"><UiNode as="button" type="button" disabled={busy||working||checking||progress.running||status.managed?.running} onClick={()=>void run('install')}>Yerel motoru kur</UiNode><UiNode as="button" type="button" disabled={busy||working||checking||progress.running||status.managed?.running} onClick={()=>void run('import')}>Yerel model ekle</UiNode><UiNode as="button" type="button" disabled={checking||busy||working} onClick={()=>void onRefresh()}>{checking?'Kontrol ediliyor…':'Motoru ve modelleri yenile'}</UiNode>{status.managed?.running&&<UiNode as="button" type="button" disabled={busy||working} onClick={()=>void run('stop')}>Durdur</UiNode>}</UiNode>
  {progress.running&&<UiNode as="button" type="button" onClick={()=>void window.dentayaDesktop?.localAyaInstallCancel?.()}>İndirmeyi durdur</UiNode>}
  {status.managed&&!status.managed.installed&&status.managed.models.length>0&&<UiNode as="p" role="status" translateChildren={false}>{ayaSetupError('AYA_ENGINE_MISSING',locale)}</UiNode>}
  {progress.status&&<UiNode as="p" role="status" translateChildren={progress.status!=='failed'}>{stage}<UiMessage source=" · %{0}" values={[Math.min(100,Math.round(progress.completed/Math.max(1,progress.total)*100))]} userValues={[]}/></UiNode>}
 </UiNode></UiNode>;
}
