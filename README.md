# DentAYA RC51

Sürüm `1.0.0-rc.51`, AYA Core `0.8.0`. RC51; iş yöneticisini, ortak uygulama çerçevesini ve CAD ekranını masaüstü çalışma düzenine taşır. Kompakt belge sekmeleri, modül listesi, vaka kuyruğu, durum çubuğu ve kenarlara bağlı CAD panelleri günlük çalışmayı öne çıkarır. Tasarım DentAYA'ya aittir; exocad/3Shape günlük kullanım ergonomisi referans alınır.

AYA'nın RC50 çalışma belleği, desteklenen çok adımlı görevleri ve güncel CAD bağlamına dayalı önerileri korunur. Yerel model normal konuşmada önceliklidir; manuel CAD deterministik ve modelden bağımsız kalır. CAD işlemi mevcut kapılar ve kullanıcı tıklamasıyla başlar. RC49 kimlik/amaç, isim hatırlama ve kısa takip davranışları sürer.

RC48 ile gelen: AYA sohbeti, çalışma belleği ve CAD paneli sadeleştirildi; manuel CAD deterministik ve modelden bağımsız kalır. Finans, mesajlaşma, randevu, ekip, lojistik ve vaka işlemlerinde taslak, hata ve eşzamanlı değişiklik kontrolleri güçlendirildi. Marka koleksiyonu 18 özgün ambleme çıkarıldı; ortak yükleme deneyiminin bütçesi 5 saniyedir.

Başlangıç: [KURULUM.txt](KURULUM.txt). Yeni düzen: [RC51_KULLANIM.md](RC51_KULLANIM.md). Güncel doğrulama ve tamamlanmayanlar: [RC51_KONTROL_RAPORU.md](RC51_KONTROL_RAPORU.md). Önceki sürümlerin doğrulaması bu değişikliğin kanıtı değildir; RC51 test sonuçları kendi raporunda kaydedilir.

RC51 ekranları: [İş yöneticisi](verification/RC51/WorkManager.png) · [CAD](verification/RC51/CAD.png) · [Mesajlar](verification/RC51/Messages.png) · [Dar ekran](verification/RC51/Mobile.png). Ekranlar gerçek arayüzden sentetik test verisiyle alınmıştır.

Önceki sürüm ekranları: [AYA RC50](verification/RC50/AYA_RC50_memory_and_multistep.png) · [CAD RC48](verification/RC48/CAD.png) · [Mesajlar RC48](verification/RC48/Messages.png) · [Logolar](public/brand/DentAYA_Premium_Logo_Koleksiyonu.png). Bunlar RC51 düzeninin kanıtı değildir; ekran kanıtları sentetik test verisi kullanır.

Bilgi kartı sayısı **220**; kaynaklar ve 30.000 içerik hedefinin durumu [bilgi kataloğu raporunda](DENTAL_BILGI_KATALOGU_RAPORU.md). 30.000 kayıtlık kapasite testinin verileri ürüne eklenmez.

Bu depo tam kaynak içerir. Windows Setup EXE'si, model ağırlıkları veya kişisel bağlantı ayarları içermez. Gerçek Windows, model ve sunucu doğrulamalarının sınırları test raporunda belirtilir.

Node.js 22.12+ ve npm 11+ gerekir. `npm ci` ve `npm run verify` temel kontrollerdir. `npm run verify:desktop-shell-browser` gerçek uygulama rotalarında masaüstü düzenini, klavye erişimini ve sentetik veriyle modül davranışlarını kontrol eder. Tarayıcı kontrolleri Playwright ve Chromium gerektirir; harici kurulum `DENTAYA_PLAYWRIGHT_MODULE` ve `DENTAYA_CHROMIUM_PATH` ile seçilebilir. Geçici test rotaları kullanan kontrolleri ve genel verify zincirini sırayla çalıştırın. `npm run dev -- --hostname 127.0.0.1 --port 3010` arayüzü, `npm run desktop:dev` Electron köprüsünü başlatır. Yerel sohbet hesap veya bulut API anahtarı istemez; gerçek vaka ve sunucu kaydı mevcut Supabase bağlantısını kullanır. Yeni görünüm erişim koşullarını değiştirmez.

`CODEX_BASLANGIC_PROMPTU.md` ve `CODEX_DEVIR_NOTLARI.md` ilk RC46/WIP devir kayıtlarıdır. RC47 raporları önceki sürüme aittir. Web sitesi deposu ayrıdır.
