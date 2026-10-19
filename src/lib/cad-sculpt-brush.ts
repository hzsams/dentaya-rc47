import * as THREE from "three";
import type { CadTool, CadSettings } from "@/app/design/DesignViewport";
import { commitSculptDeformation, sculptNeighbors, synchronizeSculptSeams } from "./cad-sculpt-integrity";
import { smoothMeshRegion } from "./cad-freeform-engine";

export function applyBrush(
  mesh: THREE.Mesh,
  worldPoint: THREE.Vector3,
  localNormalInput: THREE.Vector3,
  tool: CadTool,
  settings: CadSettings,
  strengthScale = 1,
  deferNormals = false,
) {
  const geometry = mesh.geometry;
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const normal = geometry.getAttribute("normal") as THREE.BufferAttribute;
  const before = new Float32Array(position.array);
  const seams = synchronizeSculptSeams(geometry);
  const localPoint = mesh.worldToLocal(worldPoint.clone());
  const localNormal = localNormalInput.clone().normalize();
  const radius = Math.max(settings.brush_radius_mm, 0.15);
  const strength = Math.max(settings.brush_strength_mm, 0.01) * THREE.MathUtils.clamp(strengthScale, 0.1, 1.5);
  const affected: number[] = [];

  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const minZ = box?.min.z ?? -1;
  const maxZ = box?.max.z ?? 1;
  const height = Math.max(maxZ - minZ, 0.001);
  const midZ = (minZ + maxZ) / 2;

  const falloffFor = (distance: number) => {
    const normalized = THREE.MathUtils.clamp(distance / radius, 0, 1);
    const hardness = THREE.MathUtils.clamp(settings.brush_hardness ?? 0.2, 0, 0.92);
    const edge = normalized <= hardness
      ? 0
      : (normalized - hardness) / Math.max(1 - hardness, 0.001);
    const t = THREE.MathUtils.clamp(1 - edge, 0, 1);
    const falloff = THREE.MathUtils.clamp(settings.brush_falloff ?? 1, 0.35, 3.5);
    if (settings.brush_shape === "flat") return t > 0 ? 1 : 0;
    const shapePower = settings.brush_shape === "pointed" ? 3.5 : 1.8;
    return Math.pow(t, shapePower * falloff);
  };

  const isLocked = (vertex: THREE.Vector3) => {
    if (settings.hold_cusp_tips && vertex.z > maxZ - height * 0.12) return true;
    if (settings.hold_equator && Math.abs(vertex.z - midZ) < height * 0.07) return true;
    return false;
  };

  for (let i = 0; i < position.count; i++) {
    const vertex = new THREE.Vector3(position.getX(i), position.getY(i), position.getZ(i));
    const distance = vertex.distanceTo(localPoint);
    if (distance > radius || isLocked(vertex)) continue;
    const facing = new THREE.Vector3(normal.getX(i), normal.getY(i), normal.getZ(i));
    if (facing.dot(localNormal) <= 0) continue; // Do not sculpt through the opposite wall.
    affected.push(i);
    const falloff = falloffFor(distance);

    if (tool === "add" || tool === "reduce") {
      const direction = tool === "add" ? 1 : -1;
      const n = new THREE.Vector3(normal.getX(i), normal.getY(i), normal.getZ(i)).normalize();
      const delta = n.multiplyScalar(direction * strength * falloff);
      if (settings.occlusal_only) {
        vertex.z += delta.z;
      } else {
        vertex.add(delta);
      }
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    if (tool === "flatten") {
      const planeDistance = vertex.clone().sub(localPoint).dot(localNormal);
      const factor = THREE.MathUtils.clamp(strength * 2.2, 0.06, 0.82) * falloff;
      const delta = localNormal.clone().multiplyScalar(-planeDistance * factor);
      if (settings.occlusal_only) {
        vertex.z += delta.z;
      } else {
        vertex.add(delta);
      }
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }

  if (tool === "smooth" && affected.length) {
    const locked = new Set<number>();
    for (const index of affected) {
      const vertex = new THREE.Vector3(position.getX(index), position.getY(index), position.getZ(index));
      if (isLocked(vertex)) locked.add(index);
    }

    smoothMeshRegion(position, normal, affected, {
      amount: THREE.MathUtils.clamp(settings.smoothing, 0.02, 0.75) * 0.42,
      neighborhoodRadius: Math.max(radius * 0.42, 0.25),
      preserveShape: settings.preserve_shape,
      occlusalOnly: settings.occlusal_only,
      locked,
      neighbors: sculptNeighbors(geometry),
    });
  }

  const candidate = new Float32Array(position.array);
  let accepted = commitSculptDeformation(geometry, before, seams);
  // Dense anatomical ridges can turn a full-strength stroke inside out. Keep
  // the same topology guard and try smaller displacements before rejecting it.
  if (!accepted && candidate.every(Number.isFinite)) {
    for (let scale = 0.5; scale >= 1 / 128; scale *= 0.5) {
      for (let i = 0; i < candidate.length; i++) {
        position.array[i] = before[i] + (candidate[i] - before[i]) * scale;
      }
      accepted = commitSculptDeformation(geometry, before, seams);
      if (accepted) break;
    }
  }
  position.needsUpdate = true;
  if (!deferNormals) {
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }
  return accepted;
}

