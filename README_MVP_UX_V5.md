# DentAYA MVP UX v5

Bu paket, yeşil build alınan MVP RC1 tabanını bozmadan genel arayüz sadeleştirmesi, Türkçeleştirme, Scan Studio kararlılığı, 3D/CAD okunabilirliği, canlı takip düzeni ve rol bazlı fiyatlandırma/muhasebe ekler.

## Ana değişiklikler

### Genel UX
- Küçük yazılar büyütildi.
- Global gövde yazısı normal ölçekte yaklaşık 15.5px.
- Küçük açıklamalar yaklaşık 13.5px.
- `min-width:0`, satır kırma ve taşma korumaları bütün tema runtime'ına eklendi.
- Mobilde form kontrolleri 16px.
- Başlık + kısa açıklama düzeni ana modüllerde standartlaştırıldı.
- Ana sayfa sadeleştirildi: hero + 4 KPI + 4 temel işlem + son vakalar/teslimatlar.
- Gereksiz “dashboard içinde dashboard” görünümü azaltıldı.
- Temel kullanıcı metinleri Türkçeleştirildi.

### Tema sistemi
Toplam 24 hazır tema:
- Midnight
- Ocean
- Emerald
- Violet
- Graphite
- Light
- Cobalt
- Aurora
- Rose
- Amber
- Frost
- Obsidian
- Teal Pro
- Navy
- Sand
- Pearl
- Plum
- Slate
- Mint
- Sky
- Lavender
- Ivory
- Blush
- Sage

Ek olarak özel HEX vurgu rengi desteği devam eder.

Yeni açık temalar:
- Mint
- Sky
- Lavender
- Ivory
- Blush
- Sage

### Tarama Stüdyosu
- Ekranın aşağı kaymasına neden olan esneyen çalışma alanı kaldırıldı.
- 3D önizleme masaüstünde sabit yükseklikte/sticky çalışma alanı kullanır.
- Mobilde tek kolona geçer.
- 3 adımlı sade akış: bağlantı → dosya → kontrol/kaydet.
- Klinik ve laboratuvar seçenekleri ayrıdır.
- Tarama amacı, ark/bölge, yakalama yöntemi, tarayıcı ve teknik not gruplandırıldı.
- Lab taraması vaka olmadan kaydedilmez.
- Tarama sonrası lab → CAD, klinik → tarama geçmişi akışı korunur.
- STL / PLY import tabanlı MVP'dir; doğrudan scanner SDK sürücüsü değildir.

### 3D Tarama Modülleri
- Tarama görüntüleyici ve zaman karşılaştırma modalı responsive hale getirildi.
- İngilizce temel UI etiketleri Türkçeleştirildi.
- Yüzey notları ve karşılaştırma ekranları mobilde alt alta geçer.
- Fark haritası prototip görselleştirmedir; klinik ölçüm/registrasyon değildir.

### DentAYA Design
- Önceki yeşil build veren Wizard CAD v3 korunur.
- Adım adım / Uzman çalışma modu.
- Tarama → marjin → anatomi → temas/oklüzyon → kalınlık → son kontrol.
- Temel CAD kullanıcı metinleri Türkçeleştirildi.
- Küçük CAD yazıları büyütüldü.
- Bu modül üretim iş akışı ve mesh-editing MVP'sidir; Exocad sınıfı endüstriyel geometri kernel'i değildir.

### Klinik
Ana araçlar sadeleştirildi:
- Hastalar
- Tarama Stüdyosu
- Klinik Vakaları
- Laboratuvarlar
- Hekim ↔ Teknisyen
- Muhasebe & Fiyat

### Laboratuvar
Ana araçlar sadeleştirildi:
- DentAYA Design
- Lab Tarama Stüdyosu
- Klinik Mesajları
- Fiyatlandırma
- Canlı Takip
- Laboratuvar Profili

### Hekim ↔ Teknisyen Mesajları
- Mesaj başlığı/rolü ve ilgili vaka bağlamı daha açık.
- Uzun mesajlarda taşma koruması.
- Vaka bazlı teknik konuşma ile genel kurum konuşması ayrımı.
- Backend sender stamping ve case-context doğrulaması önceki migration ile korunur.

### Kurye & Canlı Takip
- “Pickup” gibi temel terimler Türkçeleştirildi.
- Rota kartı ve detay kartları mobil/tablet için responsive.
- Alım ve teslim noktaları alt alta düşebilir.
- Eylem butonları dar ekranda 2 kolon / 1 kolon olur.
- Canlı konum kartı taşmadan sarılır.

## Yeni Fiyatlandırma & Muhasebe Modülü

Route:
```text
/finance
```

### Laboratuvar tarafı
Laboratuvar yalnızca kliniğe vereceği iş fiyatını yönetir:
- vaka bazlı lab fiyatı
- taslak / gönderildi / kabul / reddedildi
- teknik/fiyat notu
- kural tabanlı başlangıç önerisi

MVP önerisi vaka türü, materyal, diş/ünite sayısı ve önceliğe göre hesaplanır. Son fiyatı kullanıcı belirler.

### Klinik tarafı
Klinik:
- laboratuvar maliyetini görür
- hastaya verilen fiyatı ayrı girer
- indirim girer
- tahsilat girer
- ödeme durumu belirler
- genel gider yüzdesi ve hedef marj ile önerilen hasta fiyatı görebilir

Önemli veri sınırı:
**Laboratuvar, kliniğin hastaya verdiği fiyatı göremez.**
Bu ayrım Supabase RLS ile korunur.

Fiyat asistanı bu MVP'de açıklanabilir/kural tabanlıdır. İleride laboratuvar tarifeleri, geçmiş işler ve kurum politikalarıyla daha gelişmiş bir fiyat öneri motoruna dönüştürülebilir.

## Supabase

Aşağıdaki canlı migration zaten uygulanmıştır:
- 24 tema constraint'i
- `lab_case_quotes`
- `clinic_case_finance`
- RLS politikaları

Paket içindeki SQL proje geçmişi içindir.

## Kurulum

ZIP içindeki `DentAYA_MVP_UX_v5` klasörünün içeriğini:

```text
C:\Users\ahmet\dentaya
```

ile birleştir ve aynı isimli dosyaları değiştir.

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

1. `/settings` → Mint / Sky / Lavender gibi açık tema seç.
2. `/` → sade ana paneli kontrol et.
3. `/clinic` → hasta, tarama, vaka, mesaj ve muhasebe linklerini kontrol et.
4. `/scan-studio` → STL/PLY seç; 3D alanın ekranı aşağı itmediğini kontrol et.
5. `/scans` → 3D görüntüleyici ve karşılaştırmayı aç.
6. `/messages` → uzun mesaj + vaka bağlantısı dene.
7. `/finance` → klinikte hasta fiyatı, lab hesabında lab fiyatı gir.
8. `/logistics` → dar ekran ve normal masaüstünde rota kartlarını kontrol et.
9. `/design` → Adım Adım CAD akışını kontrol et.

## Kontrol notu

Paketin 23 TS/TSX dosyası TypeScript parser ile tarandı ve syntax diagnostic 0 bulundu.
Tam proje build'i kullanıcı projesindeki bağımlılıklar ve gerçek tsconfig ile `npm.cmd run build` sonucunda doğrulanmalıdır.
