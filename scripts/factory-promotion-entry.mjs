export function buildVerifiedReadyEpisode({
  existingEpisode = null,
  book,
  generated,
  inspected,
  remote,
}) {
  if (!book?.episodeId || !book?.slug) {
    throw new Error("Promotion requires a valid catalog book.");
  }

  if (generated?.episodeId !== book.episodeId) {
    throw new Error(
      `Generated episodeId mismatch: ${generated?.episodeId} != ${book.episodeId}`,
    );
  }

  if (generated?.bookSlug !== book.slug) {
    throw new Error(
      `Generated bookSlug mismatch: ${generated?.bookSlug} != ${book.slug}`,
    );
  }

  if (inspected?.episodeId !== book.episodeId) {
    throw new Error(`Inspection episode mismatch: ${book.episodeId}`);
  }

  if (remote?.episodeId !== book.episodeId || !remote.verified) {
    throw new Error(`Remote asset is not verified: ${book.episodeId}`);
  }

  if (
    remote.objectKey !== inspected.objectKey ||
    remote.sha256 !== inspected.sha256 ||
    Number(remote.bytes) !== Number(inspected.bytes)
  ) {
    throw new Error(`Remote/local promotion integrity mismatch: ${book.episodeId}`);
  }

  if (
    !Number.isFinite(Number(inspected.durationSeconds)) ||
    Number(inspected.durationSeconds) <= 0
  ) {
    throw new Error(`Invalid inspected duration: ${book.episodeId}`);
  }

  if (!/^https:\/\/github\.com\//u.test(remote.publicUrl ?? "")) {
    throw new Error(`Unexpected production asset URL: ${remote?.publicUrl}`);
  }

  if (
    existingEpisode &&
    (
      existingEpisode.id !== book.episodeId ||
      existingEpisode.bookSlug !== book.slug
    )
  ) {
    throw new Error(`Existing episode identity mismatch: ${book.episodeId}`);
  }

  return {
    ...(existingEpisode ?? {}),
    id: book.episodeId,
    bookSlug: book.slug,
    title: generated.title,
    description: generated.description,
    transcript: generated.transcript,
    keyIdeas: generated.keyIdeas,
    format: "standard",
    audio: {
      status: "ready",
      objectKey: inspected.objectKey,
      publicUrl: remote.publicUrl,
      mimeType: "audio/mpeg",
      durationSeconds: Number(inspected.durationSeconds),
      downloadable: false,
      sha256: inspected.sha256,
      bytes: Number(inspected.bytes),
    },
  };
}
