import {LOADING_READING_MS,advanceLoadingFact,dismissLoadingReading,loadingCount,loadingSnapshot,registerLoading,toggleLoadingFactsPaused} from '../src/lib/loading-activity';
import assert from 'node:assert/strict';
import {DENTAL_FACTS,dentalFactSource,nextDentalFact,shuffleFacts,dentalFactLanguage} from '../src/lib/dental-facts';
import './verify-dental-facts';
import {createKuspPuzzle,kuspSolved,kuspSolution,turnKusp} from '../src/lib/kusp-game';
assert.equal(DENTAL_FACTS.length,220);for(const language of ['tr','en'] as const){assert.equal(new Set(DENTAL_FACTS.map(f=>f[language])).size,DENTAL_FACTS.length);for(const f of DENTAL_FACTS){assert.ok(f[language].length>=24&&f[language].length<=210);assert.match(f[language],/^[^!?]+\.$/);assert.ok(f[language].split('.').length===2);assert.match(dentalFactSource(f).url,/^https:\/\/((www\.)?(nidcr\.nih\.gov|mouthhealthy\.org|fda\.gov|aae\.org|ada\.org)\/|github\.com\/abachaa\/MedQuAD\/blob\/[a-f0-9]{40}\/)/);}}
assert.equal(new Set(shuffleFacts(()=>0)).size,DENTAL_FACTS.length);assert.equal(dentalFactLanguage('ar'),'en');
for(const locale of ['tr','en']){let prior='';for(let cycle=0;cycle<3;cycle++){const facts=Array.from({length:DENTAL_FACTS.length},()=>nextDentalFact(locale));assert.equal(new Set(facts.map(f=>f.id)).size,DENTAL_FACTS.length);assert.notEqual(facts[0].id,prior);prior=facts.at(-1)!.id;}}
for(let seed=0;seed<768;seed++){const state=createKuspPuzzle(seed,3+seed%10);assert.ok(!kuspSolved(state));for(let i=0;i<4;i++){assert.deepEqual(turnKusp(turnKusp(state,i,1),i,-1),state);const before=[...state];turnKusp(state,i);assert.deepEqual(state,before);}let solved=state;const answer=kuspSolution(state);assert.ok(answer.length>0&&answer.length<=16);for(const move of answer)solved=turnKusp(solved,move.index,move.direction);assert.ok(kuspSolved(solved),'Every generated challenge and hint is solvable');}
console.log(JSON.stringify({pass:true,uniqueFacts:DENTAL_FACTS.length,languages:['tr','en'],factSources:28,noRepeatWithinThreeCycles:true,noBoundaryRepeat:true,solvedPuzzles:768,coupledTurnReversible:true,stateNotMutated:true,hintsAlwaysSolve:true},null,2));

// Fast loads retain their sentence; consecutive and slow stages never add another reading window.
const realNow=Date.now;let now=1_000_000;Date.now=()=>now;
try{
 const first=registerLoading('tr','/cad-library'),start=loadingSnapshot(),fact=start.fact!.id;
 assert.equal(start.readUntil-now,LOADING_READING_MS);assert.equal(LOADING_READING_MS,5_000);assert.equal(start.scope,'/cad-library');
 now+=800;first();assert.equal(loadingCount(),0);assert.equal(loadingSnapshot().fact!.id,fact);
 now+=200;const second=registerLoading('tr','/cad-library');assert.equal(loadingSnapshot().session,start.session);assert.equal(loadingSnapshot().readUntil,start.readUntil);
 // An overlapping model/import stage must share the deadline, too.
 const overlap=registerLoading('tr','/cad-library');assert.equal(loadingCount(),2);assert.equal(loadingSnapshot().readUntil,start.readUntil);overlap();overlap();assert.equal(loadingCount(),1,'Releasing twice cannot finish another stage');
 toggleLoadingFactsPaused();assert.equal(loadingSnapshot().paused,true);advanceLoadingFact('tr');assert.notEqual(loadingSnapshot().fact!.id,fact);
 now=start.readUntil;dismissLoadingReading(start.session);assert.equal(loadingSnapshot().readingDismissed,true);assert.equal(loadingCount(),1,'The five-second deadline never marks pending data as ready');
 now+=5000;second();now+=200;const slowStage=registerLoading('tr');assert.equal(loadingSnapshot().readUntil,start.readUntil,'Long loading chains must not add another five seconds');slowStage();
 now+=600;const next=registerLoading('en'),newSession=loadingSnapshot();assert.ok(newSession.session>start.session);assert.equal(newSession.readUntil,now+5_000);assert.equal(newSession.paused,false);
 dismissLoadingReading(start.session);assert.equal(loadingSnapshot().readingDismissed,false,'An old timer cannot dismiss a new session');
 dismissLoadingReading(newSession.session);assert.equal(loadingSnapshot().readingDismissed,true);assert.equal(loadingCount(),1,'Skipping reading cannot cancel real loading');next();
 now=newSession.readUntil+600;const cancelled=registerLoading('tr','/design'),cancelledState=loadingSnapshot();cancelled({cancelled:true});assert.equal(loadingSnapshot().readingDismissed,true,'Cancelled/unmounted operations cannot leave a reading overlay');
 assert.equal(loadingCount(),0);
 now+=100;const afterNavigation=registerLoading('tr','/patients');assert.equal(loadingSnapshot().session,cancelledState.session);assert.equal(loadingSnapshot().readUntil,cancelledState.readUntil,'A replacement module can resume only the remaining shared budget');assert.equal(loadingSnapshot().readingDismissed,false);assert.equal(loadingSnapshot().scope,'/patients');
 dismissLoadingReading();const afterSkip=registerLoading('tr','/patients');assert.equal(loadingSnapshot().readingDismissed,true,'An explicit skip stays skipped in overlapping stages');afterNavigation();afterSkip();assert.equal(loadingCount(),0);
}finally{Date.now=realNow;}
console.log(JSON.stringify({readingSeconds:5,sameSentenceRetained:true,sharedStageDeadline:true,overlappingStages:true,idempotentRelease:true,noExtraWaitAfterSlowChain:true,staleTimerSafe:true,earlyContinueKeepsActualLoading:true,cancelledOperationLeavesNoOverlay:true}));
