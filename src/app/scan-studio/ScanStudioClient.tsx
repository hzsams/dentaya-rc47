"use client";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, } from "react";
import Link from "@/lib/i18n/UiLink";
import { useRouter, useSearchParams, } from "next/navigation";
import { dentayaError } from "@/lib/dentaya-errors";
import { supabase } from "@/lib/supabase";
import { dy, useDentayaThemeRuntime, } from "@/app/dentaya-theme";
import ConnectionStatus from "@/app/ConnectionStatus";
import LocalScanPreview, { type LocalScanStats, } from "./LocalScanPreview";
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
export default function ScanStudioClient() {
    const { t: uiText, intlLocale } = useTranslation();
    useDentayaThemeRuntime();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [org, setOrg] = useState<Org | null>(null);
    const [userId, setUserId] = useState("");
    const [patients, setPatients] = useState<Patient[]>([]);
    const [cases, setCases] = useState<CaseRow[]>([]);
    const [patientId, setPatientId] = useState("");
    const [caseId, setCaseId] = useState("");
    const [arch, setArch] = useState("full");
    const [purpose, setPurpose] = useState("intraoral");
    const [captureMethod, setCaptureMethod,] = useState("intraoral_scanner");
    const [scannerBrand, setScannerBrand,] = useState("3Shape");
    const [scannerModel, setScannerModel,] = useState("TRIOS");
    const [completeness, setCompleteness,] = useState(98);
    const [shade, setShade] = useState("");
    const [notes, setNotes] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [stats, setStats] = useState<LocalScanStats | null>(null);
    const [unitsConfirmed, setUnitsConfirmed,] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const saveLock = useRef(false);
    const scanRequestId = useRef<string | null>(null);
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
                setCaptureMethod("intraoral_scanner");
                setScannerBrand("3Shape");
                setScannerModel("TRIOS");
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
                setCaptureMethod("lab_scanner");
                setScannerBrand("Laboratuvar Tarayıcısı");
                setScannerModel("Masaüstü");
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
        setUnitsConfirmed(false);
    }, [file]);
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
    const handleStats = useCallback((value: LocalScanStats | null) => {
        setStats(value);
    }, []);
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
        if (file.size > 50 * 1024 * 1024) {
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
        if (!Number.isFinite(Number(completeness)) ||
            Number(completeness) < 0 ||
            Number(completeness) > 100) {
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
        const requestId = scanRequestId.current ??
            crypto.randomUUID();
        scanRequestId.current =
            requestId;
        setSaving(true);
        setMessage("Tarama güvenli depolamaya aktarılıyor…");
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
            setSaving(false);
            saveLock.current = false;
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
                purpose !== "bite"
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
            completeness_score: completeness,
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
            scan_purpose: purpose,
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
            setSaving(false);
            saveLock.current = false;
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
        setSaving(false);
        saveLock.current = false;
        scanRequestId.current = null;
        setMessage(attachmentError
            ? `Tarama kaydedildi. Dosya kaydı uyarısı: ${dentayaError(attachmentError, "Dosya kaydı tamamlanamadı.")}`
            : isLab
                ? "Laboratuvar taraması kaydedildi. Model DentAYA Design kaynaklarına eklendi."
                : "Klinik taraması kaydedildi. Tarama geçmişi ve vaka akışı güncellendi.");
        if (isLab) {
            router.push(`/design?case=${caseId}`);
        }
        else {
            router.push(`/scans?patient=${patientId}`);
        }
    }
    if (loading) return <LoadingExperience title="Tarama Stüdyosu hazırlanıyor…"/>;
    if (blocked) {
        return (<UiNode as="main" style={ui.loading}>
        <UiNode as="div" style={ui.blocked}>
          <UiNode as="strong">
            {uiText(" Tarama Stüdyosu ")}</UiNode>
          <UiNode as="span">
            {blocked}
          </UiNode>
          <Link href="/" style={ui.primary}>
            Ana panele dön
          </Link>
        </UiNode>
      </UiNode>);
    }
    return (<UiNode as="main" style={ui.page}>
      <ConnectionStatus />
      <style>{`
        * { box-sizing: border-box; }

        .scan-workspace {
          align-items: start;
        }

        .scan-preview-column {
          position: sticky;
          top: 16px;
          align-self: start;
        }

        @media(max-width: 1060px) {
          .scan-workspace {
            grid-template-columns: 1fr !important;
          }

          .scan-preview-column {
            position: static !important;
          }

          .scan-header {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }

        @media(max-width: 680px) {
          .scan-steps {
            grid-template-columns: 1fr !important;
          }

          .scan-stats {
            grid-template-columns: repeat(2, 1fr) !important;
          }

          .scan-two {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <UiNode as="header" className="scan-header" style={ui.header}>
        <UiNode as="div">
          <Link href={isLab
            ? "/lab"
            : "/clinic"} style={ui.back}>
            ←{" "}
            {isLab
            ? "Laboratuvar Merkezi"
            : "Klinik Merkezi"}
          </Link>

          <UiNode as="p" style={ui.eyebrow}>
            TARAMA ÇALIŞMA ALANI
          </UiNode>

          <UiNode as="h1" style={ui.title}>
            {uiText(" Tarama Stüdyosu ")}</UiNode>

          <UiNode as="p" style={ui.subtitle}>
            {isLab
            ? "Laboratuvar tarayıcısından gelen ana model, karşıt çene, kapanış ve preparasyon verilerini seçili vakaya bağla."
            : "Ağız içi tarama dosyasını hastaya veya vakaya bağla; tarama geçmişi ve laboratuvar akışı aynı veriyi kullansın."}
          </UiNode>
        </UiNode>

        <UiNode as="div" style={ui.actions}>
          <Link href="/scans" style={ui.secondary}>
            Tarama Geçmişi
          </Link>

          {isLab && (<Link href="/design" style={ui.secondary}>
              DentAYA Design
            </Link>)}

          <Link href="/cases" style={ui.secondary}>
            {uiText(" Vakalar ")}</Link>
        </UiNode>
      </UiNode>

      {message && (<UiNode as="div" style={ui.notice}>
          {message}
        </UiNode>)}

      <UiNode as="section" className="scan-steps" style={ui.steps}>
        <Step number="1" title={isLab
            ? "Vakayı seç"
            : "Hastayı seç"} detail="Taramanın hangi kayıtla ilişkili olduğunu belirle."/>

        <Step number="2" title="Dosyayı yükle" detail="STL veya PLY mesh dosyasını önizle."/>

        <Step number="3" title="Kontrol et ve kaydet" detail="Tarama bilgilerini doğrulayıp sisteme ekle."/>
      </UiNode>

      <UiNode as="section" className="scan-workspace" style={ui.workspace}>
        <UiNode as="div" className="scan-preview-column" style={ui.previewColumn}>
          <UiNode as="div" style={ui.previewCard}>
            <LocalScanPreview file={file} onStats={handleStats}/>
          </UiNode>

          <UiNode as="div" className="scan-stats" style={ui.stats}>
            <Stat label="Mesh noktası" value={stats
            ? number(stats.meshPoints, intlLocale())
            : "—"}/>

            <Stat label="Üçgen" value={stats
            ? number(stats.triangleCount, intlLocale())
            : "—"}/>

            <Stat label="Genişlik" value={stats
            ? `${stats.widthMm.toFixed(1)} mm`
            : "—"}/>

            <Stat label="Derinlik" value={stats
            ? `${stats.depthMm.toFixed(1)} mm`
            : "—"}/>

            <Stat label="Dejenere üçgen" value={stats
            ? number(stats.degenerateTriangleCount, intlLocale())
            : "—"}/>

            <Stat label="Non-manifold" value={stats?.nonManifoldEdgeCount !==
            null &&
            stats?.nonManifoldEdgeCount !==
                undefined
            ? number(stats.nonManifoldEdgeCount, intlLocale())
            : "Büyük mesh / atlandı"}/>
          </UiNode>

          <UiNode as="div" style={ui.meshAudit}>
            <UiNode as="div" style={ui.qualityHead}>
              <UiNode data-dy-copy-stack as="div">
                <UiNode as="strong">
                  Mesh intake kontrolü
                </UiNode>
                <UiNode as="span">
                  Dosya geometrisi · klinik teşhis değildir
                </UiNode>
              </UiNode>

              <UiNode as="b" style={{
            color: stats?.intakeStatus ===
                "reject"
                ? "#ff8b98"
                : stats?.intakeStatus ===
                    "warning"
                    ? "#e8bd73"
                    : "#63cc98",
        }}>
                {stats
            ? stats.intakeStatus ===
                "reject"
                ? "DÜZELT"
                : stats.intakeStatus ===
                    "warning"
                    ? "UYARI"
                    : "HAZIR"
            : "—"}
              </UiNode>
            </UiNode>

            {stats?.boundaryEdgeCount !==
            null &&
            stats?.boundaryEdgeCount !==
                undefined && (<UiNode as="p" style={ui.auditLine}>
                  Açık kenar:{" "}
                  <UiNode as="strong">
                    {number(stats.boundaryEdgeCount, intlLocale())}
                  </UiNode>
                  {" · "}
                  intraoral taramalarda açık yüzey normal olabilir.
                </UiNode>)}

            {stats?.warnings?.length ? (<UiNode as="div" style={ui.auditWarnings}>
                {stats.warnings.map((warning, index) => (<UiNode as="span" key={`${warning}-${index}`}>
                      • {warning}
                    </UiNode>))}
              </UiNode>) : stats ? (<UiNode as="p" style={ui.auditOk}>
                Mesh intake kontrolünde kritik sorun görünmüyor.
              </UiNode>) : (<UiNode as="p" style={ui.auditLine}>
                Dosyayı seçtiğinde topoloji ve ölçü kontrolü burada görünür.
              </UiNode>)}
          </UiNode>

          <UiNode as="div" style={ui.quality}>
            <UiNode as="div" style={ui.qualityHead}>
              <UiNode data-dy-copy-stack as="div">
                <UiNode as="strong">
                  Tarama bütünlüğü
                </UiNode>
                <UiNode as="span">
                  Manuel kayıt değeri
                </UiNode>
              </UiNode>
              <UiNode as="b">
                {Math.round(completeness)}
                %
              </UiNode>
            </UiNode>

            <UiNode as="div" style={ui.qualityTrack}>
              <UiNode as="i" style={{
            ...ui.qualityFill,
            width: `${Math.max(0, Math.min(100, completeness))}%`,
        }}/>
            </UiNode>
          </UiNode>
        </UiNode>

        <UiNode as="aside" style={ui.form}>
          <SectionTitle title={isLab
            ? "Vaka bağlantısı"
            : "Hasta bağlantısı"} description={isLab
            ? "Laboratuvar taraması güvenlik nedeniyle mutlaka bir vakaya bağlı kaydedilir."
            : "Tarama hastaya bağlanır. İstersen aynı anda açık bir vakaya da ilişkilendirebilirsin."}/>

          {isClinic && (<>
              <Field label={uiText("Hasta")}>
                <UiNode as="select" value={patientId} onChange={(event) => setPatientId(event.target
                .value)} style={ui.input}>
                  {patients.map((patient) => (<UiNode as="option" key={patient.id} value={patient.id}>
                        <UserText>{patient.first_name}</UserText>{" "}
                        <UserText>{patient.last_name}</UserText>{" "}
                        ·{" "}
                        {patient.external_ref ??
                    "Hasta"}
                      </UiNode>))}
                </UiNode>
              </Field>

              <Field label="Vaka bağlantısı">
                <UiNode as="select" value={caseId} onChange={(event) => setCaseId(event.target
                .value)} style={ui.input}>
                  <UiNode as="option" value="">
                    Vakasız takip taraması
                  </UiNode>

                  {patientCases.map((item) => (<UiNode as="option" key={item.id} value={item.id}>
                        {item.case_number}{" "}
                        ·{" "}
                        {item.title}
                      </UiNode>))}
                </UiNode>
              </Field>
            </>)}

          {isLab && (<Field label="Laboratuvar vakası">
              <UiNode as="select" value={caseId} onChange={(event) => setCaseId(event.target
                .value)} style={ui.input}>
                {cases.map((item) => (<UiNode as="option" key={item.id} value={item.id}>
                      {item.case_number}{" "}
                      ·{" "}
                      <UserText>{item.patient_reference}</UserText>{" "}
                      ·{" "}
                      {item.title}
                    </UiNode>))}
              </UiNode>
            </Field>)}

          <SectionTitle title="Tarama bilgileri" description="Dosyanın ne amaçla üretildiğini ve hangi cihazdan geldiğini belirt."/>

          <UiNode as="div" className="scan-two" style={ui.two}>
            <Field label="Tarama amacı">
              <UiNode as="select" value={purpose} onChange={(event) => setPurpose(event.target
            .value)} style={ui.input}>
                {isClinic ? (<>
                    <UiNode as="option" value="intraoral">
                      Ağız içi tarama
                    </UiNode>
                    <UiNode as="option" value="preop">
                      Tedavi öncesi
                    </UiNode>
                    <UiNode as="option" value="bite">
                      Kapanış
                    </UiNode>
                    <UiNode as="option" value="other">
                      Diğer
                    </UiNode>
                  </>) : (<>
                    <UiNode as="option" value="master_model">
                      Ana model
                    </UiNode>
                    <UiNode as="option" value="antagonist">
                      Karşıt çene
                    </UiNode>
                    <UiNode as="option" value="bite">
                      Kapanış
                    </UiNode>
                    <UiNode as="option" value="die">
                      Güdük / preparasyon
                    </UiNode>
                    <UiNode as="option" value="waxup">
                      Mum model (Wax-up)
                    </UiNode>
                    <UiNode as="option" value="preop">
                      Tedavi öncesi
                    </UiNode>
                    <UiNode as="option" value="other">
                      Diğer
                    </UiNode>
                  </>)}
              </UiNode>
            </Field>

            <Field label="Ark / bölge">
              <UiNode as="select" value={arch} onChange={(event) => setArch(event.target
            .value)} style={ui.input}>
                <UiNode as="option" value="full">
                  Tam ark
                </UiNode>
                <UiNode as="option" value="upper">
                  Üst ark
                </UiNode>
                <UiNode as="option" value="lower">
                  Alt ark
                </UiNode>
                <UiNode as="option" value="bite">
                  Kapanış
                </UiNode>
                <UiNode as="option" value="tooth">
                  Tek diş
                </UiNode>
              </UiNode>
            </Field>
          </UiNode>

          <Field label="Yakalama yöntemi">
            <UiNode as="select" value={captureMethod} onChange={(event) => setCaptureMethod(event.target
            .value)} style={ui.input}>
              {isLab ? (<>
                  <UiNode as="option" value="lab_scanner">
                    Laboratuvar tarayıcısı
                  </UiNode>
                  <UiNode as="option" value="desktop_scanner">
                    Masaüstü tarayıcı
                  </UiNode>
                  <UiNode as="option" value="photogrammetry">
                    Fotogrametri
                  </UiNode>
                  <UiNode as="option" value="import">
                    Dosyadan içe aktar
                  </UiNode>
                  <UiNode as="option" value="other">
                    Diğer
                  </UiNode>
                </>) : (<>
                  <UiNode as="option" value="intraoral_scanner">
                    Ağız içi tarayıcı
                  </UiNode>
                  <UiNode as="option" value="photogrammetry">
                    Fotogrametri
                  </UiNode>
                  <UiNode as="option" value="import">
                    Dosyadan içe aktar
                  </UiNode>
                  <UiNode as="option" value="other">
                    Diğer
                  </UiNode>
                </>)}
            </UiNode>
          </Field>

          <UiNode as="div" className="scan-two" style={ui.two}>
            <Field label="Tarayıcı markası">
              <UiNode as="input" value={scannerBrand} onChange={(event) => setScannerBrand(event.target
            .value)} style={ui.input}/>
            </Field>

            <Field label="Model">
              <UiNode as="input" value={scannerModel} onChange={(event) => setScannerModel(event.target
            .value)} style={ui.input}/>
            </Field>
          </UiNode>

          <SectionTitle title="Mesh dosyası" description="Dosyayı seçtiğinde soldaki 3D önizleme sabit alanda açılır; ekran yüksekliği değişmez."/>

          <Field label="STL / PLY dosyası">
            <UiNode as="input" type="file" accept=".stl,.ply,model/stl,application/sla,application/octet-stream" onChange={(event) => setFile(event.target.files?.[0] ??
            null)} style={ui.file}/>
          </Field>

          <UiNode as="label" style={ui.unitConfirm}>
            <UiNode as="input" type="checkbox" checked={unitsConfirmed} onChange={(event) => setUnitsConfirmed(event.target.checked)}/>

            <UiNode as="div">
              <UiNode as="strong">
                Dosya ölçüsü milimetre
              </UiNode>

              <UiNode as="span">
                STL dosyası birim bilgisini taşımaz. Kaydetmeden önce tarayıcı/export kaynağının mm kullandığını doğrula.
              </UiNode>

              {stats && (<UiNode as="small">
                  Algılanan maksimum boyut:{" "}
                  {Math.max(stats.widthMm, stats.heightMm, stats.depthMm).toFixed(1)}{" "}
                  mm ·{" "}
                  {stats.unitHint ===
                "plausible-mm"
                ? "ölçek makul görünüyor"
                : "ölçek şüpheli görünüyor"}
                </UiNode>)}
            </UiNode>
          </UiNode>

          <UiNode as="div" className="scan-two" style={ui.two}>
            <Field label="Tarama bütünlüğü (%)">
              <UiNode as="input" type="number" min={0} max={100} step={0.1} value={completeness} onChange={(event) => setCompleteness(Number(event.target
            .value))} style={ui.input}/>
            </Field>

            <Field label="Renk referansı">
              <UiNode as="input" value={shade} onChange={(event) => setShade(event.target
            .value)} style={ui.input} placeholder="Örn. A2"/>
            </Field>
          </UiNode>

          <Field label={isLab
            ? "Teknik not"
            : "Klinik not"}>
            <UiNode as="textarea" value={notes} onChange={(event) => setNotes(event.target
            .value)} style={ui.textarea} placeholder={isLab
            ? "Model, kapanış veya preparasyon hakkında teknik not…"
            : "Tarama veya vaka hakkında kısa klinik not…"}/>
          </Field>

          <UiNode data-dy-copy-stack as="div" style={ui.sync}>
            <UiNode as="strong">
              Senkronizasyon
            </UiNode>
            <UiNode as="span">
              {isLab
            ? "Vaka → Tarama → DentAYA Design"
            : "Hasta → Tarama → Vaka / Dental Twin"}
            </UiNode>
          </UiNode>

          <UiNode as="button" type="button" disabled={saving ||
            !file} onClick={() => void saveScan()} style={{
            ...ui.save,
            opacity: saving ||
                !file
                ? 0.55
                : 1,
        }}>
            {saving
            ? uiText("Kaydediliyor…")
            : isLab
                ? "Taramayı Kaydet ve CAD'e Aç"
                : "Taramayı Kaydet"}
          </UiNode>
        </UiNode>
      </UiNode>
    </UiNode>);
}
function SectionTitle({ title, description, }: {
    title: string;
    description: string;
}) {
    const { t: uiText } = useTranslation();
    return (<UiNode data-dy-copy-stack as="div" style={ui.sectionTitle}>
      <UiNode as="strong">
        {uiText(title)}
      </UiNode>
      <UiNode as="span">
        {description}
      </UiNode>
    </UiNode>);
}
function Step({ number, title, detail, }: {
    number: string;
    title: string;
    detail: string;
}) {
    return (<UiNode as="div" style={ui.step}>
      <UiNode as="span" style={ui.stepNumber}>
        {number}
      </UiNode>
      <UiNode data-dy-copy-stack as="div">
        <UiNode as="strong">
          {title}
        </UiNode>
        <UiNode as="small">
          {detail}
        </UiNode>
      </UiNode>
    </UiNode>);
}
function Field({ label, children, }: {
    label: string;
    children: React.ReactNode;
}) {
    const { t: uiText } = useTranslation();
    return (<UiNode as="label" style={ui.field}>
      <UiNode as="span">
        {uiText(label)}
      </UiNode>
      {children}
    </UiNode>);
}
function Stat({ label, value, }: {
    label: string;
    value: string;
}) {
    const { t: uiText } = useTranslation();
    return (<UiNode as="div" style={ui.stat}>
      <UiNode as="span">
        {uiText(label)}
      </UiNode>
      <UiNode as="strong">
        {value}
      </UiNode>
    </UiNode>);
}
function number(value: number, localeTag: string = "tr-TR") {
    return new Intl.NumberFormat(localeTag).format(value);
}
const ui: Record<string, CSSProperties> = {
    page: {
        minHeight: "100vh",
        padding: "24px clamp(18px,3.5vw,50px) 58px",
        background: dy.bg,
        color: dy.text,
        fontFamily: "Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        fontSize: 15,
    },
    loading: {
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: dy.bg,
        color: dy.muted,
        textAlign: "center",
    },
    blocked: {
        width: "min(560px,100%)",
        display: "grid",
        gap: 10,
        padding: 24,
        border: `1px solid ${dy.border}`,
        borderRadius: dy.radius,
        background: dy.surface,
    },
    header: {
        maxWidth: 1440,
        margin: "0 auto 18px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: 22,
    },
    back: {
        color: dy.muted,
        textDecoration: "none",
        fontSize: 13,
    },
    eyebrow: {
        margin: "14px 0 6px",
        color: dy.accent,
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: ".14em",
    },
    title: {
        margin: "0 0 8px",
        fontSize: "clamp(34px,4vw,52px)",
        lineHeight: 1.02,
        letterSpacing: "-.04em",
    },
    subtitle: {
        maxWidth: 820,
        margin: 0,
        color: dy.muted,
        fontSize: 15,
        lineHeight: 1.6,
    },
    actions: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
    },
    primary: {
        minHeight: 42,
        display: "inline-grid",
        placeItems: "center",
        padding: "0 14px",
        borderRadius: 10,
        background: dy.accent,
        color: dy.accentContrast,
        textDecoration: "none",
        fontWeight: 900,
        fontSize: 14,
    },
    secondary: {
        minHeight: 42,
        display: "inline-grid",
        placeItems: "center",
        padding: "0 14px",
        borderRadius: 10,
        border: `1px solid ${dy.border}`,
        background: dy.surface,
        color: dy.text,
        textDecoration: "none",
        fontWeight: 800,
        fontSize: 14,
    },
    notice: {
        maxWidth: 1440,
        margin: "0 auto 12px",
        padding: "12px 14px",
        borderRadius: 11,
        border: `1px solid ${dy.border}`,
        background: dy.surface2,
        color: dy.muted,
        fontSize: 14,
    },
    steps: {
        maxWidth: 1440,
        margin: "0 auto 12px",
        display: "grid",
        gridTemplateColumns: "repeat(3,minmax(0,1fr))",
        gap: 8,
    },
    step: {
        minHeight: 78,
        padding: 12,
        display: "grid",
        gridTemplateColumns: "34px minmax(0,1fr)",
        alignItems: "center",
        gap: 10,
        border: `1px solid ${dy.border}`,
        borderRadius: 13,
        background: dy.surface,
    },
    stepNumber: {
        width: 32,
        height: 32,
        display: "grid",
        placeItems: "center",
        borderRadius: 9,
        background: dy.accentSoft,
        color: dy.accent,
        fontWeight: 900,
    },
    workspace: {
        maxWidth: 1440,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "minmax(0,1.35fr) minmax(360px,.75fr)",
        gap: 14,
        alignItems: "start",
    },
    previewColumn: {
        display: "grid",
        gap: 10,
        alignSelf: "start",
    },
    previewCard: {
        height: "clamp(480px,62vh,650px)",
        minHeight: 480,
        padding: 10,
        borderRadius: 18,
        border: `1px solid ${dy.border}`,
        background: dy.surface,
        overflow: "hidden",
        boxShadow: `0 18px 50px ${dy.shadow}`,
    },
    stats: {
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 7,
    },
    stat: {
        minHeight: 72,
        padding: "10px 11px",
        display: "grid",
        alignContent: "space-between",
        gap: 4,
        borderRadius: 11,
        border: `1px solid ${dy.border}`,
        background: dy.surface2,
        color: dy.muted,
        fontSize: 13,
    },
    meshAudit: {
        padding: "13px",
        display: "grid",
        gap: "8px",
        border: `1px solid ${dy.border}`,
        borderRadius: "12px",
        background: dy.surface,
    },
    auditLine: {
        margin: 0,
        color: dy.muted,
        fontSize: "12px",
        lineHeight: 1.5,
    },
    auditWarnings: {
        display: "grid",
        gap: "4px",
        color: "#e8bd73",
        fontSize: "12px",
        lineHeight: 1.45,
    },
    auditOk: {
        margin: 0,
        color: "#63cc98",
        fontSize: "12px",
        lineHeight: 1.45,
    },
    unitConfirm: {
        padding: "12px",
        display: "grid",
        gridTemplateColumns: "20px minmax(0,1fr)",
        gap: "9px",
        alignItems: "start",
        border: `1px solid ${dy.border}`,
        borderRadius: "10px",
        background: dy.surface2,
        color: dy.muted,
        fontSize: "12px",
        lineHeight: 1.45,
    },
    quality: {
        padding: 12,
        display: "grid",
        gap: 8,
        borderRadius: 12,
        border: `1px solid ${dy.border}`,
        background: dy.surface,
    },
    qualityHead: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    qualityTrack: {
        height: 8,
        overflow: "hidden",
        borderRadius: 999,
        background: dy.input,
    },
    qualityFill: {
        display: "block",
        height: "100%",
        borderRadius: 999,
        background: dy.accent,
    },
    form: {
        padding: 18,
        display: "grid",
        gap: 12,
        borderRadius: 18,
        border: `1px solid ${dy.border}`,
        background: dy.surface,
        boxShadow: `0 18px 50px ${dy.shadow}`,
    },
    sectionTitle: {
        paddingTop: 4,
        display: "grid",
        gap: 3,
        color: dy.text,
    },
    field: {
        display: "grid",
        gap: 6,
        color: dy.muted,
        fontSize: 13,
        fontWeight: 750,
    },
    input: {
        width: "100%",
        minHeight: 43,
        padding: "0 11px",
        borderRadius: 10,
        border: `1px solid ${dy.border}`,
        background: dy.input,
        color: dy.text,
        outline: "none",
    },
    file: {
        width: "100%",
        minHeight: 48,
        padding: 10,
        borderRadius: 10,
        border: `1px dashed ${dy.border}`,
        background: dy.input,
        color: dy.text,
    },
    textarea: {
        minHeight: 90,
        resize: "vertical",
        padding: 11,
        borderRadius: 10,
        border: `1px solid ${dy.border}`,
        background: dy.input,
        color: dy.text,
        outline: "none",
    },
    two: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 9,
    },
    sync: {
        padding: 11,
        display: "grid",
        gap: 4,
        borderRadius: 11,
        border: `1px solid ${dy.border}`,
        background: dy.accentSoft,
        color: dy.muted,
    },
    save: {
        minHeight: 48,
        border: 0,
        borderRadius: 11,
        background: dy.accent,
        color: dy.accentContrast,
        fontWeight: 900,
        fontSize: 14,
        cursor: "pointer",
    },
};
