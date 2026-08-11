"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import BookCard from "@/components/BookCard";
import { books } from "@/lib/books";
import { episodes } from "@/lib/episodes";

const ALL = "همه";

export default function BookExplorer() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const [onlyReady, setOnlyReady] = useState(false);

  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(books.map((book) => book.category)))],
    [],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fa-IR");

    return books.filter((book) => {
      const matchesQuery =
        !normalized ||
        [
          book.titleFa,
          book.titleEn,
          book.authorFa,
          book.authorEn,
          book.category,
        ]
          .join(" ")
          .toLocaleLowerCase("fa-IR")
          .includes(normalized);

      const matchesCategory = category === ALL || book.category === category;
      const episode = episodes.find((item) => item.bookSlug === book.slug);
      const matchesReady = !onlyReady || episode?.audio.status === "ready";

      return matchesQuery && matchesCategory && matchesReady;
    });
  }, [category, onlyReady, query]);

  return (
    <div>
      <div className="mb-8 rounded-3xl border border-gray-800 bg-surface/50 p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <span className="sr-only">جست‌وجوی کتاب</span>
            <Search
              size={20}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جست‌وجو در عنوان، نویسنده یا موضوع..."
              className="w-full rounded-2xl border border-gray-700 bg-background py-3.5 pr-12 pl-4 text-white outline-none transition placeholder:text-gray-600 focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <button
            type="button"
            onClick={() => setOnlyReady((value) => !value)}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-3.5 font-bold transition ${
              onlyReady
                ? "border-accent bg-accent/15 text-accent"
                : "border-gray-700 text-gray-300 hover:border-gray-600"
            }`}
          >
            <SlidersHorizontal size={18} />
            فقط آماده شنیدن
          </button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
                category === item
                  ? "border-accent bg-accent text-white"
                  : "border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {filtered.length.toLocaleString("fa-IR")} کتاب
        </p>
        <p className="text-sm text-gray-500">
          {episodes.filter((item) => item.audio.status === "ready").length.toLocaleString("fa-IR")} اپیزود آماده شنیدن
        </p>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((book) => (
            <BookCard key={book.slug} book={book} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-gray-700 py-20 text-center">
          <p className="text-xl font-bold">کتابی پیدا نشد</p>
          <p className="mt-2 text-gray-500">
            عبارت جست‌وجو یا فیلتر موضوع را تغییر دهید.
          </p>
        </div>
      )}
    </div>
  );
}
