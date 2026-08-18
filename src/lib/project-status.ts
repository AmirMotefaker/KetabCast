export const projectStatus = {
  version: "v0.2.0-beta.5.1.19",
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
      "Batch A lineage-safe‌تر شده؛ resume-seed checkpointهای segment را فقط پس از تطبیق دقیق path/index/words/hashes/WAV و اثبات ancestor بودن source قبلی می‌پذیرد و provenance را به resume مستقیم re-anchor می‌کند؛ renderer نیز checkpoint reuseشده را به run جاری re-anchor می‌کند؛ coverage recovery دو مرحله‌ای و floor ۰٫۲۵ ثانیه بر کلمه حفظ شده و هنوز ۰/۱۰ است.",
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
