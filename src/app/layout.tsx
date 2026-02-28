import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DeepTrade | Profesyonel Kripto Analiz Platformu",
  description: "DeepTrade - Profesyonel Binance USDT kripto analiz platformu. RSI, MACD, EMA, SuperTrend, Ichimoku teknik analizi, al-sat sinyalleri, emir defteri, funding rate ve daha fazlası.",
  keywords: ["DeepTrade", "kripto", "bitcoin", "USDT", "Binance", "teknik analiz", "RSI", "MACD", "EMA", "SuperTrend", "Ichimoku", "sinyal", "trading", "scalp", "swing"],
  authors: [{ name: "DeepTrade" }],
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "DeepTrade | Kripto Analiz Platformu",
    description: "Profesyonel kripto analiz platformu - Scalp ve Swing sinyalleri",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
