# DentAYA MVP v6 — Step 16: AYA Platform Copilot

Bu adımda AYA sadece vaka yorumlayan yardımcı olmaktan çıkarılıp **platform copilot** rolüne genişletildi.

## Yapılan ana geliştirmeler

### 1) AYA artık platform genelinde yardımcı olur
- Çalışma alanı özeti
- Navigasyon yardımı
- Ayarlar yardımı
- Öğrenim rehberi
- Vaka odaklı komutlar ile birlikte aynı panelde kullanım

### 2) AYA paneli iki katmanlı hale getirildi
- **Platform Yardımı:** lobi, modül geçişleri, ayarlar, onboarding / öğrenim
- **Vaka Komutları:** risk, eksik bilgi, tarama, CAD, finans, teslimat

### 3) Özel soru alanı güçlendirildi
Kullanıcı artık yalnızca vaka değil şu tarz sorular da sorabilir:
- “Bildirim ayarını nereden düzenlerim?”
- “Hangi modüle hangi sırayla gitmeliyim?”
- “Öğrenim rehberini nasıl takip etmeliyim?”

Bu tür sorular otomatik olarak platform yardım mantığına yönlenir.

### 4) Robot görseli düzeltildi
- AYA state assetleri şeffaflaştırılmış PNG varyantlarına geçirildi
- Robot paneli daha derin, daha profesyonel, daha 3D bir sahneye taşındı
- “Green screen / kes-yapıştır” hissi azaltıldı
- Daha temiz pedestal, arka plan glow ve contain yerleşimi kullanıldı

## Dosyalar
- `src/app/ai/page.tsx`
- `src/app/ai/AyaRobot.tsx`
- `src/lib/aya-platform-copilot.ts`
- `public/aya/aya-idle.png`
- `public/aya/aya-thinking.png`
- `public/aya/aya-ready.png`
- `public/aya/aya-alert.png`

## Beklenen kullanıcı etkisi
- AYA sadece “bu vakada ne yapmalıyım?” değil,
  aynı zamanda
  “platformu nasıl kullanırım?”,
  “ayarları nasıl bulurum?”
  ve
  “hangi modüle gitmeliyim?”
  sorularını da karşılar.

## Sonraki öneri
Step 17’de istenirse:
- sayfa bazlı canlı bağlam (settings, design, scan-studio vb.)
- seçili sayfaya göre otomatik AYA önerileri
- global mini AYA dock / floating copilot
- gerçek aksiyon tetikleme (örn. ayar sekmesini aç, ilgili modüle yönlendir)

## Step 16B — AYA adı ve Ayarlar düzeltmesi

Asistanın resmi ürün adı netleştirildi:

```text
AYA — Akıllı Yardım Asistanı
```

Ayarlar ekranındaki telefon doğrulama hatası düzeltildi:

- Telefon artık **isteğe bağlı**.
- Telefon boşsa görünüm, bildirim, tema veya diğer ayarların kaydı engellenmez.
- Telefon girilecekse geçerli biçimde yazılması istenir.
- Telefon alanına `+90 5xx xxx xx xx` placeholder eklendi.
- Laboratuvar iletişim e-postası da boş bırakılabiliyor; yalnızca değer girilmişse doğrulanıyor.
- Sistem bölümüne AYA kimliği ve kapsamı eklendi.
