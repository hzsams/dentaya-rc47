# DentAYA MVP Kullanım Kılavuzu

**Sürüm:** 0.1.0-rc.2  
**Hedef:** 30 Eylül 2026 MVP Freeze  
**Kapsam:** Klinik, laboratuvar ve kurye iş akışlarının tek platformda bağlanması; tarama, CAD review, iletişim, fiyat ve teslimatın vaka bağlamında izlenmesi.

> Bu kılavuz DentAYA MVP içindir. DentAYA klinik kararın veya üretim doğrulamasının yerine geçmez. AYA operasyonel karar desteğidir; DentAYA Design içindeki geometri araçları MVP seviyesinde yardımcı araçlardır.

## 1. DentAYA'nın temel mantığı

DentAYA'da her ekranın tek bir görevi vardır. Ana lobi modül girişlerini ve kısa operasyon özetini verir. Ayrıntılı vaka listesi **Vakalar** ekranında, hasta listesi **Hastalar** ekranında, taramalar **Tarama Stüdyosu / Taramalar** ekranında, CAD çalışma alanı **DentAYA Design** içinde tutulur. Böylece aynı bilgi her yerde tekrar edilmez.

Ana roller:

- **Klinik:** hasta, klinik vaka, klinik karar, hasta fiyatı ve randevu bağlamını yönetir.
- **Laboratuvar:** kendisine atanmış vakayı, laboratuvar taramasını, CAD versiyonlarını, üretim/QC akışını ve kliniğe verilen fiyatı yönetir.
- **Kurye:** yalnız kendisine açık fiziksel alım/teslimat görevini ve teslimat durumunu yönetir.
- **AYA Copilot:** rolün erişebildiği verilerden operasyonel özet, eksik bilgi ve sıradaki adım sinyali üretir.

## 2. Giriş ve çalışma alanı

1. DentAYA'ya giriş yapın.
2. Aktif kurum üyeliğiniz otomatik bulunur.
3. Kurum tipinize göre Klinik Merkezi, Laboratuvar Merkezi veya Lojistik ekranı açılır.
4. Sağ alttaki **Hızlı Git** düğmesi veya `Ctrl/⌘ + K` ile modüller arasında geçebilirsiniz.
5. Bir modül görünmüyorsa önce rolünüzü ve aktif üyeliğinizi **Ayarlar → Hesabım / Kurum** bölümünden kontrol edin.

DentAYA MVP şu anda tek aktif üyelik akışını temel alır. Birden fazla organizasyon arasında gelişmiş çalışma alanı değiştirme davranışı sonraki sürümlerin konusudur.

## 3. Ana Lobi

Lobi günlük başlangıç ekranıdır. Burada amaç ayrıntı göstermek değil, doğru modüle hızlı geçmektir.

Lobide:

- rolünüze göre temel modüller,
- kısa operasyon metrikleri,
- AYA Copilot erişimi,
- dikkat gerektiren genel sinyaller

görünür. Ayrıntılı vaka listesi burada tutulmaz. Vaka aramak, filtrelemek veya tek tek açmak için **Vakalar** modülünü kullanın.

## 4. Klinik kullanım akışı

### 4.1 Hasta oluşturma

**Hastalar → Yeni Hasta** üzerinden hasta kaydı oluşturun. Yalnız gerekli bilgileri girin. Hasta kaydı klinik tarafında kalır ve daha sonra tarama/vaka ile ilişkilendirilebilir.

### 4.2 Tarama ekleme

**Tarama Stüdyosu** üzerinden STL veya PLY dosyasını içe aktarın. Tarama için:

- hasta veya vaka bağlantısını,
- tarama tipini / amacını,
- ark bilgisini,
- dosya ve mesh sinyallerini

kontrol edin. Mesh kalite sinyalleri teknik yardımcıdır; klinik kalite validasyonu değildir.

### 4.3 Vaka oluşturma

**Vakalar** ekranında iş emrini oluşturun. Mümkün olduğunca şu alanları tamamlayın:

- hasta,
- diş / FDI,
- restorasyon türü,
- materyal,
- renk,
- termin,
- öncelik,
- laboratuvar,
- ilgili tarama/dosya.

Eksik üretim girdileri ileride AYA veya vaka detayında uyarı olarak görünebilir.

### 4.4 Klinik-laboratuvar iletişimi

Teknik konuşmaları mümkün olduğunca vaka bağlamındaki **Mesajlar** alanında tutun. Böylece kararlar WhatsApp/e-posta gibi dış kanallarda dağılmaz. Klinik bilgi, tasarım kararı ve revizyon notu mümkün olduğunca ilgili vakaya bağlı tutulmalıdır.

### 4.5 Tasarım inceleme

Laboratuvar CAD versiyonunu review'a gönderdiğinde vaka içinden ilgili versiyonu inceleyin. Klinik tarafında:

- onay,
- revizyon talebi,
- revizyon notu

kaydedilebilir. MVP'de klinik onayı, laboratuvarın kendi `design_projects` kaydını otomatik olarak her durumda aynı status alanına yazmaz; review kaydı vaka kararının resmi izidir.

### 4.6 Klinik fiyatı ve ödeme

**Finans** bölümünde hasta fiyatını, indirimi ve ödeme durumunu kaydedin. Bu alan laboratuvarın vaka maliyetinden ayrıdır. Laboratuvar kendi verdiği fiyatı görür; klinik hasta fiyatı klinik kapsamındadır.

### 4.7 Teslimat

Fiziksel ürün hazır olduğunda lojistik/gönderi kaydı üzerinden teslimat sürecini izleyin. Teslim kaydı ile vaka durumunun birbiriyle uyumlu olduğundan emin olun.

## 5. Laboratuvar kullanım akışı

### 5.1 Yeni işi açma

**Laboratuvar Merkezi** modül odaklı giriş ekranıdır. Ayrıntılı vakalar için **Vakalar** ekranına geçin. Yeni vakada diş, materyal, renk, termin, scan/dosya ve klinik talebini kontrol edin.

### 5.2 Lab taraması

Model, master model, antagonist, bite, die, wax-up veya referans taraması gerekiyorsa **Tarama Stüdyosu** üzerinden vakaya bağlayın. Laboratuvar taraması MVP'de vaka bağlantısı gerektirir.

### 5.3 DentAYA Design

**DentAYA Design** masaüstü CAD workstation düzenindedir:

- **Üst komut barı:** proje/vaka, workflow, version/review işlemleri,
- **Sol panel:** kaynak, nesne ve versiyon bağlamı,
- **Orta viewport:** ana 3D çalışma alanı,
- **Sağ inspector:** seçili araca ait ayarlar,
- **Alt durum alanı:** mesh/ölçü/aktif araç bilgileri.

Önerilen sıra:

**Scan → Margin → Axis → Anatomy → Contacts → Thickness/QC → Review**

Mevcut MVP yetenekleri arasında STL/PLY kaynak, manuel margin noktaları, yumuşatılmış kapalı margin eğrisi, kamera görünümünden insertion axis, undercut orientation görselleştirmesi, procedural anatomy, freeform add/reduce/smooth, contact preview, clearance/thickness proxy, section view, ölçüm, wireframe, undo/redo, STL export ve versiyon/review akışı bulunur.

Bunlar Exocad ile birebir üretim kernel eşdeğerliği değildir. True intaglio, cement gap offset, watertight shell, gerçek wall-thickness, gelişmiş komşu/antagonist adaptasyonu, bridge/implant/CAM postprocess gibi konular MVP sonrası CAD kernel geliştirmesidir.

### 5.4 Review'a gönderme

Tasarım hazır olduğunda yeni versiyon oluşturup kliniğe review'a gönderin. Klinik kararından önce üretimi tamamlanmış kabul etmeyin.

### 5.5 Üretim ve QC

Klinik kararı geldikten sonra vakayı üretim ve kalite kontrol durumlarında ilerletin. DentAYA'nın mevcut CAD sinyalleri üretim validasyonunun yerine geçmez; üretim öncesi gerçek laboratuvar prosedürlerinizi uygulayın.

### 5.6 Lab fiyatlandırma

Laboratuvar vaka bazında kliniğe verdiği fiyatı **Finans** alanında yönetir. Bu kayıt klinik hasta fiyatından ayrıdır.

### 5.7 Teslimat

Hazır işi **Lojistik** modülüne aktarın. Takip kodu ve teslimat durumu varsa vaka ile tutarlı ilerletin.

## 6. Kurye kullanımı

Kurye rolü klinik ve CAD verilerine geniş erişim için tasarlanmamıştır. Kurye:

1. kendisine açık gönderiyi görür,
2. alım/yolda/teslim durumunu fiziksel hareket gerçekleştiğinde günceller,
3. gerekiyorsa takip bilgisini kullanır,
4. teslim tamamlandığında görevi kapatır.

## 7. AYA Copilot

AYA iki çalışma davranışına sahiptir:

- **AYA Core:** deterministik, yerel operasyon karar desteği. Vaka, scan, CAD/review, fiyat, mesaj sayısı ve teslimat sinyallerinden özet üretir.
- **Bulut model modu:** yalnız sunucu tarafında açıkça yapılandırılmışsa kullanılır. Kapalıysa ürün AYA Core'a geri döner.

AYA şu sorularda yardımcı olur:

- Bu vakada sıradaki operasyonel adım ne?
- Hangi bilgi eksik?
- Scan/CAD tarafında ne durumda?
- Review bekliyor mu?
- Lab fiyatı veya klinik finans durumu ne?
- Teslimat hangi aşamada?

AYA klinik teşhis, tedavi kararı veya üretim garantisi vermez. Bulut modele serbest metin gönderirken kimlik bilgisi yazmayın; gerçek hasta verisiyle bulut AI kullanımı için ayrıca gizlilik/hukuk/veri işleme değerlendirmesi gerekir.

## 8. Mesajlar ve bildirimler

**Mesajlar** organizasyonlar ve vakalar arasındaki operasyonel iletişim alanıdır. Vaka bazlı teknik kararları vaka bağlamında tutun.

**Bildirimler** önemli değişiklikleri yüzeye çıkarır. Bildirim tercihlerinin kategori bazlı davranışı **Ayarlar → Bildirimler** bölümünden yönetilir.

## 9. Taramalar ve Dental Twin

**Taramalar** ekranı kayıtlı scan geçmişini ve karşılaştırma araçlarını sunar. Scan Compare hizalama/ICP yaklaşımı MVP seviyesindedir ve klinik validasyon olarak yorumlanmamalıdır.

**Dental Twin** uzun vadeli dijital ağız kaydı vizyonunun MVP yüzeyidir. Buradaki demo veya sentetik veriler gerçek klinik bulgu değildir.

## 10. Ayarlar

Ayarlar ekranının ana bölümleri:

- **Hesabım:** profil ve kullanıcı bağlamı,
- **Görünüm:** tema, yüzey stili, özel vurgu rengi, yazı ölçeği ve hareket seviyesi,
- **Çalışma Alanı:** rol/yoğunluk davranışları,
- **Bildirimler:** kategori tercihleri,
- **Kurum / Laboratuvar Profili:** kurum bilgileri ve laboratuvar yetenekleri,
- **Sistem:** senkronizasyon, pilot ve release araçlarına geçiş.

Görünüm tercihleri önce cihazda uygulanır, **Kaydet** ile hesabınıza yazılır. 24 tema desteklenir. Hareket hassasiyeti olan kullanıcılar `Reduced` veya `Off` seçebilir.

## 11. Öğrenim Rehberi

**/start** sayfası artık rol bazlı interaktif öğrenim yoludur. Her adımı gerçekten öğrendiğinizde **Öğrendim** düğmesiyle işaretleyebilirsiniz. Bu ilerleme yalnız cihazdaki local storage'da saklanır; vaka veya hasta verisini değiştirmez.

Klinik, laboratuvar ve kurye için ayrı adımlar gösterilir. İlerleme istenildiğinde sıfırlanabilir.

## 12. Pilot Flow

**Pilot Akışı** belirli bir vaka için uçtan uca zinciri kontrol eder:

- vaka,
- scan,
- mesaj,
- CAD,
- review,
- lab fiyatı,
- klinik finansı (yalnız klinik),
- gönderi,
- teslimat.

Yüzde skor yalnız akış tamamlama göstergesidir; klinik kalite skoru değildir. Tutarsızlık sinyalleri, örneğin teslim edilmiş gönderiye karşı teslim edilmemiş vaka, ayrıca gösterilir.

## 13. Release Check

**Release Check** 30 Eylül MVP freeze öncesi teknik ve manuel kapıları toplar. Otomatik kontroller env, auth, WebGL ve ana veri yüzeylerine erişimi denetler. Manuel kapılar gerçek test yapılmadan işaretlenmemelidir:

- production build,
- klinik → lab akışı,
- scan + CAD + review,
- finans veri sınırı,
- kurye teslimatı,
- görsel QA,
- staging smoke test.

Manuel işaretler yalnız cihazda tutulur; CI/CD onayı yerine geçmez.

## 14. Sorun giderme

### Oturum açılıyor ancak veri görünmüyor
Aktif üyeliği ve kurum rolünü kontrol edin. Ardından **Sistem Kontrolü** ve **Release Check** sayfalarına bakın.

### CAD veya scan 3D alanı açılmıyor
WebGL desteğini kontrol edin. Tarayıcı donanım hızlandırması kapalıysa 3D viewport çalışmayabilir.

### AYA bulut modeli bağlı görünmüyor
Bu normal olabilir. AYA Core bulut model olmadan çalışacak şekilde tasarlanmıştır. Bulut modu için server-side `OPENAI_API_KEY` ve `DENTAYA_AI_CLOUD_ENABLED=true` gerekir.

### Tema veya font farklı görünüyor
Ayarlar → Görünüm'de tercihi yeniden kaydedin. RC2 global font ailesini tüm sayfalarda aynı sistem font zincirine zorlar.

### Bir rol görmemesi gereken bilgiye erişiyor
Bu bir release blokeridir. Ekran görüntüsü, rol ve rota bilgisiyle kaydedin; pilotta gerçek hasta verisine geçmeyin.

## 15. MVP kullanım sınırları

30 Eylül MVP'si pilot ve ürün doğrulama içindir. Aşağıdakileri varsaymayın:

- klinik olarak valide AI teşhis,
- scanner donanım SDK entegrasyonu,
- Exocad/CAM üretim parity,
- üretim garantisi veren mesh/CAD kalite ölçümü,
- tam muhasebe/ERP,
- gerçek hasta bulut AI işleme uyumluluğunun otomatik olarak tamamlanmış olması.

Pilot süresince mümkün olduğunca sentetik/test veri kullanın. Gerçek hasta kullanımına geçmeden önce KVKK, güvenlik, erişim, yedekleme ve kurum süreçlerini ayrıca doğrulayın.

## 16. Hızlı referans

- **Modül aç:** `Ctrl/⌘ + K`
- **Vaka:** `/cases`
- **Tarama Stüdyosu:** `/scan-studio`
- **DentAYA Design:** `/design`
- **AYA:** `/ai`
- **Finans:** `/finance`
- **Lojistik:** `/logistics`
- **Ayarlar:** `/settings`
- **Öğrenim Rehberi:** `/start`
- **Pilot Akışı:** `/pilot-flow`
- **Release Check:** `/release-check`

---

## AYA — Akıllı Yardım Asistanı

AYA artık yalnızca vaka analizi yapan bir panel değildir. Program içinde yönlendirme ve desteklenen ayarları uygulama için de kullanılabilir.

Örnekler:
- `Açık temayı aç`
- `Yazıları büyüt`
- `Animasyonları azalt`
- `Mesaj bildirimlerini kapat`
- `DentAYA Design ekranını aç`
- `Görünüm ayarlarını aç`
- `Öğrenim rehberini aç`

AYA bu komutlarda yalnızca nasıl yapılacağını anlatmaz; desteklenen ayarlarda değişikliği kaydeder veya ilgili ekrana yönlendirir.

---

# Step 18 — Final Arayüz ve AYA Rehberi

## AYA sohbet ekranı
AYA artık yanıtlarını tek bir metin kutusunda göstermek yerine sohbet akışında gösterir. Kullanıcının sorusu sağ tarafta, AYA yanıtı sol tarafta ayrı balon olarak görünür. Son konuşmalar `ai_sessions` kayıtları üzerinden tekrar açılabilir ve vaka bağlamı olan konuşmalar seçili vakayla birlikte görüntülenir.

AYA şu alanlarda kullanılabilir:
- Vaka riski, eksik alanlar ve sonraki adım
- Tarama / CAD / review / finans / teslimat özeti
- Tema, yazı ölçeği, hareket yoğunluğu ve panel stili değişiklikleri
- Bildirim kategorilerini açma / kapatma
- Çalışma alanı kart yoğunluğu ve modül simgeleri
- Modül navigasyonu ve öğrenim rehberi

Programın çoğu ekranında sağ alttaki **AYA** düğmesi mevcut sayfanın yolunu AYA'ya ileten bir yardım sorusu hazırlar.

## Çalışma alanı kişiselleştirmesi
Ayarlar > Çalışma Alanı bölümünde:
- Kart yoğunluğu: Rahat / Dengeli / Sıkı
- Kart karakteri: Yumuşak / Çizgili / Minimal
- Başlık ölçeği: Sakin / Dengeli / Güçlü
- Modül simgelerini göster / gizle
- Lobide AYA'yı göster / gizle
- Operasyon özetini göster / gizle
- Geniş ekranda merkezlenmiş içerik

Bu tercihler tarayıcıda uygulanır ve AYA komutlarıyla da değiştirilebilir.

## DentAYA Design v2 çalışma düzeni
DentAYA Design artık dört katmanlı masaüstü CAD düzenine sahiptir:
1. Sol dikey workflow araç rayı
2. Nesne / kaynak / versiyon paneli
3. Geniş 3D viewport
4. Aktif adıma göre değişen inspector

**Odak Modu** nesne ve inspector panellerini gizleyerek viewport'u büyütür. Viewport üzerinde canlı QC şeridi kaynak tarama, marjin, proje ve review durumunu özetler.

Bu sürüm profesyonel browser CAD workflow'u sunar; üretim kernel'i, gerçek crown-bottom / watertight boolean, gerçek wall-thickness, articulator ve CAM doğrulaması gibi ileri üretim özellikleri ayrı CAD kernel geliştirme alanıdır.

---

## Step 19 — DentAYA Design Full Tool Suite

DentAYA Design içinde üst bardaki **Tüm Araçlar** düğmesi bütün CAD araç envanterini açar. Klavye ile `Ctrl/Cmd + Shift + T` kullanabilirsin.

Araçların durum etiketleri önemlidir:

- **AKTİF:** Şu anda kullanılabilir.
- **MVP ÖNİZLEME:** Çalışan bir analiz/önizleme vardır ancak klinik/üretim doğrulaması değildir.
- **GEOMETRİ ÇEKİRDEĞİ:** Araç ürün şartnamesinde ve arayüzde yer alır; production-grade mesh/boolean/segmentasyon çekirdeği tamamlanmadan gerçek üretim aracı sayılmaz.
- **YOL HARİTASI:** Daha sonraki modül veya servis katmanıdır.

### Yeni Sculpt kontrolleri

Design → Serbest Şekillendirme bölümünde artık Ekle, Azalt, Yumuşat ve Düzleştir araçları bulunur. Brush shape `Round`, `Pointed`, `Flat` olarak değiştirilebilir. `Formu koruyan smoothing`, `Kusp tepelerini koru`, `Ekvator bandını koru` ve `Sadece oklüzal yönde hareket` seçenekleri tasarım davranışını kişiselleştirir.

### Tam araç paneli

Tool Suite; restorasyon tipleri, marjin, insertion/internal fit, anatomy, sculpt, adaptasyon, contact/analysis, attachment/cutback/connectors, implant, bar, splint, provisional, parsiyel, tam protez, model creator, articulator/motion, DICOM, smile, telescopic/post-core, AI, manufacturing ve export/collaboration başlıklarını tek yerde toplar.

---

## Step 20 — CAD Kernel MVP

DentAYA Design içindeki bazı araçlar artık yalnız Tool Suite kaydı değil, gerçek geometri işlemleridir.

### Margin Engine v2
Margin noktalarını çizdikten sonra **Yüzeye projekte et** ile noktaları kaynak mesh yüzeyine yaklaştırabilir, **Smooth** ile kapalı eğriyi yumuşatabilir ve `+0.05 mm / -0.05 mm` ile yüzey normali boyunca toplu offset uygulayabilirsin.

### Internal Fit MVP
Margin adımında margin-zone gap, cement gap, axial gap, radial gap, transition band ve milling compensation ayarlanabilir. **Internal fit relief uygula** komutu cervical bölgede kaynak taramaya göre gerçek vertex düzeltmesi yapar. Bu araç tam crown-bottom/intaglio shell değildir ve üretim validasyonu yerine geçmez.

### Undercut / Block-out
Güncel görünümü insertion axis yaptıktan sonra undercut renk haritasını açabilirsin. **Block-out preview** giriş eksenine göre retantif bölgelerin yaklaşık blokaj geometrisini gösterir; preview üretim mesh'i değildir.

### Contact Engine
Contact görünümü artık yalnız unsigned nearest-distance yerine kaynak mesh normalini kullanan yaklaşık signed-distance hesaplar. Böylece collision sample, temas ve clearance bölgeleri daha anlamlı ayrılır.

### Connector
Contacts adımında **Connector yerleştir** aracını aç ve restorasyon üzerinde iki docking noktası seç. Round/oval şekil ve çap ayarlanabilir. DentAYA minimum connector alanı, genişliği ve yüksekliği için QC hesabı yapar. Connectorlar henüz robust boolean union ile tek shell'e kaynaştırılmaz.

### CAD Kernel QC
`Ctrl/Cmd + Shift + Q` veya kontrol panelindeki **CAD Kernel QC çalıştır** ile:
- triangle / vertex,
- degenerate triangle,
- boundary edge,
- non-manifold edge,
- watertight durumu,
- contact/collision sample,
- undercut oranı,
- margin projection oranı,
- connector QC
raporlanır.

Review için STL gönderilirken kritik mesh veya connector QC hataları gönderimi durdurur.

---

## Step 21 — Crown Shell / Intaglio MVP Kullanımı

DentAYA Design içinde bir çalışma taraması ve restorasyon hazırlandıktan sonra Margin / Internal Fit bölümüne geçilir.

1. Marjin çizgisini tanımla ve yüzeye projekte et.
2. Giriş eksenini mevcut görünümden ayarla.
3. Cement / axial / radial gap değerlerini belirle.
4. `Crown shell oluştur` komutunu çalıştır.
5. `Kesit görünümü` ile inner / outer shell ilişkisini incele.
6. Kernel QC'de watertight, boundary, non-manifold ve wall tahminini kontrol et.
7. Gerekirse `Mesh repair` çalıştır.
8. Shell uygun değilse `Shell'i temizle`, anatomy / fit ayarlarını düzenle ve yeniden üret.

**Önemli:** Crown Shell MVP, DentAYA'nın geometri Ar-Ge çekirdeğidir. Klinik ve üretim açısından doğrulanmış intaglio veya milling-ready crown-bottom olarak değerlendirilmemelidir.
