# CAD / AYA canlı durum devri — 28 Ekim 2026

Çalışma kökü: `/workspace/dentaya-rc47`, dal `professional-workflow`. Bu bölümün tamamlanmış kaynak commit'i: `a8e34b4e3eb5614e7120b03051fb14bd005ae467` — `Show live CAD host facts and retain scoped save failures`. Commit yalnız altı ilgili dosyayı içerir; çalışma ağacı temiz bırakıldı. Parent agent checkpoint'i GitHub'a gönderir.

## Gerçek hata ve düzeltme

Yeni gerçek WebGL CAD testi, sıradan `saveProject`/otomatik kayıt HTTP hatasının AYA bağlamına ulaşmadığını yakaladı. `DesignStudioClient.tsx` içindeki `saveFailed` yalnız **çıkış penceresinin** `exitFailure` durumundan geliyordu. Sunucu kayıt hatası vermesine ve tasarım kirli kalmasına rağmen asistanın canlı bilgisi başarısız kaydı göstermiyordu.

Sıradan kayıt hatası şimdi çıkış penceresinden bağımsız tutulur. Sahiplik, commit edilmiş kullanıcı / kurum / proje / kaynak / ünite anahtarı ve nesil üzerinden izlenir. Yeni kapsama geçiş veya unmount eski sahibi geçersizleştirir; gecikmiş eski sonuç yeni kapsamın hatasını koyamaz veya silemez. Tekrar deneme başlangıcı hatayı silmez; yalnız gerçek başarılı sunucu yanıtı aynı sahibin hatasını temizler. `exitFailure` modal davranışı, yerel kurtarma ve tüm kayıt/çıkış kapıları korunur. Güncel hata AYA bağlamına ve snapshot'a katılır.

## Görünür canlı bilgiler

`CadAyaPanel.tsx` içinde üç küçük, her zaman görünür host bilgisi bulunur: antagonist, güncel geometri kontrolü ve kayıt durumu. Model metni bu bilgileri değiştiremez. Güncel rapor için kaynak ve CAD modeli hazır olmalı, veri token'ı boş olmamalı ve raporun token'ı host token'ıyla eşleşmelidir. Aynı koşul ayrıntılı eski rapor gösterimini de korur. Bu işaretler kapanış/üretim güvenliği veya duvar kalınlığı onayı değildir.

Kayıt önceliği: kaydediliyor → başarısız → kaydedilmemiş değişiklik → açık `unsaved:false` için kaydedildi. Alan eksikse başarı varsayılmaz; TR/EN **kayıt durumu bilinmiyor** gösterilir. Antagonist için de yalnız açık true/false yüklü/eksik sayılır, alan eksikse bilinmiyor gösterilir. Hata satırı mevcut tema tehlike rengiyle görünürdür. Ctrl/Meta+Enter, IME `isComposing` veya `keyCode:229` sırasında taslağı göndermez; normal kısayol çalışır.

## Doğrulananlar

Bu commit için aşağıdakiler geçti:

- Hedefli ESLint, görünür çeviri denetimi (2490 başlık), `node --import tsx scripts/verify-aya-cad-agent.ts`.
- `npm run typecheck` — tam TypeScript kontrolü.
- `scripts/verify-aya-state-browser.mjs`: mevcut sohbet/bellek/çok pencere senaryoları, görünür host bilgileri, yanlış model başarı iddiasına rağmen gerçek hata, rapor token/kaynak/model eskiliği, bilinmeyen alanlar, TR/EN ve her iki IME işareti/modifier testi.
- `node --import tsx scripts/verify-cad-daily-browser.mjs`: gerçek React/Three.js editörü ve WebGL sahnesi. İmplantın koleye yerleşmesi, laptop kompozitörü, gerçek QC, shell/repair/clear, fırça/undo/redo, ünite ve vaka geçişi, tam mesh yeniden açılışı, sıradan kayıt hatası → aynı sahipte başarılı retry, bekleyen kayıt sırasında kapat/aç, otomatik kayıt hatası ve eski QC'nin gizlenmesi, yerel kurtarma, yayınlama ve çakışan navigasyon kapıları geçti.

Tarayıcı komutlarının ortamı:

```bash
DENTAYA_PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright/index.mjs \
DENTAYA_CHROMIUM_PATH=/usr/bin/chromium \
DENTAYA_SCREENSHOT_DIR=/workspace/dentaya-rc62-validation \
node scripts/verify-aya-state-browser.mjs
```

CAD daily için son komut `node --import tsx scripts/verify-cad-daily-browser.mjs` olur. Tarayıcılar, typecheck/build ve diğer Next testleri paylaşılan `.next` nedeniyle sırayla çalıştırılmalıdır. Bu agent'ın başlattığı Next süreçleri kapatıldı; çalışma penceresi serbesttir. Testlerin ürettiği `next-env.d.ts` değişikliği geri alındı.

Kanıtlar `/workspace/dentaya-rc62-validation` altında:

- `cad-live-facts-validation.json`: iki tarayıcı sonucu, log SHA-256'ları, altı kaynak dosyasının hash'i ve commit.
- `state-live-facts-browser.txt`, `cad-live-facts-browser.txt`, `cad-live-facts-typecheck.txt`.
- `RC62_CAD_Host_Save_Failure.png`: gerçek editörde başarısız kayıt / mevcut olmayan QC işaretleri; görsel olarak incelendi.
- `RC62_CAD_Host_Facts_English.png`.
- İlk hatalar silinmedi: `state-live-facts-selector-failure.txt` (testin ham article metni seçicisi), `cad-live-facts-host-failure-discovery.txt` ve `RC62_CAD_Host_Failure_Discovery.png` (gerçek saveFailed hatası).

## Sınırlar ve yeni agent'ın dikkat etmesi gerekenler

Bu tarayıcılarda **sunucu ve model köprüsü sentetiktir**; gerçek geometri/UI çalışır fakat native model çıkarımı veya canlı kurum kabulü değildir. Kaynak değişiklikleri geometri çekirdeğini ya da 27 komutu değiştirmedi.

Önceki Windows ön kontrolü `40673513656`, `61ee56824704c8937fbace10e77947e30d96653a` tanı kaynağını (`4588013` ürün tabanı + Windows taşınabilirlik düzeltmeleri) sınadı. Bu başarılı kurucu/smoke kanıtı **bu yeni CAD commit'ini içermez**. `RC62_KONTROL_RAPORU.md` ve `verification/RC62/installer-preflight/SCOPE.md` farkı açıklar. Nihai RC62 etiketi için son kaynak üzerinde tam verify/üretim derlemesi, manifest ve Windows paketlemesi yeniden gerekir. Daha önceki 146 saniyelik tam verify de bu CAD değişikliğinden öncedir; typecheck ve iki yeni tarayıcı onun yerine tam build sayılmaz.

Bilinen açık CAD davranış hatası kalmadı. Nesil koruması kodda kullanıcı/kurum/proje/kaynak/ünite değişimlerini kapsar. Günlük test gecikmiş başarılı kayıt makbuzunun üniteye dönünce yeniden etiketlenmesini reddeder; **gecikmiş başarısız HTTP yanıtının ayrıl/dön sonrasında düşmesi** için ayrıca özel bir tarayıcı senaryosu koşulmadı. Bu kapsamı doğrulanmış diye genişletmeyin. Model kalitesi ve yeni bellek şeması ayrı native çalışmada sürüyor; bu UI sonucu AYA'nın anlamsal kabulü değildir.
