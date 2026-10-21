# DentAYA RC53

Sürüm `1.0.0-rc.53`, AYA Core `0.9.0`. RC53, aydınlık panelleri ve erik moru başlıklarıyla DentAYA Studio düzenini korur. CAD; nesneler ve parametreler solda, mevcut komutlar koyu sağ araç şeridinde, geniş 3B alan ortada olacak şekilde düzenlenir. Ortak uygulama başlığı CAD'de gösterilmez. Özgün DentAYA varlıkları kullanılır; exocad/3Shape çalışma ergonomisi referanstır.

Uygulama giriş adresi doğrudan İş yöneticisini açar. CAD dışındaki ekranlarda kompakt başlık, simgeli etkinlik şeridi ve durum çubuğu kullanılır. İş yöneticisi mevcut iş kayıtlarını tek ana tabloda toplar; seçili kaydın ayrıntıları bağlama göre açılır. Ayarlar kategori listesi ve araç odaklı ayar alanlarıyla çalışır. Yeni CAD oturumlarında düz Studio arka planı kullanılır; ızgara ve eksenler kapalı başlar. Önceden açıkça seçilmiş sahne arka planları, ızgara ve eksen tercihleri korunur.

Zorunlu 5 saniyelik yükleme/okuma beklemesi kaldırılmıştır. Yükleme görünümü yalnız gerçek işlem sürerken kalır; hazır ekran bilgi kartı veya mini oyun için bekletilmez. Bilgi kartları ve oyunlar mevcut isteğe bağlı kontrollerden açılabilir.

AYA'nın RC50 çalışma belleği, desteklenen çok adımlı görevleri ve güncel CAD bağlamına dayalı önerileri korunur. Yerel model normal konuşmada önceliklidir; manuel CAD deterministik ve modelden bağımsız kalır. CAD işlemi mevcut kapılar ve kullanıcı tıklamasıyla başlar. RC49 kimlik/amaç, isim hatırlama ve kısa takip davranışları sürer.

Kaydetme yanıtını bekleme, kayıt hatasında CAD'de kalma, yerel kurtarma ve ünite bazında çalışma mevcut akışları kullanır. Bu arayüz değişikliği CAD kernel algoritmalarını değiştirmez. Finans, mesajlaşma, randevu, ekip, lojistik ve vaka işlemlerinin erişim, taslak ve eşzamanlı değişiklik kontrolleri korunacak regresyon kapsamındadır.

RC53, kaynaklı 500 TR/EN bilgi kartını AYA bağlamına ekler. Kısa takip soruları önceki konuyla ilişkilendirilir; yeni konu önceki hedefe zorlanmaz. Boş model alanları çalışma hedefini ve kararları kendiliğinden silmez. Bellek düzeltme ve sıfırlama açık işlem olarak ele alınır. Kaynak bağlantıları sohbetten açılır ve yalnız geçmiş saklama tercihi açıkken oturumla korunur. Bu iyileştirmeler model eğitimi veya her ifadeyi anlama garantisi değildir.

CAD uzman modunda İnceleme paneli; kamera/imleç hedefli gerçek fener, ışık gücü ve konisi, yüzey kenarları, sınırlı normal çizgileri, düz yüzey gölgelemesi, iç yüzey görünümü, pozlama, kesit ekseni/merkez/ters yön ve kamera kontrollerini sunar. Bu görünüm işlemleri geometriyi değiştirmez. AYA’nın `inspection`, `flashlight-on` ve `flashlight-off` önerileri mevcut çalışma denetiminden sonra Uygula ile çalışır. Sekiz manuel araç ve kılavuzlu görev kapıları korunur.

Ayarlar'da 100 özgün logo bulunur; hacim, metalik yüzey, kenar ışığı ve gölge SVG katmanlarıyla üretilir. Her seçeneğin açık/koyu, simge ve yazı biçimleri ile Windows ICO varlığı vardır. Bunlar hacim etkili çizimlerdir; 3B mesh dosyaları değildir. İlk 18 logo kimliği, tercih aktarımı ve masaüstü simgesi akışı korunur.

Başlangıç: [KURULUM.txt](KURULUM.txt). Kullanım: [RC53_KULLANIM.md](RC53_KULLANIM.md). Güncel test durumu ve sınırlar: [RC53_KONTROL_RAPORU.md](RC53_KONTROL_RAPORU.md). RC52 ve önceki sürümlerin raporları tarihsel kayıttır; yeni değişikliklerin doğrulaması yerine kullanılmaz. **RC53 doğrulaması tamamlandı:** sekiz tarayıcı regresyonu, tam verify, sıfır uyarılı lint, tip kontrolü, üretim derlemesi ve standalone yükleme kontrolü geçti. Yerel b9380 grammar kontrolü 17/17; gerçek model çıkarımı ağırlık indirme engeli nedeniyle doğrulanmadı.

[100 logonun görünümü](public/brand/DentAYA_Premium_Atelier.webp). Bilgi kartı sayısı **500**, kaynak grubu **60**; ayrı AYA soru kataloğu **1008** kayıttır. [Yeni kartların kaynakları](BILGI_KARTLARI_RC53_KAYNAKLAR.md) ve [katalog/30.000 hedefi](DENTAL_BILGI_KATALOGU_RAPORU.md). 30.000 gerçek içerik hedefi tamamlanmadı; kapasite testinin sentetik verileri ürüne eklenmez.

Bu depo tam kaynak içerir. Windows Setup EXE'si, model ağırlıkları veya kişisel bağlantı ayarları içermez. Gerçek Windows, model ve sunucu doğrulamalarının sınırları test raporunda belirtilir.

Node.js 22.12+ ve npm 11+ gerekir. `npm ci` ve `npm run verify` temel kontrollerdir. `npm run verify:desktop-shell-browser` gerçek uygulama rotalarında masaüstü düzenini, klavye erişimini ve sentetik veriyle modül davranışlarını kontrol eder. Tarayıcı kontrolleri Playwright ve Chromium gerektirir; harici kurulum `DENTAYA_PLAYWRIGHT_MODULE` ve `DENTAYA_CHROMIUM_PATH` ile seçilebilir. Geçici test rotaları kullanan kontrolleri ve genel verify zincirini sırayla çalıştırın. `npm run dev -- --hostname 127.0.0.1 --port 3010` arayüzü, `npm run desktop:dev` Electron köprüsünü başlatır. Yerel sohbet hesap veya bulut API anahtarı istemez; gerçek vaka ve sunucu kaydı mevcut Supabase bağlantısını kullanır. Yeni görünüm erişim koşullarını değiştirmez.

`CODEX_BASLANGIC_PROMPTU.md` ve `CODEX_DEVIR_NOTLARI.md` ilk RC46/WIP devir kayıtlarıdır. RC47 raporları önceki sürüme aittir. Web sitesi deposu ayrıdır.
