import * as THREE from 'three';
import {STLLoader} from 'three/examples/jsm/loaders/STLLoader.js';
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {repairCadMesh} from './cad-mesh-repair-engine';
import {analyzeCadMesh} from './cad-mesh-qc';
import {captureCadGeometry,restoreCadGeometry,encodeCadWorkspace,decodeCadWorkspace,type CadWorkspaceRecord} from './cad-project-state';
import type {CadRestorationDesignType} from './cad-job-setup';

export type CadLibraryForm={version:1;id:string;name:string;toothCode:string;createdAt:number;sourceName:string;sha256:string;sizeMm:[number,number,number];vertexCount:number;triangleCount:number;geometry:CadWorkspaceRecord};
export type CadFormImportOptions={scale:number;axis:'+Z'|'-Z'|'+Y'|'-Y'|'+X'|'-X';rotation:number};
export const CAD_FORM_MAX_FILE_BYTES=20*1024*1024;
export const CAD_FORM_AXES=['+Z','-Z','+Y','-Y','+X','-X'] as const;
const validId=(id:unknown):id is string=>typeof id==='string'&&/^form-[0-9a-f-]{36}$/.test(id);
export const validCadFormCode=(code:unknown):code is string=>typeof code==='string'&&/^[1-4][1-8]$/.test(code);
export function isCadLibraryForm(value:unknown):value is CadLibraryForm{
 const f=value as CadLibraryForm;
 return Boolean(f&&f.version===1&&validId(f.id)&&typeof f.name==='string'&&f.name.trim().length>0&&f.name.length<=120&&validCadFormCode(f.toothCode)&&Number.isFinite(f.createdAt)&&typeof f.sourceName==='string'&&f.sourceName.length<=240&&/^[a-f0-9]{64}$/.test(f.sha256)&&Array.isArray(f.sizeMm)&&f.sizeMm.length===3&&f.sizeMm.every(n=>Number.isFinite(n)&&n>=.05&&n<=50)&&Number.isInteger(f.vertexCount)&&f.vertexCount>=4&&f.vertexCount<=100000&&Number.isInteger(f.triangleCount)&&f.triangleCount>=4&&f.triangleCount<=200000&&f.geometry?.version===1&&f.geometry.encoding==='gzip-base64'&&typeof f.geometry.data==='string'&&f.geometry.data.length<=8000000);
}
export function readProjectCadForms(value:unknown):Record<string,CadLibraryForm>{
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 const entries=Object.entries(value);if(entries.length>32)throw Error('CAD_FORM_LIMIT');
 if(entries.some(([id,f])=>!isCadLibraryForm(f)||id!==f.id))throw Error('CAD_FORM_INVALID');
 return Object.fromEntries(entries);
}
export async function cadFormFingerprint(geometry:THREE.BufferGeometry){
 const g=captureCadGeometry(geometry),bytes=new Uint8Array((g.positions.length+g.indices.length)*4),view=new DataView(bytes.buffer);
 g.positions.forEach((v,i)=>view.setFloat32(i*4,v,true));g.indices.forEach((v,i)=>view.setUint32((g.positions.length+i)*4,v,true));
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
}
export function parseCadFormFile(bytes:ArrayBuffer,fileName:string){
 if(bytes.byteLength===0||bytes.byteLength>CAD_FORM_MAX_FILE_BYTES)throw Error('CAD_FORM_FILE_SIZE');
 if(/\.stl$/i.test(fileName)){
  const text=new TextDecoder().decode(new Uint8Array(bytes,0,Math.min(512,bytes.byteLength)));
  const ascii=/^\s*solid\b/i.test(text)&&/\bfacet\s+normal\b/i.test(text);
  if(!ascii&&(bytes.byteLength<84||84+new DataView(bytes).getUint32(80,true)*50!==bytes.byteLength))throw Error('CAD_FORM_INVALID');
  return new STLLoader().parse(bytes);
 }
 if(!/\.obj$/i.test(fileName))throw Error('CAD_FORM_FILE_TYPE');
 const group=new OBJLoader().parse(new TextDecoder().decode(bytes)),parts:THREE.BufferGeometry[]=[];
 try{
  group.updateMatrixWorld(true);group.traverse(object=>{if(!(object instanceof THREE.Mesh))return;const g=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();for(const attr of Object.keys(g.attributes))if(attr!=='position')g.deleteAttribute(attr);g.applyMatrix4(object.matrixWorld);parts.push(g);});
  if(!parts.length)throw Error('CAD_FORM_INVALID');const merged=mergeGeometries(parts,false);if(!merged)throw Error('CAD_FORM_INVALID');return merged;
 }finally{parts.forEach(g=>g.dispose());group.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m.dispose());}});}
}
export function prepareCadFormGeometry(source:THREE.BufferGeometry,options:CadFormImportOptions){
 const positions=source.getAttribute('position');if(!positions||positions.count<4||positions.count>600000)throw Error('CAD_FORM_FILE_SIZE');
 if(!Number.isFinite(options.scale)||options.scale<=0||options.scale>1000||!Number.isFinite(options.rotation)||!CAD_FORM_AXES.includes(options.axis))throw Error('CAD_FORM_INVALID');
 for(let i=0;i<positions.array.length;i++)if(!Number.isFinite(positions.array[i])||Math.abs(positions.array[i])>1e8)throw Error('CAD_FORM_INVALID');
 const raw=source.clone();for(const attr of Object.keys(raw.attributes))if(attr!=='position')raw.deleteAttribute(attr);
 const axis=({'+Z':[0,0,1],'-Z':[0,0,-1],'+Y':[0,1,0],'-Y':[0,-1,0],'+X':[1,0,0],'-X':[-1,0,0]} as const)[options.axis];
 raw.scale(options.scale,options.scale,options.scale);raw.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...axis),new THREE.Vector3(0,0,1)));raw.rotateZ(options.rotation*Math.PI/180);
 const result=repairCadMesh(raw,{weldToleranceMm:1e-5,removeDegenerate:true,orientOutward:true});raw.dispose();
 const geometry=result.geometry;geometry.computeBoundingBox();const box=geometry.boundingBox!,size=box.getSize(new THREE.Vector3());
 if(!result.after.watertight||result.after.connectedComponents!==1||result.after.degenerateTriangles||result.after.inconsistentWindingEdges||geometry.getAttribute('position').count>100000||result.after.triangleCount>200000){geometry.dispose();throw Error('CAD_FORM_NOT_SOLID');}
 if(![size.x,size.y,size.z].every(v=>Number.isFinite(v)&&v>=.05&&v<=50)){geometry.dispose();throw Error('CAD_FORM_DIMENSIONS');}
 geometry.translate(-(box.min.x+box.max.x)/2,-(box.min.y+box.max.y)/2,-box.min.z);geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
export async function createCadLibraryForm(geometry:THREE.BufferGeometry,input:{name:string;toothCode:string;sourceName:string}):Promise<CadLibraryForm>{
 if(!input.name.trim()||input.name.trim().length>120||!validCadFormCode(input.toothCode))throw Error('CAD_FORM_INVALID');
 const qc=analyzeCadMesh(geometry);if(!qc.watertight||qc.connectedComponents!==1||qc.degenerateTriangles)throw Error('CAD_FORM_NOT_SOLID');
 geometry.computeBoundingBox();const size=geometry.boundingBox!.getSize(new THREE.Vector3()),state=captureCadGeometry(geometry),id='form-'+crypto.randomUUID();
 const form:CadLibraryForm={version:1,id,name:input.name.trim(),toothCode:input.toothCode,sourceName:input.sourceName.slice(0,240),createdAt:Date.now(),sha256:await cadFormFingerprint(geometry),sizeMm:size.toArray() as [number,number,number],vertexCount:qc.vertexCount,triangleCount:qc.triangleCount,geometry:await encodeCadWorkspace({version:1,sourceKey:id,units:{form:{key:id,geometry:state,base:[...state.positions],anchor:{position:[0,0,0],quaternion:[0,0,0,1],placed:false}}}})};
 if(!isCadLibraryForm(form))throw Error('CAD_FORM_INVALID');return form;
}
export async function decodeCadLibraryForm(form:CadLibraryForm){
 if(!isCadLibraryForm(form))throw Error('CAD_FORM_INVALID');const snapshot=await decodeCadWorkspace(form.geometry);
 if(!snapshot||snapshot.sourceKey!==form.id||Object.keys(snapshot.units).length!==1||!snapshot.units.form)throw Error('CAD_FORM_INVALID');
 const geometry=restoreCadGeometry(snapshot.units.form.geometry);
 try{
  const qc=analyzeCadMesh(geometry),size=geometry.boundingBox!.getSize(new THREE.Vector3());
  if(qc.vertexCount!==form.vertexCount||qc.triangleCount!==form.triangleCount||!qc.watertight||qc.connectedComponents!==1||qc.degenerateTriangles||qc.inconsistentWindingEdges||size.toArray().some((v,i)=>Math.abs(v-form.sizeMm[i])>.001)||await cadFormFingerprint(geometry)!==form.sha256)throw Error('CAD_FORM_INVALID');
  return geometry;
 }catch(error){geometry.dispose();throw error;}
}
export function cadLibraryGeometryForRestoration(source:THREE.BufferGeometry,type:CadRestorationDesignType){
 const g=source.clone();g.computeBoundingBox();const height=g.boundingBox!.max.z-g.boundingBox!.min.z,p=g.getAttribute('position');
 for(let i=0;i<p.count;i++){
  let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const t=THREE.MathUtils.clamp(z/height,0,1);
  if(type==='coping'){const axial=THREE.MathUtils.lerp(.82,.9,t);x*=axial;y*=axial;z*=.8;}
  else if(type==='cutback_crown'||type==='reduced_pontic'){x*=.89;y*=.89;z*=.87;}
  else if(type==='framework'){x*=.84;y*=.84;z*=.82;}
  if(type==='temporary_crown'||type==='temporary_pontic'){x*=1.012;y*=1.012;z*=.985;}
  if(type==='veneer'){y*=y>0?.52:.28;x*=.98;}
  if(type==='inlay_onlay'){z=z*.48+height*.2;x*=.88;y*=.88;}
  p.setXYZ(i,x,y,z);
 }
 p.needsUpdate=true;g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
}
const DB='dentaya-cad-form-library',STORE='forms';
type StoredForm={ownerId:string;form:CadLibraryForm};
function openDb(){return new Promise<IDBDatabase>((resolve,reject)=>{if(typeof indexedDB==='undefined'){reject(Error('CAD_FORM_STORAGE'));return;}const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{const s=r.result.createObjectStore(STORE,{keyPath:['ownerId','form.id']});s.createIndex('ownerId','ownerId');};r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('CAD_FORM_STORAGE'));r.onsuccess=()=>resolve(r.result);});}
async function transaction<T>(mode:IDBTransactionMode,action:(store:IDBObjectStore,stage:(result:T)=>void)=>void){
 const db=await openDb();return new Promise<T>((resolve,reject)=>{let result:T;const tx=db.transaction(STORE,mode);tx.oncomplete=()=>{db.close();resolve(result);};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error??Error('CAD_FORM_STORAGE'));};try{action(tx.objectStore(STORE),r=>{result=r;});}catch(error){tx.abort();db.close();reject(error);}});
}
export async function listCadLibraryForms(ownerId:string){if(!ownerId)return [];return transaction<CadLibraryForm[]>('readonly',(s,stage)=>{const r=s.index('ownerId').getAll(ownerId);r.onsuccess=()=>stage((r.result as StoredForm[]).map(v=>v.form).filter(isCadLibraryForm).sort((a,b)=>b.createdAt-a.createdAt));});}
export async function saveCadLibraryForms(ownerId:string,forms:CadLibraryForm[]){
 if(!ownerId||forms.length>100||forms.some(f=>!isCadLibraryForm(f)))throw Error('CAD_FORM_INVALID');
 await transaction<void>('readwrite',s=>{for(const form of forms)s.put({ownerId,form});});
}
export async function deleteCadLibraryForm(ownerId:string,id:string){if(!ownerId||!validId(id))throw Error('CAD_FORM_INVALID');await transaction<void>('readwrite',s=>{s.delete([ownerId,id]);});}
export function exportCadFormLibrary(forms:CadLibraryForm[]){if(forms.length>100||forms.some(f=>!isCadLibraryForm(f)))throw Error('CAD_FORM_INVALID');const text=JSON.stringify({kind:'dentaya-form-library',version:1,forms});if(new TextEncoder().encode(text).byteLength>50*1024*1024)throw Error('CAD_FORM_FILE_SIZE');return text;}
export async function importCadFormLibrary(text:string){
 if(text.length>50*1024*1024)throw Error('CAD_FORM_FILE_SIZE');const value=JSON.parse(text);
 if(value?.kind!=='dentaya-form-library'||value.version!==1||!Array.isArray(value.forms)||value.forms.length<1||value.forms.length>100||value.forms.some((f:unknown)=>!isCadLibraryForm(f))||new Set(value.forms.map((f:CadLibraryForm)=>f.id)).size!==value.forms.length)throw Error('CAD_FORM_INVALID');
 for(const form of value.forms){const g=await decodeCadLibraryForm(form);g.dispose();}return value.forms as CadLibraryForm[];
}
