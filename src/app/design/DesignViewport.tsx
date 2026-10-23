"use client";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import {readProjectCadForms,decodeCadLibraryForm,cadLibraryGeometryForRestoration,type CadLibraryForm} from '@/lib/cad-form-library';
import {currentIntlLocale} from '@/lib/i18n';
import UiNode from "@/lib/i18n/UiNode";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, } from "react";
import {cadRoleColor,type CadColorSettings} from '@/lib/cad-color-groups';
import { toothSurface, useToothAppearance } from '@/lib/tooth-appearance';
import {cadRestorationSurface} from '@/lib/cad-restoration-surface';
import {cadSectionContours,type CadSectionInspection} from '@/lib/cad-section-engine';
import { useCadWorkspace } from '@/lib/cad-workspace-preferences';
import { experienceDuration } from '@/lib/experience-preferences';
import { createCameraMotion, sampleCameraMotion } from '@/lib/cad-camera-motion';
import {normalizeCadInspection, cadSectionPlane, createCadNormalLines, cadCameraQuarterTurn, cadInspectionGeometryFingerprint, type CadInspectionSettings} from '@/lib/cad-inspection';
import { playExperienceCue } from '@/lib/experience-audio';
import * as THREE from "three";
import {workingJaw,oppositeJaw,cadScanColor,jawOpening,antagonistAutoHidden,unitDisplayState,EMPTY_CAD_SCENE,type CadSceneState} from '@/lib/cad-view-state';
import { applyMeshDisplay, layerState, visibleCadTarget, isContextClick } from "@/lib/cad-display";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { devError } from "@/lib/dev-log";
import { supabase } from "@/lib/supabase";
import { dy } from "@/app/dentaya-theme";
import { buildMeshSpatialIndex, projectPointToSpatialSurface, type CadSpatialIndex, } from "@/lib/cad-spatial-engine";
import { marginQualityReport, offsetMarginAlongSurfaceNormals, projectMarginToSurface, smoothProjectedMargin, } from "@/lib/cad-margin-engine";
import { applyInternalFitRelief } from "@/lib/cad-internal-fit-engine";
import { analyzeUndercut, createUndercutBlockoutGeometry, } from "@/lib/cad-undercut-engine";
import { analyzeMeshContact, buildContactColors, } from "@/lib/cad-contact-engine";
import { connectorQuality, createConnectorMesh, type CadConnector, } from "@/lib/cad-connector-engine";
import { analyzeCadMesh, type CadMeshQcReport, } from "@/lib/cad-mesh-qc";
import { applyBrush } from "@/lib/cad-sculpt-brush";
import { buildCrownShell, type CrownShellReport, } from "@/lib/cad-crown-shell-engine";
import { repairCadMesh, type MeshRepairResult, } from "@/lib/cad-mesh-repair-engine";
import {captureCadGeometry,restoreCadGeometry,decodeCadWorkspace,validateCadWorkspace,type CadWorkspaceRecord,type CadWorkspaceSnapshot,type CadUnitGeometryState} from '@/lib/cad-project-state';
import {cadMarginCenter,placeCadCrownOnMargin} from '@/lib/cad-margin-placement';
import {cadCervicalBaseZ,cadCervicalRegistration,cadRestorationTransform} from '@/lib/cad-restoration-transform';
import {CAD_DEFAULT_ANATOMY_VERSION,cadRestorationCacheAction} from '@/lib/cad-restoration-version';
import {sizeCadRestorationAboveSource} from '@/lib/cad-preparation-envelope';
import {createRestorationGeometry} from "@/lib/cad-restoration-shape";
import { activeCadUnit, type CadJobSetup, } from "@/lib/cad-job-setup";
export type CadTool = "orbit" | "margin" | "measure" | "add" | "reduce" | "smooth" | "flatten" | "connector";
export type CadViewMode = "natural" | "thickness" | "contact" | "undercut" | "wireframe" | "section";
export type CadPoint = {
    x: number;
    y: number;
    z: number;
};
export type CadMeasurement = {
    a: CadPoint;
    b: CadPoint;
    distance: number;
};
export type CadSettings = CadColorSettings & Partial<CadInspectionSettings> & {
    auto_hide_antagonist?:boolean;jaw_opening_mm?:number;layer_opacity_memory?:Partial<Record<'upper'|'lower'|'scan'|'design',number>>;unit_visibility?:Record<string,{visible?:boolean;opacity?:number}>;
    cad_library_assets?:Record<string,CadLibraryForm>;
    cad_workspace?: CadWorkspaceRecord;
    unit_margins?: Record<string,CadPoint[]>;
    source_margins?: Record<string,Record<string,CadPoint[]>>;
    unit_workflow?: Record<string,{stage:string;task:string}>;
    unit_parameters?: Record<string,Partial<CadSettings>>;
    job_setup: CadJobSetup;
    guided_task?: string;
    cement_gap_mm: number;
    margin_offset_mm: number;
    occlusal_offset_mm: number;
    proximal_contact_mm: number;
    minimum_thickness_mm: number;
    smoothing: number;
    opacity: number;
    reference_upper_key?: string;
    reference_lower_key?: string;
    show_upper?: boolean;
    show_lower?: boolean;
    upper_opacity?: number;
    lower_opacity?: number;
    scan_opacity?: number;
    show_annotations?: boolean;
    show_connectors?: boolean;
    brush_radius_mm: number;
    brush_strength_mm: number;
    brush_shape: "round" | "pointed" | "flat";
    brush_hardness: number;
    brush_falloff: number;
    symmetry_enabled: boolean;
    symmetry_axis: "x" | "y";
    symmetry_offset_mm: number;
    preserve_shape: boolean;
    hold_cusp_tips: boolean;
    hold_equator: boolean;
    occlusal_only: boolean;
    show_scan: boolean;
    show_design: boolean;
    morphology_scale: number;
    cusp_height: number;
    design_tx_mm: number;
    design_ty_mm: number;
    design_tz_mm: number;
    rotation_z_deg: number;
    insertion_axis_x: number;
    insertion_axis_y: number;
    insertion_axis_z: number;
    section_offset_mm: number;
    section_axis?: "insertion" | "x" | "y" | "z";
    section_inverted?: boolean;
    section_centered?: boolean;
    margin_smoothing: number;
    margin_projection_strength: number;
    margin_zone_gap_mm: number;
    axial_gap_mm: number;
    radial_gap_mm: number;
    gap_transition_mm: number;
    milling_compensation_mm: number;
    internal_fit_strength: number;
    blockout_depth_mm: number;
    connector_diameter_mm: number;
    connector_shape: "round" | "oval";
    connector_min_area_mm2: number;
    connector_min_width_mm: number;
    connector_min_height_mm: number;
    shell_wall_thickness_mm: number;
    shell_cervical_cut_ratio: number;
    shell_fit_blend: number;
    shell_preview_opacity: number;
    shell_weld_tolerance_mm: number;
    connectors: CadConnector[];
};
export type ModelSource = {
    bucket: string | null;
    path: string;
    fileName: string;
    isDemo?: boolean;
    arch?: string;
};
export type CadHistoryState = {
    undoCount: number;
    redoCount: number;
    lastAction: string | null;
};
export type CadPerformanceInfo = {
    sourceTriangles: number;
    renderTriangles: number;
    kernelTriangles: number;
    adaptive: boolean;
};
type CadGeometryHistoryEntry = {
    positions: Float32Array;
    label: string;
    at: number;
};
export type CadKernelReport = {
    mesh: CadMeshQcReport | null;
    contact: ReturnType<typeof analyzeMeshContact> | null;
    undercut: ReturnType<typeof analyzeUndercut> | null;
    margin: ReturnType<typeof marginQualityReport> | null;
    connectorCount: number;
    connectorWarnings: string[];
    crownShell: CrownShellReport | null;
};
export type CadCameraBookmark = {
    position: [
        number,
        number,
        number
    ];
    target: [
        number,
        number,
        number
    ];
};
export type DesignViewportHandle = {
    captureWorkspace: () => CadWorkspaceSnapshot | null;
    restoreWorkspace: (snapshot:CadWorkspaceSnapshot, settingsOverride?:CadSettings) => boolean;
    placeOnMargin: () => boolean;
    hasMarginPlacement: () => boolean;
    captureCamera: () => CadCameraBookmark | null;
    restoreCamera: (value: CadCameraBookmark) => void;
    captureImage: () => Promise<Blob | null>;
    exportStl: () => Blob | null;
    undo: () => boolean;
    redo: () => boolean;
    fit: () => void;
    focusRestoration: () => boolean;
    rotateView: (direction: 'left' | 'right') => void;
    resetDesign: () => void;
    setInsertionFromView: () => CadPoint | null;
    smoothMargin: () => CadPoint[];
    projectMargin: () => CadPoint[];
    offsetMargin: (amountMm: number) => CadPoint[];
    applyInternalFit: () => ReturnType<typeof applyInternalFitRelief> | null;
    toggleBlockoutPreview: () => boolean;
    runKernelQc: () => CadKernelReport;
    buildCrownShell: () => CrownShellReport | null;
    clearCrownShell: () => void;
    repairCrownShell: () => MeshRepairResult | null;
    clearConnectors: () => void;
    removeLastMarginPoint: () => void;
    removeLastMeasurement: () => void;
    removeLastConnector: () => void;
    cancelPendingAction: () => void;
    captureRecoveryGeometry: () => Float32Array | null;
    restoreRecoveryGeometry: (positions: Float32Array | number[]) => boolean;
    getHistoryState: () => CadHistoryState;
    viewOcclusion:()=>void;
    setView: (view: "iso" | "top" | "bottom" | "front" | "back" | "left" | "right") => void;
};
function readThemeColor(variable: string, fallback: string) {
    if (typeof window === "undefined") {
        return fallback;
    }
    const value = getComputedStyle(document.querySelector(".cad-page") ?? document.documentElement)
        .getPropertyValue(variable)
        .trim();
    return value || fallback;
}
type Props = {
    projectId?: string;
    source: ModelSource | null;
    referenceSources?: {
        upper: ModelSource | null;
        lower: ModelSource | null;
    };
    onContextMenuRequest?: (point: {
        x: number;
        y: number;
    }) => void;
    toothCodes?: string[];
    settings: CadSettings;
    tool: CadTool;
    viewMode: CadViewMode;
    marginPoints: CadPoint[];
    measurements: CadMeasurement[];
    onMarginPointsChange: (points: CadPoint[]) => void;
    onMeasurementsChange: (values: CadMeasurement[]) => void;
    onInsertionAxisChange?: (axis: CadPoint) => void;
    onConnectorsChange?: (connectors: CadConnector[]) => void;
    onBrushRadiusChange?: (radiusMm: number) => void;
    onBrushStrengthChange?: (strengthMm: number) => void;
    onGeometryCommit?: (label: string) => void;
    onReadyChange?: (ready: boolean) => void;
    onHistoryChange?: (state: CadHistoryState) => void;
    onPerformanceInfo?: (info: CadPerformanceInfo) => void;
    onSceneStateChange?: (state:CadSceneState)=>void;
    onSectionInspectionChange?: (state:CadSectionInspection|null)=>void;
    onStatus?: (message: string) => void;
};
const DesignViewport = forwardRef<DesignViewportHandle, Props>(function DesignViewport({ projectId, source, referenceSources, onContextMenuRequest, toothCodes = [], settings, tool, viewMode, marginPoints, measurements, onMarginPointsChange, onMeasurementsChange, onInsertionAxisChange, onConnectorsChange, onBrushRadiusChange, onBrushStrengthChange, onGeometryCommit, onReadyChange, onHistoryChange, onPerformanceInfo, onSceneStateChange, onSectionInspectionChange, onStatus }, ref) {
    const toothAppearance = useToothAppearance();
    const toothAppearanceRef = useRef(toothAppearance);
    useEffect(() => { toothAppearanceRef.current = toothAppearance; applyViewMode();
        // Three.js materials read the latest refs; only appearance changes trigger this effect.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toothAppearance]);
    const workspacePreferences = useCadWorkspace();
    const workspacePreferencesRef = useRef(workspacePreferences);
    const gridRef = useRef<THREE.GridHelper | null>(null), axesRef = useRef<THREE.AxesHelper | null>(null);
    useEffect(() => { workspacePreferencesRef.current = workspacePreferences; applyWorkspaceDisplay(); applyViewMode();
        // Imperative scene helpers consume refs and must not restart on every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspacePreferences]);
    function applyWorkspaceDisplay() {
        const p = workspacePreferencesRef.current;
        if (gridRef.current)
            gridRef.current.visible = p.grid;
        if (axesRef.current)
            axesRef.current.visible = p.axes;
        if (controlsRef.current) {
            controlsRef.current.rotateSpeed = p.rotateSpeed;
            controlsRef.current.zoomSpeed = p.zoomSpeed;
            controlsRef.current.panSpeed = p.panSpeed;
            controlsRef.current.enableDamping = p.damping;
        }
        if (sceneRef.current)
            sceneRef.current.background = new THREE.Color(p.background === 'theme' ? readThemeColor('--dy-bg', '#081019') : { studio: '#483b62', graphite: '#202226', slate: '#253346', paper: '#e8e9e6' }[p.background]);
    }
    const referenceIndexesRef=useRef<Partial<Record<'upper'|'lower',CadSpatialIndex>>>({});
    const frozenUnitsRef=useRef(new Map<string,{mesh:THREE.Mesh;record:CadUnitGeometryState}>());
    const peekAllRef=useRef(false),sceneStateKeyRef=useRef(''),sceneCallbackRef=useRef(onSceneStateChange);
    useEffect(()=>{sceneCallbackRef.current=onSceneStateChange;},[onSceneStateChange]);
    const contactColorsRef=useRef<{key:string;index:CadSpatialIndex;colors:Float32Array}|null>(null);
    const referenceMeshesRef = useRef<Partial<Record<'upper' | 'lower', THREE.Mesh>>>({});
    const sourceCenterRef = useRef(new THREE.Vector3());
    const sourceArchRef = useRef<string | undefined>(undefined);
    const referencesRef = useRef(referenceSources);
    const referenceSequenceRef = useRef(0);
    const contextCallbackRef = useRef(onContextMenuRequest);
    const readyCallbackRef = useRef(onReadyChange);
    useEffect(() => { readyCallbackRef.current = onReadyChange; }, [onReadyChange]);
    useEffect(() => { contextCallbackRef.current = onContextMenuRequest; }, [onContextMenuRequest]);
    useEffect(() => {
        referencesRef.current = referenceSources;
        const sequence = referenceSequenceRef;
        void loadReferences();
        return () => { sequence.current++; };
        // Auxiliary scene loading is keyed by the memoized model selection, not UI renders.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [referenceSources]);
    const hostRef = useRef<HTMLDivElement | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const cameraMotionRef = useRef<ReturnType<typeof createCameraMotion> | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const flashlightRef = useRef<THREE.SpotLight | null>(null);
    const flashlightPointerRef = useRef<THREE.Vector2 | null>(null);
    const inspectionOverlayRef = useRef<{mesh:THREE.Mesh|null;edgeKey:string;normalKey:string;edges:THREE.LineSegments|null;normals:THREE.LineSegments|null}>({mesh:null,edgeKey:'',normalKey:'',edges:null,normals:null});
    const inspectionDiagnosticsRef = useRef('');
    const sectionOverlayRef=useRef<{key:string;lines:THREE.LineSegments[];summary:CadSectionInspection|null}>({key:'',lines:[],summary:null});
    const sectionCallbackRef=useRef(onSectionInspectionChange);
    useEffect(()=>{sectionCallbackRef.current=onSectionInspectionChange;},[onSectionInspectionChange]);
    const placementDiagnosticsRef=useRef<{key:string;value:ReturnType<typeof cadCervicalRegistration>}|null>(null);
    const inspectionAimRef = useRef<{key:string;point:THREE.Vector3}|null>(null);
    const inspectionBoundsVersionsRef = useRef(new WeakMap<THREE.BufferGeometry,number>());
    const inspectionFingerprintsRef = useRef(new WeakMap<THREE.BufferGeometry,{key:string;hash:string}>());
    const sourceMeshRef = useRef<THREE.Mesh | null>(null);
    const sourceSpatialHashRef = useRef<Map<string, THREE.Vector3[]>>(new Map());
    const sourceSpatialCellRef = useRef(0.75);
    const sourceKernelIndexRef = useRef<CadSpatialIndex | null>(null);
    const clippingPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
    const designMeshRef = useRef<THREE.Mesh | null>(null);
    const designBaseRef = useRef<Float32Array | null>(null);
    const placementBaseRef=useRef<Float32Array|null>(null);
    const sourceFingerprintRef=useRef('');
    const sourceLoadingRef=useRef(true);
    const libraryGeometryRef=useRef(new Map<string,THREE.BufferGeometry>());
    const libraryPromisesRef=useRef(new Map<string,Promise<void>>());
    const unitLoadSequenceRef=useRef(0);
    const workspaceProjectRef=useRef(projectId);
    const unitCacheRef=useRef<Record<string,CadUnitGeometryState>>({});
    const sourceCacheRef=useRef<Record<string,Record<string,CadUnitGeometryState>>>({});
    const liveUnitRef=useRef<{id:string;key:string}|null>(null);
    const anchorRef=useRef({position:new THREE.Vector3(),quaternion:new THREE.Quaternion(),placed:false,marginKey:''});
    const unitHistoryRef=useRef(new Map<string,{undo:CadGeometryHistoryEntry[];redo:CadGeometryHistoryEntry[];last:string|null}>());
    const shellMeshRef = useRef<THREE.Mesh | null>(null);
    const shellReportRef = useRef<CrownShellReport | null>(null);
    const markerGroupRef = useRef<THREE.Group | null>(null);
    const measureGroupRef = useRef<THREE.Group | null>(null);
    const connectorGroupRef = useRef<THREE.Group | null>(null);
    const blockoutMeshRef = useRef<THREE.Mesh | null>(null);
    const brushCursorRef = useRef<THREE.Group | null>(null);
    const mirrorBrushCursorRef = useRef<THREE.Group | null>(null);
    const radiusRef = useRef(10);
    const undoRef = useRef<CadGeometryHistoryEntry[]>([]);
    const redoRef = useRef<CadGeometryHistoryEntry[]>([]);
    const lastHistoryActionRef = useRef<string | null>(null);
    const measurePendingRef = useRef<CadPoint | null>(null);
    const connectorPendingRef = useRef<CadPoint | null>(null);
    const settingsRef = useRef(settings);
    const toolRef = useRef(tool);
    const viewModeRef = useRef(viewMode);
    const marginRef = useRef(marginPoints);
    const measurementRef = useRef(measurements);
    const loadSequenceRef = useRef(0);
    useEffect(() => { sourceArchRef.current = source?.arch; }, [source?.arch]);
    const [loading, setLoading] = useState(false);
    const loadingRef=useRef(false);
    const [error, setError] = useState("");
    useEffect(() => {
        settingsRef.current = settings;
        syncVisualSettings();
        drawConnectors(settings.connectors ?? []);
        // Rendering helpers operate exclusively on refs; settings is the stateful trigger.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings]);
    useEffect(() => {
        toolRef.current = tool;
        measurePendingRef.current = null;
        connectorPendingRef.current = null;
        if (controlsRef.current) {
            const controls = controlsRef.current;
            const isOrbit = tool === "orbit";
            controls.enabled = true;
            controls.enableRotate = true;
            controls.enablePan = true;
            controls.enableZoom = isOrbit;
            controls.mouseButtons.LEFT = isOrbit ? THREE.MOUSE.ROTATE : (-1 as never);
            controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
            controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
        }
        const canvas = rendererRef.current?.domElement;
        const isSculpt = ["add", "reduce", "smooth", "flatten"].includes(tool);
        if (canvas) {
            canvas.style.cursor = isSculpt ? "none" : tool === "orbit" ? "grab" : "crosshair";
        }
        if (brushCursorRef.current && !isSculpt) {
            brushCursorRef.current.visible = false;
        }
        if (mirrorBrushCursorRef.current && !isSculpt) {
            mirrorBrushCursorRef.current.visible = false;
        }
    }, [tool]);
    useEffect(() => {
        viewModeRef.current = viewMode;
        applyViewMode();
        // Material updates read current settings through refs.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode]);
    useEffect(() => {
        marginRef.current = marginPoints;
        drawMargin(marginPoints);
    }, [marginPoints]);
    useEffect(() => {
        measurementRef.current = measurements;
        drawMeasurements(measurements);
    }, [measurements]);
    useImperativeHandle(ref, () => ({
        captureWorkspace() {
            if (loadingRef.current) return null;
            if(!designMeshRef.current&&!Object.keys(sourceCacheRef.current).length)return null;
            cacheLiveUnit();
            return {version:1,sourceKey:sourceFingerprintRef.current,units:{...unitCacheRef.current},sources:Object.fromEntries(Object.entries(sourceCacheRef.current).filter(([key])=>key!==sourceFingerprintRef.current))};
        },
        restoreWorkspace(snapshot,settingsOverride) {
            if (!validateCadWorkspace(snapshot) || !sourceFingerprintRef.current) return false;
            const units=snapshot.sourceKey===sourceFingerprintRef.current?snapshot.units:snapshot.sources?.[sourceFingerprintRef.current];
            if (!units) return false;
            if(settingsOverride)settingsRef.current=settingsOverride;
            sourceCacheRef.current={...snapshot.sources,[snapshot.sourceKey]:snapshot.units};unitCacheRef.current={...units};liveUnitRef.current=null;unitHistoryRef.current.clear();activateUnit();setError('');loadingRef.current=false;setLoading(false);readyCallbackRef.current?.(true);return true;
        },
        placeOnMargin() { return registerMargin(); },
        hasMarginPlacement() { return liveUnitRef.current?.key===unitKey()?.key&&anchorRef.current.placed&&anchorRef.current.marginKey===marginKey(); },
        captureCamera() { const camera = cameraRef.current, controls = controlsRef.current; if (!camera || !controls || loading || !designMeshRef.current)
            return null; return { position: camera.position.toArray(), target: controls.target.toArray() }; },
        restoreCamera(value) { if (!value.position.every(Number.isFinite) || !value.target.every(Number.isFinite))
            return; moveCamera(new THREE.Vector3(...value.position), new THREE.Vector3(...value.target), true); playExperienceCue('view'); },
        async captureImage() { const renderer = rendererRef.current, scene = sceneRef.current, camera = cameraRef.current; if (!renderer || !scene || !camera || loading || !designMeshRef.current)
            return null; renderer.render(scene, camera); return new Promise<Blob | null>(resolve => renderer.domElement.toBlob(resolve, 'image/png')); },
        exportStl() {
            const mesh = shellMeshRef.current ?? designMeshRef.current;
            if (!mesh || liveUnitRef.current?.key!==unitKey()?.key || !anchorRef.current.placed || anchorRef.current.marginKey!==marginKey())
                return null;
            const qc = analyzeCadMesh(mesh.geometry);
            if (!qc.watertight || qc.degenerateTriangles || qc.connectedComponents !== 1)
                return null;
            // Separate connector solids are NOT a boolean-unioned, manufacturable bridge.
            if (connectorGroupRef.current?.children.length)
                return null;
            const exporter = new STLExporter();
            const root = new THREE.Group();
            const designClone = mesh.clone();
            designClone.geometry = mesh.geometry.clone();
            root.add(designClone);
            const connectorGroup = connectorGroupRef.current;
            if (connectorGroup) {
                for (const child of connectorGroup.children) {
                    const cloned = child.clone();
                    if (cloned instanceof THREE.Mesh) {
                        cloned.geometry = cloned.geometry.clone();
                    }
                    root.add(cloned);
                }
            }
            root.position.copy(sourceCenterRef.current);
            root.updateMatrixWorld(true);
            const output = exporter.parse(root, { binary: false }) as string;
            root.traverse((object) => {
                if (object instanceof THREE.Mesh)
                    object.geometry.dispose();
            });
            return new Blob([output], { type: "model/stl" });
        },
        undo() {
            const mesh = designMeshRef.current;
            if (!mesh || !undoRef.current.length)
                return false;
            const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
            const previous = undoRef.current.pop()!;
            redoRef.current.push({
                positions: new Float32Array(position.array as ArrayLike<number>),
                label: previous.label,
                at: Date.now(),
            });
            position.array.set(previous.positions);
            position.needsUpdate = true;
            mesh.geometry.computeVertexNormals();
            mesh.geometry.computeBoundingSphere();
            lastHistoryActionRef.current = `Geri · ${previous.label}`;
            emitHistoryState();
            applyViewMode();
            onGeometryCommit?.(`undo:${previous.label}`);
            onStatus?.(`Geri alındı · ${previous.label}`);
            playExperienceCue("tap");
            return true;
        },
        redo() {
            const mesh = designMeshRef.current;
            if (!mesh || !redoRef.current.length)
                return false;
            const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
            const next = redoRef.current.pop()!;
            undoRef.current.push({
                positions: new Float32Array(position.array as ArrayLike<number>),
                label: next.label,
                at: Date.now(),
            });
            position.array.set(next.positions);
            position.needsUpdate = true;
            mesh.geometry.computeVertexNormals();
            mesh.geometry.computeBoundingSphere();
            lastHistoryActionRef.current = `İleri · ${next.label}`;
            emitHistoryState();
            applyViewMode();
            onGeometryCommit?.(`redo:${next.label}`);
            onStatus?.(`Yinele uygulandı · ${next.label}`);
            playExperienceCue("tap");
            return true;
        },
        fit() {
            fitCamera(true);
        },
        focusRestoration() {
            if (!(shellMeshRef.current ?? designMeshRef.current)) return false;
            focusRestoration(true);
            return true;
        },
        rotateView(direction) {
            const camera=cameraRef.current,controls=controlsRef.current;
            if(!camera||!controls)return;
            const next=cadCameraQuarterTurn(camera.position,controls.target,camera.up,direction);
            moveCamera(next.position,controls.target.clone(),true);
            playExperienceCue('view');
        },
        viewOcclusion(){
            applyLayerDisplay();const bounds=new THREE.Box3();for(const mesh of [sourceMeshRef.current,...Object.values(referenceMeshesRef.current)])if(mesh)bounds.expandByObject(mesh);const target=bounds.isEmpty()?new THREE.Vector3():bounds.getCenter(new THREE.Vector3()),radius=Math.max(8,bounds.isEmpty()?radiusRef.current:bounds.getSize(new THREE.Vector3()).length()/2),axis=insertionAxisVector(settingsRef.current),side=new THREE.Vector3(0,-1,0).addScaledVector(axis,axis.y);if(side.lengthSq()<.01)side.set(1,0,0).addScaledVector(axis,-axis.x);side.normalize();moveCamera(target.clone().addScaledVector(side,radius*2.8).addScaledVector(axis,radius*.15),target,true);
        },
        setView(view) {
            setCameraView(view);
        },
        setInsertionFromView() {
            const camera = cameraRef.current;
            const controls = controlsRef.current;
            if (!camera || !controls)
                return null;
            const axis = camera.position
                .clone()
                .sub(controls.target)
                .normalize();
            const point = toPoint(axis);
            onInsertionAxisChange?.(point);
            onStatus?.(`Güncel görünüm giriş ekseni olarak ayarlandı · ${axis.x.toFixed(2)}, ${axis.y.toFixed(2)}, ${axis.z.toFixed(2)}`);
            return point;
        },
        smoothMargin() {
            const index = sourceKernelIndexRef.current;
            if (!index || marginRef.current.length < 3)
                return marginRef.current;
            const next = smoothProjectedMargin(marginRef.current, index, {
                iterations: 2,
                smoothing: settingsRef.current.margin_smoothing,
                projectionStrength: settingsRef.current.margin_projection_strength,
                offsetMm: settingsRef.current.margin_offset_mm,
            });
            marginRef.current = next;
            onMarginPointsChange(next);
            onStatus?.(`Marjin yumuşatıldı ve yüzeye projekte edildi · ${next.length} nokta.`);
            return next;
        },
        projectMargin() {
            const index = sourceKernelIndexRef.current;
            if (!index || !marginRef.current.length)
                return marginRef.current;
            const next = projectMarginToSurface(marginRef.current, index, settingsRef.current.margin_offset_mm);
            marginRef.current = next;
            onMarginPointsChange(next);
            onStatus?.("Marjin noktaları tarama yüzeyine projekte edildi.");
            return next;
        },
        offsetMargin(amountMm) {
            const index = sourceKernelIndexRef.current;
            if (!index || !marginRef.current.length)
                return marginRef.current;
            const next = offsetMarginAlongSurfaceNormals(marginRef.current, index, amountMm);
            marginRef.current = next;
            onMarginPointsChange(next);
            onStatus?.(`Marjin ${amountMm >= 0 ? "+" : ""}${amountMm.toFixed(2)} mm ofsetlendi.`);
            return next;
        },
        applyInternalFit() {
            const mesh = designMeshRef.current;
            const index = sourceKernelIndexRef.current;
            if (!mesh || !index)
                return null;
            discardCrownShell(true);
            snapshotGeometry("Internal Fit");
            const report = applyInternalFitRelief(mesh, index, {
                cementGapMm: settingsRef.current.cement_gap_mm,
                marginGapMm: settingsRef.current.margin_zone_gap_mm,
                axialGapMm: settingsRef.current.axial_gap_mm,
                radialGapMm: settingsRef.current.radial_gap_mm,
                transitionMm: settingsRef.current.gap_transition_mm,
                millingCompensationMm: settingsRef.current.milling_compensation_mm,
                strength: settingsRef.current.internal_fit_strength,
            });
            applyViewMode();
            onGeometryCommit?.("Internal Fit");
            onStatus?.(`Internal Fit uygulandı · ${report.affectedVertices} vertex · en yüksek düzeltme ${report.maxCorrectionMm.toFixed(2)} mm.`);
            return report;
        },
        toggleBlockoutPreview() {
            const sourceMesh = sourceMeshRef.current;
            const scene = sceneRef.current;
            if (!sourceMesh || !scene)
                return false;
            if (blockoutMeshRef.current) {
                scene.remove(blockoutMeshRef.current);
                blockoutMeshRef.current.geometry.dispose();
                const material = blockoutMeshRef.current.material;
                if (material instanceof THREE.Material)
                    material.dispose();
                blockoutMeshRef.current = null;
                onStatus?.("Undercut block-out preview kapatıldı.");
                return false;
            }
            const geometry = createUndercutBlockoutGeometry(sourceMesh, insertionAxisVector(settingsRef.current), settingsRef.current.blockout_depth_mm);
            const material = new THREE.MeshStandardMaterial({
                color: 0x62d7c8,
                roughness: 0.6,
                transparent: true,
                opacity: 0.26,
                side: THREE.DoubleSide,
                depthWrite: false,
            });
            const preview = new THREE.Mesh(geometry, material);
            preview.position.copy(sourceMesh.position);
            preview.rotation.copy(sourceMesh.rotation);
            preview.scale.copy(sourceMesh.scale);
            blockoutMeshRef.current = preview;
            scene.add(preview);
            onStatus?.("Undercut block-out preview açıldı. Bu önizleme üretim geometrisi değildir.");
            return true;
        },
        runKernelQc() {
            const mesh = shellMeshRef.current ?? designMeshRef.current;
            const source = sourceMeshRef.current;
            const index = sourceKernelIndexRef.current;
            const meshReport = mesh ? analyzeCadMesh(mesh.geometry) : null;
            const opposing=contactTarget();
            const contact = mesh && opposing ? analyzeMeshContact(mesh, opposing.index, .18, opposing.offset) : null;
            const undercut = source
                ? analyzeUndercut(source, insertionAxisVector(settingsRef.current))
                : null;
            const margin = marginRef.current.length
                ? marginQualityReport(marginRef.current, index ?? undefined)
                : null;
            const connectorWarnings = (settingsRef.current.connectors ?? [])
                .map((connector) => ({
                connector,
                quality: connectorQuality(connector, settingsRef.current.connector_min_area_mm2, settingsRef.current.connector_min_width_mm, settingsRef.current.connector_min_height_mm),
            }))
                .filter((item) => !item.quality.passes)
                .map((item) => `${item.connector.id}: ${item.quality.areaMm2.toFixed(2)} mm² / ${item.quality.widthMm.toFixed(2)}×${item.quality.heightMm.toFixed(2)} mm`);
            const report: CadKernelReport = {
                mesh: meshReport,
                contact,
                undercut,
                margin,
                connectorCount: settingsRef.current.connectors?.length ?? 0,
                connectorWarnings,
                crownShell: shellReportRef.current,
            };
            const warnings = (meshReport?.warnings.length ?? 0) +
                connectorWarnings.length +
                ((contact?.collisionCount ?? 0) > 0 ? 1 : 0);
            onStatus?.(`CAD Kernel QC tamamlandı · ${warnings} uyarı başlığı.`);
            return report;
        },
        buildCrownShell() {
            const design = designMeshRef.current;
            const scene = sceneRef.current;
            if (!design || !scene)
                return null;
            if(!anchorRef.current.placed){onStatus?.('Önce restorasyonu ham modelde doğruladığın koleye yerleştir.');return null;}
            try {
                discardCrownShell(true);
                const result = buildCrownShell(design, sourceKernelIndexRef.current, {
                    wallThicknessMm: settingsRef.current.shell_wall_thickness_mm,
                    cervicalCutRatio: settingsRef.current.shell_cervical_cut_ratio,
                    innerFitBlend: settingsRef.current.shell_fit_blend,
                    cementGapMm: settingsRef.current.cement_gap_mm,
                    marginGapMm: settingsRef.current.margin_zone_gap_mm,
                    axialGapMm: settingsRef.current.axial_gap_mm,
                    radialGapMm: settingsRef.current.radial_gap_mm,
                    transitionMm: settingsRef.current.gap_transition_mm,
                    millingCompensationMm: settingsRef.current.milling_compensation_mm,
                });
                const material = new THREE.MeshPhysicalMaterial({
                    color: 0xe9fbf7,
                    roughness: 0.38,
                    metalness: 0.02,
                    transparent: true,
                    opacity: settingsRef.current.shell_preview_opacity,
                    side: THREE.DoubleSide,
                });
                const shell = new THREE.Mesh(result.geometry, material);
                shell.position.copy(design.position);
                shell.rotation.copy(design.rotation);
                shell.scale.copy(design.scale);
                shell.visible = anchorRef.current.placed && settingsRef.current.show_design;
                shellMeshRef.current = shell;
                shellReportRef.current = result.report;
                design.visible = false;
                scene.add(shell);
                applyViewMode();
                onGeometryCommit?.('Crown Shell');
                onStatus?.(`Crown Shell üretildi · ${result.report.triangleCount.toLocaleString(currentIntlLocale())} üçgen · ${result.report.qc.watertight ? "watertight" : "QC uyarısı"}.`);
                return result.report;
            }
            catch (caught) {
                onStatus?.(caught instanceof Error
                    ? caught.message
                    : "Crown shell üretilemedi.");
                return null;
            }
        },
        clearCrownShell() {
            discardCrownShell(false);
            onGeometryCommit?.('Crown Shell temizle');
        },
        repairCrownShell() {
            const shell = shellMeshRef.current;
            if (!shell) {
                onStatus?.("Önce Crown Shell oluştur.");
                return null;
            }
            const result = repairCadMesh(shell.geometry, {
                weldToleranceMm: settingsRef.current.shell_weld_tolerance_mm,
                removeDegenerate: true,
                orientOutward: true,
            });
            shell.geometry.dispose();
            shell.geometry = result.geometry;
            shellReportRef.current = shellReportRef.current
                ? {
                    ...shellReportRef.current,
                    triangleCount: result.after.triangleCount,
                    qc: result.after,
                    warnings: result.after.warnings,
                }
                : null;
            applyViewMode();
            onGeometryCommit?.('Crown Shell repair');
            onStatus?.(`Mesh repair tamamlandı · ${result.removedTriangles} dejenere üçgen kaldırıldı · ${result.after.watertight ? "watertight" : "açık/non-manifold"}.`);
            return result;
        },
        clearConnectors() {
            settingsRef.current = { ...settingsRef.current, connectors: [] };
            connectorPendingRef.current = null;
            drawConnectors([]);
            onConnectorsChange?.([]);
            onStatus?.("Connector listesi temizlendi.");
        },
        resetDesign() {
            discardCrownShell(true);
            const mesh = designMeshRef.current;
            const base = designBaseRef.current;
            if (!mesh || !base)
                return;
            snapshotGeometry("Geometri sıfırla");
            const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
            position.array.set(base);
            position.needsUpdate = true;
            mesh.geometry.computeVertexNormals();
            syncVisualSettings();
            applyViewMode();
            onGeometryCommit?.("Geometri sıfırla");
            onStatus?.("Restorasyon geometrisi sıfırlandı.");
        },
        removeLastMarginPoint() {
            if (!marginRef.current.length)
                return;
            const next = marginRef.current.slice(0, -1);
            marginRef.current = next;
            onMarginPointsChange(next);
            onStatus?.(`Son marjin noktası silindi · ${next.length} nokta.`);
        },
        removeLastMeasurement() {
            if (!measurementRef.current.length)
                return;
            const next = measurementRef.current.slice(0, -1);
            measurementRef.current = next;
            measurePendingRef.current = null;
            onMeasurementsChange(next);
            onStatus?.(`Son ölçüm silindi · ${next.length} kayıt.`);
        },
        removeLastConnector() {
            const current = settingsRef.current.connectors ?? [];
            if (!current.length)
                return;
            const next = current.slice(0, -1);
            settingsRef.current = { ...settingsRef.current, connectors: next };
            connectorPendingRef.current = null;
            drawConnectors(next);
            onConnectorsChange?.(next);
            onStatus?.(`Son connector silindi · ${next.length} adet.`);
        },
        cancelPendingAction() {
            measurePendingRef.current = null;
            connectorPendingRef.current = null;
            onStatus?.("Bekleyen CAD seçimi iptal edildi.");
        },
        captureRecoveryGeometry() {
            const mesh = designMeshRef.current;
            if (!mesh)
                return null;
            const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
            return new Float32Array(position.array as ArrayLike<number>);
        },
        restoreRecoveryGeometry(values) {
            const mesh = designMeshRef.current;
            if (!mesh)
                return false;
            const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
            const next = values instanceof Float32Array ? values : Float32Array.from(values);
            if (next.length !== position.array.length) {
                onStatus?.("Kurtarma geometrisi bu modelle eşleşmiyor; uygulanmadı.");
                return false;
            }
            discardCrownShell(true);
            position.array.set(next);
            position.needsUpdate = true;
            mesh.geometry.computeVertexNormals();
            mesh.geometry.computeBoundingSphere();
            undoRef.current = [];
            redoRef.current = [];
            lastHistoryActionRef.current = "Kurtarma kaydı geri yüklendi";
            emitHistoryState();
            applyViewMode();
            onGeometryCommit?.("Kurtarma kaydı geri yüklendi");
            onStatus?.("Yerel CAD kurtarma kaydı geri yüklendi.");
            return true;
        },
        getHistoryState() {
            return historyState();
        },
        // Imperative methods resolve mutable scene refs at call time; helper identities are intentionally excluded.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [onConnectorsChange, onGeometryCommit, onHistoryChange, onInsertionAxisChange, onMarginPointsChange, onMeasurementsChange, onStatus]);
    useEffect(() => {
        const host = hostRef.current;
        if (!host)
            return;
        const hostElement: HTMLDivElement = host;
        const libraryGeometries=libraryGeometryRef.current;
        const unitLoadSequence=unitLoadSequenceRef;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(readThemeColor("--dy-bg", "#081019"));
        sceneRef.current = scene;
        const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 5000);
        cameraRef.current = camera;
        const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        rendererRef.current = renderer;
        renderer.localClippingEnabled = true;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;
        const deviceMemory = (navigator as Navigator & {
            deviceMemory?: number;
        }).deviceMemory ?? 8;
        const pixelRatioCap = deviceMemory <= 4 ? 1.25 : 1.65;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap));
        hostElement.innerHTML = "";
        hostElement.appendChild(renderer.domElement);
        const controls = new OrbitControls(camera, renderer.domElement);
        controlsRef.current = controls;
        controls.enableDamping = true;
        controls.dampingFactor = 0.075;
        controls.screenSpacePanning = true;
        controls.enableRotate = true;
        controls.enablePan = true;
        controls.enableZoom = toolRef.current === "orbit";
        controls.mouseButtons.LEFT = toolRef.current === "orbit" ? THREE.MOUSE.ROTATE : (-1 as never);
        controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
        controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
        scene.add(new THREE.HemisphereLight(0xffffff, 0x383838, 1.8));
        const key = new THREE.DirectionalLight(0xffffff, 2.7);
        key.position.set(4, 7, 5);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xffffff, 1.1);
        rim.position.set(-6, 2, -4);
        scene.add(rim);
        const fill = new THREE.DirectionalLight(0xffffff, .75);
        fill.position.set(0, -5, 3);
        scene.add(fill);
        const flashlight = new THREE.SpotLight(0xffffff, 2.4, 0, THREE.MathUtils.degToRad(26), .35, 0);
        flashlight.name = 'DentAYA inspection flashlight';
        flashlight.visible = false;
        flashlightRef.current = flashlight;
        scene.add(flashlight, flashlight.target);
        const grid = new THREE.GridHelper(120, 24, new THREE.Color(readThemeColor("--dy-border", "#254657")), new THREE.Color(readThemeColor("--dy-surface2", "#132733")));
        grid.position.y = -13;
        scene.add(grid);
        gridRef.current = grid;
        const axes = new THREE.AxesHelper(15);
        scene.add(axes);
        axesRef.current = axes;
        applyWorkspaceDisplay();
        const markerGroup = new THREE.Group();
        markerGroupRef.current = markerGroup;
        scene.add(markerGroup);
        const measureGroup = new THREE.Group();
        measureGroupRef.current = measureGroup;
        scene.add(measureGroup);
        const connectorGroup = new THREE.Group();
        connectorGroupRef.current = connectorGroup;
        scene.add(connectorGroup);
        const brushCursor = new THREE.Group();
        brushCursor.visible = false;
        brushCursor.renderOrder = 10000;
        brushCursorRef.current = brushCursor;
        const brushCursorMaterial = new THREE.MeshBasicMaterial({
            color: 0x55d9c9,
            transparent: true,
            opacity: 0.96,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false,
        });
        const brushCursorRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), brushCursorMaterial);
        brushCursorRing.renderOrder = 10001;
        brushCursor.add(brushCursorRing);
        scene.add(brushCursor);
        const mirrorBrushCursor = new THREE.Group();
        mirrorBrushCursor.visible = false;
        mirrorBrushCursor.renderOrder = 10000;
        mirrorBrushCursorRef.current = mirrorBrushCursor;
        const mirrorBrushCursorMaterial = brushCursorMaterial.clone();
        mirrorBrushCursorMaterial.opacity = 0.55;
        const mirrorBrushCursorRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), mirrorBrushCursorMaterial);
        mirrorBrushCursorRing.renderOrder = 10001;
        mirrorBrushCursor.add(mirrorBrushCursorRing);
        scene.add(mirrorBrushCursor);
        function resize() {
            const width = hostElement.clientWidth || 960;
            const height = hostElement.clientHeight || 680;
            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(hostElement);
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        const sculptTools = new Set<CadTool>(["add", "reduce", "smooth", "flatten"]);
        let activeStrokePointerId: number | null = null;
        let activeStrokeTool: CadTool | null = null;
        let strokeChanged = false;
        let activeMarginPointerId: number | null = null;
        let lastMarginWorldPoint: THREE.Vector3 | null = null;
        let lastStrokeClientX = 0;
        let lastStrokeClientY = 0;
        let lastStrokePressure = 1;
        let lastStrokePointerType = "mouse";
        let lastStrokePoint: THREE.Vector3 | null = null;
        let lastStrokeApplyAt = 0;
        let holdTimer: number | null = null;
        let modifierInvert = false;
        let lastHoverClientX = 0;
        let lastHoverClientY = 0;
        let hasHoverPoint = false;
        const brushCursorNormal = new THREE.Vector3();
        const brushCursorNormalMatrix = new THREE.Matrix3();
        const brushCursorZ = new THREE.Vector3(0, 0, 1);
        renderer.domElement.style.touchAction = "none";
        renderer.domElement.style.cursor = sculptTools.has(toolRef.current) ? "none" : "grab";
        function updateRay(clientX: number, clientY: number) {
            const rect = renderer.domElement.getBoundingClientRect();
            pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(pointer, camera);
        }
        function effectiveSculptTool(baseTool: CadTool | null) {
            if (!baseTool)
                return baseTool;
            if (!modifierInvert)
                return baseTool;
            if (baseTool === "add")
                return "reduce" as CadTool;
            if (baseTool === "reduce")
                return "add" as CadTool;
            return baseTool;
        }
        function cursorColorForTool(activeTool: CadTool | null) {
            const effective = effectiveSculptTool(activeTool);
            if (effective === "add")
                return 0x4ee38a;
            if (effective === "reduce")
                return 0xff6f7d;
            if (effective === "smooth")
                return 0x63d9ff;
            if (effective === "flatten")
                return 0xffd166;
            return 0x55d9c9;
        }
        function mirroredLocalPoint(point: THREE.Vector3) {
            const next = point.clone();
            const offset = settingsRef.current.symmetry_offset_mm ?? 0;
            if (settingsRef.current.symmetry_axis === "y") {
                next.y = offset * 2 - next.y;
            }
            else {
                next.x = offset * 2 - next.x;
            }
            return next;
        }
        function mirroredLocalNormal(normal: THREE.Vector3) {
            const next = normal.clone();
            if (settingsRef.current.symmetry_axis === "y")
                next.y *= -1;
            else
                next.x *= -1;
            return next.normalize();
        }
        function updateBrushCursor(clientX: number, clientY: number) {
            lastHoverClientX = clientX;
            lastHoverClientY = clientY;
            hasHoverPoint = true;
            const activeTool = activeStrokeTool ?? toolRef.current;
            const design = designMeshRef.current;
            if (!design || !sculptTools.has(activeTool)) {
                brushCursor.visible = false;
                mirrorBrushCursor.visible = false;
                return;
            }
            updateRay(clientX, clientY);
            if (!design.visible || !layerState(settingsRef.current, "design").visible)
                return;
            const hit = raycaster.intersectObject(design, false)[0];
            if (!hit) {
                brushCursor.visible = false;
                mirrorBrushCursor.visible = false;
                return;
            }
            const localNormal = hit.face?.normal?.clone() ?? brushCursorZ.clone();
            brushCursorNormalMatrix.getNormalMatrix(design.matrixWorld);
            brushCursorNormal.copy(localNormal).applyNormalMatrix(brushCursorNormalMatrix).normalize();
            const radius = THREE.MathUtils.clamp(settingsRef.current.brush_radius_mm, 0.2, 8);
            brushCursor.position.copy(hit.point).addScaledVector(brushCursorNormal, Math.max(radius * 0.012, 0.008));
            brushCursor.quaternion.setFromUnitVectors(brushCursorZ, brushCursorNormal);
            brushCursor.scale.setScalar(radius);
            brushCursorMaterial.color.setHex(cursorColorForTool(activeTool));
            brushCursor.visible = true;
            if (!settingsRef.current.symmetry_enabled) {
                mirrorBrushCursor.visible = false;
                return;
            }
            const hitLocal = design.worldToLocal(hit.point.clone());
            const mirroredPoint = mirroredLocalPoint(hitLocal);
            const mirroredWorld = design.localToWorld(mirroredPoint.clone());
            const mirroredNormal = mirroredLocalNormal(localNormal);
            const worldMirrorNormal = mirroredNormal
                .clone()
                .applyNormalMatrix(brushCursorNormalMatrix)
                .normalize();
            mirrorBrushCursor.position
                .copy(mirroredWorld)
                .addScaledVector(worldMirrorNormal, Math.max(radius * 0.012, 0.008));
            mirrorBrushCursor.quaternion.setFromUnitVectors(brushCursorZ, worldMirrorNormal);
            mirrorBrushCursor.scale.setScalar(radius);
            mirrorBrushCursorMaterial.color.setHex(cursorColorForTool(activeTool));
            mirrorBrushCursor.visible = true;
        }
        function brushPressureScale(pointerType: string, pressure: number) {
            if (pointerType !== "pen")
                return 1;
            return THREE.MathUtils.clamp(pressure > 0 ? pressure * 1.25 : 0.5, 0.15, 1);
        }
        function applySculptDab(clientX: number, clientY: number, pointerType: string, pressure: number, force = false) {
            const activeTool = activeStrokeTool;
            const design = designMeshRef.current;
            if (!activeTool || !sculptTools.has(activeTool) || !design)
                return false;
            updateRay(clientX, clientY);
            if (!design.visible || !layerState(settingsRef.current, "design").visible)
                return;
            const hit = raycaster.intersectObject(design, false)[0];
            if (!hit)
                return false;
            const now = performance.now();
            const minSpacing = Math.max(settingsRef.current.brush_radius_mm * 0.1, 0.04);
            if (!force &&
                lastStrokePoint &&
                hit.point.distanceTo(lastStrokePoint) < minSpacing &&
                now - lastStrokeApplyAt < 52) {
                return false;
            }
            const localNormal = hit.face?.normal?.clone() ?? new THREE.Vector3(0, 0, 1);
            const effectiveTool = effectiveSculptTool(activeTool) ?? activeTool;
            const pressureScale = brushPressureScale(pointerType, pressure);
            const accepted = applyBrush(design, hit.point, localNormal, effectiveTool, settingsRef.current, pressureScale, true);
            if (!accepted) {
                onStatus?.("Bu darbe yüzeyi çökerteceği veya ters çevireceği için uygulanmadı. Fırça gücünü azalt.");
                return false;
            }
            strokeChanged = true;
            playExperienceCue("brush");
            if (settingsRef.current.symmetry_enabled) {
                const hitLocal = design.worldToLocal(hit.point.clone());
                const axisValue = settingsRef.current.symmetry_axis === "y" ? hitLocal.y : hitLocal.x;
                const offset = settingsRef.current.symmetry_offset_mm ?? 0;
                const distanceFromPlane = Math.abs(axisValue - offset);
                if (distanceFromPlane > Math.max(settingsRef.current.brush_radius_mm * 0.08, 0.04)) {
                    const mirroredPoint = mirroredLocalPoint(hitLocal);
                    const mirroredWorld = design.localToWorld(mirroredPoint.clone());
                    const mirroredNormal = mirroredLocalNormal(localNormal);
                    applyBrush(design, mirroredWorld, mirroredNormal, effectiveTool, settingsRef.current, pressureScale, true);
                }
            }
            lastStrokePoint = hit.point.clone();
            lastStrokeApplyAt = now;
            return true;
        }
        function stopSculptStroke(pointerId?: number) {
            if (pointerId !== undefined && activeStrokePointerId !== null && pointerId !== activeStrokePointerId)
                return;
            if (holdTimer !== null) {
                window.clearInterval(holdTimer);
                holdTimer = null;
            }
            const ended = activeStrokeTool;
            const capturedId = activeStrokePointerId;
            const changed = strokeChanged;
            activeStrokePointerId = null;
            activeStrokeTool = null;
            strokeChanged = false;
            lastStrokePoint = null;
            controls.enabled = true;
            controls.enableRotate = true;
            controls.enablePan = true;
            controls.enableZoom = toolRef.current === "orbit";
            controls.mouseButtons.LEFT = toolRef.current === "orbit" ? THREE.MOUSE.ROTATE : (-1 as never);
            controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
            controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
            const mesh = designMeshRef.current;
            if (changed && mesh) {
                mesh.geometry.computeVertexNormals();
                mesh.geometry.computeBoundingSphere();
            }
            else if (ended && sculptTools.has(ended) && undoRef.current.length) {
                undoRef.current.pop();
                emitHistoryState();
            }
            if (ended && sculptTools.has(ended))
                applyViewMode();
            if (hasHoverPoint && sculptTools.has(toolRef.current)) {
                updateBrushCursor(lastHoverClientX, lastHoverClientY);
            }
            if (capturedId !== null &&
                renderer.domElement.hasPointerCapture?.(capturedId)) {
                try {
                    renderer.domElement.releasePointerCapture(capturedId);
                }
                catch {
                    // Pointer capture can already be released by the browser on cancel/lost capture.
                }
            }
            if (ended && sculptTools.has(ended) && changed) {
                const label = cadToolInteractionLabel(ended);
                onGeometryCommit?.(label);
                onStatus?.(`${label} darbesi tamamlandı.`);
            }
        }
        function addMarginPoint(clientX: number, clientY: number, force = false) {
            const target = sourceMeshRef.current;
            if (!target)
                return false;
            updateRay(clientX, clientY);
            if (!target.visible)
                return;
            const hit = raycaster.intersectObject(target, false)[0];
            if (!hit)
                return false;
            const projected = sourceKernelIndexRef.current
                ? projectPointToSpatialSurface(hit.point, sourceKernelIndexRef.current) ?? hit.point.clone()
                : hit.point.clone();
            const spacing = Math.max(radiusRef.current * 0.006, 0.12);
            if (!force && lastMarginWorldPoint && projected.distanceTo(lastMarginWorldPoint) < spacing) {
                return false;
            }
            const next = [...marginRef.current, toPoint(projected)];
            marginRef.current = next;
            lastMarginWorldPoint = projected.clone();
            onMarginPointsChange(next);
            return true;
        }
        function stopMarginStroke(pointerId?: number) {
            const capturedId = activeMarginPointerId;
            activeMarginPointerId = null;
            lastMarginWorldPoint = null;
            controls.enabled = true;
            controls.enableRotate = true;
            controls.enablePan = true;
            controls.enableZoom = toolRef.current === "orbit";
            controls.mouseButtons.LEFT = toolRef.current === "orbit" ? THREE.MOUSE.ROTATE : (-1 as never);
            controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
            controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
            const releaseId = pointerId ?? capturedId;
            if (releaseId !== null && renderer.domElement.hasPointerCapture?.(releaseId)) {
                try {
                    renderer.domElement.releasePointerCapture(releaseId);
                }
                catch {
                    // Browser may have already released pointer capture.
                }
            }
            onStatus?.(`Marjin çizimi tamamlandı · ${marginRef.current.length} nokta.`);
        }
        function startSculptStroke(event: PointerEvent, activeTool: CadTool) {
            const design = designMeshRef.current;
            if (!design || !design.visible || !layerState(settingsRef.current, "design").visible || !sculptTools.has(activeTool))
                return;
            if (shellMeshRef.current) {
                onStatus?.("Sculpt öncesi Crown Shell preview'ını temizle veya yeniden oluştur.");
                return;
            }
            snapshotGeometry(cadToolInteractionLabel(activeTool));
            strokeChanged = false;
            activeStrokePointerId = event.pointerId;
            activeStrokeTool = activeTool;
            lastStrokeClientX = event.clientX;
            lastStrokeClientY = event.clientY;
            lastStrokePressure = event.pressure || 1;
            lastStrokePointerType = event.pointerType || "mouse";
            lastStrokePoint = null;
            lastStrokeApplyAt = 0;
            controls.enabled = false;
            try {
                renderer.domElement.setPointerCapture(event.pointerId);
            }
            catch {
                // Pointer capture is an enhancement; the stroke still works without it.
            }
            applySculptDab(lastStrokeClientX, lastStrokeClientY, lastStrokePointerType, lastStrokePressure, true);
            holdTimer = window.setInterval(() => {
                if (activeStrokePointerId === null || !activeStrokeTool)
                    return;
                applySculptDab(lastStrokeClientX, lastStrokeClientY, lastStrokePointerType, lastStrokePressure);
            }, 58);
            onStatus?.(`${cadToolInteractionLabel(activeTool)} aktif · basılı tutup sürükle, bırakınca darbe tamamlanır.`);
        }
        let contextStart: {
            x: number;
            y: number;
            pointer: number;
        } | null = null;
        function handlePointerDown(event: PointerEvent) {
            if (event.button === 2)
                contextStart = { x: event.clientX, y: event.clientY, pointer: event.pointerId };
            if (event.button !== 0)
                return;
            modifierInvert = event.altKey || event.shiftKey;
            updateBrushCursor(event.clientX, event.clientY);
            const activeTool = toolRef.current;
            if (activeTool === "orbit")
                return;
            if (sculptTools.has(activeTool)) {
                event.preventDefault();
                startSculptStroke(event, activeTool);
                return;
            }
            updateRay(event.clientX, event.clientY);
            if (activeTool === "margin") {
                event.preventDefault();
                activeMarginPointerId = event.pointerId;
                lastMarginWorldPoint = null;
                controls.enabled = false;
                try {
                    renderer.domElement.setPointerCapture(event.pointerId);
                }
                catch {
                    // Pointer capture is optional for margin drawing.
                }
                if (addMarginPoint(event.clientX, event.clientY, true)) {
                    onStatus?.(`Marjin çizimi başladı · ${marginRef.current.length} nokta.`);
                }
                return;
            }
            if (activeTool === "measure") {
                const targets = [sourceMeshRef.current, designMeshRef.current, ...Object.values(referenceMeshesRef.current)].filter(visibleCadTarget) as THREE.Object3D[];
                const hit = raycaster.intersectObjects(targets, false)[0];
                if (!hit)
                    return;
                const point = toPoint(hit.point);
                const first = measurePendingRef.current;
                if (!first) {
                    measurePendingRef.current = point;
                    onStatus?.("Ölçüm başlangıç noktası seçildi.");
                    return;
                }
                const distance = new THREE.Vector3(first.x, first.y, first.z).distanceTo(hit.point);
                const next = [...measurementRef.current, { a: first, b: point, distance }];
                measurementRef.current = next;
                measurePendingRef.current = null;
                onMeasurementsChange(next);
                onStatus?.(`Ölçüm: ${distance.toFixed(2)} mm`);
                return;
            }
            const design = designMeshRef.current;
            if (!design)
                return;
            if (!design.visible || !layerState(settingsRef.current, "design").visible)
                return;
            const hit = raycaster.intersectObject(design, false)[0];
            if (!hit)
                return;
            if (activeTool === "connector") {
                const point = toPoint(hit.point);
                const first = connectorPendingRef.current;
                if (!first) {
                    connectorPendingRef.current = point;
                    onStatus?.("Connector ilk docking noktası seçildi.");
                    return;
                }
                const connector: CadConnector = {
                    id: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    a: first,
                    b: point,
                    diameterMm: settingsRef.current.connector_diameter_mm,
                    shape: settingsRef.current.connector_shape,
                };
                const nextConnectors = [...(settingsRef.current.connectors ?? []), connector];
                connectorPendingRef.current = null;
                settingsRef.current = { ...settingsRef.current, connectors: nextConnectors };
                drawConnectors(nextConnectors);
                onConnectorsChange?.(nextConnectors);
                const quality = connectorQuality(connector, settingsRef.current.connector_min_area_mm2, settingsRef.current.connector_min_width_mm, settingsRef.current.connector_min_height_mm);
                onStatus?.(`Connector eklendi · ${quality.areaMm2.toFixed(2)} mm² · ${quality.passes ? "QC uygun" : "QC uyarısı"}`);
            }
        }
        function handlePointerMove(event: PointerEvent) {
            const rect=renderer.domElement.getBoundingClientRect();
            flashlightPointerRef.current=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
            if (contextStart && Math.hypot(event.clientX - contextStart.x, event.clientY - contextStart.y) >= 5)
                contextStart = null;
            modifierInvert = event.altKey || event.shiftKey;
            updateBrushCursor(event.clientX, event.clientY);
            if (activeMarginPointerId === event.pointerId) {
                event.preventDefault();
                addMarginPoint(event.clientX, event.clientY);
                return;
            }
            if (activeStrokePointerId !== event.pointerId || !activeStrokeTool)
                return;
            event.preventDefault();
            lastStrokeClientX = event.clientX;
            lastStrokeClientY = event.clientY;
            lastStrokePressure = event.pressure || lastStrokePressure || 1;
            lastStrokePointerType = event.pointerType || lastStrokePointerType;
            applySculptDab(lastStrokeClientX, lastStrokeClientY, lastStrokePointerType, lastStrokePressure);
        }
        function handlePointerUp(event: PointerEvent) {
            if (event.button === 2) {
                if (isContextClick(contextStart, { x: event.clientX, y: event.clientY, pointer: event.pointerId }))
                    contextCallbackRef.current?.({ x: event.clientX, y: event.clientY });
                contextStart = null;
            }
            if (activeMarginPointerId === event.pointerId) {
                event.preventDefault();
                stopMarginStroke(event.pointerId);
                return;
            }
            if (activeStrokePointerId !== event.pointerId)
                return;
            event.preventDefault();
            stopSculptStroke(event.pointerId);
        }
        function handlePointerCancel(event: PointerEvent) {
            contextStart = null;
            if (activeMarginPointerId === event.pointerId) {
                stopMarginStroke(event.pointerId);
                return;
            }
            if (activeStrokePointerId !== event.pointerId)
                return;
            stopSculptStroke(event.pointerId);
        }
        function handleLostPointerCapture(event: PointerEvent) {
            if (activeMarginPointerId === event.pointerId) {
                stopMarginStroke(event.pointerId);
                return;
            }
            if (activeStrokePointerId !== event.pointerId)
                return;
            stopSculptStroke(event.pointerId);
        }
        function handlePointerLeave() {
            flashlightPointerRef.current=null;
            hasHoverPoint = false;
            if (activeStrokePointerId === null) {
                brushCursor.visible = false;
                mirrorBrushCursor.visible = false;
            }
        }
        function handleWheel(event: WheelEvent) {
            const activeTool = toolRef.current;
            const isSculpt = sculptTools.has(activeTool);
            if (event.deltaY === 0)
                return;
            if (isSculpt && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                const direction = event.deltaY < 0 ? -1 : 1;
                const target = controls.target.clone();
                const offset = camera.position.clone().sub(target);
                const currentDistance = Math.max(offset.length(), 0.01);
                const factor = direction < 0 ? 0.88 : 1.14;
                const nextDistance = THREE.MathUtils.clamp(currentDistance * factor, 2, 600);
                offset.setLength(nextDistance);
                camera.position.copy(target.add(offset));
                camera.updateProjectionMatrix();
                controls.update();
                onStatus?.(`Hızlı zoom · ${direction < 0 ? "yakınlaştır" : "uzaklaştır"}`);
                return;
            }
            if (!isSculpt)
                return;
            event.preventDefault();
            event.stopPropagation();
            const direction = event.deltaY < 0 ? 1 : -1;
            if (event.shiftKey) {
                const nextStrength = Math.round(THREE.MathUtils.clamp(settingsRef.current.brush_strength_mm + direction * 0.02, 0.01, 1) * 100) / 100;
                settingsRef.current = { ...settingsRef.current, brush_strength_mm: nextStrength };
                onBrushStrengthChange?.(nextStrength);
                onStatus?.(`Fırça gücü: ${nextStrength.toFixed(2)} mm · Shift + tekerlek`);
            }
            else {
                const nextRadius = Math.round(THREE.MathUtils.clamp(settingsRef.current.brush_radius_mm + direction * 0.2, 0.2, 8) * 10) / 10;
                settingsRef.current = { ...settingsRef.current, brush_radius_mm: nextRadius };
                onBrushRadiusChange?.(nextRadius);
                onStatus?.(`Fırça yarıçapı: ${nextRadius.toFixed(1)} mm · tekerlek`);
            }
            updateBrushCursor(event.clientX, event.clientY);
        }
        function handleContextMenu(event: MouseEvent) {
            event.preventDefault();
        }
        function handleModifierKeyDown(event: KeyboardEvent) {
            if (!["ShiftLeft", "ShiftRight", "AltLeft", "AltRight"].includes(event.code))
                return;
            if (event.code.startsWith("Alt") && sculptTools.has(toolRef.current))
                event.preventDefault();
            if(event.code.startsWith("Alt")&&["orbit","measure"].includes(toolRef.current)&&!(event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement))peekAllRef.current=true;
            modifierInvert = event.shiftKey || event.altKey;
            if (hasHoverPoint)
                updateBrushCursor(lastHoverClientX, lastHoverClientY);
        }
        function handleModifierKeyUp(event: KeyboardEvent) {
            if (!["ShiftLeft", "ShiftRight", "AltLeft", "AltRight"].includes(event.code))
                return;
            if(event.code.startsWith("Alt"))peekAllRef.current=false;
            modifierInvert = event.shiftKey || event.altKey;
            if (hasHoverPoint)
                updateBrushCursor(lastHoverClientX, lastHoverClientY);
        }
        function handleWindowBlur() {
            peekAllRef.current=false;modifierInvert = false;
            if (activeStrokePointerId !== null)
                stopSculptStroke(activeStrokePointerId);
            if (activeMarginPointerId !== null)
                stopMarginStroke(activeMarginPointerId);
            if (hasHoverPoint)
                updateBrushCursor(lastHoverClientX, lastHoverClientY);
        }
        renderer.domElement.addEventListener("pointerdown", handlePointerDown);
        renderer.domElement.addEventListener("pointermove", handlePointerMove);
        renderer.domElement.addEventListener("pointerup", handlePointerUp);
        renderer.domElement.addEventListener("pointercancel", handlePointerCancel);
        renderer.domElement.addEventListener("lostpointercapture", handleLostPointerCapture);
        renderer.domElement.addEventListener("pointerleave", handlePointerLeave);
        renderer.domElement.addEventListener("wheel", handleWheel, { passive: false });
        renderer.domElement.addEventListener("contextmenu", handleContextMenu);
        window.addEventListener("keydown", handleModifierKeyDown);
        window.addEventListener("keyup", handleModifierKeyUp);
        window.addEventListener("blur", handleWindowBlur);
        const cancelCameraMotion = () => { cameraMotionRef.current = null; };
        renderer.domElement.addEventListener('pointerdown', cancelCameraMotion, true);
        renderer.domElement.addEventListener('wheel', cancelCameraMotion, true);
        let frame = 0;
        let animating = false;
        function animate() {
            if (document.hidden) {
                animating = false;
                return;
            }
            animating = true;
            const motion = cameraMotionRef.current;
            if (motion) {
                const state = sampleCameraMotion(motion, experienceDuration('camera') ? performance.now() : motion.start + motion.duration);
                camera.position.copy(state.position);
                controls.target.copy(state.target);
                camera.lookAt(state.target);
                if (state.done)
                    cameraMotionRef.current = null;
            }
            else
                controls.update();
            applyLayerDisplay();
            syncInspectionRendering();
            renderer.render(scene, camera);
            frame = requestAnimationFrame(animate);
        }
        function handleVisibilityChange() {
            if (document.hidden) {
                cancelAnimationFrame(frame);
                cameraMotionRef.current = null;
                animating = false;
            }
            else if (!animating) {
                animate();
            }
        }
        document.addEventListener("visibilitychange", handleVisibilityChange);
        animate();
        fitCamera();
        const handleThemeChange = () => {
            scene.background = new THREE.Color(readThemeColor("--dy-bg", "#081019"));
            applyWorkspaceDisplay();
            rim.color.setHex(0xffffff);
        };
        window.addEventListener("dentaya-customization-change", handleThemeChange);
        window.addEventListener("dentaya-theme-change", handleThemeChange);
        return () => {
            loadSequenceRef.current += 1;unitLoadSequence.current++;
            window.removeEventListener("dentaya-theme-change", handleThemeChange);
            window.removeEventListener("dentaya-customization-change", handleThemeChange);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            cancelAnimationFrame(frame);
            cameraMotionRef.current = null;
            renderer.domElement.removeEventListener('pointerdown', cancelCameraMotion, true);
            renderer.domElement.removeEventListener('wheel', cancelCameraMotion, true);
            observer.disconnect();
            stopSculptStroke();
            if (activeMarginPointerId !== null)
                stopMarginStroke(activeMarginPointerId);
            renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
            renderer.domElement.removeEventListener("pointermove", handlePointerMove);
            renderer.domElement.removeEventListener("pointerup", handlePointerUp);
            renderer.domElement.removeEventListener("pointercancel", handlePointerCancel);
            renderer.domElement.removeEventListener("lostpointercapture", handleLostPointerCapture);
            renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
            renderer.domElement.removeEventListener("wheel", handleWheel);
            renderer.domElement.removeEventListener("contextmenu", handleContextMenu);
            window.removeEventListener("keydown", handleModifierKeyDown);
            window.removeEventListener("keyup", handleModifierKeyUp);
            window.removeEventListener("blur", handleWindowBlur);
            brushCursorRing.geometry.dispose();
            brushCursorMaterial.dispose();
            mirrorBrushCursorRing.geometry.dispose();
            mirrorBrushCursorMaterial.dispose();
            scene.remove(brushCursor);
            scene.remove(mirrorBrushCursor);
            brushCursorRef.current = null;
            mirrorBrushCursorRef.current = null;
            clearReferences();clearFrozenUnits();
            clearInspectionOverlays();
            scene.remove(flashlight,flashlight.target);
            flashlight.dispose();
            flashlightRef.current=null;
            flashlightPointerRef.current=null;
            grid.geometry.dispose();
            grid.material.dispose();
            axes.geometry.dispose();
            (axes.material as THREE.Material).dispose();
            gridRef.current = null;
            axesRef.current = null;
            controls.dispose();
            renderer.dispose();
            renderer.forceContextLoss();
            rendererRef.current = null;
            sourceMeshRef.current?.geometry.dispose();
            designMeshRef.current?.geometry.dispose();
            shellMeshRef.current?.geometry.dispose();
            blockoutMeshRef.current?.geometry.dispose();
            sourceKernelIndexRef.current = null;
            libraryGeometries.forEach(g=>g.dispose());libraryGeometries.clear();
            if(sceneRef.current===scene)sceneRef.current=null;
            if (renderer.domElement.parentNode)
                renderer.domElement.parentNode.removeChild(renderer.domElement);
        };
        // Three.js owns an imperative scene lifecycle; prop callbacks are consumed through the mounted interaction handler.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const activeUnitIdentity = activeCadUnit(settings.job_setup);
    const sourceIdentity = `${projectId??''}:${source?.bucket ?? ""}:${source?.path ?? ""}:${source?.fileName ?? ""}:${toothCodes.join(",")}`;
    const unitIdentity = `${activeUnitIdentity?.id ?? ""}:${activeUnitIdentity?.anatomy_code ?? ""}:${activeUnitIdentity?.design_type ?? ""}:${activeUnitIdentity?.tooth_form ?? "natural"}:${activeUnitIdentity?.morphology_style ?? ""}:${activeUnitIdentity?.form_library_id??""}:${activeUnitIdentity?.form_library_id?settings.cad_library_assets?.[activeUnitIdentity.form_library_id]?.sha256??"":""}`;
    useEffect(()=>{
        if(sourceLoadingRef.current||!sourceMeshRef.current||!sourceFingerprintRef.current)return;
        const sequence=++unitLoadSequenceRef.current;
        if(!activeCadUnit(settingsRef.current.job_setup)?.form_library_id){activateUnit();loadingRef.current=false;setLoading(false);setError('');readyCallbackRef.current?.(true);return;}
        loadingRef.current=true;setLoading(true);readyCallbackRef.current?.(false);
        void ensureActiveLibraryForm().then(()=>{if(sequence!==unitLoadSequenceRef.current||!sceneRef.current)return;activateUnit();loadingRef.current=false;setLoading(false);setError('');readyCallbackRef.current?.(true);}).catch(()=>{if(sequence===unitLoadSequenceRef.current){setLoading(false);setError('Form dosyası geçersiz.');}});
        // Unit activation uses the loaded source; it never reloads a scan.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[unitIdentity]);
    useEffect(() => {
        void loadSource(source);
        // loadSource is an imperative renderer operation keyed by the stable source identity.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sourceIdentity]);
    function clearReferences() {
        referenceSequenceRef.current++;
        for (const mesh of Object.values(referenceMeshesRef.current)) {
            sceneRef.current?.remove(mesh);
            mesh.geometry.dispose();
            for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
                material.dispose();
        }
        referenceMeshesRef.current = {};referenceIndexesRef.current={};contactColorsRef.current=null;
    }
    async function loadReferences() {
        clearReferences();
        const sequence = referenceSequenceRef.current, scene = sceneRef.current;
        if (!scene || !sourceMeshRef.current)
            return;
        const center = sourceCenterRef.current.clone();
        for (const arch of ['upper', 'lower'] as const) {
            const input = referencesRef.current?.[arch];
            if (!input || (input.path === source?.path && input.bucket === source?.bucket))
                continue;
            try {
                const buffer = await readSource(input);
                if (sequence !== referenceSequenceRef.current || sceneRef.current !== scene)
                    return;
                const geometry = /\.ply$/i.test(input.fileName) ? new PLYLoader().parse(buffer) : new STLLoader().parse(buffer);
                const positions = geometry.getAttribute('position');
                if (!positions || positions.count < 3 || (geometry.index?.count ?? positions.count) % 3) {
                    geometry.dispose();
                    throw Error('Geçerli üçgen yüzey bulunamadı.');
                }
                for (let i = 0; i < positions.count; i++)
                    if (![positions.getX(i), positions.getY(i), positions.getZ(i)].every(Number.isFinite)) {
                        geometry.dispose();
                        throw Error('Geçersiz model koordinatı.');
                    }
                geometry.translate(-center.x, -center.y, -center.z);
                geometry.computeVertexNormals();
                geometry.computeBoundingSphere();
                const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: arch === 'upper' ? 0xc9d3d8 : 0xb8c6d8, roughness: 0.75, side: THREE.DoubleSide }));
                referenceMeshesRef.current[arch] = mesh;
                scene.add(mesh);
                applyLayerDisplay();applyViewMode();
            }
            catch (error) {
                if (sequence === referenceSequenceRef.current)
                    onStatus?.(`${arch === 'upper' ? 'Üst' : 'Alt'} çene yüklenemedi: ${error instanceof Error ? error.message : 'Dosya okunamadı.'}`);
            }
        }
    }
    function currentWorkingJaw(){return workingJaw(activeCadUnit(settingsRef.current.job_setup)?.tooth_code,sourceArchRef.current);}
    function openingDirection(){
        const axis=insertionAxisVector(settingsRef.current),working=currentWorkingJaw(),opposing=oppositeJaw(working);
        const meshFor=(arch:'upper'|'lower')=>sourceArchRef.current===arch?sourceMeshRef.current:referenceMeshesRef.current[arch];
        const a=meshFor(working),b=meshFor(opposing);let sign=working==='lower'?1:-1;
        if(a&&b){if(!a.geometry.boundingBox)a.geometry.computeBoundingBox();if(!b.geometry.boundingBox)b.geometry.computeBoundingBox();const direction=b.geometry.boundingBox!.getCenter(new THREE.Vector3()).sub(a.geometry.boundingBox!.getCenter(new THREE.Vector3())).dot(axis);if(Math.abs(direction)>.01)sign=Math.sign(direction);}
        return axis.multiplyScalar(sign);
    }
    function openingOffset(){return openingDirection().multiplyScalar(jawOpening(settingsRef.current));}
    function contactTarget(){
        const arch=oppositeJaw(currentWorkingJaw()),offset=openingOffset();
        if(sourceArchRef.current===arch&&sourceKernelIndexRef.current)return {index:sourceKernelIndexRef.current,offset,arch};
        const mesh=referenceMeshesRef.current[arch];if(!mesh)return null;
        let index=referenceIndexesRef.current[arch];if(!index){const unposed=new THREE.Mesh(mesh.geometry);unposed.updateMatrixWorld(true);index=buildMeshSpatialIndex(unposed,Math.max(radiusRef.current*.035,.3));referenceIndexesRef.current[arch]=index;}
        return {index,offset,arch};
    }
    function applyLayerDisplay() {
        const active=settingsRef.current,working=currentWorkingJaw(),opposing=oppositeJaw(working),peek=peekAllRef.current;
        const axis=openingDirection(),offset=openingOffset(),camera=cameraRef.current,controls=controlsRef.current;
        const autoHidden=!peek&&active.auto_hide_antagonist===true&&Boolean(camera&&controls&&antagonistAutoHidden(true,camera.position.clone().sub(controls.target),axis));
        const scans:{mesh:THREE.Mesh;arch:string|undefined}[]=[];
        if(sourceMeshRef.current)scans.push({mesh:sourceMeshRef.current,arch:sourceArchRef.current});
        for(const arch of ['upper','lower'] as const){const mesh=referenceMeshesRef.current[arch];if(mesh)scans.push({mesh,arch});}
        for(const {mesh,arch} of scans){
            const state=layerState(active,arch==='upper'||arch==='lower'?arch:'scan');
            mesh.position.copy(arch===opposing?offset:new THREE.Vector3());
            applyMeshDisplay(mesh,peek?{visible:true,opacity:Math.max(.5,state.opacity)}:{...state,visible:state.visible&&!(autoHidden&&arch===opposing)});
            for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])if(material instanceof THREE.MeshStandardMaterial&&!material.vertexColors)material.color.set(cadScanColor(active,arch,working));
        }
        const unitId=activeCadUnit(active.job_setup)?.id??'',state=unitDisplayState(active,unitId),display=peek?{visible:true,opacity:Math.max(.5,state.opacity)}:state;
        // A floating starter at the arch origin is not a restoration target.
        const registered=anchorRef.current.placed;
        applyMeshDisplay(designMeshRef.current,{...display,visible:registered&&display.visible&&!shellMeshRef.current});applyMeshDisplay(shellMeshRef.current,{...display,visible:registered&&display.visible});
        for(const [id,{mesh}] of frozenUnitsRef.current){const unit=unitDisplayState(active,id);applyMeshDisplay(mesh,peek?{visible:true,opacity:Math.max(.5,unit.opacity)}:unit);}
        if(markerGroupRef.current)markerGroupRef.current.visible=peek||(active.show_annotations??true);
        if(measureGroupRef.current)measureGroupRef.current.visible=peek||(active.show_annotations??true);
        if(connectorGroupRef.current)connectorGroupRef.current.visible=peek||((active.show_connectors??true)&&state.visible);
        const upper=scans.find(s=>s.arch==='upper')?.mesh,lower=scans.find(s=>s.arch==='lower')?.mesh,liveMesh=shellMeshRef.current??designMeshRef.current;
        const info:CadSceneState={...EMPTY_CAD_SCENE,upperReady:Boolean(upper),lowerReady:Boolean(lower),antagonistReady:opposing==='upper'?Boolean(upper):Boolean(lower),autoHidden:autoHidden?opposing:'',openingMm:jawOpening(active),activeVisible:Boolean(liveMesh?.visible),renderedUnits:(liveMesh?.visible?1:0)+[...frozenUnitsRef.current.values()].filter(v=>v.mesh.visible).length};
        const material=(mesh:THREE.Mesh|undefined|null)=>mesh?.material instanceof THREE.MeshStandardMaterial?{visible:mesh.visible,opacity:mesh.material.opacity,color:'#'+mesh.material.color.getHexString(),position:mesh.position.toArray(),vertexColors:mesh.material.vertexColors}:null;
        const data=JSON.stringify({state:info,upper:material(upper),lower:material(lower),design:material(liveMesh),palette:active.render_palette??'technical',peek});
        if(data!==sceneStateKeyRef.current){sceneStateKeyRef.current=data;if(hostRef.current)hostRef.current.dataset.cadRenderState=data;sceneCallbackRef.current?.(info);}
    }
    function clearFrozenUnits(){for(const {mesh} of frozenUnitsRef.current.values()){sceneRef.current?.remove(mesh);mesh.geometry.dispose();for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])m.dispose();}frozenUnitsRef.current.clear();}
    function syncFrozenUnits(){
        const scene=sceneRef.current;if(!scene)return;const active=settingsRef.current,live=liveUnitRef.current?.id;
        const valid=new Set<string>();
        for(const unit of active.job_setup.units){
            const record=unitCacheRef.current[unit.id];if(unit.id===live||!record?.anchor.placed||cadRestorationCacheAction(record,expectedUnitKey(unit))==='replace')continue;valid.add(unit.id);
            let entry=frozenUnitsRef.current.get(unit.id);
            if(!entry||entry.record!==record){if(entry){scene.remove(entry.mesh);entry.mesh.geometry.dispose();(entry.mesh.material as THREE.Material).dispose();}const mesh=new THREE.Mesh(restoreCadGeometry(record.shell??record.geometry),new THREE.MeshPhysicalMaterial({color:cadRoleColor(active,'restoration'),roughness:.5,metalness:0}));entry={mesh,record};frozenUnitsRef.current.set(unit.id,entry);scene.add(mesh);}
            const p=active.unit_parameters?.[unit.id]??{},mesh=entry.mesh;
            const transform=cadRestorationTransform({position:new THREE.Vector3(...record.anchor.position),quaternion:new THREE.Quaternion(...record.anchor.quaternion),placed:record.anchor.placed},cadCervicalBaseZ(record.placementBase??record.base),{morphologyScale:p.morphology_scale??1,cuspHeight:p.cusp_height??1,proximalContactMm:active.proximal_contact_mm,occlusalOffsetMm:active.occlusal_offset_mm,translation:new THREE.Vector3(p.design_tx_mm??0,p.design_ty_mm??0,p.design_tz_mm??0),rotationZDeg:p.rotation_z_deg??0,marginOffsetMm:active.margin_offset_mm});
            mesh.position.copy(transform.position);mesh.quaternion.copy(transform.quaternion);mesh.scale.copy(transform.scale);
            const material=mesh.material as THREE.MeshPhysicalMaterial,follow=active.render_palette==='natural'&&workspacePreferencesRef.current.followToothStyle,style=follow?toothSurface(toothAppearanceRef.current):undefined;
            material.color.set(cadRoleColor(active,'restoration',style?.color));
            const finish=cadRestorationSurface(active.render_palette==='natural',viewModeRef.current==='natural',style),coatingChanged=(material.clearcoat>0)!==(finish.clearcoat>0);Object.assign(material,finish);if(coatingChanged)material.needsUpdate=true;
        }
        for(const [id,entry] of frozenUnitsRef.current)if(!valid.has(id)){scene.remove(entry.mesh);entry.mesh.geometry.dispose();(entry.mesh.material as THREE.Material).dispose();frozenUnitsRef.current.delete(id);}
    }
    async function readSource(input: ModelSource): Promise<ArrayBuffer> {
        if (input.bucket === "public-demo" || input.path.startsWith("/")) {
            const response = await fetch(input.path);
            if (!response.ok)
                throw new Error(`Kaynak model açılamadı (${response.status}).`);
            return response.arrayBuffer();
        }
        if (!input.bucket)
            throw new Error("Kaynak model Storage bucket bilgisi içermiyor.");
        const { data, error: storageError } = await supabase.storage.from(input.bucket).download(input.path.replace(/^\/+/, ""));
        if (storageError)
            throw storageError;
        return data.arrayBuffer();
    }
    async function loadSource(input: ModelSource | null) {
        const sequence = ++loadSequenceRef.current;sourceLoadingRef.current=true;
        if(workspaceProjectRef.current===projectId){cacheLiveUnit();if(sourceFingerprintRef.current)sourceCacheRef.current[sourceFingerprintRef.current]={...unitCacheRef.current};}
        else {sourceCacheRef.current={};unitHistoryRef.current.clear();workspaceProjectRef.current=projectId;}
        liveUnitRef.current=null;sourceFingerprintRef.current='';unitCacheRef.current={};
        readyCallbackRef.current?.(false);
        clearReferences();clearFrozenUnits();
        const scene = sceneRef.current;
        if (!scene)
            return;
        try {
            setError("");
            if (sourceMeshRef.current) {
                scene.remove(sourceMeshRef.current);
                sourceMeshRef.current.geometry.dispose();
                sourceMeshRef.current = null;
            }
            sourceKernelIndexRef.current = null;
            if (blockoutMeshRef.current) {
                scene.remove(blockoutMeshRef.current);
                blockoutMeshRef.current.geometry.dispose();
                const blockoutMaterial = blockoutMeshRef.current.material;
                if (blockoutMaterial instanceof THREE.Material)
                    blockoutMaterial.dispose();
                blockoutMeshRef.current = null;
            }
            discardCrownShell(true);
            if (designMeshRef.current) {
                scene.remove(designMeshRef.current);
                designMeshRef.current.geometry.dispose();
                designMeshRef.current = null;
            }
            if (!input) {
                clearReferences();
                loadingRef.current=false;setLoading(false);
                return;
            }
            loadingRef.current=true;setLoading(true);
            onStatus?.("Tarama modeli yükleniyor…");
            const buffer = await readSource(input);
            if (sequence !== loadSequenceRef.current || sceneRef.current !== scene)
                return;
            const lower = `${input.fileName} ${input.path}`.toLowerCase();
            const geometry: THREE.BufferGeometry = lower.includes(".ply") ? new PLYLoader().parse(buffer) : new STLLoader().parse(buffer);
            const positions = geometry.getAttribute("position");
            const faceVertices = geometry.index?.count ?? positions?.count ?? 0;
            if (!positions || positions.count < 3 || faceVertices % 3 !== 0) {
                geometry.dispose();
                throw new Error("Tarama dosyasında geçerli bir üçgen yüzey bulunamadı.");
            }
            for (let vertex = 0; vertex < positions.count; vertex += 1) {
                if (![positions.getX(vertex), positions.getY(vertex), positions.getZ(vertex)].every(Number.isFinite)) {
                    geometry.dispose();
                    throw new Error("Tarama dosyası geçersiz koordinatlar içeriyor.");
                }
            }
            geometry.computeVertexNormals();
            geometry.computeBoundingBox();
            geometry.boundingBox!.getCenter(sourceCenterRef.current);
            geometry.translate(-sourceCenterRef.current.x, -sourceCenterRef.current.y, -sourceCenterRef.current.z);
            geometry.computeBoundingSphere();
            const radius = geometry.boundingSphere?.radius;
            if (!radius || !Number.isFinite(radius) || radius < 0.001) {
                geometry.dispose();
                throw new Error("Tarama modeli boş veya kullanılabilir ölçekte değil.");
            }
            radiusRef.current = radius;
            const sourceTriangles = geometryTriangleCount(geometry);
            const kernelGeometry = sourceTriangles > 520000
                ? createAdaptiveScanPreviewGeometry(geometry, 280000)
                : geometry;
            const renderGeometry = sourceTriangles > 220000
                ? createAdaptiveScanPreviewGeometry(geometry, 165000)
                : geometry;
            const kernelTriangles = geometryTriangleCount(kernelGeometry);
            const renderTriangles = geometryTriangleCount(renderGeometry);
            const spatial = buildSpatialHash(kernelGeometry, Math.max(radius * 0.045, 0.45));
            sourceSpatialHashRef.current = spatial.map;
            sourceSpatialCellRef.current = spatial.cellSize;
            const kernelMesh = new THREE.Mesh(kernelGeometry);
            kernelMesh.updateMatrixWorld(true);
            sourceKernelIndexRef.current = buildMeshSpatialIndex(kernelMesh, Math.max(radius * 0.035, 0.3));
            const scanMaterial = new THREE.MeshStandardMaterial({
                color: 0xc9d3d8, roughness: 0.72, metalness: 0.02, transparent: true, opacity: 0.64, side: THREE.DoubleSide,
            });
            const sourceMesh = new THREE.Mesh(renderGeometry, scanMaterial);
            sourceMeshRef.current = sourceMesh;
            scene.add(sourceMesh);
            void loadReferences();
            if (renderGeometry !== geometry) {
                geometry.dispose();
            }
            if (kernelGeometry !== geometry && kernelGeometry !== renderGeometry) {
                kernelGeometry.dispose();
            }
            const performanceInfo: CadPerformanceInfo = {
                sourceTriangles,
                renderTriangles,
                kernelTriangles,
                adaptive: sourceTriangles !== renderTriangles || sourceTriangles !== kernelTriangles,
            };
            onPerformanceInfo?.(performanceInfo);
            const fingerprint=[input.bucket,input.path,input.fileName,...sourceCenterRef.current.toArray().map(v=>v.toPrecision(10)),radius.toPrecision(10),sourceTriangles].join('|');
            sourceFingerprintRef.current=fingerprint;
            const stored=settingsRef.current.cad_workspace;
            const decoded=stored?await decodeCadWorkspace(stored):null;
            if(sequence!==loadSequenceRef.current || sceneRef.current!==scene)return;
            if(stored && !decoded)throw Error('Kurtarma geometrisi bu modelle eşleşmiyor; uygulanmadı.');
            if(decoded)sourceCacheRef.current={...decoded.sources,[decoded.sourceKey]:decoded.units,...sourceCacheRef.current};
            unitCacheRef.current={...(sourceCacheRef.current[fingerprint]??{})};
            await ensureActiveLibraryForm();
            if(sequence!==loadSequenceRef.current||sceneRef.current!==scene)return;
            sourceLoadingRef.current=false;activateUnit(false);
            const activeUnit = activeCadUnit(settingsRef.current.job_setup);
            syncVisualSettings();
            applyViewMode();
            drawMargin(marginRef.current);
            drawMeasurements(measurementRef.current);
            drawConnectors(settingsRef.current.connectors ?? []);
            fitCamera();if(anchorRef.current.placed)focusRestoration(false);
            loadingRef.current=false;setLoading(false);
            readyCallbackRef.current?.(true);
            onStatus?.(performanceInfo.adaptive
                ? `Tarama hazır · yüksek yoğunluk modu ${performanceInfo.sourceTriangles.toLocaleString(currentIntlLocale())} → render ${performanceInfo.renderTriangles.toLocaleString(currentIntlLocale())} üçgen.`
                : `Tarama senkronize edildi · ${activeUnit?.tooth_code ?? "FDI"} · ${activeUnit?.tooth_form ?? "natural"} · tek gövde tasarım hazır.`);
        }
        catch (caught) {
            if (sequence !== loadSequenceRef.current || sceneRef.current !== scene)
                return;
            devError(caught);sourceLoadingRef.current=false;
            setLoading(false);
            setError(caught instanceof Error ? caught.message : "Kaynak model yüklenemedi.");
        }
    }
    function activeLibraryForm(){
        const unit=activeCadUnit(settingsRef.current.job_setup);
        if(!unit?.form_library_id||['primary_telescope','secondary_telescope'].includes(unit.design_type))return null;
        const asset=readProjectCadForms(settingsRef.current.cad_library_assets)[unit.form_library_id];
        if(!asset||asset.toothCode!==(unit.anatomy_code||unit.tooth_code))throw Error('Form dosyası geçersiz.');return asset;
    }
    async function ensureActiveLibraryForm(){
        while(sceneRef.current){
            const asset=activeLibraryForm();if(!asset)return;
            const key=asset.id+':'+asset.sha256;if(libraryGeometryRef.current.has(key))return;
            let pending=libraryPromisesRef.current.get(key);
            if(!pending){pending=decodeCadLibraryForm(asset).then(g=>{if(sceneRef.current)libraryGeometryRef.current.set(key,g);else g.dispose();}).finally(()=>libraryPromisesRef.current.delete(key));libraryPromisesRef.current.set(key,pending);}
            await pending;
        }
    }
    function geometryForUnit(radius:number){
        const unit=activeCadUnit(settingsRef.current.job_setup)!;const asset=activeLibraryForm();
        if(asset){const geometry=libraryGeometryRef.current.get(asset.id+':'+asset.sha256);if(!geometry)throw Error('Form dosyası geçersiz.');return cadLibraryGeometryForRestoration(geometry,unit.design_type);}
        return createRestorationGeometry(radius,unit.anatomy_code||unit.tooth_code,unit.design_type,unit.tooth_form,unit.morphology_style);
    }
    function expectedUnitKey(u:NonNullable<ReturnType<typeof activeCadUnit>>){const asset=u.form_library_id&&!['primary_telescope','secondary_telescope'].includes(u.design_type)?readProjectCadForms(settingsRef.current.cad_library_assets)[u.form_library_id]:undefined;return [u.id,u.anatomy_code,u.design_type,asset?'library-rc41:'+asset.id+':'+asset.sha256:u.tooth_form+':'+u.morphology_style+':'+CAD_DEFAULT_ANATOMY_VERSION].join(':');}
    function unitKey() {const u=activeCadUnit(settingsRef.current.job_setup);return u?{id:u.id,key:expectedUnitKey(u)}:null;}
    function cacheLiveUnit() {
        const live=liveUnitRef.current,mesh=designMeshRef.current;if(!live||!mesh)return;
        unitCacheRef.current[live.id]={key:live.key,geometry:captureCadGeometry(mesh.geometry),base:Array.from(designBaseRef.current??mesh.geometry.getAttribute('position').array),placementBase:Array.from(placementBaseRef.current??designBaseRef.current??mesh.geometry.getAttribute('position').array),anchor:{position:anchorRef.current.position.toArray(),quaternion:anchorRef.current.quaternion.toArray(),placed:anchorRef.current.placed,marginKey:anchorRef.current.marginKey},...(shellMeshRef.current?{shell:captureCadGeometry(shellMeshRef.current.geometry),...(shellReportRef.current?{shellReport:shellReportRef.current}:{})}:{})};
        unitHistoryRef.current.set(sourceFingerprintRef.current+'|'+live.key,{undo:undoRef.current,redo:redoRef.current,last:lastHistoryActionRef.current});
    }
    function activateUnit(notify=true) {
        const scene=sceneRef.current;if(!scene||!sourceFingerprintRef.current)return;
        const live=unitKey();if(!live||live.key===liveUnitRef.current?.key)return;
        cacheLiveUnit();discardCrownShell(true);
        if(designMeshRef.current){scene.remove(designMeshRef.current);designMeshRef.current.geometry.dispose();const m=designMeshRef.current.material;if(m instanceof THREE.Material)m.dispose();}
        const unit=activeCadUnit(settingsRef.current.job_setup)!;
        const stored=Object.hasOwn(unitCacheRef.current,live.id)?unitCacheRef.current[live.id]:undefined;
        const cacheAction=cadRestorationCacheAction(stored,live.key,{marginReady:cadMarginCenter(marginRef.current)!==null});
        const valid=stored!==undefined&&cacheAction==='restore';
        const geometry=valid?restoreCadGeometry(stored.geometry):geometryForUnit(radiusRef.current);
        const material=new THREE.MeshPhysicalMaterial({color:0xe9fbf7,roughness:.42,metalness:.03,transparent:true,opacity:settingsRef.current.opacity,side:THREE.DoubleSide});
        const mesh=new THREE.Mesh(geometry,material);designMeshRef.current=mesh;scene.add(mesh);
        designBaseRef.current=Float32Array.from(valid?stored.base:geometry.getAttribute('position').array);
        placementBaseRef.current=Float32Array.from(valid?(stored.placementBase??stored.base):geometry.getAttribute('position').array);
        anchorRef.current=valid?{position:new THREE.Vector3(...stored.anchor.position),quaternion:new THREE.Quaternion(...stored.anchor.quaternion),placed:stored.anchor.placed,marginKey:stored.anchor.marginKey??marginKey()}:{position:new THREE.Vector3(0,0,radiusRef.current*.18),quaternion:new THREE.Quaternion(),placed:false,marginKey:''};
        if(valid&&stored.shell){const shell=new THREE.Mesh(restoreCadGeometry(stored.shell),material.clone());shellMeshRef.current=shell;shellReportRef.current=stored.shellReport?{...stored.shellReport,qc:analyzeCadMesh(shell.geometry)}:null;scene.add(shell);}
        liveUnitRef.current=live;
        const history=unitHistoryRef.current.get(sourceFingerprintRef.current+'|'+live.key);undoRef.current=history?.undo??[];redoRef.current=history?.redo??[];lastHistoryActionRef.current=history?.last??null;emitHistoryState();syncVisualSettings();applyLayerDisplay();
        const registered=!valid&&(stored?.anchor.placed||unit.form_library_id||settingsRef.current.job_setup.complete)&&marginRef.current.length>=3?registerMargin():false;
        // A failed migration must never replace an already placed saved surface.
        if(cacheAction==='upgrade'&&stored?.anchor.placed&&!registered){
            mesh.geometry.dispose();mesh.geometry=restoreCadGeometry(stored.geometry);
            designBaseRef.current=Float32Array.from(stored.base);placementBaseRef.current=Float32Array.from(stored.placementBase??stored.base);
            anchorRef.current={position:new THREE.Vector3(...stored.anchor.position),quaternion:new THREE.Quaternion(...stored.anchor.quaternion),placed:true,marginKey:stored.anchor.marginKey??''};
            syncVisualSettings();applyLayerDisplay();
        }
        if(notify){if(anchorRef.current.placed)focusRestoration(true);onGeometryCommit?.('unit:'+live.id);}
    }
    function focusRestoration(animated:boolean){
        const mesh=shellMeshRef.current??designMeshRef.current,camera=cameraRef.current,controls=controlsRef.current;if(!mesh||!camera||!controls)return;
        mesh.updateMatrixWorld(true);
        const bounds=inspectionBounds(mesh),target=bounds.getCenter(new THREE.Vector3()),radius=bounds.getSize(new THREE.Vector3()).length()/2;
        const vertical=THREE.MathUtils.degToRad(camera.fov/2),halfAngle=Math.min(vertical,Math.atan(Math.tan(vertical)*Math.max(.1,camera.aspect)));
        const distance=Math.max(8,radius/Math.sin(halfAngle)*1.2);
        const offset=camera.position.clone().sub(controls.target).normalize().multiplyScalar(distance);moveCamera(target.clone().add(offset),target,animated);
    }
    function clearInspectionOverlays(){
        const cache=inspectionOverlayRef.current;
        for(const line of [cache.edges,cache.normals])if(line){sceneRef.current?.remove(line);line.geometry.dispose();(line.material as THREE.Material).dispose();}
        inspectionOverlayRef.current={mesh:null,edgeKey:'',normalKey:'',edges:null,normals:null};
        clearSectionOverlays();
    }
    function clearSectionOverlays(){
        const cache=sectionOverlayRef.current;
        for(const line of cache.lines){sceneRef.current?.remove(line);line.geometry.dispose();(line.material as THREE.Material).dispose();}
        if(cache.summary)sectionCallbackRef.current?.(null);
        sectionOverlayRef.current={key:'',lines:[],summary:null};
    }
    function inspectionCenter(){
        const mesh=shellMeshRef.current??designMeshRef.current;
        if(!mesh)return new THREE.Vector3();
        return inspectionBounds(mesh).getCenter(new THREE.Vector3());
    }
    function inspectionBounds(mesh:THREE.Mesh){
        const geometry=mesh.geometry,position=geometry.getAttribute('position'),version=position instanceof THREE.BufferAttribute?position.version:position.data.version;
        if(!geometry.boundingBox||inspectionBoundsVersionsRef.current.get(geometry)!==version){geometry.computeBoundingBox();inspectionBoundsVersionsRef.current.set(geometry,version);}
        mesh.updateMatrixWorld(true);
        return geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld);
    }
    function inspectionGeometryFingerprint(mesh:THREE.Mesh){
        const geometry=mesh.geometry,position=geometry.getAttribute('position'),index=geometry.index;
        const key=[position instanceof THREE.BufferAttribute?position.version:position.data.version,position.count,index?.version,index?.count].join('|');
        let cached=inspectionFingerprintsRef.current.get(geometry);
        if(!cached||cached.key!==key){cached={key,hash:cadInspectionGeometryFingerprint(geometry)};inspectionFingerprintsRef.current.set(geometry,cached);}
        return cached.hash;
    }
    function syncInspectionRendering(){
        const scene=sceneRef.current,camera=cameraRef.current,controls=controlsRef.current,renderer=rendererRef.current;
        if(!scene||!camera||!controls||!renderer)return;
        const active=settingsRef.current,config=normalizeCadInspection(active),mesh=shellMeshRef.current??designMeshRef.current;
        renderer.toneMappingExposure=config.inspection_exposure;
        const plane=clippingPlaneRef.current,section=viewModeRef.current==='section';
        if(section)plane.copy(cadSectionPlane({axis:active.section_axis??'insertion',insertionAxis:insertionAxisVector(active),inverted:active.section_inverted??false,offsetMm:active.section_offset_mm,center:active.section_centered?inspectionCenter():undefined}));
        for(const restoration of [designMeshRef.current,shellMeshRef.current])if(restoration?.material instanceof THREE.MeshStandardMaterial){
            const material=restoration.material,side=section||config.inspection_interior?THREE.DoubleSide:THREE.FrontSide;
            if(material.flatShading!==config.inspection_faceted||material.side!==side){material.flatShading=config.inspection_faceted;material.side=side;material.needsUpdate=true;}
        }
        // Context meshes share the same world-space cut; geometry and saved positions stay intact.
        for(const context of [sourceMeshRef.current,...Object.values(referenceMeshesRef.current),...[...frozenUnitsRef.current.values()].map(value=>value.mesh)]){
            if(context?.material instanceof THREE.MeshStandardMaterial){const material=context.material,hasCut=material.clippingPlanes?.length===1;if(hasCut!==section){material.clippingPlanes=section?[plane]:[];material.needsUpdate=true;}}
        }
        const flashlight=flashlightRef.current;
        if(flashlight){
            flashlight.visible=config.inspection_flashlight;
            flashlight.intensity=config.inspection_flashlight_intensity;
            flashlight.angle=THREE.MathUtils.degToRad(config.inspection_flashlight_cone_deg);
            flashlight.position.copy(camera.position);
            flashlight.target.position.copy(controls.target);
            const pointer=flashlightPointerRef.current;
            if(config.inspection_flashlight&&config.inspection_flashlight_target==='pointer'&&pointer){
                camera.updateMatrixWorld(true);
                const targets=[mesh,sourceMeshRef.current,...Object.values(referenceMeshesRef.current)].filter(visibleCadTarget) as THREE.Mesh[];
                const targetKey=targets.map(target=>{target.updateMatrixWorld(true);const positions=target.geometry.getAttribute('position');return [target.id,target.geometry.id,positions instanceof THREE.BufferAttribute?positions.version:positions.data.version,...target.matrixWorld.elements].join(',');}).join(';');
                const key=[pointer.x,pointer.y,...camera.matrixWorld.elements,...camera.projectionMatrix.elements,...controls.target.toArray(),targetKey,section,...plane.normal.toArray(),plane.constant].join('|');
                let aim=inspectionAimRef.current;
                if(!aim||aim.key!==key){
                    const raycaster=new THREE.Raycaster();raycaster.setFromCamera(pointer,camera);
                    const hit=raycaster.intersectObjects(targets,false).find(value=>!section||plane.distanceToPoint(value.point)>=-1e-6);
                    aim={key,point:hit?.point.clone()??raycaster.ray.at(camera.position.distanceTo(controls.target),new THREE.Vector3())};
                    inspectionAimRef.current=aim;
                }
                flashlight.target.position.copy(aim.point);
            }
            flashlight.target.updateMatrixWorld();
        }
        let cache=inspectionOverlayRef.current;
        if(cache.mesh!==mesh){clearInspectionOverlays();cache=inspectionOverlayRef.current;cache.mesh=mesh;}
        if(mesh){
            mesh.updateMatrixWorld(true);
            const position=mesh.geometry.getAttribute('position'),version=position instanceof THREE.BufferAttribute?position.version:position.data.version;
            const geometryKey=[mesh.geometry.id,version,position.count].join('|');
            if(config.inspection_edges&&cache.edgeKey!==geometryKey){
                if(cache.edges){scene.remove(cache.edges);cache.edges.geometry.dispose();(cache.edges.material as THREE.Material).dispose();}
                cache.edges=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,18),new THREE.LineBasicMaterial({color:0x30203e,transparent:true,opacity:.82,depthWrite:false}));
                cache.edges.name='DentAYA restoration edges';cache.edges.matrixAutoUpdate=false;cache.edges.renderOrder=2;scene.add(cache.edges);cache.edgeKey=geometryKey;
            }
            const normalKey=geometryKey+'|'+mesh.matrixWorld.elements.join('|');
            if(config.inspection_normals&&cache.normalKey!==normalKey){
                if(cache.normals){scene.remove(cache.normals);cache.normals.geometry.dispose();(cache.normals.material as THREE.Material).dispose();}
                cache.normals=new THREE.LineSegments(createCadNormalLines(mesh.geometry,{maxSamples:240,lengthMm:.8,matrixWorld:mesh.matrixWorld}),new THREE.LineBasicMaterial({color:0x69d7ed,depthWrite:false}));
                cache.normals.name='DentAYA sampled vertex normals';cache.normals.renderOrder=3;scene.add(cache.normals);cache.normalKey=normalKey;
            }
            if(cache.edges){cache.edges.matrix.copy(mesh.matrixWorld);cache.edges.matrixWorldNeedsUpdate=true;}
            for(const [line,enabled] of [[cache.edges,config.inspection_edges],[cache.normals,config.inspection_normals]] as const)if(line){line.visible=enabled&&mesh.visible;const material=line.material as THREE.LineBasicMaterial;const hasCut=material.clippingPlanes?.length===1;if(hasCut!==section){material.clippingPlanes=section?[plane]:[];material.needsUpdate=true;}}
        }
        const sectionCache=sectionOverlayRef.current;
        if(section&&config.inspection_section_contours){
            const targets=([['restoration',mesh],['source',sourceMeshRef.current]] as const).flatMap(([role,target])=>target?.visible?[[role,target] as const]:[]);
            const key=targets.map(([role,target])=>{target.updateMatrixWorld(true);const p=target.geometry.getAttribute('position'),i=target.geometry.index;return [role,target.geometry.id,p instanceof THREE.BufferAttribute?p.version:p.data.version,i?.version,...target.matrixWorld.elements].join(',');}).join(';')+'|'+[...plane.normal.toArray(),plane.constant].join(',');
            if(sectionCache.key!==key){
                for(const line of sectionCache.lines){scene.remove(line);line.geometry.dispose();(line.material as THREE.Material).dispose();}
                sectionCache.lines=[];const summary:CadSectionInspection={restoration:null,source:null};
                for(const [role,target] of targets){
                    const {segments,...report}=cadSectionContours(target.geometry,target.matrixWorld,plane);summary[role]=report;
                    const line=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(segments,3)),new THREE.LineBasicMaterial({color:role==='restoration'?0xffc35c:0x6be1ec,depthWrite:false,depthTest:false,transparent:true,opacity:.95,toneMapped:false}));
                    line.name='DentAYA '+role+' section contours';line.renderOrder=5;scene.add(line);sectionCache.lines.push(line);
                }
                sectionCache.key=key;if(JSON.stringify(sectionCache.summary)!==JSON.stringify(summary)){sectionCache.summary=summary;sectionCallbackRef.current?.(summary);}
            }
        }else if(sectionCache.key||sectionCache.summary)clearSectionOverlays();
        let placement:({placed:true}&ReturnType<typeof cadCervicalRegistration>)|{placed:false}={placed:false};
        const design=designMeshRef.current,placementBase=placementBaseRef.current;
        if(anchorRef.current.placed&&design&&placementBase){
            design.updateMatrixWorld(true);const positions=design.geometry.getAttribute('position'),version=positions instanceof THREE.BufferAttribute?positions.version:positions.data.version;
            const key=[design.geometry.id,version,marginKey(),...design.matrixWorld.elements].join('|');let cached=placementDiagnosticsRef.current;
            if(!cached||cached.key!==key){const center=cadMarginCenter(marginRef.current);if(center){cached={key,value:cadCervicalRegistration(design.geometry,placementBase,design.matrixWorld,marginRef.current,center)};placementDiagnosticsRef.current=cached;}}
            if(cached?.key===key)placement={placed:true,...cached.value};
        }
        // Diagnostics are read from the actual scene objects by the WebGL regression fixture.
        const material=mesh?.material instanceof THREE.MeshStandardMaterial?mesh.material:null;
        const restorationMaterial=material?{type:material.type,roughness:material.roughness,metalness:material.metalness,clearcoat:material instanceof THREE.MeshPhysicalMaterial?material.clearcoat:0}:null;
        const diagnostics=JSON.stringify({placement,restorationMaterial,sectionContours:sectionOverlayRef.current.summary,flashlight:flashlight?{visible:flashlight.visible,intensity:flashlight.intensity,angle:flashlight.angle,position:flashlight.position.toArray(),target:flashlight.target.position.toArray()}:null,edges:cache.edges?.visible?(cache.edges.geometry.getAttribute('position')?.count??0)/2:0,normals:cache.normals?.visible?(cache.normals.geometry.getAttribute('position')?.count??0)/2:0,faceted:material?.flatShading??false,side:material?.side,exposure:renderer.toneMappingExposure,section:section?{normal:plane.normal.toArray(),constant:plane.constant}:null,restorationCenter:mesh?inspectionCenter().toArray():null,camera:{position:camera.position.toArray(),target:controls.target.toArray(),up:camera.up.toArray()},geometry:{id:mesh?.geometry.id,vertices:mesh?.geometry.getAttribute('position')?.count,hash:mesh?inspectionGeometryFingerprint(mesh):null,sourceHash:sourceMeshRef.current?inspectionGeometryFingerprint(sourceMeshRef.current):null},history:{undo:undoRef.current.length,redo:redoRef.current.length}});
        if(diagnostics!==inspectionDiagnosticsRef.current){inspectionDiagnosticsRef.current=diagnostics;if(hostRef.current)hostRef.current.dataset.cadInspectionState=diagnostics;}
    }
    function marginKey(){
        let hash=2166136261;for(const p of marginRef.current)for(const value of [p.x,p.y,p.z]){hash^=Math.round(value*10000);hash=Math.imul(hash,16777619);}
        return (hash>>>0).toString(16)+':'+marginRef.current.length;
    }
    function registerMargin() {
        const mesh=designMeshRef.current;if(!mesh||marginRef.current.length<3)return false;
        const key=marginKey();if(anchorRef.current.placed&&anchorRef.current.marginKey===key)return true;
        const before=Float32Array.from(mesh.geometry.getAttribute('position').array),base=designBaseRef.current;
        let candidate=mesh.geometry.clone();
        const original=placementBaseRef.current??base;
        if(original?.length===before.length)candidate.getAttribute('position').array.set(original);
        const pristine=base?.length===before.length&&before.every((v,i)=>v===base[i]);
        const axis=insertionAxisVector(settingsRef.current);
        // Size a fresh anatomy from its local preparation, never the radius of the whole arch.
        if(!anchorRef.current.placed&&pristine&&!activeLibraryForm()){
            const probe=placeCadCrownOnMargin(candidate,marginRef.current,axis);if(!probe){candidate.dispose();return false;}
            const inverse=probe.quaternion.clone().invert(),bounds=new THREE.Box3().setFromPoints(marginRef.current.map(p=>new THREE.Vector3(p.x,p.y,p.z).sub(probe.center).applyQuaternion(inverse)));
            const span=bounds.getSize(new THREE.Vector3());
            candidate.dispose();candidate=geometryForUnit(Math.max(span.x,span.y)*2);
            const source=sourceKernelIndexRef.current?.meshRecord.positions,active=settingsRef.current;
            const type=activeCadUnit(active.job_setup)?.design_type;
            if(source&&type&&['anatomic_crown','coping','cutback_crown','temporary_crown'].includes(type))sizeCadRestorationAboveSource(candidate,source,marginRef.current,probe,{minimumAxialClearanceMm:active.minimum_thickness_mm,previewHeightScale:active.cusp_height*(1+active.occlusal_offset_mm*.04)});
        }
        const placementBase=Float32Array.from(candidate.getAttribute('position').array);
        const placement=placeCadCrownOnMargin(candidate,marginRef.current,axis);if(!placement){candidate.dispose();return false;}
        const registeredBase=Float32Array.from(candidate.getAttribute('position').array),position=candidate.getAttribute('position');
        if(!pristine&&base?.length===before.length&&position.array.length===before.length)for(let i=0;i<before.length;i++)position.array[i]+=before[i]-base[i];
        position.needsUpdate=true;candidate.computeVertexNormals();candidate.computeBoundingBox();candidate.computeBoundingSphere();
        const qc=analyzeCadMesh(candidate);if(!qc.watertight||qc.degenerateTriangles||qc.connectedComponents!==1){candidate.dispose();return false;}
        discardCrownShell(true);mesh.geometry.dispose();mesh.geometry=candidate;
        anchorRef.current={position:placement.position,quaternion:placement.quaternion,placed:true,marginKey:key};
        placementBaseRef.current=placementBase;designBaseRef.current=registeredBase;syncVisualSettings();applyLayerDisplay();focusRestoration(true);
        onGeometryCommit?.('margin-placement');return true;
    }
    function historyState(): CadHistoryState {
        return {
            undoCount: undoRef.current.length,
            redoCount: redoRef.current.length,
            lastAction: lastHistoryActionRef.current,
        };
    }
    function emitHistoryState() {
        onHistoryChange?.(historyState());
    }
    function snapshotGeometry(label = "CAD düzenleme") {
        const mesh = designMeshRef.current;
        if (!mesh)
            return;
        const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
        undoRef.current.push({
            positions: new Float32Array(position.array as ArrayLike<number>),
            label,
            at: Date.now(),
        });
        if (undoRef.current.length > 50)
            undoRef.current.shift();
        redoRef.current = [];
        lastHistoryActionRef.current = label;
        emitHistoryState();
    }
    function syncVisualSettings() {
        const sourceMesh = sourceMeshRef.current;
        const designMesh = designMeshRef.current;
        const shellMesh = shellMeshRef.current;
        const active = settingsRef.current;syncFrozenUnits();
        markerGroupRef.current?.traverse(node=>{if(node instanceof THREE.Mesh||node instanceof THREE.Line){const m=node.material;if(m instanceof THREE.MeshBasicMaterial||m instanceof THREE.LineBasicMaterial)m.color.set(cadRoleColor(active,'margin'));}});
        if (sourceMesh)
            sourceMesh.visible = active.show_scan;
        if (!designMesh)
            return;
        designMesh.visible = anchorRef.current.placed && active.show_design && !shellMesh;
        if (shellMesh)
            shellMesh.visible = anchorRef.current.placed && active.show_design;
        const anchor=anchorRef.current,base=cadCervicalBaseZ(placementBaseRef.current??designBaseRef.current??designMesh.geometry.getAttribute('position').array);
        const transform=cadRestorationTransform(anchor,base,{morphologyScale:active.morphology_scale,cuspHeight:active.cusp_height,proximalContactMm:active.proximal_contact_mm,occlusalOffsetMm:active.occlusal_offset_mm,translation:new THREE.Vector3(active.design_tx_mm,active.design_ty_mm,active.design_tz_mm),rotationZDeg:active.rotation_z_deg,marginOffsetMm:active.margin_offset_mm});
        designMesh.position.copy(transform.position);designMesh.quaternion.copy(transform.quaternion);designMesh.scale.copy(transform.scale);
        if (shellMesh) {
            shellMesh.position.copy(designMesh.position);
            shellMesh.rotation.copy(designMesh.rotation);
            shellMesh.scale.copy(designMesh.scale);
            const shellMaterial = shellMesh.material;
            if (shellMaterial instanceof THREE.MeshStandardMaterial) {
                shellMaterial.opacity = active.shell_preview_opacity;
                shellMaterial.transparent = active.shell_preview_opacity < 0.999;
                shellMaterial.needsUpdate = true;
            }
        }
        const material = designMesh.material;
        if (material instanceof THREE.MeshStandardMaterial) {
            material.opacity = active.opacity;
            material.transparent = active.opacity < 0.999;
            material.needsUpdate = true;
        }
        applyViewMode();
    }
    function applyViewMode() {
        const designMesh = shellMeshRef.current ?? designMeshRef.current;
        const sourceMesh = sourceMeshRef.current;
        if (!designMesh)
            return;
        const designGeometry = designMesh.geometry;
        const designMaterial = designMesh.material;
        if (!(designMaterial instanceof
            THREE.MeshStandardMaterial)) {
            return;
        }
        const sourceMaterial = sourceMesh?.material;
        const axis = insertionAxisVector(settingsRef.current);
        const mode = viewModeRef.current;
        // Reset all temporary analysis rendering.
        designGeometry.deleteAttribute("color");
        designMaterial.vertexColors =
            false;
        designMaterial.wireframe =
            false;
        designMaterial.clippingPlanes =
            [];
        const selectedStyle = toothSurface(toothAppearanceRef.current);
        const follow = settingsRef.current.render_palette==='natural' && workspacePreferencesRef.current.followToothStyle && (mode === 'natural' || mode === 'wireframe' || mode === 'section');
        designMaterial.color.set(cadRoleColor(settingsRef.current,'restoration',follow?selectedStyle.color:undefined));
        Object.assign(designMaterial,cadRestorationSurface(settingsRef.current.render_palette==='natural',mode==='natural',follow?selectedStyle:undefined));
        if (mode === 'natural' && follow && selectedStyle.contour)
            designMaterial.wireframe = true;
        designMaterial.opacity =
            settingsRef.current.opacity;
        designMaterial.transparent =
            settingsRef.current.opacity <
                0.999;
        designMaterial.side = THREE.FrontSide;
        designMaterial.depthWrite = true;
        if (sourceMesh &&
            sourceMaterial instanceof
                THREE.MeshStandardMaterial) {
            sourceMesh.geometry.deleteAttribute("color");
            sourceMaterial.vertexColors =
                false;
            sourceMaterial.wireframe =
                false;
            sourceMaterial.clippingPlanes =
                [];
            sourceMaterial.color.set(cadScanColor(settingsRef.current,sourceArchRef.current,currentWorkingJaw()));
            sourceMaterial.opacity =
                settingsRef.current.show_scan
                    ? 0.64
                    : 0;
            sourceMaterial.transparent =
                true;
            sourceMaterial.needsUpdate =
                true;
        }
        if (mode === "natural") {
            designMaterial.needsUpdate =
                true;
            return;
        }
        if (mode === "wireframe") {
            designMaterial.wireframe =
                true;
            if (sourceMaterial instanceof
                THREE.MeshStandardMaterial) {
                sourceMaterial.wireframe =
                    true;
                sourceMaterial.opacity =
                    0.28;
                sourceMaterial.needsUpdate =
                    true;
            }
            designMaterial.needsUpdate =
                true;
            return;
        }
        if (mode === "section") {
            designMaterial.side = THREE.DoubleSide;
            const plane = clippingPlaneRef.current;
            plane.copy(cadSectionPlane({axis:settingsRef.current.section_axis??'insertion',insertionAxis:axis,inverted:settingsRef.current.section_inverted??false,offsetMm:settingsRef.current.section_offset_mm,center:settingsRef.current.section_centered?inspectionCenter():undefined}));
            designMaterial.clippingPlanes =
                [plane];
            if (sourceMaterial instanceof
                THREE.MeshStandardMaterial) {
                sourceMaterial.clippingPlanes =
                    [plane];
                sourceMaterial.opacity =
                    0.82;
                sourceMaterial.needsUpdate =
                    true;
            }
            designMaterial.needsUpdate =
                true;
            return;
        }
        if (mode === "undercut" &&
            sourceMesh &&
            sourceMaterial instanceof
                THREE.MeshStandardMaterial) {
            const sourceGeometry = sourceMesh.geometry;
            const normal = sourceGeometry.getAttribute("normal") as THREE.BufferAttribute;
            const position = sourceGeometry.getAttribute("position") as THREE.BufferAttribute;
            const colors = new Float32Array(position.count * 3);
            for (let i = 0; i < position.count; i++) {
                const n = new THREE.Vector3(normal.getX(i), normal.getY(i), normal.getZ(i)).normalize();
                const facing = n.dot(axis);
                const color = undercutColor(facing);
                colors[i * 3] =
                    color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
            }
            sourceGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
            sourceMaterial.vertexColors =
                true;
            sourceMaterial.color.setHex(0xffffff);
            sourceMaterial.opacity =
                0.94;
            sourceMaterial.needsUpdate =
                true;
            designMaterial.opacity =
                0.18;
            designMaterial.transparent =
                true;
            designMaterial.needsUpdate =
                true;
            return;
        }
        if(mode==='contact'){
            const target=contactTarget();if(!target){designMaterial.needsUpdate=true;return;}
            designMesh.updateMatrixWorld(true);const positions=designGeometry.getAttribute('position'),version=positions instanceof THREE.BufferAttribute?positions.version:positions.data.version;
            const threshold=Math.max(.08,.18+settingsRef.current.proximal_contact_mm),key=[designGeometry.id,version,...designMesh.matrixWorld.elements,...target.offset.toArray(),threshold].join('|');
            let cache=contactColorsRef.current;if(!cache||cache.key!==key||cache.index!==target.index){cache={key,index:target.index,colors:buildContactColors(designMesh,target.index,threshold,target.offset)};contactColorsRef.current=cache;}
            designGeometry.setAttribute('color',new THREE.BufferAttribute(cache.colors,3));designMaterial.vertexColors=true;designMaterial.color.setHex(0xffffff);designMaterial.needsUpdate=true;return;
        }
        const position = designGeometry.getAttribute("position") as THREE.BufferAttribute;
        const colors = new Float32Array(position.count * 3);
        designMesh.updateMatrixWorld(true);
        const local = new THREE.Vector3();
        const world = new THREE.Vector3();
        for (let i = 0; i < position.count; i++) {
            local.set(position.getX(i), position.getY(i), position.getZ(i));
            world.copy(local);
            designMesh.localToWorld(world);
            const distance = nearestSourceDistance(world, sourceSpatialHashRef.current, sourceSpatialCellRef.current);
            const color = mode === "thickness"
                ? clearanceColor(distance, settingsRef.current
                    .minimum_thickness_mm)
                : contactDistanceColor(distance);
            colors[i * 3] =
                color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        designGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        designMaterial.vertexColors =
            true;
        designMaterial.color.setHex(0xffffff);
        designMaterial.needsUpdate =
            true;
    }
    function discardCrownShell(silent: boolean) {
        const shell = shellMeshRef.current;
        const scene = sceneRef.current;
        if (!shell)
            return;
        if (scene)
            scene.remove(shell);
        shell.geometry.dispose();
        const material = shell.material;
        if (material instanceof THREE.Material)
            material.dispose();
        shellMeshRef.current = null;
        shellReportRef.current = null;
        if (designMeshRef.current) {
            designMeshRef.current.visible = anchorRef.current.placed && settingsRef.current.show_design;
        }
        if (!silent)
            onStatus?.("Crown Shell preview temizlendi; anatomy mesh tekrar aktif.");
        applyViewMode();
    }
    function drawMargin(points: CadPoint[]) {
        const group = markerGroupRef.current;
        if (!group)
            return;
        clearGroup(group);
        for (const point of points) {
            const dot = new THREE.Mesh(new THREE.SphereGeometry(Math.max(radiusRef.current * 0.012, 0.12), 14, 10), new THREE.MeshBasicMaterial({ color: cadRoleColor(settingsRef.current,'margin') }));
            dot.position.set(point.x, point.y, point.z);
            group.add(dot);
        }
        if (points.length >= 2) {
            const vectors = points.map((point) => new THREE.Vector3(point.x, point.y, point.z));
            const material = new THREE.LineBasicMaterial({
                color: cadRoleColor(settingsRef.current,'margin'),
            });
            if (points.length >= 3) {
                const curve = new THREE.CatmullRomCurve3(vectors, true, "centripetal", 0.5);
                const samples = curve.getPoints(Math.max(48, points.length * 8));
                const geometry = new THREE.BufferGeometry().setFromPoints(samples);
                group.add(new THREE.LineLoop(geometry, material));
            }
            else {
                const geometry = new THREE.BufferGeometry().setFromPoints(vectors);
                group.add(new THREE.Line(geometry, material));
            }
        }
    }
    function drawMeasurements(values: CadMeasurement[]) {
        const group = measureGroupRef.current;
        if (!group)
            return;
        clearGroup(group);
        for (const measurement of values) {
            const a = new THREE.Vector3(measurement.a.x, measurement.a.y, measurement.a.z);
            const b = new THREE.Vector3(measurement.b.x, measurement.b.y, measurement.b.z);
            group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineBasicMaterial({ color: 0xffd36d })));
        }
    }
    function drawConnectors(connectors: CadConnector[]) {
        const group = connectorGroupRef.current;
        if (!group)
            return;
        clearGroup(group);
        for (const connector of connectors) {
            const quality = connectorQuality(connector, settingsRef.current.connector_min_area_mm2, settingsRef.current.connector_min_width_mm, settingsRef.current.connector_min_height_mm);
            const material = new THREE.MeshStandardMaterial({
                color: quality.passes ? 0x79dfc5 : 0xff8b78,
                roughness: 0.38,
                metalness: 0.02,
                transparent: true,
                opacity: 0.92,
            });
            group.add(createConnectorMesh(connector, material));
        }
    }
    function setCameraView(view: "iso" | "top" | "bottom" | "front" | "back" | "left" | "right") {
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        if (!camera || !controls)
            return;
        const target=anchorRef.current.placed?(designMeshRef.current?.position.clone()??new THREE.Vector3()):new THREE.Vector3();
        const r = anchorRef.current.placed?Math.max(18,(designMeshRef.current?.geometry.boundingSphere?.radius??5)*5):Math.max(radiusRef.current,4)*2.35;
        const positions: Record<"iso" | "top" | "bottom" | "front" | "back" | "left" | "right", [
            number,
            number,
            number
        ]> = {
            iso: [r * 0.78, r * 0.58, r],
            top: [0, r, 0.001],
            bottom: [0, -r, 0.001],
            front: [0, 0, r],
            back: [0, 0, -r],
            left: [-r, 0, 0],
            right: [r, 0, 0],
        };
        moveCamera(new THREE.Vector3(...positions[view]).add(target),target,true);
        playExperienceCue('view');
    }
    function moveCamera(position: THREE.Vector3, target: THREE.Vector3, animated: boolean) {
        const camera = cameraRef.current, controls = controlsRef.current;
        if (!camera || !controls)
            return;
        const duration = animated ? experienceDuration('camera') : 0;
        const damping = controls.enableDamping;
        controls.enableDamping = false;
        controls.update();
        controls.enableDamping = damping;
        if (duration && camera.position.distanceTo(controls.target) > .01) {
            cameraMotionRef.current = createCameraMotion(camera.position, controls.target, position, target, duration, performance.now());
        }
        else {
            cameraMotionRef.current = null;
            camera.position.copy(position);
            controls.target.copy(target);
            controls.update();
        }
    }
    function fitCamera(animated = false) {
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        if (!camera || !controls)
            return;
        const bounds = new THREE.Box3();
        for (const mesh of [sourceMeshRef.current, designMeshRef.current, shellMeshRef.current, ...Object.values(referenceMeshesRef.current)])
            if (mesh?.visible)
                bounds.expandByObject(mesh);
        const center = bounds.isEmpty() ? new THREE.Vector3() : bounds.getCenter(new THREE.Vector3());
        const radius = Math.max(bounds.isEmpty() ? radiusRef.current : bounds.getSize(new THREE.Vector3()).length() / 2, 4);
        const destination = new THREE.Vector3(center.x + radius * 1.9, center.y + radius * 1.45, center.z + radius * 2.15);
        camera.near = Math.max(radius / 150, 0.01);
        camera.far = Math.max(radius * 100, 1000);
        camera.updateProjectionMatrix();
        moveCamera(destination, center, animated);
        if (animated)
            playExperienceCue("view");
    }
    return (<UiNode as="div" className="cad-scene-viewport" style={styles.shell}>
      <UiNode as="div" ref={hostRef} style={styles.host}/>
      <UiNode as="div" style={styles.axis}><UiNode as="span" style={{ color: "#ff7c7c" }}>X</UiNode><UiNode as="span" style={{ color: "#7be38f" }}>Y</UiNode><UiNode as="span" style={{ color: "#77a9ff" }}>Z</UiNode></UiNode>
      {loading && <UiNode as="div" style={styles.overlay}><LoadingExperience compact title="Tarama ve CAD sahnesi hazırlanıyor…"/></UiNode>}
      {!source && !loading && <UiNode data-dy-copy-stack as="div" style={styles.overlay}><UiNode as="strong">Tasarıma başlamak için bir tarama veya model seç.</UiNode><UiNode as="span">Tarama Stüdyosu kayıtları otomatik görünür.</UiNode></UiNode>}
      {error && <UiNode data-dy-copy-stack as="div" style={styles.error}><UiNode as="strong">3D model açılamadı</UiNode><UiNode as="span">{error}</UiNode></UiNode>}
    </UiNode>);
});
export default DesignViewport;
function geometryTriangleCount(geometry: THREE.BufferGeometry) {
    if (geometry.index)
        return Math.floor(geometry.index.count / 3);
    const position = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
    return position ? Math.floor(position.count / 3) : 0;
}
function createAdaptiveScanPreviewGeometry(source: THREE.BufferGeometry, maxTriangles: number) {
    const nonIndexed = source.index ? source.toNonIndexed() : source;
    const position = nonIndexed.getAttribute("position") as THREE.BufferAttribute;
    const triangleCount = Math.floor(position.count / 3);
    if (triangleCount <= maxTriangles) {
        return nonIndexed;
    }
    const step = Math.max(1, Math.ceil(triangleCount / Math.max(maxTriangles, 1)));
    const keptTriangles = Math.ceil(triangleCount / step);
    const positions = new Float32Array(keptTriangles * 9);
    let write = 0;
    for (let triangle = 0; triangle < triangleCount; triangle += step) {
        const vertexOffset = triangle * 3;
        for (let corner = 0; corner < 3; corner += 1) {
            const vertex = vertexOffset + corner;
            positions[write++] = position.getX(vertex);
            positions[write++] = position.getY(vertex);
            positions[write++] = position.getZ(vertex);
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions.subarray(0, write), 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    if (nonIndexed !== source)
        nonIndexed.dispose();
    return geometry;
}
function cadToolInteractionLabel(tool: CadTool) {
    return ({
        orbit: "Döndür",
        margin: "Marjin",
        measure: "Ölç",
        add: "Ekle",
        reduce: "Çıkar",
        smooth: "Yumuşat",
        flatten: "Düzleştir",
        connector: "Connector",
    } as Record<CadTool, string>)[tool];
}
function insertionAxisVector(settings: CadSettings) {
    const axis = new THREE.Vector3(settings.insertion_axis_x, settings.insertion_axis_y, settings.insertion_axis_z);
    if (axis.lengthSq() <
        1e-8) {
        axis.set(0, 0, 1);
    }
    return axis.normalize();
}
function buildSpatialHash(geometry: THREE.BufferGeometry, requestedCellSize: number) {
    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    const cellSize = Math.max(requestedCellSize, 0.2);
    const map = new Map<string, THREE.Vector3[]>();
    const step = Math.max(1, Math.ceil(position.count /
        35000));
    for (let i = 0; i < position.count; i += step) {
        const point = new THREE.Vector3(position.getX(i), position.getY(i), position.getZ(i));
        const key = spatialKey(point, cellSize);
        const bucket = map.get(key);
        if (bucket) {
            bucket.push(point);
        }
        else {
            map.set(key, [point]);
        }
    }
    return {
        map,
        cellSize,
    };
}
function spatialKey(point: THREE.Vector3, cellSize: number) {
    return [
        Math.floor(point.x / cellSize),
        Math.floor(point.y / cellSize),
        Math.floor(point.z / cellSize),
    ].join(":");
}
function nearestSourceDistance(point: THREE.Vector3, hash: Map<string, THREE.Vector3[]>, cellSize: number) {
    if (!hash.size) {
        return Infinity;
    }
    const cx = Math.floor(point.x / cellSize);
    const cy = Math.floor(point.y / cellSize);
    const cz = Math.floor(point.z / cellSize);
    let best = Infinity;
    for (let radius = 0; radius <= 5; radius++) {
        let found = false;
        for (let x = cx - radius; x <= cx + radius; x++) {
            for (let y = cy - radius; y <= cy + radius; y++) {
                for (let z = cz - radius; z <= cz + radius; z++) {
                    if (radius > 0 &&
                        x > cx - radius &&
                        x < cx + radius &&
                        y > cy - radius &&
                        y < cy + radius &&
                        z > cz - radius &&
                        z < cz + radius) {
                        continue;
                    }
                    const bucket = hash.get(`${x}:${y}:${z}`);
                    if (!bucket) {
                        continue;
                    }
                    found = true;
                    for (const candidate of bucket) {
                        best =
                            Math.min(best, point.distanceTo(candidate));
                    }
                }
            }
        }
        if (found) {
            break;
        }
    }
    return best;
}
function contactDistanceColor(distance: number) {
    const color = new THREE.Color();
    if (!Number.isFinite(distance)) {
        color.setRGB(0.23, 0.52, 0.88);
        return color;
    }
    if (distance < 0.12) {
        color.setRGB(0.96, 0.22, 0.23);
    }
    else if (distance < 0.35) {
        color.setRGB(0.98, 0.72, 0.18);
    }
    else if (distance < 0.8) {
        color.setRGB(0.2, 0.8, 0.55);
    }
    else {
        color.setRGB(0.23, 0.52, 0.88);
    }
    return color;
}
function clearanceColor(distance: number, target: number) {
    const color = new THREE.Color();
    if (!Number.isFinite(distance)) {
        color.setRGB(0.22, 0.48, 0.82);
        return color;
    }
    const ratio = distance /
        Math.max(target, 0.05);
    if (ratio < 0.75) {
        color.setRGB(0.96, 0.2, 0.2);
    }
    else if (ratio < 1) {
        color.setRGB(0.98, 0.58, 0.16);
    }
    else if (ratio < 1.6) {
        color.setRGB(0.98, 0.82, 0.2);
    }
    else {
        color.setRGB(0.18, 0.8, 0.58);
    }
    return color;
}
function undercutColor(facing: number) {
    const color = new THREE.Color();
    if (facing < -0.15) {
        color.setRGB(0.93, 0.2, 0.24);
    }
    else if (facing < 0.18) {
        color.setRGB(0.98, 0.69, 0.18);
    }
    else {
        color.setRGB(0.2, 0.73, 0.5);
    }
    return color;
}
function toPoint(v: THREE.Vector3): CadPoint { return { x: v.x, y: v.y, z: v.z }; }
function clearGroup(group: THREE.Group) {
    while (group.children.length) {
        const child = group.children.pop();
        if (!child)
            continue;
        if ("geometry" in child && child.geometry instanceof THREE.BufferGeometry)
            child.geometry.dispose();
        const material = "material" in child ? child.material : null;
        if (material instanceof THREE.Material)
            material.dispose();
    }
}
const styles: Record<string, CSSProperties> = {
    shell: { position: "relative", width: "100%", height: "100%", minHeight: 540, overflow: "hidden", background: dy.bg },
    host: { width: "100%", height: "100%" },
    viewportBadge: { position: "absolute", top: 14, left: 14, padding: "7px 10px", borderRadius: 999, background: dy.surface, border: `1px solid ${dy.border}`, color: dy.accent, fontSize: 12, fontWeight: 900, letterSpacing: ".12em", pointerEvents: "none", opacity: .92 },
    axis: { position: "absolute", right: 13, bottom: 13, display: "flex", gap: 7, padding: "7px 9px", borderRadius: 10, background: dy.surface, fontSize: 12, fontWeight: 900, pointerEvents: "none" },
    overlay: { position: "absolute", inset: 0, display: "grid", placeItems: "center", alignContent: "center", gap: 8, padding: 30, textAlign: "center", background: dy.surface, color: dy.text, opacity: .94 },
    error: { position: "absolute", inset: 20, display: "grid", placeItems: "center", alignContent: "center", gap: 8, padding: 25, borderRadius: 18, background: "rgba(45,14,20,.88)", border: "1px solid rgba(255,120,140,.35)", color: "#ffd0d6", textAlign: "center" },
};
