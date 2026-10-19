# DentAYA Team Pilot Test

## Klinik Owner

1. `/team`
2. Dentist e-postası için davet üret.
3. Assistant e-postası için davet üret.
4. Linkleri ayrı browser profillerinde aç.

Beklenen:
- owner kendisini pasifleştiremez
- owner rolü değiştirilemez
- owner diğer roller üzerinde değişiklik yapabilir

## Dentist

Davet edilen e-posta ile login / register:

Beklenen erişim:
- Hastalar
- Vakalar
- Randevular
- Klinik fiyatı
- CAD onay / revizyon

Beklenmeyen:
- Lab CAD düzenleme
- Lab adına tarama

## Lab Owner

1. `/team`
2. Technician daveti üret.

## Technician

Beklenen:
- atanmış vaka
- lab scan
- DentAYA Design
- lab fiyatı
- vaka mesajı

Beklenmeyen:
- patient tablosu
- clinic_case_finance
- hasta fiyatı
- klinik adına scan

## Courier

Beklenen:
- atanmış shipments
- live location
- izinli shipment state transition

Beklenmeyen:
- patient
- CAD
- klinik fiyatı
- lab fiyatı

## Davet Güvenliği

- Yanlış e-posta hesabı → reddedilmeli
- Revoked token → reddedilmeli
- Expired token → reddedilmeli
- Tokenı ikinci farklı hesap → reddedilmeli
- Başka active org kullanıcısı → reddedilmeli
