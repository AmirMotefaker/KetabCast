
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
