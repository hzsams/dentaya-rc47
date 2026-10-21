import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRestorationGeometry} from '../src/lib/cad-restoration-shape';
import {placeCadCrownOnMargin} from '../src/lib/cad-margin-placement';
import {sizeCadRestorationAboveSource} from '../src/lib/cad-preparation-envelope';
import {analyzeCadMesh} from '../src/lib/cad-mesh-qc';
let cases=0;
for(const type of ['anatomic_crown','coping'] as const)for(const axis of [new THREE.Vector3(0,0,1),new THREE.Vector3(.2,-.15,1).normalize(),new THREE.Vector3(0,0,-1)])for(const preview of [1,.92]){
 const center=new THREE.Vector3(18,-9,3),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),axis);
 const margin=Array.from({length:48},(_,i)=>new THREE.Vector3(2.5*Math.cos(i*Math.PI/24),2.2*Math.sin(i*Math.PI/24),0).applyQuaternion(q).add(center));
 const geometry=createRestorationGeometry(10,'46',type,'natural','balanced'),probe=geometry.clone(),frame=placeCadCrownOnMargin(probe,margin,axis);assert.ok(frame);probe.dispose();
 const preparation=new THREE.CylinderGeometry(1.5,2.25,3.6,48);preparation.rotateX(Math.PI/2);preparation.translate(0,0,1.8);preparation.applyQuaternion(frame.quaternion);preparation.translate(...center.toArray());
 const raw=new Float32Array(preparation.getAttribute('position').array),unchangedSource=Array.from(raw),indices=Array.from(geometry.index!.array);
 const result=sizeCadRestorationAboveSource(geometry,raw,margin,frame,{minimumAxialClearanceMm:.8,previewHeightScale:preview});
 assert.ok(result.scaleZ>1,'The starting fossa must not intersect a 3.6mm prepared stump.');assert.ok(result.sampleCount>3);assert.ok(result.minimumAxialClearanceMm!>=.8-1e-5);
 assert.deepEqual(Array.from(raw),unchangedSource,'Sizing only the one restoration cannot alter the raw preparation/model.');assert.deepEqual(Array.from(geometry.index!.array),indices);assert.equal(geometry.boundingBox!.min.z,0,'The base stays on the model margin, not translated onto its top.');
 // Independent central ray checks actual top geometry rather than trusting the estimate return.
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),mesh=new THREE.Mesh(geometry,material);mesh.scale.z=preview;mesh.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(0,0,20),new THREE.Vector3(0,0,-1)),hit=ray.intersectObject(mesh,false)[0];assert.ok(hit);assert.ok(hit.point.z-3.6>=.8-1e-5,'The actual outer fossa covers the preparation instead of showing the source cap through it.');
 const placed=placeCadCrownOnMargin(geometry,margin,axis);assert.ok(placed);const qc=analyzeCadMesh(geometry);assert.ok(qc.watertight);assert.equal(qc.connectedComponents,1);assert.equal(qc.degenerateTriangles,0);
 material.dispose();preparation.dispose();geometry.dispose();cases++;
}
const g=createRestorationGeometry(10,'46','anatomic_crown','natural','balanced'),margin=Array.from({length:48},(_,i)=>new THREE.Vector3(2.5*Math.cos(i*Math.PI/24),2.2*Math.sin(i*Math.PI/24),0)),probe=g.clone(),frame=placeCadCrownOnMargin(probe,margin,new THREE.Vector3(0,0,1))!;probe.dispose();
const before=Array.from(g.getAttribute('position').array);
for(const raw of [new Float32Array(),new Float32Array([80,80,12,-80,-80,12]),new Float32Array([NaN,0,5])]){assert.equal(sizeCadRestorationAboveSource(g,raw,margin,frame,{minimumAxialClearanceMm:.8}).scaleZ,1);assert.deepEqual(Array.from(g.getAttribute('position').array),before,'Absent or unrelated model samples cannot resize a crown.');}
for(const clearance of [-1,NaN,Infinity,5]){sizeCadRestorationAboveSource(g,new Float32Array([0,0,4]),margin,frame,{minimumAxialClearanceMm:clearance});assert.deepEqual(Array.from(g.getAttribute('position').array),before);}
g.dispose();
console.log(JSON.stringify({pass:true,crownAndCopingCases:cases,sourceModelUnchanged:true,baseStaysOnSelectedMargin:true,actualFossaCoversPreparation:true,oppositeAndTiltedAxes:true,previewHeightAccountedFor:true,unrelatedSamplesIgnored:true,watertightTopologyPreserved:true,intaglioFitVerified:false},null,2));
