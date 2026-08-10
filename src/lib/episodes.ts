export type EpisodeFormat = "standard";
export type AudioAssetStatus = "placeholder" | "ready";

export interface EpisodeAudioAsset {
  status: AudioAssetStatus;
  objectKey: string;
  previewUrl?: string;
  publicUrl?: string;
  mimeType: "audio/mpeg";
  durationSeconds: number;
  downloadable: boolean;
  sha256?: string;
  bytes?: number;
}

export interface TranscriptCue {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface Episode {
  id: string;
  bookSlug: string;
  title: string;
  description: string;
  audio: EpisodeAudioAsset;
  transcript: string;
  transcriptCues?: readonly TranscriptCue[];
  keyIdeas: readonly string[];
  format: EpisodeFormat;
}

export const episodes = [
  {
    id: "atomic-habits-ep1",
    bookSlug: "atomic-habits",
    title: "قدرت تغییرات کوچک",
    description:
      "چگونه تغییرات ۱ درصدی می‌توانند زندگی شما را متحول کنند؟ در این اپیزود به بررسی هسته اصلی کتاب عادت‌های اتمی می‌پردازیم.",
    audio: {
      status: "placeholder",
      objectKey: "episodes/atomic-habits/atomic-habits-ep1-v1.mp3",
      previewUrl:
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
      mimeType: "audio/mpeg",
      durationSeconds: 840,
      downloadable: false,
    },
    transcript:
      "سلام و به کتاب‌کست خوش آمدید.\n\nامروز می‌خواهیم سراغ یکی از مهم‌ترین کتاب‌های دهه اخیر برویم: عادت‌های اتمی اثر جیمز کلیر.\n\nتا حالا شده تصمیم بگیرید یک عادت جدید مثل ورزش کردن یا کتاب خواندن را شروع کنید، اما بعد از چند روز رهایش کنید؟ جیمز کلیر می‌گوید مشکل از اراده شما نیست، مشکل از سیستم شماست.\n\nایده اول: روی اهداف تمرکز نکنید، روی سیستم‌ها تمرکز کنید. برنده‌ها و بازندگان هر دو هدف‌های یکسانی دارند. چیزی که آن‌ها را متمایز می‌کند، سیستمی است که برای رسیدن به آن هدف ساخته‌اند.\n\nایده دوم: قانون ۱ درصد. اگر شما هر روز فقط ۱ درصد بهتر شوید، در پایان سال ۳۷ برابر بهتر خواهید شد. عادت‌های اتمی، کوچک هستند اما قدرت آن‌ها در تداومشان نهفته است.\n\nبرای شروع، از محیط خود آغاز کنید. نشانه‌های عادت‌های خوب را در معرض دید قرار دهید و نشانه‌های عادت‌های بد را پنهان کنید.\n\nاگر این اپیزود برایتان مفید بود، کتاب‌کست را دنبال کنید و اپیزود بعدی را بشنوید.",
    keyIdeas: ["تمرکز بر سیستم‌ها", "قانون ۱ درصد"],
    format: "standard",
  },
  {
    id: "deep-work-ep1",
    bookSlug: "deep-work",
    title: "تمرکز در عصر حواس‌پرتی",
    description:
      "چگونه در دنیای پر از نوتیفیکیشن و حواس‌پرتی، کار عمیق و باکیفیت انجام دهیم؟",
    audio: {
      status: "placeholder",
      objectKey: "episodes/deep-work/deep-work-ep1-v1.mp3",
      previewUrl:
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
      mimeType: "audio/mpeg",
      durationSeconds: 900,
      downloadable: false,
    },
    transcript:
      "به کتاب‌کست خوش آمدید.\n\nامروز درباره کتابی صحبت می‌کنیم که می‌تواند شیوه کار شما را کاملاً تغییر دهد: کار عمیق اثر کال نیوپورت.\n\nما در عصری زندگی می‌کنیم که حواس‌پرتی به یک عادت روزمره تبدیل شده. ایمیل‌ها، شبکه‌های اجتماعی، پیام‌ها - همه در حال جنگیدن برای توجه ما هستند.\n\nاما کال نیوپورت می‌گوید که در اقتصاد جدید، کسانی که بتوانند کار عمیق انجام دهند، برنده خواهند بود. کار عمیق یعنی توانایی تمرکز بدون حواس‌پرتی روی کارهای شناختی سخت.\n\nایده اول: کار عمیق کمیاب است. اکثر مردم نمی‌توانند بیش از چند دقیقه تمرکز کنند. اگر شما این توانایی را داشته باشید، یک مزیت رقابتی بزرگ دارید.\n\nایده دوم: کار عمیق ارزشمند است. در دنیایی که هوش مصنوعی می‌تواند کارهای روتین را انجام دهد، کار عمیق انسان‌ها ارزش بیشتری پیدا می‌کند.\n\nایده سوم: کار عمیق نیاز به تمرین دارد. مثل یک عضله، توانایی تمرکز را می‌توان با تمرین تقویت کرد.\n\nاگر این اپیزود برایتان مفید بود، کتاب‌کست را دنبال کنید.",
    keyIdeas: ["کار عمیق کمیاب است", "تمرین تمرکز"],
    format: "standard",
  },
] satisfies readonly Episode[];
