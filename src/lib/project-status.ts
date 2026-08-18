export const projectStatus = {
  version: "v0.2.0-beta.5.1.20",
  productionAudio: {
    ready: 5,
    total: 5,
  },
  dualVoice: {
    selectedVoices: [
      "Sulafat / Warm",
      "Schedar / Even",
    ],
    verifiedVariants: 0,
    targetVariants: 10,
    stage:
      "Batch A علاوه بر provenance چندنسلی، fallback ساختاری coverage دارد؛ اگر یک segment پس از دو تلاش کامل هنوز کوتاه باشد، متن بدون بازنویسی روی مرز جمله به childهای حداکثر ۷۰ کلمه‌ای شکسته می‌شود، childها مستقل و durable checkpoint می‌شوند و سپس parent بازسازی می‌شود؛ floor ۰٫۲۵ ثانیه بر کلمه، SSE و fail-closed حفظ شده و هنوز ۰/۱۰ است.",
  },
  currentMilestone: {
    title: "Dual-Voice Batch A",
    issueNumber: 53,
    issueUrl:
      "https://github.com/AmirMotefaker/KetabCast/issues/53",
  },
  releasesUrl:
    "https://github.com/AmirMotefaker/KetabCast/releases",
} as const;
