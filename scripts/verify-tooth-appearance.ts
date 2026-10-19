import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {loadToothAnatomy,toothDisplayForm} from '../src/lib/tooth-anatomy';
import {buildToothLayout} from '../src/lib/tooth-layout';
import {TOOTH_STYLES,TOOTH_FORMS,TOOTH_SHAPE_CONTROLS,normalizeToothAppearance,toothStylePatch,toothSurface} from '../src/lib/tooth-appearance';

assert.equal(TOOTH_STYLES.length,16);assert.equal(TOOTH_FORMS.length,9);
const legacy=normalizeToothAppearance({style:'clinical',form:'compact',showRoots:false,startView:'left'});
assert.equal(legacy.style,'clinical');assert.equal(legacy.form,'compact');assert.equal(legacy.showRoots,false);assert.equal(legacy.startView,'left');assert.equal(legacy.width,100);
const hostile=normalizeToothAppearance({width:Infinity,depth:'bad',color:'<script>',background:'red',gloss:NaN,brightness:-40,rootLength:900});
assert.equal(hostile.width,100);assert.equal(hostile.depth,100);assert.equal(hostile.color,null);assert.equal(hostile.background,null);assert.equal(hostile.gloss,52);assert.equal(hostile.brightness,70);assert.equal(hostile.rootLength,140);
assert.equal(normalizeToothAppearance({color:'#Aa55CC'}).color,'#aa55cc');
assert.equal(toothStylePatch('young-enamel').form,'youthful');
assert.ok(!Object.hasOwn(toothStylePatch('clinical'),'showRoots'));
assert.ok(!Object.hasOwn(toothStylePatch('clinical'),'startView'));
assert.equal(toothSurface(normalizeToothAppearance({shade:'a3'})).color,'#d9c69f');
assert.equal(toothSurface(normalizeToothAppearance({shade:'a3',color:'#aabbcc'})).color,'#aabbcc');
assert.equal(toothSurface(normalizeToothAppearance({finish:'metal'})).metalness,.7);
assert.equal(toothSurface(normalizeToothAppearance({finish:'contour'})).contour,true);
assert.equal(toothSurface(normalizeToothAppearance({gloss:100})).roughness,.08);
const originalFetch=globalThis.fetch;
globalThis.fetch=async input=>new Response(new Uint8Array(await readFile(new URL('../public'+String(input),import.meta.url))));
try{
 const originals=await loadToothAnatomy(new AbortController().signal);
 const snapshots=Object.fromEntries(Object.entries(originals).map(([code,g])=>[code,new Float32Array(g.getAttribute('position').array)]));
 const variants=[
  ...TOOTH_FORMS.map(form=>normalizeToothAppearance({form:form.id})),
  ...TOOTH_SHAPE_CONTROLS.flatMap(control=>[control.min,control.max].map(value=>normalizeToothAppearance({[control.key]:value}))),
  normalizeToothAppearance({form:'triangular',width:125,crownHeight:125,depth:120,cuspRelief:140,rootLength:140,wear:40}),
  normalizeToothAppearance({form:'worn',width:80,crownHeight:75,depth:80,cuspRelief:60,rootLength:60,wear:40}),
 ];
 let checkedMeshes=0;
 for(const p of variants){
  const meshes=Object.fromEntries(Object.entries(originals).map(([code,g])=>[code,toothDisplayForm(g,p.form,p)]));
  const {placements}=buildToothLayout(meshes);
  assert.equal(Object.keys(meshes).length,32);
  for(const [code,mesh] of Object.entries(meshes)){
   assert.ok([...mesh.getAttribute('position').array].every(Number.isFinite),code+' finite positions');
   assert.ok([...mesh.getAttribute('normal').array].every(Number.isFinite),code+' finite normals');
   assert.equal(mesh.getAttribute('position').count,originals[code].getAttribute('position').count);
   assert.deepEqual(mesh.index!.array,originals[code].index!.array,code+' topology preserved');
   assert.ok(mesh.boundingBox!.max.y>mesh.boundingBox!.min.y);
   assert.ok(Number(mesh.userData.crownLimit)>0);
   checkedMeshes++;
  }
  for(const q of ['1','2','3','4'])for(let n=1;n<8;n++){
   const a=q+n,b=q+(n+1),pa=placements[a],pb=placements[b];
   const ba=pa.crownBounds.clone().translate(new THREE.Vector3(pa.archX,0,pa.archZ)),bb=pb.crownBounds.clone().translate(new THREE.Vector3(pb.archX,0,pb.archZ));
   assert.ok(Math.max(bb.min.x-ba.max.x,ba.min.x-bb.max.x,bb.min.z-ba.max.z,ba.min.z-bb.max.z)>=1.79,'Occlusal clearance '+a+'/'+b);
  }
  Object.values(meshes).forEach(g=>g.dispose());
 }
 const natural=toothDisplayForm(originals['16'],'natural'),wide=toothDisplayForm(originals['16'],'natural',{width:125});
 assert.ok(wide.boundingBox!.getSize(new THREE.Vector3()).x>natural.boundingBox!.getSize(new THREE.Vector3()).x);
 const longRoot=toothDisplayForm(originals['16'],'natural',{rootLength:140});
 assert.ok(longRoot.boundingBox!.getSize(new THREE.Vector3()).y>natural.boundingBox!.getSize(new THREE.Vector3()).y);
 const young=toothDisplayForm(originals['16'],'youthful'),worn=toothDisplayForm(originals['16'],'worn');
 assert.notDeepEqual(young.getAttribute('position').array,worn.getAttribute('position').array);
 for(const [code,g] of Object.entries(originals))assert.deepEqual(g.getAttribute('position').array,snapshots[code],code+' reference geometry untouched');
 [natural,wide,longRoot,young,worn,...Object.values(originals)].forEach(g=>g.dispose());
 console.log(JSON.stringify({pass:true,presets:TOOTH_STYLES.length,forms:TOOTH_FORMS.length,controls:TOOTH_SHAPE_CONTROLS.length,checkedMeshes,finiteGeometry:true,topologyPreserved:true,referenceModelsUnchanged:true,legacyPreferencesPreserved:true,invalidPreferencesBounded:true,crownAndRootControlsChangeGeometry:true},null,2));
}finally{globalThis.fetch=originalFetch;}
