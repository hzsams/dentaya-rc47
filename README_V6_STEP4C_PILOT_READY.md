# DentAYA MVP v6 — Step 4C: Responsive + Performance + Pilot Ready

Bu paket Step 4B Reliability üzerine son MVP cilasını ekler.

## Responsive son tur

Özellikle küçük laptop / tablet / telefon için:

- Klinik KPI kartları telefonda tek kolona düşer.
- Laboratuvar KPI ve aksiyonları telefonda tek kolona düşer.
- Hasta ekranı ve aksiyonları dar ekranda taşmaz.
- Randevu kartları telefonda tek kolona iner.
- Tarama KPI alanları telefonda tek kolona iner.
- AI aksiyonları dar ekranda tek kolona iner.
- Mesaj composer telefonda tek kolondur; Gönder butonu tam genişlik olur.
- Onboarding kartı mobilde alt alta geçer.
- Bağlantı uyarısı telefonda iki satırlı güvenli layout kullanır.
- Global focus-visible, touch ve reduced-motion davranışı iyileştirildi.

## 3D / GPU performansı

DentAYA Design, Scan Studio preview ve 3D tarama görüntüleyicilerinde:

- Device pixel ratio üst sınırı `1.75`.
- Sekme arka plana alındığında render loop durur.
- Sekmeye dönüldüğünde render loop yeniden başlar.
- Mevcut renderer / geometry / material cleanup korunur.

Bu özellikle Retina / yüksek DPI ekranlarda gereksiz GPU yükünü azaltır.

## Sorgu sınırları

Pilot aşamasında kullanıcı ekranlarının farkında olmadan binlerce satırı tek seferde çekmemesi için yüksek trafikli listelere güvenli üst sınırlar eklendi.

Örnek:

- Klinik: son 120 vaka / hasta özeti
- Lab: son 150 aktif iş / CAD proje özeti
- Vakalar: 250
- Hastalar: 300
- Randevular: 600
- Mesajlar: sohbet başına 500
- Tarama geçmişi: hasta başına 500
- Kurye: 250 gönderi

Bunlar pilot sınırlarıdır; daha büyük kullanımda cursor pagination eklenebilir.

## Supabase performans turu

Canlı migration:

```text
dentaya_mvp_v6_step4c_performance_indexes
```

Supabase Performance Advisor sonucuna göre:

- doğrulanmış 3 duplicate index kaldırıldı,
- mevcut MVP'nin sık kullandığı foreign key alanlarına covering index eklendi.

Davranış veya RLS kuralı değiştirilmedi.

## Yeni hata / sistem ekranları

```text
src/app/not-found.tsx
src/app/error.tsx
src/app/loading.tsx
```

Yanlış URL veya beklenmeyen route hatası artık boş/beyaz ekran yerine DentAYA tasarımında açıklayıcı ekran verir.

## Pilot kontrol route'u

```text
/pilot-check
```

Kontrol eder:

- internet bağlantısı
- WebGL / 3D desteği
- Supabase session
- aktif membership
- organization erişimi
- basit RLS / database sorgusu

Ayrıca temel pilot rotalarına hızlı geçiş sağlar.

## Vercel staging

Bu paketin içinde staging checklist vardır. Preview/staging ortamında üretimden ayrı URL ile şu sırada test et:

```text
/pilot-check
/
/patients
/cases
/scan-studio
/design
/messages
/finance
/logistics
/notifications
```

Supabase environment değişkenlerini Vercel Preview ortamında doğrula. Secret değerleri repoya ekleme.

## Kurulum

ZIP içindeki:

```text
DentAYA_MVP_v6_Step4C_PilotReady
```

klasörünün içeriğini:

```text
C:\Users\ahmet\dentaya
```

ile birleştir.

Sonra:

```powershell
cd C:\Users\ahmet\dentaya
npm.cmd run build
```

Build temizse:

```powershell
npm.cmd run dev
```

ve ilk olarak:

```text
http://localhost:3000/pilot-check
```

aç.
