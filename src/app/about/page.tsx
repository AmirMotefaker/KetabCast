import Link from "next/link";
import {
  AudioLines,
  Bot,
  BookOpen,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const pipeline = [
  {
    title: "منابع قانونی و معتبر",
    text: "اطلاعات کتاب از منابع رسمی، صفحات نویسنده و metadata عمومی جمع‌آوری و به یک Source Pack قابل ممیزی تبدیل می‌شود.",
    icon: BookOpen,
  },
  {
    title: "تحقیق و اسکریپت با AI",
    text: "مدل هوش مصنوعی ایده‌های اصلی را استخراج می‌کند و یک روایت مستقل، کاربردی و فارسی برای اپیزود می‌سازد.",
    icon: Bot,
  },
  {
    title: "تولید و مسترینگ صوت",
    text: "اسکریپت با TTS فارسی تولید، با FFmpeg مستر و برای تجربه‌ی شنیداری موبایل آماده می‌شود.",
    icon: AudioLines,
  },
  {
    title: "QA و انتشار قابل اثبات",
    text: "ASR، کنترل‌های ساختاری، SHA-256 و دانلود مجدد asset بررسی می‌شوند؛ سپس فایل تأییدشده منتشر می‌شود.",
    icon: ShieldCheck,
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-14 md:py-20">
      <section className="max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent mb-6">
          <Sparkles size={16} />
          Zobdino · AI-powered book summaries
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-7">
          درباره <span className="text-accent">زبدینو</span>
        </h1>

        <p className="text-xl text-gray-300 leading-9 mb-5">
          زبدینو یک محصول فارسی‌زبان و متن‌باز برای تبدیل ایده‌های اصلی
          کتاب‌های غیرداستانی به خلاصه‌های شنیداری کوتاه، منسجم و کاربردی
          است.
        </p>

        <p className="text-lg text-gray-400 leading-8">
          هدف ساده است: اگر برای خواندن کامل یک کتاب وقت ندارید، زبدینو
          باید در حدود ۱۰ تا ۱۸ دقیقه تصویری دقیق از ایده‌های کلیدی آن به
          شما بدهد؛ نه به‌عنوان جایگزین کتاب، بلکه برای کشف، مرور و یادگیری
          سریع.
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-3xl font-bold mb-3">از کتاب تا اپیزود</h2>
        <p className="text-gray-400 mb-8 max-w-3xl leading-8">
          هسته‌ی زبدینو یک خط تولید AI و Automation است. هر مرحله evidence
          تولید می‌کند تا بدانیم محتوا از کجا آمده، چگونه ساخته شده و چه
          فایلی در نهایت منتشر شده است.
        </p>

        <div className="grid md:grid-cols-2 gap-5">
          {pipeline.map(({ title, text, icon: Icon }) => (
            <article
              key={title}
              className="rounded-2xl border border-gray-800 bg-surface/60 p-6"
            >
              <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-5">
                <Icon size={22} />
              </div>
              <h3 className="text-xl font-bold mb-3">{title}</h3>
              <p className="text-gray-400 leading-7">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16 rounded-3xl border border-gray-800 bg-gradient-to-b from-surface to-background p-7 md:p-10">
        <h2 className="text-3xl font-bold mb-5">AI-first، اما قابل اعتماد</h2>
        <div className="space-y-4 text-gray-300 leading-8">
          <p>
            زبدینو برای تولید سریع‌تر از هوش مصنوعی استفاده می‌کند، اما
            خروجی AI به‌تنهایی معیار انتشار نیست. ساختار محتوا، منابع،
            کیفیت صوت و integrity فایل‌ها قبل از promotion بررسی می‌شوند.
          </p>
          <p>
            برای کتاب‌های دارای کپی‌رایت، محصول متن کامل را بازنشر یا
            فصل‌به‌فصل ترجمه نمی‌کند؛ خروجی یک خلاصه و روایت مستقل از
            ایده‌های اصلی است.
          </p>
          <p>
            در مرحله‌ی فعلی beta، تغییر صدای production یک Human Listening
            Gate هم دارد تا تلفظ، لحن و تجربه‌ی شنیداری فارسی قبل از
            جایگزینی فایل زنده بررسی شود.
          </p>
        </div>
      </section>

      <section className="mt-16 grid md:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-gray-800 p-6">
          <div className="text-4xl font-extrabold text-accent mb-2">2</div>
          <div className="font-semibold">اپیزود واقعی منتشرشده</div>
          <div className="text-sm text-gray-500 mt-2">
            Atomic Habits و Deep Work
          </div>
        </div>
        <div className="rounded-2xl border border-gray-800 p-6">
          <div className="text-4xl font-extrabold text-accent mb-2">5</div>
          <div className="font-semibold">هدف MVP</div>
          <div className="text-sm text-gray-500 mt-2">
            پنج خلاصه‌ی صوتی واقعی
          </div>
        </div>
        <div className="rounded-2xl border border-gray-800 p-6">
          <div className="text-4xl font-extrabold text-accent mb-2">100%</div>
          <div className="font-semibold">هسته Open Source</div>
          <div className="text-sm text-gray-500 mt-2">
            کد، معماری و lifecycle روی GitHub
          </div>
        </div>
      </section>

      <section className="mt-16 border-t border-gray-800 pt-10">
        <h2 className="text-2xl font-bold mb-4">از کتاب‌کست تا زبدینو</h2>
        <p className="text-gray-400 leading-8 max-w-3xl mb-7">
          نسخه‌های اولیه‌ی پروژه با نام «کتاب‌کست» ساخته شدند. از
          v0.2.0-beta.2 برند رسمی محصول «زبدینو / Zobdino» است. برای حفظ
          صحت evidence، releaseهای تاریخی و transcript فایل‌های صوتی قبلی
          بازنویسی نمی‌شوند.
        </p>

        <Link
          href="https://github.com/AmirMotefaker/KetabCast"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-gray-100 text-gray-950 px-6 py-3 font-bold hover:bg-white transition"
        >
          مشاهده پروژه در GitHub
          <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </div>
  );
}
