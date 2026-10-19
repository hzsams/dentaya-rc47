# DentAYA RC43 — RC42 + RC43 tek paket

## Windows güncellemesi

Bu tek ZIP, RC42 ve RC43 değişikliklerini birlikte içerir. RC42 arşivini ayrıca indirmeniz veya önce kurmanız gerekmez. Başlangıç için `KURULUM.txt` dosyasını okuyun.

1. ZIP'i açın; `DentAYA_Production_RC43` klasörüne girin.
2. Çalışan `.env.local` dosyanızı `package.json` ile aynı klasöre kopyalayın.
3. `DENTAYA_GUNCELLE_DERLE.cmd` dosyasını çalıştırın. Node.js 22+ ve npm 11+ gerekir.
4. CMD, kaynakları `%LOCALAPPDATA%\DentAYA\Builds\rc43-…` altında yeni bir yerel klasöre kopyalayıp orada derler. `.env.local` kopyaya alınır; kilitli `.next`, `node_modules` ve eski dağıtım klasörleri taşınmaz. Kaynak dosyalarınız değiştirilmez.
5. Derleme bittiğinde kurulum EXE’si Gezginde seçilir. Çalışmanızı kaydedip açık DentAYA uygulamasını kapatın; seçilen `DentAYA-Setup-1.0.0-rc.43.exe` dosyasını çalıştırın. Çıktı bu yerel çalışma klasörünün `dist-desktop` dizinindedir.

Paket kaynak koddur; hazır Windows EXE içermez. Bu sürüm için yeni veritabanı migration'ı yoktur.

## Yükleme bilgileri

Modül açılırken ve CAD/tarama modeli yüklenirken alttaki **Bir diş bilgisi** kartı görünür. Hızlı yüklemelerde aynı cümleyi okuyabilmeniz için ekran ilk yükleme başlangıcından itibaren toplam **10 saniye** görünür kalır. Veri hazır olduğunda başlık bunu söyler; **Çalışmaya geç** veya **Esc** ile hemen geçebilirsiniz. Ardışık sayfa/model yüklemeleri aynı okuma penceresini paylaşır; her aşamada sayaç yeniden başlamaz. Gerçek yükleme 10 saniyeyi aşarsa verinin hazır olması beklenir, ardından yeni bir okuma beklemesi eklenmez. Her cümle tek bir genel bilgi verir. Bilgiler 12 saniyede bir değişir; açık uygulama oturumunda aynı 100'lük tur bitmeden bir cümle tekrar seçilmez. Son cümle ile sonraki turun ilk cümlesi de aynı olmaz. Uygulama tamamen yeniden açıldığında yeni bir karıştırılmış tur başlar.

**Başka bilgi** hemen yeni bir cümle seçer. **Bilgileri duraklat** otomatik değişimi durdurur; **Bilgileri sürdür** yeniden başlatır. Kartın içindeki kontrollerde klavye odağı varken otomatik değişim durur. Sekme görünmüyorken arka planda cümle tüketilmez.

Bilginin altında kurum ve kaynak bağlantısı bulunur. Kaynak yalnız siz tıkladığınızda açılır. 100 Türkçe cümle `RC43_100_DIS_BILGISI.txt` içindedir; Türkçe ve İngilizce içerik uygulamayla birlikte gelir. Diğer dil seçimlerinde yeni bilgi/oyun metinleri İngilizceye geçer; mevcut arayüzün 46 dil desteği korunur.

## Kusp Kilidi

Yükleme kartındaki **Mini oyunu aç** ile oynayın. Yükleme dışında erişmek için **AYA → Kusp Kilidi** bağlantısını kullanın; oyun sayfası `/mini-game` adresindedir.

Dört kuspun kanal işaretini merkeze yönlendirin. Bir kuspa dokununca kendisi iki, saat yönündeki komşusu bir adım döner. Tüm işaretler merkeze baktığında kilit açılır.

- Bir kuspa tıklamak veya dokunmak onu çevirir.
- **Ters çevir**, seçili kusp ve komşusunu ters yönde hareket ettirir.
- **İpucu**, çözüme giden bir sonraki kuspu ve yönü gösterir.
- Ok tuşları kusp seçer; **Enter / Boşluk** çevirir; **Shift + Enter** ters çevirir.
- **Yeni bulmaca** yeni bir düzen üretir; çözdükten sonra **Bir tane daha** kullanılabilir.
- Oyun penceresinde **×** veya **Esc** ile çalışmaya dönün.

Hamle sayısı, hizalanan kusplar ve tamamlanan bulmacalar görünür. Çözülen toplam bulmaca ve en düşük hamle rekoru cihazda saklanır. Cihaz verileri temizlenirse bu rekor silinir; hasta ve CAD kayıtları oyun verisine alınmaz.

Oyun sayfası yüklendikten sonra oyun/bilgiler ağ bağlantısı gerektirmez. Masaüstü paketinde dosyalar uygulamayla gelir. Tarayıcıda ilk sayfa erişimi bağlantı isteyebilir; çevrimdışı ilk ziyaret için PWA önbellek garantisi verilmez.

Yükleme oyun oynanırken arka planda devam eder. İş hazır olduğunda pencere bunu bildirir. En fazla 10 saniyelik okuma görünümü istenirse atlanabilir; oyun bitirme zorunluluğu yoktur ve veri yükleme/kayıt istekleri durdurulmaz. Oyun hazır ekranın üzerinde açık kalabilir ve kapatılabilir. Bilgi kartı 10 saniyelik okuma süresi dolunca veya **Çalışmaya geç** seçilince kaldırılır. Gerçek yükleme hâlâ sürüyorsa normal yükleme kartı veri hazır olana kadar görünür kalır.

## RC42 özellikleri

AYA yerel motor kurulumu, bilgi defteri, teknik CAD renkleri, Göster / Gizle paneli, kayıtlı statik kapanış, eski formlar, teknisyen form kütüphanesi ve kayıt/çıkış akışı için [RC42_KULLANIM.md](RC42_KULLANIM.md) geçerlidir. AYA'nın temel modeli sıfırdan eğitilmedi; RC43 mini oyunu CAD geometrisini veya model ağırlıklarını değiştirmez.

RC42 belgesindeki tarihsel kurulum klasörü ve EXE adları yerine bu belgedeki RC43 adlarını kullanın. RC42 ve RC43 özellikleri bu tek pakettedir. Son ek: 10 saniyelik okuma görünümü, erken geçiş ve aynı cümlenin korunması. Bu eke ait güncel kontrol çıktıları `verification/RC43/reading-10s/` içindedir.
