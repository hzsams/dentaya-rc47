import * as THREE from "three";

import type { CadSpatialIndex } from "@/lib/cad-spatial-engine";
import { nearestCadSample } from "@/lib/cad-spatial-engine";

export type ContactAnalysisReport = {
  sampleCount: number;
  collisionCount: number;
  contactCount: number;
  clearanceCount: number;
  minimumSignedDistanceMm: number;
  averageAbsoluteDistanceMm: number;
  collisionRatio: number;
};

export function analyzeMeshContact(
  mesh: THREE.Mesh,
  sourceIndex: CadSpatialIndex,
  contactThresholdMm = 0.18,
  sourceTranslation=new THREE.Vector3(),
): ContactAnalysisReport {
  mesh.updateMatrixWorld(true);
  const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
  const world = new THREE.Vector3();

  const step = Math.max(1, Math.ceil(position.count / 25_000));
  let sampleCount = 0;
  let collisionCount = 0;
  let contactCount = 0;
  let clearanceCount = 0;
  let minimumSignedDistance = Infinity;
  let totalAbsoluteDistance = 0;

  for (let i = 0; i < position.count; i += step) {
    world
      .set(position.getX(i), position.getY(i), position.getZ(i))
      .applyMatrix4(mesh.matrixWorld).sub(sourceTranslation);

    const nearest = nearestCadSample(world, sourceIndex);
    if (!nearest) continue;

    sampleCount += 1;
    const signed = nearest.signedDistance;
    minimumSignedDistance = Math.min(minimumSignedDistance, signed);
    totalAbsoluteDistance += nearest.distance;

    if (signed < -0.03) collisionCount += 1;
    else if (nearest.distance <= contactThresholdMm) contactCount += 1;
    else clearanceCount += 1;
  }

  return {
    sampleCount,
    collisionCount,
    contactCount,
    clearanceCount,
    minimumSignedDistanceMm: Number.isFinite(minimumSignedDistance) ? minimumSignedDistance : 0,
    averageAbsoluteDistanceMm: sampleCount ? totalAbsoluteDistance / sampleCount : 0,
    collisionRatio: sampleCount ? collisionCount / sampleCount : 0,
  };
}

export function buildContactColors(
  mesh: THREE.Mesh,
  sourceIndex: CadSpatialIndex,
  targetMm = 0.18,
  sourceTranslation=new THREE.Vector3(),
) {
  mesh.updateMatrixWorld(true);
  const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const world = new THREE.Vector3();
  const color = new THREE.Color();

  for (let i = 0; i < position.count; i += 1) {
    world
      .set(position.getX(i), position.getY(i), position.getZ(i))
      .applyMatrix4(mesh.matrixWorld).sub(sourceTranslation);

    const nearest = nearestCadSample(world, sourceIndex);

    if (!nearest) {
      color.setRGB(0.24, 0.5, 0.86);
    } else if (nearest.signedDistance < -0.03) {
      color.setRGB(0.95, 0.16, 0.2);
    } else if (nearest.distance <= targetMm) {
      color.setRGB(0.98, 0.67, 0.14);
    } else if (nearest.distance <= targetMm * 2.5) {
      color.setRGB(0.2, 0.82, 0.55);
    } else {
      color.setRGB(0.22, 0.48, 0.83);
    }

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  return colors;
}
