import type { Metadata } from "next";
import type { ReactNode } from "react";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import GlobalMiniPlayer from "@/components/player/GlobalMiniPlayer";
import PlayerProvider from "@/components/player/PlayerProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: "زبدینو | خلاصه هوشمند کتاب با هوش مصنوعی",
  description:
    "زبدینو ایده‌های اصلی کتاب‌های ارزشمند را با خط تولید AI و Automation به خلاصه‌های فارسی شنیداری تبدیل می‌کند.",
  applicationName: "Zobdino",
  keywords: [
    "زبدینو",
    "Zobdino",
    "خلاصه کتاب",
    "خلاصه صوتی کتاب",
    "هوش مصنوعی",
    "پادکست کتاب",
    "کتاب فارسی",
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="bg-background text-gray-100 antialiased">
        <PlayerProvider>
          <Header />
          <main className="min-h-screen pb-28 md:pb-32">{children}</main>
          <Footer />
          <GlobalMiniPlayer />
        </PlayerProvider>
      </body>
    </html>
  );
}
