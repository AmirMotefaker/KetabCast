import Link from "next/link";
import { Clock3, Headphones, LoaderCircle, Play } from "lucide-react";

import { episodes } from "@/lib/episodes";
import type { Book } from "@/lib/books";

interface BookCardProps {
  book: Book;
}

export default function BookCard({ book }: BookCardProps) {
  const episode = episodes.find((item) => item.bookSlug === book.slug);
  const ready = episode?.audio.status === "ready";

  const durationLabel =
    episode && episode.audio.durationSeconds > 0
      ? `${Math.ceil(episode.audio.durationSeconds / 60).toLocaleString("fa-IR")} دقیقه`
      : null;

  return (
    <Link
      href={`/books/${book.slug}`}
      className="group block rounded-3xl border border-gray-800 bg-surface/55 p-4 transition duration-300 hover:-translate-y-1 hover:border-accent/60 hover:shadow-2xl hover:shadow-accent/10 focus:outline-none focus:ring-2 focus:ring-accent"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-gray-900">
        <img
          src={book.coverUrl}
          alt={`جلد ${book.titleFa}`}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] group-hover:opacity-90"
        />

        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <span className="rounded-full border border-white/10 bg-black/70 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
            {book.category}
          </span>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold backdrop-blur ${
              ready
                ? "border-emerald-400/30 bg-emerald-950/80 text-emerald-200"
                : "border-amber-400/30 bg-amber-950/80 text-amber-200"
            }`}
          >
            {ready ? <Headphones size={13} /> : <LoaderCircle size={13} />}
            {ready ? "آماده شنیدن" : "در حال تولید"}
          </span>
        </div>

        {ready && (
          <div className="absolute bottom-3 left-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-xl shadow-accent/30">
            <Play size={21} fill="currentColor" />
          </div>
        )}
      </div>

      <div className="px-1 pt-5">
        <p className="mb-1 text-xs font-semibold tracking-wide text-accent">
          {book.titleEn}
        </p>
        <h3 className="text-xl font-extrabold text-white transition group-hover:text-accent">
          {book.titleFa}
        </h3>
        <p className="mt-2 text-sm text-gray-400">{book.authorFa}</p>

        <div className="mt-5 flex items-center justify-between border-t border-gray-800 pt-4 text-sm">
          {durationLabel ? (
            <span className="flex items-center gap-1.5 text-gray-500">
              <Clock3 size={15} />
              {durationLabel}
            </span>
          ) : (
            <span className="text-amber-300/80">اپیزود در خط تولید AI</span>
          )}

          <span className="font-bold text-accent">
            {ready ? "گوش دادن ←" : "مشاهده کتاب ←"}
          </span>
        </div>
      </div>
    </Link>
  );
}
