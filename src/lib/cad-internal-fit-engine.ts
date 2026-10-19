import * as THREE from "three";

import type { CadSpatialIndex } from "@/lib/cad-spatial-engine";
import { nearestCadSample } from "@/lib/cad-spatial-engine";

export type InternalFitParameters = {
  cementGapMm: number;
  marginGapMm: number;
  axialGapMm: number;
  radialGapMm: number;
  transitionMm: number;
  millingCompensationMm: number;
  strength: number;
};

export type InternalFitReport = {
  affectedVertices: number;
  averageBeforeMm: number;
  averageAfterMm: number;
  maxCorrectionMm: number;
  targetGapMm: number;
};

export function applyInternalFitRelief(
  mesh: THREE.Mesh,
  sourceIndex: CadSpatialIndex,
  params: InternalFitParameters,
): InternalFitReport {
  mesh.updateMatrixWorld(true);
  const inverseMatrix = mesh.matrixWorld.clone().invert();
  const geometry = mesh.geometry;
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;

  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const minZ = box?.min.z ?? -1;
  const maxZ = box?.max.z ?? 1;
  const height = Math.max(maxZ - minZ, 0.001);
  const cervicalLimit = minZ + height * 0.54;
  const marginBand = minZ + Math.min(Math.max(params.transitionMm, 0.2), height * 0.3);
  const world = new THREE.Vector3();
  const correctedWorld = new THREE.Vector3();
  const local = new THREE.Vector3();

  let affectedVertices = 0;
  let evaluatedVertices = 0;
  let totalBefore = 0;
  let totalAfter = 0;
  let maxCorrection = 0;

  for (let i = 0; i < position.count; i += 1) {
    local.set(position.getX(i), position.getY(i), position.getZ(i));
    if (local.z > cervicalLimit) continue;

    world.copy(local).applyMatrix4(mesh.matrixWorld);
    const nearest = nearestCadSample(world, sourceIndex);
    if (!nearest) continue;

    const cervicalT = THREE.MathUtils.clamp((local.z - minZ) / Math.max(cervicalLimit - minZ, 0.001), 0, 1);
    const targetGap =
      local.z <= marginBand
        ? THREE.MathUtils.lerp(params.marginGapMm, params.cementGapMm, cervicalT)
        : THREE.MathUtils.lerp(params.axialGapMm, params.radialGapMm, cervicalT);

    const millingAllowance = Math.max(0, params.millingCompensationMm) * (1 - cervicalT) * 0.2;
    const desired = Math.max(0, targetGap + millingAllowance);
    const current = nearest.distance;

    evaluatedVertices += 1;
    totalBefore += current;

    if (current < desired) {
      const direction = world.clone().sub(nearest.point);
      if (direction.lengthSq() < 1e-9) direction.copy(nearest.normal);
      direction.normalize();

      const correction = Math.min(desired - current, 1.5) * THREE.MathUtils.clamp(params.strength, 0.05, 1);
      correctedWorld.copy(world).addScaledVector(direction, correction);
      local.copy(correctedWorld).applyMatrix4(inverseMatrix);
      position.setXYZ(i, local.x, local.y, local.z);
      affectedVertices += 1;
      maxCorrection = Math.max(maxCorrection, correction);
      totalAfter += current + correction;
    } else {
      totalAfter += current;
    }
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const denominator = Math.max(evaluatedVertices, 1);
  return {
    affectedVertices,
    averageBeforeMm: totalBefore / denominator,
    averageAfterMm: totalAfter / denominator,
    maxCorrectionMm: maxCorrection,
    targetGapMm: params.cementGapMm,
  };
}
