import { Book } from '@/types';

export const books: Book[] = [
  {
    slug: 'atomic-habits', titleFa: 'عادت‌های اتمی', titleEn: 'Atomic Habits',
    authorFa: 'جیمز کلیر', authorEn: 'James Clear', year: 2018, category: 'توسعه فردی',
    description: 'یک راه آسان و اثبات‌شده برای ساختن عادت‌های خوب و شکستن عادت‌های بد.',
    coverUrl: '/images/atomic-habits.jpg',
    keyIdeas: ['بهبود ۱ درصدی', 'هویت مبتنی بر عادت', 'قاعده طلایی تغییر رفتار'],
    episode: {
      id: 'ep-001', bookSlug: 'atomic-habits', title: 'اپیزود ویژه: عادت‌های اتمی',
      description: 'مرور ایده‌های اصلی کتاب عادت‌های اتمی در ۱۴ دقیقه.', durationSeconds: 840,
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 
      transcript: 'ایده اصلی کتاب خیلی ساده است: تغییرهای کوچک، اگر ادامه‌دار باشند، می‌توانند نتیجه‌های بزرگی بسازند. جیمز کلیر معتقد است ما نباید به اهداف تکیه کنیم، بلکه باید روی سیستم‌ها کار کنیم...',
      keyIdeas: ['چرا عادت‌ها مهمند؟', 'چگونه عادت بسازیم؟', 'نقش محیط در شکل‌گیری عادت'],
      format: 'standard', publishedAt: '2026-01-01'
    }
  },
  {
    slug: 'deep-work', titleFa: 'کار عمیق', titleEn: 'Deep Work',
    authorFa: 'کال نیوپورت', authorEn: 'Cal Newport', year: 2016, category: 'بهره‌وری',
    description: 'قوانین برای تمرکز متمرکز در دنیایی پر از حواس‌پرتی.',
    coverUrl: '/images/deep-work.jpg',
    keyIdeas: ['کار عمیق vs کار کم‌عمق', 'تمرین تمرکز', 'استراحت برنامه‌ریزی‌شده'],
    episode: {
      id: 'ep-002', bookSlug: 'deep-work', title: 'اپیزود ویژه: کار عمیق',
      description: 'چگونه در دنیای پرمشتغله امروز تمرکز کنیم؟', durationSeconds: 720,
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      transcript: 'کار عمیق یعنی توانایی تمرکز بدون حواس‌پرتی روی یک کار شناختی سخت. این مهارت در اقتصاد امروز به شدت ارزشمند است...',
      keyIdeas: ['فرمول کار عمیق', 'حذف شبکه‌های اجتماعی', 'زمان‌بندی استراحت'],
      format: 'standard', publishedAt: '2026-01-02'
    }
  }
];

export const getBookBySlug = (slug: string): Book | undefined => books.find(book => book.slug === slug);