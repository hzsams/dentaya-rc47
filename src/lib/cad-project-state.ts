import * as THREE from 'three';
import type { CrownShellReport } from './cad-crown-shell-engine';

export type CadGeometryState={positions:number[];indices:number[]};
export type CadUnitGeometryState={key:string;geometry:CadGeometryState;base:number[];placementBase?:number[];anchor:{position:number[];quaternion:number[];placed:boolean;marginKey?:string};shell?:CadGeometryState;shellReport?:CrownShellReport};
type PackedGeometry={positions:string;indices:string};
type PackedUnit=Omit<CadUnitGeometryState,'geometry'|'base'|'placementBase'|'shell'>&{geometry:PackedGeometry;base:string;placementBase?:string;shell?:PackedGeometry};
type PackedSnapshot=Omit<CadWorkspaceSnapshot,'units'|'sources'>&{arrayEncoding:'f32-u32-base64';units:Record<string,PackedUnit>;sources?:Record<string,Record<string,PackedUnit>>};
export type CadWorkspaceSnapshot={version:1;sourceKey:string;units:Record<string,CadUnitGeometryState>;sources?:Record<string,Record<string,CadUnitGeometryState>>};
export type CadWorkspaceRecord={version:1;encoding:'gzip-base64';data:string;savedAt:number};
/** PostgreSQL JSONB may reorder object keys; arrays and values must still match. */
export function sameCadJson(left:unknown,right:unknown){
 const canonical=(value:unknown)=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a<b?-1:a>b?1:0)):item);
 return canonical(left)===canonical(right);
}
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64(bytes:Uint8Array){let result='';for(let i=0;i<bytes.length;i+=3){const a=bytes[i],b=bytes[i+1],c=bytes[i+2];result+=alphabet[a>>2]+alphabet[((a&3)<<4)|((b??0)>>4)]+(b===undefined?'=':alphabet[((b&15)<<2)|((c??0)>>6)])+(c===undefined?'=':alphabet[c&63]);}return result;}
function unbase64(value:string){if(value.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(value))throw Error('CAD_RECORD_INVALID');const bytes=new Uint8Array(value.length/4*3-(value.endsWith('==')?2:value.endsWith('=')?1:0));let k=0;for(let i=0;i<value.length;i+=4){const a=alphabet.indexOf(value[i]),b=alphabet.indexOf(value[i+1]),c=alphabet.indexOf(value[i+2]),d=alphabet.indexOf(value[i+3]);bytes[k++]=(a<<2)|(b>>4);if(k<bytes.length)bytes[k++]=((b&15)<<4)|(c>>2);if(k<bytes.length)bytes[k++]=((c&3)<<6)|d;}return bytes;}
async function readBounded(stream:ReadableStream<Uint8Array>,limit:number){const reader=stream.getReader(),chunks:Uint8Array[]=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw Error('CAD_RECORD_TOO_LARGE');chunks.push(value);}const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;}finally{await reader.cancel().catch(()=>{});}}
function validGeometry(value:unknown):value is CadGeometryState{const g=value as CadGeometryState;return Boolean(g&&Array.isArray(g.positions)&&g.positions.length>=12&&g.positions.length<=300000&&g.positions.length%3===0&&g.positions.every(v=>Number.isFinite(v)&&Math.abs(v)<1e6)&&Array.isArray(g.indices)&&g.indices.length>=12&&g.indices.length<=1800000&&g.indices.length%3===0&&g.indices.every(v=>Number.isInteger(v)&&v>=0&&v<g.positions.length/3));}
function validShellReport(report: unknown): report is CrownShellReport {
 const r=report as CrownShellReport;
 if(!r||typeof r!=='object'||!r.qc||typeof r.qc.watertight!=='boolean')return false;
 const strings=(values:unknown)=>Array.isArray(values)&&values.length<=32&&values.every(v=>typeof v==='string'&&v.length<=2000);
 const numeric=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<1e12;
 const summary=['outerVertexCount','innerVertexCount','triangleCount','boundaryEdgeCountBeforeStitch','fittedInnerVertices','averageFitGapMm','minimumWallEstimateMm','maximumWallEstimateMm'] as const;
 const qc=['vertexCount','uniqueVertexCount','triangleCount','degenerateTriangles','boundaryEdges','nonManifoldEdges','surfaceAreaMm2','boundaryLoops','openBoundaryChains','connectedComponents','inconsistentWindingEdges','isolatedVertices','eulerCharacteristic'] as const;
 return summary.every(k=>numeric(r[k]))&&qc.every(k=>numeric(r.qc[k]))&&r.qc.boundingSizeMm&&['x','y','z'].every(k=>numeric(r.qc.boundingSizeMm[k as 'x'|'y'|'z']))&&strings(r.warnings)&&strings(r.qc.warnings);
}
export function validateCadWorkspace(value:unknown):value is CadWorkspaceSnapshot{
 const s=value as CadWorkspaceSnapshot;if(!s||s.version!==1||typeof s.sourceKey!=='string'||s.sourceKey.length>1200||!s.units||typeof s.units!=='object'||Array.isArray(s.units))return false;
 const sources=s.sources?Object.entries(s.sources):[];if(sources.length>16||sources.some(([key,units])=>key==='__proto__'||key==='constructor'||key.length>1200||!units||typeof units!=='object'))return false;
 const sets=[s.units,...sources.map(([,units])=>units)];if(sets.some(units=>Object.keys(units).length>32))return false;
 return sets.flatMap(units=>Object.entries(units)).every(([id,u])=>id!=='__proto__'&&id!=='constructor'&&id.length<160&&u&&typeof u.key==='string'&&u.key.length<300&&validGeometry(u.geometry)&&Array.isArray(u.base)&&u.base.length===u.geometry.positions.length&&u.base.every(v=>Number.isFinite(v)&&Math.abs(v)<1e6)&&(!u.placementBase||(Array.isArray(u.placementBase)&&u.placementBase.length===u.base.length&&u.placementBase.every(v=>Number.isFinite(v)&&Math.abs(v)<1e6)))&&u.anchor&&Array.isArray(u.anchor.position)&&u.anchor.position.length===3&&u.anchor.position.every(v=>Number.isFinite(v)&&Math.abs(v)<1e6)&&Array.isArray(u.anchor.quaternion)&&u.anchor.quaternion.length===4&&u.anchor.quaternion.every(Number.isFinite)&&Math.abs(Math.hypot(...u.anchor.quaternion)-1)<.01&&typeof u.anchor.placed==='boolean'&&(!u.anchor.marginKey||(typeof u.anchor.marginKey==='string'&&u.anchor.marginKey.length<=16))&&(!u.shell||validGeometry(u.shell))&&(!u.shellReport||(Boolean(u.shell)&&validShellReport(u.shellReport))));
}
function packNumbers(values:number[],integer=false){const bytes=new Uint8Array(values.length*4),view=new DataView(bytes.buffer);for(let i=0;i<values.length;i++)if(integer)view.setUint32(i*4,values[i],true);else view.setFloat32(i*4,values[i],true);return base64(bytes);}
function packedSnapshot(snapshot:CadWorkspaceSnapshot):PackedSnapshot{
 const geometry=(g:CadGeometryState)=>({positions:packNumbers(g.positions),indices:packNumbers(g.indices,true)});
 const units=(values:Record<string,CadUnitGeometryState>):Record<string,PackedUnit>=>Object.fromEntries(Object.entries(values).map(([id,u])=>{const {geometry:g,base,placementBase,shell,...rest}=u;return [id,{...rest,geometry:geometry(g),base:packNumbers(base),...(placementBase?{placementBase:packNumbers(placementBase)}:{}),...(shell?{shell:geometry(shell)}:{})}];}));
 return {...snapshot,arrayEncoding:'f32-u32-base64',units:units(snapshot.units),sources:snapshot.sources?Object.fromEntries(Object.entries(snapshot.sources).map(([key,u])=>[key,units(u)])):undefined};
}
function unpackSnapshot(value:unknown):unknown{
 const raw=value as ReturnType<typeof packedSnapshot>;
 if(!raw||raw.arrayEncoding!=='f32-u32-base64')return raw;
 let total=0;
 const numbers=(encoded:string,integer=false)=>{if(typeof encoded!=='string'||encoded.length>9600000)throw Error('CAD_RECORD_INVALID');const bytes=unbase64(encoded);total+=bytes.length;if(bytes.length%4||total>24000000)throw Error('CAD_RECORD_TOO_LARGE');const view=new DataView(bytes.buffer);return Array.from({length:bytes.length/4},(_,i)=>integer?view.getUint32(i*4,true):view.getFloat32(i*4,true));};
 const geometry=(g:{positions:string;indices:string})=>({positions:numbers(g.positions),indices:numbers(g.indices,true)});
 const units=(values:ReturnType<typeof packedSnapshot>['units'])=>Object.fromEntries(Object.entries(values).map(([id,u])=>[id,{...u,geometry:geometry(u.geometry),base:numbers(u.base),...(u.placementBase?{placementBase:numbers(u.placementBase)}:{}),...(u.shell?{shell:geometry(u.shell)}:{})}]));
 return {version:raw.version,sourceKey:raw.sourceKey,units:units(raw.units),...(raw.sources?{sources:Object.fromEntries(Object.entries(raw.sources).map(([key,u])=>[key,units(u)]))}:{})};
}
export async function encodeCadWorkspace(snapshot:CadWorkspaceSnapshot):Promise<CadWorkspaceRecord>{
 if(!validateCadWorkspace(snapshot))throw Error('CAD_RECORD_INVALID');const raw=new TextEncoder().encode(JSON.stringify(packedSnapshot(snapshot)));if(raw.length>40000000)throw Error('CAD_RECORD_TOO_LARGE');
 const data=await readBounded(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip')),6000000);
 return {version:1,encoding:'gzip-base64',data:base64(data),savedAt:Date.now()};
}
export async function decodeCadWorkspace(record:unknown):Promise<CadWorkspaceSnapshot|null>{
 const r=record as CadWorkspaceRecord;if(!r||r.version!==1||r.encoding!=='gzip-base64'||typeof r.data!=='string'||r.data.length>8000000)return null;
 try{const bytes=await readBounded(new Blob([unbase64(r.data)]).stream().pipeThrough(new DecompressionStream('gzip')),40000000);const snapshot=unpackSnapshot(JSON.parse(new TextDecoder().decode(bytes)));return validateCadWorkspace(snapshot)?snapshot:null;}catch{return null;}
}
export function captureCadGeometry(geometry:THREE.BufferGeometry):CadGeometryState{return {positions:Array.from(geometry.getAttribute('position').array),indices:geometry.index?Array.from(geometry.index.array):Array.from({length:geometry.getAttribute('position').count},(_,i)=>i)};}
export function restoreCadGeometry(state:CadGeometryState){if(!validGeometry(state))throw Error('CAD_RECORD_INVALID');const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(state.positions,3));g.setIndex(state.indices);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;}
