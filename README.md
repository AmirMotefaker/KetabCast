<div align="center">

# زبدینو · Zobdino

### خلاصه‌ی هوشمند کتاب‌ها؛ از تحقیق تا انتشار، با خط تولید AI و Automation.

[![Release](https://img.shields.io/github/v/release/AmirMotefaker/KetabCast?include_prereleases&label=release)](https://github.com/AmirMotefaker/KetabCast/releases)
[![CI](https://github.com/AmirMotefaker/KetabCast/actions/workflows/ci.yml/badge.svg)](https://github.com/AmirMotefaker/KetabCast/actions/workflows/ci.yml)
[![Pages](https://github.com/AmirMotefaker/KetabCast/actions/workflows/deploy.yml/badge.svg)](https://github.com/AmirMotefaker/KetabCast/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Persian](https://img.shields.io/badge/language-Persian-7c3aed)](#)
[![AI Pipeline](https://img.shields.io/badge/pipeline-AI%20%2B%20Automation-111827)](#)

**[نسخه زنده](https://amirmotefaker.github.io/KetabCast/)** ·
**[اپیزودها](https://amirmotefaker.github.io/KetabCast/books/)** ·
**[Releaseها](https://github.com/AmirMotefaker/KetabCast/releases)** ·
**[Master Doc](./KETABCAST_MASTER_DOC.md)**

</div>

---

## زبدینو چیست؟

**زبدینو (Zobdino)** یک محصول فارسی‌زبان و متن‌باز برای ساخت و ارائه‌ی **خلاصه‌های شنیداری کتاب‌های غیرداستانی** است.

هدف محصول مشخص است: کاربر به‌جای چند ساعت مطالعه برای آشنایی اولیه با یک کتاب، بتواند در حدود ۱۰ تا ۱۸ دقیقه ایده‌های اصلی، نکات کاربردی و مسیر فکری کتاب را در قالب یک اپیزود فارسی منسجم بشنود.

تولید محتوا در زبدینو به‌صورت **AI-first و automation-first** طراحی شده است؛ از گردآوری منابع قانونی و ساخت source pack تا تولید اسکریپت فارسی، TTS، کنترل کیفیت صوت، نگهداری evidence و انتشار versioned روی GitHub.

> زبدینو جایگزین کتاب کامل نیست. هر اپیزود یک خلاصه و روایت مستقل از ایده‌های کتاب است و برای کشف، مرور و یادگیری سریع طراحی شده است.

## وضعیت فعلی

**نسخه عمومی:** `v0.2.0-beta.4.2`

| بخش | وضعیت |
|---|---|
| وب‌اپ فارسی RTL / Mobile-first | ✅ Live |
| Next.js Static Export + GitHub Pages | ✅ Live |
| پلیر صوتی با Seek / Progress / Speed / A11y | ✅ |
| Atomic Habits — صوت واقعی | ✅ |
| Deep Work — صوت واقعی | ✅ |
| GitHub Release Assets + SHA-256 integrity | ✅ |
| خط تولید research → script → audio → QA | ✅ |
| صدای دوگانه Sulafat / Schedar | 🧪 Review pending |
| هدف MVP | **۲ اپیزود واقعی + ۳ عنوان منتخب در خط تولید؛ 5/5 catalog** |
| دامنه `zobdino.ir` | ثبت شده؛ اتصال DNS/HTTPS در milestone جدا |

نسخه‌ی زنده فعلاً از GitHub Pages سرو می‌شود:

**https://amirmotefaker.github.io/KetabCast/**

## خط تولید خودکار محتوا

```mermaid
flowchart LR
    A[منابع رسمی و قانونی] --> B[Research / Source Pack]
    B --> C[AI Persian Script]
    C --> D[Persian TTS]
    D --> E[FFmpeg Mastering]
    E --> F[ASR / Audio QA]
    F --> G[Immutable Release Assets]
    G --> H[Metadata Promotion]
    H --> I[GitHub Pages]
```

اصل معماری این است که تولید یک اپیزود جدید تا حد ممکن reproducible و قابل ممیزی باشد. Evidence تحقیق، اسکریپت، QA و hash فایل صوتی همراه lifecycle پروژه نگهداری می‌شوند.

### مدل کنترل کیفیت

زبدینو automation-first است، اما در نسخه بتا برای تغییر صدای production یک **Human Listening Gate** نیز داریم. این gate قرار نیست جای automation را بگیرد؛ فقط آخرین لایه‌ی کیفیت برای تلفظ، لحن و تجربه‌ی شنیداری فارسی است.

## معماری انتشار صوت

فایل‌های production داخل repository commit نمی‌شوند. MP3های تأییدشده در **GitHub Release Assets** قرار می‌گیرند و قبل از promotion این موارد بررسی می‌شوند:

- SHA-256 فایل محلی
- تعداد bytes
- GitHub asset state
- GitHub digest
- دانلود عمومی مجدد
- SHA-256 فایل دانلودشده
- HTTP Range support

نمونه‌ی release رسانه:

[`media-v0.2.0-beta.1`](https://github.com/AmirMotefaker/KetabCast/releases/tag/media-v0.2.0-beta.1)

## Tech Stack

| لایه | فناوری |
|---|---|
| Frontend | Next.js 16 · App Router · TypeScript |
| UI | Tailwind CSS v4 · Lucide React |
| زبان/UX | Persian · RTL · Vazirmatn · Mobile-first |
| AI Research/Script | Gemini + free-first fallbacks |
| TTS | Gemini TTS review pipeline · Piper baseline |
| Audio | FFmpeg |
| QA | faster-whisper + custom validation |
| CI/CD | GitHub Actions |
| Hosting | GitHub Pages |
| Audio Storage | GitHub Release Assets |
| Source Control | GitHub |

## ساختار پروژه

```text
.
├── .github/workflows/       # CI, Pages, content/voice automation
├── content/                 # source packs, factory contracts, evidence
├── data/audio/              # voice selection / pronunciation contracts
├── docs/                    # engineering and release evidence
├── scripts/                 # content factory, TTS, audio QA, promotion
├── src/app/                 # Next.js routes
├── src/components/          # UI + audio player
├── src/content/             # production episode metadata
├── AGENTS.md                # agent execution rules
└── KETABCAST_MASTER_DOC.md  # authoritative product/engineering source
```

## اجرای محلی

```bash
npm ci
npm run dev
```

سپس:

```text
http://localhost:3000/KetabCast
```

Validation کامل:

```bash
npm run lint
npm run typecheck
npm run check:text
npm run check:episodes
npm run factory:validate
npm run build
```

## GitHub lifecycle

هر milestone معنادار با lifecycle قابل مشاهده و قابل audit منتشر می‌شود:

```text
Issue
  ↓
agent/* branch
  ↓
Commit
  ↓
Pull Request
  ↓
CI / Evidence
  ↓
Merge
  ↓
Exact-SHA annotated tag
  ↓
GitHub Release
```

Local-only progress، milestone تمام‌شده محسوب نمی‌شود.

## Roadmap نزدیک

- [x] Foundation و Static MVP
- [x] پلیر صوتی واقعی
- [x] AI content factory اولیه
- [x] دو اپیزود production با GitHub Release Assets
- [x] برند نهایی **Zobdino / زبدینو**
- [x] انتخاب و اضافه‌شدن سه عنوان بعدی MVP به catalog و factory: Think Again، Zero to One، تیم ایدئال
- [x] Next-Gen Listening: Global Mini Player، Resume، Queue/Autoplay، Sleep Timer، Bookmark، timestamp share، Media Session و Transcript Search (v0.2.0-beta.4)
- [x] Factory batch ایمن `new-three` برای تولید و انتشار یک‌جای Think Again، Zero to One و تیم ایدئال بدون بازتولید دو صوت موجود (v0.2.0-beta.4.1)
- [x] Promotion contract برای append کردن اپیزود جدید فقط پس از verification کامل asset (v0.2.0-beta.4.2)
- [ ] اتصال `zobdino.ir` + HTTPS
- [ ] Voice Review نهایی Sulafat / Schedar
- [ ] promotion دقیق فایل‌های صوتی review‌شده
- [ ] انتخاب و تولید ۳ عنوان بعدی برای رسیدن به 5/5
- [ ] RSS / Podcast distribution
- [ ] SEO / OpenGraph / sitemap hardening

## درباره تغییر نام

نسخه‌های اولیه‌ی پروژه با نام **KetabCast / کتاب‌کست** توسعه داده شدند. برند محصول از `v0.2.0-beta.2` به بعد **Zobdino / زبدینو** است.

برای حفظ provenance:

- نام repository فعلاً `AmirMotefaker/KetabCast` باقی می‌ماند.
- releaseها و evidenceهای تاریخی rename نمی‌شوند.
- transcript فایل‌های صوتی beta.1 دست‌کاری نمی‌شود، چون متن باید با صدای منتشرشده منطبق بماند.
- migration کامل صوتی برند همراه Voice Review بعدی انجام می‌شود.

## حقوق محتوا

زبدینو برای کتاب‌های دارای کپی‌رایت، متن کامل کتاب را بازنشر یا ترجمه‌ی فصل‌به‌فصل نمی‌کند.

Pipeline بر منابع قانونی/رسمی، metadata عمومی و source packهای مجاز تکیه می‌کند و خروجی یک روایت مستقل فارسی از ایده‌های اصلی کتاب است.

## مشارکت

پروژه Open Source است. قبل از تغییرات معنادار:

1. [`KETABCAST_MASTER_DOC.md`](./KETABCAST_MASTER_DOC.md) را بخوانید.
2. [`AGENTS.md`](./AGENTS.md) را رعایت کنید.
3. تغییر را به Issue مرتبط کنید.
4. PR و evidence قابل بررسی ارائه دهید.

## License

MIT

---

<div align="center">

**Zobdino · زبدینو**

خلاصه‌ی هوشمند کتاب‌ها، آماده برای شنیدن.

</div>
