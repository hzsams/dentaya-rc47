# AYA yerel model — ayrıntılı teknik devir

Tarih: 28 Ekim 2026. Bu not, ana masaüstü deposundaki genel devir belgesinin native/model bölümüdür. Kullanıcı Windows EXE kullanıyor; 16 GB RAM / 512 GB SSD, GPU bilinmiyor. Amaç hazır cevap sayısını artırmak değil; gerçek yerel model, güvenilir çalışma belleği ve gerçek CAD kanıtıyla uygulanabilir yardım.

## 1. Kökler ve teslim durumu

- Ana ürün: `/workspace/dentaya-rc47`, `professional-workflow`. RC62 / AYA Core 0.18.0 hazırlığı burada. Buradaki model hâlâ RC61 tabanındaki Qwen3 1.7B Q8_0'dır; deneysel 3.5 adayı ana ürüne ALINMADI.
- Native deney: `/workspace/dentaya-native-ci-check`, `codex/aya-native-validation`. Bu ayrı normal clone'dur, Git worktree değildir. Kendi package/Core metadata'sı eski RC61/0.17 olabilir; bu sürüm metadata'sını ana ürüne kopyalama.
- GitHub: `https://github.com/hzsams/dentaya-rc47`.
- Önce ana kökteki AGENTS.md, CODEX_BASLANGIC_PROMPTU.md, CODEX_DEVIR_NOTLARI.md ve güncel RC62 belgelerini TAM oku. İlk devir belgeleri tarihsel WIP'tir; eski testleri yeni kanıt sayma.
- Deney branch'ini bütünüyle ana ürüne merge etme. Yalnız incelenmiş işlevsel dosya yamasını uygula; deney workflow'ları, eski sürüm metadata'sı ve raporlar ayrı kalmalıdır.

## 2. Sonuçların dürüst özeti

Gerçek Windows model çıkarımı çalışıyor. Ağ engeli Windows CI ile aşıldı. Qwen3 1.7B, eski 4B, 4B Instruct 2507 ve Qwen3.5 4B ile gerçek kayıtlar var. Bunlar mock değildir. CAD durumları sentetiktir; model testi geometri aracı yürütmez.

**Qwen3.5 + yeni bellek sözleşmesi 9/9 gerçek çağrı ve yapısal sözleşmeyi geçti; ham yanıt incelemesi SEMANTİK OLARAK REDDETTİ.** Yazılım dışlama isteğini ihlal etme, eksik CAD kanıtını “güvensiz” diye kesinleştirme, kaynak mesafesi aracını gerçek duvar ölçümü sanma ve başarısız kaydı göz ardı etme sürüyor. “9/9 geçti”yi “9 doğru cevap / AYA bitti” diye sunma.

Raporlar değişmeden saklanır. Asistanın ham yanıt incelemesi uzman insan/klinik/üretim kabulü değildir. Otomatik raporların semanticReviewRequired/pending-human-review alanları özellikle korunur.

## 3. Sabit model/motor pinleri

En son deney modeli:

- Resmî temel: `Qwen/Qwen3.5-4B`.
- GGUF yayımlayıcısı: **Unsloth** (`unsloth/Qwen3.5-4B-GGUF`); resmî Qwen GGUF'si diye adlandırma.
- Lisans metadata'sı: Apache-2.0; immutable metadata hem temel hem yayımlayıcı için doğrulandı.
- Yayımlayıcı revizyonu: `e87f176479d0855a907a41277aca2f8ee7a09523`.
- Dosya: `Qwen3.5-4B-Q4_K_M.gguf`.
- Boyut: **2,740,937,888 byte**.
- SHA-256: `00fe7986ff5f6b463e62455821146049db6f9313603938a70800d1fb69ef11a4`.
- URL: `https://huggingface.co/unsloth/Qwen3.5-4B-GGUF/resolve/e87f176479d0855a907a41277aca2f8ee7a09523/Qwen3.5-4B-Q4_K_M.gguf`.
- Aday builtin kimliği: `aya-local:qwen35-4b-q4-k-m`.
- Aynı dosyanın import kimliği: `aya-local:` + SHA'nın ilk 32 hex hanesi.

Motor llama.cpp **b9380**, kaynak commit `d205df6812e204230e9a5c321e34bfe86d7179af`. Windows CPU ZIP 16,067,676 byte, SHA `cd44b61422671f0565cae98d856a70d55ef10392197a49246671f85bacb50dc3`; gerçek EXE SHA `052539ab0e0f77725efa10e7ae857153fcdbdfdfe8dc59d711c64a3c916c627d`. b9380 kaynak kodunda qwen35 mimarisi var ve bu 4B model gerçek Windows'ta yüklendi/çıkarım yaptı. Bu, kullanıcının bilgisayarında hız veya donanım kabulü değildir.

`native-validation-evidence/qwen35-discovery/candidates-metadata.json` resmî/yayımlayıcı immutable metadata ve model-card SHA/ilgili satırlarını içerir. Non-thinking genel görev ayarı T=0.7, top_p=0.8, top_k=20, min_p=0, presence_penalty=1.5, repeat_penalty=1 olarak uygulanır. Yalnız yeni pinin builtin veya aynı hash import kimliği bu profili alır; başka GGUF'nin seçilmiş ayarları değiştirilmez. CAD kernel deterministik kalır.

## 4. Kritik kanıt noktaları

- Eski baseline: `native-validation-evidence/baseline-1.7b/`.
- Eski 4B kontrollü karşılaştırma: `controlled-4b/`.
- Türkçe greedy / non-greedy: `turkish-policy-greedy/`, `turkish-policy-sampling/`.
- İngilizce policy: `english-policy-sampling/` (9 transport, 5 name/memory assertion hatası, kritik CAD yanlışları).
- 2507: `instruct-2507/` (9 transport, 3 name/unit assertion hatası).
- Doğrudan şablon kontrolü: `template-controls/` — 8 gerçek çağrı, kabul testi değil. Temel EN/TR “Adın ne, görevin ne?” hem doğrudan hem bridge üzerinden AYA yanıtı verdi. Aynı Türkçe olumsuz yaratıcı kısıt minimal model çağrısında da bozuldu. Tam messages ve renderedPrompt var; eksik son istek/yanlış Jinja/ardışık user mesajı temel nedeni bulunmadı.
- Qwen3.5 ilk ops: `qwen35-ops/`. Kaynak **08899dcee1310e3a6a00adca38c315557edda151**, run **40728527664**, rapor commit **589e603**. 9 deneme/9 başarı: 5 doğal, 2 bellek, 2 CAD. `semantic-review.md` ayrıntılı RED gerekçesidir.

Gerçek raporda her prompt/output, bellek, proposal, tam gönderilen messages, rendered template, sampling, raw structured JSON, engine/model hash ve kaynak hashleri var. Token callback'leri gerçek SSE akışıdır; structured JSON UI'ya akıtılmaz. Host yalnız loopback ve süreç anahtarıyla çağrılır; buluta fallback yok.

## 5. Yeni bellek sözleşmesi ve korunacak kapılar

Eski kopuk goal/value + memoryPatch maskesi sorunluydu: model doğru yeni veriyi yazıp aynı alanı keep seçiyordu. Parser maskeye uyarak eski boş belleği koruyordu; parser'ı “yeni metin varsa otomatik set” yaparak düzeltmek YASAKTIR.

Yeni `electron/aya/memory-task.cjs` her alan için bitişik işlem üretir:

- goal: `{operation:'keep'}` / `{operation:'set', value:'...'}` / `{operation:'clear'}`.
- decisions/openQuestions: keep veya `{operation:'replace', values:[TAM yeni liste]}`.
- keep dalında value/values grammar ve parser tarafından yasaktır.
- answer sabit `Memory updated`; actions boş; fazladan anahtar, bozuk tip, metin/list sınır aşımı reddedilir.
- Adapter yerleşik `readAgentReply` patch parser'ına map eder. Tam silme yalnız son kullanıcının açık full-reset komutuyla mümkündür; alıntı/soru/asistan/geçmiş/not bu yetkiyi vermez. CAD bağlamı bu task'a girmez.
- 500 karakter hedef, en çok 5 karar/3 soru, 240 karakter giriş; mevcut token/bağlam sınırları korunur. Bellek çağrısı 512 çıktı tokeni kullanır. Ana UI eski standart workingMemory sonucunu almaya devam eder.

Yeni schema/authority testi `scripts/verify-aya-memory-task-schema.cjs`; eski bellek transport fixture'ı yeni JSON biçimine güncellendi. Normal sohbetin başarılı yanıtı ekstraksiyon hatasıyla silinmez; ana oturum/son tur/bellek revizyon kapıları korunmalıdır.

## 6. Son bounded grounding deneyi ve bilinen sınır

Kullanıcı yeni ChatGPT'ye ayrıntılı devir istediği için açık uçlu model ayarı bırakıldı. Yalnız bir kısa cached grounding deneyi başlatıldı:

- Kaynak **9dc9956**.
- Run **40730934136**: `https://github.com/hzsams/dentaya-rc47/actions/runs/40730934136`.
- Rapor dizini `native-validation-evidence/qwen35-grounding/`; rapor commit **131415a**. Sonuç artık tamamlandı: **9 gerçek istek / 8 tam bridge yanıtı**, contractPass false, son CAD yanıtı LOCAL_INVALID_PLAN.
- 27 iç araç kimliği ve parser/allowlist/scope/click kapıları DEĞİŞMEDİ. Alias eklenmedi.
- `view-thickness` açıklaması pozitif kaynak/preparasyon yüzey uzaklığı olarak açıldı; gerçek duvar/kapanış onayı üretmediği belirtildi.
- saveFailed / antagonist yokluğu / rapor yokluğu / shell tahmini, genel planlayıcı metninin önüne gerçek host durumundan türetilen kısa öncelikler olarak kondu.
- Genel sohbet policy'sindeki gereksiz dental priming azaltıldı; yaratıcı bakış açısı/cümle sayısı/konu dışlama ve bekleyen bellek değişikliği netleştirildi.

İlk grounding metni, **tam 27 araç + gerçek kesit + 2048 çıktı rezervi** testinde byte bütçesini aştı (`verify-local-aya.cjs:52`). Test gevşetilmedi; metin kısaltıldı. Son kod checkpoint'i **2760095b4c14085dfcb7497644509bf384319012**; aynı test dahil focused kontroller geçti. Bu commit `[skip ci]` taşır: tamamlanan 40730934136 run'ı ÖNCEKİ 9dc9956 metnini sınadı. Kompakt son kaynağın native çıkarımı ayrıca yeniden doğrulanmalıdır. Bu ayrımı rapordan silme.

### Son gerçek grounding sonucunun yeni bulgusu

40730934136 ham yanıtları artık incelendi. Yaratıcı yanıtta diş/yazılım dışlaması düzeldi ve üç cümle var; istenen birinci kişi rüzgâr çanı bakışı hâlâ net değil. Eksik antagonist/rapor durumunda model artık güvenliği **Bilinmiyor** diyor, kesin duvar değeri uydurmuyor ve inspect öneriyor. Ayrı bellek/recall/partial-clear yine çalışıyor. Doğal sohbet henüz ayrı ekstraksiyon bitmeden “kaydettim/hedef değiştirildi” diyebiliyor; akıcı profesyonel Türkçe de tam değil.

Kritik yeni sorun: CAD planlayıcısı, kendi bulgularını ve önerilerini kullanıcının karar listesine koyarak beş karar yuvasını doldurdu. Sonraki CAD ham JSON'unda iki yeni, farklı model cümlesi daha var. Eski strict merge kapasite kapısı 5+2=7 olduğu için **doğru şekilde atomik olarak reddetti**; son UI yanıtı bu nedenle LOCAL_INVALID_PLAN. Tam raw çıktıyı readAgentReply üzerinden replay ederek union -> updateMemory stack'i doğrulandı. Sınırı yükseltme, eski kararları atma veya testi gevşetme.

Son raw cevap başarısız kaydı ve 0.65 mm'nin tahmin olduğunu görüyor; fakat yerel kurtarmayı belirtmiyor ve mevcut başarılı inspect'e rağmen aynı inspect'i tekrar öneriyor. Dolayısıyla bu aday da kabul edilmedi. Ayrıntı `native-validation-evidence/qwen35-grounding/semantic-review.md` içindedir. En önemli sonraki mimari iş, CAD araç planını/kanıt yorumunu kullanıcıyla alınmış karar belleğinden ayırmaktır: gerçek host sonuçları zaten taze recentActions/report kanalındadır; bunları kullanıcı kararı diye yeniden saklamayın. Güncelleme gerekiyorsa yalnız son kullanıcının isteğiyle ayrı task:memory üzerinden, aynı scope/tur/bellek-revizyon ve iptal kapılarıyla yapın. Bu henüz uygulanmadı.

## 7. Tamamlanan kontroller

Yeni bitişik schema, full-reset yetkisi, immutable input, no-CAD, no-streamed-JSON, boyutlar, model scope'u, cache corruption/truncation reddi, managed indirme/iptal/token bütçesi ve scoped sampling Node testleri geçti. `verify:aya-natural`, `verify:aya-agent`, `verify:aya-core` (katalog, 214 dialogue, 141 memory, conversation, work, references, UI-state/setup) yeni aday üzerinde geçti. Bunlar mock/pure testlerdir, model kalite testi değildir.

2760095 üzerinde yeniden geçenler: verify-local-aya (tam CAD+section+2048 reserve dahil), verify-aya-agent, verify-aya-core, verify-aya-memory-task-schema, verify-aya-memory-task, hedefli ESLint, diff-check. Bu aşamada ana repo Next/build'i çalıştırılmadı; ana repo sahibi ayrı doğruluyor.

İzole clone'daki node_modules, `/workspace/dentaya-rc47/node_modules` hedefine geliştirme için eklenmiş ignored symlink'tir; teslimata/Windows paketine girmez. Npm ci yaparken paylaşılan bağımlılıkları veya ana Next testini bozma.

## 8. Tekrar çalıştırma, cache ve ağ

Shell: `/bin/bash`, `login:false`. Node24.19.0/npm11.9.0. Git HTTPS platform proxy'si çalışıyor; API403 veya boş GH_TOKEN “token lazım” demek değildir. Token değerini isteme/çıkarma/loglama.

Bu buluttan doğrudan HF/API erişimi reddedildi. Windows CI resmî/publisher metadata ve hashli ağırlıkları indirebiliyor. Diagnostic workflow `.github/workflows/native-validation.yml` yalnız deney branch'inde ilgili source yolları push edilince çalışır. Empty commit path filtresini tetiklemeyebilir. Son kompakt kaynağı sınamak için evidenceDirectory ve concurrency group'u yeni benzersiz experiment adına değiştirip push et; `[skip ci]` kullanma. Workflow_dispatch henüz tanımlı değil.

Cache restore/save action pin'i `caa296126883cff596d87d8935842f9db880ef25` (resmî v5). Key motor ZIP hash + model hash içerir. Cache yolu step içinde GITHUB_ENV/RUNNER_TEMP ile ayarlanır; job-level runner context geçerli değildi ve önceki 40727950477 validation aşamasında hiç çıkarım yapmadan durdu. Bu başarısızlığı native deneme diye sayma.

Cold kurulum pahalıdır; cached sonraki deney aynı modelde yeniden indirme yapmaz. Restore sonrası üretim kurucusu boyut/SHA doğrular, save öncesi bağımsız verifier hem ZIP hem GGUF'yi doğrular. Semantic hata olsa da yalnız doğrulanmış asset cache saklanabilir. Ağırlıklar Git, kaynak ZIP, release artifact veya EXE içine girmez. Cache dosyaları kullanıcı eğitim verisi değildir.

## 9. Ana ürüne aktarılabilecek DOSYA LİSTESİ — henüz kabul edilmemiş

`NATIVE_CANDIDATE_UNQUALIFIED.patch` yalnız bu 9 dosyadır; ana repo üzerinden `git apply --check` ile uygulanabilirlik kontrolü yapıldı. **Semantik kabul değildir; otomatik uygulama.**

1. electron/aya-local.cjs — yalnız memory task için ayrı parser.
2. electron/aya/core.cjs — ayrı bellek schema/policy, kısa konuşma policy'si.
3. electron/aya/dialogue.cjs — yalnız profileInstructions policy'si; deterministik eski yardımcıları koru.
4. electron/aya/agent.cjs — yalnız araç açıklaması/host öncelikleri; 27 ID/parser değişmez.
5. electron/aya/managed-runtime.cjs — yeni immutable pin ve yalnız aynı builtin/hash için model-card sampling.
6. electron/aya/memory-task.cjs — yeni adapter/schema.
7. scripts/verify-aya-memory-task.cjs — yeni schema transport fixture.
8. scripts/verify-aya-memory-task-schema.cjs — yeni negatif/pozitif sözleşme testleri.
9. scripts/verify-aya-managed.cjs — builtin/hash profile ve unrelated GGUF tercih korunumu testleri.

`profileInstructions()` son adayda yine argümansızdır; `.d.cts` için eski “locale ekle” notu artık gerekli değildir. Ana repo sürüm/Core metadata'sını koru. Npm verify:aya-natural zincirine yeni schema testini ekle. İsteğe bağlı native verifier agregasyon/tam messages/raw template kaydı, minimal ürün yamasından ayrı incelenebilir. Diagnostic workflow/cache helper'ını ürün workflow'una toptan kopyalama.

Modeli gerçekten kabul edersen ayrıca canlı setup baseline, assistant localSetupGuide, THIRD_PARTY.md/lisans kaynağı, model boyut fixture'ları, kullanım/kurulum/AGENTS/RC raporları güncellenmeli. Eski 1.7 dosyaları ve açık kullanıcı model tercihi silinmez; EXE güncellemesi tek başına modeli seçmez. Kullanıcı yeni modeli kurup seçmelidir. Tarihsel RCxx ve eski dil uyumluluk kataloglarını yeni sonuç diye topluca değiştirme.

## 10. Yeni GPT'nin sonraki kesin işleri

1. Git durumunu ve kökleri doğrula; hiçbir WIP'i reset/clean ile silme.
2. Tamamlanan 40730934136 başarısız sonucunu, qwen35-grounding ham 9 yanıtını ve kapasite replay bulgusunu oku; eski 9-contract pass / semantic reject kanıtını ayrı tut. CAD planı ile açık kullanıcı karar belleğinin yanlış birleşmesini düzelt; strict kapasiteyi gevşetme.
3. CAD/bellek ayrımı ve 2760095 kompakt kod için yeni cached native run başlat. Testleri/2048 rezervi/27 araç ve saveFailure kapılarını gevşetme.
4. Her ham yanıtta ad/purpose, yeni yaratıcı kısıt, unit46+kontur, yalnız bellekten recall, partial clear exact preservation, eksik antagonistte unknown, source-distance vs gerçek wall, güncel failed-save+local recovery önceliğini değerlendir. Doğru ölçüm veya kayıt sonucu uyduran adayı kabul etme.
5. Semantik yeterlilik yoksa ana ürün modelini değiştirme; çalışma belleği sözleşmesinin somut ilerlemesini ve kalan model sınırlamalarını açık raporla. “Gerçek inference var” ile “profesyonel kullanım kabulü var” ayrı.
6. Kabul edilecek en küçük patch'i ana ürüne kontrollü al; ilgili Node, browser ve final source/build/Windows paket kontrollerini tam kaynak üzerinde çalıştır. Tarayıcı/fullverify ortak .next sebebiyle sırayla çalışmalıdır.
7. Kaynak manifestini en son üret; kesin source commit, gerçek Windows installer receipt/CDP, gerçek native report ve kalan canlı kurum/klinik kabulünü ayrı kaydet. RC62 etiketi/paketi bitmiş ilan etme; kök ajanın genel devir durumunu esas al.
