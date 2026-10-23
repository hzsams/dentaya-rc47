'use client';
// RC50 AYA work browser verification fixture: synthetic metadata and callbacks only.
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import AyaChat from '../ai/AyaChat';
import CadAyaPanel from '../design/CadAyaPanel';
import '../design/cad-workspace.css';
import type {AyaCadContext} from '@/lib/aya-cad-assistance';
import type {AyaActionResult} from '@/lib/aya-cad-agent';
import type {AyaProposal} from '../../../electron/aya/agent.cjs';
import {readAyaState,saveAyaOptions} from '@/lib/aya-local-state';
import {setLocale} from '@/lib/i18n';

const initial:AyaCadContext={
 unit:'46',restoration:'İmplant üstü kron',stage:'margin',task:'margin',
 setupComplete:true,sourceReady:true,modelReady:true,marginPoints:32,
 placed:false,visible:true,unsaved:true,saveFailed:false,antagonistReady:false,
 scope:'rc50-synthetic-project/source/unit-46',snapshot:'rc50-snapshot-before-place',dataToken:'rc50-data-before-place',
 availableTools:['setup','library','place','inspect','show-all','save','save-exit'],report:null,
};

export default function Fixture(){
 const [context,setContext]=useState(initial),[actions,setActions]=useState<string[]>([]),[cadOpen,setCadOpen]=useState(true);
 const contextRef=useRef(context);
 useLayoutEffect(()=>{contextRef.current=context;},[context]);
 useEffect(()=>{
  setLocale('tr');
  Reflect.set(window,'rc50Work',{setContext,readAyaState,saveAyaOptions,actions,getContext:()=>contextRef.current});
  return()=>{Reflect.deleteProperty(window,'rc50Work');};
 },[actions]);
 async function run(proposal:AyaProposal):Promise<AyaActionResult>{
  setActions(old=>[...old,proposal.tool]);
  if(proposal.tool==='place'){
   setContext(old=>({...old,placed:true,snapshot:'rc50-snapshot-after-place',dataToken:'rc50-data-after-place',availableTools:old.availableTools?.filter(tool=>tool!=='place')}));
   return {ok:true,message:'Sentetik yerleştirme callback’i tamamlandı. Bu test gerçek geometri çalıştırmaz.'};
  }
  if(proposal.tool==='save'||proposal.tool==='save-exit'){
   setContext(old=>({...old,saveFailed:true,unsaved:true,snapshot:'rc50-snapshot-save-failed'}));
   return {ok:false,message:'Sentetik kayıt başarısız: CAD projesi kaydedilemedi; çalışma ekranı açık kaldı.'};
  }
  return {ok:false,message:'Bu sentetik fixture yalnız yerleştirme ve başarısız kayıt callback’lerini destekler.'};
 }
 return <main style={{maxWidth:1120,margin:'auto',padding:16}}>
  <section className="aya-page" id="main-test"><AyaChat/></section>
  <section id="cad-test" style={{position:'relative',height:940,maxWidth:460,margin:'32px auto 0'}}>{cadOpen&&<CadAyaPanel key={context.scope} context={context} onClose={()=>setCadOpen(false)} onRun={run}/>}</section>
 </main>;
}
