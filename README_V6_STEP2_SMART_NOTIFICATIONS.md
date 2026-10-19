# DentAYA MVP v6 — Adım 2: Akıllı Bildirim Merkezi

Bu paket Adım 1 Vaka Komuta Merkezi üzerine **aksiyona bağlı bildirim sistemi** ekler.

## Yeni bileşen

```text
src/app/NotificationCenter.tsx
```

Rol panellerinde ve Vaka Komuta Merkezi'nde kullanılabilir.

Bildirim açılır paneli:
- okunmamış sayaç
- son 8 bildirim
- kategori
- önem seviyesi
- zaman
- tek tıkla ilgili iş ekranına geçiş
- tümünü okundu yap

## Yeni sayfa

```text
/notifications
```

Filtreler:
- Tümü
- Okunmamış
- Vaka
- CAD
- Fiyat
- Kurye
- Mesaj
- Sistem

## Bildirimler artık sadece bilgi değil, aksiyondur

Örnek:

```text
Tasarım klinik onayı bekliyor
→ /cases/<id>?tab=cad
```

```text
Tasarım revizyonu istendi
→ /cases/<id>?tab=cad
```

```text
Yeni vaka geldi
→ /cases/<id>
```

```text
Hekim / teknisyen yeni mesaj gönderdi
→ /cases/<id>?tab=messages
```

```text
Laboratuvar fiyatı geldi
→ /cases/<id>?tab=finance
```

```text
Ödeme takibi gerekiyor
→ /cases/<id>?tab=finance
```

```text
Gönderi yolda / teslim edildi
→ /cases/<id>?tab=delivery
```

## Server-side akıllı bildirim üretimi

Supabase canlı projede trigger sistemi kuruldu.

Kaynaklar:

### Cases
- Yeni vaka → laboratuvara
- Lab kabul etti → kliniğe
- Üretim → kliniğe
- QC → kliniğe
- Teslimata hazır → kliniğe
- İptal → laboratuvara

### CAD Review
- Yeni tasarım → kliniğe onay bildirimi
- Onay → laboratuvara
- Revizyon → laboratuvara

### Mesaj
- Vaka mesajı → karşı kuruma
- Genel klinik ↔ lab mesajı → karşı kuruma

### Fiyat
- Lab teklifini gönderdi → kliniğe
- Klinik ödeme bekliyor / kısmi → klinik ödeme takibi

### Kurye
- Alım talebi
- Teslim alındı
- Yolda
- Teslim edildi
- İptal

ilgili organizasyonlara bildirim üretir.

## Dedupe

`notifications.dedupe_key` kullanılır.

Aynı iş olayı tekrar güncellenirse sistem sonsuz bildirim yığını üretmek yerine ilgili bildirimi yeniden okunmamış hâle getirebilir.

## Vaka Komuta Merkezi deep-link

Adım 1 vaka merkezi artık query tab okuyabilir:

```text
/cases/<id>?tab=scans
/cases/<id>?tab=messages
/cases/<id>?tab=cad
/cases/<id>?tab=finance
/cases/<id>?tab=delivery
/cases/<id>?tab=history
```

`useSearchParams()` kullanılmadığı için Next.js 16 Suspense problemi oluşturmaz.

## Bildirim Merkezi erişimi

Bileşen şu temel panellere eklendi:
- Ana Sayfa
- Klinik
- Laboratuvar
- Vakalar
- Vaka Komuta Merkezi
- Kurye
- Fiyatlandırma

## Kurulum

`DentAYA_MVP_v6_Step2_SmartNotifications` klasörünün içeriğini:

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

## Test senaryosu

1. Klinik yeni vaka oluşturur.
2. Lab ekranında Bildirimler → `Yeni vaka geldi`.
3. Bildirime tıkla → doğru vaka açılmalı.
4. Lab kabul eder → klinik bildirim almalı.
5. Lab CAD sürümü gönderir → klinik `Tasarım klinik onayı bekliyor`.
6. Klinik revizyon ister → lab `Tasarım revizyonu istendi`.
7. Lab fiyatı `Gönderildi` yapar → klinik fiyat bildirimi.
8. Kurye yola çıkar → ilgili kurumlarda kurye bildirimi.

## Sonraki adım

Adım 3:
**Onboarding + boş durumlar + ilk kullanım rehberi**

Amaç:
Yeni bir klinik veya laboratuvar kullanıcı DentAYA'yı ilk açtığında ne yapacağını 30 saniye içinde anlayabilsin.
