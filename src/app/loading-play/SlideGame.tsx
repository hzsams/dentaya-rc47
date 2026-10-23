'use client';
import UiNode from '@/lib/i18n/UiNode';
import {useEffect,useReducer,useRef} from 'react';
import {useTranslation} from '@/lib/i18n';
import {dentalFactLanguage} from '@/lib/dental-language';
import {MINI_GAME_TEXT} from '@/lib/i18n/mini-games';
import {createSlidePuzzle,puzzleFocusNeighbor,SLIDE_GOAL,slideNeighbors,slideSolved,slideSolution,slideTile,type SlideBoard} from '@/lib/mini-puzzles';
import PuzzleMetrics,{usePuzzleRecord} from './PuzzleMetrics';

type State={board:SlideBoard;moves:number;history:SlideBoard[];hint:number|null};
type Action={type:'change';index:number}|{type:'reset';board:SlideBoard}|{type:'undo'}|{type:'hint'};
const initial=(board:SlideBoard):State=>({board,moves:0,history:[],hint:null});
function reducer(state:State,action:Action):State{
 if(action.type==='reset')return initial(action.board);
 if(slideSolved(state.board))return state;
 if(action.type==='hint')return {...state,hint:slideSolution(state.board)[0]??null};
 if(action.type==='undo')return state.history.length?{board:state.history.at(-1)!,moves:state.moves-1,history:state.history.slice(0,-1),hint:null}:state;
 const board=slideTile(state.board,action.index);return board===state.board?state:{board,moves:state.moves+1,history:[...state.history.slice(-255),state.board],hint:null};
}
export default function SlideGame(){
 const {locale}=useTranslation(),language=dentalFactLanguage(locale),copy=MINI_GAME_TEXT[language];
 const [state,dispatch]=useReducer(reducer,createSlidePuzzle(5602),initial),buttons=useRef<(HTMLButtonElement|null)[]>([]);
 const solved=slideSolved(state.board),{record,failed}=usePuzzleRecord('slide',solved,state.moves),movable=slideNeighbors(state.board.indexOf(0)),arranged=state.board.filter((value,i)=>value!==0&&value===SLIDE_GOAL[i]).length;
 useEffect(()=>{dispatch({type:'reset',board:createSlidePuzzle(crypto.getRandomValues(new Uint32Array(1))[0])});},[]);
 return <UiNode as="section" translateChildren={false} className="mini-board-game mini-puzzle-game enamel-slide-game" lang={language} dir="ltr" data-slide-board={state.board.join(',')} data-slide-solved={solved} onKeyDown={e=>{if(e.key!=='Escape')e.stopPropagation();}}>
  <UiNode as="p" translateChildren={false} className="kusp-intro">{copy.slideIntro}</UiNode><UiNode as="p" translateChildren={false} className="kusp-instructions">{copy.slideHelp}</UiNode>
  <PuzzleMetrics copy={copy} moves={state.moves} progress={`${arranged} / 5`} progressTitle={copy.arranged} record={record}/>
  <UiNode as="p" translateChildren={false} className="enamel-slide-goal">{copy.target}</UiNode>
  <UiNode as="div" translateChildren={false} className="enamel-slide-grid" role="group" aria-label={copy.slide}>{state.board.map((value,i)=><UiNode as="button" translateChildren={false} type="button" key={i} ref={node=>{buttons.current[i]=node;}} className={'enamel-slide-tile'+(!value?' is-gap':'')+(movable.includes(i)&&!solved?' can-slide':'')+(state.hint===i?' is-hint':'')+(value&&value===SLIDE_GOAL[i]?' in-place':'')} data-slide-cell={i} data-slide-value={value} aria-label={value?`${copy.slideTile} ${value}`:copy.blank} aria-disabled={solved||!value||!movable.includes(i)} onClick={()=>dispatch({type:'change',index:i})} onKeyDown={e=>{const next=puzzleFocusNeighbor(i,e.key,3,6);if(next!==null){e.preventDefault();buttons.current[next]?.focus();}}}>
   {value?<><svg viewBox="0 0 100 100" aria-hidden="true"><path d="M22 17Q35 8 50 18Q65 8 78 17L76 50Q73 66 67 82Q59 91 50 74Q41 91 33 82Q27 66 24 50Z"/><path d="M33 27Q50 35 67 27M50 35V49"/><UiNode as="text" translateChildren={false} x="50" y="61" textAnchor="middle">{value}</UiNode></svg><UiNode as="small" translateChildren={false}>{String(value).padStart(2,'0')}</UiNode></>:<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M30 50h40m-20-20v40"/></svg>}
  </UiNode>)}</UiNode>
  <UiNode as="p" translateChildren={false} className="kusp-feedback" role="status">{solved?copy.slideSolved:state.hint!==null?`${copy.puzzleHint} ${state.board[state.hint]}`:'\u00a0'}</UiNode>
  <UiNode as="div" translateChildren={false} className="kusp-actions"><UiNode as="button" translateChildren={false} type="button" disabled={solved||!state.history.length} onClick={()=>dispatch({type:'undo'})}>{copy.undo}</UiNode><UiNode as="button" translateChildren={false} type="button" disabled={solved} onClick={()=>dispatch({type:'hint'})}>{copy.hint}</UiNode><UiNode as="button" translateChildren={false} type="button" onClick={()=>dispatch({type:'reset',board:createSlidePuzzle(crypto.getRandomValues(new Uint32Array(1))[0])})}>{solved?copy.again:copy.restart}</UiNode></UiNode>
  <UiNode as="p" translateChildren={false} className="kusp-keyboard">{copy.puzzleKeyboard}</UiNode>{failed&&<UiNode as="p" translateChildren={false} role="status">{copy.noRecord}</UiNode>}
 </UiNode>;
}
