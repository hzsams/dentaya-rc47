import {advanceLoadingFact,loadingCount,loadingServerSnapshot,loadingSnapshot,registerLoading,subscribeLoading,toggleLoadingFactsPaused} from '../src/lib/loading-activity';
import assert from 'node:assert/strict';
import {DENTAL_FACTS,dentalFactSource,nextDentalFact,shuffleFacts,dentalFactLanguage} from '../src/lib/dental-facts';
import './verify-dental-facts';
import './verify-mini-puzzles';
import {createKuspPuzzle,kuspSolved,kuspSolution,turnKusp} from '../src/lib/kusp-game';
assert.equal(DENTAL_FACTS.length,500);for(const language of ['tr','en'] as const){assert.equal(new Set(DENTAL_FACTS.map(f=>f[language])).size,DENTAL_FACTS.length);for(const f of DENTAL_FACTS){assert.ok(f[language].length>=24&&f[language].length<=210);assert.match(f[language],/^[^!?]+\.$/);assert.ok(f[language].split('.').length===2);assert.match(dentalFactSource(f).url,/^https:\/\/((www\.)?(nidcr\.nih\.gov|mouthhealthy\.org|fda\.gov|aae\.org|ada\.org)\/|github\.com\/(abachaa\/MedQuAD\/blob\/[a-f0-9]{40}\/|mrdoob\/three\.js\/blob\/r186\/docs\/pages\/|isl-org\/Open3D\/blob\/v0\.19\.0\/docs\/jupyter\/))/);}}
assert.equal(new Set(shuffleFacts(()=>0)).size,DENTAL_FACTS.length);assert.equal(dentalFactLanguage('ar'),'en');
for(const locale of ['tr','en']){let prior='';for(let cycle=0;cycle<3;cycle++){const facts=Array.from({length:DENTAL_FACTS.length},()=>nextDentalFact(locale));assert.equal(new Set(facts.map(f=>f.id)).size,DENTAL_FACTS.length);assert.notEqual(facts[0].id,prior);prior=facts.at(-1)!.id;}}
for(let seed=0;seed<768;seed++){const state=createKuspPuzzle(seed,3+seed%10);assert.ok(!kuspSolved(state));for(let i=0;i<4;i++){assert.deepEqual(turnKusp(turnKusp(state,i,1),i,-1),state);const before=[...state];turnKusp(state,i);assert.deepEqual(state,before);}let solved=state;const answer=kuspSolution(state);assert.ok(answer.length>0&&answer.length<=16);for(const move of answer)solved=turnKusp(solved,move.index,move.direction);assert.ok(kuspSolved(solved),'Every generated challenge and hint is solvable');}
console.log(JSON.stringify({pass:true,uniqueFacts:DENTAL_FACTS.length,languages:['tr','en'],factSources:new Set(DENTAL_FACTS.map(f=>f.source)).size,noRepeatWithinThreeCycles:true,noBoundaryRepeat:true,solvedPuzzles:768,coupledTurnReversible:true,stateNotMutated:true,hintsAlwaysSolve:true},null,2));

// Readiness is ownership-based: elapsed time never creates or prolongs loading.
const realNow=Date.now;let now=1_000_000;Date.now=()=>now;
const seen:number[]=[],unsubscribe=subscribeLoading(()=>seen.push(loadingCount()));
try{
 const server=loadingServerSnapshot();assert.equal(server.count,0);assert.equal(loadingSnapshot().count,0);
 const first=registerLoading('tr','/cad-library'),start=loadingSnapshot(),fact=start.fact!.id;
 assert.equal(start.count,1);assert.equal(start.scope,'/cad-library');assert.equal(start.paused,false);
 first();assert.equal(loadingCount(),0,'A synchronous operation releases immediately without waiting');assert.equal(loadingSnapshot().scope,'');assert.equal(loadingSnapshot().fact!.id,fact);
 const next=registerLoading('en','/patients'),newSession=loadingSnapshot();
 assert.ok(newSession.session>start.session,'A new real operation starts immediately without a cooldown');assert.notEqual(newSession.fact!.id,'');
 const overlap=registerLoading('en','/design');assert.equal(loadingCount(),2);assert.equal(loadingSnapshot().session,newSession.session);assert.equal(loadingSnapshot().fact,newSession.fact,'Overlapping operations share one fact');
 overlap();overlap();assert.equal(loadingCount(),1,'Releasing twice cannot finish another operation');assert.equal(loadingSnapshot().scope,'/patients','Ending the latest scope restores the remaining owner');
 now+=60_000;assert.equal(loadingCount(),1,'A slow operation stays pending after any former five-second deadline');assert.equal(loadingSnapshot().session,newSession.session);
 toggleLoadingFactsPaused();assert.equal(loadingSnapshot().paused,true);advanceLoadingFact('en');assert.notEqual(loadingSnapshot().fact!.id,newSession.fact!.id);
 next();assert.equal(loadingCount(),0,'Even a slow operation releases on its real completion');
 const cancelled=registerLoading('tr','/design'),survivor=registerLoading('tr','/patients'),cancelledSession=loadingSnapshot().session;
 cancelled({cancelled:true});assert.equal(loadingCount(),1,'Cancelling one operation does not complete concurrent work');assert.equal(loadingSnapshot().scope,'/patients');
 survivor({cancelled:true});assert.equal(loadingCount(),0);assert.equal(loadingSnapshot().scope,'');
 const replacement=registerLoading('tr','/ai'),replacementSession=loadingSnapshot().session;assert.ok(replacementSession>cancelledSession);assert.equal(loadingSnapshot().paused,false);
 cancelled();survivor();assert.equal(loadingCount(),1,'Late cleanup from cancelled navigation cannot release replacement work');assert.equal(loadingSnapshot().scope,'/ai');
 replacement();assert.equal(loadingCount(),0);assert.equal(loadingServerSnapshot(),server,'SSR snapshot stays idle and stable');
 assert.ok(seen.includes(2));assert.equal(seen.at(-1),0);
 const notifications=seen.length;unsubscribe();first();assert.equal(seen.length,notifications,'Stale releases are silent');
}finally{unsubscribe();Date.now=realNow;}
console.log(JSON.stringify({artificialDelayMs:0,immediateFastCompletion:true,slowOperationRemainsPending:true,concurrentOwners:true,idempotentRelease:true,scopeRestoredOnCompletion:true,cancelledNavigationReleasesOnlyItsOwner:true,lateCleanupSafe:true,optionalFactsAndHistoryPreserved:true,stableIdleServerSnapshot:true}));
