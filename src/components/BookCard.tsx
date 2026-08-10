import Link from "next/link";
import { Book } from "@/types";
import { Clock } from "lucide-react";

export const BookCard = ({ book }: { book: Book }) => {
  const m = Math.floor(book.episode.durationSeconds / 60);
  return (
    <Link href={('/books/' + book.slug)} className="group glass rounded-2xl overflow-hidden hover:border-violet-500/50 transition-all duration-300">
      <div className="aspect-[3/4] bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden flex items-center justify-center">
        <span className="text-7xl font-bold text-gray-700 opacity-50">{book.titleEn.charAt(0)}</span>
      </div>
      <div className="p-5">
        <span className="text-xs text-violet-400 font-medium">{book.category}</span>
        <h3 className="text-lg font-bold text-white mt-2 group-hover:text-violet-300 transition-colors">{book.titleFa}</h3>
        <p className="text-sm text-gray-400 mt-1">{book.authorFa}</p>
        <div className="flex items-center gap-2 mt-4 text-xs text-gray-500"><Clock size={14} /><span>{m} دقیقه</span></div>
      </div>
    </Link>
  );
};