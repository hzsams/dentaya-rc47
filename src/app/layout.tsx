import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import {SkipToContent} from "./LanguageSettings";
import AppRuntime from "@/app/AppRuntime";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: {
    default: "DentAYA",
    template: "%s · DentAYA",
  },
  description:
    "Klinik, laboratuvar, tarama, CAD tasarım ve teslimat süreçleri için ortak dental çalışma alanı.",
  applicationName: "DentAYA",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  category: "healthcare operations",
  robots: {
    index: process.env.NEXT_PUBLIC_DENTAYA_RELEASE_CHANNEL === "production",
    follow: process.env.NEXT_PUBLIC_DENTAYA_RELEASE_CHANNEL === "production",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07131d" },
    { media: "(prefers-color-scheme: light)", color: "#f3f7f7" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="tr" data-dentaya-theme="midnight" suppressHydrationWarning>
      <body>
        <SkipToContent/>
        <AppRuntime>{children}</AppRuntime>
      </body>
    </html>
  );
}
