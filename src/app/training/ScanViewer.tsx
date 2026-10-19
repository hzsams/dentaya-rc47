"use client";
import UiMessage from "@/lib/i18n/UiMessage";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
export default function ScanViewer({ path, arch = 'upper' }: {
    path: string;
    arch?: 'upper' | 'lower';
}) {
    const { t: uiText, intlLocale } = useTranslation();
    const [stats, setStats] = useState<{
        triangles: number;
        dimensions: number[];
    } | null>(null);
    const host = useRef<HTMLDivElement>(null), controls = useRef<{
        mesh: THREE.Mesh;
        fit: () => void;
        opposite: () => void;
    } | null>(null);
    const [message, setMessage] = useState('Tarama yükleniyor…'), [wire, setWire] = useState(false), [opacity, setOpacity] = useState(100);
    useEffect(() => {
        if (!host.current)
            return;
        let alive = true;
        const abort = new AbortController();
        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#111c26');
        const camera = new THREE.PerspectiveCamera(40, 1, .1, 5000);
        camera.up.set(0, 0, 1);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        host.current.appendChild(renderer.domElement);
        const orbit = new OrbitControls(camera, renderer.domElement);
        orbit.enableDamping = true;
        const ambient = new THREE.HemisphereLight(0xffffff, 0x65727d, 2.5);
        scene.add(ambient);
        const light = new THREE.DirectionalLight(0xffffff, 3);
        light.position.set(30, -40, 90);
        scene.add(light);
        let mesh: THREE.Mesh | null = null;
        const resize = () => {
            if (!host.current)
                return;
            const { width, height } = host.current.getBoundingClientRect();
            renderer.setSize(width, height);
            camera.aspect = width / Math.max(height, 1);
            camera.updateProjectionMatrix();
        };
        const observer = new ResizeObserver(resize);
        observer.observe(host.current);
        resize();
        renderer.setAnimationLoop(() => { orbit.update(); renderer.render(scene, camera); });
        setStats(null);
        setMessage('Gerçek STL taraması yükleniyor…');
        setWire(false);
        setOpacity(100);
        void (async () => {
            try {
                const response = await fetch(path, { signal: abort.signal });
                if (!response.ok)
                    throw Error(`Dosya açılamadı (${response.status})`);
                const buffer = await response.arrayBuffer();
                if (!alive)
                    return;
                const geometry = new STLLoader().parse(buffer);
                const pos = geometry.getAttribute('position');
                if (!pos || pos.count < 3)
                    throw Error('Geçerli üçgen bulunamadı.');
                for (let i = 0; i < pos.array.length; i++)
                    if (!Number.isFinite(pos.array[i])) {
                        geometry.dispose();
                        throw Error('Modelde geçersiz koordinat var.');
                    }
                geometry.computeBoundingBox();
                const box = geometry.boundingBox!, center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
                geometry.translate(-center.x, -center.y, -center.z);
                geometry.computeVertexNormals();
                mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xd8dfdd, roughness: .67, metalness: .03, side: THREE.DoubleSide }));
                scene.add(mesh);
                const fit = () => { const r = Math.max(size.length(), 1); camera.position.set(0, r * .85, arch === 'lower' ? r * 1.05 : -r * 1.05); camera.near = r / 1000; camera.far = r * 20; camera.updateProjectionMatrix(); orbit.target.set(0, 0, 0); orbit.update(); };
                controls.current = { mesh, fit, opposite: () => { camera.position.negate(); orbit.update(); } };
                fit();
                setStats({ triangles: pos.count / 3, dimensions: [size.x, size.y, size.z] });
                setMessage("");
            }
            catch (e) {
                if (alive)
                    setMessage(e instanceof Error ? e.message : 'Tarama açılamadı.');
            }
        })();
        return () => {
            alive = false;
            abort.abort();
            controls.current = null;
            observer.disconnect();
            renderer.setAnimationLoop(null);
            orbit.dispose();
            if (mesh) {
                mesh.geometry.dispose();
                (mesh.material as THREE.Material).dispose();
            }
            renderer.dispose();
            renderer.domElement.remove();
        };
    }, [path, arch]);
    useEffect(() => {
        const m = controls.current?.mesh;
        if (m) {
            const mat = m.material as THREE.MeshStandardMaterial;
            mat.wireframe = wire;
            mat.opacity = opacity / 100;
            mat.transparent = opacity < 100;
            mat.depthWrite = opacity === 100;
            mat.needsUpdate = true;
            m.visible = opacity > 0;
        }
    }, [wire, opacity]);
    return <UiNode as="section" className="training-viewer"><UiNode as="div" ref={host} className="training-canvas" aria-label="Gerçek tarama 3D görünümü"/><UiNode as="div" className="training-view-tools"><UiNode as="button" onClick={() => controls.current?.fit()}>{uiText("Ekrana sığdır")}</UiNode><UiNode as="button" onClick={() => controls.current?.opposite()}>Karşı yüzden bak</UiNode><UiNode as="button" aria-pressed={wire} onClick={() => setWire(v => !v)}>{uiText("Tel kafes")}</UiNode><UiNode as="label">Görünürlük %{opacity}<UiNode as="input" aria-label="Tarama görünürlük yüzdesi" type="range" min={0} max={100} value={opacity} onChange={e => setOpacity(Number(e.target.value))}/></UiNode></UiNode><UiNode as="p" role="status">{stats ? <UiMessage source="{0} △ · {1} mm" values={[stats.triangles.toLocaleString(intlLocale()), stats.dimensions.map(n => n.toLocaleString(intlLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })).join(" × ")]} userValues={[]}/> : message}</UiNode><UiNode as="small">Sol sürükle: döndür · tekerlek: yakınlaştır · sağ sürükle: kaydır. Kaynak STL değiştirilmez.</UiNode></UiNode>;
}
