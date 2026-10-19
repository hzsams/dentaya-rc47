# DentAYA MVP v6 — Step 7: Settings Control Center

Bu turda Ayarlar ekranı gerçek bir hesap/kurum kontrol merkezine dönüştürüldü.

## Ayarlar bölümleri

```text
Hesabım
Görünüm
Çalışma Alanı
Bildirimler
Kurum / Laboratuvar Profili
Sistem
```

## 1. Hesabım

Kullanıcı artık:

```text
Ad soyad
Telefon
E-posta (read-only auth identity)
Aktif kurum
Kurum türü
Rol
```

bilgilerini tek yerde görür.

Ad soyad ve telefon `profiles` tablosuna kaydedilir.

E-posta oturum kimliğinden gelir ve Ayarlar ekranından değiştirilmez.

## 2. Görünüm

Mevcut 24 tema sistemi korunur:

- dark / light temalar
- custom accent
- soft / solid / glass
- motion
- font scale
- compact mode

## 3. Bildirim tercihleri

Yeni tablo:

```text
user_notification_preferences
```

Kategoriler:

```text
Vaka
CAD / Tasarım
Fiyat / Ödeme
Kurye / Teslimat
Mesaj
Sistem
```

Bu tercihler kullanıcı bazlıdır.

`NotificationCenter` ve `/notifications` artık kapatılan kategorileri:

- listede göstermez
- okunmamış badge hesabına katmaz

Not: notification eventleri server tarafında audit/operasyon kaydı olarak üretilmeye devam eder; tercih kullanıcı arayüzünde ne gösterileceğini kontrol eder.

## 4. Kurum

Owner / Admin:

```text
Kurum adı
Dizinde görünürlük
```

ayarlarını değiştirebilir.

Klinik için directory toggle gösterilmez.

Laboratuvar / Kurye için görünürlük ayarı mevcuttur.

Server-side guard:

```text
organization id
slug
org_type
demo_mode
created_at
```

alanlarını immutable tutar.

Demo kurumları Settings ekranında salt okunurdur.

## 5. Laboratuvar profili

Mevcut alanlar korunur:

- açıklama
- şehir / ilçe
- turnaround
- contact email
- website
- specialties
- services
- supported materials
- software stack
- delivery regions
- accepts new cases
- express
- pickup

Ek validation:

```text
turnaround: 1–120 gün
contact email: geçerli e-posta
description: max 2000 karakter
```

## 6. Sistem araçları

Ayarlar → Sistem üzerinden:

```text
Mesajlar
Taramalar
Vakalar
Pilot Sistem Kontrolü
Pilot Akışı
Ekip Yönetimi (Owner/Admin)
```

hızlı erişim verilir.

## 7. Senkronizasyon

`Tümünü Kaydet` artık tek seferde:

```text
user_preferences
profiles
user_notification_preferences
organizations (yetkiliyse)
lab_profiles (lab ise)
```

kayıtlarını senkronize eder.

## Canlı Supabase

Uygulanan migration:

```text
dentaya_mvp_v6_step7_settings_preferences
```

## Kurulum

ZIP içindeki:

```text
DentAYA_MVP_v6_Step7_SettingsControlCenter
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

## Hızlı test

### Hesap

```text
/settings
→ Hesabım
→ Ad soyad / telefon değiştir
→ Tümünü Kaydet
→ refresh
```

değerlerin kalması beklenir.

### Bildirim

```text
/settings
→ Bildirimler
→ Mesajlar kapat
→ Kaydet
→ NotificationCenter
```

Mesaj kategorisinin listeden ve badge hesabından çıkması beklenir.

### Kurum

Owner/Admin:

```text
/settings
→ Kurum
→ Kurum adı değiştir
→ Kaydet
```

Viewer / Dentist / Technician / Courier:
kurum kimliği read-only görünür.

### Lab

```text
turnaround = 0
```

reddedilmeli.

Geçersiz e-posta reddedilmeli.

## Statik kontrol

Kaynak:

```text
FILES=39
SYNTAX_ERRORS=0
```

Tam Next.js type/build doğrulaması kullanıcı projesindeki:

```text
npm.cmd run build
```

ile yapılmalıdır.
