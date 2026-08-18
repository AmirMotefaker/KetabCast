export const projectStatus = {
  version: "v0.2.0-beta.5.1.16",
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
      "Batch A long-form-safe شده؛ canonical checkpointهای دوگانه حفظ می‌شوند، fresh TTS در segmentهای حداکثر ۲۲۰ کلمه‌ای ساخته می‌شود و duration-per-word gate مانع reuse یا ثبت صوت ناقص می‌شود؛ هنوز ۰/۱۰ است.",
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
