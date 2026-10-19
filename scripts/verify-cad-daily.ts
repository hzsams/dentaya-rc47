import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CAD_TOOTH_FORM_OPTIONS} from '../src/lib/cad-job-setup';
const TOOTH_FORM_FAMILIES=CAD_TOOTH_FORM_OPTIONS.map(f=>({id:f.value}));
import {createRestorationGeometry} from '../src/lib/cad-restoration-shape';
import {placeCadCrownOnMargin} from '../src/lib/cad-margin-placement';
import {captureCadGeometry,restoreCadGeometry,encodeCadWorkspace,decodeCadWorkspace,validateCadWorkspace,sameCadJson,type CadWorkspaceSnapshot} from '../src/lib/cad-project-state';
import {analyzeCadMesh} from '../src/lib/cad-mesh-qc';
import {buildCrownShell} from '../src/lib/cad-crown-shell-engine';

const scenarios=[{center:new THREE.Vector3(18,-9,3),rotation:new THREE.Quaternion()},{center:new THREE.Vector3(-21,6,-4),rotation:new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,.2,0).normalize(),.55)},{center:new THREE.Vector3(12,8,2),rotation:new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI)}];
let crowns=0;
for(const code of ['11','13','16','23','24','31','35','46'])for(const family of TOOTH_FORM_FAMILIES)for(const scenario of scenarios){
 const g=createRestorationGeometry(28,code,'anatomic_crown',family.id,'balanced');
 const baseZ=g.boundingBox!.min.z;
 const points=Array.from({length:48},(_,i)=>{const t=i*Math.PI/24;return new THREE.Vector3(2.5*Math.cos(t),2.1*Math.sin(t),.12*Math.sin(t*2)).applyQuaternion(scenario.rotation).add(scenario.center);});
 const axis=new THREE.Vector3(0,0,1).applyQuaternion(scenario.rotation);
 const placement=placeCadCrownOnMargin(g,points,axis);assert.ok(placement,code+'/'+family.id);
 const origin=new THREE.Vector3(0,0,baseZ).applyQuaternion(placement.quaternion).add(placement.position);
 assert.ok(origin.distanceTo(scenario.center)<1e-5,'Cervical center must coincide with the selected margin, not the arch center');
 assert.ok(placement.axis.dot(axis)>.999);const qc=analyzeCadMesh(g);assert.ok(qc.watertight);assert.equal(qc.connectedComponents,1);assert.equal(qc.degenerateTriangles,0);g.dispose();crowns++;
}
assert.ok(sameCadJson({z:1,a:{b:2,a:3}}, {a:{a:3,b:2},z:1}));
assert.equal(sameCadJson({units:['46','47']},{units:['47','46']}),false);
const g=createRestorationGeometry(6,'46','anatomic_crown','natural','balanced');
for(const bad of [[{x:0,y:0,z:0},{x:1,y:0,z:0},{x:2,y:0,z:0}],[{x:NaN,y:0,z:0},{x:1,y:1,z:0},{x:0,y:2,z:0}]]){
 const before=Array.from(g.getAttribute('position').array);assert.equal(placeCadCrownOnMargin(g,bad,new THREE.Vector3(0,0,1)),null);assert.deepEqual(Array.from(g.getAttribute('position').array),before);
}
const data=captureCadGeometry(g),base=[...data.positions];data.positions[2]=Math.fround(data.positions[2]+.09);
const workspace:CadWorkspaceSnapshot={version:1,sourceKey:'test-source',units:{'unit-46':{key:'unit-46:46:anatomic_crown:natural:balanced',geometry:data,base,placementBase:[...base],anchor:{position:[18,-9,5],quaternion:[0,0,0,1],placed:true}}}};
const shell=buildCrownShell(new THREE.Mesh(g),null,{wallThicknessMm:.5,cervicalCutRatio:.12,innerFitBlend:0,cementGapMm:.05,marginGapMm:.02,axialGapMm:.05,radialGapMm:.05,transitionMm:1,millingCompensationMm:0});
workspace.units['unit-46'].shell=captureCadGeometry(shell.geometry);workspace.units['unit-46'].shellReport=shell.report;
workspace.sources={'other-source':{'unit-47':structuredClone(workspace.units['unit-46'])}};
const encoded=await encodeCadWorkspace(workspace),restored=await decodeCadWorkspace(encoded);assert.deepEqual(restored,workspace);assert.ok(encoded.data.length<JSON.stringify(workspace).length/2,'Daily autosaves must use compressed geometry');
const shape=restoreCadGeometry(restored!.units['unit-46'].geometry);assert.deepEqual(Array.from(shape.getAttribute('position').array),Array.from(new Float32Array(data.positions)));assert.deepEqual(Array.from(shape.index!.array),data.indices);
assert.equal(await decodeCadWorkspace({...encoded,data:'not base64'}),null);assert.equal(validateCadWorkspace({...workspace,units:{constructor:workspace.units['unit-46']}}),false);
const invalid=JSON.parse(JSON.stringify(workspace));invalid.units['unit-46'].geometry.indices[0]=9999999;assert.equal(validateCadWorkspace(invalid),false);
assert.equal(validateCadWorkspace({...workspace,version:99}),false);
shape.dispose();shell.geometry.dispose();g.dispose();console.log(JSON.stringify({pass:true,placedCrowns:crowns,translatedTiltedAndOppositeAxes:true,cervicalCentersMatchMargins:true,closedSingleBodies:true,invalidMarginsDoNotModifyGeometry:true,fullTopologyAndEditsRoundTrip:true,shellReportAndSourceFramesRoundTrip:true,compressedGeometry:true,corruptRecordsRejected:true},null,2));
