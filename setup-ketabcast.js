const fs = require('fs');
const path = require('path');

function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Created: ${filePath}`);
}

console.log("🚀 KetabCast Setup Started...");

// 1. Next.js Config (Static Export for GitHub Pages)
writeFile('next.config.mjs', `
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath: '/KetabCast',
};
export default nextConfig;
`);

// 2. Tailwind Config (Dark Theme & Persian Typography)
writeFile('tailwind.config.ts', `
import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        surface: '#1f2937',
        accent: '#8b5cf6',
      },
      fontFamily: {
        sans: ['Vazirmatn', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
`);

// 3. Global CSS
writeFile('src/app/globals.css', `
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800&display=swap');

body {
  font-family: 'Vazirmatn', sans-serif;
  background-color: #0a0a0a;
  color: #f3f4f6;
  direction: rtl;
}
`);

// 4. Root Layout
writeFile('src/app/layout.tsx', `
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
`);

// 5. Header Component
writeFile('src/components/Header.tsx', `
import Link from 'next/link';
import { Menu } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-background/90 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-accent flex items-center gap-2">
          🎧 کتاب‌کست
        </Link>
        <nav className="hidden md:flex gap-8 text-gray-300 font-medium">
          <Link href="/books" className="hover:text-accent transition">کتاب‌ها</Link>
          <Link href="/about" className="hover:text-accent transition">درباره پروژه</Link>
          <a href="https://github.com/AmirMotefaker/KetabCast" target="_blank" className="hover:text-accent transition flex items-center gap-1">
            GitHub
          </a>
        </nav>
        <button className="md:hidden text-gray-300" aria-label="منو">
          <Menu size={24} />
        </button>
      </div>
    </header>
  );
}
`);

// 6. Footer Component
writeFile('src/components/Footer.tsx', `
export default function Footer() {
  return (
    <footer className="bg-surface/50 border-t border-gray-800 py-8 mt-12 text-center text-gray-500 text-sm">
      <div className="max-w-6xl mx-auto px-4">
        <p className="mb-2">کتاب‌کست محتوای خلاصه و تحلیلی مستقل ارائه می‌کند و جایگزین مطالعه نسخه کامل کتاب نیست.</p>
        <p>© 2026 KetabCast. Open Source under MIT License.</p>
      </div>
    </footer>
  );
}
`);

// 7. Hero Component
writeFile('src/components/Hero.tsx', `
import Link from 'next/link';

export default function Hero() {
  return (
    <div className="relative bg-gradient-to-b from-surface to-background py-24 text-center overflow-hidden">
      <div className="relative z-10 max-w-4xl mx-auto px-4">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
          هر کتاب ارزشمند، یک اپیزود <span className="text-accent">فارسی شنیدنی</span>.
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          ایده‌های مهم کتاب‌ها را به اپیزودهای فارسی شنیدنی تبدیل می‌کنیم؛ با کمک هوش مصنوعی.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/books" className="bg-accent text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-purple-600 transition shadow-lg shadow-accent/20">
            🎧 شروع شنیدن
          </Link>
          <Link href="/books" className="bg-gray-800 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-700 transition border border-gray-700">
            کشف کتاب‌ها
          </Link>
        </div>
      </div>
    </div>
  );
}
`);

// 8. BookCard Component
writeFile('src/components/BookCard.tsx', `
import Link from 'next/link';

export default function BookCard({ book }: any) {
  return (
    <Link href={\`/books/\${book.slug}\`} className="bg-surface/50 p-4 rounded-2xl border border-gray-800 hover:border-accent transition-all hover:scale-[1.02] block group">
      <div className="aspect-[3/4] w-full overflow-hidden rounded-xl mb-4 bg-gray-800">
        <img src={book.coverUrl} alt={book.titleFa} className="w-full h-full object-cover group-hover:opacity-90 transition" />
      </div>
      <span className="text-xs text-accent font-bold uppercase tracking-wider">{book.category}</span>
      <h3 className="text-xl font-bold mt-2 group-hover:text-accent transition">{book.titleFa}</h3>
      <p className="text-sm text-gray-400 mb-4">{book.authorFa}</p>
      <div className="flex justify-between items-center pt-4 border-t border-gray-700 text-sm">
        <span className="text-gray-500 flex items-center gap-1">🎧 ۱۴ دقیقه</span>
        <span className="text-accent font-semibold">▶ گوش دادن</span>
      </div>
    </Link>
  );
}
`);

// 9. AudioPlayer Component
writeFile('src/components/AudioPlayer.tsx', `
'use client';
import { useState, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

export default function AudioPlayer({ episode }: any) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  return (
    <div className="bg-background p-6 rounded-2xl border border-gray-800 shadow-xl">
      <audio ref={audioRef} src={episode.audioUrl} />
      <div className="flex items-center justify-center gap-8 mb-4">
        <button onClick={() => skip(-15)} className="text-gray-400 hover:text-accent p-3 rounded-full hover:bg-gray-800 transition" aria-label="15 ثانیه قبل">
          <SkipBack size={28} />
        </button>
        <button onClick={togglePlay} className="bg-accent text-white p-5 rounded-full hover:bg-purple-600 transition shadow-lg shadow-accent/30" aria-label={isPlaying ? "توقف" : "پخش"}>
          {isPlaying ? <Pause size={40} /> : <Play size={40} className="mr-[-2px]" />}
        </button>
        <button onClick={() => skip(15)} className="text-gray-400 hover:text-accent p-3 rounded-full hover:bg-gray-800 transition" aria-label="15 ثانیه بعد">
          <SkipForward size={28} />
        </button>
      </div>
      <div className="text-center">
        <p className="font-bold text-lg">{episode.title}</p>
        <p className="text-sm text-gray-500 mt-1">{Math.floor(episode.durationSeconds / 60)} دقیقه</p>
      </div>
    </div>
  );
}
`);

// 10. Pages (Home, Books, Detail, About, 404)
writeFile('src/app/page.tsx', `
import Hero from '@/components/Hero';
import { books } from '@/lib/books';
import BookCard from '@/components/BookCard';

export default function Home() {
  return (
    <div>
      <Hero />
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex justify-between items-end mb-10">
          <h2 className="text-3xl font-bold">آخرین اپیزودها</h2>
          <a href="/books" className="text-accent hover:underline text-sm font-semibold">مشاهده همه ←</a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {books.map((book: any) => (
            <BookCard key={book.slug} book={book} />
          ))}
        </div>
      </section>
    </div>
  );
}
`);

writeFile('src/app/books/page.tsx', `
import { books } from '@/lib/books';
import BookCard from '@/components/BookCard';

export default function BooksPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-10">کتاب‌ها</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {books.map((book: any) => (
          <BookCard key={book.slug} book={book} />
        ))}
      </div>
    </div>
  );
}
`);

writeFile('src/app/books/[slug]/page.tsx', `
import { books } from '@/lib/books';
import { episodes } from '@/lib/episodes';
import AudioPlayer from '@/components/AudioPlayer';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  return books.map((book) => ({ slug: book.slug }));
}

export default function BookPage({ params }: { params: { slug: string } }) {
  const book = books.find(b => b.slug === params.slug);
  if (!book) return notFound();
  const episode = episodes.find(ep => ep.bookSlug === book.slug);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row gap-8 mb-12">
        <div className="w-full md:w-1/3">
          <img src={book.coverUrl} alt={book.titleFa} className="w-full aspect-[3/4] object-cover rounded-2xl shadow-2xl shadow-accent/10" />
        </div>
        <div className="w-full md:w-2/3">
          <span className="text-accent font-bold uppercase tracking-wider text-sm">{book.category}</span>
          <h1 className="text-4xl font-bold mt-2 mb-2">{book.titleFa}</h1>
          <p className="text-xl text-gray-400 mb-6">{book.titleEn} • {book.authorFa}</p>
          <p className="text-gray-300 leading-relaxed text-lg">{book.description}</p>
        </div>
      </div>

      {episode && (
        <div className="bg-surface/50 p-6 md:p-8 rounded-2xl border border-gray-800 mb-12">
          <h2 className="text-2xl font-bold mb-6 text-accent flex items-center gap-2">🎧 اپیزود: {episode.title}</h2>
          <AudioPlayer episode={episode} />
          <p className="mt-6 text-gray-400 leading-relaxed">{episode.description}</p>
        </div>
      )}

      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">ایده‌های کلیدی کتاب</h2>
        <ul className="space-y-4">
          {book.keyIdeas.map((idea: string, i: number) => (
            <li key={i} className="bg-surface/50 p-5 rounded-xl border border-gray-800 flex gap-4 items-start">
              <span className="bg-accent text-white w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">#{i+1}</span>
              <span className="text-gray-200 text-lg">{idea}</span>
            </li>
          ))}
        </ul>
      </div>

      {episode && (
        <div className="bg-surface/50 p-6 md:p-8 rounded-2xl border border-gray-800">
          <h2 className="text-2xl font-bold mb-6">متن اپیزود (Transcript)</h2>
          <p className="text-gray-300 leading-loose whitespace-pre-line text-lg">{episode.transcript}</p>
        </div>
      )}
    </div>
  );
}
`);

writeFile('src/app/about/page.tsx', `
export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">درباره کتاب‌کست</h1>
      <p className="text-lg text-gray-300 leading-loose mb-6">
        کتاب‌کست یک محصول فارسی‌زبان و Open Source است که هدف آن تبدیل ایده‌ها و مفاهیم ارزشمند کتاب‌ها به اپیزودهای پادکستی فارسی، کوتاه، شنیدنی و قابل‌فهم است.
      </p>
      <p className="text-lg text-gray-300 leading-loose mb-6">
        تمرکز اصلی محصول خلاصه متنی کتاب نیست؛ بلکه یک تجربه شنیداری مدرن است که به شما کمک می‌کند در کمتر از ۲۰ دقیقه، مهم‌ترین ایده‌های یک کتاب ارزشمند را بشنوید و درک کنید.
      </p>
      <h2 className="text-2xl font-bold mt-12 mb-6 text-accent">چرا کتاب‌کست؟</h2>
      <ul className="list-disc list-inside text-gray-300 space-y-3 text-lg">
        <li>یادگیری سریع در مسیر رفت‌وآمد و زمان‌های مرده</li>
        <li>کشف کتاب‌های جدید و انتخاب آگاهانه قبل از خرید نسخه کامل</li>
        <li>تجربه Audio-first با کمک هوش مصنوعی و تولید محتوای ساختاریافته</li>
        <li>پشتیبانی کامل از زبان فارسی و راست‌چین (RTL)</li>
      </ul>
    </div>
  );
}
`);

writeFile('src/app/not-found.tsx', `
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="text-center py-20 px-4">
      <h1 className="text-8xl font-bold text-accent mb-6">۴۰۴</h1>
      <p className="text-2xl text-gray-400 mb-10">صفحه‌ای که دنبالش بودید پیدا نشد.</p>
      <Link href="/" className="bg-accent text-white px-8 py-4 rounded-full font-bold hover:bg-purple-600 transition inline-block">
        بازگشت به خانه
      </Link>
    </div>
  );
}
`);

// 11. Data Layer (Books & Episodes)
writeFile('src/lib/books.ts', `
export const books = [
  {
    slug: "atomic-habits",
    titleFa: "عادت‌های اتمی",
    titleEn: "Atomic Habits",
    authorFa: "جیمز کلیر",
    authorEn: "James Clear",
    year: 2018,
    category: "توسعه فردی",
    description: "تغییرات کوچک، نتایج بزرگ. یک راهنمای عملی و علمی برای ساختن عادت‌های خوب و ترک عادت‌های بد. جیمز کلیر در این کتاب نشان می‌دهد که چگونه بهبودهای ۱ درصدی می‌توانند زندگی شما را متحول کنند.",
    coverUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600",
    keyIdeas: [
      "عادت‌ها چرخه‌ای از نشانه، تمایل، پاسخ و پاداش هستند.",
      "برای تغییر عادت، روی سیستم‌ها تمرکز کنید نه اهداف.",
      "قانون ۱٪ بهبود: هر روز فقط ۱ درصد بهتر شوید.",
      "محیط خود را طراحی کنید تا انجام کارهای خوب آسان‌تر شود."
    ],
  },
  {
    slug: "deep-work",
    titleFa: "کار عمیق",
    titleEn: "Deep Work",
    authorFa: "کال نیوپورت",
    authorEn: "Cal Newport",
    year: 2016,
    category: "بهره‌وری",
    description: "در دنیای پر از حواس‌پرتی، توانایی تمرکز عمیق روی کارهای سخت، یک مزیت رقابتی بزرگ است. کال نیوپورت نشان می‌دهد چگونه می‌توان در عصر دیجیتال، کار عمیق انجام داد.",
    coverUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=600",
    keyIdeas: [
      "کار عمیق توانایی تمرکز بدون حواس‌پرتی روی یک کار شناختی سخت است.",
      "کار عمیق کمیاب است و در اقتصاد جدید بسیار ارزشمند است.",
      "برای تسلط بر کار عمیق، باید آن را به یک عادت تبدیل کنید.",
      "تمرین‌های تمرکز مانند مدیتیشن می‌تواند توانایی کار عمیق را تقویت کند."
    ],
  }
];
`);

writeFile('src/lib/episodes.ts', `
export const episodes = [
  {
    id: "atomic-habits-ep1",
    bookSlug: "atomic-habits",
    title: "قدرت تغییرات کوچک",
    description: "چگونه تغییرات ۱ درصدی می‌توانند زندگی شما را متحول کنند؟ در این اپیزود به بررسی هسته اصلی کتاب عادت‌های اتمی می‌پردازیم.",
    durationSeconds: 840,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    transcript: "سلام و به کتاب‌کست خوش آمدید.\\n\\nامروز می‌خواهیم سراغ یکی از مهم‌ترین کتاب‌های دهه اخیر برویم: عادت‌های اتمی اثر جیمز کلیر.\\n\\nتا حالا شده تصمیم بگیرید یک عادت جدید مثل ورزش کردن یا کتاب خواندن را شروع کنید، اما بعد از چند روز رهایش کنید؟ جیمز کلیر می‌گوید مشکل از اراده شما نیست، مشکل از سیستم شماست.\\n\\nایده اول: روی اهداف تمرکز نکنید، روی سیستم‌ها تمرکز کنید. برنده‌ها و بازندگان هر دو هدف‌های یکسانی دارند. چیزی که آن‌ها را متمایز می‌کند، سیستمی است که برای رسیدن به آن هدف ساخته‌اند.\\n\\nایده دوم: قانون ۱ درصد. اگر شما هر روز فقط ۱ درصد بهتر شوید، در پایان سال ۳۷ برابر بهتر خواهید شد. عادت‌های اتمی، کوچک هستند اما قدرت آن‌ها در تداومشان نهفته است.\\n\\nبرای شروع، از محیط خود آغاز کنید. نشانه‌های عادت‌های خوب را در معرض دید قرار دهید و نشانه‌های عادت‌های بد را پنهان کنید.\\n\\nاگر این اپیزود برایتان مفید بود، کتاب‌کست را دنبال کنید و اپیزود بعدی را بشنوید.",
    keyIdeas: ["تمرکز بر سیستم‌ها", "قانون ۱ درصد"],
    format: "standard",
  },
  {
    id: "deep-work-ep1",
    bookSlug: "deep-work",
    title: "تمرکز در عصر حواس‌پرتی",
    description: "چگونه در دنیای پر از نوتیفیکیشن و حواس‌پرتی، کار عمیق و باکیفیت انجام دهیم؟",
    durationSeconds: 900,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    transcript: "به کتاب‌کست خوش آمدید.\\n\\nامروز درباره کتابی صحبت می‌کنیم که می‌تواند شیوه کار شما را کاملاً تغییر دهد: کار عمیق اثر کال نیوپورت.\\n\\nما در عصری زندگی می‌کنیم که حواس‌پرتی به یک عادت روزمره تبدیل شده. ایمیل‌ها، شبکه‌های اجتماعی، پیام‌ها - همه در حال جنگیدن برای توجه ما هستند.\\n\\nاما کال نیوپورت می‌گوید که در اقتصاد جدید، کسانی که بتوانند کار عمیق انجام دهند، برنده خواهند بود. کار عمیق یعنی توانایی تمرکز بدون حواس‌پرتی روی کارهای شناختی سخت.\\n\\nایده اول: کار عمیق کمیاب است. اکثر مردم نمی‌توانند بیش از چند دقیقه تمرکز کنند. اگر شما این توانایی را داشته باشید، یک مزیت رقابتی بزرگ دارید.\\n\\nایده دوم: کار عمیق ارزشمند است. در دنیایی که هوش مصنوعی می‌تواند کارهای روتین را انجام دهد، کار عمیق انسان‌ها ارزش بیشتری پیدا می‌کند.\\n\\nایده سوم: کار عمیق نیاز به تمرین دارد. مثل یک عضله، توانایی تمرکز را می‌توان با تمرین تقویت کرد.\\n\\nاگر این اپیزود برایتان مفید بود، کتاب‌کست را دنبال کنید.",
    keyIdeas: ["کار عمیق کمیاب است", "تمرین تمرکز"],
    format: "standard",
  }
];
`);

// 12. GitHub Actions CI/CD for GitHub Pages
writeFile('.github/workflows/deploy.yml', `
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
      - name: Install dependencies
        run: npm install
      - name: Build with Next.js
        run: npm run build
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./out

  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`);

console.log("\\n✅ KetabCast Setup Complete! 🎉");
console.log("Next steps:");
console.log("1. git add .");
console.log("2. git commit -m 'feat: initial launch of KetabCast MVP'");
console.log("3. git push origin main");