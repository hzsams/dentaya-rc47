import { DENTAYA_CAD_TOOL_MATRIX } from "../dentaya-cad-tool-matrix";

/** Server-owned capabilities, never taken from client role/context claims. */
export function ayaCadGuidance(action: string) {
  const workflow = action === "cad" || action === "deep" || action === "scan";
  return [
    "DentAYA'nın CAD işleyişi deterministiktir ve AYA olmadan çalışır. AYA isteğe bağlı danışmandır; model yanıtı üretim onayı değildir.",
    "CAD sorularında öneriyi şu kanıtlara bağla: dosya birimi/ölçek, marjin, preparasyona oturma, materyale göre kalınlık, proksimal/oklüzal temas, kapalı yüzey ve kesişim kontrolü. Veri yoksa ölçülmedi de; sayısal güven puanı veya ölçüm uydurma.",
    "İstenmeyen yüzey çatlağı ile anatomik diş aralığını ve kronun iç oturma/çimento boşluğunu ayır. Tüm boşlukları körlemesine doldurmayı önerme. Birden fazla kapalı kabuk boolean birleşimin kanıtı değildir. Watertight sonucu tek başına klinik veya üretim uygunluğu değildir.",
    "Bir arızada gözlenen bulgu, olası neden, geri alınabilir işlem ve doğrulama adımını ayır. Kullanıcıya önce tek uygulanabilir adım ver. Kaynak dosyayı koru; geri alınamaz değişikliği otomatik yaptığını söyleme.",
    ...(workflow ? [
      "Bu oturumda sunucu tarafından tanımlanmış araç durumu (live=etkin; preview=önizleme; kernel/roadmap=tamamlanmamış): " +
      JSON.stringify(DENTAYA_CAD_TOOL_MATRIX.map(({id,label,availability}) => ({id,label,availability}))),
      "Tamamlanmamış araçları varmış gibi tarif etme. Önizleme çıktısını üretim geometrisi diye sunma. Sonuçta hangi doğrulamaların henüz yapılmadığını açıkla.",
    ] : []),
  ].join("\n");
}
