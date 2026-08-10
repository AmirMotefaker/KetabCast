import { books } from "@/content/books";
import { BookCard } from "@/components/BookCard";
import { Hero } from "@/components/Hero";
import { Sparkles } from "lucide-react";
import { GithubIcon } from "@/components/Icons";

export default function Home() {
  return (
    <div className="space-y-24">
      <Hero />
      <section id="episodes">
        <div className="flex items-center gap-3 mb-8">
          <Sparkles className="text-violet-400" /><h2 className="text-2xl font-bold text-white">تازه منتشر شده</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map(book => <BookCard key={book.slug} book={book} />)}
        </div>
      </section>
      <section id="about" className="text-center py-12 glass rounded-3xl">
        <GithubIcon size={40} className="mx-auto mb-4 text-violet-400" />
        <h2 className="text-2xl font-bold mb-4 text-white">پروژه متن‌باز (Open Source)</h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">کتاب‌کست یک محصول متن‌باز است. اگر به توسعه آن علاقه‌مندید، در گیت‌هاب به ما بپیوندید.</p>
        <a href="https://github.com/AmirMotefaker/KetabCast" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white px-6 py-3 rounded-xl font-bold transition-colors">
          مشاهده در گیت‌هاب
        </a>
      </section>
    </div>
  );
}