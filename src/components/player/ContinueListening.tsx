"use client";

import Link from "next/link";
import { Play } from "lucide-react";

import { books } from "@/lib/books";
import { episodes } from "@/lib/episodes";
import { usePlayer } from "@/components/player/PlayerProvider";

export default function ContinueListening() {
  const { listening, activateEpisode } = usePlayer();

  if (!listening.lastEpisodeId) return null;

  const episode =
    episodes.find(
      (item) =>
        item.id === listening.lastEpisodeId &&
        item.audio.status === "ready",
    ) ?? null;

  if (!episode) return null;

  const progress = listening.progress[episode.id];
  if (
    !progress ||
    progress.completed ||
    progress.currentTime < 10 ||
    progress.duration <= 0
  ) {
    return null;
  }

  const percent = Math.min(
    Math.max((progress.currentTime / progress.duration) * 100, 0),
    100,
  );

  if (percent >= 98) return null;

  const book = books.find((item) => item.slug === episode.bookSlug);

  return (
    <section className="mx-auto max-w-6xl px-4 pt-8">
      <div className="overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-l from-accent/10 to-surface/50 p-5 md:p-6">
        <div className="flex items-center gap-5">
          {book && (
            <img
              src={book.coverUrl}
              alt=""
              className="h-24 w-18 rounded-xl object-cover shadow-xl"
            />
          )}

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-accent">ادامه شنیدن</p>
            <Link
              href={`/books/${episode.bookSlug}`}
              className="mt-1 block truncate text-xl font-extrabold hover:text-accent"
            >
              {episode.title}
            </Link>
            <p className="mt-2 text-sm text-gray-500">
              {Math.round(percent).toLocaleString("fa-IR")}٪ شنیده شده
            </p>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-800">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              activateEpisode(episode.id, {
                autoplay: true,
                startAt: progress.currentTime,
              })
            }
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30"
            aria-label="ادامه پخش"
          >
            <Play size={22} fill="currentColor" />
          </button>
        </div>
      </div>
    </section>
  );
}
