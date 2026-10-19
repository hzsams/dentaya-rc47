import * as THREE from "three";

export const CAD_MESH_RECORD_VERSION = 1 as const;

export type HalfEdgeTopology = {
  halfEdgeVertex: Int32Array;
  halfEdgeFace: Int32Array;
  halfEdgeNext: Int32Array;
  halfEdgePrevious: Int32Array;
  halfEdgeTwin: Int32Array;
  halfEdgeUndirectedEdge: Int32Array;
  vertexHalfEdge: Int32Array;
  vertexOutgoingOffsets: Uint32Array;
  vertexOutgoingHalfEdges: Int32Array;
  faceHalfEdge: Int32Array;
  edgeUseCounts: Uint32Array;
  undirectedEdgeCount: number;
  boundaryHalfEdgeCount: number;
  nonManifoldEdgeCount: number;
  inconsistentWindingEdgeCount: number;
  connectedComponentCount: number;
  faceComponents: Int32Array;
  boundaryLoops: number[][];
  openBoundaryChains: number[][];
  isolatedVertices: number[];
  eulerCharacteristic: number;
};

export type IndexedMeshRecord = {
  version: typeof CAD_MESH_RECORD_VERSION;
  sourceVertexCount: number;
  inputTriangleCount: number;
  vertexCount: number;
  triangleCount: number;
  removedDegenerateTriangles: number;
  weldTolerance: number;
  positions: Float64Array;
  normals: Float64Array;
  triangles: Uint32Array;
  sourceToVertex: Int32Array;
  vertexSourceIndices: Int32Array;
  bounds: THREE.Box3;
  topology: HalfEdgeTopology;
};

export type IndexedMeshBuildOptions = {
  matrix?: THREE.Matrix4;
  weldTolerance?: number;
  degenerateAreaEpsilon?: number;
};

export function buildIndexedMeshRecord(
  geometry: THREE.BufferGeometry,
  options: IndexedMeshBuildOptions = {},
): IndexedMeshRecord {
  const position = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!position) return emptyIndexedMeshRecord();

  const matrix = options.matrix ?? new THREE.Matrix4();
  const rawBounds = new THREE.Box3();
  const transformed = new THREE.Vector3();

  for (let i = 0; i < position.count; i += 1) {
    transformed
      .set(position.getX(i), position.getY(i), position.getZ(i))
      .applyMatrix4(matrix);
    rawBounds.expandByPoint(transformed);
  }

  const rawSize = rawBounds.getSize(new THREE.Vector3());
  const diagonal = Math.max(rawSize.length(), 1);
  const weldTolerance = Math.max(
    options.weldTolerance ?? diagonal * 1e-6,
    1e-7,
  );
  const toleranceSq = weldTolerance * weldTolerance;
  const buckets = new Map<string, number[]>();
  const sumX: number[] = [];
  const sumY: number[] = [];
  const sumZ: number[] = [];
  const counts: number[] = [];
  const vertexSourceIndices: number[] = [];
  const sourceToVertex = new Int32Array(position.count);

  for (let sourceIndex = 0; sourceIndex < position.count; sourceIndex += 1) {
    transformed
      .set(
        position.getX(sourceIndex),
        position.getY(sourceIndex),
        position.getZ(sourceIndex),
      )
      .applyMatrix4(matrix);

    const cellX = Math.floor(transformed.x / weldTolerance);
    const cellY = Math.floor(transformed.y / weldTolerance);
    const cellZ = Math.floor(transformed.z / weldTolerance);
    let canonical = -1;
    let bestDistanceSq = toleranceSq;

    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dz = -1; dz <= 1; dz += 1) {
          const candidates = buckets.get(
            cellKey(cellX + dx, cellY + dy, cellZ + dz),
          );
          if (!candidates) continue;

          for (const candidate of candidates) {
            const divisor = counts[candidate];
            const deltaX = transformed.x - sumX[candidate] / divisor;
            const deltaY = transformed.y - sumY[candidate] / divisor;
            const deltaZ = transformed.z - sumZ[candidate] / divisor;
            const distanceSq = deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ;
            if (distanceSq <= bestDistanceSq) {
              bestDistanceSq = distanceSq;
              canonical = candidate;
            }
          }
        }
      }
    }

    if (canonical < 0) {
      canonical = counts.length;
      sumX.push(transformed.x);
      sumY.push(transformed.y);
      sumZ.push(transformed.z);
      counts.push(1);
      vertexSourceIndices.push(sourceIndex);
      const key = cellKey(cellX, cellY, cellZ);
      const bucket = buckets.get(key);
      if (bucket) bucket.push(canonical);
      else buckets.set(key, [canonical]);
    } else {
      sumX[canonical] += transformed.x;
      sumY[canonical] += transformed.y;
      sumZ[canonical] += transformed.z;
      counts[canonical] += 1;
    }

    sourceToVertex[sourceIndex] = canonical;
  }

  const positions = new Float64Array(counts.length * 3);
  const bounds = new THREE.Box3();
  for (let vertex = 0; vertex < counts.length; vertex += 1) {
    const offset = vertex * 3;
    positions[offset] = sumX[vertex] / counts[vertex];
    positions[offset + 1] = sumY[vertex] / counts[vertex];
    positions[offset + 2] = sumZ[vertex] / counts[vertex];
    bounds.expandByPoint(
      transformed.set(positions[offset], positions[offset + 1], positions[offset + 2]),
    );
  }

  const inputTriangleCount = Math.floor(
    (geometry.index ? geometry.index.count : position.count) / 3,
  );
  const triangleValues: number[] = [];
  const areaEpsilon = Math.max(
    options.degenerateAreaEpsilon ?? diagonal * diagonal * 1e-14,
    1e-14,
  );
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  let removedDegenerateTriangles = 0;

  for (let triangle = 0; triangle < inputTriangleCount; triangle += 1) {
    const rawA = geometry.index ? geometry.index.getX(triangle * 3) : triangle * 3;
    const rawB = geometry.index ? geometry.index.getX(triangle * 3 + 1) : triangle * 3 + 1;
    const rawC = geometry.index ? geometry.index.getX(triangle * 3 + 2) : triangle * 3 + 2;
    const ia = sourceToVertex[rawA];
    const ib = sourceToVertex[rawB];
    const ic = sourceToVertex[rawC];

    if (ia === ib || ib === ic || ic === ia) {
      removedDegenerateTriangles += 1;
      continue;
    }

    readPosition(positions, ia, a);
    readPosition(positions, ib, b);
    readPosition(positions, ic, c);
    const doubledArea = ab.copy(b).sub(a).cross(ac.copy(c).sub(a)).length();
    if (doubledArea * 0.5 <= areaEpsilon) {
      removedDegenerateTriangles += 1;
      continue;
    }

    triangleValues.push(ia, ib, ic);
  }

  const triangles = Uint32Array.from(triangleValues);
  const normals = buildVertexNormals(positions, triangles);
  const topology = buildHalfEdgeTopology(counts.length, triangles);

  return {
    version: CAD_MESH_RECORD_VERSION,
    sourceVertexCount: position.count,
    inputTriangleCount,
    vertexCount: counts.length,
    triangleCount: triangles.length / 3,
    removedDegenerateTriangles,
    weldTolerance,
    positions,
    normals,
    triangles,
    sourceToVertex,
    vertexSourceIndices: Int32Array.from(vertexSourceIndices),
    bounds,
    topology,
  };
}

export function meshVertexNeighbors(record: IndexedMeshRecord, vertex: number) {
  if (vertex < 0 || vertex >= record.vertexCount) return [];
  const neighbors = new Set<number>();
  const {
    halfEdgeVertex,
    halfEdgeNext,
    halfEdgePrevious,
    vertexOutgoingOffsets,
    vertexOutgoingHalfEdges,
  } = record.topology;
  const start = vertexOutgoingOffsets[vertex];
  const end = vertexOutgoingOffsets[vertex + 1];
  for (let cursor = start; cursor < end; cursor += 1) {
    const halfEdge = vertexOutgoingHalfEdges[cursor];
    neighbors.add(halfEdgeVertex[halfEdgeNext[halfEdge]]);
    neighbors.add(halfEdgeVertex[halfEdgePrevious[halfEdge]]);
  }
  neighbors.delete(vertex);
  return [...neighbors];
}

export function meshFaceNeighbors(record: IndexedMeshRecord, face: number) {
  if (face < 0 || face >= record.triangleCount) return [];
  const neighbors = new Set<number>();
  const { faceHalfEdge, halfEdgeNext, halfEdgeTwin, halfEdgeFace } = record.topology;
  let halfEdge = faceHalfEdge[face];
  for (let corner = 0; corner < 3; corner += 1) {
    const twin = halfEdgeTwin[halfEdge];
    if (twin >= 0) neighbors.add(halfEdgeFace[twin]);
    halfEdge = halfEdgeNext[halfEdge];
  }
  return [...neighbors];
}

export function readMeshVertex(
  record: IndexedMeshRecord,
  vertex: number,
  target = new THREE.Vector3(),
) {
  return readPosition(record.positions, vertex, target);
}

export function readMeshNormal(
  record: IndexedMeshRecord,
  vertex: number,
  target = new THREE.Vector3(),
) {
  return readPosition(record.normals, vertex, target);
}

function emptyIndexedMeshRecord(): IndexedMeshRecord {
  const topology = buildHalfEdgeTopology(0, new Uint32Array());
  return {
    version: CAD_MESH_RECORD_VERSION,
    sourceVertexCount: 0,
    inputTriangleCount: 0,
    vertexCount: 0,
    triangleCount: 0,
    removedDegenerateTriangles: 0,
    weldTolerance: 1e-7,
    positions: new Float64Array(),
    normals: new Float64Array(),
    triangles: new Uint32Array(),
    sourceToVertex: new Int32Array(),
    vertexSourceIndices: new Int32Array(),
    bounds: new THREE.Box3(),
    topology,
  };
}

function buildVertexNormals(positions: Float64Array, triangles: Uint32Array) {
  const normals = new Float64Array(positions.length);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const faceNormal = new THREE.Vector3();
  const edge = new THREE.Vector3();

  for (let index = 0; index < triangles.length; index += 3) {
    const ia = triangles[index];
    const ib = triangles[index + 1];
    const ic = triangles[index + 2];
    readPosition(positions, ia, a);
    readPosition(positions, ib, b);
    readPosition(positions, ic, c);
    faceNormal.subVectors(b, a).cross(edge.subVectors(c, a));

    for (const vertex of [ia, ib, ic]) {
      const offset = vertex * 3;
      normals[offset] += faceNormal.x;
      normals[offset + 1] += faceNormal.y;
      normals[offset + 2] += faceNormal.z;
    }
  }

  for (let vertex = 0; vertex < positions.length / 3; vertex += 1) {
    const offset = vertex * 3;
    const length = Math.hypot(
      normals[offset],
      normals[offset + 1],
      normals[offset + 2],
    );
    if (length > 1e-12) {
      normals[offset] /= length;
      normals[offset + 1] /= length;
      normals[offset + 2] /= length;
    }
  }

  return normals;
}

function buildHalfEdgeTopology(
  vertexCount: number,
  triangles: Uint32Array,
): HalfEdgeTopology {
  const faceCount = triangles.length / 3;
  const halfEdgeCount = triangles.length;
  const halfEdgeVertex = new Int32Array(halfEdgeCount);
  const halfEdgeFace = new Int32Array(halfEdgeCount);
  const halfEdgeNext = new Int32Array(halfEdgeCount);
  const halfEdgePrevious = new Int32Array(halfEdgeCount);
  const halfEdgeTwin = new Int32Array(halfEdgeCount).fill(-1);
  const halfEdgeUndirectedEdge = new Int32Array(halfEdgeCount).fill(-1);
  const vertexHalfEdge = new Int32Array(vertexCount).fill(-1);
  const faceHalfEdge = new Int32Array(faceCount).fill(-1);
  const edgeGroups = new Map<string, number[]>();

  for (let face = 0; face < faceCount; face += 1) {
    const first = face * 3;
    faceHalfEdge[face] = first;
    for (let corner = 0; corner < 3; corner += 1) {
      const halfEdge = first + corner;
      const origin = triangles[halfEdge];
      const destination = triangles[first + ((corner + 1) % 3)];
      halfEdgeVertex[halfEdge] = origin;
      halfEdgeFace[halfEdge] = face;
      halfEdgeNext[halfEdge] = first + ((corner + 1) % 3);
      halfEdgePrevious[halfEdge] = first + ((corner + 2) % 3);
      if (vertexHalfEdge[origin] < 0) vertexHalfEdge[origin] = halfEdge;
      const key = edgeKey(origin, destination);
      const group = edgeGroups.get(key);
      if (group) group.push(halfEdge);
      else edgeGroups.set(key, [halfEdge]);
    }
  }

  const vertexOutgoingOffsets = new Uint32Array(vertexCount + 1);
  for (let halfEdge = 0; halfEdge < halfEdgeCount; halfEdge += 1) {
    vertexOutgoingOffsets[halfEdgeVertex[halfEdge] + 1] += 1;
  }
  for (let vertex = 1; vertex < vertexOutgoingOffsets.length; vertex += 1) {
    vertexOutgoingOffsets[vertex] += vertexOutgoingOffsets[vertex - 1];
  }
  const outgoingCursor = new Uint32Array(vertexOutgoingOffsets);
  const vertexOutgoingHalfEdges = new Int32Array(halfEdgeCount);
  for (let halfEdge = 0; halfEdge < halfEdgeCount; halfEdge += 1) {
    const origin = halfEdgeVertex[halfEdge];
    vertexOutgoingHalfEdges[outgoingCursor[origin]] = halfEdge;
    outgoingCursor[origin] += 1;
  }

  const edgeUseCounts = new Uint32Array(edgeGroups.size);
  let boundaryHalfEdgeCount = 0;
  let nonManifoldEdgeCount = 0;
  let inconsistentWindingEdgeCount = 0;
  let edgeId = 0;

  for (const group of edgeGroups.values()) {
    edgeUseCounts[edgeId] = group.length;
    for (const halfEdge of group) halfEdgeUndirectedEdge[halfEdge] = edgeId;

    if (group.length === 1) {
      boundaryHalfEdgeCount += 1;
    } else if (group.length === 2) {
      const first = group[0];
      const second = group[1];
      const firstDestination = halfEdgeVertex[halfEdgeNext[first]];
      const secondDestination = halfEdgeVertex[halfEdgeNext[second]];
      if (
        halfEdgeVertex[first] === secondDestination &&
        halfEdgeVertex[second] === firstDestination
      ) {
        halfEdgeTwin[first] = second;
        halfEdgeTwin[second] = first;
      } else {
        inconsistentWindingEdgeCount += 1;
      }
    } else {
      nonManifoldEdgeCount += 1;
    }
    edgeId += 1;
  }

  const { boundaryLoops, openBoundaryChains } = traceBoundaries(
    halfEdgeVertex,
    halfEdgeNext,
    halfEdgeUndirectedEdge,
    edgeUseCounts,
  );
  const { faceComponents, connectedComponentCount } = labelFaceComponents(
    faceCount,
    edgeGroups,
    halfEdgeFace,
  );
  const isolatedVertices: number[] = [];
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    if (vertexHalfEdge[vertex] < 0) isolatedVertices.push(vertex);
  }

  return {
    halfEdgeVertex,
    halfEdgeFace,
    halfEdgeNext,
    halfEdgePrevious,
    halfEdgeTwin,
    halfEdgeUndirectedEdge,
    vertexHalfEdge,
    vertexOutgoingOffsets,
    vertexOutgoingHalfEdges,
    faceHalfEdge,
    edgeUseCounts,
    undirectedEdgeCount: edgeGroups.size,
    boundaryHalfEdgeCount,
    nonManifoldEdgeCount,
    inconsistentWindingEdgeCount,
    connectedComponentCount,
    faceComponents,
    boundaryLoops,
    openBoundaryChains,
    isolatedVertices,
    eulerCharacteristic: vertexCount - edgeGroups.size + faceCount,
  };
}

function traceBoundaries(
  halfEdgeVertex: Int32Array,
  halfEdgeNext: Int32Array,
  halfEdgeUndirectedEdge: Int32Array,
  edgeUseCounts: Uint32Array,
) {
  const byOrigin = new Map<number, number[]>();
  for (let halfEdge = 0; halfEdge < halfEdgeUndirectedEdge.length; halfEdge += 1) {
    if (edgeUseCounts[halfEdgeUndirectedEdge[halfEdge]] !== 1) continue;
    const origin = halfEdgeVertex[halfEdge];
    const bucket = byOrigin.get(origin);
    if (bucket) bucket.push(halfEdge);
    else byOrigin.set(origin, [halfEdge]);
  }

  const visited = new Set<number>();
  const boundaryLoops: number[][] = [];
  const openBoundaryChains: number[][] = [];

  for (let seed = 0; seed < halfEdgeUndirectedEdge.length; seed += 1) {
    if (
      edgeUseCounts[halfEdgeUndirectedEdge[seed]] !== 1 ||
      visited.has(seed)
    ) continue;
    const vertices: number[] = [];
    let current = seed;
    let closed = false;

    while (!visited.has(current)) {
      visited.add(current);
      vertices.push(halfEdgeVertex[current]);
      const destination = halfEdgeVertex[halfEdgeNext[current]];
      const candidates = byOrigin.get(destination) ?? [];
      const next = candidates.find((candidate) => !visited.has(candidate));
      if (next === undefined) {
        vertices.push(destination);
        closed = destination === halfEdgeVertex[seed];
        break;
      }
      current = next;
    }

    if (closed) boundaryLoops.push(vertices);
    else openBoundaryChains.push(vertices);
  }

  return { boundaryLoops, openBoundaryChains };
}

function labelFaceComponents(
  faceCount: number,
  edgeGroups: Map<string, number[]>,
  halfEdgeFace: Int32Array,
) {
  const parent = new Int32Array(faceCount);
  for (let face = 0; face < faceCount; face += 1) parent[face] = face;

  const find = (value: number) => {
    let root = value;
    while (parent[root] !== root) root = parent[root];
    while (parent[value] !== value) {
      const next = parent[value];
      parent[value] = root;
      value = next;
    }
    return root;
  };
  const union = (first: number, second: number) => {
    const firstRoot = find(first);
    const secondRoot = find(second);
    if (firstRoot !== secondRoot) parent[secondRoot] = firstRoot;
  };

  for (const group of edgeGroups.values()) {
    if (group.length < 2) continue;
    const firstFace = halfEdgeFace[group[0]];
    for (let index = 1; index < group.length; index += 1) {
      union(firstFace, halfEdgeFace[group[index]]);
    }
  }

  const faceComponents = new Int32Array(faceCount).fill(-1);
  const componentByRoot = new Map<number, number>();
  for (let face = 0; face < faceCount; face += 1) {
    const root = find(face);
    let component = componentByRoot.get(root);
    if (component === undefined) {
      component = componentByRoot.size;
      componentByRoot.set(root, component);
    }
    faceComponents[face] = component;
  }

  return {
    faceComponents,
    connectedComponentCount: componentByRoot.size,
  };
}

function readPosition(
  values: Float64Array,
  vertex: number,
  target: THREE.Vector3,
) {
  const offset = vertex * 3;
  return target.set(values[offset], values[offset + 1], values[offset + 2]);
}

function edgeKey(a: number, b: number) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function cellKey(x: number, y: number, z: number) {
  return `${x}:${y}:${z}`;
}
