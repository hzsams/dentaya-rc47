import * as THREE from "three";

import { analyzeCadMesh, type CadMeshQcReport } from "@/lib/cad-mesh-qc";

export type MeshRepairOptions = {
  weldToleranceMm: number;
  removeDegenerate: boolean;
  orientOutward: boolean;
};

export type MeshRepairResult = {
  geometry: THREE.BufferGeometry;
  before: CadMeshQcReport;
  after: CadMeshQcReport;
  removedTriangles: number;
  weldedVertices: number;
  flippedWinding: boolean;
};

/**
 * Safe, deterministic cleanup for CAD output meshes.
 * It intentionally does not attempt arbitrary hole filling/boolean healing.
 */
export function repairCadMesh(
  input: THREE.BufferGeometry,
  options: MeshRepairOptions,
): MeshRepairResult {
  const before = analyzeCadMesh(input);
  const nonIndexed = input.index ? input.toNonIndexed() : input.clone();
  const source = nonIndexed.getAttribute("position") as THREE.BufferAttribute | undefined;

  if (!source) {
    return {
      geometry: nonIndexed,
      before,
      after: before,
      removedTriangles: 0,
      weldedVertices: 0,
      flippedWinding: false,
    };
  }

  const tolerance = Math.max(options.weldToleranceMm, 1e-6);
  const positions: number[] = [];
  const indices: number[] = [];
  const canonical = new Map<string, number>();
  const point = new THREE.Vector3();
  let removedTriangles = 0;

  const idFor = (x: number, y: number, z: number) => {
    const key = `${Math.round(x / tolerance)}:${Math.round(y / tolerance)}:${Math.round(z / tolerance)}`;
    const existing = canonical.get(key);
    if (existing !== undefined) return existing;
    const id = positions.length / 3;
    positions.push(x, y, z);
    canonical.set(key, id);
    return id;
  };

  for (let i = 0; i + 2 < source.count; i += 3) {
    const ids: number[] = [];
    const vertices: THREE.Vector3[] = [];
    for (let corner = 0; corner < 3; corner += 1) {
      const index = i + corner;
      point.set(source.getX(index), source.getY(index), source.getZ(index));
      vertices.push(point.clone());
      ids.push(idFor(point.x, point.y, point.z));
    }

    const area = vertices[1]
      .clone()
      .sub(vertices[0])
      .cross(vertices[2].clone().sub(vertices[0]))
      .length() * 0.5;

    if (
      options.removeDegenerate &&
      (ids[0] === ids[1] || ids[1] === ids[2] || ids[2] === ids[0] || area < 1e-9)
    ) {
      removedTriangles += 1;
      continue;
    }

    indices.push(ids[0], ids[1], ids[2]);
  }

  let flippedWinding = false;
  if (options.orientOutward && signedVolume(positions, indices) < 0) {
    for (let i = 0; i + 2 < indices.length; i += 3) {
      const swap = indices[i + 1];
      indices[i + 1] = indices[i + 2];
      indices[i + 2] = swap;
    }
    flippedWinding = true;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const after = analyzeCadMesh(geometry);
  nonIndexed.dispose();

  return {
    geometry,
    before,
    after,
    removedTriangles,
    weldedVertices: Math.max(0, before.vertexCount - after.uniqueVertexCount),
    flippedWinding,
  };
}

function signedVolume(positions: number[], indices: number[]) {
  let volume = 0;
  for (let i = 0; i + 2 < indices.length; i += 3) {
    const ia = indices[i] * 3;
    const ib = indices[i + 1] * 3;
    const ic = indices[i + 2] * 3;
    const ax = positions[ia];
    const ay = positions[ia + 1];
    const az = positions[ia + 2];
    const bx = positions[ib];
    const by = positions[ib + 1];
    const bz = positions[ib + 2];
    const cx = positions[ic];
    const cy = positions[ic + 1];
    const cz = positions[ic + 2];

    volume +=
      ax * (by * cz - bz * cy) -
      ay * (bx * cz - bz * cx) +
      az * (bx * cy - by * cx);
  }
  return volume / 6;
}
