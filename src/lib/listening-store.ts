export interface ListeningProgress {
  currentTime: number;
  duration: number;
  updatedAt: number;
  completed: boolean;
}

export interface ListeningBookmark {
  id: string;
  episodeId: string;
  seconds: number;
  createdAt: number;
}

export interface ListeningSettings {
  autoplay: boolean;
  playbackRate: number;
}

export interface ListeningSnapshot {
  lastEpisodeId: string | null;
  progress: Record<string, ListeningProgress>;
  history: string[];
  bookmarks: ListeningBookmark[];
  settings: ListeningSettings;
}

const STORAGE_KEY = "zobdino:listening:v1";

const SERVER_SNAPSHOT: ListeningSnapshot = {
  lastEpisodeId: null,
  progress: {},
  history: [],
  bookmarks: [],
  settings: {
    autoplay: true,
    playbackRate: 1,
  },
};

let cachedRaw: string | undefined;
let cachedSnapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function normalizeSnapshot(value: unknown): ListeningSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return SERVER_SNAPSHOT;
  }

  const input = value as Partial<ListeningSnapshot>;
  const progress: Record<string, ListeningProgress> = {};

  if (input.progress && typeof input.progress === "object") {
    for (const [episodeId, entry] of Object.entries(input.progress)) {
      if (!entry || typeof entry !== "object") continue;
      const item = entry as Partial<ListeningProgress>;

      progress[episodeId] = {
        currentTime: Math.max(0, finiteNumber(item.currentTime)),
        duration: Math.max(0, finiteNumber(item.duration)),
        updatedAt: Math.max(0, finiteNumber(item.updatedAt)),
        completed: Boolean(item.completed),
      };
    }
  }

  const settings = input.settings ?? SERVER_SNAPSHOT.settings;
  const playbackRate = Math.min(
    2,
    Math.max(0.75, finiteNumber(settings.playbackRate, 1)),
  );

  const bookmarks = Array.isArray(input.bookmarks)
    ? input.bookmarks
        .filter(
          (bookmark): bookmark is ListeningBookmark =>
            Boolean(
              bookmark &&
                typeof bookmark === "object" &&
                typeof bookmark.id === "string" &&
                typeof bookmark.episodeId === "string",
            ),
        )
        .map((bookmark) => ({
          id: bookmark.id,
          episodeId: bookmark.episodeId,
          seconds: Math.max(0, finiteNumber(bookmark.seconds)),
          createdAt: Math.max(0, finiteNumber(bookmark.createdAt)),
        }))
        .slice(-200)
    : [];

  const history = Array.isArray(input.history)
    ? input.history
        .filter((item): item is string => typeof item === "string")
        .slice(0, 20)
    : [];

  return {
    lastEpisodeId:
      typeof input.lastEpisodeId === "string" ? input.lastEpisodeId : null,
    progress,
    history,
    bookmarks,
    settings: {
      autoplay: settings.autoplay !== false,
      playbackRate,
    },
  };
}

function readBrowserSnapshot(): ListeningSnapshot {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;

  let raw: string | null = null;

  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return cachedSnapshot;
  }

  const rawKey = raw ?? "";
  if (cachedRaw === rawKey) return cachedSnapshot;

  cachedRaw = rawKey;

  if (!raw) {
    cachedSnapshot = SERVER_SNAPSHOT;
    return cachedSnapshot;
  }

  try {
    cachedSnapshot = normalizeSnapshot(JSON.parse(raw));
  } catch {
    cachedSnapshot = SERVER_SNAPSHOT;
  }

  return cachedSnapshot;
}

function commitSnapshot(next: ListeningSnapshot) {
  cachedSnapshot = next;
  cachedRaw = JSON.stringify(next);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, cachedRaw);
    } catch {
      // Playback must keep working even when browser storage is unavailable.
    }
  }

  for (const listener of listeners) listener();
}

export function getListeningSnapshot(): ListeningSnapshot {
  return readBrowserSnapshot();
}

export function getServerListeningSnapshot(): ListeningSnapshot {
  return SERVER_SNAPSHOT;
}

export function subscribeListening(listener: () => void): () => void {
  listeners.add(listener);

  if (typeof window === "undefined") {
    return () => listeners.delete(listener);
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cachedRaw = undefined;
    listener();
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function saveListeningProgress(
  episodeId: string,
  currentTime: number,
  duration: number,
  completed = false,
) {
  const current = readBrowserSnapshot();
  const safeDuration = Math.max(0, duration);
  const safeCurrent = Math.min(
    Math.max(0, currentTime),
    safeDuration > 0 ? safeDuration : Math.max(0, currentTime),
  );

  const history = [
    episodeId,
    ...current.history.filter((item) => item !== episodeId),
  ].slice(0, 20);

  commitSnapshot({
    ...current,
    lastEpisodeId: episodeId,
    history,
    progress: {
      ...current.progress,
      [episodeId]: {
        currentTime: safeCurrent,
        duration: safeDuration,
        updatedAt: Date.now(),
        completed,
      },
    },
  });
}

export function updateListeningSettings(
  patch: Partial<ListeningSettings>,
) {
  const current = readBrowserSnapshot();

  commitSnapshot({
    ...current,
    settings: {
      autoplay:
        typeof patch.autoplay === "boolean"
          ? patch.autoplay
          : current.settings.autoplay,
      playbackRate:
        typeof patch.playbackRate === "number"
          ? Math.min(2, Math.max(0.75, patch.playbackRate))
          : current.settings.playbackRate,
    },
  });
}

export function addListeningBookmark(
  episodeId: string,
  seconds: number,
): ListeningBookmark {
  const current = readBrowserSnapshot();
  const bookmark: ListeningBookmark = {
    id: `${episodeId}-${Date.now()}-${Math.round(seconds * 1000)}`,
    episodeId,
    seconds: Math.max(0, seconds),
    createdAt: Date.now(),
  };

  commitSnapshot({
    ...current,
    bookmarks: [...current.bookmarks, bookmark].slice(-200),
  });

  return bookmark;
}

export function removeListeningBookmark(bookmarkId: string) {
  const current = readBrowserSnapshot();

  commitSnapshot({
    ...current,
    bookmarks: current.bookmarks.filter(
      (bookmark) => bookmark.id !== bookmarkId,
    ),
  });
}
