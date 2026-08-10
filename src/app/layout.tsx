
import type { ReactNode } from 'react';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'کتاب‌کست | هر کتاب ارزشمند، یک اپیزود فارسی شنیدنی',
  description: 'ایده‌های مهم کتاب‌ها را به اپیزودهای فارسی شنیدنی تبدیل می‌کنیم؛ با کمک هوش مصنوعی.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="bg-background text-gray-100 antialiased">
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
