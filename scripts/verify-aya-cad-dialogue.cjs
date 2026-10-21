'use strict';
// Real deterministic kernel output + host metadata; no model or CAD callback is mocked as execution.
const assert=require('node:assert/strict');
const {register}=require('tsx/cjs/api');
const unregister=register();
const THREE=require('three');
const {suggestCadReply}=require('../electron/aya/cad-dialogue.cjs');
const {TOOL_IDS}=require('../electron/aya/agent.cjs');
const {analyzeCadMesh}=require('../src/lib/cad-mesh-qc.ts');
const {analyzeMeshContact}=require('../src/lib/cad-contact-engine.ts');
const {buildMeshSpatialIndex}=require('../src/lib/cad-spatial-engine.ts');
const {buildCrownShell}=require('../src/lib/cad-crown-shell-engine.ts');
const {marginQualityReport}=require('../src/lib/cad-margin-engine.ts');
const {availableAyaTools,ayaProposalBlock,executeAyaProposal,summarizeAyaReport}=require('../src/lib/aya-cad-agent.ts');
const failures=[],passed=[];
async function check(name,fn){try{await fn();passed.push(name);}catch(error){failures.push({name,message:error.message});}}
const policy={tools:['margin','measure','add','reduce','smooth'],views:['natural','contact','thickness','undercut','section'],internalFit:true,canNext:true};
const margin=Array.from({length:16},(_,i)=>({x:Math.cos(i*Math.PI/8)*4,y:Math.sin(i*Math.PI/8)*3,z:0}));
const base={scope:'cad-project:master-scan:unit-46',snapshot:'snapshot:freeform:1',dataToken:'geometry:1',unit:'46',restoration:'Anatomik kron',stage:'design',task:'freeform',setupComplete:true,sourceReady:true,modelReady:true,marginPoints:margin.length,placed:true,visible:true,unsaved:true,saveFailed:false,isSaving:false,upperReady:true,lowerReady:true,antagonistReady:false,openingMm:0,tool:'select',view:'natural',undoCount:2,redoCount:1,measurementsMm:[],recentActions:[]};
function context(patch={}){const c={...base,...patch};if(!Object.hasOwn(patch,'availableTools'))c.availableTools=availableAyaTools(c,policy);return c;}
function ask(prompt,patch={},options={}){const result=suggestCadReply(prompt,{cadContext:context(patch),locale:'tr',...options});assert.ok(result,'Expected contextual CAD advice: '+prompt);return result;}
const ids=reply=>reply.proposals.map(p=>p.tool);
const review='Güncel çalışma durumunu değerlendir ve sıradaki adımı öner.';
async function main(){
 const solid=new THREE.BoxGeometry(20,10,8,3,2,2),open=new THREE.PlaneGeometry(10,8,2,2),sphere=new THREE.SphereGeometry(6,24,16),opposingGeometry=new THREE.BoxGeometry(4,4,4),restorationGeometry=new THREE.BoxGeometry(2,2,2);
 const meshReport=analyzeCadMesh(solid),openReport=analyzeCadMesh(open);
 const shell=buildCrownShell(new THREE.Mesh(sphere),null,{wallThicknessMm:0.8,cervicalCutRatio:0.18,innerFitBlend:0,cementGapMm:0.08,marginGapMm:0.03,axialGapMm:0.1,radialGapMm:0.12,transitionMm:1,millingCompensationMm:0.05});
 const opposing=new THREE.Mesh(opposingGeometry),restoration=new THREE.Mesh(restorationGeometry),contact=analyzeMeshContact(restoration,buildMeshSpatialIndex(opposing,0.5));
 const kernel={mesh:meshReport,contact:null,undercut:null,margin:marginQualityReport(margin),connectorCount:0,connectorWarnings:[],crownShell:null};
 const clean=summarizeAyaReport(kernel,base.dataToken,false,0.8);
 const openEvidence=summarizeAyaReport({...kernel,mesh:openReport},base.dataToken,false,0.8);
 const contactEvidence=summarizeAyaReport({...kernel,mesh:analyzeCadMesh(restorationGeometry),contact},base.dataToken,true,0.8);
 const shellEvidence=summarizeAyaReport({...kernel,mesh:shell.report.qc,crownShell:shell.report},base.dataToken,false,0.8);
 await check('kernel fixtures are actual computed geometry',()=>{assert.equal(meshReport.watertight,true);assert.ok(openReport.boundaryEdges>0);assert.equal(openReport.watertight,false);assert.ok(contact.collisionCount>0);assert.ok(contact.sampleCount>0);assert.ok(shell.report.minimumWallEstimateMm>0);});
 await check('placement advice is scoped, typed, and does not place geometry',()=>{
  const c=context({placed:false,task:'anatomy'}),before=JSON.stringify(c),positions=Array.from(solid.attributes.position.array);
  const reply=suggestCadReply('Sıradaki adım ne?',{cadContext:c,locale:'tr'});
  assert.deepEqual(ids(reply),['place']);assert.equal(reply.engine,'core');assert.match(reply.output,/henüz.*yerleştirilmemiş/);assert.match(reply.output,/Uygula/);
  for(const proposal of reply.proposals){assert.deepEqual(Object.keys(proposal).sort(),['reason','scope','snapshot','tool']);assert.equal(proposal.scope,c.scope);assert.equal(proposal.snapshot,c.snapshot);assert.ok(c.availableTools.includes(proposal.tool));assert.ok(TOOL_IDS.includes(proposal.tool));assert.ok(proposal.reason.trim());}
  assert.equal(JSON.stringify(c),before);assert.deepEqual(Array.from(solid.attributes.position.array),positions);
 });
 await check('existing host rejects changed project, source, unit and geometry',async()=>{
  const c=context({placed:false}),proposal=suggestCadReply('Sıradaki adım ne?',{cadContext:c}).proposals[0];let callbacks=0;
  assert.equal(ayaProposalBlock(proposal,c),null);
  for(const patch of [{scope:'other-project:master-scan:unit-46'},{scope:'cad-project:other-scan:unit-46'},{scope:'cad-project:master-scan:unit-47'},{snapshot:'snapshot:changed'}]){
   const changed={...c,...patch};assert.equal(ayaProposalBlock(proposal,changed),'stale');const result=await executeAyaProposal(proposal,changed,{place:()=>{callbacks++;return {ok:true,message:'unexpected'};}});assert.equal(result.ok,false);
  }
  assert.equal(callbacks,0);assert.equal(ayaProposalBlock(proposal,{...c,availableTools:[]}), 'unavailable');assert.equal(ayaProposalBlock(proposal,{...c,isSaving:true}),'unavailable');
 });
 await check('missing scope or snapshot keeps legacy handling available',()=>{
  for(const patch of [{scope:''},{snapshot:''},{scope:undefined},{snapshot:undefined}])assert.equal(suggestCadReply(review,{cadContext:context(patch)}),null);
  assert.equal(suggestCadReply(review),null);assert.equal(suggestCadReply(review,{cadContext:null}),null);
 });
 await check('allowlist and absent prerequisites prevent impossible proposals',()=>{
  assert.deepEqual(ids(ask(review,{availableTools:[]})),[]);
  assert.deepEqual(ids(ask(review,{placed:false,availableTools:['inspect','save']})),[]);
  assert.deepEqual(ids(ask(review,{placed:false,setupComplete:false,marginPoints:0,availableTools:['setup','place','next']})),['setup']);
  assert.deepEqual(ids(ask(review,{placed:false,sourceReady:false,modelReady:false,availableTools:['place','inspect','next']})),[]);
  assert.deepEqual(ids(ask(review,{placed:false,modelReady:false,availableTools:['place','inspect','next']})),[]);
  assert.deepEqual(ids(ask(review,{placed:false,marginPoints:2,availableTools:['tool-margin','place','next']})),['tool-margin']);
  for(const patch of [{sourceReady:false},{modelReady:false},{setupComplete:false},{marginPoints:1}])assert.deepEqual(ids(ask(review,patch)),[]);
 });
 await check('saving blocks every proposal without claiming success',()=>{
  const reply=ask(review,{isSaving:true,saveFailed:true,availableTools:['save','place','inspect']});assert.deepEqual(ids(reply),[]);assert.match(reply.output,/Kayıt sürüyor/);assert.doesNotMatch(reply.output,/projesi kaydedildi|çıkıldı\.$/i);
 });
 await check('failed ordinary save wins over placement and survives later non-save actions',()=>{
  for(const patch of [{saveFailed:true},{saveFailed:true,recentActions:[{...base,tool:'save',ok:false,result:'Disk full'},{...base,tool:'inspect',ok:true,result:'Kontrol hesaplandı.'}]}]){
   const reply=ask(review,{placed:false,...patch});assert.deepEqual(ids(reply),['save']);assert.match(reply.output,/kayıt başarısız/i);assert.doesNotMatch(reply.output,/projesi kaydedildi/i);
  }
  const retry=ask(review,{placed:false,recentActions:[{tool:'save',ok:false,result:'Disk full'},{tool:'save',ok:true,result:'Kayıt tamamlandı.'}]});assert.deepEqual(ids(retry),['place']);assert.doesNotMatch(retry.output,/Son kayıt başarısız/);
 });
 await check('save and exit is a proposal and reports actual prior failure',()=>{
  assert.deepEqual(ids(ask('Bu projeyi kaydet ve çık.')),['save-exit']);
  const reply=ask('Bu projeyi kaydet ve çık.',{saveFailed:true,recentActions:[{scope:base.scope,snapshot:base.snapshot,dataToken:base.dataToken,tool:'save-exit',ok:false,result:'Bağlantı kesildi.'}]});assert.deepEqual(ids(reply),['save']);assert.match(reply.output,/Bağlantı kesildi/);assert.doesNotMatch(reply.output,/projesi kaydedildi/);
 });
 await check('manual save success and changed geometry outrank historical action text',()=>{
  const oldFailure={scope:base.scope,snapshot:base.snapshot,dataToken:base.dataToken,tool:'save',ok:false,result:'OLD SAVE FAILURE'};
  const reply=ask(review,{placed:false,unsaved:false,saveFailed:false,snapshot:'after-manual-save',recentActions:[oldFailure]});
  assert.deepEqual(ids(reply),['place']);assert.doesNotMatch(reply.output,/Son kayıt başarısız|OLD SAVE FAILURE/);
  const inspect={...oldFailure,tool:'inspect',ok:true,result:'OLD GEOMETRY: minimum 0.123 mm'};
  const changed=ask(review,{dataToken:'new-geometry',report:null,recentActions:[inspect]});
  assert.doesNotMatch(changed.output,/OLD GEOMETRY|0\.123/);assert.match(changed.output,/güncel geometri kontrolü yok/);assert.ok(ids(changed).includes('inspect'));
 });
 await check('undo and redo reflect real history availability',()=>{
  assert.deepEqual(ids(ask('Son mesh işlemini geri al.')),['undo']);assert.deepEqual(ids(ask('Redo işlemini nasıl uygularım?')),['redo']);
  assert.deepEqual(ids(ask('Son mesh işlemini geri al.',{undoCount:0,availableTools:['undo','inspect']})),[]);
  assert.deepEqual(ids(ask('Redo işlemini nasıl uygularım?',{redoCount:0,availableTools:['redo','inspect']})),[]);
 });
 await check('no current report does not invent dimensions or successful checks',()=>{
  const reply=ask(review);assert.deepEqual(ids(reply),['inspect']);assert.match(reply.output,/güncel geometri kontrolü yok/);assert.doesNotMatch(reply.output,/\b\d+(?:[.,]\d+)? mm\b|Kapalı mesh: evet|üretime hazır/);
 });
 await check('stale data token suppresses all previous measured findings',()=>{
  const stale={...shellEvidence,dataToken:'geometry:previous'},reply=ask('Güncel duvar kontrol raporunu yorumla.',{report:stale});assert.match(reply.output,/güncel geometri kontrolü yok/);assert.match(reply.output,/sayısal duvar tahmini yok/);assert.doesNotMatch(reply.output,/en düşük duvar tahmini: [\d.]+ mm/);assert.ok(ids(reply).includes('inspect'));
 });
 await check('actual mesh report is interpreted and clean informational notes allow next',()=>{
  const reply=ask(review,{report:clean});assert.match(reply.output,new RegExp(meshReport.triangleCount+' üçgen'));assert.match(reply.output,/0 açık kenar/);assert.match(reply.output,/Kapalı mesh: evet/);assert.ok(ids(reply).includes('next'),'A computed clean mesh report must not become a defect because of its clean information note.');assert.ok(!ids(reply).includes('inspect'),'Do not rerun unchanged successful analysis.');assert.doesNotMatch(reply.output,/üretime hazır|klinik olarak uygun/);
 });
 await check('actual open-mesh findings block unqualified progress',()=>{
  const reply=ask(review,{report:openEvidence});assert.match(reply.output,new RegExp(openReport.boundaryEdges+' açık kenar'));assert.match(reply.output,/Kapalı mesh: hayır/);assert.ok(ids(reply).includes('view-section'));assert.ok(!ids(reply).includes('next'));assert.match(reply.output,/üretim veya klinik onay değildir/);
 });
 await check('actual shell wall estimate retains estimate and source-map limits',()=>{
  const reply=ask('Güncel duvar kontrol raporunu yorumla.',{report:shellEvidence});assert.ok(reply.output.includes(shell.report.minimumWallEstimateMm+' mm'));assert.match(reply.output,/Kabuk offsetinden.*duvar tahmini/);assert.match(reply.output,/gerçek duvar kalınlığı ölçümü değildir/);assert.ok(ids(reply).includes('view-thickness'));assert.ok(ids(reply).includes('view-section'));assert.ok(!ids(reply).includes('internal-fit'));
 });
 await check('loaded jaws alone never establish an antagonist or contact evidence',()=>{
  const injected={...clean,contactReference:'antagonist',collisionSamples:93,contactSamples:94,samples:100,minimumSignedDistanceMm:-12.345};
  const reply=ask('Bu tasarımın antagonist temasını değerlendir.',{upperReady:true,lowerReady:true,antagonistReady:false,report:injected,availableTools:['view-contact','recorded-bite','inspect']});
  assert.match(reply.output,/Antagonist yüklü değil/);assert.deepEqual(ids(reply),[]);assert.doesNotMatch(reply.output,/93 çakışan|94 temas|-12\.345/);
 });
 await check('natural request to run antagonist checks states missing opposing data',()=>{
  const reply=ask('Antagonist temas kontrolünü yapabilir miyiz?',{antagonistReady:false,report:null});assert.match(reply.output,/Antagonist yüklü değil/);assert.deepEqual(ids(reply),[]);assert.doesNotMatch(reply.output,/\d+ çakışan örnek|işaretli mesafe:|\b\d+(?:[.,]\d+)? mm\b/);
 });
 await check('actual sampled antagonist contact is reported with clinical caveat',()=>{
  const reply=ask('Bu tasarımın antagonist temasını değerlendir.',{antagonistReady:true,report:contactEvidence});assert.match(reply.output,new RegExp(contact.collisionCount+' çakışan örnek'));assert.match(reply.output,new RegExp(contact.sampleCount+' toplam örnek'));assert.ok(reply.output.includes(contact.minimumSignedDistanceMm+' mm'));assert.match(reply.output,/örneklenir/);assert.match(reply.output,/klinik oklüzyon onayı değildir/);assert.ok(ids(reply).includes('view-contact'));assert.ok(!ids(reply).includes('inspect'));
 });
 await check('registered bite uses both jaws and cannot claim new alignment',()=>{
  const reply=ask('Bu tasarımın kayıtlı kapanışını nasıl gösteririm?',{antagonistReady:true,openingMm:4});assert.ok(ids(reply).includes('recorded-bite'));assert.match(reply.proposals.find(p=>p.tool==='recorded-bite').reason,/yeni hizalama.*yapmaz/);
  assert.ok(!ids(ask('Bu tasarımın kayıtlı kapanışını nasıl gösteririm?',{antagonistReady:true,openingMm:4,lowerReady:false,availableTools:['recorded-bite','view-contact','inspect']})).includes('recorded-bite'));
 });
 await check('goal-guided advice uses bounded memory and available tools only',()=>{
  const options={workingMemory:{goal:'Antagonist temaslarını incele.',decisions:[],openQuestions:[]}};
  const contactReply=ask('Sıradaki adım ne?',{antagonistReady:true},options);assert.ok(ids(contactReply).includes('view-contact'));assert.ok(ids(contactReply).includes('inspect'));
  assert.deepEqual(ids(ask('Sıradaki adım ne?',{},options)),[]);
  const wallReply=ask('Sıradaki adım ne?',{report:shellEvidence},{workingMemory:{goal:'Duvar kalınlığını değerlendir.',decisions:[],openQuestions:[]}});assert.ok(ids(wallReply).includes('view-thickness'));assert.match(wallReply.output,/tahmin/);assert.match(wallReply.output,/gerçek duvar kalınlığı ölçümü değildir/);
 });
 await check('goal-driven current contact advice keeps the sampled clinical limit',()=>{
  const reply=ask('Sıradaki adım ne?',{antagonistReady:true,report:contactEvidence},{workingMemory:{goal:'Antagonist temaslarını incele.',decisions:[],openQuestions:[]}});
  assert.ok(ids(reply).includes('view-contact'));assert.match(reply.output,/örneklen/);assert.match(reply.output,/klinik oklüzyon onayı değildir/);
 });
 await check('explicit measurement request overrides a previous contact goal',()=>{
  const actualDistance=new THREE.Vector3(1,2,3).distanceTo(new THREE.Vector3(4,6,3));
  const reply=ask('Bu tasarımda ölçüm aracını nasıl kullanırım?',{measurementsMm:[actualDistance]},{workingMemory:{goal:'Antagonist temaslarını incele.',decisions:[],openQuestions:[]}});
  assert.deepEqual(ids(reply),['tool-measure']);assert.ok(reply.output.includes(actualDistance+' mm'));assert.doesNotMatch(reply.output,/duvar kalınlığı:|temas mesafesi:/);
 });
 await check('current views and tools are not redundantly proposed',()=>{
  assert.ok(!ids(ask('Bu tasarımın antagonist temasını değerlendir.',{antagonistReady:true,view:'contact',report:contactEvidence})).includes('view-contact'));
  assert.ok(!ids(ask('Ölçüm aracını nasıl açarım?',{tool:'measure'})).includes('tool-measure'));
 });
 await check('current crown anatomy requests reach the actual active-unit form library',()=>{
  for(const prompt of ['Bu kron çok yapay görünüyor, anatomik formu nasıl değiştirebilirim?','Bu tasarımın anatomik formunu nasıl değiştirebilirim?','Şu kuronun şeklini değiştir.']){
   const c=context(),before=JSON.stringify(c),reply=suggestCadReply(prompt,{cadContext:c});
   assert.ok(reply,prompt);assert.deepEqual(ids(reply),['library'],prompt);assert.match(reply.output,/Anatomik dış form.*malzeme\/ışık/);assert.match(reply.output,/Uygula/);assert.equal(JSON.stringify(c),before,'Advice cannot modify the active unit or its geometry');
   assert.ok(reply.proposals.every(p=>p.scope===c.scope&&p.snapshot===c.snapshot));
  }
  const english=ask('How can I change this crown’s anatomical form?',{}, {locale:'en'});
  assert.deepEqual(ids(english),['library']);assert.match(english.output,/Anatomical outer shape/);assert.match(english.output,/does not confirm preparation fit/);
 });
 await check('coping anatomy is distinguished from a finished crown without inventing a form change',()=>{
  const reply=ask('Bu kapşonun anatomik formunu nasıl değiştirebilirim?',{restoration:'Kapşon / Coping Altyapı'});
  assert.deepEqual(ids(reply),['library','setup']);assert.match(reply.output,/kapşon altyapısıdır/);assert.match(reply.output,/tamamlanmış anatomik kuron değildir/);
  const english=ask('How can I change this coping’s anatomical form?',{restoration:'Coping'}, {locale:'en'});
  assert.deepEqual(ids(english),['library','setup']);assert.match(english.output,/not a finished anatomical crown/);
  assert.doesNotMatch(reply.output,/form.*(?:değiştirildi|uygulandı)|kuron.*(?:üretildi|tamamlandı)/);
 });
 await check('natural rendering requests use only actual view and expert-inspection capabilities',()=>{
  const availableTools=['library','view-natural','inspection','save'];
  for(const [prompt,locale] of [['Bu kuronun görünümünü daha doğal yapabilir miyiz?','tr'],['Make this crown look more natural.','en']]){
   const reply=ask(prompt,{view:'thickness',availableTools},{locale});assert.deepEqual(ids(reply),['view-natural','inspection']);
   assert.ok(reply.proposals.every(p=>availableTools.includes(p.tool)));assert.match(reply.output,/anatom|Anatom/);assert.doesNotMatch(reply.output,/başarıyla.*(?:değiştir|uygula)|successfully (?:changed|applied)/);
  }
  assert.deepEqual(ids(ask('Bu kronun görünümünü daha doğal yapabilir miyiz?',{view:'natural',availableTools:['library','view-natural']})),[],'An already active view is not offered again and unavailable expert controls are not invented');
  assert.deepEqual(ids(ask('Bu kronun görünümünü daha doğal yapabilir miyiz?',{view:'thickness',availableTools:[]})),[]);
 });
 await check('unready scenes can open a real form library but cannot offer live rendering tools',()=>{
  const c={sourceReady:false,modelReady:false,placed:false,marginPoints:0};
  assert.deepEqual(ids(ask('Bu kronun anatomik formunu nasıl değiştirebilirim?',c)),['library']);
  const appearance=ask('Bu kronun görünümünü daha doğal yapabilir miyiz?',c);assert.deepEqual(ids(appearance),[]);assert.match(appearance.output,/Sahne henüz hazır değil/);
  const incomplete=ask('Bu kronun anatomik formunu nasıl değiştirebilirim?',{...c,setupComplete:false});assert.deepEqual(ids(incomplete),['setup']);
 });
 await check('misplaced crown and coping complaints inspect the real margin without claiming preparation fit',()=>{
  for(const [prompt,locale] of [['Bu kapşon preparasyonun üstüne oturmuyor; nereden kontrol etmeliyim?','tr'],['Bu kron havada kalıyor, nasıl düzeltebilirim?','tr'],['This crown does not fit the prepared tooth; how should I check it?','en']]){
   const reply=ask(prompt,{}, {locale});assert.deepEqual(ids(reply),['tool-margin','view-section','inspect'],prompt);
   assert.match(reply.output,locale==='tr'?/kaynak taramasını.*kole çizgisini/:/source scan and margin/);
   assert.match(reply.output,locale==='tr'?/preparasyona oturma veya iç yüzey uyumu onayı değildir/:/does not confirm seating.*internal fit/);
   assert.doesNotMatch(reply.output,/\b\d+(?:[.,]\d+)?\s*mm\b|başarıyla yerleştirildi|uygunluk onaylandı|successfully placed|fit confirmed/);
   assert.ok(reply.proposals.every(p=>p.tool!=='place'),'An existing placed flag cannot authorize an unsupported replacement action');
  }
  const unplaced=ask('Bu kron preparasyonun üstüne oturmuyor, nasıl düzeltebilirim?',{placed:false});assert.deepEqual(ids(unplaced),['place']);assert.match(unplaced.output,/henüz yerleştirilmemiş/);
  const noPlacement=ask('Bu kron preparasyonun üstüne oturmuyor, nasıl düzeltebilirim?',{placed:false,availableTools:['inspect']});assert.deepEqual(ids(noPlacement),[]);
  assert.deepEqual(ids(ask('Bu kapşon preparasyonun üstüne oturmuyor, nereden kontrol etmeliyim?',{placed:false,marginPoints:2})),['tool-margin']);
 });
 await check('restoration troubleshooting keeps negative requests and independent tasks separate',()=>{
  for(const prompt of ['Bu kronu daha doğal yapma.','Bu kapşonu yerleştirme.',"Don't change this crown's anatomical form.",'Do not make this crown look more natural.']){
   const reply=ask(prompt);assert.deepEqual(ids(reply),[]);assert.match(reply.output,/durdur|avoid|stop/);
  }
  for(const prompt of ['Bu kronun formunu değiştir ve 12 cm kaç mm?','Bu kapşon preparasyonun üstüne oturmuyor ve kronun doğal görünümünü iyileştir.','Make this crown look more natural and save this project.']){
   const reply=ask(prompt);assert.deepEqual(ids(reply),[]);assert.match(reply.output,/birden fazla|different tasks/);assert.match(reply.output,/Hangi CAD adımına|Which CAD step/);assert.doesNotMatch(reply.output,/120 mm|Mesh:|Önerilen işlemler yalnız Uygula/);
  }
 });
 await check('an unplaced hidden starter needs its raw-model margin instead of a show-all loop',()=>{
  for(const [prompt,locale] of [['Kuron görünmüyor, nasıl gösterebilirim?','tr'],['Kuron görünmüyor, ne yapmalıyım?','tr'],['My crown is hidden, how can I show it?','en']]){
   const reply=ask(prompt,{placed:false,visible:false},{locale});assert.deepEqual(ids(reply),['place'],prompt);
   assert.deepEqual(ids(ask(prompt,{placed:false,visible:false,marginPoints:0},{locale})),['tool-margin']);
   assert.deepEqual(ids(ask(prompt,{placed:false,visible:false,availableTools:['show-all']},{locale})),[]);
  }
  const appearance=ask('Bu kuronun görünümünü daha doğal yapabilir miyiz?',{placed:false,visible:false,view:'thickness'});
  assert.ok(ids(appearance).includes('place'));assert.ok(!ids(appearance).includes('show-all'));
  assert.deepEqual(ids(ask('Kuron görünmüyor, nasıl gösterebilirim?',{placed:true,visible:false})),['show-all']);
  assert.deepEqual(ids(ask('Bu tasarımın kamerasını sahneye nasıl sığdırabilirim?',{placed:false,visible:false})),['fit-camera']);
 });
 await check('contradictory evidence cannot enable actions',()=>{
  const contradictions=[{...clean,watertight:true,boundaryEdges:4},{...contactEvidence,samples:1,collisionSamples:2},{...contactEvidence,samples:10,collisionSamples:7,contactSamples:6}];
  for(const report of contradictions){const reply=ask(review,{antagonistReady:true,report});assert.deepEqual(ids(reply),[]);assert.match(reply.output,/uyuşmuyor/);}
 });
 await check('normal definitions, writing, quoted text and clinical tasks are not intercepted',()=>{
  for(const prompt of ['Dentin nedir?','Marjin nedir?','Duvar kalınlığı ne demek?','What is occlusion?','Kayıtlı kapanış nedir?','Kuron nedir?','Kapşon nedir?','What is a coping?','"Bu tasarımı incele" cümlesini İngilizceye çevir.','Translate “Make this crown look natural” into Turkish.','Bu kuronun anatomik formu hakkında şiir yaz.','Write a poem about this design.','Bu tasarım için tedavi planı öner.'])assert.equal(suggestCadReply(prompt,{cadContext:context()}),null,prompt);
 });
 await check('explicit negative CAD requests honor stopping without partial positive actions',()=>{
  for(const prompt of ['Bu projeyi kaydet ve çıkma.','Bu projeyi kaydetme.','Son mesh işlemini geri alma.','Bu tasarımı inceleme.','Bu tasarım için işlem önerme.']){
   const reply=ask(prompt);assert.equal(reply.engine,'core');assert.deepEqual(ids(reply),[],prompt);
   assert.match(reply.output,/durdur|istemedi|önermiyorum|uygulamıyorum|işlem (?:yap|öner).*(?:mıyor|mayacak)|stop|cancel/i,prompt);
   assert.doesNotMatch(reply.output,/projesi kaydedildi|mesh işlemi geri alındı|kontrol hesaplandı/i,prompt);
  }
  for(const prompt of ["Don't save this project.",'Don’t undo the last edit.','Do not review this design.']){const reply=ask(prompt,{}, {locale:'en'});assert.deepEqual(ids(reply),[],prompt);assert.match(reply.output,/stop|avoid/i,prompt);}
 });
 await check('substantive mixed CAD and non-CAD requests require clarification without partial actions',()=>{
  for(const prompt of ['Bu projeyi kaydet ve 12 cm kaç mm?','Bu tasarımı incele ve bir davet metni yaz.']){
   const reply=ask(prompt);assert.deepEqual(ids(reply),[],prompt);
   assert.match(reply.output,/birden fazla|farklı|ayrı|birlikte|birleştir|mixed|multiple|separate/i,prompt);
   assert.match(reply.output,/netleştir|hangi|tek (?:istek|iş)|clarif|which|choose|seç/i,prompt);
   assert.doesNotMatch(reply.output,/120 mm|Mesh:|Kapalı mesh:|Önerilen işlemler yalnız Uygula/i,prompt);
  }
 });
 await check('legitimate compound workspace review remains actionable',()=>{
  const reply=ask('Tasarımı incele ve mevcut bulgulara göre sıradaki işlemleri öner.',{placed:false,task:'anatomy'});assert.deepEqual(ids(reply),['place']);assert.match(reply.output,/henüz.*yerleştirilmemiş/);assert.doesNotMatch(reply.output,/isteği.*durdur|isteğini.*netleştir/i);
 });
 await check('English contextual review keeps proposals and truthful limits',()=>{
  const reply=ask('Review the current design and suggest the next step.',{report:shellEvidence},{locale:'en'});assert.match(reply.output,/Working unit: 46/);assert.match(reply.output,/wall estimate from shell offset/);assert.match(reply.output,/not a true wall thickness measurement/);assert.match(reply.output,/only when you click Apply/);assert.ok(reply.proposals.every(p=>p.scope===base.scope&&p.snapshot===base.snapshot));
 });
 for(const geometry of [solid,open,sphere,opposingGeometry,restorationGeometry,shell.geometry])geometry.dispose();
 unregister();
 console.log(JSON.stringify({pass:failures.length===0,groupsPassed:passed.length,groupsFailed:failures.length,realKernelEvidence:true,modelInference:false,failures},null,2));
 if(failures.length)process.exitCode=1;
}
main().catch(error=>{unregister();console.error(error);process.exitCode=1;});
