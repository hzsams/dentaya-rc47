# DentAYA MVP v6 — Adım 4B: Error / Retry + Validation + Realtime Dayanıklılığı

Step 4A güvenlik katmanının üzerine kullanıcı tarafındaki hata dayanıklılığı eklendi.

## 1. Türkçe hata katmanı

Yeni yardımcı:

```text
src/lib/dentaya-errors.ts
```

Supabase / PostgreSQL teknik hatalarını kullanıcıya daha anlaşılır biçimde çevirir.

Örnek:

```text
INVALID_CASE_STATUS_TRANSITION
```

yerine:

```text
Bu vaka mevcut durumdan seçilen aşamaya geçirilemez.
```

RLS / permission hataları:

```text
Bu işlem için yetkin yok.
```

Network:

```text
Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.
```

## 2. Bağlantı durumu

Yeni:

```text
src/app/ConnectionStatus.tsx
```

İnternet kesildiğinde ekranın altında uyarı görünür.

Bağlantı geri geldiğinde:
- Supabase Realtime yeniden bağlanmaya zorlanır.
- `dentaya-network-restored` olayı yayınlanır.
- kritik modüller veriyi tekrar çeker.

Recovery eklenen ana alanlar:
- Hastalar
- Randevular
- Vakalar
- Vaka Komuta Merkezi
- Mesajlar
- Bildirimler
- Kurye / Canlı Takip

## 3. Form validation

### Hasta
- geçerli e-posta
- makul telefon uzunluğu
- gelecek doğum tarihi engeli
- ad/soyad karakter sınırı

### Vaka
- FDI doğrulama
- geçmiş termin engeli
- klinik not 4000 karakter sınırı

### Randevu
- hasta zorunlu
- tarih/saat zorunlu
- geçmiş saate yeni randevu engeli
- süre 5–480 dk
- not uzunluğu kontrolü

### Mesaj
- 1–4000 karakter
- offline gönderim engeli

### Scan Studio
- STL/PLY
- boş dosya engeli
- 50 MB maksimum
- completeness 0–100
- teknik not 4000 karakter
- offline upload engeli

### Fiyat
- gönderilen lab fiyatı > 0
- indirim <= hasta fiyatı
- tahsilat <= net fiyat
- genel gider 0–500
- hedef marj < 100
- not uzunluğu

### CAD
- offline submit engeli
- upload/version/review hataları Türkçe kullanıcı mesajına çevrilir

## 4. DB validation

Canlı Supabase migrationı:

```text
dentaya_mvp_v6_step4b_validation
```

DB seviyesinde:
- organization_messages 1–4000 karakter
- discount <= patient_price
- paid <= net patient price
- sent lab quote > 0

UI doğrulaması atlatılsa bile veritabanı geçersiz veriyi kabul etmez.

## 5. Realtime recovery

Supabase kendi reconnect mekanizmasına ek olarak bağlantı geri geldiğinde kritik listeler tekrar fetch edilir.

Amaç:
```text
internet kesildi → ekran sessizce eski veride kalmasın
```

## Kurulum

ZIP içindeki:

```text
DentAYA_MVP_v6_Step4B_Reliability
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

## Kontrol

Paket içerisindeki 31 TS/TSX dosyası TypeScript parser ile tarandı:

```text
FILES=31
SYNTAX_ERRORS=0
```

Tam Next.js build kullanıcı projesinin gerçek dependency ve tsconfig yapısında `npm.cmd run build` ile doğrulanmalıdır.

## Bundan sonra

MVP hardening'in kalan son teknik turu 4C'dir:

```text
Responsive + Performance + Vercel staging / pilot smoke test
```

Ancak bu paketle birlikte güvenlik, duplicate, hata mesajları, form validation ve reconnect ana katmanları tamamlanmıştır.
