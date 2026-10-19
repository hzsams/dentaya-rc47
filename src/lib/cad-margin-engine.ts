import * as THREE from "three";

import type { CadSpatialIndex } from "@/lib/cad-spatial-engine";
import { nearestCadSample } from "@/lib/cad-spatial-engine";

export type CadMarginPoint = {
  x: number;
  y: number;
  z: number;
};

export type MarginEngineOptions = {
  iterations?: number;
  smoothing?: number;
  projectionStrength?: number;
  offsetMm?: number;
};

export type MarginQualityReport = {
  pointCount: number;
  perimeterMm: number;
  averageSegmentMm: number;
  maxSegmentMm: number;
  minSegmentMm: number;
  closureGapMm: number;
  projectedRatio: number;
};

export function smoothProjectedMargin(
  points: CadMarginPoint[],
  index: CadSpatialIndex,
  options: MarginEngineOptions = {},
) {
  if (points.length < 3) return points;

  const iterations = Math.max(1, Math.min(options.iterations ?? 2, 8));
  const smoothing = clamp(options.smoothing ?? 0.36, 0, 0.85);
  const projectionStrength = clamp(options.projectionStrength ?? 1, 0, 1);
  const offsetMm = options.offsetMm ?? 0;

  let current = points.map(toVector);

  for (let pass = 0; pass < iterations; pass += 1) {
    const next = current.map((point, indexOfPoint) => {
      const previous = current[(indexOfPoint - 1 + current.length) % current.length];
      const following = current[(indexOfPoint + 1) % current.length];
      const neighborhood = previous.clone().add(following).multiplyScalar(0.5);
      return point.clone().lerp(neighborhood, smoothing);
    });

    current = next.map((point) => {
      const nearest = nearestCadSample(point, index);
      if (!nearest) return point;

      const projected = nearest.point
        .clone()
        .add(nearest.normal.clone().multiplyScalar(offsetMm));

      return point.clone().lerp(projected, projectionStrength);
    });
  }

  return current.map(toPoint);
}

export function projectMarginToSurface(
  points: CadMarginPoint[],
  index: CadSpatialIndex,
  offsetMm = 0,
) {
  return points.map((point) => {
    const nearest = nearestCadSample(toVector(point), index);
    if (!nearest) return point;
    return toPoint(
      nearest.point
        .clone()
        .add(nearest.normal.clone().multiplyScalar(offsetMm)),
    );
  });
}

export function offsetMarginAlongSurfaceNormals(
  points: CadMarginPoint[],
  index: CadSpatialIndex,
  amountMm: number,
) {
  return points.map((point) => {
    const nearest = nearestCadSample(toVector(point), index);
    if (!nearest) return point;
    return toPoint(nearest.point.clone().add(nearest.normal.clone().multiplyScalar(amountMm)));
  });
}

export function resampleClosedMargin(points: CadMarginPoint[], targetCount = 64) {
  if (points.length < 3) return points;

  const vectors = points.map(toVector);
  const curve = new THREE.CatmullRomCurve3(vectors, true, "centripetal", 0.5);
  const count = Math.max(points.length, Math.min(targetCount, 256));
  return curve.getSpacedPoints(count - 1).map(toPoint);
}

export function marginQualityReport(
  points: CadMarginPoint[],
  index?: CadSpatialIndex,
): MarginQualityReport {
  if (points.length < 2) {
    return {
      pointCount: points.length,
      perimeterMm: 0,
      averageSegmentMm: 0,
      maxSegmentMm: 0,
      minSegmentMm: 0,
      closureGapMm: 0,
      projectedRatio: 0,
    };
  }

  const vectors = points.map(toVector);
  const distances: number[] = [];
  let perimeter = 0;

  for (let i = 0; i < vectors.length; i += 1) {
    const next = vectors[(i + 1) % vectors.length];
    const distance = vectors[i].distanceTo(next);
    distances.push(distance);
    perimeter += distance;
  }

  let projected = 0;
  if (index) {
    for (const vector of vectors) {
      const nearest = nearestCadSample(vector, index);
      if (nearest && nearest.distance <= Math.max(index.cellSize * 1.5, 0.35)) projected += 1;
    }
  }

  return {
    pointCount: points.length,
    perimeterMm: perimeter,
    averageSegmentMm: perimeter / distances.length,
    maxSegmentMm: Math.max(...distances),
    minSegmentMm: Math.min(...distances),
    closureGapMm: vectors[0].distanceTo(vectors[vectors.length - 1]),
    projectedRatio: index ? projected / vectors.length : 0,
  };
}

function toVector(point: CadMarginPoint) {
  return new THREE.Vector3(point.x, point.y, point.z);
}

function toPoint(vector: THREE.Vector3): CadMarginPoint {
  return { x: vector.x, y: vector.y, z: vector.z };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
