'use client';
import {useState} from 'react';
import {normalizeMemory,type AyaWorkingMemory} from '../../../electron/aya/agent.cjs';
import {useTranslation} from '@/lib/i18n';
import {ayaExperienceText} from '@/lib/i18n/aya-experience';
import {ayaAgentText} from '@/lib/i18n/aya-agent';
import UiNode from '@/lib/i18n/UiNode';
import UserText from '@/lib/i18n/UserText';
export default function AyaWorkingMemoryPanel({memory,busy,onChange}:{memory:AyaWorkingMemory;busy:boolean;onChange:(memory:AyaWorkingMemory)=>void}) {
 const {locale}=useTranslation(),copy=ayaExperienceText(locale),agentCopy=ayaAgentText(locale);
 const [editing,setEditing]=useState(false),[goal,setGoal]=useState(''),[decisions,setDecisions]=useState(''),[questions,setQuestions]=useState('');
 const decisionLines=decisions.split('\n').map(x=>x.trim()).filter(Boolean),questionLines=questions.split('\n').map(x=>x.trim()).filter(Boolean);
 const valid=goal.trim().length<=500&&decisionLines.length<=5&&questionLines.length<=3&&[...decisionLines,...questionLines].every(x=>x.length<=240);
 const hasMemory=Boolean(memory.goal||memory.decisions.length||memory.openQuestions.length);
 function edit() { setGoal(memory.goal);setDecisions(memory.decisions.join('\n'));setQuestions(memory.openQuestions.join('\n'));setEditing(true); }
 return <UiNode as="section" className="aya-working-memory" translateChildren={false}>
  <UiNode as="h3">{agentCopy.memory}</UiNode><UiNode as="p">{agentCopy.temporary}</UiNode>
  {editing?<UiNode as="form" className="aya-memory-editor" translateChildren={false} onSubmit={e=>{e.preventDefault();if(!valid)return;onChange(normalizeMemory({goal,decisions:decisionLines,openQuestions:questionLines}));setEditing(false);}}>
   <UiNode as="p">{copy.memoryInputHelp}</UiNode>
   <UiNode as="label" htmlFor="aya-memory-goal">{agentCopy.goal}</UiNode><UiNode as="textarea" id="aya-memory-goal" value={goal} rows={2} maxLength={500} disabled={busy} onChange={e=>setGoal(e.target.value)}/>
   <UiNode as="label" htmlFor="aya-memory-decisions">{agentCopy.decisions}</UiNode><UiNode as="textarea" id="aya-memory-decisions" value={decisions} rows={3} maxLength={2400} disabled={busy} onChange={e=>setDecisions(e.target.value)}/>
   <UiNode as="label" htmlFor="aya-memory-questions">{agentCopy.questions}</UiNode><UiNode as="textarea" id="aya-memory-questions" value={questions} rows={3} maxLength={1800} disabled={busy} onChange={e=>setQuestions(e.target.value)}/>
   <UiNode as="p" role={valid?undefined:'alert'}>{copy.memoryLimits}</UiNode><UiNode as="div" translateChildren={false}><UiNode as="button" type="submit" disabled={busy||!valid}>{copy.saveMemory}</UiNode><UiNode as="button" type="button" onClick={()=>setEditing(false)}>{copy.cancel}</UiNode></UiNode>
  </UiNode>:<>
   {!hasMemory?<UiNode as="p">{copy.memoryEmpty}</UiNode>:<><UiNode as="h4">{agentCopy.goal}</UiNode><UserText>{memory.goal||'—'}</UserText><UiNode as="h4">{agentCopy.decisions}</UiNode>{memory.decisions.length?<UiNode as="ul">{memory.decisions.map((item,i)=><UiNode as="li" key={i}><UserText>{item}</UserText></UiNode>)}</UiNode>:<UiNode as="p">{copy.noDecisions}</UiNode>}<UiNode as="h4">{agentCopy.questions}</UiNode>{memory.openQuestions.length?<UiNode as="ul">{memory.openQuestions.map((item,i)=><UiNode as="li" key={i}><UserText>{item}</UserText></UiNode>)}</UiNode>:<UiNode as="p">{copy.noQuestions}</UiNode>}</>}
   <UiNode as="div" translateChildren={false}><UiNode as="button" type="button" disabled={busy} onClick={edit}>{copy.editMemory}</UiNode><UiNode as="button" type="button" disabled={busy||!hasMemory} onClick={()=>onChange(normalizeMemory(null))}>{agentCopy.clear}</UiNode></UiNode>
  </>}
 </UiNode>;
}
