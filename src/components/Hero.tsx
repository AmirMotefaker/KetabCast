import { Headphones, BookOpen } from "lucide-react";

export const Hero = () => (
  <section className="pt-20 text-center">
    <div className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full text-violet-300 text-sm mb-6 border border-violet-500/20">
      <Headphones size={14} /><span>پادکست فارسی کتاب، ساخته‌شده با هوش مصنوعی</span>
    </div>
    <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
      هر کتاب ارزشمند، <br/><span className="text-transparent bg-clip-text bg-gradient-to-l from-violet-400 to-purple-300">یک اپیزود فارسی شنیدنی.</span>
    </h1>
    <p className="text-gray-400 max-w-2xl mx-auto text-lg mb-10">
      ایده‌های مهم کتاب‌ها را به اپیزودهای فارسی شنیدنی تبدیل می‌کنیم؛ با کمک هوش مصنوعی.
    </p>
    <div className="flex justify-center gap-4">
      <button className="bg-violet-500 hover:bg-violet-600 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg shadow-violet-500/30">
        <Headphones size={20} /> شروع شنیدن
      </button>
      <button className="bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition-colors border border-white/10">
        <BookOpen size={20} /> کشف کتاب‌ها
      </button>
    </div>
  </section>
);