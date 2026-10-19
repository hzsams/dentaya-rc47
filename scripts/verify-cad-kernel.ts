import assert from "node:assert/strict";

import * as THREE from "three";

import { buildCrownShell } from "@/lib/cad-crown-shell-engine";
import {
  buildCadMeshBvh,
  nearestPointOnCadMesh,
  queryCadMeshBvhAabb,
} from "@/lib/cad-mesh-bvh";
import { analyzeCadMesh } from "@/lib/cad-mesh-qc";
import {
  CAD_MESH_RECORD_VERSION,
  buildIndexedMeshRecord,
  meshFaceNeighbors,
  meshVertexNeighbors,
} from "@/lib/cad-mesh-record";
import { repairCadMesh } from "@/lib/cad-mesh-repair-engine";
import {
  buildMeshSpatialIndex,
  nearestCadSample,
} from "@/lib/cad-spatial-engine";
import { rigidRegisterGeometry } from "@/lib/scan-registration";

function nearlyEqual(actual: number, expected: number, tolerance: number) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

const box = new THREE.BoxGeometry(20, 10, 8, 3, 2, 2);
const record = buildIndexedMeshRecord(box);
assert.equal(record.version, CAD_MESH_RECORD_VERSION);
assert.ok(record.vertexCount > 8);
assert.ok(record.triangleCount > 12);
assert.equal(record.topology.boundaryHalfEdgeCount, 0);
assert.equal(record.topology.nonManifoldEdgeCount, 0);
assert.equal(record.topology.connectedComponentCount, 1);
assert.ok(meshVertexNeighbors(record, 0).length >= 2);
assert.ok(meshFaceNeighbors(record, 0).length >= 1);

const qc = analyzeCadMesh(box);
assert.equal(qc.watertight, true);
assert.equal(qc.connectedComponents, 1);
nearlyEqual(qc.boundingSizeMm.x, 20, 1e-6);
nearlyEqual(qc.boundingSizeMm.y, 10, 1e-6);
nearlyEqual(qc.boundingSizeMm.z, 8, 1e-6);

const bvh = buildCadMeshBvh(record, { leafSize: 4 });
const nearest = nearestPointOnCadMesh(new THREE.Vector3(15, 0, 0), bvh);
assert.ok(nearest);
nearlyEqual(nearest.distance, 5, 1e-6);
nearlyEqual(nearest.point.x, 10, 1e-6);
assert.ok(nearest.testedTriangles < record.triangleCount);

const faceHits = queryCadMeshBvhAabb(
  new THREE.Box3(
    new THREE.Vector3(9.5, -1, -1),
    new THREE.Vector3(10.5, 1, 1),
  ),
  bvh,
);
assert.ok(faceHits.length > 0);

const boxMesh = new THREE.Mesh(box);
const spatialIndex = buildMeshSpatialIndex(boxMesh, 0.5);
assert.equal(spatialIndex.queryMode, "bvh-triangle");
const spatialNearest = nearestCadSample(
  new THREE.Vector3(15, 0, 0),
  spatialIndex,
);
assert.ok(spatialNearest);
nearlyEqual(spatialNearest.distance, 5, 1e-6);

const dirty = box.toNonIndexed();
const dirtyPositions = Array.from(
  (dirty.getAttribute("position") as THREE.BufferAttribute).array as ArrayLike<number>,
);
dirtyPositions.push(0, 0, 0, 0, 0, 0, 0, 0, 0);
dirty.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(dirtyPositions, 3),
);
const repaired = repairCadMesh(dirty, {
  weldToleranceMm: 0.0001,
  removeDegenerate: true,
  orientOutward: true,
});
assert.equal(repaired.removedTriangles, 1);
assert.equal(repaired.after.degenerateTriangles, 0);
assert.equal(repaired.after.nonManifoldEdges, 0);

const crownGeometry = new THREE.SphereGeometry(6, 32, 20);
const crownMesh = new THREE.Mesh(crownGeometry);
const shell = buildCrownShell(crownMesh, null, {
  wallThicknessMm: 0.8,
  cervicalCutRatio: 0.18,
  innerFitBlend: 0,
  cementGapMm: 0.08,
  marginGapMm: 0.03,
  axialGapMm: 0.1,
  radialGapMm: 0.12,
  transitionMm: 1,
  millingCompensationMm: 0.05,
});
assert.ok(shell.report.outerVertexCount > 100);
assert.equal(shell.report.outerVertexCount, shell.report.innerVertexCount);
assert.ok(shell.report.triangleCount > 200);
assert.equal(shell.report.qc.nonManifoldEdges, 0);
assert.ok(shell.report.minimumWallEstimateMm > 0.5);

const reference = new THREE.TorusKnotGeometry(4, 1.2, 80, 12);
const moving = reference.clone().applyMatrix4(
  new THREE.Matrix4().makeTranslation(0.35, -0.2, 0.15),
);
const registration = rigidRegisterGeometry(reference, moving, 6);
assert.ok(Number.isFinite(registration.rms));
assert.ok(registration.pairCount >= 12);
assert.ok(registration.rms < 1);

for (const geometry of [
  box,
  dirty,
  repaired.geometry,
  crownGeometry,
  shell.geometry,
  reference,
  moving,
]) {
  geometry.dispose();
}

console.log(
  JSON.stringify(
    {
      status: "pass",
      mesh: {
        vertices: record.vertexCount,
        triangles: record.triangleCount,
        watertight: qc.watertight,
      },
      bvh: {
        nodes: bvh.nodes.length,
        testedTriangles: nearest.testedTriangles,
      },
      crownShell: {
        triangles: shell.report.triangleCount,
        minimumWallMm: Number(shell.report.minimumWallEstimateMm.toFixed(3)),
      },
      registration: {
        pairs: registration.pairCount,
        rms: Number(registration.rms.toFixed(4)),
      },
    },
    null,
    2,
  ),
);
