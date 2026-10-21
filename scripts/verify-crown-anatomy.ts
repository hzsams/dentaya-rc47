import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRestorationGeometry} from '../src/lib/cad-restoration-shape';
import {analyzeCadMesh} from '../src/lib/cad-mesh-qc';
import {CAD_TOOTH_FORM_OPTIONS,CAD_RESTORATION_OPTIONS} from '../src/lib/cad-job-setup';

function peaks(geometry:THREE.BufferGeometry){
 const p=geometry.getAttribute('position'),index=geometry.index!;
 const adjacent=Array.from({length:p.count},()=>new Set<number>());
 for(let i=0;i<index.count;i+=3){const t=[index.getX(i),index.getX(i+1),index.getX(i+2)];for(const a of t)for(const b of t)if(a!==b)adjacent[a].add(b);}
 geometry.computeBoundingBox();const box=geometry.boundingBox!,hw=Math.max(Math.abs(box.min.x),Math.abs(box.max.x)),hd=Math.max(Math.abs(box.min.y),Math.abs(box.max.y));
 const groups:{x:number;y:number;z:number}[]=[];
 for(let i=0;i<p.count;i++){
  const x=p.getX(i)/hw,y=p.getY(i)/hd,z=p.getZ(i);
  if(Math.hypot(x,y)>.78||z<box.max.z*.8||[...adjacent[i]].some(j=>p.getZ(j)>z+1e-7))continue;
  if(!groups.some(peak=>Math.hypot(peak.x-x,peak.y-y)<.20))groups.push({x,y,z});
 }
 return groups;
}
function volume(geometry:THREE.BufferGeometry){
 const p=geometry.getAttribute('position'),idx=geometry.index!,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();let sum=0;
 for(let i=0;i<idx.count;i+=3){a.fromBufferAttribute(p,idx.getX(i));b.fromBufferAttribute(p,idx.getX(i+1));c.fromBufferAttribute(p,idx.getX(i+2));sum+=a.dot(b.cross(c))/6;}
 return sum;
}
let checked=0;
for(const code of ['11','13','14','16','24','25','31','35','36','37','46','47'])for(const form of CAD_TOOTH_FORM_OPTIONS){
 const geometry=createRestorationGeometry(12,code,'anatomic_crown',form.value,'balanced'),qc=analyzeCadMesh(geometry),p=geometry.getAttribute('position'),box=geometry.boundingBox!;
 assert.equal(qc.watertight,true,code+'/'+form.value);assert.equal(qc.connectedComponents,1);assert.equal(qc.degenerateTriangles,0);assert.equal(qc.inconsistentWindingEdges,0);assert.equal(qc.eulerCharacteristic,2);assert.ok(volume(geometry)>0);
 assert.equal(box.min.z,0,'A crown begins at its cervical plane, never at a sphere tip or root');
 const base=Array.from({length:p.count},(_,i)=>i).filter(i=>p.getZ(i)===0),rim=base.filter(i=>Math.hypot(p.getX(i),p.getY(i))>1e-5);
 assert.ok(rim.length>=48,'The preparation has a continuous full-size neck rim');assert.equal(base.length-rim.length,1,'A single center fan closes the base without stacked cap rows');
 assert.ok(rim.every(i=>Math.hypot(p.getX(i),p.getY(i))>Math.min(qc.boundingSizeMm.x,qc.boundingSizeMm.y)*.23),'The cervical end is not a tiny pole');
 assert.ok(box.max.z<12&&box.max.z>4,'Starting crown height stays in a bounded anatomical range');
 geometry.dispose();checked++;
}
let restorationVariants=0;
for(const code of ['11','14','16','46'])for(const type of CAD_RESTORATION_OPTIONS)for(const form of ['natural','youthful','worn'] as const){
 const geometry=createRestorationGeometry(12,code,type.value,form,'strong'),qc=analyzeCadMesh(geometry);
 assert.equal(qc.watertight,true,type.value+'/'+code);assert.equal(qc.degenerateTriangles,0);assert.equal(qc.connectedComponents,1);assert.equal(qc.inconsistentWindingEdges,0);assert.ok(volume(geometry)>0);assert.equal(geometry.boundingBox!.min.z,0);
 assert.ok(Array.from(geometry.getAttribute('position').array).every(Number.isFinite));geometry.dispose();restorationVariants++;
}
for(const [code,count] of [['13',1],['14',2],['35',3],['16',4],['36',5],['37',4],['46',5]] as const){
 const geometry=createRestorationGeometry(12,code,'anatomic_crown','natural','balanced');
 const found=peaks(geometry);assert.equal(found.length,count,code+' has the correct separated principal cusp count instead of one central dome');
 if(count>=2){const top=geometry.boundingBox!.max.z,p=geometry.getAttribute('position'),center=p.getZ(p.count-1);assert.ok(center<top*.85,'The central basin lies below the principal cusps');}
 geometry.dispose();
}
const incisor=createRestorationGeometry(12,'11','anatomic_crown','natural','balanced'),canine=createRestorationGeometry(12,'13','anatomic_crown','natural','balanced');
const incisalPeaks=peaks(incisor);assert.ok(incisalPeaks.some(p=>p.x<-.35)&&incisalPeaks.some(p=>p.x>.35),'An incisal edge spans mesial/distal with mild lobes, not a pointed cone');assert.equal(peaks(canine).length,1);
const molar=createRestorationGeometry(12,'46','anatomic_crown','natural','balanced'),coping=createRestorationGeometry(12,'46','coping','natural','balanced');
const crownSize=molar.boundingBox!.getSize(new THREE.Vector3()),copingSize=coping.boundingBox!.getSize(new THREE.Vector3());
const surfaceMesh=new THREE.Mesh(molar,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));surfaceMesh.updateMatrixWorld();
const ray=new THREE.Raycaster();
function topAt(x:number,y:number){ray.set(new THREE.Vector3(x*crownSize.x/2,y*crownSize.y/2,crownSize.z+1),new THREE.Vector3(0,0,-1));const hit=ray.intersectObject(surfaceMesh,false)[0];assert.ok(hit,'The occlusal table has no holes');return hit.point.z;}
assert.ok(topAt(.30,.20)>topAt(.30,0)+.3,'The central developmental groove lies below its adjacent cusp inclines');
assert.ok(topAt(0,.20)>topAt(0,0)+.3,'The central fossa is an actual basin, not a shaded mark');
assert.ok(topAt(.5,.5)-topAt(.65,.5)<1,'Cusps have rounded neighboring inclines instead of isolated tall spikes');
surfaceMesh.material.dispose();
assert.ok(crownSize.z/crownSize.x>.5&&crownSize.z/crownSize.x<.9,'A posterior crown is not a tall narrow spike');
assert.ok(copingSize.z<crownSize.z*.85&&copingSize.z>crownSize.z*.45,'The coping has a reduced, bounded coronal body');
const copied=createRestorationGeometry(12,'46','anatomic_crown','natural','balanced');assert.deepEqual(Array.from(copied.getAttribute('position').array),Array.from(molar.getAttribute('position').array),'Anatomical geometry is deterministic');
for(const geometry of [incisor,canine,molar,coping,copied])geometry.dispose();
console.log(JSON.stringify({pass:true,checkedMeshes:checked,restorationVariants,restorationTypes:CAD_RESTORATION_OPTIONS.length,flatCervicalRim:true,crownOnlyDimensions:true,anteriorIncisalEdge:true,canineSingleCusp:true,premolarTwoAndThreeCusps:true,molarFourAndFiveCusps:true,centralFossaeAndGrooves:true,closedSingleBodies:true,outwardWinding:true,deterministic:true,patientSpecificClinicalValidation:false},null,2));
