import type {
  DentayaPreferences,
  DentayaTheme,
  FontScale,
  MotionLevel,
  SurfaceStyle,
} from "@/app/dentaya-theme";
import type {
  NotificationCategory,
} from "@/lib/notification-preferences";
import type {
  WorkspacePersonalization,
} from "@/lib/dentaya-workspace-personalization";

export type AyaExecutableCommand =
  | {
      kind: "navigate";
      href: string;
      label: string;
    }
  | {
      kind: "settings-section";
      section:
        | "account"
        | "appearance"
        | "workspace"
        | "notifications"
        | "organization"
        | "system";
      label: string;
    }
  | {
      kind: "preference";
      patch: Partial<DentayaPreferences>;
      label: string;
    }
  | {
      kind: "notification";
      category: NotificationCategory | "all";
      enabled: boolean;
      label: string;
    }
  | {
      kind: "workspace-preference";
      patch: Partial<WorkspacePersonalization>;
      label: string;
    };

const THEME_ALIASES: Array<{
  words: string[];
  theme: DentayaTheme;
}> = [
  { words: ["midnight", "gece"], theme: "midnight" },
  { words: ["ocean", "okyanus"], theme: "ocean" },
  { words: ["emerald", "zümrüt"], theme: "emerald" },
  { words: ["violet", "mor"], theme: "violet" },
  { words: ["graphite", "grafit"], theme: "graphite" },
  { words: ["light", "açık tema", "aydınlık tema"], theme: "light" },
  { words: ["cobalt", "kobalt"], theme: "cobalt" },
  { words: ["aurora"], theme: "aurora" },
  { words: ["rose", "gül"], theme: "rose" },
  { words: ["amber", "kehribar"], theme: "amber" },
  { words: ["frost", "buz"], theme: "frost" },
  { words: ["obsidian", "obsidyen", "siyah tema"], theme: "obsidian" },
  { words: ["teal"], theme: "teal" },
  { words: ["navy", "lacivert"], theme: "navy" },
  { words: ["sand", "kum"], theme: "sand" },
  { words: ["pearl", "inci"], theme: "pearl" },
  { words: ["plum", "erik"], theme: "plum" },
  { words: ["slate"], theme: "slate" },
  { words: ["mint", "nane"], theme: "mint" },
  { words: ["sky", "gökyüzü"], theme: "sky" },
  { words: ["lavender", "lavanta"], theme: "lavender" },
  { words: ["ivory", "fildişi"], theme: "ivory" },
  { words: ["blush", "pudra"], theme: "blush" },
  { words: ["sage", "adaçayı"], theme: "sage" },
];

const ROUTES: Array<{
  test: RegExp;
  href: string;
  label: string;
}> = [
  { test: /(ana sayfa|lobi|home)/i, href: "/", label: "Lobi" },
  { test: /(klinik merkezi|kliniğe git|klinik panel)/i, href: "/clinic", label: "Klinik Merkezi" },
  { test: /(lab merkezi|laboratuvar merkezi|laba git|laboratuvara git)/i, href: "/lab", label: "Lab Merkezi" },
  { test: /(cad|design|tasarım stüdyosu|dentaya design)/i, href: "/design", label: "DentAYA Design" },
  { test: /(tarama stüdyosu|scan studio|scan-studio)/i, href: "/scan-studio", label: "Tarama Stüdyosu" },
  { test: /(tarama(lar)?|scan)/i, href: "/scans", label: "Taramalar" },
  { test: /(hasta(lar)?|patient)/i, href: "/patients", label: "Hastalar" },
  { test: /(vaka(lar)?|case)/i, href: "/cases", label: "Vakalar" },
  { test: /(mesaj(lar)?|message)/i, href: "/messages", label: "Mesajlar" },
  { test: /(finans|fiyat|ödeme)/i, href: "/finance", label: "Finans" },
  { test: /(lojistik|kurye|teslimat)/i, href: "/logistics", label: "Lojistik" },
  { test: /(bildirim(ler)?|notification)/i, href: "/notifications", label: "Bildirimler" },
  { test: /(ekip|team)/i, href: "/team", label: "Ekip" },
  { test: /(öğrenim rehberi|kullanım rehberi|başlangıç rehberi|start)/i, href: "/start", label: "Öğrenim Rehberi" },
  { test: /(release|sürüm kontrol|yayın kontrol)/i, href: "/release-check", label: "Release Check" },
];

export function parseAyaExecutableCommand(
  prompt: string
): AyaExecutableCommand | null {
  const value = normalize(prompt);

  const settingsSection = detectSettingsSection(value);
  if (settingsSection) return settingsSection;

  const theme = detectTheme(value);
  if (theme) return theme;

  const font = detectFontScale(value);
  if (font) return font;

  const motion = detectMotion(value);
  if (motion) return motion;

  const density = detectDensity(value);
  if (density) return density;

  const surface = detectSurface(value);
  if (surface) return surface;

  const workspacePreference = detectWorkspacePreference(value);
  if (workspacePreference) return workspacePreference;

  const notification = detectNotification(value);
  if (notification) return notification;

  const wantsNavigation = /(aç|git|götür|geç|göster|nerede|nereden|bul)/i.test(value);
  if (wantsNavigation) {
    const route = ROUTES.find((item) => item.test.test(value));
    if (route) {
      return {
        kind: "navigate",
        href: route.href,
        label: route.label,
      };
    }
  }

  return null;
}

function detectSettingsSection(
  value: string
): AyaExecutableCommand | null {
  if (!/(ayar|setting)/i.test(value)) return null;

  if (/(görünüm|tema|font|yazı|arayüz|appearance)/i.test(value)) {
    return {
      kind: "settings-section",
      section: "appearance",
      label: "Görünüm ayarları",
    };
  }

  if (/(bildirim|notification)/i.test(value)) {
    return {
      kind: "settings-section",
      section: "notifications",
      label: "Bildirim ayarları",
    };
  }

  if (/(hesap|profil|telefon|e-?posta|account)/i.test(value)) {
    return {
      kind: "settings-section",
      section: "account",
      label: "Hesap ayarları",
    };
  }

  if (/(kurum|laboratuvar profili|organization)/i.test(value)) {
    return {
      kind: "settings-section",
      section: "organization",
      label: "Kurum ayarları",
    };
  }

  if (/(sistem|güvenlik|oturum|system)/i.test(value)) {
    return {
      kind: "settings-section",
      section: "system",
      label: "Sistem ayarları",
    };
  }

  if (/(çalışma alanı|workspace|yoğunluk|kompakt)/i.test(value)) {
    return {
      kind: "settings-section",
      section: "workspace",
      label: "Çalışma alanı ayarları",
    };
  }

  return {
    kind: "navigate",
    href: "/settings",
    label: "Ayarlar",
  };
}

function detectTheme(
  value: string
): AyaExecutableCommand | null {
  if (!/(tema|theme|görünüm|renk)/i.test(value)) return null;

  if (/(koyu tema|karanlık tema|dark theme)/i.test(value)) {
    return {
      kind: "preference",
      patch: { theme: "midnight" },
      label: "Midnight koyu tema",
    };
  }

  for (const item of THEME_ALIASES) {
    if (item.words.some((word) => value.includes(word))) {
      return {
        kind: "preference",
        patch: { theme: item.theme },
        label: `${item.theme} teması`,
      };
    }
  }

  return null;
}

function detectFontScale(
  value: string
): AyaExecutableCommand | null {
  if (!/(yazı|font|metin boyutu)/i.test(value)) return null;

  let scale: FontScale | null = null;
  if (/(büyük|büyüt|large)/i.test(value)) scale = "large";
  if (/(küçük|küçült|small)/i.test(value)) scale = "small";
  if (/(normal|varsayılan|default)/i.test(value)) scale = "normal";
  if (!scale) return null;

  return {
    kind: "preference",
    patch: { font_scale: scale },
    label:
      scale === "large"
        ? "Büyük yazı"
        : scale === "small"
          ? "Küçük yazı"
          : "Normal yazı",
  };
}

function detectMotion(
  value: string
): AyaExecutableCommand | null {
  if (!/(animasyon|hareket|motion)/i.test(value)) return null;

  let motion: MotionLevel | null = null;
  if (/(kapat|kapalı|off|devre dışı)/i.test(value)) motion = "off";
  if (/(azalt|reduced|düşük)/i.test(value)) motion = "reduced";
  if (/(aç|tam|full|normal)/i.test(value)) motion = "full";
  if (!motion) return null;

  return {
    kind: "preference",
    patch: { motion_level: motion },
    label:
      motion === "off"
        ? "Animasyonlar kapalı"
        : motion === "reduced"
          ? "Azaltılmış animasyon"
          : "Tam animasyon",
  };
}

function detectDensity(
  value: string
): AyaExecutableCommand | null {
  if (!/(kompakt|compact|yoğun görünüm|sıkı görünüm)/i.test(value)) return null;

  const disabled = /(kapat|kapalı|normal|devre dışı)/i.test(value);
  const enabled = /(aç|aktif|etkin|compact|kompakt)/i.test(value);
  if (!disabled && !enabled) return null;

  return {
    kind: "preference",
    patch: { compact_mode: !disabled },
    label: disabled ? "Normal yoğunluk" : "Kompakt görünüm",
  };
}

function detectSurface(
  value: string
): AyaExecutableCommand | null {
  if (!/(yüzey|panel|cam görünüm|glass|solid|soft)/i.test(value)) return null;

  let surface: SurfaceStyle | null = null;
  if (/(glass|cam)/i.test(value)) surface = "glass";
  if (/(solid|düz panel)/i.test(value)) surface = "solid";
  if (/(soft|yumuşak)/i.test(value)) surface = "soft";
  if (!surface) return null;

  return {
    kind: "preference",
    patch: { surface_style: surface },
    label:
      surface === "glass"
        ? "Cam yüzey"
        : surface === "solid"
          ? "Solid yüzey"
          : "Yumuşak yüzey",
  };
}


function detectWorkspacePreference(
  value: string
): AyaExecutableCommand | null {
  if (/(modül simge|modül ikon|ikonları|simgeleri)/i.test(value)) {
    const disabled = /(kapat|gizle|kapalı)/i.test(value);
    const enabled = /(aç|göster|aktif|etkin)/i.test(value);
    if (!disabled && !enabled) return null;
    return {
      kind: "workspace-preference",
      patch: { showModuleIcons: !disabled },
      label: disabled ? "Modül simgeleri gizlendi" : "Modül simgeleri gösteriliyor",
    };
  }

  if (/(aya.*lobi|lobide.*aya)/i.test(value)) {
    const disabled = /(kapat|gizle|kapalı)/i.test(value);
    const enabled = /(aç|göster|aktif|etkin)/i.test(value);
    if (!disabled && !enabled) return null;
    return {
      kind: "workspace-preference",
      patch: { showAyaLobby: !disabled },
      label: disabled ? "Lobide AYA gizlendi" : "Lobide AYA gösteriliyor",
    };
  }

  if (/(operasyon özeti|dikkat özeti)/i.test(value)) {
    const disabled = /(kapat|gizle|kapalı)/i.test(value);
    const enabled = /(aç|göster|aktif|etkin)/i.test(value);
    if (!disabled && !enabled) return null;
    return {
      kind: "workspace-preference",
      patch: { showAttentionSummary: !disabled },
      label: disabled ? "Operasyon özeti gizlendi" : "Operasyon özeti gösteriliyor",
    };
  }

  if (/(kart.*minimal|minimal.*kart)/i.test(value)) {
    return {
      kind: "workspace-preference",
      patch: { cardStyle: "minimal" },
      label: "Minimal kart stili",
    };
  }

  if (/(kart.*çizg|outlined|çerçeveli kart)/i.test(value)) {
    return {
      kind: "workspace-preference",
      patch: { cardStyle: "outlined" },
      label: "Çizgili kart stili",
    };
  }

  if (/(kart.*yumuşak|soft kart)/i.test(value)) {
    return {
      kind: "workspace-preference",
      patch: { cardStyle: "soft" },
      label: "Yumuşak kart stili",
    };
  }

  if (/(rahat.*düzen|rahat yoğunluk)/i.test(value)) {
    return {
      kind: "workspace-preference",
      patch: { density: "comfortable" },
      label: "Rahat çalışma yoğunluğu",
    };
  }

  if (/(dengeli.*düzen|dengeli yoğunluk)/i.test(value)) {
    return {
      kind: "workspace-preference",
      patch: { density: "balanced" },
      label: "Dengeli çalışma yoğunluğu",
    };
  }

  if (/(sıkı.*düzen|kompakt kart|yoğun kart)/i.test(value)) {
    return {
      kind: "workspace-preference",
      patch: { density: "compact" },
      label: "Sıkı çalışma yoğunluğu",
    };
  }

  if (/(başlık.*güçlü|büyük başlık)/i.test(value)) {
    return {
      kind: "workspace-preference",
      patch: { headerScale: "strong" },
      label: "Güçlü başlık ölçeği",
    };
  }

  if (/(başlık.*sakin|küçük başlık)/i.test(value)) {
    return {
      kind: "workspace-preference",
      patch: { headerScale: "calm" },
      label: "Sakin başlık ölçeği",
    };
  }

  return null;
}

function detectNotification(
  value: string
): AyaExecutableCommand | null {
  if (!/(bildirim|notification)/i.test(value)) return null;
  if (/(sayfa|ekran|menü|liste|göster)/i.test(value)) return null;

  const disabling = /(kapat|kapalı|devre dışı|sessize al|sustur)/i.test(value);
  const enabling = /(aç|aktif et|etkinleştir|devreye al)/i.test(value);
  if (!disabling && !enabling) return null;

  const enabled = !disabling;

  const categories: Array<{
    test: RegExp;
    category: NotificationCategory;
    label: string;
  }> = [
    { test: /(mesaj)/i, category: "message", label: "Mesaj bildirimleri" },
    { test: /(tasarım|cad|design)/i, category: "design", label: "Tasarım bildirimleri" },
    { test: /(finans|fiyat|ödeme)/i, category: "finance", label: "Finans bildirimleri" },
    { test: /(teslimat|kurye|lojistik)/i, category: "delivery", label: "Teslimat bildirimleri" },
    { test: /(vaka|case)/i, category: "case", label: "Vaka bildirimleri" },
    { test: /(sistem)/i, category: "system", label: "Sistem bildirimleri" },
  ];

  const category = categories.find((item) => item.test.test(value));
  return {
    kind: "notification",
    category: category?.category ?? "all",
    enabled,
    label: category?.label ?? "Tüm bildirimler",
  };
}

function normalize(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ");
}
