"use client";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import {caseEventMessage} from '@/lib/system-messages';
import UiMessage from "@/lib/i18n/UiMessage";
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { displayClinicalNotes } from "@/lib/tooth-plan";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, } from "react";
import Link from "@/lib/i18n/UiLink";
import { useParams, useRouter, } from "next/navigation";
import type { RealtimeChannel, } from "@supabase/supabase-js";
import NotificationCenter from "@/app/NotificationCenter";
import { dentayaError } from "@/lib/dentaya-errors";
import { supabase } from "@/lib/supabase";
import { dy, useDentayaThemeRuntime, } from "@/app/dentaya-theme";
type OrgType = "clinic" | "laboratory" | "courier";
type Organization = {
    id: string;
    name: string;
    org_type: OrgType;
};
type CourierOrganization = {
    id: string;
    name: string;
};
type Membership = {
    organization_id: string;
    role: string;
};
type Profile = {
    full_name: string | null;
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
    clinical_notes: string | null;
    lab_notes: string | null;
    created_at: string;
    updated_at: string;
};
type AttachmentRow = {
    id: string;
    file_name: string;
    category: string;
    storage_bucket: string;
    storage_path: string;
    created_at: string;
};
type ScanRow = {
    id: string;
    scan_ref: string;
    file_name: string | null;
    scan_origin: "clinic" | "laboratory";
    scan_purpose: string;
    arch: string;
    captured_at: string;
    completeness_score: number | null;
    scanner_brand: string | null;
    scanner_model: string | null;
};
type MessageRow = {
    id: string;
    sender_id: string;
    sender_org_id: string;
    sender_name: string | null;
    sender_role: string | null;
    body: string;
    created_at: string;
};
type EventRow = {
    id: string;
    event_type: string;
    from_status: string | null;
    to_status: string | null;
    message: string | null;
    actor_label: string | null;
    created_at: string;
};
type ReviewRow = {
    id: string;
    attachment_id: string;
    version_number: number;
    status: "pending" | "approved" | "revision_requested" | "superseded";
    revision_note: string | null;
    submitted_at: string;
    reviewed_at: string | null;
};
type DesignProject = {
    id: string;
    workflow_stage: string;
    status: string;
    restoration_type: string;
    updated_at: string;
};
type ShipmentRow = {
    id: string;
    status: string;
    courier_org_id: string | null;
    courier_name: string | null;
    tracking_code: string | null;
    pickup_label: string | null;
    dropoff_label: string | null;
    pickup_at: string | null;
    delivered_at: string | null;
    updated_at: string;
};
type LabQuote = {
    amount: number;
    currency: string;
    status: string;
    notes: string | null;
};
type ClinicFinance = {
    patient_price: number;
    discount_amount: number;
    paid_amount: number;
    currency: string;
    payment_status: string;
};
type Tab = "overview" | "scans" | "messages" | "cad" | "finance" | "delivery" | "history";
const tabs: Array<{
    id: Tab;
    label: string;
}> = [
    {
        id: "overview",
        label: "Genel Bakış",
    },
    {
        id: "scans",
        label: "Taramalar",
    },
    {
        id: "messages",
        label: "Mesajlar",
    },
    {
        id: "cad",
        label: "CAD & Onay",
    },
    {
        id: "finance",
        label: "Fiyat",
    },
    {
        id: "delivery",
        label: "Kurye",
    },
    {
        id: "history",
        label: "Geçmiş",
    },
];
export default function CaseCommandCenterPage() {
    const { t: uiText, intlLocale } = useTranslation();
    useDentayaThemeRuntime();
    const params = useParams<{
        id: string;
    }>();
    const router = useRouter();
    const caseId = params.id;
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [activeTab, setActiveTab] = useState<Tab>("overview");
    const [userId, setUserId] = useState("");
    const [membership, setMembership] = useState<Membership | null>(null);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [caseRow, setCaseRow] = useState<CaseRow | null>(null);
    const [clinicName, setClinicName] = useState("");
    const [labName, setLabName] = useState("");
    const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
    const [scans, setScans] = useState<ScanRow[]>([]);
    const [messages, setMessages] = useState<MessageRow[]>([]);
    const [events, setEvents] = useState<EventRow[]>([]);
    const [reviews, setReviews] = useState<ReviewRow[]>([]);
    const [designProject, setDesignProject] = useState<DesignProject | null>(null);
    const [shipments, setShipments] = useState<ShipmentRow[]>([]);
    const [courierOrganizations, setCourierOrganizations] = useState<CourierOrganization[]>([]);
    const [selectedCourierOrganizationId, setSelectedCourierOrganizationId] = useState("");
    const [labQuote, setLabQuote] = useState<LabQuote | null>(null);
    const [clinicFinance, setClinicFinance] = useState<ClinicFinance | null>(null);
    const [chatInput, setChatInput] = useState("");
    const [revisionNote, setRevisionNote] = useState("");
    const statusLock = useRef(false);
    const messageLock = useRef(false);
    const messageRequestId = useRef<string | null>(null);
    const reviewLock = useRef(false);
    const shipmentLock = useRef(false);
    const isClinic = organization?.org_type ===
        "clinic";
    const isLab = organization?.org_type ===
        "laboratory";
    const canReview = isClinic &&
        ["owner", "admin", "dentist"].includes(membership?.role ?? "");
    const canLabOperate = isLab &&
        ["owner", "admin", "technician"].includes(membership?.role ?? "");
    useEffect(() => {
        if (typeof window ===
            "undefined") {
            return;
        }
        const requested = new URLSearchParams(window.location.search).get("tab");
        if (requested &&
            [
                "overview",
                "scans",
                "messages",
                "cad",
                "finance",
                "delivery",
                "history",
            ].includes(requested)) {
            setActiveTab(requested as Tab);
        }
    }, [caseId]);
    const latestReview = useMemo(() => reviews[0] ?? null, [reviews]);
    const latestShipment = useMemo(() => shipments[0] ?? null, [shipments]);
    const loadCaseData = useCallback(async (currentOrg: Organization) => {
        const { data: currentCase, error: caseError, } = await supabase
            .from("cases")
            .select("id,case_number,patient_id,clinic_org_id,lab_org_id,patient_reference,title,case_type,priority,status,due_date,tooth_codes,material,shade,clinical_notes,lab_notes,created_at,updated_at")
            .eq("id", caseId)
            .maybeSingle();
        if (caseError ||
            !currentCase) {
            setMessage(dentayaError(caseError, "Vaka bulunamadı veya bu vakayı görüntüleme yetkin yok."));
            setCaseRow(null);
            return;
        }
        const current = currentCase as CaseRow;
        setCaseRow(current);
        const organizationIds = [
            current.clinic_org_id,
            current.lab_org_id,
        ].filter((value): value is string => Boolean(value));
        const [orgResult, attachmentResult, scanResult, messageResult, eventResult, reviewResult, designResult, shipmentResult, quoteResult, courierResult,] = await Promise.all([
            supabase
                .from("organizations")
                .select("id,name")
                .in("id", organizationIds),
            supabase
                .from("attachments")
                .select("id,file_name,category,storage_bucket,storage_path,created_at")
                .eq("case_id", caseId)
                .order("created_at", {
                ascending: false,
            }),
            supabase
                .from("scan_sessions")
                .select("id,scan_ref,file_name,scan_origin,scan_purpose,arch,captured_at,completeness_score,scanner_brand,scanner_model")
                .eq("case_id", caseId)
                .order("captured_at", {
                ascending: false,
            }),
            supabase
                .from("case_messages")
                .select("id,sender_id,sender_org_id,sender_name,sender_role,body,created_at")
                .eq("case_id", caseId)
                .order("created_at", {
                ascending: true,
            }),
            supabase
                .from("case_events")
                .select("id,event_type,from_status,to_status,message,actor_label,created_at")
                .eq("case_id", caseId)
                .order("created_at", {
                ascending: false,
            })
                .limit(100),
            supabase
                .from("case_design_reviews")
                .select("id,attachment_id,version_number,status,revision_note,submitted_at,reviewed_at")
                .eq("case_id", caseId)
                .order("version_number", {
                ascending: false,
            }),
            supabase
                .from("design_projects")
                .select("id,workflow_stage,status,restoration_type,updated_at")
                .eq("case_id", caseId)
                .maybeSingle(),
            supabase
                .from("shipments")
                .select("id,status,courier_org_id,courier_name,tracking_code,pickup_label,dropoff_label,pickup_at,delivered_at,updated_at")
                .eq("case_id", caseId)
                .order("updated_at", {
                ascending: false,
            }),
            supabase
                .from("lab_case_quotes")
                .select("amount,currency,status,notes")
                .eq("case_id", caseId)
                .maybeSingle(),
            supabase
                .from("organizations")
                .select("id,name")
                .eq("org_type", "courier")
                .eq("directory_visible", true)
                .order("name", {
                ascending: true,
            })
                .limit(50),
        ]);
        const names = new Map((orgResult.data ??
            []).map((item: {
            id: string;
            name: string;
        }) => [
            item.id,
            item.name,
        ]));
        setClinicName(names.get(current.clinic_org_id) ?? "Klinik");
        setLabName(current.lab_org_id
            ? names.get(current.lab_org_id) ??
                "Laboratuvar"
            : "Laboratuvar atanmadı");
        setAttachments((attachmentResult.data ??
            []) as AttachmentRow[]);
        setScans((scanResult.data ??
            []) as ScanRow[]);
        setMessages((messageResult.data ??
            []) as MessageRow[]);
        setEvents((eventResult.data ??
            []) as EventRow[]);
        setReviews((reviewResult.data ??
            []) as ReviewRow[]);
        setDesignProject((designResult.data ??
            null) as DesignProject | null);
        setShipments((shipmentResult.data ??
            []) as ShipmentRow[]);
        setCourierOrganizations((courierResult.data ??
            []) as CourierOrganization[]);
        setLabQuote((quoteResult.data ??
            null) as LabQuote | null);
        if (currentOrg.org_type ===
            "clinic") {
            const { data: financeData, } = await supabase
                .from("clinic_case_finance")
                .select("patient_price,discount_amount,paid_amount,currency,payment_status")
                .eq("case_id", caseId)
                .maybeSingle();
            setClinicFinance((financeData ??
                null) as ClinicFinance | null);
        }
        else {
            setClinicFinance(null);
        }
    }, [caseId]);
    useEffect(() => {
        let active = true;
        let messageChannel: RealtimeChannel | null = null;
        let eventChannel: RealtimeChannel | null = null;
        let shipmentChannel: RealtimeChannel | null = null;
        async function initialize() {
            const { data: auth } = await supabase.auth
                .getSession();
            const user = auth.session?.user;
            if (!user) {
                router.replace("/workspace");
                return;
            }
            setUserId(user.id);
            const [membershipResult, profileResult,] = await Promise.all([
                supabase
                    .from("memberships")
                    .select("organization_id,role")
                    .eq("user_id", user.id)
                    .eq("status", "active")
                    .limit(1)
                    .maybeSingle(),
                supabase
                    .from("profiles")
                    .select("full_name")
                    .eq("id", user.id)
                    .maybeSingle(),
            ]);
            if (!membershipResult.data) {
                setMessage("Aktif kurum bulunamadı.");
                setLoading(false);
                return;
            }
            const currentMembership = membershipResult.data as Membership;
            const { data: orgData } = await supabase
                .from("organizations")
                .select("id,name,org_type")
                .eq("id", currentMembership.organization_id)
                .maybeSingle();
            if (!orgData) {
                setMessage("Kurum bilgisi alınamadı.");
                setLoading(false);
                return;
            }
            const currentOrg = orgData as Organization;
            if (currentOrg.org_type ===
                "courier") {
                router.replace("/logistics");
                return;
            }
            if (!active)
                return;
            setMembership(currentMembership);
            setOrganization(currentOrg);
            setProfile((profileResult.data ??
                null) as Profile | null);
            await loadCaseData(currentOrg);
            if (!active)
                return;
            messageChannel =
                supabase
                    .channel(`case-command-messages-${caseId}`)
                    .on("postgres_changes", {
                    event: "*",
                    schema: "public",
                    table: "case_messages",
                    filter: `case_id=eq.${caseId}`,
                }, () => {
                    void loadCaseData(currentOrg);
                })
                    .subscribe();
            eventChannel =
                supabase
                    .channel(`case-command-events-${caseId}`)
                    .on("postgres_changes", {
                    event: "*",
                    schema: "public",
                    table: "case_events",
                    filter: `case_id=eq.${caseId}`,
                }, () => {
                    void loadCaseData(currentOrg);
                })
                    .subscribe();
            shipmentChannel =
                supabase
                    .channel(`case-command-shipments-${caseId}`)
                    .on("postgres_changes", {
                    event: "*",
                    schema: "public",
                    table: "shipments",
                    filter: `case_id=eq.${caseId}`,
                }, () => {
                    void loadCaseData(currentOrg);
                })
                    .subscribe();
            setLoading(false);
        }
        void initialize();
        return () => {
            active = false;
            if (messageChannel) {
                void supabase
                    .removeChannel(messageChannel);
            }
            if (eventChannel) {
                void supabase
                    .removeChannel(eventChannel);
            }
            if (shipmentChannel) {
                void supabase
                    .removeChannel(shipmentChannel);
            }
        };
    }, [
        caseId,
        loadCaseData,
        router,
    ]);
    useEffect(() => {
        function recover() {
            if (organization) {
                void loadCaseData(organization);
            }
        }
        window.addEventListener("dentaya-network-restored", recover);
        return () => window.removeEventListener("dentaya-network-restored", recover);
    }, [
        organization,
        loadCaseData,
    ]);
    async function updateCaseStatus(next: CaseStatus) {
        if (!caseRow ||
            !organization ||
            statusLock.current) {
            return;
        }
        statusLock.current = true;
        setBusy(true);
        setMessage("");
        const { error } = await supabase.rpc("dentaya_transition_case", {
            p_case_id: caseRow.id,
            p_next_status: next,
        });
        if (error) {
            setBusy(false);
            statusLock.current = false;
            setMessage(dentayaError(error));
            return;
        }
        await loadCaseData(organization);
        setBusy(false);
        statusLock.current = false;
    }
    async function createShipment() {
        if (!caseRow ||
            !organization ||
            !userId ||
            !caseRow.lab_org_id ||
            shipmentLock.current) {
            return;
        }
        const activeShipment = shipments.find((item) => [
            "created",
            "pickup_requested",
            "picked_up",
            "in_transit",
        ].includes(item.status));
        if (activeShipment) {
            setActiveTab("delivery");
            setMessage("Bu vaka için zaten aktif bir kurye gönderisi var.");
            return;
        }
        if (typeof navigator !== "undefined" &&
            !navigator.onLine) {
            setMessage("İnternet bağlantısı yok. Gönderi oluşturmadan önce bağlantının gelmesini bekle.");
            return;
        }
        shipmentLock.current = true;
        setBusy(true);
        setMessage("");
        const requestId = crypto.randomUUID();
        const courierOrganizationId = selectedCourierOrganizationId || null;
        const { error } = await supabase.rpc("dentaya_create_case_shipment", {
            p_case_id: caseRow.id,
            p_courier_org_id: courierOrganizationId,
            p_request_id: requestId,
        });
        if (error) {
            setBusy(false);
            shipmentLock.current = false;
            setMessage(dentayaError(error, "Kurye gönderisi oluşturulamadı."));
            return;
        }
        await loadCaseData(organization);
        setActiveTab("delivery");
        setSelectedCourierOrganizationId("");
        setMessage(courierOrganizationId
            ? "Alım talebi oluşturuldu. Kurye operasyonu şimdi gönderiyi görebilir."
            : "Gönderi oluşturuldu. Kurye atamasını bu ekrandan tamamlayabilirsin.");
        setBusy(false);
        shipmentLock.current = false;
    }
    async function assignCourierToShipment(shipmentId: string) {
        if (!organization ||
            !selectedCourierOrganizationId ||
            shipmentLock.current) {
            if (!selectedCourierOrganizationId) {
                setMessage("Önce bir kurye ağı seç.");
            }
            return;
        }
        if (typeof navigator !== "undefined" &&
            !navigator.onLine) {
            setMessage("İnternet bağlantısı yok. Kurye atamasından önce bağlantının gelmesini bekle.");
            return;
        }
        shipmentLock.current = true;
        setBusy(true);
        setMessage("");
        const { error } = await supabase.rpc("dentaya_assign_courier", {
            p_shipment_id: shipmentId,
            p_courier_org_id: selectedCourierOrganizationId,
        });
        if (error) {
            setBusy(false);
            shipmentLock.current = false;
            setMessage(dentayaError(error, "Kurye ataması tamamlanamadı."));
            return;
        }
        await loadCaseData(organization);
        setSelectedCourierOrganizationId("");
        setMessage("Kurye ağı atandı ve alım talebi açıldı.");
        setBusy(false);
        shipmentLock.current = false;
    }
    async function sendMessage() {
        if (!chatInput.trim() ||
            !organization ||
            !userId ||
            !caseRow ||
            messageLock.current) {
            return;
        }
        messageLock.current = true;
        const requestId = messageRequestId.current ??
            crypto.randomUUID();
        messageRequestId.current =
            requestId;
        setBusy(true);
        setMessage("");
        const body = chatInput.trim();
        if (body.length > 4000) {
            messageLock.current = false;
            setMessage("Mesaj 4000 karakterden uzun olamaz.");
            return;
        }
        if (typeof navigator !==
            "undefined" &&
            !navigator.onLine) {
            messageLock.current = false;
            setMessage("İnternet bağlantısı yok. Mesajı göndermeden önce bağlantının gelmesini bekle.");
            return;
        }
        const { error } = await supabase
            .from("case_messages")
            .insert({
            case_id: caseRow.id,
            sender_id: userId,
            sender_org_id: organization.id,
            sender_name: profile?.full_name ??
                null,
            sender_role: membership?.role ??
                null,
            body,
            client_request_id: requestId,
        });
        setBusy(false);
        messageLock.current = false;
        if (error &&
            error.code !== "23505") {
            setMessage(dentayaError(error));
            return;
        }
        messageRequestId.current =
            null;
        setChatInput("");
    }
    async function reviewDesign(decision: "approved" | "revision_requested") {
        if (!canReview ||
            !latestReview ||
            !caseRow ||
            !organization ||
            reviewLock.current) {
            return;
        }
        if (decision ===
            "revision_requested" &&
            !revisionNote.trim()) {
            setMessage("Revizyon isterken kısa bir not yaz.");
            setActiveTab("cad");
            return;
        }
        if (revisionNote.trim().length >
            2000) {
            setMessage("Revizyon notu 2000 karakterden uzun olamaz.");
            return;
        }
        if (typeof navigator !==
            "undefined" &&
            !navigator.onLine) {
            setMessage("İnternet bağlantısı yok. Tasarım kararını göndermeden önce bağlantının gelmesini bekle.");
            return;
        }
        reviewLock.current = true;
        setBusy(true);
        setMessage("");
        const { error } = await supabase.rpc("dentaya_review_design", {
            p_review_id: latestReview.id,
            p_decision: decision,
            p_revision_note: decision === "revision_requested"
                ? revisionNote.trim()
                : null,
        });
        if (error) {
            setBusy(false);
            reviewLock.current = false;
            setMessage(dentayaError(error, "Tasarım kararı kaydedilemedi."));
            return;
        }
        setRevisionNote("");
        await loadCaseData(organization);
        setMessage(decision === "approved"
            ? "Tasarım onaylandı ve vaka üretime geçti."
            : "Revizyon talebi kaydedildi ve vaka yeniden tasarıma döndü.");
        setBusy(false);
        reviewLock.current = false;
    }
    async function openAttachment(item: AttachmentRow) {
        const { data, error, } = await supabase.storage
            .from(item.storage_bucket)
            .createSignedUrl(item.storage_path, 60 * 5);
        if (error ||
            !data?.signedUrl) {
            setMessage(dentayaError(error, "Dosya açılamadı."));
            return;
        }
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    }
    if (loading) return <LoadingExperience title="Vaka çalışma alanı hazırlanıyor…"/>;
    if (!caseRow ||
        !organization) {
        return (<UiNode as="main" style={ui.center}>
        <UiNode as="div" style={ui.errorCard}>
          <UiNode as="strong">
            Vaka açılamadı
          </UiNode>

          <UiNode as="span">
            {message ||
                "Bu vaka bulunamadı."}
          </UiNode>

          <Link href="/cases" style={ui.primaryLink}>
            Vakalara dön
          </Link>
        </UiNode>
      </UiNode>);
    }
    const workflowIndex = workflowStatusIndex(caseRow.status);
    const patientNet = clinicFinance
        ? clinicFinance.patient_price -
            clinicFinance.discount_amount
        : null;
    return (<UiNode as="main" style={ui.page}>
      <style>{`
        * { box-sizing: border-box; }

        .case-tab {
          transition:
            background var(--dy-motion-fast,150ms) ease,
            color var(--dy-motion-fast,150ms) ease,
            border-color var(--dy-motion-fast,150ms) ease;
        }

        .case-file:hover,
        .case-scan:hover,
        .case-message:hover {
          border-color: var(--dy-accent,#6de2cf) !important;
        }

        @media(max-width:1050px) {
          .case-command-header {
            grid-template-columns: 1fr !important;
          }

          .case-command-grid {
            grid-template-columns: 1fr !important;
          }

          .case-summary-grid {
            grid-template-columns:
              repeat(2,minmax(0,1fr)) !important;
          }
        }

        @media(max-width:720px) {
          .case-command-top {
            flex-direction:column !important;
            align-items:flex-start !important;
          }

          .case-summary-grid,
          .case-two {
            grid-template-columns:1fr !important;
          }

          .case-tabs {
            overflow-x:auto !important;
            flex-wrap:nowrap !important;
          }

          .case-tabs button {
            min-width:max-content;
          }

          .case-workflow {
            grid-template-columns:1fr !important;
          }

          .case-message-row {
            grid-template-columns:1fr !important;
          }

          .case-delivery-launch {
            grid-template-columns:1fr !important;
          }
        }
      `}</style>

      <UiNode as="header" className="case-command-top" style={ui.topbar}>
        <UiNode as="div">
          <Link href="/cases" style={ui.back}>
            {uiText(" ← Vakalar ")}</Link>

          <UiNode as="div" style={ui.caseRefRow}>
            <UiNode as="span" style={ui.caseRef}>
              {caseRow.case_number}
            </UiNode>

            <UiNode as="span" style={statusPill(caseRow.status)}>
              {caseStatusLabel(caseRow.status)}
            </UiNode>

            <UiNode as="span" style={priorityPill(caseRow.priority)}>
              {priorityLabel(caseRow.priority)}
            </UiNode>
          </UiNode>

          <UiNode as="h1" style={ui.title}>
            <UserText>{caseRow.title}</UserText>
          </UiNode>

          <UiNode as="p" style={ui.subtitle}>
            <UserText>{caseRow.patient_reference}</UserText>
            {" · "}
            {caseTypeLabel(caseRow.case_type)}
            {" · FDI "}
            {caseRow.tooth_codes
            .join(", ") ||
            "—"}
          </UiNode>
        </UiNode>

        <UiNode as="div" style={ui.headerActions}>
          <NotificationCenter />

          {(isClinic || isLab) && (<Link href={`/ai?case=${caseId}`} style={ui.secondaryLink}>
              ◇ AYA Analiz
            </Link>)}

          <PrimaryAction caseRow={caseRow} isClinic={isClinic} isLab={isLab} canReview={canReview} canLabOperate={canLabOperate} latestReview={latestReview} busy={busy} onAccept={() => void updateCaseStatus("accepted")} onOpenCad={() => router.push(`/design?case=${caseId}`)} onOpenScan={() => router.push(`/scan-studio?case=${caseId}`)} onOpenApproval={() => setActiveTab("cad")} onQc={() => void updateCaseStatus("qc")} onReady={() => void updateCaseStatus("ready")} onDelivery={() => router.push("/logistics")}/>
        </UiNode>
      </UiNode>

      {message && (<UiNode as="div" style={ui.notice}>
          {message}
        </UiNode>)}

      <UiNode as="section" className="case-command-header" style={ui.headerGrid}>
        <UiNode as="div" style={ui.heroCard}>
          <UiNode as="div">
            <UiNode as="p" style={ui.eyebrow}>
              VAKA KOMUTA MERKEZİ
            </UiNode>

            <UiNode as="h2" style={ui.heroTitle}>
              Tek vaka, tek çalışma alanı
            </UiNode>

            <UiNode as="p" style={ui.heroText}>
              Tarama, mesaj, CAD,
              onay, fiyat,
              teslimat ve geçmiş
              aynı vaka altında
              birbirine bağlanır.
            </UiNode>
          </UiNode>

          <UiNode as="div" className="case-workflow" style={ui.workflow}>
            {[
            "Yeni",
            "Kabul",
            "Tasarım",
            "Onay",
            "Üretim",
            "Kalite",
            "Hazır",
            "Teslim",
        ].map((label, index) => (<UiNode as="div" key={label} style={{
                ...ui.workflowStep,
                borderColor: index <=
                    workflowIndex
                    ? dy.accent
                    : dy.border,
                background: index ===
                    workflowIndex
                    ? dy.accentSoft
                    : dy.surface2,
            }}>
                  <UiNode as="span">
                    {String(index + 1).padStart(2, "0")}
                  </UiNode>

                  <UiNode as="strong">
                    {label}
                  </UiNode>
                </UiNode>))}
          </UiNode>
        </UiNode>

        <UiNode as="aside" style={ui.sideCard}>
          <SectionTitle title="Taraflar" description="Bu vakada yetkili kurumlar."/>

          <InfoRow label={uiText("Klinik")} value={clinicName}/>

          <InfoRow label={uiText("Laboratuvar")} value={labName}/>

          <InfoRow label="Termin" value={caseRow.due_date
            ? formatDateOnly(caseRow.due_date, intlLocale())
            : "Belirtilmedi"}/>

          <InfoRow label="Materyal" value={caseRow.material ??
            "Belirtilmedi"}/>

          <InfoRow label={uiText("Renk")} value={caseRow.shade ??
            "Belirtilmedi"}/>
        </UiNode>
      </UiNode>

      <UiNode as="section" className="case-summary-grid" style={ui.summaryGrid}>
        <SummaryCard label={uiText("Taramalar")} value={String(scans.length)} detail={scans[0]
            ? `${scanPurposeLabel(scans[0]
                .scan_purpose)} · ${formatDateTime(scans[0]
                .captured_at, intlLocale())}`
            : "Henüz tarama yok"} onClick={() => setActiveTab("scans")}/>

        <SummaryCard label={uiText("Mesajlar")} value={String(messages.length)} detail={messages.at(-1)
            ? `Son mesaj ${formatDateTime(messages.at(-1)!
                .created_at, intlLocale())}`
            : "Henüz mesaj yok"} onClick={() => setActiveTab("messages")}/>

        <SummaryCard label="CAD" value={latestReview
            ? `v${latestReview.version_number}`
            : designProject
                ? "Aktif"
                : "—"} detail={latestReview
            ? reviewStatusLabel(latestReview.status)
            : designProject
                ? designStatusLabel(designProject.status)
                : "Proje yok"} onClick={() => setActiveTab("cad")}/>

        <SummaryCard label={isClinic
            ? "Hasta Fiyatı"
            : "Lab Fiyatı"} value={isClinic
            ? patientNet !==
                null
                ? money(patientNet, intlLocale())
                : "—"
            : labQuote
                ? money(labQuote.amount, intlLocale())
                : "—"} detail={isClinic
            ? labQuote
                ? `Lab maliyeti ${money(labQuote.amount, intlLocale())}`
                : "Lab fiyatı bekleniyor"
            : labQuote
                ? quoteStatusLabel(labQuote.status)
                : "Teklif oluşturulmadı"} onClick={() => setActiveTab("finance")}/>
      </UiNode>

      <UiNode as="nav" className="case-tabs" style={ui.tabs}>
        {tabs.map((tab) => (<UiNode as="button" key={tab.id} type="button" className="case-tab" onClick={() => setActiveTab(tab.id)} style={{
                ...ui.tab,
                ...(activeTab ===
                    tab.id
                    ? ui.tabActive
                    : {}),
            }}>
              {tab.label}
            </UiNode>))}
      </UiNode>

      <UiNode as="section" style={ui.panel}>
        {activeTab ===
            "overview" && (<OverviewTab caseRow={caseRow} clinicName={clinicName} labName={labName} scans={scans} messages={messages} latestReview={latestReview} shipment={latestShipment} isClinic={isClinic} patientNet={patientNet} labQuote={labQuote} setActiveTab={setActiveTab}/>)}

        {activeTab ===
            "scans" && (<ScansTab scans={scans} caseId={caseId} patientId={caseRow.patient_id} isLab={isLab}/>)}

        {activeTab ===
            "messages" && (<MessagesTab messages={messages} currentUserId={userId} chatInput={chatInput} setChatInput={setChatInput} busy={busy} onSend={() => void sendMessage()}/>)}

        {activeTab ===
            "cad" && (<CadTab caseId={caseId} designProject={designProject} reviews={reviews} latestReview={latestReview} attachments={attachments} canReview={canReview} isLab={isLab} revisionNote={revisionNote} setRevisionNote={setRevisionNote} busy={busy} onApprove={() => void reviewDesign("approved")} onRevision={() => void reviewDesign("revision_requested")} onOpenAttachment={openAttachment}/>)}

        {activeTab ===
            "finance" && (<FinanceTab isClinic={isClinic} labQuote={labQuote} clinicFinance={clinicFinance}/>)}

        {activeTab ===
            "delivery" && (<DeliveryTab caseRow={caseRow} clinicName={clinicName} labName={labName} shipments={shipments} courierOrganizations={courierOrganizations} selectedCourierOrganizationId={selectedCourierOrganizationId} setSelectedCourierOrganizationId={setSelectedCourierOrganizationId} busy={busy} onCreateShipment={() => void createShipment()} onAssignCourier={(shipmentId) => void assignCourierToShipment(shipmentId)}/>)}

        {activeTab ===
            "history" && (<HistoryTab events={events}/>)}
      </UiNode>
    </UiNode>);
}
function PrimaryAction({ caseRow, isClinic, isLab, canReview, canLabOperate, latestReview, busy, onAccept, onOpenCad, onOpenScan, onOpenApproval, onQc, onReady, onDelivery, }: {
    caseRow: CaseRow;
    isClinic: boolean;
    isLab: boolean;
    canReview: boolean;
    canLabOperate: boolean;
    latestReview: ReviewRow | null;
    busy: boolean;
    onAccept: () => void;
    onOpenCad: () => void;
    onOpenScan: () => void;
    onOpenApproval: () => void;
    onQc: () => void;
    onReady: () => void;
    onDelivery: () => void;
}) {
    if (caseRow.status ===
        "cancelled") {
        return (<UiNode as="span" style={ui.cancelled}>
        Vaka iptal edildi
      </UiNode>);
    }
    if (caseRow.status ===
        "delivered") {
        return (<UiNode as="span" style={ui.done}>
        Süreç tamamlandı
      </UiNode>);
    }
    if (isClinic) {
        if (canReview &&
            caseRow.status ===
                "approval" &&
            latestReview?.status ===
                "pending") {
            return (<UiNode as="button" type="button" onClick={onOpenApproval} style={ui.primaryButton}>
          Tasarımı İncele
        </UiNode>);
        }
        if (caseRow.status ===
            "ready" ||
            caseRow.status ===
                "shipped") {
            return (<UiNode as="button" type="button" onClick={onDelivery} style={ui.primaryButton}>
          Teslimatı Aç
        </UiNode>);
        }
        return (<Link href={`/messages`} style={ui.primaryLink}>
        Laboratuvarla Mesajlaş
      </Link>);
    }
    if (isLab && canLabOperate) {
        if (caseRow.status ===
            "new") {
            return (<UiNode as="button" type="button" disabled={busy} onClick={onAccept} style={ui.primaryButton}>
          Vakayı Kabul Et
        </UiNode>);
        }
        if (caseRow.status ===
            "accepted") {
            return (<UiNode as="button" type="button" onClick={onOpenScan} style={ui.primaryButton}>
          Tarama / CAD Başlat
        </UiNode>);
        }
        if (caseRow.status ===
            "design") {
            return (<UiNode as="button" type="button" onClick={onOpenCad} style={ui.primaryButton}>
          DentAYA Design&apos;ı Aç
        </UiNode>);
        }
        if (caseRow.status ===
            "approval") {
            return (<UiNode as="span" style={ui.waiting}>
          Klinik onayı bekleniyor
        </UiNode>);
        }
        if (caseRow.status ===
            "production") {
            return (<UiNode as="button" type="button" disabled={busy} onClick={onQc} style={ui.primaryButton}>
          Kalite Kontrole Gönder
        </UiNode>);
        }
        if (caseRow.status ===
            "qc") {
            return (<UiNode as="button" type="button" disabled={busy} onClick={onReady} style={ui.primaryButton}>
          Teslimata Hazır
        </UiNode>);
        }
        if (caseRow.status ===
            "ready" ||
            caseRow.status ===
                "shipped") {
            return (<UiNode as="button" type="button" onClick={onDelivery} style={ui.primaryButton}>
          Kurye Sürecini Aç
        </UiNode>);
        }
    }
    return null;
}
function OverviewTab({ caseRow, clinicName, labName, scans, messages, latestReview, shipment, isClinic, patientNet, labQuote, setActiveTab, }: {
    caseRow: CaseRow;
    clinicName: string;
    labName: string;
    scans: ScanRow[];
    messages: MessageRow[];
    latestReview: ReviewRow | null;
    shipment: ShipmentRow | null;
    isClinic: boolean;
    patientNet: number | null;
    labQuote: LabQuote | null;
    setActiveTab: (tab: Tab) => void;
}) {
    const { intlLocale } = useTranslation();
    return (<UiNode as="div" style={ui.tabStack}>
      <SectionTitle title="Vaka özeti" description="Bu ekran yalnızca karar vermek için gereken temel bilgileri gösterir."/>

      <UiNode as="div" className="case-two" style={ui.two}>
        <InfoCard title="Klinik isteği" text={displayClinicalNotes(caseRow.clinical_notes, caseRow.tooth_codes) ||
            "Klinik notu eklenmemiş."}/>

        <InfoCard title="Laboratuvar notu" text={caseRow.lab_notes ??
            "Laboratuvar notu eklenmemiş."}/>
      </UiNode>

      <UiNode as="div" style={ui.actionCards}>
        <ActionCard title="Tarama" detail={scans.length
            ? `${scans.length} kayıt · Son: ${scanPurposeLabel(scans[0]
                .scan_purpose)}`
            : "Henüz vaka taraması yok"} action="Taramaları aç" onClick={() => setActiveTab("scans")}/>

        <ActionCard title="Hekim ↔ Teknisyen" detail={messages.length
            ? `${messages.length} mesaj`
            : "Konuşma başlatılmadı"} action="Mesajları aç" onClick={() => setActiveTab("messages")}/>

        <ActionCard title="CAD & Onay" detail={latestReview
            ? `v${latestReview.version_number} · ${reviewStatusLabel(latestReview.status)}`
            : "Onaya gönderilmiş tasarım yok"} action="CAD alanını aç" onClick={() => setActiveTab("cad")}/>

        <ActionCard title={isClinic
            ? "Hasta & Lab Fiyatı"
            : "Lab Fiyatı"} detail={isClinic
            ? `Hasta ${patientNet !== null ? money(patientNet, intlLocale()) : "—"} · Lab ${labQuote ? money(labQuote.amount, intlLocale()) : "—"}`
            : labQuote
                ? `${money(labQuote.amount, intlLocale())} · ${quoteStatusLabel(labQuote.status)}`
                : "Fiyat oluşturulmadı"} action="Fiyatı aç" onClick={() => setActiveTab("finance")}/>

        <ActionCard title="Kurye" detail={shipment
            ? `${shipmentStatusLabel(shipment.status)} · ${shipment.tracking_code ?? "Takip kodu yok"}`
            : "Gönderi oluşturulmadı"} action="Teslimatı aç" onClick={() => setActiveTab("delivery")}/>

        <ActionCard title="Taraflar" detail={`${clinicName} ↔ ${labName}`} action="Vaka bilgisi" onClick={() => {
            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        }}/>
      </UiNode>
    </UiNode>);
}
function ScansTab({ scans, caseId, patientId, isLab, }: {
    scans: ScanRow[];
    caseId: string;
    patientId: string;
    isLab: boolean;
}) {
    const { intlLocale } = useTranslation();
    return (<UiNode as="div" style={ui.tabStack}>
      <UiNode as="div" style={ui.sectionHead}>
        <SectionTitle title="Vaka taramaları" description="Klinik ve laboratuvar kaynakları aynı vaka zincirinde görünür."/>

        <UiNode as="div" style={ui.inlineActions}>
          <Link href={`/scan-studio?case=${caseId}`} style={ui.primaryLink}>
            + Yeni Tarama
          </Link>

          <Link href={`/scans?patient=${patientId}`} style={ui.secondaryLink}>
            3D Tarama Merkezi
          </Link>

          {isLab && (<Link href={`/design?case=${caseId}`} style={ui.secondaryLink}>
              CAD&apos;e Git
            </Link>)}
        </UiNode>
      </UiNode>

      {scans.length ? (<UiNode as="div" style={ui.list}>
          {scans.map((scan) => (<UiNode as="article" key={scan.id} className="case-scan" style={ui.listCard}>
                <UiNode as="div">
                  <UiNode as="div" style={ui.metaRow}>
                    <UiNode as="span" style={ui.sourceTag}>
                      {scan.scan_origin ===
                    "laboratory"
                    ? "LAB TARAMASI"
                    : "KLİNİK TARAMASI"}
                    </UiNode>

                    <UiNode as="span" style={ui.lightTag}>
                      {scanPurposeLabel(scan.scan_purpose)}
                    </UiNode>
                  </UiNode>

                  <UiNode as="strong" style={ui.cardTitle}>
                    {scan.file_name ??
                    scan.scan_ref}
                  </UiNode>

                  <UiNode as="span" style={ui.cardSub}>
                    {archLabel(scan.arch)}
                    {" · "}
                    {[
                    scan.scanner_brand,
                    scan.scanner_model,
                ]
                    .filter(Boolean)
                    .join(" ") ||
                    "Tarayıcı belirtilmedi"}
                  </UiNode>
                </UiNode>

                <UiNode as="div" style={ui.cardRight}>
                  <UiNode as="strong">
                    {scan.completeness_score !==
                    null
                    ? <UiMessage source="%{0}" values={[Math.round(Number(scan.completeness_score))]} userValues={[]}/> : "—"}
                  </UiNode>

                  <UiNode as="span" style={ui.cardSub}>
                    {formatDateTime(scan.captured_at, intlLocale())}
                  </UiNode>
                </UiNode>
              </UiNode>))}
        </UiNode>) : (<Empty title="Henüz vaka taraması yok" text="Yeni Tarama ile klinik veya laboratuvar taramasını bu vakaya bağlayabilirsin."/>)}
    </UiNode>);
}
function MessagesTab({ messages, currentUserId, chatInput, setChatInput, busy, onSend, }: {
    messages: MessageRow[];
    currentUserId: string;
    chatInput: string;
    setChatInput: (value: string) => void;
    busy: boolean;
    onSend: () => void;
}) {
    const { intlLocale } = useTranslation();
    return (<UiNode as="div" style={ui.tabStack}>
      <SectionTitle title="Vaka mesajları" description="Bu alandaki konuşma doğrudan bu vakaya bağlıdır; teknik kararlar genel sohbet içinde kaybolmaz."/>

      <UiNode as="div" style={ui.chat}>
        {messages.length ? (messages.map((item) => {
            const mine = item.sender_id ===
                currentUserId;
            return (<UiNode as="div" key={item.id} className="case-message-row" style={{
                    ...ui.messageRow,
                    gridTemplateColumns: mine
                        ? "minmax(100px,.35fr) minmax(0,1fr)"
                        : "minmax(0,1fr) minmax(100px,.35fr)",
                }}>
                  {mine && <UiNode as="div"/>}

                  <UiNode as="article" className="case-message" style={{
                    ...ui.messageBubble,
                    background: mine
                        ? dy.accentSoft
                        : dy.surface2,
                    borderColor: mine
                        ? dy.accent
                        : dy.border,
                }}>
                    <UiNode as="div" style={ui.messageMeta}>
                      <UiNode as="strong">
                        {item.sender_name ??
                    "DentAYA Kullanıcısı"}
                      </UiNode>

                      <UiNode as="span">
                        {roleLabel(item.sender_role)}
                      </UiNode>

                      <UiNode as="span">
                        {formatDateTime(item.created_at, intlLocale())}
                      </UiNode>
                    </UiNode>

                    <UiNode as="p" style={ui.messageBody}>
                      <UserText>{item.body}</UserText>
                    </UiNode>
                  </UiNode>

                  {!mine && <UiNode as="div"/>}
                </UiNode>);
        })) : (<Empty title="Henüz vaka mesajı yok" text="İlk teknik mesajı aşağıdan gönderebilirsin."/>)}
      </UiNode>

      <UiNode as="div" style={ui.composer}>
        <UiNode as="textarea" value={chatInput} onChange={(event) => setChatInput(event.target.value)} onKeyDown={(event) => {
            if (event.key ===
                "Enter" &&
                !event.shiftKey) {
                event.preventDefault();
                onSend();
            }
        }} placeholder="Bu vakayla ilgili teknik mesajını yaz…" style={ui.textarea}/>

        <UiNode as="button" type="button" disabled={busy ||
            !chatInput.trim()} onClick={onSend} style={ui.primaryButton}>
          Mesaj Gönder
        </UiNode>
      </UiNode>
    </UiNode>);
}
function CadTab({ caseId, designProject, reviews, latestReview, attachments, canReview, isLab, revisionNote, setRevisionNote, busy, onApprove, onRevision, onOpenAttachment, }: {
    caseId: string;
    designProject: DesignProject | null;
    reviews: ReviewRow[];
    latestReview: ReviewRow | null;
    attachments: AttachmentRow[];
    canReview: boolean;
    isLab: boolean;
    revisionNote: string;
    setRevisionNote: (value: string) => void;
    busy: boolean;
    onApprove: () => void;
    onRevision: () => void;
    onOpenAttachment: (item: AttachmentRow) => void;
}) {
    const { intlLocale } = useTranslation();
    const designFiles = attachments.filter((item) => item.category ===
        "design" ||
        item.file_name
            .toLowerCase()
            .endsWith(".stl"));
    return (<UiNode as="div" style={ui.tabStack}>
      <UiNode as="div" style={ui.sectionHead}>
        <SectionTitle title="CAD & klinik onayı" description="Laboratuvar tasarımı hazırlar; klinik yalnızca gönderilmiş sürümü onaylar veya revizyon ister."/>

        {isLab && (<Link href={`/design?case=${caseId}`} style={ui.primaryLink}>
            DentAYA Design&apos;ı Aç
          </Link>)}
      </UiNode>

      <UiNode as="div" className="case-two" style={ui.two}>
        <InfoCard title="CAD projesi" text={designProject
            ? `${designStatusLabel(designProject.status)} · ${workflowStageLabel(designProject.workflow_stage)}`
            : "Henüz CAD projesi oluşturulmadı."}/>

        <InfoCard title="Son klinik incelemesi" text={latestReview
            ? `v${latestReview.version_number} · ${reviewStatusLabel(latestReview.status)}`
            : "Henüz kliniğe tasarım gönderilmedi."}/>
      </UiNode>

      {canReview &&
            latestReview?.status ===
                "pending" && (<UiNode as="div" style={ui.reviewBox}>
            <SectionTitle title={`Tasarım v${latestReview.version_number} karar bekliyor`} description="Onay üretim aşamasını başlatır. Revizyon istersen laboratuvara açık ve kısa bir teknik not gönder."/>

            <UiNode as="textarea" value={revisionNote} onChange={(event) => setRevisionNote(event.target
                .value)} placeholder="Revizyon gerekiyorsa notunu yaz…" style={ui.textarea}/>

            <UiNode as="div" style={ui.inlineActions}>
              <UiNode as="button" type="button" disabled={busy} onClick={onApprove} style={ui.approveButton}>
                Tasarımı Onayla
              </UiNode>

              <UiNode as="button" type="button" disabled={busy} onClick={onRevision} style={ui.revisionButton}>
                Revizyon İste
              </UiNode>
            </UiNode>
          </UiNode>)}

      <SectionTitle title="Tasarım sürümleri" description="Gönderilen her klinik inceleme sürümü ayrı kaydedilir."/>

      {reviews.length ? (<UiNode as="div" style={ui.list}>
          {reviews.map((review) => (<UiNode as="article" key={review.id} style={ui.listCard}>
                <UiNode as="div">
                  <UiNode as="strong" style={ui.cardTitle}>
                    Sürüm v
                    {review.version_number}
                  </UiNode>

                  <UiNode as="span" style={ui.cardSub}>
                    {reviewStatusLabel(review.status)}
                    {" · "}
                    {formatDateTime(review.submitted_at, intlLocale())}
                  </UiNode>

                  {review.revision_note && (<UiNode as="p" style={ui.cardText}>
                      {review.revision_note}
                    </UiNode>)}
                </UiNode>
              </UiNode>))}
        </UiNode>) : (<Empty title="Tasarım sürümü yok" text="Laboratuvar CAD'den kliniğe tasarım gönderdiğinde burada görünür."/>)}

      {designFiles.length > 0 && (<>
          <SectionTitle title="Vaka dosyaları" description="STL ve tasarım dosyalarını güvenli bağlantıyla aç."/>

          <UiNode as="div" style={ui.list}>
            {designFiles.map((item) => (<UiNode as="button" key={item.id} type="button" className="case-file" onClick={() => onOpenAttachment(item)} style={ui.fileButton}>
                  <UiNode data-dy-copy-stack as="div">
                    <UiNode as="strong">
                      {item.file_name}
                    </UiNode>

                    <UiNode as="span" style={ui.cardSub}>
                      {fileCategoryLabel(item.category)}
                      {" · "}
                      {formatDateTime(item.created_at, intlLocale())}
                    </UiNode>
                  </UiNode>

                  <UiNode as="span" style={ui.openLabel}>
                    Aç ↗
                  </UiNode>
                </UiNode>))}
          </UiNode>
        </>)}
    </UiNode>);
}
function FinanceTab({ isClinic, labQuote, clinicFinance, }: {
    isClinic: boolean;
    labQuote: LabQuote | null;
    clinicFinance: ClinicFinance | null;
}) {
    const { intlLocale } = useTranslation();
    const patientNet = clinicFinance
        ? clinicFinance.patient_price -
            clinicFinance.discount_amount
        : null;
    return (<UiNode as="div" style={ui.tabStack}>
      <UiNode as="div" style={ui.sectionHead}>
        <SectionTitle title={isClinic
            ? "Klinik fiyatı & lab maliyeti"
            : "Laboratuvar fiyatı"} description={isClinic
            ? "Hastaya verilen fiyat ve laboratuvar maliyeti ayrı tutulur."
            : "Bu ekranda yalnızca laboratuvarın kliniğe verdiği fiyat gösterilir."}/>

        <Link href="/finance" style={ui.primaryLink}>
          Fiyatlandırmayı Aç
        </Link>
      </UiNode>

      {isClinic ? (<UiNode as="div" className="case-two" style={ui.two}>
          <FinanceCard label="Lab maliyeti" value={labQuote
                ? money(labQuote.amount, intlLocale())
                : "—"} detail={labQuote
                ? quoteStatusLabel(labQuote.status)
                : "Laboratuvar fiyatı bekleniyor"}/>

          <FinanceCard label="Hastaya net fiyat" value={patientNet !==
                null
                ? money(patientNet, intlLocale())
                : "—"} detail={clinicFinance
                ? `Tahsil edilen ${money(clinicFinance.paid_amount, intlLocale())}`
                : "Klinik fiyatı girilmedi"}/>
        </UiNode>) : (<FinanceCard label="Kliniğe verilen fiyat" value={labQuote
                ? money(labQuote.amount, intlLocale())
                : "—"} detail={labQuote
                ? quoteStatusLabel(labQuote.status)
                : "Teklif oluşturulmadı"}/>)}

      <UiNode data-dy-copy-stack as="div" style={ui.infoBox}>
        <UiNode as="strong">
          Fiyat görünürlüğü
        </UiNode>

        <UiNode as="span">
          {isClinic
            ? "Klinik kendi hasta fiyatını ve lab maliyetini birlikte görebilir."
            : "Laboratuvar hastaya verilen klinik fiyatını göremez."}
        </UiNode>
      </UiNode>
    </UiNode>);
}
function DeliveryTab({ caseRow, clinicName, labName, shipments, courierOrganizations, selectedCourierOrganizationId, setSelectedCourierOrganizationId, busy, onCreateShipment, onAssignCourier, }: {
    caseRow: CaseRow;
    clinicName: string;
    labName: string;
    shipments: ShipmentRow[];
    courierOrganizations: CourierOrganization[];
    selectedCourierOrganizationId: string;
    setSelectedCourierOrganizationId: (value: string) => void;
    busy: boolean;
    onCreateShipment: () => void;
    onAssignCourier: (shipmentId: string) => void;
}) {
    const { intlLocale } = useTranslation();
    const hasActiveShipment = shipments.some((item) => [
        "created",
        "pickup_requested",
        "picked_up",
        "in_transit",
    ].includes(item.status));
    const unassignedShipment = shipments.find((item) => item.status === "created" &&
        !item.courier_org_id);
    return (<UiNode as="div" style={ui.tabStack}>
      <UiNode as="div" style={ui.sectionHead}>
        <SectionTitle title="Kurye & teslimat" description="Fiziksel ürün hareketi vaka kaydından kopmaz."/>

        <Link href="/logistics" style={ui.primaryLink}>
          Canlı Takibi Aç
        </Link>
      </UiNode>

      {[
            "ready",
            "shipped",
        ].includes(caseRow.status) &&
            !hasActiveShipment && (<UiNode as="section" className="case-delivery-launch" style={ui.deliveryLaunch}>
            <UiNode as="div">
              <UiNode as="p" style={ui.eyebrow}>
                SONRAKİ ADIM
              </UiNode>
              <UiNode as="h3" style={ui.deliveryLaunchTitle}>
                Hazır ürünü kuryeye aktar
              </UiNode>
              <UiNode as="p" style={ui.cardText}>
                {labName} → {clinicName} rotası için tek bir gönderi kaydı oluştur. Kurye seçmezsen atama daha sonra yapılabilir.
              </UiNode>
            </UiNode>

            <UiNode as="div" style={ui.deliveryLaunchActions}>
              <UiNode as="label" style={ui.field}>
                <UiNode as="span">Kurye ağı</UiNode>
                <UiNode as="select" value={selectedCourierOrganizationId} onChange={(event) => setSelectedCourierOrganizationId(event.target.value)} disabled={busy} style={ui.select}>
                  <UiNode as="option" value="">
                    Atamayı sonra yap
                  </UiNode>
                  {courierOrganizations.map((courier) => (<UiNode as="option" key={courier.id} value={courier.id}>
                        <UserText>{courier.name}</UserText>
                      </UiNode>))}
                </UiNode>
              </UiNode>

              <UiNode as="button" type="button" onClick={onCreateShipment} disabled={busy || !caseRow.lab_org_id} style={ui.primaryButton}>
                {busy
                ? "Oluşturuluyor…"
                : "Gönderi oluştur"}
              </UiNode>
            </UiNode>
          </UiNode>)}

      {unassignedShipment && (<UiNode as="section" style={ui.deliveryLaunch}>
          <UiNode as="div">
            <UiNode as="p" style={ui.eyebrow}>
              KURYE ATAMASI
            </UiNode>
            <UiNode as="h3" style={ui.deliveryLaunchTitle}>
              Gönderiye kurye ağı ata
            </UiNode>
            <UiNode as="p" style={ui.cardText}>
              Gönderi veritabanında oluşturuldu. Alım başlamadan önce bir kurye ağı seçerek görevi aktif hale getir.
            </UiNode>
          </UiNode>

          <UiNode as="div" style={ui.deliveryLaunchActions}>
            <UiNode as="label" style={ui.field}>
              <UiNode as="span">Kurye ağı</UiNode>
              <UiNode as="select" value={selectedCourierOrganizationId} onChange={(event) => setSelectedCourierOrganizationId(event.target.value)} disabled={busy} style={ui.select}>
                <UiNode as="option" value="">
                  Kurye seç
                </UiNode>
                {courierOrganizations.map((courier) => (<UiNode as="option" key={courier.id} value={courier.id}>
                      <UserText>{courier.name}</UserText>
                    </UiNode>))}
              </UiNode>
            </UiNode>

            <UiNode as="button" type="button" onClick={() => onAssignCourier(unassignedShipment.id)} disabled={busy ||
                !selectedCourierOrganizationId} style={ui.primaryButton}>
              {busy
                ? "Atanıyor…"
                : "Kurye ata ve alımı başlat"}
            </UiNode>
          </UiNode>
        </UiNode>)}

      {shipments.length ? (<UiNode as="div" style={ui.list}>
          {shipments.map((item) => (<UiNode as="article" key={item.id} style={ui.listCard}>
                <UiNode as="div">
                  <UiNode as="div" style={ui.metaRow}>
                    <UiNode as="span" style={statusPill(item.status)}>
                      {shipmentStatusLabel(item.status)}
                    </UiNode>
                  </UiNode>

                  <UiNode as="strong" style={ui.cardTitle}>
                    {item.tracking_code ??
                    "Takip kodu bekleniyor"}
                  </UiNode>

                  <UiNode as="span" style={ui.cardSub}>
                    {item.pickup_label ??
                    "Alım noktası"}
                    {" → "}
                    {item.dropoff_label ??
                    "Teslim noktası"}
                  </UiNode>
                </UiNode>

                <UiNode as="div" style={ui.cardRight}>
                  <UiNode as="strong">
                    {item.courier_name ??
                    "Kurye atanmadı"}
                  </UiNode>

                  <UiNode as="span" style={ui.cardSub}>
                    {formatDateTime(item.updated_at, intlLocale())}
                  </UiNode>
                </UiNode>
              </UiNode>))}
        </UiNode>) : (<Empty title="Henüz kurye kaydı yok" text="Ürün teslimata hazır olduğunda vaka için kurye süreci açılabilir."/>)}
    </UiNode>);
}
function HistoryTab({ events, }: {
    events: EventRow[];
}) {
    const { t: uiText, intlLocale } = useTranslation();
    return (<UiNode as="div" style={ui.tabStack}>
      <SectionTitle title="Vaka geçmişi" description="Durum değişiklikleri ve önemli olaylar kronolojik kayıt olarak tutulur."/>

      {events.length ? (<UiNode as="div" style={ui.timeline}>
          {events.map((item) => (<UiNode as="article" key={item.id} style={ui.timelineItem}>
                <UiNode as="span" style={ui.timelineDot}/>

                <UiNode as="div">
                  <UiNode as="strong">
                    {item.to_status ? <UiMessage source="Durum: {0}" values={[caseStatusLabel(item.to_status)]}/> : eventTitle(item)}
                  </UiNode>

                  <UiNode as="p" style={ui.cardText}>
                    <UserText>{caseEventMessage(item,uiText)}</UserText>
                  </UiNode>

                  <UiNode as="span" style={ui.cardSub}>
                    <UserText>{item.actor_label ?? "DentAYA"}</UserText>
                    {" · "}
                    {formatDateTime(item.created_at, intlLocale())}
                  </UiNode>
                </UiNode>
              </UiNode>))}
        </UiNode>) : (<Empty title="Geçmiş kaydı yok" text="Vaka durumları değiştikçe işlem geçmişi burada oluşur."/>)}
    </UiNode>);
}
function SummaryCard({ label, value, detail, onClick, }: {
    label: string;
    value: string;
    detail: string;
    onClick: () => void;
}) {
    return (<UiNode as="button" type="button" onClick={onClick} style={ui.summaryCard}>
      <UiNode as="span">
        {label}
      </UiNode>

      <UiNode as="strong">
        {value}
      </UiNode>

      <UiNode as="small">
        {detail}
      </UiNode>
    </UiNode>);
}
function ActionCard({ title, detail, action, onClick, }: {
    title: string;
    detail: string;
    action: string;
    onClick: () => void;
}) {
    return (<UiNode as="button" type="button" onClick={onClick} style={ui.actionCard}>
      <UiNode data-dy-copy-stack as="div">
        <UiNode as="strong">
          {title}
        </UiNode>

        <UiNode as="span">
          {detail}
        </UiNode>
      </UiNode>

      <UiNode as="b">
        {action} →
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
function InfoRow({ label, value, }: {
    label: string;
    value: string;
}) {
    return (<UiNode as="div" style={ui.infoRow}>
      <UiNode as="span">
        {label}
      </UiNode>

      <UiNode as="strong">
        {value}
      </UiNode>
    </UiNode>);
}
function InfoCard({ title, text, }: {
    title: string;
    text: string;
}) {
    return (<UiNode as="article" style={ui.infoCard}>
      <UiNode as="strong">
        {title}
      </UiNode>

      <UiNode as="p">
        {text}
      </UiNode>
    </UiNode>);
}
function FinanceCard({ label, value, detail, }: {
    label: string;
    value: string;
    detail: string;
}) {
    return (<UiNode as="article" style={ui.financeCard}>
      <UiNode as="span">
        {label}
      </UiNode>

      <UiNode as="strong">
        {value}
      </UiNode>

      <UiNode as="small">
        {detail}
      </UiNode>
    </UiNode>);
}
function Empty({ title, text, }: {
    title: string;
    text: string;
}) {
    return (<UiNode data-dy-copy-stack as="div" style={ui.empty}>
      <UiNode as="strong">
        {title}
      </UiNode>

      <UiNode as="span">
        {text}
      </UiNode>
    </UiNode>);
}
function caseStatusLabel(value: string) {
    return ({
        new: "Yeni",
        accepted: "Kabul Edildi",
        design: "Tasarım",
        approval: "Klinik Onayı",
        production: "Üretim",
        qc: "Kalite Kontrol",
        ready: "Teslimata Hazır",
        shipped: "Yolda",
        delivered: "Teslim Edildi",
        cancelled: "İptal",
    } as Record<string, string>)[value] ?? value;
}
function priorityLabel(value: string) {
    return ({
        low: "Düşük Öncelik",
        normal: "Normal",
        high: "Yüksek Öncelik",
        urgent: "Acil",
    } as Record<string, string>)[value] ?? value;
}
function caseTypeLabel(value: string) {
    return ({
        Crown: "Kron",
        Bridge: "Köprü",
        Veneer: "Lamine / Veneer",
        "Inlay / Onlay": "Inlay / Onlay",
        "Implant Crown": "İmplant Üstü Kron",
        Denture: "Protez",
        "Night Guard": "Gece Plağı",
        Other: "Diğer",
    } as Record<string, string>)[value] ?? value;
}
function scanPurposeLabel(value: string) {
    return ({
        clinical: "Klinik",
        intraoral: "Ağız İçi",
        preop: "Tedavi Öncesi",
        working_model: "Çalışma Modeli",
        master_model: "Ana Model",
        antagonist: "Karşıt Çene",
        bite: "Kapanış",
        die: "Preparasyon",
        waxup: "Mum Model",
        verification: "Doğrulama",
        design_reference: "Tasarım Referansı",
        other: "Diğer",
    } as Record<string, string>)[value] ??
        value.replaceAll("_", " ");
}
function archLabel(value: string) {
    return ({
        upper: "Üst Ark",
        lower: "Alt Ark",
        bite: "Kapanış",
        full: "Tam Ark",
        tooth: "Tek Diş",
        other: "Diğer",
    } as Record<string, string>)[value] ?? value;
}
function reviewStatusLabel(value: string) {
    return ({
        pending: "Klinik Kararı Bekliyor",
        approved: "Onaylandı",
        revision_requested: "Revizyon İstendi",
        superseded: "Eski Sürüm",
    } as Record<string, string>)[value] ?? value;
}
function designStatusLabel(value: string) {
    return ({
        draft: "Taslak",
        working: "Çalışılıyor",
        ready_for_review: "İncelemeye Hazır",
        revision: "Revizyon",
        approved: "Onaylandı",
        archived: "Arşiv",
    } as Record<string, string>)[value] ?? value;
}
function workflowStageLabel(value: string) {
    return ({
        scan: "Tarama",
        margin: "Marjin",
        design: "Anatomi",
        contacts: "Temas",
        thickness: "Kalınlık",
        review: "İnceleme",
        approved: "Onay",
    } as Record<string, string>)[value] ?? value;
}
function quoteStatusLabel(value: string) {
    return ({
        draft: "Taslak",
        sent: "Kliniğe Gönderildi",
        accepted: "Kabul Edildi",
        rejected: "Reddedildi",
    } as Record<string, string>)[value] ?? value;
}
function shipmentStatusLabel(value: string) {
    return ({
        created: "Oluşturuldu",
        pickup_requested: "Alım Bekliyor",
        picked_up: "Teslim Alındı",
        in_transit: "Yolda",
        delivered: "Teslim Edildi",
        cancelled: "İptal",
    } as Record<string, string>)[value] ?? value;
}
function fileCategoryLabel(value: string) {
    return ({
        scan: "Tarama",
        model: "Model",
        design: "Tasarım",
        image: "Görsel",
        report: "Rapor",
        other: "Dosya",
    } as Record<string, string>)[value] ?? value;
}
function roleLabel(value: string | null | undefined) {
    return ({
        dentist: "Diş Hekimi",
        doctor: "Diş Hekimi",
        assistant: "Klinik Asistanı",
        technician: "Diş Teknisyeni",
        owner: "Yönetici",
        admin: "Yönetici",
    } as Record<string, string>)[value ?? ""] ??
        "Ekip Üyesi";
}
function workflowStatusIndex(value: CaseStatus) {
    const index = {
        new: 0,
        accepted: 1,
        design: 2,
        approval: 3,
        production: 4,
        qc: 5,
        ready: 6,
        shipped: 6,
        delivered: 7,
        cancelled: -1,
    }[value];
    return index;
}
function eventTitle(item: EventRow) {
    if (item.to_status) {
        return `Durum: ${caseStatusLabel(item.to_status)}`;
    }
    return ({
        created: "Vaka Oluşturuldu",
        status: "Durum Güncellendi",
        design_approved: "Tasarım Onaylandı",
        revision_requested: "Revizyon İstendi",
        message: "Mesaj",
    } as Record<string, string>)[item.event_type] ??
        "Vaka Güncellendi";
}
function money(value: number, localeTag: string = "tr-TR") {
    return new Intl.NumberFormat(localeTag, {
        style: "currency",
        currency: "TRY",
        maximumFractionDigits: 0,
    }).format(value);
}
function formatDateTime(value: string, localeTag: string = "tr-TR") {
    return new Intl.DateTimeFormat(localeTag, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}
function formatDateOnly(value: string, localeTag: string = "tr-TR") {
    return new Intl.DateTimeFormat(localeTag, {
        day: "2-digit",
        month: "long",
        year: "numeric",
    }).format(new Date(`${value}T12:00:00`));
}
function statusPill(value: string): CSSProperties {
    const isSuccess = [
        "approved",
        "ready",
        "delivered",
    ].includes(value);
    const isWarning = [
        "approval",
        "pickup_requested",
        "revision_requested",
        "urgent",
    ].includes(value);
    return {
        display: "inline-flex",
        alignItems: "center",
        minHeight: 28,
        padding: "4px 9px",
        borderRadius: 999,
        border: `1px solid ${isSuccess
            ? "rgba(74,190,133,.42)"
            : isWarning
                ? "rgba(227,170,79,.42)"
                : dy.border}`,
        background: isSuccess
            ? "rgba(74,190,133,.12)"
            : isWarning
                ? "rgba(227,170,79,.12)"
                : dy.surface2,
        color: isSuccess
            ? "#6fd5a0"
            : isWarning
                ? "#e8bd73"
                : dy.text,
        fontSize: 13,
        fontWeight: 850,
        whiteSpace: "nowrap",
    };
}
function priorityPill(value: string): CSSProperties {
    return {
        ...statusPill(value ===
            "urgent"
            ? "urgent"
            : "normal"),
        color: value === "urgent"
            ? "#e8bd73"
            : dy.muted,
    };
}
const ui: Record<string, CSSProperties> = {
    page: {
        minHeight: "100vh",
        padding: "24px clamp(18px,3.5vw,50px) 60px",
        background: dy.bg,
        color: dy.text,
        fontFamily: "Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        fontSize: 15,
    },
    center: {
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: dy.bg,
        color: dy.muted,
    },
    errorCard: {
        width: "min(560px,100%)",
        display: "grid",
        gap: 10,
        padding: 22,
        border: `1px solid ${dy.border}`,
        borderRadius: 16,
        background: dy.surface,
    },
    topbar: {
        maxWidth: 1480,
        margin: "0 auto 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: 22,
    },
    headerActions: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 8,
        flexWrap: "wrap",
    },
    back: {
        color: dy.muted,
        textDecoration: "none",
        fontSize: 13,
    },
    caseRefRow: {
        display: "flex",
        alignItems: "center",
        gap: 7,
        flexWrap: "wrap",
        margin: "13px 0 7px",
    },
    caseRef: {
        color: dy.accent,
        fontSize: 13,
        fontWeight: 900,
        letterSpacing: ".05em",
    },
    title: {
        margin: "0 0 7px",
        fontSize: "clamp(32px,4vw,50px)",
        lineHeight: 1.04,
        letterSpacing: "-.04em",
    },
    subtitle: {
        margin: 0,
        color: dy.muted,
        fontSize: 15,
        lineHeight: 1.55,
    },
    primaryButton: {
        minHeight: 44,
        padding: "0 15px",
        border: 0,
        borderRadius: 11,
        background: dy.accent,
        color: dy.accentContrast,
        fontWeight: 900,
        fontSize: 14,
        cursor: "pointer",
    },
    primaryLink: {
        minHeight: 44,
        display: "inline-grid",
        placeItems: "center",
        padding: "0 15px",
        borderRadius: 11,
        background: dy.accent,
        color: dy.accentContrast,
        textDecoration: "none",
        fontWeight: 900,
        fontSize: 14,
    },
    secondaryLink: {
        minHeight: 42,
        display: "inline-grid",
        placeItems: "center",
        padding: "0 13px",
        borderRadius: 10,
        border: `1px solid ${dy.border}`,
        background: dy.surface2,
        color: dy.text,
        textDecoration: "none",
        fontWeight: 800,
        fontSize: 14,
    },
    cancelled: {
        color: "#de7c7c",
        fontWeight: 850,
    },
    done: {
        color: "#6fd5a0",
        fontWeight: 850,
    },
    waiting: {
        color: dy.muted,
        fontWeight: 850,
        padding: "10px 0",
    },
    notice: {
        maxWidth: 1480,
        margin: "0 auto 12px",
        padding: "12px 14px",
        border: `1px solid ${dy.border}`,
        borderRadius: 11,
        background: dy.surface2,
        color: dy.muted,
        fontSize: 14,
    },
    headerGrid: {
        maxWidth: 1480,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) 320px",
        gap: 12,
    },
    heroCard: {
        minHeight: 224,
        padding: 18,
        display: "grid",
        gap: 16,
        border: `1px solid ${dy.border}`,
        borderRadius: 17,
        background: dy.surface,
        boxShadow: `0 18px 52px ${dy.shadow}`,
    },
    sideCard: {
        padding: 16,
        display: "grid",
        alignContent: "start",
        gap: 8,
        border: `1px solid ${dy.border}`,
        borderRadius: 17,
        background: dy.surface,
    },
    eyebrow: {
        margin: "0 0 6px",
        color: dy.accent,
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: ".14em",
    },
    heroTitle: {
        margin: "0 0 7px",
        fontSize: 25,
        letterSpacing: "-.03em",
    },
    heroText: {
        maxWidth: 780,
        margin: 0,
        color: dy.muted,
        lineHeight: 1.6,
    },
    workflow: {
        display: "grid",
        gridTemplateColumns: "repeat(8,minmax(70px,1fr))",
        gap: 6,
        overflowX: "auto",
    },
    workflowStep: {
        minHeight: 70,
        padding: 9,
        display: "grid",
        alignContent: "space-between",
        gap: 8,
        border: "1px solid",
        borderRadius: 11,
    },
    infoRow: {
        minHeight: 54,
        padding: "8px 0",
        display: "grid",
        gap: 4,
        borderBottom: `1px solid ${dy.border}`,
        color: dy.muted,
        fontSize: 13,
    },
    summaryGrid: {
        maxWidth: 1480,
        margin: "10px auto 0",
        display: "grid",
        gridTemplateColumns: "repeat(4,minmax(0,1fr))",
        gap: 8,
    },
    summaryCard: {
        minHeight: 108,
        padding: 13,
        display: "grid",
        alignContent: "space-between",
        gap: 5,
        textAlign: "left",
        border: `1px solid ${dy.border}`,
        borderRadius: 13,
        background: dy.surface,
        color: dy.text,
        cursor: "pointer",
    },
    tabs: {
        maxWidth: 1480,
        margin: "12px auto 0",
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        padding: 6,
        border: `1px solid ${dy.border}`,
        borderRadius: 13,
        background: dy.surface,
    },
    tab: {
        minHeight: 40,
        padding: "0 12px",
        border: "1px solid transparent",
        borderRadius: 9,
        background: "transparent",
        color: dy.muted,
        cursor: "pointer",
        fontWeight: 800,
        fontSize: 14,
    },
    tabActive: {
        borderColor: dy.border,
        background: dy.accentSoft,
        color: dy.text,
    },
    panel: {
        maxWidth: 1480,
        margin: "8px auto 0",
        minHeight: 480,
        padding: 18,
        border: `1px solid ${dy.border}`,
        borderRadius: 16,
        background: dy.surface,
    },
    tabStack: {
        display: "grid",
        gap: 14,
    },
    sectionTitle: {
        display: "grid",
        gap: 4,
        color: dy.text,
    },
    sectionHead: {
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 14,
        flexWrap: "wrap",
    },
    deliveryLaunch: {
        padding: 15,
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) minmax(230px,320px)",
        alignItems: "end",
        gap: 18,
        border: `1px solid ${dy.accent}`,
        borderRadius: 14,
        background: dy.accentSoft,
    },
    deliveryLaunchTitle: {
        margin: 0,
        fontSize: 20,
        letterSpacing: "-.02em",
    },
    deliveryLaunchActions: {
        display: "grid",
        gap: 8,
    },
    field: {
        display: "grid",
        gap: 5,
        color: dy.muted,
        fontSize: 13,
        fontWeight: 800,
    },
    select: {
        minHeight: 42,
        padding: "0 10px",
        border: `1px solid ${dy.border}`,
        borderRadius: 10,
        background: dy.input,
        color: dy.text,
        fontSize: 13,
    },
    inlineActions: {
        display: "flex",
        gap: 7,
        flexWrap: "wrap",
    },
    two: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 9,
    },
    infoCard: {
        minHeight: 112,
        padding: 13,
        border: `1px solid ${dy.border}`,
        borderRadius: 12,
        background: dy.surface2,
    },
    actionCards: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))",
        gap: 8,
    },
    actionCard: {
        minHeight: 126,
        padding: 13,
        display: "grid",
        alignContent: "space-between",
        gap: 10,
        textAlign: "left",
        border: `1px solid ${dy.border}`,
        borderRadius: 12,
        background: dy.surface2,
        color: dy.text,
        cursor: "pointer",
    },
    list: {
        display: "grid",
        gap: 7,
    },
    listCard: {
        minHeight: 92,
        padding: 13,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 14,
        border: `1px solid ${dy.border}`,
        borderRadius: 12,
        background: dy.surface2,
    },
    metaRow: {
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        marginBottom: 7,
    },
    sourceTag: {
        padding: "4px 7px",
        borderRadius: 999,
        background: dy.accentSoft,
        color: dy.accent,
        fontSize: 12,
        fontWeight: 900,
    },
    lightTag: {
        padding: "4px 7px",
        borderRadius: 999,
        border: `1px solid ${dy.border}`,
        color: dy.muted,
        fontSize: 12,
        fontWeight: 800,
    },
    cardTitle: {
        display: "block",
        fontSize: 15,
    },
    cardSub: {
        display: "block",
        marginTop: 4,
        color: dy.muted,
        fontSize: 13,
        lineHeight: 1.45,
    },
    cardRight: {
        display: "grid",
        justifyItems: "end",
        gap: 4,
        textAlign: "right",
    },
    cardText: {
        margin: "7px 0 0",
        color: dy.muted,
        lineHeight: 1.55,
    },
    chat: {
        minHeight: 250,
        maxHeight: 520,
        overflowY: "auto",
        display: "grid",
        alignContent: "start",
        gap: 8,
        padding: 8,
        border: `1px solid ${dy.border}`,
        borderRadius: 12,
        background: dy.input,
    },
    messageRow: {
        display: "grid",
        gap: 8,
    },
    messageBubble: {
        padding: 12,
        border: "1px solid",
        borderRadius: 13,
    },
    messageMeta: {
        display: "flex",
        gap: 7,
        flexWrap: "wrap",
        alignItems: "center",
        color: dy.muted,
        fontSize: 13,
    },
    messageBody: {
        margin: "7px 0 0",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        lineHeight: 1.58,
    },
    composer: {
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) auto",
        gap: 8,
        alignItems: "end",
    },
    textarea: {
        width: "100%",
        minHeight: 92,
        padding: 11,
        resize: "vertical",
        border: `1px solid ${dy.border}`,
        borderRadius: 11,
        background: dy.input,
        color: dy.text,
        outline: "none",
        fontSize: 14,
    },
    reviewBox: {
        padding: 14,
        display: "grid",
        gap: 11,
        border: `1px solid ${dy.accent}`,
        borderRadius: 13,
        background: dy.accentSoft,
    },
    approveButton: {
        minHeight: 43,
        padding: "0 14px",
        border: 0,
        borderRadius: 10,
        background: "#63cc98",
        color: "#062015",
        fontWeight: 900,
        cursor: "pointer",
    },
    revisionButton: {
        minHeight: 43,
        padding: "0 14px",
        border: "1px solid rgba(228,167,88,.55)",
        borderRadius: 10,
        background: "rgba(228,167,88,.12)",
        color: "#e8bd73",
        fontWeight: 900,
        cursor: "pointer",
    },
    fileButton: {
        minHeight: 72,
        width: "100%",
        padding: 12,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        textAlign: "left",
        border: `1px solid ${dy.border}`,
        borderRadius: 11,
        background: dy.surface2,
        color: dy.text,
        cursor: "pointer",
    },
    openLabel: {
        color: dy.accent,
        fontWeight: 900,
    },
    financeCard: {
        minHeight: 112,
        padding: 14,
        display: "grid",
        alignContent: "space-between",
        gap: 5,
        border: `1px solid ${dy.border}`,
        borderRadius: 12,
        background: dy.surface2,
    },
    infoBox: {
        padding: 13,
        display: "grid",
        gap: 5,
        border: `1px solid ${dy.border}`,
        borderRadius: 12,
        background: dy.accentSoft,
        color: dy.muted,
    },
    timeline: {
        display: "grid",
        gap: 0,
    },
    timelineItem: {
        position: "relative",
        minHeight: 92,
        display: "grid",
        gridTemplateColumns: "28px minmax(0,1fr)",
        gap: 11,
        padding: "8px 0 16px",
        borderBottom: `1px solid ${dy.border}`,
    },
    timelineDot: {
        width: 12,
        height: 12,
        marginTop: 4,
        borderRadius: 999,
        background: dy.accent,
        boxShadow: `0 0 0 5px ${dy.accentSoft}`,
    },
    empty: {
        minHeight: 180,
        display: "grid",
        placeItems: "center",
        alignContent: "center",
        gap: 6,
        padding: 20,
        textAlign: "center",
        color: dy.muted,
        border: `1px dashed ${dy.border}`,
        borderRadius: 12,
    },
};
