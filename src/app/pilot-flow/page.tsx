"use client";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useMemo, useState, type CSSProperties, } from "react";
import Link from "@/lib/i18n/UiLink";
import { useRouter } from "next/navigation";
import ConnectionStatus from "@/app/ConnectionStatus";
import { dy, useDentayaThemeRuntime } from "@/app/dentaya-theme";
import { dentayaError } from "@/lib/dentaya-errors";
import { supabase } from "@/lib/supabase";
import ValidationCenter from "./ValidationCenter";
import "./validation-center.css";
type OrgType = "clinic" | "laboratory" | "courier";
type Organization = {
    id: string;
    name: string;
    org_type: OrgType;
};
type Membership = {
    organization_id: string;
    role: string;
};
type CaseRow = {
    id: string;
    case_number: string;
    title: string;
    status: string;
    priority: string;
    due_date: string | null;
    clinic_org_id: string;
    lab_org_id: string | null;
    updated_at: string;
};
type ScanRow = {
    id: string;
    scan_origin: "clinic" | "laboratory";
    scan_purpose: string;
};
type ReviewRow = {
    id: string;
    version_number: number;
    status: "pending" | "approved" | "revision_requested" | "superseded";
};
type DesignProject = {
    id: string;
    status: string;
    workflow_stage: string;
};
type QuoteRow = {
    amount: number;
    currency: string;
    status: string;
};
type FinanceRow = {
    patient_price: number;
    discount_amount: number;
    paid_amount: number;
    payment_status: string;
};
type ShipmentRow = {
    id: string;
    status: string;
    tracking_code: string | null;
};
type Stage = {
    id: string;
    title: string;
    description: string;
    complete: boolean;
    optional?: boolean;
    href: string;
};
type CaseSnapshot = {
    scans: ScanRow[];
    messageCount: number;
    design: DesignProject | null;
    reviews: ReviewRow[];
    quote: QuoteRow | null;
    finance: FinanceRow | null;
    shipments: ShipmentRow[];
    eventCount: number;
};
export default function PilotFlowPage() {
    const { t: uiText, intlLocale } = useTranslation();
    useDentayaThemeRuntime();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [loadingCase, setLoadingCase] = useState(false);
    const [message, setMessage] = useState("");
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [membership, setMembership] = useState<Membership | null>(null);
    const [cases, setCases] = useState<CaseRow[]>([]);
    const [caseId, setCaseId] = useState("");
    const [snapshot, setSnapshot] = useState<CaseSnapshot | null>(null);
    const [copied, setCopied] = useState(false);
    const selectedCase = useMemo(() => cases.find((item) => item.id === caseId) ?? null, [cases, caseId]);
    useEffect(() => {
        let active = true;
        async function boot() {
            const { data: auth } = await supabase.auth.getSession();
            const user = auth.session?.user;
            if (!user) {
                router.replace("/workspace");
                return;
            }
            const { data: membershipData, error: membershipError, } = await supabase
                .from("memberships")
                .select("organization_id,role")
                .eq("user_id", user.id)
                .eq("status", "active")
                .limit(1)
                .maybeSingle();
            if (membershipError ||
                !membershipData) {
                setMessage(dentayaError(membershipError, "Aktif kurum üyeliği bulunamadı."));
                setLoading(false);
                return;
            }
            const currentMembership = membershipData as Membership;
            const { data: orgData, error: orgError, } = await supabase
                .from("organizations")
                .select("id,name,org_type")
                .eq("id", currentMembership.organization_id)
                .maybeSingle();
            if (orgError ||
                !orgData) {
                setMessage(dentayaError(orgError, "Kurum bilgisi alınamadı."));
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
            await loadCases(currentOrg);
            if (active) {
                setLoading(false);
            }
        }
        void boot();
        return () => {
            active = false;
        };
        // Initial boot is tied to routing; loaders are local async commands, not reactive inputs.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);
    useEffect(() => {
        function recover() {
            if (organization) {
                void loadCases(organization);
                if (caseId) {
                    void loadSnapshot(caseId, organization);
                }
            }
        }
        window.addEventListener("dentaya-network-restored", recover);
        return () => window.removeEventListener("dentaya-network-restored", recover);
        // Reconnect should not refire because local loader function identities changed.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        organization,
        caseId,
    ]);
    async function loadCases(org: Organization) {
        setMessage("");
        let query = supabase
            .from("cases")
            .select("id,case_number,title,status,priority,due_date,clinic_org_id,lab_org_id,updated_at")
            .order("updated_at", {
            ascending: false,
        })
            .limit(60);
        query =
            org.org_type ===
                "clinic"
                ? query.eq("clinic_org_id", org.id)
                : query.eq("lab_org_id", org.id);
        const { data, error, } = await query;
        if (error) {
            setMessage(dentayaError(error, "Pilot vakaları yüklenemedi."));
            return;
        }
        const rows = (data ??
            []) as CaseRow[];
        setCases(rows);
        if (rows.length > 0 &&
            !rows.some((item) => item.id === caseId)) {
            setCaseId(rows[0].id);
            await loadSnapshot(rows[0].id, org);
        }
    }
    async function loadSnapshot(selectedId: string, orgOverride?: Organization) {
        const org = orgOverride ??
            organization;
        if (!org)
            return;
        setLoadingCase(true);
        setMessage("");
        const [scansResult, messagesResult, designResult, reviewsResult, quoteResult, shipmentResult, eventResult,] = await Promise.all([
            supabase
                .from("scan_sessions")
                .select("id,scan_origin,scan_purpose")
                .eq("case_id", selectedId),
            supabase
                .from("case_messages")
                .select("id", {
                count: "exact",
                head: true,
            })
                .eq("case_id", selectedId),
            supabase
                .from("design_projects")
                .select("id,status,workflow_stage")
                .eq("case_id", selectedId)
                .maybeSingle(),
            supabase
                .from("case_design_reviews")
                .select("id,version_number,status")
                .eq("case_id", selectedId)
                .order("version_number", {
                ascending: false,
            }),
            supabase
                .from("lab_case_quotes")
                .select("amount,currency,status")
                .eq("case_id", selectedId)
                .maybeSingle(),
            supabase
                .from("shipments")
                .select("id,status,tracking_code")
                .eq("case_id", selectedId)
                .order("updated_at", {
                ascending: false,
            }),
            supabase
                .from("case_events")
                .select("id", {
                count: "exact",
                head: true,
            })
                .eq("case_id", selectedId),
        ]);
        const errors = [
            scansResult.error,
            messagesResult.error,
            designResult.error,
            reviewsResult.error,
            quoteResult.error,
            shipmentResult.error,
            eventResult.error,
        ].filter(Boolean);
        if (errors.length) {
            setMessage(dentayaError(errors[0], "Vaka pilot verileri tam olarak yüklenemedi."));
        }
        let finance: FinanceRow | null = null;
        if (org.org_type ===
            "clinic") {
            const { data, error, } = await supabase
                .from("clinic_case_finance")
                .select("patient_price,discount_amount,paid_amount,payment_status")
                .eq("case_id", selectedId)
                .maybeSingle();
            if (error) {
                setMessage(dentayaError(error, "Klinik fiyat kaydı okunamadı."));
            }
            finance =
                (data ??
                    null) as FinanceRow | null;
        }
        setSnapshot({
            scans: (scansResult.data ??
                []) as ScanRow[],
            messageCount: messagesResult.count ??
                0,
            design: (designResult.data ??
                null) as DesignProject | null,
            reviews: (reviewsResult.data ??
                []) as ReviewRow[],
            quote: (quoteResult.data ??
                null) as QuoteRow | null,
            finance,
            shipments: (shipmentResult.data ??
                []) as ShipmentRow[],
            eventCount: eventResult.count ??
                0,
        });
        setLoadingCase(false);
    }
    function selectCase(nextId: string) {
        setCaseId(nextId);
        if (organization) {
            void loadSnapshot(nextId, organization);
        }
    }
    const latestReview = snapshot?.reviews[0] ??
        null;
    const latestShipment = snapshot?.shipments[0] ??
        null;
    const stages = useMemo<Stage[]>(() => {
        if (!selectedCase ||
            !snapshot ||
            !organization) {
            return [];
        }
        const clinicalScan = snapshot.scans.some((scan) => scan.scan_origin ===
            "clinic");
        const labScan = snapshot.scans.some((scan) => scan.scan_origin ===
            "laboratory");
        const hasReview = snapshot.reviews.length >
            0;
        const approved = snapshot.reviews.some((review) => review.status ===
            "approved");
        const hasShipment = snapshot.shipments.length >
            0;
        const delivered = snapshot.shipments.some((shipment) => shipment.status ===
            "delivered") ||
            selectedCase.status ===
                "delivered";
        const base = [
            {
                id: "case",
                title: "Vaka oluşturuldu",
                description: "Klinik ve laboratuvar aynı vaka kaydında bağlı.",
                complete: true,
                href: `/cases/${selectedCase.id}`,
            },
            {
                id: "scan",
                title: "Dijital tarama",
                description: organization.org_type ===
                    "clinic"
                    ? clinicalScan
                        ? "Klinik kaynaklı tarama vakaya bağlı."
                        : "Klinik taraması henüz vakaya bağlanmamış."
                    : labScan
                        ? "Laboratuvar taraması vakaya bağlı."
                        : clinicalScan
                            ? "Klinik taraması mevcut; lab taraması henüz eklenmemiş."
                            : "Vakada henüz tarama kaydı yok.",
                complete: organization.org_type ===
                    "clinic"
                    ? clinicalScan
                    : labScan ||
                        clinicalScan,
                href: `/cases/${selectedCase.id}?tab=scans`,
            },
            {
                id: "message",
                title: "Hekim ↔ Teknisyen iletişimi",
                description: snapshot.messageCount >
                    0
                    ? `${snapshot.messageCount} vaka mesajı kaydedildi.`
                    : "Pilot senaryoda en az bir teknik mesaj gönder.",
                complete: snapshot.messageCount >
                    0,
                href: `/cases/${selectedCase.id}?tab=messages`,
            },
            {
                id: "cad",
                title: "CAD projesi",
                description: snapshot.design
                    ? `${designStatusLabel(snapshot.design.status)} · ${workflowLabel(snapshot.design.workflow_stage)}`
                    : "DentAYA Design projesi henüz oluşturulmamış.",
                complete: Boolean(snapshot.design),
                href: `/design?case=${selectedCase.id}`,
            },
            {
                id: "review",
                title: "Klinik tasarım kararı",
                description: latestReview
                    ? `v${latestReview.version_number} · ${reviewStatusLabel(latestReview.status)}`
                    : "Henüz kliniğe gönderilmiş CAD sürümü yok.",
                complete: hasReview &&
                    (approved ||
                        latestReview?.status ===
                            "revision_requested"),
                href: `/cases/${selectedCase.id}?tab=cad`,
            },
            {
                id: "quote",
                title: "Laboratuvar fiyatı",
                description: snapshot.quote
                    ? `${money(snapshot.quote.amount, snapshot.quote.currency, intlLocale())} · ${quoteStatusLabel(snapshot.quote.status)}`
                    : "Laboratuvar fiyatı henüz oluşturulmamış.",
                complete: Boolean(snapshot.quote),
                href: `/cases/${selectedCase.id}?tab=finance`,
            },
        ] satisfies Stage[];
        if (organization.org_type ===
            "clinic") {
            base.push({
                id: "patient-finance",
                title: "Klinik hasta fiyatı",
                description: snapshot.finance
                    ? `Net ${money(snapshot.finance.patient_price -
                        snapshot.finance.discount_amount, "TRY", intlLocale())} · ${paymentStatusLabel(snapshot.finance.payment_status)}`
                    : "Hasta fiyatı lab maliyetinden ayrı kaydedilmemiş.",
                complete: Boolean(snapshot.finance),
                href: `/cases/${selectedCase.id}?tab=finance`,
            });
        }
        base.push({
            id: "shipment",
            title: "Kurye / teslimat",
            description: latestShipment
                ? `${shipmentStatusLabel(latestShipment.status)}${latestShipment.tracking_code ? ` · ${latestShipment.tracking_code}` : ""}`
                : "Henüz vaka için gönderi oluşturulmamış.",
            complete: hasShipment,
            href: `/cases/${selectedCase.id}?tab=delivery`,
        }, {
            id: "delivered",
            title: "Uçtan uca tamamlandı",
            description: delivered
                ? "Vaka teslimat aşamasını tamamlamış."
                : "Pilot senaryoyu teslim edildi aşamasına kadar ilerlet.",
            complete: delivered,
            href: `/cases/${selectedCase.id}?tab=history`,
        });
        return base;
    }, [
        intlLocale,
        selectedCase,
        snapshot,
        organization,
        latestReview,
        latestShipment,
    ]);
    const completedCount = stages.filter((stage) => stage.complete).length;
    const score = stages.length
        ? Math.round(completedCount /
            stages.length *
            100)
        : 0;
    const issues = useMemo(() => {
        if (!selectedCase ||
            !snapshot) {
            return [];
        }
        const result: string[] = [];
        const approved = snapshot.reviews.some((review) => review.status ===
            "approved");
        if ([
            "production",
            "qc",
            "ready",
            "shipped",
            "delivered",
        ].includes(selectedCase.status) &&
            !approved) {
            result.push("Vaka üretim veya sonrası aşamada fakat onaylanmış tasarım sürümü görünmüyor.");
        }
        if (selectedCase.status ===
            "approval" &&
            !snapshot.reviews.some((review) => review.status ===
                "pending")) {
            result.push("Vaka klinik onayı aşamasında fakat bekleyen tasarım incelemesi bulunmuyor.");
        }
        if (snapshot.shipments.some((shipment) => shipment.status ===
            "delivered") &&
            selectedCase.status !==
                "delivered") {
            result.push("Kurye kaydı teslim edildi fakat vaka durumu henüz teslim edildi değil.");
        }
        if (snapshot.quote?.status ===
            "sent" &&
            snapshot.quote.amount <=
                0) {
            result.push("Gönderilmiş laboratuvar fiyatı pozitif değil.");
        }
        if (organization?.org_type ===
            "clinic" &&
            snapshot.finance) {
            const net = snapshot.finance.patient_price -
                snapshot.finance.discount_amount;
            if (snapshot.finance.paid_amount >
                net) {
                result.push("Tahsil edilen tutar net hasta fiyatını aşıyor.");
            }
        }
        return result;
    }, [
        selectedCase,
        snapshot,
        organization?.org_type,
    ]);
    const nextStage = stages.find((stage) => !stage.complete) ?? null;
    async function copyReport() {
        if (!selectedCase ||
            !organization ||
            !membership) {
            return;
        }
        const report = [
            "DentAYA Pilot Raporu",
            `Kurum: ${organization.name} (${organization.org_type})`,
            `Rol: ${membership.role}`,
            `Vaka: ${selectedCase.case_number} · ${selectedCase.title}`,
            `Durum: ${caseStatusLabel(selectedCase.status)}`,
            `Akış: ${completedCount}/${stages.length} · %${score}`,
            `Taramalar: ${snapshot?.scans.length ?? 0}`,
            `Mesajlar: ${snapshot?.messageCount ?? 0}`,
            `CAD: ${snapshot?.design ? "var" : "yok"}`,
            `Review: ${latestReview ? reviewStatusLabel(latestReview.status) : "yok"}`,
            `Lab fiyatı: ${snapshot?.quote ? quoteStatusLabel(snapshot.quote.status) : "yok"}`,
            `Gönderi: ${latestShipment ? shipmentStatusLabel(latestShipment.status) : "yok"}`,
            `Tutarlılık: ${issues.length ? issues.join(" | ") : "sorun görünmüyor"}`,
        ].join("\n");
        try {
            await navigator.clipboard.writeText(report);
            setCopied(true);
            setTimeout(() => setCopied(false), 2200);
        }
        catch {
            setMessage("Pilot raporu panoya kopyalanamadı.");
        }
    }
    if (loading) return <LoadingExperience title="Pilot akışı hazırlanıyor…"/>;
    return (<UiNode as="main" style={ui.page}>
      <ConnectionStatus />

      <style>{`
        *{box-sizing:border-box}
        @media(max-width:900px){
          .pilot-hero{grid-template-columns:1fr!important}
          .pilot-grid{grid-template-columns:1fr!important}
        }
        @media(max-width:640px){
          .pilot-header{align-items:flex-start!important}
          .pilot-actions{width:100%!important}
          .pilot-actions a,.pilot-actions button{flex:1 1 160px!important}
          .pilot-stage{grid-template-columns:34px minmax(0,1fr)!important}
          .pilot-stage-action{grid-column:2!important;justify-self:start!important}
        }
      `}</style>

      <UiNode as="header" className="pilot-header" style={ui.header}>
        <UiNode as="div">
          <Link href="/pilot-check" style={ui.back}>
            ← Sistem Kontrolü
          </Link>

          <UiNode as="p" style={ui.eyebrow}>
            UÇTAN UCA PİLOT
          </UiNode>

          <UiNode as="h1" style={ui.title}>
            Pilot Akış Merkezi
          </UiNode>

          <UiNode as="p" style={ui.subtitle}>
            Bir vakayı seç ve Klinik →
            Lab → CAD → Onay → Fiyat →
            Kurye → Teslim zincirini
            gerçek veriden kontrol et.
          </UiNode>
        </UiNode>

        <UiNode as="div" className="pilot-actions" style={ui.headerActions}>
          <UiNode as="button" type="button" disabled={!selectedCase} onClick={() => void copyReport()} style={ui.secondaryButton}>
            {copied
            ? "Rapor Kopyalandı"
            : "Pilot Raporunu Kopyala"}
          </UiNode>

          {selectedCase && (<Link href={`/cases/${selectedCase.id}`} style={ui.primaryLink}>
              Vaka Merkezini Aç
            </Link>)}
        </UiNode>
      </UiNode>

      {organization && membership && <ValidationCenter organizationId={organization.id} role={membership.role} caseId={selectedCase?.id}/>}

      {message && (<UiNode as="div" style={ui.notice}>
          {message}
        </UiNode>)}

      {!cases.length ? (<UiNode as="section" style={ui.empty}>
          <UiNode as="strong">
            Pilot için vaka yok
          </UiNode>
          <UiNode as="span">
            {organization?.org_type ===
                "clinic"
                ? "Önce bir hasta ve vaka oluştur; sonra bu ekrana dön."
                : "Klinikten laboratuvarına bir vaka gönderildiğinde burada görünecek."}
          </UiNode>

          <Link href={organization?.org_type ===
                "clinic"
                ? "/patients"
                : "/cases"} style={ui.primaryLink}>
            {organization?.org_type ===
                "clinic"
                ? "Hasta / Vaka Başlat"
                : "Vakalara Git"}
          </Link>
        </UiNode>) : (<>
          <UiNode as="section" className="pilot-hero" style={ui.hero}>
            <UiNode as="div" style={ui.selectorCard}>
              <UiNode as="span" style={ui.label}>
                PİLOT VAKASI
              </UiNode>

              <UiNode as="select" value={caseId} onChange={(event) => selectCase(event.target.value)} style={ui.select}>
                {cases.map((item) => (<UiNode as="option" key={item.id} value={item.id}>
                      {item.case_number}
                      {" · "}
                      {item.title}
                    </UiNode>))}
              </UiNode>

              {selectedCase && (<UiNode data-dy-copy-stack as="div" style={ui.caseMeta}>
                  <UiNode as="strong">
                    {caseStatusLabel(selectedCase.status)}
                  </UiNode>

                  <UiNode as="span">
                    {priorityLabel(selectedCase.priority)}
                    {" · Güncellendi "}
                    {formatDateTime(selectedCase.updated_at, intlLocale())}
                  </UiNode>
                </UiNode>)}
            </UiNode>

            <UiNode as="div" style={ui.scoreCard}>
              <UiNode as="div" style={ui.scoreTop}>
                <UiNode as="span">
                  Pilot akış ilerlemesi
                </UiNode>

                <UiNode as="strong">
                  %{score}
                </UiNode>
              </UiNode>

              <UiNode as="div" style={ui.track}>
                <UiNode as="i" style={{
                ...ui.fill,
                width: `${score}%`,
            }}/>
              </UiNode>

              <UiNode as="small">
                {completedCount}/
                {stages.length} kontrol
                tamamlandı
              </UiNode>
            </UiNode>

            <UiNode as="div" style={ui.nextCard}>
              <UiNode as="span" style={ui.label}>
                SIRADAKİ DOĞRU ADIM
              </UiNode>

              {loadingCase ? (<UiNode as="strong">
                  Vaka okunuyor…
                </UiNode>) : nextStage ? (<>
                  <UiNode as="strong">
                    {nextStage.title}
                  </UiNode>

                  <UiNode as="span">
                    {nextStage.description}
                  </UiNode>

                  <Link href={nextStage.href} style={ui.primaryLink}>
                    Bu Adıma Git
                  </Link>
                </>) : (<>
                  <UiNode as="strong">
                    Pilot akış tamamlandı
                  </UiNode>

                  <UiNode as="span">
                    Vaka uçtan uca
                    teslimat aşamasına
                    ulaşmış görünüyor.
                  </UiNode>
                </>)}
            </UiNode>
          </UiNode>

          <UiNode as="section" className="pilot-grid" style={ui.contentGrid}>
            <UiNode as="div" style={ui.panel}>
              <UiNode data-dy-copy-stack as="div" style={ui.panelTitle}>
                <UiNode as="strong">
                  Uçtan uca akış
                </UiNode>

                <UiNode as="span">
                  Her adım gerçek
                  Supabase kaydından
                  hesaplanır.
                </UiNode>
              </UiNode>

              <UiNode as="div" style={ui.stageList}>
                {stages.map((stage, index) => (<UiNode as="article" key={stage.id} className="pilot-stage" style={{
                    ...ui.stage,
                    borderColor: stage.complete
                        ? "rgba(99,204,152,.45)"
                        : dy.border,
                    background: stage.complete
                        ? "rgba(99,204,152,.06)"
                        : dy.surface2,
                }}>
                      <UiNode as="span" style={{
                    ...ui.stageNumber,
                    color: stage.complete
                        ? "#63cc98"
                        : dy.muted,
                }}>
                        {String(index + 1).padStart(2, "0")}
                      </UiNode>

                      <UiNode as="div">
                  <UiNode as="div" style={ui.stageTitleRow}>
                          <UiNode as="strong">
                            {stage.title}
                          </UiNode>

                          <UiNode as="span" style={{
                    ...ui.stageState,
                    color: stage.complete
                        ? "#63cc98"
                        : "#e8bd73",
                }}>
                            {stage.complete
                    ? "TAMAM"
                    : uiText("BEKLİYOR")}
                          </UiNode>
                        </UiNode>

                        <UiNode as="p" style={ui.stageDescription}>
                          {stage.description}
                        </UiNode>
                      </UiNode>

                      <Link className="pilot-stage-action" href={stage.href} style={ui.stageLink}>
                        Aç →
                      </Link>
                    </UiNode>))}
              </UiNode>
            </UiNode>

            <UiNode as="aside" style={ui.side}>
              <UiNode as="section" style={ui.panel}>
                <UiNode data-dy-copy-stack as="div" style={ui.panelTitle}>
                  <UiNode as="strong">
                    Tutarlılık kontrolü
                  </UiNode>

                  <UiNode as="span">
                    Birbirini tutmayan
                    süreç kayıtlarını
                    yakalar.
                  </UiNode>
                </UiNode>

                {issues.length ? (<UiNode as="div" style={ui.issueList}>
                    {issues.map((issue, index) => (<UiNode as="div" key={`${issue}-${index}`} style={ui.issue}>
                          <UiNode as="span">
                            !
                          </UiNode>

                          <UiNode as="p">
                            {issue}
                          </UiNode>
                        </UiNode>))}
                  </UiNode>) : (<UiNode data-dy-copy-stack as="div" style={ui.okBox}>
                    <UiNode as="strong">
                      Tutarsızlık görünmüyor
                    </UiNode>

                    <UiNode as="span">
                      Mevcut vaka kayıtları
                      kendi aralarında
                      uyumlu görünüyor.
                    </UiNode>
                  </UiNode>)}
              </UiNode>

              <UiNode as="section" style={ui.panel}>
                <UiNode data-dy-copy-stack as="div" style={ui.panelTitle}>
                  <UiNode as="strong">
                    Pilot telemetrisi
                  </UiNode>

                  <UiNode as="span">
                    Hızlı teknik özet.
                  </UiNode>
                </UiNode>

                <Metric label="Tarama" value={snapshot
                ? String(snapshot.scans
                    .length)
                : "—"}/>

                <Metric label="Vaka mesajı" value={snapshot
                ? String(snapshot.messageCount)
                : "—"}/>

                <Metric label="Vaka event" value={snapshot
                ? String(snapshot.eventCount)
                : "—"}/>

                <Metric label="CAD" value={snapshot?.design
                ? "Var"
                : "Yok"}/>

                <Metric label="Review" value={latestReview
                ? `v${latestReview.version_number}`
                : "Yok"}/>

                <Metric label="Gönderi" value={snapshot
                ? String(snapshot.shipments
                    .length)
                : "—"}/>
              </UiNode>

              {organization?.org_type ===
                "laboratory" && (<UiNode as="section" style={ui.privacyBox}>
                  <UiNode as="strong">
                    Klinik fiyat gizliliği
                  </UiNode>

                  <UiNode as="span">
                    Bu pilot ekranı
                    laboratuvar rolünde
                    `clinic_case_finance`
                    sorgulamaz. Hasta
                    fiyatı lab tarafına
                    taşınmaz.
                  </UiNode>
                </UiNode>)}
            </UiNode>
          </UiNode>
        </>)}
    </UiNode>);
}
function Metric({ label, value, }: {
    label: string;
    value: string;
}) {
    const { t: uiText } = useTranslation();
    return (<UiNode as="div" style={ui.metric}>
      <UiNode as="span">
        {uiText(label)}
      </UiNode>

      <UiNode as="strong">
        {value}
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
        low: "Düşük",
        normal: "Normal",
        high: "Yüksek",
        urgent: "Acil",
    } as Record<string, string>)[value] ?? value;
}
function reviewStatusLabel(value: string) {
    return ({
        pending: "Klinik kararı bekliyor",
        approved: "Onaylandı",
        revision_requested: "Revizyon istendi",
        superseded: "Eski sürüm",
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
function workflowLabel(value: string) {
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
function paymentStatusLabel(value: string) {
    return ({
        quote: "Teklif",
        pending: "Bekliyor",
        partial: "Kısmi",
        paid: "Ödendi",
        cancelled: "İptal",
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
function money(value: number, currency: string, localeTag: string = "tr-TR") {
    try {
        return new Intl.NumberFormat(localeTag, {
            style: "currency",
            currency: currency || "TRY",
            maximumFractionDigits: 0,
        }).format(value);
    }
    catch {
        return `${value} ${currency}`;
    }
}
function formatDateTime(value: string, localeTag: string = "tr-TR") {
    return new Intl.DateTimeFormat(localeTag, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}
const ui: Record<string, CSSProperties> = {
    page: {
        minHeight: "100vh",
        padding: "24px clamp(18px,4vw,52px) 64px",
        background: dy.bg,
        color: dy.text,
        fontFamily: "Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    },
    center: {
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: dy.bg,
        color: dy.muted,
    },
    header: {
        maxWidth: 1320,
        margin: "0 auto 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: 16,
        flexWrap: "wrap",
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
        fontSize: "clamp(36px,5vw,58px)",
        letterSpacing: "-.045em",
    },
    subtitle: {
        maxWidth: 760,
        margin: 0,
        color: dy.muted,
        lineHeight: 1.6,
    },
    headerActions: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
    },
    primaryLink: {
        minHeight: 42,
        display: "inline-grid",
        placeItems: "center",
        padding: "0 13px",
        borderRadius: 10,
        background: dy.accent,
        color: dy.accentContrast,
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 900,
    },
    secondaryButton: {
        minHeight: 42,
        padding: "0 13px",
        border: `1px solid ${dy.border}`,
        borderRadius: 10,
        background: dy.surface,
        color: dy.text,
        fontSize: 13,
        fontWeight: 850,
        cursor: "pointer",
    },
    notice: {
        maxWidth: 1320,
        margin: "0 auto 12px",
        padding: 12,
        border: `1px solid ${dy.border}`,
        borderRadius: 10,
        background: dy.surface2,
        color: dy.muted,
    },
    hero: {
        maxWidth: 1320,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "minmax(0,1.2fr) minmax(240px,.7fr) minmax(0,1fr)",
        gap: 9,
    },
    selectorCard: {
        minHeight: 170,
        padding: 15,
        display: "grid",
        alignContent: "center",
        gap: 9,
        border: `1px solid ${dy.border}`,
        borderRadius: 14,
        background: dy.surface,
    },
    scoreCard: {
        minHeight: 170,
        padding: 15,
        display: "grid",
        alignContent: "center",
        gap: 10,
        border: `1px solid ${dy.border}`,
        borderRadius: 14,
        background: dy.surface,
    },
    nextCard: {
        minHeight: 170,
        padding: 15,
        display: "grid",
        alignContent: "center",
        gap: 8,
        border: `1px solid ${dy.accent}`,
        borderRadius: 14,
        background: dy.accentSoft,
    },
    label: {
        color: dy.accent,
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: ".1em",
    },
    select: {
        width: "100%",
        minHeight: 44,
        padding: "0 10px",
        border: `1px solid ${dy.border}`,
        borderRadius: 10,
        background: dy.input,
        color: dy.text,
        fontSize: 14,
    },
    caseMeta: {
        display: "grid",
        gap: 3,
        color: dy.muted,
        fontSize: 13,
    },
    scoreTop: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 10,
    },
    track: {
        height: 8,
        overflow: "hidden",
        borderRadius: 999,
        background: dy.input,
    },
    fill: {
        display: "block",
        height: "100%",
        borderRadius: 999,
        background: dy.accent,
        transition: "width .2s ease",
    },
    contentGrid: {
        maxWidth: 1320,
        margin: "10px auto 0",
        display: "grid",
        gridTemplateColumns: "minmax(0,1.55fr) minmax(300px,.65fr)",
        gap: 9,
        alignItems: "start",
    },
    panel: {
        padding: 15,
        display: "grid",
        gap: 12,
        border: `1px solid ${dy.border}`,
        borderRadius: 14,
        background: dy.surface,
    },
    panelTitle: {
        display: "grid",
        gap: 3,
        color: dy.muted,
        fontSize: 13,
    },
    stageList: {
        display: "grid",
        gap: 7,
    },
    stage: {
        minHeight: 92,
        display: "grid",
        gridTemplateColumns: "40px minmax(0,1fr) auto",
        alignItems: "center",
        gap: 10,
        padding: 12,
        border: "1px solid",
        borderRadius: 11,
    },
    stageNumber: {
        fontSize: 13,
        fontWeight: 900,
    },
    stageTitleRow: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
    },
    stageState: {
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: ".08em",
    },
    stageDescription: {
        margin: "5px 0 0",
        color: dy.muted,
        fontSize: 13,
        lineHeight: 1.5,
    },
    stageLink: {
        color: dy.accent,
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 900,
    },
    side: {
        display: "grid",
        gap: 9,
    },
    issueList: {
        display: "grid",
        gap: 7,
    },
    issue: {
        display: "grid",
        gridTemplateColumns: "24px minmax(0,1fr)",
        gap: 7,
        padding: 10,
        border: "1px solid rgba(232,189,115,.42)",
        borderRadius: 9,
        background: "rgba(232,189,115,.08)",
        color: dy.muted,
    },
    okBox: {
        minHeight: 110,
        display: "grid",
        placeItems: "center",
        alignContent: "center",
        gap: 5,
        textAlign: "center",
        color: dy.muted,
    },
    metric: {
        minHeight: 42,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "7px 0",
        borderBottom: `1px solid ${dy.border}`,
        color: dy.muted,
        fontSize: 13,
    },
    privacyBox: {
        padding: 13,
        display: "grid",
        gap: 5,
        border: `1px solid ${dy.accent}`,
        borderRadius: 12,
        background: dy.accentSoft,
        color: dy.muted,
        fontSize: 13,
        lineHeight: 1.5,
    },
    empty: {
        maxWidth: 760,
        minHeight: 280,
        margin: "28px auto",
        padding: 24,
        display: "grid",
        placeItems: "center",
        alignContent: "center",
        gap: 8,
        textAlign: "center",
        border: `1px dashed ${dy.border}`,
        borderRadius: 16,
        background: dy.surface,
        color: dy.muted,
    },
};
