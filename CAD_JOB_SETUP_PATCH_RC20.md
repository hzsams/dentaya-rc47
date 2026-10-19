# DentAYA CAD — İş Tanımı / Restorasyon Setup Patch (RC20)

Bu patch, CAD çalışma alanına tasarımdan önce zorunlu bir **İş Tanımı / Restorasyon Setup** katmanı ekler.

## Eklenenler

- Vaka ilk kez CAD'de açıldığında İş Tanımı ekranı otomatik açılır.
- Her FDI diş/ünite ayrı tanımlanır; vaka kaydında olmayan pontic/ek ünite CAD setup içinden eklenip kaldırılabilir.
- Monolitik/anatomik kron, coping/kapşon, cutback/iskelet kron, geçici kron/pontic, anatomik/reduced pontic, primer/sekonder teleskop, veneer, inlay/onlay ve framework seçenekleri eklendi.
- Attachment seçimi: yok, topuz/ball, locator, özel attachment.
- Çok üyeli köprülerde ara ünite varsayılan olarak pontic atanır.
- Her ünite için kron/anatomi formu FDI numarasıyla seçilir.
- Yumuşak / Dengeli / Belirgin morfoloji karakteri ünite bazında tutulur.
- Aktif ünite seçimi CAD inspector'a eklendi.
- Setup tamamlanmadan wizard ilerletme ve review gönderimi engellenir.
- Setup verisi yeni veritabanı kolonu gerektirmeden `design_projects.settings.job_setup` içinde saklanır.
- Tool Suite içine canlı `İş Tanımı / Restorasyon Setup` komutu eklendi.

## Kron formu çekirdeği

Önceki tek `anterior / premolar / molar` prosedürel geometri yerine FDI koduna göre üst/alt ve diş grubuna göre farklı başlangıç profilleri üretildi. Üst ve alt kesiciler, kaninler, premolarlar ve molarlar farklı genişlik/derinlik/yükseklik/cusp karakteriyle başlatılır. 36/46 birinci molar gibi alt birinci molarlarda beş cusp karakteri; üst molarlarda dört cusp karakteri kullanılır.

Bu, **DentAYA'nın kendi prosedürel başlangıç anatomisi**dir. Klinik/üretim seviyesinde lisanslı veya doğrulanmış gerçek anatomik STL/OBJ crown library henüz pakete eklenmiş değildir. Gelecek adımda `anatomy_code` alanı gerçek mesh varlıklarına bağlanabilir.

## Tasarım tipinin geometriye etkisi

- Coping / cutback / reduced pontic / framework: başlangıç anatomisi küçültülmüş/reduced formda üretilir.
- Primer / sekonder teleskop: daha eksenel ve taper kontrollü başlangıç formu üretilir.
- Geçici: daha sade ve hafif genişletilmiş geçici başlangıç formu kullanılır.
- Pontic: basal form davranışı ayrı uygulanır.

## Bilinen sınırlar

- Ball/locator attachment seçimi şu anda iş tanımına kaydedilir; tam parametrik attachment yerleştirme/boolean kernel'i ayrı CAD fazıdır.
- Çok üyeli vakalarda setup diş bazlıdır, ancak mevcut RC20 viewport çekirdeği aynı anda tek aktif tasarım mesh'i düzenler. Aktif ünite geçişi eklendi; ünite başına bağımsız mesh persistence sonraki kernel işidir.
- Gerçek dental crown mesh kütüphanesi bu patch'e dahil değildir; prosedürel FDI başlangıç formları kullanılır.

## Doğrulama

Yeni yardımcı doğrulama komutu:

```bash
npm run verify:cad-setup
```

Bu komut köprü varsayılanları, pontic rolü, geçici kron eşlemesi ve kaydedilmiş setup normalizasyonunu kontrol eder.
