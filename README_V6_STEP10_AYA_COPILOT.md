# DentAYA MVP v6 — Step 10: AYA Copilot

DentAYA'nın eski basit AI ekranı kapsamlı bir vaka copilot'una dönüştürüldü.

## AYA

Yeni asistan kimliği:

```text
AYA
DentAYA Dental Copilot
```

Arayüzde animasyonlu robot benzeri bir asistan bulunur.

Durumları:

```text
idle
thinking
ready
alert
```

Robotun göğüs çekirdeği vaka operasyon risk skorunu gösterir.

## AYA Core — her zaman çalışır

API anahtarı olmadan çalışan yerel karar destek motoru:

```text
src/lib/aya-intelligence.ts
```

Tek vaka için birlikte okuduğu sinyaller:

```text
cases
scan_sessions
design_projects
case_design_reviews
lab_case_quotes
clinic_case_finance   # yalnız clinic
shipments
case_messages
case_events
```

### Risk motoru

Risk skoru 0–100:

- termin gecikmesi
- acil/yüksek öncelik
- eksik FDI/material/shade/due date/not
- tarama yokluğu / düşük completeness / reject mesh intake
- production sonrası approved review olmaması
- approval status ile pending review uyuşmazlığı
- shipment delivered / case delivered uyuşmazlığı
- geçersiz sent lab quote
- finans tutarsızlığı
- iletişim sinyali

birlikte değerlendirilir.

Bu skor operasyonel öncelik skorudur; klinik risk skoru değildir.

## Next Best Action

AYA artık yalnız özet üretmez.

Role ve workflow'a göre:

```text
Vakayı kabul et
Tarama ekle
CAD başlat
Revizyonu işle
CAD kararını ver
Üretime geçir
QC'ye geçir
Teslimata hazırla
Lab fiyatı oluştur
Hasta fiyatı oluştur
Teslimatı takip et
```

gibi tek bir "Sıradaki En Doğru Adım" çıkarır ve doğrudan ilgili route'a gider.

## AYA komutları

```text
Şimdi Ne Yapmalıyım?
Risk Radarı
Eksik Bilgi
Tarama Kontrolü
CAD & Onay
Fiyat / Ödeme
Teslimat
Vaka Brifi / Derin AYA Analizi
```

Serbest soru da sorulabilir.

Yerel AYA Core serbest soruda intent algılar:

```text
risk
termin
eksik
CAD
scan
fiyat
kurye
devir
```

kelimelerine göre uygun yapılandırılmış analizi verir.

## Bugünkü Radar

AYA tek vaka dışında kullanıcının aktif vakalarını da tarar.

Termin + priority + workflow stage üzerinden en dikkat isteyen ilk 5 vakayı gösterir.

Bir radar kartına tıklayınca AYA o vakaya geçer ve tam context'i yeniden okur.

## AYA konuşma özellikleri

- cevap kopyalama
- browser Speech Synthesis ile "AYA Okusun"
- geçmiş AYA kayıtları
- case deep-link
- Ctrl/Cmd+Enter ile hızlı gönderim
- örnek soru chip'leri

## Vaka Komuta Merkezi entegrasyonu

Her klinik/lab vaka ekranına:

```text
◇ AYA Analiz
```

eklendi.

Link:

```text
/ai?case=<case-id>
```

AYA doğrudan ilgili vaka context'iyle açılır.

## Opsiyonel gerçek model modu

Yerel motor varsayılan ve her zaman çalışır.

İstenirse server-side model katmanı açılabilir:

```text
src/app/api/ai-assistant/route.ts
```

Varsayılan model:

```text
gpt-5.6-terra
```

OpenAI Responses API üzerinden server tarafında çağrılır.

### Env

```env
DENTAYA_AI_CLOUD_ENABLED=true
OPENAI_API_KEY=...
DENTAYA_AI_MODEL=gpt-5.6-terra
```

`OPENAI_API_KEY` kesinlikle `NEXT_PUBLIC_` olmamalıdır.

## Model güvenliği

API route:

1. Supabase access token ister.
2. `/auth/v1/user` ile session doğrular.
3. prompt uzunluğunu sınırlar.
4. server secret kullanır.
5. `store:false` gönderir.
6. timeout uygular.
7. model çalışmazsa UI AYA Core'a fallback yapar.

## Veri minimizasyonu

Cloud modele gönderilen yapılandırılmış context:

- patient name içermez
- `patient_reference` içermez
- clinical_notes göndermez
- lab_notes göndermez
- case message body göndermez
- case event text göndermez

Gönderilenler workflow için gereken yapılandırılmış sinyallerdir:

```text
case status / priority / due date
FDI
material / shade
scan quality metadata
CAD stage
review status
quote status
clinic finance (yalnız clinic)
shipment status
message/event counts
derived risk + missing + next action
```

Kullanıcı serbest prompt'a kimlik verisi yazmamalıdır.

Gerçek hasta verisiyle cloud model açılmadan önce kurumun veri koruma, sözleşme, mevzuat ve gerekli sağlık verisi işleme kontrolleri ayrıca doğrulanmalıdır.

## AI Session audit

`ai_sessions` genişletildi:

```text
assistant_mode
model_name
action_key
context_summary
```

`context_summary` serbest klinik metinleri değil, audit için operasyonel sayaç/statü özetini tutar.

## Klinik güvenlik sınırı

AYA:

- tanı koymaz
- tedavi planını hekim yerine seçmez
- restorasyonun klinik uygunluğunu onaylamaz
- manufacturing certification üretmez
- olmayan veriyi uydurmaz

Ürün dili:

```text
operasyonel karar desteği
```

olarak korunur.

## Kurulum

ZIP içindeki:

```text
DentAYA_MVP_v6_Step10_AYA_Copilot
```

içeriğini:

```text
C:\Users\ahmet\dentaya
```

ile birleştir.

Canlı Supabase migrationı zaten uygulanmıştır.

Sonra:

```powershell
cd C:\Users\ahmet\dentaya
npm.cmd run build
```

Build yeşilse:

```powershell
npm.cmd run dev
```

Test:

```text
/ai
/cases/<id> → AYA Analiz
```

Cloud model kullanmayacaksan hiçbir API key gerekmez.

## Sonraki teknik AI fazı

AYA'nın daha ileri sürümünde:

- longitudinal scan değişim özeti
- CAD geometry QC feature extraction
- per-case event timeline reasoning
- organization workload forecast
- SLA / delivery prediction (gerçek pilot verisi toplandıktan sonra)
- structured tool calling ile uygulama içi aksiyon hazırlama
- human-confirmed actions
- multimodal scan/screenshot interpretation

eklenebilir.

Tahmin modelleri gerçek pilot veri seti oluşmadan "AI tahmini" adıyla sunulmamalıdır.
