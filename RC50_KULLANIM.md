# DentAYA RC50 / AYA Core 0.8

Kurulum: [KURULUM.txt](KURULUM.txt). RC48 modülleri ve RC49 temel sohbet özellikleri korunur. Bu teslim kaynak güncellemesidir; hazır Windows EXE içermez.

## Sohbetten çalışma belleği

AYA'ya bu üç satırı birlikte gönderebilirsiniz:

```text
Hedefimiz: Cuma teslimini hazırla
Karar: Önce prova kontrolü
Açık soru: Kurye saati?
```

Ardından “Hedefimiz neydi?”, “Kararlarımız neler?” veya “Açık sorularımız neler?” diye sorun. Güncel notlar Sohbet ayarları → Bellek ve notlar bölümünde de görünür.

- Hedefi değiştirme: `Hedefi değiştir: Pazartesi teslimini hazırla`
- Kararı düzeltme: `Karar 1: Önce antagonist verisini kontrol et`
- Kararı kaldırma: `1. kararı sil`
- Yanıtlanan soruyu kapatma: `1. açık soruyu kapat`
- Çalışma notlarını temizleme: `Çalışma belleğini sıfırla`

İngilizce karşılıkları `Goal:`, `Decision:`, `Open question:`, `Replace decision 1:`, `Close open question 1` ve `Clear working memory` biçimindedir.

Hedef 500, her karar/açık soru 240 karakterle sınırlıdır; en fazla 5 karar ve 3 açık soru tutulur. Çok satırlı komutların tamamı birlikte doğrulanır. Bir satır geçersizse veya kapasite aşılırsa önceki bellek korunur. Aynı satırda ikinci bir görev eklemek yerine her bellek komutunu ayrı satıra yazın.

Bunlar bu sohbetin çalışma notlarıdır; model eğitimi veya vaka veritabanına yazma işlemi değildir. Yeni sohbet boş bellekle başlar. Geçmişi kaydetme kapalıysa notlar yeni oturumda korunmaz. CAD sohbetinin belleği kendi proje/kaynak/ünite kapsamındadır.

## Bir mesajdaki birkaç iş

```text
Önce 12 cm kaç mm?
Ardından teslim notu taslağı hazırla
```

Core desteklenen en fazla 6 hesaplama, birim/yüzde dönüşümü, kontrol listesi, teslim taslağı ve temel bilgi sorusunu sırayla yanıtlayabilir. Teslim taslağı hedef, karar ve açık soruları kullanır; eksik vaka, materyal, gerçek kontrol sonucu ve teslim tarihi yerine doldurulacak alanlar bırakır. Taslak kendiliğinden gönderilmez.

Yanıttan sonra “Bunu daha kısa anlatır mısın?” yazabilirsiniz. Desteklenmeyen bir görevi diğerlerinin arasında sessizce tamamlanmış saymaz. CAD işlemleriyle başka tür görevleri aynı istekte birleştiremiyorsa hangi CAD adımını istediğinizi netleştirir.

## Model kapalıyken CAD yardımı

CAD içindeki AYA'ya “Sıradaki adım ne?”, “Güncel kontrol raporunu yorumla”, “Antagonist temas kontrolünü yapabilir miyiz?” veya “Bu projeyi kaydet ve çık” yazın.

Güncel çalışma bilgisi ve kullanılabilir araç varsa öneriler Uygula düğmesiyle görünür. AYA sohbeti geometriyi kendiliğinden değiştirmez. Proje, kaynak, ünite veya geometri/ayar durumu değişmişse eski öneri uygulanamaz. Başarı ve hata mesajı gerçek CAD callback sonucundan gelir.

Güncel geometri kontrolünden sonra **Güncel durumu değerlendir** düğmesiyle rapor yorumunu yenileyin. Antagonist veya güncel rapor yoksa ölçüm uydurulmaz. Kabuk duvar değeri tahmindir; kaynak mesafesi gerçek duvar kalınlığı değildir. Temas örnekleri klinik oklüzyon veya üretim onayı sayılmaz.

Yerel model hazırken normal sohbet ve yeni ifadeler modele gider. Açık bellek komutları, bellek panelindeki düzenlemeler gibi doğrudan uygulanır. Model hatası veya iptal, yapılmış CAD işlemi ya da başarılı bellek değişikliği olarak sunulmaz.

Doğrulama ve kalan işler: [RC50_KONTROL_RAPORU.md](RC50_KONTROL_RAPORU.md).
