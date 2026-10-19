import * as THREE from "three";

export type UndercutReport = {
  sampleCount: number;
  undercutVertices: number;
  undercutRatio: number;
  severeVertices: number;
  maxSeverity: number;
};

export function analyzeUndercut(
  mesh: THREE.Mesh,
  insertionAxis: THREE.Vector3,
  threshold = -0.12,
): UndercutReport {
  mesh.updateMatrixWorld(true);
  const geometry = mesh.geometry;
  if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();

  const normal = geometry.getAttribute("normal") as THREE.BufferAttribute;
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  const axis = safeAxis(insertionAxis);
  const n = new THREE.Vector3();
  let undercutVertices = 0;
  let severeVertices = 0;
  let maxSeverity = 0;

  for (let i = 0; i < normal.count; i += 1) {
    n.set(normal.getX(i), normal.getY(i), normal.getZ(i)).applyMatrix3(normalMatrix).normalize();
    const facing = n.dot(axis);
    if (facing < threshold) {
      undercutVertices += 1;
      maxSeverity = Math.max(maxSeverity, Math.abs(facing));
      if (facing < -0.5) severeVertices += 1;
    }
  }

  return {
    sampleCount: normal.count,
    undercutVertices,
    undercutRatio: normal.count ? undercutVertices / normal.count : 0,
    severeVertices,
    maxSeverity,
  };
}

export function createUndercutBlockoutGeometry(
  sourceMesh: THREE.Mesh,
  insertionAxis: THREE.Vector3,
  depthMm = 0.35,
  threshold = -0.12,
) {
  const geometry = sourceMesh.geometry.clone();
  if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();

  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const normal = geometry.getAttribute("normal") as THREE.BufferAttribute;
  const axis = safeAxis(insertionAxis);

  for (let i = 0; i < position.count; i += 1) {
    const n = new THREE.Vector3(normal.getX(i), normal.getY(i), normal.getZ(i)).normalize();
    const facing = n.dot(axis);
    if (facing >= threshold) continue;

    const severity = THREE.MathUtils.clamp((threshold - facing) / Math.max(1 + threshold, 0.001), 0, 1);
    position.setXYZ(
      i,
      position.getX(i) + axis.x * depthMm * severity,
      position.getY(i) + axis.y * depthMm * severity,
      position.getZ(i) + axis.z * depthMm * severity,
    );
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function safeAxis(axis: THREE.Vector3) {
  const normalized = axis.clone();
  if (normalized.lengthSq() < 1e-8) normalized.set(0, 0, 1);
  return normalized.normalize();
}
