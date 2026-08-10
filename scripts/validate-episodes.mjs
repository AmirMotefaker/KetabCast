import { readFile } from "node:fs/promises";

const episodes = JSON.parse(
  await readFile("src/content/episodes.json", "utf8"),
);

if (!Array.isArray(episodes) || episodes.length === 0) {
  throw new Error("src/content/episodes.json must be a non-empty array.");
}

const ids = new Set();

for (const episode of episodes) {
  if (!episode?.id || ids.has(episode.id)) {
    throw new Error(`Invalid or duplicate episode id: ${episode?.id}`);
  }
  ids.add(episode.id);

  if (!episode.bookSlug || !episode.title || !episode.transcript) {
    throw new Error(`Missing required episode fields: ${episode.id}`);
  }

  if (!Array.isArray(episode.keyIdeas) || episode.keyIdeas.length < 2) {
    throw new Error(`Invalid keyIdeas: ${episode.id}`);
  }

  const audio = episode.audio;
  if (!audio || audio.mimeType !== "audio/mpeg") {
    throw new Error(`Invalid audio metadata: ${episode.id}`);
  }

  if (!Number.isFinite(audio.durationSeconds) || audio.durationSeconds <= 0) {
    throw new Error(`Invalid audio duration: ${episode.id}`);
  }

  if (audio.status === "placeholder") {
    if (!audio.previewUrl) {
      throw new Error(`Placeholder needs previewUrl: ${episode.id}`);
    }
  } else if (audio.status === "ready") {
    if (audio.previewUrl) {
      throw new Error(`Ready asset must not keep previewUrl: ${episode.id}`);
    }
    if (
      !/^[a-f0-9]{64}$/u.test(audio.sha256 ?? "") ||
      !Number.isInteger(audio.bytes) ||
      audio.bytes <= 0
    ) {
      throw new Error(
        `Ready asset requires verified sha256 and byte size: ${episode.id}`,
      );
    }
    if (/soundhelix\.com/iu.test(JSON.stringify(episode))) {
      throw new Error(`Ready episode still references SoundHelix: ${episode.id}`);
    }
  } else {
    throw new Error(`Unknown audio status: ${episode.id}`);
  }
}

console.log(`Episode contract PASS: ${episodes.length} episodes.`);
