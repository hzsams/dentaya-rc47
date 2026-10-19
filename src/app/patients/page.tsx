"use client";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { getLocale, useTranslation } from '@/lib/i18n';
import { workflowText } from '@/lib/i18n/workflow-safety';
import ToothChart from "@/app/ToothChart";
import { EMPTY_TOOTH_PLAN, writeToothPlan, type ToothPlan } from "@/lib/tooth-plan";
import { useEffect, useMemo, useRef, useState, type CSSProperties, } from "react";
import Link from "@/lib/i18n/UiLink";
import { useRouter } from "next/navigation";
import type { RealtimeChannel, User } from "@supabase/supabase-js";
import EmptyStateCard from "@/app/EmptyStateCard";
import ConnectionStatus from "@/app/ConnectionStatus";
import { dentayaError, isNonFutureDate, isReasonablePhone, isValidEmail, isFutureDate } from "@/lib/dentaya-errors";
import { supabase } from "@/lib/supabase";
import { requestIdentity, type RequestIdentity } from "@/lib/workflow-safety";
import { dy, useDentayaThemeRuntime } from "@/app/dentaya-theme";
type Organization = {
    id: string;
    name: string;
    org_type: "clinic" | "laboratory" | "courier";
    demo_mode: boolean;
};
type Patient = {
    id: string;
    external_ref: string | null;
    first_name: string;
    last_name: string;
    date_of_birth: string | null;
    sex: string | null;
    phone: string | null;
    email: string | null;
    blood_group: string | null;
    allergy_notes: string | null;
    medical_notes: string | null;
    dental_notes: string | null;
    consent_status: string;
    demo_mode: boolean;
    created_at: string;
};
type Lab = {
    id: string;
    name: string;
};
type ScanMeta = {
    patient_id: string;
    captured_at: string;
};
type PatientForm = {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    dateOfBirth: string;
    sex: string;
    bloodGroup: string;
    allergyNotes: string;
    medicalNotes: string;
    dentalNotes: string;
};
const EMPTY_PATIENT: PatientForm = {
    firstName: "", lastName: "", phone: "", email: "", dateOfBirth: "", sex: "", bloodGroup: "",
    allergyNotes: "", medicalNotes: "", dentalNotes: "",
};
type CaseForm = {
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
const EMPTY_CASE: CaseForm = {
    labOrgId: "", caseType: "Crown", toothCodes: "", toothPlan: EMPTY_TOOTH_PLAN, material: "Zirconia", shade: "A2",
    dueDate: "", priority: "normal", clinicalNotes: "",
};
export default function PatientsPage() {
    const { t: uiText, intlLocale } = useTranslation();
    useDentayaThemeRuntime();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [org, setOrg] = useState<Organization | null>(null);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [labs, setLabs] = useState<Lab[]>([]);
    const [scans, setScans] = useState<ScanMeta[]>([]);
    const [search, setSearch] = useState("");
    const [notice, setNotice] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [form, setForm] = useState<PatientForm>(EMPTY_PATIENT);
    const [savingPatient, setSavingPatient] = useState(false);
    const [casePatient, setCasePatient] = useState<Patient | null>(null);
    const [caseForm, setCaseForm] = useState<CaseForm>(EMPTY_CASE);
    const [savingCase, setSavingCase] = useState(false);
    const patientSubmitLock = useRef(false);
    const patientRequestId = useRef<RequestIdentity | null>(null);
    const caseSubmitLock = useRef(false);
    const caseRequestId = useRef<RequestIdentity | null>(null);
    useEffect(() => {
        let active = true;
        let channel: RealtimeChannel | null = null;
        async function init() {
            const { data: auth } = await supabase.auth.getSession();
            const currentUser = auth.session?.user;
            if (!currentUser) {
                router.replace("/workspace");
                return;
            }
            setUser(currentUser);
            const { data: membership, error: membershipError } = await supabase
                .from("memberships").select("organization_id")
                .eq("user_id", currentUser.id).eq("status", "active").limit(1).maybeSingle();
            if (membershipError || !membership) {
                setNotice(dentayaError(membershipError, "Aktif kurum bulunamadı."));
                setLoading(false);
                return;
            }
            const { data: orgData, error: orgError } = await supabase
                .from("organizations").select("id,name,org_type,demo_mode")
                .eq("id", membership.organization_id).maybeSingle();
            if (orgError || !orgData) {
                setNotice(dentayaError(orgError, "Kurum bilgisi alınamadı."));
                setLoading(false);
                return;
            }
            const currentOrg = orgData as Organization;
            setOrg(currentOrg);
            if (currentOrg.org_type !== "clinic") {
                setLoading(false);
                return;
            }
            await Promise.all([loadPatients(currentOrg.id), loadLabs()]);
            if (!active)
                return;
            channel = supabase.channel(`patients-mvp-${currentOrg.id}`)
                .on("postgres_changes", { event: "*", schema: "public", table: "patients", filter: `owning_org_id=eq.${currentOrg.id}` }, () => void loadPatients(currentOrg.id))
                .subscribe();
            setLoading(false);
        }
        void init();
        return () => { active = false; if (channel)
            void supabase.removeChannel(channel); };
    }, [router]);
    useEffect(() => {
        function recover() {
            if (org?.org_type === "clinic") {
                void loadPatients(org.id);
                void loadLabs();
            }
        }
        window.addEventListener("dentaya-network-restored", recover);
        return () => window.removeEventListener("dentaya-network-restored", recover);
    }, [org]);
    async function loadPatients(orgId: string) {
        const { data, error } = await supabase.from("patients")
            .select("id,external_ref,first_name,last_name,date_of_birth,sex,phone,email,blood_group,allergy_notes,medical_notes,dental_notes,consent_status,demo_mode,created_at")
            .eq("owning_org_id", orgId).order("created_at", { ascending: false }).limit(300);
        if (error) {
            setNotice(dentayaError(error));
            return;
        }
        const rows = (data ?? []) as Patient[];
        setPatients(rows);
        if (!rows.length) {
            setScans([]);
            return;
        }
        const { data: scanRows } = await supabase.from("scan_sessions").select("patient_id,captured_at")
            .in("patient_id", rows.map(x => x.id)).order("captured_at", { ascending: false }).limit(600);
        setScans((scanRows ?? []) as ScanMeta[]);
    }
    async function loadLabs() {
        const { data, error } = await supabase.from("organizations").select("id,name")
            .eq("org_type", "laboratory").eq("directory_visible", true).order("name").limit(120);
        if (error) {
            setNotice(dentayaError(error));
            return;
        }
        const rows = (data ?? []) as Lab[];
        setLabs(rows);
        setCaseForm(current => ({ ...current, labOrgId: current.labOrgId || rows[0]?.id || "" }));
    }
    const filtered = useMemo(() => {
        const q = search.trim().toLocaleLowerCase("tr-TR");
        if (!q)
            return patients;
        return patients.filter(p => [p.first_name, p.last_name, p.external_ref, p.phone, p.email]
            .filter(Boolean).join(" ").toLocaleLowerCase("tr-TR").includes(q));
    }, [patients, search]);
    const scanMap = useMemo(() => {
        const map = new Map<string, {
            count: number;
            latest: string | null;
        }>();
        for (const scan of scans) {
            const current = map.get(scan.patient_id) ?? { count: 0, latest: null };
            current.count += 1;
            if (!current.latest || new Date(scan.captured_at) > new Date(current.latest))
                current.latest = scan.captured_at;
            map.set(scan.patient_id, current);
        }
        return map;
    }, [scans]);
    const recentPatients = patients.filter(p => Date.now() - new Date(p.created_at).getTime() < 30 * 86400000).length;
    const withScans = patients.filter(p => (scanMap.get(p.id)?.count ?? 0) > 0).length;
    async function createPatient(next: "stay" | "scan" | "case" = "stay") {
        if (!org || org.org_type !== "clinic" || !user || patientSubmitLock.current)
            return;
        if (!form.firstName.trim() || !form.lastName.trim()) {
            setNotice("Hızlı kayıt için yalnızca ad ve soyad zorunlu.");
            return;
        }
        if (form.firstName.trim().length > 80 || form.lastName.trim().length > 80) {
            setNotice("Ad ve soyad alanları 80 karakterden uzun olamaz.");
            return;
        }
        if (!isValidEmail(form.email)) {
            setNotice("E-posta adresi geçerli görünmüyor.");
            return;
        }
        if (!isReasonablePhone(form.phone)) {
            setNotice("Telefon numarasını ülke koduyla birlikte geçerli biçimde yaz.");
            return;
        }
        if (!isNonFutureDate(form.dateOfBirth)) {
            setNotice("Doğum tarihi gelecekte olamaz.");
            return;
        }
        patientSubmitLock.current = true;
        const identity = requestIdentity(patientRequestId.current, { org: org.id, form });
        patientRequestId.current = identity;
        const requestId = identity.id;
        setSavingPatient(true);
        setNotice("");
        const result = await supabase.from("patients").insert({
            owning_org_id: org.id,
            first_name: form.firstName.trim(),
            last_name: form.lastName.trim(),
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
            date_of_birth: form.dateOfBirth || null,
            sex: form.sex || null,
            blood_group: form.bloodGroup.trim() || null,
            allergy_notes: form.allergyNotes.trim() || null,
            medical_notes: form.medicalNotes.trim() || null,
            dental_notes: form.dentalNotes.trim() || null,
            consent_status: org.demo_mode ? "demo" : "pending",
            demo_mode: org.demo_mode,
            created_by: user.id,
            client_request_id: requestId,
        }).select("id,external_ref,first_name,last_name,date_of_birth,sex,phone,email,blood_group,allergy_notes,medical_notes,dental_notes,consent_status,demo_mode,created_at").single();
        let data = result.data;
        let error = result.error;
        if (error?.code === "23505") {
            const existing = await supabase.from("patients")
                .select("id,external_ref,first_name,last_name,date_of_birth,sex,phone,email,blood_group,allergy_notes,medical_notes,dental_notes,consent_status,demo_mode,created_at")
                .eq("owning_org_id", org.id)
                .eq("client_request_id", requestId)
                .maybeSingle();
            data = existing.data;
            error = existing.error;
        }
        setSavingPatient(false);
        patientSubmitLock.current = false;
        if (error || !data) {
            setNotice(dentayaError(error, "Hasta kaydı oluşturulamadı."));
            return;
        }
        patientRequestId.current = null;
        const created = data as Patient;
        setForm(EMPTY_PATIENT);
        setShowAdvanced(false);
        setShowCreate(false);
        await loadPatients(org.id);
        if (next === "scan") {
            router.push(`/scan-studio?patient=${created.id}`);
            return;
        }
        if (next === "case") {
            openCase(created);
            return;
        }
        setNotice(`${created.first_name} ${created.last_name} kaydedildi.`);
    }
    function openCase(patient: Patient) {
        setCasePatient(patient);
        setCaseForm({ ...EMPTY_CASE, labOrgId: labs[0]?.id ?? "" });
        setNotice("");
    }
    async function createCase() {
        if (!casePatient || caseSubmitLock.current)
            return;
        if (!caseForm.labOrgId) {
            setNotice("Laboratuvar seç.");
            return;
        }
        const teeth = [...new Set(caseForm.toothCodes.split(/[,\s]+/).map(x => x.trim()).filter(Boolean))];
        if (!teeth.length) {
            setNotice("En az bir FDI diş numarası gerekli. Örnek: 16");
            return;
        }
        if (teeth.length > 32 || teeth.some(x => !/^(?:[1-4][1-8]|[5-8][1-5])$/.test(x))) {
            setNotice("FDI diş numaralarını kontrol et. Örnek: 11, 16, 21, 46");
            return;
        }
        if (caseForm.dueDate && !isFutureDate(caseForm.dueDate)) {
            setNotice("Yeni vakanın termin tarihi bugün veya daha ileri bir tarih olmalı.");
            return;
        }
        if (writeToothPlan(caseForm.clinicalNotes, caseForm.toothPlan, teeth).length > 4000) {
            setNotice("Klinik notunu kısaltın; diş planıyla birlikte kayıt sınırı aşılıyor.");
            return;
        }
        caseSubmitLock.current = true;
        const identity = requestIdentity(caseRequestId.current, { patient: casePatient.id, caseForm });
        caseRequestId.current = identity;
        const requestId = identity.id;
        setSavingCase(true);
        setNotice("");
        const { data, error } = await supabase.rpc("create_case_from_patient", {
            p_patient_id: casePatient.id, p_lab_org_id: caseForm.labOrgId,
            p_title: `${caseForm.caseType} · ${casePatient.first_name} ${casePatient.last_name}`,
            p_case_type: caseForm.caseType, p_tooth_codes: teeth, p_material: caseForm.material.trim() || null,
            p_shade: caseForm.shade.trim() || null, p_due_date: caseForm.dueDate || null,
            p_clinical_notes: writeToothPlan(caseForm.clinicalNotes, caseForm.toothPlan, teeth), p_priority: caseForm.priority,
            p_request_id: requestId,
        });
        setSavingCase(false);
        caseSubmitLock.current = false;
        if (error) {
            setNotice(dentayaError(error));
            return;
        }
        if (typeof data !== "string" || !data) {
            setNotice(workflowText(getLocale(), "Vaka kaydı doğrulanamadı. Bilgileriniz korundu; tekrar deneyin."));
            return;
        }
        caseRequestId.current = null;
        setCasePatient(null);
        if (data) {
            router.push(`/cases/${data}`);
            return;
        }
        setNotice("Vaka oluşturuldu.");
    }
    if (loading) return <LoadingExperience title="Hasta kayıtları yükleniyor…"/>;
    if (!org || org.org_type !== "clinic")
        return <UiNode as="main" style={ui.page}><UiNode as="div" style={ui.center}><UiNode as="p" style={ui.eyebrow}>ROL AYRIMI</UiNode><UiNode as="h1">Hasta kayıtları klinik alanındadır.</UiNode><UiNode as="p" style={ui.muted}>Laboratuvar, yalnızca kendisine gönderilen vaka referanslarını görür.</UiNode><Link href={org?.org_type === "laboratory" ? "/lab" : "/"} style={ui.primaryLink}>Çalışma alanına dön</Link></UiNode></UiNode>;
    return <UiNode as="main" style={ui.page}>
    <ConnectionStatus />
    <style>{`
      *{box-sizing:border-box}
      .patient-card{transition:transform var(--dy-motion-fast,150ms),border-color var(--dy-motion-fast,150ms),box-shadow var(--dy-motion-fast,150ms)}
      .patient-card:hover{transform:translateY(-3px);border-color:var(--dy-accent,#6de2cf)!important;box-shadow:0 18px 48px var(--dy-shadow,rgba(0,0,0,.25))}
      @media(max-width:920px){.patient-grid{grid-template-columns:1fr!important}.patient-stats{grid-template-columns:repeat(2,minmax(0,1fr))!important}.patient-head{flex-direction:column!important;align-items:flex-start!important}}
      @media(max-width:620px){.patient-stats{grid-template-columns:1fr!important}.patient-form-grid{grid-template-columns:1fr!important}.modal-actions{grid-template-columns:1fr!important}.patient-head>div:last-child{width:100%!important}.patient-head>div:last-child a,.patient-head>div:last-child button{flex:1 1 100%!important}}
    `}</style>

    <UiNode as="header" className="patient-head" style={ui.header}>
      <UiNode as="div">
        <Link href="/clinic" style={ui.back}>← Klinik Merkezi</Link>
        <UiNode as="p" style={ui.eyebrow}>KLİNİK · HASTA YÖNETİMİ</UiNode>
        <UiNode as="h1" style={ui.title}>{uiText("Hastalar")}</UiNode>
        <UiNode as="p" style={ui.subtitle}>Hızlı hasta kaydı, Dental Twin, tarama ve laboratuvar vakası aynı hasta kartından başlar.</UiNode>
      </UiNode>
      <UiNode as="div" style={ui.headerActions}>
        <Link href="/appointments" style={ui.secondaryLink}>{uiText("Randevular")}</Link>
        <Link href="/scan-studio" style={ui.secondaryLink}>{uiText("Tarama Stüdyosu")}</Link>
        <Link href="/finance" style={ui.secondaryLink}>Muhasebe</Link>
        <UiNode as="button" type="button" onClick={() => setShowCreate(true)} style={ui.primaryButton}>{uiText("+ Yeni Hasta")}</UiNode>
      </UiNode>
    </UiNode>

    {notice && <UiNode as="div" style={ui.notice}>{notice}</UiNode>}

    <UiNode as="section" className="patient-stats" style={ui.stats}>
      <Stat label="Toplam Hasta" value={patients.length} detail="klinik kaydı"/>
      <Stat label="Son 30 Gün" value={recentPatients} detail="yeni kayıt"/>
      <Stat label="3D Tarama" value={withScans} detail="tarama geçmişi olan"/>
      <Stat label="Dental Twin" value={patients.length} detail="erişilebilir kayıt"/>
    </UiNode>

    <UiNode as="section" style={ui.toolbar}>
      <UiNode as="div" style={ui.searchWrap}>
        <UiNode as="span" style={ui.searchIcon}>⌕</UiNode>
        <UiNode as="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Ad, referans, telefon veya e-posta ara…" style={ui.search}/>
      </UiNode>
      <UiNode as="span" style={ui.resultText}>{filtered.length} hasta gösteriliyor</UiNode>
    </UiNode>

    <UiNode as="section" className="patient-grid" style={ui.grid}>
      {filtered.map((p, index) => {
            const meta = scanMap.get(p.id) ?? { count: 0, latest: null };
            return <UiNode as="article" key={p.id} className="patient-card" style={{ ...ui.card, animationDelay: `${Math.min(index, 10) * 25}ms` }}>
          <UiNode as="div" style={ui.cardTop}>
            <UiNode as="div" style={ui.avatar}>{initials(p)}</UiNode>
            <UiNode as="div" style={{ minWidth: 0, flex: 1 }}>
              <UiNode as="div" style={ui.cardName}><UserText>{p.first_name}</UserText> <UserText>{p.last_name}</UserText></UiNode>
              <UiNode as="div" style={ui.ref}>{p.external_ref ?? "Referans oluşturuluyor"}</UiNode>
            </UiNode>
            {p.demo_mode && <UiNode as="span" style={ui.demo}>DEMO</UiNode>}
          </UiNode>

          <UiNode as="div" style={ui.contactLine}>
            <UiNode as="span">{p.phone || "Telefon eklenmedi"}</UiNode>
            <UiNode as="span">{p.email || "E-posta eklenmedi"}</UiNode>
          </UiNode>

          <UiNode as="div" style={ui.patientMetrics}>
            <Mini label="Tarama" value={String(meta.count)}/>
            <Mini label="Son Tarama" value={meta.latest ? shortDate(meta.latest, intlLocale()) : "—"}/>
            <Mini label="Doğum" value={p.date_of_birth ? shortDate(p.date_of_birth, intlLocale()) : "—"}/>
          </UiNode>

          {p.dental_notes && <UiNode as="p" style={ui.note}>{p.dental_notes}</UiNode>}

          <UiNode as="div" style={ui.cardActions}>
            <Link href={p.demo_mode && p.external_ref?.startsWith("DENTAYA-TRAINING-") ? `/training?case=${encodeURIComponent(p.external_ref.replace("DENTAYA-TRAINING-", ""))}` : `/scans?patient=${p.id}`} style={ui.actionPrimary}>{p.demo_mode && p.external_ref?.startsWith("DENTAYA-TRAINING-") ? "Demo tarama / senaryo" : "Dental Twin / 3D"}</Link>
            <Link href={`/scan-studio?patient=${p.id}`} style={ui.action}>Yeni Tarama</Link>
            <UiNode as="button" type="button" onClick={() => openCase(p)} style={ui.action}>Vaka Aç</UiNode>
          </UiNode>
        </UiNode>;
        })}
      {!filtered.length && (patients.length === 0
            ? <UiNode as="div" style={{ gridColumn: "1/-1" }}><EmptyStateCard eyebrow="İLK ADIM" title="İlk hastanı ekle" description="DentAYA klinik akışı hasta kaydıyla başlar. Ad ve soyad yeterli; tarama ve vaka kayıtlarını daha sonra bağlayabilirsin." actionLabel="Yeni Hasta Ekle" onAction={() => setShowCreate(true)} secondaryLabel="Başlangıç Rehberi" secondaryHref="/start"/></UiNode>
            : <UiNode as="div" style={{ gridColumn: "1/-1" }}><EmptyStateCard eyebrow="ARAMA" title="Aramana uyan hasta yok" description="Arama ifadesini değiştir veya tüm hasta listesini tekrar göster." actionLabel="Aramayı Temizle" onAction={() => setSearch("")}/></UiNode>)}
    </UiNode>

    {showCreate && <UiNode as="div" style={ui.overlay} onMouseDown={() => setShowCreate(false)}>
      <UiNode as="section" style={ui.modal} onMouseDown={e => e.stopPropagation()}>
        <UiNode as="div" style={ui.modalHead}>
          <UiNode as="div"><UiNode as="p" style={ui.eyebrow}>HIZLI KAYIT</UiNode><UiNode as="h2" style={ui.modalTitle}>{uiText("Yeni Hasta")}</UiNode><UiNode as="p" style={ui.muted}>Ad ve soyad yeterli. Diğer bilgileri şimdi veya daha sonra ekleyebilirsin.</UiNode></UiNode>
          <UiNode as="button" type="button" onClick={() => setShowCreate(false)} style={ui.close}>×</UiNode>
        </UiNode>
        <UiNode as="div" className="patient-form-grid" style={ui.formGrid}>
          <Field label="Ad *"><UiNode as="input" value={form.firstName} onChange={e => setForm(x => ({ ...x, firstName: e.target.value }))} autoFocus style={ui.input}/></Field>
          <Field label="Soyad *"><UiNode as="input" value={form.lastName} onChange={e => setForm(x => ({ ...x, lastName: e.target.value }))} style={ui.input}/></Field>
          <Field label={uiText("Telefon")}><UiNode as="input" value={form.phone} onChange={e => setForm(x => ({ ...x, phone: e.target.value }))} placeholder="05xx…" style={ui.input}/></Field>
          <Field label={uiText("E-posta")}><UiNode as="input" value={form.email} onChange={e => setForm(x => ({ ...x, email: e.target.value }))} type="email" style={ui.input}/></Field>
        </UiNode>

        <UiNode as="button" type="button" onClick={() => setShowAdvanced(v => !v)} style={ui.advancedButton}>{showAdvanced ? "Ek bilgileri gizle" : "Ek bilgileri göster"} ↓</UiNode>

        {showAdvanced && <UiNode as="div" className="patient-form-grid" style={ui.formGrid}>
          <Field label="Doğum tarihi"><UiNode as="input" type="date" value={form.dateOfBirth} onChange={e => setForm(x => ({ ...x, dateOfBirth: e.target.value }))} style={ui.input}/></Field>
          <Field label="Cinsiyet"><UiNode as="select" value={form.sex} onChange={e => setForm(x => ({ ...x, sex: e.target.value }))} style={ui.input}><UiNode as="option" value="">Belirtilmedi</UiNode><UiNode as="option" value="female">Kadın</UiNode><UiNode as="option" value="male">Erkek</UiNode><UiNode as="option" value="other">Diğer</UiNode></UiNode></Field>
          <Field label="Kan grubu"><UiNode as="input" value={form.bloodGroup} onChange={e => setForm(x => ({ ...x, bloodGroup: e.target.value }))} placeholder="A+" style={ui.input}/></Field>
          <Field label="Alerji notu"><UiNode as="input" value={form.allergyNotes} onChange={e => setForm(x => ({ ...x, allergyNotes: e.target.value }))} style={ui.input}/></Field>
          <Field label="Medikal not" wide><UiNode as="textarea" value={form.medicalNotes} onChange={e => setForm(x => ({ ...x, medicalNotes: e.target.value }))} style={ui.textarea}/></Field>
          <Field label="Dental not" wide><UiNode as="textarea" value={form.dentalNotes} onChange={e => setForm(x => ({ ...x, dentalNotes: e.target.value }))} style={ui.textarea}/></Field>
        </UiNode>}

        <UiNode as="div" className="modal-actions" style={ui.modalActions}>
          <UiNode as="button" type="button" disabled={savingPatient} onClick={() => void createPatient("stay")} style={ui.secondaryButton}>{savingPatient ? uiText("Kaydediliyor…") : uiText("Kaydet")}</UiNode>
          <UiNode as="button" type="button" disabled={savingPatient} onClick={() => void createPatient("scan")} style={ui.secondaryButton}>Kaydet + Tarama Aç</UiNode>
          <UiNode as="button" type="button" disabled={savingPatient} onClick={() => void createPatient("case")} style={ui.primaryButton}>Kaydet + Vaka Aç</UiNode>
        </UiNode>
      </UiNode>
    </UiNode>}

    {casePatient && <UiNode as="div" style={ui.overlay} onMouseDown={() => setCasePatient(null)}>
      <UiNode as="section" style={ui.modal} onMouseDown={e => e.stopPropagation()}>
        <UiNode as="div" style={ui.modalHead}><UiNode as="div"><UiNode as="p" style={ui.eyebrow}>{uiText("YENİ VAKA")}</UiNode><UiNode as="h2" style={ui.modalTitle}><UserText>{casePatient.first_name}</UserText> <UserText>{casePatient.last_name}</UserText></UiNode></UiNode><UiNode as="button" type="button" onClick={() => setCasePatient(null)} style={ui.close}>×</UiNode></UiNode>
        <UiNode as="div" className="patient-form-grid" style={ui.formGrid}>
          <Field label="Laboratuvar *"><UiNode as="select" value={caseForm.labOrgId} onChange={e => setCaseForm(x => ({ ...x, labOrgId: e.target.value }))} style={ui.input}>{labs.map(l => <UiNode as="option" key={l.id} value={l.id}><UserText>{l.name}</UserText></UiNode>)}</UiNode></Field>
          <Field label="İş tipi"><UiNode as="select" value={caseForm.caseType} onChange={e => setCaseForm(x => ({ ...x, caseType: e.target.value }))} style={ui.input}><UiNode as="option" value="Crown">Kron</UiNode><UiNode as="option" value="Bridge">{uiText("Köprü")}</UiNode><UiNode as="option" value="Veneer">Lamine / Veneer</UiNode><UiNode as="option" value="Inlay / Onlay">Inlay / Onlay</UiNode><UiNode as="option" value="Implant Crown">İmplant Üstü Kron</UiNode><UiNode as="option" value="Night Guard">Gece Plağı</UiNode><UiNode as="option" value="Other">Diğer</UiNode></UiNode></Field>
          <ToothChart selected={caseForm.toothCodes.split(/[,\s]+/).filter(Boolean)} plan={caseForm.toothPlan} disabled={savingCase} onChange={(codes, plan) => setCaseForm(x => ({ ...x, toothCodes: codes.join(', '), toothPlan: plan, caseType: plan.links.length ? 'Bridge' : x.caseType }))}/>

          <Field label="Materyal"><UiNode as="input" value={caseForm.material} onChange={e => setCaseForm(x => ({ ...x, material: e.target.value }))} style={ui.input}/></Field>
          <Field label={uiText("Renk")}><UiNode as="input" value={caseForm.shade} onChange={e => setCaseForm(x => ({ ...x, shade: e.target.value }))} style={ui.input}/></Field>
          <Field label="Termin"><UiNode as="input" type="date" value={caseForm.dueDate} onChange={e => setCaseForm(x => ({ ...x, dueDate: e.target.value }))} style={ui.input}/></Field>
          <Field label={uiText("Öncelik")}><UiNode as="select" value={caseForm.priority} onChange={e => setCaseForm(x => ({ ...x, priority: e.target.value as CaseForm["priority"] }))} style={ui.input}><UiNode as="option" value="normal">{uiText("Normal")}</UiNode><UiNode as="option" value="high">Yüksek</UiNode><UiNode as="option" value="urgent">{uiText("Acil")}</UiNode><UiNode as="option" value="low">Düşük</UiNode></UiNode></Field>
          <Field label="Klinik not" wide><UiNode as="textarea" value={caseForm.clinicalNotes} onChange={e => setCaseForm(x => ({ ...x, clinicalNotes: e.target.value }))} style={ui.textarea}/></Field>
        </UiNode>
        <UiNode as="div" style={ui.modalActions}><UiNode as="button" type="button" onClick={() => setCasePatient(null)} style={ui.secondaryButton}>Vazgeç</UiNode><UiNode as="button" type="button" disabled={savingCase} onClick={() => void createCase()} style={ui.primaryButton}>{savingCase ? "Oluşturuluyor…" : "Vakayı Oluştur"}</UiNode></UiNode>
      </UiNode>
    </UiNode>}
  </UiNode>;
}
function Field({ label, children, wide = false }: {
    label: string;
    children: React.ReactNode;
    wide?: boolean;
}) {
    const { t: uiText } = useTranslation();
    return <UiNode as="label" style={{ ...ui.field, gridColumn: wide ? "1 / -1" : undefined }}><UiNode as="span">{uiText(label)}</UiNode>{children}</UiNode>;
}
function Stat({ label, value, detail }: {
    label: string;
    value: number;
    detail: string;
}) {
    const { t: uiText } = useTranslation();
    return <UiNode as="div" style={ui.stat}><UiNode as="span">{uiText(label)}</UiNode><UiNode as="strong">{value}</UiNode><UiNode as="small">{detail}</UiNode></UiNode>;
}
function Mini({ label, value }: {
    label: string;
    value: string;
}) { return <UiNode as="div" style={ui.mini}><UiNode as="span">{label}</UiNode><UiNode as="strong">{value}</UiNode></UiNode>; }
function initials(p: Patient) { return `${p.first_name[0] ?? ""}${p.last_name[0] ?? ""}`.toUpperCase(); }
function shortDate(value: string, localeTag: string = "tr-TR") { try {
    return new Intl.DateTimeFormat(localeTag, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}
catch {
    return value;
} }
const ui: Record<string, CSSProperties> = {
    page: { minHeight: "100vh", padding: "24px clamp(18px,4vw,52px) 60px", background: dy.bg, color: dy.text, fontFamily: "Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", fontSize: 15 },
    center: { width: "min(760px,100%)", margin: "100px auto", padding: 28, border: `1px solid ${dy.border}`, borderRadius: dy.radius, background: dy.surface, backdropFilter: dy.backdrop, textAlign: "center" },
    header: { maxWidth: 1460, margin: "0 auto 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24 },
    back: { color: dy.muted, textDecoration: "none", fontSize: 13 }, eyebrow: { margin: "14px 0 7px", color: dy.accent, fontSize: 13, fontWeight: 900, letterSpacing: ".15em" },
    title: { margin: "0 0 10px", fontSize: "clamp(38px,5vw,60px)", lineHeight: 1, letterSpacing: "-.045em" }, subtitle: { maxWidth: 820, margin: 0, color: dy.muted, fontSize: 15, lineHeight: 1.65 }, muted: { color: dy.muted, lineHeight: 1.6 },
    headerActions: { display: "flex", gap: 8, flexWrap: "wrap" }, primaryButton: { minHeight: 42, padding: "0 14px", border: 0, borderRadius: 11, background: dy.accent, color: dy.accentContrast, fontWeight: 900, fontSize: 13, cursor: "pointer" }, secondaryButton: { minHeight: 42, padding: "0 14px", border: `1px solid ${dy.border}`, borderRadius: 11, background: dy.surface2, color: dy.text, fontWeight: 850, fontSize: 13, cursor: "pointer" }, primaryLink: { display: "inline-grid", placeItems: "center", minHeight: 42, padding: "0 14px", borderRadius: 11, background: dy.accent, color: dy.accentContrast, textDecoration: "none", fontWeight: 900, fontSize: 13 }, secondaryLink: { display: "inline-grid", placeItems: "center", minHeight: 42, padding: "0 14px", borderRadius: 11, border: `1px solid ${dy.border}`, background: dy.surface, color: dy.text, textDecoration: "none", fontWeight: 850, fontSize: 13 },
    notice: { maxWidth: 1460, margin: "0 auto 12px", padding: "12px 14px", borderRadius: 12, border: `1px solid ${dy.border}`, background: dy.surface2, color: dy.muted, fontSize: 13 },
    stats: { maxWidth: 1460, margin: "0 auto 12px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 9 }, stat: { minHeight: 105, padding: 15, display: "grid", alignContent: "space-between", gap: 5, borderRadius: 14, border: `1px solid ${dy.border}`, background: dy.surface, backdropFilter: dy.backdrop },
    toolbar: { maxWidth: 1460, margin: "0 auto 12px", padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, border: `1px solid ${dy.border}`, borderRadius: 14, background: dy.surface }, searchWrap: { minWidth: 0, flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "0 11px", border: `1px solid ${dy.border}`, borderRadius: 11, background: dy.input }, searchIcon: { color: dy.accent, fontSize: 20 }, search: { width: "100%", minHeight: 43, border: 0, outline: "none", background: "transparent", color: dy.text, fontSize: 14 }, resultText: { color: dy.muted, fontSize: 13, whiteSpace: "nowrap" },
    grid: { maxWidth: 1460, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(315px,1fr))", gap: 10 }, card: { minHeight: 310, padding: 17, display: "flex", flexDirection: "column", border: `1px solid ${dy.border}`, borderRadius: 16, background: dy.surface, backdropFilter: dy.backdrop }, cardTop: { display: "flex", alignItems: "center", gap: 12 }, avatar: { width: 50, height: 50, display: "grid", placeItems: "center", borderRadius: 15, background: dy.accentSoft, color: dy.accent, fontWeight: 900, fontSize: 16 }, cardName: { fontWeight: 900, fontSize: 18, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, ref: { color: dy.muted, fontSize: 13, marginTop: 3 }, demo: { padding: "5px 7px", borderRadius: 999, background: "#2d2413", color: "#e6c872", fontSize: 13, fontWeight: 900 }, contactLine: { marginTop: 15, display: "grid", gap: 5, color: dy.muted, fontSize: 13 }, patientMetrics: { marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }, mini: { minHeight: 66, padding: 9, display: "grid", alignContent: "space-between", gap: 5, borderRadius: 10, border: `1px solid ${dy.border}`, background: dy.input, fontSize: 13 }, note: { margin: "13px 0 0", padding: 10, borderRadius: 10, background: dy.surface2, color: dy.muted, fontSize: 13, lineHeight: 1.5 }, cardActions: { marginTop: "auto", paddingTop: 14, display: "grid", gridTemplateColumns: "1.2fr 1fr .8fr", gap: 6 }, actionPrimary: { minHeight: 40, display: "grid", placeItems: "center", borderRadius: 10, background: dy.accent, color: dy.accentContrast, textDecoration: "none", fontWeight: 900, fontSize: 13 }, action: { minHeight: 40, display: "grid", placeItems: "center", border: `1px solid ${dy.border}`, borderRadius: 10, background: dy.surface2, color: dy.text, textDecoration: "none", fontWeight: 850, fontSize: 13, cursor: "pointer" }, empty: { gridColumn: "1/-1", minHeight: 180, display: "grid", placeItems: "center", border: `1px dashed ${dy.border}`, borderRadius: 16, color: dy.muted },
    overlay: { position: "fixed", inset: 0, zIndex: 100, display: "grid", placeItems: "center", padding: 18, background: "rgba(0,0,0,.58)", backdropFilter: "blur(8px)" }, modal: { width: "min(820px,100%)", maxHeight: "92vh", overflowY: "auto", padding: 20, border: `1px solid ${dy.border}`, borderRadius: 18, background: dy.surface, color: dy.text, boxShadow: `0 28px 90px ${dy.shadow}` }, modalHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginBottom: 14 }, modalTitle: { margin: "4px 0 6px", fontSize: 28 }, close: { width: 38, height: 38, borderRadius: 10, border: `1px solid ${dy.border}`, background: dy.surface2, color: dy.text, fontSize: 22, cursor: "pointer" }, formGrid: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }, field: { display: "grid", gap: 5, color: dy.muted, fontSize: 13, fontWeight: 750 }, input: { width: "100%", minHeight: 43, padding: "0 11px", borderRadius: 10, border: `1px solid ${dy.border}`, background: dy.input, color: dy.text, outline: "none", fontSize: 14 }, textarea: { width: "100%", minHeight: 86, padding: 11, borderRadius: 10, border: `1px solid ${dy.border}`, background: dy.input, color: dy.text, outline: "none", resize: "vertical", fontSize: 14 }, advancedButton: { margin: "12px 0", minHeight: 38, padding: "0 11px", border: `1px solid ${dy.border}`, borderRadius: 10, background: dy.surface2, color: dy.muted, fontWeight: 800, cursor: "pointer" }, modalActions: { marginTop: 16, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 },
};
