'use client';
import UiNode from '@/lib/i18n/UiNode';
import {useEffect,useRef,useState} from 'react';
import {useTranslation} from '@/lib/i18n';
import {dentalFactLanguage} from '@/lib/dental-language';
import {MINI_GAME_TEXT} from '@/lib/i18n/mini-games';
import {EMPTY_MINI_RECORD,memoryDeck,readMiniRecord,saveMiniWin} from '@/lib/mini-games';
const shapes=['M20 13Q40 7 60 13L58 40Q52 46 48 69Q40 88 32 69Q28 46 22 40Z','M19 26L40 9L61 26L58 43L47 74Q40 87 33 74L22 43Z','M18 14Q29 7 40 18Q51 7 62 14L60 43L49 72Q40 86 31 72L20 43Z','M14 16Q26 5 40 14Q54 5 66 16L62 47L50 72Q40 85 30 72L18 47Z','M16 15Q40 5 64 15L61 44L56 76Q49 86 45 65L40 51L35 65Q31 86 24 76L19 44Z','M14 15Q27 5 40 14Q53 5 66 15L62 45L60 74Q55 86 49 65L45 53L43 77Q40 87 37 77L35 53L31 65Q25 86 20 74L18 45Z'];
export default function MemoryGame(){
 const {locale}=useTranslation(),copy=MINI_GAME_TEXT[dentalFactLanguage(locale)];
 const [deck,setDeck]=useState(()=>memoryDeck(4401)),[open,setOpen]=useState<number[]>([]),[matched,setMatched]=useState<number[]>([]),[turns,setTurns]=useState(0),[message,setMessage]=useState(''),[record,setRecord]=useState(EMPTY_MINI_RECORD),[failed,setFailed]=useState(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null),won=useRef(false),locked=useRef(false);
 useEffect(()=>{setDeck(memoryDeck(crypto.getRandomValues(new Uint32Array(1))[0]));setRecord(readMiniRecord('memory'));return()=>{if(timer.current)clearTimeout(timer.current);};},[]);
 function choose(index:number){
  if(locked.current||won.current||matched.includes(index)||open.includes(index))return;
  if(!open.length){setOpen([index]);setMessage('');return;}
  const first=open[0],count=turns+1;setTurns(count);setOpen([first,index]);
  if(deck[first]===deck[index]){const next=[...matched,first,index];setMatched(next);setOpen([]);setMessage(copy.matched);if(next.length===12){won.current=true;const result=saveMiniWin('memory',count);setRecord(result.record);setFailed(!result.saved);}}
  else{locked.current=true;setMessage(copy.mismatch);timer.current=setTimeout(()=>{setOpen([]);locked.current=false;timer.current=null;},900);}
 }
 function restart(){if(timer.current)clearTimeout(timer.current);timer.current=null;locked.current=false;won.current=false;setDeck(memoryDeck(crypto.getRandomValues(new Uint32Array(1))[0]));setOpen([]);setMatched([]);setTurns(0);setMessage('');setFailed(false);}
 const solved=matched.length===12;
 return <UiNode as="section" translateChildren={false} className="mini-board-game memory-game" data-memory-solved={solved} onKeyDown={e=>{if(e.key!=='Escape')e.stopPropagation();}}>
  <UiNode as="p" translateChildren={false} className="kusp-intro">{copy.memoryIntro}</UiNode><UiNode as="p" translateChildren={false} className="kusp-instructions">{copy.memoryHelp}</UiNode>
  <UiNode as="div" translateChildren={false} className="kusp-metrics"><UiNode as="span" translateChildren={false}>{copy.turns}<UiNode as="b" translateChildren={false}>{turns}</UiNode></UiNode><UiNode as="span" translateChildren={false}>{copy.pairs}<UiNode as="b" translateChildren={false}>{matched.length/2} / 6</UiNode></UiNode><UiNode as="span" translateChildren={false}>{copy.wins}<UiNode as="b" translateChildren={false}>{record.wins}</UiNode></UiNode><UiNode as="span" translateChildren={false}>{copy.best}<UiNode as="b" translateChildren={false}>{record.bestMoves??'—'}</UiNode></UiNode></UiNode>
  <UiNode as="div" translateChildren={false} className="memory-grid" role="group" aria-label={copy.memory}>{deck.map((shape,i)=>{const shown=open.includes(i)||matched.includes(i),done=matched.includes(i);return <UiNode as="button" translateChildren={false} type="button" key={i} className={'memory-card'+(shown?' is-open':'')+(done?' is-matched':'')} data-memory-card={i} data-memory-shape={shown?shape:''} aria-label={shown?copy.shapes[shape]:`${copy.card} ${i+1}`} aria-pressed={shown} aria-disabled={done} tabIndex={done?-1:0} onClick={()=>choose(i)}><svg viewBox="0 0 80 95" aria-hidden="true"><path d={shown?shapes[shape]:shapes[3]} fill="currentColor" opacity={shown?1:.13}/>{shown&&<path d="M27 23Q40 30 53 23M40 30V42" stroke="var(--dy-surface,#18262c)" opacity=".5" fill="none" strokeWidth="2"/>}</svg><UiNode as="small" translateChildren={false}>{shown?copy.shapes[shape]:String(i+1).padStart(2,'0')}</UiNode></UiNode>;})}</UiNode>
  <UiNode as="p" translateChildren={false} className="kusp-feedback" role="status">{solved?copy.memorySolved:message||'\u00a0'}</UiNode><UiNode as="div" translateChildren={false} className="kusp-actions"><UiNode as="button" translateChildren={false} type="button" onClick={restart}>{solved?copy.again:copy.restart}</UiNode></UiNode>{failed&&<UiNode as="p" translateChildren={false} role="status">{copy.noRecord}</UiNode>}
 </UiNode>;
}
