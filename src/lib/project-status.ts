export const projectStatus = {
  version: "v0.2.0-beta.5.1.17",
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
      "Batch A segment-safe‌تر شده؛ سقف fresh Gemini TTS به ۱۸۰ کلمه کاهش یافته، checkpointهای معتبر prefix با hash/path/words دقیق حتی پس از تغییر segmentCount حفظ می‌شوند و duration-per-word gate همچنان صوت ناقص را رد می‌کند؛ هنوز ۰/۱۰ است.",
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
