import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import * as THREE from 'three';
import {STLExporter} from 'three/examples/jsm/exporters/STLExporter.js';
import {OBJExporter} from 'three/examples/jsm/exporters/OBJExporter.js';
import {parseCadFormFile,prepareCadFormGeometry,createCadLibraryForm,decodeCadLibraryForm,listCadLibraryForms,saveCadLibraryForms,deleteCadLibraryForm,exportCadFormLibrary,importCadFormLibrary,cadLibraryGeometryForRestoration,readProjectCadForms} from '../src/lib/cad-form-library';
import {placeCadCrownOnMargin} from '../src/lib/cad-margin-placement';
import {analyzeCadMesh} from '../src/lib/cad-mesh-qc';
const idb=await import(process.env.DENTAYA_FAKE_IDB_MODULE?pathToFileURL(process.env.DENTAYA_FAKE_IDB_MODULE).href:'fake-indexeddb');Object.assign(globalThis,{indexedDB:idb.indexedDB,IDBKeyRange:idb.IDBKeyRange});
const mesh=new THREE.Mesh(new THREE.BoxGeometry(8,9,10,2,2,2));mesh.position.set(10,-3,7);mesh.updateMatrixWorld(true);
const ascii=new STLExporter().parse(mesh),binary=new STLExporter().parse(mesh,{binary:true});const obj=new OBJExporter().parse(mesh);
const bytes=(s:string)=>new TextEncoder().encode(s).buffer;
let asset;
for(const [name,data] of [['test.stl',bytes(ascii)],['binary.stl',binary.buffer],['test.obj',bytes(obj)]] as [string,ArrayBuffer][]){
 const parsed=parseCadFormFile(data,name),g=prepareCadFormGeometry(parsed,{scale:1,axis:'+Z',rotation:0});const f=await createCadLibraryForm(g,{name:'Technician 46',toothCode:'46',sourceName:name});const decoded=await decodeCadLibraryForm(f);assert.deepEqual(Array.from(decoded.getAttribute('position').array),Array.from(g.getAttribute('position').array));assert.deepEqual(f.sizeMm,[8,9,10]);const before=Array.from(g.getAttribute('position').array);
 const points=Array.from({length:32},(_,i)=>({x:12+2*Math.cos(i*Math.PI/16),y:-5+2*Math.sin(i*Math.PI/16),z:1.2}));const placed=placeCadCrownOnMargin(decoded,points,new THREE.Vector3(0,0,1));assert.ok(placed);assert.ok(Math.abs(placed.position.z-1.2)<1e-6);assert.deepEqual(Array.from(g.getAttribute('position').array),before);assert.ok(analyzeCadMesh(decoded).watertight);
 const coping=cadLibraryGeometryForRestoration(g,'coping');assert.ok(analyzeCadMesh(coping).watertight);coping.dispose();decoded.dispose();parsed.dispose();g.dispose();asset=f;
}
assert.ok(asset);await saveCadLibraryForms('technician-a',[asset]);assert.equal((await listCadLibraryForms('technician-a')).length,1);assert.equal((await listCadLibraryForms('technician-b')).length,0);
const exported=exportCadFormLibrary(await listCadLibraryForms('technician-a'));const imported=await importCadFormLibrary(exported);await saveCadLibraryForms('technician-b',imported);assert.equal((await listCadLibraryForms('technician-b'))[0].sha256,asset.sha256);
await deleteCadLibraryForm('technician-a',asset.id);assert.equal((await listCadLibraryForms('technician-a')).length,0);const standalone=await decodeCadLibraryForm(readProjectCadForms({[asset.id]:asset})[asset.id]);assert.ok(standalone);standalone.dispose();assert.equal((await listCadLibraryForms('technician-b')).length,1);
await assert.rejects(decodeCadLibraryForm({...asset,sha256:'f'.repeat(64)}));await assert.rejects(importCadFormLibrary(exported.replace('dentaya-form-library','other')));assert.throws(()=>parseCadFormFile(bytes('not a mesh'),'evil.svg'));
const plane=new THREE.PlaneGeometry(5,5);assert.throws(()=>prepareCadFormGeometry(plane,{scale:1,axis:'+Z',rotation:0}),/CAD_FORM_NOT_SOLID/);plane.dispose();
const pair=mesh.geometry.clone();const shifted=mesh.geometry.clone();shifted.translate(30,0,0);const {mergeGeometries}=await import('three/examples/jsm/utils/BufferGeometryUtils.js');const disconnected=mergeGeometries([pair,shifted]);assert.throws(()=>prepareCadFormGeometry(disconnected,{scale:1,axis:'+Z',rotation:0}),/CAD_FORM_NOT_SOLID/);[pair,shifted,disconnected,mesh.geometry].forEach(g=>g.dispose());
console.log(JSON.stringify({pass:true,asciiAndBinaryStl:true,obj:true,exactGeometryRoundTrip:true,marginPlacementUsesImportedMesh:true,closedSingleBodies:true,committedLocalPersistence:true,ownerIsolation:true,libraryExportImport:true,projectCopySurvivesLibraryDeletion:true,corruptRecordsAndOpenMeshesRejected:true},null,2));
