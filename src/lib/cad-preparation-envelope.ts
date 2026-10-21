import * as THREE from 'three';
import type {CadMarginPlacement} from './cad-margin-placement';

type Point={x:number;y:number;z:number};
/** Initial outer-form sizing against the selected RAW scan, never another restoration.
 * The neck stays at the margin; only height above it changes. Axial clearance is
 * a sampled starting-envelope estimate, not intaglio fit or normal wall thickness.
 */
export function sizeCadRestorationAboveSource(geometry:THREE.BufferGeometry,sourcePositions:ArrayLike<number>,margin:readonly Point[],frame:CadMarginPlacement,options:{minimumAxialClearanceMm:number;previewHeightScale?:number}) {
 const unchanged={scaleZ:1,sampleCount:0,minimumAxialClearanceMm:null as number|null};
 if(margin.length<3||sourcePositions.length%3!==0)return unchanged;
 const inverse=frame.quaternion.clone().invert(),contour=margin.map(p=>new THREE.Vector3(p.x,p.y,p.z).sub(frame.center).applyQuaternion(inverse));
 const inside=(x:number,y:number)=>{let hit=false;for(let i=0,j=contour.length-1;i<contour.length;j=i++){const a=contour[i],b=contour[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;};
 const bounds=new THREE.Box3().setFromPoints(contour),source:THREE.Vector3[]=[],point=new THREE.Vector3();
 for(let i=0;i<sourcePositions.length;i+=3){
  point.set(sourcePositions[i],sourcePositions[i+1],sourcePositions[i+2]).sub(frame.center).applyQuaternion(inverse);
  if(![point.x,point.y,point.z].every(Number.isFinite)||point.z<-.1||point.z>14||point.x<bounds.min.x||point.x>bounds.max.x||point.y<bounds.min.y||point.y>bounds.max.y||!inside(point.x,point.y))continue;
  source.push(point.clone());
 }
 if(!source.length)return unchanged;
 geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const box=geometry.boundingBox!,baseZ=box.min.z,height=box.max.z-baseZ;
 const preview=options.previewHeightScale??1,clearance=options.minimumAxialClearanceMm;
 if(height<.1||!Number.isFinite(preview)||preview<=0||!Number.isFinite(clearance)||clearance<0||clearance>3)return unchanged;
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),mesh=new THREE.Mesh(geometry,material),ray=new THREE.Raycaster();mesh.updateMatrixWorld(true);
 const sampled=source.filter((_p,i)=>i%Math.max(1,Math.ceil(source.length/96))===0),highest=source.reduce((a,b)=>a.z>b.z?a:b);sampled.push(highest);
 const hits:{sourceHeight:number;outerHeight:number}[]=[];let scale=1;
 try{
  for(const sample of sampled){ray.set(new THREE.Vector3(sample.x,sample.y,box.max.z+1),new THREE.Vector3(0,0,-1));const hit=ray.intersectObject(mesh,false)[0];if(!hit)continue;const outerHeight=hit.point.z-baseZ;if(outerHeight<.2)continue;hits.push({sourceHeight:sample.z,outerHeight});scale=Math.max(scale,(sample.z+clearance)/(outerHeight*preview));}
 }finally{material.dispose();}
 if(!hits.length||!Number.isFinite(scale)||scale>3||height*scale>16)return {...unchanged,sampleCount:hits.length};
 if(scale>1+1e-6){const p=geometry.getAttribute('position');for(let i=0;i<p.count;i++)p.setZ(i,baseZ+(p.getZ(i)-baseZ)*scale);p.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();}
 return {scaleZ:scale,sampleCount:hits.length,minimumAxialClearanceMm:Math.min(...hits.map(hit=>hit.outerHeight*scale*preview-hit.sourceHeight))};
}
