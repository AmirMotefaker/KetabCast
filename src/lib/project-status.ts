export const projectStatus = {
  version: "v0.2.0-beta.5.1.18",
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
      "Batch A coverage-safe‌تر شده؛ segmentهای حداکثر ۱۸۰ کلمه‌ای و checkpointهای prefix حفظ می‌شوند و اگر provider صوت ناقص بدهد فقط یک coverage recovery با complete-recitation framing مجاز است؛ floor برابر ۰٫۲۵ ثانیه بر کلمه همچنان صوت ناقص را رد می‌کند؛ هنوز ۰/۱۰ است.",
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
