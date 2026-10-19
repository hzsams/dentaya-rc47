import * as THREE from "three";

/** Position-only welding: UV seams must not become cracks during deformation.
 * Call only for untextured editable restoration geometry, never patient scans.
 */
export function synchronizeSculptSeams(geometry: THREE.BufferGeometry) {
  const p = geometry.getAttribute("position") as THREE.BufferAttribute;
  const n = geometry.getAttribute("normal") as THREE.BufferAttribute;
  const groups = new Map<string, number[]>();
  for (let i = 0; i < p.count; i++) {
    const key = [p.getX(i), p.getY(i), p.getZ(i)].map(v => Math.round(v * 1e5)).join(":");
    const group = groups.get(key);
    if (group) group.push(i); else groups.set(key, [i]);
  }
  const seams = [...groups.values()].filter(group => group.length > 1);
  for (const group of seams) {
    const normal = new THREE.Vector3();
    for (const i of group) normal.add(new THREE.Vector3(n.getX(i), n.getY(i), n.getZ(i)));
    normal.normalize();
    for (const i of group) n.setXYZ(i, normal.x, normal.y, normal.z);
  }
  return seams;
}

/** Reject non-finite positions, collapsed or locally inverted triangles.
 * This is a local deformation guard, not a global self-intersection proof.
 */
export function commitSculptDeformation(
  geometry: THREE.BufferGeometry,
  before: Float32Array,
  seams: number[][],
): boolean {
  const p = geometry.getAttribute("position") as THREE.BufferAttribute;
  for (const group of seams) {
    const first = group[0];
    // Average displacement preserves coincident corners even when smoothing differed.
    const delta = new THREE.Vector3();
    for (const i of group) delta.add(new THREE.Vector3(
      p.getX(i) - before[i * 3], p.getY(i) - before[i * 3 + 1], p.getZ(i) - before[i * 3 + 2],
    ));
    delta.divideScalar(group.length);
    for (const i of group) p.setXYZ(i, before[first * 3] + delta.x, before[first * 3 + 1] + delta.y, before[first * 3 + 2] + delta.z);
  }
  let valid = Array.from(p.array).every(Number.isFinite);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const previous = new THREE.Vector3(), next = new THREE.Vector3();
  const count = geometry.index?.count ?? p.count;
  for (let t = 0; valid && t < count; t += 3) {
    const ids = [0, 1, 2].map(k => geometry.index ? geometry.index.getX(t + k) : t + k);
    a.fromArray(before, ids[0] * 3); b.fromArray(before, ids[1] * 3); c.fromArray(before, ids[2] * 3);
    previous.crossVectors(b.sub(a), c.sub(a));
    a.fromBufferAttribute(p, ids[0]); b.fromBufferAttribute(p, ids[1]); c.fromBufferAttribute(p, ids[2]);
    next.crossVectors(b.sub(a), c.sub(a));
    valid = next.lengthSq() > 1e-18 && previous.dot(next) > 0;
  }
  if (!valid) p.array.set(before);
  p.needsUpdate = true;
  return valid;
}

export function sculptNeighbors(geometry: THREE.BufferGeometry) {
  const result = new Map<number, Set<number>>();
  const count = geometry.index?.count ?? geometry.getAttribute("position").count;
  for (let t = 0; t < count; t += 3) {
    const ids = [0, 1, 2].map(k => geometry.index ? geometry.index.getX(t + k) : t + k);
    for (const i of ids) {
      if (!result.has(i)) result.set(i, new Set());
      for (const j of ids) if (i !== j) result.get(i)!.add(j);
    }
  }
  return result;
}
