'use client';
// RC62 AYA acceptance fixture: real setup panel, synthetic transport only.
import {useEffect,useState} from 'react';
import AyaEngineSetup from '../ai/AyaEngineSetup';
import {setLocale} from '@/lib/i18n';
type FixtureWindow=Window&{rc62AcceptanceGate?:()=>Promise<boolean>};
const status={ok:true,models:[{name:'synthetic-model',label:'Synthetic model',size:1_850_000_000}],managed:{installed:true,running:false,version:'fixture',error:'',models:[],progress:{running:false,status:'',completed:0,total:0}},progress:{running:false,status:'',completed:0,total:0}};
export default function Fixture(){
 const [busy,setBusy]=useState(false),[model,setModel]=useState('synthetic-model'),[error,setError]=useState('');
 useEffect(()=>{setLocale('tr');},[]);
 return <main id="aya-acceptance-test" style={{maxWidth:760,margin:'24px auto',padding:20}}>
  <label>Ordinary draft<textarea id="ordinary-draft" defaultValue="UNSENT_PRIVATE_DRAFT" disabled={busy}/></label>
  <output id="acceptance-busy">{String(busy)}</output>
  <AyaEngineSetup status={status} model={model} busy={busy} checking={false} onChoose={setModel} onRefresh={async()=>{}} onError={setError} beforeAcceptance={async()=>await (window as FixtureWindow).rc62AcceptanceGate?.()??true} onAcceptanceBusyChange={setBusy}/>
  {error&&<p role="alert">{error}</p>}
 </main>;
}
