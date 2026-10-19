import * as THREE from "three";

import {
  buildCadMeshBvh,
  nearestPointOnCadMesh,
  type CadMeshBvh,
} from "@/lib/cad-mesh-bvh";
import {
  buildIndexedMeshRecord,
  type IndexedMeshRecord,
} from "@/lib/cad-mesh-record";

export type CadSpatialSample = {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  sourceIndex: number;
};

export type CadSpatialIndex = {
  cellSize: number;
  buckets: Map<string, CadSpatialSample[]>;
  sampleCount: number;
  meshRecord: IndexedMeshRecord;
  bvh: CadMeshBvh;
  queryMode: "bvh-triangle";
};

export type NearestCadSample = CadSpatialSample & {
  distance: number;
  signedDistance: number;
  triangleIndex: number;
  vertexIndex: number;
  barycentric: THREE.Vector3;
  visitedNodes: number;
  testedTriangles: number;
};

export function buildMeshSpatialIndex(
  mesh: THREE.Mesh,
  requestedCellSize = 0.5,
  maxSamples = 60_000,
): CadSpatialIndex {
  mesh.updateMatrixWorld(true);
  const meshRecord = buildIndexedMeshRecord(mesh.geometry, {
    matrix: mesh.matrixWorld,
  });
  const bvh = buildCadMeshBvh(meshRecord);
  const cellSize = Math.max(requestedCellSize, 0.1);
  const buckets = new Map<string, CadSpatialSample[]>();
  const step = Math.max(1, Math.ceil(meshRecord.vertexCount / Math.max(maxSamples, 1)));
  let sampleCount = 0;

  for (let i = 0; i < meshRecord.vertexCount; i += step) {
    const offset = i * 3;
    const worldPoint = new THREE.Vector3(
      meshRecord.positions[offset],
      meshRecord.positions[offset + 1],
      meshRecord.positions[offset + 2],
    );
    const worldNormal = new THREE.Vector3(
      meshRecord.normals[offset],
      meshRecord.normals[offset + 1],
      meshRecord.normals[offset + 2],
    );

    const sample: CadSpatialSample = {
      point: worldPoint,
      normal: worldNormal,
      sourceIndex: meshRecord.vertexSourceIndices[i] ?? i,
    };

    const key = spatialKey(worldPoint, cellSize);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(sample);
    else buckets.set(key, [sample]);

    sampleCount += 1;
  }

  return {
    cellSize,
    buckets,
    sampleCount,
    meshRecord,
    bvh,
    queryMode: "bvh-triangle",
  };
}

export function nearestCadSample(
  point: THREE.Vector3,
  index: CadSpatialIndex,
  maxRadius = 8,
): NearestCadSample | null {
  const exact = nearestPointOnCadMesh(
    point,
    index.bvh,
  );
  if (exact) {
    return {
      point: exact.point,
      normal: exact.normal,
      sourceIndex: exact.sourceIndex,
      distance: exact.distance,
      signedDistance: exact.signedDistance,
      triangleIndex: exact.triangleIndex,
      vertexIndex: exact.vertexIndex,
      barycentric: exact.barycentric,
      visitedNodes: exact.visitedNodes,
      testedTriangles: exact.testedTriangles,
    };
  }

  if (!index.buckets.size) return null;

  const cellSize = index.cellSize;
  const cx = Math.floor(point.x / cellSize);
  const cy = Math.floor(point.y / cellSize);
  const cz = Math.floor(point.z / cellSize);

  let best: CadSpatialSample | null = null;
  let bestDistanceSq = Infinity;

  for (let radius = 0; radius <= maxRadius; radius += 1) {
    let foundAny = false;

    for (let x = cx - radius; x <= cx + radius; x += 1) {
      for (let y = cy - radius; y <= cy + radius; y += 1) {
        for (let z = cz - radius; z <= cz + radius; z += 1) {
          if (
            radius > 0 &&
            x > cx - radius &&
            x < cx + radius &&
            y > cy - radius &&
            y < cy + radius &&
            z > cz - radius &&
            z < cz + radius
          ) {
            continue;
          }

          const bucket = index.buckets.get(`${x}:${y}:${z}`);
          if (!bucket) continue;
          foundAny = true;

          for (const candidate of bucket) {
            const distanceSq = point.distanceToSquared(candidate.point);
            if (distanceSq < bestDistanceSq) {
              bestDistanceSq = distanceSq;
              best = candidate;
            }
          }
        }
      }
    }

    if (foundAny && best) break;
  }

  if (!best) return null;

  const delta = point.clone().sub(best.point);
  const signedDistance = delta.dot(best.normal);

  return {
    ...best,
    distance: Math.sqrt(bestDistanceSq),
    signedDistance,
    triangleIndex: -1,
    vertexIndex: -1,
    barycentric: new THREE.Vector3(1, 0, 0),
    visitedNodes: 0,
    testedTriangles: 0,
  };
}

export function projectPointToSpatialSurface(
  point: THREE.Vector3,
  index: CadSpatialIndex,
): THREE.Vector3 | null {
  const nearest = nearestCadSample(point, index);
  return nearest?.point.clone() ?? null;
}

export function spatialKey(point: THREE.Vector3, cellSize: number) {
  return [
    Math.floor(point.x / cellSize),
    Math.floor(point.y / cellSize),
    Math.floor(point.z / cellSize),
  ].join(":");
}
