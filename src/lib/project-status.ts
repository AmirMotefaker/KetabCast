export const projectStatus = {
  version: "v0.2.0-beta.5.1.13",
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
      "Batch A stale-Interaction-aware شده؛ pending ID حداکثر دو پنجره polling دارد، سپس با provenance حفظ‌شده بازنشسته می‌شود و فقط یک generation POST تازه برای همان chunk مجاز است؛ هنوز ۰/۱۰ است.",
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
