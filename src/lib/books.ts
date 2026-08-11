export interface Book {
  slug: string;
  titleFa: string;
  titleEn: string;
  authorFa: string;
  authorEn: string;
  year: number;
  category: string;
  description: string;
  coverUrl: string;
  keyIdeas: readonly string[];
}

export const books: readonly Book[] = [
  {
    slug: "atomic-habits",
    titleFa: "عادت‌های اتمی",
    titleEn: "Atomic Habits",
    authorFa: "جیمز کلیر",
    authorEn: "James Clear",
    year: 2018,
    category: "توسعه فردی",
    description:
      "تغییرات کوچک، نتایج بزرگ. یک راهنمای عملی و علمی برای ساختن عادت‌های خوب و ترک عادت‌های بد. جیمز کلیر نشان می‌دهد چگونه بهبودهای کوچک می‌توانند در طول زمان اثر بزرگی بسازند.",
    coverUrl:
      "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600",
    keyIdeas: [
      "عادت‌ها چرخه‌ای از نشانه، تمایل، پاسخ و پاداش هستند.",
      "برای تغییر عادت، روی سیستم‌ها تمرکز کنید نه فقط اهداف.",
      "بهبودهای کوچک در طول زمان اثر مرکب می‌سازند.",
      "محیط را طوری طراحی کنید که رفتار مطلوب آسان‌تر شود.",
    ],
  },
  {
    slug: "deep-work",
    titleFa: "کار عمیق",
    titleEn: "Deep Work",
    authorFa: "کال نیوپورت",
    authorEn: "Cal Newport",
    year: 2016,
    category: "بهره‌وری",
    description:
      "در دنیای پر از حواس‌پرتی، توانایی تمرکز عمیق روی کارهای سخت یک مزیت مهم است. کال نیوپورت توضیح می‌دهد چگونه می‌توان تمرکز را به یک مهارت و عادت حرفه‌ای تبدیل کرد.",
    coverUrl:
      "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=600",
    keyIdeas: [
      "کار عمیق یعنی تمرکز بدون حواس‌پرتی روی یک کار شناختی دشوار.",
      "تمرکز عمیق مهارتی کمیاب و ارزشمند است.",
      "برای کار عمیق باید زمان و محیط را آگاهانه طراحی کرد.",
      "تمرکز با تمرین مداوم قوی‌تر می‌شود.",
    ],
  },
  {
    slug: "think-again",
    titleFa: "دوباره فکر کن",
    titleEn: "Think Again",
    authorFa: "آدام گرانت",
    authorEn: "Adam Grant",
    year: 2021,
    category: "تفکر و تصمیم‌گیری",
    description:
      "کتابی درباره هنر بازاندیشی؛ اینکه چگونه فرض‌های قدیمی را زیر سؤال ببریم، با فروتنی فکری از دانسته‌های خود فاصله بگیریم و برای یادگیری دوباره آماده باشیم.",
    coverUrl:
      "https://covers.openlibrary.org/b/isbn/9781984878120-L.jpg",
    keyIdeas: [],
  },
  {
    slug: "zero-to-one",
    titleFa: "صفر به یک",
    titleEn: "Zero to One",
    authorFa: "پیتر تیل و بلیک مسترز",
    authorEn: "Peter Thiel with Blake Masters",
    year: 2014,
    category: "کارآفرینی",
    description:
      "درباره ساختن چیزهای واقعاً جدید به‌جای تکرار مدل‌های موجود؛ کتابی درباره نوآوری، خلق ارزش منحصربه‌فرد و پرسش‌هایی که بنیان‌گذاران باید درباره آینده بپرسند.",
    coverUrl:
      "https://covers.openlibrary.org/b/isbn/9780804139298-L.jpg",
    keyIdeas: [],
  },
  {
    slug: "leading-teams",
    titleFa: "تیم ایدئال",
    titleEn: "Leading Teams",
    authorFa: "ریچارد هکمن",
    authorEn: "J. Richard Hackman",
    year: 2002,
    category: "مدیریت و تیم‌سازی",
    description:
      "ریچارد هکمن با تکیه بر پژوهش تیم‌های واقعی توضیح می‌دهد که عملکرد عالی بیش از کنترل لحظه‌به‌لحظه اعضا، به طراحی شرایط درست برای کار تیمی وابسته است.",
    coverUrl:
      "https://covers.openlibrary.org/b/isbn/9781633691216-L.jpg",
    keyIdeas: [],
  },
];
