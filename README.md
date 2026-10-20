# DentAYA RC52

Sürüm `1.0.0-rc.52`, AYA Core `0.8.0`. RC52, aydınlık panelleri ve erik moru başlıklarıyla DentAYA Studio düzenini getirir. CAD; nesneler ve parametreler solda, mevcut komutlar koyu sağ araç şeridinde, geniş 3B alan ortada olacak şekilde düzenlenir. Ortak uygulama başlığı CAD'de gösterilmez. Özgün DentAYA varlıkları kullanılır; exocad/3Shape çalışma ergonomisi referanstır.

Uygulama giriş adresi doğrudan İş yöneticisini açar. CAD dışındaki ekranlarda kompakt başlık, simgeli etkinlik şeridi ve durum çubuğu kullanılır. İş yöneticisi mevcut iş kayıtlarını tek ana tabloda toplar; seçili kaydın ayrıntıları bağlama göre açılır. Ayarlar kategori listesi ve araç odaklı ayar alanlarıyla çalışır. Yeni CAD oturumlarında düz Studio arka planı kullanılır; ızgara ve eksenler kapalı başlar. Önceden açıkça seçilmiş sahne arka planları, ızgara ve eksen tercihleri korunur.

Zorunlu 5 saniyelik yükleme/okuma beklemesi kaldırılmıştır. Yükleme görünümü yalnız gerçek işlem sürerken kalır; hazır ekran bilgi kartı veya mini oyun için bekletilmez. Bilgi kartları ve oyunlar mevcut isteğe bağlı kontrollerden açılabilir.

AYA'nın RC50 çalışma belleği, desteklenen çok adımlı görevleri ve güncel CAD bağlamına dayalı önerileri korunur. Yerel model normal konuşmada önceliklidir; manuel CAD deterministik ve modelden bağımsız kalır. CAD işlemi mevcut kapılar ve kullanıcı tıklamasıyla başlar. RC49 kimlik/amaç, isim hatırlama ve kısa takip davranışları sürer.

Kaydetme yanıtını bekleme, kayıt hatasında CAD'de kalma, yerel kurtarma ve ünite bazında çalışma mevcut akışları kullanır. Bu arayüz değişikliği CAD kernel algoritmalarını değiştirmez. Finans, mesajlaşma, randevu, ekip, lojistik ve vaka işlemlerinin erişim, taslak ve eşzamanlı değişiklik kontrolleri korunacak regresyon kapsamındadır.

Başlangıç: [KURULUM.txt](KURULUM.txt). Yeni düzen: [RC52_KULLANIM.md](RC52_KULLANIM.md). Güncel sonuçlar ve sınırlar: [RC52_KONTROL_RAPORU.md](RC52_KONTROL_RAPORU.md). **RC52 kaynak kontrolleri geçti:** dokuz tarayıcı regresyonu, tam verify zinciri, sıfır uyarılı lint, tip kontrolü, 38 sayfalık üretim derlemesi ve üretim ortamında bekletmesiz yükleme kontrolü tamamlandı. Bu kontroller Windows, gerçek model veya canlı kurum kabulü değildir.

RC52 ekranları: [CAD](verification/RC52/CAD.png) · [İş yöneticisi](verification/RC52/WorkManager.png) · [Ayarlar](verification/RC52/Settings.png). Ekranlar gerçek arayüzden sentetik test verisiyle alınır; sonuç ve ekran kayıtları `verification/RC52/` altında toplanır. Önceki [RC51 raporu](RC51_KONTROL_RAPORU.md) tarihsel kayıttır. [Özgün marka koleksiyonu](public/brand/DentAYA_Premium_Logo_Koleksiyonu.png) korunur.

Bilgi kartı sayısı **220**; ayrı AYA soru kataloğu **1008** kayıttır. Kaynaklar ve 30.000 içerik hedefinin durumu [bilgi kataloğu raporunda](DENTAL_BILGI_KATALOGU_RAPORU.md). 30.000 kayıtlık kapasite testinin verileri ürüne eklenmez.

Bu depo tam kaynak içerir. Windows Setup EXE'si, model ağırlıkları veya kişisel bağlantı ayarları içermez. Gerçek Windows, model ve sunucu doğrulamalarının sınırları test raporunda belirtilir.

Node.js 22.12+ ve npm 11+ gerekir. `npm ci` ve `npm run verify` temel kontrollerdir. `npm run verify:desktop-shell-browser` gerçek uygulama rotalarında masaüstü düzenini, klavye erişimini ve sentetik veriyle modül davranışlarını kontrol eder. Tarayıcı kontrolleri Playwright ve Chromium gerektirir; harici kurulum `DENTAYA_PLAYWRIGHT_MODULE` ve `DENTAYA_CHROMIUM_PATH` ile seçilebilir. Geçici test rotaları kullanan kontrolleri ve genel verify zincirini sırayla çalıştırın. `npm run dev -- --hostname 127.0.0.1 --port 3010` arayüzü, `npm run desktop:dev` Electron köprüsünü başlatır. Yerel sohbet hesap veya bulut API anahtarı istemez; gerçek vaka ve sunucu kaydı mevcut Supabase bağlantısını kullanır. Yeni görünüm erişim koşullarını değiştirmez.

`CODEX_BASLANGIC_PROMPTU.md` ve `CODEX_DEVIR_NOTLARI.md` ilk RC46/WIP devir kayıtlarıdır. RC47 raporları önceki sürüme aittir. Web sitesi deposu ayrıdır.
