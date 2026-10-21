"use client";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import UiMessage from "@/lib/i18n/UiMessage";
import UserText from '@/lib/i18n/UserText';
import UiNode from "@/lib/i18n/UiNode";
import { desktopShellText } from '@/lib/i18n/desktop-shell';
import { useTranslation } from '@/lib/i18n';
import { playExperienceCue } from '@/lib/experience-audio';
import { animateExperienceSurface } from '@/lib/experience-motion';
import { cadSetupFromCase } from "@/lib/cad-job-setup";
import { CAD_GUIDED_TASKS, cadStagePolicy, cadViewsForScene, cadTransitionBlock, cadTaskTransitionBlock, cadTaskForStage, cadTaskIndex, CAD_STAGE_ORDER, cadActivationAllowed, uniqueCadCommands, stagePanel, toolPanel, type CadPanelTab, type CadWorkflowStage } from '@/lib/cad-workflow';
import { LanguageSelect } from '../LanguageSettings';
import CadAyaPanel from "./CadAyaPanel";
import {cadStateToken,summarizeAyaReport,availableAyaTools,createAyaActionDispatcher,type AyaActionResult} from '@/lib/aya-cad-agent';
import type {AyaCadContext,AyaCadEvidence} from '@/lib/aya-cad-assistance';
import type {AyaProposal,AyaCadTool} from '../../../electron/aya/agent.cjs';
import {ayaAgentText} from '@/lib/i18n/aya-agent';
import {cadInspectionText} from '@/lib/i18n/cad-inspection';
import CadWorkbench from "./CadWorkbench";
import CadSceneControls from "./CadSceneControls";
import {allCadVisible,viewDefaults,workingJaw,EMPTY_CAD_SCENE,type CadSceneState} from '@/lib/cad-view-state';
import CadFloatingPanel from "./CadFloatingPanel";
import CadContextMenu from "./CadContextMenu";
import CadBrushPresets from "./CadBrushPresets";
import CadIcon, { type CadIconName } from "./CadIcon";
import CadToolPalette from "./CadToolPalette";
import CadInspectionPanel from './CadInspectionPanel';
import {CAD_INSPECTION_DEFAULTS,normalizeCadInspection} from '@/lib/cad-inspection';
import "./cad-workspace.css";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, } from "react";
import Link from "@/lib/i18n/UiLink";
import { BrandLogo } from "@/app/BrandLogo";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { dentayaError } from "@/lib/dentaya-errors";
import { acknowledgeCadRecoveryDraft, deleteCadRecoveryDraft, isCadRecoveryDraftAcknowledged, loadCadRecoveryDraft, makeCadRecoveryKey, pruneCadRecoveryDrafts, saveCadRecoveryDraft, type CadRecoveryDraft, } from "@/lib/cad-recovery";
import {encodeCadWorkspace,sameCadJson} from '@/lib/cad-project-state';
import { supabase } from "@/lib/supabase";
import { dy, useDentayaThemeRuntime, } from "@/app/dentaya-theme";
import ConnectionStatus from "@/app/ConnectionStatus";
import { DENTAYA_CAD_TOOL_MATRIX, cadAvailabilityLabel, cadInspectionCatalogCopy, type CadToolMatrixItem, } from "@/lib/dentaya-cad-tool-matrix";
import CadJobSetupPanel from "./CadJobSetupPanel";
import CadLibraryDialog from "../cad-library/CadLibraryDialog";
import type {CadLibraryForm} from "@/lib/cad-form-library";
import { activeCadUnit, buildDefaultCadJobSetup, cadAttachmentLabel, cadRestorationLabel, normalizeCadJobSetup, type CadJobSetup, type CadUnitSetup, } from "@/lib/cad-job-setup";
import DesignViewport, { type CadHistoryState, type CadKernelReport, type CadMeasurement, type CadPerformanceInfo, type CadPoint, type CadSettings, type CadTool, type CadViewMode, type DesignViewportHandle, type ModelSource, } from "./DesignViewport";
type Org = {
    id: string;
    name: string;
    org_type: "clinic" | "laboratory" | "courier";
};
type CaseRow = {
    id: string;
    case_number: string;
    patient_id: string;
    patient_reference: string;
    title: string;
    case_type: string;
    status: string;
    priority: string;
    due_date: string | null;
    tooth_codes: string[];
    clinical_notes?: string | null;
    material: string | null;
    shade: string | null;
};
type ScanRow = {
    id: string;
    scan_ref: string;
    patient_id: string;
    case_id: string | null;
    arch: string;
    captured_at: string;
    file_name: string | null;
    storage_bucket: string | null;
    storage_path: string | null;
    scanner_brand: string | null;
    scanner_model: string | null;
    scan_origin: "clinic" | "laboratory";
    scan_purpose: string | null;
};
type Attachment = {
    id: string;
    file_name: string;
    storage_bucket: string;
    storage_path: string;
    category: string;
    created_at: string;
};
type WorkflowStage = CadWorkflowStage | "approved";
type Project = {
    id: string;
    case_id: string;
    lab_org_id: string;
    source_scan_id: string | null;
    title: string;
    restoration_type: string;
    tooth_codes: string[];
    material: string | null;
    shade: string | null;
    workflow_stage: WorkflowStage;
    status: "draft" | "working" | "ready_for_review" | "revision" | "approved" | "archived";
    settings: Partial<CadSettings>;
    margin_points: CadPoint[];
    measurements: CadMeasurement[];
    updated_at: string;
};
type VersionRow = {
    id: string;
    version_number: number;
    status: string;
    note: string | null;
    created_at: string;
};
type SourceItem = {
    key: string;
    label: string;
    detail: string;
    source: ModelSource;
    scanId: string | null;
    origin: "clinic" | "laboratory" | "file";
    purpose: string;
};
type StepDefinition = {
    id: Exclude<WorkflowStage, "approved">;
    index: number;
    label: string;
    short: string;
    description: string;
};
type CadShortcutAction = "add" | "reduce" | "smooth" | "flatten" | "margin" | "measure" | "connector" | "orbit" | "symmetry";
type CadShortcutBindings = Record<CadShortcutAction, string>;
const DEFAULT_CAD_SHORTCUT_BINDINGS: CadShortcutBindings = {
    add: "1",
    reduce: "2",
    smooth: "3",
    flatten: "4",
    margin: "m",
    measure: "r",
    connector: "c",
    orbit: "o",
    symmetry: "s",
};
const CAD_SHORTCUT_ACTION_LABELS: Record<CadShortcutAction, string> = {
    add: "Katı Ekle",
    reduce: "Çıkar",
    smooth: "Yumuşat",
    flatten: "Düzleştir",
    margin: "Marjin",
    measure: "Ölçüm",
    connector: "Connector",
    orbit: "Döndür",
    symmetry: "Simetri aç / kapat",
};
function sanitizeCadShortcutBindings(input: Partial<CadShortcutBindings>): CadShortcutBindings {
    const next = { ...DEFAULT_CAD_SHORTCUT_BINDINGS };
    const used = new Set<string>();
    const fallbackPool = ["1", "2", "3", "4", "m", "r", "c", "o", "s", "5", "6", "7", "8", "9"];
    for (const action of Object.keys(DEFAULT_CAD_SHORTCUT_BINDINGS) as CadShortcutAction[]) {
        const candidate = typeof input[action] === "string"
            ? input[action]!.trim().slice(-1).toLowerCase()
            : "";
        const preferred = /^[a-z0-9]$/i.test(candidate) && candidate !== "h"
            ? candidate
            : DEFAULT_CAD_SHORTCUT_BINDINGS[action];
        const fallback = fallbackPool.find((key) => key !== "h" && !used.has(key))
            ?? DEFAULT_CAD_SHORTCUT_BINDINGS[action];
        next[action] = !used.has(preferred) ? preferred : fallback;
        used.add(next[action]);
    }
    return next;
}
export const DEFAULT_SETTINGS: CadSettings = {
    ...CAD_INSPECTION_DEFAULTS,
    job_setup: buildDefaultCadJobSetup([]),
    render_palette:'technical',auto_hide_antagonist:false,jaw_opening_mm:0,
    cement_gap_mm: 0.06,
    margin_offset_mm: 0.02,
    occlusal_offset_mm: 0,
    proximal_contact_mm: 0,
    minimum_thickness_mm: 0.8,
    smoothing: 0.35,
    opacity: 1,
    brush_radius_mm: 1.6,
    brush_strength_mm: 0.16,
    brush_shape: "round",
    brush_hardness: 0.2,
    brush_falloff: 1,
    symmetry_enabled: false,
    symmetry_axis: "x",
    symmetry_offset_mm: 0,
    preserve_shape: true,
    hold_cusp_tips: false,
    hold_equator: false,
    occlusal_only: false,
    show_scan: true,
    show_design: true,
    morphology_scale: 1,
    cusp_height: 1,
    design_tx_mm: 0,
    design_ty_mm: 0,
    design_tz_mm: 0,
    rotation_z_deg: 0,
    insertion_axis_x: 0,
    insertion_axis_y: 0,
    insertion_axis_z: 1,
    section_offset_mm: 0,
    margin_smoothing: 0.36,
    margin_projection_strength: 1,
    margin_zone_gap_mm: 0.02,
    axial_gap_mm: 0.06,
    radial_gap_mm: 0.08,
    gap_transition_mm: 1.2,
    milling_compensation_mm: 0.4,
    internal_fit_strength: 0.82,
    blockout_depth_mm: 0.35,
    connector_diameter_mm: 2.8,
    connector_shape: "round",
    connector_min_area_mm2: 7,
    connector_min_width_mm: 2.5,
    connector_min_height_mm: 2.5,
    shell_wall_thickness_mm: 0.9,
    shell_cervical_cut_ratio: 0.12,
    shell_fit_blend: 0.72,
    shell_preview_opacity: 0.96,
    shell_weld_tolerance_mm: 0.01,
    connectors: [],
};
const STEPS: StepDefinition[] = [
    {
        id: "scan",
        index: 1,
        short: "SCAN",
        label: "Tarama verisi",
        description: "Klinik ve laboratuvar taramalarını kontrol et, çalışma modelini seç ve sahneyi hazırla.",
    },
    {
        id: "margin",
        index: 2,
        short: "MARGIN",
        label: "Preparasyon marjini",
        description: "Preparasyon bitim çizgisini işaretle, margin offset ve cement gap değerlerini ayarla.",
    },
    {
        id: "design",
        index: 3,
        short: "ANATOMY",
        label: "Anatomi & şekillendirme",
        description: "Anatomi presetini seç, restorasyonu konumlandır ve serbest biçim araçlarıyla şekillendir.",
    },
    {
        id: "contacts",
        index: 4,
        short: "CONTACTS",
        label: "Temas & oklüzyon",
        description: "Proksimal ve oklüzal temas önizlemesini kontrol et; gerekli offsetleri ince ayarla.",
    },
    {
        id: "thickness",
        index: 5,
        short: "CHECK",
        label: "Kalınlık & kontrol",
        description: "Minimum kalınlık önizlemesini, ölçümleri ve son geometri kontrollerini tamamla.",
    },
    {
        id: "review",
        index: 6,
        short: "FINAL",
        label: "Son kontrol & gönder",
        description: "Versiyonu kaydet, STL çıktısını oluştur ve kliniğin onayına gönder.",
    },
];
export default function DesignStudioClient() {
    const { t: uiText, intlLocale, locale } = useTranslation();
    const inspectionCopy=cadInspectionText(locale);
    const desktopCopy = desktopShellText(locale);
    const cadCopy=ayaAgentText(locale);
    useDentayaThemeRuntime();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const viewportRef = useRef<DesignViewportHandle | null>(null);
    const submitLock = useRef(false);
    const caseSwitchLock=useRef(false),contextSequence=useRef({value:0});
    const temporaryOrbitToolRef = useRef<CadTool | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [org, setOrg] = useState<Org | null>(null);
    const [cases, setCases] = useState<CaseRow[]>([]);
    const [selectedCaseId, setSelectedCaseId] = useState("");
    const [scans, setScans] = useState<ScanRow[]>([]);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [versions, setVersions] = useState<VersionRow[]>([]);
    const [project, setProject] = useState<Project | null>(null);
    const [setupOpen, setSetupOpen] = useState(false);
    const [sourceKey, setSourceKey] = useState("");
    const [settings, setSettings] = useState<CadSettings>(DEFAULT_SETTINGS);
    const [marginPoints, setMarginPoints] = useState<CadPoint[]>([]);
    const [measurements, setMeasurements] = useState<CadMeasurement[]>([]);
    const [tool, setTool] = useState<CadTool>("orbit");
    const [viewMode, setViewMode] = useState<CadViewMode>("natural");
    const [workspaceMode, setWorkspaceMode] = useState<"wizard" | "expert">("wizard");
    const [focusMode, setFocusMode] = useState(false);
    const [toolPanelVisible, setToolPanelVisible] = useState(true);
    const [cadReady, setCadReady] = useState(false);
    const [panelTab, setPanelTab] = useState<CadPanelTab>("files");
    const [objectPanelCollapsed, setObjectPanelCollapsed] = useState(false);
    const [sceneState,setSceneState]=useState<CadSceneState>(EMPTY_CAD_SCENE);
    const [contextPoint, setContextPoint] = useState<{
        x: number;
        y: number;
    } | null>(null);
    const closeContextMenu = useCallback(() => setContextPoint(null), []);
    const referenceKeys = { upper: settings.reference_upper_key ?? '', lower: settings.reference_lower_key ?? '' };
    const restoreVisibility = () => setSettings(s => ({...s,...allCadVisible(),shell_preview_opacity:1}));
    const showRecordedBite=()=>{setSettings(s=>({...s,jaw_opening_mm:0,auto_hide_antagonist:false,show_scan:true,show_upper:true,show_lower:true,upper_opacity:(s.upper_opacity??0)>0?s.upper_opacity:1,lower_opacity:(s.lower_opacity??0)>0?s.lower_opacity:.5}));requestAnimationFrame(()=>viewportRef.current?.viewOcclusion());};
    useEffect(() => {
        const key = (e: KeyboardEvent) => {
            const element = e.target as HTMLElement;
            if (document.querySelector('dialog[open]')||element?.closest('input,textarea,select,[contenteditable=true]'))
                return;
            if (!e.altKey || e.ctrlKey || e.metaKey || !['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code))
                return;
            e.preventDefault();
            const field = ({ Digit1: 'show_upper', Digit2: 'show_lower', Digit3: 'show_design', Digit4: 'show_scan' } as const)[e.code as 'Digit1'];
            setSettings(s => ({ ...s, [field]: !(s[field] ?? true) }));
        };
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    }, []);
    const [toolLibraryOpen, setToolLibraryOpen] = useState(false);
    const [inspectionOpen,setInspectionOpen] = useState(false);
    const [inspectionTab,setInspectionTab] = useState<'light'|'surface'|'section'|'camera'>('light');
    const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
    const [shortcutEditOpen, setShortcutEditOpen] = useState(false);
    const [shortcutBindings, setShortcutBindings] = useState<CadShortcutBindings>(DEFAULT_CAD_SHORTCUT_BINDINGS);
    const [toolSearch, setToolSearch] = useState("");
    const [toolCategory, setToolCategory] = useState("Tümü");
    const [loading, setLoading] = useState(true);
    const [contextLoading, setContextLoading] = useState(false);
    const [contextLoadError,setContextLoadError]=useState('');
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState("DentAYA CAD hazırlanıyor…");
    const [blocked, setBlocked] = useState("");
    const [kernelReport, setKernelReport] = useState<CadKernelReport | null>(null);
    const [blockoutPreview, setBlockoutPreview] = useState(false);
    const [geometryRevision, setGeometryRevision] = useState(0);
    const [historyState, setHistoryState] = useState<CadHistoryState>({
        undoCount: 0,
        redoCount: 0,
        lastAction: null,
    });
    const [performanceInfo, setPerformanceInfo] = useState<CadPerformanceInfo | null>(null);
    const [recoveryCandidate, setRecoveryCandidate] = useState<CadRecoveryDraft | null>(null);
    const [recoveryLookupKey, setRecoveryLookupKey] = useState<string | null>(null);
    const [recoveryDecisionPending, setRecoveryDecisionPending] = useState(false);
    const savedVersionRef=useRef(new Map<string,string>());
    const saveChainRef=useRef<Promise<boolean>>(Promise.resolve(true));
    const savedSettingsRef=useRef<{projectId:string;settings:CadSettings}|null>(null);
    const dirtyRevisionRef=useRef(0),cleanRevisionRef=useRef(-1);
    const [hasUnsavedChanges,setHasUnsavedChanges]=useState(true);
    const [ayaOpen,setAyaOpen]=useState(false);
    const [ayaEvidence,setAyaEvidence]=useState<AyaCadEvidence|null>(null),[ayaEpoch,setAyaEpoch]=useState(0);
    const ayaContextRef=useRef<AyaCadContext|null>(null),ayaDispatch=useRef(createAyaActionDispatcher());

    const [libraryTarget,setLibraryTarget]=useState<string|null>(null);
    const [exiting,setExiting]=useState(false),[exitFailure,setExitFailure]=useState(false);
    const localExitReadyRef=useRef(false);
    const exitDestinationRef=useRef('/lab');
    const navigationExitRef=useRef<((destination:string)=>Promise<boolean>)|null>(null);
    const saveDialogRef=useRef<HTMLDialogElement>(null);
    useEffect(()=>{const dialog=saveDialogRef.current;if(!dialog)return;if(exiting||exitFailure||submitting||contextLoading){if(!dialog.open)dialog.showModal();}else if(dialog.open)dialog.close();},[exiting,exitFailure,submitting,contextLoading]);
    const [localRecoverySavedAt, setLocalRecoverySavedAt] = useState<number | null>(null);
    const selectedCase = useMemo(() => cases.find((item) => item.id === selectedCaseId) ?? null, [cases, selectedCaseId]);
    const jobSetup = settings.job_setup;
    const activeJobUnit = activeCadUnit(jobSetup);
    const recoveryKey = useMemo(() => project?.id && sourceKey ? makeCadRecoveryKey(project.id, sourceKey) : "", [project?.id, sourceKey]);
    const recoveryLookupReady = recoveryLookupKey === recoveryKey;
    const sources = useMemo<SourceItem[]>(() => {
        const scanSources: SourceItem[] = scans
            .filter((scan) => Boolean(scan.storage_path))
            .map((scan) => ({
            key: `scan:${scan.id}`,
            label: `${scan.scan_origin === "laboratory" ? "Lab taraması" : "Klinik taraması"} · ${purposeLabel(scan.scan_purpose)}`,
            detail: `${scan.scan_ref} · ${archLabel(scan.arch)} · ${formatDate(scan.captured_at, intlLocale())}`,
            source: {
                bucket: scan.storage_bucket,
                path: scan.storage_path!,
                fileName: scan.file_name ?? scan.scan_ref,
                isDemo: scan.storage_bucket === "public-demo",
                arch: scan.arch,
            },
            scanId: scan.id,
            origin: scan.scan_origin,
            purpose: scan.scan_purpose ?? "scan",
        }));
        const fileSources: SourceItem[] = attachments
            .filter((attachment) => /\.(stl|ply)$/i.test(attachment.file_name))
            .map((attachment) => ({
            key: `file:${attachment.id}`,
            label: "Vaka dosyası",
            detail: attachment.file_name,
            source: {
                bucket: attachment.storage_bucket,
                path: attachment.storage_path,
                fileName: attachment.file_name,
            },
            scanId: null,
            origin: "file",
            purpose: "file",
        }));
        return [...scanSources, ...fileSources];
    }, [scans, attachments, intlLocale]);
    const activeSource = sources.find((item) => item.key === sourceKey) ?? null;
    const referenceSources = useMemo(() => ({
        upper: referenceKeys.upper === 'none' ? null : (sources.find(s => referenceKeys.upper ? s.key === referenceKeys.upper : s.source.arch === 'upper')?.source ?? null),
        lower: referenceKeys.lower === 'none' ? null : (sources.find(s => referenceKeys.lower ? s.key === referenceKeys.lower : s.source.arch === 'lower')?.source ?? null),
    }), [sources, referenceKeys.upper, referenceKeys.lower]);
    const displaySource = activeSource ? { ...activeSource.source, arch: referenceSources.upper?.path === activeSource.source.path && referenceSources.upper?.bucket === activeSource.source.bucket ? 'upper' : referenceSources.lower?.path === activeSource.source.path && referenceSources.lower?.bucket === activeSource.source.bucket ? 'lower' : activeSource.source.arch } : null;
    useEffect(() => {
        setBlockoutPreview(false);
        setKernelReport(null);
        setPerformanceInfo(null);
        setHistoryState({ undoCount: 0, redoCount: 0, lastAction: null });
    }, [sourceKey]);
    const activeStepId = project?.workflow_stage === "approved"
        ? "review"
        : project?.workflow_stage ?? "scan";
    const activeStepIndex = STEPS.findIndex((step) => step.id === activeStepId);
    const activeStep = STEPS[Math.max(0, activeStepIndex)] ?? STEPS[0];
    const activeTaskIndex = cadTaskIndex(activeStep.id, panelTab);
    const activeTaskLabel = cadTaskLabel(panelTab);
    const previousExperienceState = useRef({ tool, viewMode, stage: activeStepId, project: project?.id });
    useEffect(() => {
        const previous = previousExperienceState.current;
        previousExperienceState.current = { tool, viewMode, stage: activeStepId, project: project?.id };
        if (!project?.id || previous.project !== project.id)
            return;
        if (previous.tool !== tool)
            playExperienceCue('tool');
        else if (previous.viewMode !== viewMode || previous.stage !== activeStepId)
            playExperienceCue('view');
        if (previous.tool !== tool || previous.stage !== activeStepId)
            animateExperienceSurface(document.querySelector<HTMLElement>('.cad-viewport-toolbar'));
    }, [tool, viewMode, activeStepId, project?.id]);
    const saveStateRef=useRef({project,user,selectedCase,settings,marginPoints,measurements,activeSource,sourceKey,panelTab,workspaceMode,recoveryKey,contextLoading,recoveryLookupReady,recoveryDecisionPending});
    saveStateRef.current={project,user,selectedCase,settings,marginPoints,measurements,activeSource,sourceKey,panelTab,workspaceMode,recoveryKey,contextLoading,recoveryLookupReady,recoveryDecisionPending};
    useEffect(()=>{dirtyRevisionRef.current++;setHasUnsavedChanges(true);},[settings,marginPoints,measurements,geometryRevision,sourceKey,project?.workflow_stage,project?.status]);
    useEffect(()=>{const guard=(event:BeforeUnloadEvent)=>{if(saveStateRef.current.project&&dirtyRevisionRef.current!==cleanRevisionRef.current){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[]);
    const gates = useMemo(() => ({
        source: Boolean(activeSource),
        margin: marginPoints.length >= 3,
        design: Boolean(activeSource),
        contacts: Boolean(activeSource),
        thickness: Boolean(activeSource),
        review: Boolean(activeSource) && marginPoints.length >= 3,
    }), [activeSource, marginPoints.length]);
    const progress = Math.round((STEPS.filter((step) => {
        if (step.id === "scan")
            return gates.source;
        if (step.id === "margin")
            return gates.margin;
        if (step.id === "design")
            return activeStepIndex >= 2 || project?.status === "approved";
        if (step.id === "contacts")
            return activeStepIndex >= 3 || project?.status === "approved";
        if (step.id === "thickness")
            return activeStepIndex >= 4 || project?.status === "approved";
        return project?.status === "ready_for_review" || project?.status === "approved";
    }).length /
        STEPS.length) *
        100);
    const hasBridge = jobSetup.units.length > 1;
    const stagePolicy = useMemo(() => cadStagePolicy(activeStep.id, workspaceMode, hasBridge, panelTab), [activeStep.id, workspaceMode, hasBridge, panelTab]);
    const activeTools = stagePolicy.tools;
    const activeViews = useMemo(()=>cadViewsForScene(stagePolicy.views,sceneState.antagonistReady),[stagePolicy.views,sceneState.antagonistReady]);
    const visiblePanelTabs = stagePolicy.tabs.flatMap(id => CAD_PANEL_TABS.filter(tab => tab.id === id));
    const availableCommands = useMemo(() => uniqueCadCommands(DENTAYA_CAD_TOOL_MATRIX).map(item => cadInspectionCatalogCopy(item,locale)).map(item => {
        const step = item.activation?.startsWith('stage:') ? STEPS.find(step => step.id === item.activation?.slice(6)) : null;
        return step ? { ...item, label: step.label, description: step.description } : item;
    }).filter(item => cadActivationAllowed(item.activation, activeStep.id, workspaceMode, hasBridge, panelTab)&&(!item.activation?.startsWith('view:')||activeViews.includes(item.activation.slice(5) as CadViewMode))), [activeStep.id, workspaceMode, hasBridge, panelTab,activeViews,locale]);
    const filteredToolMatrix = useMemo(() => {
        const query = toolSearch.trim().toLocaleLowerCase(intlLocale());
        return availableCommands.filter((item) => {
            const categoryOk = toolCategory === "Tümü" || item.category === toolCategory;
            const queryOk = !query || `${uiText(item.label)} ${uiText(item.description)} ${uiText(item.group)} ${uiText(item.category)} ${item.label} ${item.description}`
                .toLocaleLowerCase(intlLocale())
                .includes(query);
            return categoryOk && queryOk && item.availability === "live" && Boolean(item.activation);
        });
    }, [availableCommands, toolCategory, toolSearch, uiText, intlLocale]);
    useEffect(() => {
        // A delayed save acknowledgement may contain the previous task.
        // Keep the panel on the current editable task while that save completes.
        const task = cadTaskForStage(activeStepId, settings.guided_task);
        setPanelTab(task);
        const policy = cadStagePolicy(activeStepId, 'wizard', true, task);
        setTool(policy.tool);
        setViewMode(policy.view);
        temporaryOrbitToolRef.current = null;
    }, [activeStepId, project?.id, settings.guided_task]);
    useEffect(() => {
        const closeOutside = (event: PointerEvent) => {
            if (!(event.target as HTMLElement)?.closest('.cad-chrome-menu')) closeChromeMenus();
        };
        const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') closeChromeMenus(); };
        document.addEventListener('pointerdown', closeOutside);
        document.addEventListener('keydown', closeOnEscape);
        return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeOnEscape); };
    }, []);
    useEffect(() => {
        function handleCadShortcut(event: KeyboardEvent) {
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "t") {
                event.preventDefault();
                setToolLibraryOpen(true);
                return;
            }
            if (event.key === "Escape") {
                setInspectionOpen(false);
                if (toolLibraryOpen)
                    setToolLibraryOpen(false);
                if (shortcutHelpOpen)
                    setShortcutHelpOpen(false);
            }
        }
        window.addEventListener("keydown", handleCadShortcut);
        return () => window.removeEventListener("keydown", handleCadShortcut);
    }, [shortcutHelpOpen, toolLibraryOpen]);
    useEffect(() => {
        if (!activeTools.includes(tool)) {
            setTool("orbit");
        }
        if (!activeViews.includes(viewMode)) {
            setViewMode("natural");
        }
        if (!stagePolicy.tabs.includes(panelTab)) setPanelTab(cadTaskForStage(activeStepId, settings.guided_task));
    }, [activeTools, activeViews, tool, viewMode, stagePolicy.tabs, panelTab, activeStepId, settings.guided_task]);
    useEffect(() => {
        let active = true;
        async function initialize() {
            const { data: sessionData } = await supabase.auth.getSession();
            if(!active)return;
            const currentUser = sessionData.session?.user;
            if (!currentUser) {
                router.replace("/workspace");
                return;
            }
            setUser(current=>current?.id===currentUser.id?current:currentUser);
            const { data: membership, error: membershipError } = await supabase
                .from("memberships")
                .select("organization_id")
                .eq("user_id", currentUser.id)
                .eq("status", "active")
                .limit(1)
                .maybeSingle();
            if(!active)return;
            if (membershipError || !membership) {
                setBlocked(dentayaError(membershipError, "Aktif kurum bulunamadı."));
                setLoading(false);
                return;
            }
            const { data: orgData, error: orgError } = await supabase
                .from("organizations")
                .select("id,name,org_type")
                .eq("id", membership.organization_id)
                .maybeSingle();
            if(!active)return;
            if (orgError || !orgData) {
                setBlocked(dentayaError(orgError, "Kurum bilgisi alınamadı."));
                setLoading(false);
                return;
            }
            const currentOrg = orgData as Org;
            setOrg(current=>current&&sameCadJson(current,currentOrg)?current:currentOrg);
            if (currentOrg.org_type !== "laboratory") {
                setBlocked("DentAYA CAD çalışma alanı laboratuvar CAD kullanıcılarına aittir. Klinik tasarımı vaka ekranından inceler, onaylar veya revizyon ister.");
                setLoading(false);
                return;
            }
            const { data: caseData, error: caseError } = await supabase
                .from("cases")
                .select("id,case_number,patient_id,patient_reference,title,case_type,status,priority,due_date,tooth_codes,material,shade,clinical_notes")
                .eq("lab_org_id", currentOrg.id)
                .neq("status", "cancelled")
                .order("updated_at", { ascending: false });
            if(!active)return;
            if (caseError) {
                setBlocked(dentayaError(caseError, "Laboratuvar vakaları yüklenemedi."));
                setLoading(false);
                return;
            }
            if (!active)
                return;
            const rows = (caseData ?? []) as CaseRow[];
            // Query navigation must not replace unchanged case objects and reload the live CAD scene.
            setCases(current=>{
                const existing=new Map(current.map(item=>[item.id,item]));
                const next=rows.map(row=>{const previous=existing.get(row.id);return previous&&sameCadJson(previous,row)?previous:row;});
                return next.length===current.length&&next.every((row,index)=>row===current[index])?current:next;
            });
            const requested = searchParams.get("case") ?? "";
            const nextId = rows.some((item) => item.id === requested)
                ? requested
                : rows[0]?.id ?? "";
            setSelectedCaseId(nextId);
            setLoading(false);
        }
        void initialize();
        return () => {
            active = false;
        };
    }, [router, searchParams]);
    const loadCaseContext=useCallback(async(activeCase: CaseRow, activeOrg: Org, activeUser: User)=>{
        const sequence=++contextSequence.current.value,previousProject=saveStateRef.current.project;
        const fail=(error:unknown,fallback:string)=>{
            if(sequence!==contextSequence.current.value)return;
            const message=dentayaError(error,fallback);setStatus(message);setContextLoadError(message);setContextLoading(false);
            if(previousProject&&previousProject.case_id!==activeCase.id){setSelectedCaseId(previousProject.case_id);router.replace(`${pathname==='/cad'?'/cad':'/design'}?case=${previousProject.case_id}`);}
        };
        setContextLoading(true);
        setStatus(`${activeCase.case_number} yükleniyor…`);
        const [scanResult, attachmentResult, projectResult] = await Promise.all([
            supabase
                .from("scan_sessions")
                .select("id,scan_ref,patient_id,case_id,arch,captured_at,file_name,storage_bucket,storage_path,scanner_brand,scanner_model,scan_origin,scan_purpose")
                .eq("patient_id", activeCase.patient_id)
                .order("captured_at", { ascending: false }),
            supabase
                .from("attachments")
                .select("id,file_name,storage_bucket,storage_path,category,created_at")
                .eq("case_id", activeCase.id)
                .order("created_at", { ascending: false }),
            supabase
                .from("design_projects")
                .select("id,case_id,lab_org_id,source_scan_id,title,restoration_type,tooth_codes,material,shade,workflow_stage,status,settings,margin_points,measurements,updated_at")
                .eq("case_id", activeCase.id)
                .maybeSingle(),
        ]);
        if(sequence!==contextSequence.current.value)return;
        const contextError = scanResult.error ?? attachmentResult.error ?? projectResult.error;
        if (contextError) {
            fail(contextError,"Vaka verileri alınamadı. Bağlantıyı kontrol edip vakayı yeniden açın.");
            return;
        }
        const scanRows = (scanResult.data ?? []) as ScanRow[];
        const fileRows = (attachmentResult.data ?? []) as Attachment[];
        setScans(scanRows);
        setAttachments(fileRows);
        let nextProject = projectResult.data as Project | null;
        if (!nextProject) {
            const preferredScan = scanRows.find((scan) => scan.case_id === activeCase.id &&
                scan.storage_path &&
                scan.scan_purpose === "master_model") ??
                scanRows.find((scan) => scan.case_id === activeCase.id && scan.storage_path) ??
                scanRows.find((scan) => scan.storage_path) ??
                null;
            const { data: created, error: createError } = await supabase
                .from("design_projects")
                .insert({
                case_id: activeCase.id,
                lab_org_id: activeOrg.id,
                source_scan_id: preferredScan?.id ?? null,
                title: `${activeCase.case_number} · ${activeCase.title}`,
                restoration_type: activeCase.case_type,
                tooth_codes: activeCase.tooth_codes,
                material: activeCase.material,
                shade: activeCase.shade,
                workflow_stage: "scan",
                status: "working",
                settings: {
                    ...DEFAULT_SETTINGS,
                    job_setup: cadSetupFromCase(activeCase.tooth_codes, activeCase.case_type, activeCase.material, activeCase.clinical_notes),
                },
                margin_points: [],
                measurements: [],
                created_by: activeUser.id,
                updated_by: activeUser.id,
            })
                .select("id,case_id,lab_org_id,source_scan_id,title,restoration_type,tooth_codes,material,shade,workflow_stage,status,settings,margin_points,measurements,updated_at")
                .single();
            if(sequence!==contextSequence.current.value)return;
            if (createError || !created) {
                fail(createError,"CAD projesi açılamadı.");
                return;
            }
            nextProject = created as Project;
        }
        savedVersionRef.current.set(nextProject.id,nextProject.updated_at);
        setProject(nextProject);
        const normalizedJobSetup = normalizeCadJobSetup(nextProject.settings?.job_setup, activeCase.tooth_codes, activeCase.case_type, activeCase.material);
        setSettings({
            ...DEFAULT_SETTINGS,
            ...viewDefaults(nextProject.settings,workingJaw(activeCadUnit(normalizedJobSetup)?.tooth_code)),
            ...(nextProject.settings ?? {}),
            job_setup: normalizedJobSetup,
        });
        setSetupOpen(!normalizedJobSetup.complete);
        const unitId=normalizedJobSetup.active_unit_id??'';
        const initialMargin=nextProject.settings?.unit_margins?.[unitId]??(Array.isArray(nextProject.margin_points)?nextProject.margin_points:[]);
        setMarginPoints(initialMargin);
        setMeasurements(Array.isArray(nextProject.measurements) ? nextProject.measurements : []);
        const preferredKey = nextProject.source_scan_id
            ? `scan:${nextProject.source_scan_id}`
            : scanRows.find((scan) => scan.case_id === activeCase.id &&
                scan.storage_path &&
                scan.scan_purpose === "master_model")
                ? `scan:${scanRows.find((scan) => scan.case_id === activeCase.id &&
                    scan.storage_path &&
                    scan.scan_purpose === "master_model")!.id}`
                : scanRows.find((scan) => scan.case_id === activeCase.id && scan.storage_path)
                    ? `scan:${scanRows.find((scan) => scan.case_id === activeCase.id && scan.storage_path)!.id}`
                    : fileRows.find((file) => /\.(stl|ply)$/i.test(file.file_name))
                        ? `file:${fileRows.find((file) => /\.(stl|ply)$/i.test(file.file_name))!
                            .id}`
                        : "";
        setSourceKey(preferredKey);
        const { data: versionData } = await supabase
            .from("design_versions")
            .select("id,version_number,status,note,created_at")
            .eq("project_id", nextProject.id)
            .order("version_number", { ascending: false });
        if(sequence!==contextSequence.current.value)return;
        setVersions((versionData ?? []) as VersionRow[]);
        setStatus(`${activeCase.case_number} · çalışma alanı hazır`);
        setContextLoading(false);
    },[pathname,router]);
    useEffect(() => {
        if (!selectedCase || !org || !user)
            return;
        void loadCaseContext(selectedCase, org, user);
        const requestState=contextSequence.current;
        return()=>{requestState.value++;};
    }, [selectedCase, org, user,loadCaseContext]);
    useEffect(() => {
        if (!project || contextLoading || !cadReady || exiting || submitting || !recoveryLookupReady || recoveryDecisionPending)
            return;
        const timer = window.setTimeout(() => {
            void saveProject(false);
        }, 900);
        return () => window.clearTimeout(timer);
        // Autosave uses the latest editable snapshot; including saveProject would reschedule on every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        settings,
        marginPoints,
        measurements,
        geometryRevision,
        cadReady,
        contextLoading,
        exiting,
        submitting,
        recoveryLookupReady,
        recoveryDecisionPending,
        project?.workflow_stage,
        project?.status,
        sourceKey,
    ]);
    useEffect(() => {
        let cancelled = false;
        const recoveryProject = saveStateRef.current.project;
        setRecoveryCandidate(null);
        setRecoveryDecisionPending(false);
        setRecoveryLookupKey(null);
        setLocalRecoverySavedAt(null);
        if (!recoveryKey || !recoveryProject?.id || !sourceKey) {
            setRecoveryLookupKey(recoveryKey);
            return () => {
                cancelled = true;
            };
        }
        void Promise.all([
            loadCadRecoveryDraft(recoveryKey),
            pruneCadRecoveryDrafts().catch(() => undefined),
        ]).then(async ([draft]) => {
            if (cancelled)
                return;
            if (draft &&
                draft.projectId === recoveryProject.id &&
                draft.sourceKey === sourceKey &&
                draft.geometry.length > 0 &&
                !await isCadRecoveryDraftAcknowledged(draft, recoveryProject)) {
                if (cancelled) return;
                setRecoveryCandidate(draft);
                setRecoveryDecisionPending(true);
                setLocalRecoverySavedAt(draft.savedAt);
            }
            if (!cancelled) setRecoveryLookupKey(recoveryKey);
        }).catch(() => {
            if (!cancelled)
                setRecoveryLookupKey(recoveryKey);
        });
        return () => {
            cancelled = true;
        };
    }, [project?.id, recoveryKey, sourceKey]);
    useEffect(() => {
        if (!recoveryKey ||
            !project ||
            !sourceKey ||
            !cadReady ||
            contextLoading ||
            !recoveryLookupReady ||
            recoveryDecisionPending) {
            return;
        }
        const timer = window.setTimeout(() => {
            if (exiting || submitting || dirtyRevisionRef.current===cleanRevisionRef.current) return;
            const geometry = viewportRef.current?.captureRecoveryGeometry();
            if (!geometry?.length)
                return;
            const savedAt = Date.now();
            void saveCadRecoveryDraft({
                key: recoveryKey,
                projectId: project.id,
                sourceKey,
                savedAt,
                geometry,
                workspace: {
                    settings,
                    marginPoints,
                    measurements,
                    designSnapshot:viewportRef.current?.captureWorkspace()??undefined,
                    workflowStage: project.workflow_stage,
                    projectStatus: project.status,
                },
            }).then(() => {
                setLocalRecoverySavedAt(savedAt);
            }).catch(() => {
                // Local recovery is best-effort and must never block CAD editing.
            });
        }, 650);
        return () => window.clearTimeout(timer);
    }, [
        contextLoading,
        cadReady,
        exiting,
        submitting,
        geometryRevision,
        marginPoints,
        measurements,
        project,
        recoveryDecisionPending,
        recoveryKey,
        recoveryLookupReady,
        settings,
        sourceKey,
    ]);
    useEffect(() => {
        if (!user?.id || typeof window === "undefined")
            return;
        const key = `dentaya:cad-shortcuts:${user.id}`;
        try {
            const raw = window.localStorage.getItem(key);
            const parsed = raw ? JSON.parse(raw) as Partial<CadShortcutBindings> : {};
            setShortcutBindings(sanitizeCadShortcutBindings(parsed));
        }
        catch {
            setShortcutBindings(DEFAULT_CAD_SHORTCUT_BINDINGS);
        }
    }, [user?.id]);
    useEffect(() => {
        function isTypingTarget(target: EventTarget | null) {
            const element = target as HTMLElement | null;
            return Boolean(element &&
                (["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName) || element.isContentEditable));
        }
        function selectToolFromShortcut(nextTool: CadTool, label: string) {
            if (!cadReady) { setStatus("Modelin yüklenmesini bekleyin."); return; }
            if (!activeTools.includes(nextTool)) {
                setStatus(`${label} bu adımda kapalı. Uzman moda geçebilir veya Tasarım adımını açabilirsin.`);
                return;
            }
            setTool(nextTool);
            if (nextTool !== 'orbit') setPanelTab(toolPanel(nextTool, activeStepId, workspaceMode, panelTab));
            setStatus(`${label} aktif · model üzerinde basılı tutup sürükle.`);
        }
        function adjustBrushRadius(delta: number) {
            setSettings((current) => {
                const next = Math.round(Math.min(8, Math.max(0.2, current.brush_radius_mm + delta)) * 10) / 10;
                setStatus(`Fırça yarıçapı: ${next.toFixed(1)} mm`);
                return { ...current, brush_radius_mm: next };
            });
        }
        function adjustBrushStrength(delta: number) {
            setSettings((current) => {
                const next = Math.round(Math.min(1, Math.max(0.01, current.brush_strength_mm + delta)) * 100) / 100;
                setStatus(`Fırça gücü: ${next.toFixed(2)} mm`);
                return { ...current, brush_strength_mm: next };
            });
        }
        function onKeyDown(event: KeyboardEvent) {
            if (exiting || submitting || isTypingTarget(event.target) || event.altKey || event.defaultPrevented || setupOpen || toolLibraryOpen || contextPoint || document.querySelector('dialog[open]'))
                return;
            const key = event.key.toLowerCase();
            const mod = event.ctrlKey || event.metaKey;
            if (!mod && event.code.startsWith('Numpad')) {
                const view = ({ Numpad1: 'front', Numpad2: 'bottom', Numpad3: 'back', Numpad4: 'left', Numpad6: 'right', Numpad8: 'top', Numpad9: 'iso' } as const)[event.code as 'Numpad1'];
                if (event.code === 'Numpad5') {
                    event.preventDefault();
                    viewportRef.current?.fit();
                    return;
                }
                if (view) {
                    event.preventDefault();
                    viewportRef.current?.setView(view);
                    return;
                }
            }
            if (mod && key === 's') {
                event.preventDefault();
                void saveProject(true);
                return;
            }
            if (!mod && event.key === "Escape") {
                viewportRef.current?.cancelPendingAction();
                return;
            }
            if (!mod && (event.key === "Delete" || event.key === "Backspace")) {
                if (tool === "margin") {
                    event.preventDefault();
                    viewportRef.current?.removeLastMarginPoint();
                    return;
                }
                if (tool === "measure") {
                    event.preventDefault();
                    viewportRef.current?.removeLastMeasurement();
                    return;
                }
                if (tool === "connector") {
                    event.preventDefault();
                    viewportRef.current?.removeLastConnector();
                    return;
                }
            }
            if (mod && key === "z") {
                event.preventDefault();
                if (event.shiftKey)
                    viewportRef.current?.redo();
                else
                    viewportRef.current?.undo();
                return;
            }
            if (mod && key === "y") {
                event.preventDefault();
                viewportRef.current?.redo();
                return;
            }
            if (!mod && event.code === "Space") {
                event.preventDefault();
                if (!event.repeat && tool !== "orbit") {
                    temporaryOrbitToolRef.current = tool;
                    setTool("orbit");
                    setStatus("Geçici döndürme · Space'i bırakınca önceki araca dönersin.");
                }
                return;
            }
            if (!mod && event.code === "BracketLeft") {
                event.preventDefault();
                if (event.shiftKey)
                    adjustBrushStrength(-0.02);
                else
                    adjustBrushRadius(-0.2);
                return;
            }
            if (!mod && event.code === "BracketRight") {
                event.preventDefault();
                if (event.shiftKey)
                    adjustBrushStrength(0.02);
                else
                    adjustBrushRadius(0.2);
                return;
            }
            if (!mod && (key === "h" || (event.shiftKey && event.code === "Slash"))) {
                event.preventDefault();
                setShortcutHelpOpen((current) => !current);
                return;
            }
            if (!mod && key === shortcutBindings.add.toLowerCase())
                return selectToolFromShortcut("add", "Katı Ekle");
            if (!mod && key === shortcutBindings.reduce.toLowerCase())
                return selectToolFromShortcut("reduce", "Çıkar");
            if (!mod && key === shortcutBindings.smooth.toLowerCase())
                return selectToolFromShortcut("smooth", "Yumuşat");
            if (!mod && key === shortcutBindings.flatten.toLowerCase())
                return selectToolFromShortcut("flatten", "Düzleştir");
            if (!mod && key === shortcutBindings.margin.toLowerCase())
                return selectToolFromShortcut("margin", "Marjin");
            if (!mod && key === shortcutBindings.measure.toLowerCase())
                return selectToolFromShortcut("measure", "Ölç");
            if (!mod && key === shortcutBindings.orbit.toLowerCase())
                return selectToolFromShortcut("orbit", "Döndür");
            if (!mod && key === shortcutBindings.connector.toLowerCase())
                return selectToolFromShortcut("connector", "Connector");
            if (!mod && key === shortcutBindings.symmetry.toLowerCase()) {
                event.preventDefault();
                if (!stagePolicy.tabs.includes('freeform') || !cadReady) return;
                setSettings((current) => {
                    const enabled = !current.symmetry_enabled;
                    setStatus(`Simetri ${enabled ? "açıldı" : "kapatıldı"} · ${current.symmetry_axis.toUpperCase()} ekseni`);
                    return { ...current, symmetry_enabled: enabled };
                });
                return;
            }
            if (!mod && key === "u")
                selectViewMode("undercut");
            if (!mod && key === "w")
                selectViewMode("wireframe");
            if (mod && key === "d") {
                event.preventDefault();
                selectViewMode("contact");
            }
            if (mod && key === "p") {
                event.preventDefault();
                selectViewMode("section");
            }
            if (mod && key === "r") {
                event.preventDefault();
                selectToolFromShortcut("measure", "Ölç");
            }
            if (mod && event.shiftKey && key === "q") {
                event.preventDefault();
                if (!cadReady || !cadActivationAllowed('command:kernel-qc', activeStepId, workspaceMode, hasBridge, panelTab)) return;
                const report = viewportRef.current?.runKernelQc() ?? null;
                setKernelReport(report);
            }
            if (event.ctrlKey && event.code === "Space") {
                event.preventDefault();
                void moveStep(1);
            }
            if (event.ctrlKey && event.key === "Backspace") {
                event.preventDefault();
                void moveStep(-1);
            }
        }
        function restoreTemporaryOrbit() {
            const previousTool = temporaryOrbitToolRef.current;
            if (!previousTool)
                return;
            temporaryOrbitToolRef.current = null;
            if (activeTools.includes(previousTool)) {
                setTool(previousTool);
                setStatus(`${toolLabel(previousTool)} geri yüklendi · basılı tutup sürükleyebilirsin.`);
            }
        }
        function onKeyUp(event: KeyboardEvent) {
            if (event.code !== "Space")
                return;
            restoreTemporaryOrbit();
        }
        function onWindowBlur() {
            restoreTemporaryOrbit();
        }
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        window.addEventListener("blur", onWindowBlur);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            window.removeEventListener("blur", onWindowBlur);
        };
        // Shortcut handlers intentionally track active tool/workflow state.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeStepIndex, activeTools, activeViews, activeStepId, panelTab, workspaceMode, stagePolicy.tabs, hasBridge, jobSetup.complete, gates.source, gates.margin, project?.workflow_stage, shortcutBindings, tool, setupOpen, toolLibraryOpen, contextPoint, cadReady, exiting]);
    async function saveProject(showMessage = true):Promise<boolean> {
        const requestedProject=project?.id;if(!requestedProject)return false;
        const task=async()=>{
            const state=saveStateRef.current;
            if(state.recoveryKey&&!state.recoveryLookupReady){setStatus('DentAYA CAD hazırlanıyor…');return false;}
            if(state.recoveryDecisionPending){setStatus('Kurtarma kaydı bulundu');document.querySelector<HTMLElement>('.cad-recovery-notice button')?.focus();return false;}
            if(!state.project||!state.user||!state.selectedCase||state.contextLoading||state.project.id!==requestedProject||state.project.case_id!==state.selectedCase.id)return false;
            const workspace=viewportRef.current?.captureWorkspace();if(state.activeSource&&!workspace){setStatus('Modelin yüklenmesini bekleyin.');return false;}
            const revision=dirtyRevisionRef.current;setSaving(true);localExitReadyRef.current=false;
            if(showMessage)setStatus('Kaydediliyor…');
            try {
                const record=workspace?await encodeCadWorkspace(workspace):state.settings.cad_workspace;
                const payloadSettings={...state.settings,cad_workspace:record,guided_task:state.workspaceMode==='wizard'?state.panelTab:state.settings.guided_task};
                const geometry=viewportRef.current?.captureRecoveryGeometry();
                if(state.recoveryKey&&geometry&&record&&workspace){
                    try { await saveCadRecoveryDraft({key:state.recoveryKey,projectId:state.project.id,sourceKey:state.sourceKey,savedAt:record.savedAt,geometry,workspace:{settings:payloadSettings,marginPoints:state.marginPoints,measurements:state.measurements,designSnapshot:workspace,workflowStage:state.project.workflow_stage,projectStatus:state.project.status}});
                    localExitReadyRef.current=true;setLocalRecoverySavedAt(record.savedAt); } catch { localExitReadyRef.current=false; }
                }
                const {data,error}=await supabase.from('design_projects').update({source_scan_id:state.activeSource?.scanId??null,settings:payloadSettings,margin_points:state.marginPoints,measurements:state.measurements,workflow_stage:state.project.workflow_stage,status:state.project.status,restoration_type:state.selectedCase.case_type,tooth_codes:state.settings.job_setup.units.map(u=>u.tooth_code),material:state.selectedCase.material,shade:state.selectedCase.shade,updated_by:state.user.id}).eq('id',state.project.id).eq('updated_at',savedVersionRef.current.get(state.project.id)??state.project.updated_at).select('id,case_id,lab_org_id,source_scan_id,title,restoration_type,tooth_codes,material,shade,workflow_stage,status,settings,margin_points,measurements,updated_at').abortSignal(AbortSignal.timeout(20000)).single();
                if(error||!data)throw error??Error('CAD_SAVE_FAILED');
                savedVersionRef.current.set(state.project.id,data.updated_at);
                savedSettingsRef.current={projectId:state.project.id,settings:payloadSettings};
                if(state.recoveryKey&&record)await acknowledgeCadRecoveryDraft(state.recoveryKey,record.savedAt).catch(()=>undefined);
                setProject(current=>current?.id===state.project!.id?{...current,updated_at:data.updated_at,settings:payloadSettings}:current);
                if(revision===dirtyRevisionRef.current){cleanRevisionRef.current=revision;setHasUnsavedChanges(false);localExitReadyRef.current=false;setLocalRecoverySavedAt(null);}
                if(showMessage){setStatus('CAD projesi kaydedildi.');playExperienceCue('complete');}
                return true;
            } catch(error){const conflict=error&&typeof error==='object'&&'code' in error&&error.code==='PGRST116';setStatus(conflict?'Kayıt tamamlanamadı. Bağlantıyı ve yetkinizi kontrol edip kayıtları yenileyin.':dentayaError(error,'CAD projesi kaydedilemedi.'));if(showMessage)playExperienceCue('error');return false;}
            finally{setSaving(false);}
        };
        const queued=saveChainRef.current.catch(()=>false).then(task);saveChainRef.current=queued;return queued;
    }
    async function switchCase(nextId:string){
        if(nextId===selectedCaseId||!cases.some(item=>item.id===nextId)||caseSwitchLock.current||saving||exiting||submitting||contextLoading)return;
        caseSwitchLock.current=true;setContextLoadError('');setExiting(true);setExitFailure(false);
        try{
            // Keep the current case and full scene until its save is acknowledged.
            if(project&&!await saveProject(true))return;
            setContextLoading(true);setSelectedCaseId(nextId);
            router.replace(`${pathname==='/cad'?'/cad':'/design'}?case=${nextId}`);
        }finally{caseSwitchLock.current=false;setExiting(false);}
    }
    async function saveAndExit(destination='/lab'){
        if(recoveryKey&&!recoveryLookupReady){setStatus('DentAYA CAD hazırlanıyor…');return false;}
        if(recoveryDecisionPending){setStatus('Kurtarma kaydı bulundu');document.querySelector<HTMLElement>('.cad-recovery-notice button')?.focus();return false;}
        if(exiting||submitting||contextLoading)return false;exitDestinationRef.current=destination;localExitReadyRef.current=false;if(!project){router.push(destination);return true;}setExiting(true);setExitFailure(false);
        const ok=await saveProject(true);
        if(ok){cleanRevisionRef.current=dirtyRevisionRef.current;router.push(destination);}
        else {setExiting(false);setExitFailure(true);}
        return ok;
    }
    useLayoutEffect(()=>{navigationExitRef.current=saveAndExit;});
    useEffect(()=>{
        const navigate=(event:MouseEvent)=>{
            if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||!saveStateRef.current.project)return;
            const anchor=event.target instanceof Element?event.target.closest<HTMLAnchorElement>('a[href]'):null;
            if(!anchor||anchor.download||(anchor.target&&anchor.target!=='_self'))return;
            const destination=new URL(anchor.href,window.location.href);
            if(destination.origin!==window.location.origin)return;
            if(destination.pathname===window.location.pathname&&destination.search===window.location.search)return;
            // The active Design tab keeps its open case instead of reopening the base route.
            if(['/design','/cad'].includes(destination.pathname)&&!destination.search){event.preventDefault();return;}
            event.preventDefault();event.stopPropagation();
            anchor.closest('dialog')?.close();
            void navigationExitRef.current?.(destination.pathname+destination.search+destination.hash);
        };
        document.addEventListener('click',navigate,true);
        return()=>document.removeEventListener('click',navigate,true);
    },[]);
    async function exitWithLocalCopy(){
        if(!localExitReadyRef.current||exiting)return;
        setExiting(true);setExitFailure(false);
        try {
            const draft=await loadCadRecoveryDraft(recoveryKey);
            if(!draft||draft.projectId!==project?.id)throw Error('CAD_LOCAL_COPY_MISSING');
            await saveCadRecoveryDraft({...draft,retained:true});
            cleanRevisionRef.current=dirtyRevisionRef.current;router.push(exitDestinationRef.current);
        } catch(error){setStatus(dentayaError(error,'CAD projesi kaydedilemedi.'));setExiting(false);setExitFailure(true);localExitReadyRef.current=false;}
    }
    function selectLibraryForm(form:CadLibraryForm){
        const unit=jobSetup.units.find(u=>u.id===libraryTarget);if(!unit||form.toothCode!==unit.anatomy_code)return;
        setSettings(current=>{const initial={morphology_scale:1,cusp_height:1,design_tx_mm:0,design_ty_mm:0,design_tz_mm:0,rotation_z_deg:0};return {...current,cad_library_assets:{...current.cad_library_assets,[form.id]:form},unit_parameters:{...current.unit_parameters,[unit.id]:initial},...(current.job_setup.active_unit_id===unit.id?initial:{})};});
        changeJobSetup({...jobSetup,complete:false,units:jobSetup.units.map(u=>u.id===unit.id?{...u,form_library_id:form.id}:u)});
        setLibraryTarget(null);setStatus('Form kütüphanesi');
    }
    function changeSource(next:string){
        setProject(current=>current?{...current,workflow_stage:next?'margin':'scan'}:current);setPanelTab(next?'margin':'files');
        const id=settings.job_setup.active_unit_id??'';
        const nextMargins=settings.source_margins?.[next]??{};
        viewportRef.current?.captureWorkspace();
        setMarginPoints(nextMargins[id]??[]);
        setSettings(current=>({...current,source_margins:{...current.source_margins,[sourceKey]:{...current.unit_margins,[id]:marginPoints}},unit_margins:nextMargins}));
        setSourceKey(next);
    }
    function changeMargin(next:CadPoint[]){
        setMarginPoints(next);setSettings(current=>{const id=activeCadUnit(current.job_setup)?.id;return id?{...current,unit_margins:{...current.unit_margins,[id]:next}}:current;});
    }
    async function setStage(stage: Exclude<WorkflowStage, "approved">, requestedTask: CadPanelTab = stagePanel(stage)) {
        if (!project)
            return false;
        const context = { setupComplete: jobSetup.complete, sourceReady: gates.source, modelReady: cadReady, marginReady: gates.margin };
        const reason = workspaceMode === 'wizard'
            ? cadTaskTransitionBlock(activeStepId, panelTab, stage, requestedTask, context)
            : cadTransitionBlock(activeStepId, stage, workspaceMode, context);
        if (reason) {
            if (reason === 'setup') setSetupOpen(true);
            setStatus(reason === 'setup' ? 'Devam etmek için CAD İş Tanımını tamamla.' : reason === 'source' ? 'Devam etmek için bir çalışma taraması seç.' : reason === 'margin' ? 'Devam etmek için en az 3 margin noktası tanımla.' : reason === 'loading' ? 'Modelin yüklenmesini bekleyin.' : activeStep.description);
            return false;
        }
        if((stage==='design'||requestedTask==='fit') && marginPoints.length>=3){
            if(!viewportRef.current?.hasMarginPlacement()&&!viewportRef.current?.placeOnMargin()){setStatus('Geçerli bir kole çizgisi çizin.');return false;}
            setSettings(current=>({...current,show_design:true,opacity:current.opacity>0?current.opacity:1,shell_preview_opacity:current.shell_preview_opacity>0?current.shell_preview_opacity:.96}));
        }
        viewportRef.current?.cancelPendingAction();
        temporaryOrbitToolRef.current = null;
        setProject({
            ...project,
            settings: { ...project.settings, guided_task: requestedTask },
            workflow_stage: stage,
            status: stage !== "review" && project.status === "ready_for_review"
                    ? "working"
                    : project.status,
        });
        setPanelTab(requestedTask);
        setSettings(current => ({ ...current, guided_task: requestedTask }));
        setToolPanelVisible(true);
        setFocusMode(false);
        const policy = cadStagePolicy(stage, workspaceMode, hasBridge, requestedTask);
        setTool(policy.tool);
        setViewMode(policy.view==='contact'&&!sceneState.antagonistReady?'natural':policy.view);
        return true;
    }
    async function moveStep(delta: -1 | 1) {
        if (!project)
            return;
        if (workspaceMode === 'wizard') {
            const next = CAD_GUIDED_TASKS[activeTaskIndex + delta];
            if (next) await setStage(next.stage, next.tab);
            return;
        }
        const current = Math.max(0, activeStepIndex);
        const nextIndex = Math.min(STEPS.length - 1, Math.max(0, current + delta));
        const next = STEPS[nextIndex];
        await setStage(next.id);
    }
    function changeJobSetup(next: CadJobSetup) {
        const previousId=settings.job_setup.active_unit_id??'',nextId=next.active_unit_id??'';
        const transformKeys=['morphology_scale','cusp_height','design_tx_mm','design_ty_mm','design_tz_mm','rotation_z_deg','insertion_axis_x','insertion_axis_y','insertion_axis_z'] as const;
        if(previousId!==nextId){
            const progress=settings.unit_workflow?.[nextId];
            const stage=progress&&CAD_STAGE_ORDER.includes(progress.stage as CadWorkflowStage)?progress.stage as CadWorkflowStage:'margin';
            const task=cadTaskForStage(stage,progress?.task);
            setProject(current=>current?{...current,workflow_stage:stage}:current);setPanelTab(task);
            viewportRef.current?.captureWorkspace();
            setMarginPoints(settings.unit_margins?.[nextId]??[]);
            setSettings(current=>{
                const oldParams=Object.fromEntries(transformKeys.map(k=>[k,current[k]]));
                const params=Object.fromEntries(transformKeys.map(k=>{const v=current.unit_parameters?.[nextId]?.[k];return [k,typeof v==='number'&&Number.isFinite(v)?v:DEFAULT_SETTINGS[k]];}));
                return {...current,...params,job_setup:next,unit_workflow:{...current.unit_workflow,[previousId]:{stage:activeStepId,task:panelTab}},unit_parameters:{...current.unit_parameters,[previousId]:oldParams},unit_margins:{...current.unit_margins,[previousId]:marginPoints}};
            });
        }else setSettings(current=>({...current,job_setup:next}));
    }
    function patchActiveJobUnit(patch: Partial<CadUnitSetup>) {
        const currentSetup = settings.job_setup;
        const active = activeCadUnit(currentSetup);
        if (!active)
            return;
        const next: CadJobSetup = {
            ...currentSetup,
            updated_at: new Date().toISOString(),
            units: currentSetup.units.map((unit) => unit.id === active.id ? { ...unit, ...patch } : unit),
        };
        setSettings((current) => ({ ...current, job_setup: next }));
    }
    function confirmJobSetup() {
        const currentSetup = settings.job_setup;
        if (!currentSetup.units.length) {
            setStatus("İş tanımı için en az bir FDI diş/ünite gerekli.");
            return;
        }
        const next = {
            ...currentSetup,
            complete: true,
            active_unit_id: currentSetup.active_unit_id ?? currentSetup.units[0].id,
            updated_at: new Date().toISOString(),
        };
        setSettings((current) => ({ ...current, job_setup: next }));
        setSetupOpen(false);
        const active = activeCadUnit(next);
        setStatus(active
            ? `İş tanımı hazır · ${active.tooth_code} · ${cadRestorationLabel(active.design_type)}`
            : "İş tanımı hazır.");
    }
    function applyAnatomyPreset(preset: "soft" | "balanced" | "strong") {
        patchActiveJobUnit({ morphology_style: preset });
        if (preset === "soft") {
            setSettings((current) => ({
                ...current,
                morphology_scale: 0.97,
                cusp_height: 0.92,
                smoothing: 0.56,
            }));
            setStatus("Anatomi preset · Soft");
            return;
        }
        if (preset === "strong") {
            setSettings((current) => ({
                ...current,
                morphology_scale: 1.03,
                cusp_height: 1.12,
                smoothing: 0.24,
            }));
            setStatus("Anatomi preset · Pronounced");
            return;
        }
        setSettings((current) => ({
            ...current,
            morphology_scale: 1,
            cusp_height: 1,
            smoothing: 0.35,
        }));
        setStatus("Anatomi preset · Balanced");
    }
    function applyBrushPreset(preset: "detail" | "standard" | "bulk") {
        setSettings((current) => {
            if (preset === "detail") {
                return {
                    ...current,
                    brush_radius_mm: 0.7,
                    brush_strength_mm: 0.06,
                    brush_hardness: 0.18,
                    brush_falloff: 1.7,
                    brush_shape: "pointed",
                };
            }
            if (preset === "bulk") {
                return {
                    ...current,
                    brush_radius_mm: 3.2,
                    brush_strength_mm: 0.28,
                    brush_hardness: 0.48,
                    brush_falloff: 0.7,
                    brush_shape: "round",
                };
            }
            return {
                ...current,
                brush_radius_mm: 1.6,
                brush_strength_mm: 0.16,
                brush_hardness: 0.2,
                brush_falloff: 1,
                brush_shape: "round",
            };
        });
        setStatus(preset === "detail"
            ? "Fırça preset · Detay"
            : preset === "bulk"
                ? "Fırça preset · Hacim"
                : "Fırça preset · Standart");
    }
    function persistCadShortcuts(next: CadShortcutBindings) {
        if (!user?.id || typeof window === "undefined")
            return;
        window.localStorage.setItem(`dentaya:cad-shortcuts:${user.id}`, JSON.stringify(next));
    }
    function updateShortcutBinding(action: CadShortcutAction, rawValue: string) {
        const normalized = rawValue.trim().slice(-1).toLowerCase();
        if (!normalized || !/^[a-z0-9]$/i.test(normalized)) {
            setStatus("Kısayol için tek bir harf veya rakam kullan.");
            return;
        }
        if (normalized === "h") {
            setStatus("H yardım paneli için ayrılmıştır. Başka bir tuş seç.");
            return;
        }
        const duplicate = (Object.entries(shortcutBindings) as Array<[
            CadShortcutAction,
            string
        ]>)
            .find(([otherAction, value]) => otherAction !== action && value.toLowerCase() === normalized);
        if (duplicate) {
            setStatus(`${normalized.toUpperCase()} zaten ${CAD_SHORTCUT_ACTION_LABELS[duplicate[0]]} için kullanılıyor.`);
            return;
        }
        const next = { ...shortcutBindings, [action]: normalized };
        setShortcutBindings(next);
        persistCadShortcuts(next);
        setStatus(`${CAD_SHORTCUT_ACTION_LABELS[action]} kısayolu: ${normalized.toUpperCase()}`);
    }
    function resetCadShortcuts() {
        const next = { ...DEFAULT_CAD_SHORTCUT_BINDINGS };
        setShortcutBindings(next);
        persistCadShortcuts(next);
        setStatus("CAD kısayolları varsayılanlara döndürüldü.");
    }
    function restoreRecoveryDraft() {
        if (!recoveryCandidate || !project)
            return;
        const workspace = recoveryCandidate.workspace;
        const restoredStage = workspace.workflowStage === 'approved' ? 'review' : (workspace.workflowStage || activeStepId) as CadWorkflowStage;
        const restoredTask = cadTaskForStage(restoredStage, (workspace.settings as Partial<CadSettings>)?.guided_task);
        const recoveredSettings:CadSettings={...DEFAULT_SETTINGS,...((workspace.settings??{}) as Partial<CadSettings>),guided_task:restoredTask,
            job_setup:normalizeCadJobSetup((workspace.settings as Partial<CadSettings>)?.job_setup,selectedCase?.tooth_codes??[],selectedCase?.case_type??'',selectedCase?.material??null)};
        const savedSnapshot=workspace.designSnapshot;
        let applied=false;
        try{applied=savedSnapshot?viewportRef.current?.restoreWorkspace(savedSnapshot,recoveredSettings)??false:viewportRef.current?.restoreRecoveryGeometry(recoveryCandidate.geometry)??false;}catch{applied=false;}
        if(!applied){setStatus('Kurtarma kaydı henüz uygulanamadı. Model tamamen yüklendikten sonra tekrar dene.');return;}
        setSettings(recoveredSettings);
        setMarginPoints(Array.isArray(workspace.marginPoints) ? workspace.marginPoints as CadPoint[] : []);
        setMeasurements(Array.isArray(workspace.measurements) ? workspace.measurements as CadMeasurement[] : []);
        setProject((current) => current ? {
            ...current,
            settings: { ...((workspace.settings ?? {}) as Partial<CadSettings>), guided_task: restoredTask },
            workflow_stage: (workspace.workflowStage || current.workflow_stage) as WorkflowStage,
            status: (workspace.projectStatus || current.status) as Project["status"],
        } : current);
        setPanelTab(restoredTask);
        setRecoveryDecisionPending(false);
        setRecoveryCandidate(null);
        setLocalRecoverySavedAt(recoveryCandidate.savedAt);
        setGeometryRevision((value) => value + 1);
        setStatus(`Kurtarma kaydı geri yüklendi · ${formatRecoveryTime(recoveryCandidate.savedAt, intlLocale())}.`);
    }
    async function discardRecoveryDraft() {
        if (!recoveryCandidate)
            return;
        const key = recoveryCandidate.key;
        setRecoveryDecisionPending(false);
        setRecoveryCandidate(null);
        try {
            await deleteCadRecoveryDraft(key);
            setLocalRecoverySavedAt(null);
            setStatus("Eski yerel kurtarma kaydı silindi. Mevcut çalışma korunuyor.");
        }
        catch {
            setStatus("Kurtarma kaydı ekrandan kaldırıldı; yerel depolama temizliği daha sonra yeniden denenecek.");
        }
    }
    async function submitForApproval() {
        if (!project || !selectedCase || !user)
            return;
        if (!jobSetup.complete) {
            setSetupOpen(true);
            setStatus("Kliniğe göndermeden önce CAD İş Tanımını onayla.");
            return;
        }
        if (!activeSource) {
            setStatus("Önce çalışma taramasını seç.");
            return;
        }
        if (marginPoints.length < 3) {
            setStatus("Kliniğe göndermeden önce margin çizgisini tanımla.");
            return;
        }
        const qcReport = viewportRef.current?.runKernelQc() ?? null;
        setKernelReport(qcReport);
        if (qcReport?.mesh && !qcReport.mesh.watertight) {
            setStatus(`STL gönderimi durduruldu: mesh topolojisi açık veya non-manifold. Boundary ${qcReport.mesh.boundaryEdges}, non-manifold ${qcReport.mesh.nonManifoldEdges}.`);
            return;
        }
        if (qcReport?.connectorWarnings.length) {
            setStatus(`STL gönderimi durduruldu: ${qcReport.connectorWarnings.length} connector minimum QC eşiğini karşılamıyor.`);
            return;
        }
        const blob = viewportRef.current?.exportStl();
        if (!blob) {
            setStatus("STL gönderimi durduruldu: kapalı, tek bileşenli ve dejenere yüz içermeyen geometri gerekli. Ayrı connector katıları boolean birleşim yapılmadan üretime gönderilemez.");
            return;
        }
        if (typeof navigator !== "undefined" &&
            !navigator.onLine) {
            setStatus("İnternet bağlantısı yok. Tasarımı kliniğe göndermeden önce bağlantının gelmesini bekle.");
            return;
        }
        if (submitLock.current) {
            return;
        }
        submitLock.current = true;
        setSubmitting(true);
        setStatus("Tasarım versiyonu hazırlanıyor…");
        try {
            if (!await saveProject(false)) return;
            const checkpoint = savedSettingsRef.current;
            if (checkpoint?.projectId !== project.id) throw Error('CAD_SAVE_FAILED');
            const { data: latest, error: latestError } = await supabase
                .from('design_versions').select('version_number').eq('project_id', project.id)
                .order('version_number', { ascending: false }).limit(1)
                .abortSignal(AbortSignal.timeout(20000)).maybeSingle();
            if (latestError) throw latestError;
            const version = (latest?.version_number ?? 0) + 1;
            const fileName = `${selectedCase.case_number}-DentAYA-Design-v${version}.stl`;
            const path = `cases/${selectedCase.id}/design/${Date.now()}-${fileName}`;
            const { error: uploadError } = await supabase.storage.from('dentaya-files')
                .upload(path, blob, { contentType: 'model/stl', upsert: false });
            if (uploadError) throw uploadError;
            const { data: attachment, error: attachmentError } = await supabase.from('attachments')
                .insert({ patient_id: selectedCase.patient_id, case_id: selectedCase.id,
                    storage_bucket: 'dentaya-files', storage_path: path, file_name: fileName,
                    mime_type: 'model/stl', size_bytes: blob.size, category: 'design', created_by: user.id })
                .select('id').abortSignal(AbortSignal.timeout(20000)).single();
            if (attachmentError || !attachment) throw attachmentError ?? Error('CAD_ATTACHMENT_FAILED');
            const { error: submitError } = await supabase.rpc('dentaya_submit_design_version', {
                p_project_id: project.id, p_attachment_id: attachment.id,
                p_source_scan_id: activeSource.scanId, p_version_number: version,
                p_parameters: { settings: checkpoint.settings, margin_points: marginPoints,
                    measurements, source_key: sourceKey, kernel_qc: qcReport },
                p_note: `DentAYA CAD · v${version}`,
            }).abortSignal(AbortSignal.timeout(20000));
            if (submitError) {
                // A network timeout may follow a committed RPC. Keep its attachment intact.
                if (/^[0-9A-Z]{5}$/.test(submitError.code || '')) {
                    await Promise.allSettled([
                        supabase.from('attachments').delete().eq('id', attachment.id),
                        supabase.storage.from('dentaya-files').remove([path]),
                    ]);
                }
                throw submitError;
            }
            const { data: refreshed } = await supabase.from('design_projects')
                .select('updated_at,settings,margin_points,measurements,source_scan_id').eq('id', project.id)
                .abortSignal(AbortSignal.timeout(20000)).maybeSingle();
            // Adopt our RPC timestamp only while its exact checkpoint is still current.
            const acknowledged = refreshed && sameCadJson(refreshed.settings,checkpoint.settings)
                && sameCadJson(refreshed.margin_points,marginPoints) && sameCadJson(refreshed.measurements,measurements)
                && refreshed.source_scan_id===activeSource.scanId;
            if (acknowledged) savedVersionRef.current.set(project.id, refreshed.updated_at);
            setProject(current => current?.id === project.id ? {
                ...current, workflow_stage: 'review', status: 'ready_for_review',
                ...(acknowledged ? { updated_at: refreshed.updated_at, settings: checkpoint.settings } : {}),
            } : current);
            setVersions(current => [{ id: `local-${version}`, version_number: version,
                status: 'submitted', note: `DentAYA CAD · v${version}`, created_at: new Date().toISOString() }, ...current]);
            setStatus(`v${version} kliniğin onayına gönderildi.`);
        } catch (error) {
            setStatus(dentayaError(error, 'Tasarım klinik onayına gönderilemedi.'));
        } finally {
            setSubmitting(false);submitLock.current = false;
        }
    }

    function patchSetting<K extends keyof CadSettings>(key: K, value: CadSettings[K]) {
        setSettings((current) => ({
            ...current,
            [key]: value,
        }));
    }
    function activateMatrixTool(item: CadToolMatrixItem) {
        const activation = item.activation;
        if (!cadActivationAllowed(activation, activeStepId, workspaceMode, hasBridge, panelTab)) return;
        if (!cadReady && activation !== 'command:job-setup' && activation !== 'command:save') return;
        if (!activation) {
            setStatus(`${item.label}: bu araç tam geometri çekirdeği gerektiriyor. Tool Suite içinde şartname olarak hazır.`);
            return;
        }
        if(activation.startsWith('inspection:')){
            if(workspaceMode!=='expert')return;
            const command=activation.slice(11);
            if(command==='focus')viewportRef.current?.focusRestoration();
            else if(command==='rotate-left'||command==='rotate-right')viewportRef.current?.rotateView(command==='rotate-left'?'left':'right');
            else {
                setInspectionOpen(true);
                setInspectionTab(command==='section'?'section':['edges','normals','faceted','interior'].includes(command)?'surface':'light');
                const toggles={flashlight:'inspection_flashlight',edges:'inspection_edges',normals:'inspection_normals',faceted:'inspection_faceted',interior:'inspection_interior'} as const;
                if(command in toggles){const key=toggles[command as keyof typeof toggles];setSettings(current=>({...current,[key]:!current[key]}));}
            }
            setToolLibraryOpen(false);
            return;
        }
        if (activation === "command:job-setup") {
            setSetupOpen(true);
            setToolLibraryOpen(false);
            setStatus("İş Tanımı açıldı · restorasyon, kron formu ve attachment seçimini düzenle.");
            return;
        }
        if (activation.startsWith("tool:")) {
            selectManualTool(activation.slice(5) as CadTool);
            setToolLibraryOpen(false);
            setStatus(`${item.label} aktif.`);
            return;
        }
        if (activation.startsWith("view:")) {
            if(!selectViewMode(activation.slice(5) as CadViewMode))return;
            setToolLibraryOpen(false);
            setStatus(`${item.label} görünümü açıldı.`);
            return;
        }
        if (activation.startsWith("stage:")) {
            const stage = activation.slice(6) as Exclude<WorkflowStage, "approved">;
            void setStage(stage);
            setToolLibraryOpen(false);
            return;
        }
        if (activation === "command:set-axis") {
            viewportRef.current?.setInsertionFromView();
            setViewMode("undercut");
            setToolLibraryOpen(false);
            return;
        }
        if (activation === "command:undo") {
            viewportRef.current?.undo();
            setToolLibraryOpen(false);
            return;
        }
        if (activation === "command:redo") {
            viewportRef.current?.redo();
            setToolLibraryOpen(false);
            return;
        }
        if (activation === "command:fit") {
            viewportRef.current?.fit();
            setToolLibraryOpen(false);
            return;
        }
        if (activation === "command:clear-margin") {
            changeMargin([]);
            setToolLibraryOpen(false);
            setStatus("Marjin temizlendi.");
            return;
        }
        if (activation === "command:smooth-margin") {
            viewportRef.current?.smoothMargin();
            setToolLibraryOpen(false);
            return;
        }
        if (activation === "command:project-margin") {
            viewportRef.current?.projectMargin();
            setToolLibraryOpen(false);
            return;
        }
        if (activation === "command:margin-up") {
            viewportRef.current?.offsetMargin(0.05);
            setToolLibraryOpen(false);
            return;
        }
        if (activation === "command:margin-down") {
            viewportRef.current?.offsetMargin(-0.05);
            setToolLibraryOpen(false);
            return;
        }
        if (activation === "command:internal-fit") {
            viewportRef.current?.applyInternalFit();
            setViewMode("thickness");
            setToolLibraryOpen(false);
            return;
        }
        if (activation === "command:blockout") {
            setBlockoutPreview(Boolean(viewportRef.current?.toggleBlockoutPreview()));
            setToolLibraryOpen(false);
            return;
        }
        if (activation === "command:crown-shell") {
            const report = viewportRef.current?.buildCrownShell() ?? null;
            if (report) {
                setKernelReport(viewportRef.current?.runKernelQc() ?? null);
            }
            setToolLibraryOpen(false);
            return;
        }
        if (activation === "command:repair-shell") {
            viewportRef.current?.repairCrownShell();
            setKernelReport(viewportRef.current?.runKernelQc() ?? null);
            setToolLibraryOpen(false);
            return;
        }
        if (activation === "command:kernel-qc") {
            const report = viewportRef.current?.runKernelQc() ?? null;
            setKernelReport(report);
            setToolLibraryOpen(false);
            return;
        }
        if (activation === "command:clear-connectors") {
            viewportRef.current?.clearConnectors();
            setToolLibraryOpen(false);
            return;
        }
        if (activation === "command:save") {
            void saveProject(true);
            setToolLibraryOpen(false);
            return;
        }
        if (activation === "command:reset-design") {
            viewportRef.current?.resetDesign();
            setToolLibraryOpen(false);
            return;
        }
        if (activation.startsWith("setting:")) {
            const key = activation.slice(8);
            setSettings((current) => {
                if (key === "preserve-shape")
                    return { ...current, preserve_shape: !current.preserve_shape };
                if (key === "hold-cusp")
                    return { ...current, hold_cusp_tips: !current.hold_cusp_tips };
                if (key === "hold-equator")
                    return { ...current, hold_equator: !current.hold_equator };
                if (key === "occlusal-only")
                    return { ...current, occlusal_only: !current.occlusal_only };
                if (key === "brush-round")
                    return { ...current, brush_shape: "round" };
                if (key === "brush-pointed")
                    return { ...current, brush_shape: "pointed" };
                if (key === "brush-flat")
                    return { ...current, brush_shape: "flat" };
                return current;
            });
            setStatus(`${item.label} ayarı güncellendi.`);
            return;
        }
        setStatus(`${item.label}: Tool Suite kaydı hazır; çekirdek uygulaması sıradaki CAD kernel fazında.`);
    }
    function selectManualTool(next: CadTool) {
        if (!cadReady)
            return;
        if (!activeTools.includes(next)) return;
        setTool(next);
        if (next !== 'orbit') setPanelTab(toolPanel(next, activeStepId, workspaceMode, panelTab));
        setStatus(`${toolLabel(next)} aktif.`);
    }
    function selectViewMode(next: CadViewMode) {
        if (!cadReady || !activeViews.includes(next)){if(next==='contact'&&!sceneState.antagonistReady)setStatus(cadCopy.noAntagonist);return false;}
        setViewMode(next);return true;
    }
    function runContextAction(action: string) {
        if (action === 'undo')
            viewportRef.current?.undo();
        else if (action === 'redo')
            viewportRef.current?.redo();
        else if (action === 'fit')
            viewportRef.current?.fit();
        else if (['top', 'bottom', 'iso'].includes(action))
            viewportRef.current?.setView(action as 'top' | 'bottom' | 'iso');
        else if (action === 'panel' || action === 'reset-panel') {
            setToolPanelVisible(action === 'reset-panel' || !toolPanelVisible || focusMode);
            setFocusMode(false);
            if (action === 'reset-panel')
                window.dispatchEvent(new Event('dentaya:reset-cad-panel'));
        }
        else if (action === 'all')
            restoreVisibility();
        else if (action === 'isolate')
            setSettings(s => ({ ...s, show_design: true, show_scan: false, show_upper: false, show_lower: false }));
        else if (action === 'upper' || action === 'lower' || action === 'design')
            setSettings(s => ({ ...s, [`show_${action}`]: !(s[`show_${action}`] ?? true), ...(action !== 'design' ? { show_scan: true } : {}) }));
    }
    const ayaScope=project?.id?project.id+':'+sourceKey+':'+(activeJobUnit?.id??''):'';
    // Asset buffers and saved workspace geometry must never be re-hashed on every UI render.
    const ayaSettings=Object.fromEntries(Object.entries(settings).filter(([key])=>!['cad_library_assets','cad_workspace','unit_margins','source_margins','unit_workflow','unit_parameters'].includes(key)));
    const ayaDataToken=cadStateToken([ayaScope,geometryRevision,ayaSettings,marginPoints,sceneState.upperReady,sceneState.lowerReady,sceneState.antagonistReady]);
    const inspectionContext=normalizeCadInspection(settings);
    const ayaContext:AyaCadContext={
        inspectionFlashlight:inspectionContext.inspection_flashlight,inspectionFlashlightTarget:inspectionContext.inspection_flashlight_target,
        scope:ayaScope,dataToken:ayaDataToken,snapshot:cadStateToken([ayaDataToken,ayaEpoch,activeStepId,panelTab,tool,viewMode,historyState,saving,exiting,submitting,contextLoading,cadReady,sceneState]),
        unit:activeJobUnit?.tooth_code??'',restoration:activeJobUnit?cadRestorationLabel(activeJobUnit.design_type):'',
        stage:activeStepId,task:panelTab,upperReady:sceneState.upperReady,lowerReady:sceneState.lowerReady,antagonistReady:sceneState.antagonistReady,openingMm:sceneState.openingMm,
        setupComplete:jobSetup.complete,sourceReady:Boolean(activeSource),modelReady:cadReady&&!contextLoading&&recoveryLookupReady&&!recoveryDecisionPending,
        marginPoints:marginPoints.length,placed:viewportRef.current?.hasMarginPlacement()??false,visible:sceneState.activeVisible,
        unsaved:dirtyRevisionRef.current!==cleanRevisionRef.current,saveFailed:exitFailure,isSaving:saving||exiting||submitting||contextLoading,
        material:activeJobUnit?.material??project?.material??'',tool,view:viewMode,undoCount:historyState.undoCount,redoCount:historyState.redoCount,
        measurementsMm:measurements.map(m=>m.distance).slice(-8),designSettings:{cementGapMm:settings.cement_gap_mm,minimumThicknessMm:settings.minimum_thickness_mm,brushRadiusMm:settings.brush_radius_mm},
        report:ayaEvidence?.dataToken===ayaDataToken?ayaEvidence:null
    };
    ayaContext.availableTools=availableAyaTools(ayaContext,{inspection:workspaceMode==='expert',tools:activeTools,views:activeViews,internalFit:cadActivationAllowed('command:internal-fit',activeStepId,workspaceMode,hasBridge,panelTab),canNext:activeTaskIndex<CAD_GUIDED_TASKS.length-1&&jobSetup.complete&&Boolean(activeSource)&&marginPoints.length>=3});
    useLayoutEffect(()=>{ayaContextRef.current=ayaContext;});
    async function runAyaAction(proposal:AyaProposal):Promise<AyaActionResult>{
        const current=ayaContextRef.current,copy=ayaAgentText(locale);
        if(!current)return {ok:false,message:copy.unavailable};
        const ready=()=>({ok:true,message:copy.activated});
        const handlers:Partial<Record<AyaCadTool,()=>AyaActionResult|Promise<AyaActionResult>>>={
            setup:()=>{setSetupOpen(true);return {ok:true,message:copy.opened};},
            library:()=>{if(!activeJobUnit)return {ok:false,message:copy.unavailable};setLibraryTarget(activeJobUnit.id);return {ok:true,message:copy.opened};},
            inspect:()=>{const report=viewportRef.current?.runKernelQc();if(!report)return {ok:false,message:copy.unavailable};setKernelReport(report);setAyaEvidence(summarizeAyaReport(report,current.dataToken!,sceneState.antagonistReady,settings.minimum_thickness_mm));return {ok:true,message:copy.qcDone};},
            place:()=>{if(!viewportRef.current?.placeOnMargin())return {ok:false,message:copy.placeFailed};setSettings(s=>({...s,show_design:true,opacity:s.opacity>0?s.opacity:1,shell_preview_opacity:s.shell_preview_opacity>0?s.shell_preview_opacity:.96}));return {ok:true,message:copy.placed};},
            save:async()=>{const ok=await saveProject(true);return {ok,message:ok?copy.saved:copy.saveFailed};},
            'save-exit':async()=>{const ok=await saveAndExit();return {ok,message:ok?copy.saved:copy.saveFailed};},
            undo:()=>{const ok=viewportRef.current?.undo()===true;return {ok,message:ok?copy.activated:copy.unavailable};},redo:()=>{const ok=viewportRef.current?.redo()===true;return {ok,message:ok?copy.activated:copy.unavailable};},
            inspection:()=>{if(workspaceMode!=='expert'||!cadReady)return {ok:false,message:copy.unavailable};setInspectionTab('light');setInspectionOpen(true);return {ok:true,message:copy.opened};},
            'flashlight-on':()=>{if(workspaceMode!=='expert'||!cadReady)return {ok:false,message:copy.unavailable};setSettings(s=>({...s,inspection_flashlight:true}));return ready();},
            'flashlight-off':()=>{if(workspaceMode!=='expert'||!cadReady)return {ok:false,message:copy.unavailable};setSettings(s=>({...s,inspection_flashlight:false}));return ready();},
            'fit-camera':()=>{const viewport=viewportRef.current;if(!viewport)return {ok:false,message:copy.unavailable};viewport.fit();return ready();},
            'show-all':()=>{restoreVisibility();return ready();},
            isolate:()=>{setSettings(s=>({...s,show_design:true,opacity:1,show_scan:false,show_upper:false,show_lower:false}));return ready();},
            'recorded-bite':()=>{showRecordedBite();return ready();},
            'internal-fit':()=>{const report=viewportRef.current?.applyInternalFit();return {ok:Boolean(report),message:report?copy.fitResult:copy.fitFailed};},
            next:async()=>{const next=workspaceMode==='wizard'?CAD_GUIDED_TASKS[activeTaskIndex+1]:STEPS[activeStepIndex+1];const ok=next?await setStage('stage' in next?next.stage:next.id,'tab' in next?next.tab:undefined):false;return {ok,message:ok?copy.next:copy.nextFailed};}
        };
        for(const view of ['natural','contact','thickness','undercut','section'] as const)handlers[('view-'+view) as AyaCadTool]=()=>{if(!cadReady||!activeViews.includes(view))return {ok:false,message:copy.unavailable};selectViewMode(view);return ready();};
        for(const next of ['margin','measure','add','reduce','smooth'] as const)handlers[('tool-'+next) as AyaCadTool]=()=>{if(!cadReady||!activeTools.includes(next))return {ok:false,message:copy.unavailable};selectManualTool(next);return ready();};
        const result=await ayaDispatch.current(proposal,()=>ayaContextRef.current,handlers);
        if(result.ok)setAyaEpoch(v=>v+1);
        return result;
    }
    if (loading) return <LoadingExperience title="DentAYA CAD açılıyor…"/>;
    if (blocked) {
        return (<UiNode as="main" style={ui.blocked}>
        <UiNode as="section" style={ui.blockCard}>
          <UiNode as="p" style={ui.eyebrow}>ROL KONTROLÜ</UiNode>
          <UiNode as="h1" style={ui.blockTitle}>DentAYA CAD</UiNode>
          <UiNode as="p" style={ui.muted}>{blocked}</UiNode>
          <Link href={org?.org_type === "clinic" ? "/clinic" : "/"} style={ui.primaryLink}>
            Çalışma alanına dön
          </Link>
        </UiNode>
      </UiNode>);
    }
    return (<UiNode as="main" className="cad-page cad-professional" data-workspace-mode={workspaceMode} data-cad-task={panelTab}>
      <ConnectionStatus />
      <CadContextMenu point={contextPoint} onClose={closeContextMenu} onTool={selectManualTool} onView={selectViewMode} onAction={runContextAction} tools={activeTools} views={activeViews} tool={tool} viewMode={viewMode} ready={cadReady} canUndo={historyState.undoCount > 0} canRedo={historyState.redoCount > 0} shortcuts={shortcutBindings}/>
      <CadJobSetupPanel open={setupOpen} caseNumber={selectedCase?.case_number} caseTitle={selectedCase?.title} setup={jobSetup} onChange={changeJobSetup} onClose={() => setSetupOpen(false)} onConfirm={confirmJobSetup} onOpenLibrary={setLibraryTarget} libraryNames={Object.fromEntries(Object.values(settings.cad_library_assets??{}).map(f=>[f.id,f.name]))}/>
      <CadLibraryDialog open={libraryTarget!==null} onClose={()=>setLibraryTarget(null)} ownerId={user?.id??''} anatomyCode={jobSetup.units.find(u=>u.id===libraryTarget)?.anatomy_code} projectForms={Object.values(settings.cad_library_assets??{})} onSelect={libraryTarget?selectLibraryForm:undefined}/>
      <UiNode as="header" className="cad-main-header">
        <UiNode as="button" type="button" className="cad-button cad-button--primary" aria-label={saving ? 'Kaydediliyor…' : 'Kaydet'} title="Kaydet" disabled={saving || !project} onClick={() => void saveProject(true)}><CadIcon name="save" size={18}/><UiNode as="span">{saving ? 'Kaydediliyor…' : 'Kaydet'}</UiNode></UiNode>
        <UiNode as="button" type="button" className="cad-button cad-tool-command" aria-label="Araç kataloğu" title="Araç kataloğu" onClick={() => setToolLibraryOpen(true)}><CadIcon name="tools" size={27}/><UiNode as="span">Araçlar</UiNode></UiNode>
        <UiNode as="button" type="button" className="cad-hub-link" title="DentAYA Hub" disabled={saving||exiting} onClick={()=>void saveAndExit()}><CadIcon name="back" size={19}/></UiNode>
        <UiNode as="div" className="cad-product"><BrandLogo width={122} height={27}/><UiNode as="strong">CAD</UiNode></UiNode>
      <UiNode as="details" name="cad-chrome" className="cad-chrome-menu cad-workflow" data-cad-menu="workflow"><UiNode as="summary" aria-label="Tasarım adımları" title="Tasarım adımları"><CadIcon name="design" size={27}/><UiNode as="span">Tasarım adımları</UiNode></UiNode><UiNode as="nav" className="cad-workflow-list" aria-label="Tasarım adımları">{workspaceMode === 'expert' ? STEPS.map(step => <UiNode as="button" type="button" key={step.id} data-cad-stage={step.id} data-complete={step.index - 1 < activeStepIndex} aria-current={step.id === activeStep.id ? 'step' : undefined} disabled={!project || !cadReady} onClick={() => { closeChromeMenus(); void setStage(step.id); }}><UiNode as="span" className="cad-step-index">{step.index - 1 < activeStepIndex ? <CadIcon name="check" size={13}/> : step.index}</UiNode><CadIcon name={step.id} size={18}/><UiNode as="span">{step.label}</UiNode></UiNode>) : CAD_GUIDED_TASKS.map((task, index) => <UiNode as="button" type="button" key={task.tab} data-cad-task-step={task.tab} data-complete={index < activeTaskIndex} aria-current={task.tab === panelTab ? 'step' : undefined} disabled={!project || index > activeTaskIndex + 1 || (!cadReady && index > activeTaskIndex)} onClick={() => { closeChromeMenus(); void setStage(task.stage, task.tab); }}><UiNode as="span" className="cad-step-index">{index < activeTaskIndex ? <CadIcon name="check" size={13}/> : index + 1}</UiNode><UiNode as="span">{cadTaskLabel(task.tab)}</UiNode></UiNode>)}<UiNode as="span" className="cad-workflow-progress">{workspaceMode === 'wizard' ? `${activeTaskIndex + 1} / ${CAD_GUIDED_TASKS.length}` : `${progress}%`}</UiNode></UiNode></UiNode>
        <UiNode as="button" type="button" className="cad-button cad-module-command" translateChildren={false} aria-label={desktopCopy.modules} onClick={() => window.dispatchEvent(new Event('dentaya:open-modules'))}><CadIcon name="file" size={27}/><UiNode as="span">{desktopCopy.modules}</UiNode></UiNode>
        <UiNode as="details" className="cad-chrome-menu cad-app-menu" name="cad-chrome" data-cad-menu="app">
          <UiNode as="summary"><CadIcon name="settings" size={18}/><UiNode as="span">Ayarlar</UiNode></UiNode>
          <UiNode as="div" className="cad-menu-content">
            <UiNode as="div" className="cad-mode-switch"><UiNode as="button" type="button" aria-pressed={workspaceMode === 'wizard'} onClick={() => { setWorkspaceMode('wizard'); setPanelTab(cadTaskForStage(activeStep.id, settings.guided_task)); closeChromeMenus(); }}>Adım adım</UiNode><UiNode as="button" type="button" aria-pressed={workspaceMode === 'expert'} onClick={() => { setWorkspaceMode('expert'); closeChromeMenus(); }}>Uzman</UiNode></UiNode>
            <UiNode as="button" type="button" onClick={() => { closeChromeMenus(); window.dispatchEvent(new Event('dentaya:open-preferences')); }}><CadIcon name="settings" size={17}/><UiNode as="span">Görünüm ve ses ayarları</UiNode></UiNode>
            <UiNode as="button" type="button" onClick={() => { closeChromeMenus(); setToolLibraryOpen(true); }}><CadIcon name="tools" size={17}/><UiNode as="span">Araç kataloğu</UiNode></UiNode>
            <UiNode as="button" type="button" onClick={() => { closeChromeMenus(); setShortcutHelpOpen(v => !v); }}><CadIcon name="help" size={17}/><UiNode as="span">Kısayollar</UiNode></UiNode>
            <UiNode as="button" type="button" onClick={() => { closeChromeMenus(); setToolPanelVisible(true); setFocusMode(false); window.dispatchEvent(new Event('dentaya:reset-cad-panel')); }}><CadIcon name="reset" size={17}/><UiNode as="span">Panel konumunu sıfırla</UiNode></UiNode>
            <UiNode as="button" type="button" aria-pressed={focusMode} onClick={() => { closeChromeMenus(); setFocusMode(v => !v); }}><CadIcon name="expand" size={17}/><UiNode as="span">Odak görünümü</UiNode></UiNode>
            <LanguageSelect compact/>
          </UiNode>
        </UiNode>
        <UiNode as="button" type="button" className="cad-button" aria-label="Kaydet ve çık" title="Kaydet ve çık" disabled={saving||exiting||!cadReady} onClick={()=>void saveAndExit()}><CadIcon name="export" size={18}/><UiNode as="span">Kaydet ve çık</UiNode></UiNode>
        <UiNode as="button" type="button" className="cad-button" aria-label="Form kütüphanesi" title="Form kütüphanesi" onClick={()=>setLibraryTarget('')}><CadIcon name="file" size={18}/><UiNode as="span">Form kütüphanesi</UiNode></UiNode>
        <UiNode as="button" type="button" className="cad-button cad-aya-toggle" aria-label="AYA" aria-pressed={ayaOpen} onClick={()=>setAyaOpen(v=>!v)}><CadIcon name="help" size={18}/>AYA</UiNode>
        {workspaceMode==='expert'&&<UiNode as="button" type="button" className="cad-button cad-inspection-command" data-cad-command="inspection" aria-label={inspectionCopy.title} aria-pressed={inspectionOpen} disabled={!cadReady} onClick={()=>setInspectionOpen(value=>!value)}><CadIcon name="flashlight" size={26}/><UiNode as="span" translateChildren={false}>{inspectionCopy.launcher}</UiNode></UiNode>}
      </UiNode>
      {contextLoadError&&<UiNode as="div" role="alert" className="cad-context-error"><UserText>{contextLoadError}</UserText><UiNode as="button" type="button" onClick={()=>{if(selectedCase&&org&&user){setContextLoadError('');void loadCaseContext(selectedCase,org,user);}}}>Tekrar dene</UiNode><UiNode as="button" type="button" onClick={()=>setContextLoadError('')}>Kapat</UiNode></UiNode>}
      <UiNode as="section" className="cad-shell" aria-label="Üç boyutlu CAD çalışma alanı">
        <UiNode as="div" className="cad-viewport-frame">
<UiNode as="div" className="cad-session-strip">
        <UiNode as="button" type="button" className="cad-button" aria-label="İş tanımı" title="İş tanımı" onClick={() => setSetupOpen(true)} data-required={!jobSetup.complete}><CadIcon name="design" size={18}/><UiNode as="span">İş tanımı</UiNode></UiNode>
        <UiNode as="select" aria-label="Çalışma vakası" className="cad-case-select" value={selectedCaseId} disabled={saving||exiting||submitting||contextLoading} onChange={event=>void switchCase(event.target.value)}>{cases.map(item => <UiNode as="option" key={item.id} value={item.id}><UserText>{item.case_number} · {item.title}</UserText></UiNode>)}</UiNode>
        <UiNode as="span" className="cad-save-state" data-save-state={saving?'saving':hasUnsavedChanges?'dirty':'saved'} translateChildren={false} title={saving?uiText('Kaydediliyor…'):hasUnsavedChanges?cadCopy.unsaved:cadCopy.saved}><CadIcon name={saving?'save':hasUnsavedChanges?'save':'check'} size={14}/>{saving?uiText('Kaydediliyor…'):hasUnsavedChanges?cadCopy.unsaved:uiText('Kaydedildi')}</UiNode>
        <UiNode as="div" className="cad-case-material"><UiNode as="span">{selectedCase?.material || '—'}</UiNode><UiNode as="b">{selectedCase?.shade || '—'}</UiNode><StatusBadge value={project?.status ?? 'draft'}/></UiNode>
</UiNode>
      <CadFloatingPanel visible={!focusMode && toolPanelVisible} revealKey={`${workspaceMode}:${activeStep.id}:${panelTab}`} onClose={() => setToolPanelVisible(false)} title={workspaceMode === 'wizard' ? activeTaskLabel : 'Tasarım araçları'}>
        <UiNode as="div" className="cad-viewport-toolbar">
          <UiNode as="div" className="cad-history-actions"><CadCommand label="Geri al" icon="undo" shortcut="Ctrl Z" disabled={historyState.undoCount === 0} onClick={() => viewportRef.current?.undo()}/><CadCommand label="Yinele" icon="redo" shortcut="Ctrl Y" disabled={historyState.redoCount === 0} onClick={() => viewportRef.current?.redo()}/><UiNode as="span" className="cad-history-count">{historyState.undoCount} / {historyState.redoCount}</UiNode></UiNode>
          {workspaceMode === 'expert' && <CadToolPalette compact tools={activeTools} tool={tool} onSelect={selectManualTool} shortcuts={shortcutBindings} disabled={!cadReady}/>}
        </UiNode>
        {workspaceMode === 'wizard' && <UiNode as="div" className="cad-stage-brief"><UiNode as="span">{activeTaskIndex + 1} / {CAD_GUIDED_TASKS.length}</UiNode><UiNode as="p">{activeStep.label}</UiNode></UiNode>}
        {workspaceMode === 'wizard' && <UiNode as="div" className="cad-task-tools"><CadToolPalette tools={activeTools} tool={tool} onSelect={selectManualTool} shortcuts={shortcutBindings} disabled={!cadReady}/></UiNode>}
        {workspaceMode === 'expert' && <UiNode as="div" className="cad-panel-tabs" role="tablist" aria-label="Tasarım araç grupları" onKeyDown={event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
                return;
            event.preventDefault();
            const index = visiblePanelTabs.findIndex(tab => tab.id === panelTab);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? visiblePanelTabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + visiblePanelTabs.length) % visiblePanelTabs.length;
            setPanelTab(visiblePanelTabs[next].id);
            document.getElementById(`cad-tab-${visiblePanelTabs[next].id}`)?.focus();
        }}>{visiblePanelTabs.map(tab => <UiNode as="button" type="button" role="tab" key={tab.id} id={`cad-tab-${tab.id}`} aria-controls="cad-tool-content" tabIndex={panelTab === tab.id ? 0 : -1} aria-selected={panelTab === tab.id} onClick={() => setPanelTab(tab.id)}><CadIcon name={tab.icon} size={19}/><UiNode as="span">{tab.label}</UiNode></UiNode>)}</UiNode>}
        <UiNode as="fieldset" disabled={!cadReady && panelTab !== 'files'} id="cad-tool-content" role={workspaceMode === 'expert' ? 'tabpanel' : 'group'} aria-labelledby={workspaceMode === 'expert' ? `cad-tab-${panelTab}` : undefined} aria-label={workspaceMode === 'wizard' ? activeTaskLabel : undefined} className="cad-tool-content" key={panelTab}>
                    <Section tab={panelTab} category="files" title="Vaka bilgileri">
            <InfoRow label="Endikasyon" value={selectedCase?.case_type ?? "—"}/>
            <InfoRow label="Diş" value={selectedCase?.tooth_codes.join(", ") || "—"}/>
            <InfoRow label="Materyal" value={selectedCase?.material ?? "—"}/>
            <InfoRow label={uiText("Renk")} value={selectedCase?.shade ?? "—"}/>
          </Section>

          {true && (<Section tab={panelTab} category="files" title="Çalışma taraması">
              <UiNode as="label" style={ui.field}>
                <UiNode as="span">Ana kaynak</UiNode>
                <UiNode as="select" value={sourceKey} onChange={(event) => changeSource(event.target.value)} style={ui.input}>
                  <UiNode as="option" value="">Kaynak seç</UiNode>
                  {sources.map((source) => (<UiNode as="option" key={source.key} value={source.key}>
                      {source.label} · {source.detail}
                    </UiNode>))}
                </UiNode>
              </UiNode>

              <QualityGate ok={Boolean(activeSource)} title="Çalışma mesh’i" detail={activeSource
                ? activeSource.detail
                : "Çalışma için STL/PLY seçilmedi."}/>

            </Section>)}

          {true && (<>
            <Section tab={panelTab} category="margin" title="Preparasyon marjini">
              <QualityGate ok={marginPoints.length >= 3} title="Marjin çizgisi" detail={`${marginPoints.length} nokta · en az 3 nokta gerekli`}/>

              <UiNode as="div" style={ui.inlineGrid3}>
                <MiniButton label="Son nokta · Del" onClick={() => viewportRef.current?.removeLastMarginPoint()}/>
                <MiniButton label={uiText("Temizle")} onClick={() => changeMargin([])}/>
              </UiNode>

              <UiNode as="details" className="cad-advanced-parameters"><UiNode as="summary">Ayrıntılar</UiNode><UiNode as="div">
              <UiNode as="div" style={ui.inlineGrid4}>
                <MiniButton label="Yüzeye projekte et" onClick={() => viewportRef.current?.projectMargin()}/>
                <MiniButton label="Yumuşat" onClick={() => viewportRef.current?.smoothMargin()}/>
                <MiniButton label="+0.05 mm" onClick={() => viewportRef.current?.offsetMargin(0.05)}/>
                <MiniButton label="−0.05 mm" onClick={() => viewportRef.current?.offsetMargin(-0.05)}/>
              </UiNode>

              <Slider label="Marjin smoothing" value={settings.margin_smoothing} min={0.05} max={0.75} step={0.05} unit="" onChange={(value) => patchSetting("margin_smoothing", value)}/>

              <Slider label="Yüzeye projeksiyon gücü" value={settings.margin_projection_strength} min={0.25} max={1} step={0.05} unit="×" onChange={(value) => patchSetting("margin_projection_strength", value)}/>

              <UiNode as="p" style={ui.helperText}>
                Kontrol noktaları kapalı centripetal spline ile bağlanır. Smooth ve projeksiyon komutları marjini kaynak mesh yüzeyine yaklaştırır; otomatik klinik marjin tespiti değildir.
              </UiNode>
              </UiNode></UiNode>

              <Slider label="Marjin offset" value={settings.margin_offset_mm} min={-0.2} max={0.3} step={0.01} unit=" mm" onChange={(value) => patchSetting("margin_offset_mm", value)}/>

            </Section>

            {true && <Section tab={panelTab} category="fit" title="Internal Fit">
              <UiNode as="div" style={ui.inlineGrid2}>
                <UiNode as="button" type="button" className="cad-action" style={ui.analysisButton} onClick={() => {
                    viewportRef.current?.applyInternalFit();
                    setViewMode("thickness");
                }}>
                  Internal fit relief uygula
                </UiNode>
                <UiNode as="button" type="button" className="cad-action" style={ui.analysisButton} onClick={() => {
                    const report = viewportRef.current?.runKernelQc() ?? null;
                    setKernelReport(report);
                }}>
                  Fit QC çalıştır
                </UiNode>
              </UiNode>

              <Slider label="Marjin zone gap" value={settings.margin_zone_gap_mm} min={0} max={0.12} step={0.01} unit=" mm" onChange={(value) => patchSetting("margin_zone_gap_mm", value)}/>

              <Slider label="Cement gap" value={settings.cement_gap_mm} min={0.02} max={0.2} step={0.01} unit=" mm" onChange={(value) => patchSetting("cement_gap_mm", value)}/>

              <UiNode as="details" className="cad-advanced-parameters"><UiNode as="summary">Ayrıntılar</UiNode><UiNode as="div">
              <Slider label="Axial gap" value={settings.axial_gap_mm} min={0.02} max={0.25} step={0.01} unit=" mm" onChange={(value) => patchSetting("axial_gap_mm", value)}/>

              <Slider label="Radial gap" value={settings.radial_gap_mm} min={0.02} max={0.3} step={0.01} unit=" mm" onChange={(value) => patchSetting("radial_gap_mm", value)}/>

              <Slider label="Geçiş bandı" value={settings.gap_transition_mm} min={0.3} max={3} step={0.1} unit=" mm" onChange={(value) => patchSetting("gap_transition_mm", value)}/>

              <Slider label="Milling compensation" value={settings.milling_compensation_mm} min={0} max={1.2} step={0.05} unit=" mm" onChange={(value) => patchSetting("milling_compensation_mm", value)}/>

              <Slider label="Fit uygulama gücü" value={settings.internal_fit_strength} min={0.1} max={1} step={0.05} unit="×" onChange={(value) => patchSetting("internal_fit_strength", value)}/>

              <UiNode as="p" style={ui.helperText}>
                Bu motor cervical yüzeyde kaynak taramaya göre gerçek vertex düzeltmesi yapar. Tam intaglio/crown-bottom boolean shell değildir; üretim doğrulaması olarak kullanılmamalıdır.
              </UiNode>
              </UiNode></UiNode>
            </Section>}

            {true && <Section tab={panelTab} category="fit" title="Crown Shell / Intaglio">
              <UiNode as="div" style={ui.inlineGrid2}>
                <UiNode as="button" type="button" className="cad-action" style={ui.analysisButton} onClick={() => {
                    const report = viewportRef.current?.buildCrownShell() ?? null;
                    if (report) {
                        setStatus(`Crown shell üretildi · ${report.triangleCount.toLocaleString(intlLocale())} üçgen · ${report.qc.watertight ? "watertight" : "QC uyarısı"}`);
                        setKernelReport(viewportRef.current?.runKernelQc() ?? null);
                    }
                }}>
                  Crown shell oluştur
                </UiNode>

                <UiNode as="button" type="button" className="cad-action" style={ui.analysisButton} onClick={() => {
                    const result = viewportRef.current?.repairCrownShell() ?? null;
                    if (result) {
                        setKernelReport(viewportRef.current?.runKernelQc() ?? null);
                    }
                }}>
                  Mesh repair
                </UiNode>
              </UiNode>

              <Slider label="Wall thickness" value={settings.shell_wall_thickness_mm} min={0.4} max={2.5} step={0.05} unit=" mm" onChange={(value) => patchSetting("shell_wall_thickness_mm", value)}/>

              <Slider label="Cervical cut" value={settings.shell_cervical_cut_ratio} min={0.04} max={0.32} step={0.01} unit="×" onChange={(value) => patchSetting("shell_cervical_cut_ratio", value)}/>

              <Slider label="Preparation fit blend" value={settings.shell_fit_blend} min={0} max={1} step={0.05} unit="×" onChange={(value) => patchSetting("shell_fit_blend", value)}/>

              <Slider label="Shell opacity" value={settings.shell_preview_opacity} min={0.2} max={1} step={0.05} unit="×" onChange={(value) => setSettings(s => ({ ...s, opacity: value, shell_preview_opacity: value }))}/>

              <Slider label="Weld tolerance" value={settings.shell_weld_tolerance_mm} min={0.001} max={0.08} step={0.001} unit=" mm" onChange={(value) => patchSetting("shell_weld_tolerance_mm", value)}/>

              <UiNode as="div" style={ui.inlineGrid2}>
                <MiniButton label="Shell'i temizle" onClick={() => {
                    viewportRef.current?.clearCrownShell();
                    setKernelReport(viewportRef.current?.runKernelQc() ?? null);
                }}/>
                <MiniButton label="Kesit görünümü" active={viewMode === "section"} onClick={() => setViewMode("section")}/>
              </UiNode>

              {kernelReport?.crownShell && (<UiNode as="div" style={ui.kernelReport}>
                  <InfoRow label="Shell topoloji" value={kernelReport.crownShell.qc.watertight ? "Watertight" : "Açık / non-manifold"}/>
                  <InfoRow label="Wall tahmini" value={`${kernelReport.crownShell.minimumWallEstimateMm.toFixed(2)}–${kernelReport.crownShell.maximumWallEstimateMm.toFixed(2)} mm`}/>
                  <InfoRow label="Fit vertex" value={kernelReport.crownShell.fittedInnerVertices.toLocaleString(intlLocale())}/>
                  <InfoRow label="Cervical stitch" value={`${kernelReport.crownShell.boundaryEdgeCountBeforeStitch.toLocaleString(intlLocale())} kenar`}/>
                </UiNode>)}

              <UiNode as="p" style={ui.helperText}>
                Crown Shell motoru dış anatomiden iç offset yüzeyi üretir, servikal sınırı birleştirir ve kaynak taramaya en yakın yüzey uyumu uygular. Çıktı, klinik ve üretim doğrulaması tamamlanmadan nihai restorasyon üretiminde kullanılmamalıdır.
              </UiNode>
            </Section>}

            {true && <Section tab={panelTab} category="fit" title="Giriş ekseni & undercut">
              <UiNode as="button" type="button" className="cad-action" style={ui.analysisButton} onClick={() => {
                    viewportRef.current?.setInsertionFromView();
                    setViewMode("undercut");
                }}>
                Mevcut görünümü giriş ekseni yap
              </UiNode>

              <UiNode as="div" style={ui.inlineGrid2}>
                <MiniButton label="Undercut haritası" active={viewMode === "undercut"} onClick={() => setViewMode("undercut")}/>
                <MiniButton label="Doğal görünüm" active={viewMode === "natural"} onClick={() => setViewMode("natural")}/>
              </UiNode>

              <Slider label="Block-out derinliği" value={settings.blockout_depth_mm} min={0.05} max={1.5} step={0.05} unit=" mm" onChange={(value) => patchSetting("blockout_depth_mm", value)}/>

              <UiNode as="button" type="button" className="cad-action" style={{ ...ui.analysisButton, ...(blockoutPreview ? ui.analysisButtonActive : {}) }} onClick={() => setBlockoutPreview(Boolean(viewportRef.current?.toggleBlockoutPreview()))}>
                {blockoutPreview ? "Block-out preview kapat" : "Block-out preview aç"}
              </UiNode>

              <InfoRow label="Ekseni" value={`${settings.insertion_axis_x.toFixed(2)}, ${settings.insertion_axis_y.toFixed(2)}, ${settings.insertion_axis_z.toFixed(2)}`}/>

              <UiNode as="p" style={ui.helperText}>
                Undercut görünümü, tarama yüzey normallerini seçilen giriş eksenine göre renklendirir. Frezeleme doğrulaması değildir.
              </UiNode>
            </Section>}
            </>)}

          {true && (<>
              {activeJobUnit && (<Section tab={panelTab} category="anatomy" title="Aktif restorasyon">
                  <UiNode as="div" style={ui.infoCard}>
                    <InfoRow label="FDI / form" value={`${activeJobUnit.tooth_code} / ${activeJobUnit.anatomy_code}`}/>
                    <InfoRow label={uiText("Tasarım")} value={cadRestorationLabel(activeJobUnit.design_type)}/>
                    <InfoRow label="Attachment" value={cadAttachmentLabel(activeJobUnit.attachment_type)}/>
                  </UiNode>
                </Section>)}

              <Section tab={panelTab} category="anatomy" title="Anatomi formları">
                <UiNode as="div" style={ui.presetGrid}>
                  <PresetCard active={activeJobUnit?.morphology_style === "soft"} title="Yumuşak" detail="Daha sakin cusp ve yumuşak yüzey" onClick={() => applyAnatomyPreset("soft")}/>
                  <PresetCard active={activeJobUnit?.morphology_style === "balanced"} title="Dengeli" detail="Standart fonksiyonel anatomi" onClick={() => applyAnatomyPreset("balanced")}/>
                  <PresetCard active={activeJobUnit?.morphology_style === "strong"} title="Belirgin" detail="Daha belirgin cusp morfolojisi" onClick={() => applyAnatomyPreset("strong")}/>
                </UiNode>

                <Slider label="Morfoloji genişliği" value={settings.morphology_scale} min={0.82} max={1.18} step={0.01} unit="×" onChange={(value) => patchSetting("morphology_scale", value)}/>

                <Slider label="Tüberkül yüksekliği" value={settings.cusp_height} min={0.78} max={1.25} step={0.01} unit="×" onChange={(value) => patchSetting("cusp_height", value)}/>
              </Section>

              <Section tab={panelTab} category="anatomy" title="Konum">
                <Slider label="Mezial / distal" value={settings.design_tx_mm} min={-3} max={3} step={0.1} unit=" mm" onChange={(value) => patchSetting("design_tx_mm", value)}/>

                <Slider label="Bukkal / lingual" value={settings.design_ty_mm} min={-3} max={3} step={0.1} unit=" mm" onChange={(value) => patchSetting("design_ty_mm", value)}/>

                <Slider label="Oklüzal" value={settings.design_tz_mm} min={-3} max={3} step={0.1} unit=" mm" onChange={(value) => patchSetting("design_tz_mm", value)}/>

                <Slider label="Rotasyon" value={settings.rotation_z_deg} min={-30} max={30} step={1} unit="°" onChange={(value) => patchSetting("rotation_z_deg", value)}/>
              </Section>

              <Section tab={panelTab} category="freeform" title="Serbest şekillendirme">
                <UiNode as="p" className="cad-tool-instruction">Model üzerinde basılı tutup sürükleyin. Shift ile ekleme / çıkarma yönünü ters çevirin.</UiNode>
                <UiNode as="div" style={ui.brushPresetGrid}>
                  <MiniButton label="Detay" onClick={() => applyBrushPreset("detail")}/>
                  <MiniButton label="Standart" onClick={() => applyBrushPreset("standard")}/>
                  <MiniButton label="Hacim" onClick={() => applyBrushPreset("bulk")}/>
                </UiNode>

                <Slider label="Fırça yarıçapı" value={settings.brush_radius_mm} min={0.2} max={8} step={0.1} unit=" mm" onChange={(value) => patchSetting("brush_radius_mm", value)}/>

                <Slider label="Fırça gücü" value={settings.brush_strength_mm} min={0.01} max={1} step={0.01} unit=" mm" onChange={(value) => patchSetting("brush_strength_mm", value)}/>

                <UiNode as="details" className="cad-advanced-parameters"><UiNode as="summary">Ayrıntılar</UiNode><UiNode as="div">
                <UiNode as="details" className="cad-personal-brushes"><UiNode as="summary">Kişisel fırça ayarları</UiNode><CadBrushPresets settings={settings} onApply={brush => setSettings(current => ({ ...current, ...brush }))}/></UiNode>
                <Slider label="Fırça sertliği" value={settings.brush_hardness} min={0} max={0.9} step={0.05} unit="" onChange={(value) => patchSetting("brush_hardness", value)}/>

                <Slider label="Falloff" value={settings.brush_falloff} min={0.4} max={3} step={0.1} unit="×" onChange={(value) => patchSetting("brush_falloff", value)}/>

                <Slider label="Yumuşatma faktörü" value={settings.smoothing} min={0.05} max={0.75} step={0.05} unit="" onChange={(value) => patchSetting("smoothing", value)}/>

                <UiNode as="div" style={ui.brushShapeRow}>
                  <MiniButton label="Yuvarlak" active={settings.brush_shape === "round"} onClick={() => patchSetting("brush_shape", "round")}/>
                  <MiniButton label="Sivri" active={settings.brush_shape === "pointed"} onClick={() => patchSetting("brush_shape", "pointed")}/>
                  <MiniButton label="Düz" active={settings.brush_shape === "flat"} onClick={() => patchSetting("brush_shape", "flat")}/>
                </UiNode>

                <UiNode as="div" style={ui.symmetryCard}>
                  <UiNode as="div" className="cad-symmetry-header" style={ui.symmetryHeader}>
                    <UiNode data-dy-copy-stack as="div">
                      <UiNode as="strong">Simetri / Mirror</UiNode>
                      <UiNode as="span">Karşı tarafa aynı sculpt darbesini uygula</UiNode>
                    </UiNode>
                    <Toggle label={uiText("Aktif")} checked={settings.symmetry_enabled} onChange={(value) => patchSetting("symmetry_enabled", value)}/>
                  </UiNode>
                  {settings.symmetry_enabled && (<>
                      <UiNode as="div" style={ui.inlineGrid2}>
                        <MiniButton label="X ekseni" active={settings.symmetry_axis === "x"} onClick={() => patchSetting("symmetry_axis", "x")}/>
                        <MiniButton label="Y ekseni" active={settings.symmetry_axis === "y"} onClick={() => patchSetting("symmetry_axis", "y")}/>
                      </UiNode>
                      <Slider label="Simetri düzlemi offset" value={settings.symmetry_offset_mm} min={-5} max={5} step={0.1} unit=" mm" onChange={(value) => patchSetting("symmetry_offset_mm", value)}/>
                    </>)}
                </UiNode>

                <Toggle label="Formu koruyan smoothing" checked={settings.preserve_shape} onChange={(value) => patchSetting("preserve_shape", value)}/>
                <Toggle label="Kusp tepelerini koru" checked={settings.hold_cusp_tips} onChange={(value) => patchSetting("hold_cusp_tips", value)}/>
                <Toggle label="Ekvator bandını koru" checked={settings.hold_equator} onChange={(value) => patchSetting("hold_equator", value)}/>
                <Toggle label="Sadece oklüzal yönde hareket" checked={settings.occlusal_only} onChange={(value) => patchSetting("occlusal_only", value)}/>
                </UiNode></UiNode>
              </Section>
            </>)}

          {true && (<Section tab={panelTab} category="contacts" title="Temas & karşıt çene">

              <Slider label="Proksimal temas" value={settings.proximal_contact_mm} min={-0.5} max={0.5} step={0.05} unit=" mm" onChange={(value) => patchSetting("proximal_contact_mm", value)}/>

              <Slider label="Oklüzal offset" value={settings.occlusal_offset_mm} min={-1} max={1} step={0.05} unit=" mm" onChange={(value) => patchSetting("occlusal_offset_mm", value)}/>

              {['add', 'reduce', 'smooth'].includes(tool) && <>
                <Slider label="Fırça yarıçapı" value={settings.brush_radius_mm} min={0.2} max={8} step={0.1} unit=" mm" onChange={value => patchSetting('brush_radius_mm', value)}/>
                <Slider label="Fırça gücü" value={settings.brush_strength_mm} min={0.01} max={1} step={0.01} unit=" mm" onChange={value => patchSetting('brush_strength_mm', value)}/>
              </>}
              {hasBridge && tool === 'connector' && <>
              <UiNode as="div" style={ui.inlineGrid3}>
                <MiniButton label="Son connector · Del" onClick={() => viewportRef.current?.removeLastConnector()}/>
                <MiniButton label="Tümünü temizle" onClick={() => viewportRef.current?.clearConnectors()}/>
              </UiNode>

              <Slider label="Connector çapı" value={settings.connector_diameter_mm} min={1.2} max={6} step={0.1} unit=" mm" onChange={(value) => patchSetting("connector_diameter_mm", value)}/>

              <UiNode as="div" style={ui.inlineGrid2}>
                <MiniButton label="Yuvarlak" active={settings.connector_shape === "round"} onClick={() => patchSetting("connector_shape", "round")}/>
                <MiniButton label="Oval" active={settings.connector_shape === "oval"} onClick={() => patchSetting("connector_shape", "oval")}/>
              </UiNode>

              <Slider label="Min. connector alanı" value={settings.connector_min_area_mm2} min={3} max={20} step={0.5} unit=" mm²" onChange={(value) => patchSetting("connector_min_area_mm2", value)}/>

              <Slider label="Min. connector genişliği" value={settings.connector_min_width_mm} min={1.5} max={5} step={0.1} unit=" mm" onChange={(value) => patchSetting("connector_min_width_mm", value)}/>

              <Slider label="Min. connector yüksekliği" value={settings.connector_min_height_mm} min={1.5} max={5} step={0.1} unit=" mm" onChange={(value) => patchSetting("connector_min_height_mm", value)}/>

              <InfoRow label="Connector" value={`${settings.connectors?.length ?? 0} adet`}/>

              <UiNode as="p" style={ui.helperText}>
                Connector aracında restorasyon üzerinde iki docking noktası seç. Kesit alanı, genişlik ve yükseklik QC eşikleri otomatik hesaplanır. Bu mekanik dayanım sertifikasyonu değildir.
              </UiNode>
              </>}

              <UiNode as="p" style={ui.helperText} translateChildren={false}>{sceneState.antagonistReady?cadCopy.contactHelp:cadCopy.noAntagonist}</UiNode>
            </Section>)}

          {true && (<Section tab={panelTab} category="inspect" title="Kalınlık & kontrol">

              <Slider label="Minimum kalınlık hedefi" value={settings.minimum_thickness_mm} min={0.4} max={2} step={0.1} unit=" mm" onChange={(value) => patchSetting("minimum_thickness_mm", value)}/>

              <Slider label="Kesit düzlemi" value={settings.section_offset_mm} min={-60} max={60} step={0.25} unit=" mm" onChange={(value) => {
                patchSetting("section_offset_mm", value);
                setViewMode("section");
            }}/>


              <UiNode as="div" style={ui.inlineGrid2}>
                <MiniButton label="Ölçüleri temizle" onClick={() => setMeasurements([])}/>
              </UiNode>

              <InfoRow label="Ölçümler" value={String(measurements.length)}/>

              <UiNode as="button" type="button" className="cad-action" style={ui.analysisButton} onClick={() => {
                const report = viewportRef.current?.runKernelQc() ?? null;
                setKernelReport(report);
            }}>
                CAD Kernel QC çalıştır
              </UiNode>

              {kernelReport && (<UiNode as="div" style={ui.kernelReport}>
                  <InfoRow label="Mesh" value={kernelReport.mesh
                    ? `${kernelReport.mesh.triangleCount.toLocaleString(intlLocale())} üçgen · ${kernelReport.mesh.watertight ? "watertight" : "açık/non-manifold"}`
                    : "—"}/>
                  <InfoRow label="Boundary" value={String(kernelReport.mesh?.boundaryEdges ?? 0)}/>
                  <InfoRow label="Non-manifold" value={String(kernelReport.mesh?.nonManifoldEdges ?? 0)}/>
                  <InfoRow label="Temas / collision" value={kernelReport.contact
                    ? `${kernelReport.contact.contactCount} temas · ${kernelReport.contact.collisionCount} collision sample`
                    : "—"}/>
                  <InfoRow label="Undercut" value={kernelReport.undercut
                    ? `%${(kernelReport.undercut.undercutRatio * 100).toFixed(1)}`
                    : "—"}/>
                  <InfoRow label="Marjin projeksiyon" value={kernelReport.margin
                    ? `%${(kernelReport.margin.projectedRatio * 100).toFixed(0)}`
                    : "—"}/>
                  <InfoRow label="Connector QC" value={`${kernelReport.connectorCount} adet · ${kernelReport.connectorWarnings.length} uyarı`}/>
                  <InfoRow label="Crown shell" value={kernelReport.crownShell
                    ? `${kernelReport.crownShell.qc.watertight ? "watertight" : "uyarı"} · ${kernelReport.crownShell.triangleCount.toLocaleString(intlLocale())} üçgen`
                    : "Oluşturulmadı"}/>
                </UiNode>)}

              <UiNode as="p" style={ui.helperText}>
                Kalınlık görünümü artık restorasyon yüzeyinin kaynak taramaya örneklenmiş en yakın mesafesini hedef kalınlığa göre renklendirir. Bu bir clearance/kalınlık proxy&apos;sidir; gerçek intaglio duvar kalınlığı veya manufacturing doğrulaması değildir.
              </UiNode>
            </Section>)}

          {true && (<Section tab={panelTab} category="review" title="Son kontrol">
              <UiNode as="div" style={ui.readinessGrid}>
                <QualityGate ok={Boolean(activeSource)} title="Çalışma taraması" detail={activeSource?.label ?? "Kaynak yok"}/>
                <QualityGate ok={marginPoints.length >= 3} title="Marjin" detail={`${marginPoints.length} nokta`}/>
                <QualityGate ok={Boolean(selectedCase?.material)} title="Materyal" detail={selectedCase?.material ?? "Tanımlı değil"}/>
                <QualityGate ok={Boolean(selectedCase?.shade)} title={uiText("Renk")} detail={selectedCase?.shade ?? "Tanımlı değil"}/>
              </UiNode>


              <UiNode as="button" type="button" className="cad-action" disabled={submitting} onClick={() => void submitForApproval()} style={{
                ...ui.submitWideButton,
                opacity: submitting ? 0.55 : 1,
            }}>
                {submitting
                ? "STL hazırlanıyor…"
                : "STL oluştur ve kliniğin onayına gönder"}
              </UiNode>
            </Section>)}

          {true && (<Section tab={panelTab} category="anatomy" title="Display">
              <UiNode as="button" type="button" className="cad-action" disabled={!cadReady||marginPoints.length<3} onClick={()=>{if(viewportRef.current?.placeOnMargin()){setSettings(current=>({...current,show_design:true,opacity:current.opacity>0?current.opacity:1,shell_preview_opacity:current.shell_preview_opacity>0?current.shell_preview_opacity:.96}));setStatus('Koleye yerleştir');}else setStatus('Geçerli bir kole çizgisi çizin.');}}>Koleye yerleştir</UiNode>
              <UiNode as="button" type="button" className="cad-action" disabled={!cadReady} style={ui.secondaryWideButton} onClick={() => viewportRef.current?.resetDesign()}>
                Restorasyonu sıfırla
              </UiNode>
            </Section>)}

          {panelTab === 'files' && <CadWorkbench key={`${project?.id ?? 'none'}:${sourceKey}`} viewport={viewportRef} ready={cadReady}/>}
        </UiNode>
        <UiNode as="footer" className="cad-panel-footer"><UiNode as="button" type="button" disabled={!project || (workspaceMode === 'wizard' ? activeTaskIndex : activeStepIndex) <= 0} onClick={() => void moveStep(-1)}><CadIcon name="back" size={16}/>Geri</UiNode><UiNode as="span">{workspaceMode === 'wizard' ? `${activeTaskIndex + 1} / ${CAD_GUIDED_TASKS.length}` : `${activeStep.index} / ${STEPS.length}`}</UiNode><UiNode as="button" type="button" className="cad-next-step" disabled={!cadReady||!project||exiting} onClick={()=>activeStepId==='review'?void saveAndExit():void moveStep(1)}>{activeStepId==='review'?'Kaydet ve çık':'Sonraki'}<CadIcon name="next" size={16}/></UiNode></UiNode>
      </CadFloatingPanel>
          <DesignViewport ref={viewportRef} projectId={project?.id} source={displaySource} referenceSources={referenceSources} onContextMenuRequest={setContextPoint} toothCodes={selectedCase?.tooth_codes ?? []} settings={settings} tool={tool} viewMode={viewMode} marginPoints={marginPoints} measurements={measurements} onMarginPointsChange={changeMargin} onMeasurementsChange={setMeasurements} onConnectorsChange={connectors => patchSetting('connectors', connectors)} onBrushRadiusChange={value => patchSetting('brush_radius_mm', value)} onBrushStrengthChange={value => patchSetting('brush_strength_mm', value)} onGeometryCommit={() => setGeometryRevision(v => v + 1)} onReadyChange={setCadReady} onHistoryChange={setHistoryState} onPerformanceInfo={setPerformanceInfo} onSceneStateChange={setSceneState} onInsertionAxisChange={axis => setSettings(current => ({ ...current, insertion_axis_x: axis.x, insertion_axis_y: axis.y, insertion_axis_z: axis.z }))} onStatus={setStatus}/>
          {workspaceMode==='expert'&&inspectionOpen&&<CadInspectionPanel key={inspectionTab} initialTab={inspectionTab} settings={settings} patch={value=>setSettings(current=>({...current,...value}))} viewMode={viewMode} onView={value=>{selectViewMode(value);}} onClose={()=>setInspectionOpen(false)} onFocus={()=>{viewportRef.current?.focusRestoration();}} onRotate={direction=>viewportRef.current?.rotateView(direction)} onFit={()=>viewportRef.current?.fit()} ready={cadReady}/>}
          {!focusMode && <UiNode as="aside" className={`cad-object-panel${objectPanelCollapsed ? ' cad-object-panel--collapsed' : ''}`} aria-label="Nesne yöneticisi">
            <UiNode as="div" className="cad-object-panel-title"><CadIcon name="layers" size={18}/>{!objectPanelCollapsed && <UiNode as="strong">Sahne</UiNode>}<CadCommand label={objectPanelCollapsed ? 'Nesne panelini aç' : 'Nesne panelini daralt'} icon={objectPanelCollapsed ? 'layers' : 'collapse'} onClick={() => setObjectPanelCollapsed(v => !v)}/></UiNode>
            {!objectPanelCollapsed && <>
              <CadSceneControls settings={settings} patch={patch => setSettings(s => ({ ...s, ...patch }))} sources={sources} referenceKeys={referenceKeys} onReference={(arch, value) => patchSetting(`reference_${arch}_key`, value)} reset={restoreVisibility} scene={sceneState} onBite={showRecordedBite}/>
              <UiNode as="section" className="cad-unit-selector" aria-label="Çalışma ünitesi"><UiNode as="header"><UiNode as="strong">Çalışma ünitesi</UiNode></UiNode><UiNode as="div">{jobSetup.units.map(unit => <UiNode as="button" type="button" key={unit.id} aria-label={`Diş ${unit.tooth_code}`} aria-pressed={jobSetup.active_unit_id === unit.id} data-role={unit.role} onClick={() => changeJobSetup({ ...jobSetup, active_unit_id: unit.id })} uiMessages={{ "aria-label": { source: "Di\u015F {0}", values: [unit.tooth_code], userValues: [] } }}><CadIcon name="design" size={22}/><UiNode as="b">{unit.tooth_code}</UiNode><UiNode as="small">{unit.role === 'pontic' ? 'Gövde' : 'Ünite'}</UiNode></UiNode>)}</UiNode><UiNode as="p">{activeJobUnit ? cadRestorationLabel(activeJobUnit.design_type) : 'İş tanımını tamamlayın'}</UiNode></UiNode>
              <UiNode as="details" className="cad-scene-files"><UiNode as="summary">Tasarım sürümleri <UiNode as="b">{versions.length}</UiNode></UiNode>{versions.map(version => <UiNode as="div" key={version.id}><UiNode as="b">v{version.version_number}</UiNode><UiNode as="span">{statusLabel(version.status)}</UiNode><UiNode as="small">{formatDate(version.created_at, intlLocale())}</UiNode></UiNode>)}</UiNode>
            </>}
          </UiNode>}
          <UiNode as="aside" className="cad-view-toolbar" aria-label="Kamera ve analiz araçları">
            <CadCommand label="Ekrana sığdır" icon="fit" shortcut="Num 5" disabled={!cadReady} onClick={() => viewportRef.current?.fit()}/>
            <UiNode as="details" name="cad-chrome" className="cad-chrome-menu" data-cad-menu="camera"><UiNode as="summary" aria-label="Kamera ve analiz araçları" title="Kamera ve analiz araçları"><CadIcon name="iso" size={19}/></UiNode><UiNode as="div" className="cad-menu-content">{(['iso', 'top', 'bottom', 'front', 'back', 'left', 'right'] as const).map(view => <UiNode as="button" type="button" key={view} disabled={!cadReady} onClick={() => { viewportRef.current?.setView(view); closeChromeMenus(); }}><CadIcon name={view === 'back' ? 'rear' : view} size={17}/><UiNode as="span">{cameraLabel(view)}</UiNode></UiNode>)}</UiNode></UiNode>
            <UiNode as="details" name="cad-chrome" className="cad-chrome-menu" data-cad-menu="analysis"><UiNode as="summary" aria-label="Kalınlık & kontrol" title="Kalınlık & kontrol"><CadIcon name={viewMode === 'contact' ? 'contacts' : viewMode} size={19}/></UiNode><UiNode as="div" className="cad-menu-content">{activeViews.map(mode => <UiNode as="button" type="button" key={mode} aria-pressed={viewMode === mode} disabled={!cadReady} onClick={() => { selectViewMode(mode); closeChromeMenus(); }}><CadIcon name={mode === 'contact' ? 'contacts' : mode} size={17}/><UiNode as="span">{viewLabel(mode)}</UiNode></UiNode>)}</UiNode></UiNode>
            {(!toolPanelVisible || focusMode) && <CadCommand label="Tasarım paneli" icon="tools" onClick={() => { setToolPanelVisible(true); setFocusMode(false); }}/>}
          </UiNode>
          <UiNode as="div" className="cad-watermark" aria-hidden="true"><BrandLogo width={172} height={39}/></UiNode>
          <UiNode as="div" className="cad-active-display"><CadIcon name={tool} size={19}/><UiNode as="strong">{toolLabel(tool)}</UiNode><UiNode as="span">{viewLabel(viewMode)}</UiNode>{['add', 'reduce', 'smooth', 'flatten'].includes(tool) && <UiNode as="span">Ø {(settings.brush_radius_mm * 2).toFixed(1)} mm</UiNode>}</UiNode>
          {viewMode==='contact'&&!sceneState.antagonistReady&&<UiNode as="div" className="cad-analysis-key">Antagonist ve kapanış verisini kontrol et</UiNode>}
          {viewMode !== 'natural' && viewMode !== 'wireframe' && viewMode !== 'section' && (viewMode!=='contact'||sceneState.antagonistReady) && <UiNode as="div" className="cad-analysis-key"><UiNode as="strong">{viewLabel(viewMode)}</UiNode><UiNode as="div"/><UiNode as="span">{viewMode === 'undercut' ? 'Ters yüzey → giriş yönü' : viewMode === 'thickness' ? <UiMessage source="Kaynak mesafesi · hedef {0} mm" values={[settings.minimum_thickness_mm.toFixed(2)]} userValues={[]}/> : 'Kaynak yüzeyine mesafe'}</UiNode></UiNode>}
          {recoveryDecisionPending && recoveryCandidate && <UiNode as="div" className="cad-recovery-notice" role="alert"><CadIcon name="reset"/><UiNode data-dy-copy-stack as="div"><UiNode as="strong">Kurtarma kaydı bulundu</UiNode><UiNode as="span">{formatRecoveryTime(recoveryCandidate.savedAt, intlLocale())} · Geometri ve ayarlar</UiNode></UiNode><UiNode as="button" type="button" onClick={restoreRecoveryDraft}>Geri yükle</UiNode><UiNode as="button" type="button" onClick={discardRecoveryDraft}>Vazgeç</UiNode></UiNode>}
                      {shortcutHelpOpen && (<UiNode as="section" style={ui.shortcutPanel}>
                <UiNode as="div" style={ui.shortcutHeader}>
                  <UiNode as="div">
                    <UiNode as="span" style={ui.shortcutEyebrow}>KLAVYE VE FARE</UiNode>
                    <UiNode as="strong" style={ui.shortcutTitle}>Hızlı kontrol & kısayollar</UiNode>
                  </UiNode>
                  <UiNode as="button" type="button" style={ui.shortcutClose} onClick={() => setShortcutHelpOpen(false)}>×</UiNode>
                </UiNode>

                <UiNode as="div" style={ui.shortcutGrid}>
                  {CAD_FIXED_SHORTCUTS.map((shortcut) => (<UiNode as="div" key={`${shortcut.key}-${shortcut.label}`} style={ui.shortcutRow}>
                      <UiNode as="kbd" style={ui.shortcutKey}>{shortcut.key}</UiNode>
                      <UiNode as="span">{shortcut.label}</UiNode>
                    </UiNode>))}
                </UiNode>

                <UiNode as="div" style={ui.shortcutToolbar}>
                  <UiNode as="button" type="button" style={ui.shortcutEditButton} onClick={() => setShortcutEditOpen((current) => !current)}>
                    {shortcutEditOpen ? "Kısayol düzenlemeyi kapat" : "Kısayolları özelleştir"}
                  </UiNode>
                  {shortcutEditOpen && (<UiNode as="button" type="button" style={ui.shortcutResetButton} onClick={resetCadShortcuts}>
                      {uiText(" Varsayılana dön ")}</UiNode>)}
                </UiNode>

                {shortcutEditOpen && (<UiNode as="div" style={ui.shortcutEditorGrid}>
                    {(Object.keys(CAD_SHORTCUT_ACTION_LABELS) as CadShortcutAction[]).map((action) => (<UiNode as="label" key={action} style={ui.shortcutEditRow}>
                        <UiNode as="span">{CAD_SHORTCUT_ACTION_LABELS[action]}</UiNode>
                        <UiNode as="input" aria-label={`${CAD_SHORTCUT_ACTION_LABELS[action]} kısayolu`} style={ui.shortcutInput} value={shortcutBindings[action].toUpperCase()} maxLength={1} inputMode="text" onChange={(event) => updateShortcutBinding(action, event.currentTarget.value)} uiMessages={{ "aria-label": { source: "{0} k\u0131sayolu", values: [CAD_SHORTCUT_ACTION_LABELS[action]], userValues: [] } }}/>
                      </UiNode>))}
                  </UiNode>)}

                <UiNode as="p" style={ui.shortcutFootnote}>
                  Kısa sağ tık araç menüsünü açar; sağ tuşla sürükleme döndürür, orta tuş kaydırır. Ctrl/Cmd + tekerlek hızlı zoomdur. Fırça presetleri; hardness/falloff ve X/Y simetri ayarları Serbest şekillendirme panelindedir. Kişisel kısayollar bu kullanıcı için tarayıcıda saklanır.
                </UiNode>
              </UiNode>)}


        </UiNode>
        {ayaOpen&&<CadAyaPanel key={ayaScope} context={ayaContext} onRun={runAyaAction} onClose={()=>setAyaOpen(false)}/>}
        <UiNode as="dialog" ref={saveDialogRef} className="cad-save-dialog" aria-label={exitFailure?'CAD projesi kaydedilemedi.':contextLoading?'Vaka yükleniyor…':'Kaydediliyor…'} onCancel={e=>{e.preventDefault();if(!exiting&&!submitting)setExitFailure(false);}}>
          {exitFailure?<><UiNode as="strong">CAD projesi kaydedilemedi.</UiNode><UiNode as="button" type="button" onClick={()=>void saveAndExit(exitDestinationRef.current)}>Kaydet ve çık</UiNode>{localExitReadyRef.current&&<UiNode as="button" type="button" onClick={()=>void exitWithLocalCopy()}>Yerel kaydet ve çık</UiNode>}<UiNode as="button" type="button" onClick={()=>setExitFailure(false)}>Kapat</UiNode></>:<UiNode as="p" role="status">{contextLoading?'Vaka yükleniyor…':'Kaydediliyor…'}</UiNode>}
        </UiNode>
        <UiNode as="footer" className="cad-status-bar"><UiNode as="span" role="status">{contextLoading ? 'Vaka yükleniyor…' : status}</UiNode><UiNode as="span">{activeSource?.source.fileName ? <UserText>{activeSource.source.fileName}</UserText> : 'Kaynak seçilmedi'} · mm</UiNode><UiNode as="span" title={performanceInfo ? `${performanceInfo.sourceTriangles} kaynak / ${performanceInfo.renderTriangles} görünüm / ${performanceInfo.kernelTriangles} analiz üçgeni` : undefined}>{performanceInfo ? <UiMessage source="{0} üçgen" values={[performanceInfo.renderTriangles.toLocaleString(intlLocale())]} userValues={[]}/> : ''}{localRecoverySavedAt && !recoveryDecisionPending ? <UiMessage source=" · Yerel {0}" values={[formatRecoveryTime(localRecoverySavedAt, intlLocale())]} userValues={[]}/> : ''}</UiNode></UiNode>

      </UiNode>
            {toolLibraryOpen && (<UiNode as="div" style={ui.toolLibraryBackdrop} onMouseDown={() => setToolLibraryOpen(false)}>
          <UiNode as="section" className="cad-command-browser" role="dialog" aria-modal="true" aria-label="Tasarım Araçları" style={ui.toolLibraryPanel} onMouseDown={(event) => event.stopPropagation()}>
            <UiNode as="header" style={ui.toolLibraryHeader}>
              <UiNode as="div">
                <UiNode as="p" style={ui.inspectorOverline}>DENTAYA DESIGN · ARAÇ KÜTÜPHANESİ</UiNode>
                <UiNode as="h2" style={ui.toolLibraryTitle}>Tasarım Araçları</UiNode>
                <UiNode as="p" style={ui.toolLibraryIntro}>
                  Aracı seçin, parametrelerini ayarlayın ve model üzerinde uygulayın.
                </UiNode>
              </UiNode>
              <UiNode as="button" type="button" className="cad-action" style={ui.secondaryButton} onClick={() => setToolLibraryOpen(false)}>Kapat ×</UiNode>
            </UiNode>

            <UiNode as="div" style={ui.toolLibraryControls}>
              <UiNode as="input" value={toolSearch} onChange={(event) => setToolSearch(event.target.value)} aria-label="CAD aracı ara" placeholder="Araç ara: marjin, ölçüm, bağlantı…" style={ui.toolLibrarySearch}/>
              <UiNode as="div" style={ui.toolCategoryRow}>
                {["Tümü", ...Array.from(new Set(availableCommands.map(item=>item.category)))].map((category) => (<UiNode as="button" key={category} type="button" className="cad-action" onClick={() => setToolCategory(category)} style={{
                    ...ui.categoryButton,
                    ...(toolCategory === category ? ui.categoryButtonActive : {}),
                }}>
                    {category}
                  </UiNode>))}
              </UiNode>
            </UiNode>

            <UiNode as="div" style={ui.toolLibraryStats}>
              <UiNode as="span"><UiNode as="strong">{availableCommands.length}</UiNode> {uiText(" aktif")}</UiNode>

            </UiNode>

            <UiNode as="div" style={ui.toolLibraryGrid}>
              {!filteredToolMatrix.length && <UiNode as="p">Bu filtreyle eşleşen araç yok.</UiNode>}
              {filteredToolMatrix.map((item) => (<UiNode as="button" key={item.activation} type="button" className="cad-tool-card" data-cad-activation={item.activation} disabled={!cadReady && !["command:job-setup", "command:save"].includes(item.activation ?? "")} onClick={() => activateMatrixTool(item)} style={ui.toolLibraryCard}>
                  <UiNode as="div" style={ui.toolLibraryCardTop}>
                    <UiNode as="span" style={ui.toolLibraryIcon}><CadIcon name={matrixIcon(item.category)} size={24}/></UiNode>
                    <UiNode as="span" style={{
                    ...ui.availabilityBadge,
                    ...(item.availability === "live"
                        ? ui.availabilityLive
                        : item.availability === "preview"
                            ? ui.availabilityPreview
                            : item.availability === "kernel"
                                ? ui.availabilityKernel
                                : ui.availabilityRoadmap),
                }}>
                      {cadAvailabilityLabel(item.availability)}
                    </UiNode>
                  </UiNode>
                  <UiNode as="small" style={ui.toolLibraryMeta}>{item.category} · {item.group}</UiNode>
                  <UiNode as="strong" style={ui.toolLibraryCardTitle}>{item.label}</UiNode>
                  <UiNode as="span" style={ui.toolLibraryCardText}>{item.description}</UiNode>
                </UiNode>))}
            </UiNode>
          </UiNode>
        </UiNode>)}

    </UiNode>);
}
const CAD_PANEL_TABS: {
    id: CadPanelTab;
    label: string;
    icon: CadIconName;
}[] = [
    { id: 'freeform', label: 'Serbest', icon: 'add' },
    { id: 'anatomy', label: 'Anatomi', icon: 'design' },
    { id: 'margin', label: 'Marjin', icon: 'margin' },
    { id: 'fit', label: 'İç yüzey', icon: 'undercut' },
    { id: 'contacts', label: 'Bağlantı', icon: 'connector' },
    { id: 'inspect', label: 'Kontrol', icon: 'measure' },
    { id: 'review', label: 'Son kontrol', icon: 'review' },
    { id: 'files', label: 'Çalışma', icon: 'file' },
];
function closeChromeMenus() {
    document.querySelectorAll<HTMLDetailsElement>('.cad-chrome-menu[open]').forEach(menu => { menu.open = false; });
}
function cadTaskLabel(tab: CadPanelTab) {
    return ({ files: 'Tarama verisi', margin: 'Preparasyon marjini', fit: 'İç yüzey', anatomy: 'Anatomi', freeform: 'Serbest şekillendirme', contacts: 'Temas & karşıt çene', inspect: 'Kalınlık & kontrol', review: 'Son kontrol' } as Record<CadPanelTab, string>)[tab];
}
function cameraLabel(view: string) {
    return ({ iso: 'İzometrik', top: 'Üstten', bottom: 'Alttan', front: 'Önden', back: 'Arkadan', left: 'Soldan', right: 'Sağdan' } as Record<string, string>)[view] ?? view;
}
function matrixIcon(category: string): CadIconName {
    return ({ 'Serbest biçim': 'add', 'Marjin': 'margin', 'Analiz': 'measure', 'Görünüm': 'eye', 'Anatomi': 'design', 'Connector': 'connector', 'İç yüzey': 'undercut', 'Dosya': 'file' } as Record<string, CadIconName>)[category] ?? 'tools';
}
function miniIcon(label: string): CadIconName {
    const value = label.toLocaleLowerCase('tr');
    if (value.includes('temiz') || value.includes('son '))
        return 'reset';
    if (value.includes('marjin') || value.includes('projekte'))
        return 'margin';
    if (value.includes('yumuş') || value.includes('smooth'))
        return 'smooth';
    if (value.includes('kesit'))
        return 'section';
    if (value.includes('connector') || value.includes('bağlantı'))
        return 'connector';
    if (value.includes('ölç'))
        return 'measure';
    if (value.includes('yuvarlak'))
        return 'round';
    if (value.includes('sivri'))
        return 'pointed';
    if (value === 'düz')
        return 'flat';
    if (value.includes('eksen'))
        return 'symmetry';
    return 'settings';
}
function CadCommand({ label, icon, shortcut, active = false, disabled = false, onClick }: {
    label: string;
    icon: CadIconName;
    shortcut?: string;
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
}) {
    return <UiNode as="button" type="button" className="cad-icon-command" aria-label={label} title={shortcut ? `${label} · ${shortcut}` : label} aria-pressed={active} disabled={disabled} onClick={onClick} data-cad-state-cue><CadIcon name={icon}/></UiNode>;
}
const CAD_FIXED_SHORTCUTS = [
    { key: 'Num 1 / 2 / 3 / 4 / 6 / 8 / 9', label: 'Ön / alt / arka / sol / sağ / üst / izometrik' },
    { key: 'Num 5', label: 'Ekrana sığdır' },
    { key: 'Ctrl/Cmd + S', label: 'Projeyi kaydet' },
    { key: "Sağ tık", label: "Araç menüsünü aç" },
    { key: "Sağ tuşla sürükle", label: "Her araçta modeli döndür" },
    { key: "Alt + 1 / 2 / 3 / 4", label: "Üst çene / alt çene / yapılan diş / tarama grubu aç-kapat" },
    { key: "Orta mouse", label: "Her araçta görünümü kaydır (pan)" },
    { key: "Fare tekerleği", label: "Sculpt sırasında fırça yarıçapı" },
    { key: "Shift + tekerlek", label: "Sculpt sırasında fırça gücü" },
    { key: "Ctrl/Cmd + tekerlek", label: "Sculpt sırasında hızlı zoom" },
    { key: "Shift / Alt", label: "Ekle ↔ Çıkar yönünü geçici ters çevir" },
    { key: "Space", label: "Basılı tut: geçici döndürme" },
    { key: "[ / ]", label: "Fırça yarıçapını küçült / büyüt" },
    { key: "Shift + [ / ]", label: "Fırça gücünü azalt / artır" },
    { key: "Ctrl/Cmd + Z", label: "Geri al" },
    { key: "Ctrl/Cmd + Y", label: "İleri al" },
    { key: "H / ?", label: "Bu kısayol panelini aç / kapat" },
] as const;
function toolLabel(tool: CadTool) {
    return ({
        orbit: "Döndür",
        margin: "Marjin",
        measure: "Ölç",
        add: "Katı Ekle",
        reduce: "Çıkar",
        smooth: "Yumuşat",
        flatten: "Düzleştir",
        connector: "Connector",
    } as Record<CadTool, string>)[tool];
}
function viewLabel(view: CadViewMode) {
    return ({
        natural: "Doğal",
        contact: "Temas",
        thickness: "Kalınlık",
        undercut: "Undercut",
        wireframe: "Tel",
        section: "Kesit",
    } as Record<CadViewMode, string>)[view];
}
function Section({ title, children, tab, category }: {
    tab: CadPanelTab;
    category: CadPanelTab;
    title: string;
    children: ReactNode;
}) {
    const { t: uiText } = useTranslation();
    if (tab !== category)
        return null;
    const primary = ({ files: 'Çalışma taraması', margin: 'Preparasyon marjini', fit: 'Internal Fit', anatomy: 'Anatomi formları', freeform: 'Serbest şekillendirme', contacts: 'Temas & karşıt çene', inspect: 'Kalınlık & kontrol', review: 'Son kontrol' } as Record<CadPanelTab, string>)[category] === title;
    return (<UiNode as="details" name="cad-inspector" open={primary} data-primary={primary} className="cad-inspector-section">
      <UiNode as="summary">{uiText(title)}</UiNode>
      <UiNode as="div" className="cad-section-body">{children}</UiNode>
    </UiNode>);
}
function InfoRow({ label, value, }: {
    label: string;
    value: string;
}) {
    return (<UiNode as="div" style={ui.infoRow}>
      <UiNode as="span">{label}</UiNode>
      <UiNode as="strong">{value}</UiNode>
    </UiNode>);
}
function Slider({ label, value, min, max, step, unit, onChange, }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit: string;
    onChange: (value: number) => void;
}) {
    return (<UiNode as="div" style={ui.slider}>
      <UiNode as="div" style={ui.sliderHead}>
        <UiNode as="span">{label}</UiNode>
        <UiNode as="span" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <UiNode as="input" key={value} aria-label={`${label} sayısal değer`} type="number" defaultValue={value} min={min} max={max} step={step} className="cad-numeric-input" onKeyDown={event => {
            if (event.key === "Enter")
                event.currentTarget.blur();
        }} onBlur={event => {
            const parsed = event.currentTarget.valueAsNumber;
            if (!Number.isFinite(parsed)) {
                event.currentTarget.value = String(value);
                return;
            }
            const next = Number(Math.min(max, Math.max(min, Math.round((parsed - min) / step) * step + min)).toFixed(6));
            event.currentTarget.value = String(next);
            onChange(next);
        }} uiMessages={{ "aria-label": { source: "{0} say\u0131sal de\u011Fer", values: [label], userValues: [] } }}/>{unit}
        </UiNode>
      </UiNode>
      <UiNode as="input" type="range" aria-label={`${label} sürgüsü`} min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} style={ui.rangeInput} uiMessages={{ "aria-label": { source: "{0} s\u00FCrg\u00FCs\u00FC", values: [label], userValues: [] } }}/>
    </UiNode>);
}
function MiniButton({ label, active = false, onClick, }: {
    label: string;
    active?: boolean;
    onClick: () => void;
}) {
    return (<UiNode as="button" type="button" className="cad-action cad-mini-command" aria-pressed={active} onClick={onClick} style={{
            ...ui.miniButton,

        }}>
      <CadIcon name={miniIcon(label)} size={16}/><UiNode as="span">{label}</UiNode>
    </UiNode>);
}
function PresetCard({ title, detail, onClick, active = false }: {
    active?: boolean;
    title: string;
    detail: string;
    onClick: () => void;
}) {
    return (<UiNode as="button" type="button" className="cad-action cad-anatomy-preset" aria-pressed={active} onClick={onClick} style={ui.presetCard}>
      <CadIcon name="design" size={25}/><UiNode as="strong">{title}</UiNode>
      <UiNode as="span">{detail}</UiNode>
    </UiNode>);
}
function Toggle({ label, checked, onChange, }: {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) {
    const { t: uiText } = useTranslation();
    return (<UiNode as="label" style={ui.toggleRow}>
      <UiNode as="span">{uiText(label)}</UiNode>
      <UiNode as="input" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)}/>
    </UiNode>);
}
function QualityGate({ ok, title, detail, }: {
    ok: boolean;
    title: string;
    detail: string;
}) {
    return (<UiNode as="div" className="cad-quality-row" style={ui.qualityGate}>
      <UiNode as="span" style={{
            ...ui.qualityDot,
            background: ok ? dy.accent : dy.surface2,
            color: ok ? dy.accentContrast : dy.muted,
        }}>
        {ok ? "✓" : "•"}
      </UiNode>
      <UiNode as="span" style={ui.qualityText}>
        <UiNode as="strong">{title}</UiNode>
        <UiNode as="small">{detail}</UiNode>
      </UiNode>
    </UiNode>);
}
function StatusBadge({ value }: {
    value: string;
}) {
    return <UiNode as="span" style={ui.statusBadge}>{statusLabel(value)}</UiNode>;
}
function statusLabel(value: string) {
    return ({
        draft: "Taslak",
        working: "Çalışılıyor",
        ready_for_review: "İnceleme",
        revision: "Revizyon",
        approved: "Onaylandı",
        archived: "Arşiv",
    }[value] ?? value);
}
function purposeLabel(value: string | null) {
    return ({
        clinical: "Klinik",
        intraoral: "Ağız içi",
        preop: "Tedavi öncesi",
        working_model: "Çalışma modeli",
        master_model: "Ana model",
        antagonist: "Karşıt çene",
        bite: "Kapanış",
        die: "Preparasyon",
        waxup: "Mum model",
        verification: "Doğrulama",
        design_reference: "Tasarım referansı",
        other: "Diğer",
    }[value ?? ""] ?? "Tarama");
}
function archLabel(value: string) {
    return ({
        upper: "Üst ark",
        lower: "Alt ark",
        full: "Tam ark",
        bite: "Kapanış",
        tooth: "Diş",
        other: "Diğer",
    }[value] ?? value);
}
function formatDate(value: string, localeTag: string = "tr-TR") {
    return new Intl.DateTimeFormat(localeTag, {
        day: "2-digit",
        month: "short",
        year: "2-digit",
    }).format(new Date(value));
}
function formatRecoveryTime(value: number, localeTag: string = "tr-TR") {
    return new Intl.DateTimeFormat(localeTag, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).format(new Date(value));
}
const ui: Record<string, CSSProperties> = {
    loading: {
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: dy.bg,
        color: dy.muted,
        fontSize: 15,
    },
    blocked: {
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: dy.bg,
        color: dy.text,
    },
    blockCard: {
        width: "min(680px,100%)",
        padding: 28,
        borderRadius: dy.radius,
        border: `1px solid ${dy.border}`,
        background: dy.surface,
    },
    blockTitle: {
        margin: "8px 0 10px",
        fontSize: 34,
    },
    muted: {
        color: dy.muted,
        lineHeight: 1.6,
    },
    eyebrow: {
        margin: 0,
        color: dy.accent,
        fontSize: 13,
        fontWeight: 900,
        letterSpacing: ".13em",
    },
    primaryLink: {
        display: "inline-block",
        marginTop: 14,
        padding: "11px 14px",
        borderRadius: 10,
        background: dy.accent,
        color: dy.accentContrast,
        textDecoration: "none",
        fontWeight: 850,
    },
    secondaryButton: {
        minHeight: 38,
        padding: "0 13px",
        borderRadius: 9,
        border: `1px solid ${dy.border}`,
        background: dy.surface2,
        color: dy.text,
        fontSize: 13,
        fontWeight: 850,
        cursor: "pointer",
    },
    statusBadge: {
        alignSelf: "flex-start",
        padding: "5px 7px",
        borderRadius: 999,
        background: dy.accentSoft,
        color: dy.accent,
        fontSize: 13,
        fontWeight: 900,
    },
    shortcutPanel: {
        position: "absolute",
        right: 12,
        top: 72,
        zIndex: 30,
        width: "min(420px, calc(100% - 24px))",
        maxHeight: "calc(100% - 92px)",
        overflowY: "auto",
        padding: 12,
        borderRadius: 14,
        border: `1px solid ${dy.border}`,
        background: "rgba(7,17,25,.96)",
        boxShadow: "0 18px 55px rgba(0,0,0,.34)",
        backdropFilter: "blur(18px)",
    },
    shortcutHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 10,
    },
    shortcutEyebrow: {
        display: "block",
        color: dy.accent,
        fontSize: 9,
        fontWeight: 900,
        letterSpacing: ".12em",
    },
    shortcutTitle: {
        display: "block",
        marginTop: 3,
        color: dy.text,
        fontSize: 16,
    },
    shortcutClose: {
        width: 30,
        height: 30,
        borderRadius: 8,
        border: `1px solid ${dy.border}`,
        background: dy.surface2,
        color: dy.text,
        fontSize: 20,
        cursor: "pointer",
    },
    shortcutGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 7,
    },
    shortcutRow: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        minHeight: 34,
        padding: "5px 7px",
        borderRadius: 9,
        background: dy.surface2,
        color: dy.muted,
        fontSize: 11,
    },
    shortcutKey: {
        minWidth: 48,
        padding: "3px 6px",
        borderRadius: 6,
        border: `1px solid ${dy.border}`,
        background: "rgba(255,255,255,.04)",
        color: dy.accent,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 10,
        fontWeight: 900,
        textAlign: "center",
    },
    shortcutFootnote: {
        margin: "10px 0 0",
        color: dy.muted,
        fontSize: 10,
        lineHeight: 1.45,
    },
    shortcutToolbar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        marginTop: 10,
    },
    shortcutEditButton: {
        minHeight: 32,
        padding: "0 10px",
        borderRadius: 8,
        border: `1px solid ${dy.accent}`,
        background: dy.accentSoft,
        color: dy.accent,
        fontSize: 10,
        fontWeight: 900,
        cursor: "pointer",
    },
    shortcutResetButton: {
        minHeight: 32,
        padding: "0 10px",
        borderRadius: 8,
        border: `1px solid ${dy.border}`,
        background: dy.surface2,
        color: dy.muted,
        fontSize: 10,
        fontWeight: 850,
        cursor: "pointer",
    },
    shortcutEditorGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2,minmax(0,1fr))",
        gap: 7,
        marginTop: 9,
    },
    shortcutEditRow: {
        minHeight: 38,
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) 42px",
        alignItems: "center",
        gap: 8,
        padding: "5px 7px",
        borderRadius: 9,
        background: dy.surface2,
        color: dy.muted,
        fontSize: 10,
    },
    shortcutInput: {
        width: 40,
        height: 28,
        borderRadius: 7,
        border: `1px solid ${dy.border}`,
        background: dy.input,
        color: dy.accent,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 12,
        fontWeight: 950,
        textAlign: "center",
        outline: "none",
    },
    inspectorOverline: {
        margin: 0,
        color: dy.accent,
        fontSize: 13,
        fontWeight: 900,
        letterSpacing: ".12em",
    },
    infoRow: {
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        color: dy.muted,
        fontSize: 13,
    },
    field: {
        display: "grid",
        gap: 5,
        color: dy.muted,
        fontSize: 13,
        fontWeight: 750,
    },
    input: {
        minHeight: 40,
        width: "100%",
        borderRadius: 9,
        border: `1px solid ${dy.border}`,
        background: dy.input,
        color: dy.text,
        padding: "0 9px",
        outline: "none",
        fontSize: 13,
    },
    slider: {
        display: "grid",
        gap: 6,
    },
    sliderHead: {
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        color: dy.muted,
        fontSize: 13,
    },
    rangeInput: {
        width: "100%",
    },
    inlineGrid2: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 6,
    },
    inlineGrid3: {
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: 6,
    },
    inlineGrid4: {
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 5,
    },
    miniButton: {
        minHeight: 36,
        borderRadius: 8,
        border: `1px solid ${dy.border}`,
        background: dy.input,
        color: dy.text,
        fontSize: 13,
        fontWeight: 850,
        cursor: "pointer",
    },
    miniButtonActive: {
        borderColor: dy.accent,
        background: dy.accentSoft,
        color: dy.accent,
    },
    presetGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: 6,
    },
    presetCard: {
        minHeight: 82,
        padding: 9,
        display: "grid",
        alignContent: "space-between",
        gap: 5,
        borderRadius: 9,
        border: `1px solid ${dy.border}`,
        background: dy.input,
        color: dy.text,
        textAlign: "left",
        cursor: "pointer",
        fontSize: 13,
    },
    analysisButton: {
        minHeight: 39,
        borderRadius: 9,
        border: `1px solid ${dy.accent}`,
        background: dy.accentSoft,
        color: dy.accent,
        fontWeight: 900,
        cursor: "pointer",
        fontSize: 13,
    },
    analysisButtonActive: {
        boxShadow: `0 0 0 2px ${dy.accentSoft}, 0 0 28px ${dy.accentSoft}`,
        background: dy.accent,
        color: dy.accentContrast,
    },
    kernelReport: {
        display: "grid",
        gap: 4,
        padding: 9,
        borderRadius: 10,
        border: `1px solid ${dy.border}`,
        background: dy.surface2,
    },
    helperText: {
        margin: 0,
        padding: 9,
        borderRadius: 9,
        border: `1px solid ${dy.border}`,
        background: dy.surface2,
        color: dy.muted,
        fontSize: 13,
        lineHeight: 1.55,
    },
    readinessGrid: {
        display: "grid",
        gap: 6,
    },
    qualityGate: {
        minHeight: 54,
        display: "grid",
        gridTemplateColumns: "30px minmax(0,1fr)",
        alignItems: "center",
        gap: 8,
        padding: 8,
        borderRadius: 9,
        border: `1px solid ${dy.border}`,
        background: dy.input,
    },
    qualityDot: {
        width: 26,
        height: 26,
        display: "grid",
        placeItems: "center",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 900,
    },
    qualityText: {
        minWidth: 0,
        display: "grid",
        gap: 4,
        color: dy.text,
        fontSize: 13,
    },
    saveWideButton: {
        minHeight: 42,
        borderRadius: 9,
        border: `1px solid ${dy.border}`,
        background: dy.surface2,
        color: dy.text,
        fontWeight: 850,
        cursor: "pointer",
        fontSize: 13,
    },
    submitWideButton: {
        minHeight: 46,
        borderRadius: 9,
        border: `1px solid ${dy.accent}`,
        background: dy.accent,
        color: dy.accentContrast,
        fontWeight: 900,
        cursor: "pointer",
        fontSize: 13,
    },
    secondaryWideButton: {
        minHeight: 40,
        borderRadius: 9,
        border: `1px solid ${dy.border}`,
        background: dy.surface2,
        color: dy.text,
        fontWeight: 850,
        cursor: "pointer",
        fontSize: 13,
    },
    brushShapeRow: {
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: 6,
    },
    brushPresetGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: 6,
        marginBottom: 2,
    },
    symmetryCard: {
        display: "grid",
        gap: 8,
        padding: 9,
        borderRadius: 10,
        border: `1px solid ${dy.border}`,
        background: dy.input,
    },
    symmetryHeader: {
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) auto",
        alignItems: "center",
        gap: 10,
        color: dy.text,
        fontSize: 11,
    },
    toolLibraryBackdrop: {
        position: "fixed",
        inset: 0,
        zIndex: 120,
        display: "grid",
        placeItems: "center",
        padding: 22,
        background: "rgba(1,7,12,.78)",
        backdropFilter: "blur(14px)",
    },
    toolLibraryPanel: {
        width: "min(1500px,96vw)",
        maxHeight: "92vh",
        overflow: "auto",
        padding: 20,
        border: `1px solid ${dy.border}`,
        borderRadius: 20,
        background: `linear-gradient(180deg,${dy.surface},${dy.bg})`,
        boxShadow: `0 34px 100px ${dy.shadow}`,
    },
    toolLibraryHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 18,
        marginBottom: 14,
    },
    toolLibraryTitle: {
        margin: "3px 0 6px",
        color: dy.text,
        fontSize: 28,
        lineHeight: 1.12,
        letterSpacing: "-.025em",
    },
    toolLibraryIntro: {
        maxWidth: 920,
        margin: 0,
        color: dy.muted,
        fontSize: 13,
        lineHeight: 1.6,
    },
    toolLibraryControls: {
        position: "sticky",
        top: -20,
        zIndex: 4,
        display: "grid",
        gap: 9,
        padding: "14px 0 10px",
        background: `linear-gradient(180deg,${dy.surface} 76%,transparent)`,
    },
    toolLibrarySearch: {
        width: "100%",
        minHeight: 46,
        padding: "0 14px",
        borderRadius: 11,
        border: `1px solid ${dy.border}`,
        background: dy.input,
        color: dy.text,
        outline: "none",
    },
    toolCategoryRow: {
        display: "flex",
        gap: 6,
        overflowX: "auto",
        paddingBottom: 3,
    },
    categoryButton: {
        minHeight: 34,
        padding: "0 10px",
        flex: "0 0 auto",
        borderRadius: 999,
        border: `1px solid ${dy.border}`,
        background: dy.surface2,
        color: dy.muted,
        fontSize: 12,
        fontWeight: 850,
        cursor: "pointer",
    },
    categoryButtonActive: {
        borderColor: dy.accent,
        background: dy.accentSoft,
        color: dy.accent,
    },
    toolLibraryStats: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        margin: "3px 0 13px",
        color: dy.muted,
        fontSize: 12,
    },
    toolLibraryGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))",
        gap: 9,
    },
    toolLibraryCard: {
        minHeight: 162,
        padding: 13,
        display: "grid",
        alignContent: "start",
        gap: 7,
        borderRadius: 13,
        border: `1px solid ${dy.border}`,
        background: dy.surface2,
        color: dy.text,
        textAlign: "left",
        cursor: "pointer",
    },
    toolLibraryCardTop: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
    },
    toolLibraryIcon: {
        width: 32,
        height: 32,
        display: "grid",
        placeItems: "center",
        borderRadius: 9,
        background: dy.accentSoft,
        color: dy.accent,
        fontSize: 17,
        fontWeight: 950,
    },
    availabilityBadge: {
        padding: "5px 7px",
        borderRadius: 999,
        fontSize: 9,
        fontWeight: 950,
        letterSpacing: ".06em",
        border: "1px solid transparent",
    },
    availabilityLive: {
        color: "#63cc98",
        borderColor: "rgba(99,204,152,.34)",
        background: "rgba(99,204,152,.08)",
    },
    availabilityPreview: {
        color: "#72b8ff",
        borderColor: "rgba(114,184,255,.34)",
        background: "rgba(114,184,255,.08)",
    },
    availabilityKernel: {
        color: "#e8bd73",
        borderColor: "rgba(232,189,115,.34)",
        background: "rgba(232,189,115,.08)",
    },
    availabilityRoadmap: {
        color: dy.muted,
        borderColor: dy.border,
        background: dy.input,
    },
    toolLibraryMeta: {
        color: dy.accent,
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: ".06em",
        textTransform: "uppercase",
    },
    toolLibraryCardTitle: {
        fontSize: 14,
        lineHeight: 1.25,
    },
    toolLibraryCardText: {
        color: dy.muted,
        fontSize: 12,
        lineHeight: 1.5,
    },
    toggleRow: {
        minHeight: 34,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        color: dy.muted,
        fontSize: 13,
    },
};
