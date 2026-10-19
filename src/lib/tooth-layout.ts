import * as THREE from 'three';
export type ToothPlacement={frontX:number;frontRotation:number;archX:number;archZ:number;crownBounds:THREE.Box3};
// All spacing is schematic display spacing. It never modifies a case scan or CAD geometry.
export function buildToothLayout(geometries:Record<string,THREE.BufferGeometry>){
 const placements:Record<string,ToothPlacement>={};const gap=1.8;
 for(const q of ['1','2','3','4']){
  const side=q==='1'||q==='4'?-1:1,upper=Number(q)<3;let frontEdge=gap/2;
  for(let n=1;n<=8;n++){
   const code=q+n,geometry=geometries[code],rotation=-side*(n-1)*8*Math.PI/180;
   geometry.computeBoundingBox();const frontBox=new THREE.Box3(),matrix=new THREE.Matrix4().makeRotationY(rotation),vertices=geometry.getAttribute('position');
   for(let v=0;v<vertices.count;v++)frontBox.expandByPoint(new THREE.Vector3().fromBufferAttribute(vertices,v).applyMatrix4(matrix));
   const frontX=side===1?frontEdge-frontBox.min.x:-frontEdge-frontBox.max.x;frontEdge+=frontBox.max.x-frontBox.min.x+gap;
   const crownBounds=new THREE.Box3(),position=geometry.getAttribute('position');
   const crownLimit=Number(geometry.userData.crownLimit)||9;
   for(let i=0;i<position.count;i++){const v=new THREE.Vector3().fromBufferAttribute(position,i);if((upper?v.y:-v.y)<=crownLimit)crownBounds.expandByPoint(v);}
   let archX=side*[4.8,13.5,22.5,29,33,35,36,36][n-1],archZ=[0,-1.7,-6.4,-13.5,-22.3,-32.4,-43.4,-54.2][n-1];
   if(n<=3){const previous=n>1?placements[q+(n-1)]:null;const inner=side===1?crownBounds.min.x:-crownBounds.max.x;
    const required=previous?Math.abs(previous.archX)+(side===1?previous.crownBounds.max.x:-previous.crownBounds.min.x)+gap:gap/2;
    archX=side*Math.max(Math.abs(archX),required-inner);
   }
   if(n>=4){const previous=placements[q+(n-1)];archZ=Math.min(archZ,previous.archZ+previous.crownBounds.min.z-gap-crownBounds.max.z);}
   placements[code]={frontX,frontRotation:rotation,archX,archZ,crownBounds};
  }
 }
 return {placements,archDepth:Math.max(...Object.values(placements).map(p=>-p.archZ-p.crownBounds.min.z)),frontWidth:Math.max(...Object.values(placements).map(p=>Math.abs(p.frontX)))+12};
}
