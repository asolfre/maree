import type { Metadata, Viewport } from "next";
import { Manrope, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import TopAppBar from "@/components/TopAppBar";
import BottomNav from "@/components/BottomNav";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Maree - Mareas de la Costa Gallega",
  description:
    "Datos de mareas en tiempo real, previsiones y condiciones costeras para la costa gallega. Para exploradores, pescadores y amantes del océano.",
  keywords: [
    "tides",
    "Galicia",
    "mareas",
    "costa gallega",
    "tide forecast",
    "Vigo",
    "A Coruña",
    "Ferrol",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-512.svg",
  },
  openGraph: {
    title: "Maree - Mareas de la Costa Gallega",
    description:
      "Datos de mareas en tiempo real, previsiones y condiciones costeras para la costa gallega.",
    url: "https://maree.app",
    siteName: "Maree",
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Maree - Mareas de la Costa Gallega",
    description:
      "Datos de mareas en tiempo real, previsiones y condiciones costeras para la costa gallega.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#002a48",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${manrope.variable} ${inter.variable}`}>
      <body className="bg-surface text-on-surface font-body antialiased selection:bg-secondary-container">
        <TopAppBar />
        <main className="pb-24 min-h-dvh">{children}</main>
        <BottomNav />
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
