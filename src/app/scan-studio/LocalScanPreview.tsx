"use client";
import UiNode from "@/lib/i18n/UiNode";
import { useEffect, useRef, type CSSProperties } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { dy } from "@/app/dentaya-theme";
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
function cssColor(variable: string, fallback: string) {
    if (typeof window === "undefined")
        return fallback;
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || fallback;
}
export default function LocalScanPreview({ file, onStats }: {
    file: File | null;
    onStats: (stats: LocalScanStats | null) => void;
}) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const host = hostRef.current;
        if (!host)
            return;
        // Keep a stable, non-null DOM reference for nested callbacks.
        const hostElement: HTMLDivElement = host;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(cssColor("--dy-bg", "#081019"));
        const camera = new THREE.PerspectiveCamera(40, 1, .01, 3000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        hostElement.innerHTML = "";
        renderer.domElement.style.display = "block";
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        hostElement.appendChild(renderer.domElement);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        scene.add(new THREE.HemisphereLight(0xffffff, 0x132432, 2.7));
        const key = new THREE.DirectionalLight(0xffffff, 3);
        key.position.set(4, 6, 4);
        scene.add(key);
        const rim = new THREE.DirectionalLight(new THREE.Color(cssColor("--dy-accent", "#65decf")), 1.8);
        rim.position.set(-5, 2, -3);
        scene.add(rim);
        let mesh: THREE.Mesh | null = null;
        let frame = 0;
        function resize() { const width = hostElement.clientWidth || 700, height = hostElement.clientHeight || 470; renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); }
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(hostElement);
        async function load() {
            if (!file) {
                onStats(null);
                return;
            }
            const buffer = await file.arrayBuffer();
            const geometry = file.name.toLowerCase().endsWith(".ply") ? new PLYLoader().parse(buffer) : new STLLoader().parse(buffer);
            geometry.computeVertexNormals();
            geometry.center();
            geometry.computeBoundingBox();
            geometry.computeBoundingSphere();
            const position = geometry.getAttribute("position") as THREE.BufferAttribute;
            const size = new THREE.Vector3();
            geometry.boundingBox!.getSize(size);
            const quality = analyzeMeshGeometry(geometry);
            const triangleCount = geometry.index ? Math.floor(geometry.index.count / 3) : Math.floor(position.count / 3);
            onStats({
                meshPoints: position.count,
                triangleCount,
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
            mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xe8f6f3, roughness: .6, metalness: .03, side: THREE.DoubleSide }));
            scene.add(mesh);
            const radius = geometry.boundingSphere?.radius || 10;
            camera.position.set(radius * 1.9, radius * 1.4, radius * 2.1);
            controls.target.set(0, 0, 0);
            controls.update();
        }
        void load();
        function handleThemeChange() { scene.background = new THREE.Color(cssColor("--dy-bg", "#081019")); rim.color = new THREE.Color(cssColor("--dy-accent", "#65decf")); }
        window.addEventListener("dentaya-theme-change", handleThemeChange);
        let animating = false;
        function animate() {
            if (document.hidden) {
                animating = false;
                return;
            }
            animating = true;
            controls.update();
            renderer.render(scene, camera);
            frame = requestAnimationFrame(animate);
        }
        function handleVisibilityChange() {
            if (document.hidden) {
                cancelAnimationFrame(frame);
                animating = false;
            }
            else if (!animating) {
                animate();
            }
        }
        document.addEventListener("visibilitychange", handleVisibilityChange);
        animate();
        return () => { window.removeEventListener("dentaya-theme-change", handleThemeChange); document.removeEventListener("visibilitychange", handleVisibilityChange); cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); if (mesh) {
            mesh.geometry.dispose();
            if (mesh.material instanceof THREE.Material)
                mesh.material.dispose();
        } renderer.dispose(); renderer.forceContextLoss(); if (renderer.domElement.parentNode)
            renderer.domElement.parentNode.removeChild(renderer.domElement); };
    }, [file, onStats]);
    return <UiNode as="div" style={s.shell}><UiNode as="div" ref={hostRef} style={s.host}/>{!file && <UiNode data-dy-copy-stack as="div" style={s.empty}><UiNode as="strong">STL / PLY önizleme</UiNode><UiNode as="span">Tarama dosyasını seçtiğinde 3D mesh burada açılır.</UiNode></UiNode>}<UiNode as="div" style={s.badge}>DENTAYA TARAMA STÜDYOSU</UiNode></UiNode>;
}
const s: Record<string, CSSProperties> = {
    shell: { position: "relative", width: "100%", height: "100%", minHeight: 430, overflow: "hidden", borderRadius: 14, background: dy.bg }, host: { width: "100%", height: "100%", minHeight: 430, overflow: "hidden" },
    empty: { position: "absolute", inset: 0, display: "grid", placeItems: "center", alignContent: "center", gap: 8, padding: 20, textAlign: "center", color: dy.muted, background: `radial-gradient(circle at center,${dy.surface2} 0,${dy.bg} 68%)`, fontSize: 14 },
    badge: { position: "absolute", top: 12, left: 12, padding: "7px 10px", borderRadius: 999, background: dy.surface, border: `1px solid ${dy.border}`, color: dy.accent, fontSize: 12, fontWeight: 900, letterSpacing: ".11em", opacity: .94 },
};
