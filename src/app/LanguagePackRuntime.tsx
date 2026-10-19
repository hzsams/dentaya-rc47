'use client';
import {useEffect,useRef} from 'react';
import {installLanguagePack,useLocale} from '@/lib/i18n';
export default function LanguagePackRuntime(){
 const locale=useLocale(),loaded=useRef(new Map<string,string>());
 useEffect(()=>{let live=true,timer:ReturnType<typeof setTimeout>|undefined,inFlight=false,pending=false,activated=false;
  async function refresh(){const api=window.dentayaDesktop;if(!api?.languagePackGet||!live)return;if(inFlight){pending=true;return;}inFlight=true;
   try{if(locale==='tr'){await api.languagePackActivate?.({locale});return;}const pack=await api.languagePackGet({locale});if(!live)return;
    if(pack.ok&&pack.entries){const stamp=pack.hash+':'+(pack.revision||pack.completed),changed=loaded.current.get(locale)!==stamp;if(changed){installLanguagePack(locale,pack.entries);loaded.current.set(locale,stamp);}if(changed||!activated){await api.languagePackActivate?.({locale});activated=true;}}
    const progress=await api.languagePackStatus?.();if(live&&progress?.running)timer=setTimeout(()=>void refresh(),2000);
   }catch{}finally{inFlight=false;if(live&&pending){pending=false;void refresh();}}
  }
  void refresh();const updated=()=>{if(timer)clearTimeout(timer);void refresh();};window.addEventListener('dentaya:language-pack',updated);
  return()=>{live=false;if(timer)clearTimeout(timer);window.removeEventListener('dentaya:language-pack',updated);};
 },[locale]);return null;
}
