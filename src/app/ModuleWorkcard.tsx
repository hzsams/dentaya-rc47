"use client";
import UiNode from "@/lib/i18n/UiNode";
import { useEffect, useState } from 'react';
const CARDS: Record<string, {
    title: string;
    items: string[];
}> = {
    clinic: { title: 'Gün başı hazırlığı', items: ['Günün randevularını kontrol ettim', 'Prova ve teslim işlerini ayırdım', 'Karar bekleyen vakaları inceledim'] },
    lab: { title: 'Üretim öncesi devir', items: ['Eksik dosyaları belirledim', 'Termin ve sorumluyu kontrol ettim', 'Klinikten beklenen onayları ayırdım'] },
    cases: { title: 'Vaka devir kartı', items: ['İş tanımı ve FDI üyelerini kontrol ettim', 'Termin ve sorumlu bilgisi tamam', 'Eksik kayıtları vaka notuna yazdım'] },
    patients: { title: 'Hasta kaydı kontrolü', items: ['Mükerrer kayıt kontrolü yaptım', 'İletişim bilgilerini doğruladım', 'Demo kayıtları gerçek hastalardan ayırdım'] },
    scans: { title: 'Dosya teslim kontrolü', items: ['Üst/alt çene dosyalarını ayırdım', 'Kapanış kaydını kontrol ettim', 'Dosya adı ve kaynak bilgisini kaydettim'] },
    'scan-studio': { title: 'Tarama inceleme sırası', items: ['Doğru hasta ve vakayı seçtim', 'Model yönünü ve birimini kontrol ettim', 'Eksik bölgeleri not ettim'] },
    appointments: { title: 'Günün kapanışı', items: ['Tamamlanan randevuları işaretledim', 'Gelmeyen ve iptal edilenleri ayırdım', 'Ertesi günün prova/teslim listesini kontrol ettim'] },
    finance: { title: 'Mutabakat masası', items: ['Teklif ve onay durumlarını karşılaştırdım', 'Tahsilat kayıtlarını kontrol ettim', 'Uyuşmazlıkları sorumluya not ettim'] },
    logistics: { title: 'Paket teslim kontrolü', items: ['Vaka ve paket bilgisini eşleştirdim', 'Teslim adresini doğruladım', 'Takip ve teslim durumunu kaydettim'] },
    operations: { title: 'Darboğaz kontrolü', items: ['Geciken işleri belirledim', 'Eksik veri bekleyenleri ayırdım', 'Her bekleyen iş için sorumluyu kontrol ettim'] },
    messages: { title: 'Görüşme kapanışı', items: ['Görüşmeyi doğru vakayla ilişkilendirdim', 'Kararı vaka notuna aktardım', 'Beklenen yanıt ve sorumluyu belirledim'] },
    community: { title: 'Paylaşım kontrolü', items: ['Paylaşım için izinleri kontrol ettim', 'Hasta kimliği içeren ayrıntıları kaldırdım', 'Kaynak ve açıklama ekledim'] },
    team: { title: 'Ekip devir kontrolü', items: ['Üye rollerini kontrol ettim', 'Bekleyen davetleri inceledim', 'Görev devrinde vaka sorumlularını güncelledim'] },
    labs: { title: 'Laboratuvar bağlantısı', items: ['Doğru kurum kaydını seçtim', 'İletişim bilgisini kontrol ettim', 'İş kapsamı ve teslim süresini netleştirdim'] },
    notifications: { title: 'Bildirim değerlendirmesi', items: ['Termin değişikliklerini kontrol ettim', 'Onay taleplerini inceledim', 'Tamamlanan bildirimleri okundu işaretledim'] },
    settings: { title: 'Çalışma düzeni kontrolü', items: ['Kurum bilgilerini kontrol ettim', 'Görünüm ve erişim tercihlerini düzenledim', 'Yedekleme sorumlusunu belirledim'] },
};
export default function ModuleWorkcard({ module }: {
    module: string;
}) {
    const card = CARDS[module];
    const [checked, setChecked] = useState<number[]>([]);
    const [error, setError] = useState('');
    const key = 'dentaya:workcard:' + module;
    useEffect(() => { try {
        const v = JSON.parse(localStorage.getItem(key) ?? '[]');
        setChecked(Array.isArray(v) ? v.filter(n => Number.isInteger(n) && n >= 0 && n < 3) : []);
    }
    catch {
        setChecked([]);
    } }, [key]);
    function save(next: number[]) { setChecked(next); try {
        localStorage.setItem(key, JSON.stringify(next));
        setError('');
    }
    catch {
        setError('Bu cihazda kaydedilemedi.');
    } }
    if (!card)
        return null;
    return <UiNode as="details" className="module-workcard"><UiNode as="summary"><UiNode as="span">{card.title}</UiNode><UiNode as="small">{checked.length} / {card.items.length} · kişisel kontrol listesi</UiNode></UiNode><UiNode as="div">{card.items.map((text, i) => <UiNode as="label" key={text}><UiNode as="input" type="checkbox" checked={checked.includes(i)} onChange={() => save(checked.includes(i) ? checked.filter(n => n !== i) : [...checked, i])}/>{text}</UiNode>)}<UiNode as="footer"><UiNode as="small">Bu cihazda saklanır; vaka durumunu veya ekip onayını değiştirmez.</UiNode><UiNode as="button" onClick={() => save([])}>Yeni kontrol başlat</UiNode></UiNode>{error && <UiNode as="p" role="status">{error}</UiNode>}</UiNode></UiNode>;
}
