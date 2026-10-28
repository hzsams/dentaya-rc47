"use client";
import { workflowText, type WorkflowMessage } from "@/lib/i18n/workflow-safety";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import UiMessage from "@/lib/i18n/UiMessage";
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useMemo, useRef, useState, type CSSProperties, } from "react";
import Link from "@/lib/i18n/UiLink";
import { useRouter } from "next/navigation";
import { appointmentDateTime, calendarFile, conflicts, dateKey, freeTimes, shiftDate, timeKey, weekDays } from '@/lib/appointment-planner';
import EmptyStateCard from "@/app/EmptyStateCard";
import ConnectionStatus from "@/app/ConnectionStatus";
import { dentayaError } from "@/lib/dentaya-errors";
import { supabase } from "@/lib/supabase";
import { requestIdentity, type RequestIdentity } from "@/lib/workflow-safety";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import { dy, useDentayaThemeRuntime } from "@/app/dentaya-theme";
type Org = {
    id: string;
    name: string;
    org_type: "clinic" | "laboratory" | "courier";
};
type Patient = {
    id: string;
    external_ref: string | null;
    first_name: string;
    last_name: string;
};
type Appointment = {
    id: string;
    organization_id: string;
    patient_id: string;
    appointment_type: string;
    scheduled_at: string;
    duration_minutes: number;
    status: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
};
type Form = {
    patientId: string;
    type: string;
    date: string;
    time: string;
    duration: string;
    notes: string;
};
const EMPTY: Form = { patientId: "", type: "Kontrol", date: "", time: "10:00", duration: "30", notes: "" };
export default function AppointmentsPage() {
    const { t: uiText, intlLocale, locale } = useTranslation();
    useDentayaThemeRuntime();
    const copy = (source: WorkflowMessage, values?: readonly string[]) => workflowText(locale, source, values);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [org, setOrg] = useState<Org | null>(null);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [form, setForm] = useState<Form>(EMPTY);
    const [formBaseline,setFormBaseline]=useState(JSON.stringify(EMPTY));
    const [selectedDay, setSelectedDay] = useState(dateKey);
    const [editing, setEditing] = useState<Appointment | null>(null);
    const [query, setQuery] = useState('');
    const loadSequence = useRef(0);
    const [showCreate, setShowCreate] = useState(false);
    const [view, setView] = useState<"upcoming" | "today" | "all">("today");
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);
    const createLock = useRef(false);
    const modalRef = useRef<HTMLElement | null>(null);
    const appointmentRequestId = useRef<RequestIdentity | null>(null);
    const formOpen=useRef(false),formVersion=useRef(0),pageLive=useRef(true),activeScope=useRef('');
    const closeFormRef=useRef<()=>void>(()=>{});
    const dirty=showCreate&&JSON.stringify(form)!==formBaseline;
    useUnsavedChanges(dirty,locale);
    useEffect(() => {
        pageLive.current=true;
        async function init() {
            const { data: auth } = await supabase.auth.getSession();
            if(!pageLive.current)return;
            const user = auth.session?.user;
            if (!user) {
                router.replace("/workspace");
                return;
            }
            const { data: membership } = await supabase.from("memberships").select("organization_id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
            if(!pageLive.current)return;
            if (!membership) {
                setNotice("Aktif kurum bulunamadı.");
                setLoading(false);
                return;
            }
            const { data: orgData } = await supabase.from("organizations").select("id,name,org_type").eq("id", membership.organization_id).maybeSingle();
            if (!orgData) {
                setNotice("Kurum bilgisi alınamadı.");
                setLoading(false);
                return;
            }
            const current = orgData as Org;
            if(!pageLive.current)return;
            activeScope.current=current.id;
            setOrg(current);
            if (current.org_type !== "clinic") {
                setLoading(false);
                return;
            }
            await load(current.id);
            setLoading(false);
        }
        void init();
        return ()=>{pageLive.current=false;activeScope.current='';};
    }, [router]);
    useEffect(() => {
        function recover() {
            if (org?.org_type === "clinic") {
                void load(org.id, selectedDay);
            }
        }
        window.addEventListener("dentaya-network-restored", recover);
        return () => window.removeEventListener("dentaya-network-restored", recover);
    }, [org, selectedDay]);
    useEffect(() => {
        if (org?.org_type === 'clinic')
            void load(org.id, selectedDay);
    }, [org, selectedDay]);
    function openForm(appointment:Appointment|null,time?:string) {
        if(createLock.current||formOpen.current)return;
        const next:Form=appointment?{patientId:appointment.patient_id,type:appointment.appointment_type,date:dateKey(new Date(appointment.scheduled_at)),time:timeKey(appointment.scheduled_at),duration:String(appointment.duration_minutes),notes:appointment.notes??''}:{...EMPTY,date:selectedDay,patientId:patients[0]?.id??'',...(time?{time}:{})};
        formOpen.current=true;formVersion.current++;appointmentRequestId.current=null;
        setEditing(appointment);setForm(next);setFormBaseline(JSON.stringify(next));setNotice('');setShowCreate(true);
    }
    function openCreate() {openForm(null);}
    function edit(a: Appointment) {openForm(a);}
    function closeForm() {
        if(createLock.current)return;
        if(dirty&&!window.confirm(copy('Kaydedilmemiş değişiklikler var. Bu ekrandan ayrılmak istiyor musunuz?')))return;
        formOpen.current=false;formVersion.current++;setShowCreate(false);
    }
    useEffect(()=>{closeFormRef.current=closeForm;});
    function downloadCalendar(a: Appointment) { const url = URL.createObjectURL(new Blob([calendarFile(a)], { type: 'text/calendar' })); const link = document.createElement('a'); link.href = url; link.download = 'DentAYA-Randevu.ics'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    async function load(orgId: string, day = dateKey()) {
        const seq = ++loadSequence.current;
        const days = weekDays(day);
        const [pr, ar] = await Promise.all([
            supabase.from("patients").select("id,external_ref,first_name,last_name").eq("owning_org_id", orgId).order("first_name").limit(300),
            supabase.from("appointments").select("id,organization_id,patient_id,appointment_type,scheduled_at,duration_minutes,status,notes,created_at,updated_at").eq("organization_id", orgId).gte("scheduled_at", new Date(`${days[0]}T00:00:00`).toISOString()).lt("scheduled_at", new Date(`${shiftDate(days[6], 1)}T00:00:00`).toISOString()).order("scheduled_at", { ascending: true }).limit(1000),
        ]);
        if (seq !== loadSequence.current||!pageLive.current)
            return;
        if (pr.error || ar.error) {
            setNotice(dentayaError(pr.error ?? ar.error, "Randevular yüklenemedi."));
            return;
        }
        const ps = (pr.data ?? []) as Patient[];
        setPatients(ps);
        setAppointments((ar.data ?? []) as Appointment[]);
        if(!formOpen.current)setForm(x => ({ ...x, patientId: x.patientId || ps[0]?.id || "" }));
    }
    const patientMap = useMemo(() => new Map(patients.map(x => [x.id, x])), [patients]);
    const todayStart = new Date(`${selectedDay}T00:00:00`);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const visible = appointments.filter(a => `${patientMap.get(a.patient_id)?.first_name ?? ''} ${patientMap.get(a.patient_id)?.last_name ?? ''} ${a.appointment_type}`.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))).filter(a => view === "all" ? true : view === "today" ? (new Date(a.scheduled_at) >= todayStart && new Date(a.scheduled_at) < tomorrow) : new Date(a.scheduled_at) >= new Date());
    const todayCount = appointments.filter(a => new Date(a.scheduled_at) >= todayStart && new Date(a.scheduled_at) < tomorrow).length;
    const upcoming = appointments.filter(a => new Date(a.scheduled_at) >= new Date() && ['scheduled', 'confirmed'].includes(a.status)).length;
    const completed = appointments.filter(a => a.status === "completed").length;
    async function create() {
        if (!org || createLock.current||!formOpen.current)
            return;
        if (!form.patientId || !patients.some(patient => patient.id === form.patientId)) {
            setNotice("Önce hasta seç.");
            return;
        }
        if (!form.date || !form.time) {
            setNotice("Randevu tarihi ve saati zorunlu.");
            return;
        }
        const duration = Number(form.duration);
        if (!Number.isInteger(duration) || duration < 5 || duration > 480) {
            setNotice("Randevu süresi 5 ile 480 dakika arasında olmalı.");
            return;
        }
        const scheduled = appointmentDateTime(form.date, form.time);
        if (!scheduled) {
            setNotice("Geçerli bir randevu tarihi ve saati seç.");
            return;
        }
        if (!editing && scheduled.getTime() < Date.now() - 5 * 60 * 1000) {
            setNotice("Yeni randevu geçmiş bir saate oluşturulamaz.");
            return;
        }
        if (form.type.trim().length > 120) {
            setNotice("Randevu türü 120 karakterden uzun olamaz.");
            return;
        }
        if (form.notes.trim().length > 2000) {
            setNotice("Randevu notu 2000 karakterden uzun olamaz.");
            return;
        }
        createLock.current = true;
        const submittedVersion=formVersion.current,submittedScope=org.id;
        const current=()=>pageLive.current&&activeScope.current===submittedScope&&formVersion.current===submittedVersion&&formOpen.current;
        const identity = requestIdentity(appointmentRequestId.current, { org: org.id, editing: editing?.id, form });
        appointmentRequestId.current = identity;
        const requestId = identity.id;
        setBusy(true);
        setNotice("");
        try {
        const nearby = await supabase.from('appointments').select('id,patient_id,scheduled_at,duration_minutes,status').eq('organization_id', org.id).eq('patient_id', form.patientId).gte('scheduled_at', new Date(+scheduled - 480 * 60000).toISOString()).lt('scheduled_at', new Date(+scheduled + duration * 60000).toISOString());
        if(!current())return;
        if (nearby.error || ((!editing || ['scheduled', 'confirmed'].includes(editing.status)) && conflicts(nearby.data ?? [], { id: editing?.id ?? '', patient_id: form.patientId, scheduled_at: scheduled.toISOString(), duration_minutes: duration, status: 'scheduled' }).length)) {
            setNotice(nearby.error ? dentayaError(nearby.error) : 'Bu hastanın bu saatlerde başka aktif randevusu var. Saati değiştirin.');
            return;
        }
        const payload = { appointment_type: form.type.trim() || 'Kontrol', scheduled_at: scheduled.toISOString(), duration_minutes: duration, notes: form.notes.trim() || null };
        const result = editing ? await supabase.from('appointments').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id).eq('organization_id', org.id).eq('updated_at', editing.updated_at).select('id') : await supabase.from('appointments').insert({ ...payload, organization_id: org.id, patient_id: form.patientId, status: 'scheduled', client_request_id: requestId });
        if(!current())return;
        if (editing && !result.error && !result.data?.length) {
            setNotice('Kayıt başka bir oturumda değiştirildi. Takvimi yenileyin.');
            return;
        }
        let error = result.error;
        if (!editing && error?.code === "23505") {
            const existing = await supabase.from("appointments")
                .select("id")
                .eq("organization_id", org.id)
                .eq("client_request_id", requestId)
                .maybeSingle();
            if(!current())return;
            if (existing.data)
                error = null;
        }
        if (error) {
            setNotice(dentayaError(error));
            return;
        }
        appointmentRequestId.current = null;
        formOpen.current=false;formVersion.current++;
        setShowCreate(false);
        setForm({ ...EMPTY, patientId: patients[0]?.id ?? "" });
        setSelectedDay(form.date);
        await load(org.id, form.date);
        if(pageLive.current&&activeScope.current===submittedScope)setNotice(editing ? "Randevu güncellendi." : "Randevu oluşturuldu.");
        } catch (error) {
            if(current())setNotice(dentayaError(error));
        } finally {
            if(pageLive.current)setBusy(false);
            createLock.current = false;
        }
    }
    useEffect(() => {
        if (!showCreate)
            return;
        const previous = document.activeElement as HTMLElement | null;
        const el = modalRef.current;
        const focusable = () => Array.from(el?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]') ?? []);
        (focusable()[0]??el)?.focus();
        const key = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeFormRef.current();
            }
            if (e.key === 'Tab') {
                const nodes = focusable(), first = nodes[0], last = nodes[nodes.length - 1];
                if(!nodes.length){e.preventDefault();el?.focus();}
                else if (e.shiftKey && (document.activeElement === first||document.activeElement===el||!el?.contains(document.activeElement))) {
                    e.preventDefault();
                    last?.focus();
                }
                else if (!e.shiftKey && (document.activeElement === last||!el?.contains(document.activeElement))) {
                    e.preventDefault();
                    first?.focus();
                }
            }
        };
        document.addEventListener('keydown', key);
        return () => { document.removeEventListener('keydown', key); if(previous?.isConnected)previous.focus(); };
    }, [showCreate]);
    // Disabling the focused field blurs it to the page body. Keep the pending
    // commit inside its dialog without rerunning the open/close focus lifecycle.
    useEffect(() => {
        if(showCreate&&busy)modalRef.current?.focus();
    }, [showCreate,busy]);
    async function setStatus(id: string, status: string) {
        if (!org || createLock.current)
            return;
        if (status === 'cancelled' && !window.confirm(uiText('Randevuyu iptal etmek istiyor musunuz?')))
            return;
        createLock.current = true;
        setBusy(true);
        const appointment = appointments.find(row => row.id === id);
        try {
            if (!appointment || !['scheduled', 'confirmed'].includes(appointment.status)) {
                setNotice(copy("Randevu artık aktif değil. Takvimi yenileyin."));
                return;
            }
            const { data, error } = await supabase.from("appointments")
                .update({ status, updated_at: new Date().toISOString() })
                .eq("id", id).eq("organization_id", org.id).eq("updated_at", appointment.updated_at).select("id");
            if (error) {
                setNotice(dentayaError(error));
                return;
            }
            if (!data?.length) {
                setNotice(copy("Randevu başka bir oturumda değiştirildi veya işlem yetkiniz yok. Takvimi yenileyin."));
                return;
            }
            await load(org.id, selectedDay);
        } catch (error) {
            setNotice(dentayaError(error));
        } finally {
            setBusy(false);
            createLock.current = false;
        }
    }
    if (loading) return <LoadingExperience title="Randevular yükleniyor…"/>;
    if (org?.org_type !== "clinic")
        return <UiNode as="main" style={ui.page}><UiNode as="div" style={ui.center}><UiNode as="h1">Randevular klinik modülüdür.</UiNode><Link href={org?.org_type === "laboratory" ? "/lab" : "/"} style={ui.primaryLink}>Çalışma alanına dön</Link></UiNode></UiNode>;
    return <UiNode as="main" style={ui.page}>
    <ConnectionStatus />
    <style>{`*{box-sizing:border-box}.apt-row{transition:transform var(--dy-motion-fast,150ms),border-color var(--dy-motion-fast,150ms)}.apt-row:hover{transform:translateY(-2px);border-color:var(--dy-accent,#6de2cf)!important}@media(max-width:850px){.apt-head{flex-direction:column!important;align-items:flex-start!important}.apt-stats{grid-template-columns:repeat(2,minmax(0,1fr))!important}.apt-grid{grid-template-columns:1fr!important}}@media(max-width:560px){.apt-stats{grid-template-columns:1fr!important}.apt-head>div:last-child{width:100%!important}.apt-head>div:last-child a,.apt-head>div:last-child button{flex:1 1 100%!important}.apt-card{grid-template-columns:1fr!important}.apt-card-actions{grid-template-columns:1fr!important}}`}</style>
    <UiNode as="header" className="apt-head" style={ui.header}><UiNode as="div"><Link href="/clinic" style={ui.back}>← Klinik Merkezi</Link><UiNode as="p" style={ui.eyebrow}>KLİNİK TAKVİMİ</UiNode><UiNode as="h1" style={ui.title}>{uiText("Randevular")}</UiNode><UiNode as="p" style={ui.subtitle}>Hastanın klinik randevusunu oluştur, günün planını gör ve tamamlanan işlemleri tek ekranda takip et.</UiNode></UiNode><UiNode as="div" style={ui.headerActions}><Link href="/patients" style={ui.secondaryLink}>{uiText("Hastalar")}</Link><UiNode as="button" type="button" disabled={busy} onClick={openCreate} style={ui.primaryButton}>+ Randevu Ekle</UiNode></UiNode></UiNode>
    {notice && <UiNode as="div" style={ui.notice}>{notice}</UiNode>}
    <UiNode as="section" className="apt-stats" style={ui.stats}><Stat label="Seçilen gün" value={todayCount} detail="planlanan"/><Stat label="Yaklaşan" value={upcoming} detail="aktif randevu"/><Stat label="Tamamlanan" value={completed} detail={uiText("toplam")}/><Stat label={uiText("Hasta")} value={patients.length} detail="klinik kaydı"/></UiNode>
    <UiNode as="section" style={ui.toolbar}><UiNode as="div" style={ui.tabs}>{(["upcoming", "today", "all"] as const).map(x => <UiNode as="button" type="button" key={x} onClick={() => setView(x)} style={{ ...ui.tab, background: view === x ? dy.accent : dy.surface2, color: view === x ? dy.accentContrast : dy.text }}>{x === "upcoming" ? "Yaklaşan" : x === "today" ? "Seçilen gün" : "Bu hafta"}</UiNode>)}</UiNode><UiNode as="span" style={ui.count}>{visible.length} randevu</UiNode></UiNode>
    <UiNode as="section" className="planner-toolbar"><UiNode as="button" aria-label="Önceki hafta" onClick={() => setSelectedDay(shiftDate(selectedDay, -7))}>←</UiNode><UiNode as="button" onClick={() => { setSelectedDay(dateKey()); setView('today'); }}>{uiText("Bugün")}</UiNode><UiNode as="label">Randevu günü<UiNode as="input" type="date" value={selectedDay} onChange={e => {
            if (e.target.value) {
                setSelectedDay(e.target.value);
                setView('today');
            }
        }}/></UiNode><UiNode as="button" aria-label="Sonraki hafta" onClick={() => setSelectedDay(shiftDate(selectedDay, 7))}>→</UiNode><UiNode as="input" aria-label="Hasta veya işlem ara" placeholder="Hasta / işlem ara…" value={query} onChange={e => setQuery(e.target.value)}/><Link href="/training">Demo hastalar</Link></UiNode>
    <UiNode as="section" className="planner-week">{weekDays(selectedDay).map(day => <UiNode as="button" key={day} aria-pressed={selectedDay === day} onClick={() => { setSelectedDay(day); setView('today'); }}><UiNode as="span">{new Date(`${day}T12:00:00`).toLocaleDateString(intlLocale(), { weekday: 'short' })}</UiNode><UiNode as="strong">{day.slice(-2)}</UiNode><UiNode as="small">{appointments.filter(a => dateKey(new Date(a.scheduled_at)) === day && ['scheduled', 'confirmed'].includes(a.status)).length} {uiText(" aktif")}</UiNode></UiNode>)}</UiNode>
    <UiNode as="details" className="planner-openings"><UiNode as="summary">Seçilen günün 30 dakikalık boş aralıkları</UiNode><UiNode as="p">09.00–18.00 arası tüm klinik takviminde boş görünen saatler. Hekim/koltuk bazlı kapasite değildir. Saat dilimi: {Intl.DateTimeFormat().resolvedOptions().timeZone}.</UiNode>{freeTimes(appointments, selectedDay).map(t => <UiNode as="button" key={t} disabled={busy} onClick={() => openForm(null,t)}>{t}</UiNode>)}</UiNode>
    <UiNode as="section" className="apt-grid" style={ui.grid}>
      {visible.map(a => {
            const p = patientMap.get(a.patient_id);
            return <UiNode as="article" key={a.id} className="apt-row" style={ui.card}>
        <UiNode data-dy-copy-stack as="div" style={ui.timeBox}><UiNode as="strong">{timeOnly(a.scheduled_at, intlLocale())}</UiNode><UiNode as="span">{dateOnly(a.scheduled_at, intlLocale())}</UiNode></UiNode>
        <UiNode as="div" style={ui.cardMain}><UiNode as="div" style={ui.cardTop}><UiNode data-dy-copy-stack as="div"><UiNode as="strong" style={ui.patientName}>{p ? <UiMessage source="{0} {1}" values={[p.first_name, p.last_name]} userValues={[0, 1]}/> : uiText("Hasta")}</UiNode><UiNode as="span" style={ui.ref}>{p?.external_ref ?? ""}</UiNode></UiNode><UiNode as="span" style={ui.status}>{statusLabel(a.status)}</UiNode></UiNode><UiNode as="h3" style={ui.type}>{a.appointment_type}</UiNode><UiNode as="div" style={ui.meta}><UiNode as="span">{a.duration_minutes} dk</UiNode>{a.notes && <UiNode as="span">{a.notes}</UiNode>}</UiNode></UiNode>
        <UiNode as="div" className="apt-card-actions" style={ui.cardActions}><UiNode as="button" disabled={busy} type="button" onClick={() => edit(a)} style={ui.action}>Tarih / saat değiştir</UiNode><UiNode as="button" type="button" onClick={() => downloadCalendar(a)} style={ui.action}>Takvime indir</UiNode>{a.status === 'scheduled' && <UiNode as="button" disabled={busy} type="button" onClick={() => void setStatus(a.id, 'confirmed')} style={ui.action}>{uiText("Onaylandı")}</UiNode>}{['scheduled', 'confirmed'].includes(a.status) && <UiNode as="button" disabled={busy} type="button" onClick={() => void setStatus(a.id, 'no_show')} style={ui.action}>Gelmedi</UiNode>}<Link href={p?.external_ref?.startsWith("DENTAYA-TRAINING-") ? `/training?case=${encodeURIComponent(p.external_ref.replace("DENTAYA-TRAINING-", ""))}` : `/scans?patient=${a.patient_id}`} style={ui.action}>Hasta Taramaları</Link>{["scheduled", "confirmed"].includes(a.status) && <UiNode as="button" disabled={busy} type="button" onClick={() => void setStatus(a.id, "completed")} style={ui.actionPrimary}>{uiText("Tamamlandı")}</UiNode>}{["scheduled", "confirmed"].includes(a.status) && <UiNode as="button" disabled={busy} type="button" onClick={() => void setStatus(a.id, "cancelled")} style={ui.action}>{uiText("İptal")}</UiNode>}</UiNode>
      </UiNode>;
        })}
      {!visible.length && (appointments.length === 0
            ? <UiNode as="div" style={{ gridColumn: "1/-1" }}><EmptyStateCard eyebrow="KLİNİK TAKVİMİ" title="İlk randevunu oluştur" description="Hasta seç, tarih ve saati belirle. Randevu tamamlandığında hasta taramalarına ve vaka akışına geçebilirsin." actionLabel="+ Randevu Ekle" onAction={openCreate} secondaryLabel="Hastalar" secondaryHref="/patients"/></UiNode>
            : <UiNode as="div" style={{ gridColumn: "1/-1" }}><EmptyStateCard eyebrow={uiText("TAKVİM")} title="Bu görünümde randevu yok" description="Farklı bir zaman filtresi seçebilir veya tüm randevuları görüntüleyebilirsin." actionLabel="Tümünü Göster" onAction={() => setView("all")}/></UiNode>)}
    </UiNode>

    {showCreate && <UiNode as="div" style={ui.overlay} onMouseDown={closeForm}><UiNode as="section" ref={modalRef} role="dialog" aria-modal="true" aria-label="Randevu formu" tabIndex={-1} style={ui.modal} onMouseDown={e => e.stopPropagation()}><UiNode as="div" style={ui.modalHead}><UiNode as="div"><UiNode as="p" style={ui.eyebrow}>{editing ? "RANDEVU DÜZENLE" : uiText("YENİ RANDEVU")}</UiNode><UiNode as="h2" style={ui.modalTitle}>{editing ? "Tarih ve saati değiştir" : "Takvime ekle"}</UiNode></UiNode><UiNode as="button" type="button" disabled={busy} onClick={closeForm} style={ui.close}>×</UiNode></UiNode><UiNode as="fieldset" disabled={busy} style={{...ui.formGrid,border:0,padding:0,margin:0,minWidth:0}}>
      <Field label={uiText("Hasta")}><UiNode as="select" disabled={Boolean(editing)} value={form.patientId} onChange={e => setForm(x => ({ ...x, patientId: e.target.value }))} style={ui.input}>{patients.map(p => <UiNode as="option" key={p.id} value={p.id}><UserText>{p.first_name}</UserText> <UserText>{p.last_name}</UserText> · {p.external_ref}</UiNode>)}</UiNode></Field>
      <Field label="Randevu tipi"><UiNode as="input" list="appointment-types" maxLength={120} value={form.type} onChange={e => setForm(x => ({ ...x, type: e.target.value }))} style={ui.input}/></Field>
      <UiNode as="datalist" id="appointment-types">{["Kontrol", "Dijital tarama", "Preparasyon", "Kapşon provası", "Altyapı provası", "İmplant üstü prova", "Total protez prova", "Teslim"].map(t => <UiNode as="option" key={t} value={t}/>)}</UiNode><Field label={uiText("Tarih")}><UiNode as="input" type="date" value={form.date} onChange={e => setForm(x => ({ ...x, date: e.target.value }))} style={ui.input}/></Field>
      <Field label={uiText("Saat")}><UiNode as="input" type="time" value={form.time} onChange={e => setForm(x => ({ ...x, time: e.target.value }))} style={ui.input}/></Field>
      <Field label="Süre (dk)"><UiNode as="input" type="number" min={5} max={480} step={5} value={form.duration} onChange={e => setForm(x => ({ ...x, duration: e.target.value }))} style={ui.input}/></Field>
      <Field label="Not" wide><UiNode as="textarea" value={form.notes} onChange={e => setForm(x => ({ ...x, notes: e.target.value }))} style={ui.textarea}/></Field>
    </UiNode>{notice && <UiNode as="p" role="alert">{notice}</UiNode>}<UiNode as="div" style={ui.modalActions}><UiNode as="button" type="button" disabled={busy} onClick={closeForm} style={ui.secondaryButton}>Vazgeç</UiNode><UiNode as="button" type="button" disabled={busy} onClick={() => void create()} style={ui.primaryButton}>{busy ? uiText("Kaydediliyor…") : "Randevuyu Kaydet"}</UiNode></UiNode></UiNode></UiNode>}
  </UiNode>;
}
function Field({ label, children, wide = false }: {
    label: string;
    children: React.ReactNode;
    wide?: boolean;
}) {
    const { t: uiText } = useTranslation();
    return <UiNode as="label" style={{ ...ui.field, gridColumn: wide ? "1/-1" : undefined }}><UiNode as="span">{uiText(label)}</UiNode>{children}</UiNode>;
}
function Stat({ label, value, detail }: {
    label: string;
    value: number;
    detail: string;
}) {
    const { t: uiText } = useTranslation();
    return <UiNode as="div" style={ui.stat}><UiNode as="span">{uiText(label)}</UiNode><UiNode as="strong">{value}</UiNode><UiNode as="small">{detail}</UiNode></UiNode>;
}
function dateOnly(v: string, localeTag: string = "tr-TR") { return new Intl.DateTimeFormat(localeTag, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(v)); }
function timeOnly(v: string, localeTag: string = "tr-TR") { return new Intl.DateTimeFormat(localeTag, { hour: "2-digit", minute: "2-digit" }).format(new Date(v)); }
function statusLabel(v: string) { return { scheduled: "Planlandı", confirmed: "Onaylandı", completed: "Tamamlandı", cancelled: "İptal", no_show: "Gelmedi" }[v] ?? v; }
const ui: Record<string, CSSProperties> = {
    page: { minHeight: "100vh", padding: "24px clamp(18px,4vw,52px) 60px", background: dy.bg, color: dy.text, fontFamily: "Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", fontSize: 15 }, center: { width: "min(760px,100%)", margin: "100px auto", padding: 28, border: `1px solid ${dy.border}`, borderRadius: dy.radius, background: dy.surface, textAlign: "center" }, header: { maxWidth: 1380, margin: "0 auto 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24 }, back: { color: dy.muted, textDecoration: "none", fontSize: 13 }, eyebrow: { margin: "14px 0 7px", color: dy.accent, fontSize: 13, fontWeight: 900, letterSpacing: ".15em" }, title: { margin: "0 0 9px", fontSize: "clamp(38px,5vw,58px)", letterSpacing: "-.045em" }, subtitle: { maxWidth: 800, margin: 0, color: dy.muted, fontSize: 15, lineHeight: 1.65 }, headerActions: { display: "flex", gap: 8, flexWrap: "wrap" }, primaryButton: { minHeight: 42, padding: "0 14px", border: 0, borderRadius: 11, background: dy.accent, color: dy.accentContrast, fontWeight: 900, fontSize: 13, cursor: "pointer" }, secondaryButton: { minHeight: 42, padding: "0 14px", border: `1px solid ${dy.border}`, borderRadius: 11, background: dy.surface2, color: dy.text, fontWeight: 850, fontSize: 13, cursor: "pointer" }, primaryLink: { display: "inline-grid", placeItems: "center", minHeight: 42, padding: "0 14px", borderRadius: 11, background: dy.accent, color: dy.accentContrast, textDecoration: "none", fontWeight: 900 }, secondaryLink: { display: "inline-grid", placeItems: "center", minHeight: 42, padding: "0 14px", borderRadius: 11, border: `1px solid ${dy.border}`, background: dy.surface, color: dy.text, textDecoration: "none", fontWeight: 850, fontSize: 13 }, notice: { maxWidth: 1380, margin: "0 auto 12px", padding: "12px 14px", border: `1px solid ${dy.border}`, borderRadius: 12, background: dy.surface2, color: dy.muted, fontSize: 13 }, stats: { maxWidth: 1380, margin: "0 auto 12px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 9 }, stat: { minHeight: 104, padding: 15, display: "grid", alignContent: "space-between", gap: 5, border: `1px solid ${dy.border}`, borderRadius: 14, background: dy.surface }, toolbar: { maxWidth: 1380, margin: "0 auto 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }, tabs: { display: "flex", gap: 6 }, tab: { minHeight: 38, padding: "0 11px", border: `1px solid ${dy.border}`, borderRadius: 10, fontWeight: 850, fontSize: 13, cursor: "pointer" }, count: { color: dy.muted, fontSize: 13 }, grid: { maxWidth: 1380, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(310px,1fr))", gap: 10 }, card: { minHeight: 270, padding: 16, display: "grid", gridTemplateColumns: "90px minmax(0,1fr)", gridTemplateRows: "1fr auto", gap: 14, border: `1px solid ${dy.border}`, borderRadius: 15, background: dy.surface }, timeBox: { width: 82, height: 82, display: "grid", placeItems: "center", alignContent: "center", gap: 3, borderRadius: 15, background: dy.accentSoft, color: dy.accent }, cardMain: { minWidth: 0 }, cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }, patientName: { fontSize: 16 }, ref: { display: "block", marginTop: 3, color: dy.muted, fontSize: 13 }, status: { padding: "5px 7px", borderRadius: 999, background: dy.accentSoft, color: dy.accent, fontSize: 13, fontWeight: 900 }, type: { margin: "15px 0 7px", fontSize: 19 }, meta: { display: "grid", gap: 5, color: dy.muted, fontSize: 13 }, cardActions: { gridColumn: "1/-1", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }, action: { minHeight: 39, display: "grid", placeItems: "center", border: `1px solid ${dy.border}`, borderRadius: 10, background: dy.surface2, color: dy.text, textDecoration: "none", fontSize: 13, fontWeight: 850, cursor: "pointer" }, actionPrimary: { minHeight: 39, display: "grid", placeItems: "center", border: 0, borderRadius: 10, background: dy.accent, color: dy.accentContrast, fontSize: 13, fontWeight: 900, cursor: "pointer" }, empty: { gridColumn: "1/-1", minHeight: 180, display: "grid", placeItems: "center", border: `1px dashed ${dy.border}`, borderRadius: 15, color: dy.muted }, overlay: { position: "fixed", inset: 0, zIndex: 100, display: "grid", placeItems: "center", padding: 18, background: "rgba(0,0,0,.58)", backdropFilter: "blur(8px)" }, modal: { width: "min(720px,100%)", padding: 20, border: `1px solid ${dy.border}`, borderRadius: 18, background: dy.surface, boxShadow: `0 28px 90px ${dy.shadow}` }, modalHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }, modalTitle: { margin: "4px 0 0", fontSize: 28 }, close: { width: 38, height: 38, borderRadius: 10, border: `1px solid ${dy.border}`, background: dy.surface2, color: dy.text, fontSize: 22, cursor: "pointer" }, formGrid: { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }, field: { display: "grid", gap: 5, color: dy.muted, fontSize: 13, fontWeight: 750 }, input: { minHeight: 43, padding: "0 11px", borderRadius: 10, border: `1px solid ${dy.border}`, background: dy.input, color: dy.text, fontSize: 14 }, textarea: { minHeight: 86, padding: 11, borderRadius: 10, border: `1px solid ${dy.border}`, background: dy.input, color: dy.text, resize: "vertical", fontSize: 14 }, modalActions: { marginTop: 15, display: "flex", justifyContent: "flex-end", gap: 8 },
};
