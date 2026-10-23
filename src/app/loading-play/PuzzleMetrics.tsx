'use client';
import UiNode from '@/lib/i18n/UiNode';
import {useEffect,useRef,useState} from 'react';
import {EMPTY_MINI_RECORD,readMiniRecord,saveMiniWin,type RecordedMiniGame} from '@/lib/mini-games';
import {MINI_GAME_TEXT} from '@/lib/i18n/mini-games';

export function usePuzzleRecord(game:RecordedMiniGame,solved:boolean,moves:number){
 const [record,setRecord]=useState(EMPTY_MINI_RECORD),[failed,setFailed]=useState(false),won=useRef(false);
 useEffect(()=>{setRecord(readMiniRecord(game));},[game]);
 useEffect(()=>{
  if(!solved){won.current=false;setFailed(false);return;}
  if(won.current||moves<1)return;
  won.current=true;const result=saveMiniWin(game,moves);setRecord(result.record);setFailed(!result.saved);
 },[game,solved,moves]);
 return {record,failed};
}
export default function PuzzleMetrics({copy,moves,progress,progressTitle,record}:{copy:typeof MINI_GAME_TEXT['en']|typeof MINI_GAME_TEXT['tr'];moves:number;progress:string;progressTitle:string;record:typeof EMPTY_MINI_RECORD}){
 return <UiNode as="div" translateChildren={false} className="kusp-metrics mini-puzzle-metrics">
  <UiNode as="span" translateChildren={false}>{copy.moves}<UiNode as="b" translateChildren={false} data-puzzle-moves>{moves}</UiNode></UiNode>
  <UiNode as="span" translateChildren={false}>{progressTitle}<UiNode as="b" translateChildren={false}>{progress}</UiNode></UiNode>
  <UiNode as="span" translateChildren={false}>{copy.wins}<UiNode as="b" translateChildren={false} data-puzzle-wins>{record.wins}</UiNode></UiNode>
  <UiNode as="span" translateChildren={false}>{copy.best}<UiNode as="b" translateChildren={false}>{record.bestMoves??'—'}</UiNode></UiNode>
 </UiNode>;
}
