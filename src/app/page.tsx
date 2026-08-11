import Link from "next/link";

import BookCard from "@/components/BookCard";
import Hero from "@/components/Hero";
import ContinueListening from "@/components/player/ContinueListening";
import { books } from "@/lib/books";
import { episodes } from "@/lib/episodes";

export default function Home() {
  const readyCount = episodes.filter(
    (episode) => episode.audio.status === "ready",
  ).length;

  return (
    <div>
      <Hero />

      <section className="mx-auto max-w-6xl px-4 pt-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-800 bg-surface/40 p-5">
            <div className="text-3xl font-extrabold text-accent">
              {books.length.toLocaleString("fa-IR")}
            </div>
            <p className="mt-1 text-sm text-gray-500">کتاب منتخب MVP</p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-surface/40 p-5">
            <div className="text-3xl font-extrabold text-accent">
              {readyCount.toLocaleString("fa-IR")}
            </div>
            <p className="mt-1 text-sm text-gray-500">اپیزود آماده شنیدن</p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-surface/40 p-5">
            <div className="text-3xl font-extrabold text-accent">AI</div>
            <p className="mt-1 text-sm text-gray-500">
              تحقیق تا QA با Automation
            </p>
          </div>
        </div>
      </section>

      <ContinueListening />

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-accent">کتابخانه زبدینو</p>
            <h2 className="mt-2 text-3xl font-extrabold md:text-4xl">
              پنج کتاب، پنج مسیر فکری
            </h2>
          </div>
          <Link
            href="/books"
            className="shrink-0 text-sm font-bold text-accent hover:underline"
          >
            جست‌وجوی کتاب‌ها ←
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <BookCard key={book.slug} book={book} />
          ))}
        </div>
      </section>
    </div>
  );
}
