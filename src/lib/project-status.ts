export const projectStatus = {
  version: "v0.2.0-beta.5.1.14",
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
      "Batch A checkpoint-recovery-aware شده؛ hash متن checkpointهای provenance-verified در resume به recovery-state بازسازی می‌شود تا content_blocked برای همان transcript فقط از recovery محدود موجود استفاده کند؛ هنوز ۰/۱۰ است.",
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
