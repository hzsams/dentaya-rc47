export const DENTAYA_RELEASE = {
  version: "1.0.0-rc.62",
  channel:
    process.env.NEXT_PUBLIC_DENTAYA_RELEASE_CHANNEL ??
    "staging",
  buildLabel:
    process.env.NEXT_PUBLIC_DENTAYA_BUILD_LABEL ??
    "DentAYA RC62",
  targetDate: "2026-10-28",
  targetLabel:
    "Doğrulama kayıtları",
} as const;

export function isProductionRelease() {
  return (
    DENTAYA_RELEASE.channel ===
    "production"
  );
}
