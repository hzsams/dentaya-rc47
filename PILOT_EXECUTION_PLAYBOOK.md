# DentAYA Pilot Execution Playbook

## 1. Klinik hesabı

1. `/pilot-check`
2. Tüm temel kontrolleri doğrula.
3. `/patients` → hasta oluştur.
4. `/scan-studio` → klinik taraması bağla.
5. `/cases` → laboratuvar seç ve vaka oluştur.
6. `/cases/<id>?tab=messages` → teknik mesaj gönder.
7. `/pilot-flow` → ilerlemeyi kontrol et.

## 2. Laboratuvar hesabı

1. `/notifications` → yeni vaka bildirimi.
2. `/cases/<id>` → vakayı kabul et.
3. Gerekliyse `/scan-studio?case=<id>` → lab scan.
4. `/design?case=<id>` → CAD projesi.
5. Tasarımı kliniğe gönder.
6. `/finance` → lab fiyatını gönder.
7. `/pilot-flow` → lab tarafı kontrol.

## 3. Klinik tekrar

1. CAD bildirimini aç.
2. Tasarımı onayla veya revizyon iste.
3. Onay sonrası üretim zincirinin ilerlediğini doğrula.
4. `/finance` → hasta fiyatı / tahsilat.
5. `/pilot-flow` → tutarlılık uyarılarını kontrol et.

## 4. Lab / Kurye

1. Lab: production → QC → ready.
2. Kurye görevi oluştur / ata.
3. Courier: pickup → in transit → delivered.
4. Klinik: teslimatı doğrula.

## 5. Kapanış

`/pilot-flow` üzerinde:

```text
%100
```

hedeflenir.

`Tutarlılık kontrolü` bölümünde:

```text
Tutarsızlık görünmüyor
```

beklenir.

Ardından `Pilot Raporunu Kopyala` kullanılarak test sonucu saklanır.
