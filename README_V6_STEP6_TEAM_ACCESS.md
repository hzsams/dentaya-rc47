# DentAYA MVP v6 — Step 6: Ekip & Erişim Yönetimi

Pilotun gerçek multi-user testi için gerekli kullanıcı/rol yönetimi eklendi.

## Yeni route'lar

```text
/team
/invite?token=<secure-token>
```

## Ekip Yönetimi

Owner / Admin:

- e-posta ile davet üretir
- kuruma uygun rol seçer
- davet süresini 1–30 gün belirler
- güvenli davet bağlantısını kopyalar
- bekleyen daveti iptal eder
- yeni token üreterek bağlantıyı yeniler
- ekip üyesini aktif / pasif yapar

Owner ayrıca ekip üyesinin rolünü değiştirebilir.

## Roller

### Klinik

```text
Admin
Dentist
Assistant
Viewer
```

### Laboratuvar

```text
Admin
Technician
Viewer
```

### Kurye

```text
Admin
Courier
Viewer
```

Owner davetle verilemez.

## Güvenli davet

Davet URL'si:

```text
/invite?token=<random-token>
```

Raw token DB'de tutulmaz.

Veritabanında:

```text
SHA-256(token)
```

saklanır.

Kabul sırasında server kontrol eder:

1. kullanıcı login olmalı
2. Auth e-postası davet e-postasıyla aynı olmalı
3. davet revoked olmamalı
4. davet expired olmamalı
5. token daha önce başka hesap tarafından kullanılmamış olmalı
6. kullanıcı başka bir active organization'a bağlı olmamalı

## Tek aktif kurum

Mevcut MVP bütün ekranlarda tek aktif membership kullanıyor.

Bu nedenle DB artık da şu kuralı garanti ediyor:

```text
1 user → 1 active organization
```

İleride multi-clinic veya multi-lab switcher yapılırsa bu constraint yeniden tasarlanabilir.

## Giriş yapan davetli

Davet linkini açan kullanıcı login değilse token:

```text
dentaya_pending_invite
```

anahtarıyla localStorage'da geçici olarak tutulur.

Kullanıcı giriş yaptıktan sonra henüz kurumu yoksa ana sayfada:

```text
Bekleyen Ekip Daveti
[Daveti Aç]
```

kartı görünür.

Bu, davetli kullanıcının yanlışlıkla yeni bir kurum oluşturmasını azaltır.

## Ayarlar

```text
Ayarlar
→ Kurum
→ Ekip Yönetimi
```

linki eklendi.

## Canlı Supabase

Uygulanan migration:

```text
dentaya_mvp_v6_step6_team_access
```

## Pilot hesap önerisi

Klinik:

```text
Owner
Dentist
Assistant (opsiyonel)
```

Laboratuvar:

```text
Owner
Technician
```

Kurye:

```text
Owner/Admin
Courier
```

Bu rollerle `/pilot-flow` artık gerçek farklı kullanıcı hesaplarıyla test edilebilir.

## Kurulum

ZIP içindeki:

```text
DentAYA_MVP_v6_Step6_TeamAccess
```

içeriğini:

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

## İlk test

```text
/settings
→ Ekip Yönetimi
→ Dentist/Technician e-postası
→ Davet Bağlantısı Oluştur
```

Bağlantıyı farklı browser/incognito profilinde aç:

```text
/invite
→ Giriş / Hesap Oluştur
→ Daveti Kabul Et
```

Sonra role uygun ekranları kontrol et.
