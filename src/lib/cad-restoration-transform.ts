import * as THREE from 'three';

export type CadRestorationAnchor={position:THREE.Vector3;quaternion:THREE.Quaternion;placed:boolean};
export type CadRestorationTransformOptions={morphologyScale:number;cuspHeight:number;proximalContactMm:number;occlusalOffsetMm:number;translation:THREE.Vector3;rotationZDeg:number;marginOffsetMm:number};
export function cadCervicalBaseZ(positions:ArrayLike<number>){
 let base=Infinity;for(let i=2;i<positions.length;i+=3)if(Number.isFinite(positions[i]))base=Math.min(base,positions[i]);return Number.isFinite(base)?base:0;
}
/** Keep the registered cervical base fixed while changing crown height. */
export function cadRestorationTransform(anchor:CadRestorationAnchor,baseZ:number,options:CadRestorationTransformOptions){
 const scale=new THREE.Vector3(options.morphologyScale*(1+options.proximalContactMm*.035),options.morphologyScale*(1+options.proximalContactMm*.035),options.cuspHeight*(1+options.occlusalOffsetMm*.04));
 const quaternion=anchor.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),THREE.MathUtils.degToRad(options.rotationZDeg)));
 const position=anchor.position.clone().add(options.translation.clone().add(new THREE.Vector3(0,0,options.marginOffsetMm)).applyQuaternion(anchor.quaternion));
 if(anchor.placed){const pivot=new THREE.Vector3(0,0,baseZ);position.add(pivot.clone().applyQuaternion(anchor.quaternion)).sub(pivot.multiply(scale).applyQuaternion(quaternion));}
 return {position,quaternion,scale};
}

/** Bounded, read-only registration diagnostics. This does not measure intaglio fit. */
export function cadCervicalRegistration(geometry:THREE.BufferGeometry,placementBase:ArrayLike<number>,matrixWorld:THREE.Matrix4,margin:ReadonlyArray<{x:number;y:number;z:number}>,marginCenter:THREE.Vector3){
 const baseZ=cadCervicalBaseZ(placementBase),p=geometry.getAttribute('position');
 const cervicalCenter=new THREE.Vector3(0,0,baseZ).applyMatrix4(matrixWorld),samples:THREE.Vector3[]=[];
 // Match the actual geometry's neck vertices using its undeformed base record.
 if(placementBase.length===p.count*3)for(let i=0;i<p.count&&samples.length<256;i++)if(Math.abs(placementBase[i*3+2]-baseZ)<1e-5&&Math.hypot(placementBase[i*3],placementBase[i*3+1])>1e-5)samples.push(new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i)).applyMatrix4(matrixWorld));
 const contour=margin.filter((_point,i)=>i%Math.max(1,Math.ceil(margin.length/512))===0);
 let maxMarginGapMm:number|null=null;
 if(samples.length>=3&&contour.length>=3){
  maxMarginGapMm=0;const line=new THREE.Line3(),closest=new THREE.Vector3();
  for(const sample of samples){let distance=Infinity;for(let i=0;i<contour.length;i++){const a=contour[i],b=contour[(i+1)%contour.length];line.start.set(a.x,a.y,a.z);line.end.set(b.x,b.y,b.z);distance=Math.min(distance,line.closestPointToPoint(sample,true,closest).distanceTo(sample));}maxMarginGapMm=Math.max(maxMarginGapMm,distance);}
 }
 return {cervicalCenter:cervicalCenter.toArray(),marginCenter:marginCenter.toArray(),cervicalCenterGapMm:cervicalCenter.distanceTo(marginCenter),maxMarginGapMm,neckSampleCount:samples.length,marginSampleCount:contour.length};
}
