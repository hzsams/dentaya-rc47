"use client";
import UiNode from "@/lib/i18n/UiNode";
import { useRef, useState } from 'react';
export default function AyaConnection() {
    const dialog = useRef<HTMLDialogElement>(null), lock = useRef(false);
    const [key, setKey] = useState(''), [model, setModel] = useState('gpt-5.4'), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
    async function save() { if (lock.current)
        return; const save = window.dentayaDesktop?.saveAyaConnection; if (!save) {
        setMessage('Bu bağlantı ayarı güncel Windows masaüstü sürümünde kullanılabilir. Web sürümünde sunucu yöneticisi model bağlantısını yapılandırmalıdır.');
        return;
    } lock.current = true; setBusy(true); setMessage('Gerçek model yanıtı deneniyor…'); try {
        const result = await save({ key: key.trim(), model: model.trim() });
        setMessage(result.message);
        if (result.ok)
            setKey('');
    }
    catch {
        setMessage('Bağlantı ayarı tamamlanamadı. Güncel kurulum paketini kullandığınızı kontrol edin.');
    }
    finally {
        lock.current = false;
        setBusy(false);
    } }
    return <><UiNode as="button" type="button" onClick={() => dialog.current?.showModal()}>Bağlantıyı ayarla</UiNode><UiNode as="dialog" ref={dialog} className="aya-config-dialog" onCancel={e => { if (busy)
        e.preventDefault();
    else
        setKey(''); }}><UiNode as="form" onSubmit={e => { e.preventDefault(); void save(); }}><UiNode as="header"><UiNode as="h2">AYA bağlantısı</UiNode><UiNode as="button" type="button" disabled={busy} aria-label="Bağlantı ayarını kapat" onClick={() => { setKey(''); dialog.current?.close(); }}>✕</UiNode></UiNode><UiNode as="p">API anahtarınızı yalnız bu cihazda girin. Anahtar Windows korumasıyla şifreli saklanır; sohbet geçmişine veya proje dosyalarına eklenmez.</UiNode><UiNode as="label">API anahtarı<UiNode as="input" autoFocus type="password" autoComplete="off" spellCheck={false} maxLength={512} value={key} onChange={e => setKey(e.target.value)} disabled={busy} placeholder="sk-…"/></UiNode><UiNode as="label">Model<UiNode as="input" value={model} maxLength={75} onChange={e => setModel(e.target.value)} disabled={busy}/></UiNode><UiNode as="details"><UiNode as="summary">Web sunucusu kurulumu</UiNode><UiNode as="p">Sunucunun özel ortam ayarlarına aşağıdaki değişkenleri ekleyin ve sunucuyu yeniden başlatın. Anahtarı NEXT_PUBLIC değişkenine koymayın.</UiNode><UiNode as="pre">DENTAYA_AI_CLOUD_ENABLED=true{'\n'}OPENAI_API_KEY=API_ANAHTARINIZ{'\n'}DENTAYA_AI_MODEL=gpt-5.4</UiNode></UiNode><UiNode as="p">Kaydetme sonrası DentAYA yeniden açılır. Önce açık vaka ve CAD çalışmalarınızı kaydedin. Doğrulama kısa bir model isteği gönderir; API kullanımı sağlayıcı hesabınızdan ücretlenebilir.</UiNode><UiNode as="p" role="status">{message}</UiNode><UiNode as="button" type="submit" disabled={busy || !key.trim() || !model.trim()}>{busy ? 'Kontrol ediliyor…' : 'Doğrula, kaydet ve yeniden başlat'}</UiNode></UiNode></UiNode></>;
}
