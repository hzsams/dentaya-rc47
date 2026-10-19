# DentAYA MVP v6 — Step 8: Final MVP Shell

Bu paket Step 7 Settings Control Center üzerine son genel navigasyon ve ana dashboard cilasını ekler.

## 1. Global Hızlı Git

Yeni ortak bileşen:

```text
src/app/WorkspaceLauncher.tsx
```

Kısayol:

```text
Ctrl + K
Cmd + K
```

Sağ alttaki:

```text
Hızlı Git · ⌘K
```

butonuyla da açılabilir.

## Rol bazlı navigasyon

### Klinik

```text
Ana Sayfa
Klinik Merkezi
Hastalar
Randevular
Vakalar
Tarama Stüdyosu
3D Taramalar
Laboratuvarlar
Mesajlar
Fiyat & Tahsilat
DentAYA AI
Bildirimler
Ayarlar
Ekip Yönetimi (Owner/Admin)
```

### Laboratuvar

```text
Ana Sayfa
Laboratuvar Merkezi
Vakalar
Lab Tarama
DentAYA Design
Klinik Mesajları
Lab Fiyatlandırma
Teslimat
DentAYA AI
Bildirimler
Ayarlar
Ekip Yönetimi (Owner/Admin)
```

### Kurye

```text
Ana Sayfa
Canlı Takip
Bildirimler
Ayarlar
Ekip Yönetimi (Owner/Admin)
```

Pilot araçları da launcher içinde bulunur:

```text
Sistem Kontrolü
Pilot Akışı
```

## Son kayıtlar

Launcher yalnız modül listesi değildir.

Klinik / Lab:
```text
Son 5 vaka
```

Kurye:
```text
Son 5 teslimat
```

arama sonuçlarına eklenir.

Örnek:

```text
Ctrl+K
→ "DZ-..."
→ ilgili vakayı direkt aç
```

## Singleton davranışı

Bazı sayfalarda birden fazla `ConnectionStatus` / `NotificationCenter` render edilebilir.

Launcher `document.body.dataset.dentayaLauncherOwner` ile tek aktif instance bırakır; ekranda iki Hızlı Git butonu oluşmaz.

## 2. Ana Sayfa — Dikkat İsteyen İşler

Dashboard artık sadece KPI göstermez.

Yeni bölüm:

```text
BUGÜN
Dikkat isteyen işler
```

Klinik tarafında öncelik:

```text
Tasarım onayı
→ Acil vaka
→ Yüksek öncelik
→ Hazır / yoldaki vaka
```

Lab tarafında:

```text
Yeni vaka
→ Acil
→ CAD akışı
→ Üretim / QC
→ Hazır / teslimat
```

Kurye tarafında:

```text
Alım bekliyor
→ Teslim alındı
→ Yolda
→ diğer aktif görev
```

Her kart doğrudan doğru vaka / CAD / teslimat ekranına gider.

Eğer işlem yoksa:

```text
Akış sakin görünüyor.
```

durumu gösterilir.

## 3. Network + Navigation birleşimi

`ConnectionStatus` artık sadece internet kesildiğinde görünmez.

Normal durumda kullanıcıya yalnız global launcher sağlar.

İnternet kesildiğinde mevcut bağlantı uyarısı launcher ile birlikte çalışmaya devam eder.

## 4. Ek ekranlar

Global launcher doğrudan veya `ConnectionStatus` üzerinden şu ana ekranlarda bulunur:

- Ana Sayfa
- Klinik
- Laboratuvar
- Vakalar
- Vaka Komuta Merkezi
- Fiyat
- Kurye
- Ekip
- Ayarlar
- Mesajlar
- Randevular
- Hastalar
- Scan Studio
- DentAYA Design
- Bildirimler
- Pilot Check
- Pilot Flow
- Tarama Merkezi
- Lab Dizini
- DentAYA AI
- Başlangıç

## Supabase

Bu adım yeni migration gerektirmez.

Mevcut rol / RLS sınırları yalnız navigasyon filtrelemesi için okunur.

## Kurulum

ZIP içindeki:

```text
DentAYA_MVP_v6_Step8_FinalMVPShell
```

içeriğini:

```text
C:\Users\ahmet\dentaya
```

ile birleştir.

Ardından:

```powershell
cd C:\Users\ahmet\dentaya
npm.cmd run build
```

Build temizse:

```powershell
npm.cmd run dev
```

## Hızlı test

```text
/
→ Ctrl+K
→ "Vaka"
→ Vakalar
```

```text
Ctrl+K
→ son vaka numarası
→ direkt vaka
```

```text
/settings
→ Ctrl+K
→ Design (Lab hesabı)
```

Klinik hesabında Design modülü launcher listesinde görünmemelidir.

Kurye hesabında hasta / CAD / fiyat modülleri görünmemelidir.
