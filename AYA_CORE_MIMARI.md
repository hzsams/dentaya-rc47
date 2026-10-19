# AYA Core 0.2 — RC42

AYA'nın uygulamaya ait çekirdeği, model ağırlıklarından ayrıdır. Bu sürümde yeni temel model eğitilmez veya ince ayar yapılmış olduğu iddia edilmez.

| Katman | Uygulama |
|---|---|
| AYA Core | `electron/aya/assistant.cjs`: sınırlandırılmış çalışma durumu, açıkça eklenen bilgi defteri, Unicode arama, kaynak seçimi, basit deterministik hesap ve iş akışı yanıtları. Tarayıcı ve masaüstünde ortak kod. |
| Belge ve bağlam | `electron/aya/core.cjs`: çalışma rolü/yanıt tercihleri, uygulama dokümanları ve kaynaklı kişisel bağlam; CAD koordinatları ve hasta adları bağlama alınmaz. |
| Yerel kayıt | `src/lib/aya-knowledge.ts`: kullanıcının yazdığı notlar, TXT/MD/JSON içe aktarımı, silme ve JSON aktarımı. Sohbet geçmişi ayrı opt-in ayarıdır. |
| Model yaşam döngüsü | `electron/aya/managed-runtime.cjs`: sabitlenmiş indirme ve SHA-256 kontrolü, devam eden indirme, güvenli arşiv çıkarma, GGUF kopyası ve manifest, yerel süreç başlatma/durdurma. |
| Çıkarım | Açık kaynak llama.cpp b9380; varsayılan açık ağırlıklı Qwen3 1.7B Q8_0. Uyumlu GGUF model eklenebilir. İstekler yalnız rastgele porttaki `127.0.0.1` adresine ve süreç için üretilen anahtarla gönderilir. |
| Konuşma | Akışlı yanıt, istek kimliği, iptal, gerçek model tokenizer'ıyla 8192 token bağlam bütçesi; son soru kesilmez. Buluta otomatik geçiş yok. |
| CAD bağlantısı | Aktif FDI, görev, kole sayısı, kaynak/çene yüklenme, görünürlük ve kayıt durumundan yardım. Otomatik geometri okuma veya klinik karar verme yok. |

Bu ayrım, AYA'nın kayıt/bağlam/araç katmanını her sürümde ilerletirken çıkarım motorunu değiştirebilmeyi sağlar. Sonraki model eğitimi veya ince ayar çalışması için ayrı veri hazırlama, kullanım izni, eğitim kaynağı ve değerlendirme kümesi gerekir; RC42'de bunların tamamlandığı söylenmez.

Motor/model lisansları ve sabit sürüm kaynakları: `electron/aya/licenses/THIRD_PARTY.md`.
