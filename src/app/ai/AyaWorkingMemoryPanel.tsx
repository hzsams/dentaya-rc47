'use client';
import {useState} from 'react';
import {normalizeMemory,type AyaWorkingMemory} from '../../../electron/aya/agent.cjs';
import {beginAyaMemoryEdit,checkAyaMemoryEdit,type AyaMemoryEdit} from '@/lib/aya-ui-state';
import {useTranslation} from '@/lib/i18n';
import {ayaExperienceText} from '@/lib/i18n/aya-experience';
import {ayaAgentText} from '@/lib/i18n/aya-agent';
import UiNode from '@/lib/i18n/UiNode';
import UserText from '@/lib/i18n/UserText';
export default function AyaWorkingMemoryPanel({sessionId,memory,busy,onChange}:{sessionId:string;memory:AyaWorkingMemory;busy:boolean;onChange:(memory:AyaWorkingMemory)=>void}) {
 const {locale}=useTranslation(),copy=ayaExperienceText(locale),agentCopy=ayaAgentText(locale);
 const [edit,setEdit]=useState<AyaMemoryEdit|null>(null);
 const checked=edit?checkAyaMemoryEdit(edit,sessionId,memory,busy):null;
 const conflict=checked&&!checked.ok&&(checked.reason==='session-changed'||checked.reason==='memory-changed');
 const invalid=checked&&!checked.ok&&checked.reason==='invalid';
 const hasMemory=Boolean(memory.goal||memory.decisions.length||memory.openQuestions.length);
 function startEdit(){if(!busy)setEdit(beginAyaMemoryEdit(sessionId,memory));}
 function update(patch:Partial<Pick<AyaMemoryEdit,'goal'|'decisions'|'questions'>>){setEdit(current=>current?{...current,...patch}:null);}
 return <UiNode as="section" className="aya-working-memory" translateChildren={false}>
  <UiNode as="h3">{agentCopy.memory}</UiNode><UiNode as="p">{agentCopy.temporary}</UiNode>
  {edit?<UiNode as="form" className="aya-memory-editor" translateChildren={false} onSubmit={e=>{e.preventDefault();const result=checkAyaMemoryEdit(edit,sessionId,memory,busy);if(!result.ok)return;onChange(result.memory);setEdit(null);}}>
   <UiNode as="p">{copy.memoryInputHelp}</UiNode>
   {conflict&&<UiNode as="div" className="aya-memory-conflict" role="alert" translateChildren={false}><UiNode as="p">{copy.memoryChanged}</UiNode><UiNode as="button" type="button" disabled={busy} onClick={startEdit}>{copy.reloadMemory}</UiNode></UiNode>}
   <UiNode as="label" htmlFor="aya-memory-goal">{agentCopy.goal}</UiNode><UiNode as="textarea" id="aya-memory-goal" value={edit.goal} rows={2} maxLength={500} disabled={busy} onChange={e=>update({goal:e.target.value})}/>
   <UiNode as="label" htmlFor="aya-memory-decisions">{agentCopy.decisions}</UiNode><UiNode as="textarea" id="aya-memory-decisions" value={edit.decisions} rows={3} maxLength={2400} disabled={busy} onChange={e=>update({decisions:e.target.value})}/>
   <UiNode as="label" htmlFor="aya-memory-questions">{agentCopy.questions}</UiNode><UiNode as="textarea" id="aya-memory-questions" value={edit.questions} rows={3} maxLength={1800} disabled={busy} onChange={e=>update({questions:e.target.value})}/>
   <UiNode as="p" role={invalid?'alert':undefined}>{copy.memoryLimits}</UiNode><UiNode as="div" translateChildren={false}><UiNode as="button" type="submit" disabled={!checked?.ok}>{copy.saveMemory}</UiNode><UiNode as="button" type="button" onClick={()=>setEdit(null)}>{copy.cancel}</UiNode></UiNode>
  </UiNode>:<>
   {!hasMemory?<UiNode as="p">{copy.memoryEmpty}</UiNode>:<><UiNode as="h4">{agentCopy.goal}</UiNode><UserText>{memory.goal||'—'}</UserText><UiNode as="h4">{agentCopy.decisions}</UiNode>{memory.decisions.length?<UiNode as="ul">{memory.decisions.map((item,i)=><UiNode as="li" key={i}><UserText>{item}</UserText></UiNode>)}</UiNode>:<UiNode as="p">{copy.noDecisions}</UiNode>}<UiNode as="h4">{agentCopy.questions}</UiNode>{memory.openQuestions.length?<UiNode as="ul">{memory.openQuestions.map((item,i)=><UiNode as="li" key={i}><UserText>{item}</UserText></UiNode>)}</UiNode>:<UiNode as="p">{copy.noQuestions}</UiNode>}</>}
   <UiNode as="div" translateChildren={false}><UiNode as="button" type="button" disabled={busy} onClick={startEdit}>{copy.editMemory}</UiNode><UiNode as="button" type="button" disabled={busy||!hasMemory} onClick={()=>{if(!busy)onChange(normalizeMemory(null));}}>{agentCopy.clear}</UiNode></UiNode>
  </>}
 </UiNode>;
}
