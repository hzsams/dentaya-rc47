'use strict';
// Actual triangle/plane output and bounded host metadata; no model inference.
const assert=require('node:assert/strict');
const {register}=require('tsx/cjs/api');
const unregister=register();
const THREE=require('three');
const {cadSectionContours}=require('../src/lib/cad-section-engine.ts');
const {suggestSectionReply}=require('../electron/aya/section-dialogue.cjs');
const {TOOL_IDS,normalizeWorkspace}=require('../electron/aya/agent.cjs');
const {ayaProposalBlock,executeAyaProposal}=require('../src/lib/aya-cad-agent.ts');
const failures=[],passed=[];
async function check(name,fn){try{await fn();passed.push(name);}catch(error){failures.push({name,message:error.message});}}
const base={scope:'project:source:unit-46',snapshot:'snapshot:section:1',dataToken:'geometry:46:1',sectionToken:'plane:0:0:1:0',unit:'46',restoration:'Anatomik kron',stage:'design',task:'inspect',setupComplete:true,sourceReady:true,modelReady:true,marginPoints:8,placed:true,visible:true,unsaved:true,saveFailed:false,isSaving:false,view:'section',tool:'select',availableTools:['inspection','view-section','inspect','save']};
const context=(patch={})=>({...base,...patch});
const ids=reply=>reply.proposals.map(p=>p.tool);
function ask(prompt,patch={},options={}){const reply=suggestSectionReply(prompt,{cadContext:context(patch),locale:'tr',...options});assert.ok(reply,'Expected section advice: '+prompt);return reply;}
const contour=report=>({lengthMm:report.perimeterMm,areaMm2:report.areaMm2,closedLoops:report.closedLoops,issues:report.warnings});
const review='Bu kesitin alanını ve kontur uzunluğunu yorumla.';
async function main(){
 const matrix=new THREE.Matrix4(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),0);
 const restoration=new THREE.BoxGeometry(6,4,8),source=new THREE.BoxGeometry(10,8,12),open=new THREE.PlaneGeometry(6,4).rotateX(Math.PI/2);
 const closed=cadSectionContours(restoration,matrix,plane),sourceContour=cadSectionContours(source,matrix,plane),openContour=cadSectionContours(open,matrix,plane),bounded=cadSectionContours(restoration,matrix,plane,{maxSegments:1}),coplanar=cadSectionContours(restoration,matrix,new THREE.Plane(new THREE.Vector3(0,0,1),-4));
 const evidence=(patch={})=>({dataToken:base.dataToken,key:base.sectionToken,plane:{normal:[0,0,1],constantMm:0},sourceSimplified:false,restoration:contour(closed),source:contour(sourceContour),...patch});
 await check('fixtures are actual closed, open, coplanar and bounded triangle-plane results',()=>{
  assert.equal(closed.areaMm2,24);assert.equal(closed.perimeterMm,20);assert.equal(sourceContour.areaMm2,80);assert.equal(sourceContour.perimeterMm,36);
  assert.equal(openContour.areaMm2,null);assert.ok(openContour.perimeterMm>0);assert.ok(openContour.warnings.includes('open'));
  assert.equal(bounded.areaMm2,null);assert.ok(bounded.warnings.includes('truncated'));assert.equal(coplanar.areaMm2,null);assert.ok(coplanar.warnings.includes('coplanar'));
 });
 await check('TR and EN measured responses lead with current real values and remain read-only',()=>{
  for(const [prompt,locale] of [[review,'tr'],['Interpret the current section area and explain its contour length.','en'],['What is the current section’s area?','en'],["What is this section's area?",'en']]){
   const c=context({section:evidence()}),before=JSON.stringify(c),positions=Array.from(restoration.attributes.position.array),reply=suggestSectionReply(prompt,{cadContext:c,locale});assert.ok(reply,prompt);
   assert.deepEqual(ids(reply),[]);assert.match(reply.output.split('\n')[0],locale==='tr'?/^Restorasyon kesiti:.*20 mm; kapalı alan 24 mm²/:/^Restoration section:.*20 mm; closed area 24 mm²/);
   assert.match(reply.output,locale==='tr'?/Kaynak kesiti:.*36 mm; kapalı alan 80 mm²/:/Source section:.*36 mm; closed area 80 mm²/);
   assert.match(reply.output,locale==='tr'?/duvar kalınlığı.*iç yüzey\/klinik uyum ölçümü değildir/:/do not measure wall thickness, intaglio fit or clinical fit/);
   assert.doesNotMatch(reply.output,/Mesh:|Antagonist|antagonist|Kayıt.*başarılı|successfully saved|click Apply|Uygula/);
   assert.equal(JSON.stringify(c),before);assert.deepEqual(Array.from(restoration.attributes.position.array),positions);
  }
 });
 await check('open contours retain real length while null area is never converted to zero',()=>{
  for(const [prompt,locale] of [['Güncel kesitte neden alan hesaplanmıyor?','tr'],['Why is the current section area unavailable?','en']]){
   const reply=ask(prompt,{section:evidence({restoration:contour(openContour)})},{locale});
   assert.match(reply.output,locale==='tr'?/Restorasyon kesiti:.*6 mm; güvenilir kapalı alan kullanılamıyor/:/Restoration section:.*6 mm; reliable closed area unavailable/);
   assert.match(reply.output,locale==='tr'?/açık kontur/:/open contour/);assert.doesNotMatch(reply.output,/(?:kapalı alan|closed area) 0(?:[.,]0+)? mm²/);
   assert.match(reply.output,locale==='tr'?/kapalı alan 80 mm²/:/closed area 80 mm²/);
  }
 });
 await check('coplanar and bounded evidence withholds area and explains its actual limit',()=>{
  for(const [report,pattern] of [[bounded,/sınırlandırılmış hesap/],[coplanar,/düzlemle çakışan yüzey/]]){
   const reply=ask('Bu kesitteki alan sınırını açıkla.',{section:evidence({restoration:contour(report),source:null})});
   assert.match(reply.output,/güvenilir kapalı alan kullanılamıyor/);assert.match(reply.output,pattern);assert.doesNotMatch(reply.output,/\d+(?:[.,]\d+)? mm²/);
  }
 });
 await check('displayed simplified scan measurements disclose their resolution limit',()=>{
  for(const [prompt,locale] of [['Bu kesitin alanı kaç mm²?','tr'],['What is the area of this section?','en']]){
   const reply=ask(prompt,{section:evidence({sourceSimplified:true})},{locale});
   assert.match(reply.output,locale==='tr'?/sadeleştirilmiş tarama önizlemesine.*tam çözünürlüklü tarama ölçümü değildir/:/displayed simplified scan preview, not the full-resolution scan/);
   assert.match(reply.output,/80 mm²/);
   assert.doesNotMatch(ask(prompt,{section:evidence({sourceSimplified:false})},{locale}).output,/sadeleştirilmiş|simplified scan preview/);
  }
 });
 await check('one available contour never substitutes for a missing restoration or source contour',()=>{
  const onlySource=ask('Bu kuronun kesit alanını yorumla.',{section:evidence({restoration:null})});assert.match(onlySource.output,/Kaynak kesiti:.*80 mm²/);assert.match(onlySource.output,/Restorasyon için bu düzlemde güncel kesit ölçümü yok/);assert.doesNotMatch(onlySource.output,/Restorasyon kesiti:|24 mm²/);
  const onlyRestoration=ask('Bu kesit alanını yorumla.',{section:evidence({source:null})});assert.match(onlyRestoration.output,/Restorasyon kesiti:.*24 mm²/);assert.match(onlyRestoration.output,/Kaynak için bu düzlemde güncel kesit ölçümü yok/);assert.doesNotMatch(onlyRestoration.output,/Kaynak kesiti:|80 mm²/);
 });
 await check('changed geometry, plane and active unit cannot replay old measurements',()=>{
  const stale=[{dataToken:'geometry:46:2'},{sectionToken:'plane:0:1:0:2'},{scope:'project:source:unit-47',unit:'47',dataToken:'geometry:47:1',sectionToken:'plane:47:0'}];
  for(const patch of stale){
   const reply=ask(review,{section:evidence(),...patch});assert.match(reply.output,/güncel kesit ölçümü yok/);assert.doesNotMatch(reply.output,/20 mm|24 mm²|36 mm|80 mm²/);
   assert.ok(reply.proposals.every(p=>p.scope===(patch.scope||base.scope)));
  }
 });
 await check('invalid planes, off-view and not-ready scenes cannot expose numeric section evidence',()=>{
  const invalid=[{section:evidence({plane:{normal:[0,0,0],constantMm:0}})},{section:evidence({plane:{normal:[0,0,2],constantMm:0}})},{section:evidence({plane:{normal:[0,0,1],constantMm:Infinity}})},{section:evidence(),view:'natural'},{section:evidence(),modelReady:false},{section:evidence(),sourceReady:false,modelReady:false,placed:false}];
  for(const patch of invalid){const reply=ask(review,patch);assert.match(reply.output,/güncel kesit ölçümü yok/);assert.doesNotMatch(reply.output,/24 mm²|80 mm²/);}
 });
 await check('missing evidence offers at most one existing available view or inspection action',()=>{
  for(const [patch,expected] of [[{view:'natural'},['view-section']],[{view:'natural',availableTools:['inspection']},['inspection']],[{},['inspection']],[{availableTools:['view-section']},[]],[{availableTools:[]},[]],[{isSaving:true},[]],[{modelReady:false},[]]]){
   const reply=ask('Bu kesitin alanı kaç mm²?',patch);assert.deepEqual(ids(reply),expected);
   assert.match(reply.output,/güncel kesit ölçümü yok/);assert.ok(reply.proposals.length<=1);
   for(const p of reply.proposals){assert.ok(TOOL_IDS.includes(p.tool));assert.ok(context(patch).availableTools.includes(p.tool));assert.deepEqual(Object.keys(p).sort(),['reason','scope','snapshot','tool']);assert.equal(p.scope,base.scope);assert.equal(p.snapshot,base.snapshot);assert.match(reply.output,/yalnız Uygula/);}
  }
 });
 await check('section suggestions keep host stale-scope and stale-snapshot execution guards',async()=>{
  const c=context({view:'natural'}),proposal=ask('Kesit görünümünü aç.',{view:'natural'}).proposals[0];assert.equal(proposal.tool,'view-section');let calls=0;
  assert.equal(ayaProposalBlock(proposal,c),null);
  for(const patch of [{scope:'other-project:source:unit-46'},{scope:'project:source:unit-47'},{snapshot:'snapshot:changed'}]){
   const result=await executeAyaProposal(proposal,{...c,...patch},{'view-section':()=>{calls++;return {ok:true,message:'unexpected'};}});assert.equal(result.ok,false);
  }
  assert.equal(calls,0);
 });
 await check('explicit section view and fit-limit questions remain bounded current-context requests',()=>{
  for(const prompt of ['Kesit görünümünü aç.','Kesiti inceleme panelini aç.','Show the current cross-section and explain its contour.','Bu kesit iç uyumun doğru olduğunu kanıtlıyor mu?','Does this section prove intaglio fit?']){
   const reply=ask(prompt,{section:evidence()});assert.match(reply.output,/24 mm²/);assert.deepEqual(ids(reply),[]);assert.match(reply.output,/iç yüzey\/klinik uyum ölçümü değildir/);
  }
 });
 await check('definitions, unrelated contours, quoted writing and clinical requests are not intercepted',()=>{
  for(const prompt of ['Kesit alanı nedir?','Kesit alanı ne demek?','Bu kesit alanı terimi ne demek?','What is a cross-section?','Define the current section area.','Bu konturun alanı kaç?','Review section 4.','“Bu kesitin alanını yorumla.”',"'Review the current section.'",'«Kesiti aç» cümlesini İngilizceye çevir.','Translate the current section measurements.','Bu kesit hakkında şiir yaz.','Write a poem about this cross-section.','Bu kesite göre tedavi planı öner.','Review this section for clinical treatment.']){
   assert.equal(suggestSectionReply(prompt,{cadContext:context({section:evidence()})}),null,prompt);
  }
 });
 await check('negative and mixed requests cannot produce partial section suggestions',()=>{
  for(const prompt of ['Bu kesiti gösterme.','Kesiti açma.','Kesiti inceleme.','Kesiti incelemeyelim.','Kesiti gösterme ve projeyi kaydet.','Bu kesitin alanını yorumlama.','Bu kesitin alanını değerlendirme.','Bu kesitin alanını hesaplamayalım.','Bu kesit alanını göstermeni istemiyorum.','Bu kesitin alanını hesaplamaya gerek yok.','Bu kesiti incele ve projeyi kaydet.','Bu kesitin alanı kaç ve 12 cm kaç mm?','Bu kesiti incele, projeyi kaydet.','Bu kesiti incele. Ardından 12 cm kaç mm?','Bu kesiti incele ve kontur sözcüğüyle bir davet metni yaz.','Bu kesiti incele ve bu kesit için bir toplantı daveti oluştur.','Review this section and save the project.','Review this section. Write a meeting invitation.','Review this section 4. Write a meeting invitation.','Review this section and explain the area of Paris.','Review this section and compose an invitation about this section.',"Don’t show this section; save the project.",'Do not open the section view.','Avoid showing the current section area.','No need to show this section.','Review this section and undo the last edit.']){
   assert.equal(suggestSectionReply(prompt,{cadContext:context()}),null,prompt);
  }
 });
 await check('missing CAD scope and ambiguous followups do not acquire section authority',()=>{
  for(const cadContext of [null,context({scope:''}),context({snapshot:''})])assert.equal(suggestSectionReply(review,{cadContext}),null);
  const history=[{role:'user',content:review,cadScope:base.scope},{role:'assistant',content:'OLD 999 mm²',cadScope:base.scope}];
  for(const prompt of ['Peki şimdi?','Sonuç nasıl?','What now?'])assert.equal(suggestSectionReply(prompt,{cadContext:context({section:evidence()}),history}),null);
 });
 await check('untrusted contour flags and invalid numbers cannot become a valid area claim',()=>{
  for(const part of [{...contour(closed),issues:['open']},{...contour(closed),issues:['unknown-instruction']},{...contour(closed),lengthMm:NaN},{...contour(closed),areaMm2:Infinity}]){
   const c=context({section:evidence({restoration:part,source:null})}),normalized=normalizeWorkspace(c),reply=suggestSectionReply(review,{cadContext:c});assert.ok(reply);
   assert.ok(!normalized.section?.restoration||normalized.section.restoration.areaMm2===null);assert.doesNotMatch(reply.output,/closed area 24 mm²|kapalı alan 24 mm²|NaN|Infinity|unknown-instruction/);
  }
 });
 for(const geometry of [restoration,source,open])geometry.dispose();
 unregister();
 console.log(JSON.stringify({pass:failures.length===0,groupsPassed:passed.length,groupsFailed:failures.length,actualTrianglePlaneEvidence:true,modelInference:false,failures},null,2));
 if(failures.length)process.exitCode=1;
}
main().catch(error=>{unregister();console.error(error);process.exitCode=1;});
