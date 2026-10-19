import * as THREE from "three";

export type FreeformSmoothOptions = {
  amount: number;
  neighborhoodRadius: number;
  preserveShape: boolean;
  occlusalOnly: boolean;
  locked?: Set<number>;
  neighbors?: Map<number, Set<number>>;
};

export function smoothMeshRegion(
  position: THREE.BufferAttribute,
  normal: THREE.BufferAttribute,
  affected: number[],
  options: FreeformSmoothOptions,
) {
  if (!affected.length) return;

  const amount = THREE.MathUtils.clamp(options.amount, 0.001, 0.65);
  const neighborhoodRadiusSq = Math.pow(Math.max(options.neighborhoodRadius, 0.1), 2);
  const source = new Map<number, THREE.Vector3>();
  const sourceNormals = new Map<number, THREE.Vector3>();

  for (const index of affected) {
    source.set(
      index,
      new THREE.Vector3(position.getX(index), position.getY(index), position.getZ(index)),
    );
    sourceNormals.set(
      index,
      new THREE.Vector3(normal.getX(index), normal.getY(index), normal.getZ(index)).normalize(),
    );
  }

  for (const index of affected) {
    if (options.locked?.has(index)) continue;
    const vertex = source.get(index);
    const vertexNormal = sourceNormals.get(index);
    if (!vertex || !vertexNormal) continue;

    const average = new THREE.Vector3();
    let neighborCount = 0;

    for (const otherIndex of options.neighbors?.get(index) ?? affected) {
      if (otherIndex === index) continue;
      if (options.neighbors && !options.neighbors.get(index)?.has(otherIndex)) continue;
      const neighbor = source.get(otherIndex);
      if (!neighbor || vertex.distanceToSquared(neighbor) > neighborhoodRadiusSq) continue;
      average.add(neighbor);
      neighborCount += 1;
    }

    if (!neighborCount) {
      continue;
    } else {
      average.divideScalar(neighborCount);
    }

    let delta = average.sub(vertex);

    if (options.preserveShape) {
      // Tangential smoothing reduces local noise while preserving the gross crown volume.
      const normalComponent = vertexNormal.clone().multiplyScalar(delta.dot(vertexNormal));
      delta = delta.sub(normalComponent).multiplyScalar(0.78).add(normalComponent.multiplyScalar(0.18));
    }

    const next = vertex.clone();
    if (options.occlusalOnly) {
      next.z += delta.z * amount;
    } else {
      next.addScaledVector(delta, amount);
    }

    position.setXYZ(index, next.x, next.y, next.z);
  }
}
