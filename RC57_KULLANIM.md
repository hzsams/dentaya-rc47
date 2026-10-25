# DentAYA RC57 kullanım

Sürüm `1.0.0-rc.57`, AYA Core `0.13.0`. Tam kaynak güncellemesidir; eski RC54/RC55 paketlerini sırayla kurmak gerekmez. Mevcut bağlantı ayarlarınızı ve kişisel verilerinizi koruyun. Windows derleme adımları [KURULUM.txt](KURULUM.txt) içindedir; hazır EXE bu kaynakta bulunmaz.

## RC57: AYA ile güncel kesit ve sohbet

Kesiti yorumlatmak için Uzman modunda İnceleme → Kesit → Kesit çizgileri ve ölçümleri seçeneğini açın. Sonra AYA'ya “Bu kesitin gerçek alanını ve uzunluğunu yorumla” deyin. AYA, o anda görüntülenen restorasyon ve taramanın hesaplanan konturunu kullanır. Açık/çakışan yüzeylerde güvenilir kapalı alan yoksa bunu söyler; null alanı sıfır gibi vermez. Düzlem, kaynak veya ünite değişince önceki sonuç yeni işe taşınmaz. Büyük taramalardaki sadeleştirilmiş önizleme ve duvar kalınlığı/iç uyum sınırı belirtilir.

Koleye yerleştirme gibi normal CAD yardımı ilk uygulanabilir adımla başlar. Ayrıntılı analiz istediğinizde güncel QC veya eksik kanıt açıklaması gösterilir. Ünite, geometri veya ilgili ayarlar değişirse önceki QC sayıları gizlenir; Kontrol → CAD Kernel QC çalıştır ile yenileyin.

Yerel yanıtı test et, yazmakta olduğunuz sorudan ayrı çalışır. Test başarılı olsa, hata verse veya iptal edilse taslağınız korunur. Hata kutusundaki Tekrar gönder tanı testini yineler; normal başarısız soruyu düzenlediğinizde tekrar gönder düzenlenen metni kullanır. Bellekten ibaret bir oturumun son hedefini temizlemek eski kaydı yeniden açılışta geri getirmez. Başka pencere daha yeni bir kayıt yazdıysa bu kayıt sessizce silinmez. Konuşma geçmişini saklama tercihi ve ayrı notlar korunur.

## Yeni arka plan renkleri

Ayarlar → Görünüm → Renk paletleri içinden **Neon Midnight**, **Graphite Turquoise**, **Deep Turquoise** veya **Deep Coral** seçilebilir. Bu dört görünüm Studio koleksiyonunda da bulunur. Lacivert/siyah arka planlar ve turkuaz/pembe vurgular gönderilen görsellerden referans alınmıştır. Turkuaz ve pembe seçeneklerinde çalışma alanını yormayan koyu zeminler kullanılır.

Seçim genel uygulama görünümünü ve CAD sahnesinin tema arka planını birlikte günceller; bu cihazda saklanır. Kamera hızları ve mevcut tasarım korunur. Varsayılan veya daha önce seçtiğiniz palet otomatik değişmez. Kendi rengini seç bölümünde arka plan, panel ve vurgu rengi ayrıca düzenlenebilir.

## Laboratuvar çalışma alanı

Laboratuvar hesabıyla İş yöneticisini açınca solda **Lab Yöneticisi** görünür. Açık işler, geciken terminler, bugün teslim ve onay bekleyen sayıları kurum genelini kapsar. Ana tablodaki kayıtlar bir önizlemedir. Tam liste için **Laboratuvar kuyruğunu aç** düğmesini kullanın.

Kuyrukta açık işler, öncelikli, geciken, bugün teslim, yeni işler, tasarım, onay, üretim/QC ve tamamlananları da içeren dokuz görünüm vardır. Liste sayfa başına en fazla 40 kayıt getirir. Arama yalnız açık sayfayı tarar; diğer işler için sayfa değiştirin. Satırdaki sıradaki işlem bağlantısı ilgili vaka veya CAD akışına gider. Ekip yönetimi bağlantısı kurum sahibi/yönetici rolünde görünür; mevcut sunucu erişim kuralları devam eder.

Bağlantı hatasında son başarılı liste korunur. Tekrar dene veya aynı kuyruk düğmesiyle yeniden yükleyebilirsiniz. Mobilde sol panel başlıktan açılır. Bu ekran vaka durumunu, üretim veya teslimat kaydını kendiliğinden değiştirmez.

## CAD tasarımı ve inceleme

Ham çalışma taramasını ve doğru üniteyi seçin; İş Tanımını tamamlayıp koleyi model üzerinde çizin. Kuron/kapşon bu koleye yerleşir. Hedef yokken sahne merkezinde kuron gösterilmez. Başlangıç dış anatomisini mevcut manuel araçlarla şekillendirin; geri al/yinele ve ünite bazlı kayıt aynı akışı kullanır. İlk anatomik zarf iç uyum/üretim onayı değildir.

Uzman modunda **İnceleme → Kesit** içinden **Kesit çizgileri ve ölçümleri** açılabilir. Sarı çizgi restorasyonun, mavi çizgi ham taramanın o düzlemle gerçek kesişimidir. Çizgi uzunluğu mm, güvenilir kapalı alan mm² olarak gösterilir. Açık, çakışan, düzlemle çakışık veya hesap sınırını aşan kesitlerde alan verilmez. Ölçümler görüntülenen mesh üzerinden hesaplanır; büyük taramalarda bu yüzey sadeleştirilmiş önizleme olabilir. Bunlar duvar kalınlığı ve intaglio uyum ölçümleri değildir. Kesit, fener, yüzey ve kamera kontrolleri çalışma mesh'ini değiştirmez.

**Son kontrol → Aktif ünite STL indir**, yalnız aktif restorasyonu ham çalışma taramasının koordinatlarında indirir. Koleye yerleşmiş, kapalı, tek gövdeli ve dejenere yüz içermeyen mesh gerekir; ayrı bağlayıcı katıları boolean birleşim olmadan dışa aktarılmaz. Yerel kurtarma araması ve varsa geri yükle/sil kararı bitmeden STL indirme veya klinik onaya gönderme açılmaz. İndirme sunucuda kayıt veya klinik gönderim yerine geçmez; projeyi ayrıca kaydedin. Kaydet ve çık, başarılı kayıt yanıtını bekler; hata olursa CAD açık kalır.

Başarılı kayıttan sonra içerik aynıysa gereksiz kurtarma bildirimi gösterilmez. Çevrimdışı saklanan veya farklı içerikteki yerel düzenlemeler kurtarma seçeneğini korur.

## AYA Core

Yerel model hazırken konuşmada model önceliklidir. “Modelin üstüne kuron yapalım” ve ardından “Peki şimdi?” gibi kısa takipler aynı proje/kaynak/ünitedeki güncel durumu kullanır. Başka üniteye geçildiğinde eski işlemin sonucu veya ölçümü yeni dişe taşınmaz. Geometri değişince eski analiz güncel kanıt sayılmaz.

Model yanıt veremediğinde, uygun güncel CAD rehberi mevcut araçlarla yardım edebilir; motor hatası ayrıca görünür. İptal edilen veya bağlamı değişen yanıt kendiliğinden işlem başlatmaz. Öneriyi **Uygula** ile siz başlatırsınız. Model yokken manuel CAD çalışır; buluta otomatik geçiş yoktur.

Hedef ve kararlar çalışma belleğinde ayrı tutulur. Alıntı içindeki “belleği sil” sözleri, bir soru veya tek alanı temizleme isteği bütün belleği sıfırlama izni sayılmaz. Tüm belleği sıfırlamak açık istek gerektirir. Kalıcı konuşma geçmişi mevcut saklama tercihinize bağlıdır. Bunlar model eğitimi değildir; gerçek yerel çıkarımın doğrulama sınırı kontrol raporundadır.

## Logo ve mini oyunlar

Ayarlar → Görünüm içinde 120 özgün hacim etkili logo vardır. Önceki kimlikler, tercihler ve 01–100 varlıkları korunur. Açık/koyu, simge/yazı ve Windows ICO biçimleri mevcuttur. Görünümler SVG katmanlarıyla oluşturulur; gerçek 3B mesh değildir.

Beş mini oyun içinde **Işık Matrisi** ve **Mine Dizisi** bulunur. Işık Matrisi'nde bir düğme kendisini ve yatay/dikey komşularını değiştirir; amaç bütün ışıkları söndürmektir. Mine Dizisi'nde boşluğa komşu taşı kaydırıp sıralamayı tamamlayın. İpucu, geri al ve yeni oyun kontrolleri bulunur; rekorlar oyun başına ayrı saklanır. Sekmelerde yön tuşları/Home/End, oyun hücrelerinde yön tuşları ve Enter/Boşluk kullanılabilir. Oyunlar isteğe bağlıdır ve hazır ekranın açılmasını bekletmez.

Gerçek bilgi kartı sayısı 500, kaynak grubu 60 ve ayrı AYA soru kataloğu 1008 kayıttır. 30.000 gerçek içerik hedefi tamamlanmadı. Güncel testler ve tamamlanmayanlar [RC57_KONTROL_RAPORU.md](RC57_KONTROL_RAPORU.md) içindedir.
