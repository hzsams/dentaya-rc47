# DentAYA RC42 — kullanım

## Windows güncellemesi

Bu paket RC41'i içerir; ara sürümü ayrıca kurmanız gerekmez.

1. ZIP'i yeni bir klasöre açın; `DentAYA_Production_RC42` klasörünü kullanın.
2. Çalışan projenizin `.env.local` dosyasını `package.json` ile aynı klasöre kopyalayın.
3. `DENTAYA_GUNCELLE_DERLE.cmd` dosyasını çalıştırın. Node.js 22+ ve npm 11+ gerekir. Bağımlılıklar kilit dosyasından kurulur.
4. Derleme bittiğinde açık DentAYA programını kapatıp `dist-desktop\DentAYA-Setup-1.0.0-rc.42.exe` dosyasını çalıştırın.

ZIP kaynak paketidir; hazır Windows EXE'si içermez. Yeni veritabanı migration'ı gerekmez. Önceki proje ve kayıtlarınızı koruyun.

## AYA'yı yerel çalıştırma

Masaüstündeki **AYA** sayfasında **Model ve çalışma ayarları → Yerel motoru kur** seçin. Uygulama sabitlenmiş llama.cpp Windows CPU motorunu ve Qwen3 1.7B Q8_0 GGUF modelini indirir, SHA-256 ile doğrular ve kullanıcı profilinde saklar. İlk kurulum yaklaşık 1,85 GB internet indirmesi ve ek boş disk alanı gerektirir. Kurulumdan sonra sohbet yerel çalışır; Ollama kurulumu, bulut hesabı veya API anahtarı gerekmez.

İndirme kesilirse tekrar **Yerel motoru kur** seçildiğinde kalan dosya desteklenen sunucularda devam ettirilir; son dosya doğrulanmadan kullanılmaz. **İndirmeyi durdur** kurulumu durdurur. Kurulum sonucu model listesinden **AYA Local · Qwen3 1.7B** seçilir. **Yerel yanıtı test et** gerçek model yanıtı üretir. İlk yanıt model yüklenirken daha uzun sürebilir.

Kendi GGUF metin modeliniz varsa **Yerel model ekle** ile dosya seçebilirsiniz. Modelin mimarisi kullanılan llama.cpp sürümüyle uyumlu olmalıdır. Dosya uzantısı/başlık kontrolü tek başına model uyumluluğu garantisi değildir. Motor çalışıyorsa **Durdur** ile kapattıktan sonra başka model ekleyin. İçe aktarılan dosyanın bir kopyası cihazda tutulur. İçe aktarma üst sınırı 12 GiB ve model kaydı sınırı 16'dır.

Yanıtlar ekranda akarak görünür. **Durdur** geçerli yanıtı iptal eder ve soruyu korur. Uzun konuşmalarda modelin gerçek tokenizer'ıyla bağlam sınırı kontrol edilir; önce en eski konuşma parçaları, sonra yardımcı bağlam azaltılır. Son sorunuz sessizce kesilmez; sığmıyorsa istek reddedilir. Yanıt hatasında buluta otomatik geçilmez. Mevcut Ollama kurulumu uyumluluk için kullanılabilir; yeni kurulumun bağımlılığı değildir.

**AYA Core · çevrimdışı rehber**, model olmadan hesaplama, kayıtlı not arama, uygulama belgesi ve CAD iş durumu yardımı verir. Bu kipte rehber metni model tarafından üretilmiş yanıt olarak gösterilmez. Tarayıcıda Core ve bilgi defteri çalışır; yerel model motoruna masaüstü uygulamasından erişilir.

## AYA bilgi defteri

**AYA bilgi defteri** bölümüne başlık ve çalışma notu yazıp **Hatırla** seçin. Örneğin kendi kurye düzeninizi ekleyip daha sonra saatini sorabilirsiniz. Notlar yalnızca açıkça eklediğiniz içeriktir; uygulama hasta dosyalarını veya CAD tarama geometrisini otomatik taramaz.

- **Dosya seç:** UTF-8 TXT/MD belge veya daha önce dışa aktarılmış AYA JSON dosyası ekler. TXT/MD belgeler parçalara ayrılır; dosya başına en fazla 16 parça ve toplam 64 kayıt tutulur. Her kayıt en fazla 12.000 karakterdir.
- **Dışa aktar:** `AYA_Bilgi_Defteri.json` oluşturur. Cihaz değiştirmeden veya uygulama verilerini temizlemeden önce kullanın.
- **Sil:** Seçilen notu kaldırır.
- **Bilgi defterini yanıtlarda kullan:** Kapalıyken notlar yanıt bağlamına gönderilmez.

Notlar bu cihazın uygulama verilerinde saklanır; laboratuvar ortak kataloğuna veya buluta otomatik eşitlenmez. Sohbet geçmişinin saklanması ayrı ve isteğe bağlıdır. Kaynak kullanılan not başlığı yanıtın altında görünür. Bilgi defteri eklemek temel modelin ağırlıklarını eğitmez.

## CAD — Göster / Gizle

Sol sahne paneli başlangıçta açıktır. Çalışma çenesi teknik gri, antagonist kırmızı-turuncu, restorasyon sarıdır. Aktif ünitenin üst/alt çenesine göre çalışma ve antagonist rolleri değişir. **Model görünümü** içinden teknik veya doğal palet seçilebilir. Saydamlık ve görünürlük proje ayarlarıyla kaydedilir.

Her satırda göz onay kutusu, yüzde sürgüsü ve tek başına göster düğmesi vardır. Yüzdeyi sıfıra indirmek modeli tamamen gizler; göz kutusuyla açmak önceki pozitif yüzdeyi geri getirir. **Tümünü gizle** geometriyi silmez; **Tümünü göster** sahneyi görünür ve opak yapar. **Çalışma ünitesi** altından her FDI restorasyonu ayrı gizlenebilir. Diğer yerleştirilmiş üniteler aktif ünite değişirken sahnede görünmeye devam eder; düzenleme aktif üniteye uygulanır.

**Karşıt çeneyi otomatik gizle**, kameranın çalışma eksenine göre antagonisti geçici gizler. Göz tercihini değiştirmez. Döndürme/ölçüm kipinde **Alt** basılı tutmak gizli nesneleri geçici gösterir; bırakınca ayarlar geri gelir. Şekillendirmede Alt mevcut ters fırça işlevini korur.

## CAD — çene ve kapanış

**Çene dosyaları** altında üst ve alt çene taramalarını seçin. Tarama dosyaları aynı kayıtlı koordinat sisteminde olmalıdır. Uygulama her çeneyi ayrı ayrı merkeze taşımaz; kaynak çenenin ortak merkez dönüşümünü kullanır. **Kayıtlı kapanış** her iki çeneyi görünür yapar, açılmayı sıfırlar ve kamerayı çift çeneye çevirir.

**Çene açılması**, antagonisti çalışma çenesinden uzaklaştıran 0–12 mm görüntüleme önizlemesidir. Sıfır mm, içe alınan kayıtlı kapanış koordinatıdır. Bu sürümde hasta hareketine göre kinematik artikülatör, otomatik tarama hizalama veya yeni ısırma kaydı çözümü yoktur. Hizalanmamış dosyalar kendiliğinden doğru kapanışa gelmez.

Kontak analizi ve renkleri antagonist taramasına olan gerçek yüzey mesafesini kullanır; çalışma modelini antagonist yerine kullanmaz. Karşıt çene yüklenmemişse kontak renkleri üretilmez ve antagonist/kapanış kontrolü istenir. Açılma önizlemesi kontak mesafesine yansır; kaynak mesh ve kayıtlı restorasyon geometrisini değiştirmez. Renkli mesafe görünümü tek başına üretim veya klinik onay değildir.

CAD başlığındaki **AYA** aktif üniteyi, kole noktası sayısını, yüklenmiş çeneleri, görünürlüğü ve kayıt durumunu kullanır. **Sonraki** ve **Kapanış** soruları bu gerçek ekran durumuna göre yanıtlanır. Geometriyi görmüş veya işlemi otomatik yapmış gibi bildirim vermez. **Koleye yerleştir** ve **Kaydet ve çık** teknisyenin açıkça seçtiği düğmelerdir.

## Eski formlara dönüş

24 yeni morfoloji ailesi, bunları üreten kod ve önizleme galerisi kaldırıldı. Diş görünümü ve atlas RC37 dosyalarına, CAD başlangıç geometrisi de RC37'nin özgün oluşturma koduna döndü. CAD iş tanımındaki altı özgün form seçeneği kullanılabilir.

Önceki 24 aileden kalan seçimler doğal forma taşınır. Bu ünitenin başlangıç geometrisi açılışta/seçimde yeniden oluşturulur; eski aile üzerindeki şekillendirme yeni başlangıç biçimine aktarılmaz. Ünitenin kole çizgisi, iş tanımı ve ölçü ayarları korunur. Yeni bir form seçmek yalnızca seçilen ünitenin başlangıç geometrisini değiştirir.

## Kendi formunuzu ekleme

Laboratuvar ana ekranından veya CAD başlığından **Form kütüphanesi** açın. Kütüphane başlangıçta boştur; hazır yeni form ailesi eklenmemiştir.

1. **Yeni form** ile STL veya OBJ seçin. Dosya en fazla 20 MiB olabilir.
2. Form adını ve ait olduğu FDI diş numarasını girin. Dosyanın birimini mm, cm veya µm olarak seçin.
3. **Oklüzal** ekseni ve gerekirse **+90°** dönüşünü ayarlayın. Fareyle gerçek 3D önizlemeyi döndürüp yakınlaştırın.
4. **Kaydet** ile formu bu cihazdaki kullanıcı kütüphanenize ekleyin.

İçe alınan formun tek, kapalı gövde olması gerekir. Açık yüzeyler, kopuk çoklu gövdeler veya bozuk dosyalar kaydedilmez. Bir form en fazla 100.000 köşe ve 200.000 üçgen içerebilir; daha yoğun modeli kendi yazılımınızda sadeleştirip yeniden ekleyin.

## CAD ünitesinde kullanma

**İş tanımı** ekranında ilgili ünitenin **Form kütüphanesi** düğmesini açın. Liste o ünitenin anatomi numarasına göre süzülür. Formu seçip **CAD’de kullan** düğmesine basın, ardından iş tanımını onaylayın. Formun gerçek içe alınmış yüzeyi başlangıç geometrisi olur.

Ünitenin FDI/anatomi numarasını değiştirmek kütüphane seçimini sıfırlar. Eski forma dönmek için iş tanımındaki kütüphane seçimini sıfırlayıp özgün form seçeneklerinden birini seçin. Mekanik teleskop formları kendi mevcut oluşturucusunu kullanır.

CAD'de **Kaydet** veya **Kaydet ve çık** kullanıldığında seçilen formun kaynağı ve düzenlenmiş geometri proje kaydının içine eklenir. Yerel kütüphanedeki orijinali silmek bu proje kopyasını silmez. Projeyi başka cihazda açan teknisyen de kaydedilmiş formu kullanabilir.

## Teknisyenler arasında aktarım

Kütüphanede **Dışa aktar**, `DentAYA_Form_Kutuphanesi.json` dosyası oluşturur. Diğer teknisyen bu dosyayı kendi kütüphanesinde **İçe aktar** ile ekleyebilir. Tek aktarım en fazla 100 form ve 50 MiB olabilir.

Kütüphane bu cihazda, oturum açan kullanıcı adına tutulur. Otomatik laboratuvar ortak kataloğu veya cihazlar arası eşitleme yoktur. Cihaz değiştirirken kütüphaneyi dışa aktarın; uygulama/tarayıcı verilerini temizlemek yerel listeyi siler. Uzak sunucuya kaydedilmiş proje kopyaları bundan etkilenmez.

## Kole, kayıt ve AYA

Aktif ünitenin kolesini preparasyon veya implant dayanağı çevresinde çizip **Sonraki** ile ilerleyin. Diş yerel koleye yerleşir ve kamera ona odaklanır. **Koleye yerleştir** aynı kolede şekillendirmeyi silmeden tekrar uygulanabilir. Her ünitenin kole, yerleşim ve şekillendirmesi ayrı kaydedilir.

**Kaydet ve çık** uzak kaydın tamamlanmasını bekler. Bağlantı hatasında çalışma açık kalır; güvenli yerel kopya hazırlanmışsa **Yerel kaydet ve çık** kullanılabilir. Yeniden açılışta **Kurtarma kaydı bulundu → Geri yükle** ile devam edip bağlantı gelince uzak kaydı tamamlayın. Yerel kurtarma aynı cihazdadır.

Adım adım çalışırken otomatik kaydın bitmesini beklemeden sonraki adıma geçebilirsiniz. Önceki adıma ait kayıt cevabı geç geldiğinde açık paneli geriye döndürmez.

RC40/RC41 belgeleri tarihsel referanstır. Güncel AYA motoru ve CAD görünürlük/kapanış davranışı bu RC42 belgesindeki gibidir.
