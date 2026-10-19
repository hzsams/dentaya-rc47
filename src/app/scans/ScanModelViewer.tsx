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
import { supabase } from "@/lib/supabase";
import { dy, useDentayaThemeRuntime } from "@/app/dentaya-theme";
type AnnotationSeverity = "info" | "watch" | "attention";
type ScanAnnotation = {
    id: string;
    scan_id: string;
    tooth_code: string | null;
    region_label: string | null;
    title: string;
    note: string | null;
    severity: AnnotationSeverity;
    position_x: number;
    position_y: number;
    position_z: number;
    demo_mode: boolean;
    created_by: string | null;
    created_at: string;
};
type Props = {
    scanId: string;
    bucket: string | null;
    path: string;
    fileName: string;
    scanRef: string;
    demoMode?: boolean;
    onClose: () => void;
};
export default function ScanModelViewer({ scanId, bucket, path, fileName, scanRef, demoMode = false, onClose, }: Props) {
    const { t: uiText } = useTranslation();
    useDentayaThemeRuntime();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const meshRef = useRef<THREE.Mesh | null>(null);
    const markerGroupRef = useRef<THREE.Group | null>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const annotateModeRef = useRef(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [wireframe, setWireframe] = useState(false);
    const [autoRotate, setAutoRotate] = useState(false);
    const [showAnnotations, setShowAnnotations] = useState(true);
    const [annotateMode, setAnnotateMode] = useState(false);
    const [annotations, setAnnotations] = useState<ScanAnnotation[]>([]);
    const [annotationError, setAnnotationError] = useState("");
    const [pendingPoint, setPendingPoint] = useState<THREE.Vector3 | null>(null);
    const [annotationTitle, setAnnotationTitle] = useState("");
    const [annotationTooth, setAnnotationTooth] = useState("");
    const [annotationRegion, setAnnotationRegion] = useState("");
    const [annotationNote, setAnnotationNote] = useState("");
    const [annotationSeverity, setAnnotationSeverity] = useState<AnnotationSeverity>("info");
    const [savingAnnotation, setSavingAnnotation] = useState(false);
    useEffect(() => {
        annotateModeRef.current = annotateMode;
        if (controlsRef.current) {
            controlsRef.current.enableRotate = !annotateMode;
            controlsRef.current.enablePan = !annotateMode;
        }
    }, [annotateMode]);
    useEffect(() => {
        if (materialRef.current) {
            materialRef.current.wireframe = wireframe;
            materialRef.current.needsUpdate = true;
        }
    }, [wireframe]);
    useEffect(() => {
        if (controlsRef.current) {
            controlsRef.current.autoRotate = autoRotate;
            controlsRef.current.autoRotateSpeed = 1.8;
        }
    }, [autoRotate]);
    useEffect(() => {
        let active = true;
        async function loadAnnotations() {
            const { data, error: queryError } = await supabase
                .from("scan_annotations")
                .select("id,scan_id,tooth_code,region_label,title,note,severity,position_x,position_y,position_z,demo_mode,created_by,created_at")
                .eq("scan_id", scanId)
                .order("created_at", { ascending: true });
            if (!active)
                return;
            if (queryError) {
                setAnnotationError(queryError.message);
                return;
            }
            setAnnotationError("");
            setAnnotations((data ?? []) as ScanAnnotation[]);
        }
        void loadAnnotations();
        const channel = supabase
            .channel(`scan-annotations-${scanId}`)
            .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "scan_annotations",
            filter: `scan_id=eq.${scanId}`,
        }, () => {
            void loadAnnotations();
        })
            .subscribe();
        return () => {
            active = false;
            void supabase.removeChannel(channel);
        };
    }, [scanId]);
    useEffect(() => {
        const group = markerGroupRef.current;
        if (!group)
            return;
        for (const child of [...group.children]) {
            group.remove(child);
            const mesh = child as THREE.Mesh;
            mesh.geometry?.dispose?.();
            const material = mesh.material;
            if (Array.isArray(material)) {
                material.forEach((item) => item.dispose());
            }
            else {
                material?.dispose?.();
            }
        }
        group.visible = showAnnotations;
        if (!showAnnotations)
            return;
        for (const annotation of annotations) {
            const color = annotation.severity === "attention"
                ? 0xff667a
                : annotation.severity === "watch"
                    ? 0xf6cf67
                    : 0x6de2cf;
            const marker = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 18), new THREE.MeshStandardMaterial({
                color,
                emissive: color,
                emissiveIntensity: 0.32,
                roughness: 0.34,
                metalness: 0.08,
            }));
            marker.position.set(Number(annotation.position_x), Number(annotation.position_y), Number(annotation.position_z));
            marker.userData.annotationId = annotation.id;
            group.add(marker);
        }
    }, [annotations, showAnnotations]);
    useEffect(() => {
        const container = containerRef.current;
        if (!container)
            return;
        const containerElement: HTMLDivElement = container;
        let cancelled = false;
        let frameId = 0;
        let renderer: THREE.WebGLRenderer | null = null;
        let geometry: THREE.BufferGeometry | null = null;
        let material: THREE.MeshStandardMaterial | null = null;
        let controls: OrbitControls | null = null;
        let resizeObserver: ResizeObserver | null = null;
        let pointerHandler: ((event: PointerEvent) => void) | null = null;
        let visibilityHandler: (() => void) | null = null;
        async function getModelBytes() {
            if (bucket === "public-demo") {
                const response = await fetch(path);
                if (!response.ok) {
                    throw new Error(`Demo model yüklenemedi (${response.status}).`);
                }
                return response.arrayBuffer();
            }
            if (!bucket) {
                throw new Error("Tarama dosyası için Storage bucket tanımlı değil.");
            }
            const { data, error: downloadError } = await supabase.storage
                .from(bucket)
                .download(path.replace(/^\/+/, ""));
            if (downloadError)
                throw downloadError;
            return data.arrayBuffer();
        }
        function parseGeometry(buffer: ArrayBuffer) {
            const lower = path.toLowerCase();
            if (lower.endsWith(".ply")) {
                return new PLYLoader().parse(buffer);
            }
            if (lower.endsWith(".stl")) {
                return new STLLoader().parse(buffer);
            }
            throw new Error("3D viewer şu anda STL ve PLY dosyalarını destekliyor.");
        }
        async function initialize() {
            try {
                setLoading(true);
                setError("");
                const arrayBuffer = await getModelBytes();
                if (cancelled)
                    return;
                geometry = parseGeometry(arrayBuffer);
                geometry.computeVertexNormals();
                geometry.center();
                geometry.computeBoundingSphere();
                const radius = geometry.boundingSphere?.radius || 50;
                const scene = new THREE.Scene();
                scene.background = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue("--dy-bg").trim() || "#07111d");
                const camera = new THREE.PerspectiveCamera(42, 1, Math.max(radius / 100, 0.01), Math.max(radius * 100, 1000));
                renderer = new THREE.WebGLRenderer({
                    antialias: true,
                    alpha: false,
                });
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
                renderer.outputColorSpace = THREE.SRGBColorSpace;
                renderer.toneMapping = THREE.ACESFilmicToneMapping;
                renderer.toneMappingExposure = 1.1;
                containerElement.innerHTML = "";
                containerElement.appendChild(renderer.domElement);
                material = new THREE.MeshStandardMaterial({
                    color: 0xe8f4f1,
                    roughness: 0.64,
                    metalness: 0.04,
                    side: THREE.DoubleSide,
                });
                materialRef.current = material;
                material.wireframe = wireframe;
                const mesh = new THREE.Mesh(geometry, material);
                meshRef.current = mesh;
                scene.add(mesh);
                const markerGroup = new THREE.Group();
                markerGroupRef.current = markerGroup;
                scene.add(markerGroup);
                const hemi = new THREE.HemisphereLight(0xffffff, 0x132334, 2.7);
                scene.add(hemi);
                const key = new THREE.DirectionalLight(0xffffff, 3.6);
                key.position.set(4, 6, 5);
                scene.add(key);
                const rim = new THREE.DirectionalLight(new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue("--dy-accent").trim() || "#6de2cf"), 2.1);
                rim.position.set(-4, 2, -5);
                scene.add(rim);
                const fill = new THREE.DirectionalLight(0x9bb7ff, 1.2);
                fill.position.set(0, -4, 2);
                scene.add(fill);
                const grid = new THREE.GridHelper(radius * 5, 24, new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue("--dy-border").trim() || "#285465"), new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue("--dy-surface2").trim() || "#142936"));
                grid.position.y = -radius * 1.2;
                scene.add(grid);
                camera.position.set(radius * 1.9, radius * 1.25, radius * 1.9);
                controls = new OrbitControls(camera, renderer.domElement);
                controls.enableDamping = true;
                controls.dampingFactor = 0.08;
                controls.enablePan = true;
                controls.enableZoom = true;
                controls.autoRotate = autoRotate;
                controls.autoRotateSpeed = 1.8;
                controls.target.set(0, 0, 0);
                controls.update();
                controlsRef.current = controls;
                const raycaster = new THREE.Raycaster();
                const pointer = new THREE.Vector2();
                pointerHandler = (event: PointerEvent) => {
                    if (!annotateModeRef.current || !renderer || !meshRef.current)
                        return;
                    const rect = renderer.domElement.getBoundingClientRect();
                    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
                    raycaster.setFromCamera(pointer, camera);
                    const hit = raycaster.intersectObject(meshRef.current, false)[0];
                    if (!hit)
                        return;
                    const localPoint = meshRef.current.worldToLocal(hit.point.clone());
                    setPendingPoint(localPoint);
                    setAnnotationTitle("");
                    setAnnotationTooth("");
                    setAnnotationRegion("");
                    setAnnotationNote("");
                    setAnnotationSeverity("info");
                    setAnnotateMode(false);
                };
                renderer.domElement.addEventListener("pointerdown", pointerHandler);
                function resize() {
                    if (!renderer)
                        return;
                    const width = containerElement.clientWidth || 900;
                    const height = containerElement.clientHeight || 580;
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
                (renderer.domElement as HTMLCanvasElement).dataset.themeListener = "active";
                window.addEventListener("dentaya-theme-change", handleThemeChange);
                (renderer as THREE.WebGLRenderer & {
                    __dentayaThemeCleanup?: () => void;
                }).__dentayaThemeCleanup = () => window.removeEventListener("dentaya-theme-change", handleThemeChange);
                animate();
                setLoading(false);
            }
            catch (err) {
                devError(err);
                setError(err instanceof Error ? err.message : "3D tarama modeli açılamadı.");
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
            if (renderer && pointerHandler) {
                renderer.domElement.removeEventListener("pointerdown", pointerHandler);
            }
            controls?.dispose();
            geometry?.dispose();
            material?.dispose();
            controlsRef.current = null;
            materialRef.current = null;
            meshRef.current = null;
            markerGroupRef.current = null;
            if (renderer) {
                (renderer as THREE.WebGLRenderer & {
                    __dentayaThemeCleanup?: () => void;
                }).__dentayaThemeCleanup?.();
                renderer.dispose();
                renderer.forceContextLoss();
                const canvas = renderer.domElement;
                if (canvas.parentNode) {
                    canvas.parentNode.removeChild(canvas);
                }
            }
        };
        // Scene recreation is keyed to the model location; controls are synchronized without rebuilding WebGL.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bucket, path]);
    async function saveAnnotation() {
        if (!pendingPoint || !annotationTitle.trim())
            return;
        setSavingAnnotation(true);
        setAnnotationError("");
        try {
            const { data: authData } = await supabase.auth.getUser();
            const user = authData.user;
            if (!user) {
                throw new Error("Oturum bulunamadı.");
            }
            const { error: insertError } = await supabase
                .from("scan_annotations")
                .insert({
                scan_id: scanId,
                tooth_code: annotationTooth.trim() || null,
                region_label: annotationRegion.trim() || null,
                title: annotationTitle.trim(),
                note: annotationNote.trim() || null,
                severity: annotationSeverity,
                position_x: Number(pendingPoint.x.toFixed(4)),
                position_y: Number(pendingPoint.y.toFixed(4)),
                position_z: Number(pendingPoint.z.toFixed(4)),
                demo_mode: demoMode,
                created_by: user.id,
            });
            if (insertError)
                throw insertError;
            setPendingPoint(null);
            setAnnotationTitle("");
            setAnnotationTooth("");
            setAnnotationRegion("");
            setAnnotationNote("");
            setAnnotationSeverity("info");
        }
        catch (err) {
            setAnnotationError(err instanceof Error ? err.message : "Tarama notu kaydedilemedi.");
        }
        finally {
            setSavingAnnotation(false);
        }
    }
    async function deleteAnnotation(id: string) {
        const { error: deleteError } = await supabase
            .from("scan_annotations")
            .delete()
            .eq("id", id);
        if (deleteError) {
            setAnnotationError(deleteError.message);
        }
    }
    return (<UiNode as="div" style={overlay}>
      <style>{`
        @media(max-width:900px){
          .scan-model-modal{
            width:100vw!important;
            height:100vh!important;
            max-height:none!important;
            border-radius:0!important;
          }
          .scan-model-header{
            align-items:flex-start!important;
            flex-direction:column!important;
          }
          .scan-model-body{
            grid-template-columns:1fr!important;
            overflow-y:auto!important;
          }
          .scan-model-notes{
            border-left:0!important;
            border-top:1px solid var(--dy-border,#29465d)!important;
            max-height:42vh!important;
          }
          .scan-model-footer{
            flex-direction:column!important;
            align-items:flex-start!important;
          }
        }
      `}</style>
      <UiNode as="section" className="scan-model-modal" style={modal}>
        <UiNode as="header" className="scan-model-header" style={header}>
          <UiNode as="div">
            <UiNode as="p" style={eyebrow}>DENTAYA 3D TARAMA GÖRÜNTÜLEYİCİ</UiNode>
            <UiNode as="h2" style={title}><UserText>{scanRef}</UserText></UiNode>
            <UiNode as="p" style={muted}>
              <UserText>{fileName}</UserText> · Sol tık döndür · Tekerlek yakınlaştır · Sağ tık taşı
            </UiNode>
          </UiNode>

          <UiNode as="div" style={headerActions}>
            <UiNode as="button" type="button" style={toolButton} onClick={() => setWireframe((value) => !value)}>
              {wireframe ? "Katı" : uiText("Tel Kafes")}
            </UiNode>

            <UiNode as="button" type="button" style={toolButton} onClick={() => setAutoRotate((value) => !value)}>
              {autoRotate ? "Dönüşü Durdur" : "Otomatik Döndür"}
            </UiNode>

            <UiNode as="button" type="button" style={showAnnotations ? activeButton : toolButton} onClick={() => setShowAnnotations((value) => !value)}>
              {showAnnotations ? "İşaretler Açık" : "İşaretleri Göster"}
            </UiNode>

            <UiNode as="button" type="button" style={annotateMode ? annotateButtonActive : toolButton} onClick={() => {
            setPendingPoint(null);
            setAnnotateMode((value) => !value);
        }}>
              {annotateMode ? "Yüzeye Tıkla…" : "+ Yüzey Notu"}
            </UiNode>

            <UiNode as="button" type="button" onClick={onClose} style={closeButton}>
              ✕ Kapat
            </UiNode>
          </UiNode>
        </UiNode>

        <UiNode as="div" className="scan-model-body" style={bodyGrid}>
          <UiNode as="div" style={viewerShell}>
            <UiNode as="div" ref={containerRef} style={viewer}/>

            {loading && (<UiNode as="div" style={loadingLayer}>
                <LoadingExperience compact title="3D tarama hazırlanıyor…"/>
              </UiNode>)}

            {error && (<UiNode data-dy-copy-stack as="div" style={errorLayer}>
                <UiNode as="strong">Model açılamadı</UiNode>
                <UiNode as="p">{error}</UiNode>
              </UiNode>)}

            {annotateMode && !loading && !error && (<UiNode as="div" style={annotationModeBadge}>
                ● İşaret modu · Not eklemek istediğin yüzeye tıkla
              </UiNode>)}

            <UiNode as="div" style={badge}>
              {demoMode ? "● SENTETİK 3D ÖNİZLEME" : "● YETKİLİ TARAMA"}
            </UiNode>
          </UiNode>

          <UiNode as="aside" className="scan-model-notes" style={annotationPanel}>
            <UiNode as="div">
              <UiNode as="p" style={eyebrow}>YÜZEY NOTLARI</UiNode>
              <UiNode as="h3" style={panelTitle}>Tarama İşaretleri</UiNode>
              <UiNode as="p" style={panelText}>
                İşaretler üretim/inceleme iletişimi için yüzey referansıdır. Klinik tanı değildir.
              </UiNode>
            </UiNode>

            {annotationError && <UiNode as="div" style={annotationErrorBox}>{annotationError}</UiNode>}

            {pendingPoint && (<UiNode as="div" style={annotationForm}>
                <UiNode as="strong">Yeni yüzey notu</UiNode>
                <UiNode as="small" style={muted}>
                  X {pendingPoint.x.toFixed(2)} · Y {pendingPoint.y.toFixed(2)} · Z {pendingPoint.z.toFixed(2)}
                </UiNode>

                <UiNode as="input" value={annotationTitle} onChange={(event) => setAnnotationTitle(event.target.value)} placeholder="Başlık · örn. Marjin kontrolü" style={input}/>

                <UiNode as="div" style={twoCols}>
                  <UiNode as="input" value={annotationTooth} onChange={(event) => setAnnotationTooth(event.target.value)} placeholder="Diş · 16" style={input}/>
                  <UiNode as="input" value={annotationRegion} onChange={(event) => setAnnotationRegion(event.target.value)} placeholder="Bölge" style={input}/>
                </UiNode>

                <UiNode as="select" value={annotationSeverity} onChange={(event) => setAnnotationSeverity(event.target.value as AnnotationSeverity)} style={input}>
                  <UiNode as="option" value="info">Bilgi</UiNode>
                  <UiNode as="option" value="watch">İzlem</UiNode>
                  <UiNode as="option" value="attention">Dikkat</UiNode>
                </UiNode>

                <UiNode as="textarea" value={annotationNote} onChange={(event) => setAnnotationNote(event.target.value)} placeholder={uiText("Açıklama")} rows={3} style={{ ...input, resize: "vertical", paddingTop: 9 }}/>

                <UiNode as="div" style={formActions}>
                  <UiNode as="button" type="button" style={saveButton} onClick={() => void saveAnnotation()} disabled={savingAnnotation || !annotationTitle.trim()}>
                    {savingAnnotation ? uiText("Kaydediliyor…") : "Notu Kaydet"}
                  </UiNode>
                  <UiNode as="button" type="button" style={toolButton} onClick={() => setPendingPoint(null)}>
                    Vazgeç
                  </UiNode>
                </UiNode>
              </UiNode>)}

            <UiNode as="div" style={annotationList}>
              {annotations.map((annotation) => (<UiNode as="article" key={annotation.id} style={annotationCard}>
                  <UiNode as="div" style={annotationCardTop}>
                    <UiNode as="span" style={severityPill(annotation.severity)}>
                      {severityLabel(annotation.severity)}
                    </UiNode>
                    <UiNode as="button" type="button" onClick={() => void deleteAnnotation(annotation.id)} style={deleteButton} title="Yetkin varsa notu sil">
                      ×
                    </UiNode>
                  </UiNode>
                  <UiNode as="strong"><UserText>{annotation.title}</UserText></UiNode>
                  <UiNode as="div" style={annotationMeta}>
                    {[annotation.tooth_code && `Diş ${annotation.tooth_code}`, annotation.region_label]
                .filter(Boolean)
                .join(" · ") || "Genel yüzey notu"}
                  </UiNode>
                  {annotation.note && <UiNode as="p" style={annotationNoteStyle}>{annotation.note}</UiNode>}
                </UiNode>))}

              {!annotations.length && !pendingPoint && (<UiNode as="div" style={emptyAnnotations}>
                  Henüz yüzey notu yok. “+ Yüzey Notu” ile model üzerinde bir nokta seçebilirsin.
                </UiNode>)}
            </UiNode>
          </UiNode>
        </UiNode>

        <UiNode as="footer" className="scan-model-footer" style={footer}>
          <UiNode as="span">DentAYA Dental Twin · STL / PLY Görüntüleyici + Yüzey Notları</UiNode>
          <UiNode as="span" style={muted}>
            {demoMode
            ? "Demo model ve demo işaretler klinik veri değildir."
            : "Hasta/kurum yetkisi ile görüntülenir."}
          </UiNode>
        </UiNode>
      </UiNode>
    </UiNode>);
}
function severityLabel(value: AnnotationSeverity) {
    if (value === "attention")
        return "Dikkat";
    if (value === "watch")
        return "İzlem";
    return "Bilgi";
}
function severityPill(value: AnnotationSeverity): CSSProperties {
    const color = value === "attention" ? "#ff9baa" : value === "watch" ? "#f1d680" : dy.accent;
    return {
        border: `1px solid ${color}`,
        color,
        background: "rgba(255,255,255,.03)",
        borderRadius: 999,
        padding: "3px 7px",
        fontSize: 13,
        fontWeight: 850,
        letterSpacing: ".06em",
    };
}
const overlay: CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background: "rgba(2,7,12,.90)",
    backdropFilter: "blur(10px)",
    display: "grid",
    placeItems: "center",
    padding: 18,
};
const modal: CSSProperties = {
    width: "min(1420px,98vw)",
    height: "min(900px,96vh)",
    background: dy.bg,
    color: dy.text,
    border: `1px solid ${dy.border}`,
    borderRadius: 24,
    boxShadow: "0 35px 120px rgba(0,0,0,.70)",
    overflow: "hidden",
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
};
const header: CSSProperties = {
    padding: "16px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    borderBottom: `1px solid ${dy.border}`,
};
const headerActions: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 8,
};
const eyebrow: CSSProperties = {
    color: dy.accent,
    fontSize: 13,
    fontWeight: 850,
    letterSpacing: ".16em",
    margin: "0 0 6px",
};
const title: CSSProperties = {
    margin: 0,
    fontSize: 23,
};
const muted: CSSProperties = {
    color: dy.muted,
};
const toolButton: CSSProperties = {
    minHeight: 38,
    borderRadius: 11,
    border: `1px solid ${dy.border}`,
    background: dy.surface2,
    color: dy.text,
    padding: "0 11px",
    cursor: "pointer",
    fontWeight: 750,
};
const activeButton: CSSProperties = {
    ...toolButton,
    background: dy.accentSoft,
    color: dy.accent,
    borderColor: dy.accent,
};
const annotateButtonActive: CSSProperties = {
    ...toolButton,
    background: "rgba(246,207,103,.12)",
    color: "#f6cf67",
    borderColor: "#f6cf67",
};
const closeButton: CSSProperties = {
    ...toolButton,
    background: "rgba(239,91,109,.12)",
    color: "#ff9baa",
};
const bodyGrid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) 330px",
    minHeight: 0,
};
const viewerShell: CSSProperties = {
    position: "relative",
    minHeight: 0,
    background: dy.bg,
};
const viewer: CSSProperties = {
    width: "100%",
    height: "100%",
    minHeight: 420,
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
    textAlign: "center",
    padding: 30,
    background: "rgba(20,8,12,.88)",
    color: "#ffc8cf",
};
const badge: CSSProperties = {
    position: "absolute",
    left: 14,
    bottom: 14,
    padding: "6px 9px",
    borderRadius: 999,
    background: dy.surface,
    border: `1px solid ${dy.border}`,
    color: dy.accent,
    fontSize: 13,
    fontWeight: 850,
    letterSpacing: ".08em",
};
const annotationModeBadge: CSSProperties = {
    position: "absolute",
    top: 14,
    left: "50%",
    transform: "translateX(-50%)",
    padding: "8px 11px",
    borderRadius: 999,
    background: "rgba(31,26,10,.92)",
    border: "1px solid #f6cf67",
    color: "#f6cf67",
    fontSize: 13,
    fontWeight: 850,
    pointerEvents: "none",
};
const annotationPanel: CSSProperties = {
    minHeight: 0,
    overflowY: "auto",
    borderLeft: `1px solid ${dy.border}`,
    background: dy.surface,
    padding: 14,
    display: "grid",
    alignContent: "start",
    gap: 12,
};
const panelTitle: CSSProperties = {
    margin: 0,
    fontSize: 18,
};
const panelText: CSSProperties = {
    margin: "7px 0 0",
    color: dy.muted,
    fontSize: 13,
    lineHeight: 1.5,
};
const annotationErrorBox: CSSProperties = {
    padding: 9,
    borderRadius: 10,
    border: "1px solid rgba(255,102,122,.35)",
    background: "rgba(255,102,122,.08)",
    color: "#ffb3bf",
    fontSize: 13,
};
const annotationForm: CSSProperties = {
    display: "grid",
    gap: 8,
    padding: 11,
    borderRadius: 14,
    border: `1px solid ${dy.accent}`,
    background: dy.surface2,
};
const input: CSSProperties = {
    width: "100%",
    minHeight: 36,
    borderRadius: 9,
    border: `1px solid ${dy.border}`,
    background: dy.input,
    color: dy.text,
    padding: "0 9px",
    outline: "none",
};
const twoCols: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 7,
};
const formActions: CSSProperties = {
    display: "flex",
    gap: 7,
    flexWrap: "wrap",
};
const saveButton: CSSProperties = {
    ...toolButton,
    background: dy.accent,
    color: "#061316",
    borderColor: dy.accent,
};
const annotationList: CSSProperties = {
    display: "grid",
    gap: 8,
};
const annotationCard: CSSProperties = {
    display: "grid",
    gap: 6,
    padding: 10,
    borderRadius: 12,
    border: `1px solid ${dy.border}`,
    background: dy.surface2,
};
const annotationCardTop: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
};
const deleteButton: CSSProperties = {
    width: 26,
    height: 26,
    borderRadius: 8,
    border: `1px solid ${dy.border}`,
    background: "transparent",
    color: dy.muted,
    cursor: "pointer",
};
const annotationMeta: CSSProperties = {
    color: dy.muted,
    fontSize: 13,
};
const annotationNoteStyle: CSSProperties = {
    margin: 0,
    color: dy.muted,
    fontSize: 13,
    lineHeight: 1.45,
};
const emptyAnnotations: CSSProperties = {
    padding: 14,
    borderRadius: 12,
    border: `1px dashed ${dy.border}`,
    color: dy.muted,
    fontSize: 13,
    lineHeight: 1.5,
};
const footer: CSSProperties = {
    padding: "10px 16px",
    display: "flex",
    justifyContent: "space-between",
    gap: 15,
    borderTop: `1px solid ${dy.border}`,
    fontSize: 13,
};
