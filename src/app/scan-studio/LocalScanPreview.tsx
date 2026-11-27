"use client";
import { useTranslation } from "@/lib/i18n";
import { scanStudioText } from "@/lib/i18n/scan-studio";
import UiNode from "@/lib/i18n/UiNode";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { analyzeMeshGeometry, type MeshIntakeStatus, type MeshTopologyMode } from "@/lib/mesh-quality";

export type LocalScanStats = {
    meshPoints: number;
    triangleCount: number;
    widthMm: number;
    heightMm: number;
    depthMm: number;
    invalidVertexCount: number;
    degenerateTriangleCount: number;
    boundaryEdgeCount: number | null;
    nonManifoldEdgeCount: number | null;
    topologyMode: MeshTopologyMode;
    unitHint: "plausible-mm" | "suspicious-small" | "suspicious-large";
    intakeStatus: MeshIntakeStatus;
    warnings: string[];
};

export default function LocalScanPreview({ file, onStats, frame, wireframe }: {
    file: File;
    onStats: (stats: LocalScanStats | null, error?: string) => void;
    frame: number;
    wireframe: boolean;
}) {
    const { locale } = useTranslation();
    const { webglFailed, parseFailed } = scanStudioText(locale);
    const hostRef = useRef<HTMLDivElement>(null);
    const fitRef = useRef<(() => void) | null>(null);
    const renderRef = useRef<(() => void) | null>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);
    const wireframeRef = useRef(false);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        let renderer: THREE.WebGLRenderer;
        try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
        catch { onStats(null, webglFailed); return; }
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 1, .01, 3000);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        host.appendChild(renderer.domElement);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        scene.add(new THREE.HemisphereLight(0xffffff, 0x9f96a5, 2.1));
        const key = new THREE.DirectionalLight(0xffffff, 2.3);
        key.position.set(4, 6, 5);
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xf0edff, 1.1);
        fill.position.set(-5, 2, -3);
        scene.add(fill);
        let geometry: THREE.BufferGeometry | null = null;
        let material: THREE.MeshStandardMaterial | null = null;
        let renderFrame = 0;
        let active = true;

        function resize() {
            const width = host!.clientWidth || 1;
            const height = host!.clientHeight || 1;
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75, Math.sqrt(5_500_000 / (width * height))));
            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            requestRender();
        }
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(host);

        async function load() {
            try {
                const buffer = await file.arrayBuffer();
                if (!active) return;
                geometry = file.name.toLowerCase().endsWith(".ply") ? new PLYLoader().parse(buffer) : new STLLoader().parse(buffer);
                const position = geometry.getAttribute("position");
                if (!position || position.count < 3) throw new Error("SCAN_GEOMETRY_MISSING");
                const quality = analyzeMeshGeometry(geometry);
                if (quality.invalidVertexCount > 0) throw new Error("SCAN_GEOMETRY_INVALID");
                geometry.computeBoundingBox();
                const size = geometry.boundingBox!.getSize(new THREE.Vector3());
                if (!Number.isFinite(size.x + size.y + size.z)) throw new Error("SCAN_GEOMETRY_INVALID");
                onStats({
                    meshPoints: position.count,
                    triangleCount: Math.floor((geometry.index?.count ?? position.count) / 3),
                    widthMm: size.x,
                    heightMm: size.y,
                    depthMm: size.z,
                    invalidVertexCount: quality.invalidVertexCount,
                    degenerateTriangleCount: quality.degenerateTriangleCount,
                    boundaryEdgeCount: quality.boundaryEdgeCount,
                    nonManifoldEdgeCount: quality.nonManifoldEdgeCount,
                    topologyMode: quality.topologyMode,
                    unitHint: quality.unitHint,
                    intakeStatus: quality.intakeStatus,
                    warnings: quality.warnings,
                });
                if (quality.intakeStatus === "reject") return;
                geometry.computeVertexNormals();
                geometry.center();
                geometry.computeBoundingSphere();
                const vertexColors = geometry.hasAttribute("color");
                material = new THREE.MeshStandardMaterial({ color: vertexColors ? 0xffffff : 0xd8d1c5,
                    roughness: .82, side: THREE.DoubleSide, vertexColors, wireframe: wireframeRef.current });
                materialRef.current = material;
                scene.add(new THREE.Mesh(geometry, material));
                const radius = geometry.boundingSphere?.radius || 10;
                fitRef.current = () => {
                    const ratio = Math.min(camera.aspect, 1);
                    const distance = radius * 1.1 / Math.sin(Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * ratio));
                    camera.position.set(.65, .45, 1).setLength(distance);
                    camera.near = Math.max(radius / 1000, .001);
                    camera.far = Math.max(distance * 12, 100);
                    camera.updateProjectionMatrix();
                    controls.target.set(0, 0, 0);
                    controls.update();
                    requestRender();
                };
                fitRef.current();
            } catch {
                if (active) onStats(null, parseFailed);
            }
        }
        void load();
        function render() {
            renderFrame = 0;
            if (!active || document.hidden) return;
            controls.update();
            renderer.render(scene, camera);
        }
        function requestRender() {
            if (active && !document.hidden && renderFrame === 0) renderFrame = requestAnimationFrame(render);
        }
        function visibility() {
            cancelAnimationFrame(renderFrame);
            renderFrame = 0;
            requestRender();
        }
        controls.addEventListener("change", requestRender);
        document.addEventListener("visibilitychange", visibility);
        renderRef.current = requestRender;
        return () => {
            active = false;
            document.removeEventListener("visibilitychange", visibility);
            cancelAnimationFrame(renderFrame);
            observer.disconnect();
            controls.removeEventListener("change", requestRender);
            controls.dispose();
            geometry?.dispose();
            material?.dispose();
            materialRef.current = null;
            fitRef.current = null;
            renderRef.current = null;
            renderer.dispose();
            renderer.forceContextLoss();
            renderer.domElement.remove();
        };
    }, [file, onStats, parseFailed, webglFailed]);
    useEffect(() => { fitRef.current?.(); }, [frame]);
    useEffect(() => {
        wireframeRef.current = wireframe;
        if (materialRef.current) materialRef.current.wireframe = wireframe;
        renderRef.current?.();
    }, [wireframe]);
    return <UiNode as="div" ref={hostRef} className="scan-canvas"/>;
}
