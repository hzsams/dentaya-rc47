# DentAYA MVP v6 — Step 11: AYA 3D Visual Integration

Bu paket Step 10 AYA Copilot üzerine profesyonel 3D AYA karakterini doğrudan uygulamaya entegre eder.

## Ne değişti?

Eski CSS ile çizilmiş düz robot kaldırıldı.

Yeni AYA görsel sistemi dört ayrı gerçek 3D render state kullanır:

```text
/public/aya/aya-idle.webp
/public/aya/aya-thinking.webp
/public/aya/aya-ready.webp
/public/aya/aya-alert.webp
```

Ayrıca karakter board'u da kaynak asset olarak bulunur:

```text
/public/aya/aya-character-board.webp
```

## Durum geçişleri

AYA mevcut uygulama state'lerine göre otomatik görsel değiştirir:

```text
idle      → sakin bekleme pozu
thinking  → analiz / düşünme pozu
ready     → konuşma / açıklama pozu
alert     → uyarı pozu
```

Bu davranış Step 10'daki mevcut AI state motoruna bağlıdır; ekstra DB migration yoktur.

## 3D hissi

Robot PNG gibi sabit bırakılmadı. UI katmanında:

- pointer parallax / perspective tilt
- derinlik transformu
- state crossfade/enter
- floating motion
- iki ayrı holografik orbit
- risk rengine göre ambient glow
- Thinking state scan beam
- Thinking state activity dots
- Ready state voice waveform
- Alert state pulse
- glass sheen
- canlı model/core indicator
- risk HUD + animated risk bar

uygulanmıştır.

`prefers-reduced-motion` aktifse hareketler kapatılır.

## Risk renkleri

```text
0–21   yeşil
22–44  mavi
45–69  amber
70–100 kırmızı
```

Renk robot çevresindeki holografik halkalara, risk HUD'a ve alert efektlerine yansır.

## Entegrasyon

`src/app/ai/AyaRobot.tsx` tamamen yenilendi.

Step 10 `/ai` ekranı herhangi bir ek değişiklik istemeden yeni AYA'yı kullanır.

## Kurulum

ZIP klasörünün içeriğini:

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

Test için:

```text
/ai
```

Bir vaka seçip sırayla:

```text
idle
→ komut çalıştır / thinking
→ cevap / ready
→ yüksek riskli vaka / alert
```

görsellerini kontrol et.

## Not

Bu sistem gerçek zamanlı skeletal 3D model değildir. Profesyonel 3D render state'leri + CSS/Web UI motion ile oluşturulmuş hafif ve deploy edilebilir bir karakter sistemidir.

Bir sonraki seviye gerçek GLB/Three.js rigged AYA modeli olur; o durumda baş, kol, göz ve hologram hareketleri gerçek 3D mesh üzerinde animasyonlu çalıştırılabilir.
