export const DENTAYA_RELEASE = {
  version: "1.0.0-rc.57",
  channel:
    process.env.NEXT_PUBLIC_DENTAYA_RELEASE_CHANNEL ??
    "staging",
  buildLabel:
    process.env.NEXT_PUBLIC_DENTAYA_BUILD_LABEL ??
    "DentAYA RC57",
  targetDate: "2026-10-24",
  targetLabel:
    "Doğrulama kayıtları",
} as const;

export function isProductionRelease() {
  return (
    DENTAYA_RELEASE.channel ===
    "production"
  );
}
