import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CAD_INSPECTION_DEFAULTS, CAD_INSPECTION_MAX_NORMALS, cadCameraQuarterTurn, cadInspectionGeometryFingerprint, cadSectionPlane, createCadNormalLines, normalizeCadInspection} from '../src/lib/cad-inspection';

function near(actual: number, expected: number, tolerance = 1e-6) {
    assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
}

assert.deepEqual(normalizeCadInspection(), CAD_INSPECTION_DEFAULTS);
assert.deepEqual(normalizeCadInspection(null), CAD_INSPECTION_DEFAULTS);
const controls = normalizeCadInspection({inspection_flashlight: true, inspection_flashlight_target: 'pointer', inspection_flashlight_intensity: 999, inspection_flashlight_cone_deg: -10, inspection_exposure: Infinity, inspection_edges: true});
assert.equal(controls.inspection_flashlight, true);
assert.equal(controls.inspection_flashlight_target, 'pointer');
assert.equal(controls.inspection_flashlight_intensity, 5);
assert.equal(controls.inspection_flashlight_cone_deg, 10);
assert.equal(controls.inspection_exposure, 1.08);
assert.equal(controls.inspection_edges, true);
assert.equal(normalizeCadInspection({inspection_exposure: -9}).inspection_exposure, 0.3);
assert.equal(normalizeCadInspection({inspection_exposure: 9}).inspection_exposure, 2);
assert.equal(normalizeCadInspection({inspection_flashlight_intensity: NaN}).inspection_flashlight_intensity, 2.4);

for (const axis of ['x', 'y', 'z'] as const) {
    const center = new THREE.Vector3(4, -3, 8);
    const basis = new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0);
    const plane = cadSectionPlane({axis, center, offsetMm: 2});
    const inverted = cadSectionPlane({axis, center, offsetMm: 2, inverted: true});
    const point = center.clone().addScaledVector(basis, 2);
    near(plane.distanceToPoint(point), 0);
    near(inverted.distanceToPoint(point), 0);
    near(plane.distanceToPoint(point.clone().add(basis)), 1);
    near(inverted.distanceToPoint(point.clone().add(basis)), -1);
}
const insertion = cadSectionPlane({axis: 'insertion', insertionAxis: {x: 0, y: 6, z: 8}, offsetMm: 5});
near(insertion.normal.length(), 1);
near(insertion.distanceToPoint(new THREE.Vector3(0, 3, 4)), 0);
assert.deepEqual(cadSectionPlane({axis: 'insertion', insertionAxis: {x: 0, y: 0, z: 0}}).normal.toArray(), [0, 0, 1]);
assert.deepEqual(cadSectionPlane({axis: 'insertion', insertionAxis: {x: NaN, y: 0, z: 1}, offsetMm: NaN}).normal.toArray(), [0, 0, 1]);

const surface = new THREE.SphereGeometry(6, 64, 48);
const original = new Float32Array(surface.getAttribute('position').array);
const fingerprint = cadInspectionGeometryFingerprint(surface);
const copiedSurface = surface.clone();
assert.notEqual(surface.id, copiedSurface.id);
assert.equal(cadInspectionGeometryFingerprint(copiedSurface), fingerprint);
const copiedPosition = copiedSurface.getAttribute('position');
copiedPosition.needsUpdate = true;
assert.equal(cadInspectionGeometryFingerprint(copiedSurface), fingerprint, 'Renderer version changes must not change a content fingerprint');
copiedPosition.setX(0, copiedPosition.getX(0) + 0.001);
assert.notEqual(cadInspectionGeometryFingerprint(copiedSurface), fingerprint, 'Coordinate changes must change the fingerprint');
copiedPosition.setX(0, surface.getAttribute('position').getX(0));
assert.equal(cadInspectionGeometryFingerprint(copiedSurface), fingerprint);
copiedSurface.index!.setX(0, copiedSurface.index!.getX(0) + 1);
assert.notEqual(cadInspectionGeometryFingerprint(copiedSurface), fingerprint, 'Topology changes must change the fingerprint');
const plainPoints = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([1, 2, 3, 4, 5, 6], 3));
const interleavedPoints = new THREE.BufferGeometry().setAttribute('position', new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(new Float32Array([99, 1, 2, 3, 88, 4, 5, 6]), 4), 3, 1));
assert.equal(cadInspectionGeometryFingerprint(plainPoints), cadInspectionGeometryFingerprint(interleavedPoints), 'Only actual XYZ data belongs in the fingerprint');
assert.equal(cadInspectionGeometryFingerprint(new THREE.BufferGeometry()), cadInspectionGeometryFingerprint(new THREE.BufferGeometry()));
const lines = createCadNormalLines(surface, {maxSamples: 99999, lengthMm: 0.75});
const vertices = lines.getAttribute('position');
assert.equal(vertices.count, CAD_INSPECTION_MAX_NORMALS * 2);
for (let i = 0; i < vertices.count; i += 2) {
    const start = new THREE.Vector3().fromBufferAttribute(vertices, i);
    const end = new THREE.Vector3().fromBufferAttribute(vertices, i + 1);
    near(start.distanceTo(end), 0.75);
    assert.ok(end.length() > start.length(), 'Sphere normals must point outward');
}
assert.deepEqual(new Float32Array(surface.getAttribute('position').array), original);
assert.deepEqual(Array.from(createCadNormalLines(surface).getAttribute('position').array), Array.from(createCadNormalLines(surface).getAttribute('position').array));
assert.equal(createCadNormalLines(new THREE.BufferGeometry()).getAttribute('position').count, 0);
const triangle = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
const triangleLines = createCadNormalLines(triangle, {maxSamples: 3});
assert.equal(triangleLines.getAttribute('position').count, 6);
assert.equal(triangle.getAttribute('normal'), undefined, 'Inspection must not add normals to source geometry');
const broken = triangle.clone().setAttribute('normal', new THREE.Float32BufferAttribute([NaN, 0, 0, 0, 0, 0, 0, 0, 1], 3));
assert.equal(createCadNormalLines(broken).getAttribute('position').count, 2);
assert.ok(Array.from(createCadNormalLines(broken).getAttribute('position').array).every(Number.isFinite));
const sloped = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([1, 2, 3], 3)).setAttribute('normal', new THREE.Float32BufferAttribute([1, 1, 0], 3));
const transform = new THREE.Matrix4().compose(new THREE.Vector3(10, -5, 4), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 4), new THREE.Vector3(2, 1, 0.5));
const worldNormals = createCadNormalLines(sloped, {matrixWorld: transform, lengthMm: 1}).getAttribute('position');
const worldStart = new THREE.Vector3().fromBufferAttribute(worldNormals, 0);
const worldEnd = new THREE.Vector3().fromBufferAttribute(worldNormals, 1);
near(worldStart.distanceTo(new THREE.Vector3(1, 2, 3).applyMatrix4(transform)), 0);
near(worldStart.distanceTo(worldEnd), 1);
const expectedNormal = new THREE.Vector3(1, 1, 0).applyMatrix3(new THREE.Matrix3().getNormalMatrix(transform)).normalize();
near(worldEnd.clone().sub(worldStart).distanceTo(expectedNormal), 0);

const position = new THREE.Vector3(12, -3, 4), target = new THREE.Vector3(2, 1, 0);
const startUp = new THREE.Vector3(0, 0, 1);
const left = cadCameraQuarterTurn(position, target, startUp, 'left');
near(left.up.length(), 1);
assert.deepEqual(left.up.toArray(), startUp.toArray());
near(left.position.distanceTo(target), position.distanceTo(target));
near(left.position.z, position.z);
assert.deepEqual(left.target.toArray(), target.toArray());
const undone = cadCameraQuarterTurn(left.position, left.target, left.up, 'right');
near(undone.position.distanceTo(position), 0);
let orbitPosition = position.clone();
for (let i = 0; i < 4; i += 1) orbitPosition = cadCameraQuarterTurn(orbitPosition, target, startUp, 'left').position;
near(orbitPosition.distanceTo(position), 0);
const degenerate = cadCameraQuarterTurn(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), 'right');
near(degenerate.up.length(), 1);
assert.ok(degenerate.up.toArray().every(Number.isFinite));
assert.deepEqual(degenerate.up.toArray(), [0, 1, 0]);

for (const geometry of [surface, copiedSurface, plainPoints, interleavedPoints, lines, triangle, triangleLines, broken, sloped]) geometry.dispose();
console.log('PASS: bounded inspection controls, invariant section inversion, geometry content fingerprints, bounded transformed normals without source mutation, and reversible quarter-turn camera orbits.');
