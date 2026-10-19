import * as THREE from 'three';
import {normalizeToothAppearance, type ToothAppearance} from './tooth-appearance';
type Part={vertexCount:number;indexCount:number;positions:number;indices:number;bytes:number};
export async function loadToothAnatomy(signal:AbortSignal):Promise<Record<string,THREE.BufferGeometry>>{
 const response=await fetch('/tooth-anatomy/atlas.json',{signal});if(!response.ok)throw new Error('Anatomi yüklenemedi');
 const atlas=await response.json() as Record<string,Part>;
 const entries=await Promise.all(Object.entries(atlas).map(async([code,p])=>{
  const result=await fetch(`/tooth-anatomy/${code}.bin`,{signal});if(!result.ok)throw new Error('Diş modeli yüklenemedi');const buffer=await result.arrayBuffer();if(buffer.byteLength!==p.bytes)throw new Error('Eksik diş modeli');
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(buffer,p.positions,p.vertexCount*3).slice(),3));geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(buffer,p.indices,p.indexCount).slice(),1));geometry.computeBoundingBox();const box=geometry.boundingBox!;geometry.translate(-(box.min.x+box.max.x)/2,Number(code[0])<3?-box.min.y:-box.max.y,-(box.min.z+box.max.z)/2);geometry.scale(1000,1000,1000);geometry.computeVertexNormals();return [code,geometry] as const;
 }));
 const geometries=Object.fromEntries(entries);for(const q of ['1','2','3','4'])geometries[q+'8']=geometries[q+'7'].clone().scale(.91,.94,.91);return geometries;
}

// Display-only variants of the reference anatomy. Never used as export/restoration meshes.
export function toothDisplayForm(source:THREE.BufferGeometry,form:string,options:Partial<ToothAppearance>={}){
 const p=normalizeToothAppearance({...options,form}),geometry=source.clone(),position=geometry.getAttribute('position');
 source.computeBoundingBox();
 const halfWidth=Math.max(.1,(source.boundingBox!.max.x-source.boundingBox!.min.x)/2);
 const halfDepth=Math.max(.1,(source.boundingBox!.max.z-source.boundingBox!.min.z)/2);
 const height=p.crownHeight/100*(p.form==='compact'?.84:p.form==='youthful'?1.08:p.form==='worn'?.9:1);
 const root=p.rootLength/100,relief=p.cuspRelief/100*(p.form==='youthful'?1.12:p.form==='worn'?.72:1);
 const wear=p.wear/100+(p.form==='worn'?.15:0);
 const tint=new Float32Array(position.count*3),rootColor=new THREE.Color('#cab796');
 const sign=source.boundingBox!.max.y>-source.boundingBox!.min.y?1:-1;
 for(let i=0;i<position.count;i++){
  const y=position.getY(i),a=Math.abs(y),blend=1-THREE.MathUtils.smoothstep(a,8,14);
  let x=position.getX(i),z=position.getZ(i);
  const width=p.width/100*(p.form==='broad'?1.16:p.form==='slender'?.86:p.form==='square'?1.08:1);
  const depth=p.depth/100*(p.form==='broad'?1.07:p.form==='slender'?.94:1);
  if(p.form==='square'||p.form==='oval'){
   const exponent=p.form==='square'?.88:1.15;
   x=THREE.MathUtils.lerp(x,Math.sign(x)*halfWidth*Math.pow(Math.abs(x)/halfWidth,exponent),blend);
   z=THREE.MathUtils.lerp(z,Math.sign(z)*halfDepth*Math.pow(Math.abs(z)/halfDepth,exponent),blend);
  }
  const taper=p.form==='triangular'?1.12-.27*THREE.MathUtils.smoothstep(a,0,9):1;
  x*=1+(width*taper-1)*blend;z*=1+(depth-1)*blend;
  let crown=a<3.5?3.5+(a-3.5)*relief:a;
  crown+=Math.max(0,9-crown)*wear*.3;
  const shapedY=a<=9?crown*height:9*height+(a-9)*root;
  position.setXYZ(i,x,sign*shapedY,z);
  const blendTint=THREE.MathUtils.smoothstep(a,8,16)*.55;
  tint[i*3]=1+(rootColor.r-1)*blendTint;tint[i*3+1]=1+(rootColor.g-1)*blendTint;tint[i*3+2]=1+(rootColor.b-1)*blendTint;
 }
 geometry.setAttribute('color',new THREE.BufferAttribute(tint,3));geometry.userData.crownLimit=9*height;
 position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();return geometry;
}
