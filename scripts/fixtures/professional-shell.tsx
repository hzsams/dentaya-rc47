'use client';
// Professional shell browser verification fixture. Never shipped as an app route.
import {useEffect,useState,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import WorkspaceLauncher from '@/app/WorkspaceLauncher';

declare global {
 interface Window {
  professionalShellFixture?: {
   removePrimary:()=>void;
   removeSecondary:()=>void;
   mountThird:()=>void;
   navigateNext:()=>void;
  };
 }
}
export default function ProfessionalShellFixture({children}:{children:ReactNode}){
 const [primary,setPrimary]=useState(true),[secondary,setSecondary]=useState(true),[third,setThird]=useState(false),router=useRouter();
 useEffect(()=>{
  window.professionalShellFixture={removePrimary:()=>setPrimary(false),removeSecondary:()=>setSecondary(false),mountThird:()=>setThird(true),navigateNext:()=>router.push('/professional-shell-preview/next')};
  return()=>{delete window.professionalShellFixture;};
 },[router]);
 return <main data-professional-shell-fixture>
  <h1>Professional shell verification</h1>
  <button id="shell-outside-focus" type="button">Fixture background action</button>
  <div data-launcher-instance="primary">{primary&&<WorkspaceLauncher/>}</div>
  <div data-launcher-instance="secondary">{secondary&&<WorkspaceLauncher/>}</div>
  <div data-launcher-instance="third">{third&&<WorkspaceLauncher/>}</div>
  {children}
 </main>;
}
