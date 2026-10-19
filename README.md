# DentAYA RC49

Sürüm `1.0.0-rc.49`, AYA Core `0.7.0`. Kimlik, amaç, yetenek, sınır, gizlilik ve yerel çalışma soruları TR/EN temel sohbet katmanına bağlandı. Birleşik sorular, konuyla bağlı kısa takipler ve sohbet içi isim hatırlama/düzeltme desteklenir. Model hazırsa önceliğini korur; modelin kimlik talimatları katalogdan bağımsızdır.

RC48 ile gelen: AYA sohbeti, çalışma belleği ve CAD paneli sadeleştirildi; manuel CAD deterministik ve modelden bağımsız kalır. Finans, mesajlaşma, randevu, ekip, lojistik ve vaka işlemlerinde taslak, hata ve eşzamanlı değişiklik kontrolleri güçlendirildi. Marka koleksiyonu 18 özgün ambleme çıkarıldı; ortak yükleme deneyiminin bütçesi 5 saniyedir.

Başlangıç: [KURULUM.txt](KURULUM.txt). Kullanım: [RC49_KULLANIM.md](RC49_KULLANIM.md). Güncel doğrulama ve tamamlanmayanlar: [RC49_KONTROL_RAPORU.md](RC49_KONTROL_RAPORU.md).

Ekranlar: [AYA RC49](verification/RC49/AYA_RC49_identity.png) · [CAD RC48](verification/RC48/CAD.png) · [Mesajlar RC48](verification/RC48/Messages.png) · [Logolar](public/brand/DentAYA_Premium_Logo_Koleksiyonu.png). Ekran kanıtları sentetik test verisi kullanır.

Bilgi kartı sayısı **220**; kaynaklar ve 30.000 içerik hedefinin durumu [bilgi kataloğu raporunda](DENTAL_BILGI_KATALOGU_RAPORU.md). 30.000 kayıtlık kapasite testinin verileri ürüne eklenmez.

Bu depo tam kaynak içerir. Windows Setup EXE'si, model ağırlıkları veya kişisel bağlantı ayarları içermez. Gerçek Windows, model ve sunucu doğrulamalarının sınırları test raporunda belirtilir.

Node.js 22.12+ ve npm 11+ gerekir. `npm ci` ve `npm run verify` temel kontrollerdir. Tarayıcı kontrolleri Playwright ve Chromium gerektirir; harici kurulum `DENTAYA_PLAYWRIGHT_MODULE` ve `DENTAYA_CHROMIUM_PATH` ile seçilebilir. Geçici test route'ları kullanan kontrolleri ve genel verify zincirini sırayla çalıştırın. `npm run dev -- --hostname 127.0.0.1 --port 3010` arayüzü, `npm run desktop:dev` Electron köprüsünü başlatır. Yerel sohbet hesap veya bulut API anahtarı istemez; gerçek vaka ve sunucu kaydı mevcut Supabase bağlantısını kullanır.

`CODEX_BASLANGIC_PROMPTU.md` ve `CODEX_DEVIR_NOTLARI.md` ilk RC46/WIP devir kayıtlarıdır. RC47 raporları önceki sürüme aittir. Web sitesi deposu ayrıdır.
