# DentAYA Windows paketleme devri

Bu not 28 Ekim 2026 tarihinde yeni ChatGPT/Codex oturumuna aktarılmak için hazırlanmıştır. **Gerçek bir Windows kurucusu üretildi ve içinden çıkarılan uygulama açılarak doğrulandı. Ancak bu bir tanı dalının ön kontrolüdür; güncel RC62 kaynağının son kurucusu veya yayımlanmış RC62 teslimatı değildir.** AYA'nın gerçek model kalitesi ayrıca tamamlanmalıdır.

## Depolar, dallar ve çalışma klasörleri

- Ürün deposu: https://github.com/hzsams/dentaya-rc47.git
- Güncel geliştirme klasörü: `/workspace/dentaya-rc47`, dal `professional-workflow`. Web sitesi deposu bu uygulamanın kaynağı değildir.
- Windows tanı klonu: `/workspace/dentaya-windows-ci-check`, dal `codex/windows-package-validation`. Bu normal, ayrı bir Git klonudur; worktree değildir. Bu dal yalnız Windows sorunlarını ortaya çıkarmak ve kanıt toplamak içindir.
- Tanı dalı bağlantısı: https://github.com/hzsams/dentaya-rc47/tree/codex/windows-package-validation
- Son kontrol sırasında tanı klonunun HEAD'i `88e9d8f32173c6c8e4135eafb7aae02f6874528e` idi. Bu, raporları ekleyen bot commitidir. **Test edilen kaynak commit'i farklıdır:** `61ee56824704c8937fbace10e77947e30d96653a`.
- Ana üründeki beş Windows taşınabilirlik düzeltmesi zaten `a33d6e951f1608db34089d35e31f44a9ae971fd0` ile benimsendi. Patch'i tekrar uygulamayın.
- Son çalışma kodu `a8e34b4`; devir belgeleri ve geliştirme bütünlük manifesti sonraki devir commitinde eklendi. Devir etiketi tüm kaynak snapshot'ını sabitler. Uzak/yerel durumu yeni görevde yine kontrol edin.
- Uzak `main` son kontrolde hâlâ RC61 commit'i `4b6a36047410eeae1ba5057b6a7a69604f662909` idi. `v1.0.0-rc.62` etiketi henüz yoktu. RC62'nin yayımlandığını varsaymayın.

## Gerçek Windows ön kontrolünün kesin sonucu

Çalışma: https://github.com/hzsams/dentaya-rc47/actions/runs/40673513656

| Alan | Gerçek kayıt |
|---|---|
| Test edilen kaynak | `61ee56824704c8937fbace10e77947e30d96653a` |
| Ürün tabanı | `4588013`; üzerine Windows test/araç taşınabilirliği ve tanı iş akışı eklendi |
| İşletim sistemi | GitHub `windows-2025`, `win32` |
| Araçlar | Node `24.19.0`, npm `11.9.0`, Electron `44.4.5`, electron-builder `26.15.3` |
| Kaynak kontrolü | Temiz kaynak/commit kontrolü ve 2689 dosyalık ham SHA-256 manifesti geçti |
| Doğrulama | Tam `npm run verify` geçti: lint, TypeScript, CAD/kernel, veri/çeviri kontrolleri ve üretim build'i dahil |
| İlgili testler | 52/52 paketleme, gerçek ASAR, artefakt ve CI/publisher testi geçti |
| Paketleme | Gerçek NSIS kurucu üretildi; yalnız dosya adı/MZ kontrolüyle yetinilmedi |
| Kurucu dosyası | `DentAYA-Setup-1.0.0-rc.62.exe` |
| Kurucu boyutu | **279376003 bayt** |
| Kurucu SHA-256 | **`22b9986ee83304da0843602185a7c5c8dd0f8a1973a6f1cfa152d4011ed81e78`** |
| Kurucu PE mimarisi | `332` / `0x14c`: NSIS x86 önyükleyici, geçerli |
| İç uygulama | `DentAYA.exe`, x64: `34404` / `0x8664` |
| İç uygulama SHA-256 | `5e370102709534169cb496860cc60876e4eb42680b8b875c55a5150d01cf4b9b` |
| Next BUILD_ID | `RpPr4Way9_Aq_RlfTMDpm` |
| Manifest SHA-256 | `81d1d3cb9fb2b94c592ea4069cd8a12a251eaab6fe7dfd11780f7c582a44b907` |
| ASAR SHA-256 | `743fd18a3e9c4ee235e2c763c6d62a9f1ee62d3a52c2428ff096a7024c3d1968` |
| Paket içeriği | 208 Electron kaynak dosyası; 1924 standalone, 126 static, 1020 public dosyası |
| Gerçek masaüstü açılışı | Kurucudan çıkarılan Electron, yeni profil, paket içindeki yerel Next sunucusu, gerçek preload/IPC köprüsü |
| Rotalar | `/workspace`, `/ai`, `/settings`: doğru rotada documentReady, bridge, IPC ve hesapsız açılış başarılı |
| Renderer hatası | 0 |
| Model çıkarımı | Bu iş akışında çalıştırılmadı; native işi tanı dalında özellikle atlandı |
| Canlı kurum/backend | Test edilmedi |
| Yayım | Yapılmadı; tanı dalından release yayımlanmaz |

Kurucunun içine model ağırlıkları konmadı. Builder günlüğündeki “signing with signtool.exe” satırlarından gerçek bir yayıncı sertifikasıyla imzalandığı sonucunu çıkarmayın; bu ön kontrol Authenticode yayıncı sertifikası onayı değildir.

## Kanıtların yeri ve nasıl okunacağı

Ürün kaynağına alınan, kapsamı açık kanıtlar:

`/workspace/dentaya-rc47/verification/RC62/installer-preflight/`

Bu klasör `61e976d` ile ürün geçmişine alındı. `SCOPE.md` eski kaynak kapsamını açıkça anlatır. `result.json` her gerçek iş adımının sonucunu; `windows-build-receipt.json` kurucu, kaynak, ASAR, Next ve smoke hashlerini; `desktop-smoke-report.json` gerçek Electron/IPC açılışını içerir. Diğer dosyalar `source-check.txt`, `dependency-install.txt`, `full-verify.txt`, `packaging.txt`, `artifact.txt`, `SHA256SUMS.txt` dosyalarıdır.

Tanı klonundaki özgün kayıtlar:

`/workspace/dentaya-windows-ci-check/windows-validation-evidence/40673513656-1/`

GitHub üzerinden kalıcı metin/JSON kanıtı:

https://github.com/hzsams/dentaya-rc47/tree/codex/windows-package-validation/windows-validation-evidence/40673513656-1

Ürün içindeki kopya metin günlükleri LF ile saklanır; kurucu boyutu/hashleri ve JSON provenance değerleri değiştirilmedi. Ön kontrolün kaynak manifestindeki `windowsInstallerProduced:false` **derleme öncesi durumdur**; gerçek çalışmanın son receipt'i `windowsInstallerVerified:true` içerir. Bu farklı kayıtları tek bir zamana aitmiş gibi yorumlamayın.

GitHub Actions artefaktı `verified-windows-installer` adını taşır ve kurucuyu içerir; saklama süresi 14 gündür. EXE Git'e commit edilmedi ve bulut çalışma klasörüne indirilmedi. Bu eski artefakt son RC62 olarak kullanıcıya gönderilmemelidir. Son kaynağın yeni etiketli çalışması ayrı kurucu üretmelidir.

## Benimsenmiş beş taşınabilirlik düzeltmesi

Ana ürün commit'i: https://github.com/hzsams/dentaya-rc47/commit/a33d6e951f1608db34089d35e31f44a9ae971fd0

1. `scripts/verify-windows-packaging.mjs`: Windows TEMP `C:\Users\RUNNER~1` gibi 8.3 kısa ad döndürebiliyor. Üretim `inspectProject` gerçek yolu döndürdüğü için fixture dizini `fs.realpath(await fs.mkdtemp(...))` ile aynı kanonik biçime alındı. Katı yol kontrolleri gevşetilmedi.
2. `scripts/verify-dental-facts.ts`: `new URL(...).pathname` Windows'ta `/D:/...` üretip Node çocuk sürecini yanlış dosyaya yönlendiriyordu. Dosya yolları `fileURLToPath` ile çevrildi. İçerik kataloğunu ezme yasağı ve importer negatif kontrolleri korundu.
3. `scripts/ui-visible-keys.mjs`: Windows ters eğik çizgileri `/i18n` kontrolünü bozuyor ve çeviri metadata'sı ekrandaki metin sanılıyordu. Hariç tutma dizin adına göre yapılıyor.
4. `scripts/localize-ui.mjs`: Generator içindeki göreli yollar `path.posix.join` ile tutarlı kaldı; Windows yanlışlıkla i18n dosyalarını/layout'u yeniden yazmamalı.
5. `scripts/verify-visible-translations.mjs`: Gerçek geçici ağaç üzerinde i18n metadata'sının ekrandaki metne karışmadığını sınayan regresyon eklendi.

Patch arşivi `/workspace/dentaya-windows-portability.patch` içinde de vardır; **zaten uygulanmıştır**. Tanı dalının workflow, manifest veya rapor commitlerini topluca cherry-pick etmeyin. İlgili kod düzeltmeleri zaten ürün dalındadır. Beş düzeltme Linux'ta 52 test, 2490 görünen metin ve bilgi importer kontrolleriyle; Windows'ta tam zincir ve gerçek paketle doğrulandı.

## Son RC62 öncesinde hâlâ yapılacaklar

1. AYA'nın gerçek model, çalışma belleği ve CAD yanıt kabulünü sonuçlandırın. Ön kontrol bunu kanıtlamaz. Native sözleşme geçmesi de tek başına anlam/doğruluk/klinik onay değildir.
2. Son CAD canlı durum şeridi ve model değişiklikleri dahil güncel ürün kaynağının gerekli Node/tarayıcı/genel kontrollerini tamamlayın. Paylaşılan `.next` nedeniyle browser, build ve genel verify zincirleri aynı çalışma klasöründe sırayla çalışmalıdır.
3. Metadata uyumunu denetleyin: `package.json`, `package-lock.json` kök ve root-package sürümü, `src/lib/release.ts`, `src/lib/supabase.ts` istemci kimliği, `.env` örnekleri, tek CMD, kullanım/kontrol belgeleri, dışa aktarılan 1008 kayıt kataloğu. Hedef `1.0.0-rc.62`; önceki RC'leri sırayla kurma zorunluluğu eklemeyin.
4. **Mevcut ürün `PAKET_BUTUNLUK.json` hâlâ RC61 manifestidir.** Güncel kaynak için yeniden mühürlenmeden etiket çıkarmayın; yeni CI ilk adımda durur. Sadece `release` alanını değiştirmek yeterli değildir. Tüm teslim dosyalarının ham byte boyutu/SHA-256 değeri yeniden hesaplanmalı; `.git`, node_modules, .next, sırlar, geçici fixture, modeller ve derlenmiş EXE/DLL kaynak ZIP'e katılmamalıdır.
5. Yeni raporları doğru kaynak/test scope'u ile oluşturun, ardından manifesti son kez yazın. Yardımcılar `/workspace/seal-dentaya-source.py` ve `/workspace/run-dentaya-check.py` içinde bulunuyor; kullanmadan önce okuyun. Manifest kendi hashini listelemez. Yeni metin kanıtlarını LF biçiminde tutun; commit edilen blob ile çalışma dosyasının byte eşitliğini kontrol edin.
6. `node scripts/verify-source-integrity.mjs`, `npm run verify:release`, temiz kaynak/commit denetimi ve gerekli son kontroller geçmeli. Next dev'in değiştirdiği `next-env.d.ts` yalnız üretilmiş development import farklarıysa son build/manifest öncesi dikkatle düzeltilmeli; başka kişinin değişikliğini ezmeyin.
7. Tamamlanmış kaynak commitini normal fast-forward ile koruyun. Son etiket `v1.0.0-rc.62` ancak bu commit'e işaret etmeli. `main`e geçiş gerekirse mevcut uzak tarihi inceleyin; yerel çalışmayı silmeyin, force push veya var olan etiketi yeniden hedefleme yapmayın.
8. Son etiket ana Windows release workflow'unu çalıştırır. Son kaynakta model/CAD değişikliği varsa eski `61ee568` receipt'ini yeni etiketin kanıtı olarak kullanmayın.
9. Yeni çalışmanın gerçek kurucu ve native kanıtlarını kontrol edin. Yayımlanan EXE'yi gerçek release indirme adresinden indirip boyut/SHA/PE ile yeni receipt/provenance'a bağlayın. Eski ön kontrolün EXE hashini yeni kurucuda beklemeyin.

## Ürün iş akışının tam sırası

Ana ürün dosyası `.github/workflows/windows-release.yml` yalnız `v1.0.0-rc.*` etiket push'u ve `workflow_dispatch` ile başlar. Dal/manual çalışması tek başına release yayımlamaz. Aksiyonlar sabit resmî SHA'lara bağlıdır. `windows-release-${github.ref}` concurrency grubu iptal etmeden çalışır.

`windows-build` işi `windows-2025` üzerinde, 45 dakika sınırıyla:

1. Tam `github.sha` checkout, tam geçmiş, build işinde Git yazma kimliği saklanmaz.
2. Node 24.19.0 ve npm 11.9.0 seçilir; sürüm gerçekten kontrol edilir.
3. `verify-windows-ci-source.mjs` tam 40 haneli commit, `HEAD`, temiz tracked kaynak, lock/package uyumu ve varsa dereference edilmiş etiket eşitliğini denetler.
4. `verify-source-integrity.mjs` teslim manifestindeki her dosyanın ham boyut/hashini kontrol eder.
5. Runner'ın tam `7-Zip/7z.exe` aracında **NSIS decoder** bulunduğu doğrulanır.
6. `npm ci --no-audit --no-fund` normal kurulum scriptleriyle çalışır. Windows paketlemede `--ignore-scripts` kullanmayın.
7. `npm run verify`: tüm kaynak kontrolleri ve üretim Next build'i.
8. `npm run desktop:package`: zaten doğrulanmış build'i paketler; Node üzerinden npm-cli.js çağrısı, Electron bütünlüğü, taze deneme klasörleri ve sınırlı kilit tekrarları korunur.
9. `verify-windows-artifact.mjs`: gerçek NSIS'in içindeki `app-64.7z` çıkarılır; builder'ın pinli 7za aracıyla yük açılır. ASAR Electron dosya listesi/byte'ları, Next standalone/static/public ağaçları, BUILD_ID, PE mimarileri, `.env`/model dışlama denetlenir. Çıkarılmış gerçek Electron yeni profille CDP üzerinden üç rotayı ve gerçek IPC'yi açar.
10. Kaynak guard'ı tekrar çalışır. Dört build artefaktı yüklenir; saklama 14 gündür.

`windows-native` işi ayrı `windows-2025` runner'ında, 25 dakika sınırıyla:

- Aynı tam kaynak ve manifest/lock denetlenir; normal npm ci yapılır.
- `scripts/run-windows-aya-native.cjs` mevcut pinli motor/modeli geçici dizine indirir ve boyut/SHA'yı tekrar doğrular. Gerçek konuşma 5, bellek 2, sentetik CAD 2 olmak üzere 9 çağrı hedefler. Gerçek CAD geometri komutu çalıştırmaz.
- Ağırlıklar temizlenir. Kurulum/çıkarım başarısız olsa da taze JSON ve metin raporları oluşturulur; eski PASS dosyası kullanılamaz. Mock bağımlılık verilirse provenance `test-fixture` olur, gerçek native gözlemi olarak sunulamaz.
- Her durumda `source-provenance.json` tam commit, version, runId, runAttempt ve `job:windows-native` içerir.

`publish` işi yalnız tam etiket çalışmasında, build başarılıysa ve native işi success/failure ile bitmişse çalışabilir. İptal/skipped native işi yayıma yeterli değildir. Başarısız native sonucu **gizlenmeden** kurucu yayımlanabilir; bu anlamsal kabul olduğu anlamına gelmez. Eksik native kanıtı yayımı engeller.

Publisher `scripts/publish-windows-release.mjs` aynı commit/tag/version/manifest, kurucu byte/hash/mimari, receipt/BUILD_ID, smoke hashleri, üç rota, sıfır renderer hatası ve native provenance denetler. Native rapor aynı workflow run'ından olmalı; yalnız önceki runAttempt aynı run'ın publish yeniden denemesinde kabul edilir. Native `passed` iddiası gerçek 9 çağrı/contract/model doğrulama kanıtı gerektirir. İnsan anlamsal incelemesi her zaman ayrı kalır.

Release önce draft açılır, aşağıdaki **sekiz** dosyanın yüklenen byte boyutu/SHA digest'i GitHub tarafından da doğrulanır, sonra draft yayımlanır:

1. `DentAYA-Setup-1.0.0-rc.62.exe`
2. `SHA256SUMS.txt`
3. `windows-build-receipt.json`
4. `desktop-smoke-report.json`
5. `native-inference-report.json`
6. `windows-native-result.json`
7. `native-acceptance.txt`
8. `source-provenance.json`

Mevcut release başka commit/byte içeriyorsa publisher üzerine yazmayı reddeder. Bunu force/delete/etiket taşıma ile aşmayın. Aynı byte'lı tamamlanmış release no-op olarak kalabilir; yarım draft yalnız aynı doğrulanmış dosyalarla tamamlanabilir. Yeni değişiklik gerekiyorsa sürüm/etiket stratejisini dürüstçe yeniden değerlendirin.

Henüz oluşmamış son RC62 adreslerini çalışır teslimat gibi vermeyin. Gerçek yayımdan sonra beklenen kalıcı adres biçimi `https://github.com/hzsams/dentaya-rc47/releases/tag/v1.0.0-rc.62` ve `/releases/download/v1.0.0-rc.62/DentAYA-Setup-1.0.0-rc.62.exe` olur.

## Ağ engeli ve tanı raporlarını alma yöntemi

Bu bulut ortamında GitHub HTTPS Git proxy işlemleri çalışırken doğrudan `api.github.com` istekleri 403 alabiliyordu. Token değişkeninin boş olması Git kimliğinin yokluğu anlamına gelmez. Kimlik bilgilerini çıkarmayın, loglamayın veya kullanıcıdan PAT istemeyin. Mevcut proxy ile önce `git fetch`/`git ls-remote` deneyin.

Tanı dalı workflow'u ana üründen farklı olarak kendi dal push'unda da çalışır; native işi yalnız bu dalda atlar. Ayrı `preserve-preflight` işi, Actions'ın sağladığı repo-scoped kimlikle küçük izinli raporları indirir ve `windows-validation-evidence/RUNID-ATTEMPT/` altında commit eder. Bu iş yazma yetkisi taşır; build işi read-only kalır. Raporlar2 MiB/dosya ile sınırlıdır; EXE, ağırlık veya sır Git'e eklenmez. Bot FF/rebase ile push eder; force yoktur. Yalnız kanıt değişiklikleri yeniden build tetiklemez.

Yeni oturum raporları `git -C /workspace/dentaya-windows-ci-check fetch origin codex/windows-package-validation` ile çekebilir; worktree temiz ve uygun durumdaysa `git merge --ff-only FETCH_HEAD` ile ekleyebilir. Yerel değişiklik varsa kör pull/reset yapmayın. Actions'ın gerçek UI sayfası durum için okunabilir; API 403ile başarılı/başarısız sonuç tahmin edilmez.

Bu workaround yalnız tanı dalındaki rapor toplamadır. Tanı workflow'unu ana ürüne topluca kopyalamayın; son etiket workflow'u kendi sekiz yayımlanmış varlığını üretmelidir. Git'teki küçük raporlar kurucunun byte'larını buluta indirdiğinizi kanıtlamaz.

## Korunacak Windows dosya sistemi/izin önlemleri

- Modern Node'da `execFile('npm.cmd',...,shell:false)` geçerli yol değildir. `readNpmVersion` Node ve npm-cli.js kullanır. Bunu `shell:true` ile kaba biçimde değiştirmeyin; boşluk/shell karakteri regresyon kontrolleri vardır.
- Windows kısa 8.3 TEMP yolu ile `realpath` sonucu aynı dosyanın farklı yazımlarıdır. Kanonikleştirme uygulayın; kapsam/kaçış kontrollerini gevşetmeyin.
- `URL.pathname` dosya yolu değildir. Windows drive harfi ve URL kodlaması için `fileURLToPath` kullanın.
- Dizin filtrelerinde POSIX eğik çizgisine güvenmeyin. Yol semantiğini açık tutun; i18n metadata'sını kullanıcı ekranı sanıp45 paketi topluca bozmayın.
- `.gitattributes` içindeki `* text=auto eol=lf` önemlidir. Windows `core.autocrlf=true` kaynak hashlerini değiştirebilir. Gerçek Git regresyonu LF, eski CRLF/mixed log ve binary byte'larını denetler. Gerekçesiz toplu `git add --renormalize` yapmayın.
- `MZ` tek başına geçerli PE kanıtı değildir. Sahte/truncated header/section ve yanlış mimari reddi korunmalıdır. NSIS x86 olabilir, iç Electron ve `d3dcompiler_47.dll` x64 olmalıdır.
- Tam 7z NSIS decoder gerekir; builder'ın sınırlı7za aracı tek başına dış NSIS'i açamaz. İkinci aşamadaki gömülü7z yükü pinli builder aracıyla açılır.
- OneDrive/kilitliDLL `EPERM`/`EBUSY` geçmişi vardır. TekCMD, `%LOCALAPPDATA%\DentAYA\Builds` altında ayrı çalışma klasörü, taze paket deneme dizinleri, sınırlı retry ve eski geçerli çıktıyı koruma davranışları sürmelidir. CMD'deki eski `rc52-...` klasör adı gerçek uygulama sürümü değildir; paket/lock/release/EXEadı esas alınır.
- Eksik Electron dağıtımı kendi pinli paketinin kurucusuyla tamamlanır; sadece `version` dosyası uydurulamaz. Child environment'ta x64/win32 seçilir; etkileyen override/skip değişkenleri yalnız çocuk süreç için temizlenir. TLS veya checksum doğrulamasını devre dışı bırakmayın.
- `after-pack.cjs` gerçek standalone ve node_modules içeriğini kopyalar; `.env*` dosyalarını paketten dışlar, kaynak dosyaları silmez. Model ağırlıkları ve kişisel kayıtlar EXE veya kaynak ZIP'e girmez.
- Gerçek smoke `--user-data-dir` ile yeni profil kullanır. Normal DentAYA-Desktop kullanıcı profili/kurtarma verisini temizlemeyin. Yetki, üst-frame/origin ve pencere sahibi IPC kontrollerini koruyun.
- Linux bulutunda npm'in varsayılan önbelleği yazılamıyordu; `/workspace/.cache/npm` kullanıldı. Linux geliştirmedeki `npm ci --ignore-scripts` seçeneğini Windows dağıtım hazırlığına kopyalamayın.

Bu ön kontrolün başarı sınırı nettir: belirtilen eski kaynak commit'inden gerçek kurucu üretildi ve çıkarılan uygulama gerçekten açıldı. Güncel son kaynak/etiket/EXE, AYA'nın anlamsal kalitesi, kullanıcının 16 GB RAM bilgisayarındaki performans ve canlı kurum/klinik kabulü hâlâ ayrı doğrulama ister.

## Devir mühürleme güncellemesi

Bu notun hazırlandığı anda eski RC61 manifesti vardı. Devir paketlemesinde PAKET_BUTUNLUK.json, RC62 **development-handoff** statüsüyle güncellendi ve kaynak bütünlüğü ayrıca sınandı. Bu final RC62 sürüm/Windows onayı değildir. Yeni CAD dahil ana ürün full verify, 117,688 saniyede geçti; verification/RC62/current-source kaydına bakın. Son ürün kurucusu ve semantik model kabulü hâlâ açık.
