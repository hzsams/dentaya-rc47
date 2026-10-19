export type WorkspaceDensity = "comfortable" | "balanced" | "compact";
export type WorkspaceCardStyle = "soft" | "outlined" | "minimal";
export type WorkspaceHeaderScale = "calm" | "balanced" | "strong";

export type WorkspacePersonalization = {
  density: WorkspaceDensity;
  cardStyle: WorkspaceCardStyle;
  headerScale: WorkspaceHeaderScale;
  showModuleIcons: boolean;
  showAyaLobby: boolean;
  showAttentionSummary: boolean;
  centeredContent: boolean;
};

export const DEFAULT_WORKSPACE_PERSONALIZATION: WorkspacePersonalization = {
  density: "balanced",
  cardStyle: "soft",
  headerScale: "balanced",
  showModuleIcons: true,
  showAyaLobby: false,
  showAttentionSummary: true,
  centeredContent: true,
};

export const WORKSPACE_PRESETS: Array<{id:string;name:string;description:string;value:WorkspacePersonalization}> = [
  {id:"balanced",name:"Dengeli",description:"Rahat boşluklar, iş özeti ve yardımcı paneller.",value:{density:"balanced",cardStyle:"soft",headerScale:"balanced",showModuleIcons:true,showAyaLobby:false,showAttentionSummary:true,centeredContent:true}},
  {id:"focus",name:"Odak",description:"Öncelikli işler ve bildirimler; daha az yardımcı panel.",value:{density:"comfortable",cardStyle:"minimal",headerScale:"calm",showModuleIcons:true,showAyaLobby:false,showAttentionSummary:false,centeredContent:true}},
  {id:"operations",name:"Operasyon",description:"Sıkı satırlar ve geniş ekran çalışma alanı.",value:{density:"compact",cardStyle:"outlined",headerScale:"strong",showModuleIcons:true,showAyaLobby:false,showAttentionSummary:true,centeredContent:false}},
];

const STORAGE_KEY = "dentaya:workspace-personalization";

export function loadWorkspacePersonalization(): WorkspacePersonalization {
  if (typeof window === "undefined") {
    return DEFAULT_WORKSPACE_PERSONALIZATION;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WORKSPACE_PERSONALIZATION;

    const parsed = JSON.parse(raw) as Partial<WorkspacePersonalization>;

    return {
      density:
        parsed.density === "comfortable" || parsed.density === "compact"
          ? parsed.density
          : "balanced",
      cardStyle:
        parsed.cardStyle === "outlined" || parsed.cardStyle === "minimal"
          ? parsed.cardStyle
          : "soft",
      headerScale:
        parsed.headerScale === "calm" || parsed.headerScale === "strong"
          ? parsed.headerScale
          : "balanced",
      showModuleIcons:
        typeof parsed.showModuleIcons === "boolean"
          ? parsed.showModuleIcons
          : true,
      showAyaLobby:
        typeof parsed.showAyaLobby === "boolean"
          ? parsed.showAyaLobby
          : false,
      showAttentionSummary:
        typeof parsed.showAttentionSummary === "boolean"
          ? parsed.showAttentionSummary
          : true,
      centeredContent:
        typeof parsed.centeredContent === "boolean"
          ? parsed.centeredContent
          : true,
    };
  } catch {
    return DEFAULT_WORKSPACE_PERSONALIZATION;
  }
}

export function saveWorkspacePersonalization(
  value: WorkspacePersonalization
) {
  if (typeof window === "undefined") return;

  applyWorkspacePersonalization(value);
  let saved = true;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { saved = false; }
  window.dispatchEvent(new CustomEvent("dentaya-workspace-personalization", { detail: value }));
  return saved;

}

export function applyWorkspacePersonalization(
  value: WorkspacePersonalization
) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.dataset.dentayaWorkspaceDensity = value.density;
  root.dataset.dentayaCardStyle = value.cardStyle;
  root.dataset.dentayaHeaderScale = value.headerScale;
  root.dataset.dentayaModuleIcons = value.showModuleIcons ? "true" : "false";
  root.dataset.dentayaAyaLobby = value.showAyaLobby ? "true" : "false";
  root.dataset.dentayaAttention = value.showAttentionSummary ? "true" : "false";
  root.dataset.dentayaCentered = value.centeredContent ? "true" : "false";

  const density =
    value.density === "comfortable"
      ? { gap: "1.12", card: "1.10" }
      : value.density === "compact"
        ? { gap: ".82", card: ".88" }
        : { gap: "1", card: "1" };

  const heading =
    value.headerScale === "strong"
      ? "1.10"
      : value.headerScale === "calm"
        ? ".94"
        : "1";

  root.style.setProperty("--dy-workspace-gap", density.gap);
  root.style.setProperty("--dy-card-density", density.card);
  root.style.setProperty("--dy-heading-scale", heading);
  root.style.setProperty(
    "--dy-content-width",
    value.centeredContent ? "1440px" : "none"
  );
}
