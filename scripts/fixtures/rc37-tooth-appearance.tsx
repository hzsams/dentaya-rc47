'use client';
// RC37 anatomical appearance verification fixture.
import {useEffect} from 'react';
import ToothAppearanceSettings from '@/app/ToothAppearanceSettings';
import {LanguageSelect} from '@/app/LanguageSettings';
import {normalizeToothAppearance} from '@/lib/tooth-appearance';
import {getLocale,translate} from '@/lib/i18n';
export default function Fixture(){
 useEffect(()=>{
  Reflect.set(window,'rc37Appearance',{
   preferences:()=>normalizeToothAppearance(JSON.parse(localStorage.getItem('dentaya:tooth-appearance:v1')||'null')),
   getLocale,translate,
  });
  return ()=>{Reflect.deleteProperty(window,'rc37Appearance');};
 },[]);
 return <main style={{padding:24,maxWidth:1320,margin:'auto'}}><div className="rc37-appearance-header"><LanguageSelect compact/></div><ToothAppearanceSettings/></main>;
}
