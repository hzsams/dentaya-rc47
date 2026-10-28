'use client';
import {CopyAyaResponse,ExportAyaConversation} from './AyaMessageTools';
import {normalizeMemory} from '../../../electron/aya/agent.cjs';
import {ayaAgentText} from '@/lib/i18n/aya-agent';
import {resolveAyaReply} from '@/lib/aya-conversation';
import {createAyaStatusRefreshGate,selectAyaModel} from '@/lib/aya-ui-state';
import {ayaSetupError} from '@/lib/aya-setup-status';
import {ayaExperienceText} from '@/lib/i18n/aya-experience';
import {ayaChatWorkspace, type AyaChatWorkspace} from '@/lib/aya-chat-workspace';
import {ayaChatWorkspaceText} from '@/lib/i18n/aya-chat-workspace';
import './aya-catalog.css';
import {readAyaKnowledge} from '@/lib/aya-knowledge';
import AyaKnowledgePanel from './AyaKnowledgePanel';
import AyaEngineSetup from './AyaEngineSetup';
import AyaWorkingMemoryPanel from './AyaWorkingMemoryPanel';
import AyaSources from './AyaSources';
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useEffect, useRef, useState } from 'react';
import Link from "@/lib/i18n/UiLink";
import { useTranslation } from '@/lib/i18n';
import AyaPreferencesPanel from './AyaPreferencesPanel';
import { useAyaState, readAyaState, ayaSessionRevision, saveAyaSessionIfCurrent, deleteAyaSession, type AyaMessage } from '@/lib/aya-local-state';
import { playExperienceCue } from '@/lib/experience-audio';
type Message = AyaMessage;
type MemoryWork={turn:string;sessionId:string;baseline:string;version:number;prompt:string;answer:string;memory:ReturnType<typeof normalizeMemory>};
type PendingMemory={cancelled:boolean;promise:Promise<void>};
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
    const workspaceCopy=ayaChatWorkspaceText(locale);
    const [panel,setPanel]=useState<'setup'|'memory'|'history'|'preferences'>('setup');
    const [settingsOpen,setSettingsOpen]=useState(false);
    const settingsButton=useRef<HTMLButtonElement|null>(null);
    const settingsPanel=useRef<HTMLElement|null>(null);
    const [sessionId, setSessionId] = useState(''), [loaded, setLoaded] = useState(false);
    const [streamingReply,setStreamingReply]=useState<{text:string;diagnostic:boolean}|null>(null);
    const [retryRequest,setRetryRequest]=useState<{prompt:string;forceModel:boolean;preserveDraft:boolean}|null>(null);
    const [diagnosticResult,setDiagnosticResult]=useState<Message|null>(null);
    const [saveConflict,setSaveConflict]=useState<'changed'|'missing'|null>(null);
    const [pendingQuestion,setPendingQuestion]=useState('');
    const [recoveredQuestion,setRecoveredQuestion]=useState(false);
    const [acceptanceBusy,setAcceptanceBusy]=useState(false);
    const [status, setStatus] = useState<LocalStatus>(empty), [model, setModel] = useState(''), [draft, setDraft] = useState(''), [messages, setMessages] = useState<Message[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState(''), [checking, setChecking] = useState(false), [detailed, setDetailed] = useState(false), [desktop, setDesktop] = useState(false), [verified, setVerified] = useState(false), [lastModelFailure,setLastModelFailure]=useState(false);
    const statusRequests=useRef(createAyaStatusRefreshGate());
    const modelPreference=useRef('');
    const requestId=useRef(''),cancelRequest=useRef<(()=>void)|null>(null);
    const activeSession=useRef(''),latestTurn=useRef(''),memoryVersion=useRef(0),streamingDiagnostic=useRef(false);
    const currentMemory=useRef(normalizeMemory(null));
    const pendingMemory=useRef<PendingMemory|null>(null);
    const lock = useRef(false), live = useRef(true), end = useRef<HTMLDivElement | null>(null);
    const memoryEdit=useRef<{sessionId:string;baseline:string}|null>(null);
    const persistedSession=useRef<{id:string;revision:string|null}>({id:'',revision:null});
    const acceptanceLock=useRef(false);
    function rememberWorkspace(patch:Partial<AyaChatWorkspace>={}) {
        if(!activeSession.current)return;
        const work:AyaChatWorkspace={id:activeSession.current,messages,workingMemory:currentMemory.current,draft,pendingQuestion,revision:persistedSession.current.revision,updatedAt:Date.now(),...patch};
        ayaChatWorkspace.remember(work,readAyaState().options.saveHistory);
    }
    async function refresh() {
        const api = window.dentayaDesktop;
        if (!api?.localAyaStatus||!live.current)
            return;
        const refreshId=statusRequests.current.begin();
        setChecking(true);
        try {
            const result = await api.localAyaStatus();
            if (!live.current||!statusRequests.current.isCurrent(refreshId))
                return;
            setStatus(result);
            setModel(old => selectAyaModel(old,result.models,modelPreference.current));
            setError(current=>current===RUNTIME_ERROR?'':current);
        }
        catch {
            if (live.current&&statusRequests.current.isCurrent(refreshId)) {
                setStatus(previous=>({...previous,ok:false}));
                setError(RUNTIME_ERROR);
            }
        }
        finally {
            if (live.current&&statusRequests.current.isCurrent(refreshId))
                setChecking(false);
        }
    }
    useEffect(() => {
        const statusGate=statusRequests.current;
        live.current = true;
        const state=readAyaState();
        const restored=ayaChatWorkspace.restore(state.options.saveHistory,state.sessions);
        const saved = state.sessions[0];
        const initialId=restored?.id||saved?.id || crypto.randomUUID();
        persistedSession.current={id:initialId,revision:restored?restored.revision:ayaSessionRevision(saved)};
        activeSession.current=initialId;
        setSessionId(initialId);
        setMessages(restored?.messages||saved?.messages || []);
        updateMemory(normalizeMemory(restored?.workingMemory??saved?.workingMemory));
        setDraft(restored?.pendingQuestion||restored?.draft||'');
        setPendingQuestion(restored?.pendingQuestion||'');
        setRecoveredQuestion(Boolean(restored?.pendingQuestion));
        setLoaded(true);
        setDesktop(Boolean(window.dentayaDesktop?.localAyaChat));
        try {
            modelPreference.current=localStorage.getItem('dentaya:aya-local-model') || '';
            setModel(modelPreference.current);
        }
        catch { }
        void refresh();
        const focus=()=>void refresh();
        const unsubscribeTokens=window.dentayaDesktop?.onLocalAyaToken?.(event=>{
            if(live.current&&lock.current&&requestId.current===event.requestId&&typeof event.output==='string'&&event.output.length<=64000)
                setStreamingReply({text:event.output,diagnostic:streamingDiagnostic.current});
        });
        window.addEventListener('focus',focus);
        return () => {
            const pending=requestId.current;
            live.current = false;statusGate.invalidate();requestId.current='';lock.current=false;
            window.removeEventListener('focus',focus);
            unsubscribeTokens?.();
            cancelRequest.current?.();cancelRequest.current=null;
            latestTurn.current='';
            if(pendingMemory.current)pendingMemory.current.cancelled=true;
            if(pending||pendingMemory.current)void window.dentayaDesktop?.localAyaCancel?.().catch(()=>{});
        };
    }, []);
    useEffect(() => {
        if (!status.progress.running&&!status.ollama?.progress.running&&status.error!=='LOCAL_BUSY')
            return;
        const id = setInterval(() => void refresh(), 1500);
        return () => clearInterval(id);
    }, [status.progress.running,status.ollama?.progress.running,status.error]);
    useEffect(() => {setVerified(false);setLastModelFailure(false);}, [model]);
    useEffect(() => { if(settingsOpen)settingsPanel.current?.focus({preventScroll:true}); }, [settingsOpen]);
    useEffect(() => {
        const edit=memoryEdit.current;
        memoryEdit.current=null;
        if (!loaded)return;
        if(!options.saveHistory){persistedSession.current={id:sessionId,revision:ayaSessionRevision(readAyaState().sessions.find(session=>session.id===sessionId))};setSaveConflict(null);return;}
        if (messages.length||workingMemory.goal||workingMemory.decisions.length||workingMemory.openQuestions.length) {
            const expected=persistedSession.current.id===sessionId?persistedSession.current.revision:null;
            const stored=readAyaState().sessions.find(session=>session.id===sessionId);
            const result=saveAyaSessionIfCurrent({ id: sessionId, title: stored?.title||(messages[0]?.content||workingMemory.goal||copy.newChat).slice(0, 70), updatedAt: Date.now(), messages, workingMemory },expected);
            if(result==='saved'||result==='unchanged'){persistedSession.current={id:sessionId,revision:ayaSessionRevision(readAyaState().sessions.find(session=>session.id===sessionId))};setSaveConflict(null);}
            else if(result==='conflict')setSaveConflict(readAyaState().sessions.some(session=>session.id===sessionId)?'changed':'missing');
            else if(result==='failed')setError(copy.storageError);
        } else if(edit?.sessionId===sessionId) {
            const stored=readAyaState().sessions.find(session=>session.id===sessionId);
            // A deliberate local reset may remove its own memory-only record.
            // Keep a newer record written elsewhere, and never create empty sessions.
            if(stored&&ayaSessionRevision(stored)!==persistedSession.current.revision)setSaveConflict('changed');
            else if(stored&&!stored.messages.length&&JSON.stringify(normalizeMemory(stored.workingMemory))===edit.baseline){
                if(!deleteAyaSession(sessionId))setError(copy.storageError);
                else {persistedSession.current={id:sessionId,revision:null};setSaveConflict(null);}
            }
        }
    }, [loaded, sessionId, messages, workingMemory, options.saveHistory, copy.storageError, copy.newChat]);
    useEffect(()=>{
        if(loaded)ayaChatWorkspace.remember({id:sessionId,messages,workingMemory,draft,pendingQuestion,revision:persistedSession.current.revision,updatedAt:Date.now()},readAyaState().options.saveHistory);
    },[loaded,sessionId,messages,workingMemory,draft,pendingQuestion,options.saveHistory]);
    useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [messages, diagnosticResult, streamingReply, busy]);
    function choose(value: string) {
        if(lock.current||acceptanceLock.current)return;
        invalidateMemoryWork();
        modelPreference.current=value;
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
    function replyError(code:string) {
        if(code==='LOCAL_INVALID_PLAN')return agentCopy.invalid;
        if(code.startsWith('AYA_ENGINE_'))return ayaSetupError(code,locale);
        if(locale==='tr'&&ERROR[code])return ERROR[code];
        return code==='LOCAL_BUSY'?copy.modelBusy:code==='LOCAL_CANCELLED'?copy.cancelled:copy.modelError;
    }
    function updateMemory(memory:ReturnType<typeof normalizeMemory>) {
        const normalized=normalizeMemory(memory);
        currentMemory.current=normalized;
        memoryVersion.current++;
        setWorkingMemory(normalized);
    }
    function invalidateMemoryWork() {
        latestTurn.current='';
        if(pendingMemory.current){pendingMemory.current.cancelled=true;void window.dentayaDesktop?.localAyaCancel?.().catch(()=>{});}
    }
    async function settleMemoryWork():Promise<boolean> {
        const pending=pendingMemory.current;
        if(!pending)return true;
        pending.cancelled=true;
        let timer:ReturnType<typeof setTimeout>|undefined;
        try {
            return await Promise.race([
                (async()=>{await window.dentayaDesktop?.localAyaCancel?.().catch(()=>{});await pending.promise;return true;})(),
                new Promise<false>(resolve=>{timer=setTimeout(()=>resolve(false),2000);}),
            ]);
        } finally {clearTimeout(timer);}
    }
    async function beforeAcceptance() {
        if(lock.current||!live.current)return false;
        invalidateMemoryWork();
        return await settleMemoryWork()&&live.current;
    }
    function acceptanceBusyChange(value:boolean) {
        acceptanceLock.current=value;
        if(live.current)setAcceptanceBusy(value);
    }
    function extractMemory(work:MemoryWork) {
        const api=window.dentayaDesktop;
        if(!api?.localAyaChat||!live.current||latestTurn.current!==work.turn||activeSession.current!==work.sessionId||work.answer.length>12000)return;
        const pending:PendingMemory={cancelled:false,promise:Promise.resolve()};
        pendingMemory.current=pending;
        pending.promise=(async()=>{
            try {
                const result=await api.localAyaChat!({task:'memory',agent:true,assistantReply:work.answer,requestId:crypto.randomUUID(),prompt:work.prompt,model,locale,detail:'concise',history:[],workingMemory:work.memory});
                if(!result.ok||!result.workingMemory||pending.cancelled||!live.current||pendingMemory.current!==pending||latestTurn.current!==work.turn||activeSession.current!==work.sessionId||memoryVersion.current!==work.version||JSON.stringify(currentMemory.current)!==work.baseline)return;
                updateMemory(result.workingMemory);
            } catch { /* Optional extraction never replaces a completed answer. */ }
            finally {if(pendingMemory.current===pending)pendingMemory.current=null;}
        })();
    }
    async function send(text = draft, forceModel = false, preserveDraft = false) {
        const prompt = text.trim(), api = window.dentayaDesktop;
        if (!prompt || prompt.length>8000 || lock.current||acceptanceLock.current)
            return;
        const id=crypto.randomUUID();
        requestId.current=id;
        latestTurn.current=id;
        streamingDiagnostic.current=preserveDraft;
        lock.current = true;
        setBusy(true);
        setError('');
        setRetryRequest(null);
        setDiagnosticResult(null);
        setStreamingReply(null);
        if(!preserveDraft){setDraft('');setPendingQuestion(prompt);setRecoveredQuestion(false);}
        // Setup checks stay visible without becoming part of the user's work.
        const previous = preserveDraft?[]:messages.at(-1)?.role==='user'&&messages.at(-1)?.content===prompt?messages.slice(0,-1):messages;
        // Old guide replies remain visible in saved conversations, but cannot
        // masquerade as earlier model reasoning in a new inference.
        const modelHistory=previous.filter((message,index)=>{
            if(message.role==='assistant')return !message.engine||message.engine==='model';
            const next=previous[index+1];
            return !(next?.role==='assistant'&&(next.engine==='core'||next.engine==='guide'));
        });
        const requestMemory=preserveDraft?normalizeMemory(null):workingMemory;
        const requestOptions=preserveDraft?{...options,useKnowledge:false,useNote:false,note:''}:options;
        const pendingMessages:Message[]=[...previous, { role: 'user', content: prompt }];
        if(!preserveDraft){
            setMessages(pendingMessages);
            rememberWorkspace({messages:pendingMessages,draft:'',pendingQuestion:prompt});
        }
        let watchdog:ReturnType<typeof setTimeout>|undefined;
        let memoryWork:MemoryWork|undefined;
        let abortedError='';
        const aborted=new Promise<{ok:false;error:string}>(resolve=>{
            cancelRequest.current=()=>{abortedError='LOCAL_CANCELLED';resolve({ok:false,error:abortedError});};
            watchdog=setTimeout(()=>{abortedError='LOCAL_TIMEOUT';resolve({ok:false,error:abortedError});void api?.localAyaCancel?.().catch(()=>{});},185000);
        });
        try {
            if(!await settleMemoryWork())throw Error('LOCAL_BUSY');
            if(!live.current||requestId.current!==id)return;
            if(abortedError)throw Error(abortedError);
            const notebook=readAyaKnowledge(),knowledge=!preserveDraft&&notebook.enabled?notebook.items:[];
            // A status probe during background extraction may still say BUSY
            // after it has settled. The native bridge rechecks ownership/readiness.
            const canRequestModel=modelReady||status.error==='LOCAL_BUSY'&&desktop&&status.models.some(item=>item.name===model)&&!status.progress.running&&!status.ollama?.progress.running;
            const result = await resolveAyaReply({prompt,knowledge,history:modelHistory,workingMemory:requestMemory,options:{...requestOptions,style:detailed?'explained':requestOptions.style},locale,forceModel},{t,callModel:canRequestModel&&api?.localAyaChat?()=>Promise.race([api.localAyaChat!({ agent:false,workingMemory:requestMemory,requestId:id,knowledge,useMemory:!preserveDraft&&notebook.enabled,prompt, model, locale, detail: requestOptions.style === 'concise' && !detailed ? 'concise' : 'detailed', options:requestOptions, history:modelHistory }),aborted]):undefined});
            if (!live.current || requestId.current!==id)
                return;
            if(!result.ok){
                setLastModelFailure(true);
                setError(replyError(result.error));
                setRetryRequest({prompt,forceModel,preserveDraft});
                if(!preserveDraft){setDraft(prompt);setPendingQuestion('');rememberWorkspace({messages:pendingMessages,draft:prompt,pendingQuestion:''});}
                setVerified(false);
                return;
            }
            const reply:Message={role:'assistant',content:result.output,engine:result.engine,references:result.references};
            if(preserveDraft)setDiagnosticResult(reply);
            else {
                const next:Message[]=[...previous, { role: 'user', content: prompt }, reply];
                setMessages(next);setPendingQuestion('');setRecoveredQuestion(false);
                if(result.kind==='control'&&result.workingMemory)updateMemory(result.workingMemory);
                rememberWorkspace({messages:next,draft:'',pendingQuestion:''});
                if(result.engine==='model')memoryWork={turn:id,sessionId,baseline:JSON.stringify(currentMemory.current),version:memoryVersion.current,prompt,answer:result.output,memory:normalizeMemory(currentMemory.current)};
            }
            if (result.engine==='model') {
                setVerified(true);
                setLastModelFailure(false);
                playExperienceCue('message', 'ui');
            }
        }
        catch (failure) {
            if (live.current && requestId.current===id) {
                setRetryRequest({prompt,forceModel,preserveDraft});
                if(!preserveDraft){setDraft(prompt);setPendingQuestion('');rememberWorkspace({messages:pendingMessages,draft:prompt,pendingQuestion:''});}
                setVerified(false);
                setLastModelFailure(true);
                setError(replyError(failure instanceof Error?failure.message:'LOCAL_ERROR'));
            }
        }
        finally {
            clearTimeout(watchdog);
            if(requestId.current===id){
                lock.current = false;
                requestId.current='';
                cancelRequest.current=null;
                if (live.current){setBusy(false);setStreamingReply(null);}
                if(memoryWork)extractMemory(memoryWork);
            }
        }
    }
    const modelReady = desktop && status.ok && Boolean(model) && !status.progress.running;
    // A running background extraction or another local request does not make
    // the installed model disappear. Keep readiness strict for diagnostics.
    const runtimeBusy = desktop && status.error==='LOCAL_BUSY' && status.models.some(item=>item.name===model);
    const usingModel = modelReady || runtimeBusy;
    const interactionBusy=busy||acceptanceBusy;
    const statusText = acceptanceBusy?workspaceCopy.acceptanceBusy:busy ? copy.answering : checking ? copy.checking : runtimeBusy ? copy.modelBusy : modelReady ? lastModelFailure ? copy.modelFailed : verified ? copy.modelVerified : copy.modelReady : copy.unavailableStatus;
    function prepare(text:string) { if(lock.current||acceptanceLock.current)return;setDraft(text); document.getElementById('aya-local-message')?.focus(); }
    function changeMemory(memory:ReturnType<typeof normalizeMemory>) { if(lock.current||acceptanceLock.current)return;invalidateMemoryWork();memoryEdit.current={sessionId,baseline:JSON.stringify(normalizeMemory(workingMemory))};updateMemory(memory); }
    function newConversation() { if(lock.current||acceptanceLock.current)return;rememberWorkspace();invalidateMemoryWork();const id=crypto.randomUUID();activeSession.current=id;persistedSession.current={id,revision:null};setSaveConflict(null);memoryEdit.current=null;setMessages([]); updateMemory(normalizeMemory(null)); setSessionId(id); setDraft('');setPendingQuestion('');setRecoveredQuestion(false); setError(''); setRetryRequest(null);setDiagnosticResult(null);setVerified(false); setLastModelFailure(false); document.getElementById('aya-local-message')?.focus(); }
    function openConversation(id:string,preserveDraft=false) {
        if(lock.current||acceptanceLock.current)return;
        const stored=readAyaState().sessions.find(session=>session.id===id);
        if(!stored){setSaveConflict('missing');return;}
        rememberWorkspace();
        const recovered=ayaChatWorkspace.draft(id,readAyaState().options.saveHistory);
        invalidateMemoryWork();activeSession.current=id;
        persistedSession.current={id,revision:ayaSessionRevision(stored)};memoryEdit.current=null;setSaveConflict(null);setRetryRequest(null);setDiagnosticResult(null);setSessionId(id);setMessages(stored.messages);updateMemory(normalizeMemory(stored.workingMemory));if(!preserveDraft){setDraft(recovered.pendingQuestion||recovered.draft);setPendingQuestion(recovered.pendingQuestion);setRecoveredQuestion(Boolean(recovered.pendingQuestion));}setError('');setVerified(false);setLastModelFailure(false);
    }
    function saveSeparateConversation() {
        if(lock.current||acceptanceLock.current)return;
        rememberWorkspace();
        invalidateMemoryWork();const id=crypto.randomUUID();activeSession.current=id;persistedSession.current={id,revision:null};memoryEdit.current=null;setSessionId(id);setSaveConflict(null);
    }
    function closeSettings() { setSettingsOpen(false); settingsButton.current?.focus(); }
    return <UiNode as="section" className={`aya-chat aya-conversation-shell${settingsOpen?' aya-conversation-shell--settings':''}`} aria-label={copy.conversation} translateChildren={false}>
        <UiNode as="header" className="aya-chat-header" translateChildren={false}>
            <UiNode as="div" translateChildren={false}><Link href="/workspace" translateChildren={false}>← {copy.back}</Link><UiNode as="div" className="aya-title-row" translateChildren={false}><UiNode as="span" className="aya-core-emblem" aria-hidden="true"><UserText>A</UserText></UiNode><UiNode as="div" translateChildren={false}><UiNode as="h1">{copy.title}</UiNode><UiNode as="p">{copy.subtitle}</UiNode></UiNode></UiNode></UiNode>
            <UiNode as="div" className="aya-header-actions" translateChildren={false}>
                <UiNode as="button" type="button" disabled={interactionBusy||(!draft&&!pendingQuestion&&!diagnosticResult&&!messages.length&&!workingMemory.goal&&!workingMemory.decisions.length&&!workingMemory.openQuestions.length)} onClick={newConversation}>{copy.newChat}</UiNode>
                <UiNode as="button" ref={settingsButton} type="button" aria-controls="aya-conversation-settings" aria-expanded={settingsOpen} onClick={()=>{setSettingsOpen(!settingsOpen);}}>{copy.settings}</UiNode>
            </UiNode>
        </UiNode>
        <UiNode as="div" className="aya-conversation-layout" translateChildren={false}>
            <UiNode as="div" className="aya-conversation-main" translateChildren={false}>
                <UiNode as="div" className="aya-conversation-status" translateChildren={false}>
                    <UiNode as="span" className={`aya-status${usingModel?' aya-status--model':''}`} role="status">{statusText}</UiNode>
                    <UiNode as="span" className="aya-status-description">{usingModel?copy.localNote:copy.unavailableNote}</UiNode>
                </UiNode>
                {workingMemory.goal&&<UiNode as="button" className="aya-goal-preview" type="button" title={copy.memoryHint} onClick={()=>{setPanel('memory');setSettingsOpen(true);}}><UiNode as="span">{copy.goal}</UiNode><UserText>{workingMemory.goal}</UserText><OpenArrow/></UiNode>}
                <UiNode as="div" className="aya-chat-messages" role="log" aria-label={copy.conversation} aria-live="polite" aria-busy={busy} translateChildren={false}>
                    {!messages.length&&<UiNode as="div" className="aya-chat-welcome" translateChildren={false}><UiNode as="span" className="aya-welcome-kicker">AYA</UiNode><UiNode as="h2">{copy.welcome}</UiNode><UiNode as="p">{usingModel?copy.freeConversation:copy.unavailableNote}</UiNode>{!usingModel&&<UiNode as="button" type="button" onClick={()=>{setPanel('setup');setSettingsOpen(true);}}>{copy.configureModel}</UiNode>}</UiNode>}
                    {messages.map((m,i)=><UiNode as="article" key={i} className={`aya-message aya-message--${m.role}`} translateChildren={false}><UiNode as="strong">{m.role==='user'?copy.you:m.engine==='core'?copy.core:m.engine==='guide'?copy.document:copy.local}</UiNode><UiNode as="div" data-user-content><UserText>{m.content}</UserText></UiNode><AyaSources references={m.references} onInternalReference={href=>{if(href.startsWith('/ai#')){setPanel(href.includes('knowledge')?'memory':'setup');setSettingsOpen(true);}}}/>{m.role==='assistant'&&<CopyAyaResponse text={m.content}/>}</UiNode>)}
                    {diagnosticResult&&<UiNode as="article" className="aya-message aya-diagnostic-result" aria-label={copy.diagnosticResult} translateChildren={false}><UiNode as="strong">{copy.diagnosticResult}</UiNode><UiNode as="small">{diagnosticResult.engine==='model'?copy.local:copy.core}</UiNode><UiNode as="div" data-user-content><UserText>{diagnosticResult.content}</UserText></UiNode><UiNode as="small">{copy.diagnosticNote}</UiNode><CopyAyaResponse text={diagnosticResult.content}/></UiNode>}
                    {busy&&streamingReply?.text&&<UiNode as="article" className="aya-message aya-message--assistant" data-aya-streaming={streamingReply.diagnostic?'diagnostic':'conversation'} translateChildren={false}><UiNode as="strong">{streamingReply.diagnostic?copy.diagnosticResult:copy.local}</UiNode><UiNode as="div" data-user-content><UserText>{streamingReply.text}</UserText></UiNode></UiNode>}
                    {busy&&!streamingReply?.text&&<UiNode as="p" className="aya-thinking" role="status">{copy.answering}…</UiNode>}
                    <UiNode as="div" ref={end}/>
                </UiNode>
                {recoveredQuestion&&<UiNode as="div" role="status" className="aya-chat-error aya-draft-recovery" translateChildren={false}><UiNode as="p">{workspaceCopy.interrupted}</UiNode><UiNode as="button" type="button" disabled={interactionBusy||!draft.trim()} onClick={()=>void send()}>{copy.retry}</UiNode></UiNode>}
                {error&&<UiNode as="div" role="alert" className="aya-chat-error" translateChildren={false}><UiNode as="p">{error==='LOCAL_RUNTIME_MISSING'?copy.statusError:error}</UiNode>{!usingModel&&<UiNode as="button" type="button" onClick={()=>{setPanel('setup');setSettingsOpen(true);}}>{copy.configureModel}</UiNode>}{retryRequest&&!interactionBusy&&(retryRequest.preserveDraft||draft.trim())&&<UiNode as="div" translateChildren={false}><UiNode as="button" type="button" onClick={()=>void (retryRequest.preserveDraft?send(retryRequest.prompt,retryRequest.forceModel,true):send())}>{copy.retry}</UiNode>{!retryRequest.preserveDraft&&<UiNode as="button" type="button" onClick={()=>prepare(draft)}>{copy.edit}</UiNode>}</UiNode>}</UiNode>}
                {saveConflict&&<UiNode as="div" role="alert" className="aya-chat-error aya-session-conflict" translateChildren={false}><UiNode as="p">{saveConflict==='missing'?copy.sessionMissing:copy.sessionConflict}</UiNode><UiNode as="div" translateChildren={false}><UiNode as="button" type="button" disabled={interactionBusy||saveConflict==='missing'} onClick={()=>openConversation(sessionId,true)}>{copy.reloadConversation}</UiNode><UiNode as="button" type="button" disabled={interactionBusy||(!messages.length&&!workingMemory.goal&&!workingMemory.decisions.length&&!workingMemory.openQuestions.length)} onClick={saveSeparateConversation}>{copy.saveConversationCopy}</UiNode></UiNode></UiNode>}
                <UiNode as="form" className="aya-chat-composer" translateChildren={false} onSubmit={e=>{e.preventDefault();void send();}}>
                    <UiNode as="label" className="sr-only" htmlFor="aya-local-message">{copy.message}</UiNode><UiNode as="textarea" id="aya-local-message" value={draft} disabled={interactionBusy} maxLength={8000} rows={3} placeholder={copy.placeholder} onChange={e=>{if(acceptanceLock.current)return;setDraft(e.target.value);setPendingQuestion('');setRecoveredQuestion(false);}} onKeyDown={e=>{if(options.enterSends&&e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing&&e.nativeEvent.keyCode!==229){e.preventDefault();void send();}}}/>
                    <UiNode as="div" translateChildren={false}><UiNode as="span" className="aya-composer-hint">{options.enterSends?copy.enterHelp:copy.buttonHelp}</UiNode><UiNode as="span">{draft.length.toLocaleString(intlLocale())} / {(8000).toLocaleString(intlLocale())}</UiNode>{busy?<UiNode as="button" key="stop" type="button" onClick={e=>{e.preventDefault();stop();}}>{copy.stop}</UiNode>:<UiNode as="button" key="send" type="submit" disabled={interactionBusy||!draft.trim()}>{copy.send} ↑</UiNode>}</UiNode>
                </UiNode>
                <UiNode as="small" className="aya-chat-footnote" translateChildren={false}>{options.saveHistory?copy.saved:copy.temporary} {agentCopy.chatScope}</UiNode>
            </UiNode>
            {settingsOpen&&<UiNode as="aside" id="aya-conversation-settings" ref={settingsPanel} className="aya-conversation-settings" aria-label={copy.settings} tabIndex={-1} translateChildren={false} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();closeSettings();}}}>
                <UiNode as="div" className="aya-settings-heading" translateChildren={false}><UiNode as="h2">{copy.settings}</UiNode><UiNode as="button" type="button" onClick={closeSettings}>{copy.close}</UiNode></UiNode><UiNode as="p">{copy.panelNote}</UiNode>
                <UiNode as="div" className="aya-settings-nav" role="group" aria-label={copy.settings} translateChildren={false}>{(['setup','memory','history','preferences'] as const).map(key=><UiNode as="button" key={key} type="button" aria-pressed={panel===key} aria-controls="aya-settings-content" onClick={()=>setPanel(key)}>{copy[key]}</UiNode>)}</UiNode>
                <UiNode as="div" id="aya-settings-content" className="aya-settings-content" translateChildren={false}>
                    {panel==='setup'&&<><UiNode as="p">{copy.conversationEngineHelp}</UiNode><UiNode as="label" className="aya-detail-choice"><UiNode as="input" type="checkbox" checked={detailed} disabled={interactionBusy} onChange={e=>setDetailed(e.target.checked)}/>{copy.detailed}</UiNode>{desktop?<AyaEngineSetup status={status} model={model} busy={busy} checking={checking} onChoose={choose} onRefresh={refresh} onError={setError} beforeAcceptance={beforeAcceptance} onAcceptanceBusyChange={acceptanceBusyChange}/>:<UiNode as="p">{copy.browserNote}</UiNode>}<UiNode as="button" type="button" disabled={!modelReady||interactionBusy} onClick={()=>void send(copy.modelTestPrompt,true,true)}>{copy.test}</UiNode><ExportAyaConversation messages={messages} sessionId={sessionId} disabled={interactionBusy}/></>}
                    {panel==='memory'&&<><AyaWorkingMemoryPanel key={sessionId} sessionId={sessionId} memory={workingMemory} busy={interactionBusy} onChange={changeMemory}/><AyaKnowledgePanel/></>}

                    {panel==='preferences'&&<AyaPreferencesPanel/>}
                    {panel==='history'&&<UiNode as="section" className="aya-session-history" translateChildren={false}><UiNode as="h3">{copy.history}</UiNode>{!options.saveHistory?<UiNode as="p">{copy.historyOff}</UiNode>:!sessions.length?<UiNode as="p">{copy.historyEmpty}</UiNode>:sessions.map(x=><UiNode as="div" key={x.id} className="aya-history-item" translateChildren={false}><UiNode as="button" type="button" className="aya-history-open" disabled={interactionBusy} aria-label={copy.openConversation+': '+x.title} onClick={()=>openConversation(x.id)}><UserText>{x.title}</UserText><UiNode as="small">{new Intl.DateTimeFormat(intlLocale(),{dateStyle:'medium',timeStyle:'short'}).format(x.updatedAt)}</UiNode></UiNode><UiNode as="button" type="button" disabled={interactionBusy} onClick={()=>{if(lock.current||acceptanceLock.current)return;if(!deleteAyaSession(x.id)){setError(copy.storageError);return;}if(x.id===sessionId)newConversation();ayaChatWorkspace.forget(x.id,readAyaState().options.saveHistory);}}>{copy.remove}</UiNode></UiNode>)}</UiNode>}
                </UiNode>
            </UiNode>}
        </UiNode>
    </UiNode>;
}
