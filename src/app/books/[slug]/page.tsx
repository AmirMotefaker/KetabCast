import { notFound } from "next/navigation";
import { Clock3, Headphones, LoaderCircle, Sparkles } from "lucide-react";

import AudioPlayer from "@/components/AudioPlayer";
import TranscriptPanel from "@/components/player/TranscriptPanel";
import { books } from "@/lib/books";
import { episodes } from "@/lib/episodes";

export async function generateStaticParams() {
  return books.map((book) => ({ slug: book.slug }));
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = books.find((item) => item.slug === slug);
  if (!book) return notFound();

  const episode = episodes.find((item) => item.bookSlug === book.slug);
  const ready = episode?.audio.status === "ready";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      <section className="mb-12 grid gap-8 md:grid-cols-[280px_1fr] md:items-start">
        <div className="overflow-hidden rounded-3xl border border-gray-800 bg-gray-900 shadow-2xl shadow-accent/10">
          <img
            src={book.coverUrl}
            alt={`جلد ${book.titleFa}`}
            className="aspect-[3/4] h-full w-full object-cover"
          />
        </div>

        <div className="pt-2">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent">
              {book.category}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${
                ready
                  ? "border-emerald-700 bg-emerald-950/40 text-emerald-300"
                  : "border-amber-700 bg-amber-950/30 text-amber-300"
              }`}
            >
              {ready ? <Headphones size={14} /> : <LoaderCircle size={14} />}
              {ready ? "اپیزود آماده" : "در خط تولید AI"}
            </span>
          </div>

          <p className="text-sm font-semibold text-gray-500">{book.titleEn}</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-6xl">
            {book.titleFa}
          </h1>
          <p className="mt-4 text-xl text-gray-400">
            {book.authorFa} · {book.year.toLocaleString("fa-IR")}
          </p>
          <p className="mt-7 max-w-3xl text-lg leading-9 text-gray-300">
            {book.description}
          </p>

          {episode && (
            <div className="mt-7 flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="inline-flex items-center gap-2">
                <Clock3 size={17} />
                {Math.ceil(episode.audio.durationSeconds / 60).toLocaleString("fa-IR")} دقیقه
              </span>
              <span className="inline-flex items-center gap-2">
                <Sparkles size={17} />
                خلاصه مستقل فارسی
              </span>
            </div>
          )}
        </div>
      </section>

      {episode ? (
        <section
          id="player"
          className="mb-12 rounded-3xl border border-gray-800 bg-surface/50 p-5 md:p-8"
        >
          <div className="mb-6">
            <p className="text-sm font-bold text-accent">اپیزود زبدینو</p>
            <h2 className="mt-2 text-2xl font-extrabold">{episode.title}</h2>
          </div>
          <AudioPlayer episode={episode} />
          <p className="mt-6 text-lg leading-8 text-gray-400">
            {episode.description}
          </p>
        </section>
      ) : (
        <section className="mb-12 rounded-3xl border border-amber-800/50 bg-amber-950/20 p-7 md:p-9">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-amber-400/10 p-3 text-amber-300">
              <LoaderCircle size={24} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-amber-100">
                اپیزود این کتاب در حال تولید است
              </h2>
              <p className="mt-3 max-w-2xl leading-8 text-amber-100/70">
                تحقیق منابع، ساخت اسکریپت فارسی، تولید صدا و QA به‌صورت
                خودکار انجام می‌شود. تا قبل از تأیید فایل واقعی، هیچ صدای
                placeholder برای این کتاب پخش نمی‌کنیم.
              </p>
            </div>
          </div>
        </section>
      )}

      {book.keyIdeas.length > 0 && (
        <section className="mb-12">
          <div className="mb-6">
            <p className="text-sm font-bold text-accent">در یک نگاه</p>
            <h2 className="mt-2 text-3xl font-extrabold">ایده‌های کلیدی</h2>
          </div>

          <ul className="grid gap-4 md:grid-cols-2">
            {book.keyIdeas.map((idea, index) => (
              <li
                key={idea}
                className="flex gap-4 rounded-2xl border border-gray-800 bg-surface/50 p-5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent font-extrabold text-white">
                  {(index + 1).toLocaleString("fa-IR")}
                </span>
                <span className="text-lg leading-8 text-gray-200">{idea}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {episode && <TranscriptPanel episode={episode} />}
    </div>
  );
}
