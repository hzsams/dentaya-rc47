# DentAYA RC61

Sürüm `1.0.0-rc.61`, AYA Core `0.17.0`. Ana sohbet serbest metin üreten yerel modele ayrıldı; model yokken veya hata verdiğinde otomatik hazır cevap üretilmez. Yanıt akış halinde görünür; hedef ve karar güncellemesi ayrı, sınırlandırılmış bir model çağrısıdır. CAD araç rehberi açıkça seçilir; manuel CAD ve 27 tipli Uygula kapısı korunur. 16 GB RAM için mevcut Ollama üzerinden Qwen3 4B indirme seçeneği eklendi; sabit/hash doğrulanan managed model değişmedi. Gerçek model semantik kabulü ve Windows EXE bu ortamda tamamlanmadı; güncel sınırlar [kontrol raporunda](RC61_KONTROL_RAPORU.md) açıklanır.

Aşağıdaki RC60 ve önceki sürüm notları tarihsel kayıttır. Model hatasında otomatik Core yanıtı ve ana sohbette soru kütüphanesi artık geçerli davranış değildir. Güncel kullanım [RC61_KULLANIM.md](RC61_KULLANIM.md) içindedir.

Aydınlık panelleri ve erik moru başlıklarıyla DentAYA Studio düzeni korunur. CAD; nesneler ve parametreler solda, mevcut komutlar koyu sağ araç şeridinde, geniş 3B alan ortada olacak şekilde düzenlenir. Ortak uygulama başlığı CAD'de gösterilmez. Özgün DentAYA varlıkları kullanılır; exocad/3Shape çalışma ergonomisi referanstır.

RC58, sol üstteki Modüller düğmesinden açılan klasör ve alt klasör listesini kullanır. Klinik, Laboratuvar, Yönetim ve Çalışma alanı altında 24 mevcut hedef korunur. Arama eşleşen üst klasörleri açar; klavye, mobil, CAD ve değişmiş çalışma denetimleri mevcut akışı kullanır.

Operasyon merkezindeki robot bileşeni ve dokuz robot görseli kaldırıldı. Gerekli kurum metrikleri, öncelik kuyruğu, vaka aşamaları ve laboratuvar kapasitesi **Yönetim → İşler ve finans → İş takibi** altında kompakt bir çalışma ekranında kalır. Bu ekran yerel model çıktısı veya AYA puanı göstermez.

AYA model testi sohbetten ayrıdır: konuşma, kişisel not ve çalışma belleği testi beslemez; test sonucu kaydedilmiş planı değiştirmez. Pencereye geri dönünce motor durumu güncellenir, geçici model yokluğundan sonra seçilmiş model korunur. İşlem sonuçları gerçek CAD işlemi sonrası host durumuyla doğrulanır; geciken sonuç başka üniteye taşınmaz. Dolu belleğe ekleme eski kararları sessizce düşürmez. Bunlar yerel model entegrasyonu iyileştirmeleridir; model eğitimi veya tamamlanmış gerçek model kabulü değildir.

RC57, AYA'yı görüntülenen CAD kesitinin gerçek uzunluk/alan sonuçlarına bağlar. Kaynak, ünite veya düzlem değişince eski sonuç kullanılamaz; aynı alanı veren ters kesitte bile yeni düzlem bilgisi taşınır. Açık, çakışan veya sınırlandırılmış kesitte alan uydurulmaz. Büyük tarama önizlemesinin ölçümü tam çözünürlüklü ölçüm gibi sunulmaz. Eski QC sayıları ünite/geometri değişiminden sonra arayüzden kaldırılır.

Normal yerleştirme yardımı ilk uygulanabilir adımla başlar. Yerel yanıtı test et düğmesi yazılmamış soruyu korur; tekrar gönder doğru tanı isteğini yineler. Mesajsız oturumdaki son bellek temizlenince eski hedef yeniden açılışta dönmez; başka pencerenin daha yeni kaydı korunur. CAD manuel ve deterministik, araçlar kullanıcı Uygula kapısında kalır.

Ayarlar → Görünüm içindeki ortak arka plan/renk kataloğuna Neon Midnight, Graphite Turquoise, Deep Turquoise ve Deep Coral eklendi. Görsellerdeki lacivert/siyah zeminler ve turkuaz/pembe blok renkleri referans alınır. Seçim uygulamaya ve CAD'in tema arka planına birlikte uygulanır; mevcut görünümünüz kendiliğinden değiştirilmez.

RC56, laboratuvar ana sayfasına solda **Lab Yöneticisi** panelini ve dokuz görünümlü, gerçek kurum sayılarıyla çalışan 40 satırlık sayfalı iş kuyruğunu ekler. Başarısız yenilemede son başarılı liste korunur; kuyruk ve oturum değişimleri eski hasta referanslarını yeni bağlama taşımaz. Yeni migration veya otomatik vaka durum değişikliği yoktur.

AYA Core'da modele öncelik veren akış korunur. Kuronun ham modele yerleştirilmesi ve kısa CAD takip soruları güncel proje/kaynak/üniteye bağlanır; model hatasında mevcut güncel CAD rehberi hata bilgisiyle kullanılabilir. Alıntılar veya tek bellek alanını temizleme istekleri tüm çalışma belleğini sıfırlamaz. Kullanıcı Uygula kapısı ve 27 tipli araç sözleşmesi korunur.

CAD uzman incelemesine gerçek üçgen/düzlem kesişiminden kesit çizgileri, uzunluk ve güvenilir kapalı alan eklenir; bunlar duvar kalınlığı veya iç uyum değildir. Son kontrolde aktif ünitenin çalışma STL'si ham tarama koordinatlarında indirilebilir. Yerleşim, tek kapalı gövde ve yerel kurtarma kapıları kullanılır. İki yeni mini oyunla toplam beş oyun, 20 yeni hacim etkili logoyla toplam 120 seçenek bulunur. Önceki oyun rekorları ve 01–100 logo varlıkları korunur.

Uygulama giriş adresi doğrudan İş yöneticisini açar. CAD dışındaki ekranlarda kompakt başlık, simgeli etkinlik şeridi ve durum çubuğu kullanılır. İş yöneticisi mevcut iş kayıtlarını tek ana tabloda toplar; seçili kaydın ayrıntıları bağlama göre açılır. Ayarlar kategori listesi ve araç odaklı ayar alanlarıyla çalışır. Yeni CAD oturumlarında düz Studio arka planı kullanılır; ızgara ve eksenler kapalı başlar. Önceden açıkça seçilmiş sahne arka planları, ızgara ve eksen tercihleri korunur.

Zorunlu 5 saniyelik yükleme/okuma beklemesi kaldırılmıştır. Yükleme görünümü yalnız gerçek işlem sürerken kalır; hazır ekran bilgi kartı veya mini oyun için bekletilmez. Bilgi kartları ve oyunlar mevcut isteğe bağlı kontrollerden açılabilir.

RC55, kuron ve kapşonu seçilen ham tarama modelindeki koleye yerleştirir. Hedef kole belirlenmeden sahne merkezinde başlangıç kuronu gösterilmez. İlk kuron yüksekliği seçili ham preparasyonun örneklenen dış yüksekliğini hesaba katar; kole tabanı yukarı taşınmaz ve başka bir restorasyon hedef alınmaz. Servikal kayıt, eğik yerleştirme ekseni ve tüberkül yüksekliği değişiminde sabit kalır. Bu başlangıç dış zarfı iç uyum veya üretim onayı değildir.

Altı mevcut form için diş grubuna göre insizal kenar, tüberkül, fissür ve fossa içeren deterministik başlangıç anatomisi kullanılır. Doğal görünümde kuron/kapşon daha yumuşak mine benzeri yüzey kullanır; teknik görünüm ve açıkça seçilmiş malzeme tercihleri korunur. Bunlar taramadan elde edilmiş hasta anatomileri değildir. Elle şekillendirilmiş eski işler, üretilmiş shell ve kişisel form kütüphanesi otomatik yeniden modellenmez.

AYA Core, anatomik formu, yüzey görünümünü ve koleye kaydı ayrı değerlendirir. Yalnız mevcut araçları önerir; “yerleşti” durumunu preparasyon/iç uyum onayı diye sunmaz. Yeni CAD işlemleri yine kullanıcı Uygula düğmesiyle başlar.

RC54, hedef/karar/açık soruların ayrı güncellenmesini, çakışma gösteren bellek editörünü, güvenli eşzamanlı not içe aktarmayı ve güncel CAD kanıtını ekler. Yarım model kurulumu mevcut yerel Ollama modellerini gizlemez; geç gelen motor durumu hazır modeli ezemez. Bunlar model ve çalışma belleği entegrasyonu iyileştirmeleridir; model eğitimi değildir.

AYA'nın RC50 çalışma belleği, desteklenen çok adımlı görevleri ve güncel CAD bağlamına dayalı önerileri korunur. Yerel model normal konuşmada önceliklidir; manuel CAD deterministik ve modelden bağımsız kalır. CAD işlemi mevcut kapılar ve kullanıcı tıklamasıyla başlar. RC49 kimlik/amaç, isim hatırlama ve kısa takip davranışları sürer.

Kaydetme yanıtını bekleme, kayıt hatasında CAD'de kalma, yerel kurtarma ve ünite bazında çalışma mevcut akışları kullanır. CAD çekirdeği deterministik kalır. Finans, mesajlaşma, randevu, ekip, lojistik ve vaka işlemlerinin erişim, taslak ve eşzamanlı değişiklik kontrolleri korunacak regresyon kapsamındadır.

RC53, kaynaklı 500 TR/EN bilgi kartını AYA bağlamına ekler. Kısa takip soruları önceki konuyla ilişkilendirilir; yeni konu önceki hedefe zorlanmaz. Boş model alanları çalışma hedefini ve kararları kendiliğinden silmez. Bellek düzeltme ve sıfırlama açık işlem olarak ele alınır. Kaynak bağlantıları sohbetten açılır ve yalnız geçmiş saklama tercihi açıkken oturumla korunur. Bu iyileştirmeler model eğitimi veya her ifadeyi anlama garantisi değildir.

CAD uzman modunda İnceleme paneli; kamera/imleç hedefli gerçek fener, ışık gücü ve konisi, yüzey kenarları, sınırlı normal çizgileri, düz yüzey gölgelemesi, iç yüzey görünümü, pozlama, kesit ekseni/merkez/ters yön ve kamera kontrollerini sunar. Bu görünüm işlemleri geometriyi değiştirmez. AYA’nın `inspection`, `flashlight-on` ve `flashlight-off` önerileri mevcut çalışma denetiminden sonra Uygula ile çalışır. Sekiz manuel araç ve kılavuzlu görev kapıları korunur.

Ayarlar'da 120 özgün logo bulunur; hacim, metalik yüzey, kenar ışığı ve gölge SVG katmanlarıyla üretilir. Her seçeneğin açık/koyu, simge ve yazı biçimleri ile Windows ICO varlığı vardır. Bunlar hacim etkili çizimlerdir; 3B mesh dosyaları değildir. İlk 18 logo kimliği, tercih aktarımı ve masaüstü simgesi akışı korunur.

Başlangıç: [KURULUM.txt](KURULUM.txt). Kullanım: [RC60_KULLANIM.md](RC60_KULLANIM.md). Güncel kontroller ve sınırlar: [RC60_KONTROL_RAPORU.md](RC60_KONTROL_RAPORU.md). Önceki RC raporları tarihsel kayıttır; yeni sürümün doğrulaması sayılmaz.

[120 logonun görünümü](public/brand/DentAYA_Premium_Atelier.webp). Bilgi kartı sayısı **500**, kaynak grubu **60**; ayrı AYA soru kataloğu **1008** kayıttır. [Yeni kartların kaynakları](BILGI_KARTLARI_RC53_KAYNAKLAR.md) ve [katalog/30.000 hedefi](DENTAL_BILGI_KATALOGU_RAPORU.md). 30.000 gerçek içerik hedefi tamamlanmadı; kapasite testinin sentetik verileri ürüne eklenmez.

Bu depo tam kaynak içerir. Windows Setup EXE'si, model ağırlıkları veya kişisel bağlantı ayarları içermez. Gerçek Windows, model ve sunucu doğrulamalarının sınırları test raporunda belirtilir.

Node.js 22.12+ ve npm 11+ gerekir. `npm ci` ve `npm run verify` temel kontrollerdir. `npm run verify:desktop-shell-browser` gerçek uygulama rotalarında masaüstü düzenini, klavye erişimini ve sentetik veriyle modül davranışlarını kontrol eder. Tarayıcı kontrolleri Playwright ve Chromium gerektirir; harici kurulum `DENTAYA_PLAYWRIGHT_MODULE` ve `DENTAYA_CHROMIUM_PATH` ile seçilebilir. Geçici test rotaları kullanan kontrolleri ve genel verify zincirini sırayla çalıştırın. `npm run dev -- --hostname 127.0.0.1 --port 3010` arayüzü, `npm run desktop:dev` Electron köprüsünü başlatır. Yerel sohbet hesap veya bulut API anahtarı istemez; gerçek vaka ve sunucu kaydı mevcut Supabase bağlantısını kullanır. Yeni görünüm erişim koşullarını değiştirmez.

`CODEX_BASLANGIC_PROMPTU.md` ve `CODEX_DEVIR_NOTLARI.md` ilk RC46/WIP devir kayıtlarıdır. RC47 raporları önceki sürüme aittir. Web sitesi deposu ayrıdır.
