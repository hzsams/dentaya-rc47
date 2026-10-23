'use client';
import UiNode from '@/lib/i18n/UiNode';
import {useEffect,useReducer,useRef} from 'react';
import {useTranslation} from '@/lib/i18n';
import {dentalFactLanguage} from '@/lib/dental-language';
import {MINI_GAME_TEXT} from '@/lib/i18n/mini-games';
import {createLightPuzzle,lightSolution,puzzleFocusNeighbor,toggleLight} from '@/lib/mini-puzzles';
import PuzzleMetrics,{usePuzzleRecord} from './PuzzleMetrics';

type State={board:number;moves:number;history:number[];hint:number|null};
type Action={type:'change';index:number}|{type:'reset';board:number}|{type:'undo'}|{type:'hint'};
const initial=(board:number):State=>({board,moves:0,history:[],hint:null});
function reducer(state:State,action:Action):State{
 if(action.type==='reset')return initial(action.board);
 if(state.board===0)return state;
 if(action.type==='hint')return {...state,hint:lightSolution(state.board)[0]??null};
 if(action.type==='undo')return state.history.length?{board:state.history.at(-1)!,moves:state.moves-1,history:state.history.slice(0,-1),hint:null}:state;
 const board=toggleLight(state.board,action.index);return board===state.board?state:{board,moves:state.moves+1,history:[...state.history.slice(-255),state.board],hint:null};
}
export default function LightsGame(){
 const {locale}=useTranslation(),language=dentalFactLanguage(locale),copy=MINI_GAME_TEXT[language];
 const [state,dispatch]=useReducer(reducer,createLightPuzzle(5601),initial),buttons=useRef<(HTMLButtonElement|null)[]>([]);
 const solved=state.board===0,{record,failed}=usePuzzleRecord('lights',solved,state.moves),lit=state.board.toString(2).replaceAll('0','').length;
 useEffect(()=>{dispatch({type:'reset',board:createLightPuzzle(crypto.getRandomValues(new Uint32Array(1))[0])});},[]);
 return <UiNode as="section" translateChildren={false} className="mini-board-game mini-puzzle-game light-matrix-game" lang={language} dir="ltr" data-light-board={state.board} data-light-solved={solved} onKeyDown={e=>{if(e.key!=='Escape')e.stopPropagation();}}>
  <UiNode as="p" translateChildren={false} className="kusp-intro">{copy.lightsIntro}</UiNode><UiNode as="p" translateChildren={false} className="kusp-instructions">{copy.lightsHelp}</UiNode>
  <PuzzleMetrics copy={copy} moves={state.moves} progress={`${lit} / 16`} progressTitle={copy.lit} record={record}/>
  <UiNode as="div" translateChildren={false} className="light-matrix-grid" role="group" aria-label={copy.lights}>{Array.from({length:16},(_,i)=>{
   const on=Boolean(state.board&(1<<i));return <UiNode as="button" translateChildren={false} type="button" key={i} ref={node=>{buttons.current[i]=node;}} className={'light-matrix-lamp'+(on?' is-lit':'')+(state.hint===i?' is-hint':'')} data-light-cell={i} aria-label={`${copy.lamp} ${i+1}: ${on?copy.lightOn:copy.lightOff}`} aria-pressed={on} disabled={solved} onClick={()=>dispatch({type:'change',index:i})} onKeyDown={e=>{const next=puzzleFocusNeighbor(i,e.key,4,16);if(next!==null){e.preventDefault();buttons.current[next]?.focus();}}}>
    <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="18"/><path d="M32 8v7m0 34v7M8 32h7m34 0h7M15 15l5 5m24 24 5 5M15 49l5-5m24-24 5-5"/><circle cx="32" cy="32" r="10"/></svg><UiNode as="small" translateChildren={false}>{String(i+1).padStart(2,'0')}</UiNode>
   </UiNode>;
  })}</UiNode>
  <UiNode as="p" translateChildren={false} className="kusp-feedback" role="status">{solved?copy.lightsSolved:state.hint!==null?`${copy.puzzleHint} ${state.hint+1}`:'\u00a0'}</UiNode>
  <UiNode as="div" translateChildren={false} className="kusp-actions"><UiNode as="button" translateChildren={false} type="button" disabled={solved||!state.history.length} onClick={()=>dispatch({type:'undo'})}>{copy.undo}</UiNode><UiNode as="button" translateChildren={false} type="button" disabled={solved} onClick={()=>dispatch({type:'hint'})}>{copy.hint}</UiNode><UiNode as="button" translateChildren={false} type="button" onClick={()=>dispatch({type:'reset',board:createLightPuzzle(crypto.getRandomValues(new Uint32Array(1))[0])})}>{solved?copy.again:copy.restart}</UiNode></UiNode>
  <UiNode as="p" translateChildren={false} className="kusp-keyboard">{copy.puzzleKeyboard}</UiNode>{failed&&<UiNode as="p" translateChildren={false} role="status">{copy.noRecord}</UiNode>}
 </UiNode>;
}
