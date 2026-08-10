# 🎧 کتاب‌کست (KetabCast)

**هر کتاب ارزشمند، یک اپیزود فارسی شنیدنی.**

کتاب‌کست یک محصول فارسی‌زبان و Open Source است که ایده‌ها و مفاهیم ارزشمند کتاب‌ها را به اپیزودهای پادکستی فارسی، کوتاه و شنیدنی تبدیل می‌کند؛ با کمک هوش مصنوعی.

## ✨ ویژگی‌ها

- 🎧 تجربه Audio-first با پلیر اختصاصی
- 📚 صفحه اختصاصی هر کتاب با ایده‌های کلیدی و Transcript
- 📱 Mobile-first و کاملاً Responsive
- 🌙 تم تاریک مدرن با لهجه بنفش
- 🇮🇷 فارسی و راست‌چین (RTL) با فونت وزیرمتن
- ⚡ Static Site Generation با Next.js
- 🤖 Online Content Factory رایگان‌محور روی GitHub Actions (research → script → TTS → QA → GitHub Release Assets)

## 🛠️ Tech Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- Lucide React
- GitHub Actions + GitHub Pages

## 🏃‍♂️ اجرای لوکال

npm install
npm run dev

سپس باز کنید: http://localhost:3000/KetabCast

## 📦 خروجی Static

npm run build

پوشه out برای دیپلوی آماده است.

## 🗺️ Roadmap

- v0.1.0 — Foundation ✅
- v0.2.0 — Audio (TTS واقعی)
- v0.3.0 — AI Pipeline
- v1.0.0 — Production Platform

## ⚖️ Disclaimer

کتاب‌کست محتوای خلاصه و تحلیلی مستقل ارائه می‌کند و جایگزین مطالعه نسخه کامل کتاب نیست.

## 📄 License

MIT

<!-- BEGIN:ketabcast-governance -->

## 📚 سند مرجع و وضعیت توسعه

سند اصلی محصول و مهندسی پروژه در [`KETABCAST_MASTER_DOC.md`](./KETABCAST_MASTER_DOC.md) نگهداری می‌شود. هر توسعه‌دهنده یا AI Agent باید پیش از تغییرات معنادار، بخش «۰. خلاصه اجرایی» و «۱۳. نقشه‌راه دقیق» آن را بخواند.

**فاز جاری:** `v0.2.0 — Audio واقعی`

وضعیت v0.2.0-alpha.8: انتقال artifactهای hidden کارخانه در GitHub Actions اصلاح شده است؛ `.factory-output` با `include-hidden-files` آپلود می‌شود و قبل از upload یک guard برای فایل‌های secret-like و نشت credential اجرا می‌شود.

### GitHub lifecycle

تمام milestoneهای معنادار با این چرخه منتشر می‌شوند:

`Issue → Branch → Commit → Pull Request → Checks/Evidence → Merge → Exact-SHA Tag → GitHub Release`

جزئیات قواعد Agent در [`AGENTS.md`](./AGENTS.md) قرار دارد.

<!-- END:ketabcast-governance -->
