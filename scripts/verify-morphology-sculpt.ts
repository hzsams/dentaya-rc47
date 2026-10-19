import assert from "node:assert/strict";
import * as THREE from "three";
import { createRestorationGeometry } from "../src/lib/cad-restoration-shape";
import { applyBrush } from "../src/lib/cad-sculpt-brush";
import { analyzeCadMesh } from "../src/lib/cad-mesh-qc";
import {CAD_TOOTH_FORM_OPTIONS} from "../src/lib/cad-job-setup";
const TOOTH_FORM_FAMILIES=CAD_TOOTH_FORM_OPTIONS.map(f=>({id:f.value}));
import type { CadSettings } from "../src/app/design/DesignViewport";

const settings = {
  brush_radius_mm: 1.6,
  brush_strength_mm: 0.16,
  brush_hardness: 0.2,
  brush_falloff: 1,
  brush_shape: "round",
  smoothing: 0.35,
  preserve_shape: true,
  occlusal_only: false,
  hold_cusp_tips: false,
  hold_equator: false,
} as CadSettings;

function volume(geometry: THREE.BufferGeometry) {
  const positions = geometry.getAttribute("position");
  const indices = geometry.index!;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let total = 0;
  for (let i = 0; i < indices.count; i += 3) {
    a.fromBufferAttribute(positions, indices.getX(i));
    b.fromBufferAttribute(positions, indices.getX(i + 1));
    c.fromBufferAttribute(positions, indices.getX(i + 2));
    total += a.dot(b.cross(c)) / 6;
  }
  return total;
}

let editedMeshes = 0, strokes = 0;
for (const family of TOOTH_FORM_FAMILIES) {
  // Include all tooth classes and both mirrored quadrants at viewport resolution.
  for (const code of ["11", "23", "35", "46"]) {
    for (const tool of ["add", "reduce", "smooth", "flatten"] as const) {
      const geometry = createRestorationGeometry(6, code, "anatomic_crown", family.id, "balanced");
      const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
      const before = new Float32Array(positions.array);
      let topIndex = 0;
      for (let i = 1; i < positions.count; i++) {
        if (positions.getZ(i) > positions.getZ(topIndex)) topIndex = i;
      }
      const mesh = new THREE.Mesh(geometry);
      mesh.updateMatrixWorld();
      for (let step = 0; step < 8; step++) {
        const point = new THREE.Vector3().fromBufferAttribute(positions, topIndex);
        const normal = new THREE.Vector3().fromBufferAttribute(geometry.getAttribute("normal"), topIndex);
        applyBrush(mesh, point, normal, tool, settings);
        strokes++;
      }
      const label = `${code}/${family.id}/${tool}`;
      assert.ok(Array.from(positions.array).some((v, i) => Math.abs(v - before[i]) > 1e-7), `${label}: brush edits the actual crown`);
      assert.ok(Array.from(positions.array).every(Number.isFinite), label);
      assert.ok(Array.from(geometry.getAttribute("normal").array).every(Number.isFinite), label);
      const qc = analyzeCadMesh(geometry);
      assert.equal(qc.watertight, true, `${label}: closed surface`);
      assert.equal(qc.degenerateTriangles, 0, label);
      assert.equal(qc.connectedComponents, 1, `${label}: one connected body`);
      assert.equal(qc.eulerCharacteristic, 2, `${label}: no new handles or holes`);
      assert.ok(volume(geometry) > 0, `${label}: outward surface winding`);
      geometry.dispose();
      editedMeshes++;
    }
  }
}
console.log(JSON.stringify({
  pass: true, families: TOOTH_FORM_FAMILIES.length, toothClasses: 4,
  tools: ["add", "reduce", "smooth", "flatten"], editedMeshes, strokes,
  viewportResolution: true, defaultBrushSettings: true, everyBrushChangesGeometry: true,
  closedSingleBodies: true, degenerateTriangles: 0, positiveVolumes: true,
}, null, 2));
