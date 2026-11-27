"use client";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useMemo, useRef, useState, } from "react";
import Link from "@/lib/i18n/UiLink";
import { useRouter, useSearchParams, } from "next/navigation";
import { dentayaError } from "@/lib/dentaya-errors";
import { supabase } from "@/lib/supabase";
import { useDentayaThemeRuntime } from "@/app/dentaya-theme";
import ConnectionStatus from "@/app/ConnectionStatus";
import LocalScanPreview, { type LocalScanStats } from "./LocalScanPreview";
import CadIcon from "@/app/design/CadIcon";
import { scanStudioText } from "@/lib/i18n/scan-studio";
import "./scan-workspace.css";
type Patient = {
    id: string;
    external_ref: string | null;
    first_name: string;
    last_name: string;
};
type CaseRow = {
    id: string;
    case_number: string;
    patient_id: string;
    patient_reference: string;
    title: string;
    tooth_codes: string[];
    status: string;
};
type Org = {
    id: string;
    name: string;
    org_type: "clinic" | "laboratory" | "courier";
};
const stages = [
    { id: "upper", label: "Üst çene", icon: "top" },
    { id: "lower", label: "Alt çene", icon: "bottom" },
    { id: "bite", label: "Kapanış", icon: "contacts" },
] as const;
type ScanArch = typeof stages[number]["id"] | "full" | "tooth";
type ScanDraft = { file: File; stats: LocalScanStats | null; confirmed: boolean; error: string };
const archLabels = { upper: "Üst çene", lower: "Alt çene", bite: "Kapanış", full: "Tam ark", tooth: "Tek diş" } as const;
const fileLimit = 50 * 1024 * 1024;

export default function ScanStudioClient() {
    const { t: uiText, intlLocale, locale } = useTranslation();
    const copy = scanStudioText(locale);
    useDentayaThemeRuntime();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [org, setOrg] = useState<Org | null>(null);
    const [userId, setUserId] = useState("");
    const [patients, setPatients] = useState<Patient[]>([]);
    const [cases, setCases] = useState<CaseRow[]>([]);
    const [patientId, setPatientId] = useState("");
    const [caseId, setCaseId] = useState("");
    const [arch, setArch] = useState<ScanArch>("upper");
    const [purpose, setPurpose] = useState("intraoral");
    const [captureMethod, setCaptureMethod] = useState("import");
    const [scannerBrand, setScannerBrand] = useState("");
    const [scannerModel, setScannerModel] = useState("");
    const [completeness, setCompleteness] = useState("");
    const [shade, setShade] = useState("");
    const [notes, setNotes] = useState("");
    const [drafts, setDrafts] = useState<Partial<Record<ScanArch, ScanDraft>>>({});
    const [savedStages, setSavedStages] = useState<Partial<Record<ScanArch, boolean>>>({});
    const [dialog, setDialog] = useState<"record" | "mesh" | null>(null);
    const [frame, setFrame] = useState(0);
    const [wireframe, setWireframe] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const draft = drafts[arch];
    const file = draft?.file ?? null;
    const stats = draft?.stats ?? null;
    const unitsConfirmed = draft?.confirmed === true;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const saveLock = useRef(false);
    const scanRequests = useRef<Partial<Record<ScanArch, { key: string; id: string }>>>({});
    const [message, setMessage] = useState("");
    const [blocked, setBlocked] = useState("");
    const isLab = org?.org_type ===
        "laboratory";
    const isClinic = org?.org_type === "clinic";
    const patientCases = useMemo(() => cases.filter((item) => item.patient_id ===
        patientId), [cases, patientId]);
    const selectedCase = useMemo(() => cases.find((item) => item.id === caseId) ?? null, [cases, caseId]);
    useEffect(() => {
        let active = true;
        async function initialize() {
            const { data: session } = await supabase.auth
                .getSession();
            const user = session.session?.user;
            if (!user) {
                router.replace("/workspace");
                return;
            }
            setUserId(user.id);
            const { data: membership } = await supabase
                .from("memberships")
                .select("organization_id")
                .eq("user_id", user.id)
                .eq("status", "active")
                .limit(1)
                .maybeSingle();
            if (!membership) {
                setBlocked("Aktif kurum bulunamadı.");
                setLoading(false);
                return;
            }
            const { data: orgData } = await supabase
                .from("organizations")
                .select("id,name,org_type")
                .eq("id", membership.organization_id)
                .maybeSingle();
            if (!orgData) {
                setBlocked("Kurum bilgisi alınamadı.");
                setLoading(false);
                return;
            }
            const currentOrg = orgData as Org;
            setOrg(currentOrg);
            if (currentOrg.org_type ===
                "courier") {
                setBlocked("Tarama Stüdyosu yalnızca klinik ve laboratuvar hesaplarında kullanılır.");
                setLoading(false);
                return;
            }
            const requestedPatient = searchParams.get("patient") ?? "";
            const requestedCase = searchParams.get("case") ?? "";
            if (currentOrg.org_type ===
                "clinic") {
                const [patientResult, caseResult,] = await Promise.all([
                    supabase
                        .from("patients")
                        .select("id,external_ref,first_name,last_name")
                        .eq("owning_org_id", currentOrg.id)
                        .order("created_at", {
                        ascending: false,
                    }),
                    supabase
                        .from("cases")
                        .select("id,case_number,patient_id,patient_reference,title,tooth_codes,status")
                        .eq("clinic_org_id", currentOrg.id)
                        .neq("status", "cancelled")
                        .order("updated_at", {
                        ascending: false,
                    }),
                ]);
                if (!active)
                    return;
                const patientRows = (patientResult.data ??
                    []) as Patient[];
                const caseRows = (caseResult.data ??
                    []) as CaseRow[];
                const requestedCaseRow = caseRows.find((item) => item.id ===
                    requestedCase);
                const nextPatient = patientRows.some((item) => item.id ===
                    requestedPatient)
                    ? requestedPatient
                    : requestedCaseRow
                        ?.patient_id ??
                        patientRows[0]
                            ?.id ??
                        "";
                setPatients(patientRows);
                setCases(caseRows);
                setPatientId(nextPatient);
                setCaseId(requestedCaseRow
                    ?.id ?? "");
                setPurpose("intraoral");
            }
            else {
                const { data, error, } = await supabase
                    .from("cases")
                    .select("id,case_number,patient_id,patient_reference,title,tooth_codes,status")
                    .eq("lab_org_id", currentOrg.id)
                    .neq("status", "cancelled")
                    .order("updated_at", {
                    ascending: false,
                });
                if (error) {
                    setMessage(dentayaError(error, "Laboratuvar vakaları yüklenemedi."));
                }
                if (!active)
                    return;
                const rows = (data ??
                    []) as CaseRow[];
                const nextCase = rows.some((item) => item.id ===
                    requestedCase)
                    ? requestedCase
                    : rows[0]?.id ??
                        "";
                const nextRow = rows.find((item) => item.id ===
                    nextCase);
                setCases(rows);
                setCaseId(nextCase);
                setPatientId(nextRow?.patient_id ??
                    "");
                setPurpose("master_model");
            }
            setLoading(false);
        }
        void initialize();
        return () => {
            active = false;
        };
    }, [
        router,
        searchParams,
    ]);
    useEffect(() => {
        if (isLab &&
            selectedCase) {
            setPatientId(selectedCase.patient_id);
        }
    }, [
        isLab,
        selectedCase,
    ]);
    useEffect(() => {
        if (isClinic &&
            caseId &&
            !patientCases.some((item) => item.id === caseId)) {
            setCaseId("");
        }
    }, [
        isClinic,
        caseId,
        patientCases,
    ]);
    useEffect(() => {
        const element = dialogRef.current;
        if (!element) return;
        if (dialog && !element.open) element.showModal();
        if (!dialog && element.open) element.close();
    }, [dialog]);

    const handleStats = useCallback((value: LocalScanStats | null, error = "") => {
        setDrafts(current => {
            const matching = current[arch];
            if (!matching || matching.file !== file) return current;
            return { ...current, [arch]: { ...matching, stats: value, error } };
        });
    }, [arch, file]);

    function selectArch(next: ScanArch) {
        if (saving || next === arch) return;
        setArch(next);
        setMessage("");
        setWireframe(false);
    }

    function selectFile(next: File | undefined) {
        if (!next || saving) return;
        if (!/\.(stl|ply)$/i.test(next.name)) {
            setMessage("Bu sürüm yalnızca STL ve PLY mesh dosyalarını kabul eder.");
            return;
        }
        if (!next.size || next.size > fileLimit) {
            setMessage(next.size ? copy.tooLarge : copy.emptyFile);
            return;
        }
        delete scanRequests.current[arch];
        setDrafts(current => ({ ...current, [arch]: { file: next, stats: null, confirmed: false, error: "" } }));
        setSavedStages(current => ({ ...current, [arch]: false }));
        setWireframe(false);
        setMessage("");
    }

    function removeFile() {
        if (saving) return;
        delete scanRequests.current[arch];
        setDrafts(current => ({ ...current, [arch]: undefined }));
        setMessage("");
    }
    async function saveScan() {
        if (!org ||
            org.org_type ===
                "courier") {
            return;
        }
        if (!patientId) {
            setMessage(isLab
                ? "Seçili vakada hasta bağlantısı bulunamadı."
                : "Önce hasta seç.");
            return;
        }
        if (isLab &&
            !caseId) {
            setMessage("Laboratuvar taraması mutlaka bir vakaya bağlı olmalıdır.");
            return;
        }
        if (!file) {
            setMessage("Önce STL veya PLY dosyası seç.");
            return;
        }
        const lower = file.name.toLowerCase();
        if (!lower.endsWith(".stl") &&
            !lower.endsWith(".ply")) {
            setMessage("Bu sürüm yalnızca STL ve PLY mesh dosyalarını kabul eder.");
            return;
        }
        if (file.size <= 0) {
            setMessage("Seçilen dosya boş görünüyor. STL / PLY dosyasını tekrar seç.");
            return;
        }
        if (file.size > fileLimit) {
            setMessage("Tarama dosyası 50 MB sınırını aşıyor. Dosyayı küçültüp tekrar dene.");
            return;
        }
        if (!stats) {
            setMessage("Mesh analizi henüz tamamlanmadı. 3D önizleme ve kalite sonuçları geldikten sonra kaydet.");
            return;
        }
        if (stats.intakeStatus ===
            "reject") {
            setMessage("Mesh intake kontrolü kritik hata buldu. Dosyayı düzeltmeden taramayı kaydetme.");
            return;
        }
        if (!unitsConfirmed) {
            setMessage("STL / PLY ölçülerinin milimetre olduğunu doğrula.");
            return;
        }
        const quality = completeness.trim() ? Number(completeness) : null;
        if (quality !== null && (!Number.isFinite(quality) || quality < 0 || quality > 100)) {
            setMessage("Tarama bütünlüğü 0 ile 100 arasında olmalı.");
            return;
        }
        if (notes.trim().length > 4000) {
            setMessage("Teknik not 4000 karakterden uzun olamaz.");
            return;
        }
        if (typeof navigator !== "undefined" &&
            !navigator.onLine) {
            setMessage("İnternet bağlantısı yok. Tarama yüklemeden önce bağlantının gelmesini bekle.");
            return;
        }
        if (saveLock.current) {
            return;
        }
        saveLock.current = true;
        const key = `${org.id}:${patientId}:${caseId}`;
        const previous = scanRequests.current[arch];
        const requestId = previous?.key === key ? previous.id : crypto.randomUUID();
        scanRequests.current[arch] = { key, id: requestId };
        const scanPurpose = arch === "bite" ? "bite" : purpose;
        setSaving(true);
        setMessage("Tarama güvenli depolamaya aktarılıyor…");
        try {
            const folder = caseId
                ? `cases/${caseId}/${isLab ? "lab-scans" : "scans"}`
                : `patients/${patientId}/scans`;
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const path = `${folder}/${requestId}-${safeName}`;
            const { error: uploadError, } = await supabase.storage
                .from("dentaya-files")
                .upload(path, file, {
                contentType: file.type ||
                    "application/octet-stream",
                upsert: true,
            });
            if (uploadError) {
                setMessage(dentayaError(uploadError, "Tarama dosyası yüklenemedi."));
                return;
            }
            const scanRef = `${isLab ? "LABSCAN" : "SCAN"}-${new Date()
                .toISOString()
                .slice(0, 10)
                .replaceAll("-", "")}-${requestId
                .replaceAll("-", "")
                .slice(0, 8)
                .toUpperCase()}`;
            const scanInsert = await supabase
                .from("scan_sessions")
                .insert({
                scan_ref: scanRef,
                patient_id: patientId,
                case_id: caseId || null,
                scan_type: isLab &&
                    scanPurpose !== "bite"
                    ? "model"
                    : "intraoral",
                arch,
                scanner_brand: scannerBrand.trim() ||
                    null,
                scanner_model: scannerModel.trim() ||
                    null,
                captured_at: new Date().toISOString(),
                file_name: file.name,
                storage_bucket: "dentaya-files",
                storage_path: path,
                mesh_points: stats?.meshPoints ??
                    null,
                triangle_count: stats?.triangleCount ??
                    null,
                completeness_score: quality,
                shade_reference: shade.trim() ||
                    null,
                metrics: {
                    width_mm: stats?.widthMm ??
                        null,
                    height_mm: stats?.heightMm ??
                        null,
                    depth_mm: stats?.depthMm ??
                        null,
                    unit_confirmed: unitsConfirmed,
                    unit: "mm",
                    mesh_intake_status: stats?.intakeStatus ??
                        null,
                    topology_mode: stats?.topologyMode ??
                        null,
                    degenerate_triangles: stats?.degenerateTriangleCount ??
                        null,
                    boundary_edges: stats?.boundaryEdgeCount ??
                        null,
                    non_manifold_edges: stats?.nonManifoldEdgeCount ??
                        null,
                    invalid_vertices: stats?.invalidVertexCount ??
                        null,
                    unit_hint: stats?.unitHint ??
                        null,
                    mesh_warnings: stats?.warnings ??
                        [],
                    source: "DentAYA Tarama Stüdyosu",
                    role: isLab
                        ? "laboratory"
                        : "clinic",
                },
                notes: notes.trim() ||
                    null,
                demo_mode: false,
                created_by: userId || null,
                captured_by_org_id: org.id,
                capture_context: isLab
                    ? "laboratory"
                    : "clinic",
                capture_method: captureMethod,
                capture_origin: isLab
                    ? "laboratory"
                    : "clinic",
                scan_origin: isLab
                    ? "laboratory"
                    : "clinic",
                scan_purpose: scanPurpose,
                client_request_id: requestId,
            });
            let scanError = scanInsert.error;
            if (scanError?.code === "23505") {
                const existing = await supabase
                    .from("scan_sessions")
                    .select("id")
                    .eq("captured_by_org_id", org.id)
                    .eq("client_request_id", requestId)
                    .maybeSingle();
                if (existing.data) {
                    scanError = null;
                }
            }
            if (scanError) {
                setMessage(dentayaError(scanError, "Tarama kaydı oluşturulamadı."));
                return;
            }
            const attachmentInsert = await supabase
                .from("attachments")
                .insert({
                patient_id: patientId,
                case_id: caseId || null,
                storage_bucket: "dentaya-files",
                storage_path: path,
                file_name: file.name,
                mime_type: file.type ||
                    "application/octet-stream",
                size_bytes: file.size,
                category: isLab
                    ? "model"
                    : "scan",
                created_by: userId || null,
                client_request_id: requestId,
            });
            let attachmentError = attachmentInsert.error;
            if (attachmentError?.code ===
                "23505") {
                attachmentError = null;
            }
            delete scanRequests.current[arch];
            setSavedStages(current => ({ ...current, [arch]: true }));
            setDialog(null);
            setMessage(attachmentError
                ? `Tarama kaydedildi. Dosya kaydı uyarısı: ${dentayaError(attachmentError, "Dosya kaydı tamamlanamadı.")}`
                : isLab
                    ? "Laboratuvar taraması kaydedildi. Model DentAYA Design kaynaklarına eklendi."
                    : "Klinik taraması kaydedildi. Tarama geçmişi ve vaka akışı güncellendi.");
            const pending = (Object.keys(drafts) as ScanArch[]).find(stage => stage !== arch && drafts[stage]?.file);
            if (pending) {
                setDrafts(current => ({ ...current, [arch]: undefined }));
                setArch(pending);
                setWireframe(false);
                return;
            }
            if (isLab) {
                router.push(`/design?case=${caseId}`);
            }
            else {
                router.push(`/scans?patient=${patientId}`);
            }
        } catch (error) {
            setMessage(dentayaError(error, "Tarama kaydı oluşturulamadı."));
        } finally {
            setSaving(false);
            saveLock.current = false;
        }
    }
    if (loading) return <LoadingExperience title="Tarama Stüdyosu hazırlanıyor…"/>;
    if (blocked) return <UiNode as="main" className="scan-blocked">
        <UiNode as="h1">Tarama Stüdyosu</UiNode>
        <UiNode as="p">{blocked}</UiNode>
        <Link href="/workspace">Çalışma alanına dön</Link>
    </UiNode>;

    const formatted = (value: number) => new Intl.NumberFormat(intlLocale(), { maximumFractionDigits: 1 }).format(value);
    const stageIndex = stages.findIndex(stage => stage.id === arch);
    const nextStage = stageIndex >= 0 ? stages[stageIndex + 1] : undefined;
    const readyToSave = Boolean(file && stats && stats.intakeStatus !== "reject" && unitsConfirmed && patientId && (!isLab || caseId));
    const subject = isLab ? selectedCase?.case_number : patients.find(patient => patient.id === patientId)?.external_ref;
    const register = () => setDialog("record");

    return <UiNode as="main" className="scan-studio">
        <ConnectionStatus />
        <UiNode as="header" className="scan-studio-header">
            <UiNode as="div" className="scan-title-group">
                <UiNode as="button" className="scan-icon-button" type="button" aria-label={uiText("Modül menüsünü aç")} aria-haspopup="dialog" aria-controls="desktop-module-menu" onClick={() => window.dispatchEvent(new Event("dentaya:open-modules"))}><CadIcon name="layers" size={18}/></UiNode>
                <UiNode as="h1">Tarama Stüdyosu</UiNode>
            </UiNode>
            <UiNode as="nav" className="scan-stages" aria-label={copy.stages}>
                {stages.map(stage => <UiNode as="button" className="scan-stage" type="button" key={stage.id}
                    data-scan-stage={stage.id} aria-current={arch === stage.id ? "step" : undefined}
                    disabled={saving} onClick={() => selectArch(stage.id)}>
                    <CadIcon name={stage.icon} size={21}/><UiNode as="span">{stage.label}</UiNode>
                    {(drafts[stage.id] || savedStages[stage.id]) && <UiNode as="i" className="scan-stage-mark" aria-hidden="true"/>}
                </UiNode>)}
            </UiNode>
            <UiNode as="nav" className="scan-header-links" aria-label={copy.navigation}>
                <Link href="/scans">Tarama Geçmişi</Link>
                {isLab && <Link href={caseId ? `/design?case=${encodeURIComponent(caseId)}` : "/design"}>CAD</Link>}
            </UiNode>
        </UiNode>

        <UiNode as="div" className="scan-workbench">
            <UiNode as="aside" className="scan-tools" aria-label={copy.tools}>
                <UiNode as="div" className="scan-source">
                    <UiNode as="strong">{copy.fileSource}</UiNode>
                    <UiNode as="small">{copy.formats}</UiNode>
                </UiNode>
                <UiNode as="input" ref={inputRef} data-scan-file className="scan-file-input" type="file"
                    aria-label={uiText("STL / PLY dosyası")} accept=".stl,.ply,model/stl,application/sla,application/octet-stream"
                    onChange={event => { selectFile(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }}/>
                <UiNode as="button" type="button" className="scan-tool scan-tool-import" disabled={saving} onClick={() => inputRef.current?.click()}>
                    <CadIcon name="file" size={19}/>{file ? copy.replace : copy.open}
                </UiNode>
                <UiNode as="button" type="button" className="scan-tool" onClick={register} disabled={saving}>
                    <CadIcon name="settings" size={19}/>{copy.record}
                </UiNode>
                <UiNode as="button" type="button" className="scan-tool" onClick={() => setDialog("mesh")} disabled={!stats}>
                    <CadIcon name="review" size={19}/>{copy.quality}
                </UiNode>
                <UiNode as="button" type="button" className="scan-tool" onClick={removeFile} disabled={!file || saving}>
                    <CadIcon name="close" size={19}/>{copy.remove}
                </UiNode>
                {subject && <UiNode as="small" className="scan-subject"><UserText>{subject}</UserText></UiNode>}
            </UiNode>

            <UiNode as="section" className="scan-workspace-viewer" aria-label={copy.preview}
                data-scan-arch={arch} data-scan-triangles={stats?.triangleCount}>
                <UiNode as="div" className="scan-view-caption"><UiNode as="strong">{archLabels[arch]}</UiNode>
                    {file && <UiNode as="span"><UserText>{file.name}</UserText></UiNode>}
                </UiNode>
                {file ? <LocalScanPreview file={file} onStats={handleStats} frame={frame} wireframe={wireframe}/> :
                    <UiNode as="div" className="scan-empty">
                        <CadIcon name="scan" size={44}/>
                        <UiNode as="strong">{savedStages[arch] ? copy.saved : copy.empty}</UiNode>
                        <UiNode as="span">{copy.fileSpec}</UiNode>
                    </UiNode>}
                {file && !stats && !draft?.error && <UiNode as="p" className="scan-view-status" role="status">{copy.parsing}</UiNode>}
                {draft?.error && <UiNode as="p" className="scan-view-status" role="alert">{draft.error}</UiNode>}
                {stats && <UiNode as="div" className="scan-camera" aria-label={uiText("Model görünümü")}>
                    <UiNode as="button" className="scan-icon-button" type="button" onClick={() => setFrame(value => value + 1)}
                        aria-label={copy.fit} title={copy.fit}><CadIcon name="fit" size={21}/></UiNode>
                    <UiNode as="button" className="scan-icon-button" type="button" onClick={() => setWireframe(value => !value)}
                        aria-pressed={wireframe} aria-label={uiText("Tel kafes")} title={uiText("Tel kafes")}><CadIcon name="wireframe" size={21}/></UiNode>
                </UiNode>}
            </UiNode>
        </UiNode>

        <UiNode as="footer" className="scan-footer">
            <UiNode as="div" className="scan-footer-status" role="status">{message || (stats
                ? stats.intakeStatus === "reject" ? copy.rejected
                    : unitsConfirmed ? copy.confirmed : copy.confirm
                : copy.waiting)}</UiNode>
            <UiNode as="div" className="scan-footer-actions">
                {nextStage && <UiNode as="button" type="button" className="scan-secondary" disabled={saving} onClick={() => selectArch(nextStage.id)}>
                    İleri<CadIcon name="next" size={17}/>
                </UiNode>}
                <UiNode as="button" type="button" data-scan-save className="scan-primary" disabled={saving || !readyToSave} onClick={() => void saveScan()}>
                    <CadIcon name="save" size={17}/>{saving ? uiText("Kaydediliyor…") : uiText("Taramayı Kaydet")}
                </UiNode>
            </UiNode>
        </UiNode>

        <UiNode as="dialog" ref={dialogRef} className="scan-dialog" aria-labelledby="scan-dialog-title"
            onCancel={event => { event.preventDefault(); setDialog(null); }}>
            <UiNode as="div" className="scan-dialog-head">
                <UiNode as="h2" id="scan-dialog-title">{dialog === "mesh" ? copy.quality : copy.record}</UiNode>
                <UiNode as="button" type="button" className="scan-icon-button" aria-label={uiText("Kapat")} onClick={() => setDialog(null)}><CadIcon name="close" size={19}/></UiNode>
            </UiNode>
            {dialog === "mesh" && stats && <UiNode as="div" className="scan-dialog-content">
                <UiNode as="dl" className="scan-metrics">
                    <ScanMetric label="Üçgen" value={formatted(stats.triangleCount)}/>
                    <ScanMetric label="Mesh noktası" value={formatted(stats.meshPoints)}/>
                    <ScanMetric label={copy.dimensions} value={[stats.widthMm, stats.heightMm, stats.depthMm].map(formatted).join(" × ")}/>
                    <ScanMetric label="Dejenere üçgen" value={formatted(stats.degenerateTriangleCount)}/>
                    <ScanMetric label={copy.openEdge} value={stats.boundaryEdgeCount === null ? "—" : formatted(stats.boundaryEdgeCount)}/>
                    <ScanMetric label="Non-manifold" value={stats.nonManifoldEdgeCount === null ? "—" : formatted(stats.nonManifoldEdgeCount)}/>
                </UiNode>
                {stats.warnings.length > 0 && <UiNode as="ul" className="scan-mesh-warnings">{stats.warnings.map((warning, index) =>
                    <UiNode as="li" key={index}><UserText>{warning}</UserText></UiNode>)}</UiNode>}
            </UiNode>}
            {dialog === "record" && <UiNode as="div" className="scan-dialog-content">
                {isClinic && <Field label="Hasta"><UiNode as="select" value={patientId} onChange={event => setPatientId(event.target.value)}>
                    {patients.map(patient => <UiNode as="option" key={patient.id} value={patient.id}><UserText>{`${patient.first_name} ${patient.last_name}${patient.external_ref ? ` · ${patient.external_ref}` : ""}`}</UserText></UiNode>)}
                </UiNode></Field>}
                <Field label={isLab ? "Laboratuvar vakası" : "Vaka bağlantısı"}><UiNode as="select" value={caseId} onChange={event => setCaseId(event.target.value)}>
                    {isClinic && <UiNode as="option" value="">Vakasız takip taraması</UiNode>}
                    {(isLab ? cases : patientCases).map(item => <UiNode as="option" key={item.id} value={item.id}><UserText>{`${item.case_number} · ${item.title}`}</UserText></UiNode>)}
                </UiNode></Field>
                <UiNode as="div" className="scan-form-pair">
                    <Field label="Ark / bölge"><UiNode as="select" value={arch} onChange={event => selectArch(event.target.value as ScanArch)}>
                        {Object.entries(archLabels).map(([id, label]) => <UiNode as="option" key={id} value={id}>{label}</UiNode>)}
                    </UiNode></Field>
                    <Field label="Tarama amacı"><UiNode as="select" value={arch === "bite" ? "bite" : purpose} disabled={arch === "bite"} onChange={event => setPurpose(event.target.value)}>
                        {isClinic ? <UiNode as="option" value="intraoral">Ağız içi tarama</UiNode> : <>
                            <UiNode as="option" value="master_model">Ana model</UiNode><UiNode as="option" value="antagonist">Karşıt çene</UiNode>
                            <UiNode as="option" value="die">Güdük / preparasyon</UiNode><UiNode as="option" value="waxup">Mum model (Wax-up)</UiNode>
                        </>}
                        <UiNode as="option" value="preop">Tedavi öncesi</UiNode><UiNode as="option" value="bite">Kapanış</UiNode><UiNode as="option" value="other">Diğer</UiNode>
                    </UiNode></Field>
                </UiNode>
                <UiNode as="label" className="scan-unit">
                    <UiNode as="input" type="checkbox" data-scan-unit checked={unitsConfirmed} disabled={!stats || stats.intakeStatus === "reject"}
                        onChange={event => { const confirmed = event.currentTarget.checked; setDrafts(current => current[arch] ? { ...current, [arch]: { ...current[arch], confirmed } } : current); }}/>
                    <UiNode as="span">Dosya ölçüsü milimetre{stats && <UiNode as="small">{formatted(Math.max(stats.widthMm, stats.heightMm, stats.depthMm))} mm · {stats.unitHint === "plausible-mm" ? copy.unitPlausible : copy.checkScale}</UiNode>}</UiNode>
                </UiNode>
                <UiNode as="details" className="scan-optional"><UiNode as="summary">{copy.optional}</UiNode>
                    <Field label="Yakalama yöntemi"><UiNode as="select" value={captureMethod} onChange={event => setCaptureMethod(event.target.value)}>
                        <UiNode as="option" value="import">Dosyadan içe aktar</UiNode>
                        {isLab ? <><UiNode as="option" value="lab_scanner">Laboratuvar tarayıcısı</UiNode><UiNode as="option" value="desktop_scanner">Masaüstü tarayıcı</UiNode></> : <UiNode as="option" value="intraoral_scanner">Ağız içi tarayıcı</UiNode>}
                        <UiNode as="option" value="photogrammetry">Fotogrametri</UiNode><UiNode as="option" value="other">Diğer</UiNode>
                    </UiNode></Field>
                    <UiNode as="div" className="scan-form-pair">
                        <Field label="Tarayıcı markası"><UiNode as="input" value={scannerBrand} onChange={event => setScannerBrand(event.target.value)}/></Field>
                        <Field label="Model"><UiNode as="input" value={scannerModel} onChange={event => setScannerModel(event.target.value)}/></Field>
                        <Field label="Tarama bütünlüğü (%)"><UiNode as="input" type="number" min={0} max={100} step={0.1} value={completeness} onChange={event => setCompleteness(event.target.value)}/></Field>
                        <Field label="Renk referansı"><UiNode as="input" value={shade} onChange={event => setShade(event.target.value)}/></Field>
                    </UiNode>
                    <Field label={isLab ? "Teknik not" : "Klinik not"}><UiNode as="textarea" value={notes} maxLength={4000} onChange={event => setNotes(event.target.value)}/></Field>
                </UiNode>
                <UiNode as="button" className="scan-primary scan-dialog-done" type="button" onClick={() => setDialog(null)}>Tamam</UiNode>
            </UiNode>}
        </UiNode>
    </UiNode>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <UiNode as="label" className="scan-field"><UiNode as="span">{label}</UiNode>{children}</UiNode>;
}

function ScanMetric({ label, value }: { label: string; value: string }) {
    return <UiNode as="div"><UiNode as="dt">{label}</UiNode><UiNode as="dd">{value}</UiNode></UiNode>;
}
