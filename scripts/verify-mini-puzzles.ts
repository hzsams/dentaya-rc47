import assert from 'node:assert/strict';
import {MINI_GAMES,readMiniRecord,saveMiniWin} from '../src/lib/mini-games';
import {createLightPuzzle,createSlidePuzzle,lightSolution,puzzleFocusNeighbor,SLIDE_GOAL,slideNeighbors,slideSolved,slideSolution,slideTile,toggleLight,validSlideBoard,type SlideBoard} from '../src/lib/mini-puzzles';

assert.deepEqual(MINI_GAMES,['kusp','memory','route','lights','slide']);
assert.equal(toggleLight(0,0),(1<<0)|(1<<1)|(1<<4));
assert.equal(toggleLight(0,3),(1<<2)|(1<<3)|(1<<7),'A lamp at the edge does not toggle across the row boundary');
assert.equal(toggleLight(0,5),(1<<1)|(1<<4)|(1<<5)|(1<<6)|(1<<9));
const lightDistances=new Int8Array(65536).fill(-1),lights=[0];lightDistances[0]=0;
for(let i=0;i<lights.length;i++)for(let cell=0;cell<16;cell++){const next=toggleLight(lights[i],cell);if(lightDistances[next]<0){lightDistances[next]=lightDistances[lights[i]]+1;lights.push(next);}}
assert.equal(lights.length,4096,'The cross-toggle grid has exactly 4096 reachable states');
for(const board of lights){
 const before=board,solution=lightSolution(board);assert.equal(solution.length,lightDistances[board],'The algebraic hint matches independently breadth-first optimal distance');
 let current=board;for(const move of solution)current=toggleLight(current,move);assert.equal(current,0);assert.equal(board,before);
 for(let cell=0;cell<16;cell++)assert.equal(toggleLight(toggleLight(board,cell),cell),board,'Each lamp move is its own undo');
}
assert.equal(lightDistances[1],-1);assert.deepEqual(lightSolution(1),[],'Unreachable external boards never invent a solution');
for(const value of [-1,65536,NaN,Infinity,1.5]){assert.deepEqual(lightSolution(value),[]);assert.ok(Object.is(toggleLight(value,0),value));}
for(const index of [-1,16,NaN,1.5])assert.equal(toggleLight(0,index),0);

const slideDistances=new Map<string,number>([[SLIDE_GOAL.join(''),0]]),slides:SlideBoard[]=[[...SLIDE_GOAL]];
for(let i=0;i<slides.length;i++){
 const board=slides[i],blank=board.indexOf(0);
 for(const cell of slideNeighbors(blank)){const next=slideTile(board,cell),key=next.join('');if(!slideDistances.has(key)){slideDistances.set(key,slideDistances.get(board.join(''))!+1);slides.push(next);}}
}
assert.equal(slides.length,360);assert.equal(Math.max(...slideDistances.values()),21);
for(const board of slides){
 assert.ok(validSlideBoard(board));const before=[...board],solution=slideSolution(board);assert.equal(solution.length,slideDistances.get(board.join('')));
 let current=board;for(const cell of solution){const next=slideTile(current,cell);assert.notEqual(next,current,'Every hint is a legal move next to the gap');current=next;}assert.ok(slideSolved(current));assert.deepEqual(board,before,'Solution lookup never changes a board');
 const blank=board.indexOf(0);for(let cell=0;cell<6;cell++){const next=slideTile(board,cell);if(slideNeighbors(blank).includes(cell)){assert.deepEqual(slideTile(next,blank),board);assert.ok(validSlideBoard(next));}else assert.equal(next,board);}
}
assert.deepEqual(slideSolution([2,1,3,4,5,0]),[],'A parity-impossible external board cannot be solved');
for(const board of [[],[0,0,1,2,3,4],[1,2,3,4,5,6],[1,2,3,4,5,NaN]]){assert.equal(validSlideBoard(board),false);assert.equal(slideTile(board,0),board);assert.deepEqual(slideSolution(board),[]);}
const lightVariants=new Set<number>(),slideVariants=new Set<string>();
for(let seed=0;seed<1024;seed++){
 const light=createLightPuzzle(seed),slide=createSlidePuzzle(seed);assert.notEqual(light,0);assert.ok(lightDistances[light]>=0);assert.equal(light,createLightPuzzle(seed));lightVariants.add(light);
 assert.ok(!slideSolved(slide));assert.ok(slideSolution(slide).length>0);assert.deepEqual(slide,createSlidePuzzle(seed));slideVariants.add(slide.join(''));
}
assert.ok(lightVariants.size>128);assert.ok(slideVariants.size>100);
assert.equal(puzzleFocusNeighbor(0,'ArrowLeft',4,16),0);assert.equal(puzzleFocusNeighbor(3,'ArrowRight',4,16),3);assert.equal(puzzleFocusNeighbor(0,'ArrowDown',4,16),4);assert.equal(puzzleFocusNeighbor(5,'Home',3,6),0);assert.equal(puzzleFocusNeighbor(0,'End',3,6),5);assert.equal(puzzleFocusNeighbor(0,'Escape',3,6),null);

const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),storage=new Map<string,string>([['dentaya:mini-record:memory:v1','{"wins":7,"bestMoves":9}'],['dentaya:mini-record:route:v1','{"wins":8,"bestMoves":10}']]);
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)}});
try{
 for(const game of ['lights','slide'] as const){
  assert.deepEqual(readMiniRecord(game),{wins:0,bestMoves:null});assert.equal(saveMiniWin(game,12).saved,true);assert.deepEqual(saveMiniWin(game,8).record,{wins:2,bestMoves:8});
  const prior=storage.get('dentaya:mini-record:'+game+':v1');for(const moves of [0,-1,NaN,1.5,1_000_001])assert.equal(saveMiniWin(game,moves).saved,false);assert.equal(storage.get('dentaya:mini-record:'+game+':v1'),prior,'Invalid wins never modify a stored score');
 }
 assert.deepEqual(readMiniRecord('memory'),{wins:7,bestMoves:9});assert.deepEqual(readMiniRecord('route'),{wins:8,bestMoves:10});
 Object.defineProperty(globalThis,'localStorage',{configurable:true,get:()=>{throw Error('blocked');}});assert.equal(saveMiniWin('lights',4).saved,false);assert.equal(saveMiniWin('slide',4).saved,false);
}finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete (globalThis as {localStorage?:unknown}).localStorage;}
console.log(JSON.stringify({pass:true,miniGames:MINI_GAMES.length,lightsReachableStates:lights.length,slideReachableStates:slides.length,lightHintsOptimalAgainstIndependentBfs:true,slideHintsOptimalAgainstIndependentBfs:true,generatedSeeds:1024,deterministicSolvableChallenges:true,reversibleLegalMoves:true,stateNotMutated:true,oldRecordsPreserved:true,newRecordsIndependent:true,blockedStorageHandled:true,boundedHintSearch:true},null,2));
