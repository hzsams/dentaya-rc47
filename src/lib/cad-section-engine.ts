import * as THREE from 'three';

export type CadSectionContours = {
    segments: number[]; segmentCount: number; closedLoops: number; openChains: number;
    perimeterMm: number; areaMm2: number | null; truncated: boolean; warnings: string[];
};
export type CadSectionSummary = Omit<CadSectionContours, 'segments'>;
export type CadSectionInspection = {restoration: CadSectionSummary | null; source: CadSectionSummary | null};

/** Read-only triangle/plane intersections in world millimetres. A section area
 * describes closed planar contours, never intaglio fit or wall thickness. */
export function cadSectionContours(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4, inputPlane: THREE.Plane,
    options: {maxTriangles?: number; maxSegments?: number} = {}): CadSectionContours {
    const result: CadSectionContours = {segments: [], segmentCount: 0, closedLoops: 0, openChains: 0, perimeterMm: 0, areaMm2: null, truncated: false, warnings: []};
    const warnings = new Set<string>(), position = geometry.getAttribute('position'), index = geometry.index;
    if (!position || position.itemSize < 3 || !matrix.elements.every(Number.isFinite) || Math.abs(matrix.determinant()) < 1e-12 || ![...inputPlane.normal.toArray(), inputPlane.constant].every(Number.isFinite) || inputPlane.normal.lengthSq() < 1e-12) {
        return {...result, warnings: ['invalid']};
    }
    const limit = (value: number | undefined, fallback: number, max: number) => value === undefined ? fallback : Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0;
    const maxTriangles = limit(options.maxTriangles, 500_000, 500_000), maxSegments = limit(options.maxSegments, 20_000, 20_000);
    const plane = inputPlane.clone().normalize(), epsilon = 1e-5, points: THREE.Vector3[] = [], buckets = new Map<string, number[]>(), edges = new Set<string>(), intersectedFaces = new Set<string>(), adjacency: Set<number>[] = [];
    const edgeCuts = new Map<string, {onPlaneEdge: boolean; side: number; count: number}>();
    function vertex(point: THREE.Vector3) {
        const x = Math.floor(point.x / epsilon), y = Math.floor(point.y / epsilon), z = Math.floor(point.z / epsilon);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
            for (const id of buckets.get(`${x + dx},${y + dy},${z + dz}`) ?? []) if (points[id].distanceToSquared(point) <= epsilon * epsilon) return id;
        }
        const id = points.length, key = `${x},${y},${z}`; points.push(point.clone()); adjacency.push(new Set());
        const list = buckets.get(key) ?? []; list.push(id); buckets.set(key, list); return id;
    }
    const count = Math.floor((index?.count ?? position.count) / 3), triangle = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    if ((index?.count ?? position.count) % 3) warnings.add('invalid');
    if (count > maxTriangles) {result.truncated = true; warnings.add('truncated');}
    for (let t = 0; t < Math.min(count, maxTriangles); t++) {
        let valid = true;
        for (let k = 0; k < 3; k++) {
            const id = index ? index.getX(t * 3 + k) : t * 3 + k;
            if (!Number.isInteger(id) || id < 0 || id >= position.count) {valid = false; break;}
            triangle[k].fromBufferAttribute(position, id).applyMatrix4(matrix);
            if (!triangle[k].toArray().every(Number.isFinite)) {valid = false; break;}
        }
        if (!valid) {warnings.add('invalid'); continue;}
        const distances = triangle.map(p => plane.distanceToPoint(p));
        if (distances.every(d => Math.abs(d) <= epsilon)) {warnings.add('coplanar'); continue;}
        if (distances.every(d => d > epsilon) || distances.every(d => d < -epsilon)) continue;
        const hits: THREE.Vector3[] = [];
        const add = (point: THREE.Vector3) => {if (!hits.some(p => p.distanceToSquared(point) <= epsilon * epsilon)) hits.push(point);};
        for (let k = 0; k < 3; k++) {
            const next = (k + 1) % 3, a = distances[k], b = distances[next];
            if (Math.abs(a) <= epsilon) add(triangle[k].clone());
            if (a > epsilon && b < -epsilon || a < -epsilon && b > epsilon) add(triangle[k].clone().lerp(triangle[next], a / (a - b)));
        }
        if (hits.length !== 2 || hits[0].distanceToSquared(hits[1]) <= epsilon * epsilon) continue;
        // Deduplicating contour edges alone can hide a duplicated surface and
        // turn coincident overlapping faces into an apparently clean area.
        // Match complete faces, so two valid neighbours cut on their shared
        // edge still produce one contour segment without an overlap warning.
        const faceKey = triangle.map(point => [point.x, point.y, point.z].map(value => Math.round(value / epsilon)).join(',')).sort().join('|');
        if (intersectedFaces.has(faceKey)) warnings.add('duplicate-face');
        else intersectedFaces.add(faceKey);
        const a = vertex(hits[0]), b = vertex(hits[1]); if (a === b) continue;
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        const onPlaneEdge = distances.filter(d => Math.abs(d) <= epsilon).length === 2;
        const side = Math.sign(distances.find(d => Math.abs(d) > epsilon) ?? 0), previousCut = edgeCuts.get(key);
        if (previousCut) {
            // A real edge shared by two neighbours on opposite sides of the
            // plane is one valid contour segment. Repeated interior cuts (also
            // with different triangulations) or extra incident faces are not.
            previousCut.count++;
            if (!onPlaneEdge || !previousCut.onPlaneEdge || previousCut.side === side || previousCut.count > 2) warnings.add('duplicate-face');
            continue;
        }
        if (edges.size >= maxSegments) {result.truncated = true; warnings.add('truncated'); break;}
        edgeCuts.set(key, {onPlaneEdge, side, count: 1});
        edges.add(key); adjacency[a].add(b); adjacency[b].add(a);
        result.segments.push(...points[a].toArray(), ...points[b].toArray()); result.perimeterMm += points[a].distanceTo(points[b]);
    }
    result.segmentCount = edges.size;
    const visited = new Set<number>(), loops: number[][] = [];
    for (let start = 0; start < points.length; start++) {
        if (visited.has(start) || !adjacency[start].size) continue;
        const component = [start]; visited.add(start);
        for (let k = 0; k < component.length; k++) for (const next of adjacency[component[k]]) if (!visited.has(next)) {visited.add(next); component.push(next);}
        if (component.some(id => adjacency[id].size !== 2)) {result.openChains++; warnings.add(component.some(id => adjacency[id].size > 2) ? 'branch' : 'open'); continue;}
        const loop = [start]; let previous = -1, current = start;
        do {const next = [...adjacency[current]].find(id => id !== previous)!; previous = current; current = next; if (current !== start) loop.push(current);} while (current !== start && loop.length <= component.length);
        if (loop.length !== component.length) {warnings.add('branch'); continue;}
        result.closedLoops++; loops.push(loop);
    }
    if (loops.length && !warnings.size) {
        const u = new THREE.Vector3(Math.abs(plane.normal.x) < .9 ? 1 : 0, Math.abs(plane.normal.x) < .9 ? 0 : 1, 0).cross(plane.normal).normalize(), v = plane.normal.clone().cross(u), origin = points[loops[0][0]];
        const projected = points.map(p => {const relative = p.clone().sub(origin); return {x: relative.dot(u), y: relative.dot(v)};});
        const cross = (a: {x: number; y: number}, b: {x: number; y: number}, c: {x: number; y: number}) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
        const lines = [...edges].map(key => {const [a, b] = key.split(':').map(Number); return {a, b, minX: Math.min(projected[a].x, projected[b].x), maxX: Math.max(projected[a].x, projected[b].x), minY: Math.min(projected[a].y, projected[b].y), maxY: Math.max(projected[a].y, projected[b].y)};}).sort((a, b) => a.minX - b.minX);
        let comparisons = 0;
        // Bounded sweep rejects intersecting/touching non-neighbour edges before
        // reporting area. Complex input retains its lines with no area claim.
        outer: for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length && lines[j].minX <= lines[i].maxX + epsilon; j++) {
            const a = lines[i], b = lines[j];
            if (++comparisons > 200_000) {warnings.add('complex'); break outer;}
            if (b.minY > a.maxY + epsilon || a.minY > b.maxY + epsilon) continue;
            const p = projected[a.a], q = projected[a.b], r = projected[b.a], s = projected[b.b], c1 = cross(p, q, r), c2 = cross(p, q, s), c3 = cross(r, s, p), c4 = cross(r, s, q);
            const dx = q.x - p.x, dy = q.y - p.y, length = Math.hypot(dx, dy);
            if (Math.abs(c1) <= epsilon * length && Math.abs(c2) <= epsilon * length) {
                const along = (point: {x: number; y: number}) => ((point.x - p.x) * dx + (point.y - p.y) * dy) / length;
                const start = along(r), end = along(s);
                // Adjacent edges may touch or continue straight; a positive
                // shared interval is ambiguous even when they share a vertex.
                if (Math.min(length, Math.max(start, end)) - Math.max(0, Math.min(start, end)) > epsilon) {warnings.add('self-intersection'); break outer;}
            }
            if (a.a === b.a || a.a === b.b || a.b === b.a || a.b === b.b) continue;
            if (c1 * c2 <= 1e-14 && c3 * c4 <= 1e-14) {warnings.add('self-intersection'); break outer;}
        }
        if (loops.length > 256) warnings.add('complex');
        if (!warnings.size) {
            const inside = (point: {x: number; y: number}, loop: number[]) => {let hit = false; for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {const a = projected[loop[i]], b = projected[loop[j]]; if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) hit = !hit;} return hit;};
            let area = 0;
            for (const loop of loops) {
                let signed = 0; for (let i = 0; i < loop.length; i++) {const a = projected[loop[i]], b = projected[loop[(i + 1) % loop.length]]; signed += a.x * b.y - a.y * b.x;}
                const depth = loops.filter(other => other !== loop && inside(projected[loop[0]], other)).length;
                area += Math.abs(signed) / 2 * (depth % 2 ? -1 : 1);
            }
            if (Number.isFinite(area) && area > epsilon * epsilon) result.areaMm2 = area;
        }
    }
    result.warnings = [...warnings]; return result;
}
