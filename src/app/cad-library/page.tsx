'use client';
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import {useEffect,useState} from 'react';
import UiNode from '@/lib/i18n/UiNode';
import Link from '@/lib/i18n/UiLink';
import {supabase} from '@/lib/supabase';
import CadFormLibrary from './CadFormLibrary';
export default function CadLibraryPage(){
 const [owner,setOwner]=useState(''),[ready,setReady]=useState(false);
 useEffect(()=>{let live=true,revision=0;const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{revision++;if(live){setOwner(session?.user.id??'');setReady(true);}});const initial=revision;void supabase.auth.getSession().then(({data})=>{if(live&&initial===revision){setOwner(data.session?.user.id??'');setReady(true);}});return()=>{live=false;subscription.unsubscribe();};},[]);
 return <UiNode as="main" className="cad-library-page"><UiNode as="header"><Link href="/lab">DentAYA Hub</Link><UiNode as="h1">Form kütüphanesi</UiNode></UiNode>{!ready?<LoadingExperience compact/>:owner?<CadFormLibrary ownerId={owner}/>:<Link href="/workspace">Giriş Yap</Link>}</UiNode>;
}
