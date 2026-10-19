# DentAYA RC46 — AYA bilgi ve sohbet güncellemesi

RC45 Onarım 2 üzerine hazırlanmış tam kaynak paketi; önceki paketleri ayrıca kurmanız gerekmez. Sürüm **1.0.0-rc.46**. Kurulum `KURULUM.txt`; Windows'ta tek giriş `DENTAYA_GUNCELLE_DERLE.cmd`.

AYA Core 0.4: **1008 Türkçe soru-cevap / 252 konu**, serbest mesaj eşleştirme, küçük yazım hatası toleransı ve bağlamlı takip soruları. Aranabilir soru kütüphanesi eklendi. Model kurulmamışken de yazı alanı açık kalır; model hatası veya iptalde soru konuşmadan silinmez. Ana sohbet ve CAD aynı yanıt akışını kullanır. [RC46 kullanım ve sınırlar](RC46_AYA_KULLANIM.md) · [Doğrulama kapsamı](RC46_KONTROL_RAPORU.md). Tam döküm: `RC46_AYA_1008_SORU_CEVAP.json`.

Bu bir temel model eğitimi değildir. Hazır bilgi ve iş akışı Core'da çalışır; katalog dışı açık uçlu üretim mevcut yerel llama.cpp / Qwen3 modeliyle yapılır. Bilinmeyen soruda açıklama istenir, yanıt uydurulmaz. Yeni bilgi Türkçe; yeni kütüphane kabuğu TR/EN, diğer dil seçimlerinde İngilizcedir. Mevcut 46 dil paketi korunur. Yanıtlar klinik muayene, ölçüm veya üretim onayı değildir.

RC44; **200 kaynaklı diş bilgisi**, üç mini oyun, AYA Core 0.3 çalışma araçları, CAD içinde canlı kontrol listesi ve kaydedilen renk grupları ekler. Arayüzde Studio, Mineral, Heritage ve Contrast koleksiyonlarıyla 12 yeni palet bulunur.

Kusp Kilidi'ne **İkiz İzler** eşleştirme oyunu ve **Oluk Rotası** kanal bulmacası eklendi. Oyun sekmeleri arasında geçiş mevcut oyunu korur; çözüm sayısı ve en iyi sonuç cihazda saklanır. Oyunlar yüklendikten sonra çevrimdışı oynanabilir. Bilgiler 200'lük tur tamamlanmadan tekrarlanmaz; kaynak bağlantısı, duraklatma ve elle değiştirme bulunur. Bilgi ve yeni oyun/araç metinleri Türkçe ve İngilizcedir; diğer dil seçimlerinde yeni alanlar İngilizce gösterilir. Mevcut 46 dil paketi korunur.

AYA ölçü ve yüzde hesabını cihaz içinde belirli kurallarla yapar; teslim notu taslağı oluşturur. Yanıtlar kopyalanabilir ve sohbet JSON olarak indirilebilir. CAD paneli açık projenin iş tanımı, tarama, kole, yerleşim, görünürlük, kapanış verisi ve kayıt durumunu gösterir; önerilen adım mevcut CAD komutunu kullanıcı tıklayınca çalıştırır. AYA Core bize ait çalışma katmanıdır; temel dil modeli sıfırdan eğitilmedi. Önceki yerel llama.cpp / Qwen3 kurulumu, bilgi defteri ve geçmiş tercihleri korunur.

CAD renkleri için Teknik, Doğal, Studio, Contrast, Ceramic ve Slate seçenekleri; çalışma çenesi, karşıt çene, restorasyon ve kole için ayrı renkler bulunur. Teknik varsayılan korunur. Renk değişimi diş geometrisini değiştirmez. Özgün RC37 formları, teknisyen STL/OBJ kütüphanesi, koleye yerleştirme, ünite bazında geometri ve kaydet/çık akışı bu pakette devam eder.

Okuma ekranı ilk yükleme başlangıcından itibaren **toplam 10 saniye** görünür; veri hazırsa **Çalışmaya geç / Esc** ile atlanabilir. Uzun yüklemeye ek bekleme eklenmez. Oyun süre bitince açık kalabilir.

ZIP hazır Windows EXE'si içermez. Çalışan `.env.local` dosyanızı `package.json` yanına kopyalayıp CMD'yi açın. Kaynaklar her denemede `%LOCALAPPDATA%\DentAYA\Builds\rc46-…` altında yeni bir klasöre kopyalanır; OneDrive'daki eski `.next` ve `node_modules` taşınmaz. Kesin Setup yolu `dist-desktop/latest-build.json` içindedir ve Gezginde seçilir. Yeni veritabanı migration'ı gerekmez. Gerçek Windows kurulumu ve gerçek GGUF yanıt kalitesi burada doğrulanmadı; motor köprüsü testleri taklit çıkarım kullanır.

[Kullanım](RC44_KULLANIM.md) · [Kontrol kapsamı](RC44_KONTROL_RAPORU.md) · [200 diş bilgisi](RC44_200_DIS_BILGISI.txt)

RC45 Windows paketleme onarımı: [ayrıntılar ve test kapsamı](RC45_WINDOWS_PAKETLEME_ONARIMI.md). Paketleme kurulu Electron dağıtımını ve her denemede yeni çıktı klasörünü kullanır; Setup yolu `dist-desktop/latest-build.json` üzerinden gösterilir.

**Onarım 2:** Eksik Electron dağıtımı artık paketinin kendi kurucusuyla tamamlanır. `version` dosyası olmayan geçerli dağıtımda sürüm EXE üzerinden okunur. Sabit Electron bağımlılığının gerektirdiği Node.js alt sınırı **22.12.0** olarak eşitlendi. 25 otomatik regresyon testi geçti; gerçek Windows kurulum sonucu burada doğrulanmadı.

