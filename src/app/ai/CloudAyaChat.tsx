"use client";
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { getLocale, useTranslation } from '@/lib/i18n';
import AyaHealth from "./AyaHealth";
import { ayaErrorMessage } from "@/lib/aya-errors";
import AyaConnection from "./AyaConnection";
import { useEffect, useRef, useState } from "react";
import Link from "@/lib/i18n/UiLink";
import { BrandLogo, BrandIcon } from "@/app/BrandLogo";
import { supabase } from "@/lib/supabase";
import { DENTAYA_RELEASE } from '@/lib/release';
type Message = {
    role: "user" | "assistant";
    content: string;
};
export default function AyaChat({ enabled, model }: {
    enabled: boolean;
    model: string | null;
}) {
    const { t: uiText, intlLocale } = useTranslation();
    const [messages, setMessages] = useState<Message[]>([]), [draft, setDraft] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
    const [mode, setMode] = useState("general"), [detailed, setDetailed] = useState(false);
    const [verified, setVerified] = useState(false);
    const ready = enabled || verified;
    const lock = useRef(false);
    const abort = useRef<AbortController | null>(null), end = useRef<HTMLDivElement | null>(null);
    useEffect(() => () => abort.current?.abort(), []);
    useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [messages, busy]);
    async function send(text = draft) {
        const prompt = text.trim();
        if (!prompt || lock.current || !ready)
            return;
        lock.current = true;
        const controller = new AbortController();
        abort.current = controller;
        const timeout = window.setTimeout(() => controller.abort(), 65000);
        setBusy(true);
        setError("");
        setDraft("");
        const previous = messages;
        setMessages([...previous, { role: "user", content: prompt }]);
        try {
            const { data } = await supabase.auth.getSession();
            if (!data.session)
                throw new Error("Oturumunuz sona erdi. Yeniden giriş yapın.");
            const response = await fetch("/api/ai-assistant", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ prompt, locale: getLocale(), action: mode, detail: detailed ? "detailed" : "concise", history: previous.slice(-12).map(m => ({ ...m, content: m.content.slice(0, 2000) })) }), signal: controller.signal });
            if (!response.ok) {
                const failure = await response.json().catch(() => null);
                throw new Error(ayaErrorMessage(failure?.error));
            }
            const result: unknown = await response.json();
            if (!result || typeof result !== "object" || !("output" in result) || typeof result.output !== "string" || !result.output.trim())
                throw new Error("AYA boş yanıt döndürdü. Sorunuzu yeniden deneyin.");
            setVerified(true);
            setMessages([...previous, { role: "user", content: prompt }, { role: "assistant", content: result.output }]);
        }
        catch (e) {
            setVerified(false);
            setMessages(previous);
            setDraft(prompt);
            setError(controller.signal.aborted ? "Yanıt durduruldu veya zaman aşımına uğradı. Sorunuz korundu." : e instanceof Error ? e.message : "Bağlantı kurulamadı.");
        }
        finally {
            window.clearTimeout(timeout);
            lock.current = false;
            setBusy(false);
            abort.current = null;
        }
    }
    return <UiNode as="section" className="aya-chat" aria-label="AYA çalışma asistanı">
  <UiNode as="header" className="aya-chat-header"><UiNode as="div"><Link href="/workspace">{uiText("← Çalışma alanı")}</Link><BrandLogo width={160} height={36}/><UiNode as="h1">AYA</UiNode><UiNode as="p">{uiText('AYA çalışma asistanı')}<UserText> · {DENTAYA_RELEASE.version}</UserText></UiNode></UiNode><UiNode as="div"><UiNode as="span" className="aya-status" title={model ? `Bağlı model: ${model}` : undefined}>{verified ? "Model yanıtı doğrulandı" : enabled ? "Bağlantı tanımlı · henüz test edilmedi" : "Bağlantı gerekli"}</UiNode><AyaConnection /><AyaHealth onVerified={() => setVerified(true)}/><UiNode as="button" disabled={busy || !messages.length} onClick={() => { setMessages([]); setError(""); setDraft(""); }}>Yeni sohbet</UiNode></UiNode></UiNode>
  <UiNode as="div" className="aya-mode-bar"><UiNode as="label">Çalışma biçimi<UiNode as="select" value={mode} disabled={busy} onChange={e => setMode(e.target.value)}><UiNode as="option" value="general">Genel yardım</UiNode><UiNode as="option" value="cad">CAD ve tarama incelemesi</UiNode><UiNode as="option" value="planning">İş planı ve takip</UiNode><UiNode as="option" value="writing">Mesaj ve metin hazırlama</UiNode></UiNode></UiNode><UiNode as="label" className="aya-detail"><UiNode as="input" type="checkbox" checked={detailed} disabled={busy} onChange={e => setDetailed(e.target.checked)}/>Ayrıntılı değerlendirme</UiNode></UiNode>
  <UiNode as="div" className="aya-chat-messages" role="log" aria-label="Sohbet mesajları" aria-live="polite">
   {!messages.length && <UiNode as="div" className="aya-chat-welcome"><BrandIcon width={46} height={46}/><UiNode as="h2">Nasıl yardımcı olabilirim?</UiNode><UiNode as="p">Sorunu ve ulaşmak istediğiniz sonucu yazın. AYA açıklama, kontrol adımları ve metin taslakları hazırlayabilir.</UiNode><UiNode as="div" className="aya-prompts">{["Dijital dental iş akışını adım adım açıkla", "Laboratuvara gönderilecek kısa bir mesaj hazırla", "Bir kron tasarımında hangi kontroller yapılır?"].map(q => <UiNode as="button" key={q} disabled={!ready || busy} onClick={() => void send(q)}>{q}</UiNode>)}</UiNode></UiNode>}
   {messages.map((m, i) => <UiNode as="article" key={i} className={`aya-message aya-message--${m.role}`}><UiNode as="strong">{m.role === "user" ? "Siz" : "AYA"}</UiNode><UiNode as="div"><UserText>{m.content}</UserText></UiNode>{m.role === "assistant" && <UiNode as="button" onClick={() => void navigator.clipboard.writeText(m.content).catch(() => setError("Kopyalanamadı; metni seçerek kopyalayabilirsiniz."))}>Kopyala</UiNode>}</UiNode>)}
   {busy && <UiNode as="p" role="status" className="aya-thinking">AYA yanıt hazırlıyor…</UiNode>}<UiNode as="div" ref={end}/>
  </UiNode>
  {error && <UiNode as="div" role="alert" className="aya-chat-error">{error}{draft && ready && !busy && <UiNode as="button" type="button" onClick={() => void send()}>Yeniden dene</UiNode>}</UiNode>}
  {!ready && <UiNode as="p" className="aya-chat-error">Canlı sohbet bağlı değil. Üstteki “Bağlantıyı ayarla” düğmesinden API anahtarınızı tanımlayın.</UiNode>}
  <UiNode as="form" className="aya-chat-composer" onSubmit={e => { e.preventDefault(); void send(); }}><UiNode as="label" className="sr-only" htmlFor="aya-message">AYA’ya mesajınız</UiNode><UiNode as="textarea" id="aya-message" value={draft} maxLength={8000} disabled={busy || !ready} onChange={e => setDraft(e.target.value)} placeholder="AYA’ya bir şey sorun…" rows={3} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        void send();
    } }}/><UiNode as="div"><UiNode as="span">{draft.length.toLocaleString(intlLocale())} / 8.000 · Shift + Enter: yeni satır</UiNode>{busy ? <UiNode as="button" key="stop" type="button" onClick={e => { e.preventDefault(); abort.current?.abort(); }}>{uiText("Durdur ■")}</UiNode> : <UiNode as="button" key="send" type="submit" disabled={!ready || !draft.trim()}>{uiText("Gönder ↑")}</UiNode>}</UiNode></UiNode>
  <UiNode as="small" className="aya-chat-footnote">AYA hata yapabilir. Önemli bilgileri doğrulayın. Sohbet bu sayfadan ayrılınca silinir. Hasta veya vaka verileri otomatik gönderilmez; AYA kayıt değiştirmez.</UiNode>
 </UiNode>;
}
