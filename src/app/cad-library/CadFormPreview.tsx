'use client';
import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import UiNode from '@/lib/i18n/UiNode';
export default function CadFormPreview({geometry}:{geometry:THREE.BufferGeometry|null}){
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const element=host.current;if(!element||!geometry)return;
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));element.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.01,1000),g=geometry.clone();g.computeBoundingSphere();g.computeBoundingBox();const center=g.boundingBox!.getCenter(new THREE.Vector3()),radius=Math.max(.5,g.boundingSphere!.radius);
  const material=new THREE.MeshStandardMaterial({color:0xf3e9d1,roughness:.5,metalness:0});const mesh=new THREE.Mesh(g,material);scene.add(mesh,new THREE.HemisphereLight(0xffffff,0x596777,2.5));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-10,-15,20);scene.add(light);scene.add(new THREE.AxesHelper(radius));
  camera.position.copy(center).add(new THREE.Vector3(radius*2,-radius*2.5,radius*2));const controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(center);controls.enableDamping=false;controls.minDistance=radius*.6;controls.maxDistance=radius*12;
  const render=()=>renderer.render(scene,camera);const resize=()=>{const rect=element.getBoundingClientRect();renderer.setSize(Math.max(1,rect.width),Math.max(1,rect.height),false);camera.aspect=Math.max(1,rect.width)/Math.max(1,rect.height);camera.updateProjectionMatrix();controls.update();render();};
  const observer=new ResizeObserver(resize);observer.observe(element);controls.addEventListener('change',render);resize();
  return()=>{observer.disconnect();controls.dispose();scene.traverse(o=>{if(o instanceof THREE.LineSegments){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});g.dispose();material.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
 },[geometry]);
 return <UiNode as="div" className="cad-library-preview" aria-label="Önizleme" ref={host}>{!geometry&&<UiNode as="span">Önizleme</UiNode>}</UiNode>;
}
