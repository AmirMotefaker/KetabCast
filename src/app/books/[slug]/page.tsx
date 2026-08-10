import { books, getBookBySlug } from "@/content/books";
import { AudioPlayer } from "@/components/AudioPlayer";
import { notFound } from "next/navigation";
import { FileText, Lightbulb } from "lucide-react";

export async function generateStaticParams() {
  return books.map((book) => ({ slug: book.slug }));
}

export default function BookDetailPage({ params }: { params: { slug: string } }) {
  const book = getBookBySlug(params.slug);
  if (!book) notFound();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
      <div className="lg:col-span-1">
        <div className="aspect-[3/4] bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl mb-6 flex items-center justify-center text-gray-700 text-9xl font-bold">
          {book.titleEn.charAt(0)}
        </div>
        <span className="text-sm text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full">{book.category}</span>
        <h1 className="text-3xl font-extrabold text-white mt-4">{book.titleFa}</h1>
        <h2 className="text-lg text-gray-400 mt-1">{book.titleEn} - {book.year}</h2>
        <p className="text-gray-300 mt-6 leading-relaxed">{book.description}</p>
      </div>
      <div className="lg:col-span-2 space-y-8">
        <AudioPlayer audioUrl={book.episode.audioUrl} title={book.episode.title} author={book.authorFa} />
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="text-violet-400" /><h3 className="text-xl font-bold text-white">ایده‌های اصلی کتاب</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {book.keyIdeas.map((idea, idx) => (
              <div key={idx} className="glass p-4 rounded-xl">
                <span className="text-violet-400 text-sm">ایده {idx + 1}</span>
                <p className="text-white mt-2 font-medium">{idea}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="text-violet-400" /><h3 className="text-xl font-bold text-white">متن کامل اپیزود (Transcript)</h3>
          </div>
          <div className="glass p-6 rounded-xl text-gray-300 leading-loose">{book.episode.transcript}</div>
        </div>
      </div>
    </div>
  );
}