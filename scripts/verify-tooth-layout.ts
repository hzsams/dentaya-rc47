import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {loadToothAnatomy,toothDisplayForm} from '../src/lib/tooth-anatomy';
import {buildToothLayout} from '../src/lib/tooth-layout';
import {normalizeToothAppearance,DEFAULT_TOOTH_APPEARANCE,TOOTH_FORMS} from '../src/lib/tooth-appearance';
const originalFetch=globalThis.fetch;
globalThis.fetch=async(input)=>{const bytes=await readFile(new URL('../public'+String(input),import.meta.url));return new Response(new Uint8Array(bytes));};
try{
 const originals=await loadToothAnatomy(new AbortController().signal);
 for(const form of TOOTH_FORMS){const meshes=Object.fromEntries(Object.entries(originals).map(([code,g])=>[code,toothDisplayForm(g,form.id)])),{placements}=buildToothLayout(meshes);
 assert.equal(Object.keys(meshes).length,32);
 for(const q of ['1','2','3','4'])for(let n=1;n<8;n++){
  const a=q+n,b=q+(n+1),pa=placements[a],pb=placements[b];
  const front=(code:string)=>{const t=placements[code];const box=new THREE.Box3(),position=meshes[code].getAttribute('position'),transform=new THREE.Matrix4().makeRotationY(t.frontRotation);for(let i=0;i<position.count;i++)box.expandByPoint(new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(transform));return box.translate(new THREE.Vector3(t.frontX,0,0));};
  const fa=front(a),fb=front(b);assert.ok(Math.max(fb.min.x-fa.max.x,fa.min.x-fb.max.x)>=1.79,`Front overlap ${a}/${b}`);
  const ba=pa.crownBounds.clone().translate(new THREE.Vector3(pa.archX,0,pa.archZ)),bb=pb.crownBounds.clone().translate(new THREE.Vector3(pb.archX,0,pb.archZ));
  const separation=Math.max(bb.min.x-ba.max.x,ba.min.x-bb.max.x,bb.min.z-ba.max.z,ba.min.z-bb.max.z);assert.ok(separation>=1.79,`Occlusal overlap ${a}/${b}: ${separation}`);
 }
 assert.deepEqual(normalizeToothAppearance({style:'bad',showRoots:'bad',startView:'bad'}),DEFAULT_TOOTH_APPEARANCE);
 for(const geometry of Object.values(meshes))geometry.dispose();
 }
 for(const geometry of Object.values(originals))geometry.dispose();
 console.log(`PASS: ${TOOTH_FORMS.length} forms; 32 anatomical meshes; all adjacent teeth have >=1.8 mm schematic projected clearance, front and occlusal; invalid preferences fall back.`);
}finally{globalThis.fetch=originalFetch;}
