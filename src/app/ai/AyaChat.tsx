'use client';
import {CopyAyaResponse,ExportAyaConversation} from './AyaMessageTools';
import {normalizeMemory} from '../../../electron/aya/agent.cjs';
import {ayaAgentText} from '@/lib/i18n/aya-agent';
import {resolveAyaReply} from '@/lib/aya-conversation';
import {fallbackReply} from '../../../electron/aya/conversation.cjs';
import {ayaExperienceText} from '@/lib/i18n/aya-experience';
import './aya-catalog.css';
import AyaQuestionLibrary from './AyaQuestionLibrary';
import {readAyaKnowledge} from '@/lib/aya-knowledge';
import AyaKnowledgePanel from './AyaKnowledgePanel';
import AyaEngineSetup from './AyaEngineSetup';
import AyaWorkingMemoryPanel from './AyaWorkingMemoryPanel';
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useEffect, useRef, useState } from 'react';
import Link from "@/lib/i18n/UiLink";
import { useTranslation } from '@/lib/i18n';
import AyaPreferencesPanel from './AyaPreferencesPanel';
import { useAyaState, readAyaState, saveAyaSession, deleteAyaSession, type AyaMessage } from '@/lib/aya-local-state';
import { playExperienceCue } from '@/lib/experience-audio';
type Message = AyaMessage;
type LocalStatus = Awaited<ReturnType<NonNullable<NonNullable<Window['dentayaDesktop']>['localAyaStatus']>>>;
const empty: LocalStatus = { ok: false, models: [], progress: { running: false, status: '', completed: 0, total: 0 } };
const RUNTIME_ERROR='LOCAL_RUNTIME_MISSING';
const ERROR: Record<string, string> = { LOCAL_RUNTIME_MISSING: 'Yerel motor kontrol edilemedi.', LOCAL_BUSY: 'Model şu anda başka bir işlemde. İşlemin bitmesini bekleyin.', MODEL_MISSING: 'Seçilen model bu bilgisayarda bulunamadı. Listeyi yenileyin veya modeli indirin.', LOCAL_MODEL_REQUIRED: 'Bu model yerel metin sohbeti için uygun değil. Yerel bir metin modeli seçin.', LOCAL_CANCELLED: 'Yanıt durduruldu. Sorunuz korundu.', LOCAL_TIMEOUT: 'Model zaman aşımına uğradı. Daha küçük bir model deneyin.', LOCAL_EMPTY_RESPONSE: 'Model boş yanıt verdi. Sorunuz korundu.' };
function OpenArrow() { return <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12 12 4M4 4h8v8"/></svg>; }
export default function AyaChat() {
    const { t, locale, intlLocale } = useTranslation();
    const { options, sessions } = useAyaState();
    const agentCopy=ayaAgentText(locale);
    const [workingMemory,setWorkingMemory]=useState(()=>normalizeMemory(null));
    const copy=ayaExperienceText(locale);
    const [panel,setPanel]=useState<'setup'|'memory'|'library'|'history'|'preferences'>('setup');
    const [settingsOpen,setSettingsOpen]=useState(false);
    const settingsButton=useRef<HTMLButtonElement|null>(null);
    const settingsPanel=useRef<HTMLElement|null>(null);
    const [sessionId, setSessionId] = useState(''), [loaded, setLoaded] = useState(false), [guideMode, setGuideMode] = useState(false);
    const [status, setStatus] = useState<LocalStatus>(empty), [model, setModel] = useState(''), [draft, setDraft] = useState(''), [messages, setMessages] = useState<Message[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState(''), [checking, setChecking] = useState(false), [detailed, setDetailed] = useState(false), [desktop, setDesktop] = useState(false), [verified, setVerified] = useState(false), [lastModelFailure,setLastModelFailure]=useState(false);
    const requestId=useRef(''),cancelRequest=useRef<(()=>void)|null>(null);
    const lock = useRef(false), live = useRef(true), end = useRef<HTMLDivElement | null>(null);
    async function refresh() {
        const api = window.dentayaDesktop;
        if (!api?.localAyaStatus)
            return;
        setChecking(true);
        try {
            const result = await api.localAyaStatus();
            if (!live.current)
                return;
            setStatus(result);
            setModel(old => result.models.some(m => m.name === old) ? old : result.models[0]?.name ?? '');
        }
        catch {
            if (live.current) {
                setStatus(previous=>({...previous,ok:false}));
                setError(RUNTIME_ERROR);
            }
        }
        finally {
            if (live.current)
                setChecking(false);
        }
    }
    useEffect(() => {
        live.current = true;
        const saved = readAyaState().sessions[0];
        setSessionId(saved?.id || crypto.randomUUID());
        setMessages(saved?.messages || []);
        setWorkingMemory(normalizeMemory(saved?.workingMemory));
        setLoaded(true);
        setDesktop(Boolean(window.dentayaDesktop?.localAyaChat));
        try {
            setModel(localStorage.getItem('dentaya:aya-local-model') || '');
            setGuideMode(localStorage.getItem('dentaya:aya-response-mode') === 'core');
        }
        catch { }
        void refresh();
        return () => {
            const pending=requestId.current;
            live.current = false;requestId.current='';lock.current=false;
            cancelRequest.current?.();cancelRequest.current=null;
            if(pending)void window.dentayaDesktop?.localAyaCancel?.().catch(()=>{});
        };
    }, []);
    useEffect(() => {
        if (!status.progress.running)
            return;
        const id = setInterval(() => void refresh(), 1500);
        return () => clearInterval(id);
    }, [status.progress.running]);
    useEffect(() => {setVerified(false);setLastModelFailure(false);}, [model]);
    useEffect(() => { if(settingsOpen)settingsPanel.current?.focus({preventScroll:true}); }, [settingsOpen]);
    useEffect(() => {
        if (loaded && options.saveHistory && (messages.length||workingMemory.goal||workingMemory.decisions.length||workingMemory.openQuestions.length) && !saveAyaSession({ id: sessionId, title: (messages[0]?.content||workingMemory.goal||copy.newChat).slice(0, 70), updatedAt: Date.now(), messages, workingMemory }))
            setError(copy.storageError);
    }, [loaded, sessionId, messages, workingMemory, options.saveHistory, copy.storageError, copy.newChat]);
    useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [messages, busy]);
    function choose(value: string) {
        setModel(value);
        setVerified(false);
        try {
            localStorage.setItem('dentaya:aya-local-model', value);
        }
        catch {
            setError(copy.modelStorageError);
        }
    }
    function stop() {
        // Settle the UI even if the native engine does not acknowledge cancellation.
        cancelRequest.current?.();
        void window.dentayaDesktop?.localAyaCancel?.().catch(()=>{});
    }
    async function send(text = draft, forceModel = false) {
        const prompt = text.trim(), api = window.dentayaDesktop;
        if (!prompt || prompt.length>8000 || lock.current)
            return;
        const id=crypto.randomUUID();
        requestId.current=id;
        lock.current = true;
        setBusy(true);
        setError('');
        setDraft('');
        const previous = messages;
        setMessages([...previous, { role: 'user', content: prompt }]);
        let watchdog:ReturnType<typeof setTimeout>|undefined;
        try {
            const notebook=readAyaKnowledge(),knowledge=notebook.enabled?notebook.items:[];
            const aborted=new Promise<{ok:false;error:string}>(resolve=>{
                cancelRequest.current=()=>resolve({ok:false,error:'LOCAL_CANCELLED'});
                watchdog=setTimeout(()=>{resolve({ok:false,error:'LOCAL_TIMEOUT'});void api?.localAyaCancel?.().catch(()=>{});},185000);
            });
            const result = await resolveAyaReply({prompt,knowledge,history:previous,workingMemory,options:{...options,style:detailed?'explained':options.style},locale,forceModel},{t,callModel:(!guideMode||forceModel)&&modelReady&&api?.localAyaChat?()=>Promise.race([api.localAyaChat!({ agent:true,workingMemory,requestId:id,knowledge,useMemory:notebook.enabled,prompt, model, locale, detail: options.style === 'concise' && !detailed ? 'concise' : 'detailed', options, history: previous }),aborted]):undefined});
            if (!live.current || requestId.current!==id)
                return;
            setMessages([...previous, { role: 'user', content: prompt }, { role: 'assistant', content: result.output, engine:result.engine, references: result.references }]);
            if(result.workingMemory)setWorkingMemory(result.workingMemory);
            if(result.warning){
                setLastModelFailure(true);
                setError(result.warning==='LOCAL_INVALID_PLAN'?agentCopy.invalid:(locale==='tr'?ERROR[result.warning]:undefined)||copy.modelError);
                setDraft(prompt);
                setVerified(false);
            }
            if (result.engine==='model') {
                setVerified(true);
                setLastModelFailure(false);
                playExperienceCue('message', 'ui');
            }
        }
        catch {
            if (live.current && requestId.current===id) {
                const fallback=fallbackReply(prompt,{locale,history:previous,modelError:'LOCAL_ERROR'});
                setMessages([...previous,{role:'user',content:prompt},{role:'assistant',content:fallback.output,engine:'core',references:[]}]);
                setDraft(prompt);
                setVerified(false);
                setLastModelFailure(true);
                setError(copy.modelError);
            }
        }
        finally {
            clearTimeout(watchdog);
            if(requestId.current===id){
                lock.current = false;
                requestId.current='';
                cancelRequest.current=null;
                if (live.current)setBusy(false);
            }
        }
    }
    const modelReady = desktop && status.ok && Boolean(model) && !status.progress.running;
    const usingModel = !guideMode && modelReady;
    const statusText = busy ? copy.answering : checking ? copy.checking : usingModel ? lastModelFailure ? copy.modelFailed : verified ? copy.modelVerified : copy.modelReady : copy.coreStatus;
    function prepare(text:string) { setDraft(text); document.getElementById('aya-local-message')?.focus(); }
    function newConversation() { setMessages([]); setWorkingMemory(normalizeMemory(null)); setSessionId(crypto.randomUUID()); setDraft(''); setError(''); setVerified(false); setLastModelFailure(false); document.getElementById('aya-local-message')?.focus(); }
    function responseMode(core:boolean) {
        setGuideMode(core);
        try { localStorage.setItem('dentaya:aya-response-mode',core?'core':'automatic'); } catch { /* The current session remains usable. */ }
    }
    function closeSettings() { setSettingsOpen(false); settingsButton.current?.focus(); }
    return <UiNode as="section" className={`aya-chat aya-conversation-shell${settingsOpen?' aya-conversation-shell--settings':''}`} aria-label={copy.conversation} translateChildren={false}>
        <UiNode as="header" className="aya-chat-header" translateChildren={false}>
            <UiNode as="div" translateChildren={false}><Link href="/workspace" translateChildren={false}>← {copy.back}</Link><UiNode as="div" className="aya-title-row" translateChildren={false}><UiNode as="span" className="aya-core-emblem" aria-hidden="true"><UserText>A</UserText></UiNode><UiNode as="div" translateChildren={false}><UiNode as="h1">{copy.title}</UiNode><UiNode as="p">{copy.subtitle}</UiNode></UiNode></UiNode></UiNode>
            <UiNode as="div" className="aya-header-actions" translateChildren={false}>
                <UiNode as="button" type="button" disabled={busy||(!messages.length&&!workingMemory.goal&&!workingMemory.decisions.length&&!workingMemory.openQuestions.length)} onClick={newConversation}>{copy.newChat}</UiNode>
                <UiNode as="button" ref={settingsButton} type="button" aria-controls="aya-conversation-settings" aria-expanded={settingsOpen} onClick={()=>{setSettingsOpen(!settingsOpen);}}>{copy.settings}</UiNode>
            </UiNode>
        </UiNode>
        <UiNode as="div" className="aya-conversation-layout" translateChildren={false}>
            <UiNode as="div" className="aya-conversation-main" translateChildren={false}>
                <UiNode as="div" className="aya-conversation-status" translateChildren={false}>
                    <UiNode as="span" className={`aya-status${usingModel?' aya-status--model':''}`} role="status">{statusText}</UiNode>
                    <UiNode as="span" className="aya-status-description">{usingModel?copy.localNote:copy.coreNote}</UiNode>
                </UiNode>
                {workingMemory.goal&&<UiNode as="button" className="aya-goal-preview" type="button" title={copy.memoryHint} onClick={()=>{setPanel('memory');setSettingsOpen(true);}}><UiNode as="span">{copy.goal}</UiNode><UserText>{workingMemory.goal}</UserText><OpenArrow/></UiNode>}
                <UiNode as="div" className="aya-chat-messages" role="log" aria-label={copy.conversation} aria-live="polite" aria-busy={busy} translateChildren={false}>
                    {!messages.length&&<UiNode as="div" className="aya-chat-welcome" translateChildren={false}><UiNode as="span" className="aya-welcome-kicker">AYA CORE</UiNode><UiNode as="h2">{copy.welcome}</UiNode><UiNode as="p">{copy.welcomeNote}</UiNode><UiNode as="div" className="aya-prompts" translateChildren={false}>{copy.promptTitles.map((title,i)=><UiNode as="button" type="button" key={title} disabled={busy} onClick={()=>prepare(copy.prompts[i])}><UiNode as="strong">{title}</UiNode><UiNode as="span">{copy.prompts[i]}</UiNode><UiNode as="span" aria-hidden="true"><OpenArrow/></UiNode></UiNode>)}</UiNode></UiNode>}
                    {messages.map((m,i)=><UiNode as="article" key={i} className={`aya-message aya-message--${m.role}`} translateChildren={false}><UiNode as="strong">{m.role==='user'?copy.you:m.engine==='core'?copy.core:m.engine==='guide'?copy.document:copy.local}</UiNode><UiNode as="div" data-user-content><UserText>{m.content}</UserText></UiNode>{m.references?.map(r=><Link key={r.id} href={r.href} translateChildren={false} onClick={()=>{if(r.href.startsWith('/ai#')){setPanel(r.href.includes('knowledge')?'memory':'library');setSettingsOpen(true);}}}><UserText>{r.title}</UserText> →</Link>)}{m.role==='assistant'&&<CopyAyaResponse text={m.content}/>}</UiNode>)}
                    {busy&&<UiNode as="p" className="aya-thinking" role="status">{copy.answering}…</UiNode>}
                    <UiNode as="div" ref={end}/>
                </UiNode>
                {error&&<UiNode as="div" role="alert" className="aya-chat-error" translateChildren={false}><UiNode as="p">{error==='LOCAL_RUNTIME_MISSING'?copy.statusError:error}</UiNode>{draft.trim()&&!busy&&<UiNode as="div" translateChildren={false}><UiNode as="button" type="button" onClick={()=>void send()}>{copy.retry}</UiNode><UiNode as="button" type="button" onClick={()=>prepare(draft)}>{copy.edit}</UiNode></UiNode>}</UiNode>}
                <UiNode as="form" className="aya-chat-composer" translateChildren={false} onSubmit={e=>{e.preventDefault();void send();}}>
                    <UiNode as="label" className="sr-only" htmlFor="aya-local-message">{copy.message}</UiNode><UiNode as="textarea" id="aya-local-message" value={draft} disabled={busy} maxLength={8000} rows={3} placeholder={copy.placeholder} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(options.enterSends&&e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send();}}}/>
                    <UiNode as="div" translateChildren={false}><UiNode as="span" className="aya-composer-hint">{options.enterSends?copy.enterHelp:copy.buttonHelp}</UiNode><UiNode as="span">{draft.length.toLocaleString(intlLocale())} / {(8000).toLocaleString(intlLocale())}</UiNode>{busy?<UiNode as="button" key="stop" type="button" onClick={e=>{e.preventDefault();stop();}}>{copy.stop}</UiNode>:<UiNode as="button" key="send" type="submit" disabled={!draft.trim()}>{copy.send} ↑</UiNode>}</UiNode>
                </UiNode>
                <UiNode as="small" className="aya-chat-footnote" translateChildren={false}>{options.saveHistory?copy.saved:copy.temporary} {agentCopy.chatScope}</UiNode>
            </UiNode>
            {settingsOpen&&<UiNode as="aside" id="aya-conversation-settings" ref={settingsPanel} className="aya-conversation-settings" aria-label={copy.settings} tabIndex={-1} translateChildren={false} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();closeSettings();}}}>
                <UiNode as="div" className="aya-settings-heading" translateChildren={false}><UiNode as="h2">{copy.settings}</UiNode><UiNode as="button" type="button" onClick={closeSettings}>{copy.close}</UiNode></UiNode><UiNode as="p">{copy.panelNote}</UiNode>
                <UiNode as="div" className="aya-settings-nav" role="group" aria-label={copy.settings} translateChildren={false}>{(['setup','memory','library','history','preferences'] as const).map(key=><UiNode as="button" key={key} type="button" aria-pressed={panel===key} aria-controls="aya-settings-content" onClick={()=>setPanel(key)}>{copy[key]}</UiNode>)}</UiNode>
                <UiNode as="div" id="aya-settings-content" className="aya-settings-content" translateChildren={false}>
                    {panel==='setup'&&<><UiNode as="div" className="aya-mode-bar" translateChildren={false}><UiNode as="label" htmlFor="aya-response-mode">{copy.engine}<UiNode as="select" id="aya-response-mode" value={guideMode?'core':'automatic'} disabled={busy} onChange={e=>responseMode(e.target.value==='core')}><UiNode as="option" value="automatic">{copy.automatic}</UiNode><UiNode as="option" value="core">{copy.coreOnly}</UiNode></UiNode></UiNode><UiNode as="p">{copy.engineHelp}</UiNode><UiNode as="label" className="aya-detail-choice"><UiNode as="input" type="checkbox" checked={detailed} disabled={busy} onChange={e=>setDetailed(e.target.checked)}/>{copy.detailed}</UiNode></UiNode>{desktop?<AyaEngineSetup status={status} model={model} busy={busy} checking={checking} onChoose={choose} onRefresh={refresh} onError={setError}/>:<UiNode as="p">{copy.browserNote}</UiNode>}<UiNode as="button" type="button" disabled={!modelReady||busy} onClick={()=>void send(copy.modelTestPrompt,true)}>{copy.test}</UiNode><UiNode as="div" className="aya-work-tools" translateChildren={false}><UiNode as="strong">{copy.tools}</UiNode>{[{label:copy.calculate,prompt:'1800 × 0,18'},{label:copy.convert,prompt:copy.prompts[2]},{label:copy.checklist,prompt:copy.prompts[1]},{label:copy.handoff,prompt:copy.prompts[3]}].map(tool=><UiNode as="button" type="button" key={tool.label} disabled={busy} onClick={()=>prepare(tool.prompt)}>{tool.label}</UiNode>)}</UiNode><ExportAyaConversation messages={messages} sessionId={sessionId} disabled={busy}/></>}
                    {panel==='memory'&&<><AyaWorkingMemoryPanel memory={workingMemory} busy={busy} onChange={setWorkingMemory}/><AyaKnowledgePanel/></>}
                    {panel==='library'&&<AyaQuestionLibrary disabled={busy} onChoose={question=>{prepare(question);if(window.innerWidth<850)setSettingsOpen(false);}}/>}
                    {panel==='preferences'&&<AyaPreferencesPanel/>}
                    {panel==='history'&&<UiNode as="section" className="aya-session-history" translateChildren={false}><UiNode as="h3">{copy.history}</UiNode>{!options.saveHistory?<UiNode as="p">{copy.historyOff}</UiNode>:!sessions.length?<UiNode as="p">{copy.historyEmpty}</UiNode>:sessions.map(x=><UiNode as="div" key={x.id} className="aya-history-item" translateChildren={false}><UiNode as="button" type="button" className="aya-history-open" disabled={busy} aria-label={copy.openConversation+': '+x.title} onClick={()=>{setSessionId(x.id);setMessages(x.messages);setWorkingMemory(normalizeMemory(x.workingMemory));setDraft('');setError('');setVerified(false);setLastModelFailure(false);}}><UserText>{x.title}</UserText><UiNode as="small">{new Intl.DateTimeFormat(intlLocale(),{dateStyle:'medium',timeStyle:'short'}).format(x.updatedAt)}</UiNode></UiNode><UiNode as="button" type="button" disabled={busy} onClick={()=>{deleteAyaSession(x.id);if(x.id===sessionId)newConversation();}}>{copy.remove}</UiNode></UiNode>)}</UiNode>}
                </UiNode>
            </UiNode>}
        </UiNode>
    </UiNode>;
}
