import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://calculadora-eletrica-industrial.jmm-engiot.chatgpt.site");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Calculadora Elétrica Industrial",
  description:
    "Cálculos de motores, fator de potência, bancos de capacitores, proteção, cabos e curto-circuito com memória de cálculo.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Calculadora Elétrica Industrial",
    description: "Cálculos, fórmulas e memória de cálculo.",
    type: "website",
    images: [
      {
        url: `${siteUrl}/og.png`,
        width: 1200,
        height: 630,
        alt: "Calculadora Elétrica Industrial — cálculos, fórmulas e memória de cálculo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Calculadora Elétrica Industrial",
    description: "Cálculos, fórmulas e memória de cálculo.",
    images: [`${siteUrl}/og.png`],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07131f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
