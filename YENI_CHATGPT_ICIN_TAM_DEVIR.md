# DentAYA — yeni ChatGPT için kapsamlı teknik ve ürün devri

**Tarih:** 28 Ekim 2026, Europe/Istanbul. **Amaç:** Önceki sohbet olmadan güvenle devam edebilmek. Bu dosya ürün bağlamı, gerçek kaynak durumu ve kanıt rehberidir; henüz bitmemiş işleri tamamlanmış göstermez.

## 1. İlk bakışta kesin durum

| Konu | Devirdeki gerçek durum |
|---|---|
| Ürün | DentAYA masaüstü klinik/laboratuvar/lojistik platformu; CAD adı DentAYA Design, asistan AYA |
| Doğru depo | https://github.com/hzsams/dentaya-rc47.git |
| Geliştirme dalı | `professional-workflow` |
| Son kaynak kodu checkpoint'i | `a8e34b4e3eb5614e7120b03051fb14bd005ae467`; sonraki devir commitleri belge/kanıt ekler |
| Son yayımlanmış ana taban | `main`, RC61: `4b6a36047410eeae1ba5057b6a7a69604f662909` |
| Çalışma kopyasının sürümü | package/lock/release/client/CMD tutarlı `1.0.0-rc.62`, AYA Core `0.18.0` |
| RC62 teslimatı | **Henüz son sürüm değil. `v1.0.0-rc.62` yayımlanmadı.** Devir etiketi bir geliştirme snapshot'ıdır |
| Ana üründeki managed model | Hâlâ sabit Qwen3 **1.7B Q8_0**; deneysel 3.5 modeli ana ürüne birleştirilmedi |
| Yeni model adayı | Qwen3.5 **4B Q4_K_M**, Unsloth nicemlemesi, ayrı `codex/aya-native-validation` dalında |
| Yeni adayın testi | Gerçek Windows üzerinde dokuz çağrı ve teknik sözleşmeler geçti; **insan anlamsal incelemesi reddetti**, bazı CAD/dil yanıtları hâlâ hatalı |
| Ana kaynak genel doğrulama | Yeni CAD düzeltmesi dahil `npm run verify` **geçti**, 117,688 sn; kayıt `verification/RC62/current-source/full-verify-handoff.txt` |
| Gerçek CAD arayüzü | Gerçek React/Three.js/WebGL ile yerleştirme, fırça/undo, ünite/vaka, kayıt/çıkış, kurtarma akışları geçti; sunucu ve model köprüsü sentetik |
| Windows kurucu | Eski kaynak kapsamındaki gerçek tanı kurucusu üretildi ve içinden açılan Electron sınandı; **son CAD/model kaynağının kurucusu değil**, yayımlanmadı |
| Canlı kurum/klinik/üretim kabulü | Yapılmadı; profesyonel/klinik kullanımın tümü doğrulanmış sayılmaz |

En kritik ayrım: uygulamanın sürüm metninin RC62 olması, yeni modelin üründe bulunması veya RC62'nin tamamlanması anlamına gelmez. Deney dalını bütünüyle ürün dalının üstüne kopyalama.

## 2. Yeni sohbetin okuma ve çalışma sırası

1. Bu dosyanın tamamını, `YENI_CHATGPT_BASLANGIC_PROMPTU.md` ve `DEVIR_DURUMU.json` dosyasını oku.
2. `AGENTS.md`, `CODEX_BASLANGIC_PROMPTU.md`, `CODEX_DEVIR_NOTLARI.md` dosyalarının tamamını oku. Son ikisi ilk RC46/WIP devridir; RC62'nin durumunu anlatmaz.
3. `RC62_KONTROL_RAPORU.md`, `RC62_KULLANIM.md` ve `devir/2026-10-28/{CAD,WINDOWS,NATIVE}_HANDOFF.md` dosyalarını oku.
4. `node scripts/verify-source-integrity.mjs` çalıştır. Devir hazırlanırken `PAKET_BUTUNLUK.json` geliştirme devri statüsüyle yenilenmiştir; son sürüm onayı değildir.
5. Git varsa `git status --short`, `git branch --show-current`, `git log -8 --oneline` ile gerçek durumu kontrol et. Yerel değişiklikleri/commitleri kaybetme. ZIP'te `.git` olmayabilir; bu beklenir.
6. AYA adayının güncel gerçek çıktısını ve son kontrollü denemeyi oku; sadece “9/9” sayısına bakıp kabul etme.
7. Öncelikli açık iş AYA'nın dil/kanıt/araç yorumunu düzeltmek ve doğrulamak. Sonra son kaynak için Windows kurucusunu üretip gerçek teslimatı tamamla.

ZIP'in `package.json`, `electron`, `src`, `AGENTS.md` içeren ana klasörü çalışma köküdür. İlk yüklenen arşivlerin kökü `DentAYA_Codex_Devri` idi; GitHub arşivi dış klasörüne başka ad verebilir. Web sitesi klasöründe çalışmaya başlama. Çalışma ortamın yoksa kod/test/derleme çalıştırdığını iddia etme.

## 3. Kullanıcı, öncelikler ve değişen talimatlar

Kullanıcı Türkçe, samimi ve doğrudan konuşuyor. Tekrar tekrar onay istemeden somut kod yazılmasını, hataların düzeltilmesini, test edilmesini ve indirilebilir paket verilmesini istiyor. “Devam” etkin görevi sürdürür. Çok sayıda eski “devam” mesajı ayrı tasarım kararı değildir.

- **Donanım:** 16 GB RAM, 512 GB SSD. GPU modeli bilinmiyor. **Windows'ta kurulu EXE** kullanıyor; tarayıcı seçeneğini değil “1”i seçti. Bu iki soruyu tekrar sormayın. GPU ölçümü yalnız gerekli olursa ayrıca sorulabilir; CPU ile çalışabilecek yerel kurulum esas.
- **AYA gerçek yerel model olmalı:** Yeni cümleler, doğal takipler, ad/amaç, hedef ve karar belleği, gerçek CAD verisi, mevcut araçlarla uygulanabilir yardım. Hazır soru sayısını artırmak, anahtar kelime veya otomatik cevap eklemek bu isteği karşılamıyor.
- “AI based'liği tamamen kaldır” daha sonra açıklandı: **AYA'yı kaldırma**. Uygulama yapay zekâ tarafından aceleyle yapılmış izlenimi vermesin; AYA Core sade ve kullanışlı olsun. Manuel CAD modele bağımlı olmasın.
- Kullanıcı birkaç kez tasarımı internet sitesine benzettiğimizi söyledi. Referans exocad/3Shape **masaüstü çalışma ergonomisi**: aydınlık kompakt paneller, mor başlık, CAD'de koyu sağ komut şeridi, nesneler parametrelerden önce solda. Tescilli kod/logo/arayüz varlığı kopyalanmadı/kopyalanmamalı.
- CAD'e genel web başlığı, ikinci modül kenar çubuğu veya yinelenen asistan panelleri ekleme. Kullanıcının seçtiği dil/görünüm, kılavuzlu/uzman mod ve pencere taşıma/sıfırlama davranışını koru.
- **Beş saniye kuralı iptal edildi.** Önce istemişti, sonra açıkça kaldırdı. Yükleme yalnız gerçek bekleyen iş kadar sürer; iş bitince hazır ekranı bilgi/oyun için bekletme.
- İki oyun ekran görüntüsünü **arka plan renkleri** için gönderdi; mini oyun teması için değildi. Dört referans paletinin gerçek adları: **Neon Midnight**, **Graphite Turquoise**, **Deep Turquoise**, **Deep Coral**. `src/app/customization.ts` içinde sırasıyla `reference-midnight`, `reference-graphite`, `reference-turquoise`, `reference-coral`. Ortak görünüm seçimi CAD zeminine de uygulanır; mevcut kullanıcı seçimini değiştirme.
- Robot görseli ve robot varlıkları kaldırıldı. Sol üst Modüller menüsü klasör içindeki klasörler gibi çalışır: dört ana klasör, 24 hedef. Gerekli iş/finans/kapasite akışları `/operations` altında korunur; robotu geri getirme veya iş yönetimini yanlışlıkla silme.
- Ana sayfada Lab/İş Yöneticisi istiyor; kurum kapsamlı iş listesi mevcut. Bu gerçek kayıt akışını koru.
- Kuron/kapşon **ham modelde seçilmiş preparasyon/kole üstüne** oturmalı; başka kuronun üstüne kurulmuş gibi göstermemeli. Gerçekçi anatomik görünüm istendi. RC55 yerleşim/anatomik başlangıcı ve testleri korunur.
- Exocad benzeri daha çok uzman araç, fener, premium logolar ve mini oyunlar istedi. Mevcutta bunlar aşağıdaki gerçek sayılardadır; yeni sayı uydurma.
- Teknik ayrıntılarda boğulmak veya indirilemeyen/geçersiz dosya bağlantılarıyla uğraşmak istemiyor. Dosya linkini gerçekten indirip kontrol et. Kaynak ZIP ile hazır Windows EXE'yi karıştırma. Yeni EXE tam kurulum olduğunda önceki RC sürümlerini sırayla kurması gerekmez.
- Son doğrudan istek: **“devam et ve başka bir ChatGPT'ye geçireceğim; A'dan Z'ye her şeyin olduğu devir dosyası hazırla.”** Bu snapshot o amaçla hazırlanıyor.

## 4. Gerçek özellik/katalog sayıları

| İçerik | Gerçek sayı / açıklama |
|---|---|
| Diş bilgileri | 500 TR/EN kısa bilgi, 60 kaynak grubu |
| 30.000 | Veri kapasitesi/doğrulama hedefi; gerçek yazılmış bilgi sayısı değil |
| Yardımcı soru kataloğu | 252 konu, 1008 TR kayıt; 200 konu × 4 + 52 FDI × 4; temel model eğitimi değil |
| Logolar | 120 özgün hacim etkili SVG; gerçek 3B mesh değil; eski 01–18 ve 01–100 kimlik/varlık uyumluluğu korunur |
| Görünüm/arka plan | 72 ortak seçenek |
| Mini oyun | 5: Kusp Kilidi, İkiz İzler, Oluk Rotası, Işık Matrisi, Mine Dizisi |
| Diller | 46 dil; yeni özel alanlarda TR/EN, diğerlerinde İngilizce fallback olabilir; her metnin eksiksiz çevrildiğini iddia etme |
| Modelin çağırabildiği CAD komutu | 27 tipli/izinli işlem; uzman görsel kontrolleri geometri/QC üretimi değildir |

## 5. Depolar, dallar ve dosyaların kalıcılığı

- **Masaüstü:** `hzsams/dentaya-rc47`, `/workspace/dentaya-rc47`, `professional-workflow`. RC47 adı tarihsel depo adıdır; ürün sürümü RC62 WIP'tir.
- **Web sitesi:** `hzsams/dentaya-website`, `/workspace/dentaya-website`. Statik proje `/workspace/dentaya-website/DentAYA_Web_Bagimsiz`. Masaüstüyle ilgisiz; siteye otomatik dağıtım yapma.
- **Native deney:** aynı masaüstü deponun `codex/aya-native-validation` dalı, normal ayrı klon `/workspace/dentaya-native-ci-check`. Kaynak package sürümü tarihsel RC61 kalmış olabilir. Bütün dalı ana ürüne birleştirme; yalnız doğrulanmış minimal dosyalar ve testleri taşınır.
- **Windows tanı:** `codex/windows-package-validation`, ayrı klon `/workspace/dentaya-windows-ci-check`. Model işini atlayarak gerçek paketleme sorunlarını ortaya çıkardı; üretim dalı değildir.
- `/workspace/dentaya-rc62-validation` yerel dış log/ekran görüntüsü klasörüdür. Gerekli kanıtlar bu kaynak ZIP'ine `verification/RC62` ve `devir` altında kopyalandı. Yeni makinede aynı mutlak yolun var olduğunu varsayma.
- Çalışma ortamı önceki “devam” mesajları arasında yenilendi; eski ajanlar/süreçler kayboldu. Kod checkpoint'leri bu nedenle düzenli push edildi. Yeni görevde çalışan Next/llama/ajan var sayılmaz. `.git` metadata veya model ağırlıkları ZIP'te yoktur.
- Bu ortamda olağan Git worktree oluşturulmadı; ayrı tanı klonları kullanıldı. Mevcut değişiklikleri koru, gereksiz worktree/sıfırlama/force push yapma.

## 6. Teknoloji ve başlangıç

Gerçek `package-lock.json` esas: Next.js 16.3.8, React 19.3.0, TypeScript 5.9.3, Three.js 0.186.0, Electron 44.4.5, electron-builder 26.15.3, Supabase JS 2.116.0, fflate 0.8.3. Node en az 22.12, npm en az 11; test edilen Node **24.19.0**, npm **11.9.0**.

Linux bulut geliştirme:

```bash
cd /workspace/dentaya-rc47
npm ci --ignore-scripts --no-audit --cache /workspace/.cache/npm
npm run verify:runtime
NEXT_TELEMETRY_DISABLED=1 npm run dev -- --hostname 127.0.0.1 --port 3010
```

`--ignore-scripts` Linux kaynak/tarayıcı ortamı içindir; Windows paketlemede normal `npm ci` ile Electron dağıtımı kurulmalıdır. Bağımlılıkları topluca yükseltme, lockfile'ı silme, `npm audit fix --force` veya hash/TLS doğrulamasını kapatma. Varsayılan `/home/agent/.npm` yazılamadı; `/workspace/.cache/npm` kullanımı başarılı.

Bu bulutta shell çağrılarını `/bin/bash`, `login:false` ile yapmak çalıştı. Playwright: `/opt/codex/cua_node/lib/node_modules/playwright/index.mjs`; Chromium: `/usr/bin/chromium`. Yeni ortamda varlıklarını kontrol et.

`/workspace`, `/ai`, `/settings`, Supabase environment ve `.env.local` olmadan misafir olarak 200 döndürdü. Bu, kurum özelliklerinin canlı kabulü değildir. Localhost adreslerini kullanıcıya paylaşılabilir önizleme diye sunma. Süreçleri her yeni oturumda yeniden başlat, yalnız kendi başlattıklarını durdur.

Electron ana süreç `electron/main.cjs`, güvenli preload `electron/preload.cjs`, tipler `src/types/desktop.d.ts`. Next `output:'standalone'`. Geliştirme portu 3010; paketli loopback sunucusu 3210. Standart `--user-data-dir` yalnız izole masaüstü smoke için desteklendi; varsayılan kullanıcı profili korunur.

## 7. Kod haritası

| Alan | Başlıca kaynaklar |
|---|---|
| Masaüstü çerçeve ve gezinme | `src/app/WorkspaceChrome.tsx`, `src/lib/module-navigation.ts`, `src/lib/workspace-navigation.ts` |
| Görünüm/arka plan | `src/app/customization.ts`, `src/app/dentaya-theme.tsx`, `src/lib/cad-workspace-preferences.ts` |
| AYA ana sohbet/kurulum | `src/app/ai/AyaChat.tsx`, `AyaEngineSetup.tsx`, `AyaAcceptancePanel.tsx`, `AyaSetupProgress.tsx`, `AyaSources.tsx` |
| Model yönlendirme | `src/lib/aya-conversation.ts`, `electron/aya-local.cjs` |
| Belge/RAG/profil | `electron/aya/core.cjs`, `dialogue.cjs`, `evidence.cjs`, `knowledge.json` |
| Eski açık rehber | `electron/aya/assistant.cjs`, `conversation.cjs`, `qa-catalog.cjs`, `catalog/*` |
| Model çalıştırma/indirme | `electron/aya/managed-runtime.cjs`, `electron/aya/licenses/*` |
| Bellek/araç sözleşmesi | `electron/aya/agent.cjs`, `agent.d.cts`, `src/lib/aya-cad-agent.ts` |
| Yeni aday bellek şeması | Deney dalında `electron/aya/memory-task.cjs`; **ana üründe henüz yok** |
| Sohbet saklama/çalışma kopyası | `src/lib/aya-local-state.ts`, `aya-chat-workspace.ts`, `aya-ui-state.ts` |
| Kişisel bilgi defteri | `src/lib/aya-knowledge.ts`, ilgili kaynak panelleri |
| Yalıtılmış model kabulü | `electron/aya/acceptance.cjs` + `.d.cts`, `scripts/evaluate-aya-local.cjs` |
| CAD editör/sahne | `src/app/design/DesignStudioClient.tsx`, `DesignViewport.tsx`, `CadAyaPanel.tsx`, `cad-workspace.css` |
| İş tanımı/aşamalar | `src/lib/cad-job-setup.ts`, `cad-workflow.ts` |
| Kalıcılık/kurtarma | `src/lib/cad-project-state.ts`, `cad-recovery.ts` |
| Geometri/analiz | `src/lib/cad-*-engine.ts`, `cad-mesh-qc.ts`, `cad-sculpt-integrity.ts` |
| Teknisyen form kütüphanesi | `src/lib/cad-form-library.ts`, `/cad-library` |
| Lab iş listesi | `src/lib/lab-workspace.ts`, `load-lab-workspace.ts`, `/workspace` |
| Diğer iş modülleri | `src/app/{patients,cases,appointments,messages,finance,logistics,operations,team,clinic,labs,scans,scan-studio,community}` |
| Backend/yetki | `src/lib/supabase.ts`, `supabase/migrations/*`, `supabase/functions/*` varsa gerçek dosyalar |
| Çeviri | `src/lib/i18n/*`, `electron/aya/packs/*`, UI manifest/seed ve özel TR/EN modülleri |
| Marka/oyun/bilgi | `src/lib/brand-catalog.ts`, `src/app/loading-play/*`, `src/lib/mini-games.ts`, `src/lib/i18n/dental-facts.json` |
| Windows paketleme | `scripts/package-windows.mjs`, `after-pack.cjs`, `electron-builder.yml`, `DENTAYA_GUNCELLE_DERLE.cmd` |
| Windows doğrulama/yayım | `verify-windows-artifact.mjs`, `smoke-windows-desktop.mjs`, `verify-windows-ci-source.mjs`, `publish-windows-release.mjs`, `.github/workflows/windows-release.yml` |

Kökten erişilen tarihsel RCxx raporlarının tümü aynı sürümün doğrulaması değildir. En güncel kaynak, bu devir ve kapsama bağlı test hashleri esas alınır.

## 8. AYA'nın ana üründeki mevcut davranışı

RC61 ile normal sohbet `agent:false` serbest metin/akışlı gerçek yerel modele ayrıldı. Model yok/hatalı/meşgul/iptal/timeout olduğunda otomatik Core/katalog cevabı eklenmez. Soru ve retry korunur; yarım metin tamamlanmış sohbet gibi kaydedilmez. Deterministik açık bellek kontrolü/acil uyarılar ayrı uygulama işlemidir.

Hedef/karar/açık soru çıkarımı `task:'memory'` ile ayrı model çağrısıdır. Yalnız son kullanıcı isteği, mevcut bellek ve sınırlandırılmış asistan yanıtı girer; CAD, eski geçmiş, not/RAG veya kişisel talimat girmez. Başarılı sohbet cevabı bellek hatası yüzünden silinmez. Sonuç aynı oturum/son tur/bellek revizyonu ve temel bellek eşleşmesinde uygulanır. Yeni soru önce eski arka plan işini iptal edip bekler.

Kişisel notlar, belgeler ve geçmiş sistem talimatı değildir; kaynak verisidir. Not kullanımı açık tercihe bağlıdır. Uzun geçmişte ilk hedef ve son düzeltmeler, notlarda ilgili kelime çevresi korunur; token bütçesi aşıldığında güncel kullanıcı/CAD kanıtı sessizce atılmaz.

Ana üründeki `agent.cjs` alan bazlı patch sözleşmesi: `goal keep/set/clear`, listeler `keep/replace`. `keep` üretilmiş yeni değerleri yok sayar. Tüm belleği silme yetkisi yalnız son kullanıcının açık tüm bellek isteğindedir; alıntı/soru/belge/asistan önerisi bu yetki değildir. Sırf model yeni değer yazdı diye keep maskesini otomatik set'e çevirme.

CAD ayrı `agent:true` JSON planı kullanır; öneriler tipli izin listesiyle ayrıştırılır. CAD'de açıkça seçilen Araç rehberi modelmiş gibi sunulmaz; rehber turları model geçmişine karışmaz. Model yanıtını veya kaç kontrol geçtiğini bilinç/temel model eğitimi/genel doğruluk sertifikası gibi anlatma.

## 9. RC62'de ana ürüne gerçekten alınan iyileştirmeler

### Sohbet çalışma kopyası ve çakışma

Aynı sekmede modülden ayrıl/dön için konuşma, bellek, revizyon, taslak ve bekleyen soru süreç belleğinde tutulur. Geçmiş kapalıysa transcript kalıcılaştırılmaz. Geçmiş açıkken sessionStorage yalnız **kayıtlı oturumun** taslak/kesinti kimliği + son aktif kimliği saklar; transcript/not/tanı/yarım çıktı saklamaz. Sınırlar: 12 kayıt, dört saat TTL, 8000 karakter. Yenilemede asıl kayıt localStorage'dan güncel revizyonla çözülür; silinmiş kayıt veya eski çalışma kopyası yeni veriyi ezmez. Kayıtsız yeni taslak sayfa yenilemesinde geri getirilemez; bunu doğrulandı gibi sunma. Kesilen soru açık retry ister, kendiliğinden gönderilmez.

### Kabul paneli ve gerçek değerlendirme

Dokuz sentetik çağrılık kabul paneli yalnız açık başlatmayla çalışır; normal sohbet/geçmiş/bellek/not/hasta/CAD yürütücüsüne dokunmaz. İlerleme, ham metin, iptal ve JSON dışa aktarımı vardır. UI raporundaki caller-declared provenance gerçek native'in kriptografik kanıtı değildir; `nativeInferenceVerified:false` kalır. Basit sinyaller kalite puanı/semantik kabul değildir.

İptalden sonra hem eski yanıt hem native iptal IPC sonucu bitene kadar sahiplik korunur. `runner.whenIdle()` kapısını kaldırma; gecikmiş iptal yeni isteği durdurmamalı. Kabul, normal gönderim, bellek düzenleme ve kurulum arasında anlık kilitler bulunur.

CLI: `npm run evaluate:aya -- --model MODEL --report /rapor.json`. Var olan managed kurulum için `--directory` kullanılabilir. Bu komut model indirmez, gerçek CAD çalıştırmaz. `--help` oku.

### Profesyonel modüller

Misafir `/settings` görünüm/dil/AYA tercihlerine açılır; kurum hesabı yazmaz. Hızlı ayarlar gerçek tab/roving keyboard/focus-return kullanır. Kurulum gerçek byte ilerlemesini gösterir, bilinmeyen toplamda indeterminate kalır; dosya hazır oluşu yanıt doğruluğu diye etiketlenmez.

Vaka formunda bekleyen RPC süresince mutable alanlar/yeniden aç/kapat/çift gönderim kilitlenir; hata aynı taslak ve retry kimliğini korur. Rota/kullanıcı/kurum değiştikten sonra eski sonuç yeni sayfaya yönlendiremez. Randevuda değişmiş taslağın Escape/backdrop/×/Cancel/rota/unload korunması ve bekleyen kayıt odağı düzeltildi. Mesajlar ve AYA'da IME Enter/keyCode229 yanlış gönderim yapmaz.

### Gerçek CAD kayıt hatası ve canlı kanıt

`a8e34b4` öncesinde `DesignStudioClient` AYA `saveFailed` alanına yalnız **çıkış modalının** `exitFailure` durumunu gönderiyordu. Sıradan kayıt/autosave HTTP hatası modele ulaşmıyordu. Yeni bağımsız hata durumu commit edilmiş kullanıcı/kurum/proje/kaynak/ünite sahibi + nesille tutulur. Eski sahibin gecikmiş sonucu yenisine hata koyamaz/silemez. Retry başlangıcı hatayı temizlemez; yalnız gerçek başarılı sunucu ACK aynı sahibin hatasını temizler. Modal/kurtarma kapıları korunur. Hata snapshot'a da girer.

CAD asistanında üç kompakt canlı host bilgisi her zaman görünür: antagonist, güncel kontrol, kayıt. Bunlar model metninden gelmez. Raporda kaynak/model hazır, token boş değil ve rapor token'ı güncel token'la eşleşmeli; eski rapor ayrıntıları da gizlenir. Kayıt sırası saving → failed → unsaved → açık `unsaved:false` için saved; alan yoksa unknown. Antagonist eksik alanı da unknown'dır. Bu, klinik/üretim veya duvar kalınlığı onayı değildir. Ctrl/Meta+Enter IME sırasında göndermez.

## 10. CAD çekirdeği, araçlar ve ölçüm anlamı

CAD manuel ve deterministik kalır. Model JavaScript/shell/SQL/serbest geometri kodu çalıştıramaz. Kullanıcı Uygula demeden işlem yoktur. Tıklamada güncel kapsam, snapshot, dataToken, ünite, geometri/ayar ve aşama kapıları yeniden doğrulanır. Eski plan yeni dişe/mesh'e uygulanamaz; gerçek callback sonucu olmadan başarı/kayıt/çıkış sayılmaz.

27 izinli kimlik:

```text
inspect setup library place save save-exit undo redo fit-camera show-all isolate
recorded-bite view-natural view-contact view-thickness view-undercut view-section
tool-margin tool-measure tool-add tool-reduce tool-smooth internal-fit next
inspection flashlight-on flashlight-off
```

**`view-thickness` adı yanıltıcı olabilir:** mevcut kaynak yüzeyine uzaklık görünümü gerçek duvar kalınlığı değildir. Bu kimliği düşünmeden yeniden adlandırmak eski plan/dispatcher/izin listesini bozabilir. Daha açık model-facing tanım sınırlı deneyde deneniyor. `tool-measure` iki nokta mesafesidir; otomatik gerçek duvar kalınlığı ölçmez. `recorded-bite` kayıtlı hizalamayı gösterir, yeni kapanış/artikülatör çözmez. Fener ve uzman görsel kontrolleri yeni geometri veya QC üretmez.

Aşamalar: files → margin → fit → anatomy → freeform → contacts → inspect → review. Kılavuzlu/uzman mod, ilk sekiz manuel araç ve mevcut aşama kapıları korunur. İş tanımı `design_projects.settings.job_setup` içinde ünite bazındadır.

RC55 kuron/kapşon, yalnız ham modelde kole seçilip yerleştirilince görünür; sahne merkezinde veya başka kuronun üstünde hayalî başlangıç yoktur. Eğik/ters eksen ve preparasyon yüksekliğinde servikal kayıt korunur. Altı anatomik başlangıç formu, optik görünüm ve kole kaydı farklıdır. Eski düzenlenmiş mesh/shell/kişisel kütüphane otomatik yeniden modellenmez. RC38'de iptal edilmiş 24 form ailesini geri getirme.

Mesh kapalı/tek gövde olması üretim onayı değildir. Kabuk offset minimumu tahmindir; kaynak mesafesi gerçek duvar değildir. Antagonist yoksa kapanış güvenliği bilinmez. Kesit gerçek üçgen-düzlem kesişimidir; açık/çakışan/sınırlandırılmış alanı sıfır veya güvenilir hacim gibi uydurma. `0.65 mm`, `0.8 mm`, `46` gibi native test değerleri sentetik örneklerdir, hastanın ölçümü değildir.

Kalıcılık tam workspace mesh/ünite verisini korur. IndexedDB yerel kurtarma, CAS `updated_at` sürüm kapısı, başarısız kayıt halinde ekranda kalma, ACK sonrası çıkış ve yeniden açılış kritik. Kayıt hata/0 satır döndüğünde başarılı sayma.

## 11. Gerçek model deneyleri ve henüz yapılmayan birleştirme

Ayrıntılar `devir/2026-10-28/NATIVE_HANDOFF.md`, makine kaydı `DEVIR_DURUMU.json`, kanıtlar `verification/RC62/native-experiments` ve deney dalındadır.

- Eski 1.7B ve Qwen3 4B teknik çıkarım yaptı fakat Türkçe, hedef silme ve bazı CAD yanıtları yetersizdi.
- Greedy `temperature:0` tekrar sorununu artırdı; Qwen model kartındaki non-thinking ayarları ayrı denendi. CAD çekirdeğinin deterministikliğiyle dil örneklemesini karıştırma.
- Qwen3-4B-Instruct-2507 bazı CAD hatalarını azalttı ama birim/hedef belleği ve olumsuz Türkçe istekte hâlâ başarısız oldu. Kaynak/şablon kontrolünde girdiler düşmüyordu; doğrudan en sade model de aynı olumsuz isteği ters yorumladı.
- **Yeni 3.5 aday:** Unsloth yayımlı `Qwen3.5-4B-Q4_K_M.gguf`, **2740937888 bayt**, revizyon `e87f176479d0855a907a41277aca2f8ee7a09523`, SHA-256 `00fe7986ff5f6b463e62455821146049db6f9313603938a70800d1fb69ef11a4`, Apache-2.0; özgün model Qwen/Qwen3.5-4B. Unsloth dosyasını “resmî Qwen GGUF” diye yanlış adlandırma.
- Builtin kimlik `aya-local:qwen35-4b-q4-k-m`. Doğrulanmış aynı hashle içe aktarılan kimlik de aynı model kartı profilini alır; ilgisiz GGUF kullanıcısının seçtiği ayar zorla değiştirilmez.
- Model kartı non-thinking genel profil: T0.7 / top_p0.8 / top_k20 / min_p0 / presence1.5 / repeat1.0. Think kapalı. Model kartı kaynağı ve hashleri kanıt klasöründe.
- Yeni **bitişik bellek işlemi**: `goal:{operation:'keep'}` veya `{operation:'set',value:'...'}` veya `{operation:'clear'}`; listeler keep veya replace+values. Keep yanında yeni değer yazmak şema/parser tarafından reddedilir. Mevcut sıkı patch parser/reset yetkisine dönüştürülür. Bu, modelin doğru metin yazıp keep maskesiyle kaybetmesini çözdü. Yeni alanlar kullanıcı niyeti yerine otomatik kabul edilmez.
- Gerçek çalışma **40728527664**, kaynak `08899dc`: dokuz actual çağrı/teknik sözleşme geçti, hedefte 46/karar ve kısmi temizleme çalıştı. **Ham insan incelemesi reddetti:** yaratıcı isteğe yazılımı kattı; kısmi silmeyi doğrulanmadan bitti dedi; kanıt yokken “güvensiz” sonucunu kesinleştirdi; `view-thickness` yeteneğini yanlış anlattı; son yanıtta başarısız kaydı/yerel kurtarmayı göz ardı etti. 0.65 tahmin sınırını doğru söylemesi bu hataları kapatmaz.
- Son sınırlı grounding/talimat düzeltmesi devir notundaki yeni commit/run altında olabilir. **Sonuç bekleyen koşuyu başarılı yazma.** Dokuz taşıma başarısı dokuz doğru cevap demek değildir.

Deneysel patch kaynak paketi içinde `devir/2026-10-28/experimental-native-candidate.patch` olarak bulunur. **Uygulanmış değildir.** Ayrı `experimental-native-diagnostics.patch` ise deney workflow/cache/helper ve ayrıntılı native verifier snapshot'ını taşır; yalnız izole deney klonunda kullanılmalıdır. İkisi de uygulanmış değildir. Patch'i okuma/deneme için taşıyoruz; reddedilmiş adayı sessizce üretim varsayılanı yapma. Yeni ChatGPT önce ham çıktıyı ve son koşunun durumunu incelemeli, ilgili Node/bütçe/gramer/gerçek model testlerini tamamlamalıdır.

Yeni model ileride benimsendiğinde: runtime pin/id/URL/SHA/boyut, UI baseline, yerel kurulum rehberi, lisans/kaynaklar, native CLI yardım örneği, kurulum fixture'ları ve ilgili testler beraber güncellenir. Eski model kayıtları ve kullanıcının açık tercihi silinmez. EXE yükseltmesi tek başına yeni ağırlığı indirip seçmez; kullanıcı yeni modeli kurmalı/seçmelidir. Mevcut Ollama alternatifi `qwen3:4b` eski ayrı yol olarak kalır; managed hash doğrulamasıyla aynı iddia değildir.


**Son denemede artık somut mimari kök neden de bulundu:** `40730934136` / `9dc9956` dokuz gerçek istek yaptı, son plan parser tarafından reddedildiği için sekiz yanıt kabul edildi. CAD planlayıcısı kendi yorum/önerilerini kullanıcı kararı gibi belleğe eklemişti; önceki beş + yeni iki karar yediye çıkınca sıkı beş karar kapısı doğru biçimde `LOCAL_INVALID_PLAN` verdi. Çözüm eski kararları silmek veya sınırı artırmak değildir: CAD planı/host gözlemi ile kullanıcıdan yetki alan ayrı çalışma belleği işlemini ayırmak gerekir. Son denemede yaratıcı kısıt, bilinmeyen kapanış, 0.65 tahmin ve saveFailed yorumları iyileşti; yerel kurtarma, tekrar kontrol ve erken bellek başarı iddiası sorunları sürüyor. `2760095` kısa metni Node/bütçe kontrollerini geçti fakat henüz gerçek modelle sınanmadı. Ayrıntı ve stack/replay kanıtı NATIVE_HANDOFF.md ve qwen35-grounding klasöründedir.

## 12. Backend ve diğer modüller

Supabase Auth/Postgres/Storage/RLS. Klinik, lab ve lojistik rollerinin kurum kapsamını koru. Önemli tablolar: organizations, memberships, patients, cases, scan_sessions, attachments, design_projects, design_versions, case_design_reviews, shipments, mesaj/finance/randevu tabloları. Gerçek isim ve ilişkiler migration'larda esas; bu liste tüm şemanın yerine geçmez.

Sıfır satır/CAS sürüm uyuşmazlığı, çift gönderim/idempotency, para birimi, optimistic conflict, görünür hata, rol/kurum değişimindeki eski istek iptali korunur. Hasta verisi, tarama, kullanıcı sırları ZIP'e/loga girmez. Service-role anahtarını NEXT_PUBLIC'a koyma.

24 menü hedefi dört kök klasörde: Klinik (hasta/vaka/randevu/taramalar/stüdyo/klinik), Laboratuvar (design/kütüphane/lab/eğitim/teslimat), Yönetim (iş takibi/finans/ekip), Çalışma alanı (genel bakış/AYA/mesaj/bildirim/topluluk/ayarlar/sistem kontrol hedefleri). Kesin katalog `src/lib/module-navigation.ts`.

Hesapsız yerel sohbet, görünüm ayarı ve manuel çalışma geliştirme senaryoları çalışabilir. Kurum işlemleri kullanıcının gerçek yetkili Supabase yapılandırmasını ister. Bu devirde canlı kurum kimlik bilgisi veya canlı klinik kabulü yoktur; sentetik API testini canlı RLS kabulü sayma. Buluta otomatik AYA geçişi yoktur; `.env.example` varsayılanı cloud disabled.

## 13. Testlerin nasıl çalıştırılacağı ve neyi kanıtladığı

**Tarayıcı fixture'ları, Next dev, typecheck/build ve genel verify paylaşılan `.next` nedeniyle sırayla çalışır. Ajanlar arasında da aynı kural geçerlidir.** Bağımsız Node kontrolleri uygun olduğunda paralel olabilir.

```bash
npm run verify
node scripts/verify-source-integrity.mjs

DENTAYA_PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright/index.mjs \
DENTAYA_CHROMIUM_PATH=/usr/bin/chromium \
DENTAYA_SCREENSHOT_DIR=/workspace/dentaya-rc62-validation \
node scripts/verify-aya-state-browser.mjs
```

Aynı ortamla ilgili scriptler: `verify-aya-chat-workspace-browser.mjs`, `verify-professional-modules-browser.mjs`, `verify-aya-conversation-browser.mjs`, `verify-aya-work-browser.mjs`, `verify-aya-setup-browser.mjs`, `verify-aya-acceptance-browser.mjs`, `verify-desktop-shell-browser.mjs`. CAD daily: `node --import tsx scripts/verify-cad-daily-browser.mjs`. Üretim yükleme testi `verify-loading-reading-browser.mjs`, önce üretim build'i ister.

Next dev `next-env.d.ts` importlarını `.next/dev/types` yapabilir; release öncesi yalnız bu üretilmiş değişikliği inceleyip geri al. Başka ajanın fixture rotasını/sunucusunu silme. İlk test yarışları yeni gönderiyi beklemeyen eski mock kaydını kullanıyordu; CAD helper şimdi yeni prompt+artan çağrı sayısı+gerçek boş composer/sunucu idle bekler. Assertions gevşetilmedi; eski başarısız loglar tutuldu.

Gerçek native test Linux/Windows uyumlu b9380 ve doğrulanmış GGUF ister; `scripts/verify-aya-native.cjs --help` oku. Windows kontrollü helper `scripts/run-windows-aya-native.cjs --output ci-artifacts/native`, üç taze kanıtı hatada da üretir. Model ağırlığı kaynak ZIP'ine girmez. JSON grammar veya mock test gerçek inference değildir; inference de tek başına insan semantik kabulü değildir.

Son ana kaynak full verify (117,688 sn) lint, TypeScript, model/araç/bellek mock sözleşmeleri, veri/çeviri, deterministik CAD/kernel, workflow, migration/PGlite/sentetik backend ve Next üretim build'ini kapsar. Gerçek kişide tasarım, canlı kurum/üretim/klinik kabulü kapsamaz.

## 14. Windows gerçek ön kontrolü ve final paketleme

Ayrıntılar `devir/2026-10-28/WINDOWS_HANDOFF.md`. Gerçek Windows çalışması:

https://github.com/hzsams/dentaya-rc47/actions/runs/40673513656

Kaynak `61ee56824704c8937fbace10e77947e30d96653a` = ürün tabanı `4588013` + tanı/taşınabilirlik. Tam verify, NSIS, gerçek kurucudan ASAR/Next/PE çıkarıp kaynak hash karşılaştırması ve çıkarılan Electron'un yeni profil ile `/workspace`, `/ai`, `/settings` ekranları/IPC geçti; renderer exception 0. Kurucu **279376003 bayt**, SHA **22b9986ee83304da0843602185a7c5c8dd0f8a1973a6f1cfa152d4011ed81e78**. NSIS x86 bootstrap normaldir; iç Electron x64'tür. Yayıncı sertifikası/imza doğrulanmış sayılmaz.

Ana ürüne `a33d6e9` ile alınan gerçek Windows farkları: kanonik TEMP fixture, fileURLToPath, i18n dizin tarama yolu/gerçek regresyon, generator posix yolları. Daha önce npm.cmd güvenli başlatma, gerçek PE mimari kontrolü, `.env*` dışlama, standart izole user-data-dir, `.gitattributes` ile byte koruma, gerçek NSIS decoder ve kaynak/rapor provenance doğrulaması eklendi. 52 paket/artefakt/CI kontrolü geçti.

**Eski tanı kurucusu son a8e34b4 CAD düzeltmesini veya deneysel yeni modeli içermez.** GitHub Actions artefaktı 14 günlük olabilir; EXE Git'e konmadı. Eski EXE'yi yeni RC62 diye göndermeyin.

Son ürün işi:

1. Model adayının gerçek anlam/araç/kanıt hatalarını çöz ve incele; kabul edilen minimal değişiklikleri ürün dalına al. Gereken UI/lisans/fixture güncellemelerini yap.
2. Güncel kaynak üzerinde gerekli testleri tamamla, RC62 sürüm metadata uyumunu kontrol et.
3. Son rapor ve SHA-256 manifestini hazırla; sırlar/deps/.next/deney ağırlıkları dahil olmasın. Devir manifestinin geliştirme statüsünü son sürüm sonucu sanma.
4. Kaynak ve commit/tag tam eşleşmesiyle `v1.0.0-rc.62` hazırla; mevcut etiketi force taşımayın. Uzak main değiştiyse kullanıcı değişikliğini koru/uyumla.
5. `.github/workflows/windows-release.yml` tag ile gerçek Windows source verify/build/package/payload/CDP + ayrı native işini çalıştırır. Publish yalnız doğru tag/source/run/asset hashleriyle sekiz varlığı yayımlar. Branch build release yayımlamaz. Native başarısızlık gerçek sonuçla görünür; eksik/stale kanıtla yayın yoktur.
6. Son EXE, receipt/native raporu ve kaynak ZIP linkini gerçekten indirerek SHA/PE/CRC/kapsamı kontrol et; çalışmayı tamamlanmış diye ancak kanıtıyla anlat.

Windows yerel giriş `DENTAYA_GUNCELLE_DERLE.cmd`. OneDrive kilitleri/EBUSY/EPERM için LOCALAPPDATA altında ayrı build kökü, Electron dağıtımı onarımı, sınırlı lock retry ve `dist-desktop/latest-build.json` çıktı yolu korunur. Kaynak ZIP hazır kurucu değildir.

## 15. Bilinen açık işler / kapsam sınırları

1. **En yüksek:** CAD planlayıcısının kendi yorumunu kullanıcı karar belleğine eklemesini ayırmak; son gerçek koşuda 5+2 karar taşması parser tarafından doğru reddedildi. Beş sınırını gevşetme/eski kararı atma. Ayrıca erken bellek başarı iddiası, yerel kurtarma ve tamamlanmış kontrolü tekrar önerme sürüyor. Son grounding tamamlandı: 9 istek, 8 kabul, FAIL. JSON/notta kesin kaynak/run var.
2. Yeni 3.5 + bitişik bellek kodu ana üründe yok; kör merge yapılmamalı. Teknik testlerin geçmesi semantik reddi kaldırmaz.
3. Son kaynak için son Windows kurucu/tag/release henüz üretilmedi. Gerçek ön kontrol vardır, kapsamı eskidir.
4. Kullanıcının kendi PC'sinde hız/GPU/gerçek uygulama kabulü ölçülmedi. 16 GB/512 SSD bilgisi var; aynı soruları tekrar sorma.
5. Canlı kurum/RLS/backend, klinik/üretim onayı ve bütün 46 dil/modül uçtan uca canlı kabulü yok.
6. Çok pencere localStorage kontrolü iyimserdir, atomik kilit değil. Kayıtsız yeni taslak reload'da kurtarılmaz.
7. Gecikmiş başarısız kayıt yanıtının ayrıl/dön sonrası gelmesi için ayrı özel tarayıcı senaryosu koşulmadı; nesil koruması kodda mevcut, normal failure/retry ve eski başarı receipt sınırları geçti.
8. 30.000 gerçek bilgi, gerçek 3B logo, bilinç/temel model eğitimi/ChatGPT Pro eşdeğerliği iddiası yapılmadı. Bunları tamamlandı diye yazma.

## 16. Önerilen sonraki somut adımlar

A. Devir bütünlüğünü ve kaynak dalını doğrula. Ana kaynakta son full verify geçti; gerekçesiz bağımlılık yükseltme veya arayüzü yeniden tasarlama.

B. Önce CAD planı/gözlem ile yalnız son kullanıcıdan yetki alan bellek güncellemesini ayır; beş karar kapasitesini ve eskileri koru. `NATIVE_HANDOFF.md` son koşusunu kontrol et. Varsa son gerçek ham çıktıyı indir/fetch et; pending'i pass yapma. Örnekleme/şablon/küçük model farklarını önceki deneylerle karşılaştır. Modelin çıktısı hâlâ yanlışsa yeni hazır yanıt ekleme; pozitif tool capability ve taze host kanıtı önceliğini, açık bellek işlemini, token bütçesini ve ölçülü gerçek değerlendirmeyi düzelt.

C. Yeni bellek şemasının 27 araç+section+2048 output reserve tam bağlam bütçesini özellikle sına; daha önce grounding metni bunu aştı. Testi veya output rezervini gevşetme. Açık full reset yetkisini, keep değerlerinin otomatik kabul edilmemesini ve orijinal verinin değişmemesini koru.

D. Başarılı minimal adayı taşı. Mevcut managed model kaydı/kullanıcı tercihi/yerel kurtarmayı silme. Yeni modelin kurulup seçilmesi gerektiğini uygulama ve kısa kullanıcı yönergesinde anlaşılır yap.

E. Son doğrulama/Windows paketi/yayın akışını tamamla. Kullanıcıya kısa Türkçe sonuç, gerçek EXE indirme linki, nasıl yeni modeli seçeceği ve gerçekten açık kalanları ver. Yeniden onay bekleyerek rutin işi bırakma.

## 17. Ortam kurulumu, ağ ve saklanan ayarlar

Başta kullanıcının açık çağrısıyla `cloud-environment-onboarding:setup` skill'i uygulandı. Test edilen install/start yönergeleri ortam taslağına kaydedildi: masaüstü checkout/deps, yazılabilir npm cache, guest başlangıç, sıralı tarayıcılar, ayrı website. Taslak adı “DentAYA masaüstü geliştirme”. **Taslak kaydetmek etkinleştirmek/yayımlamak değildir**; ortam ayarlarından incele/kaydet ve yayımla gerektirir. Yeni ortamda kendiliğinden uygulandı varsayma.

GitHub HTTPS Git proxy ile clone/fetch/push çalışıyor; GH_TOKEN env yokluğu erişim yok demek değil. Token/credential dosyalarını çıkarmaya çalışma veya chat'te anahtar isteme. Bu bulutta api.github.com/HuggingFace doğrudan proxy 403 verdi; yalnız draft domainleri değiştirmek mevcut runtime'ı otomatik düzeltmedi. Windows GitHub runner doğrulanmış indirmeyi yapabildi. Bu yüzden kontrollü CI raporları tanı dallarına bot commitleriyle alındı. Yeni yayın işindeki token standart workflow secret'ıdır; bu devirde gizli değer bulunmaz.

Yerel yardımcı `run-dentaya-check.py` ve `seal-dentaya-source.py` dosyalarının kopyası devir klasöründe bulunur. Bunlar ortam dışı yardımcıdır, program özelliği değildir. Yeni kökte yollarını uyarlamadan kör çalıştırma. Nihai manifest üretimi ve source verify birbirinden ayrılır; önce kanıtı üret, sonra kaynak hashlerini mühürle.

## 18. Son kontrol listesi — yanlış anlaşılmasın

- Bu ZIP **tam kaynak geliştirme devri**; `.git`, node_modules, .next, model ağırlığı ve son EXE içermez.
- En son ana ürün kaynak düzeltmeleri ve doğrulama kanıtları ZIP'te; deneysel model ayrı patch/not/rapor olarak taşınır.
- Bu dosyadaki mutlak `/workspace` yolları önceki buluta aittir; kaynak dosyalarının ZIP içi göreli yolları kalıcıdır.
- GitHub'daki tanı dalı rapor bot commit'i ile test edilen kaynak commit'i farklı olabilir. `source-info` ve receipt alanlarına bak.
- Handoff etiketi final RC62 etiketi değildir; ileride RC62 tamamlandığında ayrı doğrulanmış release gerekir.
- Başarısız denemeler saklandı; yeni ChatGPT aynı yanlışları tekrarlamadan gerçek kalan işe devam etsin.
