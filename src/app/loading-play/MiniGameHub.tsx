'use client';
import UiNode from '@/lib/i18n/UiNode';
import {useEffect,useId,useState} from 'react';
import {useTranslation} from '@/lib/i18n';
import {dentalFactLanguage} from '@/lib/dental-facts';
import {MINI_GAME_TEXT} from '@/lib/i18n/mini-games';
import {MINI_GAMES,type MiniGameId} from '@/lib/mini-games';
import KuspGame from './KuspGame';
import MemoryGame from './MemoryGame';
import GrooveGame from './GrooveGame';
export default function MiniGameHub(){
 const {locale}=useTranslation(),copy=MINI_GAME_TEXT[dentalFactLanguage(locale)],id=useId(),[active,setActive]=useState<MiniGameId>('kusp');
 useEffect(()=>{try{const saved=localStorage.getItem('dentaya:mini-game:v1');if(MINI_GAMES.includes(saved as MiniGameId))setActive(saved as MiniGameId);}catch{}},[]);
 function choose(game:MiniGameId){setActive(game);try{localStorage.setItem('dentaya:mini-game:v1',game);}catch{}}
 return <UiNode as="div" translateChildren={false} className="mini-game-hub"><UiNode as="div" translateChildren={false} className="mini-game-tabs" role="tablist" aria-label={copy.choose}>{MINI_GAMES.map((game,i)=><UiNode as="button" translateChildren={false} type="button" role="tab" key={game} id={`${id}-${game}-tab`} aria-controls={`${id}-${game}`} aria-selected={active===game} tabIndex={active===game?0:-1} onClick={()=>choose(game)} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const next=MINI_GAMES[(i+(e.key==='ArrowRight'?1:2))%3];choose(next);document.getElementById(`${id}-${next}-tab`)?.focus();}}}><UiNode as="small" translateChildren={false}>0{i+1}</UiNode>{copy[game]}</UiNode>)}</UiNode>
  <UiNode as="div" translateChildren={false} id={`${id}-kusp`} role="tabpanel" aria-labelledby={`${id}-kusp-tab`} hidden={active!=='kusp'}><KuspGame/></UiNode>
  <UiNode as="div" translateChildren={false} id={`${id}-memory`} role="tabpanel" aria-labelledby={`${id}-memory-tab`} hidden={active!=='memory'}><MemoryGame/></UiNode>
  <UiNode as="div" translateChildren={false} id={`${id}-route`} role="tabpanel" aria-labelledby={`${id}-route-tab`} hidden={active!=='route'}><GrooveGame/></UiNode>
 </UiNode>;
}
