export type KuspState=readonly [number,number,number,number];
export type KuspMove={index:number;direction:1|-1};
const mod=(n:number)=>(n%8+8)%8;
export function turnKusp(state:KuspState,index:number,direction:1|-1=1):KuspState{if(!Number.isInteger(index)||index<0||index>3)return state;const next=[...state];next[index]=mod(next[index]+2*direction);next[(index+1)%4]=mod(next[(index+1)%4]+direction);return next as unknown as KuspState;}
export const kuspSolved=(state:KuspState)=>state.every(n=>n===0);
export function kuspSolution(state:KuspState):KuspMove[]{
 let best:KuspMove[]|null=null;
 for(let a=0;a<8;a++)for(let b=0;b<8;b++)for(let c=0;c<8;c++)for(let d=0;d<8;d++){
  const values=[a,b,c,d];if(!values.every((n,i)=>mod(state[i]+2*n+values[(i+3)%4])===0))continue;
  const moves=values.flatMap((n,index)=>Array.from({length:Math.min(n,8-n)},()=>({index,direction:n<=4?1 as const:-1 as const})));if(!best||moves.length<best.length)best=moves;
 }return best??[];
}
export function createKuspPuzzle(seed:number,depth=5):KuspState{
 let value=seed>>>0;const random=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};let state:KuspState=[0,0,0,0];
 for(let i=0;i<Math.max(3,Math.min(12,depth));i++)state=turnKusp(state,Math.floor(random()*4),random()>.5?1:-1);
 return kuspSolved(state)?turnKusp(state,0):state;
}
export type KuspRecord={wins:number;bestMoves:number|null};
export const EMPTY_KUSP_RECORD:KuspRecord={wins:0,bestMoves:null};
export function readKuspRecord():KuspRecord{try{const v=JSON.parse(localStorage.getItem('dentaya:kusp-record:v1')||'{}');return {wins:Number.isSafeInteger(v.wins)&&v.wins>=0?Math.min(v.wins,1000000):0,bestMoves:Number.isSafeInteger(v.bestMoves)&&v.bestMoves>0&&v.bestMoves<100000?v.bestMoves:null};}catch{return EMPTY_KUSP_RECORD;}}
export function saveKuspWin(moves:number){const previous=readKuspRecord(),next={wins:previous.wins+1,bestMoves:previous.bestMoves===null?moves:Math.min(moves,previous.bestMoves)};try{localStorage.setItem('dentaya:kusp-record:v1',JSON.stringify(next));return {record:next,saved:true};}catch{return {record:next,saved:false};}}
