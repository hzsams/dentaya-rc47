"use client";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useMemo, useState, type CSSProperties, } from "react";
import Link from "@/lib/i18n/UiLink";
import { useRouter } from "next/navigation";
import NotificationCenter from "@/app/NotificationCenter";
import EmptyStateCard from "@/app/EmptyStateCard";
import { dentayaError } from "@/lib/dentaya-errors";
import { supabase } from "@/lib/supabase";
import { dy, useDentayaThemeRuntime, } from "@/app/dentaya-theme";
type Org = {
    id: string;
    name: string;
    org_type: "clinic" | "laboratory" | "courier";
};
type CaseRow = {
    id: string;
    case_number: string;
    clinic_org_id: string;
    lab_org_id: string | null;
    patient_reference: string;
    title: string;
    case_type: string;
    priority: string;
    status: string;
    tooth_codes: string[];
    material: string | null;
    shade: string | null;
};
type LabQuote = {
    id: string;
    case_id: string;
    amount: number;
    currency: "TRY" | "EUR" | "USD";
    status: "draft" | "sent" | "accepted" | "rejected";
    notes: string | null;
    basis: Record<string, unknown>;
};
type ClinicFinance = {
    id: string;
    case_id: string;
    patient_price: number;
    discount_amount: number;
    paid_amount: number;
    currency: "TRY" | "EUR" | "USD";
    payment_status: "quote" | "pending" | "partial" | "paid" | "cancelled";
    overhead_pct: number;
    target_margin_pct: number;
    notes: string | null;
};
const CASE_BASE: Record<string, number> = {
    crown: 1800,
    bridge: 2800,
    veneer: 2200,
    "implant crown": 3200,
    "inlay / onlay": 1700,
    denture: 4500,
    "night guard": 1500,
};
export default function FinancePage() {
    const { t: uiText, intlLocale } = useTranslation();
    useDentayaThemeRuntime();
    const router = useRouter();
    const [org, setOrg] = useState<Org | null>(null);
    const [userId, setUserId] = useState("");
    const [cases, setCases] = useState<CaseRow[]>([]);
    const [quotes, setQuotes] = useState<LabQuote[]>([]);
    const [finances, setFinances] = useState<ClinicFinance[]>([]);
    const [selectedId, setSelectedId] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [quoteAmount, setQuoteAmount] = useState("");
    const [quoteStatus, setQuoteStatus] = useState<LabQuote["status"]>("draft");
    const [quoteNotes, setQuoteNotes] = useState("");
    const [patientPrice, setPatientPrice,] = useState("");
    const [discount, setDiscount] = useState("0");
    const [paid, setPaid] = useState("0");
    const [paymentStatus, setPaymentStatus,] = useState<ClinicFinance["payment_status"]>("quote");
    const [overhead, setOverhead] = useState("20");
    const [targetMargin, setTargetMargin] = useState("35");
    const [financeNotes, setFinanceNotes,] = useState("");
    useEffect(() => {
        let active = true;
        async function init() {
            const { data: auth } = await supabase.auth
                .getSession();
            const user = auth.session?.user;
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
                setMessage("Aktif kurum bulunamadı.");
                setLoading(false);
                return;
            }
            const { data: orgData } = await supabase
                .from("organizations")
                .select("id,name,org_type")
                .eq("id", membership.organization_id)
                .maybeSingle();
            if (!orgData) {
                setMessage("Kurum bilgisi alınamadı.");
                setLoading(false);
                return;
            }
            const current = orgData as Org;
            if (current.org_type ===
                "courier") {
                router.replace("/logistics");
                return;
            }
            if (!active)
                return;
            setOrg(current);
            await loadAll(current);
            setLoading(false);
        }
        void init();
        return () => {
            active = false;
        };
    }, [router]);
    async function loadAll(current: Org) {
        let query = supabase
            .from("cases")
            .select("id,case_number,clinic_org_id,lab_org_id,patient_reference,title,case_type,priority,status,tooth_codes,material,shade")
            .neq("status", "cancelled")
            .order("updated_at", {
            ascending: false,
        })
            .limit(250);
        query =
            current.org_type ===
                "clinic"
                ? query.eq("clinic_org_id", current.id)
                : query.eq("lab_org_id", current.id);
        const { data: caseData } = await query;
        const rows = (caseData ??
            []) as CaseRow[];
        setCases(rows);
        setSelectedId((currentId) => rows.some((item) => item.id ===
            currentId)
            ? currentId
            : rows[0]?.id ??
                "");
        const caseIds = rows.map((item) => item.id);
        if (!caseIds.length) {
            setQuotes([]);
            setFinances([]);
            return;
        }
        const { data: quoteData, } = await supabase
            .from("lab_case_quotes")
            .select("id,case_id,amount,currency,status,notes,basis")
            .in("case_id", caseIds);
        setQuotes((quoteData ??
            []) as LabQuote[]);
        if (current.org_type ===
            "clinic") {
            const { data: financeData, } = await supabase
                .from("clinic_case_finance")
                .select("id,case_id,patient_price,discount_amount,paid_amount,currency,payment_status,overhead_pct,target_margin_pct,notes")
                .in("case_id", caseIds);
            setFinances((financeData ??
                []) as ClinicFinance[]);
        }
        else {
            setFinances([]);
        }
    }
    const selected = useMemo(() => cases.find((item) => item.id ===
        selectedId) ?? null, [cases, selectedId]);
    const currentQuote = useMemo(() => quotes.find((item) => item.case_id ===
        selectedId) ?? null, [quotes, selectedId]);
    const currentFinance = useMemo(() => finances.find((item) => item.case_id ===
        selectedId) ?? null, [finances, selectedId]);
    useEffect(() => {
        if (!selected)
            return;
        if (org?.org_type ===
            "laboratory") {
            setQuoteAmount(currentQuote
                ? String(currentQuote.amount)
                : String(suggestedLabQuote(selected)));
            setQuoteStatus(currentQuote?.status ??
                "draft");
            setQuoteNotes(currentQuote?.notes ??
                "");
            return;
        }
        const nextOverhead = currentFinance
            ? String(currentFinance.overhead_pct)
            : "20";
        const nextMargin = currentFinance
            ? String(currentFinance.target_margin_pct)
            : "35";
        setOverhead(nextOverhead);
        setTargetMargin(nextMargin);
        setDiscount(currentFinance
            ? String(currentFinance.discount_amount)
            : "0");
        setPaid(currentFinance
            ? String(currentFinance.paid_amount)
            : "0");
        setPaymentStatus(currentFinance?.payment_status ??
            "quote");
        setFinanceNotes(currentFinance?.notes ??
            "");
        const recommendation = suggestedPatientPrice(currentQuote?.amount ??
            suggestedLabQuote(selected), Number(nextOverhead), Number(nextMargin));
        setPatientPrice(currentFinance
            ? String(currentFinance.patient_price)
            : String(recommendation));
    }, [
        selectedId,
        currentQuote,
        currentFinance,
        org?.org_type,
        selected,
    ]);
    async function saveLabQuote() {
        if (!org ||
            org.org_type !==
                "laboratory" ||
            !selected ||
            !selected.lab_org_id) {
            return;
        }
        const amount = Number(quoteAmount);
        if (!Number.isFinite(amount) ||
            amount < 0) {
            setMessage("Geçerli bir laboratuvar fiyatı yaz.");
            return;
        }
        if (quoteStatus === "sent" &&
            amount <= 0) {
            setMessage("Kliniğe gönderilen laboratuvar fiyatı 0 TL olamaz.");
            return;
        }
        if (quoteNotes.trim().length >
            2000) {
            setMessage("Fiyat notu 2000 karakterden uzun olamaz.");
            return;
        }
        if (typeof navigator !== "undefined" &&
            !navigator.onLine) {
            setMessage("İnternet bağlantısı yok. Fiyatı kaydetmeden önce bağlantının gelmesini bekle.");
            return;
        }
        setSaving(true);
        setMessage("");
        const payload = {
            case_id: selected.id,
            lab_org_id: org.id,
            clinic_org_id: selected.clinic_org_id,
            amount,
            currency: "TRY",
            status: quoteStatus,
            notes: quoteNotes.trim() ||
                null,
            basis: {
                suggested_amount: suggestedLabQuote(selected),
                case_type: selected.case_type,
                material: selected.material,
                tooth_count: selected.tooth_codes
                    .length,
                priority: selected.priority,
                engine: "rules_mvp_v1",
            },
            updated_by: userId || null,
            created_by: userId || null,
            updated_at: new Date().toISOString(),
        };
        const { error } = await supabase
            .from("lab_case_quotes")
            .upsert(payload, {
            onConflict: "case_id",
        });
        setSaving(false);
        if (error) {
            setMessage(dentayaError(error));
            return;
        }
        setMessage("Laboratuvar fiyatı kaydedildi.");
        await loadAll(org);
    }
    async function saveClinicFinance() {
        if (!org ||
            org.org_type !==
                "clinic" ||
            !selected) {
            return;
        }
        const price = Number(patientPrice);
        const discountValue = Number(discount || 0);
        const paidValue = Number(paid || 0);
        if (!Number.isFinite(price) ||
            price < 0) {
            setMessage("Geçerli bir hasta fiyatı yaz.");
            return;
        }
        if (!Number.isFinite(discountValue) ||
            discountValue < 0 ||
            discountValue > price) {
            setMessage("İndirim 0 TL ile hasta fiyatı arasında olmalı.");
            return;
        }
        const netPrice = price - discountValue;
        if (!Number.isFinite(paidValue) ||
            paidValue < 0 ||
            paidValue > netPrice) {
            setMessage("Tahsilat, indirim sonrası net hasta fiyatını aşamaz.");
            return;
        }
        const overheadValue = Number(overhead || 0);
        const marginValue = Number(targetMargin || 0);
        if (!Number.isFinite(overheadValue) ||
            overheadValue < 0 ||
            overheadValue > 500) {
            setMessage("Genel gider yüzdesi 0 ile 500 arasında olmalı.");
            return;
        }
        if (!Number.isFinite(marginValue) ||
            marginValue < 0 ||
            marginValue >= 100) {
            setMessage("Hedef marj yüzdesi 0 ile 100 arasında olmalı.");
            return;
        }
        if (financeNotes.trim().length >
            2000) {
            setMessage("Muhasebe notu 2000 karakterden uzun olamaz.");
            return;
        }
        if (typeof navigator !== "undefined" &&
            !navigator.onLine) {
            setMessage("İnternet bağlantısı yok. Muhasebe kaydını göndermeden önce bağlantının gelmesini bekle.");
            return;
        }
        setSaving(true);
        setMessage("");
        const { error } = await supabase
            .from("clinic_case_finance")
            .upsert({
            case_id: selected.id,
            clinic_org_id: org.id,
            patient_price: price,
            discount_amount: Math.max(0, discountValue),
            paid_amount: Math.max(0, paidValue),
            currency: "TRY",
            payment_status: paymentStatus,
            overhead_pct: overheadValue,
            target_margin_pct: marginValue,
            notes: financeNotes.trim() ||
                null,
            updated_by: userId || null,
            created_by: userId || null,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: "case_id",
        });
        setSaving(false);
        if (error) {
            setMessage(dentayaError(error));
            return;
        }
        setMessage("Hasta fiyatı ve ödeme kaydı güncellendi.");
        await loadAll(org);
    }
    if (loading) return <LoadingExperience title="Fiyatlandırma verileri yükleniyor…"/>;
    if (!org) {
        return (<UiNode as="main" style={ui.center}>
        {message ||
                "Muhasebe alanı açılamadı."}
      </UiNode>);
    }
    const isClinic = org.org_type ===
        "clinic";
    const labCost = currentQuote?.amount ??
        (selected
            ? suggestedLabQuote(selected)
            : 0);
    const clinicPrice = Number(patientPrice || 0);
    const clinicDiscount = Number(discount || 0);
    const netPatient = Math.max(0, clinicPrice -
        clinicDiscount);
    const grossProfit = netPatient -
        labCost;
    const grossMargin = netPatient > 0
        ? (grossProfit /
            netPatient) *
            100
        : 0;
    return (<UiNode as="main" style={ui.page}>
      <style>{`
        * { box-sizing: border-box; }

        .finance-case {
          transition:
            transform var(--dy-motion-fast,150ms) ease,
            border-color var(--dy-motion-fast,150ms) ease;
        }

        .finance-case:hover {
          transform: translateX(2px);
          border-color: var(--dy-accent,#6de2cf) !important;
        }

        @media(max-width: 980px) {
          .finance-shell {
            grid-template-columns: 1fr !important;
          }

          .finance-stats {
            grid-template-columns: repeat(2,1fr) !important;
          }

          .finance-header {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }

        @media(max-width: 620px) {
          .finance-stats,
          .finance-two {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <UiNode as="header" className="finance-header" style={ui.header}>
        <UiNode as="div">
          <Link href={isClinic
            ? "/clinic"
            : "/lab"} style={ui.back}>
            ←{" "}
            {isClinic
            ? "Klinik Merkezi"
            : "Laboratuvar Merkezi"}
          </Link>

          <UiNode as="p" style={ui.eyebrow}>
            FİYATLANDIRMA & MUHASEBE
          </UiNode>

          <UiNode as="h1" style={ui.title}>
            {isClinic
            ? "Klinik Hesapları"
            : "Laboratuvar Fiyatlandırması"}
          </UiNode>

          <UiNode as="p" style={ui.subtitle}>
            {isClinic
            ? "Laboratuvar maliyetini, hastaya verilen fiyatı, indirimi ve tahsilatı ayrı tut. Laboratuvar hastaya verdiğin fiyatı göremez."
            : "Kliniğe vereceğin laboratuvar fiyatını vaka bazında belirle. Hastanın klinikten aldığı fiyat bu alanda gösterilmez."}
          </UiNode>
        </UiNode>

        <UiNode as="div" style={ui.actions}>
          <NotificationCenter />
          <Link href="/cases" style={ui.secondary}>
            {uiText(" Vakalar ")}</Link>

          <Link href="/ai" style={ui.secondary}>
            AYA Copilot
          </Link>
        </UiNode>
      </UiNode>

      {message && (<UiNode as="div" style={ui.notice}>
          {message}
        </UiNode>)}

      <UiNode as="section" className="finance-stats" style={ui.stats}>
        {isClinic ? (<>
            <Stat label="Lab maliyeti" value={money(labCost, intlLocale())} detail="Labın kliniğe verdiği fiyat"/>
            <Stat label="Hasta fiyatı" value={money(netPatient, intlLocale())} detail="İndirim sonrası"/>
            <Stat label="Brüt fark" value={money(grossProfit, intlLocale())} detail="Vergi ve diğer giderler hariç"/>
            <Stat label="Brüt marj" value={`${grossMargin.toFixed(1)}%`} detail="Kural tabanlı iş hesabı"/>
          </>) : (<>
            <Stat label={uiText("Aktif vaka")} value={String(cases.length)} detail="Fiyatlandırılabilir işler"/>
            <Stat label="Teklifli" value={String(quotes.length)} detail="Kaydedilmiş lab fiyatı"/>
            <Stat label="Gönderilmiş" value={String(quotes.filter((item) => item.status ===
                "sent").length)} detail="Kliniğe iletilmiş"/>
            <Stat label="Kabul edilmiş" value={String(quotes.filter((item) => item.status ===
                "accepted").length)} detail="Onaylı lab fiyatı"/>
          </>)}
      </UiNode>

      <UiNode as="section" className="finance-shell" style={ui.shell}>
        <UiNode as="aside" style={ui.caseList}>
          <SectionTitle title={uiText("Vakalar")} description="Fiyatı düzenlemek için bir vaka seç."/>

          <UiNode as="div" style={ui.caseStack}>
            {cases.map((item) => {
            const quote = quotes.find((quoteItem) => quoteItem.case_id ===
                item.id);
            const finance = finances.find((financeItem) => financeItem.case_id ===
                item.id);
            return (<UiNode as="button" key={item.id} type="button" className="finance-case" onClick={() => setSelectedId(item.id)} style={{
                    ...ui.caseButton,
                    borderColor: selectedId ===
                        item.id
                        ? dy.accent
                        : dy.border,
                    background: selectedId ===
                        item.id
                        ? dy.accentSoft
                        : dy.surface2,
                }}>
                    <UiNode as="span" style={ui.caseNumber}>
                      {item.case_number}
                    </UiNode>

                    <UiNode as="strong">
                      {item.title}
                    </UiNode>

                    <UiNode as="small">
                      <UserText>{item.patient_reference}</UserText>{" "}
                      ·{" "}
                      {item.material ??
                    "Materyal yok"}
                    </UiNode>

                    <UiNode as="b" style={ui.priceMini}>
                      {isClinic
                    ? finance
                        ? money(finance.patient_price -
                            finance.discount_amount, intlLocale())
                        : "Hasta fiyatı yok"
                    : quote
                        ? money(quote.amount, intlLocale())
                        : "Teklif yok"}
                    </UiNode>
                  </UiNode>);
        })}

            {!cases.length && (<EmptyStateCard eyebrow={uiText("FİYATLANDIRMA")} title={isClinic ? "Fiyatlandırılacak vaka yok" : "Lab fiyatı verilecek vaka yok"} description={isClinic
                ? "Önce bir vaka oluştur. Laboratuvar maliyeti ve hastaya verilen fiyat bu vaka üzerinden ayrı ayrı tutulur."
                : "Klinikten vaka geldiğinde laboratuvar fiyatını bu vaka üzerinden oluşturabilirsin."} actionLabel="Vakalara Git" actionHref="/cases" secondaryLabel="Başlangıç Rehberi" secondaryHref="/start"/>)}
          </UiNode>
        </UiNode>

        <UiNode as="section" style={ui.detail}>
          {selected ? (<>
              <UiNode as="div" style={ui.detailHead}>
                <UiNode as="div">
                  <UiNode as="span" style={ui.caseNumber}>
                    {selected.case_number}
                  </UiNode>
                  <UiNode as="h2" style={ui.detailTitle}>
                    {selected.title}
                  </UiNode>
                  <UiNode as="p" style={ui.detailSub}>
                    <UserText>{selected.patient_reference}</UserText> ·{" "}
                    {selected.case_type} ·{" "}
                    {selected.material ??
                "Materyal yok"} · FDI{" "}
                    {selected.tooth_codes.join(", ") || "—"}
                  </UiNode>
                </UiNode>

                <UiNode as="span" style={ui.status}>
                  {statusLabel(selected.status)}
                </UiNode>
              </UiNode>

              {isClinic ? (<>
                  <UiNode data-dy-copy-stack as="div" style={ui.infoBox}>
                    <UiNode as="strong">
                      Fiyat ayrımı
                    </UiNode>
                    <UiNode as="span">
                      Lab fiyatı, laboratuvarın kliniğe verdiği maliyettir. Hasta fiyatı yalnızca klinik hesabında tutulur ve laboratuvar tarafından görülmez.
                    </UiNode>
                  </UiNode>

                  <SectionTitle title="DentAYA Fiyat Asistanı" description="Öneri, laboratuvar maliyeti + genel gider + hedef marj formülüyle hesaplanır. Son fiyatı klinik belirler."/>

                  <UiNode as="div" className="finance-two" style={ui.two}>
                    <ReadOnly label="Lab maliyeti" value={currentQuote
                    ? money(currentQuote.amount, intlLocale())
                    : `${money(suggestedLabQuote(selected), intlLocale())} tahmini`}/>

                    <ReadOnly label="Önerilen hasta fiyatı" value={money(suggestedPatientPrice(labCost, Number(overhead ||
                    0), Number(targetMargin ||
                    0)), intlLocale())}/>
                  </UiNode>

                  <UiNode as="div" className="finance-two" style={ui.two}>
                    <Field label="Genel gider (%)">
                      <UiNode as="input" type="number" min={0} max={500} value={overhead} onChange={(event) => setOverhead(event.target
                    .value)} style={ui.input}/>
                    </Field>

                    <Field label="Hedef marj (%)">
                      <UiNode as="input" type="number" min={0} max={99} value={targetMargin} onChange={(event) => setTargetMargin(event.target
                    .value)} style={ui.input}/>
                    </Field>
                  </UiNode>

                  <UiNode as="div" className="finance-two" style={ui.two}>
                    <Field label="Hastaya verilen fiyat (₺)">
                      <UiNode as="input" type="number" min={0} value={patientPrice} onChange={(event) => setPatientPrice(event.target
                    .value)} style={ui.input}/>
                    </Field>

                    <Field label="İndirim (₺)">
                      <UiNode as="input" type="number" min={0} value={discount} onChange={(event) => setDiscount(event.target
                    .value)} style={ui.input}/>
                    </Field>
                  </UiNode>

                  <UiNode as="div" className="finance-two" style={ui.two}>
                    <Field label="Tahsil edilen (₺)">
                      <UiNode as="input" type="number" min={0} value={paid} onChange={(event) => setPaid(event.target
                    .value)} style={ui.input}/>
                    </Field>

                    <Field label="Ödeme durumu">
                      <UiNode as="select" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target
                    .value as ClinicFinance["payment_status"])} style={ui.input}>
                        <UiNode as="option" value="quote">
                          Fiyat verildi
                        </UiNode>
                        <UiNode as="option" value="pending">
                          Ödeme bekliyor
                        </UiNode>
                        <UiNode as="option" value="partial">
                          Kısmi ödeme
                        </UiNode>
                        <UiNode as="option" value="paid">
                          Ödendi
                        </UiNode>
                        <UiNode as="option" value="cancelled">
                          {uiText(" İptal ")}</UiNode>
                      </UiNode>
                    </Field>
                  </UiNode>

                  <Field label="Muhasebe notu">
                    <UiNode as="textarea" value={financeNotes} onChange={(event) => setFinanceNotes(event.target
                    .value)} style={ui.textarea} placeholder="Ödeme, indirim veya özel fiyat notu…"/>
                  </Field>

                  <UiNode as="button" type="button" onClick={() => void saveClinicFinance()} disabled={saving} style={ui.primaryButton}>
                    {saving
                    ? uiText("Kaydediliyor…")
                    : "Klinik Fiyatını Kaydet"}
                  </UiNode>
                </>) : (<>
                  <UiNode data-dy-copy-stack as="div" style={ui.infoBox}>
                    <UiNode as="strong">
                      Klinik ve hasta fiyatı ayrıdır
                    </UiNode>
                    <UiNode as="span">
                      Buradaki fiyat yalnızca laboratuvarın kliniğe verdiği iş fiyatıdır. Klinikte hastaya verilen fiyat bu ekranda tutulmaz.
                    </UiNode>
                  </UiNode>

                  <SectionTitle title="Lab Fiyat Asistanı" description="İş türü, materyal, diş sayısı ve önceliğe göre kural tabanlı bir başlangıç önerisi üretir. Teknisyen veya yönetici son fiyatı belirler."/>

                  <UiNode as="div" className="finance-two" style={ui.two}>
                    <ReadOnly label="Sistem önerisi" value={money(suggestedLabQuote(selected), intlLocale())}/>

                    <ReadOnly label="Diş / ünite" value={String(Math.max(1, selected.tooth_codes
                    .length))}/>
                  </UiNode>

                  <UiNode as="div" className="finance-two" style={ui.two}>
                    <Field label="Kliniğe verilecek fiyat (₺)">
                      <UiNode as="input" type="number" min={0} value={quoteAmount} onChange={(event) => setQuoteAmount(event.target
                    .value)} style={ui.input}/>
                    </Field>

                    <Field label="Teklif durumu">
                      <UiNode as="select" value={quoteStatus} onChange={(event) => setQuoteStatus(event.target
                    .value as LabQuote["status"])} style={ui.input}>
                        <UiNode as="option" value="draft">
                          {uiText(" Taslak ")}</UiNode>
                        <UiNode as="option" value="sent">
                          Kliniğe gönderildi
                        </UiNode>
                        <UiNode as="option" value="accepted">
                          {uiText(" Kabul edildi ")}</UiNode>
                        <UiNode as="option" value="rejected">
                          {uiText(" Reddedildi ")}</UiNode>
                      </UiNode>
                    </Field>
                  </UiNode>

                  <Field label="Teknik / fiyat notu">
                    <UiNode as="textarea" value={quoteNotes} onChange={(event) => setQuoteNotes(event.target
                    .value)} style={ui.textarea} placeholder="Materyal, özel komponent, express üretim veya ek iş notu…"/>
                  </Field>

                  <UiNode as="button" type="button" onClick={() => void saveLabQuote()} disabled={saving} style={ui.primaryButton}>
                    {saving
                    ? uiText("Kaydediliyor…")
                    : "Lab Fiyatını Kaydet"}
                  </UiNode>
                </>)}
            </>) : (<UiNode as="div" style={ui.empty}>
              Bir vaka seç.
            </UiNode>)}
        </UiNode>
      </UiNode>
    </UiNode>);
}
function suggestedLabQuote(item: CaseRow) {
    const key = item.case_type
        .trim()
        .toLowerCase();
    const base = CASE_BASE[key] ??
        1900;
    const units = Math.max(1, item.tooth_codes.length);
    const material = (item.material ??
        "")
        .toLowerCase();
    const materialFactor = material.includes("zircon")
        ? 1.12
        : material.includes("emax") ||
            material.includes("lithium")
            ? 1.18
            : material.includes("pmma")
                ? 0.78
                : 1;
    const priorityFactor = item.priority ===
        "urgent"
        ? 1.3
        : item.priority ===
            "high"
            ? 1.15
            : 1;
    return round50(base *
        Math.max(1, units * 0.82) *
        materialFactor *
        priorityFactor);
}
function suggestedPatientPrice(labCost: number, overheadPct: number, targetMarginPct: number) {
    const landed = labCost *
        (1 +
            Math.max(0, overheadPct) /
                100);
    const margin = clamp(targetMarginPct, 0, 90) / 100;
    if (margin >= 0.9) {
        return round50(landed * 10);
    }
    return round50(landed /
        Math.max(0.1, 1 - margin));
}
function round50(value: number) {
    return Math.round(value / 50) * 50;
}
function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, Number.isFinite(value)
        ? value
        : min));
}
function money(value: number, localeTag: string = "tr-TR") {
    return new Intl.NumberFormat(localeTag, {
        style: "currency",
        currency: "TRY",
        maximumFractionDigits: 0,
    }).format(Number.isFinite(value)
        ? value
        : 0);
}
function statusLabel(value: string) {
    return ({
        new: "Yeni",
        accepted: "Kabul",
        design: "Tasarım",
        approval: "Onay",
        production: "Üretim",
        qc: "Kalite Kontrol",
        ready: "Hazır",
        shipped: "Yolda",
        delivered: "Teslim",
    } as Record<string, string>)[value] ?? value;
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
function Stat({ label, value, detail, }: {
    label: string;
    value: string;
    detail: string;
}) {
    const { t: uiText } = useTranslation();
    return (<UiNode as="article" style={ui.stat}>
      <UiNode as="span">
        {uiText(label)}
      </UiNode>
      <UiNode as="strong">
        {value}
      </UiNode>
      <UiNode as="small">
        {detail}
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
function ReadOnly({ label, value, }: {
    label: string;
    value: string;
}) {
    return (<UiNode as="div" style={ui.readOnly}>
      <UiNode as="span">
        {label}
      </UiNode>
      <UiNode as="strong">
        {value}
      </UiNode>
    </UiNode>);
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
    center: {
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: dy.bg,
        color: dy.muted,
    },
    header: {
        maxWidth: 1440,
        margin: "0 auto 18px",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
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
        letterSpacing: "-.04em",
    },
    subtitle: {
        maxWidth: 860,
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
    secondary: {
        minHeight: 42,
        display: "grid",
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
    stats: {
        maxWidth: 1440,
        margin: "0 auto 12px",
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 8,
    },
    stat: {
        minHeight: 105,
        padding: 14,
        display: "grid",
        alignContent: "space-between",
        gap: 4,
        border: `1px solid ${dy.border}`,
        borderRadius: 14,
        background: dy.surface,
    },
    shell: {
        maxWidth: 1440,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "340px minmax(0,1fr)",
        gap: 12,
        alignItems: "start",
    },
    caseList: {
        padding: 13,
        border: `1px solid ${dy.border}`,
        borderRadius: 16,
        background: dy.surface,
    },
    caseStack: {
        display: "grid",
        gap: 7,
        marginTop: 11,
    },
    caseButton: {
        width: "100%",
        minHeight: 112,
        padding: 12,
        display: "grid",
        gap: 5,
        textAlign: "left",
        border: "1px solid",
        borderRadius: 12,
        color: dy.text,
        cursor: "pointer",
    },
    caseNumber: {
        color: dy.accent,
        fontSize: 12,
        fontWeight: 900,
    },
    priceMini: {
        marginTop: 3,
        color: dy.accent,
        fontSize: 14,
    },
    detail: {
        minHeight: 620,
        padding: 18,
        display: "grid",
        alignContent: "start",
        gap: 13,
        border: `1px solid ${dy.border}`,
        borderRadius: 16,
        background: dy.surface,
    },
    detailHead: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 14,
        paddingBottom: 12,
        borderBottom: `1px solid ${dy.border}`,
    },
    detailTitle: {
        margin: "4px 0",
        fontSize: 28,
    },
    detailSub: {
        margin: 0,
        color: dy.muted,
        fontSize: 14,
    },
    status: {
        padding: "6px 9px",
        borderRadius: 999,
        background: dy.accentSoft,
        color: dy.accent,
        fontSize: 12,
        fontWeight: 900,
    },
    infoBox: {
        padding: 12,
        display: "grid",
        gap: 4,
        border: `1px solid ${dy.border}`,
        borderRadius: 11,
        background: dy.accentSoft,
        color: dy.muted,
    },
    sectionTitle: {
        display: "grid",
        gap: 3,
    },
    two: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 9,
    },
    field: {
        display: "grid",
        gap: 6,
        color: dy.muted,
        fontSize: 13,
        fontWeight: 750,
    },
    input: {
        minHeight: 43,
        width: "100%",
        padding: "0 11px",
        borderRadius: 10,
        border: `1px solid ${dy.border}`,
        background: dy.input,
        color: dy.text,
        outline: "none",
    },
    textarea: {
        minHeight: 94,
        padding: 11,
        resize: "vertical",
        borderRadius: 10,
        border: `1px solid ${dy.border}`,
        background: dy.input,
        color: dy.text,
        outline: "none",
    },
    readOnly: {
        minHeight: 72,
        padding: 11,
        display: "grid",
        gap: 5,
        border: `1px solid ${dy.border}`,
        borderRadius: 11,
        background: dy.surface2,
        color: dy.muted,
    },
    primaryButton: {
        minHeight: 46,
        border: 0,
        borderRadius: 11,
        background: dy.accent,
        color: dy.accentContrast,
        fontWeight: 900,
        fontSize: 14,
        cursor: "pointer",
    },
    empty: {
        minHeight: 180,
        display: "grid",
        placeItems: "center",
        color: dy.muted,
        textAlign: "center",
    },
};
