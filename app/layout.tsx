import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./app-native.css";
import { ClientShell } from "@/components/ClientShell";
import { AppBootstrap } from "@/components/AppBootstrap";

export const metadata: Metadata = {
  title: {
    default: "Косметичка — оптовая косметика и парфюмерия",
    template: "%s | Косметичка",
  },
  description: "Оптовый интернет-магазин косметики и парфюмерии.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppBootstrap />
        {children}
        <ClientShell />
      </body>
    </html>
  );
}
