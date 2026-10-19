import {LOADING_READING_MS,advanceLoadingFact,dismissLoadingReading,loadingCount,loadingSnapshot,registerLoading,toggleLoadingFactsPaused} from '../src/lib/loading-activity';
import assert from 'node:assert/strict';
import {DENTAL_FACTS,dentalFactSource,nextDentalFact,shuffleFacts,dentalFactLanguage} from '../src/lib/dental-facts';
import {createKuspPuzzle,kuspSolved,kuspSolution,turnKusp} from '../src/lib/kusp-game';
assert.equal(DENTAL_FACTS.length,200);for(const language of ['tr','en'] as const){assert.equal(new Set(DENTAL_FACTS.map(f=>f[language])).size,200);for(const f of DENTAL_FACTS){assert.ok(f[language].length>=24&&f[language].length<=210);assert.match(f[language],/^[^!?]+\.$/);assert.ok(f[language].split('.').length===2);assert.match(dentalFactSource(f).url,/^https:\/\/(www\.)?(nidcr\.nih\.gov|mouthhealthy\.org|fda\.gov|aae\.org|ada\.org)\//);}}
assert.equal(new Set(shuffleFacts(()=>0)).size,200);assert.equal(dentalFactLanguage('ar'),'en');
for(const locale of ['tr','en']){let prior='';for(let cycle=0;cycle<3;cycle++){const facts=Array.from({length:200},()=>nextDentalFact(locale));assert.equal(new Set(facts.map(f=>f.id)).size,200);assert.notEqual(facts[0].id,prior);prior=facts.at(-1)!.id;}}
for(let seed=0;seed<768;seed++){const state=createKuspPuzzle(seed,3+seed%10);assert.ok(!kuspSolved(state));for(let i=0;i<4;i++){assert.deepEqual(turnKusp(turnKusp(state,i,1),i,-1),state);const before=[...state];turnKusp(state,i);assert.deepEqual(state,before);}let solved=state;const answer=kuspSolution(state);assert.ok(answer.length>0&&answer.length<=16);for(const move of answer)solved=turnKusp(solved,move.index,move.direction);assert.ok(kuspSolved(solved),'Every generated challenge and hint is solvable');}
console.log(JSON.stringify({pass:true,uniqueFacts:200,languages:['tr','en'],factSources:25,noRepeatWithinThreeCycles:true,noBoundaryRepeat:true,solvedPuzzles:768,coupledTurnReversible:true,stateNotMutated:true,hintsAlwaysSolve:true},null,2));

// Fast loads retain their sentence; consecutive and slow stages never add another reading window.
const realNow=Date.now;let now=1_000_000;Date.now=()=>now;
try{
 const first=registerLoading('tr'),start=loadingSnapshot(),fact=start.fact!.id;
 assert.equal(start.readUntil-now,LOADING_READING_MS);assert.equal(LOADING_READING_MS,10_000);
 now+=800;first();assert.equal(loadingCount(),0);assert.equal(loadingSnapshot().fact!.id,fact);
 now+=200;const second=registerLoading('tr');assert.equal(loadingSnapshot().session,start.session);assert.equal(loadingSnapshot().readUntil,start.readUntil);
 toggleLoadingFactsPaused();assert.equal(loadingSnapshot().paused,true);advanceLoadingFact('tr');assert.notEqual(loadingSnapshot().fact!.id,fact);
 now=start.readUntil+5000;second();now+=200;const slowStage=registerLoading('tr');assert.equal(loadingSnapshot().readUntil,start.readUntil,'Long loading chains must not add another ten seconds');slowStage();
 now+=600;const next=registerLoading('en'),newSession=loadingSnapshot();assert.ok(newSession.session>start.session);assert.equal(newSession.readUntil,now+10_000);assert.equal(newSession.paused,false);
 dismissLoadingReading(start.session);assert.equal(loadingSnapshot().readingDismissed,false,'An old timer cannot dismiss a new session');
 dismissLoadingReading(newSession.session);assert.equal(loadingSnapshot().readingDismissed,true);assert.equal(loadingCount(),1,'Skipping reading cannot cancel real loading');next();
}finally{Date.now=realNow;}
console.log(JSON.stringify({readingSeconds:10,sameSentenceRetained:true,sharedStageDeadline:true,noExtraWaitAfterSlowChain:true,staleTimerSafe:true,earlyContinueKeepsActualLoading:true}));
