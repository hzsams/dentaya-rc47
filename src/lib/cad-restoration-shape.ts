import * as THREE from 'three';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type {CadToothForm,CadMorphologyStyle,CadRestorationDesignType} from './cad-job-setup';

// Original RC37 starting geometry. The later 24-family generator is removed.
export function toothProfileFromFdi(code: string | undefined) {
    const normalized = String(code ?? "");
    const quadrant = Number(normalized[0]);
    const digit = Number(normalized[1]);
    const upper = quadrant === 1 || quadrant === 2;
    const anteriorUpper: Record<number, {
        width: number;
        depth: number;
        height: number;
        cusps: number;
        cusp: number;
        ridge: number;
    }> = {
        1: { width: 0.62, depth: 0.41, height: 1.24, cusps: 2, cusp: 0.018, ridge: 0.032 },
        2: { width: 0.55, depth: 0.39, height: 1.17, cusps: 2, cusp: 0.020, ridge: 0.028 },
        3: { width: 0.61, depth: 0.49, height: 1.26, cusps: 1, cusp: 0.095, ridge: 0.044 },
    };
    const anteriorLower: Record<number, {
        width: number;
        depth: number;
        height: number;
        cusps: number;
        cusp: number;
        ridge: number;
    }> = {
        1: { width: 0.49, depth: 0.35, height: 1.13, cusps: 2, cusp: 0.014, ridge: 0.022 },
        2: { width: 0.52, depth: 0.37, height: 1.15, cusps: 2, cusp: 0.016, ridge: 0.024 },
        3: { width: 0.56, depth: 0.44, height: 1.20, cusps: 1, cusp: 0.082, ridge: 0.036 },
    };
    if (digit >= 1 && digit <= 3)
        return (upper ? anteriorUpper : anteriorLower)[digit];
    if (digit === 4) {
        return upper
            ? { width: 0.69, depth: 0.61, height: 1.02, cusps: 2, cusp: 0.095, ridge: 0.032 }
            : { width: 0.63, depth: 0.57, height: 0.98, cusps: 2, cusp: 0.082, ridge: 0.028 };
    }
    if (digit === 5) {
        return upper
            ? { width: 0.67, depth: 0.62, height: 0.98, cusps: 2, cusp: 0.080, ridge: 0.028 }
            : { width: 0.65, depth: 0.60, height: 0.94, cusps: 2, cusp: 0.070, ridge: 0.024 };
    }
    if (digit === 6) {
        return upper
            ? { width: 0.79, depth: 0.74, height: 0.95, cusps: 4, cusp: 0.092, ridge: 0.048 }
            : { width: 0.82, depth: 0.70, height: 0.93, cusps: 5, cusp: 0.092, ridge: 0.046 };
    }
    if (digit === 7) {
        return upper
            ? { width: 0.75, depth: 0.71, height: 0.91, cusps: 4, cusp: 0.080, ridge: 0.040 }
            : { width: 0.78, depth: 0.68, height: 0.90, cusps: 4, cusp: 0.080, ridge: 0.038 };
    }
    return upper
        ? { width: 0.72, depth: 0.68, height: 0.88, cusps: 4, cusp: 0.068, ridge: 0.034 }
        : { width: 0.74, depth: 0.66, height: 0.87, cusps: 4, cusp: 0.068, ridge: 0.032 };
}
function toothFormFactors(form: CadToothForm) {
    return {
        natural: { width: 1, depth: 1, height: 1, cervical: 1, cusp: 1, ridge: 1, flatten: 0 },
        square: { width: 1.10, depth: 1.04, height: 0.98, cervical: 1.06, cusp: 0.94, ridge: 1.03, flatten: 0.02 },
        oval: { width: 0.97, depth: 1.06, height: 1.01, cervical: 1.02, cusp: 0.88, ridge: 0.88, flatten: 0.015 },
        triangular: { width: 1.05, depth: 0.98, height: 1.04, cervical: 0.86, cusp: 1.06, ridge: 1.08, flatten: 0 },
        youthful: { width: 1.01, depth: 1.01, height: 1.05, cervical: 0.98, cusp: 1.28, ridge: 1.22, flatten: 0 },
        worn: { width: 1.03, depth: 1.02, height: 0.92, cervical: 1.02, cusp: 0.48, ridge: 0.52, flatten: 0.09 },
    }[form] ?? { width: 1, depth: 1, height: 1, cervical: 1, cusp: 1, ridge: 1, flatten: 0 };
}
export function createRestorationGeometry(radius: number, anatomyCode: string | undefined, designType: CadRestorationDesignType, toothForm: CadToothForm, morphologyStyle: CadMorphologyStyle) {
    const profile = toothProfileFromFdi(anatomyCode);
    const form = toothFormFactors(toothForm);
    const geometry = new THREE.SphereGeometry(1, 84, 64);
    geometry.deleteAttribute("uv");
    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    const baseSize = THREE.MathUtils.clamp(radius * 0.48, 3.2, 8.4);
    const styleFactor = morphologyStyle === "soft" ? 0.72 :
        morphologyStyle === "strong" ? 1.22 : 1;
    const coping = designType === "coping";
    const cutback = designType === "cutback_crown";
    const reducedPontic = designType === "reduced_pontic";
    const framework = designType === "framework";
    const telescope = designType === "primary_telescope" || designType === "secondary_telescope";
    const secondaryTelescope = designType === "secondary_telescope";
    const temporary = designType === "temporary_crown" || designType === "temporary_pontic";
    const pontic = designType === "anatomic_pontic" || reducedPontic || designType === "temporary_pontic";
    const veneer = designType === "veneer";
    const inlay = designType === "inlay_onlay";
    for (let i = 0; i < position.count; i++) {
        const sx = position.getX(i);
        const sy = position.getY(i);
        const sz = position.getZ(i);
        let x = sx;
        let y = sy;
        let z = sz;
        const theta = Math.atan2(y, x);
        const normalizedZ = THREE.MathUtils.clamp((z + 1) * 0.5, 0, 1);
        const cervicalBlend = THREE.MathUtils.smoothstep(normalizedZ, 0.02, 0.55);
        const cervical = THREE.MathUtils.lerp(0.80 * form.cervical, 0.985, cervicalBlend);
        const occlusalInfluence = Math.max(0, z) ** 1.28;
        const cuspWave = Math.cos(theta * Math.max(1, profile.cusps)) *
            profile.cusp * styleFactor * form.cusp * occlusalInfluence;
        const ridgeWave = Math.sin(theta * 2) *
            profile.ridge * styleFactor * form.ridge * occlusalInfluence;
        if (telescope) {
            const taper = 0.80 + normalizedZ * 0.16;
            x *= baseSize * profile.width * form.width * taper * (secondaryTelescope ? 1.06 : 1);
            y *= baseSize * profile.depth * form.depth * taper * (secondaryTelescope ? 1.06 : 1);
            z *= baseSize * profile.height * form.height * (secondaryTelescope ? 0.90 : 0.86);
        }
        else {
            x *= baseSize * profile.width * form.width * cervical * (1 + cuspWave * 0.34);
            y *= baseSize * profile.depth * form.depth * cervical * (1 - cuspWave * 0.16);
            z *= baseSize * profile.height * form.height * (1 + cuspWave + ridgeWave);
            const digit = Number(anatomyCode?.slice(-1));
            if (digit <= 3 && z > baseSize * 0.20) {
                y += Math.sin(theta) * baseSize * 0.044 * styleFactor * form.ridge;
            }
            if (form.flatten > 0 && z > baseSize * 0.28) {
                const cap = baseSize * profile.height * form.height * (0.70 - form.flatten);
                z = THREE.MathUtils.lerp(z, Math.min(z, cap), Math.min(1, form.flatten * 6));
            }
        }
        if (coping) {
            const axial = THREE.MathUtils.lerp(0.82, 0.90, normalizedZ);
            x *= axial;
            y *= axial;
            z *= 0.80;
            if (z > baseSize * 0.30)
                z *= 0.92;
        }
        else if (cutback || reducedPontic) {
            x *= 0.89;
            y *= 0.89;
            z *= 0.87;
        }
        else if (framework) {
            x *= 0.84;
            y *= 0.84;
            z *= 0.82;
        }
        if (temporary) {
            x *= 1.012;
            y *= 1.012;
            z *= 0.985;
        }
        if (pontic) {
            const basal = THREE.MathUtils.smoothstep(-sz, 0.10, 0.82);
            y *= 0.93 + basal * 0.07;
            if (z < -baseSize * 0.24)
                z = THREE.MathUtils.lerp(z, -baseSize * 0.24, 0.72);
        }
        if (veneer) {
            y *= sy > 0 ? 0.52 : 0.28;
            x *= 0.98;
            z *= 1.01;
        }
        if (inlay) {
            z = z * 0.48 + baseSize * 0.20;
            x *= 0.88;
            y *= 0.88;
        }
        position.setXYZ(i, x, y, z);
    }
    position.needsUpdate = true;
    geometry.deleteAttribute("normal");
    geometry.deleteAttribute("uv"); // UV seams otherwise prevent position welding.
    // A closed/welded topology is essential for "solid wax" sculpting.
    // The design remains one watertight surface while Add/Reduce moves shared vertices.
    const welded = mergeVertices(geometry, 1e-5);
    geometry.dispose();
    welded.computeVertexNormals();
    welded.computeBoundingSphere();
    welded.computeBoundingBox();
    return welded;
}
