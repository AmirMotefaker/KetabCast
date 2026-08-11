"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import type { Episode } from "@/lib/episodes";
import { usePlayer } from "@/components/player/PlayerProvider";

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remaining = Math.floor(safe % 60);

  return `${minutes.toLocaleString("fa-IR")}:${remaining.toLocaleString(
    "fa-IR",
    {
      minimumIntegerDigits: 2,
      useGrouping: false,
    },
  )}`;
}

export default function TranscriptPanel({
  episode,
}: {
  episode: Episode;
}) {
  const [query, setQuery] = useState("");
  const {
    activeEpisode,
    currentTime,
    activateEpisode,
  } = usePlayer();

  const normalizedQuery = query.trim().toLocaleLowerCase("fa-IR");
  const cues = episode.transcriptCues ?? [];

  const paragraphs = useMemo(
    () =>
      episode.transcript
        .split(/\n{2,}/u)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean),
    [episode.transcript],
  );

  const filteredParagraphs = useMemo(
    () =>
      normalizedQuery
        ? paragraphs.filter((paragraph) =>
            paragraph
              .toLocaleLowerCase("fa-IR")
              .includes(normalizedQuery),
          )
        : paragraphs,
    [normalizedQuery, paragraphs],
  );

  const filteredCues = useMemo(
    () =>
      normalizedQuery
        ? cues.filter((cue) =>
            cue.text.toLocaleLowerCase("fa-IR").includes(normalizedQuery),
          )
        : cues,
    [cues, normalizedQuery],
  );

  const exactSyncAvailable = cues.length > 0;

  return (
    <section className="rounded-3xl border border-gray-800 bg-surface/50 p-6 md:p-9">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold text-accent">قابل جست‌وجو</p>
          <h2 className="mt-2 text-3xl font-extrabold">متن اپیزود</h2>
          <p className="mt-2 text-sm text-gray-500">
            {exactSyncAvailable
              ? "روی هر بخش بزن تا صدا دقیقاً از همان لحظه ادامه پیدا کند."
              : "جست‌وجوی متن فعال است؛ همگام‌سازی زمانی با cueهای QA فعال می‌شود."}
          </p>
        </div>

        <label className="relative w-full md:max-w-sm">
          <span className="sr-only">جست‌وجو در متن اپیزود</span>
          <Search
            size={18}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جست‌وجو در متن..."
            className="w-full rounded-2xl border border-gray-700 bg-background py-3 pr-11 pl-4 text-sm text-white outline-none placeholder:text-gray-600 focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </label>
      </div>

      {exactSyncAvailable ? (
        <div className="space-y-2">
          {filteredCues.map((cue) => {
            const active =
              activeEpisode?.id === episode.id &&
              currentTime >= cue.startSeconds &&
              currentTime < cue.endSeconds;

            return (
              <button
                key={`${cue.startSeconds}-${cue.text}`}
                type="button"
                onClick={() =>
                  activateEpisode(episode.id, {
                    autoplay: true,
                    startAt: cue.startSeconds,
                  })
                }
                className={`grid w-full grid-cols-[64px_1fr] gap-4 rounded-2xl border p-4 text-right transition ${
                  active
                    ? "border-accent bg-accent/10"
                    : "border-transparent hover:border-gray-700 hover:bg-background/50"
                }`}
              >
                <span
                  dir="ltr"
                  className="text-xs font-bold tabular-nums text-accent"
                >
                  {formatTime(cue.startSeconds)}
                </span>
                <span className="leading-8 text-gray-300">{cue.text}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-5">
          {filteredParagraphs.map((paragraph, index) => (
            <p
              key={`${index}-${paragraph.slice(0, 30)}`}
              className="text-lg leading-10 text-gray-300"
            >
              {paragraph}
            </p>
          ))}
        </div>
      )}

      {(exactSyncAvailable ? filteredCues : filteredParagraphs).length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-700 py-12 text-center text-gray-500">
          نتیجه‌ای در متن پیدا نشد.
        </div>
      )}
    </section>
  );
}
