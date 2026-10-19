'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {experienceDuration,useExperience} from '@/lib/experience-preferences';
import {unlockExperienceAudio,playExperienceCue,stopExperienceAudio,suspendExperienceAudio,closeExperienceAudio} from '@/lib/experience-audio';
import {animateExperienceSurface,cancelExperienceAnimations} from '@/lib/experience-motion';
export default function ExperienceRuntime(){
 const pathname=usePathname(),preferences=useExperience();
 useEffect(()=>{
  const root=document.documentElement,media=matchMedia('(prefers-reduced-motion: reduce)');
  const apply=()=>{root.dataset.experiencePace=preferences.pace;root.dataset.experienceMotion=experienceDuration('page')||experienceDuration('panel')?'on':'off';root.dataset.experiencePanelMotion=experienceDuration('panel')?'on':'off';for(const kind of ['click','panel','page'] as const)root.style.setProperty('--experience-'+kind,experienceDuration(kind)+'ms');if(!experienceDuration('page'))cancelExperienceAnimations();};apply();
  stopExperienceAudio();const observer=new MutationObserver(apply);observer.observe(root,{attributes:true,attributeFilter:['data-dentaya-motion','data-workspace-reduced-motion']});media.addEventListener('change',apply);return()=>{observer.disconnect();media.removeEventListener('change',apply);};
 },[preferences]);
 useEffect(()=>{
  const activate=(event:Event)=>{if(event.isTrusted)unlockExperienceAudio();};
  const click=(event:MouseEvent)=>{if(!event.isTrusted||event.defaultPrevented||!(event.target instanceof Element))return;const target=event.target.closest('button,a[href],[role="button"],select,input[type="checkbox"]');if(!target||target.closest('[data-experience-silent]')||target.hasAttribute('disabled')||target.getAttribute('aria-disabled')==='true')return;
   const cad=Boolean(target.closest('.cad-page'))||location.pathname==='/design'||location.pathname==='/cad';
   // CAD state changes have their own sound, including keyboard commands. Avoid duplicate clicks.
   if(cad&&target.closest('[data-cad-state-cue]'))return;
   playExperienceCue(target.matches('a[href]')?'view':'tap',cad?'cad':'ui');
  };
  const visibility=()=>{if(document.hidden)suspendExperienceAudio();};
  window.addEventListener('pointerdown',activate,true);window.addEventListener('keydown',activate,true);document.addEventListener('click',click);document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',suspendExperienceAudio);
  return()=>{window.removeEventListener('pointerdown',activate,true);window.removeEventListener('keydown',activate,true);document.removeEventListener('click',click);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',suspendExperienceAudio);closeExperienceAudio();cancelExperienceAnimations();};
 },[]);
 useEffect(()=>{const frame=requestAnimationFrame(()=>animateExperienceSurface(document.querySelector<HTMLElement>('.module-content')??document.querySelector<HTMLElement>('main'),'page'));return()=>cancelAnimationFrame(frame);},[pathname]);
 return null;
}
