
export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">درباره کتاب‌کست</h1>
      <p className="text-lg text-gray-300 leading-loose mb-6">
        کتاب‌کست یک محصول فارسی‌زبان و Open Source است که هدف آن تبدیل ایده‌ها و مفاهیم ارزشمند کتاب‌ها به اپیزودهای پادکستی فارسی، کوتاه، شنیدنی و قابل‌فهم است.
      </p>
      <p className="text-lg text-gray-300 leading-loose mb-6">
        تمرکز اصلی محصول خلاصه متنی کتاب نیست؛ بلکه یک تجربه شنیداری مدرن است که به شما کمک می‌کند در کمتر از ۲۰ دقیقه، مهم‌ترین ایده‌های یک کتاب ارزشمند را بشنوید و درک کنید.
      </p>
      <h2 className="text-2xl font-bold mt-12 mb-6 text-accent">چرا کتاب‌کست؟</h2>
      <ul className="list-disc list-inside text-gray-300 space-y-3 text-lg">
        <li>یادگیری سریع در مسیر رفت‌وآمد و زمان‌های مرده</li>
        <li>کشف کتاب‌های جدید و انتخاب آگاهانه قبل از خرید نسخه کامل</li>
        <li>تجربه Audio-first با کمک هوش مصنوعی و تولید محتوای ساختاریافته</li>
        <li>پشتیبانی کامل از زبان فارسی و راست‌چین (RTL)</li>
      </ul>
    </div>
  );
}
