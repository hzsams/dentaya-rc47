'use client';
// RC46 browser verification fixture: only synthetic workspace metadata.
import {useEffect,useState} from 'react';
import AyaChat from '../ai/AyaChat';
import CadAyaPanel from '../design/CadAyaPanel';
import {readAyaState,saveAyaOptions} from '@/lib/aya-local-state';
import {saveAyaKnowledge} from '@/lib/aya-knowledge';
import type {AyaCadContext} from '@/lib/aya-cad-assistance';
import {setLocale} from '@/lib/i18n';
const initial:AyaCadContext={unit:'46',restoration:'İmplant üstü kron',stage:'margin',setupComplete:true,sourceReady:true,modelReady:true,marginPoints:32,placed:false,visible:true,unsaved:true,saveFailed:false};
export default function Fixture(){
 const [context,setContext]=useState(initial),[actions,setActions]=useState<string[]>([]);
 useEffect(()=>{setLocale('tr');Reflect.set(window,'rc46Fixture',{setContext,setLocale,readAyaState,saveAyaOptions,saveAyaKnowledge,actions});return()=>{Reflect.deleteProperty(window,'rc46Fixture');};},[actions]);
 const record=(key:string)=>()=>setActions(old=>[...old,key]);
 return <main style={{maxWidth:1120,margin:'auto',padding:16}}><section className="aya-page" id="main-test"><AyaChat/></section><section id="cad-test"><CadAyaPanel context={context} onClose={record('close')} onPlace={record('place')} onSave={record('save')} onSetup={record('setup')} onShow={record('show')} onNext={record('next')}/></section></main>;
}
