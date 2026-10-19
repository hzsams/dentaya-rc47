'use client';
import {CopyAyaResponse,ExportAyaConversation} from './AyaMessageTools';
import {WORK_TOOLS_TEXT} from '@/lib/i18n/work-tools';
import {dentalFactLanguage} from '@/lib/dental-facts';
import {normalizeMemory} from '../../../electron/aya/agent.cjs';
import {ayaAgentText} from '@/lib/i18n/aya-agent';
import {resolveAyaReply} from '@/lib/aya-conversation';
import {fallbackReply} from '../../../electron/aya/conversation.cjs';
import {AYA_CATALOG_TEXT} from '@/lib/i18n/aya-catalog';
import AyaQuestionLibrary from './AyaQuestionLibrary';
import {readAyaKnowledge} from '@/lib/aya-knowledge';
import AyaKnowledgePanel from './AyaKnowledgePanel';
import AyaEngineSetup from './AyaEngineSetup';
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useEffect, useRef, useState } from 'react';
import Link from "@/lib/i18n/UiLink";
import { useTranslation } from '@/lib/i18n';
import AyaPreferencesPanel from './AyaPreferencesPanel';
import { useAyaState, readAyaState, saveAyaSession, deleteAyaSession, type AyaMessage } from '@/lib/aya-local-state';
import { playExperienceCue } from '@/lib/experience-audio';
import { DENTAYA_RELEASE } from '@/lib/release';
type Message = AyaMessage;
type LocalStatus = Awaited<ReturnType<NonNullable<NonNullable<Window['dentayaDesktop']>['localAyaStatus']>>>;
const empty: LocalStatus = { ok: false, models: [], progress: { running: false, status: '', completed: 0, total: 0 } };
const ERROR: Record<string, string> = { LOCAL_RUNTIME_MISSING: 'Yerel motor kontrol edilemedi.', LOCAL_BUSY: 'Model şu anda başka bir işlemde. İşlemin bitmesini bekleyin.', MODEL_MISSING: 'Seçilen model bu bilgisayarda bulunamadı. Listeyi yenileyin veya modeli indirin.', LOCAL_MODEL_REQUIRED: 'Bu model yerel metin sohbeti için uygun değil. Yerel bir metin modeli seçin.', LOCAL_CANCELLED: 'Yanıt durduruldu. Sorunuz korundu.', LOCAL_TIMEOUT: 'Model zaman aşımına uğradı. Daha küçük bir model deneyin.', LOCAL_EMPTY_RESPONSE: 'Model boş yanıt verdi. Sorunuz korundu.' };
export default function AyaChat() {
    const { t, locale, intlLocale } = useTranslation();
    const { options, sessions } = useAyaState();
    const agentCopy=ayaAgentText(locale);
    const [workingMemory,setWorkingMemory]=useState(()=>normalizeMemory(null));
    const copy=WORK_TOOLS_TEXT[dentalFactLanguage(locale)];
    const catalogCopy=AYA_CATALOG_TEXT[locale==='tr'?'tr':'en'];
    const [sessionId, setSessionId] = useState(''), [loaded, setLoaded] = useState(false), [guideMode, setGuideMode] = useState(true);
    const [status, setStatus] = useState<LocalStatus>(empty), [model, setModel] = useState(''), [draft, setDraft] = useState(''), [messages, setMessages] = useState<Message[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState(''), [checking, setChecking] = useState(false), [detailed, setDetailed] = useState(false), [desktop, setDesktop] = useState(false), [verified, setVerified] = useState(false);
    const modeChosen=useRef(false),requestId=useRef(''),cancelRequest=useRef<(()=>void)|null>(null);
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
            if(result.ok&&result.models.length&&!modeChosen.current)setGuideMode(false);
            setModel(old => result.models.some(m => m.name === old) ? old : result.models[0]?.name ?? '');
        }
        catch {
            if (live.current)
                setError('Yerel motor kontrol edilemedi.');
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
    useEffect(() => setVerified(false), [model]);
    useEffect(() => {
        if (loaded && options.saveHistory && messages.length && !saveAyaSession({ id: sessionId, title: messages[0].content.slice(0, 70), updatedAt: Date.now(), messages, workingMemory }))
            setError('Sohbet saklanamadı.');
    }, [loaded, sessionId, messages, workingMemory, options.saveHistory]);
    useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [messages, busy]);
    function choose(value: string) {
        setModel(value);
        setVerified(false);
        try {
            localStorage.setItem('dentaya:aya-local-model', value);
        }
        catch {
            setError('Model tercihi bu cihazda kaydedilemedi.');
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
            const result = await resolveAyaReply({prompt,knowledge,history:previous,options:{...options,style:detailed?'explained':options.style},locale,forceModel},{t,callModel:(!guideMode||forceModel)&&modelReady&&api?.localAyaChat?()=>Promise.race([api.localAyaChat!({ agent:true,workingMemory,requestId:id,knowledge,useMemory:notebook.enabled,prompt, model, locale, detail: options.style === 'concise' && !detailed ? 'concise' : 'detailed', options, history: previous }),aborted]):undefined});
            if (!live.current || requestId.current!==id)
                return;
            setMessages([...previous, { role: 'user', content: prompt }, { role: 'assistant', content: result.output, engine:result.engine, references: result.references }]);
            if(result.workingMemory)setWorkingMemory(result.workingMemory);
            if(result.warning){
                setError(result.warning==='LOCAL_INVALID_PLAN'?agentCopy.invalid:ERROR[result.warning]||'Yerel model yanıt veremedi. Motoru ve model seçimini kontrol edin.');
                setDraft(prompt);
                setVerified(false);
            }
            if (result.engine==='model') {
                setVerified(true);
                playExperienceCue('message', 'ui');
            }
        }
        catch {
            if (live.current && requestId.current===id) {
                const fallback=fallbackReply(prompt,{locale,history:previous,modelError:'LOCAL_ERROR'});
                setMessages([...previous,{role:'user',content:prompt},{role:'assistant',content:fallback.output,engine:'core',references:[]}]);
                setDraft(prompt);
                setVerified(false);
                setError('Yerel model yanıt veremedi. Motoru ve model seçimini kontrol edin.');
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
    return <><UiNode as="section" className="aya-chat" aria-label="Yerel AYA">
 <UiNode as="header" className="aya-chat-header"><UiNode as="div"><Link href="/workspace">{t('← Çalışma alanı')}</Link><UiNode as="h1">AYA <UiNode as="small">Yerel</UiNode></UiNode><UiNode as="p">{t('AYA çalışma asistanı')}<UserText> · {DENTAYA_RELEASE.version}</UserText></UiNode></UiNode><UiNode as="div"><UiNode as="span" className="aya-status" translateChildren={false}>{guideMode||!modelReady?catalogCopy.status:modelReady && verified ? t('Yerel model yanıtı alındı') : t('Yerel model hazır · henüz yanıt testi yapılmadı')}</UiNode><UiNode as="button" disabled={busy || !messages.length} onClick={() => { setMessages([]); setWorkingMemory(normalizeMemory(null)); setSessionId(crypto.randomUUID()); setDraft(''); setError(''); }}>Yeni sohbet</UiNode></UiNode></UiNode>
 {desktop?<AyaEngineSetup status={status} model={model} busy={busy} checking={checking} onChoose={choose} onRefresh={refresh} onError={setError}/>:<UiNode as="p">Bu özellik kurulu DentAYA masaüstü uygulamasında çalışır. Tarayıcı sürümünden yerel motora erişilmez.</UiNode>}
 <UiNode as="details" className="aya-working-memory" translateChildren={false}><UiNode as="summary">{agentCopy.memory}</UiNode><UiNode as="p">{agentCopy.temporary}</UiNode><UiNode as="strong">{agentCopy.goal}</UiNode><UserText>{workingMemory.goal||'—'}</UserText>{workingMemory.decisions.map((item,i)=><UiNode as="p" key={'d'+i}><UserText>{item}</UserText></UiNode>)}{workingMemory.openQuestions.map((item,i)=><UiNode as="p" key={'q'+i}><UserText>{item}</UserText></UiNode>)}<UiNode as="button" disabled={busy} onClick={()=>setWorkingMemory(normalizeMemory(null))}>{agentCopy.clear}</UiNode></UiNode>
 <AyaKnowledgePanel/>
 <AyaQuestionLibrary disabled={busy} onChoose={question=>{setDraft(question);document.getElementById('aya-local-message')?.focus();}}/>
 <UiNode as="details" className="aya-local-setup"><UiNode as="summary">Yanıt ve çalışma tercihleri</UiNode><AyaPreferencesPanel /></UiNode>
 <UiNode as="details" className="aya-local-setup"><UiNode as="summary">Sohbet geçmişi</UiNode>{sessions.map(x => <UiNode as="div" key={x.id}><UiNode as="button" disabled={busy} onClick={() => { setSessionId(x.id); setMessages(x.messages); setWorkingMemory(normalizeMemory(x.workingMemory)); setDraft(''); setVerified(false); }}><UserText>{x.title}</UserText></UiNode><UiNode as="button" disabled={busy} onClick={() => {
                    deleteAyaSession(x.id);
                    if (x.id === sessionId) {
                        setMessages([]);
                        setWorkingMemory(normalizeMemory(null));
                        setDraft('');setError('');setVerified(false);
                        setSessionId(crypto.randomUUID());
                    }
                }}>Sil</UiNode></UiNode>)}{!options.saveHistory && <UiNode as="p">Geçmiş saklama kapalı.</UiNode>}</UiNode>
 <UiNode as="div" className="aya-mode-bar"><UiNode as="label"><UiNode as="input" type="checkbox" checked={guideMode} disabled={busy} onChange={e => {modeChosen.current=true;setGuideMode(e.target.checked);}}/> AYA Core · çevrimdışı rehber</UiNode><UiNode as="label"><UiNode as="input" type="checkbox" checked={detailed} disabled={busy} onChange={e => setDetailed(e.target.checked)}/> Ayrıntılı yanıt</UiNode><UiNode as="button" disabled={!modelReady || busy} onClick={() => void send('Kısaca kendini tanıt ve DentAYA içinde neler yapabileceğini açıkla.',true)}>Yerel yanıtı test et</UiNode></UiNode>
 <UiNode as="div" className="aya-work-tools" translateChildren={false} aria-label={copy.examples}><UiNode as="strong">{copy.examples}</UiNode>{[{label:copy.calculate,prompt:'1800 × 0,18'},{label:copy.convert,prompt:locale==='tr'?'12 cm kaç mm?':'12 cm to mm?'},{label:copy.check,prompt:locale==='tr'?'Kontrol listesi':'Workspace checklist'},{label:copy.handoff,prompt:locale==='tr'?'Teslim notu taslağı':'Handoff draft'}].map(tool=><UiNode as="button" key={tool.label} type="button" disabled={busy} onClick={()=>{setDraft(tool.prompt);document.getElementById('aya-local-message')?.focus();}}>{tool.label}</UiNode>)}</UiNode>
 <ExportAyaConversation messages={messages} sessionId={sessionId} disabled={busy}/>
 <UiNode as="div" className="aya-chat-messages" role="log" aria-live="polite">{!messages.length && <UiNode as="div" className="aya-chat-welcome"><UiNode as="h2">Nasıl yardımcı olabilirim?</UiNode><UiNode as="p">Bir iş akışını açıklayabilir, mesaj taslağı hazırlayabilir veya kontrol adımlarını düzenleyebilirim.</UiNode></UiNode>}{messages.map((m, i) => <UiNode as="article" key={i} className={`aya-message aya-message--${m.role}`}><UiNode as="strong">{m.role === 'user' ? 'Siz' : m.engine==='core' ? 'AYA Core' : m.engine==='guide' ? 'Uygulama rehberi · belge metni' : 'AYA · yerel'}</UiNode><UiNode as="div" data-user-content><UserText>{m.content}</UserText></UiNode>{m.references?.map(r => <Link key={r.id} href={r.href}><UserText>{r.title}</UserText> →</Link>)}{m.role==='assistant'&&<CopyAyaResponse text={m.content}/>}</UiNode>)}{busy && <UiNode as="p" role="status" translateChildren={false}>{catalogCopy.busy}</UiNode>}<UiNode as="div" ref={end}/></UiNode>
 {error && <UiNode as="p" role="alert" className="aya-chat-error">{error}</UiNode>}
 <UiNode as="form" className="aya-chat-composer" onSubmit={e => { e.preventDefault(); void send(); }}><UiNode as="label" className="sr-only" htmlFor="aya-local-message">AYA’ya mesajınız</UiNode><UiNode as="textarea" id="aya-local-message" value={draft} disabled={busy} maxLength={8000} rows={3} placeholder="AYA’ya bir şey sorun…" onChange={e => setDraft(e.target.value)} onKeyDown={e => {
                if (options.enterSends && e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send();
                }
            }}/><UiNode as="div"><UiNode as="span">{draft.length.toLocaleString(intlLocale())} / {(8000).toLocaleString(intlLocale())}</UiNode>{busy ? <UiNode as="button" key="stop" type="button" onClick={e => { e.preventDefault(); stop(); }}>{t('Durdur')}</UiNode> : <UiNode as="button" key="send" type="submit" disabled={!draft.trim()}>{t('Gönder')}</UiNode>}</UiNode></UiNode>
 <UiNode as="small" className="aya-chat-footnote" translateChildren={false}>{agentCopy.chatScope} {t(options.saveHistory ? "Bu sohbet bu cihazda saklanıyor." : "Sohbet sayfadan ayrılınca silinir.")} {t(guideMode||!modelReady?'AYA Core · çevrimdışı rehber':'Yazdığınız bilgiler yerel model motoruna iletilir.')}</UiNode>
 </UiNode></>;
}
