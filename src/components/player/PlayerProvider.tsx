"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { books, type Book } from "@/lib/books";
import { resolveEpisodeAudioUrl } from "@/lib/audio";
import { episodes, type Episode } from "@/lib/episodes";
import {
  addListeningBookmark,
  getListeningSnapshot,
  getServerListeningSnapshot,
  removeListeningBookmark,
  saveListeningProgress,
  subscribeListening,
  updateListeningSettings,
  type ListeningSnapshot,
} from "@/lib/listening-store";

type SleepTimer = 15 | 30 | 45 | "end" | null;

interface ActivateOptions {
  autoplay?: boolean;
  startAt?: number;
}

interface PlayerContextValue {
  activeEpisode: Episode | null;
  activeBook: Book | null;
  listening: ListeningSnapshot;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  sleepTimer: SleepTimer;
  errorMessage: string | null;
  upNext: Episode | null;
  readyEpisodes: readonly Episode[];
  activateEpisode: (episodeId: string, options?: ActivateOptions) => void;
  toggleEpisode: (episodeId: string, startAt?: number) => void;
  togglePlayback: () => void;
  seekTo: (seconds: number) => void;
  skip: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  setAutoplay: (enabled: boolean) => void;
  setSleepTimer: (value: SleepTimer) => void;
  playNext: () => void;
  playPrevious: () => void;
  addBookmark: (episodeId: string, seconds: number) => void;
  removeBookmark: (bookmarkId: string) => void;
  shareEpisode: (episodeId: string, seconds: number) => Promise<void>;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

const READY_EPISODES = episodes.filter(
  (episode) => episode.audio.status === "ready",
);

function bookForEpisode(episode: Episode | null): Book | null {
  if (!episode) return null;
  return books.find((book) => book.slug === episode.bookSlug) ?? null;
}

function clampToDuration(seconds: number, duration: number) {
  if (!Number.isFinite(seconds)) return 0;
  if (!Number.isFinite(duration) || duration <= 0) {
    return Math.max(0, seconds);
  }
  return Math.min(Math.max(0, seconds), Math.max(duration - 0.25, 0));
}

function inferBasePath() {
  return "";
}

export default function PlayerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingStartRef = useRef<number | null>(null);
  const pendingAutoplayRef = useRef(false);
  const lastPersistedSecondRef = useRef(-1);
  const sleepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const listening = useSyncExternalStore(
    subscribeListening,
    getListeningSnapshot,
    getServerListeningSnapshot,
  );

  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [sleepTimer, setSleepTimerState] = useState<SleepTimer>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeEpisode =
    READY_EPISODES.find((episode) => episode.id === activeEpisodeId) ?? null;
  const activeBook = bookForEpisode(activeEpisode);
  const sourceUrl = activeEpisode
    ? resolveEpisodeAudioUrl(activeEpisode.audio)
    : null;

  const activeIndex = activeEpisode
    ? READY_EPISODES.findIndex((episode) => episode.id === activeEpisode.id)
    : -1;

  const upNext =
    activeIndex >= 0 && activeIndex + 1 < READY_EPISODES.length
      ? READY_EPISODES[activeIndex + 1]
      : null;

  const persistExactProgress = useCallback(
    (completed = false) => {
      if (!activeEpisode) return;
      const audio = audioRef.current;
      const effectiveDuration =
        audio && Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : activeEpisode.audio.durationSeconds;
      const effectiveCurrent = audio?.currentTime ?? currentTime;

      saveListeningProgress(
        activeEpisode.id,
        effectiveCurrent,
        effectiveDuration,
        completed,
      );
    },
    [activeEpisode, currentTime],
  );

  const activateEpisode = useCallback(
    (episodeId: string, options: ActivateOptions = {}) => {
      const episode = READY_EPISODES.find((item) => item.id === episodeId);
      if (!episode) return;

      const stored = listening.progress[episode.id];
      const shouldResume =
        stored &&
        !stored.completed &&
        stored.currentTime > 5 &&
        stored.currentTime <
          Math.max(stored.duration || episode.audio.durationSeconds, 1) - 10;

      const startAt =
        typeof options.startAt === "number"
          ? options.startAt
          : shouldResume
            ? stored.currentTime
            : 0;

      const autoplay = options.autoplay !== false;
      pendingStartRef.current = startAt;
      pendingAutoplayRef.current = autoplay;
      lastPersistedSecondRef.current = -1;
      setErrorMessage(null);

      if (activeEpisodeId === episode.id) {
        const audio = audioRef.current;
        if (!audio) return;

        const effectiveDuration =
          Number.isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : episode.audio.durationSeconds;

        audio.currentTime = clampToDuration(startAt, effectiveDuration);
        setCurrentTime(audio.currentTime);
        audio.playbackRate = listening.settings.playbackRate;

        if (autoplay) {
          setIsBuffering(true);
          void audio.play().catch(() => {
            setIsBuffering(false);
            setIsPlaying(false);
            setErrorMessage(
              "پخش صدا در این مرورگر شروع نشد. دوباره تلاش کنید.",
            );
          });
        }
        return;
      }

      setCurrentTime(startAt);
      setDuration(episode.audio.durationSeconds);
      setIsBuffering(autoplay);
      setIsPlaying(false);
      setActiveEpisodeId(episode.id);
    },
    [activeEpisodeId, listening.progress, listening.settings.playbackRate],
  );

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !activeEpisode) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    setErrorMessage(null);
    setIsBuffering(true);

    void audio.play().catch(() => {
      setIsBuffering(false);
      setIsPlaying(false);
      setErrorMessage(
        "پخش صدا در این مرورگر شروع نشد. دوباره تلاش کنید.",
      );
    });
  }, [activeEpisode]);

  const toggleEpisode = useCallback(
    (episodeId: string, startAt?: number) => {
      if (activeEpisode?.id === episodeId) {
        togglePlayback();
        return;
      }

      activateEpisode(episodeId, {
        autoplay: true,
        startAt,
      });
    },
    [activateEpisode, activeEpisode, togglePlayback],
  );

  const seekTo = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      if (!audio || !activeEpisode) return;

      const effectiveDuration =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : activeEpisode.audio.durationSeconds;

      const nextTime = clampToDuration(seconds, effectiveDuration);
      audio.currentTime = nextTime;
      setCurrentTime(nextTime);
      saveListeningProgress(
        activeEpisode.id,
        nextTime,
        effectiveDuration,
        false,
      );
    },
    [activeEpisode],
  );

  const skip = useCallback(
    (seconds: number) => {
      seekTo(currentTime + seconds);
    },
    [currentTime, seekTo],
  );

  const changePlaybackRate = useCallback((rate: number) => {
    const safeRate = Math.min(2, Math.max(0.75, rate));
    const audio = audioRef.current;
    if (audio) audio.playbackRate = safeRate;
    updateListeningSettings({ playbackRate: safeRate });
  }, []);

  const changeAutoplay = useCallback((enabled: boolean) => {
    updateListeningSettings({ autoplay: enabled });
  }, []);

  const playNext = useCallback(() => {
    if (READY_EPISODES.length === 0) return;

    if (!activeEpisode) {
      activateEpisode(READY_EPISODES[0].id);
      return;
    }

    const index = READY_EPISODES.findIndex(
      (episode) => episode.id === activeEpisode.id,
    );
    const next = READY_EPISODES[index + 1];
    if (next) activateEpisode(next.id);
  }, [activateEpisode, activeEpisode]);

  const playPrevious = useCallback(() => {
    if (!activeEpisode) return;

    if (currentTime > 20) {
      seekTo(0);
      return;
    }

    const index = READY_EPISODES.findIndex(
      (episode) => episode.id === activeEpisode.id,
    );
    const previous = READY_EPISODES[index - 1];
    if (previous) activateEpisode(previous.id);
  }, [activateEpisode, activeEpisode, currentTime, seekTo]);

  const changeSleepTimer = useCallback((value: SleepTimer) => {
    if (sleepTimeoutRef.current) {
      clearTimeout(sleepTimeoutRef.current);
      sleepTimeoutRef.current = null;
    }

    setSleepTimerState(value);

    if (typeof value !== "number") return;

    sleepTimeoutRef.current = setTimeout(() => {
      audioRef.current?.pause();
      sleepTimeoutRef.current = null;
      setSleepTimerState(null);
    }, value * 60 * 1000);
  }, []);

  const addBookmark = useCallback(
    (episodeId: string, seconds: number) => {
      addListeningBookmark(episodeId, seconds);
    },
    [],
  );

  const removeBookmark = useCallback((bookmarkId: string) => {
    removeListeningBookmark(bookmarkId);
  }, []);

  const shareEpisode = useCallback(
    async (episodeId: string, seconds: number) => {
      if (typeof window === "undefined") return;

      const episode = READY_EPISODES.find((item) => item.id === episodeId);
      if (!episode) return;

      const basePath = inferBasePath();
      const url = new URL(
        `${basePath}/books/${episode.bookSlug}/`,
        window.location.origin,
      );
      url.searchParams.set("t", String(Math.max(0, Math.floor(seconds))));
      url.hash = "player";

      const shareData = {
        title: `زبدینو — ${episode.title}`,
        text: `از ${Math.floor(seconds / 60).toLocaleString("fa-IR")} دقیقه بشنو`,
        url: url.toString(),
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
          return;
        } catch {
          // User cancellation falls through to copy when possible.
        }
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url.toString());
      }
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (sleepTimeoutRef.current) {
        clearTimeout(sleepTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (
      !activeEpisode ||
      !activeBook ||
      typeof navigator === "undefined" ||
      !("mediaSession" in navigator)
    ) {
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: activeEpisode.title,
      artist: activeBook.authorFa,
      album: "زبدینو",
      artwork: [
        {
          src: activeBook.coverUrl,
          sizes: "512x512",
        },
      ],
    });

    const handlers: Array<
      [MediaSessionAction, MediaSessionActionHandler | null]
    > = [
      ["play", () => togglePlayback()],
      ["pause", () => togglePlayback()],
      ["seekbackward", () => skip(-15)],
      ["seekforward", () => skip(15)],
      [
        "seekto",
        (details) => {
          if (typeof details.seekTime === "number") {
            seekTo(details.seekTime);
          }
        },
      ],
      ["nexttrack", () => playNext()],
      ["previoustrack", () => playPrevious()],
    ];

    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Some browsers expose Media Session with a smaller action set.
      }
    }

    return () => {
      for (const [action] of handlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Ignore unsupported action cleanup.
        }
      }
    };
  }, [
    activeBook,
    activeEpisode,
    playNext,
    playPrevious,
    seekTo,
    skip,
    togglePlayback,
  ]);

  useEffect(() => {
    if (!activeEpisode) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT"
      ) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        togglePlayback();
      } else if (event.code === "KeyJ") {
        event.preventDefault();
        skip(-15);
      } else if (event.code === "KeyL") {
        event.preventDefault();
        skip(15);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeEpisode, skip, togglePlayback]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      activeEpisode,
      activeBook,
      listening,
      isPlaying,
      isBuffering,
      currentTime,
      duration,
      playbackRate: listening.settings.playbackRate,
      sleepTimer,
      errorMessage,
      upNext,
      readyEpisodes: READY_EPISODES,
      activateEpisode,
      toggleEpisode,
      togglePlayback,
      seekTo,
      skip,
      setPlaybackRate: changePlaybackRate,
      setAutoplay: changeAutoplay,
      setSleepTimer: changeSleepTimer,
      playNext,
      playPrevious,
      addBookmark,
      removeBookmark,
      shareEpisode,
    }),
    [
      activeBook,
      activeEpisode,
      activateEpisode,
      addBookmark,
      changeAutoplay,
      changePlaybackRate,
      changeSleepTimer,
      currentTime,
      duration,
      errorMessage,
      isBuffering,
      isPlaying,
      listening,
      playNext,
      playPrevious,
      removeBookmark,
      seekTo,
      shareEpisode,
      skip,
      sleepTimer,
      toggleEpisode,
      togglePlayback,
      upNext,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>
      <audio
        ref={audioRef}
        src={sourceUrl ?? undefined}
        preload="metadata"
        onLoadedMetadata={(event) => {
          if (!activeEpisode) return;

          const audio = event.currentTarget;
          const nextDuration =
            Number.isFinite(audio.duration) && audio.duration > 0
              ? audio.duration
              : activeEpisode.audio.durationSeconds;

          const stored = listening.progress[activeEpisode.id];
          const requestedStart =
            pendingStartRef.current ??
            (stored && !stored.completed ? stored.currentTime : 0);

          audio.currentTime = clampToDuration(
            requestedStart,
            nextDuration,
          );
          audio.playbackRate = listening.settings.playbackRate;

          setDuration(nextDuration);
          setCurrentTime(audio.currentTime);

          const shouldPlay = pendingAutoplayRef.current;
          pendingStartRef.current = null;
          pendingAutoplayRef.current = false;

          if (shouldPlay) {
            setIsBuffering(true);
            void audio.play().catch(() => {
              setIsBuffering(false);
              setIsPlaying(false);
              setErrorMessage(
                "پخش صدا در این مرورگر شروع نشد. دوباره تلاش کنید.",
              );
            });
          }
        }}
        onTimeUpdate={(event) => {
          if (!activeEpisode) return;

          const audio = event.currentTarget;
          const nextTime = audio.currentTime;
          const nextDuration =
            Number.isFinite(audio.duration) && audio.duration > 0
              ? audio.duration
              : activeEpisode.audio.durationSeconds;

          setCurrentTime(nextTime);
          setDuration(nextDuration);

          const wholeSecond = Math.floor(nextTime);
          if (
            wholeSecond >= 0 &&
            (
              lastPersistedSecondRef.current < 0 ||
              Math.abs(
                wholeSecond - lastPersistedSecondRef.current,
              ) >= 5
            )
          ) {
            lastPersistedSecondRef.current = wholeSecond;
            saveListeningProgress(
              activeEpisode.id,
              nextTime,
              nextDuration,
              false,
            );
          }

          if (
            "mediaSession" in navigator &&
            nextDuration > 0 &&
            nextTime >= 0
          ) {
            try {
              navigator.mediaSession.setPositionState({
                duration: nextDuration,
                playbackRate: audio.playbackRate,
                position: Math.min(nextTime, nextDuration),
              });
            } catch {
              // Position state is optional.
            }
          }
        }}
        onPlay={() => {
          setIsPlaying(true);
          setIsBuffering(false);
          if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "playing";
          }
        }}
        onPlaying={() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }}
        onPause={() => {
          setIsPlaying(false);
          setIsBuffering(false);
          persistExactProgress(false);
          if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "paused";
          }
        }}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onEnded={() => {
          if (!activeEpisode) return;

          persistExactProgress(true);
          setIsPlaying(false);
          setIsBuffering(false);

          if (sleepTimer === "end") {
            setSleepTimerState(null);
            return;
          }

          if (listening.settings.autoplay) {
            const index = READY_EPISODES.findIndex(
              (episode) => episode.id === activeEpisode.id,
            );
            const next = READY_EPISODES[index + 1];
            if (next) activateEpisode(next.id);
          }
        }}
        onError={() => {
          setIsPlaying(false);
          setIsBuffering(false);
          setErrorMessage(
            "فایل صوتی در دسترس نیست یا بارگذاری آن با خطا روبه‌رو شد.",
          );
        }}
      />
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const value = useContext(PlayerContext);
  if (!value) {
    throw new Error("usePlayer must be used inside PlayerProvider.");
  }
  return value;
}

