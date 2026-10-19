# DentAYA MVP v6 – Step 12 Lobby / AI Focus

Bu paket aşağıdaki UX düzenlemelerini içerir:

## 1) Ana Lobi sadeleştirildi
- Vaka listeleri lobi ekranından kaldırıldı.
- Modül odaklı giriş kartları öne alındı.
- AYA Copilot lobiye görünür ve erişilebilir şekilde eklendi.
- Operasyon özeti kartları liste yerine özet mantığında sunuldu.

## 2) Klinik Merkezi yeniden düzenlendi
- Hasta, Tarama, Vaka, Laboratuvar, Mesajlar ve Muhasebe modülleri net kartlar halinde sunuldu.
- Son vaka listesi yerine özet kartlar kullanıldı.
- AYA klinik paneli hero alana entegre edildi.

## 3) Laboratuvar Merkezi yeniden düzenlendi
- CAD, Lab Tarama, Vakalar, Fiyatlandırma, Mesajlar ve Canlı Takip modülleri öne çıkarıldı.
- İş kuyruğu liste yoğunluğu kaldırıldı, yerine operasyon özeti kartları getirildi.
- AYA laboratuvar paneli hero alana entegre edildi.

## 4) AYA görseli güçlendirildi
- Halo, glow, sheen sweep ve daha görünür animasyonlar eklendi.
- Daha canlı idle / ready hissi verildi.

## Düzenlenen dosyalar
- `src/app/page.tsx`
- `src/app/clinic/page.tsx`
- `src/app/lab/page.tsx`
- `src/app/ai/AyaRobot.tsx`
