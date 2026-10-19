import assert from "node:assert/strict";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { commitSculptDeformation, synchronizeSculptSeams } from "../src/lib/cad-sculpt-integrity";
import { analyzeCadMesh } from "../src/lib/cad-mesh-qc";
import { smoothMeshRegion } from "../src/lib/cad-freeform-engine";

// Reproduce the UV seam: deleting normals alone does not weld a sphere.
const source = new THREE.SphereGeometry(5, 32, 24);
source.deleteAttribute("normal");
const old = mergeVertices(source, 1e-5);
source.deleteAttribute("uv");
const fixed = mergeVertices(source, 1e-5);
assert.ok(fixed.getAttribute("position").count < old.getAttribute("position").count);
fixed.computeVertexNormals();
for (let stroke = 0; stroke < 100; stroke++) {
  const p = fixed.getAttribute("position") as THREE.BufferAttribute;
  const before = new Float32Array(p.array);
  const seams = synchronizeSculptSeams(fixed);
  const scale = stroke % 2 ? 0.999 : 1.001;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i)*scale, p.getY(i)*scale, p.getZ(i)*scale);
  assert.equal(commitSculptDeformation(fixed, before, seams), true);
  fixed.computeVertexNormals();
}
assert.equal(analyzeCadMesh(fixed).watertight, true);
const p = fixed.getAttribute("position") as THREE.BufferAttribute;
const before = new Float32Array(p.array);
p.setXYZ(0, NaN, 0, 0);
assert.equal(commitSculptDeformation(fixed, before, []), false);
assert.deepEqual(new Float32Array(p.array), before);
for (let i = 0; i < p.count; i++) p.setXYZ(i, 0, 0, 0);
assert.equal(commitSculptDeformation(fixed, before, []), false);
assert.deepEqual(new Float32Array(p.array), before);
const split = new THREE.BoxGeometry().toNonIndexed();
const sp = split.getAttribute("position") as THREE.BufferAttribute;
const saved = new Float32Array(sp.array);
const seams = synchronizeSculptSeams(split);
sp.setX(seams[0][0], sp.getX(seams[0][0]) + 0.01);
assert.equal(commitSculptDeformation(split, saved, seams), true);
for (const group of seams) for (const i of group) assert.equal(sp.getX(i), sp.getX(group[0]));
assert.equal(analyzeCadMesh(split).watertight, true);
const isolated = new THREE.Float32BufferAttribute([0,0,0,10,0,0],3);
const normals = new THREE.Float32BufferAttribute([0,0,1,0,0,1],3);
smoothMeshRegion(isolated,normals,[0,1],{amount:0.5,neighborhoodRadius:0.1,preserveShape:false,occlusalOnly:false});
assert.equal(isolated.getX(0),0); assert.equal(isolated.getX(1),10);
console.log("PASS: UV seam regression, 100 closed-surface edits, NaN/collapse rollback, coincident corners, isolated smoothing.");

// Exercise the actual viewport brush, including surface-side protection.
const { applyBrush } = await import("../src/lib/cad-sculpt-brush");
const settings = {brush_radius_mm:2,brush_strength_mm:0.03,brush_hardness:0.2,brush_falloff:1,brush_shape:"round",smoothing:0.2,preserve_shape:true,occlusal_only:false,hold_cusp_tips:false,hold_equator:false} as import("../src/app/design/DesignViewport").CadSettings;
const mesh = new THREE.Mesh(fixed);
for (const tool of ["add","reduce","smooth","flatten"] as const) {
  for (let step=0;step<10;step++) applyBrush(mesh,new THREE.Vector3(5,0,0),new THREE.Vector3(1,0,0),tool,settings);
  assert.equal(analyzeCadMesh(fixed).watertight,true,tool);
  assert.equal(analyzeCadMesh(fixed).degenerateTriangles,0,tool);
}
console.log("PASS: actual Add/Reduce/Smooth/Flatten brush preserves closed test mesh.");
const thin = new THREE.BoxGeometry(1,1,0.1,4,4,1);
thin.deleteAttribute("normal"); thin.deleteAttribute("uv");
const wall = mergeVertices(thin,1e-5); wall.computeVertexNormals();
const wp = wall.getAttribute("position") as THREE.BufferAttribute;
const back = Array.from({length:wp.count},(_,i)=>i).filter(i=>wp.getZ(i)<0 && Math.abs(wp.getX(i))<0.4 && Math.abs(wp.getY(i))<0.4);
const backBefore = back.map(i=>wp.getZ(i));
applyBrush(new THREE.Mesh(wall),new THREE.Vector3(0,0,0.05),new THREE.Vector3(0,0,1),"add",settings);
assert.deepEqual(back.map(i=>wp.getZ(i)),backBefore);
const triangle = new THREE.BufferGeometry();
triangle.setAttribute("position",new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));
const tp = triangle.getAttribute("position") as THREE.BufferAttribute;
const tb = new Float32Array(tp.array); tp.setY(2,-1);
assert.equal(commitSculptDeformation(triangle,tb,[]),false);
assert.deepEqual(new Float32Array(tp.array),tb);
console.log("PASS: opposing wall unchanged; inverted triangle rolled back.");
