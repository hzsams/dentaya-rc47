# DentAYA çalışma talimatı

28 Ekim 2026 geliştirme devri: önce YENI_CHATGPT_ICIN_TAM_DEVIR.md ve DEVIR_DURUMU.json dosyalarını okuyun. Devir etiketi son RC62 sürümü değildir; yeni Qwen3.5 aday kodu yalnız ayrı deneysel patch olarak taşınır ve ana ürüne uygulanmamıştır.

Bu klasör RC46/RC47 tabanından geliştirilen RC62 çalışma kopyasıdır. Önce CODEX_DEVIR_NOTLARI.md ve CODEX_BASLANGIC_PROMPTU.md dosyalarını oku; bunlar ilk WIP devir kayıtlarıdır. Güncel kapsam ve doğrulama sınırları RC62_KONTROL_RAPORU.md ve verification/RC62 kayıtlarında tutulur. Eski sürümlerin geçen kontrollerini bu kaynağın doğrulaması sayma. Kaynak kontrolleri, gerçek model çıkarımı, Windows kurucu ve canlı kurum/klinik kabulünü ayrı raporla; henüz üretilmemiş kanıtı tamamlandı sayma.

- RC55, RC52'nin Studio aydınlık panellerini, mor başlıkları ve CAD'de sağ koyu komut şeridini kullanır; nesneler parametrelerin üstünde soldadır. CAD'de ortak uygulama başlığını veya ek modül kenar çubuğunu geri getirme. exocad/3Shape ergonomik referanstır; tescilli kod, logo veya arayüz varlığı kopyalama. Geçerli dil, açıkça seçilmiş görünüm tercihleri, kılavuzlu/uzman mod ve taşıma/sıfırlama davranışlarını koru.
- Yükleme yalnız gerçek bekleyen işlemin ömrünü izler. Zorunlu 5 saniyelik okuma, işlem sonrasında kalan katman veya hazır ekranda odak tuzağı ekleme. Bilgi kartları ve mini oyunlar isteğe bağlı kalır.
- Kullanıcının önceliği: sade ve tutarlı profesyonel arayüz, model öncelikli yerel AYA, çalışma belleği ve gerçek CAD araçlarıyla bağlamlı yardım. “AI based kaldır” açıklaması AYA’yı kaldırmak değildir.
- CAD manuel ve deterministik çalışır; asistan mevcut 27 tipli komutu kullanıcı tıklamasıyla çağırır. Uzman inceleme panelindeki fener/yüzey/kesit/kamera kontrolleri geometriyi veya geri alma geçmişini değiştirmez. İlk sekiz manuel araç ve kılavuzlu kapılar korunur.
- Üründe 500 gerçek TR/EN kısa bilgi kartı ve 60 kaynak grubu vardır; 30.000 kapasite testini gerçek içerik sayısı diye sunma. Hazır soru sayısını artırmayı ana görevin yerine koyma; iptal edilen RC38 form ailelerini geri getirme.
- İmplant koleye yerleştirme, kayıt/çıkış, yerel kurtarma ve mevcut kernel testlerini koru.
- Ortak katalogdaki 120 özgün hacim etkili SVG logoyu, eski 01–18 kimliğini, tercih aktarımını ve Electron izin listesini koru. Bunlar gerçek 3B mesh değildir.
- Yerel model/API anahtarsız çalışma, loopback, doğrulanmış indirmeler, iptal ve token bütçesini koru. Buluta otomatik geçiş ekleme.
- Gerçek kaynak kodunu esas al; eski RCxx raporları WIP doğrulaması değildir.
- İlk devirdeki react-hooks/refs hatası ve modeli gölgeleyen eski test beklentileri düzeltildi. Güncel kontrolleri çalıştır; eski raporları yeni değişikliğin doğrulaması sayma. Tarayıcı fixture testleri ile genel verify zincirini sırayla çalıştır.
- package-lock kullan; bağımlılıkları gerekçesiz topluca yükseltme. Yeni sırlar, .env.local, node_modules, .next ve geçici test sayfaları teslimata girmez.
- Rutin, geri alınabilir kod değişikliklerinde ilerle. Üretim web sitesine dağıtım bu görevin kapsamı değildir.
- Türkçe, somut ilerleme bilgisi ver. Mock/native çıkarım, kaynak ZIP/Windows EXE, geliştirme/üretim doğrulaması ayrımlarını açık tut.


- RC54 alan bazlı model bellek patch sözleşmesini, editör çakışma denetimini, not içe aktarmada güncel listeyi ve son status yanıtını esas alma davranışını koru. CAD recentActions yalnız eşleşen scope/snapshot/dataToken ile güncel kanıttır; canlı saveFailed/unsaved durumu geçmiş sonuçtan önce gelir. Dört ilgili RC54 tarayıcı testi ile tam verify geçti; native grammar 22/22, gerçek model çıkarımı hâlâ doğrulanmadı.

- RC55 kuron/kapşon başlangıcı yalnız ham modelde seçilen koleye yerleşince görünür; hedef yokken sahne merkezinde kuron gösterme. Ham preparasyonun örneklenen yüksekliği dış başlangıç zarfını etkiler; servikal tabanı başka kuronun üstüne taşıma. Bu tahmini iç uyum/üretim onayı sayma. Eğik/ters eksende ve yükseklik değişiminde servikal kayıt korunur.
- RC55 altı mevcut form için deterministik anatomik başlangıç kullanır. Kullanıcının doğal kuron talebi eski CAD kurucusu byte-hash dondurmasını geçersiz kılmıştır; RC37 görüntü referansları ve iptal edilmiş RC38 ailelerini geri getirmeme kuralı sürer. Düzenlenmiş legacy mesh, shell ve kişisel kütüphaneyi otomatik yeniden modelleme. Başarısız yükseltme eski geometri/ankrajı korur.
- AYA'da anatomik form, optik görünüm ve kole kaydını ayır. Gizli/yerleşmemiş başlangıcı Tümünü göster döngüsüne sokma; kole veya yerleştirme öner. İşlem kullanıcı Uygula kapısından geçer. RC55 native grammar 22/22, gerçek model çıkarımı hâlâ doğrulanmadı.

- RC56 Lab Yöneticisi kurum kapsamlı dokuz filtre/40 satır sayfalama kullanır; arama açık sayfayla sınırlıdır. Hata sonrası snapshot korunur; oturum/kullanıcı değişimi eski kayıtları ve bekleyen istekleri geçersizleştirir.
- RC56 kesit çizgisi/alanı gerçek üçgen-düzlem kesişimidir; duvar kalınlığı veya iç uyum değildir. Açık/çakışan/sınırlandırılmış alanı uydurma. Aktif ünite STL indirmesinde güncel kole, mesh QC ve kurtarma hazır olma kapılarını koru.
- RC56 120 hacim etkili SVG logo ve 5 mini oyun içerir. Önceki 01–100 katalog/900 varlığını ve eski oyun kayıtlarını koru. Oyunlar hazır ekranı bekletmez. AYA kısa takipleri aynı scope içinde güncel CAD durumunu kullanır; model hatasında rehberin motor bilgisini gizleme. Alıntı/soru/kısmi bellek silme isteğini tüm belleği sıfırlama yetkisi sayma.

- RC57 gerçek kesit kanıtını kaynak/ünite/düzlem anahtarıyla AYA'ya taşır. Aynı sayısal alan yeni düzlem kimliğinin yerini tutmaz. Kopya yüz alanını güvenilir sayma; açık/çakışan/sınırlandırılmış alanı uydurma. Güncel QC arayüzü ve asistanı eski ünite/geometri sayılarıyla besleme.
- Model testi kullanıcının yazılmamış taslağını korur; tanı Retry normal sorunun taslağını tüketmez. Mesajsız son belleği açık silme eski kaydı geri getirmemeli; başka pencerenin daha yeni kaydını silme.

- RC57 ortak arka plan/görünüm kataloğu 72 seçenek içerir. Dört reference paleti kullanıcının arka plan talebidir; bunları mini oyun teması olarak uygulama. Önceki seçimleri kendiliğinden değiştirme; mevcut ortak görünüm seçimi CAD tema zeminine de uygulanır.

- RC58 sol üst native modül menüsü 4 ana klasör/24 hedef kullanır. Arama üst klasörleri açar; yol değişimi yeni aktif yolu açıp eski aramayı temizler; aynı yolda kullanıcı katlamalarını koru. CAD ortak başlığını geri getirme.
- RC58 robot ve dokuz yalnız robot varlığı kaldırıldı. Gerekli kapasite/metrikler Yönetim > İşler ve finans > İş takibi altındadır; yeniden robot/yerel model puanı ekleme. Kapasite kaydı güncel veri/yetki/sürüm kapılarını korur.
- AYA tanı testi sohbet/geçmiş/bellek/notlardan izoledir ve sonucu geçicidir. Host işlem sonucu yalnız gerçek post-commit tek kullanımlık kanıtla günceldir; leave-return sırasında eski sonucu yeniden damgalama. Model merge sınırında eski kararı sessizce atma. Başlangıç hatasında IPC'ye yalnız statik güvenli kod gönder.

- RC59 uzun geçmiş kısaltması başlangıç ve son düzeltmeleri korur; token bütçesinde güncel istek/canlı CAD ve bellek kapılarını gevşetme. Geçmişte atlanan ortayı açık işaretle, saklanan asıl mesajı değiştirme.
- RC59 saklanan sohbetin tam normalize edilmiş revizyonunu karşılaştırır; gecikmiş yanıt yeni veya silinmiş kaydı sessizce ezemez. Çakışmada yerel çalışma/taslak ve açık yükle/ayrı kaydet seçenekleri korunur. Bu iyimser localStorage denetimidir, atomik pencere kilidi değildir. Başarısız Sil mevcut kaydı korur.
- RC59 CAD taslağı ve bekleyen soru aynı scope'ta kapat/aç için süreç belleğinde tutulur. Tek kontrol yorumu ve eski istek/araç sonucu yeni taslağı değiştirmez. Stop/dispose/önceden iptal motor başlangıcını geçersizleştirir; önbellek hash iptali ready sayılmaz. Gerçek model kabulü hâlâ ağ engeli nedeniyle eksiktir.

- RC60 uzun not alıntısı özgün kelime konumları çevresinden seçilir; 2200 sınırı, kaynak ve açık not kullanımı tercihini koru. Eşleşen notu kaynak gösterip ilgili son bilgiyi bağlam dışında bırakma.
- RC60 değişmemiş sohbet açma/dil değiştirme geçmiş tarihini, sırasını veya revizyonunu değiştirmez. No-op karşılaştırması sıkı revizyon kapısından sonra gelir; gerçek değişiklik ve silme çakışmasını gevşetme.
- RC60 başka pencerenin indirmesini iptal başarılı sayma. Kurulum kontrol istekleri kilitli, hata yakalayan ve durum yenileyen akışı kullanır. İndirmede 45 saniye hareketsizlik sınırı ilerlemeyle yenilenir; yarım dosya yeniden denemede tam boyut/hash kapısından geçer.


- RC61 ana sohbet yalnız gerçek yerel model yanıtını kullanır; hata/yoklukta otomatik Core/katalog/araç yanıtı üretme. Açık bellek kontrol komutları ve acil uyarılar ayrı deterministik işlemdir. Ana sohbet agent:false doğal akış kullanır; CAD tipli planı agent:true olarak doğrulanır. Ana sohbetin eski rehber yanıtları model geçmişine taşınmaz.
- RC61 hedef/karar/açık soru çıkarımı task:memory ayrı model işlemidir. Not/belge/geçmiş/CAD bu çağrıya girmez. Son yanıt ekstraksiyon hatasıyla silinmez; yalnız aynı oturum/son tur/bellek revizyonunda uygulanır. Yeni soru önce arka plan işini iptal edip bekler.
- CAD Araç rehberi açık Yanıt kaynağı seçimiyle kullanılır; rehber turları model geçmişine girmez. Model hatası hazır öneriye dönüşmez. Mevcut manuel araçlar kullanılabilir kalır.
- Ollama 4B seçeneği çalışan yerel Ollama gerektirir; managed1.7B sabit pin/hash korundu. Gerçek model semantik çıkarımı ağ engeli nedeniyle doğrulanmadı; kaynak/fixture testini gerçek model kabulü diye sunma.

- RC62 kabul oturumu yalnız açık kullanıcı başlangıcıyla dokuz sentetik model çağrısı yapar; gerçek CAD işlemi yürütmez, normal sohbet/geçmiş/bellek/notları değiştirmez. Sinyal kontrolleri anlamsal kalite sertifikası değildir. İptalde hem önceki yanıt hem iptal IPC sonucu bitene kadar motor sahipliği korunur; whenIdle kapısını kaldırma.
- RC62 sohbet çalışma kopyası aynı sekmede süreç belleğinde tutulur. Geçmiş kapalıyken konuşma kalıcılaştırılmaz; açıkken sessionStorage yalnız kayıtlı oturumun taslak/kesinti kimliğini tutar. Silinmiş konuşmayı eski taslakla geri getirme veya yeni revizyonu ezme.
- RC62 Windows CI gerçek NSIS yükünü çıkarıp ASAR/Next kaynaklarını ve x64 PE dosyalarını doğrular; çıkarılan Electron ile /workspace, /ai ve /settings ekranlarını açar. Kaynak manifestindeki derleme öncesi durum ile sürüm varlıklarının gerçek build receipt sonucunu ayır.
