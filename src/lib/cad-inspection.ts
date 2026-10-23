import * as THREE from 'three';

/** Display-only inspection controls; none of these values changes CAD geometry. */
export type CadInspectionSettings = {
    inspection_flashlight: boolean;
    inspection_flashlight_target: 'camera' | 'pointer';
    inspection_flashlight_intensity: number;
    inspection_flashlight_cone_deg: number;
    inspection_edges: boolean;
    inspection_normals: boolean;
    inspection_faceted: boolean;
    inspection_interior: boolean;
    inspection_section_contours: boolean;
    inspection_exposure: number;
};

export const CAD_INSPECTION_DEFAULTS: Readonly<CadInspectionSettings> = Object.freeze({
    inspection_flashlight: false,
    inspection_flashlight_target: 'camera',
    inspection_flashlight_intensity: 2.4,
    inspection_flashlight_cone_deg: 26,
    inspection_edges: false,
    inspection_normals: false,
    inspection_faceted: false,
    inspection_interior: false,
    inspection_section_contours: false,
    inspection_exposure: 1.08,
});

function boundedNumber(value: unknown, min: number, max: number, fallback: number) {
    return typeof value === 'number' && Number.isFinite(value)
        ? THREE.MathUtils.clamp(value, min, max)
        : fallback;
}

export function normalizeCadInspection(value?: Partial<CadInspectionSettings> | null): CadInspectionSettings {
    const input = value ?? {};
    return {
        inspection_flashlight: input.inspection_flashlight === true,
        inspection_flashlight_target: input.inspection_flashlight_target === 'pointer' ? 'pointer' : 'camera',
        inspection_flashlight_intensity: boundedNumber(input.inspection_flashlight_intensity, 0, 5, CAD_INSPECTION_DEFAULTS.inspection_flashlight_intensity),
        inspection_flashlight_cone_deg: boundedNumber(input.inspection_flashlight_cone_deg, 10, 65, CAD_INSPECTION_DEFAULTS.inspection_flashlight_cone_deg),
        inspection_edges: input.inspection_edges === true,
        inspection_normals: input.inspection_normals === true,
        inspection_faceted: input.inspection_faceted === true,
        inspection_interior: input.inspection_interior === true,
        inspection_section_contours: input.inspection_section_contours === true,
        inspection_exposure: boundedNumber(input.inspection_exposure, 0.3, 2, CAD_INSPECTION_DEFAULTS.inspection_exposure),
    };
}

type Point = {x: number; y: number; z: number};

function finiteVector(value: Point | undefined, fallback: THREE.Vector3) {
    return value && [value.x, value.y, value.z].every(Number.isFinite)
        ? new THREE.Vector3(value.x, value.y, value.z)
        : fallback.clone();
}

/** Offset follows the original axis; inversion only swaps the retained half-space. */
export function cadSectionPlane({axis, insertionAxis, inverted = false, offsetMm = 0, center}: {
    axis: 'insertion' | 'x' | 'y' | 'z';
    insertionAxis?: Point;
    inverted?: boolean;
    offsetMm?: number;
    center?: Point;
}): THREE.Plane {
    const normal = axis === 'x' ? new THREE.Vector3(1, 0, 0)
        : axis === 'y' ? new THREE.Vector3(0, 1, 0)
        : axis === 'z' ? new THREE.Vector3(0, 0, 1)
        : finiteVector(insertionAxis, new THREE.Vector3(0, 0, 1));
    if (normal.lengthSq() < 1e-12) normal.set(0, 0, 1);
    normal.normalize();
    const point = finiteVector(center, new THREE.Vector3()).addScaledVector(normal, Number.isFinite(offsetMm) ? offsetMm : 0);
    if (inverted) normal.negate();
    return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, point);
}

export const CAD_INSPECTION_MAX_NORMALS = 240;

/** Content fingerprint for geometry-preservation checks; independent of renderer ids. */
export function cadInspectionGeometryFingerprint(geometry: THREE.BufferGeometry): string {
    const position = geometry.getAttribute('position');
    const index = geometry.getIndex();
    const float = new Float32Array(1);
    const bits = new Uint32Array(float.buffer);
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    function append(word: number) {
        for (let byte = 0; byte < 4; byte += 1) {
            const value = (word >>> (byte * 8)) & 0xff;
            first = Math.imul(first ^ value, 0x01000193);
            second = Math.imul(second ^ value, 0x85ebca6b);
            second = (second << 13) | (second >>> 19);
        }
    }
    append(position ? 1 : 0);
    append(position?.count ?? 0);
    if (position) for (let vertex = 0; vertex < position.count; vertex += 1) {
        for (const coordinate of [position.getX(vertex), position.getY(vertex), position.getZ(vertex)]) {
            float[0] = coordinate;
            append(bits[0]);
        }
    }
    append(index ? 1 : 0);
    append(index?.count ?? 0);
    if (index) for (let element = 0; element < index.count; element += 1) append(index.getX(element));
    return `${position?.count ?? 0}:${index?.count ?? 0}:${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`;
}

/** Deterministic bounded vertex sample. Missing normals are calculated on a copy. */
export function createCadNormalLines(geometry: THREE.BufferGeometry, {maxSamples = CAD_INSPECTION_MAX_NORMALS, lengthMm = 0.8, matrixWorld}: {
    maxSamples?: number;
    lengthMm?: number;
    matrixWorld?: THREE.Matrix4;
} = {}): THREE.BufferGeometry {
    const output = new THREE.BufferGeometry();
    const positions = geometry.getAttribute('position');
    if (!positions || positions.itemSize < 3 || positions.count === 0) {
        output.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
        return output;
    }
    let temporary: THREE.BufferGeometry | undefined;
    let normals = geometry.getAttribute('normal');
    if (!normals || normals.itemSize < 3 || normals.count !== positions.count) {
        temporary = geometry.clone();
        temporary.computeVertexNormals();
        normals = temporary.getAttribute('normal');
    }
    const limit = Math.floor(boundedNumber(maxSamples, 1, CAD_INSPECTION_MAX_NORMALS, CAD_INSPECTION_MAX_NORMALS));
    const length = boundedNumber(lengthMm, 0.01, 5, 0.8);
    const samples = Math.min(positions.count, limit);
    const lines: number[] = [];
    const point = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const normalMatrix = matrixWorld ? new THREE.Matrix3().getNormalMatrix(matrixWorld) : undefined;
    for (let sample = 0; sample < samples; sample += 1) {
        const index = samples === 1 ? 0 : Math.floor(sample * (positions.count - 1) / (samples - 1));
        point.fromBufferAttribute(positions, index);
        normal.fromBufferAttribute(normals, index);
        if (matrixWorld) point.applyMatrix4(matrixWorld);
        if (normalMatrix) normal.applyMatrix3(normalMatrix);
        if (![point.x, point.y, point.z, normal.x, normal.y, normal.z].every(Number.isFinite) || normal.lengthSq() < 1e-12) continue;
        normal.normalize().multiplyScalar(length).add(point);
        lines.push(point.x, point.y, point.z, normal.x, normal.y, normal.z);
    }
    temporary?.dispose();
    output.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    return output;
}

/** Orbit a quarter-turn around the current up axis, preserving target and radius. */
export function cadCameraQuarterTurn(position: Point, target: Point, up: Point, direction: 'left' | 'right') {
    const nextPosition = finiteVector(position, new THREE.Vector3(0, 0, 10));
    const nextTarget = finiteVector(target, new THREE.Vector3());
    const nextUp = finiteVector(up, new THREE.Vector3(0, 1, 0));
    if (nextUp.lengthSq() < 1e-12) nextUp.set(0, 1, 0);
    nextUp.normalize();
    nextPosition.sub(nextTarget).applyAxisAngle(nextUp, direction === 'left' ? Math.PI / 2 : -Math.PI / 2).add(nextTarget);
    return {position: nextPosition, target: nextTarget, up: nextUp};
}
