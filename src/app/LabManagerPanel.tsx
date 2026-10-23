'use client';
import {useEffect,useId,useState} from 'react';
import UiNode from '@/lib/i18n/UiNode';
import UiLink from '@/lib/i18n/UiLink';
import {useTranslation} from '@/lib/i18n';
import type {HomeCounts} from '@/lib/home-dashboard';
import type {HomeLabQueue} from '@/lib/lab-workspace';
import DentayaIcon from './DentayaIcon';
export default function LabManagerPanel({counts,queue,role,onQueue,queuePage=false,targetId='home-queue-records'}:{queuePage?:boolean;targetId?:string;counts:HomeCounts|null;queue:HomeLabQueue;role:string;onQueue:(value:HomeLabQueue)=>void}){
 const {locale}=useTranslation(),tr=locale==='tr',id=useId(),[expanded,setExpanded]=useState(true);
 useEffect(()=>{const media=window.matchMedia('(max-width:760px)'),sync=()=>setExpanded(!media.matches);sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);},[]);
 const copy=tr?{title:'Lab Yöneticisi',work:'Çalışma kuyruğu',active:'Açık işler',overdue:'Geciken terminler',today:'Bugün teslim',approval:'Onay bekleyen',open:'Laboratuvar kuyruğunu aç',note:'Sayılar kurum genelindedir. Ana liste öncelikli kayıtların özetini gösterir.',delivery:'Teslimatlar',team:'Ekip yönetimi',operations:'Operasyon merkezi'}:{title:'Lab Manager',work:'Work queue',active:'Open jobs',overdue:'Overdue jobs',today:'Due today',approval:'Awaiting approval',open:'Open laboratory queue',note:'Counts cover the organization. The main list shows a preview of priority records.',delivery:'Deliveries',team:'Team management',operations:'Operations center'};
 const rows=[{id:'active' as const,label:copy.active,value:counts?.active},{id:'overdue' as const,label:copy.overdue,value:counts?.overdue},{id:'today' as const,label:copy.today,value:counts?.today},{id:'approval' as const,label:copy.approval,value:counts?.approval}];
 return <UiNode as="aside" className="desktop-lab-manager" aria-label={copy.title} translateChildren={false}>
  <UiNode as="button" type="button" className="desktop-home-panel-heading desktop-lab-manager-toggle" aria-controls={id} aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)} translateChildren={false}><DentayaIcon name="lab" size={20}/><UiNode as="strong" translateChildren={false}>{copy.title}</UiNode><UiNode as="span" aria-hidden="true">{expanded?'−':'+'}</UiNode></UiNode>
  <UiNode as="div" id={id} hidden={!expanded} className="desktop-lab-manager-body" translateChildren={false}>
   <UiNode as="span" className="desktop-lab-kicker" translateChildren={false}>{copy.work}</UiNode>
   <UiNode as="div" className="desktop-lab-queue-buttons" translateChildren={false}>{rows.map(row=><UiNode as="button" type="button" key={row.id} aria-pressed={queue===row.id} aria-controls={targetId} onClick={()=>onQueue(row.id)} translateChildren={false}><UiNode as="span" translateChildren={false}>{row.label}</UiNode><UiNode as="b">{row.value??'—'}</UiNode></UiNode>)}</UiNode>
   {!queuePage&&<UiLink className="desktop-home-button desktop-home-button-primary" href="/lab" data-lab-destination="/lab" translateChildren={false}><DentayaIcon name="lab" size={18}/>{copy.open}</UiLink>}
   <UiNode as="nav" aria-label={copy.title} className="desktop-lab-navigation" translateChildren={false}><UiLink href="/logistics" translateChildren={false}><DentayaIcon name="logistics" size={17}/>{copy.delivery}</UiLink><UiLink href="/operations" translateChildren={false}><DentayaIcon name="shield" size={17}/>{copy.operations}</UiLink>{['owner','admin'].includes(role)&&<UiLink href="/team" translateChildren={false}><DentayaIcon name="team" size={17}/>{copy.team}</UiLink>}</UiNode>
   <UiNode as="p" className="desktop-lab-note" translateChildren={false}>{queuePage?(tr?'Sayılar kurum genelindedir; liste seçili kuyruğun sayfalarını gösterir.':'Counts cover the organization; the list pages through the selected queue.'):copy.note}</UiNode>
  </UiNode>
 </UiNode>;
}
