# DentAYA MVP UX QA Checklist

## Genel
- [ ] Ana sayfada yalnızca 4 temel işlem kartı görünüyor.
- [ ] 12px altı sabit UI fontu kalmamış.
- [ ] Uzun başlıklar kartların üstüne binmiyor.
- [ ] Uzun açıklamalar satır kırıyor.
- [ ] Light temalarda metin okunuyor.
- [ ] Özel vurgu renginde buton metni kontrastlı.

## Klinik
- [ ] Yeni hasta kaydı 1 dakikanın altında yapılabiliyor.
- [ ] Hasta → Tarama → Vaka akışı anlaşılır.
- [ ] Vaka listesinde hasta fiyatı ve lab maliyeti ayrı.
- [ ] Laboratuvar klinik hasta fiyatını göremiyor.

## Laboratuvar
- [ ] Gelen vaka anlaşılır.
- [ ] Lab Tarama Stüdyosu vakaya bağlı.
- [ ] CAD'e geçiş tek tık.
- [ ] Lab fiyatlandırması yalnız kliniğe verilen fiyatı gösteriyor.

## Tarama
- [ ] `/scan-studio` açıldığında layout zıplamıyor.
- [ ] Dosya seçildiğinde viewer yüksekliği sabit.
- [ ] Mobilde viewer + form tek kolona geçiyor.
- [ ] Klinik/lab tarama amaçları doğru.
- [ ] Türkçe label'lar okunabilir.

## CAD
- [ ] Adım Adım mod: tarama → marjin → anatomi → temas → kalınlık → gönder.
- [ ] Uzman mod serbest geçiş sağlar.
- [ ] `add/reduce` tool tipleri korunur.
- [ ] `sculptAdd/sculptRemove` yok.
- [ ] Thickness/contact görünümleri prototip önizleme olarak etiketlenir.

## Mesajlar
- [ ] Hekim / teknisyen rolü görünür.
- [ ] Uzun mesaj taşmıyor.
- [ ] Vaka seçilerek mesaj gönderilebiliyor.
- [ ] Genel kurum mesajı vaka seçmeden gönderilebiliyor.

## Kurye
- [ ] Alım / teslim noktaları çakışmıyor.
- [ ] Canlı koordinat satırı taşmıyor.
- [ ] Mobilde aksiyonlar alt alta geçiyor.
- [ ] Durum akışı: Oluşturuldu → Alım Talebi → Teslim Alındı → Yolda → Teslim.

## Build
- [ ] `npm.cmd run build`
- [ ] `/design` prerender Suspense hatası yok.
- [ ] `/scan-studio` prerender Suspense hatası yok.
