import * as THREE from "three";

import {
  readMeshNormal,
  readMeshVertex,
  type IndexedMeshRecord,
} from "@/lib/cad-mesh-record";

export type CadBvhNode = {
  bounds: THREE.Box3;
  left: number;
  right: number;
  start: number;
  count: number;
};

export type CadMeshBvh = {
  record: IndexedMeshRecord;
  root: number;
  nodes: CadBvhNode[];
  triangleOrder: Uint32Array;
  leafSize: number;
  maxDepth: number;
};

export type CadBvhNearestPoint = {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  barycentric: THREE.Vector3;
  triangleIndex: number;
  vertexIndex: number;
  sourceIndex: number;
  distance: number;
  signedDistance: number;
  visitedNodes: number;
  testedTriangles: number;
};

export type CadBvhBuildOptions = {
  leafSize?: number;
  maxDepth?: number;
};

export function buildCadMeshBvh(
  record: IndexedMeshRecord,
  options: CadBvhBuildOptions = {},
): CadMeshBvh {
  const leafSize = Math.max(2, Math.min(options.leafSize ?? 12, 64));
  const maxDepth = Math.max(4, Math.min(options.maxDepth ?? 48, 64));
  const order = Array.from({ length: record.triangleCount }, (_, index) => index);
  const nodes: CadBvhNode[] = [];
  const centroid = new THREE.Vector3();

  const buildNode = (start: number, end: number, depth: number): number => {
    const bounds = triangleRangeBounds(record, order, start, end);
    const nodeIndex = nodes.length;
    const count = end - start;
    nodes.push({ bounds, left: -1, right: -1, start, count });

    if (count <= leafSize || depth >= maxDepth) return nodeIndex;

    const centroidBounds = new THREE.Box3();
    for (let index = start; index < end; index += 1) {
      triangleCentroid(record, order[index], centroid);
      centroidBounds.expandByPoint(centroid);
    }
    const size = centroidBounds.getSize(new THREE.Vector3());
    const axis = size.x >= size.y && size.x >= size.z ? 0 : size.y >= size.z ? 1 : 2;
    if (size.getComponent(axis) <= 1e-12) return nodeIndex;

    const sorted = order.slice(start, end).sort((first, second) => {
      return (
        triangleCentroidAxis(record, first, axis) -
        triangleCentroidAxis(record, second, axis)
      );
    });
    for (let index = 0; index < sorted.length; index += 1) {
      order[start + index] = sorted[index];
    }

    const middle = start + Math.floor(count / 2);
    if (middle <= start || middle >= end) return nodeIndex;

    const left = buildNode(start, middle, depth + 1);
    const right = buildNode(middle, end, depth + 1);
    nodes[nodeIndex] = { bounds, left, right, start: 0, count: 0 };
    return nodeIndex;
  };

  const root = record.triangleCount ? buildNode(0, record.triangleCount, 0) : -1;
  return {
    record,
    root,
    nodes,
    triangleOrder: Uint32Array.from(order),
    leafSize,
    maxDepth,
  };
}

export function nearestPointOnCadMesh(
  point: THREE.Vector3,
  bvh: CadMeshBvh,
  maxDistance = Infinity,
): CadBvhNearestPoint | null {
  if (bvh.root < 0 || !bvh.nodes.length) return null;

  const stack = [bvh.root];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const candidate = new THREE.Vector3();
  const barycentric = new THREE.Vector3();
  const bestPoint = new THREE.Vector3();
  const bestBarycentric = new THREE.Vector3();
  const closestScratch = {
    ab: new THREE.Vector3(),
    ac: new THREE.Vector3(),
    ap: new THREE.Vector3(),
    bp: new THREE.Vector3(),
    cp: new THREE.Vector3(),
    edge: new THREE.Vector3(),
  };
  let bestDistanceSq = Number.isFinite(maxDistance) ? maxDistance * maxDistance : Infinity;
  let bestTriangle = -1;
  let visitedNodes = 0;
  let testedTriangles = 0;

  while (stack.length) {
    const nodeIndex = stack.pop() as number;
    const node = bvh.nodes[nodeIndex];
    visitedNodes += 1;
    if (distanceSqToBox(point, node.bounds) > bestDistanceSq) continue;

    if (node.left < 0 || node.right < 0) {
      for (let offset = 0; offset < node.count; offset += 1) {
        const triangle = bvh.triangleOrder[node.start + offset];
        const triangleOffset = triangle * 3;
        readMeshVertex(bvh.record, bvh.record.triangles[triangleOffset], a);
        readMeshVertex(bvh.record, bvh.record.triangles[triangleOffset + 1], b);
        readMeshVertex(bvh.record, bvh.record.triangles[triangleOffset + 2], c);
        closestPointToTriangle(
          point,
          a,
          b,
          c,
          candidate,
          barycentric,
          closestScratch,
        );
        testedTriangles += 1;
        const distanceSq = point.distanceToSquared(candidate);
        if (distanceSq < bestDistanceSq) {
          bestDistanceSq = distanceSq;
          bestTriangle = triangle;
          bestPoint.copy(candidate);
          bestBarycentric.copy(barycentric);
        }
      }
      continue;
    }

    const leftDistance = distanceSqToBox(point, bvh.nodes[node.left].bounds);
    const rightDistance = distanceSqToBox(point, bvh.nodes[node.right].bounds);
    if (leftDistance < rightDistance) {
      if (rightDistance <= bestDistanceSq) stack.push(node.right);
      if (leftDistance <= bestDistanceSq) stack.push(node.left);
    } else {
      if (leftDistance <= bestDistanceSq) stack.push(node.left);
      if (rightDistance <= bestDistanceSq) stack.push(node.right);
    }
  }

  if (bestTriangle < 0) return null;

  const triangleOffset = bestTriangle * 3;
  const ia = bvh.record.triangles[triangleOffset];
  const ib = bvh.record.triangles[triangleOffset + 1];
  const ic = bvh.record.triangles[triangleOffset + 2];
  const normalA = readMeshNormal(bvh.record, ia, new THREE.Vector3());
  const normalB = readMeshNormal(bvh.record, ib, new THREE.Vector3());
  const normalC = readMeshNormal(bvh.record, ic, new THREE.Vector3());
  const normal = normalA
    .multiplyScalar(bestBarycentric.x)
    .addScaledVector(normalB, bestBarycentric.y)
    .addScaledVector(normalC, bestBarycentric.z);

  if (normal.lengthSq() <= 1e-16) {
    readMeshVertex(bvh.record, ia, a);
    readMeshVertex(bvh.record, ib, b);
    readMeshVertex(bvh.record, ic, c);
    normal.subVectors(b, a).cross(c.sub(a));
  }
  normal.normalize();

  const weights = [bestBarycentric.x, bestBarycentric.y, bestBarycentric.z];
  const vertices = [ia, ib, ic];
  let dominantCorner = 0;
  if (weights[1] > weights[dominantCorner]) dominantCorner = 1;
  if (weights[2] > weights[dominantCorner]) dominantCorner = 2;
  const vertexIndex = vertices[dominantCorner];
  const delta = point.clone().sub(bestPoint);

  return {
    point: bestPoint,
    normal,
    barycentric: bestBarycentric,
    triangleIndex: bestTriangle,
    vertexIndex,
    sourceIndex: bvh.record.vertexSourceIndices[vertexIndex] ?? vertexIndex,
    distance: Math.sqrt(bestDistanceSq),
    signedDistance: delta.dot(normal),
    visitedNodes,
    testedTriangles,
  };
}

export function queryCadMeshBvhAabb(box: THREE.Box3, bvh: CadMeshBvh) {
  if (bvh.root < 0) return [];
  const triangles: number[] = [];
  const stack = [bvh.root];

  while (stack.length) {
    const node = bvh.nodes[stack.pop() as number];
    if (!node.bounds.intersectsBox(box)) continue;
    if (node.left < 0 || node.right < 0) {
      for (let offset = 0; offset < node.count; offset += 1) {
        triangles.push(bvh.triangleOrder[node.start + offset]);
      }
    } else {
      stack.push(node.left, node.right);
    }
  }

  return triangles;
}

function triangleRangeBounds(
  record: IndexedMeshRecord,
  order: number[],
  start: number,
  end: number,
) {
  const bounds = new THREE.Box3();
  const point = new THREE.Vector3();
  for (let index = start; index < end; index += 1) {
    const triangleOffset = order[index] * 3;
    for (let corner = 0; corner < 3; corner += 1) {
      readMeshVertex(record, record.triangles[triangleOffset + corner], point);
      bounds.expandByPoint(point);
    }
  }
  return bounds;
}

function triangleCentroid(
  record: IndexedMeshRecord,
  triangle: number,
  target: THREE.Vector3,
) {
  return target.set(
    triangleCentroidAxis(record, triangle, 0),
    triangleCentroidAxis(record, triangle, 1),
    triangleCentroidAxis(record, triangle, 2),
  );
}

function triangleCentroidAxis(
  record: IndexedMeshRecord,
  triangle: number,
  axis: number,
) {
  const offset = triangle * 3;
  const positionOffsetA = record.triangles[offset] * 3 + axis;
  const positionOffsetB = record.triangles[offset + 1] * 3 + axis;
  const positionOffsetC = record.triangles[offset + 2] * 3 + axis;
  return (
    record.positions[positionOffsetA] +
    record.positions[positionOffsetB] +
    record.positions[positionOffsetC]
  ) / 3;
}

function distanceSqToBox(point: THREE.Vector3, box: THREE.Box3) {
  let distanceSq = 0;
  for (const axis of ["x", "y", "z"] as const) {
    const value = point[axis];
    if (value < box.min[axis]) distanceSq += (box.min[axis] - value) ** 2;
    else if (value > box.max[axis]) distanceSq += (value - box.max[axis]) ** 2;
  }
  return distanceSq;
}

function closestPointToTriangle(
  point: THREE.Vector3,
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  target: THREE.Vector3,
  barycentric: THREE.Vector3,
  scratch: {
    ab: THREE.Vector3;
    ac: THREE.Vector3;
    ap: THREE.Vector3;
    bp: THREE.Vector3;
    cp: THREE.Vector3;
    edge: THREE.Vector3;
  },
) {
  const { ab, ac, ap, bp, cp, edge } = scratch;
  ab.subVectors(b, a);
  ac.subVectors(c, a);
  ap.subVectors(point, a);
  const d1 = ab.dot(ap);
  const d2 = ac.dot(ap);
  if (d1 <= 0 && d2 <= 0) {
    barycentric.set(1, 0, 0);
    return target.copy(a);
  }

  bp.subVectors(point, b);
  const d3 = ab.dot(bp);
  const d4 = ac.dot(bp);
  if (d3 >= 0 && d4 <= d3) {
    barycentric.set(0, 1, 0);
    return target.copy(b);
  }

  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    barycentric.set(1 - v, v, 0);
    return target.copy(a).addScaledVector(ab, v);
  }

  cp.subVectors(point, c);
  const d5 = ab.dot(cp);
  const d6 = ac.dot(cp);
  if (d6 >= 0 && d5 <= d6) {
    barycentric.set(0, 0, 1);
    return target.copy(c);
  }

  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    barycentric.set(1 - w, 0, w);
    return target.copy(a).addScaledVector(ac, w);
  }

  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    edge.subVectors(c, b);
    const w = (d4 - d3) / (d4 - d3 + d5 - d6);
    barycentric.set(0, 1 - w, w);
    return target.copy(b).addScaledVector(edge, w);
  }

  const denominator = 1 / (va + vb + vc);
  const v = vb * denominator;
  const w = vc * denominator;
  barycentric.set(1 - v - w, v, w);
  return target.copy(a).addScaledVector(ab, v).addScaledVector(ac, w);
}
