'use client';
import UiNode from '@/lib/i18n/UiNode';
import {useEffect} from 'react';
import {useTranslation} from '@/lib/i18n';
import {registerLoading} from '@/lib/loading-activity';
import DentalFacts from './DentalFacts';
export default function LoadingExperience({title='Yükleniyor…',compact=false,reading=false}:{title?:string;compact?:boolean;reading?:boolean}){
 const {t,locale}=useTranslation();useEffect(()=>{if(!reading)return registerLoading(locale);},[locale,reading]);
 const body=<><UiNode as="div" translateChildren={false} className="dy-loading-heading" role="status"><svg className="dy-loading-mark" width="52" height="52" viewBox="0 0 52 52" aria-hidden="true"><path d="M13 9c5-4 10 0 13 0s8-4 13 0c8 6 1 18-2 27-2 6-5 7-7 0l-2-8c-1-4-3-4-4 0l-2 8c-2 7-5 6-7 0-3-9-10-21-2-27Z" fill="none" stroke="currentColor" strokeWidth="1.7"/><circle cx="38" cy="10" r="4" fill="currentColor"/></svg><UiNode as="strong" translateChildren={false}>DentAYA</UiNode><UiNode as="span" translateChildren={false}>{t(title)}</UiNode>{!reading&&<UiNode as="span" translateChildren={false} className="dy-loading-line" aria-hidden="true"/>}</UiNode><DentalFacts loading/></>;
 return compact||reading?<UiNode as="section" translateChildren={false} className={'dy-loading-surface'+(compact?' dy-loading-surface--compact':'')}>{body}</UiNode>:<UiNode as="main" translateChildren={false} className="dy-loading-surface">{body}</UiNode>;
}
