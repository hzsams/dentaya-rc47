'use client';
import {useEffect} from 'react';
import {initializeLocale,languageInfo,useTranslation} from '@/lib/i18n';
export default function LanguageRuntime(){
 const {locale,t}=useTranslation();
 useEffect(()=>{void initializeLocale();},[]);
 useEffect(()=>{const info=languageInfo(locale);document.documentElement.lang=info.id;document.documentElement.dir=info.dir;document.querySelector('meta[name=description]')?.setAttribute('content',t('Klinik, laboratuvar, tarama, CAD tasarım ve teslimat süreçleri için ortak dental çalışma alanı.'));},[locale,t]);
 return null;
}
