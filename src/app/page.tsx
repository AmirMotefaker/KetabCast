
import Hero from '@/components/Hero';
import { books } from '@/lib/books';
import BookCard from '@/components/BookCard';

export default function Home() {
  return (
    <div>
      <Hero />
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex justify-between items-end mb-10">
          <h2 className="text-3xl font-bold">آخرین اپیزودها</h2>
          <a href="/books" className="text-accent hover:underline text-sm font-semibold">مشاهده همه ←</a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {books.map((book: any) => (
            <BookCard key={book.slug} book={book} />
          ))}
        </div>
      </section>
    </div>
  );
}
