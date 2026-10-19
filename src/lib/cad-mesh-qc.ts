import * as THREE from "three";

import { buildIndexedMeshRecord } from "@/lib/cad-mesh-record";

export type CadMeshQcReport = {
  vertexCount: number;
  uniqueVertexCount: number;
  triangleCount: number;
  degenerateTriangles: number;
  boundaryEdges: number;
  nonManifoldEdges: number;
  watertight: boolean;
  boundingSizeMm: { x: number; y: number; z: number };
  surfaceAreaMm2: number;
  boundaryLoops: number;
  openBoundaryChains: number;
  connectedComponents: number;
  inconsistentWindingEdges: number;
  isolatedVertices: number;
  eulerCharacteristic: number;
  warnings: string[];
};

export function analyzeCadMesh(geometry: THREE.BufferGeometry): CadMeshQcReport {
  const position = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;

  if (!position) {
    return {
      vertexCount: 0,
      uniqueVertexCount: 0,
      triangleCount: 0,
      degenerateTriangles: 0,
      boundaryEdges: 0,
      nonManifoldEdges: 0,
      watertight: false,
      boundingSizeMm: { x: 0, y: 0, z: 0 },
      surfaceAreaMm2: 0,
      boundaryLoops: 0,
      openBoundaryChains: 0,
      connectedComponents: 0,
      inconsistentWindingEdges: 0,
      isolatedVertices: 0,
      eulerCharacteristic: 0,
      warnings: ["Pozisyon verisi bulunamadı."],
    };
  }

  const record = buildIndexedMeshRecord(geometry);
  const size = record.bounds.getSize(new THREE.Vector3());
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const cross = new THREE.Vector3();
  let surfaceAreaMm2 = 0;

  for (let triangle = 0; triangle < record.triangleCount; triangle += 1) {
    const offset = triangle * 3;
    readRecordPoint(record.positions, record.triangles[offset], a);
    readRecordPoint(record.positions, record.triangles[offset + 1], b);
    readRecordPoint(record.positions, record.triangles[offset + 2], c);

    ab.copy(b).sub(a);
    ac.copy(c).sub(a);
    const area = cross.copy(ab).cross(ac).length() * 0.5;
    surfaceAreaMm2 += area;
  }

  const topology = record.topology;
  const warnings: string[] = [];
  if (record.removedDegenerateTriangles) warnings.push(`${record.removedDegenerateTriangles} dejenere üçgen bulundu.`);
  if (topology.boundaryHalfEdgeCount) warnings.push(`${topology.boundaryHalfEdgeCount} açık sınır kenarı bulundu.`);
  if (topology.nonManifoldEdgeCount) warnings.push(`${topology.nonManifoldEdgeCount} non-manifold kenar bulundu.`);
  if (topology.inconsistentWindingEdgeCount) warnings.push(`${topology.inconsistentWindingEdgeCount} ters/eş yönlü komşu kenar bulundu.`);
  if (topology.connectedComponentCount > 1) warnings.push(`${topology.connectedComponentCount} ayrık mesh bileşeni bulundu.`);
  if (!warnings.length) warnings.push("Temel mesh topoloji kontrolü temiz.");

  return {
    vertexCount: position.count,
    uniqueVertexCount: record.vertexCount,
    triangleCount: record.inputTriangleCount,
    degenerateTriangles: record.removedDegenerateTriangles,
    boundaryEdges: topology.boundaryHalfEdgeCount,
    nonManifoldEdges: topology.nonManifoldEdgeCount,
    watertight:
      record.triangleCount > 0 &&
      topology.boundaryHalfEdgeCount === 0 &&
      topology.nonManifoldEdgeCount === 0 &&
      topology.inconsistentWindingEdgeCount === 0,
    boundingSizeMm: { x: size.x, y: size.y, z: size.z },
    surfaceAreaMm2,
    boundaryLoops: topology.boundaryLoops.length,
    openBoundaryChains: topology.openBoundaryChains.length,
    connectedComponents: topology.connectedComponentCount,
    inconsistentWindingEdges: topology.inconsistentWindingEdgeCount,
    isolatedVertices: topology.isolatedVertices.length,
    eulerCharacteristic: topology.eulerCharacteristic,
    warnings,
  };
}

function readRecordPoint(
  positions: Float64Array,
  vertex: number,
  target: THREE.Vector3,
) {
  const offset = vertex * 3;
  return target.set(positions[offset], positions[offset + 1], positions[offset + 2]);
}
