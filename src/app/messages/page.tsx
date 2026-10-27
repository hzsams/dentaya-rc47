"use client";
import { workflowText, type WorkflowMessage } from "@/lib/i18n/workflow-safety";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, } from "react";
import Link from "@/lib/i18n/UiLink";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
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
type Conversation = {
    id: string;
    clinic_org_id: string;
    lab_org_id: string;
    status: "active" | "archived";
    last_message_at: string;
    clinic_last_read_at: string | null;
    lab_last_read_at: string | null;
    created_at: string;
};
type Message = {
    id: string;
    conversation_id: string;
    sender_user_id: string | null;
    sender_org_id: string;
    sender_name: string | null;
    sender_role: string | null;
    body: string;
    context_case_id: string | null;
    demo_mode: boolean;
    created_at: string;
};
type CaseContext = {
    id: string;
    case_number: string;
    title: string;
    status: string;
    patient_reference: string;
};
const TEMPLATES = [
    "Tarama güncellendi, kontrol edebilir misiniz?",
    "Tasarım kliniğin incelemesine hazır olduğunda haber verebilir misiniz?",
    "Renk ve materyal bilgisini teyit edelim.",
    "Termin durumunu paylaşabilir misiniz?",
    "Revizyon notunu vaka üzerinden ilettim.",
];
export default function MessagesPage() {
    const { t: uiText, intlLocale, locale } = useTranslation();
    useDentayaThemeRuntime();
    const copy = (source: WorkflowMessage, values?: readonly string[]) => workflowText(locale, source, values);
    const router = useRouter();
    const historyRef = useRef<HTMLDivElement | null>(null);
    const pageRef = useRef<HTMLElement | null>(null);
    const shellRef = useRef<HTMLElement | null>(null);
    const sendLock = useRef(false);
    const messageRequestIds = useRef<Record<string, RequestIdentity>>({});
    const messageLoadSequence = useRef(0);
    const caseLoadSequence = useRef(0);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState("");
    const [userName, setUserName] = useState("");
    const [userRole, setUserRole] = useState("");
    const [org, setOrg] = useState<Org | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [orgMap, setOrgMap] = useState<Map<string, Org>>(new Map());
    const [selectedId, setSelectedId] = useState("");
    const [messagePage, setMessagePage] = useState<{ id: string; rows: Message[]; hasOlder: boolean }>({ id: "", rows: [], hasOlder: false });
    const [casePage, setCasePage] = useState<{ id: string; rows: CaseContext[] }>({ id: "", rows: [] });
    const [drafts, setDrafts] = useState<Record<string, { body: string; caseId: string }>>({});
    const [threadLoading, setThreadLoading] = useState(false);
    const threadReady = !threadLoading && messagePage.id === selectedId && casePage.id === selectedId;
    const messages = messagePage.id === selectedId ? messagePage.rows : [];
    const cases = useMemo(() => casePage.id === selectedId ? casePage.rows : [], [casePage, selectedId]);
    const draft = drafts[selectedId]?.body ?? "";
    const contextCaseId = drafts[selectedId]?.caseId ?? "";
    function setDraft(body: string) { setDrafts(current => ({ ...current, [selectedId]: { body, caseId: current[selectedId]?.caseId ?? "" } })); }
    function setContextCaseId(caseId: string) { setDrafts(current => ({ ...current, [selectedId]: { body: current[selectedId]?.body ?? "", caseId } })); }
    const [search, setSearch] = useState("");
    const [sending, setSending] = useState(false);
    const [notice, setNotice] = useState("");
    useUnsavedChanges(Object.values(drafts).some(item => !!item.body.trim()), locale);
    useEffect(() => {
        let active = true;
        let channel: RealtimeChannel | null = null;
        async function init() {
            const { data: auth } = await supabase.auth.getSession();
            const user = auth.session?.user;
            if (!user) {
                router.replace("/workspace");
                return;
            }
            setUserId(user.id);
            const [{ data: membership, error: membershipError }, { data: profile }] = await Promise.all([
                supabase.from("memberships").select("organization_id,role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle(),
                supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
            ]);
            if (membershipError || !membership) {
                setNotice(dentayaError(membershipError, "Aktif kurum bulunamadı."));
                setLoading(false);
                return;
            }
            setUserRole(membership.role ?? "member");
            setUserName(profile?.full_name || user.email?.split("@")[0] || "DentAYA User");
            const { data: orgData, error: orgError } = await supabase.from("organizations").select("id,name,org_type").eq("id", membership.organization_id).maybeSingle();
            if (orgError || !orgData) {
                setNotice(dentayaError(orgError, "Kurum bilgisi alınamadı."));
                setLoading(false);
                return;
            }
            const current = orgData as Org;
            if (current.org_type === "courier") {
                setOrg(current);
                setLoading(false);
                return;
            }
            if (!active)
                return;
            setOrg(current);
            await loadConversations();
            channel = supabase.channel(`org-conversations-mvp-${current.id}`)
                .on("postgres_changes", { event: "*", schema: "public", table: "organization_conversations" }, () => void loadConversations())
                .subscribe();
            setLoading(false);
        }
        void init();
        return () => { active = false; if (channel)
            void supabase.removeChannel(channel); };
    }, [router]);
    async function loadConversations() {
        const { data, error } = await supabase.from("organization_conversations")
            .select("id,clinic_org_id,lab_org_id,status,last_message_at,clinic_last_read_at,lab_last_read_at,created_at")
            .order("last_message_at", { ascending: false }).limit(120);
        if (error) {
            setNotice(dentayaError(error));
            return;
        }
        const rows = (data ?? []) as Conversation[];
        setConversations(rows);
        const ids = [...new Set(rows.flatMap(x => [x.clinic_org_id, x.lab_org_id]))];
        if (ids.length) {
            const { data: orgRows } = await supabase.from("organizations").select("id,name,org_type").in("id", ids);
            setOrgMap(new Map(((orgRows ?? []) as Org[]).map(x => [x.id, x])));
        }
        const requested = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("conversation") ?? "" : "";
        setSelectedId(currentId => rows.some(x => x.id === currentId) ? currentId : rows.some(x => x.id === requested) ? requested : (rows[0]?.id ?? ""));
    }
    useEffect(() => {
        if (!selectedId || !org)
            return;
        // Capture narrowed values once. `org` is React state and can become
        // nullable again from TypeScript's point of view inside async/realtime
        // closures, even after the guard above.
        const conversationId = selectedId;
        const currentOrg: Org = org;
        let active = true;
        let channel: RealtimeChannel | null = null;
        async function run() {
            const [loaded] = await Promise.all([
                loadMessages(conversationId),
                loadCasesForConversation(conversationId, currentOrg),
            ]);
            if (!active)
                return;
            if (loaded) void markRead(conversationId, currentOrg);
            channel = supabase
                .channel(`org-messages-mvp-${conversationId}`)
                .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "organization_messages",
                filter: `conversation_id=eq.${conversationId}`,
            }, payload => {
                if (!active) return;
                const row = payload.new as Message;
                setMessagePage(current => current.id !== conversationId || current.rows.some(x => x.id === row.id)
                    ? current
                    : { ...current, rows: [...current.rows, row].sort(messageOrder) });
                void markRead(conversationId, currentOrg);
            })
                .subscribe();
        }
        void run();
        return () => {
            active = false;
            if (channel)
                void supabase.removeChannel(channel);
        };
        // Conversation loaders intentionally read the current conversation snapshot without making read receipts resubscribe.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId, org]);
    useEffect(() => {
        function recover() {
            if (!org)
                return;
            void loadConversations();
            if (selectedId) {
                void loadMessages(selectedId);
                void loadCasesForConversation(selectedId, org);
            }
        }
        window.addEventListener("dentaya-network-restored", recover);
        return () => window.removeEventListener("dentaya-network-restored", recover);
        // Reconnect reloads the active thread; loader identities are not lifecycle inputs.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [org, selectedId]);
    const newestMessageId = messages[messages.length - 1]?.id;
    useEffect(() => {
        const history = historyRef.current;
        if (history) history.scrollTo({ top: history.scrollHeight, behavior: "auto" });
    }, [newestMessageId]);
    useLayoutEffect(() => {
        const page = pageRef.current, shell = shellRef.current;
        if (!page || !shell) return;
        const content = shell.closest<HTMLElement>(".module-content");
        let frame = 0;
        const fit = () => {
            if (window.matchMedia("(max-width: 900px)").matches) { shell.style.removeProperty("--message-shell-height"); return; }
            // Account for the actual module header, page heading, notices and
            // chrome density. Parent scrolling must not increase the budget.
            const logicalTop = shell.getBoundingClientRect().top + (content?.scrollTop ?? 0) + window.scrollY;
            const viewportBottom = Math.min(window.innerHeight, content?.getBoundingClientRect().bottom ?? window.innerHeight);
            const height = `${Math.max(0, Math.floor(viewportBottom - logicalTop - 72))}px`;
            if (shell.style.getPropertyValue("--message-shell-height") !== height) shell.style.setProperty("--message-shell-height", height);
        };
        const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fit); };
        const observer = new ResizeObserver(schedule);
        observer.observe(page);
        const header = page.querySelector("header");
        if (header) observer.observe(header);
        const moduleHeader = content?.parentElement?.querySelector<HTMLElement>(".module-header");
        if (moduleHeader) observer.observe(moduleHeader);
        window.addEventListener("resize", schedule);
        fit();
        return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("resize", schedule); };
    }, [loading]);
    async function loadMessages(id: string, older = false) {
        const sequence = ++messageLoadSequence.current;
        setThreadLoading(true);
        try {
            let query = supabase.from("organization_messages")
                .select("id,conversation_id,sender_user_id,sender_org_id,sender_name,sender_role,body,context_case_id,demo_mode,created_at")
                .eq("conversation_id", id).order("created_at", { ascending: false }).order("id", { ascending: false });
            const oldest = older && messagePage.id === id ? messagePage.rows[0] : null;
            if (oldest) query = query.or(`created_at.lt.${oldest.created_at},and(created_at.eq.${oldest.created_at},id.lt.${oldest.id})`);
            const { data, error } = await query.limit(100);
            if (sequence !== messageLoadSequence.current) return false;
            if (error) { setNotice(dentayaError(error)); return false; }
            const rows = ((data ?? []) as Message[]).reverse();
            setMessagePage(current => ({ id, rows: older && current.id === id ? [...rows, ...current.rows.filter(row => !rows.some(item => item.id === row.id))] : rows, hasOlder: rows.length === 100 }));
            return true;
        } catch (error) {
            if (sequence === messageLoadSequence.current) setNotice(dentayaError(error));
            return false;
        } finally {
            if (sequence === messageLoadSequence.current) setThreadLoading(false);
        }
    }
    async function loadCasesForConversation(id: string, current: Org) {
        const sequence = ++caseLoadSequence.current;
        const c = conversations.find(x => x.id === id);
        if (!c) { setCasePage({ id, rows: [] }); return; }
        let query = supabase.from("cases").select("id,case_number,title,status,patient_reference").order("updated_at", { ascending: false });
        query = current.org_type === "clinic"
            ? query.eq("clinic_org_id", current.id).eq("lab_org_id", c.lab_org_id)
            : query.eq("lab_org_id", current.id).eq("clinic_org_id", c.clinic_org_id);
        try {
            const { data, error } = await query.limit(250);
            if (sequence !== caseLoadSequence.current) return;
            if (error) { setNotice(dentayaError(error)); return; }
            setCasePage({ id, rows: (data ?? []) as CaseContext[] });
        } catch (error) {
            if (sequence === caseLoadSequence.current) setNotice(dentayaError(error));
        }
    }
    async function markRead(id: string, current: Org) {
        const field = current.org_type === "clinic" ? "clinic_last_read_at" : current.org_type === "laboratory" ? "lab_last_read_at" : null;
        if (!field)
            return;
        const now = new Date().toISOString();
        const { data, error } = await supabase.from("organization_conversations").update({ [field]: now }).eq("id", id).select("id");
        if (error || !data?.length) return;
        setConversations(list => list.map(x => x.id === id ? { ...x, [field]: now } : x));
    }
    async function send() {
        const body = draft.trim();
        const conversationId = selectedId;
        const conversation = conversations.find(item => item.id === conversationId);
        if (!body || !conversationId || !org || !userId || sendLock.current || !threadReady) return;
        if (!conversation || conversation.status !== "active") { setNotice(copy("Arşivlenmiş sohbetlere mesaj gönderilemez.")); return; }
        if (body.length > 4000) { setNotice("Mesaj 4000 karakterden uzun olamaz."); return; }
        if (contextCaseId && !cases.some(item => item.id === contextCaseId)) { setNotice(copy("İlgili vaka bu sohbete ait değil veya artık erişilebilir değil. Vakayı yeniden seçin.")); return; }
        if (typeof navigator !== "undefined" && !navigator.onLine) { setNotice("İnternet bağlantısı yok. Mesajı göndermeden önce bağlantının gelmesini bekle."); return; }
        sendLock.current = true;
        const identity = requestIdentity(messageRequestIds.current[conversationId] ?? null, { conversationId, body, caseId: contextCaseId });
        messageRequestIds.current[conversationId] = identity;
        setSending(true);
        setNotice("");
        try {
            const result = await supabase.from("organization_messages").insert({
                conversation_id: conversationId, sender_user_id: userId, sender_org_id: org.id,
                sender_name: userName || org.name, sender_role: userRole || null, body,
                context_case_id: contextCaseId || null, demo_mode: false, client_request_id: identity.id,
            }).select("id,conversation_id,sender_user_id,sender_org_id,sender_name,sender_role,body,context_case_id,demo_mode,created_at").single();
            let row = result.data as Message | null;
            if (result.error?.code === "23505") {
                const existing = await supabase.from("organization_messages")
                    .select("id,conversation_id,sender_user_id,sender_org_id,sender_name,sender_role,body,context_case_id,demo_mode,created_at")
                    .eq("conversation_id", conversationId).eq("sender_org_id", org.id).eq("client_request_id", identity.id).maybeSingle();
                if (existing.error || !existing.data) throw existing.error ?? result.error;
                row = existing.data as Message;
            } else if (result.error) throw result.error;
            if (!row) throw new Error(copy("Mesaj kaydı doğrulanamadı. Taslağınız korundu; tekrar deneyin."));
            const sent = row;
            delete messageRequestIds.current[conversationId];
            setMessagePage(current => current.id !== conversationId || current.rows.some(item => item.id === sent.id) ? current : { ...current, rows: [...current.rows, sent].sort(messageOrder) });
            setDrafts(current => current[conversationId]?.body.trim() === body && current[conversationId]?.caseId === contextCaseId
                ? { ...current, [conversationId]: { body: "", caseId: contextCaseId } } : current);
            void loadConversations();
        } catch (error) {
            setNotice(dentayaError(error, "Mesaj gönderilemedi."));
        } finally {
            setSending(false);
            sendLock.current = false;
        }
    }
    const selected = conversations.find(x => x.id === selectedId) ?? null;
    const counterpart = (c: Conversation) => orgMap.get(org?.id === c.clinic_org_id ? c.lab_org_id : c.clinic_org_id);
    const selectedCounterpart = selected ? counterpart(selected) : null;
    const unread = (c: Conversation) => {
        if (!org)
            return false;
        const read = org.org_type === "clinic" ? c.clinic_last_read_at : c.lab_last_read_at;
        return !read || new Date(c.last_message_at).getTime() > new Date(read).getTime();
    };
    const filtered = useMemo(() => {
        const q = search.trim().toLocaleLowerCase("tr-TR");
        if (!q)
            return conversations;
        return conversations.filter(c => {
            const otherOrgId = org?.id === c.clinic_org_id ? c.lab_org_id : c.clinic_org_id;
            return (orgMap.get(otherOrgId)?.name ?? "").toLocaleLowerCase("tr-TR").includes(q);
        });
    }, [conversations, search, orgMap, org?.id]);
    const caseMap = useMemo(() => new Map(cases.map(c => [c.id, c])), [cases]);
    const unreadCount = conversations.filter(unread).length;
    if (loading) return <LoadingExperience title="Mesajlar yükleniyor…"/>;
    if (org?.org_type === "courier")
        return <UiNode as="main" ref={pageRef} className="messages-page" style={ui.page}><UiNode as="div" style={ui.center}><UiNode as="p" style={ui.eyebrow}>ROL AYRIMI</UiNode><UiNode as="h1">Kurye iletişimi lojistik ekranındadır.</UiNode><Link href="/logistics" style={ui.primaryLink}>Canlı Takip</Link></UiNode></UiNode>;
    return <UiNode as="main" ref={pageRef} className="messages-page" style={ui.page}>
    <ConnectionStatus />
    <style>{`
      *{box-sizing:border-box}
      @keyframes msgIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
      .message-bubble{animation:msgIn var(--dy-motion-normal,240ms) ease both}
      .thread-row{transition:transform var(--dy-motion-fast,150ms),border-color var(--dy-motion-fast,150ms),background var(--dy-motion-fast,150ms)}
      .thread-row:hover{transform:translateX(3px);border-color:var(--dy-accent,#6de2cf)!important}
      .message-shell{height:var(--message-shell-height,calc(100dvh - 390px));min-height:0;min-width:0}
      .message-shell>*{min-width:0;min-height:0}.chat-panel{height:100%}.message-history>*{flex-shrink:0}
      @media(min-width:1101px){.message-page-header{display:grid!important;grid-template-columns:minmax(0,1fr) auto;gap:14px!important}.message-page-header h1{font-size:clamp(26px,2.6vw,38px)!important}}
      @media(max-width:900px){.message-shell{grid-template-columns:1fr!important;height:auto}.thread-list{max-height:230px!important}.chat-panel{height:min(700px,80dvh);min-height:430px!important}.context-bar{grid-template-columns:1fr!important}.message-page-header{gap:14px!important}}
      @media(max-width:600px){.message-composer{grid-template-columns:1fr!important}.message-composer button{min-height:44px!important;width:100%!important}.message-bubble{max-width:92%!important}.chat-panel{height:650px}.channel-state{max-width:120px;text-align:end}.message-page-header h1{font-size:28px!important}}
    `}</style>

    <UiNode as="header" className="message-page-header" style={ui.header}>
      <UiNode as="div">
        <Link href={org?.org_type === "laboratory" ? "/lab" : "/clinic"} style={ui.back}>← {org?.org_type === "laboratory" ? "Laboratuvar Merkezi" : "Klinik Merkezi"}</Link>
        <UiNode as="p" style={ui.eyebrow}>KLİNİK ↔ LAB İLETİŞİMİ</UiNode>
        <UiNode as="h1" style={ui.title}>Hekim ↔ Teknisyen Mesajları</UiNode>
        <UiNode as="p" style={ui.subtitle}>Doktor ve teknisyen konuşmalarını kurum bazında düzenli tut; teknik mesajı gerektiğinde doğrudan bir vakaya bağla.</UiNode>
      </UiNode>
      <UiNode as="div" style={ui.headerActions}>
        <UiNode as="div" style={ui.unreadSummary}><UiNode as="span">Okunmamış</UiNode><UiNode as="strong">{unreadCount}</UiNode></UiNode>
        {org?.org_type === "clinic" && <Link href="/labs" style={ui.secondaryLink}>Laboratuvarlar</Link>}
        <Link href="/cases" style={ui.primaryLink}>{uiText("Vakalar")}</Link>
      </UiNode>
    </UiNode>

    {notice && <UiNode as="div" style={ui.notice}>{notice}</UiNode>}

    <UiNode as="section" ref={shellRef} className="message-shell" style={ui.shell}>
      <UiNode as="aside" className="thread-list" style={ui.list}>
        <UiNode as="div" style={ui.listHead}><UiNode data-dy-copy-stack as="div"><UiNode as="strong">Sohbetler</UiNode><UiNode as="span">{conversations.length} kurum kanalı</UiNode></UiNode></UiNode>
        <UiNode as="div" style={ui.searchBox}><UiNode as="span">⌕</UiNode><UiNode as="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Kurum ara…" style={ui.search}/></UiNode>
        <UiNode as="div" style={ui.threadStack}>
          {filtered.map(c => {
            const cp = counterpart(c), active = c.id === selectedId;
            return <UiNode as="button" key={c.id} type="button" className="thread-row" onClick={() => setSelectedId(c.id)} style={{ ...ui.thread, background: active ? dy.accentSoft : dy.surface2, borderColor: active ? dy.accent : dy.border }}>
              <UiNode as="div" style={ui.avatar}><UserText>{(cp?.name ?? "?").slice(0, 2).toUpperCase()}</UserText></UiNode>
              <UiNode data-dy-copy-stack as="div" style={ui.threadCopy}><UiNode as="strong"><UserText>{cp?.name ?? uiText("Kurum")}</UserText></UiNode><UiNode as="span">{cp?.org_type === "laboratory" ? uiText("Laboratuvar") : uiText("Klinik")} · {relative(c.last_message_at)}</UiNode></UiNode>
              {unread(c) && !active && <UiNode as="span" style={ui.unreadDot}/>} 
            </UiNode>;
        })}
        </UiNode>
        {!filtered.length && <UiNode as="div" style={ui.emptySide}>Henüz kurum sohbeti yok.</UiNode>}
      </UiNode>

      <UiNode as="section" className="chat-panel" style={ui.chat}>
        {selected && org ? <>
          <UiNode as="div" style={ui.chatHead}>
            <UiNode as="div" style={ui.chatIdentity}>
              <UiNode as="div" style={ui.avatarLarge}><UserText>{(selectedCounterpart?.name ?? "?").slice(0, 2).toUpperCase()}</UserText></UiNode>
              <UiNode data-dy-copy-stack as="div"><UiNode as="strong"><UserText>{selectedCounterpart?.name ?? uiText("Kurum")}</UserText></UiNode><UiNode as="span">{selectedCounterpart?.org_type === "laboratory" ? "Laboratuvar ekibi" : "Klinik ekibi"}</UiNode></UiNode>
            </UiNode>
            <UiNode as="div" className="channel-state" style={ui.channelState}>{selected.status === "active" ? "● Güvenli kurum iletişimi" : copy("Arşivlenmiş sohbet · salt okunur")}</UiNode>
          </UiNode>

          <UiNode as="div" className="context-bar" style={ui.contextBar}>
            <UiNode as="div"><UiNode as="span" style={ui.contextLabel}>İLGİLİ VAKA</UiNode><UiNode as="p" style={ui.contextHelp}>Teknik mesajı ilgili vakaya bağla. Böylece dosya, revizyon ve konuşma aynı iş kaydında bulunur.</UiNode></UiNode>
            <UiNode as="select" value={contextCaseId} onChange={e => setContextCaseId(e.target.value)} style={ui.contextSelect}>
              <UiNode as="option" value="">Genel konuşma</UiNode>
              {cases.map(c => <UiNode as="option" key={c.id} value={c.id}>{c.case_number} · <UserText>{c.patient_reference}</UserText> · <UserText>{c.title}</UserText></UiNode>)}
            </UiNode>
          </UiNode>

          <UiNode as="div" ref={historyRef} className="message-history" role="region" aria-label={uiText("Mesajlar")} style={ui.messageArea} aria-busy={threadLoading}>
            {messagePage.id === selectedId && messagePage.hasOlder && <UiNode as="button" type="button" disabled={threadLoading} onClick={() => void loadMessages(selectedId, true)} style={ui.template}>{copy("Önceki mesajları yükle")}</UiNode>}
            {threadLoading && !messages.length && <UiNode as="p" role="status">Mesajlar yükleniyor…</UiNode>}
            {messages.map(m => {
                const mine = m.sender_org_id === org.id;
                const ctx = m.context_case_id ? caseMap.get(m.context_case_id) : null;
                return <UiNode as="div" key={m.id} className="message-bubble" style={{ ...ui.messageRow, justifyContent: mine ? "flex-end" : "flex-start" }}>
                <UiNode as="div" style={{ ...ui.bubble, background: mine ? dy.accentSoft : dy.surface2, borderColor: mine ? dy.accent : dy.border }}>
                  <UiNode as="div" style={ui.msgMeta}>
                    <UiNode as="strong">{mine ? "Siz" : m.sender_name ?? "Kullanıcı"}</UiNode>
                    <UiNode as="span">{roleLabel(m.sender_role)}</UiNode>
                    <UiNode as="span">{fmt(m.created_at, intlLocale())}</UiNode>
                  </UiNode>
                  {ctx && <Link href={`/cases/${ctx.id}`} style={ui.caseChip}>{ctx.case_number} · {ctx.title}</Link>}
                  <UiNode as="div" style={ui.body}><UserText>{m.body}</UserText></UiNode>
                </UiNode>
              </UiNode>;
            })}
            {!threadLoading && !messages.length && <UiNode data-dy-copy-stack as="div" style={ui.emptyChat}><UiNode as="strong">İlk mesajı gönder.</UiNode><UiNode as="span">Genel koordinasyon için normal mesaj gönder; teknik ayrıntılarda ilgili vakayı seç.</UiNode></UiNode>}
          </UiNode>

          <UiNode as="div" style={ui.templateRow}>{TEMPLATES.map(t => <UiNode as="button" key={t} type="button" onClick={() => setDraft(t)} style={ui.template}>{t}</UiNode>)}</UiNode>

          <UiNode as="div" className="message-composer" style={ui.composer}>
            <UiNode as="textarea" maxLength={4000} disabled={selected.status !== "active"} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey&&!e.nativeEvent.isComposing&&e.nativeEvent.keyCode!==229) {
            e.preventDefault();
            void send();
        } }} placeholder="Mesaj yaz… Enter ile gönder, Shift+Enter ile yeni satır aç." style={ui.textarea}/>
            <UiNode as="button" type="button" disabled={sending || !threadReady || !draft.trim() || selected.status !== "active"} onClick={() => void send()} style={{ ...ui.send, opacity: sending || !threadReady || !draft.trim() ? .55 : 1 }}>{sending ? "Gönderiliyor…" : uiText("Gönder")}</UiNode>
          </UiNode>
        </> : <UiNode as="div" style={{ padding: 18 }}><EmptyStateCard eyebrow="HEKİM ↔ TEKNİSYEN" title={conversations.length === 0 ? "Henüz kurum sohbeti yok" : "Bir sohbet seç"} description={conversations.length === 0
                ? "Klinik ve laboratuvar aynı vakaya bağlandığında mesajlaşma kanalı burada görünür. Teknik konuşmaları mümkün olduğunda vaka üzerinden sürdür."
                : "Soldaki listeden klinik veya laboratuvar sohbetini seç."} actionLabel={conversations.length === 0 ? "Vakalara Git" : undefined} actionHref={conversations.length === 0 ? "/cases" : undefined} secondaryLabel="Başlangıç Rehberi" secondaryHref="/start"/></UiNode>}
      </UiNode>
    </UiNode>
  </UiNode>;
}
function messageOrder(a: Message, b: Message) { return a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id); }
function roleLabel(role: string | null) {
    if (!role)
        return "Ekip üyesi";
    return {
        dentist: "Diş Hekimi",
        doctor: "Diş Hekimi",
        technician: "Diş Teknisyeni",
        assistant: "Klinik Asistanı",
        owner: "Yönetici",
        admin: "Yönetici"
    }[role] ?? "Ekip üyesi";
}
function fmt(v: string, localeTag: string = "tr-TR") { try {
    return new Intl.DateTimeFormat(localeTag, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(v));
}
catch {
    return v;
} }
function relative(v: string) { const m = (Date.now() - new Date(v).getTime()) / 60000; if (m < 2)
    return "şimdi"; if (m < 60)
    return `${Math.floor(m)} dk önce`; if (m < 1440)
    return `${Math.floor(m / 60)} sa önce`; return fmt(v); }
const ui: Record<string, CSSProperties> = {
    page: { minHeight: "100vh", padding: "24px clamp(18px,3.5vw,48px) 52px", background: dy.bg, color: dy.text, fontFamily: "Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", fontSize: 15 }, center: { width: "min(720px,100%)", margin: "100px auto", padding: 28, border: `1px solid ${dy.border}`, borderRadius: dy.radius, background: dy.surface, textAlign: "center" },
    header: { maxWidth: 1460, margin: "0 auto 20px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 22, flexWrap: "wrap" }, back: { color: dy.muted, textDecoration: "none", fontSize: 14 }, eyebrow: { margin: "14px 0 7px", color: dy.accent, fontSize: 14, fontWeight: 900, letterSpacing: ".15em" }, title: { margin: "0 0 9px", fontSize: "clamp(38px,5vw,58px)", lineHeight: 1, letterSpacing: "-.045em" }, subtitle: { maxWidth: 820, margin: 0, color: dy.muted, fontSize: 15, lineHeight: 1.65 }, headerActions: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, primaryLink: { minHeight: 42, display: "grid", placeItems: "center", padding: "0 14px", borderRadius: 11, background: dy.accent, color: dy.accentContrast, textDecoration: "none", fontWeight: 900, fontSize: 14 }, secondaryLink: { minHeight: 42, display: "grid", placeItems: "center", padding: "0 14px", borderRadius: 11, border: `1px solid ${dy.border}`, background: dy.surface, color: dy.text, textDecoration: "none", fontWeight: 850, fontSize: 14 }, unreadSummary: { height: 42, padding: "0 11px", display: "flex", alignItems: "center", gap: 8, border: `1px solid ${dy.border}`, borderRadius: 11, background: dy.surface, color: dy.muted, fontSize: 14 }, notice: { maxWidth: 1460, margin: "0 auto 12px", padding: "12px 14px", border: `1px solid ${dy.border}`, borderRadius: 12, background: dy.surface2, color: dy.muted, fontSize: 14 },
    shell: { maxWidth: 1460, margin: "0 auto", display: "grid", gridTemplateColumns: "340px minmax(0,1fr)", gap: 12, minHeight: 0 }, list: { minHeight: 0, maxHeight: "100%", overflowY: "auto", padding: 11, border: `1px solid ${dy.border}`, borderRadius: 17, background: dy.surface, backdropFilter: dy.backdrop }, listHead: { padding: "7px 6px 11px", display: "flex", justifyContent: "space-between" }, searchBox: { height: 43, display: "flex", alignItems: "center", gap: 8, padding: "0 10px", marginBottom: 9, border: `1px solid ${dy.border}`, borderRadius: 10, background: dy.input, color: dy.accent }, search: { width: "100%", border: 0, outline: "none", background: "transparent", color: dy.text, fontSize: 14 }, threadStack: { display: "grid", gap: 7 }, thread: { width: "100%", minHeight: 68, padding: 10, display: "flex", alignItems: "center", gap: 10, border: "1px solid", borderRadius: 13, color: dy.text, cursor: "pointer" }, avatar: { width: 45, height: 45, flex: "0 0 45px", display: "grid", placeItems: "center", borderRadius: 13, background: dy.input, border: `1px solid ${dy.border}`, color: dy.accent, fontSize: 14, fontWeight: 900 }, threadCopy: { minWidth: 0, flex: 1, display: "grid", gap: 4, textAlign: "left", overflow: "hidden" }, threadCopyStrong: { fontSize: 14 }, unreadDot: { width: 9, height: 9, borderRadius: 999, background: dy.accent, boxShadow: `0 0 0 4px ${dy.accentSoft}` }, emptySide: { padding: 20, textAlign: "center", color: dy.muted },
    chat: { minHeight: 0, display: "grid", gridTemplateRows: "auto auto minmax(0,1fr) auto auto", overflow: "hidden", border: `1px solid ${dy.border}`, borderRadius: 17, background: dy.surface, backdropFilter: dy.backdrop }, chatHead: { minHeight: 72, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, borderBottom: `1px solid ${dy.border}` }, chatIdentity: { display: "flex", alignItems: "center", gap: 11, minWidth: 0, overflowWrap: "anywhere" }, avatarLarge: { width: 48, height: 48, display: "grid", placeItems: "center", borderRadius: 14, background: dy.accentSoft, color: dy.accent, fontWeight: 900 }, channelState: { color: dy.accent, fontSize: 14, fontWeight: 800 }, contextBar: { padding: "10px 14px", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(260px,.65fr)", alignItems: "center", gap: 12, borderBottom: `1px solid ${dy.border}`, background: dy.surface2 }, contextLabel: { color: dy.accent, fontSize: 14, fontWeight: 900, letterSpacing: ".1em" }, contextHelp: { margin: "4px 0 0", color: dy.muted, fontSize: 14 }, contextSelect: { minWidth: 0, maxWidth: "100%", minHeight: 40, padding: "0 9px", borderRadius: 9, border: `1px solid ${dy.border}`, background: dy.input, color: dy.text, fontSize: 14 }, messageArea: { minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", scrollbarGutter: "stable", padding: 18, display: "flex", flexDirection: "column", gap: 11 }, messageRow: { display: "flex" }, bubble: { maxWidth: "min(760px,78%)", padding: "11px 13px", border: "1px solid", borderRadius: 15, boxShadow: `0 6px 20px ${dy.shadow}` }, msgMeta: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 7, color: dy.muted, fontSize: 13 }, caseChip: { display: "inline-block", marginBottom: 7, padding: "5px 7px", borderRadius: 8, background: dy.input, color: dy.accent, textDecoration: "none", fontSize: 14, fontWeight: 850 }, body: { whiteSpace: "pre-wrap", fontSize: 15, lineHeight: 1.58, overflowWrap: "anywhere", wordBreak: "break-word" }, emptyChat: { minHeight: 0, flex: 1, display: "grid", placeItems: "center", alignContent: "center", gap: 7, textAlign: "center", color: dy.muted, padding: 25 }, templateRow: { padding: "8px 12px", display: "flex", gap: 6, overflowX: "auto", borderTop: `1px solid ${dy.border}` }, template: { flexShrink: 0, minHeight: 34, padding: "0 10px", whiteSpace: "nowrap", border: `1px solid ${dy.border}`, borderRadius: 999, background: dy.surface2, color: dy.muted, fontSize: 14, cursor: "pointer" }, composer: { padding: 12, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 9, borderTop: `1px solid ${dy.border}` }, textarea: { minHeight: 60, maxHeight: 150, padding: "10px 12px", resize: "vertical", borderRadius: 11, border: `1px solid ${dy.border}`, background: dy.input, color: dy.text, outline: "none", fontSize: 14, lineHeight: 1.5 }, send: { minWidth: 110, border: 0, borderRadius: 11, background: dy.accent, color: dy.accentContrast, fontWeight: 900, fontSize: 14, cursor: "pointer" },
};
