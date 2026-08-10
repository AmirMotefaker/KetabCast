import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "کتاب‌کست | هر کتاب ارزشمند، یک اپیزود فارسی شنیدنی",
  description: "ایده‌های مهم کتاب‌ها را به اپیزودهای فارسی شنیدنی تبدیل می‌کنیم؛ با کمک هوش مصنوعی.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body className={inter.className}>
        <Header />
        <main className="container mx-auto px-4 max-w-6xl mt-24 mb-32">{children}</main>
      </body>
    </html>
  );
}