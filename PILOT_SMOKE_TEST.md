# DentAYA Pilot Smoke Test

## 1. Build
- [ ] `npm.cmd run build`
- [ ] TypeScript temiz
- [ ] `/design` prerender temiz
- [ ] `/scan-studio` prerender temiz

## 2. Klinik hesabı
- [ ] Hasta oluştur
- [ ] STL/PLY yükle
- [ ] Vaka oluştur
- [ ] Lab seç
- [ ] Mesaj gönder
- [ ] Tasarım onay/revizyon
- [ ] Lab maliyetini gör
- [ ] Hasta fiyatını kaydet
- [ ] Kurye durumunu gör

## 3. Laboratuvar hesabı
- [ ] Yeni vaka bildirimi
- [ ] Vakayı kabul et
- [ ] Lab scan bağla
- [ ] DentAYA Design aç
- [ ] CAD versiyonu gönder
- [ ] Revizyon/onay bildirimi
- [ ] Lab fiyatı gönder
- [ ] QC → Hazır

## 4. Kurye hesabı
- [ ] Sadece shipment verisi görünür
- [ ] Pickup
- [ ] Picked Up
- [ ] In Transit
- [ ] Delivered
- [ ] Klinik/CAD/finance verisi görünmez

## 5. Responsive
- [ ] 1366×768 laptop
- [ ] 1024px tablet
- [ ] 768px tablet/dar ekran
- [ ] 390px telefon
- [ ] Yazılar üst üste binmiyor
- [ ] Modal ekran dışına taşmıyor
- [ ] Mesaj composer telefonda kullanılabilir
- [ ] Scan Studio ekranı aşağı zıplamıyor

## 6. 3D
- [ ] Scan Studio preview
- [ ] Scan viewer
- [ ] Longitudinal compare
- [ ] CAD viewport
- [ ] Sekmeyi arka plana al / geri dön
- [ ] Viewer tekrar çalışıyor

## 7. Network
- [ ] İnterneti kapat
- [ ] Uyarı gör
- [ ] Kaydetme engelleniyor
- [ ] İnterneti aç
- [ ] Veri tekrar yükleniyor

## 8. Yanlış URL / hata
- [ ] `/olmayan-sayfa` → DentAYA 404
- [ ] Yetkisiz vaka UUID → vaka bulunamadı/yetki mesajı
- [ ] `/pilot-check` bütün kritik kontrolleri gösteriyor

## Pilot çıkış kriteri

Pilot kullanıcıya geçmeden önce:

- Build yeşil
- 4A güvenlik smoke test yeşil
- 4B validation/reconnect yeşil
- Bu 4C checklist kritik maddeleri yeşil
