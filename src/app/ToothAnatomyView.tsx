"use client";
import UiMessage from "@/lib/i18n/UiMessage";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useId, useRef, useState } from 'react';
import * as THREE from 'three';
import { ALL_TEETH, UPPER_TEETH, LOWER_TEETH, linkKey, type ToothPlan } from '@/lib/tooth-plan';
import { loadToothAnatomy, toothDisplayForm } from '@/lib/tooth-anatomy';
import { buildToothLayout, type ToothPlacement } from '@/lib/tooth-layout';
import { TOOTH_VIEWS, toothSurface, toothShapeKey, type ToothAppearance, type ToothView } from '@/lib/tooth-appearance';
import { placeToothLabels, bridgeBand, type ToothScreenPoint } from '@/lib/tooth-labels';
import { experienceDuration } from '@/lib/experience-preferences';
import { playExperienceCue } from '@/lib/experience-audio';
import { fdiToothLabel } from '@/lib/cad-job-setup';
type Props = {
    appearance: ToothAppearance;
    view: ToothView;
    selected: string[];
    plan: ToothPlan;
    onTooth: (code: string) => void;
    onLink: (a: string, b: string) => void;
    disabled: boolean;
};
type Tooth = {
    group: THREE.Group;
    material: THREE.MeshPhysicalMaterial;
    mesh: THREE.Mesh;
    upper: boolean;
    n: number;
    edges: THREE.LineSegments;
    edgeMaterial: THREE.LineBasicMaterial;
    bridge: {
        value: number;
    };
    geometry: THREE.BufferGeometry;
};
export default function ToothAnatomyView(props: Props) {
    const { t: uiText, intlLocale } = useTranslation();
    const host = useRef<HTMLDivElement>(null), live = useRef(props), [screen, setScreen] = useState<{
        points: Record<string, ToothScreenPoint>;
        width: number;
        height: number;
    }>({ points: {}, width: 1, height: 1 }), [failure, setFailure] = useState(''), [loading, setLoading] = useState(true), patternId = useId().replace(/:/g, '');
    useEffect(() => { live.current = props; }, [props]);
    useEffect(() => {
        const mount = host.current;
        if (!mount)
            return;
        let renderer: THREE.WebGLRenderer;
        setFailure('');
        setLoading(true);
        setScreen({ points: {}, width: 1, height: 1 });
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        }
        catch {
            setFailure('3D görünüm açılamadı. Numaralı düğmelerle seçime devam edebilirsiniz.');
            setLoading(false);
            return;
        }
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = .9;
        renderer.localClippingEnabled = true;
        mount.prepend(renderer.domElement);
        const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-80, 80, 50, -50, .1, 600);
        camera.position.set(0, 0, 200);
        camera.lookAt(0, 0, 0);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x667078, 1.2));
        const key = new THREE.DirectionalLight(0xfff8e6, 2.7);
        key.position.set(-45, 65, 100);
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xd8e4ff, .7);
        fill.position.set(55, -10, 60);
        scene.add(fill);
        const groups = [new THREE.Group(), new THREE.Group()];
        groups.forEach(g => scene.add(g));
        const teeth: Record<string, Tooth> = {}, meshes: THREE.Mesh[] = [];
        const controller = new AbortController();
        let disposed = false, layout: Record<string, ToothPlacement> = {}, archDepth = 68, frontWidth = 90;
        let originals: Record<string, THREE.BufferGeometry> = {}, shapeKey = '';
        loadToothAnatomy(controller.signal).then(original => {
            if (disposed) {
                Object.values(original).forEach(g => g.dispose());
                return;
            }
            originals = original;
            const geometries = Object.fromEntries(Object.entries(original).map(([code, source]) => [code, toothDisplayForm(source, live.current.appearance.form, live.current.appearance)]));
            shapeKey = toothShapeKey(live.current.appearance);
            const placed = buildToothLayout(geometries);
            layout = placed.placements;
            archDepth = placed.archDepth;
            frontWidth = placed.frontWidth;
            for (const code of ALL_TEETH) {
                const upper = Number(code[0]) < 3, n = Number(code[1]), g = new THREE.Group(), material = new THREE.MeshPhysicalMaterial({ color: 0xeee6cd, roughness: .48, side: THREE.DoubleSide }), bridge = { value: 0 };
                material.onBeforeCompile = shader => { shader.uniforms.dentayaBridge = bridge; shader.fragmentShader = 'uniform float dentayaBridge;\n' + shader.fragmentShader; shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nif(dentayaBridge > 0.5){float band=step(0.5,fract((gl_FragCoord.x+gl_FragCoord.y)/22.0));diffuseColor.rgb=mix(vec3(0.045,0.29,0.62),vec3(0.91,0.65,0.16),band);}'); };
                material.customProgramCacheKey = () => 'dentaya-bridge-stripes-v1';
                const tooth = new THREE.Mesh(geometries[code], material);
                g.add(tooth);
                const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x34414d, transparent: true, opacity: .55 }), edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometries[code], 24), edgeMaterial);
                edges.visible = false;
                g.add(edges);
                tooth.userData.code = code;
                meshes.push(tooth);
                groups[upper ? 0 : 1].add(g);
                teeth[code] = { group: g, mesh: tooth, material, upper, n, edges, edgeMaterial, bridge, geometry: geometries[code] };
            }
            setLoading(false);
        }).catch(() => {
            if (!disposed) {
                setFailure('Anatomik modeller yüklenemedi. Numaralı düğmelerle seçime devam edebilirsiniz.');
                setLoading(false);
            }
        });
        let progress = live.current.view === 'occlusal' ? 1 : 0, yaw = 0, width = 1, height = 1, prev = 0, lastProgress = -1, lastYaw = 100;
        let lastProps: Props | null = null, lastSize = '', lastCount = -1;
        const resize = () => { width = Math.max(1, mount.clientWidth); height = Math.max(1, mount.clientHeight); renderer.setSize(width, height); };
        const observer = new ResizeObserver(resize);
        observer.observe(mount);
        resize();
        const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
        const click = (e: PointerEvent) => {
            if (live.current.disabled)
                return;
            const rect = renderer.domElement.getBoundingClientRect();
            pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
            ray.setFromCamera(pointer, camera);
            const hit = ray.intersectObjects(meshes).find(item => !((item.object as THREE.Mesh).material as THREE.MeshStandardMaterial).clippingPlanes?.some(plane => plane.distanceToPoint(item.point) < 0));
            if (hit) {
                playExperienceCue('tap', location.pathname === '/design' || location.pathname === '/cad' ? 'cad' : 'ui');
                live.current.onTooth(hit.object.userData.code);
            }
        };
        renderer.domElement.addEventListener('pointerup', click);
        const project = (point: THREE.Vector3) => { const v = point.project(camera); return { x: (v.x * .5 + .5) * width, y: (-.5 * v.y + .5) * height }; };
        function render(time: number) {
            const dt = Math.min((time - prev) / 1000, .05);
            prev = time;
            const target = live.current.view === 'occlusal' ? 1 : 0, targetYaw = live.current.view === 'right' ? .22 : live.current.view === 'left' ? -.22 : 0, duration = experienceDuration('tooth'), reduce = duration === 0, rate = duration ? 5200 / duration : 7;
            progress = reduce ? target : progress + (target - progress) * Math.min(dt * rate, 1);
            yaw = reduce ? targetYaw : yaw + (targetYaw - yaw) * Math.min(dt * rate, 1);
            if (Math.abs(progress - target) < .001)
                progress = target;
            if (Math.abs(yaw - targetYaw) < .001)
                yaw = targetYaw;
            const size = width + ':' + height, count = meshes.length;
            if (progress === lastProgress && yaw === lastYaw && lastProps === live.current && lastSize === size && lastCount === count)
                return;
            lastProps = live.current;
            lastSize = size;
            lastCount = count;
            const nextShapeKey = toothShapeKey(live.current.appearance);
            if (count && nextShapeKey !== shapeKey) {
                const geometries: Record<string, THREE.BufferGeometry> = {};
                for (const [code, tooth] of Object.entries(teeth)) {
                    const geometry = toothDisplayForm(originals[code], live.current.appearance.form, live.current.appearance);
                    tooth.geometry.dispose();tooth.edges.geometry.dispose();
                    tooth.geometry = geometry;tooth.mesh.geometry = geometry;
                    tooth.edges.geometry = new THREE.EdgesGeometry(geometry, 24);
                    geometries[code] = geometry;
                }
                const placed = buildToothLayout(geometries);
                layout = placed.placements;archDepth = placed.archDepth;frontWidth = placed.frontWidth;
                shapeKey = nextShapeKey;
            }
            const style = toothSurface(live.current.appearance);
            renderer.setClearColor(style.background, 1);
            renderer.toneMappingExposure = style.exposure;
            const h = THREE.MathUtils.lerp(Math.max(48, frontWidth * height / width + 8), archDepth + 29, progress);
            camera.left = -h * width / height;
            camera.right = h * width / height;
            camera.top = h;
            camera.bottom = -h;
            camera.position.set(Math.sin(yaw) * 200, 0, Math.cos(yaw) * 200);
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();
            camera.updateMatrixWorld();
            groups[0].position.y = 3 + (archDepth + 7) * progress;
            groups[1].position.y = -3 - (archDepth + 7) * progress;
            groups[0].rotation.x = -Math.PI / 2 * progress;
            groups[1].rotation.x = Math.PI / 2 * progress;
            const linked = new Set(live.current.plan.links.flatMap(l => l.split('-')));
            for (const [code, t] of Object.entries(teeth)) {
                const i = t.n - 1, p = layout[code];
                t.group.position.set(THREE.MathUtils.lerp(p.frontX, p.archX, progress), (t.upper ? 1 : -1) * i * i * .09, -i * i * .24 * (1 - progress) + p.archZ * progress);
                t.group.rotation.y = p.frontRotation * (1 - progress);
                const selected = live.current.selected.includes(code), pontic = live.current.plan.roles[code] === 'pontic';
                t.material.color.set(selected ? (pontic ? 0xe2b966 : 0x69a6da) : style.color);
                t.material.roughness = style.roughness;
                t.material.metalness = style.metalness;
                t.material.clearcoat = style.clearcoat;
                const tint = live.current.appearance.rootTint && !selected;
                if (t.material.vertexColors !== tint) {t.material.vertexColors = tint;t.material.needsUpdate = true;}
                t.edges.visible = style.contour;
                t.material.emissive.set(selected ? 0x101923 : 0);
                t.bridge.value = selected && linked.has(code) ? 1 : 0;
            }
            scene.updateMatrixWorld(true);
            for (const t of Object.values(teeth)) {
                const crownLimit = Number(t.geometry.userData.crownLimit) || 9;
                t.material.clippingPlanes = progress > .6 || !live.current.appearance.showRoots ? [new THREE.Plane(new THREE.Vector3(0, t.upper ? -1 : 1, 0), crownLimit).applyMatrix4(t.group.matrixWorld)] : [];
                t.edgeMaterial.clippingPlanes = t.material.clippingPlanes;
            }
            renderer.render(scene, camera);
            const projected: Record<string, ToothScreenPoint> = {};
            for (const [code, t] of Object.entries(teeth)) {
                const crown = layout[code].crownBounds, position = t.geometry.getAttribute('position');
                let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity, rootTop = Infinity, rootBottom = -Infinity;
                for (let i = 0; i < position.count; i++) {
                    const local = new THREE.Vector3().fromBufferAttribute(position, i), visible = (t.upper ? local.y : -local.y) <= (Number(t.geometry.userData.crownLimit) || 9), p = project(t.group.localToWorld(local));
                    if (visible) {
                        left = Math.min(left, p.x);
                        right = Math.max(right, p.x);
                        top = Math.min(top, p.y);
                        bottom = Math.max(bottom, p.y);
                    }
                    if (visible || live.current.appearance.showRoots && progress < .6) {
                        rootTop = Math.min(rootTop, p.y);
                        rootBottom = Math.max(rootBottom, p.y);
                    }
                }
                const center = crown.getCenter(new THREE.Vector3());
                const anchor = project(t.group.localToWorld(center));
                projected[code] = { x: anchor.x, y: anchor.y, anchorX: anchor.x, anchorY: anchor.y, left, right, top, bottom, rootTop, rootBottom };
            }
            setScreen({ points: placeToothLabels(projected, progress > .6, width, height), width, height });
            lastProgress = progress;
            lastYaw = yaw;
        }
        renderer.setAnimationLoop(render);
        return () => {
            disposed = true;
            controller.abort();
            renderer.setAnimationLoop(null);
            observer.disconnect();
            renderer.domElement.removeEventListener('pointerup', click);
            for (const t of Object.values(teeth)) {
                t.material.dispose();
                t.edgeMaterial.dispose();
                t.edges.geometry.dispose();
                t.geometry.dispose();
            }
            Object.values(originals).forEach(geometry => geometry.dispose());
            renderer.dispose();
            renderer.domElement.remove();
        };
    }, []);
    const { points, width, height } = screen, linkedCodes = new Set(props.plan.links.flatMap(l => l.split('-')));
    const pairs = [UPPER_TEETH, LOWER_TEETH].flatMap(row => row.slice(0, -1).map((a, i) => [a, row[i + 1]])).filter(([a, b]) => props.selected.includes(a) && props.selected.includes(b));
    return <UiNode as="div" className={`anatomy-stage ${props.view === 'occlusal' ? 'is-occlusal' : ''}`} ref={host}>
  <UiNode as="div" className="anatomy-side anatomy-side--right" translateChildren={false}>R<UiNode as="span">Hasta sağı</UiNode></UiNode><UiNode as="div" className="anatomy-side anatomy-side--left" translateChildren={false}>L<UiNode as="span">Hasta solu</UiNode></UiNode>
  <UiNode as="svg" className="anatomy-overlay" viewBox={`0 0 ${width} ${height}`} aria-label="Diş numarası hizaları ve köprü bağlantıları"><defs><UiNode as="pattern" id={patternId} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="12" fill="#448fc9"/><rect x="6" width="6" height="12" fill="#efc461"/></UiNode></defs>
   {Object.entries(points).map(([code, p]) => { const upper = Number(code[0]) < 3, side = code[0] === '1' || code[0] === '4' ? -1 : 1, posterior = props.view === 'occlusal' && Number(code[1]) >= 3; const x2 = posterior ? (side < 0 ? p.left : p.right) : p.anchorX, y2 = posterior ? p.anchorY : props.view === 'occlusal' ? (upper ? p.top : p.bottom) : (upper ? p.rootTop : p.rootBottom); return <line key={code} className="anatomy-leader" x1={p.x} y1={p.y} x2={x2} y2={y2} data-tooth={code}/>; })}
   {pairs.map(([a, b]) => {
            if (!points[a] || !points[b])
                return null;
            const band = bridgeBand(points[a], points[b]), linked = props.plan.links.includes(linkKey(a, b)), path = `M${band.x1},${band.y1} L${band.x2},${band.y2}`;
            return <UiNode as="g" key={a + '-' + b} className={`anatomy-bridge-band ${linked ? 'is-linked' : ''}`} role="button" tabIndex={props.disabled ? -1 : 0} aria-disabled={props.disabled} aria-pressed={linked} aria-label={`${a}–${b}: ${linked ? 'Köprüyü ayır' : 'Köprü kur'}`} onClick={() => {
                    if (!props.disabled)
                        props.onLink(a, b);
                }} onKeyDown={e => {
                    if (!props.disabled && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        props.onLink(a, b);
                    }
                }} uiMessages={{ "aria-label": { source: "{0}\u2013{1}: {2}", values: [a, b, linked ? 'Köprüyü ayır' : 'Köprü kur'], userValues: [] } }}><UiNode as="title">{<UiMessage source="{0}–{1}: {2}" values={[a, b, linked ? 'Köprüyü ayır' : 'Köprü kur']} userValues={[]}/>}</UiNode><path className="bridge-band-hit" d={path}/><path className="bridge-band-visible" d={path} stroke={linked ? `url(#${patternId})` : '#98acbd'} strokeDasharray={linked ? undefined : '3 4'}/></UiNode>;
        })}
  </UiNode>
  {ALL_TEETH.map(code => <UiNode as="button" key={code} data-tooth={code} className={`anatomy-number ${props.selected.includes(code) ? 'is-selected' : ''} ${linkedCodes.has(code) ? 'is-bridge' : ''}`} style={points[code] ? { left: points[code].x, top: points[code].y } : { visibility: 'hidden' }} type="button" disabled={props.disabled} aria-label={fdiToothLabel(code) + (linkedCodes.has(code) ? ' · Köprü üyesi' : '')} aria-pressed={props.selected.includes(code)} onClick={() => props.onTooth(code)}>{code}</UiNode>)}
  {loading && <UiNode as="div" className="anatomy-loading" role="status">Diş modelleri hazırlanıyor…</UiNode>}
  {failure && <UiNode as="div" className="anatomy-fallback"><UiNode as="p">{failure}</UiNode>{ALL_TEETH.map(c => <UiNode as="button" key={c} onClick={() => props.onTooth(c)} disabled={props.disabled}>{c}</UiNode>)}</UiNode>}
  <UiNode as="a" className="anatomy-source" href="/tooth-anatomy/ATTRIBUTION.txt" target="_blank" rel="noreferrer">Anatomik referans · 20 yaş dişleri temsili</UiNode><UiNode as="span" className="anatomy-view-label" translateChildren={false}>{uiText(TOOTH_VIEWS.find(v => v.id === props.view)?.name ?? '').toLocaleUpperCase(intlLocale())} · {uiText('GÖRÜNÜM')}</UiNode>
 </UiNode>;
}
