# DentAYA · Profesyonel Arayüz ve AYA Güncellemesi

23 Eylül 2026. RC20 + mevcut CAD JobSetup yaması temel alınmıştır. Bu paket tam kaynak projedir; yalnız değişen dosyalar değildir. Eski RC belgeleri tarihsel kayıttır; bu güncellemenin kapsamı ve sınırları bu belgededir.

## Değişiklikler

- `/`: bağımsız “Çok yakında hizmetinizde” sayfası, ön kayıt bağlantısı/formu, sağ üstte Yükle ve Pilot giriş.
- `/workspace`: mevcut giriş, kurum oluşturma ve çalışma alanı. Yetkisiz kullanıcı yönlendirmeleri yeni giriş adresine taşındı. E-posta doğrulama dönüşü `/workspace` oldu. Mobil giriş düzeni düzeltildi.
- Ön kayıt: sunucu API’si, alan/izin kontrolü, e-posta tekilleştirme, RLS korumalı tablo. Sunucu veya veritabanı hazır değilse gerçek hata gösterilir; sahte kayıt başarısı verilmez. E-posta gönderimi bu pakette yoktur.
- Yükle: PWA manifesti, 192/512 PNG ikonları, kurulum istemi ve desteklenmeyen tarayıcılar için talimat. Hasta/vaka verileri service worker ile önbelleğe alınmaz. Çevrimdışı CAD veya yerel Windows kurulum dosyası sağlanmaz.
- Ortak tema: daha nötr koyu yüzeyler, daha okunaklı ikincil metinler, klavye odağı, azaltılmış hareket tercihi.
- CAD: grafit/yeşil çalışma alanı, iki satırlı başlık, görünür adım şeridi, geniş model alanı, araç/inceleme sütunları, daha küçük ekran düzeni ve odak modu. CAD ve AYA ekranlarında içeriği örten yüzen genel menüler kaldırıldı. Mevcut iş tanımı, FDI, restorasyon seçimi ve onay kapısı korundu.
- AYA: genel amaçlı sohbet; vaka seçmeden soru sorabilme; son 12 mesajla sınırlı takip bağlamı; yeni sohbet, kopyalama, durdurma, uzun soru desteği, hata halinde taslağı koruma. Genel sohbet yalnız sekme belleğinde tutulur ve vaka bilgilerini otomatik göndermez. Vaka analizi mevcut kayıtlı akışta ayrıca korunur.

## Bulunan ve düzeltilen sorunlar

| Sorun | Düzeltme |
| --- | --- |
| Ham Responses API cevabında yalnız `output_text` okunuyordu | `output` içindeki mesaj/metin ve ret içerikleri ayrıştırılıyor |
| AYA genel soruları vaka şartıyla sınırlıyordu | Ayrı genel sohbet, genel bilgiye uygun sistem talimatı |
| Modelin önceki sorudan haberi yoktu | Sınırlandırılmış kullanıcı/asistan geçmişi; sistem rolü kabul edilmez |
| Yanıt çok kısa kesilebiliyordu | 6.000 çıktı token bütçesi; tamamlanmamış cevaba açık hata |
| İstek uzunluğu yalnız Content-Length üzerinden denetleniyordu | Akış okunurken gerçek bayt sınırı; null/geçersiz JSON kontrolü |
| Sağlayıcı hata metni istemciye açılıyordu | Ham sağlayıcı hatası kaldırıldı |
| İstek sınırlayıcı bellek tablosu sınırsız büyüyebiliyordu | Süresi geçmiş anahtar temizliği ve kapasite sınırı |
| Operations ekranında AyaRobot zorunlu parametreleri eksikti | Derlemeyi bozan parametreler tamamlandı |
| Operasyon sağlığı render sırasında Date.now çağırıyordu | Veri yükleme anı state içinde tutuluyor |
| CAD farklı işaretçi iptali aktif sculpt hareketini kesebilirdi | Aktif pointer kimliği kontrol ediliyor |
| CAD tema rengi kök elementten okunuyordu | CAD kapsayıcısının paleti okunuyor |
| Üst araç çubuğunda yazılar harf harf kırılıyordu | İki satırlı alan yerleşimi ve düğmelerin daralmaması |
| CAD kaynak sorgusu hatası “proje yok” gibi ele alınabiliyordu | Yeni proje yaratmadan önce kaynak/sorgu hatası kontrolü |
| Uçtan uca test profili auth trigger ile iki kez oluşuyordu | Test verisi upsert; gerçek trigger korunuyor |
| Eski test yeni durum kapısının doğru ret mesajını tanımıyordu | Ret beklentisi mevcut durum kapısını da kapsıyor |

## Doğrulama

Başarılı: TypeScript ve üretim derlemesi; ESLint sıfır uyarı; güvenlik 21/21; performans 8/8; CAD çekirdek/mesh; CAD etkileşim 36/36; CAD kurtarma/iş akışı 18/18; CAD panel 12/12; 24 migration ve RLS kontrolü; operasyon hesaplamaları; uçtan uca klinik → laboratuvar → CAD → onay → sevkiyat → teslimat senaryosu. Veritabanı testleri yerel PGlite ortamındadır, canlı Supabase üzerinde değildir.

Yeni `scripts/verify-aya-launch.ts`: cevap ayrıştırma, ret cevabı, geçmişte sistem rolü filtresi, gerçek bayt sınırı, kimlik doğrulama, boş/geçersiz/uzun soru, genel cevap, eksik model cevabı ve ön kayıtta sahte başarı olmaması.

Tarayıcı kontrolü: ana sayfa 1440px ve 390px; mobil yatay taşma yok; Yükle yardım paneli; ön kayıtta altyapı yokken dürüst hata; Pilot giriş açılışı. CAD ve AYA, yerel test oturumu ve sentetik vaka ile açıldı; JavaScript sayfa hatası oluşmadı. Ekran görüntüleri `preview/` klasöründedir. Bu görseller canlı kullanıcı verisi veya üretim ortamı kanıtı değildir.

## Canlıya alma

1. Mevcut dağıtımın ve veritabanının yedeğini alın. Kaynak projeyi mevcut Next.js sunucunuza taşıyın; `npm ci` çalıştırın.
2. Mevcut Supabase public URL ve publishable/anon anahtarını koruyun. Yeni `supabase/migrations/20260923000100_pre_registrations.sql` migration'ını uygulayın.
3. Ön kayıt için `SUPABASE_SERVICE_ROLE_KEY` yalnız sunucuda tanımlanmalıdır. Bu anahtara `NEXT_PUBLIC_` öneki eklemeyin.
4. AYA için sunucuda `OPENAI_API_KEY`, `DENTAYA_AI_CLOUD_ENABLED=true` ve hesabınızda erişilebilir `DENTAYA_AI_MODEL` ayarlayın. Varsayılan model `gpt-5.4` olarak düzenlendi. Sunucu model erişimini gerçek bir istekle doğrulayın; bu çalışma sırasında gerçek API anahtarı verilmediği için canlı model cevabı test edilmedi.
5. Supabase Auth izinli dönüş adreslerine `https://dentaya.com.tr/workspace` ekleyin. HTTPS üzerinde PWA kurulumunu hedef cihazlarda deneyin.
6. `npm run verify` ve `node --import tsx scripts/verify-aya-launch.ts` çalıştırın; ortam değişkenleri tanımlandıktan sonra `npm run verify:env` uygulayın.
7. Mevcut hosting dağıtımını yayınlayın. Bu çalışma dentaya.com.tr sunucusunu/DNS'ini değiştirmedi; barındırma hesabına bağlı dağıtım erişimi sağlanmadı.

## Gerçek sınırlar

- Bu güncelleme AYA’yı ChatGPT Pro yapmaz. Genel bilgi cevapları bağlı modelin yeteneklerine bağlıdır; canlı web araması, dosya analizi, ses/görüntü görüşmesi ve modelden doğrudan CAD geometri üretimi eklenmedi.
- Genel sohbet sekme belleğindedir; eski vaka oturumları mevcut veritabanı akışında saklanır. Sohbet geçmişi kırpılır; sınırsız hafıza değildir.
- Ön kayıt formu gerçek kaydı ancak yeni tablo ve sunucu anahtarıyla yapar. Dağıtık üretim ölçeğinde istek sınırı için ortak sayaç/WAF gerekir; mevcut sayaç süreç belleğindedir. Mevcut hukuki metinler ve saklama süresi işletme tarafından tamamlanmalıdır.
- CAD görünümü ve kullanım düzeni geliştirildi. Üretim sınıfı anatomik kron kütüphanesi, tam parametrik attachment/boolean modelleme ve klinik üretim doğrulaması bu güncelleme ile sağlanmış değildir. Gerçek tarama, gerçek kullanıcı yetkileri ve cihaz/GPU testleri canlı pilotta sürdürülmelidir.
- Bütün programın hatasız olduğu veya klinik üretime hazır olduğu iddia edilmez.

Tasarım referansı: https://wiki.exocad.com/wiki/index.php/CAD_Module (adım adım/uzman düzeni). API referansı: https://developers.openai.com/api/docs/guides/text (Responses `output` yapısı). Exocad varlıkları veya kaynak kodu kullanılmadı.
