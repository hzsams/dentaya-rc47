import * as THREE from "three";

import type { CadSpatialIndex } from "@/lib/cad-spatial-engine";
import { nearestCadSample } from "@/lib/cad-spatial-engine";
import { analyzeCadMesh, type CadMeshQcReport } from "@/lib/cad-mesh-qc";

export type CrownShellParameters = {
  wallThicknessMm: number;
  cervicalCutRatio: number;
  innerFitBlend: number;
  cementGapMm: number;
  marginGapMm: number;
  axialGapMm: number;
  radialGapMm: number;
  transitionMm: number;
  millingCompensationMm: number;
};

export type CrownShellReport = {
  outerVertexCount: number;
  innerVertexCount: number;
  triangleCount: number;
  boundaryEdgeCountBeforeStitch: number;
  fittedInnerVertices: number;
  averageFitGapMm: number;
  minimumWallEstimateMm: number;
  maximumWallEstimateMm: number;
  qc: CadMeshQcReport;
  warnings: string[];
};

export type CrownShellResult = {
  geometry: THREE.BufferGeometry;
  report: CrownShellReport;
};

type IndexedSurface = {
  positions: THREE.Vector3[];
  triangles: Array<[number, number, number]>;
};

/**
 * Builds a closed, stitched shell from the visible restoration geometry.
 *
 * This is an MVP geometry kernel: it creates an inner offset surface and
 * stitches the cervical boundary. The preparation-fit pass is approximate
 * nearest-surface fitting and is NOT a validated manufacturing intaglio.
 */
export function buildCrownShell(
  designMesh: THREE.Mesh,
  sourceIndex: CadSpatialIndex | null,
  params: CrownShellParameters,
): CrownShellResult {
  designMesh.updateMatrixWorld(true);
  const inverseWorld = designMesh.matrixWorld.clone().invert();
  const sourceGeometry = designMesh.geometry;
  sourceGeometry.computeBoundingBox();

  const box = sourceGeometry.boundingBox;
  if (!box) {
    throw new Error("Restorasyon bounding box hesaplanamadı.");
  }

  const height = Math.max(box.max.z - box.min.z, 0.001);
  const cutRatio = THREE.MathUtils.clamp(params.cervicalCutRatio, 0.02, 0.42);
  const cutZ = box.min.z + height * cutRatio;
  const weldTolerance = Math.max(sourceGeometry.boundingSphere?.radius ?? 10, 1) * 1e-5;

  const surface = cropAndWeldSurface(sourceGeometry, cutZ, weldTolerance);
  if (!surface.triangles.length || surface.positions.length < 4) {
    throw new Error("Crown shell için yeterli restorasyon yüzeyi üretilemedi.");
  }

  const normals = computeVertexNormals(surface);
  const wall = THREE.MathUtils.clamp(params.wallThicknessMm, 0.25, 3.5);
  const outerCount = surface.positions.length;
  const innerPositions = surface.positions.map((point, index) =>
    point.clone().addScaledVector(normals[index], -wall),
  );

  const boundaryEdges = collectBoundaryEdges(surface.triangles);
  let fittedInnerVertices = 0;
  let totalFitGap = 0;

  if (sourceIndex && params.innerFitBlend > 0) {
    const blend = THREE.MathUtils.clamp(params.innerFitBlend, 0, 1);
    const local = new THREE.Vector3();
    const world = new THREE.Vector3();
    const fittedWorld = new THREE.Vector3();

    for (let i = 0; i < innerPositions.length; i += 1) {
      local.copy(innerPositions[i]);
      const normalizedHeight = THREE.MathUtils.clamp((surface.positions[i].z - cutZ) / Math.max(box.max.z - cutZ, 0.001), 0, 1);

      // Intaglio influence deliberately fades towards the occlusal anatomy.
      const cervicalInfluence = 1 - smoothstep(0.34, 0.78, normalizedHeight);
      if (cervicalInfluence <= 0.001) continue;

      world.copy(local).applyMatrix4(designMesh.matrixWorld);
      const nearest = nearestCadSample(world, sourceIndex);
      if (!nearest) continue;

      const targetGap = targetFitGap(normalizedHeight, params);
      const outward = world.clone().sub(nearest.point);
      if (outward.lengthSq() < 1e-10) outward.copy(nearest.normal);
      outward.normalize();

      fittedWorld.copy(nearest.point).addScaledVector(outward, targetGap);
      const fittedLocal = fittedWorld.applyMatrix4(inverseWorld);
      const factor = blend * cervicalInfluence;
      innerPositions[i].lerp(fittedLocal, factor);
      fittedInnerVertices += 1;
      totalFitGap += targetGap;
    }
  }

  const positions: number[] = [];
  for (const point of surface.positions) positions.push(point.x, point.y, point.z);
  for (const point of innerPositions) positions.push(point.x, point.y, point.z);

  const indices: number[] = [];

  // Outer shell faces.
  for (const [a, b, c] of surface.triangles) {
    indices.push(a, b, c);
  }

  // Inner faces are reversed so their normals point into the cavity.
  for (const [a, b, c] of surface.triangles) {
    indices.push(c + outerCount, b + outerCount, a + outerCount);
  }

  // Stitch all open cervical boundary edges between outer and inner surfaces.
  for (const [a, b] of boundaryEdges) {
    const ai = a + outerCount;
    const bi = b + outerCount;
    indices.push(a, b, bi);
    indices.push(a, bi, ai);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const qc = analyzeCadMesh(geometry);
  const wallStats = estimateWall(surface.positions, innerPositions);
  const warnings: string[] = [];

  if (!qc.watertight) {
    warnings.push("Shell topolojisi watertight değil; STL üretiminden önce mesh repair gerekir.");
  }
  if (wallStats.min < wall * 0.72) {
    warnings.push(`Minimum wall tahmini ${wallStats.min.toFixed(2)} mm; hedef ${wall.toFixed(2)} mm.`);
  }
  if (boundaryEdges.length < 3) {
    warnings.push("Cervical boundary beklenenden küçük; cut ratio veya kaynak geometri kontrol edilmeli.");
  }
  if (sourceIndex && fittedInnerVertices === 0) {
    warnings.push("Preparation fit pass kaynak yüzeye uygulanamadı.");
  }
  if (!warnings.length) {
    warnings.push("Crown shell temel topoloji ve wall kontrolleri temiz.");
  }

  return {
    geometry,
    report: {
      outerVertexCount: outerCount,
      innerVertexCount: innerPositions.length,
      triangleCount: indices.length / 3,
      boundaryEdgeCountBeforeStitch: boundaryEdges.length,
      fittedInnerVertices,
      averageFitGapMm: fittedInnerVertices ? totalFitGap / fittedInnerVertices : 0,
      minimumWallEstimateMm: wallStats.min,
      maximumWallEstimateMm: wallStats.max,
      qc,
      warnings,
    },
  };
}

function cropAndWeldSurface(
  geometry: THREE.BufferGeometry,
  cutZ: number,
  tolerance: number,
): IndexedSurface {
  const source = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const position = source.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!position) {
    source.dispose();
    return { positions: [], triangles: [] };
  }

  const positions: THREE.Vector3[] = [];
  const triangles: Array<[number, number, number]> = [];
  const ids = new Map<string, number>();

  const getId = (point: THREE.Vector3) => {
    const key = `${Math.round(point.x / tolerance)}:${Math.round(point.y / tolerance)}:${Math.round(point.z / tolerance)}`;
    const existing = ids.get(key);
    if (existing !== undefined) return existing;
    const id = positions.length;
    positions.push(point.clone());
    ids.set(key, id);
    return id;
  };

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();

  for (let i = 0; i + 2 < position.count; i += 3) {
    a.set(position.getX(i), position.getY(i), position.getZ(i));
    b.set(position.getX(i + 1), position.getY(i + 1), position.getZ(i + 1));
    c.set(position.getX(i + 2), position.getY(i + 2), position.getZ(i + 2));

    // Keep only triangles fully above the cervical plane. This deliberately
    // creates one clean open boundary that can be stitched to the inner shell.
    if (a.z < cutZ || b.z < cutZ || c.z < cutZ) continue;

    const ia = getId(a);
    const ib = getId(b);
    const ic = getId(c);
    if (ia === ib || ib === ic || ic === ia) continue;
    triangles.push([ia, ib, ic]);
  }

  source.dispose();
  return { positions, triangles };
}

function computeVertexNormals(surface: IndexedSurface) {
  const normals = surface.positions.map(() => new THREE.Vector3());
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (const [ia, ib, ic] of surface.triangles) {
    ab.copy(surface.positions[ib]).sub(surface.positions[ia]);
    ac.copy(surface.positions[ic]).sub(surface.positions[ia]);
    normal.copy(ab).cross(ac);
    if (normal.lengthSq() < 1e-14) continue;
    normals[ia].add(normal);
    normals[ib].add(normal);
    normals[ic].add(normal);
  }

  for (const n of normals) {
    if (n.lengthSq() < 1e-12) n.set(0, 0, 1);
    else n.normalize();
  }

  return normals;
}

function collectBoundaryEdges(triangles: Array<[number, number, number]>) {
  const counts = new Map<string, { a: number; b: number; count: number }>();

  const add = (a: number, b: number) => {
    const low = Math.min(a, b);
    const high = Math.max(a, b);
    const key = `${low}:${high}`;
    const record = counts.get(key);
    if (record) record.count += 1;
    else counts.set(key, { a, b, count: 1 });
  };

  for (const [a, b, c] of triangles) {
    add(a, b);
    add(b, c);
    add(c, a);
  }

  return [...counts.values()]
    .filter((edge) => edge.count === 1)
    .map((edge) => [edge.a, edge.b] as [number, number]);
}

function targetFitGap(
  normalizedHeight: number,
  params: CrownShellParameters,
) {
  const transition = THREE.MathUtils.clamp(params.transitionMm / 4, 0.05, 0.8);
  if (normalizedHeight < transition) {
    const t = normalizedHeight / Math.max(transition, 0.001);
    return THREE.MathUtils.lerp(params.marginGapMm, params.cementGapMm, t);
  }

  const axialT = THREE.MathUtils.clamp((normalizedHeight - transition) / Math.max(1 - transition, 0.001), 0, 1);
  const base = THREE.MathUtils.lerp(params.axialGapMm, params.radialGapMm, axialT);
  return Math.max(0, base + Math.max(params.millingCompensationMm, 0) * 0.08 * (1 - axialT));
}

function estimateWall(outer: THREE.Vector3[], inner: THREE.Vector3[]) {
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  for (let i = 0; i < Math.min(outer.length, inner.length); i += 1) {
    const distance = outer[i].distanceTo(inner[i]);
    min = Math.min(min, distance);
    max = Math.max(max, distance);
  }
  return {
    min: Number.isFinite(min) ? min : 0,
    max,
  };
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = THREE.MathUtils.clamp((value - edge0) / Math.max(edge1 - edge0, 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
}
