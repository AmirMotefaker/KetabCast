import BookExplorer from "@/components/BookExplorer";

export default function BooksPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <section className="mb-10 max-w-3xl">
        <span className="text-sm font-bold text-accent">کتابخانه زبدینو</span>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">
          کتابی برای فکر بعدی‌ات پیدا کن
        </h1>
        <p className="mt-4 text-lg leading-8 text-gray-400">
          پنج عنوان MVP انتخاب شده‌اند. اپیزودهای آماده را همین حالا گوش بده و
          عنوان‌های در حال تولید را دنبال کن.
        </p>
      </section>

      <BookExplorer />
    </div>
  );
}
