"use client";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import UserText from '@/lib/i18n/UserText';
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useRef, useState, type CSSProperties, } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { devError } from "@/lib/dev-log";
import { nearestDistanceField, rigidRegisterGeometry } from "@/lib/scan-registration";
import { supabase } from "@/lib/supabase";
import { dy, useDentayaThemeRuntime } from "@/app/dentaya-theme";
type Asset = {
    bucket: string | null;
    path: string;
    fileName: string;
    scanRef: string;
    capturedAt: string;
    demoMode: boolean;
};
type Props = {
    older: Asset;
    newer: Asset;
    onClose: () => void;
};
type ViewMode = "side" | "overlay" | "heatmap";
type HeatmapStats = {
    mean: number;
    rms: number;
    p95: number;
    max: number;
    scale: number;
    vertexCount: number;
    registrationRms: number;
    registrationPairs: number;
} | null;
export default function ScanCompareViewer({ older, newer, onClose, }: Props) {
    const { intlLocale } = useTranslation();
    useDentayaThemeRuntime();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const oldMeshRef = useRef<THREE.Mesh | null>(null);
    const newMeshRef = useRef<THREE.Mesh | null>(null);
    const oldMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
    const newMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const offsetRef = useRef(25);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [mode, setMode] = useState<ViewMode>("side");
    const [olderOpacity, setOlderOpacity] = useState(0.38);
    const [autoRotate, setAutoRotate] = useState(false);
    const [heatmapStats, setHeatmapStats] = useState<HeatmapStats>(null);
    useEffect(() => {
        const oldMesh = oldMeshRef.current;
        const newMesh = newMeshRef.current;
        const oldMaterial = oldMaterialRef.current;
        const newMaterial = newMaterialRef.current;
        if (!oldMesh || !newMesh || !oldMaterial || !newMaterial)
            return;
        oldMesh.visible = true;
        newMesh.visible = true;
        if (mode === "side") {
            oldMesh.position.x = -offsetRef.current;
            newMesh.position.x = offsetRef.current;
            oldMaterial.transparent = false;
            oldMaterial.opacity = 1;
            oldMaterial.depthWrite = true;
            oldMaterial.vertexColors = false;
            oldMaterial.color.setHex(0x91a9ff);
            newMaterial.transparent = false;
            newMaterial.opacity = 1;
            newMaterial.depthWrite = true;
            newMaterial.vertexColors = false;
            newMaterial.color.setHex(0x6de2cf);
        }
        else if (mode === "overlay") {
            oldMesh.position.x = 0;
            newMesh.position.x = 0;
            oldMaterial.transparent = true;
            oldMaterial.opacity = olderOpacity;
            oldMaterial.depthWrite = false;
            oldMaterial.vertexColors = false;
            oldMaterial.color.setHex(0x91a9ff);
            newMaterial.transparent = true;
            newMaterial.opacity = 0.82;
            newMaterial.depthWrite = true;
            newMaterial.vertexColors = false;
            newMaterial.color.setHex(0x6de2cf);
        }
        else {
            oldMesh.position.x = 0;
            newMesh.position.x = 0;
            oldMesh.visible = false;
            oldMaterial.transparent = false;
            oldMaterial.opacity = 1;
            oldMaterial.depthWrite = true;
            newMaterial.transparent = false;
            newMaterial.opacity = 1;
            newMaterial.depthWrite = true;
            newMaterial.vertexColors = true;
            newMaterial.color.setHex(0xffffff);
        }
        oldMaterial.needsUpdate = true;
        newMaterial.needsUpdate = true;
    }, [mode, olderOpacity]);
    useEffect(() => {
        if (!controlsRef.current)
            return;
        controlsRef.current.autoRotate = autoRotate;
        controlsRef.current.autoRotateSpeed = 1.5;
    }, [autoRotate]);
    useEffect(() => {
        const container = containerRef.current;
        if (!container)
            return;
        const containerElement: HTMLDivElement = container;
        let cancelled = false;
        let frameId = 0;
        let renderer: THREE.WebGLRenderer | null = null;
        let controls: OrbitControls | null = null;
        let resizeObserver: ResizeObserver | null = null;
        let visibilityHandler: (() => void) | null = null;
        let oldGeometry: THREE.BufferGeometry | null = null;
        let newGeometry: THREE.BufferGeometry | null = null;
        let oldMaterial: THREE.MeshStandardMaterial | null = null;
        let newMaterial: THREE.MeshStandardMaterial | null = null;
        async function getBytes(asset: Asset) {
            if (asset.bucket === "public-demo") {
                const response = await fetch(asset.path);
                if (!response.ok) {
                    throw new Error(`${asset.scanRef} demo modeli yüklenemedi (${response.status}).`);
                }
                return response.arrayBuffer();
            }
            if (!asset.bucket) {
                throw new Error(`${asset.scanRef} için Storage bucket tanımlı değil.`);
            }
            const { data, error: downloadError } = await supabase.storage
                .from(asset.bucket)
                .download(asset.path.replace(/^\/+/, ""));
            if (downloadError)
                throw downloadError;
            return data.arrayBuffer();
        }
        function parseGeometry(buffer: ArrayBuffer, path: string) {
            const lower = path.toLowerCase();
            if (lower.endsWith(".ply")) {
                return new PLYLoader().parse(buffer);
            }
            if (lower.endsWith(".stl")) {
                return new STLLoader().parse(buffer);
            }
            throw new Error("3D karşılaştırma şu anda STL ve PLY dosyalarını destekliyor.");
        }
        function buildRegisteredDeviationMap(oldGeometryInput: THREE.BufferGeometry, newGeometryInput: THREE.BufferGeometry) {
            const registration = rigidRegisterGeometry(oldGeometryInput, newGeometryInput, 6);
            if (Number.isFinite(registration.rms) &&
                registration.pairCount >=
                    10) {
                newGeometryInput.applyMatrix4(registration.matrix);
                newGeometryInput.computeVertexNormals();
                newGeometryInput.computeBoundingBox();
                newGeometryInput.computeBoundingSphere();
            }
            const distances = nearestDistanceField(oldGeometryInput, newGeometryInput);
            const scratch: number[] = [];
            let sum = 0;
            let sumSquares = 0;
            let max = 0;
            for (let i = 0; i < distances.length; i++) {
                const distance = distances[i];
                scratch.push(distance);
                sum += distance;
                sumSquares +=
                    distance * distance;
                max =
                    Math.max(max, distance);
            }
            scratch.sort((a, b) => a - b);
            const p95 = scratch[Math.min(scratch.length - 1, Math.floor(scratch.length *
                0.95))] ??
                max ??
                1;
            const scale = Math.max(p95, 0.0001);
            const low = new THREE.Color(0x4a83ff);
            const mid = new THREE.Color(0x6de2cf);
            const high = new THREE.Color(0xff667a);
            const colors = new Float32Array(distances.length * 3);
            for (let i = 0; i < distances.length; i++) {
                const normalized = Math.min(1, distances[i] /
                    scale);
                const color = normalized <= 0.5
                    ? low
                        .clone()
                        .lerp(mid, normalized /
                        0.5)
                    : mid
                        .clone()
                        .lerp(high, (normalized -
                        0.5) /
                        0.5);
                colors[i * 3] =
                    color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
            }
            newGeometryInput.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
            setHeatmapStats({
                mean: sum /
                    Math.max(distances.length, 1),
                rms: Math.sqrt(sumSquares /
                    Math.max(distances.length, 1)),
                p95,
                max,
                scale,
                vertexCount: distances.length,
                registrationRms: registration.rms,
                registrationPairs: registration.pairCount,
            });
        }
        async function initialize() {
            try {
                setLoading(true);
                setError("");
                setHeatmapStats(null);
                const [oldBuffer, newBuffer] = await Promise.all([
                    getBytes(older),
                    getBytes(newer),
                ]);
                if (cancelled)
                    return;
                oldGeometry = parseGeometry(oldBuffer, older.path);
                newGeometry = parseGeometry(newBuffer, newer.path);
                oldGeometry.computeVertexNormals();
                newGeometry.computeVertexNormals();
                oldGeometry.center();
                newGeometry.center();
                oldGeometry.computeBoundingSphere();
                newGeometry.computeBoundingSphere();
                buildRegisteredDeviationMap(oldGeometry, newGeometry);
                const oldRadius = oldGeometry.boundingSphere?.radius || 50;
                const newRadius = newGeometry.boundingSphere?.radius || 50;
                const radius = Math.max(oldRadius, newRadius);
                offsetRef.current = radius * 1.45;
                const scene = new THREE.Scene();
                scene.background = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue("--dy-bg").trim() || "#07111d");
                const camera = new THREE.PerspectiveCamera(42, 1, Math.max(radius / 100, 0.01), Math.max(radius * 120, 1000));
                renderer = new THREE.WebGLRenderer({
                    antialias: true,
                    alpha: false,
                });
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
                renderer.outputColorSpace = THREE.SRGBColorSpace;
                renderer.toneMapping = THREE.ACESFilmicToneMapping;
                renderer.toneMappingExposure = 1.08;
                containerElement.innerHTML = "";
                containerElement.appendChild(renderer.domElement);
                oldMaterial = new THREE.MeshStandardMaterial({
                    color: 0x91a9ff,
                    roughness: 0.58,
                    metalness: 0.03,
                    side: THREE.DoubleSide,
                });
                newMaterial = new THREE.MeshStandardMaterial({
                    color: 0x6de2cf,
                    roughness: 0.58,
                    metalness: 0.03,
                    side: THREE.DoubleSide,
                    vertexColors: false,
                });
                oldMaterialRef.current = oldMaterial;
                newMaterialRef.current = newMaterial;
                const oldMesh = new THREE.Mesh(oldGeometry, oldMaterial);
                const newMesh = new THREE.Mesh(newGeometry, newMaterial);
                oldMeshRef.current = oldMesh;
                newMeshRef.current = newMesh;
                oldMesh.position.x = -offsetRef.current;
                newMesh.position.x = offsetRef.current;
                scene.add(oldMesh, newMesh);
                const hemi = new THREE.HemisphereLight(0xffffff, 0x132334, 2.9);
                scene.add(hemi);
                const key = new THREE.DirectionalLight(0xffffff, 3.5);
                key.position.set(4, 6, 6);
                scene.add(key);
                const rim = new THREE.DirectionalLight(new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue("--dy-accent").trim() || "#6de2cf"), 1.7);
                rim.position.set(-5, 1, -4);
                scene.add(rim);
                const fill = new THREE.DirectionalLight(0x8da8ff, 1.4);
                fill.position.set(3, -4, -2);
                scene.add(fill);
                const grid = new THREE.GridHelper(radius * 8, 32, new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue("--dy-border").trim() || "#285465"), new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue("--dy-surface2").trim() || "#142936"));
                grid.position.y = -radius * 1.22;
                scene.add(grid);
                camera.position.set(radius * 3.7, radius * 2.0, radius * 4.3);
                controls = new OrbitControls(camera, renderer.domElement);
                controls.enableDamping = true;
                controls.dampingFactor = 0.08;
                controls.enablePan = true;
                controls.enableZoom = true;
                controls.autoRotate = autoRotate;
                controls.autoRotateSpeed = 1.5;
                controls.target.set(0, 0, 0);
                controls.update();
                controlsRef.current = controls;
                function resize() {
                    if (!renderer)
                        return;
                    const width = containerElement.clientWidth || 1100;
                    const height = containerElement.clientHeight || 620;
                    renderer.setSize(width, height, false);
                    camera.aspect = width / height;
                    camera.updateProjectionMatrix();
                }
                resize();
                resizeObserver = new ResizeObserver(resize);
                resizeObserver.observe(containerElement);
                let animating = false;
                function animate() {
                    if (cancelled || !renderer || !controls || document.hidden) {
                        animating = false;
                        return;
                    }
                    animating = true;
                    controls.update();
                    renderer.render(scene, camera);
                    frameId = requestAnimationFrame(animate);
                }
                visibilityHandler = () => {
                    if (document.hidden) {
                        cancelAnimationFrame(frameId);
                        animating = false;
                    }
                    else if (!animating) {
                        animate();
                    }
                };
                document.addEventListener("visibilitychange", visibilityHandler);
                const handleThemeChange = () => {
                    scene.background = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue("--dy-bg").trim() || "#07111d");
                    rim.color = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue("--dy-accent").trim() || "#6de2cf");
                };
                window.addEventListener("dentaya-theme-change", handleThemeChange);
                (renderer as THREE.WebGLRenderer & {
                    __dentayaThemeCleanup?: () => void;
                }).__dentayaThemeCleanup = () => window.removeEventListener("dentaya-theme-change", handleThemeChange);
                animate();
                setLoading(false);
            }
            catch (err) {
                devError(err);
                setError(err instanceof Error
                    ? err.message
                    : "3D tarama karşılaştırması açılamadı.");
                setLoading(false);
            }
        }
        void initialize();
        return () => {
            cancelled = true;
            cancelAnimationFrame(frameId);
            resizeObserver?.disconnect();
            if (visibilityHandler) {
                document.removeEventListener("visibilitychange", visibilityHandler);
            }
            controls?.dispose();
            oldGeometry?.dispose();
            newGeometry?.dispose();
            oldMaterial?.dispose();
            newMaterial?.dispose();
            controlsRef.current = null;
            oldMeshRef.current = null;
            newMeshRef.current = null;
            oldMaterialRef.current = null;
            newMaterialRef.current = null;
            if (renderer) {
                (renderer as THREE.WebGLRenderer & {
                    __dentayaThemeCleanup?: () => void;
                }).__dentayaThemeCleanup?.();
                renderer.dispose();
                renderer.forceContextLoss();
                const canvas = renderer.domElement;
                if (canvas.parentNode)
                    canvas.parentNode.removeChild(canvas);
            }
        };
        // Scene recreation is keyed to storage objects; display toggles are synchronized through refs/effects.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [older.bucket, older.path, newer.bucket, newer.path]);
    return (<UiNode as="div" style={overlay}>
      <style>{`
        @media(max-width:900px){
          .scan-compare-modal{
            width:100vw!important;
            height:100vh!important;
            max-height:none!important;
            border-radius:0!important;
          }
          .scan-compare-header{
            flex-direction:column!important;
            align-items:flex-start!important;
          }
          .scan-compare-actions{
            justify-content:flex-start!important;
          }
          .scan-compare-info{
            align-items:flex-start!important;
          }
          .scan-compare-footer{
            flex-direction:column!important;
            align-items:flex-start!important;
          }
        }
      `}</style>
      <UiNode as="section" className="scan-compare-modal" style={modal}>
        <UiNode as="header" className="scan-compare-header" style={header}>
          <UiNode as="div">
            <UiNode as="p" style={eyebrow}>DENTAYA 3D ZAMAN KARŞILAŞTIRMASI</UiNode>
            <UiNode as="h2" style={title}>Tarama Karşılaştırması</UiNode>
            <UiNode as="div" style={legend}>
              <UiNode as="span" style={legendItem}>
                <UiNode as="i" style={{ ...dot, background: "#91a9ff" }}/>
                Önceki · <UserText>{older.scanRef}</UserText> · {fmtDate(older.capturedAt, intlLocale())}
              </UiNode>
              <UiNode as="span" style={legendItem}>
                <UiNode as="i" style={{ ...dot, background: "#6de2cf" }}/>
                Yeni · <UserText>{newer.scanRef}</UserText> · {fmtDate(newer.capturedAt, intlLocale())}
              </UiNode>
            </UiNode>
          </UiNode>

          <UiNode as="div" className="scan-compare-actions" style={actions}>
            <UiNode as="button" type="button" style={mode === "side" ? activeButton : button} onClick={() => setMode("side")}>
              Yan Yana
            </UiNode>
            <UiNode as="button" type="button" style={mode === "overlay" ? activeButton : button} onClick={() => setMode("overlay")}>
              Üst Üste
            </UiNode>
            <UiNode as="button" type="button" style={mode === "heatmap" ? heatmapActiveButton : button} onClick={() => setMode("heatmap")}>
              Fark Haritası
            </UiNode>
            <UiNode as="button" type="button" style={button} onClick={() => setAutoRotate((value) => !value)}>
              {autoRotate ? "Dönüşü Durdur" : "Otomatik Döndür"}
            </UiNode>
            <UiNode as="button" type="button" style={closeButton} onClick={onClose}>
              ✕ Kapat
            </UiNode>
          </UiNode>
        </UiNode>

        {mode === "overlay" && (<UiNode as="div" className="scan-compare-info" style={infoRow}>
            <UiNode as="span">Önceki tarama görünürlüğü</UiNode>
            <UiNode as="input" aria-label="Önceki tarama görünürlüğü" type="range" min="0.1" max="0.8" step="0.05" value={olderOpacity} onChange={(event) => setOlderOpacity(Number(event.target.value))} style={{ width: 190 }}/>
            <UiNode as="strong">%{Math.round(olderOpacity * 100)}</UiNode>
            <UiNode as="span" style={warning}>
              Görsel hizalama önizlemesidir; klinik yüzey registrasyonu değildir.
            </UiNode>
          </UiNode>)}

        {mode === "heatmap" && (<UiNode as="div" className="scan-compare-info" style={heatmapRow}>
            <UiNode as="div" style={heatmapLegendWrap}>
              <UiNode as="span" style={heatmapLabel}>Düşük fark</UiNode>
              <UiNode as="div" style={heatmapBar}/>
              <UiNode as="span" style={heatmapLabel}>Yüksek fark</UiNode>
            </UiNode>

            {heatmapStats && (<UiNode as="div" style={heatmapStatsStyle}>
                <UiNode as="span">Ort. <UiNode as="b">{heatmapStats.mean.toFixed(3)}</UiNode></UiNode>
                <UiNode as="span">RMS <UiNode as="b">{heatmapStats.rms.toFixed(3)}</UiNode></UiNode>
                <UiNode as="span">P95 <UiNode as="b">{heatmapStats.p95.toFixed(3)}</UiNode></UiNode>
                <UiNode as="span">Nokta <UiNode as="b">{heatmapStats.vertexCount.toLocaleString(intlLocale())}</UiNode></UiNode>
                <UiNode as="span">ICP RMS <UiNode as="b">{Number.isFinite(heatmapStats.registrationRms) ? heatmapStats.registrationRms.toFixed(3) : "—"}</UiNode></UiNode>
                <UiNode as="span">Eşleşme <UiNode as="b">{heatmapStats.registrationPairs.toLocaleString(intlLocale())}</UiNode></UiNode>
              </UiNode>)}

            <UiNode as="span" style={warning}>
              Rigid ICP/Horn hizalama + örneklenmiş en yakın yüzey noktası mesafesi kullanır. Bu hâlâ klinik olarak valide edilmiş registrasyon veya longitudinal ölçüm değildir.
            </UiNode>
          </UiNode>)}

        <UiNode as="div" style={viewerShell}>
          <UiNode as="div" ref={containerRef} style={viewer}/>

          {loading && (<UiNode as="div" style={loadingLayer}>
              <LoadingExperience compact title="İki tarama hazırlanıyor…"/>
            </UiNode>)}

          {error && (<UiNode data-dy-copy-stack as="div" style={errorLayer}>
              <UiNode as="strong">Karşılaştırma açılamadı</UiNode>
              <UiNode as="p">{error}</UiNode>
            </UiNode>)}

          <UiNode as="div" style={viewerHint}>
            Sol tık: döndür · Tekerlek: zoom · Sağ tık: taşı
          </UiNode>
        </UiNode>

        <UiNode as="footer" className="scan-compare-footer" style={footer}>
          <UiNode as="span">DentAYA Dental Twin · Zaman İçinde Tarama Karşılaştırması + Prototip Fark Haritası</UiNode>
          <UiNode as="span" style={{ color: dy.muted }}>
            {older.demoMode || newer.demoMode
            ? "Sentetik 3D demo modelleri kullanılıyor."
            : "Yetkili hasta taramaları görüntüleniyor."}
          </UiNode>
        </UiNode>
      </UiNode>
    </UiNode>);
}
function fmtDate(value: string, localeTag: string = "tr-TR") {
    try {
        return new Intl.DateTimeFormat(localeTag, {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).format(new Date(value));
    }
    catch {
        return value;
    }
}
const overlay: CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 10000,
    padding: 16,
    display: "grid",
    placeItems: "center",
    background: "rgba(2,7,12,.92)",
    backdropFilter: "blur(12px)",
};
const modal: CSSProperties = {
    width: "min(1380px,98vw)",
    height: "min(900px,96vh)",
    display: "grid",
    gridTemplateRows: "auto auto 1fr auto",
    overflow: "hidden",
    borderRadius: 24,
    border: `1px solid ${dy.border}`,
    background: dy.bg,
    color: dy.text,
    boxShadow: "0 40px 130px rgba(0,0,0,.76)",
};
const header: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    padding: "17px 19px",
    borderBottom: `1px solid ${dy.border}`,
};
const eyebrow: CSSProperties = {
    margin: "0 0 6px",
    color: dy.accent,
    fontSize: 13,
    fontWeight: 850,
    letterSpacing: ".16em",
};
const title: CSSProperties = {
    margin: 0,
    fontSize: 24,
};
const legend: CSSProperties = {
    display: "flex",
    gap: 13,
    flexWrap: "wrap",
    marginTop: 9,
    color: dy.muted,
    fontSize: 13,
};
const legendItem: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
};
const dot: CSSProperties = {
    width: 9,
    height: 9,
    borderRadius: 999,
    display: "inline-block",
};
const actions: CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 7,
};
const button: CSSProperties = {
    minHeight: 38,
    padding: "0 11px",
    borderRadius: 11,
    border: `1px solid ${dy.border}`,
    background: dy.surface2,
    color: dy.text,
    cursor: "pointer",
    fontWeight: 760,
};
const activeButton: CSSProperties = {
    ...button,
    background: dy.accentSoft,
    color: dy.accent,
    borderColor: dy.accent,
};
const heatmapActiveButton: CSSProperties = {
    ...button,
    background: "rgba(255,102,122,.12)",
    color: "#ff9baa",
    borderColor: "#ff667a",
};
const closeButton: CSSProperties = {
    ...button,
    background: "rgba(239,91,109,.12)",
    color: "#ff9baa",
};
const infoRow: CSSProperties = {
    minHeight: 46,
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    padding: "7px 18px",
    borderBottom: `1px solid ${dy.border}`,
    background: dy.surface,
    fontSize: 13,
};
const heatmapRow: CSSProperties = {
    ...infoRow,
    minHeight: 58,
};
const heatmapLegendWrap: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 7,
};
const heatmapLabel: CSSProperties = {
    color: dy.muted,
    fontSize: 13,
};
const heatmapBar: CSSProperties = {
    width: 150,
    height: 10,
    borderRadius: 999,
    background: "linear-gradient(90deg,#4a83ff 0%,#6de2cf 50%,#ff667a 100%)",
    border: "1px solid rgba(255,255,255,.14)",
};
const heatmapStatsStyle: CSSProperties = {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    color: dy.muted,
    fontSize: 13,
};
const warning: CSSProperties = {
    marginLeft: "auto",
    color: "#eed690",
    maxWidth: 520,
};
const viewerShell: CSSProperties = {
    position: "relative",
    minHeight: 0,
    background: dy.bg,
};
const viewer: CSSProperties = {
    width: "100%",
    height: "100%",
    minHeight: 450,
};
const loadingLayer: CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 10,
    background: dy.surface,
};
const errorLayer: CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    padding: 30,
    textAlign: "center",
    background: "rgba(25,8,13,.90)",
    color: "#ffc8cf",
};
const viewerHint: CSSProperties = {
    position: "absolute",
    right: 14,
    bottom: 14,
    padding: "6px 9px",
    borderRadius: 999,
    background: dy.surface,
    border: `1px solid ${dy.border}`,
    color: dy.muted,
    fontSize: 13,
};
const footer: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: 15,
    padding: "10px 17px",
    borderTop: `1px solid ${dy.border}`,
    fontSize: 13,
};
