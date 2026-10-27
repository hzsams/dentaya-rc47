'use client';
import {entries,sources,type QaEntry} from '../../../electron/aya/qa-catalog.cjs';
import {ayaExperienceText} from '@/lib/i18n/aya-experience';
import {useTranslation} from '@/lib/i18n';
import UserText from '@/lib/i18n/UserText';
import UiNode from '@/lib/i18n/UiNode';

const indexedEntries=new Map(entries.map(entry=>[entry.id,entry]));
/** Resolve only committed catalogue records, never model-supplied source prose. */
export function findAyaCatalogReference(id:string,href:string):QaEntry|undefined {
 if(href!=='/ai#aya-catalog'||!id.startsWith('aya-qa-'))return undefined;
 return indexedEntries.get(id.slice('aya-qa-'.length));
}

export default function AyaCatalogReference({entry}:{entry:QaEntry}) {
 const {locale}=useTranslation(),copy=ayaExperienceText(locale);
 return <UiNode as="details" className="aya-catalog-reference" data-aya-reference={entry.id} translateChildren={false}>
  <UiNode as="summary" translateChildren={false}><UserText>{entry.question}</UserText></UiNode>
  <UiNode as="p" className="aya-reference-note">{copy.catalogReferenceNote}</UiNode>
  <UiNode as="p" data-user-content><UserText>{entry.answer}</UserText></UiNode>
  <UiNode as="ul" aria-label={copy.selectedSources} translateChildren={false}>
   {entry.sourceIds.map(id=>{const source=sources[id];return source?<UiNode as="li" key={id} translateChildren={false}>{source.url?<UiNode as="a" href={source.url} target="_blank" rel="noopener noreferrer" translateChildren={false}><UserText>{source.name}</UserText><UiNode as="span" className="sr-only"> · {copy.externalSource}</UiNode> ↗</UiNode>:<UserText>{source.name}</UserText>}</UiNode>:null;})}
  </UiNode>
 </UiNode>;
}
