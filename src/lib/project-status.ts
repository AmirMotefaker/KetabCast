export const projectStatus = {
  version: "v0.2.0-beta.5.1.3",
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
      "انتشار Media ایمن‌سازی شد؛ Batch A آماده اجرای کنترل‌شده است.",
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
