const voices = [
  {
    id: "sulafat",
    title: "صدای خانم",
    name: "Sulafat",
    tone: "Warm",
    description: "صدای گرم و آرام تأییدشده برای روایت فارسی زبدینو.",
    src: "/audio/voice-preview/sulafat-warm-preview.mp3",
  },
  {
    id: "schedar",
    title: "صدای آقا",
    name: "Schedar",
    tone: "Even",
    description: "صدای متعادل و یکنواخت تأییدشده برای روایت فارسی زبدینو.",
    src: "/audio/voice-preview/schedar-even-preview.mp3",
  },
] as const;

export default function VoicePreview() {
  return (
    <section
      className="mx-auto max-w-6xl px-4 py-10"
      aria-labelledby="approved-voice-preview-title"
    >
      <div className="rounded-3xl border border-gray-800 bg-surface/40 p-6 md:p-8">
        <div className="max-w-3xl">
          <p className="text-sm font-bold text-accent">صدای منتخب زبدینو</p>
          <h2
            id="approved-voice-preview-title"
            className="mt-2 text-2xl font-extrabold md:text-3xl"
          >
            دو صدای تأییدشده برای نسخه جدید زبدینو
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            این‌ها نمونه‌های کوتاه از دو صدایی هستند که برای روایت نهایی تأیید
            شده‌اند. اپیزودهای کامل دوصدایی هنوز در مرحله تولید و QA هستند و
            پلیر فعلی تا پایان آن فرایند از صدای Production موجود استفاده می‌کند.
          </p>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          {voices.map((voice) => (
            <article
              key={voice.id}
              className="rounded-2xl border border-gray-800 bg-black/20 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-accent">{voice.title}</p>
                  <h3 className="mt-1 text-xl font-extrabold">
                    {voice.name} / {voice.tone}
                  </h3>
                </div>
                <span className="rounded-full border border-gray-700 px-3 py-1 text-xs font-bold text-gray-300">
                  تأییدشده
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-gray-400">
                {voice.description}
              </p>

              <audio
                controls
                preload="metadata"
                className="mt-5 w-full"
                src={voice.src}
              >
                مرورگر شما از پخش صوت پشتیبانی نمی‌کند.
              </audio>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

