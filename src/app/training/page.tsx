"use client";
import UserText from "@/lib/i18n/UserText";
import { useTranslation } from '@/lib/i18n';
import UiNode from "@/lib/i18n/UiNode";
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from "@/lib/i18n/UiLink";
import { TRAINING_CASES } from '@/lib/training-cases';
import { supabase } from '@/lib/supabase';
import { dentayaError } from '@/lib/dentaya-errors';
const ScanViewer = dynamic(() => import('./ScanViewer'), { ssr: false, loading: () => <UiNode as="p">Görüntüleyici hazırlanıyor…</UiNode> });
export default function TrainingPage() {
    const { t: uiText } = useTranslation();
    const [id, setId] = useState(TRAINING_CASES[0].id), [checks, setChecks] = useState<string[]>([]), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
    const lock = useRef(false);
    const item = TRAINING_CASES.find(c => c.id === id)!;
    useEffect(() => {
        const requested = new URLSearchParams(window.location.search).get('case');
        if (TRAINING_CASES.some(c => c.id === requested))
            setId(requested!);
        try {
            const saved = JSON.parse(localStorage.getItem('dentaya:training-checks') ?? '[]');
            if (Array.isArray(saved))
                setChecks(saved.filter(v => typeof v === 'string'));
        }
        catch { }
    }, []);
    function toggle(key: string) {
        const next = checks.includes(key) ? checks.filter(k => k !== key) : [...checks, key];
        setChecks(next);
        try {
            localStorage.setItem('dentaya:training-checks', JSON.stringify(next));
        }
        catch {
            setMessage('Kontrol işaretleri bu cihazda kaydedilemedi.');
        }
    }
    async function addPatients() {
        if (lock.current)
            return;
        lock.current = true;
        setBusy(true);
        setMessage('');
        try {
            const a = await supabase.auth.getSession();
            const uid = a.data.session?.user.id;
            if (!uid)
                throw Error('Demo hasta eklemek için giriş yapın.');
            const m = await supabase.from('memberships').select('organization_id,role').eq('user_id', uid).eq('status', 'active').limit(1).maybeSingle();
            if (m.error)
                throw m.error;
            if (!m.data || !['owner', 'admin', 'dentist', 'assistant'].includes(m.data.role))
                throw Error('Demo hasta eklemek için klinik kayıt yetkisi gerekiyor.');
            const org = await supabase.from('organizations').select('org_type').eq('id', m.data.organization_id).single();
            if (org.error)
                throw org.error;
            if (org.data.org_type !== 'clinic')
                throw Error('Demo hastalar yalnız klinik hasta listesine eklenebilir.');
            const refs = TRAINING_CASES.map(c => 'DENTAYA-TRAINING-' + c.id);
            const existing = await supabase.from('patients').select('external_ref').eq('owning_org_id', m.data.organization_id).in('external_ref', refs);
            if (existing.error)
                throw existing.error;
            const known = new Set(existing.data?.map(p => p.external_ref));
            const missing = TRAINING_CASES.filter(c => !known.has('DENTAYA-TRAINING-' + c.id));
            if (missing.length) {
                const r = await supabase.from('patients').insert(missing.map(c => ({ owning_org_id: m.data!.organization_id, external_ref: 'DENTAYA-TRAINING-' + c.id, first_name: 'DEMO', last_name: c.name.replace('Demo ', ''), consent_status: 'demo', demo_mode: true, created_by: uid, dental_notes: `EĞİTİM KAYDI, gerçek hasta değildir. ${c.title}. ${c.description} Tarama galerisi: /training. Kaynak araştırma kişisiyle eşleştirilmez.` })));
                if (r.error)
                    throw r.error;
            }
            setMessage(missing.length ? `${missing.length} DEMO hasta eklendi. Hastalar ve Randevular ekranında seçebilirsiniz.` : 'Demo hastalar zaten mevcut; tekrar eklenmedi.');
        }
        catch (e) {
            setMessage(e instanceof Error ? e.message : dentayaError(e));
        }
        finally {
            lock.current = false;
            setBusy(false);
        }
    }
    return <UiNode as="main" className="training-page"><UiNode as="header" className="training-heading"><UiNode as="div"><UiNode as="span" className="work-kicker">EĞİTİM VE DEMO</UiNode><UiNode as="h2">Gerçek tarama, açık kaynak bilgisi</UiNode><UiNode as="p">Yedi kurgusal hasta senaryosu; ilk beş senaryoya bağlı beş gerçek araştırma STL’si. Demo isimleri taranan kişilerin kimliği değildir.</UiNode></UiNode><UiNode as="button" disabled={busy} onClick={() => void addPatients()}>{busy ? 'Ekleniyor…' : '7 demo hastayı kliniğe ekle'}</UiNode></UiNode>{message && <UiNode as="p" role="status">{message}</UiNode>}<UiNode as="div" className="training-layout"><UiNode as="nav" aria-label="Demo senaryolar">{TRAINING_CASES.map(c => <UiNode as="button" key={c.id} aria-pressed={c.id === id} onClick={() => setId(c.id)}><UiNode as="small">{c.id} · {c.scan ? 'GERÇEK STL' : 'TARAMA BEKLİYOR'}</UiNode><UiNode as="strong"><UserText>{uiText(c.title)}</UserText></UiNode><UiNode as="span"><UserText>{c.name}</UserText></UiNode></UiNode>)}</UiNode><UiNode as="section"><UiNode as="header"><UiNode as="span" className="work-kicker"><UserText>{item.name}</UserText> · {item.id}</UiNode><UiNode as="h2">{item.title}</UiNode><UiNode as="p">{item.description}</UiNode><UiNode as="p">FDI: {item.teeth.join(', ') || 'Dişsiz üst çene senaryosu'}</UiNode></UiNode>{item.scan ? <><ScanViewer key={item.id} arch={item.arch} path={`/training-scans/${item.scan}.stl`}/><UiNode as="div" className="training-links"><UiNode as="a" download href={`/training-scans/${item.scan}.stl`}>Orijinal STL’yi indir</UiNode><UiNode as="a" download href={`/training-scans/${item.scan}.json`}>Kaynak bölge etiketleri</UiNode><Link href="/scan-studio">Tarama stüdyosunu aç</Link></UiNode><UiNode as="p" className="training-source">ProsthoObjects3D · Tehran University of Medical Sciences · Kaynak #{item.scan}. <UiNode as="a" href="https://doi.org/10.5281/zenodo.18488594" target="_blank" rel="noreferrer">Veri seti</UiNode> · <UiNode as="a" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</UiNode>. STL dosyası değişmedi. Görüntüleyici yalnız kamerayı ve görünümü değiştirir.</UiNode></> : <UiNode as="div" className="training-missing"><UiNode as="h3">Uygun tarama dosyası henüz yok</UiNode><UiNode as="p">Bu senaryoda gerçek, izinli preparasyon veya dişsiz çene kaydı gerekiyor. Üretilmiş bir yüzey gerçek tarama yerine konmadı.</UiNode><Link href="/scan-studio">Elindeki STL / PLY dosyasını tarama stüdyosuna ekle →</Link></UiNode>}<UiNode as="section" className="training-checks"><UiNode as="h3">Manuel çalışma kartı</UiNode>{item.checks.map((text, i) => <UiNode as="label" key={text}><UiNode as="input" type="checkbox" checked={checks.includes(item.id + ':' + i)} onChange={() => toggle(item.id + ':' + i)}/>{text}</UiNode>)}<UiNode as="small">İşaretler bu cihazda tutulur. Klinik onay veya üretim doğrulaması değildir.</UiNode></UiNode><UiNode as="p">Bu dosyalar gerçek araştırma taramalarıdır; tamamlanmış protez, implant üretici kütüphanesi veya hastaya uygulanabilir tasarım içermez. Demo kayıtları eklemek taramaları özel hasta deposuna otomatik yüklemez.</UiNode></UiNode></UiNode></UiNode>;
}
