"use client";

import {
  Bookmark,
  Clock3,
  Download,
  LoaderCircle,
  Pause,
  Play,
  Share2,
  SkipBack,
  SkipForward,
  Trash2,
} from "lucide-react";

import {
  isProductionAudio,
  resolveEpisodeAudioUrl,
} from "@/lib/audio";
import type { Episode } from "@/lib/episodes";
import { usePlayer } from "@/components/player/PlayerProvider";

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "۰:۰۰";

  const rounded = Math.floor(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;

  return `${minutes.toLocaleString("fa-IR")}:${remainingSeconds.toLocaleString(
    "fa-IR",
    {
      minimumIntegerDigits: 2,
      useGrouping: false,
    },
  )}`;
}

function timestampFromLocation() {
  if (typeof window === "undefined") return undefined;
  const raw = new URLSearchParams(window.location.search).get("t");
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

export default function AudioPlayer({ episode }: { episode: Episode }) {
  const {
    activeEpisode,
    listening,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    playbackRate,
    sleepTimer,
    errorMessage,
    upNext,
    toggleEpisode,
    activateEpisode,
    seekTo,
    skip,
    setPlaybackRate,
    setAutoplay,
    setSleepTimer,
    addBookmark,
    removeBookmark,
    shareEpisode,
  } = usePlayer();

  const sourceUrl = resolveEpisodeAudioUrl(episode.audio);
  const productionAudio = isProductionAudio(episode.audio);
  const active = activeEpisode?.id === episode.id;
  const storedProgress = listening.progress[episode.id];

  const effectiveDuration = active
    ? duration || episode.audio.durationSeconds
    : storedProgress?.duration || episode.audio.durationSeconds;

  const effectiveCurrent = active
    ? currentTime
    : storedProgress?.completed
      ? 0
      : storedProgress?.currentTime ?? 0;

  const bookmarks = listening.bookmarks
    .filter((bookmark) => bookmark.episodeId === episode.id)
    .sort((a, b) => a.seconds - b.seconds);

  const handleSeek = (seconds: number) => {
    if (!active) {
      activateEpisode(episode.id, {
        autoplay: false,
        startAt: seconds,
      });
      return;
    }

    seekTo(seconds);
  };

  const handlePrimary = () => {
    toggleEpisode(
      episode.id,
      active ? undefined : timestampFromLocation(),
    );
  };

  return (
    <div className="rounded-3xl border border-gray-800 bg-background p-5 shadow-xl md:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold">{episode.title}</p>
          <p className="mt-1 text-sm text-gray-500">
            {Math.ceil(effectiveDuration / 60).toLocaleString("fa-IR")} دقیقه
          </p>
        </div>

        <span
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
            productionAudio
              ? "border-emerald-700 bg-emerald-950/40 text-emerald-300"
              : "border-amber-700 bg-amber-950/30 text-amber-300"
          }`}
        >
          {productionAudio ? "صوت اصلی" : "نمونه آزمایشی"}
        </span>
      </div>

      <div className="mb-5">
        <input
          dir="ltr"
          type="range"
          min={0}
          max={Math.max(effectiveDuration, 1)}
          step={1}
          value={Math.min(effectiveCurrent, Math.max(effectiveDuration, 1))}
          onChange={(event) => handleSeek(Number(event.target.value))}
          className="w-full cursor-pointer accent-accent"
          aria-label="موقعیت پخش"
          aria-valuetext={`${formatTime(effectiveCurrent)} از ${formatTime(
            effectiveDuration,
          )}`}
          disabled={!sourceUrl}
        />

        <div
          dir="ltr"
          className="mt-2 flex justify-between text-xs tabular-nums text-gray-500"
        >
          <span>{formatTime(effectiveCurrent)}</span>
          <span>
            -{formatTime(Math.max(effectiveDuration - effectiveCurrent, 0))}
          </span>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-center gap-5 md:gap-8">
        <button
          type="button"
          onClick={() =>
            active
              ? skip(-15)
              : handleSeek(Math.max(effectiveCurrent - 15, 0))
          }
          disabled={!sourceUrl}
          className="rounded-full p-3 text-gray-400 transition hover:bg-gray-800 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="۱۵ ثانیه قبل"
        >
          <SkipBack size={28} />
        </button>

        <button
          type="button"
          onClick={handlePrimary}
          disabled={!sourceUrl}
          className="rounded-full bg-accent p-5 text-white shadow-lg shadow-accent/30 transition hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={active && isPlaying ? "توقف پخش" : "شروع پخش"}
        >
          {active && isBuffering ? (
            <LoaderCircle size={40} className="animate-spin" />
          ) : active && isPlaying ? (
            <Pause size={40} fill="currentColor" />
          ) : (
            <Play size={40} fill="currentColor" />
          )}
        </button>

        <button
          type="button"
          onClick={() =>
            active
              ? skip(15)
              : handleSeek(
                  Math.min(effectiveCurrent + 15, effectiveDuration),
                )
          }
          disabled={!sourceUrl}
          className="rounded-full p-3 text-gray-400 transition hover:bg-gray-800 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="۱۵ ثانیه بعد"
        >
          <SkipForward size={28} />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex items-center justify-between gap-2 rounded-2xl border border-gray-800 bg-surface/50 px-3 py-2.5 text-sm">
          <span className="text-gray-400">سرعت</span>
          <select
            value={playbackRate}
            onChange={(event) =>
              setPlaybackRate(Number(event.target.value))
            }
            className="bg-transparent font-bold text-white outline-none"
            aria-label="سرعت پخش"
          >
            {PLAYBACK_RATES.map((rate) => (
              <option key={rate} value={rate}>
                {rate.toLocaleString("fa-IR")}×
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center justify-between gap-2 rounded-2xl border border-gray-800 bg-surface/50 px-3 py-2.5 text-sm">
          <span className="inline-flex items-center gap-1.5 text-gray-400">
            <Clock3 size={16} />
            تایمر خواب
          </span>
          <select
            value={sleepTimer ?? "off"}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "off") setSleepTimer(null);
              else if (value === "end") setSleepTimer("end");
              else setSleepTimer(Number(value) as 15 | 30 | 45);
            }}
            className="bg-transparent font-bold text-white outline-none"
            aria-label="تایمر خواب"
          >
            <option value="off">خاموش</option>
            <option value="15">۱۵ دقیقه</option>
            <option value="30">۳۰ دقیقه</option>
            <option value="45">۴۵ دقیقه</option>
            <option value="end">پایان اپیزود</option>
          </select>
        </label>

        <button
          type="button"
          onClick={() => addBookmark(episode.id, effectiveCurrent)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-800 bg-surface/50 px-3 py-2.5 text-sm font-bold text-gray-300 transition hover:border-accent hover:text-white"
        >
          <Bookmark size={17} />
          نشانک در {formatTime(effectiveCurrent)}
        </button>

        <button
          type="button"
          onClick={() => void shareEpisode(episode.id, effectiveCurrent)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-800 bg-surface/50 px-3 py-2.5 text-sm font-bold text-gray-300 transition hover:border-accent hover:text-white"
        >
          <Share2 size={17} />
          اشتراک از این لحظه
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={listening.settings.autoplay}
            onChange={(event) => setAutoplay(event.target.checked)}
            className="accent-accent"
          />
          پخش خودکار اپیزود بعدی
        </label>

        {productionAudio && sourceUrl && (
          <a
            href={sourceUrl}
            download
            className="inline-flex items-center gap-2 text-sm font-bold text-accent hover:underline"
          >
            <Download size={16} />
            دانلود فایل صوتی
          </a>
        )}
      </div>

      {upNext && active && (
        <div className="mt-5 rounded-2xl border border-gray-800 bg-surface/40 p-4">
          <p className="text-xs font-bold text-accent">Up Next</p>
          <div className="mt-1 flex items-center justify-between gap-4">
            <p className="font-bold">{upNext.title}</p>
            <button
              type="button"
              onClick={() => activateEpisode(upNext.id)}
              className="shrink-0 text-sm font-bold text-accent hover:underline"
            >
              پخش حالا
            </button>
          </div>
        </div>
      )}

      {bookmarks.length > 0 && (
        <div className="mt-5 border-t border-gray-800 pt-5">
          <p className="mb-3 text-sm font-bold text-gray-300">
            نشانک‌های این اپیزود
          </p>
          <div className="flex flex-wrap gap-2">
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="inline-flex items-center overflow-hidden rounded-full border border-gray-700 bg-surface/50"
              >
                <button
                  type="button"
                  onClick={() => handleSeek(bookmark.seconds)}
                  className="px-3 py-1.5 text-xs font-bold text-accent"
                >
                  {formatTime(bookmark.seconds)}
                </button>
                <button
                  type="button"
                  onClick={() => removeBookmark(bookmark.id)}
                  className="border-r border-gray-700 p-1.5 text-gray-500 hover:text-red-300"
                  aria-label={`حذف نشانک ${formatTime(bookmark.seconds)}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-5 text-center text-xs leading-6 text-gray-600">
        میانبرها: Space پخش/توقف · J پانزده ثانیه عقب · L پانزده ثانیه جلو
      </p>

      {errorMessage && active && (
        <p
          className="mt-4 text-center text-sm text-red-300"
          role="alert"
          aria-live="assertive"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}
