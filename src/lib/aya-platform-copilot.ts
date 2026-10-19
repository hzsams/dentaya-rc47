export type PlatformOrgType =
  | "clinic"
  | "laboratory"
  | "courier";

export type PlatformAction =
  | "workspace"
  | "navigation"
  | "settings"
  | "learn";

export type PlatformScope = {
  orgType: PlatformOrgType;
  role: string;
  activeCases: number;
  approvalCases: number;
  urgentCases: number;
  activeShipments: number;
  lateShipments: number;
  overdueCases: number;
};

export type PlatformNextAction = {
  title: string;
  detail: string;
  href: string;
};

export function platformActionAnswer(
  scope: PlatformScope,
  action: PlatformAction,
  prompt = ""
) {
  const next = platformNextAction(scope);

  if (action === "workspace") {
    return [
      "AYA PLATFORM ÖZETİ",
      "",
      `Kurum tipi: ${orgTypeLabel(scope.orgType)} · Rol: ${scope.role}`,
      `Aktif vaka: ${scope.activeCases}`,
      `Onay bekleyen: ${scope.approvalCases}`,
      `Öncelikli iş: ${scope.urgentCases}`,
      `Aktif teslimat: ${scope.activeShipments}`,
      `Geciken teslimat: ${scope.lateShipments}`,
      `Termini geçmiş vaka: ${scope.overdueCases}`,
      "",
      `Sana önerdiğim ilk adım: ${next.title}`,
      next.detail,
      "",
      workspaceFocus(scope),
    ].join("\n");
  }

  if (action === "settings") {
    return [
      "AYA AYAR YARDIMI",
      "",
      "Ayarlar merkezinde şunları yönetebilirsin:",
      "- Profil ve ekip erişimi",
      "- Bildirim tercihleri",
      "- Görünüm / tema",
      "- Kurum tercihleri ve çalışma düzeni",
      "- Güvenlik ve oturum tercihleri",
      "",
      scope.orgType === "laboratory"
        ? "Laboratuvar için önce bildirim ve varsayılan iş akışı tercihlerini netleştirmeni öneririm."
        : scope.orgType === "clinic"
          ? "Klinik için önce bildirim, hasta akışı ve finans görünümü tercihlerini düzenlemeni öneririm."
          : "Kurye tarafında önce bildirim ve lojistik görünüm tercihlerini düzenlemeni öneririm.",
      "",
      "Hızlı yol: Ayarlar > Bildirimler, Tema, Ekip Erişimi, Güvenlik.",
      `Sonraki adım: ${next.title}`,
    ].join("\n");
  }

  if (action === "navigation") {
    return [
      "AYA NAVİGASYON REHBERİ",
      "",
      `Bulunduğun kurum yapısına göre en sade giriş akışı: ${navigationFlow(scope)}`,
      "",
      "Önerilen modüller:",
      ...recommendedModules(scope.orgType).map(
        (item) => `- ${item}`
      ),
      "",
      "Vaka listesini her yerde göstermek yerine sadece ihtiyacın olduğunda Vakalar ekranından açman daha doğru.",
      `İlk geçiş: ${next.title} (${next.href})`,
    ].join("\n");
  }

  return [
    "AYA ÖĞRENİM REHBERİ",
    "",
    "Öğrenim rehberi için önerdiğim sıra:",
    ...learningSteps(scope.orgType).map(
      (item, index) => `${index + 1}. ${item}`
    ),
    "",
    "Yeni ekip üyelerine önce lobi, sonra vaka, sonra tarama/CAD ve en son ayarlar eğitimi verilmesi daha verimli olur.",
    prompt.trim()
      ? `Sorun: ${prompt.trim()}`
      : "Rehberi doğrudan açıp adımları takip edebilirsin.",
  ].join("\n");
}

export function detectPlatformIntent(
  prompt: string
): PlatformAction | null {
  const value =
    prompt.toLocaleLowerCase("tr-TR");

  if (
    /(ayar|tema|bildirim|profil|güvenlik|setting)/i.test(
      value
    )
  ) {
    return "settings";
  }

  if (
    /(nasıl giderim|hangi modül|nereye|navigasyon|yol bul|lobi|menü|modül)/i.test(
      value
    )
  ) {
    return "navigation";
  }

  if (
    /(öğren|rehber|kılavuz|eğitim|başlangıç|tutorial)/i.test(
      value
    )
  ) {
    return "learn";
  }

  if (
    /(genel|özet|workspace|çalışma alanı|platform|operasyon|bugün ne yap|önce ne)/i.test(
      value
    )
  ) {
    return "workspace";
  }

  return null;
}

export function platformNextAction(
  scope: PlatformScope
): PlatformNextAction {
  if (scope.orgType === "courier") {
    if (scope.lateShipments > 0) {
      return {
        title: "Geciken teslimatları aç",
        detail: `${scope.lateShipments} aktif gönderinin ETA zamanı geçmiş görünüyor. Canlı konum ve kalan rotayı kontrol et.`,
        href: "/operations",
      };
    }

    return {
      title: "Operasyon merkezini aç",
      detail:
        scope.activeShipments > 0
          ? "Aktif gönderileri tek akışta kontrol et ve son hareketleri doğrula."
          : "Yeni gönderi veya alım bekleyen hareket var mı kontrol et.",
      href: "/operations",
    };
  }

  if (scope.overdueCases > 0) {
    return {
      title: "Termini geçmiş vakaları kontrol et",
      detail: `${scope.overdueCases} aktif vakanın termin tarihi geçmiş görünüyor. Önce bu işlerin durumunu doğrula.`,
      href: "/operations",
    };
  }

  if (scope.lateShipments > 0) {
    return {
      title: "Geciken teslimatları kontrol et",
      detail: `${scope.lateShipments} aktif gönderinin ETA zamanı geçmiş görünüyor. Kurye akışını kontrol et.`,
      href: "/operations",
    };
  }

  if (scope.urgentCases > 0) {
    return {
      title: "Öncelikli işleri gözden geçir",
      detail:
        "Acil ve yüksek öncelikli işleri önce vaka merkezi veya ilgili modülden aç.",
      href: "/operations",
    };
  }

  if (scope.approvalCases > 0) {
    return {
      title: "Onay bekleyen işleri temizle",
      detail:
        "Onay aşamasındaki vakaları CAD veya vaka merkezinden karar vererek ilerlet.",
      href: "/operations",
    };
  }

  return {
    title: "Operasyon merkezini aç",
    detail:
      scope.orgType === "laboratory"
        ? "Tarama, CAD ve üretim akışını sade modüllerden aç."
        : "Hasta, tarama ve vaka akışını modül bazında yönet.",
    href: "/operations",
  };
}

function navigationFlow(
  scope: PlatformScope
) {
  if (scope.orgType === "laboratory") {
    return "Lobi → Operasyon Merkezi → Lab Merkezi → Tarama veya CAD → Vakalar → Ayarlar";
  }

  if (scope.orgType === "clinic") {
    return "Lobi → Operasyon Merkezi → Klinik Merkezi → Hastalar / Tarama → Vakalar → Finans → Ayarlar";
  }

  return "Lobi → Operasyon Merkezi → Lojistik Merkezi → Bildirimler → Ayarlar";
}

function recommendedModules(
  orgType: PlatformOrgType
) {
  if (orgType === "laboratory") {
    return [
      "Operasyon Merkezi",
      "Lab Merkezi",
      "Tarama Stüdyosu",
      "DentAYA Design",
      "Vakalar",
      "Ayarlar",
    ];
  }

  if (orgType === "clinic") {
    return [
      "Operasyon Merkezi",
      "Klinik Merkezi",
      "Hastalar",
      "Tarama Stüdyosu",
      "Vakalar",
      "Finans",
      "Ayarlar",
    ];
  }

  return [
    "Operasyon Merkezi",
    "Lojistik",
    "Bildirimler",
    "Ayarlar",
  ];
}

function learningSteps(
  orgType: PlatformOrgType
) {
  const base = [
    "Lobi yapısını ve ana modülleri tanı",
    "AYA Copilot ile hızlı komutları öğren",
    "Vaka ekranının ne zaman kullanılacağını anla",
  ];

  if (orgType === "laboratory") {
    return [
      ...base,
      "Tarama kabul ve mesh kontrol akışını tamamla",
      "CAD workstation akışını öğren",
      "Ayarlar ve ekip erişimini düzenle",
    ];
  }

  if (orgType === "clinic") {
    return [
      ...base,
      "Hasta ve vaka açılış sürecini öğren",
      "Tarama ve onay akışını tamamla",
      "Finans ve ayarları gözden geçir",
    ];
  }

  return [
    ...base,
    "Gönderi durum akışını öğren",
    "Bildirim ve lojistik görünümünü özelleştir",
  ];
}

function workspaceFocus(
  scope: PlatformScope
) {
  if (scope.orgType === "laboratory") {
    if (scope.overdueCases > 0) {
      return `Bugün laboratuvar tarafında ${scope.overdueCases} termini geçmiş vaka ilk sırada ele alınmalı.`;
    }
    if (scope.lateShipments > 0) {
      return `Üretim akışına ek olarak ${scope.lateShipments} geciken teslimatı lojistik merkezinden kontrol et.`;
    }
    return scope.urgentCases > 0
      ? "Bugün laboratuvar tarafında öncelikli CAD / üretim işlerine odaklanmalısın."
      : "Bugün laboratuvar tarafında tarama kabulü, CAD akışı ve üretim geçişleri öncelikli görünüyor.";
  }

  if (scope.orgType === "clinic") {
    if (scope.overdueCases > 0) {
      return `Bugün klinik tarafında ${scope.overdueCases} termini geçmiş vakanın neden beklediğini önce kontrol et.`;
    }
    if (scope.lateShipments > 0) {
      return `Klinik akışına ek olarak ${scope.lateShipments} geciken teslimatı lojistik merkezinden takip et.`;
    }
    return scope.approvalCases > 0
      ? "Bugün klinik tarafında onay ve karar bekleyen vakalar önce ele alınmalı."
      : "Bugün klinik tarafında aktif vaka, tarama ve operasyon akışını sade modüllerden takip edebilirsin.";
  }

  return scope.lateShipments > 0
    ? `Bugün ${scope.lateShipments} geciken teslimatın canlı konumunu ve ETA durumunu önce kontrol et.`
    : "Bugün kurye tarafında aktif teslimatların canlı konum ve ETA durumunu takip edebilirsin.";
}

function orgTypeLabel(
  value: PlatformOrgType
) {
  return value === "clinic"
    ? "Klinik"
    : value === "laboratory"
      ? "Laboratuvar"
      : "Kurye";
}
