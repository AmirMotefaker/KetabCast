import { readFile } from "node:fs/promises";

const USER_AGENT =
  "KetabCast/0.2 (+https://github.com/AmirMotefaker/KetabCast)";

function decodeHtml(value) {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function htmlToText(html) {
  return decodeHtml(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/giu, " ")
      .replace(/<[^>]+>/gu, " ")
      .replace(/\s+/gu, " ")
      .trim(),
  );
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 20_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json,text/html;q=0.9,*/*;q=0.5",
        ...(options.headers ?? {}),
      },
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function compactBookResult(item) {
  const info = item?.volumeInfo ?? {};
  return {
    id: item?.id ?? null,
    title: info.title ?? null,
    subtitle: info.subtitle ?? null,
    authors: info.authors ?? [],
    publisher: info.publisher ?? null,
    publishedDate: info.publishedDate ?? null,
    description: info.description ?? null,
    industryIdentifiers: info.industryIdentifiers ?? [],
    canonicalVolumeLink: info.canonicalVolumeLink ?? null,
    infoLink: info.infoLink ?? null,
  };
}

export async function loadFactoryCatalog(
  catalogPath = "content/factory/books.json",
) {
  const parsed = JSON.parse(await readFile(catalogPath, "utf8"));
  if (!Array.isArray(parsed.books)) {
    throw new Error("Factory catalog must contain books[].");
  }
  return parsed;
}

async function googleBooks(book) {
  const query = encodeURIComponent(
    `intitle:"${book.title}" inauthor:"${book.author}"`,
  );
  const key = process.env.GOOGLE_BOOKS_API_KEY?.trim();
  const keyPart = key ? `&key=${encodeURIComponent(key)}` : "";
  const url =
    `https://www.googleapis.com/books/v1/volumes?q=${query}` +
    `&maxResults=5&printType=books${keyPart}`;
  const response = await fetchWithTimeout(url);
  const data = await response.json();
  return {
    provider: "Google Books",
    queryUrl: url.replace(/&key=[^&]+/u, "&key=REDACTED"),
    items: (data.items ?? []).slice(0, 5).map(compactBookResult),
  };
}

async function openLibrary(book) {
  const params = new URLSearchParams({
    title: book.title,
    author: book.author,
    limit: "5",
    fields:
      "key,title,author_name,first_publish_year,isbn,edition_count," +
      "publisher,language",
  });
  const url = `https://openlibrary.org/search.json?${params}`;
  const response = await fetchWithTimeout(url);
  const data = await response.json();
  return {
    provider: "Open Library",
    queryUrl: url,
    docs: (data.docs ?? []).slice(0, 5),
  };
}

async function officialPage(url) {
  const response = await fetchWithTimeout(url, {
    headers: { Accept: "text/html,*/*;q=0.8" },
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }
  const html = await response.text();
  const text = htmlToText(html);
  return {
    url,
    title:
      /<title[^>]*>([\s\S]*?)<\/title>/iu.exec(html)?.[1]
        ?.replace(/\s+/gu, " ")
        .trim() ?? url,
    text: text.slice(0, 14_000),
    truncated: text.length > 14_000,
  };
}

export async function buildSourcePack(book) {
  const pack = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    book: {
      slug: book.slug,
      episodeId: book.episodeId,
      title: book.title,
      titleFa: book.titleFa,
      author: book.author,
      authorFa: book.authorFa,
      rightsMode: book.rightsMode,
    },
    policy: {
      allowPublicDomainFullText: true,
      allowExplicitOpenLicenseFullText: true,
      allowUnauthorizedFullText: false,
      allowPiracyMirrors: false,
      note:
        "For copyrighted books in web-research-only mode, use metadata, " +
        "official pages, legal previews, author interviews/talks and " +
        "reputable secondary sources. Do not fetch pirate PDFs or reproduce chapters.",
    },
    metadata: {},
    officialPages: [],
    errors: [],
  };

  await Promise.all([
    googleBooks(book)
      .then((value) => { pack.metadata.googleBooks = value; })
      .catch((error) => {
        pack.errors.push({
          source: "Google Books",
          error: String(error.message ?? error),
        });
      }),
    openLibrary(book)
      .then((value) => { pack.metadata.openLibrary = value; })
      .catch((error) => {
        pack.errors.push({
          source: "Open Library",
          error: String(error.message ?? error),
        });
      }),
  ]);

  for (const url of book.officialSources ?? []) {
    try {
      pack.officialPages.push(await officialPage(url));
    } catch (error) {
      pack.errors.push({
        source: url,
        error: String(error.message ?? error),
      });
    }
  }

  return pack;
}
