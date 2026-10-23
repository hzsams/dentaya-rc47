export const MINI_GAMES=['kusp','memory','route','lights','slide'] as const;
export type MiniGameId=typeof MINI_GAMES[number];
export type RecordedMiniGame=Exclude<MiniGameId,'kusp'>;
export function gameRandom(seed:number){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function memoryDeck(seed:number){const random=gameRandom(seed),deck=Array.from({length:12},(_,i)=>i%6);for(let i=11;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}return deck;}
export type GrooveBoard={base:number[];turns:number[];path:number[]};
const paths=[[3,0,1,4,7,8,5],[3,6,7,4,1,2,5],[3,0,1,2,5],[3,6,7,8,5]];
export function rotateGroove(mask:number,turns:number){const n=((turns%4)+4)%4;return ((mask<<n)|(mask>>(4-n)))&15;}
function direction(a:number,b:number){return b===a-3?0:b===a+1?1:b===a+3?2:3;}
export function grooveReachable(board:GrooveBoard){
 const masks=board.base.map((m,i)=>rotateGroove(m,board.turns[i])),visited=new Set<number>();
 if(!(masks[3]&8))return {connected:false,cells:visited};
 const queue=[3];visited.add(3);
 for(let i=0;i<queue.length;i++){
  const at=queue[i];
  for(let d=0;d<4;d++){
   const next=at+[-3,1,3,-1][d];if(next<0||next>=9||d===1&&at%3===2||d===3&&at%3===0)continue;
   if((masks[at]&(1<<d))&&(masks[next]&(1<<((d+2)%4)))&&!visited.has(next)){visited.add(next);queue.push(next);}
  }
 }
 return {connected:visited.has(5)&&Boolean(masks[5]&2),cells:visited};
}
export function grooveBoard(seed:number):GrooveBoard{
 const random=gameRandom(seed),path=[...paths[Math.floor(random()*paths.length)]],base:number[]=Array.from({length:9},()=>random()<.5?3:5),turns=Array.from({length:9},()=>Math.floor(random()*4));
 path.forEach((cell,i)=>{const enter=i===0?3:direction(cell,path[i-1]),leave=i===path.length-1?1:direction(cell,path[i+1]);base[cell]=(1<<enter)|(1<<leave);});
 const board={base,turns,path};for(let i=0;i<4&&grooveReachable(board).connected;i++)turns[3]=(turns[3]+1)%4;
 return board;
}
export function turnGroove(board:GrooveBoard,index:number,direction=1):GrooveBoard{if(!Number.isInteger(index)||index<0||index>=9)return board;const turns=[...board.turns];turns[index]=((turns[index]+direction)%4+4)%4;return {...board,turns};}
export function grooveHint(board:GrooveBoard){return board.path.find(i=>rotateGroove(board.base[i],board.turns[i])!==board.base[i])??null;}
export type MiniRecord={wins:number;bestMoves:number|null};
export const EMPTY_MINI_RECORD:MiniRecord={wins:0,bestMoves:null};
export function readMiniRecord(game:RecordedMiniGame):MiniRecord{try{const v=JSON.parse(localStorage.getItem('dentaya:mini-record:'+game+':v1')||'{}');return {wins:Number.isInteger(v.wins)&&v.wins>=0?Math.min(v.wins,1_000_000):0,bestMoves:Number.isInteger(v.bestMoves)&&v.bestMoves>0&&v.bestMoves<=1_000_000?v.bestMoves:null};}catch{return EMPTY_MINI_RECORD;}}
export function saveMiniWin(game:RecordedMiniGame,moves:number){const prior=readMiniRecord(game);if(!Number.isInteger(moves)||moves<1||moves>1_000_000)return {record:prior,saved:false};const record={wins:Math.min(1_000_000,prior.wins+1),bestMoves:prior.bestMoves===null?moves:Math.min(prior.bestMoves,moves)};try{localStorage.setItem('dentaya:mini-record:'+game+':v1',JSON.stringify(record));return {record,saved:true};}catch{return {record,saved:false};}}
