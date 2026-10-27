'use client';
import {useId} from 'react';
import UiNode from '@/lib/i18n/UiNode';
import {ayaInspectorText} from '@/lib/i18n/aya-setup';
export default function AyaSetupProgress({progress,label,stage,locale}:{progress:{running:boolean;status:string;completed:number;total:number};label:string;stage:string;locale:string}){
 const id=useId(),copy=ayaInspectorText(locale);
 const completed=Number.isFinite(progress.completed)?Math.max(0,progress.completed):0;
 const total=Number.isFinite(progress.total)&&progress.total>0?progress.total:0;
 const percent=total>0?Math.min(100,Math.round(completed/total*100)):null;
 const bytes=(value:number)=>`${new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(value/1_000_000)} MB`;
 return <UiNode as="div" className="aya-setup-progress" translateChildren={false}>
  <UiNode as="p" id={id} role="status">{stage}</UiNode>
  {(progress.running||total>0)&&<><UiNode as="progress" aria-label={label} aria-describedby={id} max={total||undefined} value={total?Math.min(completed,total):undefined}/><UiNode as="span" className="aya-setup-bytes">{bytes(completed)} / {total?bytes(total):copy.unknownTotal}{percent===null?'':` · ${percent}%`}</UiNode></>}
 </UiNode>;
}
