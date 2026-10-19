'use client';
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useRef, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ayaErrorMessage } from '@/lib/aya-errors';
export default function AyaHealth({ onVerified }: {
    onVerified: () => void;
}) {
    const { intlLocale } = useTranslation();
    const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
    const controller = useRef<AbortController | null>(null);
    useEffect(() => () => controller.current?.abort(), []);
    async function check() {
        if (controller.current)
            return;
        const abort = new AbortController();
        controller.current = abort;
        setBusy(true);
        setMessage('Sunucu, oturum ve model yanıtı kontrol ediliyor…');
        const timer = setTimeout(() => abort.abort(), 65000);
        try {
            const r = await fetch('/api/ai-assistant', { cache: 'no-store', signal: abort.signal });
            if (!r.ok)
                throw Error('DentAYA sunucusuna ulaşılamadı.');
            const status = await r.json();
            if (!status.enabled)
                throw Error(status.reason === 'cloud_disabled' ? 'Sunucuda sohbet kapalı. Bağlantı ayarını açıp anahtarınızı kaydedin.' : 'API anahtarı tanımlı değil. Bağlantı ayarından anahtarınızı girin.');
            if (!status.authConfigured)
                throw Error('Supabase oturum bağlantısı eksik. Sunucunun bağlantı ayarlarını tamamlayın.');
            const { data } = await supabase.auth.getSession();
            if (!data.session)
                throw Error('Oturum bulunamadı. DentAYA’ya yeniden giriş yapın.');
            const test = await fetch('/api/ai-assistant', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ action: 'diagnostic', prompt: 'Bağlantı testi' }), signal: abort.signal });
            const result = await test.json();
            if (!test.ok)
                throw Error(ayaErrorMessage(result.error));
            if (typeof result.output !== 'string' || !result.output.trim())
                throw Error('Model boş yanıt döndürdü.');
            onVerified();
            setMessage(`Model yanıtı doğrulandı · ${new Date().toLocaleTimeString(intlLocale())} · ${result.model}`);
        }
        catch (error) {
            if (!abort.signal.aborted)
                setMessage(error instanceof Error ? error.message : 'Bağlantı kurulamadı.');
            else
                setMessage('Kontrol durduruldu veya zaman aşımına uğradı.');
        }
        finally {
            clearTimeout(timer);
            controller.current = null;
            setBusy(false);
        }
    }
    return <UiNode as="div" className="aya-health"><UiNode as="button" type="button" disabled={busy} onClick={() => void check()}>{busy ? 'Test ediliyor…' : 'Canlı bağlantıyı test et'}</UiNode><UiNode as="small">Kısa bir model isteği gönderir.</UiNode>{message && <UiNode as="p" role="status">{message}</UiNode>}</UiNode>;
}
