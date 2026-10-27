'use client';
// RC60 AYA setup fixture: real component, synthetic IPC status and acknowledgements.
import {useCallback,useEffect,useState} from 'react';
import AyaEngineSetup from '../ai/AyaEngineSetup';
import UserText from '@/lib/i18n/UserText';
import {setLocale} from '@/lib/i18n';
type Status=Awaited<ReturnType<NonNullable<NonNullable<Window['dentayaDesktop']>['localAyaStatus']>>>;
const initial:Status={ok:false,models:[],error:'LOCAL_BUSY',progress:{running:true,status:'model',completed:10,total:100}};
export default function Fixture(){
 const [status,setStatus]=useState(initial),[error,setError]=useState(''),[model,setModel]=useState('');
 const refresh=useCallback(async()=>{const current=await window.dentayaDesktop?.localAyaStatus?.();if(!current)throw Error('SYNTHETIC_MISSING_STATUS');setStatus(current);},[]);
 useEffect(()=>{setLocale('tr');void refresh().catch(()=>setError('Synthetic initial status failure'));},[refresh]);
 return <main id="aya-setup-test" style={{maxWidth:720,margin:'32px auto',padding:20}}><AyaEngineSetup status={status} model={model} busy={false} checking={false} onChoose={setModel} onRefresh={refresh} onError={setError}/>{error&&<p role="alert"><UserText>{error}</UserText></p>}</main>;
}
