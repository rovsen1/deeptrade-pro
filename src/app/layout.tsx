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
  title: "DeepTrade Pro | Wall Street Grade Crypto Analytics",
  description: "DeepTrade Pro - Professional cryptocurrency analysis platform with advanced technical indicators, automated trading signals, and real-time market analytics. Scalp & Swing strategies with 25+ indicators.",
  keywords: ["DeepTrade Pro", "crypto trading", "technical analysis", "RSI", "MACD", "SuperTrend", "Ichimoku", "trading signals", "scalp", "swing", "Binance", "Wall Street", "professional trading"],
  authors: [{ name: "DeepTrade Pro" }],
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    title: "DeepTrade Pro | Professional Crypto Analytics",
    description: "Wall Street grade cryptocurrency trading platform",
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
