<div align="center">

<img src="./docs/assets/zobdino-github-banner.svg" width="100%" alt="Zobdino — AI-powered Persian book summaries and audio learning" />

# Zobdino · زبدینو

### خلاصه‌های هوشمند و شنیداری کتاب؛ فارسی، متن‌باز، قابل ممیزی.

**Persian book summaries · Farsi audio learning · AI content pipeline · Persian TTS · Open Source**

[Website](https://zobdino.ir/) ·
[Books](https://zobdino.ir/books/) ·
[Releases](../../releases) ·
[Roadmap](./ZOBDINO_MASTER_DOC.md) ·
[Contributing](./CONTRIBUTING.md) ·
[Security](./SECURITY.md)

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)
![Persian](https://img.shields.io/badge/Language-Persian-7C3AED)
![RTL](https://img.shields.io/badge/UX-RTL%20%2B%20Mobile--first-111827)
![AI Pipeline](https://img.shields.io/badge/Pipeline-AI%20%2B%20Automation-6D28D9)
![License](https://img.shields.io/badge/License-MIT-0F766E)

</div>

---

## زبدینو چیست؟

**زبدینو (Zobdino)** یک پلتفرم فارسی‌زبان و متن‌باز برای **خلاصه‌سازی، روایت و شنیدن ایده‌های کلیدی کتاب‌های غیرداستانی** است.

هدف ساده است: وقتی برای شناخت اولیه‌ی یک کتاب چند ساعت زمان ندارید، زبدینو یک اپیزود فارسی منسجم و شنیدنی در اختیار شما قرار می‌دهد تا ایده‌های اصلی، نکات کاربردی و مسیر فکری کتاب را سریع‌تر مرور کنید.

زبدینو فقط یک وب‌سایت خلاصه کتاب نیست. هسته‌ی پروژه یک **AI-first content and audio pipeline** است که research، source pack، Persian script، TTS، audio QA، evidence و انتشار versioned را به یک lifecycle قابل بررسی روی GitHub متصل می‌کند.

> زبدینو جایگزین کتاب کامل نیست. هر اپیزود یک روایت مستقل از ایده‌های عمومی و منابع مجاز پیرامون کتاب است.

## What is Zobdino?

**Zobdino** is an open-source platform for **Persian book summaries and Farsi audio learning**.

It turns legally sourced research into concise Persian scripts, synthesized narration, quality-checked production audio and verifiable release artifacts. The project is designed for readers and listeners who want a fast, structured introduction to high-value nonfiction books while keeping the underlying publishing process transparent and reproducible.

Zobdino focuses on:

- Persian / Farsi nonfiction book summaries
- short-form audio learning
- AI-assisted research and script generation
- Persian text-to-speech and voice experimentation
- reproducible audio QA
- transparent GitHub-based evidence and releases

## چرا زبدینو متفاوت است؟

| اصل | در زبدینو |
|---|---|
| **Persian-first** | تجربه RTL، متن فارسی و کیفیت شنیداری فارسی از ابتدا جزو معماری محصول است |
| **Audio-first** | پلیر، resume، queue، speed، sleep timer، bookmark، Media Session و transcript UX |
| **Automation-first** | research → script → TTS → mastering → QA → release تا حد ممکن خودکار است |
| **Verifiable** | hash، bytes، asset integrity، evidence و release lifecycle قابل بررسی هستند |
| **Open Source** | معماری، CI/CD و مسیر توسعه روی GitHub قابل مشاهده است |
| **Copyright-aware** | متن کامل کتاب بازنشر یا ترجمه‌ی فصل‌به‌فصل نمی‌شود |

## تجربه محصول

زبدینو برای یک تجربه‌ی شنیداری سریع و کاربردی ساخته شده است:

- خلاصه‌های فارسی کتاب‌های غیرداستانی
- اپیزودهای کوتاه و قابل مصرف در رفت‌وآمد یا زمان‌های مرده
- Global Mini Player
- Seek / progress / playback speed
- Resume listening
- Queue و autoplay
- Sleep timer
- Bookmark و timestamp sharing
- Media Session integration
- Transcript search
- RTL و mobile-first UX

## خط تولید AI و Audio

```mermaid
flowchart LR
    A[Official / Legal Sources] --> B[Research & Source Pack]
    B --> C[Persian Summary Script]
    C --> D[Persian TTS]
    D --> E[FFmpeg Mastering]
    E --> F[ASR + Audio QA]
    F --> G[Immutable Release Assets]
    G --> H[Metadata Promotion]
    H --> I[GitHub Pages / zobdino.ir]
```

هر مرحله باید قابل تکرار، قابل ممیزی و تا حد ممکن deterministic باشد. فایل صوتی production فقط پس از عبور از validation و integrity checks وارد metadata عمومی می‌شود.

## Quality & provenance

برای فایل‌های صوتی production این موارد بررسی می‌شوند:

- SHA-256 فایل محلی
- اندازه فایل
- وضعیت GitHub Release Asset
- digest asset
- دانلود مجدد عمومی
- SHA-256 فایل دانلودشده
- HTTP Range support
- episode metadata contract
- text hygiene
- production build

تغییر صدای production نیز یک **Human Listening Gate** محدود دارد تا تلفظ، لحن و تجربه فارسی قربانی automation نشود.

## وضعیت محصول

**Current code version:** `v0.2.0-beta.5.1.20`

- ✅ Next.js static web app
- ✅ Persian RTL / mobile-first interface
- ✅ 5 production book episodes in the catalog
- ✅ production audio stored as GitHub Release Assets
- ✅ content factory validation
- ✅ audio QA and integrity pipeline
- ✅ GitHub Actions CI/CD
- ✅ custom domain: `zobdino.ir`
- 🔧 next-generation dual-voice production remains an active engineering milestone

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 · React 19 · TypeScript |
| UI | Tailwind CSS v4 · Lucide React |
| UX | Persian · RTL · Mobile-first |
| Content pipeline | Node.js automation |
| AI research / scripting | Gemini + fallback strategy |
| TTS | Gemini TTS review pipeline · Piper fallback |
| Audio | FFmpeg |
| ASR / QA | faster-whisper + custom validators |
| CI/CD | GitHub Actions |
| Hosting | GitHub Pages |
| Audio storage | GitHub Release Assets |

## Repository map

```text
.
├── .github/workflows/       # CI, Pages and content/audio automation
├── content/                 # research/source packs and evidence contracts
├── data/audio/              # voice and pronunciation contracts
├── docs/                    # engineering, release and brand documentation
├── scripts/                 # content factory, TTS, QA and publishing tools
├── src/app/                 # Next.js routes
├── src/components/          # UI and player
├── src/content/             # production episode metadata
├── AGENTS.md                # repository execution rules
└── ZOBDINO_MASTER_DOC.md    # product + engineering source of truth
```

## Local development

```bash
npm ci
npm run dev
```

Open:

```text
http://localhost:3000
```

Full validation:

```bash
npm run lint
npm run typecheck
npm run check:text
npm run check:episodes
npm run factory:validate
npm run build
```

## Engineering lifecycle

Every meaningful milestone follows an auditable lifecycle:

```text
Issue
  ↓
isolated branch / worktree
  ↓
implementation
  ↓
local validation
  ↓
Pull Request
  ↓
GitHub CI
  ↓
exact-head merge
  ↓
post-merge CI / Pages
  ↓
evidence / release
```

Local-only progress is not considered a completed milestone.

## Roadmap

Near-term priorities:

- [x] production web MVP
- [x] real production audio
- [x] 5-book MVP catalog
- [x] reproducible content factory
- [x] advanced listening UX
- [x] Zobdino brand migration
- [x] `zobdino.ir` custom-domain launch path
- [ ] final GitHub organization + repository namespace cutover
- [ ] production dual-voice promotion
- [ ] RSS / podcast distribution
- [ ] sitemap / structured SEO hardening
- [ ] broader catalog expansion

The authoritative roadmap is maintained in [`ZOBDINO_MASTER_DOC.md`](./ZOBDINO_MASTER_DOC.md).

## Brand and canonical identity

Canonical product name:

**Zobdino · زبدینو**

Canonical web domain:

**https://zobdino.ir/**

The project was originally developed under the name **KetabCast / کتاب‌کست**. Historical release assets, evidence and published transcript provenance may retain that original repository identity intentionally.

Active branding follows [`docs/BRAND.md`](./docs/BRAND.md).

## Legal approach

For copyrighted books, Zobdino does **not** republish the full book and does not provide chapter-by-chapter translation.

The content pipeline is designed around legal/official sources, public metadata and permitted source packs. Published episodes are independent Persian summaries and commentary intended for discovery, review and learning.

## Open source & contribution

Contributions are welcome.

Before making a meaningful change:

1. Read [`ZOBDINO_MASTER_DOC.md`](./ZOBDINO_MASTER_DOC.md).
2. Follow [`AGENTS.md`](./AGENTS.md).
3. Read [`CONTRIBUTING.md`](./CONTRIBUTING.md).
4. Link the change to an Issue.
5. Provide reproducible validation evidence.

Security reports should follow [`SECURITY.md`](./SECURITY.md).

## License

The software in this repository is released under the [MIT License](./LICENSE).

Content, third-party book references, cover art and media may have separate rights and must be reviewed independently.

---

<div align="center">

### Zobdino · زبدینو

**Read less to discover more. Listen in Persian.**

https://zobdino.ir/

</div>