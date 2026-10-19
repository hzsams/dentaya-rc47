# DentAYA MVP RC2 — Final Acceptance

Hedef freeze: **30 Eylül 2026**

## P0 — Freeze'i durduran hatalar

- Build başarısız.
- Login/üyelik akışı çalışmıyor.
- Klinik veya laboratuvar kendi vakalarını okuyamıyor.
- Yetkisiz rol başka kurumun kritik verisini görebiliyor veya değiştirebiliyor.
- Scan dosyası yüklenemiyor/bağlanamıyor.
- CAD projesi açılamıyor veya review gönderilemiyor.
- Klinik review kararı kaydedilemiyor.
- Lab fiyatı / klinik hasta fiyatı veri sınırı bozuluyor.
- Gönderi/teslimat temel akışı ilerlemiyor.

## P1 — Freeze öncesi düzeltilmesi gerekenler

- AYA ana komutları çalışmıyor veya yanlış rol bağlamı gösteriyor.
- Lobi/klinik/lab merkezinde ana modüllere ulaşılamıyor.
- Dar ekranda ana CTA'lar kullanılamıyor.
- Bildirim veya mesaj realtime davranışı temel kullanımda kopuyor.
- Form hataları kullanıcıya anlaşılır dönmüyor.

## P2 — Freeze sonrası yapılabilir

- Kozmetik mikro animasyonlar.
- Yeni tema varyasyonları.
- Ek CAD araçları.
- Gelişmiş scanner SDK entegrasyonu.
- Exocad-class geometry kernel özellikleri.
- Hasta mobil uygulaması / simülasyon fazı.

## Release sırası

1. `npm.cmd run build`
2. `/release-check`
3. `/pilot-check`
4. `/pilot-flow`
5. Clinic Owner smoke
6. Dentist/Assistant smoke
7. Lab Owner/Technician smoke
8. Courier smoke
9. Staging smoke
10. P0/P1 = 0 ise MVP freeze

Otomatik veya UI içindeki “READY” ifadesi tek başına üretim/klinik onayı değildir. Son karar gerçek pilot smoke test sonuçlarına dayanır.

## Step 18 ek kabul kapıları
- AYA cevapları sohbet panelinde okunabilir olmalı.
- Global AYA dock bulunduğu sayfanın yardım bağlamını açmalı.
- Modül simgeleri Lobi, Klinik, Lab ve Hızlı Git'te görünmeli.
- Workspace kişiselleştirmesi canlı uygulanmalı.
- AYA robot state PNG'lerinde baked-in arka plan görünmemeli.
- DentAYA Design tool rail, focus mode ve QC dock çalışmalı.
- CAD mevcut kayıt / review akışını bozmamalı.
