DentAYA masaüstü uygulamasının geliştirmesini bu projeden devralmanı istiyorum. Bu mesajı ürün bağlamı ve çalışma talimatı olarak kabul et. Önce gerçek kaynak kodunu incele, sonra değişiklikleri uygula; yalnızca yol haritası veya örnek ekran vererek işi bırakma.

1. DentAYA nedir?

DentAYA; diş klinikleri, diş protez laboratuvarları ve lojistik ekiplerinin aynı iş akışında çalışmasını amaçlayan bir yazılım. Hasta ve vaka yönetimi, taramalar, restorasyon tasarımı, klinik onayı, laboratuvar üretim akışı, teslimat, mesajlaşma, finans, randevu, ekip ve topluluk modülleri var. CAD alanının adı DentAYA Design, uygulama içi asistanın adı AYA.

Türkçe öncelikli çalışıyoruz; ilk dış pazar Avrupa. Kullanıcı diş teknisyeni veya klinisyen gibi günlük iş yapan biri. Ekranların profesyonel masaüstü CAD hissi vermesi, işlemlerin kalıcı ve güvenilir olması önemli. Ürünün mevcut çalışan kısmını, geliştirme halindeki kısmını ve uzun vadeli vizyonunu ayrı anlat. Bir özelliğin dosyada bulunması onun doğrulanmış veya üretime hazır olduğunu göstermez.

2. Hangi kaynakla devam edeceksin?

Eklediğim DentAYA_Codex_Devir.zip tam kaynak çalışma kopyasıdır. Klasörü açıp proje kökünde çalış. Önce AGENTS.md ve CODEX_DEVIR_NOTLARI.md dosyalarını oku. Son teslim edilmiş temel paket DentAYA_RC46_Tek_Paket.zip, uygulama sürümü 1.0.0-rc.46. Devir kopyasında RC46 üzerine başlanmış ve henüz teslim edilmemiş AYA/CAD değişiklikleri bulunuyor. Bunları tamamlanmış RC47 kabul etme.

Kaynak klasöründe package.json ve electron klasörü olmalı. Eski bir Windows klasörünün adında RC20 yazması uygulama içindeki sürümün RC20 olduğunu göstermez; package.json, kilit dosyası ve release.ts ile doğrula. Çalışma alanında hangi sürümün gerçekten bulunduğunu tespit et. Devir dosyası yoksa ona erişmiş gibi davranma; mevcut kaynakla ilerleyebildiğin kadar ilerle ve eksik kaynağı açıkça belirt.

3. Teknik yapı

Bu kaynakta Next.js 16.3.8 App Router, React 19.3.0, TypeScript 5.9.3, Three.js 0.186.0, Electron 44.4.5 ve electron-builder 26.15.3 var. Node gereksinimi en az 22.12, npm en az 11. package-lock.json korunuyor.

Next output: standalone. Electron ana süreç: electron/main.cjs. Güvenli masaüstü köprüsü: electron/preload.cjs; TypeScript tanımı src/types/desktop.d.ts. Geliştirme varsayılan web adresi localhost:3010; paketli uygulamanın yerel sunucusu kodda 127.0.0.1:3210. Güncel kodu esas al.

Backend Supabase: Auth, Postgres, Storage ve RLS. Şema ve değişiklikler supabase/migrations altında. Önemli kayıtlar organizations, memberships, patients, cases, scan_sessions, attachments, design_projects, design_versions, case_design_reviews, shipments ve mesajlaşma tabloları. Vaka, tasarım, versiyon ve klinik onay ilişkilerini koru. Hasta verilerini veya anahtarları loglara ve ZIP'e koyma. Service role anahtarını istemciye taşıma.

CAD ana ekranı src/app/design/DesignStudioClient.tsx, Three.js sahnesi src/app/design/DesignViewport.tsx. CAD iş akışı ve kapılar src/lib/cad-workflow.ts, iş tanımı src/lib/cad-job-setup.ts, proje kaydı src/lib/cad-project-state.ts, yerel kurtarma src/lib/cad-recovery.ts. Geometri işlemleri src/lib/cad-*.ts motorlarında. Kopya bir CAD veya ikinci bir sahne oluşturma; mevcut altyapıyı geliştir.

Arayüz i18n altyapısı src/lib/i18n altında. UiNode, UiLink, UserText gibi bileşenlerin kullanımını incele. Mevcut 46 dil paketini koru. Eski tüm içeriklerin eksiksiz çevrildiğini varsayma; yeni alanların bir kısmında TR/EN ve diğer diller için İngilizce fallback var. Sabit arayüz metni ile kullanıcının/modelin yazdığı içeriği ayır.

4. Şu anda yapmanı istediğim asıl iş

Son isteğim aynen şu:

“Kanka artık AYA’yı belli başlı sorulara cevap veren bir AI değil gerçekten beyni olan birisine dönüştürmemiz lazım ve CAD’da dizayn yaparken birçok yerde etkin olması lazım.”

Bunun teknik karşılığı: AYA, yeni ifadeleri ve çok adımlı istekleri anlayabilen, konuşma hedefini ve kararları hatırlayan, açık CAD işinin gerçek verilerini kullanabilen, uygun mevcut araçları önerebilen ve kullanıcının uyguladığı işlemlerin sonucunu yorumlayabilen bir yerel asistan olmalı.

Soru sayısını artırmak veya birkaç anahtar kelime daha eklemek bu isteği karşılamıyor. RC46'daki 1008 hazır soru-cevap yardımcı bir bilgi kaynağı olarak kalabilir. Yerel model hazırken normal konuşmanın merkezine modeli al. Hazır cevapların modeli gölgelemesini düzelt. Model yoksa bilgi rehberi açık kalabilir; bu durumu gerçek model çıkarımı yapılmış gibi gösterme.

“Beyin” ifadesini bilinç veya insan seviyesinde genel zekâ iddiasına dönüştürme. Sıfırdan temel model eğitildiği, kendi kendine ağırlık güncellediği veya ChatGPT Pro seviyesine ulaşıldığı iddia edilmesin. Bağlam, bellek, araç kullanımı, kaynaklandırma ve değerlendirme altyapısını gerçekten kur.

5. AYA'nın mevcut mimarisi ve hedefi

Ana sohbet src/app/ai/AyaChat.tsx; ortak yanıt yönlendirme src/lib/aya-conversation.ts. CAD asistan paneli src/app/design/CadAyaPanel.tsx. Yerel durum ve geçmiş src/lib/aya-local-state.ts; bilgi defteri src/lib/aya-knowledge.ts.

electron/aya/assistant.cjs ve conversation.cjs eski deterministik bilgi/iş akışı katmanı. qa-catalog.cjs ve catalog altındaki dosyalarda 252 konuda 1008 Türkçe kayıt var. core.cjs uygulama dokümanlarını ve açıkça etkinleştirilen kişisel notları modele hazırlıyor.

electron/aya-local.cjs yerel sohbet köprüsü. electron/aya/managed-runtime.cjs llama.cpp sürecini, model kurulumunu, GGUF içe aktarımını, token bütçesini ve akışlı yanıtı yönetiyor. Mevcut sabit varsayılan llama.cpp b9380 ve Qwen3 1.7B Q8_0. Alternatif uyumlu GGUF eklenebiliyor. Motor/model kaynakları ve lisansları electron/aya/licenses altında; ağırlıklar kaynak ZIP'inde yok, ilk kurulumda indiriliyor.

Asıl hedef bağımsız ve yerel çalışma. API anahtarı veya DentAYA hesabı yerel sohbetin ön koşulu olmasın. Buluta otomatik geçiş ekleme. Managed model çağrıları yalnız loopback üzerinden süreç anahtarıyla yapılmalı; mevcut Ollama yolu da yerel model koşulunu korumalı. İndirmelerde sabit sürüm, SHA-256 doğrulaması, iptal ve yeniden devam etme özelliklerini bozma.

Çalışma belleğinde hedef, kullanıcıyla alınmış kararlar, eksik bilgiler ve son araç sonuçları olsun. Proje/ünite değişince bağlam karışmasın. Geçmiş saklama tercihini koru; belleği kalıcı model eğitimi gibi sunma. Uzun konuşmalarda ilk hedef ve son ilgili adımlar token bütçesi içinde taşınsın. Kişisel notlar ve dosya içeriği sistem talimatı kabul edilmesin.

Model donduğunda, hata verdiğinde, iptal edildiğinde veya geçersiz yapılandırılmış yanıt ürettiğinde kullanıcının sorusu kaybolmasın. Gerçek yanıt motoru ve hata durumu dürüstçe gösterilsin.

6. CAD içinde AYA nasıl etkin olmalı?

CAD çekirdeği deterministik kalmalı. Kullanıcı “AI based olmasın” derken manuel CAD'in model yanıtına bağımlı olmamasını istiyordu; şimdi AYA'nın bu araçlarda yardımcı olmasını istiyor. İkisini birlikte sağla: model kapalıyken CAD çalışsın, model varken asistan iş akışına katılsın.

AYA'nın bağlamına aktif FDI/ünite, restorasyon türü, görev, seçili araç/görünüm, tarama ve antagonist yüklenme durumu, kole, yerleşim, görünürlük, ilgili ayarlar, geri alma durumu, kayıt durumu ve gerçekten hesaplanan kontrol özetleri girsin.

Öneri alanları: kole sonrası yerleştirme, kaynak ve restorasyon görünürlüğü, kayıtlı kapanış, antagonist temas kontrolü, giriş yönü/undercut, mesafe ve kesit haritaları, mevcut iç yüzey işlemleri, ölçüm/fırça seçimi, teknisyen form kütüphanesi, mesh kontrolü, geri alma, sıradaki görev ve kaydetme/çıkış.

Ölçüm uydurma. Kaynak yüzeyine mesafe haritasını gerçek duvar kalınlığı diye sunma. Kabuk offset hesabından çıkan duvar değerini tahmin olarak adlandır. Antagonist yoksa kapanış analizi varmış gibi konuşma. Kayıtlı kapanışı göstermek yeni bir çene hizalaması veya otomatik oklüzyon çözümü değildir.

Araçları tipli bir izin listesiyle bağla. Modelin ürettiği JavaScript, shell, SQL veya rastgele geometri parametrelerini çalıştırma. Kullanıcı uygulanabilir öneriyi görüp mevcut panelde Uygula düğmesine bassın. Tıklamada proje, kaynak, ünite, geometri/ayar durumu ve aşama kapıları yeniden doğrulansın. Eski öneri yeni dişe veya değişmiş geometriye uygulanamasın.

İşlem başarı/başarısızlığı gerçek callback sonucundan gelsin. Geometri kontrolü sonrası AYA gerçek yeni raporu yorumlayabilsin. Öneri listesini kendiliğinden çalıştıran sınırsız bir ajan döngüsü kurma. Geri alınabilir mesh işlemlerini mevcut undo altyapısına bağla. Kaydetme başarılı olmadan kaydedildi/çıkıldı deme.

7. Korunacak ürün kararları

- CAD'de İş Tanımı / Restorasyon Setup ön adımı var; config design_projects.settings.job_setup içinde, ünite bazında saklanıyor. Restorasyon, FDI, materyal, attachment ve geçicilik seçimlerini bozma.
- Kılavuzlu görevler: files → margin → fit → anatomy → freeform → contacts → inspect → review. Araçlar aşamaya göre açılıyor. Uzman modu var. Her aracı bir anda ekrana yığma.
- Kullanıcı RC38'de eklenen 24 morfoloji ailesini beğenmedi ve iptal etti. Özgün RC37 form sistemi ve teknisyenlerin STL/OBJ eklediği form kütüphanesi korunsun. İptal edilen aileleri geri getirme.
- İmplant/dayanaklı işte kole çizildikten sonra üstüne diş gelmeme sorunu kritik. Mevcut placeOnMargin ve üniteye ait marjin/yerleşim akışını koru, gerçek sahnede tekrar kontrol et.
- Kaydet ve çık, kayıt hatasında ekranda kalma, yerel kurtarma, yeniden açınca mesh'in korunması ve ünite bazında kayıt kritik. Yeni AYA komutları bu güvenilir akışları kullansın.
- Ekle/çıkar/şekillendirme sonrası topoloji bozulmaması, kapalı tek gövde kontrolü ve mevcut geometri testleri korunsun. Desteklenmeyen boolean veya üretim özelliğini varmış gibi gösterme.
- Çene görünürlük yüzdesi, tamamen gizle/göster, izolasyon, üst/alt çene, restorasyon, kole ve renk grupları korunmalı. Exocad/3Shape günlük kullanım ergonomisi referans; tescilli kod veya varlık kopyalama.
- Üstten erişilen mevcut AYA panelini geliştir; alt tarafa veya her ekrana tekrar eden yeni asistan panelleri ekleme. Aynı işi yapan düğmeleri çoğaltma.
- Premium DENTAYA yazı işareti, tema/renk tercihleri ve masaüstü marka ayarları korunsun.
- Yükleme deneyimindeki 200 diş bilgisi, en fazla 10 saniyelik okuma düzeni, Kusp Kilidi, İkiz İzler ve Oluk Rotası korunmalı. Bu görevde bunları yeniden tasarlamaya öncelik verme.

8. Windows paketleme ve web ayrımı

Geçmişte OneDrive içindeki .next dosyalarında EBUSY, Electron DLL çıkarırken EPERM ve node_modules/electron/dist/version eksikliği yaşandı. RC45 Onarım 2 bu akışa önlemler ekledi: kullanıcının LOCALAPPDATA/DentAYA/Builds altında ayrı çalışma klasörü, eksik Electron dağıtımını kendi kurucusuyla tamamlama, geçici paketleme dizinleri, tanılama ve sınırlı kilit tekrarları.

scripts/package-windows.mjs, scripts/after-pack.cjs ve electron-builder.yml dosyalarını incele. Standalone Next sunucusu ve node_modules paket içine gerçekten kopyalanmalı. Ana klasörde tek giriş DENTAYA_GUNCELLE_DERLE.cmd. Bu düzeltmeleri kaybetme; npm audit fix --force ile rastgele kırıcı sürüm geçişi yapma. Kaynak ZIP ile üretilmiş Windows Setup EXE aynı teslimat değildir.

dentaya.com.tr için Vercel'deki dentaya ve özel GitHub deposu hzsams/dentaya-website ayrı web sitesi bağlamıdır. Desktop kaynak deposunun bu repo olduğunu varsayma. Bu görev masaüstü uygulaması ve AYA/CAD üzerinedir; siteye kendiliğinden deploy yapma.

9. Devraldığın çalışma hakkında dürüst durum

Yeni agent.cjs sözleşmesi, model öncelikli yönlendirme, oturum belleği, CAD araç önerileri ve durum tokenları üzerinde başlanmış değişiklikler var. Detay ve dosya listesi CODEX_DEVIR_NOTLARI.md içinde.

Son tip kontrolü geçti. Ancak CadAyaPanel.tsx içinde render sırasında contextRef.current ataması için react-hooks/refs lint hatası var. Eski verify-local-aya.cjs testi önceki 8 mesajlık geçmiş sınırını beklediği için yeni davranışta başarısız oldu. verify-aya-conversation.ts ve bazı tarayıcı testleri “Dentin nedir” sorusunun modeli çağırmamasını bekliyor; yeni hedefin tersi. Bu testleri davranışa uygun ve anlamlı şekilde güncelle. Hataları saklama veya testleri atlayarak yeşile boyama.

Yeni yapılandırılmış model yanıtı ve CAD öneri akışı henüz gerçek yerel modelle, tam tarayıcı akışıyla ve Windows paketlemesiyle doğrulanmadı. Yeni değişiklikler için tamamlanmış derleme, native çıkarım veya klinik/üretim doğrulaması iddia edilmesin.

10. Uygulama ve kabul koşulları

Önce mimariyi ve WIP değişikliklerini incele, kısa bir uygulama planı çıkar ve kodlamaya devam et. Devirdeki yaklaşımı eleştirel değerlendir; hatalı veya gereksiz kısmını düzelt. Sadece bu promptta yazıyor diye bozuk tasarımı sürdürme.

İlk iş: lint hatasını, model/bellek/CAD sözleşmesini ve eski test beklentilerini düzelt. Sonra şu kabul koşullarını doğrula:

- Yerel model hazırken doğal dil, yeni cümleler, tanım soruları ve bağlamlı takipler modele ulaşır.
- AYA hedefi, kararları ve önceki araç sonuçlarını sonraki turda kullanır; kaynak/ünite bağlamı karışmaz.
- CAD önerisi uygun mevcut işlemi gösterir, kullanıcı tıklaması olmadan geometri değişmez.
- Tıklama sonrası gerçek komut çalışır; geçersiz/eski öneri reddedilir; sonuç sonraki değerlendirmeye girer.
- Antagonist veya güncel analiz yoksa eksiklik açıkça belirtilir; ölçüm uydurulmaz.
- İmplant koleye yerleştirme, fırça/undo, ünite geçişi, kayıt hatası, kaydet/çık ve yeniden açılış gerçek sahnede bozulmaz.
- Model eksik, meşgul, iptal, timeout ve bozuk JSON durumlarında CAD ve sohbet kullanılabilir kalır.
- İlgili testler, lint, tip kontrolü ve Next build geçer. Kurulu yerel modelle çıkarım testi yapabiliyorsan yap; mock testini gerçek model testi diye raporlama.

package.json test komutlarını ve mevcut scripts/verify-* dosyalarını incele. Önce değişiklikle ilgili kontrolleri çalıştır, ardından gerekli genel doğrulamayı tamamla. Geçici test sayfalarını, .next, node_modules, kişisel .env, loglardaki sırları ve geçici tarama dosyalarını teslimata koyma.

İş tamamlanınca yeni sürümü RC47 olarak hazırla; package.json, package-lock.json, release.ts, istemci tanımı, CMD ve güncel dokümanlar tutarlı olsun. Doğrulanmamış işi sürüm tamamlandı diye etiketleme. Tamamlanan, eksik kalan ve uzun vadeli işleri açıkça ayır. Tek bir indirilebilir güncelleme paketi, kısa kullanım açıklaması, doğrulama sonucu ve varsa gerçek sınırlamalarla teslim et.

Ben teknik kurulum ayrıntılarında boğulmak istemiyorum. Türkçe, doğrudan ve somut konuş. Rutin dosya düzenlemelerinde tekrar tekrar onay isteme. Hata varsa düzelt; imkânsız veya doğrulanmamış bir iddiayı bana gerçekleşmiş gibi anlatma. Son isteğimi gerçekten çalışan kodla karşılamaya odaklan.

