import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {createRestorationGeometry} from '../src/lib/cad-restoration-shape';
import {cadMarginCenter,placeCadCrownOnMargin} from '../src/lib/cad-margin-placement';
import {cadCervicalBaseZ,cadCervicalRegistration,cadRestorationTransform} from '../src/lib/cad-restoration-transform';
import {analyzeCadMesh} from '../src/lib/cad-mesh-qc';
import {captureCadGeometry,restoreCadGeometry} from '../src/lib/cad-project-state';

const poses=[{center:new THREE.Vector3(21,-9,4),axis:new THREE.Vector3(0,0,1)},{center:new THREE.Vector3(-17,12,-6),axis:new THREE.Vector3(.3,-.4,1).normalize()},{center:new THREE.Vector3(13,7,3),axis:new THREE.Vector3(0,0,-1)}];
const options={morphologyScale:1,cuspHeight:1,proximalContactMm:0,occlusalOffsetMm:0,translation:new THREE.Vector3(),rotationZDeg:0,marginOffsetMm:0};
let placements=0;
for(const type of ['anatomic_crown','coping'] as const)for(const code of ['11','16','24','31','36','46'])for(const pose of poses){
 const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),pose.axis);
 const margin=Array.from({length:64},(_,i)=>{const t=i*2*Math.PI/64;return new THREE.Vector3(3.2*Math.cos(t),2.7*Math.sin(t),0).applyQuaternion(q).add(pose.center);});
 const g=createRestorationGeometry(12,code,type,'natural','balanced'),base=Float32Array.from(g.getAttribute('position').array),baseZ=cadCervicalBaseZ(base),placed=placeCadCrownOnMargin(g,margin,pose.axis);assert.ok(placed);
 assert.ok(placed.center.distanceTo(pose.center)<1e-6);assert.ok(placed.axis.dot(pose.axis)>.9999,'Explicit upper/opposite or tilted insertion signs are preserved');
 const anchor={position:placed.position,quaternion:placed.quaternion,placed:true};
 for(const cuspHeight of [.6,.92,1,1.12,1.4]){
  const t=cadRestorationTransform(anchor,baseZ,{...options,cuspHeight}),mesh=new THREE.Mesh(g);mesh.position.copy(t.position);mesh.quaternion.copy(t.quaternion);mesh.scale.copy(t.scale);mesh.updateMatrixWorld(true);
  const info=cadCervicalRegistration(g,base,mesh.matrixWorld,margin,placed.center);
  assert.ok(info.cervicalCenterGapMm<1e-6,`${type}/${code}: cusp height ${cuspHeight} must not lift or bury the cervical center`);
  assert.ok(info.neckSampleCount>=64);assert.ok(info.maxMarginGapMm!==null&&info.maxMarginGapMm<2e-5,'Actual transformed cervical ring meets the selected margin');
 }
 const qc=analyzeCadMesh(g);assert.ok(qc.watertight);assert.equal(qc.connectedComponents,1);assert.equal(qc.degenerateTriangles,0);assert.equal(qc.inconsistentWindingEdges,0);
 const stored=captureCadGeometry(g),restored=restoreCadGeometry(stored);assert.deepEqual(captureCadGeometry(restored),stored,'Placed positions and indexed topology round-trip exactly');restored.dispose();g.dispose();placements++;
}
// Saved RC54 geometry has a negative cervical local origin. Its legacy frame
// must remain stable without replacing the user's mesh or anchor record.
for(const pose of poses){
 const g=createRestorationGeometry(12,'46','coping','natural','balanced');g.translate(0,0,-3.75);const base=Float32Array.from(g.getAttribute('position').array),baseZ=cadCervicalBaseZ(base);
 const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),pose.axis),margin=Array.from({length:64},(_,i)=>new THREE.Vector3(3*Math.cos(i*Math.PI/32),2.7*Math.sin(i*Math.PI/32),0).applyQuaternion(q).add(pose.center)),placed=placeCadCrownOnMargin(g,margin,pose.axis);assert.ok(placed);
 for(const cuspHeight of [.6,.92,1.12,1.4]){
  const translation=new THREE.Vector3(.2,-.3,.4),marginOffsetMm=.15,t=cadRestorationTransform({...placed,placed:true},baseZ,{...options,cuspHeight,translation,marginOffsetMm,rotationZDeg:22,morphologyScale:1.03});
  const matrix=new THREE.Matrix4().compose(t.position,t.quaternion,t.scale),actualPivot=new THREE.Vector3(0,0,baseZ).applyMatrix4(matrix),expectedPivot=pose.center.clone().add(translation.clone().add(new THREE.Vector3(0,0,marginOffsetMm)).applyQuaternion(placed.quaternion));
  assert.ok(actualPivot.distanceTo(expectedPivot)<1e-6,'Legacy axial scaling preserves the chosen target and intentional manual offsets/rotation');
 }
 g.dispose();
}
const rectangle=[new THREE.Vector3(-4,-2,0),new THREE.Vector3(4,-2,0),...Array.from({length:200},(_,i)=>new THREE.Vector3(4,-2+(i+1)*4/200,0)),new THREE.Vector3(-4,2,0)];
assert.ok(cadMarginCenter(rectangle)!.length()<1e-9,'Dense drawing on one side cannot move the restoration target');assert.ok(cadMarginCenter([...rectangle].reverse())!.length()<1e-9,'Margin winding cannot move the target');
// A technical/library mesh may have interior vertices in its flat cap. None
// may collapse into the outer rim during registration.
const raw=new THREE.BoxGeometry(6,4,7,4,4,4);raw.deleteAttribute('uv');raw.deleteAttribute('normal');const box=mergeVertices(raw,1e-5);raw.dispose();
const flatMargin=Array.from({length:64},(_,i)=>new THREE.Vector3(3*Math.cos(i*Math.PI/32),2.3*Math.sin(i*Math.PI/32),0));assert.ok(placeCadCrownOnMargin(box,flatMargin,new THREE.Vector3(0,0,1)));
const boxQc=analyzeCadMesh(box);assert.ok(boxQc.watertight);assert.equal(boxQc.degenerateTriangles,0,'The flat cap retains interior topology');assert.equal(boxQc.connectedComponents,1);
const before=Array.from(box.getAttribute('position').array);assert.equal(placeCadCrownOnMargin(box,[{x:0,y:0,z:0},{x:1,y:0,z:0},{x:2,y:0,z:0}],new THREE.Vector3(0,0,1)),null);assert.deepEqual(Array.from(box.getAttribute('position').array),before,'A rejected margin never modifies geometry');box.dispose();
console.log(JSON.stringify({pass:true,crownAndCopingPlacements:placements,actualRenderedNeckRegistration:true,translatedTiltedAndUpperAxes:true,heightPreservesCervicalTarget:true,legacyNegativeBaseAndManualOffsets:true,pointDensityIndependentTarget:true,flatCapInteriorTopology:true,closedSingleBody:true,exactTopologyRoundTrip:true,invalidMarginsDoNotMutate:true,intaglioFitVerified:false},null,2));
