"use client";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import UiMessage from "@/lib/i18n/UiMessage";
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import ToothChart from "@/app/ToothChart";
import { EMPTY_TOOTH_PLAN, writeToothPlan, type ToothPlan } from "@/lib/tooth-plan";
import { useEffect, useMemo, useRef, useState, type CSSProperties, } from "react";
import Link from "@/lib/i18n/UiLink";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import NotificationCenter from "@/app/NotificationCenter";
import EmptyStateCard from "@/app/EmptyStateCard";
import { dentayaError, isFutureDate } from "@/lib/dentaya-errors";
import { supabase } from "@/lib/supabase";
import { useDentayaThemeRuntime } from "@/app/dentaya-theme";
type OrgType = "clinic" | "laboratory" | "courier";
type Organization = {
    id: string;
    name: string;
    org_type: OrgType;
};
type Patient = {
    id: string;
    external_ref: string | null;
    first_name: string;
    last_name: string;
};
type Lab = {
    id: string;
    name: string;
};
type LabQuoteMini = {
    case_id: string;
    amount: number;
    currency: string;
};
type ClinicFinanceMini = {
    case_id: string;
    patient_price: number;
    discount_amount: number;
    currency: string;
};
type CaseStatus = "new" | "accepted" | "design" | "approval" | "production" | "qc" | "ready" | "shipped" | "delivered" | "cancelled";
type CaseRow = {
    id: string;
    case_number: string;
    patient_id: string;
    clinic_org_id: string;
    lab_org_id: string | null;
    patient_reference: string;
    title: string;
    case_type: string;
    priority: "low" | "normal" | "high" | "urgent";
    status: CaseStatus;
    due_date: string | null;
    tooth_codes: string[];
    material: string | null;
    shade: string | null;
    updated_at: string;
};
type CaseForm = {
    patientId: string;
    labOrgId: string;
    caseType: string;
    toothCodes: string;
    toothPlan: ToothPlan;
    material: string;
    shade: string;
    dueDate: string;
    priority: "low" | "normal" | "high" | "urgent";
    clinicalNotes: string;
};
const emptyCaseForm: CaseForm = {
    patientId: "",
    labOrgId: "",
    caseType: "Crown",
    toothCodes: "",
    toothPlan: EMPTY_TOOTH_PLAN,
    material: "Zirconia",
    shade: "A2",
    dueDate: "",
    priority: "normal",
    clinicalNotes: "",
};
export default function CasesPage() {
    const { t: uiText, intlLocale } = useTranslation();
    useDentayaThemeRuntime();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [cases, setCases] = useState<CaseRow[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [labs, setLabs] = useState<Lab[]>([]);
    const [labQuotes, setLabQuotes] = useState<LabQuoteMini[]>([]);
    const [clinicFinances, setClinicFinances] = useState<ClinicFinanceMini[]>([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | CaseStatus>("all");
    const [message, setMessage] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [caseForm, setCaseForm] = useState<CaseForm>(emptyCaseForm);
    const [caseBusy, setCaseBusy] = useState(false);
    const caseSubmitLock = useRef(false);
    const caseRequestId = useRef<string | null>(null);
    useEffect(() => {
        let mounted = true;
        let caseChannel: RealtimeChannel | null = null;
        let patientChannel: RealtimeChannel | null = null;
        async function initialize() {
            const { data: authData, } = await supabase.auth
                .getSession();
            const user = authData.session?.user;
            if (!user) {
                router.replace("/workspace");
                return;
            }
            const { data: membership, error: membershipError, } = await supabase
                .from("memberships")
                .select("organization_id")
                .eq("user_id", user.id)
                .eq("status", "active")
                .limit(1)
                .maybeSingle();
            if (membershipError ||
                !membership) {
                setMessage(dentayaError(membershipError, "Aktif kurum bulunamadı."));
                setLoading(false);
                return;
            }
            const { data: orgData, error: orgError, } = await supabase
                .from("organizations")
                .select("id,name,org_type")
                .eq("id", membership.organization_id)
                .maybeSingle();
            if (orgError ||
                !orgData) {
                setMessage(dentayaError(orgError, "Kurum bilgisi alınamadı."));
                setLoading(false);
                return;
            }
            const currentOrg = orgData as Organization;
            setOrganization(currentOrg);
            if (currentOrg.org_type ===
                "courier") {
                setLoading(false);
                return;
            }
            await loadCases(currentOrg);
            if (currentOrg.org_type ===
                "clinic") {
                await Promise.all([
                    loadPatients(currentOrg.id),
                    loadLabs(),
                ]);
            }
            if (!mounted) {
                return;
            }
            caseChannel =
                supabase
                    .channel(`cases-page-${currentOrg.id}`)
                    .on("postgres_changes", {
                    event: "*",
                    schema: "public",
                    table: "cases",
                }, () => {
                    loadCases(currentOrg);
                })
                    .subscribe();
            if (currentOrg.org_type ===
                "clinic") {
                patientChannel =
                    supabase
                        .channel(`case-patients-${currentOrg.id}`)
                        .on("postgres_changes", {
                        event: "*",
                        schema: "public",
                        table: "patients",
                        filter: `owning_org_id=eq.${currentOrg.id}`,
                    }, () => {
                        loadPatients(currentOrg.id);
                    })
                        .subscribe();
            }
            setLoading(false);
        }
        initialize();
        return () => {
            mounted = false;
            if (caseChannel) {
                supabase.removeChannel(caseChannel);
            }
            if (patientChannel) {
                supabase.removeChannel(patientChannel);
            }
        };
    }, [router]);
    useEffect(() => {
        function recover() {
            if (!organization)
                return;
            void loadCases(organization);
            if (organization.org_type ===
                "clinic") {
                void loadPatients(organization.id);
                void loadLabs();
            }
        }
        window.addEventListener("dentaya-network-restored", recover);
        return () => window.removeEventListener("dentaya-network-restored", recover);
    }, [organization]);
    async function loadCases(org: Organization) {
        let query = supabase
            .from("cases")
            .select(`
          id,
          case_number,
          patient_id,
          clinic_org_id,
          lab_org_id,
          patient_reference,
          title,
          case_type,
          priority,
          status,
          due_date,
          tooth_codes,
          material,
          shade,
          updated_at
          `)
            .order("updated_at", {
            ascending: false,
        });
        if (org.org_type ===
            "clinic") {
            query =
                query.eq("clinic_org_id", org.id);
        }
        if (org.org_type ===
            "laboratory") {
            query =
                query.eq("lab_org_id", org.id);
        }
        const { data, error, } = await query;
        if (error) {
            setMessage(dentayaError(error));
            return;
        }
        const rows = (data ??
            []) as CaseRow[];
        setCases(rows);
        const caseIds = rows.map((item) => item.id);
        if (!caseIds.length) {
            setLabQuotes([]);
            setClinicFinances([]);
            return;
        }
        const { data: quoteRows } = await supabase
            .from("lab_case_quotes")
            .select("case_id,amount,currency")
            .in("case_id", caseIds);
        setLabQuotes((quoteRows ??
            []) as LabQuoteMini[]);
        if (org.org_type ===
            "clinic") {
            const { data: financeRows, } = await supabase
                .from("clinic_case_finance")
                .select("case_id,patient_price,discount_amount,currency")
                .in("case_id", caseIds);
            setClinicFinances((financeRows ??
                []) as ClinicFinanceMini[]);
        }
        else {
            setClinicFinances([]);
        }
    }
    async function loadPatients(organizationId: string) {
        const { data, error, } = await supabase
            .from("patients")
            .select(`
        id,
        external_ref,
        first_name,
        last_name
        `)
            .eq("owning_org_id", organizationId)
            .order("created_at", {
            ascending: false,
        });
        if (error) {
            setMessage(dentayaError(error));
            return;
        }
        const rows = (data ??
            []) as Patient[];
        setPatients(rows);
        setCaseForm((current) => ({
            ...current,
            patientId: current.patientId ||
                rows[0]?.id ||
                "",
        }));
    }
    async function loadLabs() {
        const { data, error, } = await supabase
            .from("organizations")
            .select("id,name")
            .eq("org_type", "laboratory")
            .eq("directory_visible", true)
            .order("name").limit(120);
        if (error) {
            setMessage(dentayaError(error));
            return;
        }
        const rows = (data ??
            []) as Lab[];
        setLabs(rows);
        setCaseForm((current) => ({
            ...current,
            labOrgId: current.labOrgId ||
                rows[0]?.id ||
                "",
        }));
    }
    function openCreate() {
        setCaseForm({
            ...emptyCaseForm,
            patientId: patients[0]?.id ??
                "",
            labOrgId: labs[0]?.id ??
                "",
        });
        setMessage("");
        setShowCreate(true);
    }
    async function createCase() {
        if (caseSubmitLock.current) {
            return;
        }
        if (!caseForm.patientId) {
            setMessage("Hasta seç.");
            return;
        }
        if (!caseForm.labOrgId) {
            setMessage("Laboratuvar seç.");
            return;
        }
        const patient = patients.find((item) => item.id ===
            caseForm.patientId);
        if (!patient) {
            setMessage("Seçilen hasta bulunamadı.");
            return;
        }
        const toothCodes = caseForm.toothCodes
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
        if (toothCodes.length ===
            0) {
            setMessage("En az bir diş numarası yaz. Örnek: 16");
            return;
        }
        if (toothCodes.length > 32 ||
            toothCodes.some((value) => !/^(?:[1-4][1-8]|[5-8][1-5])$/.test(value))) {
            setMessage("FDI diş numaralarını kontrol et. Örnek: 11, 16, 21, 46");
            return;
        }
        if (caseForm.dueDate &&
            !isFutureDate(caseForm.dueDate)) {
            setMessage("Yeni vakanın termin tarihi bugün veya daha ileri bir tarih olmalı.");
            return;
        }
        if (writeToothPlan(caseForm.clinicalNotes, caseForm.toothPlan, toothCodes).length > 4000) {
            setMessage("Klinik notunu kısaltın; diş planıyla birlikte kayıt sınırı aşılıyor.");
            return;
        }
        if (typeof navigator !==
            "undefined" &&
            !navigator.onLine) {
            setMessage("İnternet bağlantısı yok. Vakayı oluşturmadan önce bağlantının gelmesini bekle.");
            return;
        }
        caseSubmitLock.current =
            true;
        const requestId = caseRequestId.current ??
            crypto.randomUUID();
        caseRequestId.current =
            requestId;
        setCaseBusy(true);
        setMessage("");
        const { data, error, } = await supabase.rpc("create_case_from_patient", {
            p_patient_id: patient.id,
            p_lab_org_id: caseForm.labOrgId,
            p_title: `${caseForm.caseType} · ${patient.first_name} ${patient.last_name}`,
            p_case_type: caseForm.caseType,
            p_tooth_codes: toothCodes,
            p_material: caseForm.material.trim() ||
                null,
            p_shade: caseForm.shade.trim() ||
                null,
            p_due_date: caseForm.dueDate ||
                null,
            p_clinical_notes: writeToothPlan(caseForm.clinicalNotes, caseForm.toothPlan, toothCodes),
            p_priority: caseForm.priority,
            p_request_id: requestId,
        });
        if (error) {
            setMessage(dentayaError(error));
            setCaseBusy(false);
            caseSubmitLock.current =
                false;
            return;
        }
        const caseId = typeof data ===
            "string"
            ? data
            : "";
        setCaseBusy(false);
        caseSubmitLock.current =
            false;
        caseRequestId.current =
            null;
        setShowCreate(false);
        if (caseId) {
            router.push(`/cases/${caseId}`);
            return;
        }
        if (organization) {
            await loadCases(organization);
        }
    }
    const patientMap = useMemo(() => new Map(patients.map((patient) => [
        patient.id,
        `${patient.first_name} ${patient.last_name}`,
    ])), [patients]);
    const labMap = useMemo(() => new Map(labs.map((lab) => [
        lab.id,
        lab.name,
    ])), [labs]);
    const quoteMap = useMemo(() => new Map(labQuotes.map((quote) => [
        quote.case_id,
        quote,
    ])), [labQuotes]);
    const financeMap = useMemo(() => new Map(clinicFinances.map((finance) => [
        finance.case_id,
        finance,
    ])), [clinicFinances]);
    const filteredCases = useMemo(() => {
        const needle = search
            .trim()
            .toLocaleLowerCase("tr-TR");
        return cases.filter((item) => {
            if (statusFilter !==
                "all" &&
                item.status !==
                    statusFilter) {
                return false;
            }
            if (!needle) {
                return true;
            }
            const text = [
                item.case_number,
                item.patient_reference,
                item.title,
                item.case_type,
                item.material,
                item.shade,
                patientMap.get(item.patient_id),
                item.lab_org_id
                    ? labMap.get(item.lab_org_id)
                    : null,
            ]
                .filter(Boolean)
                .join(" ")
                .toLocaleLowerCase("tr-TR");
            return text.includes(needle);
        });
    }, [
        cases,
        search,
        statusFilter,
        patientMap,
        labMap,
    ]);
    const activeCount = cases.filter((item) => ![
        "delivered",
        "cancelled",
    ].includes(item.status)).length;
    const designCount = cases.filter((item) => item.status ===
        "design" ||
        item.status ===
            "approval").length;
    const productionCount = cases.filter((item) => item.status ===
        "production" ||
        item.status ===
            "qc" ||
        item.status ===
            "ready").length;
    if (loading) return <LoadingExperience title="Vakalar yükleniyor..."/>;
    if (!organization ||
        organization.org_type ===
            "courier") {
        return (<UiNode as="main" style={page}>
        <UiNode as="section" style={accessCard}>
          <UiNode as="p" style={eyebrow}>
            {uiText(" VAKALAR ")}</UiNode>

          <UiNode as="h1" style={title}>
            Klinik / Laboratuvar
          </UiNode>

          <UiNode as="p" style={muted}>
            Vaka çalışma alanı
            klinik ve laboratuvar
            hesapları içindir.
          </UiNode>

          <Link href="/" style={secondaryLink}>
            Ana panele dön
          </Link>
        </UiNode>
      </UiNode>);
    }
    const isClinic = organization.org_type ===
        "clinic";
    return (<UiNode as="main" style={page}>
      <style>
        {`
          * { box-sizing: border-box; }

          .case-row {
            transition:
              transform var(--dy-motion-fast, 150ms) ease,
              border-color var(--dy-motion-fast, 150ms) ease,
              background var(--dy-motion-fast, 150ms) ease;
          }

          .case-row:hover {
            transform: translateY(-2px);
            border-color: var(--dy-accent,#6de2cf) !important;
            background: var(--dy-surface2,#0d202c) !important;
          }

          @media(max-width: 780px) {
            .cases-header {
              flex-direction: column !important;
              align-items: flex-start !important;
            }

            .case-toolbar {
              grid-template-columns: 1fr !important;
            }

            .case-row {
              grid-template-columns: 1fr !important;
            }

            .case-modal-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>

      <UiNode as="header" className="cases-header" style={header}>
        <UiNode as="div">
          <Link href="/" style={backLink}>
            ← Ana panel
          </Link>

          <UiNode as="p" style={eyebrow}>
            {isClinic
            ? uiText("KLİNİK")
            : uiText("LABORATUVAR")}
          </UiNode>

          <UiNode as="h1" style={title}>
            {isClinic ? "Klinik Vakaları" : "Laboratuvar Vakaları"}
          </UiNode>

          <UiNode as="p" style={muted}>
            {isClinic
            ? "Klinikte kayıtlı tüm hastalar yeni vaka ekranında görünür. Hastayı seç, laboratuvarı belirle ve vaka akışını başlat."
            : "Yalnızca laboratuvarına gönderilen vakalar burada görünür. Tasarım ve üretim çalışma alanına vaka üzerinden gir."}
          </UiNode>
        </UiNode>

        <UiNode as="div" style={headerActions}>
          {isClinic && (<>
              <Link href="/clinic" style={secondaryLink}>Klinik Merkezi</Link>
              <Link href="/scan-studio" style={secondaryLink}>{uiText("Tarama Stüdyosu")}</Link>
              <Link href="/labs" style={secondaryLink}>Laboratuvarlar</Link>
              <Link href="/finance" style={secondaryLink}>Muhasebe</Link>
              <NotificationCenter /><UiNode as="button" type="button" onClick={openCreate} style={primaryButton}>{uiText("Yeni Vaka")}</UiNode>
            </>)}

          {!isClinic && (<>
              <Link href="/lab" style={secondaryLink}>Laboratuvar Merkezi</Link>
              <Link href="/finance" style={secondaryLink}>{uiText("Fiyatlandırma")}</Link>
              <Link href="/design" style={primaryLink}>DentAYA Design</Link>
            </>)}
        </UiNode>
      </UiNode>

      {message && (<UiNode as="div" style={messageBox}>
          {message}
        </UiNode>)}

      <UiNode as="section" style={statsGrid}>
        <Stat label={uiText("Toplam")} value={cases.length}/>

        <Stat label={uiText("Aktif")} value={activeCount}/>

        <Stat label="Tasarım / Onay" value={designCount}/>

        <Stat label={uiText("Üretim")} value={productionCount}/>
      </UiNode>

      <UiNode as="section" className="case-toolbar" style={toolbar}>
        <UiNode as="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Vaka, hasta referansı, materyal veya laboratuvar ara" style={searchInput}/>

        <UiNode as="select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | CaseStatus)} style={filterSelect}>
          <UiNode as="option" value="all">
            Tüm durumlar
          </UiNode>
          <UiNode as="option" value="new">
            {uiText(" Yeni ")}</UiNode>
          <UiNode as="option" value="accepted">
            {uiText(" Kabul Edildi ")}</UiNode>
          <UiNode as="option" value="design">
            {uiText(" Tasarım ")}</UiNode>
          <UiNode as="option" value="approval">
            {uiText(" Onay ")}</UiNode>
          <UiNode as="option" value="production">
            {uiText(" Üretim ")}</UiNode>
          <UiNode as="option" value="qc">
            Kalite Kontrol
          </UiNode>
          <UiNode as="option" value="ready">
            Hazır
          </UiNode>
          <UiNode as="option" value="shipped">
            Gönderildi
          </UiNode>
          <UiNode as="option" value="delivered">
            {uiText(" Teslim Edildi ")}</UiNode>
        </UiNode>
      </UiNode>

      {filteredCases.length ===
            0 ? (<EmptyStateCard eyebrow={isClinic ? "KLİNİK AKIŞ" : "LABORATUVAR AKIŞI"} title={isClinic ? "Henüz vaka oluşturulmadı" : "Henüz gelen vaka yok"} description={isClinic
                ? "Hasta ve laboratuvarı seçerek ilk ortak iş kaydını oluştur. Tarama, mesaj, CAD, fiyat ve kurye bu vakanın altında birleşir."
                : "Klinik sana vaka gönderdiğinde iş kuyruğunda görünecek. Başlangıç rehberi lab akışını adım adım gösterir."} actionLabel={isClinic ? "Yeni Vaka Oluştur" : "Başlangıç Rehberi"} {...(isClinic ? { onAction: openCreate } : { actionHref: "/start" })} secondaryLabel={isClinic ? "Hastalar" : undefined} secondaryHref={isClinic ? "/patients" : undefined}/>) : (<UiNode as="section" style={caseList}>
          {filteredCases.map((item) => {
                const patientName = patientMap.get(item.patient_id);
                const labName = item.lab_org_id
                    ? labMap.get(item.lab_org_id)
                    : null;
                return (<Link key={item.id} href={`/cases/${item.id}`} className="case-row" style={caseRow}>
                  <UiNode as="div">
                    <UiNode as="span" style={caseNumber}>
                      {item.case_number}
                    </UiNode>

                    <UiNode as="h2" style={caseTitle}>
                      <UserText>{isClinic &&
                        patientName
                        ? patientName
                        : item.patient_reference}</UserText>
                    </UiNode>

                    <UiNode as="p" style={caseSubtitle}>
                      {item.title}
                    </UiNode>
                  </UiNode>

                  <UiNode as="div" style={caseDetails}>
                    <Detail label="Diş" value={item.tooth_codes
                        .length
                        ? item.tooth_codes.join(", ")
                        : "—"}/>

                    <Detail label="Materyal" value={item.material ??
                        "—"}/>

                    <Detail label={isClinic
                        ? uiText("Laboratuvar")
                        : "Termin"} value={isClinic
                        ? labName ??
                            "Atanmadı"
                        : item.due_date
                            ? formatDate(item.due_date, intlLocale())
                            : "—"}/>
                  </UiNode>

                  <UiNode as="div" style={caseRight}>
                    <UiNode as="span" style={statusPill(item.status)}>
                      {statusLabel(item.status)}
                    </UiNode>

                    <UiNode as="span" style={updatedText}>
                      {item.due_date
                        ? <UiMessage source="Termin {0}" values={[formatDate(item.due_date, intlLocale())]} userValues={[]}/> : <UiMessage source="Güncellendi {0}" values={[formatDateTime(item.updated_at, intlLocale())]} userValues={[]}/>}
                    </UiNode>

                    <UiNode as="span" style={updatedText}>
                      {isClinic
                        ? (() => {
                            const finance = financeMap.get(item.id);
                            const quote = quoteMap.get(item.id);
                            const patientNet = finance
                                ? finance.patient_price - finance.discount_amount
                                : null;
                            return `Hasta: ${patientNet != null ? money(patientNet, intlLocale()) : "—"} · Lab: ${quote ? money(quote.amount, intlLocale()) : "—"}`;
                        })()
                        : (() => {
                            const quote = quoteMap.get(item.id);
                            return `Lab fiyatı: ${quote ? money(quote.amount, intlLocale()) : "—"}`;
                        })()}
                    </UiNode>
                  </UiNode>
                </Link>);
            })}
        </UiNode>)}

      {showCreate && (<UiNode as="div" style={modalOverlay}>
          <UiNode as="section" style={modalCard}>
            <UiNode as="div" style={modalHeader}>
              <UiNode as="div">
                <UiNode as="p" style={eyebrow}>
                  {uiText(" YENİ VAKA ")}</UiNode>

                <UiNode as="h2" style={modalTitle}>
                  Laboratuvara gönder
                </UiNode>

                <UiNode as="p" style={modalSubtitle}>
                  Klinik hasta listen
                  canlı olarak bu
                  ekrana bağlıdır.
                </UiNode>
              </UiNode>

              <UiNode as="button" type="button" onClick={() => setShowCreate(false)} style={closeButton}>
                {uiText(" Kapat ")}</UiNode>
            </UiNode>

            <UiNode as="div" className="case-modal-grid" style={modalGrid}>
              <UiNode as="label" style={field}>
                <UiNode as="span" style={fieldLabel}>
                  {uiText(" Hasta ")}</UiNode>

                <UiNode as="select" value={caseForm.patientId} onChange={(event) => setCaseForm((current) => ({
                ...current,
                patientId: event.target.value,
            }))} style={input}>
                  <UiNode as="option" value="">
                    Hasta seç
                  </UiNode>

                  {patients.map((patient) => (<UiNode as="option" key={patient.id} value={patient.id}>
                        <UserText>{patient.first_name}</UserText>{" "}
                        <UserText>{patient.last_name}</UserText> ·{" "}
                        {patient.external_ref ??
                    "Hasta"}
                      </UiNode>))}
                </UiNode>
              </UiNode>

              <UiNode as="label" style={field}>
                <UiNode as="span" style={fieldLabel}>
                  {uiText(" Laboratuvar ")}</UiNode>

                <UiNode as="select" value={caseForm.labOrgId} onChange={(event) => setCaseForm((current) => ({
                ...current,
                labOrgId: event.target.value,
            }))} style={input}>
                  <UiNode as="option" value="">
                    Laboratuvar seç
                  </UiNode>

                  {labs.map((lab) => (<UiNode as="option" key={lab.id} value={lab.id}>
                        <UserText>{lab.name}</UserText>
                      </UiNode>))}
                </UiNode>
              </UiNode>

              <UiNode as="label" style={field}>
                <UiNode as="span" style={fieldLabel}>
                  Vaka Türü
                </UiNode>

                <UiNode as="select" value={caseForm.caseType} onChange={(event) => setCaseForm((current) => ({
                ...current,
                caseType: event.target.value,
            }))} style={input}>
                  <UiNode as="option" value="Crown">
                    Kron
                  </UiNode>
                  <UiNode as="option" value="Bridge">
                    {uiText(" Köprü ")}</UiNode>
                  <UiNode as="option" value="Implant Crown">
                    İmplant Üstü Kron
                  </UiNode>
                  <UiNode as="option" value="Veneer">
                    Lamine / Veneer
                  </UiNode>
                  <UiNode as="option" value="Inlay / Onlay">
                    Inlay / Onlay
                  </UiNode>
                  <UiNode as="option" value="Denture">
                    Protez
                  </UiNode>
                </UiNode>
              </UiNode>

              <ToothChart selected={caseForm.toothCodes.split(/[,\s]+/).filter(Boolean)} plan={caseForm.toothPlan} disabled={caseBusy} onChange={(codes, plan) => setCaseForm(current => ({ ...current, toothCodes: codes.join(', '), toothPlan: plan, caseType: plan.links.length ? 'Bridge' : current.caseType }))}/>

              <Field label="Materyal" value={caseForm.material} placeholder="Zirconia" onChange={(value) => setCaseForm((current) => ({
                ...current,
                material: value,
            }))}/>

              <Field label={uiText("Renk")} value={caseForm.shade} placeholder="A2" onChange={(value) => setCaseForm((current) => ({
                ...current,
                shade: value,
            }))}/>

              <Field label="Termin" value={caseForm.dueDate} placeholder="" type="date" onChange={(value) => setCaseForm((current) => ({
                ...current,
                dueDate: value,
            }))}/>

              <UiNode as="label" style={field}>
                <UiNode as="span" style={fieldLabel}>
                  {uiText(" Öncelik ")}</UiNode>

                <UiNode as="select" value={caseForm.priority} onChange={(event) => setCaseForm((current) => ({
                ...current,
                priority: event.target.value as CaseForm["priority"],
            }))} style={input}>
                  <UiNode as="option" value="low">
                    Düşük
                  </UiNode>
                  <UiNode as="option" value="normal">
                    {uiText(" Normal ")}</UiNode>
                  <UiNode as="option" value="high">
                    Yüksek
                  </UiNode>
                  <UiNode as="option" value="urgent">
                    {uiText(" Acil ")}</UiNode>
                </UiNode>
              </UiNode>

              <UiNode as="label" style={wideField}>
                <UiNode as="span" style={fieldLabel}>
                  Klinik Not
                </UiNode>

                <UiNode as="textarea" value={caseForm.clinicalNotes} onChange={(event) => setCaseForm((current) => ({
                ...current,
                clinicalNotes: event.target.value,
            }))} placeholder="Laboratuvar briefi" style={textarea}/>
              </UiNode>
            </UiNode>

            {patients.length ===
                0 && (<UiNode as="div" style={warningBox}>
                Klinik hasta
                listesi boş. Önce
                Hastalar
                bölümünden kayıt
                oluştur.
              </UiNode>)}

            {labs.length ===
                0 && (<UiNode as="div" style={warningBox}>
                Görünür laboratuvar
                bulunamadı.
              </UiNode>)}

            <UiNode as="div" style={modalActions}>
              <UiNode as="button" type="button" onClick={() => setShowCreate(false)} style={secondaryButton}>
                Vazgeç
              </UiNode>

              <UiNode as="button" type="button" disabled={caseBusy ||
                patients.length ===
                    0 ||
                labs.length ===
                    0} onClick={createCase} style={primaryButton}>
                {caseBusy
                ? "Gönderiliyor..."
                : "Vakayı Gönder"}
              </UiNode>
            </UiNode>
          </UiNode>
        </UiNode>)}
    </UiNode>);
}
function Field({ label, value, onChange, placeholder, type = "text", }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    type?: string;
}) {
    const { t: uiText } = useTranslation();
    return (<UiNode as="label" style={field}>
      <UiNode as="span" style={fieldLabel}>
        {uiText(label)}
      </UiNode>

      <UiNode as="input" type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} style={input}/>
    </UiNode>);
}
function Stat({ label, value, }: {
    label: string;
    value: number;
}) {
    const { t: uiText } = useTranslation();
    return (<UiNode as="article" style={statCard}>
      <UiNode as="strong" style={statValue}>
        {value}
      </UiNode>

      <UiNode as="span" style={statLabel}>
        {uiText(label)}
      </UiNode>
    </UiNode>);
}
function Detail({ label, value, }: {
    label: string;
    value: string;
}) {
    return (<UiNode as="div" style={detail}>
      <UiNode as="span">
        {label}
      </UiNode>

      <UiNode as="strong">
        {value}
      </UiNode>
    </UiNode>);
}
function statusLabel(status: CaseStatus) {
    const labels: Record<CaseStatus, string> = {
        new: "Yeni",
        accepted: "Kabul Edildi",
        design: "Tasarım",
        approval: "Onay Bekliyor",
        production: "Üretim",
        qc: "Kalite Kontrol",
        ready: "Hazır",
        shipped: "Gönderildi",
        delivered: "Teslim Edildi",
        cancelled: "İptal",
    };
    return labels[status];
}
function statusPill(status: CaseStatus): CSSProperties {
    const success = status === "delivered" ||
        status === "ready";
    const attention = status === "approval";
    return {
        padding: "7px 10px",
        color: success
            ? "#9aefc2"
            : attention
                ? "#eed58a"
                : "#98ded5",
        background: success
            ? "var(--dy-accent-soft, #10271d)"
            : attention
                ? "#292313"
                : "var(--dy-accent-soft, #10282e)",
        border: success
            ? "1px solid #285b46"
            : attention
                ? "1px solid #66572d"
                : "1px solid var(--dy-border,#29465d)",
        borderRadius: "999px",
        fontSize: "14px",
        fontWeight: 900,
        whiteSpace: "nowrap",
    };
}
function money(value: number, localeTag: string = "tr-TR") {
    return new Intl.NumberFormat(localeTag, {
        style: "currency",
        currency: "TRY",
        maximumFractionDigits: 0,
    }).format(value);
}
function formatDate(value: string, localeTag: string) {
    return new Date(value).toLocaleDateString(localeTag);
}
function formatDateTime(value: string, localeTag: string) {
    return new Date(value).toLocaleString(localeTag, {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}
const page: CSSProperties = {
    minHeight: "100vh",
    padding: "0 4.5vw 70px",
    color: "var(--dy-text, #f2f6f8)",
    background: "linear-gradient(180deg,var(--dy-bg,#07131d),var(--dy-bg,#07131d))",
    fontFamily: "Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    fontSize: "15px",
};
const header: CSSProperties = {
    maxWidth: "1500px",
    margin: "0 auto",
    padding: "42px 0 26px",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: "24px",
};
const backLink: CSSProperties = {
    display: "inline-block",
    marginBottom: "16px",
    color: "var(--dy-muted, #718796)",
    fontSize: "14px",
};
const eyebrow: CSSProperties = {
    margin: 0,
    color: "var(--dy-accent, #6de2cf)",
    fontSize: "14px",
    fontWeight: 900,
    letterSpacing: "2px",
};
const title: CSSProperties = {
    margin: "7px 0 10px",
    fontSize: "clamp(42px,5vw,68px)",
    lineHeight: 0.98,
    letterSpacing: "-3px",
};
const muted: CSSProperties = {
    maxWidth: "760px",
    margin: 0,
    color: "var(--dy-muted, #8da1af)",
    fontSize: "14px",
    lineHeight: 1.65,
};
const headerActions: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
};
const primaryButton: CSSProperties = {
    minHeight: "42px",
    padding: "10px 14px",
    border: "none",
    borderRadius: "9px",
    background: "var(--dy-accent, #6de2cf)",
    color: "var(--dy-accent-contrast, #04110e)",
    fontSize: "14px",
    fontWeight: 900,
    cursor: "pointer",
};
const primaryLink: CSSProperties = {
    ...primaryButton,
    display: "inline-flex",
    alignItems: "center",
};
const secondaryButton: CSSProperties = {
    minHeight: "42px",
    padding: "10px 14px",
    border: "1px solid var(--dy-border, #29465d)",
    borderRadius: "9px",
    background: "var(--dy-surface2, #0d1e2a)",
    color: "var(--dy-text, #d5e0e6)",
    fontSize: "14px",
    cursor: "pointer",
};
const secondaryLink: CSSProperties = {
    ...secondaryButton,
    display: "inline-flex",
    alignItems: "center",
};
const messageBox: CSSProperties = {
    maxWidth: "1500px",
    margin: "0 auto 12px",
    padding: "12px 14px",
    color: "var(--dy-accent, #9de6da)",
    background: "var(--dy-accent-soft, #10282e)",
    border: "1px solid var(--dy-border,#29465d)",
    borderRadius: "10px",
    fontSize: "14px",
};
const statsGrid: CSSProperties = {
    maxWidth: "1500px",
    margin: "0 auto 12px",
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(0,1fr))",
    gap: "8px",
};
const statCard: CSSProperties = {
    minHeight: "92px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    background: "var(--dy-input, #081722)",
    border: "1px solid var(--dy-border, #193b4c)",
    borderRadius: "12px",
};
const statValue: CSSProperties = {
    fontSize: "28px",
};
const statLabel: CSSProperties = {
    color: "var(--dy-muted,#8ba0af)",
    fontSize: "14px",
};
const toolbar: CSSProperties = {
    maxWidth: "1500px",
    margin: "0 auto 12px",
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) 210px",
    gap: "8px",
};
const searchInput: CSSProperties = {
    width: "100%",
    minHeight: "44px",
    padding: "10px 13px",
    color: "white",
    background: "var(--dy-input, #081722)",
    border: "1px solid var(--dy-border, #1e4053)",
    borderRadius: "10px",
    outline: "none",
};
const filterSelect: CSSProperties = {
    ...searchInput,
};
const caseList: CSSProperties = {
    maxWidth: "1500px",
    margin: "0 auto",
    display: "grid",
    gap: "8px",
};
const caseRow: CSSProperties = {
    padding: "15px",
    display: "grid",
    gridTemplateColumns: "minmax(220px,1.25fr) minmax(300px,1fr) auto",
    gap: "18px",
    alignItems: "center",
    color: "inherit",
    background: "var(--dy-input, #081722)",
    border: "1px solid var(--dy-border, #193b4c)",
    borderRadius: "12px",
};
const caseNumber: CSSProperties = {
    display: "block",
    color: "var(--dy-accent, #6de2cf)",
    fontSize: "14px",
    fontWeight: 900,
    letterSpacing: "1px",
};
const caseTitle: CSSProperties = {
    margin: "4px 0 2px",
    fontSize: "16px",
};
const caseSubtitle: CSSProperties = {
    margin: 0,
    color: "var(--dy-muted,#8ba0af)",
    fontSize: "14px",
};
const caseDetails: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(3,minmax(0,1fr))",
    gap: "6px",
};
const detail: CSSProperties = {
    padding: "8px",
    display: "grid",
    gap: "3px",
    background: "var(--dy-input,#081722)",
    border: "1px solid var(--dy-border, #173748)",
    borderRadius: "7px",
    color: "var(--dy-muted,#8ba0af)",
    fontSize: "14px",
};
const caseRight: CSSProperties = {
    display: "grid",
    justifyItems: "end",
    gap: "7px",
};
const updatedText: CSSProperties = {
    color: "var(--dy-muted,#8ba0af)",
    fontSize: "14px",
};
const modalOverlay: CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    padding: "20px",
    display: "grid",
    placeItems: "center",
    background: "rgba(2,7,12,.86)",
    backdropFilter: "blur(8px)",
};
const modalCard: CSSProperties = {
    width: "min(780px,96vw)",
    maxHeight: "92vh",
    overflowY: "auto",
    padding: "22px",
    color: "var(--dy-text, #f2f6f8)",
    background: "linear-gradient(145deg,var(--dy-surface, #0b1c28),var(--dy-bg, #07131d))",
    border: "1px solid var(--dy-border, #274a5d)",
    borderRadius: "17px",
    boxShadow: "0 35px 100px rgba(0,0,0,.55)",
};
const modalHeader: CSSProperties = {
    marginBottom: "18px",
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    alignItems: "flex-start",
};
const modalTitle: CSSProperties = {
    margin: "5px 0",
    fontSize: "24px",
};
const modalSubtitle: CSSProperties = {
    margin: 0,
    color: "var(--dy-muted, #8499a7)",
    fontSize: "14px",
    lineHeight: 1.5,
};
const closeButton: CSSProperties = {
    padding: "8px 10px",
    color: "var(--dy-text, #d6e0e4)",
    background: "var(--dy-surface2, #0d1e2a)",
    border: "1px solid var(--dy-border, #29465d)",
    borderRadius: "8px",
    cursor: "pointer",
};
const modalGrid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
const field: CSSProperties = {
    display: "grid",
    gap: "6px",
};
const wideField: CSSProperties = {
    ...field,
    gridColumn: "1 / -1",
};
const fieldLabel: CSSProperties = {
    color: "var(--dy-muted, #91a3ae)",
    fontSize: "14px",
    fontWeight: 750,
};
const input: CSSProperties = {
    width: "100%",
    minHeight: "42px",
    padding: "10px 11px",
    color: "white",
    background: "var(--dy-bg, #06131d)",
    border: "1px solid var(--dy-border, #29465d)",
    borderRadius: "8px",
    outline: "none",
};
const textarea: CSSProperties = {
    ...input,
    minHeight: "92px",
    resize: "vertical",
    lineHeight: 1.5,
};
const modalActions: CSSProperties = {
    marginTop: "17px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
};
const warningBox: CSSProperties = {
    marginTop: "12px",
    padding: "11px",
    color: "#eed690",
    background: "#292313",
    border: "1px solid #66572d",
    borderRadius: "9px",
    fontSize: "14px",
};
const accessCard: CSSProperties = {
    width: "min(680px,100%)",
    margin: "10vh auto",
    padding: "28px",
    background: "var(--dy-input, #081722)",
    border: "1px solid var(--dy-border, #193b4c)",
    borderRadius: "15px",
};

