export const DENTAYA_RELEASE = {
  version: "1.0.0-rc.56",
  channel:
    process.env.NEXT_PUBLIC_DENTAYA_RELEASE_CHANNEL ??
    "staging",
  buildLabel:
    process.env.NEXT_PUBLIC_DENTAYA_BUILD_LABEL ??
    "DentAYA RC56",
  targetDate: "2026-10-22",
  targetLabel:
    "Doğrulama kayıtları",
} as const;

export function isProductionRelease() {
  return (
    DENTAYA_RELEASE.channel ===
    "production"
  );
}
