# DentAYA — Codex teknik devir notu

Tarih: 18 Ekim 2026. Durum: **geliştirme devri; kuruluma hazır RC47 değildir.**

## Başlangıç ve doğru sürüm

Son teslim edilen kaynak: DentAYA_RC46_Tek_Paket.zip.
Temel uygulama: 1.0.0-rc.46.
Temel ZIP SHA-256: 108124bbbb6d5b90c211304c238a11bf3a7438494b67d79b0d4485d88ac530b1.
Önceki paketleme tabanı: RC45 Onarım 2.

Bu klasör RC46'nın tam kaynakları üzerine başlanmış AYA/CAD değişikliklerini içerir. Kullanıcı geliştirmeyi Codex'e taşımak istediği için çalışma burada donduruldu. Yeni değişiklikler RC47 olarak bitirilmedi veya yayınlanmadı. package.json, kilit dosyası, CMD ve release etiketleri hâlâ RC46'dır. Başlangıç promptu CODEX_BASLANGIC_PROMPTU.md içinde.

README dışındaki eski RCxx belgeleri o sürümlerin tarihsel kayıtlarıdır; bu geliştirme kopyasının test raporu değildir. RC46'nın önceki test başarılarını yeni değişikliklerin doğrulaması olarak sunma.

## Kullanıcının en son hedefi

AYA'yı yeni ifadelerle konuşabilen, konuşma hedefini ve kararları taşıyan, gerçek CAD bağlamını kullanıp mevcut araçları önerebilen, kullanıcı uyguladığında sonuçları yeniden yorumlayan yerel bir asistana dönüştürmek.

Hazır soru sayısını artırma bu hedefin yerine geçmiyor. CAD manuel ve deterministik kalacak; asistan isteğe bağlı. Yeni çalışma temel model eğitimi veya bilinç iddiası değildir.

## Projenin önemli yerleri

- package.json / package-lock.json: bağımlılıklar, tüm verify komutları, sürüm.
- src/app/design/DesignStudioClient.tsx: aktif vaka, ünite, görev, ayarlar, sahne bağlantısı ve kalıcılık.
- src/app/design/DesignViewport.tsx: Three.js sahnesi, gerçek CAD motorları, viewport handle.
- src/lib/cad-workflow.ts: files/margin/fit/anatomy/freeform/contacts/inspect/review görevleri ve geçiş kapıları.
- src/lib/cad-job-setup.ts: restorasyon/FDI/attachment iş tanımı.
- src/lib/cad-project-state.ts: sıkıştırılmış tam CAD sahne durumu.
- src/lib/cad-recovery.ts: IndexedDB kurtarma taslağı.
- src/lib/cad-form-library.ts ve CAD kütüphane arayüzü: teknisyen STL/OBJ formları.
- src/lib/cad-*-engine.ts, cad-mesh-qc.ts ve cad-sculpt-integrity.ts: deterministik geometri/analiz.
- src/app/ai/AyaChat.tsx ve src/app/design/CadAyaPanel.tsx: ana sohbet / CAD sohbeti.
- src/lib/aya-conversation.ts: ortak yanıt yönlendirmesi.
- electron/aya-local.cjs: yerel sohbet köprüsü.
- electron/aya/core.cjs: model bağlamı, kaynak seçimi ve tercihler.
- electron/aya/managed-runtime.cjs: llama.cpp/GGUF kurulum, süreç, token bütçesi ve çıkarım.
- electron/aya/assistant.cjs, conversation.cjs, qa-catalog.cjs: mevcut çevrimdışı bilgi ve iş akışı katmanı.
- electron/main.cjs, electron/preload.cjs ve src/types/desktop.d.ts: IPC ve masaüstü köprüsü.
- supabase/migrations: asıl şema ve RLS/RPC değişiklikleri.
- scripts/package-windows.mjs, after-pack.cjs, electron-builder.yml: Windows paketleme.
- scripts/verify-* ve scripts/fixtures: birim, entegrasyon ve sentetik tarayıcı kontrolleri.

Eski AYA_CORE_MIMARI.md RC42'yi anlatır. Yeni bağlam/araç iddiaları için güncel kodu incele.

## Bu oturumda başlanmış dosyalar

Yeni:

- electron/aya/agent.cjs: araç izin listesi, çalışma belleği ve CAD bağlamı normalizasyonu, yanıt şeması, model planı ayrıştırma ve konuşma geçmişi sınırları.
- electron/aya/agent.d.cts: ortak TypeScript sözleşmeleri.
- src/lib/aya-cad-agent.ts: durum tokenı, gerçek kernel raporundan sınırlı özet, kullanılabilir araçlar, eski öneri kontrolü ve tipli dispatcher.
- src/lib/i18n/aya-agent.ts: yeni panel/bellek/araç kontrolleri için TR/EN metinleri.

Değiştirilen mevcut kaynaklar:

- electron/aya/core.cjs
- electron/aya-local.cjs
- electron/aya/managed-runtime.cjs
- src/app/ai/AyaChat.tsx
- src/app/ai/aya-catalog.css
- src/app/design/CadAyaPanel.tsx
- src/app/design/DesignStudioClient.tsx
- src/app/design/cad-workspace.css
- src/types/desktop.d.ts
- src/lib/aya-cad-assistance.ts
- src/lib/aya-local-state.ts
- src/lib/aya-conversation.ts

Ayrıca bu devir belgeleri ve README açıklaması eklendi. Temel kaynak README'si RC46_README_ORIJINAL.md içinde tutulur. Kaynak bütünlük manifesti bu devir dosyaları için yeniden oluşturulmuştur.

## WIP yaklaşımı

1. resolveAyaReply, yerel model callback'i varsa normal soruları eski katalogdan önce modele yönlendiriyor. Acil güvenlik yanıtı önceliği korunuyor; model yoksa eski rehber çalışıyor.
2. Yeni sohbet çağrıları agent:true ve workingMemory taşıyor. Eski ham yerel model çağrıları geriye dönük olarak korunmaya çalışıldı.
3. Modelden answer, goal, decisions, openQuestions, actions alanları olan JSON bekleniyor. Genel sohbette CAD eylemi olmayacak.
4. Managed llama.cpp çağrısına response_format.type=json_object ve schema; Ollama çağrısına format=schema eklendi. Bu sözleşmenin özellikle sabit b9380 sürümü ve gerçek modelle uyumunu doğrula.
5. Yapılandırılmış model yanıtında ham JSON akışı arayüze gösterilmiyor; tamamlanınca doğrulanarak ayrıştırılıyor. Eski agent:false akışlı yanıt yolu korunuyor.
6. Ana sohbette çalışma belleği var. Kalıcı geçmiş açık olduğunda oturumla birlikte kaydedilmesi amaçlandı. CAD panelinin kapatılıp açılması için proje/kaynak/ünite kapsamlı, yalnız süreç ömründe duran sınırlı Map kullanılıyor.
7. CAD hostu scope, snapshot ve dataToken üretiyor. Ham geometri modele gitmiyor. Analiz raporu yalnız aynı veri tokenında geçerli sayılıyor.
8. Gerçek runKernelQc çıktısından mesh, marjin, antagonist temas örnekleri, undercut, connector ve kabuk tahminlerinin özeti hazırlanıyor.
9. Kullanıcı Uygula deyince dispatcher mevcut host callback'ini çağırıyor. Scope/snapshot, kullanılabilir araçlar, meşguliyet ve tek önerinin yeniden uygulanması denetlenmeye çalışılıyor.
10. Geometri kontrolünden sonra bir kez model çağrısı ile gerçek yeni sonucun yorumlanması amaçlandı. Otomatik geometri işlemi döngüsü yok.

Araç kimlikleri: inspect, setup, library, place, save, save-exit, undo, redo, fit-camera, show-all, isolate, recorded-bite, view-natural, view-contact, view-thickness, view-undercut, view-section, tool-margin, tool-measure, tool-add, tool-reduce, tool-smooth, internal-fit, next.

Bunlar yeni kernel algoritmaları değildir; mevcut işlemlere bağlanır. Model parametre uydurmamalı. Yanıt metninin söyledikleriyle callback sonucu ayrı tutulmalı.

## Doğrulama — bu devir kopyası

Bu oturumda gerçekten çalıştırılan kontroller:

- Son npx tsc --noEmit --pretty false: **GEÇTİ**.
- Değişen TS/TSX dosyalarında hedefli ESLint: **BAŞARISIZ**. CadAyaPanel.tsx satır 31 civarında render sırasında contextRef.current=context ataması react-hooks/refs kuralını ihlal ediyor.
- node --check electron/aya/agent.cjs: geçti.
- node --check electron/aya-local.cjs: geçti.
- node --check electron/aya/core.cjs: geçti.
- node scripts/verify-aya-core.cjs: geçti.
- node scripts/verify-aya-managed.cjs: geçti; mevcut taşıma/kurulum testinde native çıkarım **mock**.
- node scripts/verify-local-aya.cjs: **BAŞARISIZ**. Eski test 10 toplam mesaj / 2000 karakter varsayıyor; yeni normalizeHistory ile test girdisinde 14 toplam mesaj / 2100 karakter oluşuyor. Bu farkı amaç ve token bütçesiyle değerlendirip testi ve/veya implementasyonu anlamlı biçimde düzelt.

Çalıştırılmayan / tamamlanmayanlar:

- Yeni agent parser, şema, bellek ve araç dispatcher için özel testler henüz eklenmedi.
- Yeni CAD öneri/uygula/sonuç akışı tarayıcıda doğrulanmadı.
- Tam npm run verify ve yeni Next build yapılmadı.
- Gerçek yerel modelle yeni yapılandırılmış çıkarım yapılmadı.
- Windows üzerinde yeni Setup EXE üretilmedi.
- Yeni UI metinleri için genel dil ve responsive kontroller tamamlanmadı.

Bu kontrolleri geçmiş eski RC46 raporlarıyla tamamlanmış sayma.

## Öncelikli inceleme ve düzeltme listesi

- React ref güncellemesini doğru lifecycle'a taşı; eşzamanlı/stale callback davranışını koru.
- Eski verify-aya-conversation.ts ve verify-aya-conversation-browser.mjs model varken “Dentin nedir”in Core'da kalmasını bekliyor. Yeni hedef model öncelikli. Beklentiyi davranışa göre değiştir; fallback senaryosunu ayrıca koru.
- verify-cad-daily-browser.mjs, AYA panelindeki eski Marjin / Çalışma kontrolü düğmelerini arıyor. Yeni panel gerçek işlem önerileri ekledi; testi yeni akışla anlamlı biçimde güncelle ve mevcut implant/kayıt/undo testlerini koru.
- JSON ayrıştırıcısını yalnız dil modeli şemasına güvenmeden tüm tipler, uzunluklar, bilinmeyen alanlar, geçersiz araçlar ve CAD olmayan bağlam için test et.
- responseSchema genel sohbette actions:[] şartını şemada da kesinleştirmeli; mevcut fallback enumunun davranışını incele.
- Bir işlem başlayınca sahne/ünite değişmesi, iptal, çift tık, kapanan panel, geciken model sonucu ve kayıt sırasında yeniden istek senaryolarını test et.
- Gerçek callback başarısı doğrulanmadan başarı yazan handler bırakma; save-exit mevcut saveAndExit akışını çağırıyor, eski davranışı tekrar doğrula.
- Güncel kernel raporu ile “kaynak mesafesi”, gerçek kalınlık ve kabuk offset tahmini arasındaki ayrımı koru.
- Veri tokenı hesabı büyük cad_library_assets/cad_workspace tamponlarını dışarıda bırakıyor. Performansı, değişikliklerin gerçekten invalidation üretmesini ve scope ayrımını test et.
- Ana sohbetin eski alt açıklaması “CAD geometrisi değiştirmez” diyor; yeni CAD'deki açıkça tıklanan komut desteğine göre güncel ve tutarlı kullanıcı metni oluştur.
- Yeni TR/EN kontroller diğer dillerde İngilizce fallback kullanıyor. Bunu 46 dilin tamamına çevrildi diye sunma; mevcut doğrulama kurallarını uygula.
- Core sürümü hâlâ 0.4.0; release etiketleri RC46. RC47 tamamlanırken tüm sürüm/installer/doküman/export tutarlılıklarını denetle.
- Model zekâ kalitesini yalnız mock çağrı sayısıyla ölçme; mümkünse seçilen gerçek yerel model üzerinde yeni ifadeler, takip soruları ve CAD senaryolarıyla değerlendirme kaydı üret.

## Paket ve ortam

Kaynak ZIP node_modules, .next, yerel sırlar veya model ağırlıkları içermez. İnternete çıkabilen uygun ortamda package-lock ile npm ci gerekir. Windows dağıtım için tek CMD ve RC45 Onarım 2 düzeltmeleri korunur.

Bu devir için oluşturulan PAKET_BUTUNLUK.json sadece dosya içeriği/checksum doğrulamasıdır; yazılım testlerinin geçtiği anlamına gelmez. node scripts/verify-source-integrity.mjs ile kontrol edilebilir.

Bu oturumdaki Linux çalışma klasörü, kullanıcının Windows makinesindeki klasör değildir. Eski kullanıcı yolları C:\Users\ahmet\dentaya-rc20\DentAYA_Production_RC20 ve OneDrive altındaki bir kopyadır; Codex'te gerçek açılan klasörü doğrula. Geliştirme deposu otomatik olarak hzsams/dentaya-website sanılmamalı.

Resmî teknik başvuru:
- https://github.com/ggml-org/llama.cpp/blob/b9380/tools/server/README.md
- https://docs.ollama.com/capabilities/structured-outputs

## Teslim beklentisi

Mevcut WIP'i değerlendir, düzelt, gerçek testleri tamamla ve uygun olduğunda RC47 tam kaynak/güncelleme paketini üret. Çalışan özellikler, geliştirme işleri ve uzun vadeli model eğitimi vizyonunu ayrı tut. Kullanıcıya kısa, doğrudan Türkçe anlat; tamamlanmamış işi bitmiş gibi sunma.

