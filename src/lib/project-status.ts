export const projectStatus = {
  version: "v0.2.0-beta.5.1.11",
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
      "Batch A resume-aware شده؛ checkpoint معتبر با SHA/provenance بازیابی می‌شود و free-tier 429 بدون مصرف retryهای تکراری fail-closed می‌شود؛ هنوز ۰/۱۰ است.",
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
