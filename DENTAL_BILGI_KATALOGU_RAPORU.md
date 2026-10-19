# Diş bilgisi kataloğu — içerik ve kapasite kaydı

Tarih: 19 Ekim 2026.

Uygulamada **220 farklı TR/EN bilgi kartı, 28 kaynak grubu** bulunur. İstenen **30.000 gerçek bilgi henüz sağlanmamıştır**. Uygulamanın sayacı yalnız teslim edilen kayıtları sayar. Test verileri, dil çevirileri, sayı değişiklikleri, olgu/radyografi cevapları veya aynı cümlenin varyasyonları bilgi sayısına eklenmez.

## Bu değişiklikte yapılanlar

- Devralınan 200 kart korunur. Üst/alt çene, eklem, damak/dudak yarıkları ve tükürük bezleri hakkında 20 ayrı temel bilgi eklenir. Yeni kartlar tedavi reçetesi, ilaç dozu veya kişiye özel klinik öneri içermez.
- 20 ek kaydın her biri, MedQuAD içinde korunmuş NIH MedlinePlus metnindeki belirli bir pasajı ve sabit Git commit bağlantısını taşır. Üç kaynak dosyasının SHA-256 değerleri sabitlenir. Arşivdeki pasajlar okunmuş ve alıntıların dosyalarda bulunduğu betikle denetlenmiştir. Türkçe özet/çeviri DentAYA için bu çalışmada hazırlanmıştır; bağımsız klinisyen veya çevirmen onayı alınmış sayılmaz.
- MedQuAD yayını CC BY 4.0 lisanslıdır. Kaynak adları, özgün bağlantı, Asma Ben Abacha/Dina Demner-Fushman atfı, uyarlama açıklaması ve lisans bağlantısı yeni kaynak kayıtlarında saklanır. Eski 200 kart için bu çalışmada yeni bir lisans veya klinik kontrol iddiası üretilmez.
- Önceki `reviewedAt` alanı `contentUpdatedAt` ve `clinicalReviewStatus: "not-recorded"` ile değiştirilir. Bir dosya tarihi klinik doğrulama gibi gösterilmez.
- Kayıt şeması; kaynak, TR/EN tek cümle, uzunluk, benzersiz kimlik ve güvenli HTTPS bağlantılarını denetler. Unicode, harf büyüklüğü, noktalama ve yalnız sayıları değiştirilmiş tekrarlar reddedilir. Bu kontrol anlamsal tekrarları, kaynak otoritesini veya klinik doğruluğu tek başına kanıtlamaz.
- Tekrarsız dolaşım 30.000 kayıtta 120.000 baytlık `Uint32Array` indeks destesi kullanır; kart metinleri desteye kopyalanmaz. Dil seçimi ayrı küçük modüle taşınarak yalnız dil kodu isteyen ekranların bilgi JSON'una bağımlılığı kaldırılır.

## 30.000 kayıt için incelenen somut kaynaklar

| Kaynak | Gözlem | Neden 30.000 kart olarak alınmadı? |
| --- | --- | --- |
| [MedQuAD](https://github.com/abachaa/MedQuAD/tree/577bd37b96c02d1833b2c9eed2de9f96964e96cb) | README 47.457 genel tıp soru/cevabı bildirir. Sabit commit üzerinde gerçek sayım: 11.274 XML, 47.441 soru, 16.407 dolu cevap. | Tamamı diş hekimliği değildir. Üç alt kümede cevaplar telif nedeniyle çıkarılmıştır. Ağız/diş sözcükleriyle tarama ve açık yanlış eşleşmeler çıkarılınca 100 belgede 332 soru, yalnız 133 dolu cevap kalır. Bu bir aday taramasıdır; klinik olarak seçilmiş 133 bilgi demek değildir. |
| [DentiAsk](https://github.com/DebeshJha/DentiAsk/blob/main/README_DentiAsk.md) | README 1.000 panoramik radyografi ve 10.000 VQA kaydı bildirir. | Belirli bir görüntüde hastalık var/yok, yer ve sayı cevaplarıdır; bağımsız genel bilgi kartı değildir. Veri kullanım koşulları OSF sayfasına bırakılmıştır; bu incelemede dağıtım hakkı doğrulanmamıştır. Hiçbir kayıt alınmadı. |
| [DenTab](https://github.com/hamdilaziz/DenTab) | README 2.000 dental fiyat tablosu ve 2.208 tablo-soru çifti bildirir. | Satır, tutar, toplam ve hücre okuma verisidir; diş bilgisi değildir. Kod lisansı veri dağıtım hakkı olarak yorumlanmadı. Hiçbir kayıt alınmadı. |
| [Dental LLM benchmark](https://github.com/Tuminha/llm-evaluation-for-dentistry) | JSON ve README, 30 klinik soru/rubrik içerir. | 30.000 kart değildir; ileri tedavi ve ilaç sorularını kısa yükleme kartına otomatik dönüştürmek uygun değildir. Kaynağın klinik kontrol beyanı DentAYA doğrulaması olarak aktarılmadı. Hiçbir kayıt alınmadı. |
| [MedQA](https://github.com/jind11/MedQA) | README genel tıp sınav soruları ve İngilizce/Çince ders kitabı içeriğini tanımlar. | Dental, kısa, iki dilli kaynak olarak uygun değildir. README üzerinden ticari yeniden dağıtım koşulları doğrulanamadı. Hiçbir kayıt alınmadı. |
| [ITU/WHO dental dataset incelemesi](https://github.com/sergiouribe/dental_datasets_itu) | Kamuya açık dental görüntü veri kümelerinin listesi. | Görüntü/segmentasyon verisi, 30.000 kaynaklı bilgi cümlesi anlamına gelmez. Liste lisansı listelenen tüm verilerin lisansı olarak yorumlanmadı. |

NIDCR sayfasına doğrudan yeni HTTP erişimi ortamda 403 ile engellendi; GitHub HTTPS erişimi çalıştı. Ağ kontrolünü atlatmak veya doğrulamayı kapatmak için değişiklik yapılmadı. Bu kaynak taraması bütün dünyadaki olası kaynakların tükendiği iddiası değildir; incelenen somut adayların 30.000 kullanıma hazır karta dönüşmediğini gösterir.

MedQuAD atfı: Asma Ben Abacha ve Dina Demner-Fushman, “A Question-Entailment Approach to Question Answering”, *BMC Bioinformatics* 20, 511 (2019), [doi:10.1186/s12859-019-3119-4](https://bmcbioinformatics.biomedcentral.com/articles/10.1186/s12859-019-3119-4). Bu çalışmada yalnız üç arşiv kaynağından kısa Türkçe/İngilizce özetler uyarlanmıştır; veri kümesinin veya NIH'nin DentAYA'yı onayladığı iddia edilmez.

## İçerik ekleme yolu

`scripts/import-dental-facts.ts`, ayrıca hazırlanmış kaynaklı TR/EN JSON paketini mevcut katalogla birleştirerek **ayrı bir önizleme** oluşturur. Yeni kayıtlarda kaynak pasajı, atıf ve kullanım koşulu/lisans bağlantısı gerekir. Birleştirme sırasında mevcut kimlik/metin tekrarı, kaynak anahtarı çatışması ve 30.000 kapasite sınırı denetlenir. Var olan önizleme dosyası ve uygulamanın ana kataloğu doğrudan üzerine yazılmaz.

```bash
node --import tsx scripts/import-dental-facts.ts --input /tmp/yeni-kartlar.json --check
node --import tsx scripts/import-dental-facts.ts --input /tmp/yeni-kartlar.json --output /tmp/katalog-onizleme.json
```

Biçim `src/lib/dental-fact-schema.ts` içindedir; yeni üç kaynak grubu ve `dental-201`–`dental-220` kayıtları gerçek örnektir. Komut yeni içerik üretmez, klinik/çeviri kontrolü yapmaz ve kendiliğinden uygulamada yayımlamaz.

Hedefe ulaşmak için **29.780 ek, birbirinden farklı, kaynak ve yeniden kullanım hakkı izlenebilir TR/EN içerik** ile bunların konu/dil/klinik editörlük kontrolü gerekir. Bu eksik içerik bu teslimatta varmış gibi sunulmaz. 30.000 kaydın tüm metinleriyle gerçek istemci paket boyutu, okuma süresi ve editörlük kabulü de ayrıca doğrulanmalıdır; indeks/şema kapasite testi bu sonucun yerine geçmez.

## Doğrulama

```bash
node --import tsx scripts/verify-dental-facts.ts
node --import tsx scripts/verify-loading-play.ts
python3 scripts/audit-dental-sources.py /tmp/dentaya-medquad-audit
```

Bilgi testi ana `verify:loading-play` zincirine de bağlanır. 220 gerçek kartın yapısı, 20 yeni kaydın kaynak metadatası, hatalı/tekrar içerik reddi, kaynak dosyasını koruyan ithal komutu ve 30.000 **açıkça sentetik, yalnız testte oluşturulan** kaydın şema/indeks kapasitesi denetlenir. Sentetik kayıtlar ürün JSON'una veya bilgi sayacına yazılmaz.

Yeniden üretilebilir kaynak taraması sabit MedQuAD commit ve SHA-256 değerlerini kontrol eder; yeni 20 alıntının kaynak pasajında birebir bulunduğunu denetler. Sonuçlar `verification/professional/dental-source-audit.json` ve `verification/professional/dental-facts.json` içindedir. Bu kontroller klinik/üretim sertifikasyonu değildir.
