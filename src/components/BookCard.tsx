
import Link from 'next/link';

export default function BookCard({ book }: any) {
  return (
    <Link href={`/books/${book.slug}`} className="bg-surface/50 p-4 rounded-2xl border border-gray-800 hover:border-accent transition-all hover:scale-[1.02] block group">
      <div className="aspect-[3/4] w-full overflow-hidden rounded-xl mb-4 bg-gray-800">
        <img src={book.coverUrl} alt={book.titleFa} className="w-full h-full object-cover group-hover:opacity-90 transition" />
      </div>
      <span className="text-xs text-accent font-bold uppercase tracking-wider">{book.category}</span>
      <h3 className="text-xl font-bold mt-2 group-hover:text-accent transition">{book.titleFa}</h3>
      <p className="text-sm text-gray-400 mb-4">{book.authorFa}</p>
      <div className="flex justify-between items-center pt-4 border-t border-gray-700 text-sm">
        <span className="text-gray-500 flex items-center gap-1">🎧 ۱۴ دقیقه</span>
        <span className="text-accent font-semibold">▶ گوش دادن</span>
      </div>
    </Link>
  );
}
