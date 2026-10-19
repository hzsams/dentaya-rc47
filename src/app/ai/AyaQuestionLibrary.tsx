'use client';
import './aya-catalog.css';
import {useMemo,useState} from 'react';
import {entries,stats,sources,topics} from '../../../electron/aya/qa-catalog.cjs';
import {fold} from '../../../electron/aya/conversation.cjs';
import {AYA_CATALOG_TEXT} from '@/lib/i18n/aya-catalog';
import {useTranslation} from '@/lib/i18n';
import UserText from '@/lib/i18n/UserText';
import UiNode from '@/lib/i18n/UiNode';

const pageSize=8;
export default function AyaQuestionLibrary({onChoose,disabled=false}:{onChoose:(question:string)=>void;disabled?:boolean}){
 const {locale}=useTranslation(),copy=AYA_CATALOG_TEXT[locale==='tr'?'tr':'en'];
 const [search,setSearch]=useState(''),[category,setCategory]=useState(''),[page,setPage]=useState(0),[opened,setOpened]=useState(false);
 const filtered=useMemo(()=>{const terms=fold(search).split(' ').filter(Boolean);return entries.filter(e=>(!category||category===e.category)&&terms.every(term=>fold(e.question+' '+topics.find(t=>t.id===e.topicId)?.aliases.join(' ')).includes(term)));},[search,category]);
 const pages=Math.max(1,Math.ceil(filtered.length/pageSize)),current=Math.min(page,pages-1);
 return <UiNode as="details" translateChildren={false} id="aya-catalog" className="aya-question-library" onToggle={e=>setOpened(e.currentTarget.open)}>
  <UiNode as="summary" translateChildren={false}><UserText>{copy.title+' · '+stats.questions+' '+copy.questions+' / '+stats.topics+' '+copy.topics}</UserText></UiNode>
  {opened&&<UiNode as="div" translateChildren={false}>
   <UiNode as="p" translateChildren={false}><UserText>{copy.note+' '+copy.language}</UserText></UiNode>
   <UiNode as="div" translateChildren={false} className="aya-library-filters"><UiNode as="input" translateChildren={false} aria-label={copy.search} placeholder={copy.search} value={search} maxLength={120} onChange={e=>{setSearch(e.target.value);setPage(0);}}/><UiNode as="select" translateChildren={false} aria-label={copy.category} value={category} onChange={e=>{setCategory(e.target.value);setPage(0);}}><UiNode as="option" translateChildren={false} value=""><UserText>{copy.all}</UserText></UiNode>{stats.categories.map(c=><UiNode as="option" translateChildren={false} key={c.id} value={c.id}>{c.title+' · '+c.questions}</UiNode>)}</UiNode></UiNode>
   <UiNode as="p" translateChildren={false}><UserText>{filtered.length+' '+copy.questions+' · '+(current+1)+' / '+pages}</UserText></UiNode>
   <UiNode as="ul" translateChildren={false}>{filtered.slice(current*pageSize,(current+1)*pageSize).map(entry=><UiNode as="li" translateChildren={false} key={entry.id}><UiNode as="details" translateChildren={false}><UiNode as="summary" translateChildren={false}><UserText>{entry.question}</UserText></UiNode><UiNode as="p" translateChildren={false}><UserText>{entry.answer}</UserText></UiNode>{entry.sourceIds.map(id=><UiNode as="small" translateChildren={false} key={id}><UserText>{copy.source+': '}</UserText>{sources[id].url?<UiNode as="a" translateChildren={false} href={sources[id].url!} target="_blank" rel="noopener noreferrer"><UserText>{sources[id].name}</UserText></UiNode>:<UserText>{sources[id].name}</UserText>}</UiNode>)}</UiNode><UiNode as="button" translateChildren={false} type="button" disabled={disabled} onClick={()=>onChoose(entry.question)}><UserText>{copy.choose}</UserText></UiNode></UiNode>)}</UiNode>
   {!filtered.length&&<UiNode as="p" translateChildren={false}><UserText>{copy.empty}</UserText></UiNode>}
   <UiNode as="nav" translateChildren={false}><UiNode as="button" translateChildren={false} type="button" disabled={current===0} onClick={()=>setPage(current-1)}><UserText>{copy.previous}</UserText></UiNode><UiNode as="button" translateChildren={false} type="button" disabled={current>=pages-1} onClick={()=>setPage(current+1)}><UserText>{copy.next}</UserText></UiNode></UiNode>
  </UiNode>}
 </UiNode>;
}
