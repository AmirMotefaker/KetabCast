"use client";

import { useRef, useState } from "react";
import {
  Download,
  LoaderCircle,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from "lucide-react";

import {
  isProductionAudio,
  resolveEpisodeAudioUrl,
} from "@/lib/audio";
import type { Episode } from "@/lib/episodes";

interface AudioPlayerProps {
  episode: Pick<Episode, "id" | "title" | "audio">;
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "۰:۰۰";

  const rounded = Math.floor(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;

  return `${minutes.toLocaleString("fa-IR")}:${remainingSeconds
    .toLocaleString("fa-IR", {
      minimumIntegerDigits: 2,
      useGrouping: false,
    })}`;
}

export default function AudioPlayer({ episode }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const sourceUrl = resolveEpisodeAudioUrl(episode.audio);
  const productionAudio = isProductionAudio(episode.audio);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(
    episode.audio.durationSeconds,
  );
  const [playbackRate, setPlaybackRate] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const effectiveDuration =
    Number.isFinite(duration) && duration > 0
      ? duration
      : episode.audio.durationSeconds;

  const canPlay = Boolean(sourceUrl) && !errorMessage;

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !sourceUrl) return;

    setErrorMessage(null);

    if (!audio.paused) {
      audio.pause();
      return;
    }

    try {
      setIsBuffering(true);
      await audio.play();
    } catch {
      setIsBuffering(false);
      setIsPlaying(false);
      setErrorMessage("پخش صدا در این مرورگر شروع نشد. دوباره تلاش کنید.");
    }
  };

  const seekTo = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const nextTime = Math.min(
      Math.max(seconds, 0),
      Math.max(effectiveDuration, 0),
    );

    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const skip = (seconds: number) => {
    seekTo(currentTime + seconds);
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);

    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  return (
    <div className="bg-background p-5 md:p-6 rounded-2xl border border-gray-800 shadow-xl">
      <audio
        ref={audioRef}
        src={sourceUrl ?? undefined}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const nextDuration = event.currentTarget.duration;
          if (Number.isFinite(nextDuration) && nextDuration > 0) {
            setDuration(nextDuration);
          }
        }}
        onTimeUpdate={(event) => {
          setCurrentTime(event.currentTarget.currentTime);
        }}
        onPlay={() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }}
        onPlaying={() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }}
        onPause={() => {
          setIsPlaying(false);
          setIsBuffering(false);
        }}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onEnded={() => {
          setIsPlaying(false);
          setIsBuffering(false);
          setCurrentTime(effectiveDuration);
        }}
        onError={() => {
          setIsPlaying(false);
          setIsBuffering(false);
          setErrorMessage(
            "فایل صوتی در دسترس نیست یا بارگذاری آن با خطا روبه‌رو شد.",
          );
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <p className="font-bold text-lg">{episode.title}</p>
          <p className="text-sm text-gray-500 mt-1">
            {Math.ceil(effectiveDuration / 60).toLocaleString("fa-IR")} دقیقه
          </p>
        </div>

        <span
          className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
            productionAudio
              ? "border-emerald-700 text-emerald-300 bg-emerald-950/40"
              : "border-amber-700 text-amber-300 bg-amber-950/30"
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
          value={Math.min(currentTime, Math.max(effectiveDuration, 1))}
          onChange={(event) => seekTo(Number(event.target.value))}
          className="w-full accent-accent cursor-pointer"
          aria-label="موقعیت پخش"
          aria-valuetext={`${formatTime(currentTime)} از ${formatTime(
            effectiveDuration,
          )}`}
          disabled={!sourceUrl}
        />

        <div
          dir="ltr"
          className="flex justify-between mt-2 text-xs text-gray-500 tabular-nums"
        >
          <span>{formatTime(currentTime)}</span>
          <span>-{formatTime(Math.max(effectiveDuration - currentTime, 0))}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-5 md:gap-8 mb-5">
        <button
          type="button"
          onClick={() => skip(-15)}
          disabled={!sourceUrl}
          className="text-gray-400 hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed p-3 rounded-full hover:bg-gray-800 transition"
          aria-label="۱۵ ثانیه قبل"
        >
          <SkipBack size={28} />
        </button>

        <button
          type="button"
          onClick={togglePlay}
          disabled={!canPlay}
          className="bg-accent text-white p-5 rounded-full hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-lg shadow-accent/30"
          aria-label={isPlaying ? "توقف پخش" : "شروع پخش"}
        >
          {isBuffering ? (
            <LoaderCircle size={40} className="animate-spin" />
          ) : isPlaying ? (
            <Pause size={40} />
          ) : (
            <Play size={40} className="mr-[-2px]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => skip(15)}
          disabled={!sourceUrl}
          className="text-gray-400 hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed p-3 rounded-full hover:bg-gray-800 transition"
          aria-label="۱۵ ثانیه بعد"
        >
          <SkipForward size={28} />
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <label className="text-sm text-gray-400" htmlFor={`speed-${episode.id}`}>
          سرعت پخش
        </label>

        <select
          id={`speed-${episode.id}`}
          value={playbackRate}
          onChange={(event) => changePlaybackRate(Number(event.target.value))}
          className="bg-surface border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          aria-label="سرعت پخش"
        >
          {PLAYBACK_RATES.map((rate) => (
            <option key={rate} value={rate}>
              {rate.toLocaleString("fa-IR")}×
            </option>
          ))}
        </select>

        {productionAudio && episode.audio.downloadable && sourceUrl && (
          <a
            href={sourceUrl}
            download
            className="inline-flex items-center gap-2 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 hover:text-white hover:border-accent transition"
          >
            <Download size={16} />
            دانلود فایل
          </a>
        )}
      </div>

      {!productionAudio && (
        <p className="mt-4 text-xs text-amber-300/90 text-center leading-6">
          این اپیزود هنوز از فایل نمونه استفاده می‌کند؛ متادیتا و مسیر CDN آماده
          است، اما صوت production در milestone بعدی جایگزین می‌شود.
        </p>
      )}

      {!sourceUrl && (
        <p
          className="mt-4 text-sm text-red-300 text-center"
          role="status"
          aria-live="polite"
        >
          برای این اپیزود هنوز منبع صوتی قابل پخش تعریف نشده است.
        </p>
      )}

      {errorMessage && (
        <p
          className="mt-4 text-sm text-red-300 text-center"
          role="alert"
          aria-live="assertive"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}
