import * as THREE from 'three';
import type {CadMarginPoint} from './cad-margin-engine';

export type CadMarginPlacement={position:THREE.Vector3;quaternion:THREE.Quaternion;center:THREE.Vector3;axis:THREE.Vector3;area:number};
/** Register the cervical end to the selected margin, in scan-centered coordinates. */
export function placeCadCrownOnMargin(geometry:THREE.BufferGeometry,points:CadMarginPoint[],requestedAxis:THREE.Vector3):CadMarginPlacement|null{
 if(points.length<3||points.length>20000||![requestedAxis.x,requestedAxis.y,requestedAxis.z].every(Number.isFinite)||points.some(p=>![p.x,p.y,p.z].every(Number.isFinite)))return null;
 const center=points.reduce<THREE.Vector3>((sum,p)=>sum.add(new THREE.Vector3(p.x,p.y,p.z)),new THREE.Vector3()).multiplyScalar(1/points.length);
 const normal=new THREE.Vector3();for(let i=0;i<points.length;i++){const a=new THREE.Vector3(points[i].x,points[i].y,points[i].z).sub(center),b=new THREE.Vector3(points[(i+1)%points.length].x,points[(i+1)%points.length].y,points[(i+1)%points.length].z).sub(center);normal.add(a.cross(b));}
 const area=normal.length()/2;if(area<.15)return null;normal.normalize();
 const direction=requestedAxis.lengthSq()>1e-8?requestedAxis.clone().normalize():new THREE.Vector3(0,0,1);if(normal.dot(direction)<0)normal.negate();
 const x=new THREE.Vector3(1,0,0).addScaledVector(normal,-normal.x);if(x.lengthSq()<.01)x.set(0,1,0).addScaledVector(normal,-normal.y);x.normalize();const y=normal.clone().cross(x).normalize();
 const quaternion=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,normal)),inverse=quaternion.clone().invert();
 const contour=points.map(p=>new THREE.Vector3(p.x,p.y,p.z).sub(center).applyQuaternion(inverse));
 geometry.computeBoundingBox();const box=geometry.boundingBox!,baseZ=box.min.z,height=box.max.z-baseZ;if(!Number.isFinite(height)||height<.001)return null;
 // Use a radial intersection with the actual margin instead of the full-arch center.
 function radiusAt(theta:number){const dx=Math.cos(theta),dy=Math.sin(theta);let nearest=Infinity,z=0;
  for(let i=0;i<contour.length;i++){const a=contour[i],b=contour[(i+1)%contour.length],ex=b.x-a.x,ey=b.y-a.y,den=dx*ey-dy*ex;if(Math.abs(den)<1e-8)continue;
   const t=(a.x*ey-a.y*ex)/den,u=(a.x*dy-a.y*dx)/den;if(t>0&&u>=0&&u<=1&&t<nearest){nearest=t;z=THREE.MathUtils.lerp(a.z,b.z,u);}}
  return {radius:nearest,z};
 }
 const p=geometry.getAttribute('position'),before=new Float32Array(p.array);
 let cervicalRadius=0,count=0;for(let i=0;i<p.count;i++)if(p.getZ(i)<box.min.z+height*.005&&Math.hypot(p.getX(i),p.getY(i))>.001){cervicalRadius+=Math.hypot(p.getX(i),p.getY(i));count++;}
 cervicalRadius/=Math.max(1,count);if(cervicalRadius<.001)return null;
 for(let i=0;i<p.count;i++){
  const px=p.getX(i),py=p.getY(i),pz=p.getZ(i),r=Math.hypot(px,py),t=(pz-box.min.z)/height,weight=1-THREE.MathUtils.smoothstep(t,0,.3);if(weight<=0||r<.001)continue;
  const boundary=radiusAt(Math.atan2(py,px));if(!Number.isFinite(boundary.radius)||boundary.radius<.05){p.array.set(before);return null;}
  const ratio=THREE.MathUtils.clamp(boundary.radius/r,.25,3);const scale=THREE.MathUtils.lerp(1,ratio,weight);
  p.setXYZ(i,px*scale,py*scale,pz+boundary.z*weight);
 }
 p.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 return {center,axis:normal,area,quaternion,position:center.clone().addScaledVector(normal,-baseZ)};
}
