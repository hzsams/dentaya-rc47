import {gameRandom} from './mini-games';

const LIGHT_MASK=0xffff;
export function toggleLight(board:number,index:number){
 if(!Number.isInteger(board)||board<0||board>LIGHT_MASK||!Number.isInteger(index)||index<0||index>=16)return board;
 let mask=1<<index;
 if(index>=4)mask|=1<<(index-4);if(index<12)mask|=1<<(index+4);
 if(index%4>0)mask|=1<<(index-1);if(index%4<3)mask|=1<<(index+1);
 return (board^mask)&LIGHT_MASK;
}
/** A reachable board is created by legal moves from the all-dark goal. */
export function createLightPuzzle(seed:number){
 const random=gameRandom(seed);let board=0;
 for(let i=0;i<12;i++)board=toggleLight(board,Math.floor(random()*16));
 return board||toggleLight(0,Math.floor(random()*16));
}
function parity(value:number){let p=0;while(value){p^=1;value&=value-1;}return p;}
function bitCount(value:number){let n=0;while(value){n++;value&=value-1;}return n;}
/** Exact small GF(2) solve: at most sixteen free-variable combinations on this grid. */
export function lightSolution(board:number):number[]{
 if(!Number.isInteger(board)||board<0||board>LIGHT_MASK||board===0)return [];
 const rows=Array.from({length:16},(_,i)=>toggleLight(0,i)|(((board>>>i)&1)<<16)),pivots:number[]=[];
 let at=0;
 for(let col=0;col<16;col++){
  const pivot=rows.findIndex((row,i)=>i>=at&&Boolean(row&(1<<col)));if(pivot<0)continue;
  [rows[at],rows[pivot]]=[rows[pivot],rows[at]];
  for(let row=0;row<16;row++)if(row!==at&&(rows[row]&(1<<col)))rows[row]^=rows[at];
  pivots.push(col);at++;
 }
 if(rows.some(row=>(row&LIGHT_MASK)===0&&Boolean(row&(1<<16))))return [];
 const free=Array.from({length:16},(_,i)=>i).filter(i=>!pivots.includes(i));let best=0,bestCount=Infinity;
 for(let option=0;option<2**free.length;option++){
  let answer=0;free.forEach((col,i)=>{if(option&(1<<i))answer|=1<<col;});
  pivots.forEach((col,row)=>{if(((rows[row]>>>16)&1)^parity(rows[row]&answer&LIGHT_MASK))answer|=1<<col;});
  const count=bitCount(answer);if(count<bestCount||count===bestCount&&answer<best){best=answer;bestCount=count;}
 }
 return Array.from({length:16},(_,i)=>i).filter(i=>Boolean(best&(1<<i)));
}

export const SLIDE_GOAL=[1,2,3,4,5,0] as const;
export type SlideBoard=readonly number[];
export function validSlideBoard(board:SlideBoard){return board.length===6&&new Set(board).size===6&&board.every(n=>Number.isInteger(n)&&n>=0&&n<=5);}
export function slideSolved(board:SlideBoard){return validSlideBoard(board)&&board.every((n,i)=>n===SLIDE_GOAL[i]);}
export function slideNeighbors(index:number){return Array.from({length:6},(_,i)=>i).filter(i=>Math.abs(Math.floor(i/3)-Math.floor(index/3))+Math.abs(i%3-index%3)===1);}
export function slideTile(board:SlideBoard,index:number):SlideBoard{
 if(!validSlideBoard(board)||!Number.isInteger(index)||index<0||index>=6||!slideNeighbors(board.indexOf(0)).includes(index))return board;
 const next=[...board],blank=next.indexOf(0);[next[index],next[blank]]=[next[blank],next[index]];return next;
}
export function createSlidePuzzle(seed:number){
 const random=gameRandom(seed);let board:SlideBoard=[...SLIDE_GOAL],previous=-1;
 for(let i=0;i<24;i++){
  const blank=board.indexOf(0),choices=slideNeighbors(blank).filter(index=>index!==previous),choice=choices[Math.floor(random()*choices.length)];
  board=slideTile(board,choice);previous=blank;
 }
 return slideSolved(board)?slideTile(board,slideNeighbors(board.indexOf(0))[0]):board;
}
let slideGuide:Map<string,number>|null=null;
/** The complete 2×3 state space has only 360 reachable positions; no unbounded search. */
export function slideSolution(board:SlideBoard):number[]{
 if(!validSlideBoard(board))return [];
 if(!slideGuide){
  const guide=new Map<string,number>([[SLIDE_GOAL.join(''),-1]]),queue:SlideBoard[]=[[...SLIDE_GOAL]];
  for(let i=0;i<queue.length;i++){
   const current=queue[i],blank=current.indexOf(0);
   for(const neighbor of slideNeighbors(blank)){const next=slideTile(current,neighbor),key=next.join('');if(!guide.has(key)){guide.set(key,blank);queue.push(next);}}
  }
  slideGuide=guide;
 }
 let current=board;const solution:number[]=[];
 for(let i=0;i<24&&!slideSolved(current);i++){
  const move=slideGuide.get(current.join(''));if(move===undefined||move<0)return [];
  solution.push(move);current=slideTile(current,move);
 }
 return slideSolved(current)?solution:[];
}

export function puzzleFocusNeighbor(index:number,key:string,columns:number,count:number){
 if(key==='Home')return 0;if(key==='End')return count-1;
 if(key==='ArrowUp')return index-columns>=0?index-columns:index;
 if(key==='ArrowDown')return index+columns<count?index+columns:index;
 if(key==='ArrowLeft')return index%columns>0?index-1:index;
 if(key==='ArrowRight')return index%columns<columns-1&&index+1<count?index+1:index;
 return null;
}
