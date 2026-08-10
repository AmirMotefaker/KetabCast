import { books } from '@/lib/books';
import { episodes } from '@/lib/episodes';
import AudioPlayer from '@/components/AudioPlayer';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  return books.map((book) => ({ slug: book.slug }));
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = books.find((b) => b.slug === slug);
  if (!book) return notFound();
  const episode = episodes.find((ep) => ep.bookSlug === book.slug);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row gap-8 mb-12">
        <div className="w-full md:w-1/3">
          <img src={book.coverUrl} alt={book.titleFa} className="w-full aspect-[3/4] object-cover rounded-2xl shadow-2xl shadow-accent/10" />
        </div>
        <div className="w-full md:w-2/3">
          <span className="text-accent font-bold uppercase tracking-wider text-sm">{book.category}</span>
          <h1 className="text-4xl font-bold mt-2 mb-2">{book.titleFa}</h1>
          <p className="text-xl text-gray-400 mb-6">{book.titleEn} • {book.authorFa}</p>
          <p className="text-gray-300 leading-relaxed text-lg">{book.description}</p>
        </div>
      </div>

      {episode && (
        <div className="bg-surface/50 p-6 md:p-8 rounded-2xl border border-gray-800 mb-12">
          <h2 className="text-2xl font-bold mb-6 text-accent flex items-center gap-2">🎧 اپیزود: {episode.title}</h2>
          <AudioPlayer episode={episode} />
          <p className="mt-6 text-gray-400 leading-relaxed">{episode.description}</p>
        </div>
      )}

      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">ایده‌های کلیدی کتاب</h2>
        <ul className="space-y-4">
          {book.keyIdeas.map((idea: string, i: number) => (
            <li key={i} className="bg-surface/50 p-5 rounded-xl border border-gray-800 flex gap-4 items-start">
              <span className="bg-accent text-white w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">#{i + 1}</span>
              <span className="text-gray-200 text-lg">{idea}</span>
            </li>
          ))}
        </ul>
      </div>

      {episode && (
        <div className="bg-surface/50 p-6 md:p-8 rounded-2xl border border-gray-800">
          <h2 className="text-2xl font-bold mb-6">متن اپیزود (Transcript)</h2>
          <p className="text-gray-300 leading-loose whitespace-pre-line text-lg">{episode.transcript}</p>
        </div>
      )}
    </div>
  );
}
